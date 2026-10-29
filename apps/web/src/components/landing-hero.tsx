import { Check, ShieldCheck } from "lucide-react";
import { Workbench } from "./workbench";
import { ImpactCase } from "./impact-case";
import { ImpactMotion } from "./impact-motion";
import { IntegrationStatus } from "./integration-status";
import { JebatFeatureCards } from "./jebat-feature-cards";
import { HeroCtaButtons } from "./hero-cta-buttons";
import { NavHeader } from "./nav-header";
import type { ImpactCase as ImpactData } from "../server/impact";

export function LandingHero({ impact }: { impact: ImpactData | null }) {
  return (
    <>
      {/* Topbar Client Navigation (Diff Modal & Launch CTAs) */}
      <NavHeader />

      {/* ── IMMERSIVE HERO SECTION ── */}
      <section className="landing-hero jc-hero-rehaul" id="console">
        <div className="hero-copy jc-hero-content">
          <div className="hero-kicker-row">
            <span className="hero-status-dot" />
            <span className="kicker-pill">META GLOBAL AI DEVELOPER HACKATHON 2026</span>
          </div>

          <h1 className="jc-hero-headline">
            <span>Autonomous Code Repair.</span>
            <br />
            <span className="jc-headline-sub">Verified in Sandbox Isolation.</span>
          </h1>

          <p className="hero-description jc-hero-desc">
            Direct an autonomous swarm of specialist agents communicating over TAP-1.
            They inspect live HTTP headers, map syntax ASTs, challenge repairs in ephemeral Git worktrees,
            and deliver cryptographic proof receipts before requesting human authorization.
          </p>

          <HeroCtaButtons />

          {/* Clean Boundary List with Real-World Meaning (Nielsen Heuristics 2 & 8) */}
          <div className="hero-guarantees-row">
            <span className="guarantee-label">INVARIANTS:</span>
            <div className="guarantee-item">
              <Check size={14} className="pill-check" />
              <span>Peer-to-Peer Protocol (TAP-1)</span>
            </div>
            <div className="guarantee-item">
              <Check size={14} className="pill-check" />
              <span>OWASP AST10 Guardrails</span>
            </div>
            <div className="guarantee-item">
              <Check size={14} className="pill-check" />
              <span>Isolated Worktrees (Zero Live Mutation)</span>
            </div>
          </div>
        </div>

        {/* Live Verifier Story Player */}
        <div className="hero-impact jc-hero-impact-card" id="evidence">
          {impact ? (
            <ImpactMotion impact={impact} />
          ) : (
            <div className="impact-motion impact-motion-empty">
              <ShieldCheck size={30} />
              <h2>Your first proof starts here.</h2>
              <p>Run the authorized fixture to see an actual repair sequence.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 3-PILLAR CAPABILITIES GRID (FULL WIDTH) ── */}
      <JebatFeatureCards />

      {/* ── INTEGRATION STATUS BAR ── */}
      <IntegrationStatus />

      {/* ── RECORDED PROOF CASE (REHAULED 3-STAGE WORKFLOW) ── */}
      {impact && (
        <section className="impact-section" id="evidence-case">
          <div className="impact-intro">
            <p className="impact-eyebrow">Cryptographic Proof &amp; Audit Trail</p>
            <h2>Recorded Evidence from Live Run</h2>
            <p>
              Every step of the autonomous repair loop is validated against an
              isolated worktree. Compare the observed baseline, the Verifier
              challenge on attempt 1, and the final validated receipt.
            </p>
          </div>
          <ImpactCase impact={impact} />
        </section>
      )}

      {/* ── TECHNICAL PRINCIPLE BAND ── */}
      <div className="landing-principle jc-principle-band">
        <div className="principle-item">
          <strong>AI Proposes.</strong>
          <span>Meta Muse / Llama Models</span>
        </div>
        <div className="principle-divider" />
        <div className="principle-item">
          <strong>Sandboxes Verify.</strong>
          <span>Isolated Git Worktrees</span>
        </div>
        <div className="principle-divider" />
        <div className="principle-item">
          <strong>Humans Authorize.</strong>
          <span>Cryptographic Scope Digests</span>
        </div>
      </div>

      {/* ── INTERACTIVE WORKBENCH (WAR ROOM & CHAT) ── */}
      <Workbench />
    </>
  );
}
