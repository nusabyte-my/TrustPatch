"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { RunEvent, RunView } from "@trustpatch/contracts";
import { TrustPatchMark } from "./logo";
import { ActivityFeed } from "./activity-feed";
import { BulkAudit } from "./bulk-audit";
import { UsageGuide } from "./usage-guide";
import { TargetConsole } from "./target-console";

const starter = "Inspect the staging site. Fix confirmed indexing and security-header defects, but do not touch /blog. Stop before opening a PR.";
const terminal = new Set(["validated", "blocked", "cancelled"]);
const statusLabels: Record<string, string> = {
  queued: "Queued", investigating: "Investigating", awaiting_approval: "Approval required",
  repairing: "Repairing", verifying: "Verifying", awaiting_user: "Input required",
  validated: "Validated locally", blocked: "Blocked", paused_provider_error: "Provider paused", cancelled: "Cancelled"
};

export function Workbench() {
  const [objective, setObjective] = useState(starter);
  const [message, setMessage] = useState("");
  const [run, setRun] = useState<RunView | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [diff, setDiff] = useState("");
  const [loadedRunId, setLoadedRunId] = useState<string | null>(null);

  const refresh = useCallback(async (id: string) => {
    const response = await fetch(`/api/runs/${id}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not read run");
    const data = await response.json() as { run: RunView; events: RunEvent[] };
    setRun(data.run);
    setEvents(data.events);
  }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("run");
    if (!id || id === loadedRunId) return;
    setLoadedRunId(id);
    void refresh(id).catch(() => setError("Stored run could not be loaded"));
  }, [loadedRunId, refresh]);
  useEffect(() => {
    if (!run || terminal.has(run.status) || run.status === "awaiting_approval") return;
    const timer = setInterval(() => { void refresh(run.id).catch(() => undefined); }, 1500);
    return () => clearInterval(timer);
  }, [run, refresh]);
  useEffect(() => {
    const id = run?.proof?.diffEvidenceId;
    if (!id) { setDiff(""); return; }
    void fetch(`/api/evidence/${id}`).then((response) => response.text()).then(setDiff).catch(() => setDiff("Could not load diff"));
  }, [run?.proof?.diffEvidenceId]);

  async function startRun() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objective }) });
      const data = await response.json() as { run?: RunView; error?: string };
      if (!response.ok || !data.run) throw new Error(data.error ?? "Run failed");
      setRun(data.run); await refresh(data.run.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Run failed"); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await startRun();
  }
  async function approve() {
    if (!run?.approval) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/runs/${run.id}/approvals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scopeDigest: run.approval.scopeDigest }) });
      const data = await response.json() as { run?: RunView; error?: string };
      if (!response.ok || !data.run) throw new Error(data.error ?? "Approval failed");
      setRun(data.run); await refresh(run.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Approval failed"); }
    finally { setBusy(false); }
  }
  async function followUp(event: FormEvent) {
    event.preventDefault();
    if (!run || !message.trim()) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/runs/${run.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const data = await response.json() as { run?: RunView; error?: string };
      if (!response.ok || !data.run) throw new Error(data.error ?? "Instruction failed");
      setRun(data.run); setMessage(""); await refresh(run.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Instruction failed"); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!run) return;
    await fetch(`/api/runs/${run.id}/cancel`, { method: "POST" });
    await refresh(run.id);
  }
  function preset(text: string) { setObjective(text); document.getElementById("objective")?.focus(); }

  const findings = run?.proof?.findings ?? [];
  const progress = run?.status === "validated" ? 100 : run?.status === "verifying" ? 82 : run?.status === "repairing" ? 64 : run?.status === "awaiting_approval" ? 42 : run ? 22 : 0;

  return <>
    <main id="main" className="workbench">
      <TargetConsole onExecute={startRun} />
      <UsageGuide />
      <section className="command" aria-labelledby="objective-label"><div className="presets" aria-label="Instruction presets"><button onClick={() => preset("Investigate the staging site only. Explain confirmed findings; do not patch.")}>Investigate only</button><button onClick={() => preset(starter)}>Repair selected findings</button><button onClick={() => preset(`${starter} Do not open a pull request.`)}>Stop before pull request</button></div><form onSubmit={submit}><label id="objective-label" htmlFor="objective">What should Mend accomplish?</label><textarea id="objective" value={objective} onChange={(event) => setObjective(event.target.value)} rows={3} required /><div className="command-bottom"><span>Read-only investigation starts immediately. Mutations need your approval.</span><button className="primary" disabled={busy || objective.trim().length < 3}>{busy ? "Working…" : run ? "Start new run" : "Inspect and plan repair"}<span aria-hidden="true">↗</span></button></div></form></section>
      <BulkAudit />
      {error && <div className="error" role="alert">{error}</div>}
      {!run && <section className="empty"><div className="empty-index">01</div><div><h2>One controlled repair loop.</h2><p>Real website evidence, isolated code changes, and independent browser verification. No autonomous merge. No deployment.</p></div><div className="roles"><span>Mend · coordinates</span><span>Inspector · observes</span><span>Mapper · locates</span><span>Repair · patches</span><span>Verifier · proves</span></div></section>}
      {run && <div className="run-layout">
        <section className="run-main" aria-label="Repair run">
          <div className="run-heading"><div><p className="mono run-id">{run.id}</p><h2>{run.contract.objective}</h2></div><span className={`status status-${run.status}`}>{statusLabels[run.status] ?? run.status}</span></div>
          <div className="progress" aria-label={`Run progress ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
          <div className="run-meta"><span>Planner <strong>{run.proof?.planner ?? "pending"}</strong></span><span>Checking <strong className="target-url">{run.contract.targetUrl}</strong></span><span>Deployment <strong>Not permitted</strong></span></div>
          {run.status === "awaiting_approval" && run.approval && <section className="approval" aria-labelledby="approval-title"><p className="kicker">Authority boundary</p><h3 id="approval-title">Approve this exact repair scope</h3><p>Mend can change only these files in an isolated branch. Self-repair beyond this scope pauses for approval again.</p><div className="scope-grid"><div><h4>Findings</h4><strong>{run.approval.findingIds.length}</strong></div><div><h4>Draft PR</h4><strong>{run.approval.createPr ? "Allowed after validation" : "Not allowed"}</strong></div></div><h4>Allowed files</h4><ul className="file-list">{run.approval.allowedFiles.map((file) => <li key={file}>{file}</li>)}</ul><p className="digest">Scope digest <span>{run.approval.scopeDigest.slice(0, 18)}…</span></p><button className="primary" onClick={approve} disabled={busy}>{busy ? "Repairing and verifying…" : "Approve scoped repair"}</button></section>}
          <section className="findings" aria-labelledby="findings-title"><div className="section-heading"><h3 id="findings-title">Findings</h3><span>{findings.length} observed</span></div>{findings.length === 0 && <p className="muted">Evidence will appear after inspection.</p>}{findings.map((finding) => <article className="finding" key={finding.id}><div className="finding-top"><span className="finding-kind">{finding.kind.replace("_", " ")}</span><span className="finding-state">{finding.state}</span></div><h4>{finding.title}</h4><p>{finding.summary}</p><p className="mono">{finding.url}</p><div className="evidence-links">{finding.evidenceIds.slice(0, 3).map((id, index) => <button key={id} onClick={() => setSelectedEvidence(selectedEvidence === id ? null : id)} aria-expanded={selectedEvidence === id}>{index === 0 ? "Raw" : index === 1 ? "Rendered" : "Headers"} evidence</button>)}</div>{selectedEvidence === finding.evidenceIds[0] && <Evidence id={finding.evidenceIds[0]!} />}{selectedEvidence === finding.evidenceIds[1] && <Evidence id={finding.evidenceIds[1]!} />}{selectedEvidence === finding.evidenceIds[2] && <Evidence id={finding.evidenceIds[2]!} />}</article>)}</section>
          {diff && <section className="diff"><div className="section-heading"><h3>Proposed repair</h3><span>Stored complete diff</span></div><pre tabIndex={0}>{diff}</pre></section>}
          <ActivityFeed events={events} />
        </section>
        <aside className="side-panel" aria-label="Proof and follow-up">
          <section className="proof"><p className="kicker">Proof receipt</p><h3>{run.proof?.status === "validated" ? "Repair verified." : run.status === "awaiting_approval" ? "Awaiting your decision." : run.status === "blocked" ? "Not validated." : "Evidence in progress."}</h3><dl><div><dt>Changed files</dt><dd>{run.proof?.changedFiles.length ?? 0}</dd></div><div><dt>Checks passed</dt><dd>{run.proof?.verification.filter((check) => check.passed).length ?? 0} / {run.proof?.verification.length ?? 0}</dd></div><div><dt>Branch</dt><dd className="mono">{run.proof?.branch ?? "Not created"}</dd></div><div><dt>Deployed</dt><dd>Never by Mend</dd></div></dl>{run.proof?.verification.map((check, index) => <div className={`check ${check.passed ? "passed" : "failed"}`} key={`${check.name}-${index}`}><span>{check.passed ? "✓" : "×"}</span><div><strong>{check.name}</strong><p>{check.detail}</p></div></div>)}{run.error && <p className="error-detail">{run.error}</p>}</section>
          <section className="follow-up"><h3>Instruct Mend</h3><form onSubmit={followUp}><label htmlFor="followup">Follow-up instruction</label><textarea id="followup" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={run.status === "validated" ? "Open the draft PR with this evidence…" : run.status === "paused_provider_error" ? "Resume the repair…" : "Ask about a finding…"} /><button className="secondary" disabled={busy || !message.trim()}>Send instruction</button></form>{!terminal.has(run.status) && run.status !== "awaiting_approval" && <button className="text-button" onClick={cancel}>Cancel run</button>}</section>
        </aside>
      </div>}
    </main>
    <footer><span>TrustPatch · Evidence before inference</span><span>AI proposes. Tools verify. Humans authorize.</span></footer>
  </>;
}

function Evidence({ id }: { id: string }) {
  const [text, setText] = useState("Loading complete evidence…");
  useEffect(() => { void fetch(`/api/evidence/${id}`).then((response) => response.text()).then(setText).catch(() => setText("Evidence unavailable")); }, [id]);
  return <pre className="evidence" tabIndex={0}>{text}</pre>;
}
