import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { eq } from "drizzle-orm";
import type { EvidenceMetadata } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db.js";

export function artifactRoot() { return resolve(process.env.TRUSTPATCH_ARTIFACTS ?? "artifacts"); }
export function storeEvidence(store: TrustpatchDb, runId: string, kind: string, value: string | Buffer | object): EvidenceMetadata {
  const content = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : JSON.stringify(value, null, 2));
  const sha256 = createHash("sha256").update(content).digest("hex");
  const id = `ev_${randomUUID()}`;
  const relative = `${runId}/${sha256.slice(0, 16)}-${kind.replace(/[^a-z0-9_-]/gi, "_")}`;
  const path = resolve(artifactRoot(), relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { flag: "wx" });
  const createdAt = new Date().toISOString();
  store.db.insert(store.evidence).values({ id, runId, kind, sha256, sizeBytes: content.length, path, createdAt }).run();
  return { id, runId, kind, sha256, sizeBytes: content.length, path, createdAt };
}
export function readEvidence(store: TrustpatchDb, id: string) {
  const row = store.db.select().from(store.evidence).where(eq(store.evidence.id, id)).get();
  if (!row) return null;
  return { ...row, content: readFileSync(row.path) };
}
