import { Check } from "lucide-react";
import type { ImpactCase } from "../server/impact";

export function ImpactCase({ impact }: { impact: ImpactCase }) {
  return <section className="impact-case" aria-labelledby="impact-title">
    <div className="impact-heading"><div><p className="impact-kicker">Recorded local repair</p><h2 id="impact-title">One broken page.<br />{impact.issueCount} verified repairs.</h2></div><div className="impact-proof-link"><span>Not a simulated scorecard.</span><a href={`/?run=${impact.id}`}>Open the actual evidence <span aria-hidden="true">↗</span></a></div></div>
    <div className="impact-grid">
      <article className="impact-before"><span className="impact-step">Before Mend</span><h3>{impact.issueCount} confirmed defects.</h3><p>The local fixture exposed indexing, canonical, and response-policy problems that would otherwise ship silently.</p><ul><li>Indexing directive: <strong>noindex, nofollow</strong></li><li>Canonical pointed to a staging host</li><li>Required response header was absent</li></ul></article>
      <article className="impact-recovery"><span className="impact-step">Agent recovery</span><h3>{impact.recovered ? "The first patch failed. Mend caught it." : "The patch was checked."}</h3><p>{impact.firstFailure ?? "Verifier independently checked the patched worktree before calling anything fixed."}</p><span className="impact-boundary">Approval scope never expanded.</span></article>
      <article className="impact-after"><span className="impact-step">Verified result</span><h3>{impact.recovered ? "Second in-scope repair. All checks pass." : "All selected checks pass."}</h3><ul>{impact.checks.map((check) => <li key={check.name}><span className="impact-check"><Check size={14} aria-hidden="true" /></span><div><strong>{check.name}</strong><span>{check.detail}</span></div></li>)}</ul><span className="impact-boundary">No merge. No deployment.</span></article>
    </div>
    <div className="impact-meta"><span>Planner: <strong>{impact.planner}</strong></span><span>Target: <strong>{impact.target}</strong></span><span>Changed files: <strong>{impact.changedFiles.length ? impact.changedFiles.join(", ") : "No production files changed"}</strong></span></div>
  </section>;
}
