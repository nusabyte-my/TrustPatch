"use client";

import { useCallback, useEffect, useState } from "react";
import type { RunEvent, RunView } from "@trustpatch/contracts";
import { BulkAudit } from "./bulk-audit";
import { TargetConsole } from "./target-console";
import { AgentCommand } from "./agent-command";

const starter = "Inspect the staging site. Fix confirmed indexing and security-header defects, but do not touch /blog. Stop before opening a PR.";
const terminal = new Set(["validated", "blocked", "cancelled"]);

export function Workbench() {
  const [objective, setObjective] = useState(starter);
  const [message, setMessage] = useState("");
  const [run, setRun] = useState<RunView | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadedRunId, setLoadedRunId] = useState<string | null>(null);
  useEffect(() => {
    if (!run) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("run") === run.id) return;
    url.searchParams.set("run", run.id);
    window.history.replaceState(null, "", url);
  }, [run?.id]);

  const refresh = useCallback(async (id: string) => {
    const response = await fetch(`/api/runs/${id}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not read run");
    const data = await response.json() as { run: RunView; events: RunEvent[] };
    setRun(data.run); setEvents(data.events);
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
  async function startRun(nextObjective = objective) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ objective: nextObjective }) });
      const data = await response.json() as { run?: RunView; error?: string };
      if (!response.ok || !data.run) throw new Error(data.error ?? "Run failed");
      setRun(data.run); await refresh(data.run.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Run failed"); }
    finally { setBusy(false); }
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
  async function followUp() {
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
  async function cancel() { if (!run) return; await fetch(`/api/runs/${run.id}/cancel`, { method: "POST" }); await refresh(run.id); }
  return <>
    <main id="main" className="workbench agent-workbench">
      <TargetConsole onExecute={startRun} />
      {!run && <BulkAudit />}
      {error && <div className="error" role="alert">{error}</div>}
      {run ? <AgentCommand run={run} events={events} busy={busy} message={message} onMessage={setMessage} onApprove={approve} onFollowUp={followUp} onCancel={cancel} /> : <section className="agent-empty"><div><p className="kicker">Six roles. One controlled run.</p><h2>Choose the target.<br />Direct the team.</h2></div><div className="agent-empty-roles"><span>Mend coordinates</span><span>Inspector + Mapper investigate</span><span>SEO analyzes extraction</span><span>Repair patches approved files</span><span>Verifier proves the result</span></div></section>}
    </main>
    <footer><span>TrustPatch · Evidence before confidence</span><span>AI proposes. Tools verify. Humans authorize.</span></footer>
  </>;
}
