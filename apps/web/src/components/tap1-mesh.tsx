"use client";

import { useEffect, useRef, useState } from "react";

interface MeshNode {
  id: string;
  label: string;
  host: string;
  x: number;
  y: number;
  hue: string;
}

/** TAP-1 peer mesh topology — the focal motion sequence for the landing page. */
const MESH_NODES: MeshNode[] = [
  { id: "mend", label: "Mend", host: "mend-master.internal", x: 50, y: 12, hue: "#C97A40" },
  { id: "inspector", label: "Inspector", host: "sec-probe.internal", x: 16, y: 40, hue: "#28765c" },
  { id: "recon", label: "Recon", host: "ast-engine.internal", x: 84, y: 40, hue: "#3b82f6" },
  { id: "repair", label: "Repair", host: "sandbox-worker.internal", x: 26, y: 74, hue: "#8b5cf6" },
  { id: "verifier", label: "Verifier", host: "qa-runner.internal", x: 74, y: 74, hue: "#10b981" }
];

const PACKETS = [
  { from: "mend", to: "inspector", protocol: "SYN", delay: 0 },
  { from: "mend", to: "recon", protocol: "SYN", delay: 0.4 },
  { from: "inspector", to: "mend", protocol: "ACK", delay: 1.4 },
  { from: "recon", to: "mend", protocol: "ACK", delay: 1.8 },
  { from: "mend", to: "repair", protocol: "DISPATCH", delay: 2.6 },
  { from: "repair", to: "verifier", protocol: "PROPOSAL", delay: 3.4 },
  { from: "verifier", to: "mend", protocol: "CONSENSUS", delay: 4.4 }
];

const MESH_BY_ID = Object.fromEntries(MESH_NODES.map((n) => [n.id, n])) as Record<string, MeshNode>;

export function Tap1Mesh() {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    timerRef.current = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [paused, reduced]);

  const cycle = 5.6;
  const elapsed = (tick % cycle) + 0;

  return (
    <div className="tap1-mesh" aria-label="TAP-1 peer mesh topology">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="tap1-mesh-svg" role="img">
        <defs>
          <radialGradient id="meshGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5fe3b3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#5fe3b3" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Static links */}
        {PACKETS.map((packet, index) => {
          const a = MESH_BY_ID[packet.from]!;
          const b = MESH_BY_ID[packet.to]!;
          return (
            <line
              key={`link-${index}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="mesh-link"
            />
          );
        })}

        {/* Animated packets travelling the links */}
        {!reduced &&
          PACKETS.map((packet, index) => {
            const a = MESH_BY_ID[packet.from]!;
            const b = MESH_BY_ID[packet.to]!;
            const local = elapsed - packet.delay;
            if (local < 0 || local > 1.2) return null;
            const progress = Math.min(1, local / 1.2);
            const cx = a.x + (b.x - a.x) * progress;
            const cy = a.y + (b.y - a.y) * progress;
            const fading = local > 0.9;
            return (
              <g key={`packet-${index}`} opacity={fading ? (1 - progress) * 10 : 1}>
                <circle cx={cx} cy={cy} r="4.5" fill="url(#meshGlow)" />
                <circle cx={cx} cy={cy} r="1.4" fill="#5fe3b3" />
              </g>
            );
          })}

        {/* Nodes */}
        {MESH_NODES.map((node) => {
          const busy = PACKETS.some((packet) => {
            const local = elapsed - packet.delay;
            return (packet.from === node.id || packet.to === node.id) && local >= 0 && local <= 1.2;
          });
          return (
            <g key={node.id} className={`mesh-node ${busy ? "busy" : ""}`}>
              <circle cx={node.x} cy={node.y} r="3.4" fill="#0f1513" stroke={node.hue} strokeWidth="0.7" />
              <circle cx={node.x} cy={node.y} r="1.2" fill={node.hue} />
              <text x={node.x} y={node.y + 7.5} textAnchor="middle" className="mesh-node-label" fill={node.hue}>
                {node.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Live protocol ticker */}
      <div className="mesh-ticker" aria-live="off">
        <span className="mesh-ticker-label">TAP-1 TRAFFIC</span>
        <span className="mesh-ticker-values">
          {PACKETS.map((packet, index) => {
            const local = (elapsed - packet.delay) % cycle;
            const active = local >= 0 && local <= 1.2;
            return (
              <span key={index} className={`mesh-packet-tag ${active ? "active" : ""}`}>
                {packet.from}→{packet.to} {packet.protocol}
              </span>
            );
          })}
        </span>
        <button
          type="button"
          className="mesh-pause"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? "Resume mesh animation" : "Pause mesh animation"}
        >
          {paused ? "RESUME" : "PAUSE"}
        </button>
      </div>
    </div>
  );
}
