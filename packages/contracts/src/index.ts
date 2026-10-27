import { z } from "zod";

export const AGENT_NAME = "Mend";
export const agentRoleSchema = z.enum(["mend", "inspector", "mapper", "repair", "verifier", "seo"]);
export type AgentRole = z.infer<typeof agentRoleSchema>;
export const runStatusSchema = z.enum([
  "queued", "investigating", "awaiting_approval", "repairing", "verifying",
  "awaiting_user", "validated", "blocked", "paused_provider_error", "cancelled"
]);
export type RunStatus = z.infer<typeof runStatusSchema>;
export const findingKindSchema = z.enum([
  "noindex", "canonical", "security_header", "seo_metadata", "seo_social",
  "seo_structure", "seo_schema", "seo_content", "seo_links", "seo_crawl", "seo_answer"
]);
export type FindingKind = z.infer<typeof findingKindSchema>;
export const findingStateSchema = z.enum(["observed", "verified", "approved", "repaired", "validated", "blocked", "out_of_scope"]);
export const scopeSchema = z.object({
  includeChecks: z.array(findingKindSchema).default(["noindex", "canonical", "security_header", "seo_metadata", "seo_social", "seo_structure", "seo_schema", "seo_content", "seo_links", "seo_crawl", "seo_answer"]),
  excludeChecks: z.array(findingKindSchema).default([]),
  includePaths: z.array(z.string()).default([]),
  excludePaths: z.array(z.string()).default([]),
  allowedFiles: z.array(z.string()).default([])
});
export type Scope = z.infer<typeof scopeSchema>;
export const runContractSchema = z.object({
  objective: z.string().min(3).max(4000),
  targetUrl: z.string().url(),
  productionOrigin: z.string().url(),
  repositoryPath: z.string().min(1),
  baseBranch: z.string().default("main"),
  readOnly: z.boolean().default(false),
  authorizedLocalFixture: z.boolean().default(false),
  scope: scopeSchema,
  createPr: z.boolean().default(false),
  maxPages: z.number().int().min(1).max(50).default(12),
  maxPatchAttempts: z.number().int().min(1).max(3).default(3)
});
export type RunContract = z.infer<typeof runContractSchema>;
export const createRunSchema = z.object({
  objective: z.string().min(3).max(4000),
  targetUrl: z.string().url().optional(),
  productionOrigin: z.string().url().optional(),
  repositoryPath: z.string().optional(),
  scope: scopeSchema.partial().optional(),
  createPr: z.boolean().optional()
});
export type CreateRunInput = z.infer<typeof createRunSchema>;
export const evidenceMetadataSchema = z.object({
  id: z.string(), runId: z.string(), kind: z.string(), sha256: z.string(),
  sizeBytes: z.number().int().nonnegative(), path: z.string(), createdAt: z.string()
});
export type EvidenceMetadata = z.infer<typeof evidenceMetadataSchema>;
export const findingSchema = z.object({
  id: z.string(), runId: z.string(), kind: findingKindSchema,
  state: findingStateSchema, title: z.string(), url: z.string().url(),
  summary: z.string(), observed: z.record(z.string(), z.unknown()),
  sourceFiles: z.array(z.string()), evidenceIds: z.array(z.string())
});
export type Finding = z.infer<typeof findingSchema>;
export const approvalSchema = z.object({
  findingIds: z.array(z.string()).min(1),
  allowedFiles: z.array(z.string()).min(1),
  createPr: z.boolean(),
  scopeDigest: z.string().length(64)
});
export type Approval = z.infer<typeof approvalSchema>;
export const runEventSchema = z.object({
  id: z.number().int(), runId: z.string(), role: agentRoleSchema,
  type: z.string(), message: z.string(), data: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string()
});
export type RunEvent = z.infer<typeof runEventSchema>;
export const proofReceiptSchema = z.object({
  status: runStatusSchema,
  planner: z.enum(["fixture-planner", "meta-model"]),
  findings: z.array(findingSchema),
  changedFiles: z.array(z.string()),
  branch: z.string().nullable(),
  diffEvidenceId: z.string().nullable(),
  verification: z.array(z.object({ name: z.string(), passed: z.boolean(), detail: z.string(), evidenceId: z.string().nullable() })),
  prUrl: z.string().nullable(),
  deployed: z.literal(false)
});
export type ProofReceipt = z.infer<typeof proofReceiptSchema>;
export const runViewSchema = z.object({
  id: z.string(), status: runStatusSchema, contract: runContractSchema,
  approval: approvalSchema.nullable(), approvalGranted: z.boolean(), attempt: z.number().int().nonnegative(),
  proof: proofReceiptSchema.nullable(), error: z.string().nullable(), createdAt: z.string()
});
export type RunView = z.infer<typeof runViewSchema>;

export function inferScope(objective: string, requested?: Partial<Scope>): Partial<Scope> {
  const lower = objective.toLowerCase();
  const scope: Partial<Scope> = { ...requested };
  if (/only|just|explain|investigate|inspect/.test(lower) && !lower.includes("fix") && !lower.includes("repair")) {
    scope.includeChecks = ["noindex", "canonical", "security_header"];
  }
  if (/don.?t touch blog|ignore .?blog|exclude .?blog/.test(lower)) scope.excludePaths = ["/blog"];
  if (/don.?t (touch|change).*header|leave.*header/.test(lower)) scope.excludeChecks = ["security_header"];
  if (/canonical.*only|only.*canonical/.test(lower)) scope.includeChecks = ["canonical"];
  return scope;
}

export function checkRevisionScope(input: {
  findingIds: string[]; changedFiles: string[]; approval: Approval;
  newCapability?: boolean;
}): { allowed: boolean; reason: string } {
  if (input.newCapability) return { allowed: false, reason: "Revision introduces a new capability" };
  const findings = new Set(input.approval.findingIds);
  const files = new Set(input.approval.allowedFiles);
  if (input.findingIds.some((id) => !findings.has(id))) return { allowed: false, reason: "Finding outside approved set" };
  const outside = input.changedFiles.filter((file) => !files.has(file));
  if (outside.length) return { allowed: false, reason: `Files outside approved scope: ${outside.join(", ")}` };
  return { allowed: true, reason: "Revision remains inside approved scope" };
}
