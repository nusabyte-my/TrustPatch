import { getEvents, getRunView } from "@trustpatch/core";
import { store } from "./runtime";

export interface ImpactCase {
  id: string;
  target: string;
  planner: string;
  issueCount: number;
  issues: Array<{ kind: string; title: string; summary: string }>;
  changedFiles: string[];
  checks: Array<{ name: string; detail: string }>;
  firstFailure: string | null;
  recovered: boolean;
}
export function getLatestImpactCase(): ImpactCase | null {
  const rows = store.sqlite.prepare("SELECT id FROM runs WHERE status = 'validated' AND proof_json IS NOT NULL ORDER BY created_at DESC").all() as Array<{ id: string }>;
  for (const row of rows) {
    const run = getRunView(store, row.id);
    if (!run.proof?.verification.length || !run.proof.branch) continue;
    const events = getEvents(store, row.id);
    const failure = events.find((event) => event.data.activity === "verification" && event.data.status === "warning");
    const issues = run.proof.findings.filter((finding) => ["noindex", "canonical", "security_header"].includes(finding.kind));
    return {
      id: run.id,
      target: run.contract.targetUrl,
      planner: run.proof.planner,
      issueCount: issues.length,
      issues: issues.map(({ kind, title, summary }) => ({ kind, title, summary })),
      changedFiles: run.proof.changedFiles,
      checks: run.proof.verification.map((check) => ({ name: check.name, detail: check.detail })),
      firstFailure: failure?.message ?? null,
      recovered: events.filter((event) => event.role === "repair" && event.data.activity === "repair").length > 1
    };
  }
  return null;
}
