import { ArrowDown, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { TrustPatchMark } from "./logo";
import { Workbench } from "./workbench";
import { ImpactCase } from "./impact-case";
import { ImpactMotion } from "./impact-motion";
import { IntegrationStatus } from "./integration-status";
import type { ImpactCase as ImpactData } from "../server/impact";


export function LandingHero({ impact }: { impact: ImpactData | null }) {
  return <>
    <header className="landing-nav"><a className="landing-brand" href="/" aria-label="TrustPatch home"><TrustPatchMark size={32} /><span>TrustPatch</span></a><span className="landing-nav-statement">AI agents. Human authority.<br />Evidence before confidence.</span><nav aria-label="Primary"><a href="#evidence">Real repair</a><a className="landing-run-link" href="#main">Run agent <ArrowUpRight size={15} /></a></nav></header>
    <section className="landing-hero" id="console"><div className="hero-copy"><p className="hero-eyebrow"><span className="hero-status-dot" /> Mend + six specialists · one controlled mission</p><h1>Don’t just find it.<br /><span>Prove the fix.</span></h1><p className="hero-description">Give Mend a website target. Watch specialists inspect the real experience, prepare a scoped repair, and verify the result—without giving up control.</p><div className="hero-actions"><a className="hero-primary" href="#main">Plan your first mission <ArrowUpRight size={18} /></a><a className="hero-secondary" href="#evidence">Watch a real repair <ArrowDown size={17} /></a></div><div className="hero-boundary"><span><Check size={14} />Passive inspection first</span><span><Check size={14} />Approval before mutation</span><span><Check size={14} />No merge or deployment</span></div></div><div className="hero-impact" id="evidence">{impact ? <ImpactMotion impact={impact} /> : <div className="impact-motion impact-motion-empty"><ShieldCheck size={30} /><h2>Your first proof starts here.</h2><p>Run the authorized fixture to see an actual repair sequence.</p></div>}</div></section>
    <IntegrationStatus />
    <div className="landing-principle"><strong>AI proposes.</strong><span>Tools verify.</span><span>Humans authorize.</span><small>Every claim stays attached to evidence.</small></div>
    <Workbench />
    {impact && <section className="impact-section"><div className="impact-intro"><p>Behind the animation</p><h2>The evidence stays real.</h2><p>The player above uses the latest completed local repair. The full findings, recovery message, checks, target, and planner remain available below.</p></div><ImpactCase impact={impact} /></section>}
  </>;
}
