"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Bot, Check, ChevronRight, Code2, Download, FileSearch, Map, Radar, ScanSearch, ShieldCheck, X, ExternalLink, FileText } from "lucide-react";
import type { RunEvent, RunView } from "@trustpatch/contracts";
import { WorkflowActivity } from "./workflow-activity";
import { SeoOperationsEvidence } from "./seo-operations-evidence";
import { FindingReportPreview } from "./finding-report-preview";
import { findingExecutiveSummaryText } from "./executive-summary";

const agents = [
  { role: "mend", label: "Mend", task: "Coordinates the run", intro: "I’m coordinating the team around your goal and scope.", icon: Bot },
  { role: "inspector", label: "Inspector", task: "Observes pages + headers", intro: "I check what search engines and visitors actually receive.", icon: ScanSearch },
  { role: "mapper", label: "Mapper", task: "Maps findings to files", intro: "I connect confirmed problems to the files responsible.", icon: Map },
  { role: "seo", label: "SEO Red / Blue", task: "Challenges and verifies search visibility", intro: "Red Team finds the evidence-backed weakness. Blue Team defines the safe optimization and proof target.", icon: FileSearch },
  { role: "recon", label: "Security Recon", task: "Artifacts, secrets + dependency CVEs", intro: "I inspect public website and repository evidence, match exact dependency versions to advisories, and enrich CVEs with EPSS and CISA KEV when configured. Secret values are never used or validated.", icon: Radar },
  { role: "repair", label: "Repair", task: "Patches approved scope", intro: "I prepare only the changes you explicitly approve.", icon: Code2 },
  { role: "verifier", label: "Verifier", task: "Proves the result", intro: "I test the result independently before calling it fixed.", icon: ShieldCheck }
];
const roleLabels = Object.fromEntries(agents.map((agent) => [agent.role, agent.label]));
const statusLabels: Record<string, string> = { queued: "Queued", investigating: "Investigating", awaiting_approval: "Your decision", repairing: "Repairing", verifying: "Verifying", awaiting_user: "Input required", validated: "Validated", blocked: "Blocked", paused_provider_error: "Paused", cancelled: "Cancelled" };

interface Props {
  run: RunView;
  events: RunEvent[];
  busy: boolean;
  message: string;
  onMessage: (value: string) => void;
  onApprove: () => void;
  onFollowUp: () => void;
  onCancel: () => void;
  followUpBusy: boolean;
  followUpError: string;
}
type Panel = "findings" | "activity" | "diff" | "followup" | "recon" | "seo_operations" | "followup_receipt" | "report_preview" | "email_report";

