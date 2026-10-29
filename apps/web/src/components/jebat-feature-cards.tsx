"use client";

import { Cpu, ShieldCheck, GitBranch, ArrowRight } from "lucide-react";

interface FeatureCardsProps {
  onOpenDiff?: () => void;
}

export function JebatFeatureCards({ onOpenDiff }: FeatureCardsProps) {
  return (
    <section className="jc-features-section" aria-label="Key Autonomous Capabilities">
      <div className="jc-features-header">
        <span className="jc-features-kicker">Laksamana Engineering Standard</span>
        <h2>Three Pillars of Verifiable Autonomous Repair</h2>
        <p>Built for the Meta Global AI Hackathon. How TrustPatch enforces deterministic truth over conversational hallucinations.</p>
      </div>

      <div className="jc-feature-grid">
        {/* Card 1: Violet / Pink Stripe (Harsh Gradient) */}
        <div className="jc-feature-card group card-violet">
          <div className="card-left-stripe stripe-violet" />
          <div className="card-icon-wrapper bg-violet">
            <Cpu size={22} className="text-violet" />
          </div>
          <span className="card-badge">TAP-1 ARCHITECTURE</span>
          <h3>5 Isolated Compute Nodes</h3>
          <p>
            Each specialist runs on an isolated micro-VM or container with its own private IP (10.42.0.0/24). Handshakes occur over typed SYN/ACK packets—preventing prompt injection leaks and delegation loops.
          </p>
          <div className="card-footer-action">
            <span className="card-stat">0 cross-node pollution</span>
          </div>
        </div>

        {/* Card 2: Amber / Orange Stripe */}
        <div className="jc-feature-card group card-amber">
          <div className="card-left-stripe stripe-amber" />
          <div className="card-icon-wrapper bg-amber">
            <GitBranch size={22} className="text-amber" />
          </div>
          <span className="card-badge">EPHEMERAL SANDBOX</span>
          <h3>Git Worktree Isolation</h3>
          <p>
            Zero live repo tampering. Patches are prepared on isolated Git worktrees and verified against headless Chromium assertions before the human commander is asked for authority.
          </p>
          <div className="card-footer-action">
            {onOpenDiff && (
              <button type="button" className="card-link-btn" onClick={onOpenDiff}>
                Inspect Verified Diff <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Emerald / Cyan Stripe */}
        <div className="jc-feature-card group card-emerald">
          <div className="card-left-stripe stripe-emerald" />
          <div className="card-icon-wrapper bg-emerald">
            <ShieldCheck size={22} className="text-emerald" />
          </div>
          <span className="card-badge">SECURITY GUARDRAIL</span>
          <h3>OWASP AST10 Compliance</h3>
          <p>
            Guarded by SkillGuard, AgentSanitizer, and OpenSEO. Automatic detection of excessive agency (AST04), package hallucinations (AST02), and silent test-passing vulnerabilities (AST08).
          </p>
          <div className="card-footer-action">
            <span className="card-stat">Cryptographic proof receipts</span>
          </div>
        </div>
      </div>
    </section>
  );
}
