"use client";

import { useState } from "react";
import { ArrowUpRight, GitCompare } from "lucide-react";
import { TrustPatchMark } from "./logo";
import { InteractiveDiffModal } from "./interactive-diff-modal";

export function NavHeader() {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <>
      {showDiff && <InteractiveDiffModal onClose={() => setShowDiff(false)} />}
      <header className="landing-nav antislop-nav">
        <a className="landing-brand antislop-brand" href="/" aria-label="TrustPatch home">
          <TrustPatchMark size={28} />
          <span className="brand-title">TrustPatch</span>
          <span className="brand-dot">/</span>
          <span className="brand-meta">TAP-1</span>
        </a>

        {/* Technical Subnet Telemetry */}
        <div className="antislop-telemetry">
          <span className="telemetry-signal" />
          <span className="mono-label">10.42.0.0/24</span>
          <span className="mono-sep">·</span>
          <span className="mono-status">5 nodes sandboxed</span>
        </div>

        {/* Navigation Actions */}
        <nav aria-label="Primary" className="antislop-nav-actions">
          <a href="#evidence-case" className="nav-text-link">
            Proof Receipt
          </a>
          <button
            type="button"
            className="btn-text-secondary"
            onClick={() => setShowDiff(true)}
          >
            <GitCompare size={14} aria-hidden="true" />
            <span>Inspect Unified Diff</span>
          </button>
          <a className="landing-run-link btn-solid-primary" href="#main">
            <span>Run Mission</span>
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </nav>
      </header>
    </>
  );
}
