"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RunEvent, RunView, AgentNode } from "@trustpatch/contracts";
import { Terminal, Shield, Cpu, ArrowRight, CornerDownRight, Radio } from "lucide-react";

interface AgentWarRoomProps {
  run: RunView;
  events: RunEvent[];
  onInjectMessage?: (message: string) => void;
}

const DEFAULT_NODES: AgentNode[] = [
  { id: "node-mend-01", role: "mend", label: "Mend Coordinator", hostname: "mend-master.internal", ip: "10.42.0.1", vmType: "micro-vm", status: "ready", memoryMb: 512 },
  { id: "node-inspector-02", role: "inspector", label: "Security & Header Probe", hostname: "sec-probe.internal", ip: "10.42.0.2", vmType: "container-sandbox", status: "ready", memoryMb: 256 },
  { id: "node-recon-03", role: "recon", label: "AST Semantic Mapper", hostname: "ast-engine.internal", ip: "10.42.0.3", vmType: "ast-engine", status: "ready", memoryMb: 384 },
  { id: "node-repair-04", role: "repair", label: "Worktree Sandbox", hostname: "sandbox-worker.internal", ip: "10.42.0.4", vmType: "container-sandbox", status: "idle", memoryMb: 1024 },
  { id: "node-verifier-05", role: "verifier", label: "Isolated QA Evaluator", hostname: "qa-runner.internal", ip: "10.42.0.5", vmType: "qa-isolated", status: "idle", memoryMb: 768 }
];

export function AgentWarRoom({ run, events, onInjectMessage }: AgentWarRoomProps) {
  const [filterRole, setFilterRole] = useState<string>("all");
  const [customMsg, setCustomMsg] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);
  // Derive live node status from incoming telemetry events
  const liveNodes = useMemo(() => {
    const nodeMap = new Map<string, AgentNode>();
    DEFAULT_NODES.forEach((n) => nodeMap.set(n.id, { ...n }));

    events.forEach((ev) => {
      if (ev.data?.node && typeof ev.data.node === "object") {
        const raw = ev.data.node as Partial<AgentNode>;
        if (raw.id && nodeMap.has(raw.id)) {
          const current = nodeMap.get(raw.id)!;
          nodeMap.set(raw.id, {
            ...current,
            status: raw.status ?? current.status,
            memoryMb: raw.memoryMb ?? current.memoryMb,
            worktree: raw.worktree ?? current.worktree
          });
        }
      }
    });

    // If run is validated, mark nodes as verified
    if (run.status === "validated") {
      const verifier = nodeMap.get("node-verifier-05");
      if (verifier) verifier.status = "ready";
    }

    return Array.from(nodeMap.values());
  }, [events, run.status]);

  // Extract structured communication stream
  const commEvents = useMemo(() => {
    return events.filter((e) => e.type === "activity" || e.data?.protocol).map((ev) => {
      const sender = (ev.data?.sender as string) || ev.role;
      const recipient = (ev.data?.recipient as string) || (sender === "mend" ? "@all" : "@mend");
      const protocol = (ev.data?.protocol as string) || (ev.role === "verifier" && ev.data?.status === "success" ? "CONSENSUS" : "INFO");
      const node = (ev.data?.node as AgentNode) || liveNodes.find((n) => n.role === ev.role);

      return {
        id: ev.id,
        createdAt: ev.createdAt,
        sender,
        recipient,
        protocol,
        message: ev.message,
        node,
        status: (ev.data?.status as string) || "info"
      };
    });
  }, [events, liveNodes]);

  const filtered = useMemo(() => {
    if (filterRole === "all") return commEvents;
    return commEvents.filter((c) => c.sender === filterRole || c.recipient.includes(filterRole));
  }, [commEvents, filterRole]);

  const handleSend = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!customMsg.trim() || !onInjectMessage) return;
    onInjectMessage(customMsg);
    setCustomMsg("");
  };

  return (
    <section className="war-room-container" aria-label="Agent War Room & Sandbox Grid">
      {/* Header bar */}
      <div className="war-room-header">
        <div className="war-room-title">
          <Terminal size={18} className="war-room-icon" />
          <span>AUTONOMOUS AGENT MESH & SANDBOXED NODES</span>
          <span className="live-pill"><Radio size={12} className="pulse-dot" /> MESH ONLINE</span>
        </div>
        <div className="war-room-meta">
          <span>Virtual Subnet: <strong>10.42.0.0/24</strong></span>
          <span>Security Policy: <strong>Zero-Escalation Isolated Worktrees</strong></span>
        </div>
      </div>

      {/* Grid of MicroVM / Sandbox Nodes */}
      <div className="node-grid">
        {liveNodes.map((node) => {
          const isNodeActive = events.some((e) => e.role === node.role && e.data?.status === "active");
          return (
            <div key={node.id} className={`node-card ${node.status} ${isNodeActive ? "active-compute" : ""}`}>
              <div className="node-card-top">
                <div className="node-name">
                  <Cpu size={14} />
                  <span>{node.hostname}</span>
                </div>
                <span className={`node-badge badge-${node.status}`}>{node.status.toUpperCase()}</span>
              </div>
              <div className="node-detail">
                <p className="node-label">{node.label}</p>
                <div className="node-specs">
                  <span>IP: {node.ip}</span>
                  <span>RAM: {node.memoryMb} MB</span>
                </div>
                <div className="node-runtime">
                  <span>Type: <code>{node.vmType}</code></span>
                  {node.worktree && (
                    <span className="node-worktree" title={node.worktree}>
                      Worktree: <code>...{node.worktree.slice(-18)}</code>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Central Comms Terminal Stream */}
      <div className="war-room-terminal">
        <div className="terminal-filter-bar">
          <span className="filter-label">PEER FILTER:</span>
          {["all", "mend", "inspector", "recon", "repair", "verifier"].map((r) => (
            <button
              key={r}
              className={`filter-btn ${filterRole === r ? "active" : ""}`}
              onClick={() => setFilterRole(r)}
            >
              {r === "all" ? "ALL DIALOGUES" : `@${r.toUpperCase()}`}
            </button>
          ))}
        </div>

        <div className="terminal-stream">
          {filtered.length === 0 ? (
            <div className="terminal-empty">Awaiting peer-to-peer transmission packets...</div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className={`dialogue-row protocol-${item.protocol.toLowerCase()}`}>
                <div className="dialogue-meta">
                  <span className="dialogue-time">{item.createdAt.slice(11, 19)}</span>
                  <span className={`protocol-badge proto-${item.protocol.toLowerCase()}`}>
                    {item.protocol}
                  </span>
                  <span className="sender-tag">
                    <Shield size={11} /> [{item.sender.toUpperCase()}]
                  </span>
                  <ArrowRight size={12} className="peer-arrow" />
                  <span className="recipient-tag">{item.recipient}</span>
                  {item.node && <span className="host-tag">@{item.node.hostname}</span>}
                </div>
                <div className="dialogue-message">
                  <CornerDownRight size={13} className="indent-arrow" />
                  <span>{item.message}</span>
                </div>
              </div>
            ))
          )}
          <div ref={terminalEndRef} style={{ height: 1 }} aria-hidden="true" />
        </div>

        {/* Command Injection Terminal */}
        {onInjectMessage && (
          <form className="terminal-command-bar" onSubmit={handleSend}>
            <span className="command-prompt">COMMANDER &gt;</span>
            <input
              type="text"
              className="command-input"
              placeholder="Inject peer message or challenge node (e.g. @repair verify isolated boundary before patch)..."
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
            />
            <button type="submit" className="command-submit" disabled={!customMsg.trim()}>
              TRANSMIT
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
