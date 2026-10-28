import { buildSeoOperations } from "@trustpatch/core/seo-playbooks";
import type { Finding, RunView } from "@trustpatch/contracts";
import { createFindingReport } from "./finding-report";
import { findingExecutiveSummaryText } from "../components/executive-summary";

function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function text(value: unknown) { return typeof value === "string" ? value : JSON.stringify(value); }
const findingExecutiveSummary = findingExecutiveSummaryText;
export function createFindingEmail(run: RunView, finding: Finding, origin: string) {
  const operation = buildSeoOperations([finding])[0];
  const summary = findingExecutiveSummary(run, finding);
  const reportUrl = `${origin}/api/runs/${run.id}/findings/${finding.id}/report`;
  const runUrl = `${origin}/?run=${run.id}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f7f8f5;font-family:Arial,sans-serif;color:#111b24"><div style="max-width:680px;margin:auto;padding:32px"><div style="background:#111b24;color:#f7f8f5;padding:24px"><h1 style="margin:0;font-size:22px">TrustPatch · Root Cause Analysis</h1><p style="margin:8px 0 0;color:#b4c0c9">Evidence before confidence</p></div><div style="background:white;padding:28px;border:1px solid #d5dcd9"><p style="color:#2457e6;font-size:12px;text-transform:uppercase">Executive summary</p><h2 style="margin-top:0">${escapeHtml(finding.title)}</h2><p style="line-height:1.7">${escapeHtml(summary)}</p><h3>Observed evidence</h3><ul>${Object.entries(finding.observed).map(([key, value]) => `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(text(value))}</li>`).join("")}</ul><h3>Root cause and affected surface</h3><p><strong>Target:</strong> ${escapeHtml(finding.url)}<br><strong>Finding ID:</strong> ${escapeHtml(finding.id)}<br><strong>Source files:</strong> ${escapeHtml(finding.sourceFiles.join(", ") || "No local repository mapped")}</p>${operation ? `<h3>Red Team challenge</h3><p>${escapeHtml(operation.red.challenge)}<br><small>${escapeHtml(operation.red.attackPath)}</small></p><h3>Blue Team optimization</h3><p>${escapeHtml(operation.blue.action)}<br><strong>Verify:</strong> ${escapeHtml(operation.blue.verification)}</p>` : ""}<p><a href="${reportUrl}" style="display:inline-block;background:#2457e6;color:white;padding:12px 18px;text-decoration:none;border-radius:6px">Open the real RCA PDF</a></p><p><a href="${runUrl}" style="color:#2457e6">Inspect the complete run and proof</a></p><hr style="border:0;border-top:1px solid #d5dcd9"><p style="color:#56616b;font-size:12px;line-height:1.6">This report records observed findings and recommended review actions. It does not guarantee rankings, traffic, AI citations, vulnerability absence, or production remediation.</p></div></div></body></html>`;
  return { subject: `RCA: ${finding.title} · ${new URL(finding.url).hostname}`, summary, html, reportUrl, runUrl };
}
export async function sendFindingEmail(run: RunView, finding: Finding, recipient: string, origin: string) {
  const email = createFindingEmail(run, finding, origin);
  const pdf = await createFindingReport(run, finding, origin);
  const filename = `trustpatch-rca-${finding.kind}-${finding.id.slice(-8)}.pdf`;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL ?? "TrustPatch <reports@resend.dev>", to: [recipient], subject: email.subject, html: email.html, attachments: [{ filename, content: Buffer.from(pdf).toString("base64") }] }), signal: AbortSignal.timeout(30_000) });
    const data = await response.json() as { id?: string; message?: string };
    if (!response.ok) throw new Error(data.message ?? "Email provider rejected the report");
    return { delivered: true as const, provider: "resend", id: data.id, ...email, filename };
  }
  const boundary = `----TrustPatch-${finding.id}`;
  const eml = [
    `From: ${process.env.RESEND_FROM_EMAIL ?? "TrustPatch <reports@resend.dev>"}`,
    `To: ${recipient}`, `Subject: ${email.subject}`, "MIME-Version: 1.0", `Content-Type: multipart/mixed; boundary=\"${boundary}\"`, "",
    `--${boundary}`, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", email.html,
    `--${boundary}`, `Content-Type: application/pdf; name=\"${filename}\"`, "Content-Transfer-Encoding: base64", `Content-Disposition: attachment; filename=\"${filename}\"`, "", Buffer.from(pdf).toString("base64").replace(/(.{76})/g, "$1\r\n"), `--${boundary}--`, ""
  ].join("\r\n");
  return { delivered: false as const, provider: "eml-preview", ...email, eml, filename };
}
