import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { TrustpatchDb } from "./db";
import { buildBulkContracts, createBulkJob, type BulkTarget, type BulkJob } from "./bulk";
import { createRun, addEvent, getFindings, getRunView } from "./store";

export function queueBulkAudit(store: TrustpatchDb, scopeDomain: string, targets: BulkTarget[]): BulkJob {
  buildBulkContracts(createBulkJob(scopeDomain, targets));
  const job = createBulkJob(scopeDomain, targets);
  store.db.insert(store.bulkJobs).values({ id: job.id, scopeDomain: job.scopeDomain, targetsJson: JSON.stringify(job.targets), status: job.status, createdAt: job.createdAt }).run();
  const contracts = buildBulkContracts(job);
  for (const contract of contracts) {
    const runId = createRun(store, contract);
    store.db.insert(store.bulkSiteRuns).values({ id: `site_${randomUUID()}`, bulkJobId: job.id, runId, targetUrl: contract.targetUrl }).run();
  }
  const firstRun = store.db.select({ runId: store.bulkSiteRuns.runId }).from(store.bulkSiteRuns).where(eq(store.bulkSiteRuns.bulkJobId, job.id)).get();
  if (firstRun) addEvent(store, firstRun.runId, "mend", "activity", `Bulk audit queued for ${contracts.length} authorized targets within ${job.scopeDomain}. Passive checks only.`, { activity: "bulk", status: "active" });
  store.db.update(store.bulkJobs).set({ status: "running" }).where(eq(store.bulkJobs.id, job.id)).run();
  return { ...job, status: "running" };
}
export function getBulkAudit(store: TrustpatchDb, id: string) {
  const job = store.db.select().from(store.bulkJobs).where(eq(store.bulkJobs.id, id)).get();
  if (!job) throw new Error("Bulk audit not found");
  const links = store.db.select().from(store.bulkSiteRuns).where(eq(store.bulkSiteRuns.bulkJobId, id)).all();
  const sites = links.map((link) => {
    const run = getRunView(store, link.runId);
    return { runId: link.runId, targetUrl: link.targetUrl, status: run.status, findings: getFindings(store, link.runId).length, error: run.error };
  });
  const done = sites.filter((site) => ["validated", "blocked", "cancelled"].includes(site.status)).length;
  return { ...job, sites, completed: done, total: sites.length, status: done === sites.length ? sites.some((site) => site.status === "blocked") ? "completed_with_errors" : "completed" : "running" };
}
export function markBulkComplete(store: TrustpatchDb, id: string) {
  const job = getBulkAudit(store, id);
  if (job.completed === job.total) store.db.update(store.bulkJobs).set({ status: job.status }).where(eq(store.bulkJobs.id, id)).run();
  return job;
}
