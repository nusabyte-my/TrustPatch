"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw, ShieldCheck } from "lucide-react";
import type { ImpactCase } from "../server/impact";


const stages = ["Inspect", "Approve", "Repair", "Verify"] as const;
export function ImpactMotion({ impact }: { impact: ImpactCase }) {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(() => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [interacting, setInteracting] = useState(false);
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const [announcement, setAnnouncement] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = playing && !interacting && visible;
  useEffect(() => {
    const onVisibility = () => { setVisible(!document.hidden); if (document.hidden) setInteracting(false); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setStage((current) => current === 3 ? 0 : current + 1), 2400);
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
    const next = event.key === "Home" ? 0 : event.key === "End" ? 3 : (index + (event.key === "ArrowRight" ? 1 : -1) + 4) % 4;
    selectStage(next);
    tabRefs.current[next]?.focus();
  }
  return <div className="impact-story"><div className="impact-motion" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false); }}>
    <div className="impact-motion-top"><span className="impact-agent-tag">{stages[stage]} · live proof</span><span>Recorded repair · {impact.planner}</span><div><button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause repair story" : "Play repair story"} aria-pressed={playing}>{playing ? <Pause size={15} /> : <Play size={15} />}</button><button type="button" onClick={() => { setStage(0); setPlaying(false); setAnnouncement("Repair story restarted"); }} aria-label="Restart repair story"><RotateCcw size={15} /></button></div></div>
    <div className="impact-stage-tabs" role="group" aria-label="Repair story stage">{stages.map((label, index) => <button key={label} ref={(node) => { tabRefs.current[index] = node; }} type="button" className={stage === index ? "active" : stage > index ? "complete" : ""} onClick={() => selectStage(index)} onKeyDown={(event) => moveStage(event, index)} aria-pressed={stage === index}><span>{stage > index ? <Check size={12} /> : index + 1}</span>{label}</button>)}</div>
    <p className="sr-only" aria-live="polite">{announcement}</p>
    <div className="impact-scene"><div className="impact-scene-index">0{stage + 1}</div>{stage === 0 && <div className="impact-scene-content"><span className="impact-scene-label">Real defects found</span><h2>{impact.issueCount} issues. No guesswork.</h2><div className="impact-defects">{impact.issues.map((issue) => <div key={issue.kind}><span className="impact-defect-dot" /><strong>{issue.title}</strong><p>{issue.summary}</p></div>)}</div></div>}{stage === 1 && <div className="impact-scene-content"><span className="impact-scene-label">Approved scope</span><h2>What changed—nothing beyond it.</h2><p>The repair cannot expand beyond the approved files. No silent merge. No deployment.</p><div className="impact-file-scope">{impact.changedFiles.length ? impact.changedFiles.map((file) => <code key={file}>{file}</code>) : <code>Isolated repair worktree</code>}</div></div>}{stage === 2 && <div className="impact-scene-content"><span className="impact-scene-label">In-scope recovery</span><h2>{impact.recovered ? "A failed patch is not a finished job." : "Every patch faces a real check."}</h2><p>{impact.firstFailure ?? "Verifier checks the actual patched worktree before calling the repair complete."}</p><div className="impact-repair-line"><span /><strong>{impact.recovered ? "Second attempt stays inside the same scope." : "Independent verification follows the repair."}</strong></div></div>}{stage === 3 && <div className="impact-scene-content"><span className="impact-scene-label">Verified outcome</span><h2>Evidence you can open.</h2><div className="impact-verified-checks">{impact.checks.map((check) => <div key={check.name}><ShieldCheck size={18} /><div><strong>{check.name}</strong><span>{check.detail}</span></div></div>)}</div><a href={`/?run=${impact.id}`}>Open the actual Proof Receipt <span aria-hidden="true">↗</span></a></div>}</div>
    <div className="impact-motion-footer"><span>{impact.target}</span><span>No merge or deployment</span></div>
  </div></div>;
}
