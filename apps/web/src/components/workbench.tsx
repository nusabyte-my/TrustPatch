"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreateRunInput, RunEvent, RunView } from "@trustpatch/contracts";
import { BulkAudit } from "./bulk-audit";
import { MissionBrief } from "./mission-brief";
import { AgentCommand } from "./agent-command";
import { AgentWarRoom } from "./agent-war-room";
import { AgentChatWebUI } from "./agent-chat-webui";

const TERMINAL_STATUSES: Record<string, true> = { validated: true, blocked: true, cancelled: true };
export function Workbench() {
  const [message, setMessage] = useState("");
  const [run, setRun] = useState<RunView | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadedRunId, setLoadedRunId] = useState<string | null>(null);
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [followUpError, setFollowUpError] = useState("");
  const [activeView, setActiveView] = useState<"command" | "chat" | "warroom">("command");
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
    if (!run || TERMINAL_STATUSES[run.status] || run.status === "awaiting_approval") return;
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
      {run && (
        <div className="view-mode-toggle antislop-toggle">
          <button
            type="button"
            className={`view-toggle-btn ${activeView === "command" ? "active" : ""}`}
            onClick={() => setActiveView("command")}
          >
            COMMAND CENTER &amp; ROSTER
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${activeView === "chat" ? "active" : ""}`}
            onClick={() => setActiveView("chat")}
          >
            PEER CHAT STREAM
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${activeView === "warroom" ? "active" : ""}`}
            onClick={() => setActiveView("warroom")}
          >
            SANDBOX NODES &amp; SUBTREE
          </button>
        </div>
      )}
      {run && activeView === "chat" && (
        <AgentChatWebUI
          run={run}
          events={events}
          busy={busy || followUpBusy}
          onSendMessage={async (msg) => {
            setMessage(msg);
            try {
              setBusy(true);
              const response = await fetch(`/api/runs/${run.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg })
              });
              if (response.ok) {
                setMessage("");
                await refresh(run.id);
              }
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {run && activeView === "warroom" && (
        <AgentWarRoom
          run={run}
          events={events}
          onInjectMessage={async (msg) => {
            setMessage(msg);
            try {
              setBusy(true);
              const response = await fetch(`/api/runs/${run.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg })
              });
              if (response.ok) {
                setMessage("");
                await refresh(run.id);
              }
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {run && activeView === "command" && (
        <AgentCommand
          run={run}
          events={events}
          busy={busy}
          message={message}
          onMessage={setMessage}
          onApprove={approve}
          onFollowUp={async () => { await followUp(); }}
          onCancel={cancel}
          followUpBusy={followUpBusy}
          followUpError={followUpError}
        />
      )}
      {!run && (
        <section className="agent-empty">
          <div>
            <p className="kicker">Seven roles. One controlled run.</p>
            <h2>Choose the target.<br />Direct the team.</h2>
          </div>
          <div className="agent-empty-roles">
            <span>Mend coordinates</span>
            <span>Inspector + Mapper investigate</span>
            <span>SEO analyzes extraction</span>
            <span>Recon observes reactive browser behavior</span>
            <span>Repair patches approved files</span>
            <span>Verifier proves the result</span>
          </div>
        </section>
      )}
    </main>
    <footer className="workbench-footer jc-footer">
      <div className="footer-top-row">
        <div className="footer-col-brand">
          <div className="footer-logo-lockup">
            <span className="footer-brand-title">TrustPatch Sovereign AI</span>
            <span className="footer-version-tag">v1.2.0 · TAP-1 MESH</span>
          </div>
          <p className="footer-desc">
            Supervised autonomous code repair for verified-owned Next.js applications and repositories. Powered by Meta Muse/Llama model family and isolated Git worktree sandboxing.
          </p>
        </div>
        <div className="footer-col-nav">
          <h4>Autonomous Architecture</h4>
          <ul>
            <li><a href="#console">TAP-1 Subnet (10.42.0.0/24)</a></li>
            <li><a href="#evidence-case">Cryptographic Proof Receipts</a></li>
            <li><a href="https://github.com/LLMSecurity/awesome-agent-skills-security" target="_blank" rel="noreferrer">OWASP AST10 Standards</a></li>
          </ul>
        </div>
        <div className="footer-col-nav">
          <h4>Governance &amp; Trust</h4>
          <ul>
            <li><a href="/api/integrations" target="_blank">Provider Health Status</a></li>
            <li><span>Privacy Policy (Zero Data Retention)</span></li>
            <li><span>Terms of Safe Execution (Scope Digest Bounded)</span></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom-row">
        <div className="footer-left">
          <span>© 2026 TrustPatch · Built by Shaidan Shaari (NusaByte) for the Meta Global AI Developer Hackathon.</span>
        </div>
        <div className="footer-right">
          <span className="footer-pill">NO UNSANCTIONED MUTATION</span>
          <span className="footer-quote">“AI proposes. Sandboxes verify. Humans authorize.”</span>
        </div>
      </div>
    </footer>
  </>;
}
