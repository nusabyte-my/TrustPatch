import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";
import { trustpatchPaths } from "./config";

export type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;
export interface TrustpatchDb {
  db: DrizzleDatabase;
  sqlite: Database.Database;
  runs: typeof schema.runs;
  events: typeof schema.events;
  evidence: typeof schema.evidence;
  findings: typeof schema.findings;
  toolCalls: typeof schema.toolCalls;
  bulkJobs: typeof schema.bulkJobs;
  bulkSiteRuns: typeof schema.bulkSiteRuns;
}
export function createDatabase(path?: string): TrustpatchDb {
  const filename = path ? resolve(path) : trustpatchPaths().database;
  mkdirSync(dirname(filename), { recursive: true });
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  return {
    db,
    sqlite,
    runs: schema.runs,
    events: schema.events,
    evidence: schema.evidence,
    findings: schema.findings,
    toolCalls: schema.toolCalls,
    bulkJobs: schema.bulkJobs,
    bulkSiteRuns: schema.bulkSiteRuns
  };
}
export function migrateDatabase(sqlite: Database.Database) {
  const migration = resolve(dirname(fileURLToPath(import.meta.url)), "../migrations/0001_init.sql");
  sqlite.exec(readFileSync(migration, "utf8"));
}
