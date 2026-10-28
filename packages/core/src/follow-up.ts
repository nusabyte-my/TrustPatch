import type { Finding, RunContract, RunStatus } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";
import { storeEvidence } from "./evidence";
import { addEvent } from "./store";

export interface AgentFollowUp {
  instruction: string;
  response: string;
  recommendedAction: string;
  nextTool: "inspect_findings" | "review_seo_operations" | "awaiting_approval" | "review_repair_proof" | "read_only_complete";
  readOnly: boolean;
}
export function answerFollowUp(contract: RunContract, status: RunStatus, findings: Finding[], instruction: string): AgentFollowUp {
  const repairable = findings.filter((finding) => ["noindex", "canonical", "security_header"].includes(finding.kind));
  const opportunities = findings.length - repairable.length;
  const target = new URL(contract.targetUrl).hostname;
  const recommendedAction = status === "awaiting_approval" ? "Review and approve only the listed repair files, or reduce scope before continuing." : contract.readOnly ? repairable.length ? `Review the ${repairable.length} technical defect${repairable.length === 1 ? "" : "s"} first, then address the ${opportunities} content opportunit${opportunities === 1 ? "y" : "ies"} through the normal editorial workflow. External targets remain read-only.` : `Review the ${opportunities} evidence-backed optimization opportunit${opportunities === 1 ? "y" : "ies"} and implement them through the normal editorial workflow.` : "Open the verified Proof Receipt and inspect the changed files before any merge or deployment decision.";
  const nextTool: AgentFollowUp["nextTool"] = status === "awaiting_approval" ? "awaiting_approval" : contract.readOnly ? repairable.length ? "inspect_findings" : opportunities ? "review_seo_operations" : "read_only_complete" : "review_repair_proof";
  const response = findings.length ? `${target} has ${repairable.length} technical repair candidate${repairable.length === 1 ? "" : "s"} and ${opportunities} SEO/content opportunit${opportunities === 1 ? "y" : "ies"}. ${recommendedAction}` : `${target} has no findings in the selected checks. No repair or optimization work should be invented; keep the current scope or choose a different authorized inspection.`;
  return { instruction, response, recommendedAction, nextTool, readOnly: contract.readOnly };
}
export function storeFollowUp(store: TrustpatchDb, runId: string, followUp: AgentFollowUp) {
  const evidence = storeEvidence(store, runId, "agent-follow-up", followUp);
  addEvent(store, runId, "mend", "activity", "Mend reviewed the stored evidence and prepared the next bounded action.", { activity: "follow_up", status: "success", evidenceId: evidence.id, nextTool: followUp.nextTool });
  return { ...followUp, evidenceId: evidence.id };
}
