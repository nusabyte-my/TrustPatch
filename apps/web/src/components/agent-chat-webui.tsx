"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Cpu, Radio, ShieldCheck } from "lucide-react";
import type { RunEvent, RunView } from "@trustpatch/contracts";

interface ChatWebUIProps {
  run: RunView;
  events: RunEvent[];
  onSendMessage: (msg: string) => Promise<void>;
  busy?: boolean;
}
const AGENT_PERSONAS: Record<string, { name: string; node: string; color: string; badge: string; code: string }> = {
  mend: { name: "Mend Coordinator", node: "mend-master.internal", color: "#b85c38", badge: "COORDINATOR", code: "MND" },
  inspector: { name: "Inspector Node", node: "sec-probe.internal", color: "#28765c", badge: "SECURITY PROBE", code: "INS" },
  recon: { name: "Recon & AST", node: "ast-engine.internal", color: "#3b82f6", badge: "CODE MAPPER", code: "RCN" },
  repair: { name: "Repair Sandbox", node: "sandbox-worker.internal", color: "#8b5cf6", badge: "WORKTREE RUNNER", code: "RPR" },
  verifier: { name: "Verifier QA", node: "qa-runner.internal", color: "#10b981", badge: "ASSERTION ENGINE", code: "VRF" },
  user: { name: "Commander", node: "local-operator", color: "#17201d", badge: "HUMAN OPERATOR", code: "CMD" }
};

export function AgentChatWebUI({ run, events, onSendMessage, busy }: ChatWebUIProps) {
  const [inputMsg, setInputMsg] = useState("");
  const [activeRecipient, setActiveRecipient] = useState<string>("@all");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputMsg.trim() || busy) return;
    const msgToSend = activeRecipient === "@all" ? inputMsg : `${activeRecipient} ${inputMsg}`;
    await onSendMessage(msgToSend);
    setInputMsg("");
  };

  // Derive conversation feed
  const chatMessages = events
    .filter((e) => e.type === "activity" || e.type.startsWith("instruction"))
    .map((ev) => {
      const senderKey = ((ev.data?.sender as string) || ev.role || "mend").toLowerCase();
      const persona = AGENT_PERSONAS[senderKey] ?? AGENT_PERSONAS.mend;
      const recipient = (ev.data?.recipient as string) || (senderKey === "user" ? "@all" : "@mend");
      const protocol = (ev.data?.protocol as string) || (ev.data?.status === "success" ? "ACK" : "INFO");

      return {
        id: ev.id,
        createdAt: ev.createdAt,
        senderKey,
        persona,
        recipient,
        protocol,
        message: ev.message,
        isUser: senderKey === "user",
        status: (ev.data?.status as string) || "info"
      };
    });

  // Always automatically scroll to and focus on the latest chat message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  return (
    <div className="chat-webui-container">
      {/* Top Bar / Session Header */}
      <div className="chat-webui-topbar">
        <div className="chat-webui-target">
          <Radio size={14} className="pulse-dot" style={{ color: "var(--jc-copper)" }} />
          <span>MISSION TARGET:</span>
          <strong>{run.contract.targetUrl}</strong>
          <span className="chat-badge status-pill">{run.status.toUpperCase()}</span>
        </div>
        <div className="chat-webui-mesh-status">
          <Cpu size={14} />
          <span>TAP-1 MESH: <strong>5 NODES ONLINE</strong></span>
        </div>
      </div>

      {/* Main Chat Stream */}
      <div className="chat-webui-stream" role="log" aria-live="polite">
        {chatMessages.length === 0 ? (
          <div className="chat-empty-state">
            <ShieldCheck size={32} style={{ color: "var(--copper-dark)" }} />
            <p>Agent Handshake Mesh Initialized</p>
            <small>Peer nodes are performing initial telemetry handshake over TAP-1 subnet.</small>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble-row ${msg.isUser ? "user-row" : "agent-row"}`}
            >
              <div className="chat-avatar" style={{ borderColor: msg.persona.color, color: msg.persona.color }}>
                {msg.persona.code}
              </div>
              <div className="chat-bubble-card">
                <div className="chat-bubble-header">
                  <span className="chat-author" style={{ color: msg.persona.color }}>
                    {msg.persona.name}
                  </span>
                  <span className="chat-node-badge">{msg.persona.node}</span>
                  <span className={`chat-proto-tag proto-${msg.protocol.toLowerCase()}`}>
                    {msg.protocol}
                  </span>
                  <span className="chat-time">{msg.createdAt.slice(11, 19)}</span>
                </div>
                <div className="chat-bubble-text">{msg.message}</div>
                {msg.recipient && msg.recipient !== "@all" && (
                  <div className="chat-bubble-footer">
                    <span>Directing response to <strong>{msg.recipient}</strong></span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} style={{ height: 1 }} aria-hidden="true" />
      </div>

      {/* Quick Peer Selector & Chat Input Bar */}
      <form className="chat-webui-input-area" onSubmit={handleSubmit}>
        <div className="chat-recipient-bar">
          <span className="recipient-label">TRANSMIT TO:</span>
          {["@all", "@inspector", "@recon", "@repair", "@verifier"].map((peer) => (
            <button
              key={peer}
              type="button"
              className={`recipient-pill ${activeRecipient === peer ? "active" : ""}`}
              onClick={() => setActiveRecipient(peer)}
            >
              {peer}
            </button>
          ))}
        </div>
        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input-field"
            placeholder={
              activeRecipient === "@all"
                ? "Instruct the agent mesh (e.g. Inspect the mobile viewport first)..."
                : `Send direct challenge to ${activeRecipient}...`
            }
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={busy}
          />
          <button
            type="submit"
            className="chat-send-button"
            disabled={!inputMsg.trim() || busy}
          >
            <Send size={15} />
            <span>TRANSMIT</span>
          </button>
        </div>
      </form>
    </div>
  );
}
