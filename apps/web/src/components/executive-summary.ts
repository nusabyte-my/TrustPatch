import { buildSeoOperations } from "@trustpatch/core/seo-playbooks";
import type { Finding, RunView } from "@trustpatch/contracts";

export function findingExecutiveSummaryText(run: RunView, finding: Finding) {
  const operation = buildSeoOperations([finding])[0];
  return `TrustPatch inspected ${finding.url} and confirmed “${finding.title}”. ${finding.summary} ${operation?.red.challenge ?? "The observed evidence requires a scoped technical review."} ${operation?.blue.action ?? "Review the evidence and define the smallest safe correction."} The target remains ${run.contract.readOnly ? "read-only" : "limited to the approved repair scope"}; no ranking, traffic, AI-citation, or remediation guarantee is implied.`;
}
