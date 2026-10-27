import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import type { AgentRole, Approval, Finding, ProofReceipt, RunContract, RunView, Scope } from "@trustpatch/contracts";
import { runContractSchema, runViewSchema, scopeSchema } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";

const now = () => new Date().toISOString();
export function addEvent(store: TrustpatchDb, runId: string, role: AgentRole, type: string, message: string, data: Record<string, unknown> = {}) {
  store.db.insert(store.events).values({ runId, role, type, message, dataJson: JSON.stringify(data), createdAt: now() }).run();
}
export function createRun(store: TrustpatchDb, contract: RunContract) {
  const id = `run_${randomUUID()}`;
  store.db.insert(store.runs).values({ id, status: "queued", contractJson: JSON.stringify(contract), createdAt: now(), updatedAt: now() }).run();
  addEvent(store, id, "mend", "activity", "Objective accepted. I’m checking the authorized site and repository before proposing any changes.", { activity: "inspection", status: "active", objective: contract.objective });
  return id;
}
export function getContract(store: TrustpatchDb, runId: string): RunContract {
  const row = store.db.select().from(store.runs).where(eq(store.runs.id, runId)).get();
  if (!row) throw new Error("Run not found");
  return runContractSchema.parse(JSON.parse(row.contractJson));
}
export function setStatus(store: TrustpatchDb, runId: string, status: string, error: string | null = null) {
  store.db.update(store.runs).set({ status, error, updatedAt: now() }).where(eq(store.runs.id, runId)).run();
}
export function saveFindings(store: TrustpatchDb, values: Finding[]) {
  values.forEach((finding) => store.db.insert(store.findings).values({
    ...finding, observedJson: JSON.stringify(finding.observed), sourceFilesJson: JSON.stringify(finding.sourceFiles), evidenceIdsJson: JSON.stringify(finding.evidenceIds)
  }).onConflictDoUpdate({ target: store.findings.id, set: { state: finding.state, sourceFilesJson: JSON.stringify(finding.sourceFiles), evidenceIdsJson: JSON.stringify(finding.evidenceIds) } }).run());
}
export function updateFindingStates(store: TrustpatchDb, runId: string, state: string) {
  store.db.update(store.findings).set({ state }).where(eq(store.findings.runId, runId)).run();
}
export function getFindings(store: TrustpatchDb, runId: string): Finding[] {
  return store.db.select().from(store.findings).where(eq(store.findings.runId, runId)).all().map((row) => ({
    id: row.id, runId: row.runId, kind: row.kind as Finding["kind"], state: row.state as Finding["state"],
    title: row.title, url: row.url, summary: row.summary, observed: JSON.parse(row.observedJson),
    sourceFiles: JSON.parse(row.sourceFilesJson), evidenceIds: JSON.parse(row.evidenceIdsJson)
  }));
}
export function approvalDigest(approval: Omit<Approval, "scopeDigest">) {
  return createHash("sha256").update(JSON.stringify({ findingIds: [...approval.findingIds].sort(), allowedFiles: [...approval.allowedFiles].sort(), createPr: approval.createPr })).digest("hex");
}
export function requestApproval(store: TrustpatchDb, runId: string, scope: Scope, createPr: boolean) {
  const found = getFindings(store, runId);
  if (!found.length) throw new Error("No findings to approve");
  const required = new Set<string>();
  if (found.some((f) => f.kind === "noindex")) { required.add("app/services/page.tsx"); required.add("app/layout.tsx"); }
  if (found.some((f) => f.kind === "canonical")) required.add("app/services/page.tsx");
  if (found.some((f) => f.kind === "security_header")) required.add("next.config.ts");
  const allowedFiles = [...required].filter((file) => scope.allowedFiles.includes(file));
  const base = { findingIds: found.map((f) => f.id), allowedFiles, createPr };
  const approval: Approval = { ...base, scopeDigest: approvalDigest(base) };
  store.db.update(store.runs).set({ approvalJson: JSON.stringify(approval), approvalDigest: approval.scopeDigest, approvalGranted: 0, updatedAt: now() }).where(eq(store.runs.id, runId)).run();
  setStatus(store, runId, "awaiting_approval");
  addEvent(store, runId, "mend", "activity", `I found ${found.length} issue${found.length === 1 ? "" : "s"}. Review the exact files and permissions before I create a repair branch.`, { activity: "approval", status: "warning", ...approval } as unknown as Record<string, unknown>);
}
export function grantApproval(store: TrustpatchDb, runId: string, scopeDigest: string) {
  const row = store.db.select().from(store.runs).where(eq(store.runs.id, runId)).get();
  if (!row || row.status !== "awaiting_approval") throw new Error("Run is not awaiting approval");
  if (!row.approvalDigest || row.approvalDigest !== scopeDigest) throw new Error("Approval scope has changed; review the new scope");
  const result = store.db.update(store.runs).set({ approvalGranted: 1, status: "repairing", updatedAt: now() }).where(and(eq(store.runs.id, runId), eq(store.runs.status, "awaiting_approval"), eq(store.runs.approvalGranted, 0))).run();
  if (!result.changes) throw new Error("Approval was already consumed");
  updateFindingStates(store, runId, "approved");
  addEvent(store, runId, "mend", "activity", "Scope approved. I’m creating an isolated branch and starting the repair; your original files are unchanged.", { activity: "approval", status: "info" });
}
export function saveProof(store: TrustpatchDb, runId: string, proof: ProofReceipt) {
  store.db.update(store.runs).set({ proofJson: JSON.stringify(proof), updatedAt: now() }).where(eq(store.runs.id, runId)).run();
}
export function getRunView(store: TrustpatchDb, runId: string): RunView {
  const row = store.db.select().from(store.runs).where(eq(store.runs.id, runId)).get();
  if (!row) throw new Error("Run not found");
  return runViewSchema.parse({
    id: row.id, status: row.status, contract: JSON.parse(row.contractJson),
    approval: row.approvalJson ? JSON.parse(row.approvalJson) : null,
    approvalGranted: Boolean(row.approvalGranted), attempt: row.attempt, proof: row.proofJson ? JSON.parse(row.proofJson) : null,
    error: row.error, createdAt: row.createdAt
  });
}
export function getEvents(store: TrustpatchDb, runId: string) {
  return store.db.select().from(store.events).where(eq(store.events.runId, runId)).orderBy(asc(store.events.id)).all().map((row) => ({ ...row, data: JSON.parse(row.dataJson) }));
}
export function updateContract(store: TrustpatchDb, runId: string, patch: { createPr?: boolean; scope?: Partial<Scope> }) {
  const current = getContract(store, runId);
  const next = { ...current, ...patch, scope: scopeSchema.parse({ ...current.scope, ...patch.scope }) };
  store.db.update(store.runs).set({ contractJson: JSON.stringify(next), updatedAt: now() }).where(eq(store.runs.id, runId)).run();
  return next;
}
