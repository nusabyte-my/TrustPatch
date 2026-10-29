"use client";

import { useState } from "react";
import { GitCompare, Copy, Check, X, ShieldAlert, ShieldCheck } from "lucide-react";

interface DiffModalProps {
  onClose: () => void;
}

const SAMPLE_DIFFS = [
  {
    file: "app/services/page.tsx",
    lineOld: 14,
    lineNew: 14,
    oldCode: `export const metadata = {\n  title: "Services | Northstar",\n  robots: "noindex, nofollow",\n  alternates: {\n    canonical: "https://staging.northstar.example/services"\n  }\n};`,
    newCode: `export const metadata = {\n  title: "Services | Northstar",\n  robots: "index, follow",\n  alternates: {\n    canonical: "/services"\n  }\n};`,
    reason: "Removes unapproved search crawler blockage and normalizes staging canonical URL."
  },
  {
    file: "next.config.ts",
    lineOld: 10,
    lineNew: 10,
    oldCode: `const nextConfig: NextConfig = {\n  async headers() {\n    return [];\n  }\n};`,
    newCode: `const nextConfig: NextConfig = {\n  async headers() {\n    return [\n      {\n        source: "/(.*)",\n        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }]\n      }\n    ];\n  }\n};`,
    reason: "Enforces strict MIME-sniffing prevention headers across all active routes."
  }
];

export function InteractiveDiffModal({ onClose }: DiffModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = SAMPLE_DIFFS[activeTab]!;

  const handleCopyCli = () => {
    navigator.clipboard.writeText("npx @trustpatch/cli scan --url http://127.0.0.1:3100 --auth-fixture");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="diff-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="diff-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="diff-modal-header">
          <div className="diff-modal-title">
            <GitCompare size={18} className="diff-icon" />
            <span>AST CODE DIFF &amp; VERIFIER AUDIT (TAP-1 ISOLATION)</span>
          </div>
          <button type="button" className="diff-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="diff-tab-strip">
          {SAMPLE_DIFFS.map((diff, index) => (
            <button
              key={diff.file}
              type="button"
              className={`diff-tab-btn ${activeTab === index ? "active" : ""}`}
              onClick={() => setActiveTab(index)}
            >
              <code>{diff.file}</code>
              <span className="diff-tag-change">MODIFIED</span>
            </button>
          ))}
          <button type="button" className="diff-cli-btn" onClick={handleCopyCli}>
            {copied ? <Check size={13} style={{ color: "var(--jc-pucuk)" }} /> : <Copy size={13} />}
            <span>{copied ? "COPIED CLI COMMAND" : "COPY AS CLI COMMAND"}</span>
          </button>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="diff-comparison-body">
          <div className="diff-panel before-panel">
            <div className="panel-header before-header">
              <span>BEFORE MEND (CONFIRMED DEFECT)</span>
              <span className="line-num">L{current.lineOld}</span>
            </div>
            <pre className="code-block code-old">
              <code>{current.oldCode}</code>
            </pre>
          </div>

          <div className="diff-panel after-panel">
            <div className="panel-header after-header">
              <span>AFTER MEND (VALIDATED IN ISOLATION)</span>
              <span className="line-num">L{current.lineNew}</span>
            </div>
            <pre className="code-block code-new">
              <code>{current.newCode}</code>
            </pre>
          </div>
        </div>

        {/* Reason / Proof Footer */}
        <div className="diff-modal-footer">
          <div className="diff-reason-box">
            <ShieldAlert size={16} className="reason-icon" />
            <div>
              <strong>Scope Constraint &amp; Justification:</strong>
              <p>{current.reason}</p>
            </div>
          </div>
          <div className="diff-status-pill">
            <ShieldCheck size={13} style={{ color: "var(--jc-pucuk)" }} />
            <span>SHA-256 HASH VERIFIED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
