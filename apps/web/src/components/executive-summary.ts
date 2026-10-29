import { buildSeoOperations } from "@trustpatch/core/seo-playbooks";
import type { Finding, RunView } from "@trustpatch/contracts";

export function findingExecutiveSummaryText(run: RunView, finding: Finding) {
  const operation = buildSeoOperations([finding])[0];
  return `TrustPatch inspected ${finding.url} and confirmed “${finding.title}”. ${finding.summary} ${operation?.red.challenge ?? "The observed evidence requires a scoped technical review."} ${operation?.blue.action ?? "Review the evidence and define the smallest safe correction."} The target remains ${run.contract.readOnly ? "read-only" : "limited to the approved repair scope"}; no ranking, traffic, AI-citation, or remediation guarantee is implied.`;
}

export function getOwaspAst10Mapping(findingKind: string): { code: string; title: string; risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" } {
  switch (findingKind) {
    case "security_header":
    case "security_misconfiguration":
      return { code: "AST04", title: "Excessive Agency & Privilege Creep", risk: "HIGH" };
    case "api_leak":
    case "repo_secret":
      return { code: "AST01", title: "Credential Exfiltration & Data Theft", risk: "CRITICAL" };
    case "dependency_vulnerability":
    case "repo_config":
      return { code: "AST02", title: "Skill Supply Chain Compromise", risk: "HIGH" };
    case "noindex":
    case "canonical":
      return { code: "AST08", title: "Silent Verification Failures", risk: "MEDIUM" };
    default:
      return { code: "AST10", title: "Cross-Platform Reuse Misconfiguration", risk: "LOW" };
  }
}

export function calculateSecurityPostureScore(findings: Finding[]): { score: number; label: string; passedChecks: number; totalChecks: number } {
  const totalChecks = Math.max(findings.length, 5);
  const highOrCritical = findings.filter((f) => ["security_header", "api_leak", "repo_secret", "dependency_vulnerability"].includes(f.kind)).length;
  const medium = findings.filter((f) => ["noindex", "canonical"].includes(f.kind)).length;
  const deductions = (highOrCritical * 18) + (medium * 8);
  const score = Math.max(10, Math.min(100, 100 - deductions));
  const label = score >= 85 ? "HARDENED" : score >= 60 ? "NEEDS_REPAIR" : "CRITICAL_RISK";
  const passedChecks = Math.max(0, totalChecks - findings.length);

  return { score, label, passedChecks, totalChecks };
}
