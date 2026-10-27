"use client";

import { useState, type FormEvent } from "react";
import type { ToolName } from "@trustpatch/core";

interface Plan { targetUrl: string; scopeDomain: string | null; tools: ToolName[]; readOnly: boolean; repairRequested: boolean; warnings: string[] }
const toolLabels: Record<ToolName, string> = {
  "site.inspect": "Inspect target", "site.crawl": "Crawl pages", "site.headers": "Capture headers", "site.screenshot": "Capture screenshot",
  "seo.analyze": "Analyze SEO + AI search", "seo.crawl_policy": "Check crawler policy", "repo.map": "Map repository", "repair.propose": "Propose repair", "repair.verify": "Verify result"
};

export function TargetConsole({ onExecute }: { onExecute: (objective: string) => Promise<void> }) {
  const [instruction, setInstruction] = useState("Inspect http://127.0.0.1:3100. Check indexing, security headers, SEO and JSON-LD. Read-only.");
  const [scope, setScope] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/console/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction, scopeDomain: scope || undefined, authorized }) });
      const data = await response.json() as { plan?: Plan; error?: string };
      if (!response.ok || !data.plan) throw new Error(data.error ?? "Could not plan target");
      setPlan(data.plan);
      await onExecute(instruction);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not plan target"); }
    finally { setBusy(false); }
  }
  return <section className="target-console"><div className="console-heading"><div><p className="kicker">Target console</p><h2>Give Mend a target.</h2></div><span>Target in. Evidence out. Autonomous tools, controlled authority.</span></div><form onSubmit={submit}><label htmlFor="target-instruction">Target + objective + constraints</label><textarea id="target-instruction" rows={3} value={instruction} onChange={(event) => setInstruction(event.target.value)} required /><div className="console-options"><label htmlFor="console-scope">Scope for external domains (optional)<input id="console-scope" value={scope} onChange={(event) => setScope(event.target.value)} placeholder="example.com" /></label><label className="ownership"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} required /> I authorize this inspection.</label><button className="primary" disabled={busy || !authorized}>{busy ? "Starting agent…" : "Run agent"}</button></div></form>{error && <p className="error" role="alert">{error}</p>}{plan && <div className="tool-plan"><details><summary>Inspect the {plan.tools.length}-step typed tool plan</summary><div className="tool-target"><span>Target</span><strong>{plan.targetUrl}</strong><span>{plan.readOnly ? "Read-only" : "Approval-gated repair"}</span></div><ol>{plan.tools.map((tool, index) => <li key={tool}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{toolLabels[tool]}</strong><code>{tool}</code></div></li>)}</ol></details>{plan.warnings.map((warning) => <p className="tool-warning" key={warning}>{warning}</p>)}<p className="console-note">Typed tools execute in the workbench below. Repair always requires approval; no arbitrary shell or automatic deployment.</p></div>}</section>;
}
