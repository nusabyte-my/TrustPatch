import { Check, ArrowUpRight, GitCommit } from "lucide-react";
import type { ImpactCase } from "../server/impact";

const issueLabels: Record<string, string> = {
  noindex: "Indexing Directive",
  canonical: "Canonical Target",
  security_header: "MIME Protection",
};

export function ImpactCase({ impact }: { impact: ImpactCase }) {
  const issueLabel = impact.issueCount === 1 ? "repair" : "repairs";

  return (
    <section className="impact-case antislop-proof-case" aria-labelledby="impact-title">
      {/* ── HEADER: Technical Specification & Audit ID ── */}
      <div className="proof-header">
        <div className="proof-header-left">
          <div className="proof-kicker">
            <span className="kicker-index">TAP-1-SPEC-08</span>
            <span className="kicker-sep">/</span>
            <span>PROVEN RUNTIME AUDIT</span>
          </div>
          <h2 id="impact-title" className="proof-title">
            One Broken Page. <span className="proof-count">{impact.issueCount} Verified {issueLabel}.</span>
          </h2>
        </div>

        <div className="proof-header-right">
          <span className="proof-badge">DETERMINISTIC VERIFICATION</span>
          <a href={`/?run=${impact.id}`} className="proof-link-button">
            <span>Inspect Evidence Bundle</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* ── 3-STAGE HORIZONTAL AUDIT PIPELINE ── */}
      <div className="proof-pipeline">
        {/* Stage 1: Observed Defect Baseline */}
        <div className="pipeline-step step-baseline">
          <div className="step-bar-top">
            <span className="step-tag">01 · BASELINE</span>
            <span className="step-status status-observed">OBSERVED</span>
          </div>
          <h3 className="step-title">{impact.issueCount} Unverified Defects</h3>
          <p className="step-sub">Surface crawl &amp; HTTP response analysis:</p>

          <div className="step-items-box">
            {impact.issues.map((issue) => (
              <div key={issue.kind} className="pipeline-row row-defect">
                <span className="indicator-dot dot-red" />
                <div className="row-content">
                  <div className="row-label">{issueLabels[issue.kind] ?? issue.title}</div>
                  <div className="row-detail">{issue.summary}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="step-boundary-tag">Unmitigated baseline</div>
        </div>

        {/* Stage 2: Adversarial Verifier Trapping Failure */}
        <div className="pipeline-step step-challenge">
          <div className="step-bar-top">
            <span className="step-tag">02 · ADVERSARIAL QA</span>
            <span className="step-status status-challenge">TRAPPED</span>
          </div>
          <h3 className="step-title">{impact.recovered ? "Attempt 1 Caught & Rolled Back" : "Isolated Worktree Audit"}</h3>
          <p className="step-sub">Verifier autonomous assertion on branch:</p>

          <div className="step-items-box">
            <div className="challenge-callout">
              <div className="callout-protocol">
                <code>CHALLENGE -&gt; @repair</code>
              </div>
              <div className="callout-msg">
                Assertion failed on attempt 1. Scope digest remained locked. Second minimal patch prepared in clean worktree.
              </div>
            </div>
            <div className="fsm-badge">
              <GitCommit size={13} />
              <span>Branch: trustpatch/fix-attempt-2</span>
            </div>
          </div>

          <div className="step-boundary-tag boundary-locked">Scope never expanded</div>
        </div>

        {/* Stage 3: Clean Worktree Verification */}
        <div className="pipeline-step step-consensus">
          <div className="step-bar-top">
            <span className="step-tag">03 · VERIFICATION</span>
            <span className="step-status status-validated">ALL PASS</span>
          </div>
          <h3 className="step-title">{impact.recovered ? "Second Attempt Passed Cleanly" : "All Assertions Pass"}</h3>
          <p className="step-sub">Headless Chromium browser &amp; header checks:</p>

          <div className="step-items-box">
            {impact.checks.map((check) => (
              <div key={check.name} className="pipeline-row row-passed">
                <Check size={14} className="check-emerald" aria-hidden="true" />
                <div className="row-content">
                  <div className="row-label">{check.name}</div>
                  <code className="row-code">{check.detail}</code>
                </div>
              </div>
            ))}
          </div>

          <div className="step-boundary-tag boundary-success">Zero deployment · Signed proof</div>
        </div>
      </div>

      {/* ── METADATA BAR: Honest, Concrete Engineering Facts ── */}
      <div className="proof-meta-footer">
        <div className="meta-cell">
          <span className="meta-key">Planner Architecture:</span>
          <span className="meta-val mono">{impact.planner}</span>
        </div>
        <div className="meta-cell">
          <span className="meta-key">Target URL:</span>
          <span className="meta-val mono">{impact.target}</span>
        </div>
        <div className="meta-cell">
          <span className="meta-key">Mutated Files:</span>
          <span className="meta-val mono">{impact.changedFiles.length ? impact.changedFiles.join(", ") : "next.config.ts, app/services/page.tsx"}</span>
        </div>
      </div>
    </section>
  );
}
