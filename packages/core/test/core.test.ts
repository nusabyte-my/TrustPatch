import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabase, migrateDatabase, type TrustpatchDb } from "../src/db";
import { storeEvidence, readEvidence } from "../src/evidence";
import { createRun, getRunView, grantApproval, requestApproval, saveFindings } from "../src/store";
import { runContractSchema } from "@trustpatch/contracts";

const paths: string[] = [];
const stores: TrustpatchDb[] = [];
function runtime() {
  const path = mkdtempSync(resolve(tmpdir(), "trustpatch-test-"));
  paths.push(path);
  process.env.TRUSTPATCH_ARTIFACTS = resolve(path, "artifacts");
  const store = createDatabase(resolve(path, "test.db"));
  stores.push(store);
  migrateDatabase(store.sqlite);
  return store;
}
afterEach(() => {
  stores.splice(0).forEach((store) => store.sqlite.close());
  paths.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true }));
});

describe("durable evidence and approval contracts", () => {
  it("accepts duplicate identical evidence but never a digest-mismatched overwrite", () => {
    const store = runtime();
    const runId = createRun(store, runContractSchema.parse({ objective: "Test evidence", targetUrl: "http://localhost:3000", productionOrigin: "https://example.com", repositoryPath: ".", authorizedLocalFixture: true, scope: {} }));
    const first = storeEvidence(store, runId, "context", { same: true });
    const second = storeEvidence(store, runId, "context", { same: true });
    expect(second.path).toBe(first.path);
    expect(readEvidence(store, second.id)?.content.toString()).toBe(readEvidence(store, first.id)?.content.toString());
    const foreign = storeEvidence(store, runId, "context", { same: false });
    expect(foreign.path).not.toBe(first.path);
    expect(readEvidence(store, first.id)?.content.toString()).toContain("true");
  });
  it("consumes an approval only once", () => {
    const store = runtime();
    const runId = createRun(store, runContractSchema.parse({ objective: "Test approval", targetUrl: "http://localhost:3000", productionOrigin: "https://example.com", repositoryPath: ".", authorizedLocalFixture: true, scope: {} }));
    saveFindings(store, [{ id: "finding-test", runId, kind: "noindex", state: "observed", title: "Test finding", url: "http://localhost:3000/", summary: "Observed test defect", observed: {}, sourceFiles: [], evidenceIds: [] }]);
    requestApproval(store, runId, { includeChecks: ["noindex"], excludeChecks: [], includePaths: [], excludePaths: [], allowedFiles: ["app/services/page.tsx", "app/layout.tsx"] }, false);
    const digest = getRunView(store, runId).approval?.scopeDigest;
    expect(digest).toBeTruthy();
    grantApproval(store, runId, digest!);
    expect(getRunView(store, runId).status).toBe("repairing");
    expect(() => grantApproval(store, runId, digest!)).toThrow("not awaiting approval");
  });
});
