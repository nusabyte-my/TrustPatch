import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import type { ProofReceipt, RunContract } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";
import { readEvidence, storeEvidence } from "./evidence";
import { saveProof, addEvent } from "./store";

const execFileAsync = promisify(execFile);
export async function publishDraftPr(store: TrustpatchDb, runId: string, contract: RunContract, proof: ProofReceipt): Promise<ProofReceipt> {
  if (proof.status !== "validated" || !proof.branch || !proof.diffEvidenceId) throw new Error("A validated local branch is required before PR publication");
  if (proof.prUrl) return proof;
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) {
    addEvent(store, runId, "mend", "pr.blocked", "Local validation is complete. Draft PR publication requires GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO; no remote changes made.");
    return proof;
  }
  const worktree = resolve(contract.repositoryPath, "..", ".trustpatch-worktrees", runId);
  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
  try {
    await execFileAsync("git", ["-C", worktree, "-c", "user.name=TrustPatch Mend", "-c", "user.email=mend@trustpatch.local", "commit", "-m", "Repair verified website findings"]);
    await execFileAsync("git", ["-c", `http.extraHeader=Authorization: Basic ${basic}`, "-C", worktree, "push", `https://github.com/${owner}/${repo}.git`, `HEAD:refs/heads/${proof.branch}`]);
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" };
    const repositoryResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repositoryResponse.ok) throw new Error(`GitHub repository lookup returned ${repositoryResponse.status}`);
    const repository = await repositoryResponse.json() as { default_branch: string };
    const base = repository.default_branch;
    const diff = readEvidence(store, proof.diffEvidenceId)?.content.toString("utf8") ?? "";
    const checks = proof.verification.map((check) => `- [${check.passed ? "x" : " "}] ${check.name}: ${check.detail}`).join("\n");
    const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, { method: "POST", headers, body: JSON.stringify({ title: `TrustPatch: verified website repair ${runId.slice(-8)}`, head: proof.branch, base, draft: true, body: `## TrustPatch Proof Receipt\n\n${proof.findings.length} findings validated locally by Mend's Verifier.\n\n### Checks\n${checks}\n\n### Changed files\n${proof.changedFiles.map((file) => `- \`${file}\``).join("\n")}\n\n### Complete diff evidence\n\`\`\`diff\n${diff}\n\`\`\`\n\nNo merge or deployment performed.` }) });
    if (!prResponse.ok) throw new Error(`GitHub draft PR creation returned ${prResponse.status}`);
    const pr = await prResponse.json() as { html_url: string; number: number };
    const next = { ...proof, prUrl: pr.html_url };
    saveProof(store, runId, next);
    storeEvidence(store, runId, "draft-pr", { url: pr.html_url, number: pr.number, base, head: proof.branch });
    addEvent(store, runId, "mend", "pr.created", `Draft PR opened: ${pr.html_url}`);
    return next;
  } catch (error) {
    addEvent(store, runId, "mend", "pr.failed", `Local validation remains complete; remote publication failed: ${error instanceof Error ? error.message : "unknown GitHub error"}`);
    return proof;
  }
}
