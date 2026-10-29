"use client";

import { useState } from "react";
import { ArrowUpRight, GitCompare } from "lucide-react";
import { InteractiveDiffModal } from "./interactive-diff-modal";

export function HeroCtaButtons() {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <>
      {showDiff && <InteractiveDiffModal onClose={() => setShowDiff(false)} />}
      <div className="hero-actions antislop-actions">
        <a className="hero-primary btn-solid-primary" href="#main">
          <span>Run Controlled Mission</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <button
          type="button"
          className="hero-secondary btn-solid-secondary"
          onClick={() => setShowDiff(true)}
        >
          <GitCompare size={15} aria-hidden="true" />
          <span>Inspect Unified Diff</span>
        </button>
      </div>
    </>
  );
}
