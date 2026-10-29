import { Workbench } from "./workbench";
import { ImpactCase } from "./impact-case";
import { IntegrationStatus } from "./integration-status";
import { JebatFeatureCards } from "./jebat-feature-cards";
import { HeroActions } from "./premium-hero";
import { NavHeader } from "./nav-header";
import type { ImpactCase as ImpactData } from "../server/impact";

export function LandingHero({ impact }: { impact: ImpactData | null }) {
  return (
    <>
      {/* Topbar Client Navigation (Diff Modal & Launch CTAs) */}
      <NavHeader />

      {/* ── PREMIUM HERO WITH ANIMATED TAP-1 MESH ── */}
      <HeroActions />

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