export function AgentCommand({ run, events, busy, message, onMessage, onApprove, onFollowUp, onCancel, followUpBusy, followUpError }: Props) {
  const [selectedRole, setSelectedRole] = useState("mend");
  const [panel, setPanel] = useState<Panel | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [reviewFindingId, setReviewFindingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailResult, setEmailResult] = useState<{ delivered: boolean; provider: string; id?: string; eml?: string; subject: string; summary: string; reportUrl: string } | null>(null);
  const [clientMode, setClientMode] = useState(true);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const roleEvents = events.filter((event) => event.type === "activity" && event.role === selectedRole);
  const selected = agents.find((agent) => agent.role === selectedRole)!;
  const findings = run.proof?.findings ?? [];
  const reconEvidenceId = events.find((event) => event.role === "recon" && event.data.activity === "rea")?.data.evidenceId as string | undefined ?? events.find((event) => event.role === "recon" && typeof event.data.evidenceId === "string")?.data.evidenceId as string | undefined;
  const hasReactiveEvidence = events.some((event) => event.role === "recon" && event.data.activity === "recon" && typeof event.data.evidenceId === "string");
  const repairableCount = findings.filter((finding) => ["noindex", "canonical", "security_header"].includes(finding.kind)).length;
  const opportunityCount = findings.length - repairableCount;
  const seoOperationsEvidenceId = events.find((event) => event.role === "seo" && event.data.activity === "seo_blue")?.data.evidenceId as string | undefined;
  const latestAnswer = events.findLast((event) => event.type === "instruction.answered");
  const followUpEvidenceId = events.findLast((event) => event.data.activity === "follow_up")?.data.evidenceId as string | undefined;
  const reviewFinding = findings.find((finding) => finding.id === reviewFindingId) ?? findings[0];
  function openPanel(next: Panel, trigger: HTMLButtonElement) { triggerRef.current = trigger; setEmailError(""); setEmailResult(null); setPanel(next); }
  function closePanel() { setPanel(null); setEmailBusy(false); triggerRef.current?.focus(); }
  async function sendReportEmail() {
    if (!reviewFinding || !email.trim()) return;
    setEmailBusy(true); setEmailError(""); setEmailResult(null);
    try {
      const response = await fetch(`/api/runs/${run.id}/findings/${reviewFinding.id}/email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, confirmed: true }) });
      const data = await response.json() as { result?: { delivered: boolean; provider: string; id?: string; eml?: string; subject: string; summary: string; reportUrl: string }; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error ?? "Could not prepare email report");
      setEmailResult(data.result);
    } catch (reason) { setEmailError(reason instanceof Error ? reason.message : "Could not prepare email report"); }
    finally { setEmailBusy(false); }
  }
  useEffect(() => { if (!panel) return; closeRef.current?.focus(); const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], textarea, input, [tabindex='0']");
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }; document.addEventListener("keydown", key); return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", key); }; }, [panel]);
  const roleState = (role: string) => {
    const latest = events.findLast((event) => event.type === "activity" && event.role === role);
    if (!latest) return "waiting";
    if (terminalRun(run.status)) return latest.data.status === "warning" && run.status !== "validated" ? "attention" : "done";
    return latest.data.status === "warning" ? "attention" : latest.data.status === "success" ? "done" : latest.data.status === "active" ? "working" : "ready";
  };
  return <section className="agent-command" aria-labelledby="agent-command-title">
    <div className="command-status"><div><span className="command-live" /><h2 id="agent-command-title">Agent command center</h2><span className={`command-state command-state-${run.status}`}>{statusLabels[run.status] ?? run.status}</span></div><div className="command-header-actions"><button className="client-mode-toggle" type="button" onClick={() => setClientMode(!clientMode)} aria-pressed={clientMode}>{clientMode ? "Client view" : "Technical view"}</button><span className="command-target">{run.contract.targetUrl}</span></div></div>
    <div className="command-progress"><span style={{ width: `${run.status === "validated" ? 100 : run.status === "verifying" ? 82 : run.status === "repairing" ? 64 : run.status === "awaiting_approval" ? 42 : 22}%` }} /></div>
    <div className="mission-steps" aria-label="Mission progress"><span className="complete">Brief</span><span className={["investigating", "awaiting_approval", "repairing", "verifying", "validated"].includes(run.status) ? "complete" : "active"}>Inspect</span><span className={run.status === "awaiting_approval" ? "active" : ["repairing", "verifying", "validated"].includes(run.status) ? "complete" : ""}>Decide</span>{!run.contract.readOnly && <span className={["repairing", "verifying"].includes(run.status) ? "active" : run.status === "validated" ? "complete" : ""}>Repair</span>}<span className={run.status === "verifying" ? "active" : run.status === "validated" ? "complete" : ""}>Verify</span></div>
    {clientMode && <div className="client-decision-bar"><div><span>Mend’s recommendation</span><strong>{repairableCount ? `Review ${repairableCount} technical repair${repairableCount === 1 ? "" : "s"} first; keep ${opportunityCount} content opportunit${opportunityCount === 1 ? "y" : "ies"} separate.` : `${findings.length} evidence-backed opportunities are ready for review.`}</strong></div><div className="client-decision-chips"><button type="button" onClick={() => setSelectedRole("inspector")}>Show business impact</button><button type="button" onClick={(event) => openPanel("findings", event.currentTarget)} disabled={!findings.length}>Review findings</button><button type="button" onClick={(event) => { onMessage("Summarize the evidence in plain language and recommend the safest next action. Read-only; do not change files."); openPanel("followup", event.currentTarget); }}>Ask Mend what’s next</button></div></div>}
    <WorkflowActivity status={run.status} events={events} onOpen={(trigger) => openPanel("activity", trigger)} />
    <div className="command-grid">
      <div className="agent-roster" role="group" aria-label="Select a specialist">{agents.map(({ role, label, task, icon: Icon }) => <button type="button" className={`agent-role agent-role-${roleState(role)} ${selectedRole === role ? "agent-role-selected" : ""}`} key={role} onClick={() => setSelectedRole(role)} aria-pressed={selectedRole === role}><span className="agent-icon"><Icon size={18} aria-hidden="true" /></span><span><strong>{label}</strong><small>{task}</small></span><span className="agent-role-state">{roleState(role)}</span></button>)}</div>
      <div className="agent-focus"><div className="agent-focus-heading"><div><span className="agent-focus-role">{selected.label}</span><h3>{selected.task}</h3><p className="agent-introduction">{selected.intro}</p></div><Activity size={20} aria-hidden="true" /></div>{roleEvents.length ? <div className="agent-focus-events" aria-live="polite">{roleEvents.slice(-3).reverse().map((event) => <div className="agent-focus-event" key={event.id}><span className={`focus-dot focus-dot-${event.data.status ?? "info"}`} /><p>{clientMode ? clientMessage(event.message) : event.message}</p><time>{new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>)}</div> : <div className="agent-idle"><Bot size={24} aria-hidden="true" /><p>{selected.label} is waiting for a relevant task. Select another specialist to inspect its activity.</p></div>}<div className="agent-focus-actions"><button type="button" onClick={(event) => openPanel("activity", event.currentTarget)}>Full activity <ChevronRight size={15} aria-hidden="true" /></button><button type="button" disabled={!findings.length} onClick={(event) => openPanel("findings", event.currentTarget)}>{findings.length} findings <ChevronRight size={15} aria-hidden="true" /></button><button type="button" disabled={!run.proof?.diffEvidenceId} onClick={(event) => openPanel("diff", event.currentTarget)}>View diff <ChevronRight size={15} aria-hidden="true" /></button>{selectedRole === "seo" && seoOperationsEvidenceId && <button type="button" onClick={(event) => openPanel("seo_operations", event.currentTarget)}>Red/Blue plan <ChevronRight size={15} aria-hidden="true" /></button>}{selectedRole === "recon" && <button type="button" disabled={!reconEvidenceId} onClick={(event) => openPanel("recon", event.currentTarget)}>Recon evidence <ChevronRight size={15} aria-hidden="true" /></button>}</div></div>
      <aside className="command-decision">{run.status === "awaiting_approval" && run.approval ? <><span className="decision-label">Approval required</span><h3>Approve {run.approval.allowedFiles.length} scoped files.</h3><ul>{run.approval.allowedFiles.map((file) => <li key={file}>{file}</li>)}</ul><p>Only these files. Isolated branch. No merge or deployment.</p><button className="command-approve" type="button" disabled={busy} onClick={onApprove}>{busy ? "Approving…" : "Approve scoped repair"} <ChevronRight size={17} aria-hidden="true" /></button></> : run.status === "validated" ? <><span className="decision-label">{run.contract.readOnly ? "Inspection receipt" : "Proof Receipt"}</span><h3>{run.contract.readOnly ? "Inspection complete." : "Repair verified."}</h3>{run.contract.readOnly ? <div className="decision-checks"><div><Check size={16} aria-hidden="true" /><span>{findings.length} findings stored</span></div><div><Check size={16} aria-hidden="true" /><span>{hasReactiveEvidence ? "Reactive browser evidence captured" : "Reactive evidence unavailable; page inspection preserved"}</span></div><div><Check size={16} aria-hidden="true" /><span>No repository changes</span></div></div> : <div className="decision-checks">{run.proof?.verification.map((check) => <div key={check.name}><Check size={16} aria-hidden="true" /><span>{check.name}</span></div>)}</div>}<button className="command-approve" type="button" onClick={(event) => openPanel("followup", event.currentTarget)}>Continue with Mend <ChevronRight size={17} aria-hidden="true" /></button></> : <><span className="decision-label">Current decision</span><h3>{run.status === "blocked" ? "Repair not validated." : "Mend is working."}</h3><p>{events.at(-1) ? clientMode ? clientMessage(events.at(-1)!.message) : events.at(-1)!.message : "The run is queued. Specialist activity will appear here."}</p><div className="decision-waiting"><span className="command-live" />Evidence updates automatically</div></>}{!terminalRun(run.status) && <button className="command-cancel" type="button" onClick={onCancel}>Stop this run</button>}</aside>
    </div>
    {panel && <div className="agent-drawer-layer"><button className="agent-scrim" aria-label="Close output review" onClick={closePanel} /><section className="agent-drawer agent-review-modal" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-describedby="review-description"><p id="review-description" className="sr-only">Review actual findings, proof, RCA output, and recommended next actions.</p><div className="drawer-heading"><div><span className="decision-label">Run evidence</span><h2 id="drawer-title">{panel === "findings" ? "Observed findings" : panel === "diff" ? "Proposed repair" : panel === "followup" ? "Continue the run" : panel === "recon" ? "Reactive web evidence" : panel === "seo_operations" ? "Red Team / Blue Team SEO" : panel === "followup_receipt" ? "Mend’s recommendation" : panel === "report_preview" ? "RCA output review" : panel === "email_report" ? "Email RCA report" : "Agent activity"}</h2></div><button className="drawer-close" ref={closeRef} type="button" onClick={closePanel} aria-label="Close details"><X size={20} aria-hidden="true" /></button></div><div className="drawer-body">{panel === "findings" && findings.map((finding) => <article className="drawer-finding" key={finding.id}><span>{finding.kind.replaceAll("_", " ")}</span><h3>{finding.title}</h3><p>{finding.summary}</p>{clientMode && <p className="finding-business-impact">{finding.kind === "canonical" ? "Search engines may index the wrong address, splitting visibility between versions." : finding.kind === "noindex" ? "This page may be excluded from search results even when its content is ready." : finding.kind === "security_header" ? "The browser lacks a response policy that helps protect visitors and reinforces trust." : finding.kind === "dependency_vulnerability" ? "This locked dependency matches a published vulnerability advisory. Review the CVE evidence and upgrade to a compatible fixed release; this does not prove the application is exploitable." : finding.kind === "api_leak" || finding.kind === "repo_secret" ? "A secret-shaped value appears in public content. Rotate it and remove it from public artifacts; the scanner did not use or validate it." : finding.kind === "repo_config" ? "A tracked configuration requires supply-chain or credential-exposure review." : finding.kind === "security_misconfiguration" ? "A browser or API policy requires security review." : finding.kind === "exposed_artifact" ? "An unencrypted public artifact or form destination requires review." : "This can make the page harder to understand, discover, or present accurately."}</p>}<div className="finding-actions"><button type="button" onClick={() => setSelectedEvidence(selectedEvidence === finding.evidenceIds[0] ? null : finding.evidenceIds[0])}>{selectedEvidence === finding.evidenceIds[0] ? "Hide evidence" : "Inspect evidence"}</button><a className="finding-report-link" href={`/api/runs/${run.id}/findings/${finding.id}/report`} target="_blank" rel="noreferrer"><ExternalLink size={13} aria-hidden="true" /> Open PDF</a><button className="finding-preview-button" type="button" onClick={() => { setReviewFindingId(finding.id); setPanel("report_preview"); }}><FileText size={13} aria-hidden="true" /> Review RCA</button><button className="finding-preview-button" type="button" onClick={() => { setReviewFindingId(finding.id); setPanel("email_report"); }}>Email RCA</button><a className="finding-report-link" href={`/api/runs/${run.id}/findings/${finding.id}/report`} download><Download size={13} aria-hidden="true" /> Download</a></div>{selectedEvidence === finding.evidenceIds[0] && <Evidence id={finding.evidenceIds[0]} />}</article>)}{panel === "activity" && <ol className="drawer-activity">{events.map((event) => <li key={event.id}><span>{roleLabels[event.role] ?? event.role}</span><div><p>{event.message}</p><time>{new Date(event.createdAt).toLocaleTimeString()}</time></div></li>)}</ol>}{panel === "diff" && <Evidence id={run.proof!.diffEvidenceId!} />}{panel === "recon" && reconEvidenceId && <Evidence id={reconEvidenceId} />}{panel === "seo_operations" && seoOperationsEvidenceId && <SeoOperationsEvidence id={seoOperationsEvidenceId} />}{panel === "followup" && <form onSubmit={(event) => { event.preventDefault(); onFollowUp(); setPanel("followup_receipt"); }}><label htmlFor="command-message">What should Mend do next?</label><textarea id="command-message" rows={5} value={message} onChange={(event) => onMessage(event.target.value)} placeholder="Explain this finding, then propose a read-only next step." required />{followUpError && <p className="error" role="alert">{followUpError}</p>}<button className="command-approve" type="submit" disabled={followUpBusy || !message.trim()}>{followUpBusy ? "Sending to Mend…" : "Send instruction"} <ChevronRight size={17} aria-hidden="true" /></button></form>}{panel === "report_preview" && reviewFinding && <FindingReportPreview run={run} finding={reviewFinding} />}{panel === "email_report" && reviewFinding && <section className="email-report"><span className="decision-label">Executive summary</span><p>{findingExecutiveSummaryText(run, reviewFinding)}</p><form onSubmit={(event) => { event.preventDefault(); void sendReportEmail(); }}><label htmlFor="report-email">Recipient email<input id="report-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="client@example.com" required /></label><label className="email-confirm"><input type="checkbox" required /> I confirm this recipient should receive the finding and its RCA PDF.</label>{emailError && <p className="error" role="alert">{emailError}</p>}<button className="command-approve" type="submit" disabled={emailBusy || !email.trim()}>{emailBusy ? "Preparing report…" : "Prepare and send RCA email"}</button></form>{emailResult && <div className="email-result" role="status"><strong>{emailResult.delivered ? `Email sent via ${emailResult.provider}.` : "Email preview ready — no provider configured; nothing was sent."}</strong><p>{emailResult.summary}</p><a href={emailResult.reportUrl} target="_blank" rel="noreferrer">Open the real RCA PDF</a>{emailResult.eml && <a href={`data:message/rfc822;charset=utf-8,${encodeURIComponent(emailResult.eml)}`} download={`trustpatch-${reviewFinding.kind}-report.eml`}>Download email preview with PDF attachment</a>}</div>}</section>}{panel === "followup_receipt" && latestAnswer && <div className="followup-receipt"><span className="decision-label">Mend’s answer</span><p>{latestAnswer.message}</p>{followUpEvidenceId && <a className="finding-report-link" href={`/api/evidence/${followUpEvidenceId}`} target="_blank" rel="noreferrer">Open the evidence-backed recommendation</a>}<div className="followup-next-actions"><button className="command-approve" type="button" onClick={(event) => { const next = latestAnswer.data.nextTool; openPanel(next === "review_seo_operations" ? "seo_operations" : next === "inspect_findings" ? "findings" : next === "review_repair_proof" ? "diff" : "activity", event.currentTarget); }}>Open the recommended next step <ChevronRight size={16} /></button></div></div>}</div></section></div>}
  </section>;
}
function clientMessage(message: string) {
  if (message.startsWith("Vulnerability observed")) return "I found a confirmed issue that deserves review. Open the technical view for the exact evidence.";
  if (message.startsWith("Verification failed")) return "The first proposed change did not pass every check. The team is reviewing it inside the approved scope.";
  if (message.startsWith("Reactive evidence captured")) return "The real browser check is complete. Runtime evidence is ready to inspect.";
  if (message.startsWith("Inspection complete")) return "The initial inspection is complete. Review the findings and choose the next action.";
  return message;
}
function terminalRun(status: string) { return ["validated", "blocked", "cancelled"].includes(status); }
function Evidence({ id }: { id: string }) {
  const [text, setText] = useState("Loading complete evidence…");
  useEffect(() => { void fetch(`/api/evidence/${id}`).then((response) => response.text()).then(setText).catch(() => setText("Evidence unavailable")); }, [id]);
  return <pre className="evidence" tabIndex={0}>{text}</pre>;
}
