import type { Finding } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";
import { storeEvidence } from "./evidence";
import { addEvent } from "./store";
import { buildSeoOperations } from "./seo-playbooks";

export interface SeoOperation {
  findingId: string;
  kind: Finding["kind"];
  red: { challenge: string; attackPath: string };
  blue: { action: string; verification: string };
  evidenceIds: string[];
}
export { buildSeoOperations } from "./seo-playbooks";

export function runSeoOperations(store: TrustpatchDb, runId: string, findings: Finding[]) {
  const operations = buildSeoOperations(findings);
  const evidence = storeEvidence(store, runId, "red-blue-seo-operations", { mode: "red_blue", operations, limitations: "Recommendations are evidence-led review actions, not guaranteed rankings, citations, traffic, or automatic rewrites." });
  addEvent(store, runId, "seo", "activity", `Red Team complete: ${operations.length} evidence-backed SEO challenges identified. No exploit attempts or ranking claims.`, { activity: "seo_red", status: operations.length ? "warning" : "success", count: operations.length, evidenceId: evidence.id });
  addEvent(store, runId, "seo", "activity", `Blue Team complete: ${operations.length} bounded optimization actions prepared with verification targets. No content rewritten automatically.`, { activity: "seo_blue", status: "success", count: operations.length, evidenceId: evidence.id });
  return { operations, evidenceId: evidence.id };
}
