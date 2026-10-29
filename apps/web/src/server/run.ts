import { store } from "./runtime";
import {
  createRun, getContract, getEvents, getRunView, grantApproval, publishDraftPr, setStatus, trustpatchPaths, updateContract, addEvent, assertResolvablePublicTarget, answerFollowUp, storeFollowUp
} from "@trustpatch/core";
import { planTargetInstruction } from "@trustpatch/core";
import { createRunSchema, inferScope, runContractSchema, type CreateRunInput, type AgentNode } from "@trustpatch/contracts";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export async function createAndExecuteRun(input: CreateRunInput) {
  const parsed = createRunSchema.parse(input);
  const targetPlan = planTargetInstruction({ instruction: parsed.objective, authorized: true });
  const inferred = inferScope(parsed.objective, parsed.scope);
  const contract = runContractSchema.parse({
    objective: parsed.objective,
    targetUrl: parsed.targetUrl ?? targetPlan.targetUrl,
    productionOrigin: parsed.productionOrigin ?? new URL(parsed.targetUrl ?? targetPlan.targetUrl).origin,
    repositoryPath: parsed.repositoryPath ? resolve(parsed.repositoryPath) : parsed.readOnly === false ? trustpatchPaths().fixturePath : `audit://${new URL(targetPlan.targetUrl).hostname}`,
    baseBranch: "main",
    createPr: parsed.createPr ?? !/stop before.*pr|don.?t open.*pr/i.test(parsed.objective),
    githubToken: parsed.githubToken,
    scope: {
      includePaths: ["/", "/services"],
      allowedFiles: ["app/layout.tsx", "app/page.tsx", "app/services/page.tsx", "next.config.ts"],
      ...inferred,
      ...parsed.scope
    }
  });
  contract.readOnly = parsed.readOnly ?? targetPlan.readOnly;
  contract.targetType = parsed.targetType ?? "website";
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
  // Check if commander directed message to a specific agent peer (@inspector, @recon, @repair, @verifier)
  const lowerMsg = message.toLowerCase();
  let recipient = "@mend";
  let respondingRole: "mend" | "inspector" | "recon" | "repair" | "verifier" = "mend";
  let hostNode: AgentNode = { id: "node-mend-01", role: "mend", label: "Mend Coordinator", hostname: "mend-master.internal", ip: "10.42.0.1", vmType: "micro-vm", status: "ready", memoryMb: 512 };

  if (lowerMsg.includes("@inspector")) {
    recipient = "@inspector";
    respondingRole = "inspector";
    hostNode = { id: "node-inspector-02", role: "inspector", label: "Security & Header Probe", hostname: "sec-probe.internal", ip: "10.42.0.2", vmType: "container-sandbox", status: "ready", memoryMb: 256 };
  } else if (lowerMsg.includes("@recon")) {
    recipient = "@recon";
    respondingRole = "recon";
    hostNode = { id: "node-recon-03", role: "recon", label: "AST Semantic Mapper", hostname: "ast-engine.internal", ip: "10.42.0.3", vmType: "ast-engine", status: "ready", memoryMb: 384 };
  } else if (lowerMsg.includes("@repair")) {
    recipient = "@repair";
    respondingRole = "repair";
    hostNode = { id: "node-repair-04", role: "repair", label: "Worktree Sandbox", hostname: "sandbox-worker.internal", ip: "10.42.0.4", vmType: "container-sandbox", status: "ready", memoryMb: 1024 };
  } else if (lowerMsg.includes("@verifier")) {
    recipient = "@verifier";
    respondingRole = "verifier";
    hostNode = { id: "node-verifier-05", role: "verifier", label: "Isolated QA Evaluator", hostname: "qa-runner.internal", ip: "10.42.0.5", vmType: "qa-isolated", status: "ready", memoryMb: 768 };
  }

  addEvent(store, id, "mend", "instruction.received", message, {
    sender: "user",
    recipient,
    protocol: "DISPATCH"
  });

  const followUp = storeFollowUp(store, id, answerFollowUp(run.contract, run.status, run.proof?.findings ?? [], message));

  addEvent(store, id, respondingRole, "instruction.answered", followUp.response, {
    sender: respondingRole,
    recipient: "@user",
    protocol: "ACK",
    node: hostNode,
    evidenceId: followUp.evidenceId,
    nextTool: followUp.nextTool
  });
  return getRunView(store, id);
}
export async function cancelRun(id: string) {
  setStatus(store, id, "cancelled");
  addEvent(store, id, "mend", "run.cancelled", "Run cancelled. Existing evidence preserved; no merge or deployment performed.");
  return getRunView(store, id);
}
export function readContract(id: string) { return getContract(store, id); }
