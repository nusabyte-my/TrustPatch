import { store } from "./runtime";
import {
  createRun, getContract, getEvents, getRunView, grantApproval, publishDraftPr, setStatus, trustpatchPaths, updateContract, addEvent
} from "@trustpatch/core";
import { createRunSchema, inferScope, runContractSchema, type CreateRunInput } from "@trustpatch/contracts";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export async function createAndExecuteRun(input: CreateRunInput) {
  const parsed = createRunSchema.parse(input);
  const inferred = inferScope(parsed.objective, parsed.scope);
  const contract = runContractSchema.parse({
    objective: parsed.objective,
    targetUrl: parsed.targetUrl ?? process.env.TRUSTPATCH_FIXTURE_URL ?? "http://127.0.0.1:3100",
    productionOrigin: parsed.productionOrigin ?? "https://northstar.example",
    repositoryPath: parsed.repositoryPath ? resolve(parsed.repositoryPath) : trustpatchPaths().fixturePath,
    baseBranch: "main",
    createPr: parsed.createPr ?? !/stop before.*pr|don.?t open.*pr/i.test(parsed.objective),
    scope: {
      includePaths: ["/", "/services"],
      allowedFiles: ["app/layout.tsx", "app/page.tsx", "app/services/page.tsx", "next.config.ts"],
      ...inferred
    }
  });
  contract.readOnly = /investigate.*only|explain.*only|do not patch|don.?t patch/i.test(parsed.objective);
  if (!parsed.repositoryPath && !parsed.targetUrl) {
    const local = new URL(contract.targetUrl);
    if (!["127.0.0.1", "localhost"].includes(local.hostname)) throw new Error("Only the explicitly authorized local fixture is enabled in this build");
    contract.authorizedLocalFixture = true;
  }
  if (!contract.authorizedLocalFixture) throw new Error("Target ownership must be verified before inspection");
  if (!existsSync(contract.repositoryPath)) throw new Error(`Authorized repository not found: ${contract.repositoryPath}`);
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
