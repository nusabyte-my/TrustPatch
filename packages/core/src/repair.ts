import { execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { promisify } from "node:util";
import { load } from "cheerio";
import { chromium, type Browser } from "playwright";
import { checkRevisionScope, type Approval, type Finding, type RunContract } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";
import { trustpatchPaths } from "./config";
import { storeEvidence } from "./evidence";
import type { RepairPlan } from "./model";

const execFileAsync = promisify(execFile);
export interface RepairResult {
  branch: string;
  worktree: string;
  changedFiles: string[];
  diffEvidenceId: string;
}
export interface VerificationResult {
  name: string;
  passed: boolean;
  detail: string;
  evidenceId: string | null;
}

function safeWorktree(repositoryPath: string, runId: string) {
  const root = resolve(repositoryPath, "..", ".trustpatch-worktrees");
  const path = resolve(root, runId);
  if (!path.startsWith(`${root}${sep}`)) throw new Error("Invalid worktree path");
  return path;
}
export async function createRepairBranch(repositoryPath: string, runId: string, baseBranch: string) {
  const worktree = safeWorktree(repositoryPath, runId);
  const branch = `trustpatch/${runId.replace(/^run_/, "").slice(0, 12)}`;
  const gitDir = trustpatchPaths().fixtureGitDir;
  await execFileAsync("git", [`--git-dir=${gitDir}`, `--work-tree=${repositoryPath}`, "worktree", "add", "--detach", worktree, baseBranch]);
  await execFileAsync("git", ["-C", worktree, "switch", "-c", branch]);
  return { branch, worktree };
}
export async function applyRepairPlan(store: TrustpatchDb, runId: string, contract: RunContract, approval: Approval, plan: RepairPlan, attempt: number): Promise<RepairResult> {
  const { branch, worktree } = attempt === 0
    ? await createRepairBranch(contract.repositoryPath, runId, contract.baseBranch)
    : { branch: `trustpatch/${runId.replace(/^run_/, "").slice(0, 12)}`, worktree: safeWorktree(contract.repositoryPath, runId) };
  const changedFiles = [...new Set(plan.edits.map((edit) => edit.file))];
  const scope = checkRevisionScope({ findingIds: approval.findingIds, changedFiles, approval });
  if (!scope.allowed) throw new Error(scope.reason);
  for (const edit of plan.edits) {
    const path = resolve(worktree, edit.file);
    if (!path.startsWith(`${worktree}${sep}`)) throw new Error("Repair path escapes worktree");
    const content = readFileSync(path, "utf8");
    const oldString = content.includes("\r\n") ? edit.oldString.replaceAll("\n", "\r\n") : edit.oldString;
    const newString = content.includes("\r\n") ? edit.newString.replaceAll("\n", "\r\n") : edit.newString;
    const count = content.split(oldString).length - 1;
    if (count !== 1) throw new Error(`${edit.file}: expected one exact repair anchor, found ${count}`);
    writeFileSync(path, content.replace(oldString, newString));
  }
  await execFileAsync("git", ["-C", worktree, "add", "--", ...changedFiles]);
  const diff = (await execFileAsync("git", ["-C", worktree, "diff", "--cached", "--"])).stdout;
  const evidence = storeEvidence(store, runId, `repair-diff-attempt-${attempt + 1}`, diff);
  return { branch, worktree, changedFiles, diffEvidenceId: evidence.id };
}

export async function verifyRepair(store: TrustpatchDb, runId: string, contract: RunContract, findings: Finding[], targetUrl: string): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const paths = new Set(findings.map((finding) => new URL(finding.url).pathname));
    for (const path of paths) {
      const kinds = new Set(findings.filter((finding) => new URL(finding.url).pathname === path).map((finding) => finding.kind));
      const url = new URL(path, targetUrl).toString();
      const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      if (!response) throw new Error(`Verification could not load ${url}`);
      const html = await page.content();
      const $ = load(html);
      const headers = response.headers();
      const observed = {
        robots: $("meta[name='robots']").attr("content")?.toLowerCase() ?? "",
        canonical: $("link[rel='canonical']").attr("href") ?? null,
        contentTypeOptions: headers["x-content-type-options"] ?? null
      };
      const evidence = storeEvidence(store, runId, `verification-${path.replaceAll("/", "_") || "home"}`, { url, status: response.status(), ...observed });
      const checks: Array<{ name: string; passed: boolean; detail: string }> = [];
      if (kinds.has("noindex")) checks.push({ name: "Indexing directive", passed: !observed.robots.includes("noindex"), detail: observed.robots || "No robots restriction" });
      if (kinds.has("canonical")) {
        const expected = new URL(path, contract.productionOrigin).toString();
        checks.push({ name: "Canonical target", passed: observed.canonical ? new URL(observed.canonical, url).toString() === expected : false, detail: `${observed.canonical ?? "missing"}; expected ${expected}` });
      }
      if (kinds.has("security_header")) checks.push({ name: "MIME-sniffing protection", passed: observed.contentTypeOptions === "nosniff", detail: observed.contentTypeOptions ?? "Header missing" });
      for (const check of checks) results.push({ ...check, evidenceId: evidence.id });
    }
    if (!results.length) results.push({ name: "Selected findings", passed: false, detail: "No verification checks produced", evidenceId: null });
  } finally { await browser?.close(); }
  return results;
}
