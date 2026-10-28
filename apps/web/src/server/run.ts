import { store } from "./runtime";
import {
  createRun, getContract, getEvents, getRunView, grantApproval, publishDraftPr, setStatus, trustpatchPaths, updateContract, addEvent, assertResolvablePublicTarget
} from "@trustpatch/core";
import { planTargetInstruction } from "@trustpatch/core";
import { createRunSchema, inferScope, runContractSchema, type CreateRunInput } from "@trustpatch/contracts";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export async function createAndExecuteRun(input: CreateRunInput) {
  const parsed = createRunSchema.parse(input);
  const targetPlan = planTargetInstruction({ instruction: parsed.objective, authorized: true });
  const inferred = inferScope(parsed.objective, parsed.scope);
  const contract = runContractSchema.parse({
    objective: parsed.objective,
    targetUrl: parsed.targetUrl ?? targetPlan.targetUrl,
    productionOrigin: parsed.productionOrigin ?? new URL(targetPlan.targetUrl).origin,
    repositoryPath: parsed.repositoryPath ? resolve(parsed.repositoryPath) : parsed.readOnly === false ? trustpatchPaths().fixturePath : `audit://${new URL(targetPlan.targetUrl).hostname}`,
    baseBranch: "main",
    createPr: parsed.createPr ?? !/stop before.*pr|don.?t open.*pr/i.test(parsed.objective),
    scope: {
      includePaths: ["/", "/services"],
      allowedFiles: ["app/layout.tsx", "app/page.tsx", "app/services/page.tsx", "next.config.ts"],
      ...inferred,
      ...parsed.scope
    }
  });
  contract.readOnly = parsed.readOnly ?? targetPlan.readOnly;
  contract.seoMode = parsed.seoMode ?? "standard";
  if (!contract.readOnly && !contract.scope.allowedFiles.length) contract.scope.allowedFiles = ["app/layout.tsx", "app/page.tsx", "app/services/page.tsx", "next.config.ts"];
  if (!parsed.repositoryPath) {
    const local = new URL(contract.targetUrl);
    if (!["127.0.0.1", "localhost"].includes(local.hostname)) {
      contract.authorizedLocalFixture = false;
    } else {
      contract.authorizedLocalFixture = true;
      if (contract.repositoryPath.startsWith("audit://")) contract.repositoryPath = trustpatchPaths().fixturePath;
    }
  }
  if (!contract.authorizedLocalFixture && !contract.readOnly) throw new Error("Code repair is limited to the authorized local fixture; remote targets require read-only analysis");
  await assertResolvablePublicTarget(contract.targetUrl, contract.authorizedLocalFixture);
  await assertResolvablePublicTarget(contract.productionOrigin, contract.authorizedLocalFixture);
  if (contract.authorizedLocalFixture && !existsSync(contract.repositoryPath)) throw new Error(`Authorized repository not found: ${contract.repositoryPath}`);
  const id = createRun(store, contract);
  return getRunView(store, id);
}
export async function readRun(id: string) {
  return { run: getRunView(store, id), events: getEvents(store, id) };
}
export async function approveRun(id: string, scopeDigest: string) {
  grantApproval(store, id, scopeDigest);
  return getRunView(store, id);
}
export async function messageRun(id: string, message: string) {
  const run = getRunView(store, id);
  if (run.status === "validated" && /open.*pr|create.*pr/i.test(message)) {
    updateContract(store, id, { createPr: true });
    if (!run.proof) throw new Error("Validated run has no proof receipt");
    const proof = await publishDraftPr(store, id, getContract(store, id), run.proof);
    if (!proof.prUrl && !(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO)) {
      throw new Error("Local repair is validated. Draft PR publication is not configured; set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO.");
    }
    return getRunView(store, id);
  }
  if (run.status === "paused_provider_error") {
    setStatus(store, id, "repairing");
    return getRunView(store, id);
  }
  addEvent(store, id, "mend", "instruction.received", message);
  return getRunView(store, id);
}
export async function cancelRun(id: string) {
  setStatus(store, id, "cancelled");
  addEvent(store, id, "mend", "run.cancelled", "Run cancelled. Existing evidence preserved; no merge or deployment performed.");
  return getRunView(store, id);
}
export function readContract(id: string) { return getContract(store, id); }
