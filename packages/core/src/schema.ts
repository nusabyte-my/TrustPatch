import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  contractJson: text("contract_json").notNull(),
  approvalJson: text("approval_json"),
  approvalDigest: text("approval_digest"),
  approvalGranted: integer("approval_granted").notNull().default(0),
  attempt: integer("attempt").notNull().default(0),
  proofJson: text("proof_json"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: text("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
  role: text("role").notNull(), type: text("type").notNull(), message: text("message").notNull(),
  dataJson: text("data_json").notNull().default("{}"), createdAt: text("created_at").notNull()
});
export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), sha256: text("sha256").notNull(),
  sizeBytes: integer("size_bytes").notNull(), path: text("path").notNull(), createdAt: text("created_at").notNull()
});
export const findings = sqliteTable("findings", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), state: text("state").notNull(), title: text("title").notNull(),
  url: text("url").notNull(), summary: text("summary").notNull(), observedJson: text("observed_json").notNull(),
  sourceFilesJson: text("source_files_json").notNull(), evidenceIdsJson: text("evidence_ids_json").notNull()
});
export const bulkJobs = sqliteTable("bulk_jobs", {
  id: text("id").primaryKey(), scopeDomain: text("scope_domain").notNull(),
  targetsJson: text("targets_json").notNull(), status: text("status").notNull(),
  createdAt: text("created_at").notNull()
});
export const bulkSiteRuns = sqliteTable("bulk_site_runs", {
  id: text("id").primaryKey(), bulkJobId: text("bulk_job_id").notNull().references(() => bulkJobs.id, { onDelete: "cascade" }),
  runId: text("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
  targetUrl: text("target_url").notNull()
});
export const toolCalls = sqliteTable("tool_calls", {
  id: text("id").primaryKey(), runId: text("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
  idempotencyKey: text("idempotency_key").notNull(), tool: text("tool").notNull(),
  status: text("status").notNull(), resultJson: text("result_json"), createdAt: text("created_at").notNull()
}, (table) => [uniqueIndex("tool_calls_run_key").on(table.runId, table.idempotencyKey)]);
