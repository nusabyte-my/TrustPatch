"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreateRunInput, RunEvent, RunView } from "@trustpatch/contracts";
import { BulkAudit } from "./bulk-audit";
import { MissionBrief } from "./mission-brief";
import { AgentCommand } from "./agent-command";

const terminal = new Set(["validated", "blocked", "cancelled"]);

export function Workbench() {
  const [message, setMessage] = useState("");
  const [run, setRun] = useState<RunView | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadedRunId, setLoadedRunId] = useState<string | null>(null);
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [followUpError, setFollowUpError] = useState("");
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
  async function startRun(input: CreateRunInput) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json() as { run?: RunView; error?: string };
      if (!response.ok || !data.run) throw new Error(data.error ?? "Run failed");
      setRun(data.run); await refresh(data.run.id);
    } catch (reason) { const message = reason instanceof Error ? reason.message : "Run failed"; setError(message.includes("targetUrl") || message.includes("Invalid URL") ? "Enter a valid website URL, such as https://nusabyte.my or nusabyte.my." : message); }
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
    setBusy(true); setFollowUpBusy(true); setFollowUpError(""); setError("");
    try {
      const response = await fetch(`/api/runs/${run.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const data = await response.json() as { run?: RunView; error?: string };
      if (!response.ok || !data.run) throw new Error(data.error ?? "Instruction failed");
      setRun(data.run); setMessage(""); await refresh(run.id);
    } catch (reason) { setFollowUpError(reason instanceof Error ? reason.message : "Instruction failed"); }
    finally { setBusy(false); setFollowUpBusy(false); }
  }
  async function cancel() { if (!run) return; await fetch(`/api/runs/${run.id}/cancel`, { method: "POST" }); await refresh(run.id); }
  return <>
    <main id="main" className="workbench agent-workbench">
      {!run && <MissionBrief busy={busy} onExecute={startRun} />}
      {run && <button className="new-mission-button" type="button" onClick={() => { setRun(null); setEvents([]); window.history.replaceState(null, "", window.location.pathname); }}>Start a new mission</button>}
      {!run && <BulkAudit />}
      {error && <div className="error" role="alert">{error}</div>}
      {run ? <AgentCommand run={run} events={events} busy={busy} message={message} onMessage={setMessage} onApprove={approve} onFollowUp={async () => { await followUp(); }} onCancel={cancel} followUpBusy={followUpBusy} followUpError={followUpError} /> : <section className="agent-empty"><div><p className="kicker">Seven roles. One controlled run.</p><h2>Choose the target.<br />Direct the team.</h2></div><div className="agent-empty-roles"><span>Mend coordinates</span><span>Inspector + Mapper investigate</span><span>SEO analyzes extraction</span><span>Recon observes reactive browser behavior</span><span>Repair patches approved files</span><span>Verifier proves the result</span></div></section>}
    </main>
    <footer><span>TrustPatch · Built by Shaidan Shaari (NusaByte)</span><span>AI proposes. Tools verify. Humans authorize.</span></footer>
  </>;
}
