import { randomUUID } from "node:crypto";
import { z } from "zod";
import { runContractSchema, type RunContract } from "@trustpatch/contracts";

export const bulkTargetSchema = z.object({
  url: z.string().url(),
  paths: z.array(z.string().startsWith("/")).min(1).max(20).default(["/"]),
  authorized: z.literal(true)
});
export type BulkTarget = z.infer<typeof bulkTargetSchema>;
export const bulkJobSchema = z.object({
  id: z.string(),
  scopeDomain: z.string().regex(/^[a-z0-9.-]+$/i),
  targets: z.array(bulkTargetSchema).min(1).max(20),
  ownershipConfirmed: z.literal(true),
  status: z.enum(["queued", "running", "completed", "completed_with_errors"]),
  createdAt: z.string()
});
export type BulkJob = z.infer<typeof bulkJobSchema>;
export interface BulkSiteResult {
  runId: string;
  targetUrl: string;
  status: string;
  findings: number;
  error: string | null;
}

export function parseScopeDomain(value: string): string {
  const scope = value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0]?.replace(/\.$/, "") ?? "";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(scope)) throw new Error("Scope must be a registrable domain such as example.com, not a bare TLD");
  if (["localhost", "127.0.0.1", "local"].includes(scope)) throw new Error("Use the local fixture flow for loopback targets");
  return scope;
}

export function assertTargetInScope(target: string, scopeDomain: string): URL {
  const url = new URL(target);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Only HTTP(S) targets are supported");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host === "2130706433" || host === "0177.0.0.1") throw new Error("Loopback targets must use the local fixture flow");
  if (/(?:^|\.)(?:local|internal|lan|intranet|corp)$/i.test(host)) throw new Error("Internal-network hostnames are not allowed in bulk mode");
  if (host.includes(":")) throw new Error("IPv6 targets require explicit private/ULA review before bulk auditing");
  if (/^(10|127|169\.254|192\.168)\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) throw new Error("Private-network targets are not allowed in bulk mode");
  if (host !== scopeDomain && !host.endsWith(`.${scopeDomain}`)) throw new Error(`${host} is outside approved scope ${scopeDomain}`);
  return url;
}

export function buildBulkContracts(job: BulkJob): RunContract[] {
  const scope = parseScopeDomain(job.scopeDomain);
  return job.targets.map((target) => {
    const url = assertTargetInScope(target.url, scope);
    return runContractSchema.parse({
      objective: `Authorized passive bulk audit of ${url.origin}`,
      targetUrl: url.origin,
      productionOrigin: url.origin,
      repositoryPath: `bulk://${url.hostname}`,
      baseBranch: "main",
      readOnly: true,
      authorizedLocalFixture: false,
      scope: {
        includeChecks: ["noindex", "canonical", "security_header", "seo_metadata", "seo_social", "seo_structure", "seo_schema", "seo_content", "seo_links", "seo_crawl", "seo_answer"],
        includePaths: target.paths,
        allowedFiles: []
      },
      createPr: false,
      maxPages: 20,
      maxPatchAttempts: 1
    });
  });
}

export function createBulkJob(scopeDomain: string, targets: BulkTarget[]): BulkJob {
  return bulkJobSchema.parse({ id: `bulk_${randomUUID()}`, scopeDomain: parseScopeDomain(scopeDomain), targets, ownershipConfirmed: true, status: "queued", createdAt: new Date().toISOString() });
}
