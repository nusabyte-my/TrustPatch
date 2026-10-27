"use client";

import { useState } from "react";

export function UsageGuide() {
  const [open, setOpen] = useState(false);
  return <section className="usage"><button className="usage-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><span>How to use TrustPatch</span><span>{open ? "−" : "+"}</span></button>{open && <div className="usage-content">
    <div><h3>1. Choose your workflow</h3><p><strong>Investigate only</strong> reads a site without changing code. <strong>Repair selected findings</strong> asks for approval before an isolated branch is created. <strong>Bulk authorized-site audit</strong> checks several owned sites without repairs.</p></div>
    <div><h3>2. Tell Mend what to check</h3><p>Use plain English and include limits. Example: “Inspect the staging site. Fix indexing and security-header defects, but do not touch /blog. Stop before opening a PR.”</p></div>
    <div><h3>3. Watch the evidence</h3><p>The run shows the full target URL, page checks, SEO opportunities, vulnerability alerts, and the agent currently working. Open Raw, Rendered, or Headers evidence to verify a finding yourself.</p></div>
    <div><h3>4. Approve only the right scope</h3><p>Review the findings, allowed files, and whether a draft PR is permitted. Repair runs only after you approve. Self-repair stays inside that scope; anything broader pauses again.</p></div>
    <div><h3>5. Read the proof, not a score</h3><p>Verifier builds the patched worktree and checks actual behavior. A failed check triggers a bounded retry or a blocked result. Validated means tested locally—not merged, deployed, or guaranteed to rank.</p></div>
    <div><h3>Using bulk audit safely</h3><p>Enter a domain you own, such as <code>example.com</code>. Add its URLs one per line, including subdomains when relevant. Confirm authorization and start the passive audit. Public customer use additionally requires a signed manifest or DNS verification; the demo checkbox is not proof of ownership. Bulk mode covers SEO, AI-search readiness, metadata, structured data, and response policy; it does not exploit sites or claim to find every vulnerability.</p></div>
  </div>}</section>;
}
