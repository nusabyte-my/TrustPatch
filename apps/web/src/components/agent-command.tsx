"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Bot, Check, ChevronRight, Code2, FileSearch, Map, Radar, ScanSearch, ShieldCheck, X } from "lucide-react";
import type { RunEvent, RunView } from "@trustpatch/contracts";

const agents = [
  { role: "mend", label: "Mend", task: "Coordinates the run", icon: Bot },
  { role: "inspector", label: "Inspector", task: "Observes pages + headers", icon: ScanSearch },
  { role: "mapper", label: "Mapper", task: "Maps findings to files", icon: Map },
  { role: "seo", label: "SEO", task: "Checks search + AI extraction", icon: FileSearch },
  { role: "recon", label: "Recon", task: "Reactive browser + optional REA", icon: Radar },
  { role: "repair", label: "Repair", task: "Patches approved scope", icon: Code2 },
  { role: "verifier", label: "Verifier", task: "Proves the result", icon: ShieldCheck }
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
}
type Panel = "findings" | "activity" | "diff" | "followup" | "recon";

export function AgentCommand({ run, events, busy, message, onMessage, onApprove, onFollowUp, onCancel }: Props) {
  const [selectedRole, setSelectedRole] = useState("mend");
  const [panel, setPanel] = useState<Panel | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const roleEvents = events.filter((event) => event.type === "activity" && event.role === selectedRole);
  const selected = agents.find((agent) => agent.role === selectedRole)!;
  const findings = run.proof?.findings ?? [];
  const reconEvidenceId = events.find((event) => event.role === "recon" && event.data.activity === "rea")?.data.evidenceId as string | undefined ?? events.find((event) => event.role === "recon" && typeof event.data.evidenceId === "string")?.data.evidenceId as string | undefined;
  function openPanel(next: Panel, trigger: HTMLButtonElement) { triggerRef.current = trigger; setPanel(next); }
  function closePanel() { setPanel(null); triggerRef.current?.focus(); }
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
    <div className="command-status"><div><span className="command-live" /><h2 id="agent-command-title">Agent command center</h2><span className={`command-state command-state-${run.status}`}>{statusLabels[run.status] ?? run.status}</span></div><span className="command-target">{run.contract.targetUrl}</span></div>
    <div className="command-progress"><span style={{ width: `${run.status === "validated" ? 100 : run.status === "verifying" ? 82 : run.status === "repairing" ? 64 : run.status === "awaiting_approval" ? 42 : 22}%` }} /></div>
    <div className="command-grid">
      <div className="agent-roster" role="group" aria-label="Select a specialist">{agents.map(({ role, label, task, icon: Icon }) => <button type="button" className={`agent-role agent-role-${roleState(role)} ${selectedRole === role ? "agent-role-selected" : ""}`} key={role} onClick={() => setSelectedRole(role)} aria-pressed={selectedRole === role}><span className="agent-icon"><Icon size={18} aria-hidden="true" /></span><span><strong>{label}</strong><small>{task}</small></span><span className="agent-role-state">{roleState(role)}</span></button>)}</div>
      <div className="agent-focus"><div className="agent-focus-heading"><div><span className="agent-focus-role">{selected.label}</span><h3>{selected.task}</h3></div><Activity size={20} aria-hidden="true" /></div>{roleEvents.length ? <div className="agent-focus-events" aria-live="polite">{roleEvents.slice(-3).reverse().map((event) => <div className="agent-focus-event" key={event.id}><span className={`focus-dot focus-dot-${event.data.status ?? "info"}`} /><p>{event.message}</p><time>{new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>)}</div> : <div className="agent-idle"><Bot size={24} aria-hidden="true" /><p>{selected.label} is waiting for a relevant task. Select another specialist to inspect its activity.</p></div>}<div className="agent-focus-actions"><button type="button" onClick={(event) => openPanel("activity", event.currentTarget)}>Full activity <ChevronRight size={15} aria-hidden="true" /></button><button type="button" disabled={!findings.length} onClick={(event) => openPanel("findings", event.currentTarget)}>{findings.length} findings <ChevronRight size={15} aria-hidden="true" /></button><button type="button" disabled={!run.proof?.diffEvidenceId} onClick={(event) => openPanel("diff", event.currentTarget)}>View diff <ChevronRight size={15} aria-hidden="true" /></button>{selectedRole === "recon" && <button type="button" disabled={!reconEvidenceId} onClick={(event) => openPanel("recon", event.currentTarget)}>Recon evidence <ChevronRight size={15} aria-hidden="true" /></button>}</div></div>
      <aside className="command-decision">{run.status === "awaiting_approval" && run.approval ? <><span className="decision-label">Approval required</span><h3>Approve {run.approval.allowedFiles.length} scoped files.</h3><ul>{run.approval.allowedFiles.map((file) => <li key={file}>{file}</li>)}</ul><p>Only these files. Isolated branch. No merge or deployment.</p><button className="command-approve" type="button" disabled={busy} onClick={onApprove}>{busy ? "Approving…" : "Approve scoped repair"} <ChevronRight size={17} aria-hidden="true" /></button></> : run.status === "validated" ? <><span className="decision-label">{run.contract.readOnly ? "Inspection receipt" : "Proof Receipt"}</span><h3>{run.contract.readOnly ? "Inspection complete." : "Repair verified."}</h3>{run.contract.readOnly ? <div className="decision-checks"><div><Check size={16} aria-hidden="true" /><span>{findings.length} findings stored</span></div><div><Check size={16} aria-hidden="true" /><span>Reactive browser evidence captured</span></div><div><Check size={16} aria-hidden="true" /><span>No repository changes</span></div></div> : <div className="decision-checks">{run.proof?.verification.map((check) => <div key={check.name}><Check size={16} aria-hidden="true" /><span>{check.name}</span></div>)}</div>}<button className="command-approve" type="button" onClick={(event) => openPanel("followup", event.currentTarget)}>Continue with Mend <ChevronRight size={17} aria-hidden="true" /></button></> : <><span className="decision-label">Current decision</span><h3>{run.status === "blocked" ? "Repair not validated." : "Mend is working."}</h3><p>{events.at(-1)?.message ?? "The run is queued. Specialist activity will appear here."}</p><div className="decision-waiting"><span className="command-live" />Evidence updates automatically</div></>}{!terminalRun(run.status) && <button className="command-cancel" type="button" onClick={onCancel}>Stop this run</button>}</aside>
    </div>
    {panel && <div className="agent-drawer-layer"><button className="agent-scrim" aria-label="Close details" onClick={closePanel} /><section className="agent-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div className="drawer-heading"><div><span className="decision-label">Run evidence</span><h2 id="drawer-title">{panel === "findings" ? "Observed findings" : panel === "diff" ? "Proposed repair" : panel === "followup" ? "Continue the run" : panel === "recon" ? "Reactive web evidence" : "Agent activity"}</h2></div><button className="drawer-close" ref={closeRef} type="button" onClick={closePanel} aria-label="Close details"><X size={20} aria-hidden="true" /></button></div><div className="drawer-body">{panel === "findings" && findings.map((finding) => <article className="drawer-finding" key={finding.id}><span>{finding.kind.replaceAll("_", " ")}</span><h3>{finding.title}</h3><p>{finding.summary}</p><button type="button" onClick={() => setSelectedEvidence(selectedEvidence === finding.evidenceIds[0] ? null : finding.evidenceIds[0])}>{selectedEvidence === finding.evidenceIds[0] ? "Hide evidence" : "Inspect evidence"}</button>{selectedEvidence === finding.evidenceIds[0] && <Evidence id={finding.evidenceIds[0]} />}</article>)}{panel === "activity" && <ol className="drawer-activity">{events.map((event) => <li key={event.id}><span>{roleLabels[event.role] ?? event.role}</span><div><p>{event.message}</p><time>{new Date(event.createdAt).toLocaleTimeString()}</time></div></li>)}</ol>}{panel === "diff" && <Evidence id={run.proof!.diffEvidenceId!} />}{panel === "recon" && reconEvidenceId && <Evidence id={reconEvidenceId} />}{panel === "followup" && <form onSubmit={(event) => { event.preventDefault(); onFollowUp(); closePanel(); }}><label htmlFor="command-message">What should Mend do next?</label><textarea id="command-message" rows={5} value={message} onChange={(event) => onMessage(event.target.value)} placeholder="Explain this finding, then propose a read-only next step." required /><button className="command-approve" type="submit" disabled={busy}>{busy ? "Sending…" : "Send instruction"} <ChevronRight size={17} aria-hidden="true" /></button></form>}</div></section></div>}
  </section>;
}
function terminalRun(status: string) { return ["validated", "blocked", "cancelled"].includes(status); }
function Evidence({ id }: { id: string }) {
  const [text, setText] = useState("Loading complete evidence…");
  useEffect(() => { void fetch(`/api/evidence/${id}`).then((response) => response.text()).then(setText).catch(() => setText("Evidence unavailable")); }, [id]);
  return <pre className="evidence" tabIndex={0}>{text}</pre>;
}
