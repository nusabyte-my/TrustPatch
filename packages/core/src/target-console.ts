import { z } from "zod";
import { assertTargetInScope } from "./bulk";
import type { RunContract, Scope } from "@trustpatch/contracts";

export const toolNameSchema = z.enum([
  "site.inspect", "site.crawl", "site.headers", "site.screenshot", "recon.reactive",
  "seo.analyze", "seo.crawl_policy", "repo.map", "repair.propose", "repair.verify"
]);
export type ToolName = z.infer<typeof toolNameSchema>;
export const targetConsoleInputSchema = z.object({
  instruction: z.string().min(3).max(4000),
  scopeDomain: z.string().optional(),
  authorized: z.literal(true).optional()
});
export type TargetConsoleInput = z.infer<typeof targetConsoleInputSchema>;
export interface TargetPlan {
  targetUrl: string;
  scopeDomain: string | null;
  tools: ToolName[];
  readOnly: boolean;
  repairRequested: boolean;
  warnings: string[];
}

export function planTargetInstruction(input: TargetConsoleInput): TargetPlan {
  const instruction = input.instruction.trim();
  const urlMatch = instruction.match(/https?:\/\/[^\s,;]+/i);
  const scopeMatch = input.scopeDomain ?? instruction.match(/(?:scope|domain|tld)\s+([a-z0-9.-]+\.[a-z]{2,})/i)?.[1];
  const targetUrl = urlMatch?.[0]?.replace(/[.,)]$/, "") ?? process.env.TRUSTPATCH_FIXTURE_URL ?? "http://127.0.0.1:3100";
  const scope = scopeMatch ? scopeMatch.toLowerCase() : null;
  if (scope) assertTargetInScope(targetUrl, scope);
  const lower = instruction.toLowerCase();
  const readOnly = /read.?only|investigate only|inspect only|do not patch|don.?t patch|no changes/.test(lower) || !/fix|repair|patch/.test(lower);
  const repairRequested = !readOnly && /fix|repair|patch/.test(lower);
  const tools: ToolName[] = ["site.inspect", "site.headers", "site.screenshot", "recon.reactive", "seo.analyze", "seo.crawl_policy", "repo.map"];
  if (repairRequested) tools.push("repair.propose", "repair.verify");
  const warnings: string[] = [];
  if (repairRequested && !targetUrl.includes("127.0.0.1") && !targetUrl.includes("localhost")) warnings.push("Code repair is limited to the authorized local fixture. Remote targets receive read-only analysis.");
  if (!scope && !targetUrl.includes("127.0.0.1") && !targetUrl.includes("localhost")) warnings.push("External targets require an approved domain scope or ownership manifest before inspection.");
  return { targetUrl, scopeDomain: scope, tools, readOnly, repairRequested, warnings };
}

export function planSummary(plan: TargetPlan): string {
  return `${plan.targetUrl} · ${plan.tools.join(" → ")}`;
}
