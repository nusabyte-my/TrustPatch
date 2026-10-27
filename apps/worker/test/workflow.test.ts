import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  createRun, getEvents, getRunView, grantApproval, migrateDatabase, trustpatchPaths
} from "@trustpatch/core";
import { createDatabase } from "@trustpatch/core";
import { runContractSchema } from "@trustpatch/contracts";
import { executeRun } from "../src/orchestrator";

const directory = mkdtempSync(resolve(tmpdir(), "trustpatch-e2e-"));
const store = createDatabase(resolve(directory, "test.db"));
const paths = trustpatchPaths();

describe("Mend full repair workflow", { timeout: 300_000 }, () => {
  it("recovers from inherited noindex and validates all three repair checks", async () => {
    process.env.TRUSTPATCH_ARTIFACTS = resolve(directory, "artifacts");
    process.env.AGENT_MODE = "fixture";
    process.env.FIXTURE_RECOVERY = "true";
    migrateDatabase(store.sqlite);
    const contract = runContractSchema.parse({
      objective: "E2E: repair authorized local fixture without opening a PR",
      targetUrl: process.env.TRUSTPATCH_FIXTURE_URL ?? "http://127.0.0.1:3100",
      productionOrigin: "https://northstar.example",
      repositoryPath: paths.fixturePath,
      baseBranch: "main",
      authorizedLocalFixture: true,
      createPr: false,
      scope: {
        includeChecks: ["noindex", "canonical", "security_header"],
        includePaths: ["/", "/services"],
        allowedFiles: ["app/layout.tsx", "app/services/page.tsx", "next.config.ts"]
      }
    });
    const runId = createRun(store, contract);
    await executeRun(store, runId);
    const pending = getRunView(store, runId);
    expect(pending.status).toBe("awaiting_approval");
    expect(pending.proof?.findings.map((finding) => finding.kind).sort()).toEqual(["canonical", "noindex", "security_header"]);
    expect(pending.approval?.allowedFiles).toContain("app/layout.tsx");
    grantApproval(store, runId, pending.approval!.scopeDigest);
    const result = await executeRun(store, runId);
    const events = getEvents(store, runId);
    expect(result.status).toBe("validated");
    expect(result.proof?.verification).toHaveLength(3);
    expect(result.proof?.verification.every((check) => check.passed)).toBe(true);
    expect(result.proof?.planner).toBe("fixture-planner");
    expect(result.proof?.deployed).toBe(false);
    expect(events.filter((event) => event.type === "repair.started")).toHaveLength(2);
    expect(events.some((event) => event.type === "verification.failed" && event.message.includes("noindex"))).toBe(true);
    expect(result.proof?.branch).toBeTruthy();
    expect(result.proof?.diffEvidenceId).toBeTruthy();
  });
});

afterAll(() => {
  store.sqlite.close();
  rmSync(directory, { recursive: true, force: true });
});
