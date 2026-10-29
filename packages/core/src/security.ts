import { randomUUID } from "node:crypto";
import { load } from "cheerio";
import type { Finding, RunContract } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";
import { storeEvidence } from "./evidence";
import { addEvent } from "./store";
import { fetchPublic } from "./target-safety";
import { scanDependencyVulnerabilities } from "./vulnerability";

const secretPatterns = [
  { name: "AWS access key", regex: /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { name: "GitHub token", regex: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { name: "OpenAI-style key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "Private key block", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "Credential assignment", regex: /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*["'][^"'\s]{8,}["']/gi }
];
const allowedExamples = /(?:example|sample|dummy|test|placeholder|your[_-]?(?:api[_-]?)?(?:key|token)|xxxx|changeme|localhost|127\.0\.0\.1)/i;
function redact(value: string) {
  return value.replace(/[A-Za-z0-9_\-\/+]{6,}/g, (part) => part.length <= 6 ? part : `${part.slice(0, 3)}…${part.slice(-2)}`);
}
function leakFindings(runId: string, url: string, text: string, evidenceIds: string[], sourceFiles: string[] = []): Finding[] {
  const findings: Finding[] = [];
  for (const pattern of secretPatterns) {
    const matches = [...text.matchAll(pattern.regex)].map((match) => match[0]).filter((value) => !allowedExamples.test(value));
    if (!matches.length) continue;
    const evidence = { type: pattern.name, count: matches.length, redactedPreview: redact(matches[0]!), validation: "Not tested or used" };
    findings.push({ id: `find_${randomUUID()}`, runId, kind: "api_leak", state: "observed", title: `${pattern.name} exposed in public content`, summary: `A ${pattern.name.toLowerCase()} pattern appears in publicly served content. The value was not used or validated.`, observed: evidence, url, sourceFiles, evidenceIds });
  }
  return findings;
}
function configFindings(runId: string, url: string, headers: Record<string, string>, evidenceIds: string[]): Finding[] {
  const findings: Finding[] = [];
  const recommendations: Record<string, string> = { "strict-transport-security": "Add a deliberate HSTS policy after confirming HTTPS coverage.", "content-security-policy": "Define a restrictive Content Security Policy appropriate to the application.", "x-frame-options": "Prevent unintended framing with an explicit frame policy.", "referrer-policy": "Set an explicit referrer policy appropriate to the product.", "permissions-policy": "Restrict powerful browser capabilities to intended features." };
  for (const [header, action] of Object.entries(recommendations)) {
    if (headers[header]) continue;
    findings.push({ id: `find_${randomUUID()}`, runId, kind: "security_misconfiguration", state: "observed", title: `Security header missing: ${header}`, summary: `The response does not define ${header}.`, observed: { missingHeader: header, recommendation: action }, url, sourceFiles: ["next.config.ts"], evidenceIds });
  }
  const cors = headers["access-control-allow-origin"];
  if (cors === "*" && headers["access-control-allow-credentials"] === "true") findings.push({ id: `find_${randomUUID()}`, runId, kind: "security_misconfiguration", state: "observed", title: "Credentialed wildcard CORS policy", summary: "The response allows any origin with credentials enabled.", observed: { cors, credentials: true }, url, sourceFiles: ["next.config.ts"], evidenceIds });
  return findings;
}

export async function inspectWebsiteSecurity(store: TrustpatchDb, runId: string, _contract: RunContract, input: { url: string; raw: string; rendered: string; headers: Record<string, string>; evidenceIds: string[] }) {
  addEvent(store, runId, "recon", "activity", `Security reconnaissance on ${input.url}: checking public artifacts, headers, and client-side secret indicators without using credentials.`, { activity: "security", status: "active" });
  const findings = [
    ...configFindings(runId, input.url, input.headers, input.evidenceIds),
    ...leakFindings(runId, input.url, `${input.raw}\n${input.rendered}`, input.evidenceIds)
  ];
  const $ = load(input.rendered);
  const publicArtifacts = $("script[src], link[href], form[action]").toArray().map((node) => $(node).attr("src") ?? $(node).attr("href") ?? $(node).attr("action") ?? "").filter(Boolean) as string[];
  const externalArtifacts = publicArtifacts.filter((value) => /^https?:\/\//.test(value));
  const insecure = externalArtifacts.filter((value) => value.startsWith("http://"));
  for (const artifact of insecure) findings.push({ id: `find_${randomUUID()}`, runId, kind: "exposed_artifact", state: "observed", title: "Insecure public artifact reference", summary: "A public page references an HTTP artifact that can be modified in transit.", observed: { artifact, recommendation: "Use HTTPS for all active artifacts." }, url: input.url, sourceFiles: [], evidenceIds: input.evidenceIds });
  const forms = $("form[action]").toArray().map((node) => $(node).attr("action") ?? "");
  for (const action of forms.filter((value) => value.startsWith("http://"))) findings.push({ id: `find_${randomUUID()}`, runId, kind: "exposed_artifact", state: "observed", title: "Insecure form destination", summary: "A form submits to an unencrypted HTTP endpoint.", observed: { action }, url: input.url, sourceFiles: [], evidenceIds: input.evidenceIds });
  const osintEvidence = storeEvidence(store, runId, "security-osint", { url: input.url, headers: input.headers, publicArtifactCount: externalArtifacts.length, limitations: "Passive public-content inspection only. No credential validation, exploit attempts, hidden endpoint discovery, or proof of a live secret." });
  for (const finding of findings) {
    finding.evidenceIds = [...finding.evidenceIds, osintEvidence.id];
    addEvent(store, runId, "recon", "activity", `Security finding: ${finding.title}. Evidence is redacted and not validated.`, { activity: "security", status: "warning", findingId: finding.id, kind: finding.kind });
  }
  addEvent(store, runId, "recon", "activity", `Security reconnaissance complete: ${findings.length} public evidence-backed findings. No secrets used or validated.`, { activity: "security", status: findings.length ? "warning" : "success", count: findings.length, evidenceId: osintEvidence.id });
  return findings;
}

interface GithubRepo { full_name: string; default_branch: string; private: boolean; html_url: string }
interface GithubFile { path: string; type: string; size: number }
async function githubJson<T>(url: string, explicitToken?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "TrustPatch-Authorized-Inspection/0.1" };
  const token = explicitToken || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (response.status === 404 && !token) {
    throw new Error("GitHub repository returned 404. If this is a PRIVATE repository, provide a valid GitHub Personal Access Token.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(`GitHub API authentication failed (${response.status}). Provide or refresh your GitHub token.`);
  }
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json() as Promise<T>;
}
export function selectGithubFiles(files: GithubFile[]) {
  const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml", ".env", ".example", ".md", ".config", ".txt", ".py", ".rb", ".go", ".java", ".cs", ".php", ".sh", ".toml", ".lock"]);
  return files.filter((file) => {
    const name = file.path.split("/").at(-1) ?? "";
    return file.type === "blob" && file.size <= 500_000 && (allowedExtensions.has(name.includes(".") ? name.slice(name.lastIndexOf(".")) : name) || /(?:^|\/)(?:\.env|Dockerfile|next\.config\.[jt]s|package\.json)$/.test(file.path));
  }).slice(0, 80);
}
export async function inspectGithubSecurity(store: TrustpatchDb, runId: string, contract: RunContract) {
  const match = contract.targetUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  if (!match) throw new Error("GitHub targets must use https://github.com/owner/repository");
  const owner = match[1]!, repoName = match[2]!;
  const token = contract.githubToken || process.env.GITHUB_TOKEN;
  addEvent(store, runId, "recon", "activity", `GitHub security inspection starting for ${owner}/${repoName}. ${token ? "Authenticated with token (private repository access enabled)." : "Unauthenticated (public repository access only)."}. Secrets are strictly redacted.`, { activity: "security", status: "active", authenticated: Boolean(token) });
  const repo = await githubJson<GithubRepo>(`https://api.github.com/repos/${owner}/${repoName}`, token);
  const branch = repo.default_branch;
  addEvent(store, runId, "recon", "activity", `Repository verified: ${repo.full_name} (${repo.private ? "PRIVATE" : "PUBLIC"}). Reading Git tree on branch '${branch}'...`, { activity: "security", status: "info", isPrivate: repo.private });
  const tree = await githubJson<{ tree: GithubFile[]; truncated: boolean }>(`https://api.github.com/repos/${owner}/${repoName}/git/trees/${encodeURIComponent(branch)}?recursive=1`, token);
  const files = selectGithubFiles(tree.tree);
  const findings: Finding[] = [];
  const manifestContents: Array<{ path: string; content: string }> = [];
  const scanned: Array<{ path: string; sha256Evidence: boolean }> = [];
  for (const file of files) {
    let content = "";
    const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/${encodeURIComponent(branch)}/${file.path.split("/").map(encodeURIComponent).join("/")}`;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(rawUrl, { headers }).catch(() => null);
    if (response && response.ok) {
      content = await response.text();
    } else {
      // Try API fallback for private repositories
      const apiBlob = await githubJson<{ content?: string; encoding?: string }>(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}?ref=${branch}`, token).catch(() => null);
      if (apiBlob?.content && apiBlob.encoding === "base64") {
        content = Buffer.from(apiBlob.content, "base64").toString("utf8");
      }
    }
    if (!content) continue;
    const evidence = storeEvidence(store, runId, "repo-content", { repository: repo.full_name, path: file.path, content });
    manifestContents.push({ path: file.path, content });
    scanned.push({ path: file.path, sha256Evidence: true });
    const leaks = leakFindings(runId, `${repo.html_url}/blob/${branch}/${file.path}`, content, [evidence.id], [file.path]);
    findings.push(...leaks);
    if (/(?:^|\/)\.env(?:\.[^/]+)?$/.test(file.path) && !/example|sample|template/.test(file.path)) findings.push({ id: `find_${randomUUID()}`, runId, kind: "repo_config", state: "observed", title: "Environment file tracked in repository", summary: "A non-example environment file is tracked publicly; confirm it contains no live credentials.", observed: { path: file.path, liveSecretValidated: false }, url: `${repo.html_url}/blob/${branch}/${file.path}`, sourceFiles: [file.path], evidenceIds: [evidence.id] });
    if (/next\.config\.[jt]s$/.test(file.path) && /ignoreBuildErrors\s*:\s*true|ignoreDuringBuilds\s*:\s*true/.test(content)) findings.push({ id: `find_${randomUUID()}`, runId, kind: "repo_config", state: "observed", title: "Build-time error checks bypassed", summary: "Repository configuration suppresses build or ESLint errors, allowing defects to pass silently.", observed: { path: file.path, pattern: "ignoreBuildErrors/ignoreDuringBuilds" }, url: `${repo.html_url}/blob/${branch}/${file.path}`, sourceFiles: [file.path], evidenceIds: [evidence.id] });
    if (/package\.json$/.test(file.path) && /"(?:preinstall|postinstall|prepare)"\s*:/.test(content)) findings.push({ id: `find_${randomUUID()}`, runId, kind: "repo_config", state: "observed", title: "Lifecycle scripts require supply-chain review", summary: "Package lifecycle scripts execute during installation; review their exact behavior before trusting the dependency workflow.", observed: { path: file.path, lifecycleScript: true }, url: `${repo.html_url}/blob/${branch}/${file.path}`, sourceFiles: [file.path], evidenceIds: [evidence.id] });
  }
  const vulnerabilityFindings = await scanDependencyVulnerabilities(store, runId, manifestContents);
  findings.push(...vulnerabilityFindings);
  const evidence = storeEvidence(store, runId, "github-security-inventory", { repository: repo.full_name, defaultBranch: branch, private: repo.private, filesInspected: scanned.length, truncated: tree.truncated, limitations: "Public/default branch inspection of up to 80 eligible text files, 500 KB each. No git history, secret validation, private repository claim, or proof of exploitability." });
  for (const finding of findings) { finding.evidenceIds = [...finding.evidenceIds, evidence.id]; addEvent(store, runId, "recon", "activity", `Repository security finding: ${finding.title}. Evidence is preserved; no secret values were used or validated.`, { activity: "security", status: "warning", findingId: finding.id, kind: finding.kind }); }
  addEvent(store, runId, "recon", "activity", `GitHub inspection complete: ${scanned.length} files reviewed, ${findings.length} findings. No secret values used or validated.`, { activity: "security", status: findings.length ? "warning" : "success", count: findings.length, evidenceId: evidence.id });
  return findings;
}
