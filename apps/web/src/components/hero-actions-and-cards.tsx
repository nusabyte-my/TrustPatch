"use client";

import { useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { InteractiveDiffModal } from "./interactive-diff-modal";
import { JebatFeatureCards } from "./jebat-feature-cards";

export function HeroActionsAndCards() {
  const [showDiff, setShowDiff] = useState(false);

  return (
    <>
      {showDiff && <InteractiveDiffModal onClose={() => setShowDiff(false)} />}
      <div className="hero-actions jc-actions">
        <a className="hero-primary jc-btn-primary" href="#main">
          Direct Agent Swarm <ArrowUpRight size={18} />
        </a>
        <button
          type="button"
          className="hero-secondary jc-btn-secondary"
          onClick={() => setShowDiff(true)}
        >
          Inspect Verified Diff{" "}
          <Sparkles size={16} style={{ color: "var(--jc-copper)" }} />
        </button>
      </div>
      <JebatFeatureCards onOpenDiff={() => setShowDiff(true)} />
    </>
  );
}
