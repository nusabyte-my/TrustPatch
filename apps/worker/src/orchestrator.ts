import { resolve } from "node:path";

import {
  addEvent, applyRepairPlan, createDatabase, getContract, getFindings, getRunView,
  inspectSite, mapRepository, migrateDatabase, planRepairs, plannerName, requestApproval,
  saveFindings, saveProof, setStatus, startPatchedPreview, updateFindingStates, verifyRepair,
  ProviderError, type TrustpatchDb
} from "@trustpatch/core";
import { repairPlanSchema } from "@trustpatch/core";
import type { ProofReceipt, RunView } from "@trustpatch/contracts";

export async function executeRun(store: TrustpatchDb, runId: string): Promise<RunView> {
  const initial = getRunView(store, runId);
  if (["validated", "cancelled", "blocked"].includes(initial.status)) return initial;
  if (initial.status === "awaiting_approval") return initial;
  const contract = getContract(store, runId);
  const proof: ProofReceipt = {
    status: "investigating", planner: plannerName(), findings: [], changedFiles: [], branch: null,
    diffEvidenceId: null, verification: [], prUrl: null, deployed: false
  };
  try {
    if (initial.status === "queued") {
      setStatus(store, runId, "investigating");
      addEvent(store, runId, "mend", "plan.created", "Mend dispatched Inspector and Mapper in parallel; Repair and Verifier remain policy-gated.");
      const [observations, mapped] = await Promise.all([
        inspectSite(store, runId, contract),
        Promise.resolve().then(() => mapRepository(store, runId, contract))
      ]);
      const seenPolicyDefects = new Set<string>();
      const findings = observations.filter((finding) => {
        if (finding.kind !== "security_header") return true;
        if (seenPolicyDefects.has(finding.kind)) return false;
        seenPolicyDefects.add(finding.kind);
        return true;
      });
      const withSources = findings.map((finding) => ({
        ...finding,
        sourceFiles: finding.kind === "security_header" ? ["next.config.ts"] : finding.kind === "noindex" ? ["app/services/page.tsx", "app/layout.tsx"] : ["app/services/page.tsx"]
      }));
      saveFindings(store, withSources);
      proof.findings = withSources;
      addEvent(store, runId, "inspector", "evidence.collected", `${withSources.length} evidence-backed findings collected.`, { repositoryEvidenceId: mapped.evidenceId });
      if (!withSources.length) {
        proof.status = "validated";
        saveProof(store, runId, proof);
        setStatus(store, runId, "validated");
        addEvent(store, runId, "mend", "run.completed", "No selected defects found. No repository changes made.");
        return getRunView(store, runId);
      }
      if (contract.readOnly) {
        proof.status = "validated";
        saveProof(store, runId, proof);
        setStatus(store, runId, "validated");
        addEvent(store, runId, "mend", "investigation.completed", "Read-only investigation complete. No repair branch or repository mutation created.");
        return getRunView(store, runId);
      }
      requestApproval(store, runId, contract.scope, contract.createPr);
      saveProof(store, runId, { ...proof, status: "awaiting_approval" });
      return getRunView(store, runId);
    }
    if (initial.status === "repairing" || initial.status === "verifying" || initial.status === "paused_provider_error") {
      if (!initial.approvalGranted || !initial.approval) throw new Error("Repair requires a valid scope approval");
      const findings = getFindings(store, runId);
      const worktree = resolve(contract.repositoryPath, "..", ".trustpatch-worktrees", runId);
      const mapped = mapRepository(store, runId, contract, initial.attempt > 0 ? worktree : contract.repositoryPath);
      let branch: string | null = null;
      let diffEvidenceId: string | null = null;
      let changedFiles: string[] = [];
      let lastFailure: string | undefined;
      let validated = false;
      for (let attempt = 0; attempt < contract.maxPatchAttempts; attempt += 1) {
        addEvent(store, runId, "repair", "repair.started", `Repair attempt ${attempt + 1}: ${plannerName()} is preparing a scoped patch.`);
        const plan = repairPlanSchema.parse(await planRepairs({ contract, findings, files: mapped.files, attempt, ...(lastFailure ? { verificationFailure: lastFailure } : {}) }));
        const repaired = await applyRepairPlan(store, runId, contract, initial.approval, plan, attempt);
        branch = repaired.branch;
        changedFiles = repaired.changedFiles;
        diffEvidenceId = repaired.diffEvidenceId;
        proof.findings = findings;
        proof.branch = branch;
        proof.changedFiles = changedFiles;
        proof.diffEvidenceId = diffEvidenceId;
        saveProof(store, runId, { ...proof, status: "verifying" });
        updateFindingStates(store, runId, "repaired");
        setStatus(store, runId, "verifying");
        addEvent(store, runId, "verifier", "verification.started", "Verifier is independently building and checking the patched worktree.");
        const preview = await startPatchedPreview(store, runId, repaired.worktree, contract.productionOrigin);
        try {
          proof.verification = await verifyRepair(store, runId, contract, findings, preview.url);
        } finally {
          await preview.stop();
        }
        const verification = proof.verification;
        if (verification.every((result) => result.passed)) {
          validated = true;
          break;
        }
        lastFailure = verification.filter((result) => !result.passed).map((result) => `${result.name}: ${result.detail}`).join("; ");
        addEvent(store, runId, "verifier", "verification.failed", lastFailure);
        store.sqlite.prepare("UPDATE runs SET attempt = ?, updated_at = ? WHERE id = ?").run(attempt + 1, new Date().toISOString(), runId);
        Object.assign(mapped, mapRepository(store, runId, contract, repaired.worktree));
      }
      updateFindingStates(store, runId, validated ? "validated" : "blocked");
      const finalProof: ProofReceipt = {
        ...proof, status: validated ? "validated" : "blocked", findings: getFindings(store, runId), changedFiles,
        branch, diffEvidenceId, verification: proof.verification, prUrl: null, deployed: false
      };
      saveProof(store, runId, finalProof);
      setStatus(store, runId, validated ? "validated" : "blocked", validated ? null : "Repair did not pass verification within the approved attempt budget");
      addEvent(store, runId, "mend", validated ? "run.validated" : "run.blocked", validated ? "Repair validated locally. No merge or deployment performed." : "Mend stopped without claiming a validated repair.");
      return getRunView(store, runId);
    }
    return initial;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown run failure";
    const provider = error instanceof ProviderError;
    const status = provider ? "paused_provider_error" : "blocked";
    setStatus(store, runId, status, message);
    saveProof(store, runId, { ...proof, findings: getFindings(store, runId), status });
    addEvent(store, runId, "mend", provider ? "provider.failed" : "run.blocked", message, { retryable: provider ? error.retryable : false });
    return getRunView(store, runId);
  }
}

export async function createRuntime(path?: string) {
  const store = createDatabase(path);
  migrateDatabase(store.sqlite);
  return store;
}

export async function startWorker() {
  const store = await createRuntime();
  const active = new Set<string>();
  const timer = setInterval(async () => {
    const pending = store.sqlite.prepare("SELECT id FROM runs WHERE status = 'repairing'").all() as Array<{ id: string }>;
    for (const run of pending) {
      if (active.has(run.id)) continue;
      active.add(run.id);
      try { await executeRun(store, run.id); } finally { active.delete(run.id); }
    }
  }, 500);
  const shutdown = () => { clearInterval(timer); store.sqlite.close(); process.exit(0); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  console.log("Mend worker ready. Supervising Inspector, Mapper, Repair, and Verifier.");
}
