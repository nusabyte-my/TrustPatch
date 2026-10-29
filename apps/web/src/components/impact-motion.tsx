"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw, ArrowRight, GitCommit } from "lucide-react";
import type { ImpactCase } from "../server/impact";

const stages = ["Inspect", "Approve", "Repair", "Verify"] as const;

export function ImpactMotion({ impact }: { impact: ImpactCase }) {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(
    () => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [interacting, setInteracting] = useState(false);
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const [announcement, setAnnouncement] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = playing && !interacting && visible;

  useEffect(() => {
    const onVisibility = () => {
      setVisible(!document.hidden);
      if (document.hidden) setInteracting(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setStage((current) => (current === 3 ? 0 : current + 1)), 2600);
    return () => window.clearInterval(timer);
  }, [active]);

  function selectStage(index: number) {
    setStage(index);
    setPlaying(false);
    setAnnouncement(`${stages[index]} stage selected`);
  }

  function moveStage(event: React.KeyboardEvent, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
        ? 3
        : (index + (event.key === "ArrowRight" ? 1 : -1) + 4) % 4;
    selectStage(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="impact-story antislop-player-story">
      <div
        className="impact-motion antislop-player-window"
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false);
        }}
      >
        {/* Terminal Title Bar */}
        <div className="impact-motion-top antislop-topbar">
          <div className="topbar-left">
            <span className="dot-red-small" />
            <span className="impact-agent-tag">{stages[stage].toUpperCase()} · LIVE PROOF</span>
          </div>
          <span className="topbar-planner">{impact.planner} / worktree sandbox</span>
          <div className="topbar-controls">
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? "Pause player" : "Play player"}
              aria-pressed={playing}
            >
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage(0);
                setPlaying(false);
                setAnnouncement("Player restarted");
              }}
              aria-label="Restart player"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* 4 Pipeline Stage Tabs */}
        <div className="impact-stage-tabs antislop-stage-tabs" role="group" aria-label="Repair stages">
          {stages.map((label, index) => (
            <button
              key={label}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              className={stage === index ? "active" : stage > index ? "complete" : ""}
              onClick={() => selectStage(index)}
              onKeyDown={(event) => moveStage(event, index)}
              aria-pressed={stage === index}
            >
              <span className="tab-num">{stage > index ? <Check size={11} /> : `0${index + 1}`}</span>
              <span className="tab-name">{label}</span>
            </button>
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>

        {/* Stage Viewport */}
        <div className="impact-scene antislop-scene">
          {stage === 0 && (
            <div className="impact-scene-content">
              <span className="impact-scene-label">STAGE 01 · OBSERVED DEFECTS</span>
              <h2 className="scene-headline">{impact.issueCount} Unmitigated Findings</h2>
              <p className="scene-desc">Captured by Inspector node on live HTTP and DOM surface:</p>
              <div className="impact-defects">
                {impact.issues.map((issue) => (
                  <div key={issue.kind} className="defect-item">
                    <span className="defect-pill-dot" />
                    <div>
                      <strong>{issue.title}</strong>
                      <p>{issue.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage === 1 && (
            <div className="impact-scene-content">
              <span className="impact-scene-label">STAGE 02 · BOUNDED SCOPE</span>
              <h2 className="scene-headline">Exact File Authorization</h2>
              <p className="scene-desc">
                Cryptographic scope digest prevents mutations outside approved files:
              </p>
              <div className="impact-file-scope">
                {impact.changedFiles.length ? (
                  impact.changedFiles.map((file) => (
                    <div key={file} className="file-scope-chip">
                      <GitCommit size={13} />
                      <code>{file}</code>
                    </div>
                  ))
                ) : (
                  <code>app/services/page.tsx, next.config.ts</code>
                )}
              </div>
            </div>
          )}

          {stage === 2 && (
            <div className="impact-scene-content">
              <span className="impact-scene-label">STAGE 03 · ADVERSARIAL RECOVERY</span>
              <h2 className="scene-headline">Attempt 1 Trapped by Verifier</h2>
              <p className="scene-desc">
                {impact.firstFailure ??
                  "First patch retained noindex directive. Verifier rolled back the worktree and re-planned inside scope."}
              </p>
              <div className="recovery-fsm-box">
                <span className="fsm-label">[FSM: CHALLENGE -&gt; RETRY]</span>
                <p>Scope boundaries held rigid. Attempt 2 compiled in clean worktree.</p>
              </div>
            </div>
          )}

          {stage === 3 && (
            <div className="impact-scene-content">
              <span className="impact-scene-label">STAGE 04 · CONSENSUS PROOF</span>
              <h2 className="scene-headline">All Checks Verified</h2>
              <div className="impact-verified-checks">
                {impact.checks.map((check) => (
                  <div key={check.name} className="verified-row">
                    <Check size={14} className="check-icon" />
                    <div>
                      <strong>{check.name}</strong>
                      <code>{check.detail}</code>
                    </div>
                  </div>
                ))}
              </div>
              <a href={`/?run=${impact.id}`} className="receipt-link-btn">
                <span>Inspect Signed Proof Receipt</span>
                <ArrowRight size={14} />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="impact-motion-footer antislop-footer">
          <span className="target-url-mono">{impact.target}</span>
          <span className="guarantee-tag">Zero Unsanctioned Deployment</span>
        </div>
      </div>
    </div>
  );
}
