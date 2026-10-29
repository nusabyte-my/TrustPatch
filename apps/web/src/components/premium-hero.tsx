"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, GitCompare, Sparkles, ShieldCheck, Cpu, Terminal } from "lucide-react";
import { Tap1Mesh } from "./tap1-mesh";
import { InteractiveDiffModal } from "./interactive-diff-modal";

/**
 * Hero — Jebat-Creative premium revamp.
 * Focal moment: the animated TAP-1 peer mesh (see Tap1Mesh).
 * Everything else is quiet, purposeful hierarchy.
 */
export function HeroActions() {
  const [revealed, setRevealed] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {showDiff && <InteractiveDiffModal onClose={() => setShowDiff(false)} />}
      <section ref={rootRef} className={`premium-hero ${revealed ? "revealed" : ""}`}>
      {/* ── AMBIENT BACKGROUND LAYERS (Jebat-Creative) ── */}
      <div className="hero-orb hero-orb-copper" aria-hidden="true" />
      <div className="hero-orb hero-orb-emerald" aria-hidden="true" />
      <div className="hero-orb hero-orb-violet" aria-hidden="true" />
      <div className="hero-dot-grid" aria-hidden="true" />

      <div className="premium-hero-inner">
        {/* ── LEFT: VALUE PROPOSITION ── */}
        <div className="premium-hero-copy">
          <div className="premium-eyebrow">
            <span className="premium-eyebrow-dot" />
            <span>Meta Global AI Developer Hackathon 2026</span>
            <span className="premium-eyebrow-sep">·</span>
            <span className="premium-eyebrow-dim">Startup Track</span>
          </div>

          <h1 className="premium-headline">
            Autonomous Code Repair.
            <br />
            <span className="premium-headline-accent">Verified In Isolation.</span>
          </h1>

          <p className="premium-lede">
            Direct an autonomous swarm of specialist agents communicating peer-to-peer over TAP-1.
            They probe live HTTP surfaces, map syntax ASTs, challenge every patch inside ephemeral
            Git worktrees, and deliver signed cryptographic proof before asking for your authority.
          </p>

          <div className="premium-cta-row">
            <a className="premium-btn premium-btn-primary" href="#main">
              <span>Run Controlled Mission</span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
            <button type="button" className="premium-btn premium-btn-ghost" onClick={() => setShowDiff(true)}>
              <GitCompare size={15} aria-hidden="true" />
              <span>Inspect Unified Diff</span>
            </button>
          </div>

          <ul className="premium-invariant-list">
            <li>
              <ShieldCheck size={14} aria-hidden="true" />
              <span>OWASP AST10 Guardrails</span>
            </li>
            <li>
              <Cpu size={14} aria-hidden="true" />
              <span>5 Isolated Sandbox Nodes</span>
            </li>
            <li>
              <Terminal size={14} aria-hidden="true" />
              <span>Zero Live Repository Mutation</span>
            </li>
          </ul>
        </div>

        {/* ── RIGHT: ANIMATED PEER MESH (FOCAL MOMENT) ── */}
        <div className="premium-hero-visual">
          <div className="premium-glass-panel">
            <div className="premium-panel-head">
              <span className="premium-panel-title">
                <Sparkles size={13} aria-hidden="true" />
                TAP-1 PEER MESH
              </span>
              <span className="premium-panel-sub">10.42.0.0/24</span>
            </div>
            <Tap1Mesh />
          </div>
        </div>
      </div>
      </section>
    </>
  );
}
