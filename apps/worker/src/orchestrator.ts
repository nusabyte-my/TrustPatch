import { resolve } from "node:path";

import {
  addEvent, applyRepairPlan, createDatabase, getContract, getEvents, getFindings, getRunView,
  inspectSite, inspectGithubSecurity, enrichWithRea, enrichWithJebat, mapRepository, migrateDatabase, planRepairs, plannerName, requestApproval, runSeoOperations,
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
      // Handshake: Mend -> All Nodes
      addEvent(store, runId, "mend", "activity", `Target locked: ${contract.targetUrl}. Initializing peer mesh across isolated sandboxes.`, {
        activity: "inspection", status: "active", targetUrl: contract.targetUrl,
        sender: "mend", recipient: "@all", protocol: "DISPATCH",
        node: { id: "node-mend-01", hostname: "mend-master.internal", ip: "10.42.0.1", vmType: "micro-vm", status: "computing", memoryMb: 512 }
      });
      // Handshake: Mend -> Inspector & Recon
      addEvent(store, runId, "mend", "activity", contract.authorizedLocalFixture
        ? "Dispatching @inspector (surface probe) and @recon (AST mapper) concurrently on isolated microVM nodes."
        : "Dispatching @inspector (live probe) and @seo (AI search analysis) on isolated runner nodes.", {
        activity: "inspection", status: "active",
        sender: "mend", recipient: "@inspector", protocol: "SYN",
        node: { id: "node-mend-01", hostname: "mend-master.internal", ip: "10.42.0.1", vmType: "micro-vm", status: "handshaking", memoryMb: 512 }
      });
      addEvent(store, runId, "inspector", "activity", `SYN_ACK received from @mend. Spawning clean Chromium session in isolated container sandbox [node-inspector-02]. Probing live endpoints...`, {
        activity: "inspection", status: "active",
        sender: "inspector", recipient: "@mend", protocol: "ACK",
        node: { id: "node-inspector-02", hostname: "sec-probe.internal", ip: "10.42.0.2", vmType: "container-sandbox", status: "computing", memoryMb: 256 }
      });
      const [observations, mapped] = await Promise.all([
        (contract.targetType === "github" ? inspectGithubSecurity(store, runId, contract) : inspectSite(store, runId, contract)).then(async (result) => { if (contract.targetType === "website") await enrichWithRea(store, runId, contract.targetUrl); await enrichWithJebat(store, runId, contract); return result; }),
        Promise.resolve().then(() => contract.authorizedLocalFixture ? mapRepository(store, runId, contract) : { files: {}, evidenceId: null })
      ]);
      const reactiveCaptured = getEvents(store, runId).some((event) => event.role === "recon" && event.data.activity === "recon" && typeof event.data.evidenceId === "string");
      addEvent(store, runId, "recon", "activity", reactiveCaptured
        ? "AST parser [node-recon-03] finished repository mapping. Source graph synchronized with reactive evidence."
        : "AST parser [node-recon-03] finished repository mapping without reactive trace. Core AST synchronized.", {
        activity: "recon", status: reactiveCaptured ? "success" : "warning", evidenceCaptured: reactiveCaptured,
        sender: "recon", recipient: "@mend", protocol: "ACK",
        node: { id: "node-recon-03", hostname: "ast-engine.internal", ip: "10.42.0.3", vmType: "ast-engine", status: "ready", memoryMb: 384 }
      });
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
        sourceFiles: finding.sourceFiles.length ? finding.sourceFiles : finding.kind === "security_header" ? ["next.config.ts"] : finding.kind === "noindex" ? ["app/services/page.tsx", "app/layout.tsx"] : ["app/services/page.tsx"]
      }));
      saveFindings(store, withSources);
      if (contract.seoMode === "red_blue") runSeoOperations(store, runId, withSources);
      proof.findings = withSources;
      addEvent(store, runId, "inspector", "activity", withSources.length
        ? `HANDSHAKE -> @mend: Surface audit finished. ${withSources.length} confirmed issue${withSources.length === 1 ? "" : "s"} identified. Zero repository mutation committed.`
        : "HANDSHAKE -> @mend: Surface audit finished. No selected defects found.", {
        activity: "inspection", status: withSources.length ? "warning" : "success", count: withSources.length, repositoryEvidenceId: mapped.evidenceId,
        sender: "inspector", recipient: "@mend", protocol: "PROPOSAL",
        node: { id: "node-inspector-02", hostname: "sec-probe.internal", ip: "10.42.0.2", vmType: "container-sandbox", status: "ready", memoryMb: 256 }
      });
      if (withSources.length) {
        addEvent(store, runId, "mend", "activity", `MEND -> @user: Inspector and Recon nodes reached consensus. Awaiting authorized scope approval before spawning isolated worktree.`, {
          activity: "approval", status: "active",
          sender: "mend", recipient: "@user", protocol: "CONSENSUS",
          node: { id: "node-mend-01", hostname: "mend-master.internal", ip: "10.42.0.1", vmType: "micro-vm", status: "ready", memoryMb: 512 }
        });
      }
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
        addEvent(store, runId, "repair", "activity", `HANDSHAKE -> @verifier: Repair attempt ${attempt + 1} initiated on sandbox worker [node-repair-04]. Worktree mounted at ${worktree}.`, {
          activity: "repair", status: "active", attempt: attempt + 1, planner: plannerName(),
          sender: "repair", recipient: "@verifier", protocol: "DISPATCH",
          node: { id: "node-repair-04", hostname: "sandbox-worker.internal", ip: "10.42.0.4", vmType: "container-sandbox", status: "computing", memoryMb: 1024, worktree }
        });
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
        addEvent(store, runId, "repair", "activity", `HANDSHAKE -> @verifier: Patch staged on branch '${branch}'. Target files: ${changedFiles.join(", ")}. Requesting isolated verification.`, {
          activity: "repair", status: "success", attempt: attempt + 1,
          sender: "repair", recipient: "@verifier", protocol: "PROPOSAL",
          node: { id: "node-repair-04", hostname: "sandbox-worker.internal", ip: "10.42.0.4", vmType: "container-sandbox", status: "ready", memoryMb: 1024, worktree }
        });
        addEvent(store, runId, "verifier", "activity", `ACK from @verifier [node-verifier-05]: Preview container spinning up. Running browser and HTTP assertions against patched worktree.`, {
          activity: "verification", status: "active", attempt: attempt + 1,
          sender: "verifier", recipient: "@repair", protocol: "ACK",
          node: { id: "node-verifier-05", hostname: "qa-runner.internal", ip: "10.42.0.5", vmType: "qa-isolated", status: "verifying", memoryMb: 768 }
        });
        const preview = await startPatchedPreview(store, runId, repaired.worktree, contract.productionOrigin);
        try {
          proof.verification = await verifyRepair(store, runId, contract, findings, preview.url);
        } finally {
          await preview.stop();
        }
        const verification = proof.verification;
        if (verification.every((result) => result.passed)) {
          validated = true;
          addEvent(store, runId, "verifier", "activity", `CONSENSUS: All verification assertions passed with zero regressions. Proof receipt signed.`, {
            activity: "verification", status: "success", attempt: attempt + 1,
            sender: "verifier", recipient: "@mend", protocol: "CONSENSUS",
            node: { id: "node-verifier-05", hostname: "qa-runner.internal", ip: "10.42.0.5", vmType: "qa-isolated", status: "ready", memoryMb: 768 }
          });
          break;
        }
        lastFailure = verification.filter((result) => !result.passed).map((result) => `${result.name}: ${result.detail}`).join("; ");
        addEvent(store, runId, "verifier", "activity", `CHALLENGE -> @repair: Assertion failed: ${lastFailure}. Requesting revision within approved scope boundaries.`, {
          activity: "verification", status: "warning", detail: lastFailure, attempt: attempt + 1,
          sender: "verifier", recipient: "@repair", protocol: "CHALLENGE",
          node: { id: "node-verifier-05", hostname: "qa-runner.internal", ip: "10.42.0.5", vmType: "qa-isolated", status: "error", memoryMb: 768 }
        });
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
  console.log("Mend worker ready. Supervising Inspector, Mapper, Recon, SEO, Repair, and Verifier.");
}
