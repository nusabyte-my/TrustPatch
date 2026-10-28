import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as Core from "@trustpatch/core";
import { createAndExecuteRun } from "./run";
import { store } from "./runtime";

vi.mock("@trustpatch/core", async (importOriginal) => {
  const actual = await importOriginal<typeof Core>();
  return { ...actual, assertResolvablePublicTarget: vi.fn(async (value: string) => new URL(value)) };
});
const paths: string[] = [];
afterEach(() => { store.sqlite.close(); paths.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })); });

describe("external run target contracts", () => {
  it("keeps an explicit target origin instead of substituting the fixture origin", async () => {
    const path = mkdtempSync(resolve(tmpdir(), "trustpatch-run-test-"));
    paths.push(path);
    process.env.TRUSTPATCH_DATABASE = resolve(path, "test.db");
    process.env.TRUSTPATCH_ARTIFACTS = resolve(path, "artifacts");
    const run = await createAndExecuteRun({ objective: "Inspect external target", targetUrl: "https://example.com", readOnly: true, ownershipConfirmed: true, targetType: "website", scope: { includeChecks: ["security_header"] } });
    expect(run.contract.targetUrl).toBe("https://example.com");
    expect(run.contract.productionOrigin).toBe("https://example.com");
  });
});
