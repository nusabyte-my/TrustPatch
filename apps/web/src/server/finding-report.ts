import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { readEvidence, type SeoOperation } from "@trustpatch/core";
import { buildSeoOperations } from "@trustpatch/core/seo-playbooks";
import type { Finding, RunView } from "@trustpatch/contracts";
import { store } from "./runtime";

const ink = rgb(0.067, 0.106, 0.141);
const cobalt = rgb(0.141, 0.341, 0.902);
const muted = rgb(0.337, 0.38, 0.42);
const mint = rgb(0.09, 0.48, 0.33);
const red = rgb(0.55, 0.2, 0.17);
const paper = rgb(0.97, 0.975, 0.96);

export async function createFindingReport(run: RunView, finding: Finding, origin: string) {
  const operation = buildSeoOperations([finding])[0] as SeoOperation | undefined;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Root Cause Analysis — ${finding.title}`);
  pdf.setAuthor("TrustPatch · Evidence before confidence");
  pdf.setSubject(`Evidence-backed analysis for ${finding.url}`);
  pdf.setCreator("TrustPatch RCA Generator");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const state = { page, y };
  const newPage = () => { state.page = pdf.addPage([595, 842]); state.y = 800; };
  const line = (text: string, options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; leading?: number } = {}) => {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const words = text.split(/\s+/);
    let current = "";
    const rows: string[] = [];
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > 455 - (options.indent ?? 0) && current) { rows.push(current); current = word; } else current = next;
    }
    if (current) rows.push(current);
    for (const row of rows) {
      if (state.y < 56) newPage();
      state.page.drawText(row, { x: 50 + (options.indent ?? 0), y: state.y, size, font, color: options.color ?? ink });
      state.y -= options.leading ?? size + 5;
    }
  };
  const heading = (text: string) => { state.y -= 12; line(text, { size: 15, font: bold, color: cobalt }); state.y -= 3; };
  const field = (label: string, value: string) => { line(`${label}: ${value}`, { size: 9 }); };
  const bullet = (text: string) => line(`• ${text}`, { indent: 8, size: 9, leading: 14 });

  state.page.drawRectangle({ x: 0, y: 752, width: 595, height: 90, color: ink });
  state.page.drawText("TRUSTPATCH", { x: 50, y: 804, size: 18, font: bold, color: paper });
  state.page.drawText("ROOT CAUSE ANALYSIS", { x: 50, y: 779, size: 12, font: bold, color: rgb(0.61, 0.75, 1) });
  state.page.drawText("Evidence before confidence", { x: 365, y: 779, size: 8, font: regular, color: paper });
  state.y = 724;
  line(finding.title, { size: 22, font: bold });
  line(`${finding.kind.replaceAll("_", " ")} · ${finding.state}`, { size: 10, color: finding.state === "validated" ? mint : red });
  heading("1. Incident summary");
  field("Target", finding.url);
  field("Run ID", run.id);
  field("Finding ID", finding.id);
  field("Planner", run.proof?.planner ?? "Not available");
  field("Run created", new Date(run.createdAt).toISOString());
  field("Authority", run.contract.readOnly ? "Read-only inspection" : "Approval-gated local repair");
  line(finding.summary, { size: 11, leading: 17 });
  heading("2. Root cause evidence");
  line("The following values were observed by the inspection tools. They are not inferred scores or estimates.", { size: 9, color: muted, leading: 14 });
  for (const [key, value] of Object.entries(finding.observed)) field(key, typeof value === "string" ? value : JSON.stringify(value));
  heading("3. Source and affected surface");
  field("Affected URL", finding.url);
  field("Source files", finding.sourceFiles.length ? finding.sourceFiles.join(", ") : "Not mapped to a local repository");
  field("Repository authority", run.contract.repositoryPath.startsWith("audit://") || run.contract.repositoryPath.startsWith("bulk://") ? "Read-only external target; no repository mutation permitted" : run.contract.repositoryPath);
  if (operation) {
    heading("4. Red Team · challenge");
    line(operation.red.challenge, { size: 11, font: bold, color: red, leading: 16 });
    line(`Attack path: ${operation.red.attackPath}`, { size: 10, leading: 15 });
    heading("5. Blue Team · optimization and verification");
    line(operation.blue.action, { size: 11, font: bold, color: mint, leading: 16 });
    line(`Verification target: ${operation.blue.verification}`, { size: 10, leading: 15 });
  } else {
    heading("4. Recommended review");
    line("Review the observed evidence and define the smallest safe correction within the authorized repository scope.", { size: 10, leading: 15 });
  }
  heading("6. Verification and proof register");
  if (run.proof?.verification.length) {
    for (const check of run.proof.verification) bullet(`${check.passed ? "PASS" : "FAIL"} · ${check.name}: ${check.detail}`);
  } else bullet("Read-only inspection: no repair verification was performed.");
  bullet(`Deployment: ${run.proof?.deployed ? "Claimed" : "Not performed"}`);
  bullet(`Branch: ${run.proof?.branch ?? "Not created"}`);
  heading("7. Evidence links");
  finding.evidenceIds.forEach((id, index) => {
    const item = readEvidence(store, id);
    if (!item) return;
    line(`Evidence ${index + 1}: ${item.kind}`, { size: 10, font: bold });
    line(`${origin}/api/evidence/${id}`, { size: 7, font: mono, color: cobalt });
    line(`SHA-256: ${item.sha256}`, { size: 7, font: mono, color: muted });
    line(`Evidence ID: ${id}`, { size: 7, font: mono, color: muted });
  });
  heading("8. Analysis limits");
  line("This report records observed findings and recommended review actions. It does not guarantee rankings, traffic, AI citations, vulnerability absence, or production remediation. External targets remain read-only unless an authorized local repository and explicit repair scope are supplied.", { size: 9, color: muted, leading: 14 });
  for (const [index, reportPage] of pdf.getPages().entries()) {
    reportPage.drawText(`TrustPatch RCA · ${finding.id} · Page ${index + 1} of ${pdf.getPageCount()}`, { x: 50, y: 28, size: 7, font: regular, color: muted });
  }
  return pdf.save();
}
