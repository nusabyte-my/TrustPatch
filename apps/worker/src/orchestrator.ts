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
      addEvent(store, runId, "mend", "activity", "Inspector and Mapper are working in parallel. I’m collecting raw pages, rendered metadata, response headers, and source context.", { activity: "inspection", status: "active" });
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
      const repairCandidates = findings.filter((finding) => ["noindex", "canonical", "security_header"].includes(finding.kind));
      const seoReviewCount = findings.length - repairCandidates.length;
      const withSources = findings.map((finding) => ({
        ...finding,
        sourceFiles: finding.kind === "security_header" ? ["next.config.ts"] : finding.kind === "noindex" ? ["app/services/page.tsx", "app/layout.tsx"] : ["app/services/page.tsx"]
      }));
      saveFindings(store, withSources);
      proof.findings = withSources;
      addEvent(store, runId, "inspector", "activity", withSources.length ? `Inspection complete: ${withSources.length} confirmed issue${withSources.length === 1 ? "" : "s"} need review. No code has been changed.` : "Inspection complete: no selected defects found. No code has been changed.", { activity: "inspection", status: withSources.length ? "warning" : "success", count: withSources.length, repositoryEvidenceId: mapped.evidenceId });
      if (contract.readOnly) {
        proof.status = "validated";
        saveProof(store, runId, proof);
        setStatus(store, runId, "validated");
        addEvent(store, runId, "mend", "activity", "Read-only investigation complete. No repair branch or repository mutation created.", { activity: "completion", status: "success" });
        return getRunView(store, runId);
      }
      if (seoReviewCount) addEvent(store, runId, "mend", "activity", `${seoReviewCount} SEO opportunities are separated from code-repair candidates; they require content or configuration review.`, { activity: "seo", status: "info", count: seoReviewCount });
      if (!withSources.length) {
        proof.status = "validated";
        saveProof(store, runId, proof);
        setStatus(store, runId, "validated");
        addEvent(store, runId, "mend", "activity", "No selected defects found. No repository changes made.", { activity: "completion", status: "success" });
        return getRunView(store, runId);
      }
      if (contract.readOnly) {
        proof.status = "validated";
        saveProof(store, runId, proof);
        setStatus(store, runId, "validated");
        addEvent(store, runId, "mend", "activity", "Read-only investigation complete. No repair branch or repository mutation created.", { activity: "completion", status: "success" });
        return getRunView(store, runId);
      }
      if (!repairCandidates.length) {
        proof.status = "validated";
        saveProof(store, runId, proof);
        setStatus(store, runId, "validated");
        addEvent(store, runId, "mend", "activity", "SEO and AI-search analysis complete. These are review opportunities, not automatic rewrites or ranking guarantees.", { activity: "completion", status: "success" });
        return getRunView(store, runId);
      }
      saveFindings(store, withSources.filter((finding) => finding.kind.startsWith("seo_")).map((finding) => ({ ...finding, state: "out_of_scope" as const })));
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
        addEvent(store, runId, "repair", "activity", `Repair attempt ${attempt + 1}: ${plannerName()} is preparing the smallest patch allowed by your approval.`, { activity: "repair", status: "active", attempt: attempt + 1, planner: plannerName() });
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
        addEvent(store, runId, "verifier", "activity", "The patch is staged. Verifier is building the isolated worktree and checking the actual rendered result.", { activity: "verification", status: "active", attempt: attempt + 1 });
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
        addEvent(store, runId, "verifier", "activity", `Verification failed: ${lastFailure}. I’m reviewing the worktree and will only retry inside your approved scope.`, { activity: "verification", status: "warning", detail: lastFailure, attempt: attempt + 1 });
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
      addEvent(store, runId, "mend", "activity", validated ? "Repair validated locally. All selected checks pass. No merge or deployment performed." : "Repair stopped without passing verification. No validated result or deployment claimed.", { activity: "completion", status: validated ? "success" : "warning" });
      return getRunView(store, runId);
    }
    return initial;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown run failure";
    const provider = error instanceof ProviderError;
    const status = provider ? "paused_provider_error" : "blocked";
    setStatus(store, runId, status, message);
    saveProof(store, runId, { ...proof, findings: getFindings(store, runId), status });
    addEvent(store, runId, "mend", "activity", provider ? `Model provider paused: ${message}. Completed evidence is preserved; resume when ready.` : `Run stopped: ${message}`, { activity: provider ? "provider" : "completion", status: "warning", retryable: provider ? error.retryable : false });
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
    const pending = store.sqlite.prepare("SELECT id FROM runs WHERE status IN ('queued', 'repairing', 'verifying', 'paused_provider_error')").all() as Array<{ id: string }>;
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
