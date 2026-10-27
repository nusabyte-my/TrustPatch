# How to Use TrustPatch

Open **http://localhost:7258** after running `pnpm dev`.

## 1. Choose a workflow

| Workflow | What it does |
|---|---|
| **Investigate only** | Reads the authorized site, shows findings, and makes no code changes |
| **Repair selected findings** | Proposes a patch and asks for approval before creating an isolated branch |
| **Stop before pull request** | Repairs and verifies locally without publishing a PR |
| **Bulk authorized-site audit** | Passively checks multiple owned sites, with no repair or exploit attempts |

Select **How to use TrustPatch** in the application for this guide.

## 2. Inspect a site

1. Enter an objective in plain English.
2. Include constraints such as excluded paths or “do not patch.”
3. Select **Inspect and plan repair**.
4. Watch **Mend activity** for the current agent, URL checks, vulnerability alerts, SEO analysis, and completion state.

Example:

> Inspect the staging site. Fix confirmed indexing and security-header defects, but do not touch /blog. Stop before opening a PR.

The run displays the exact target URL. Use **Raw**, **Rendered**, or **Headers** evidence to verify the finding yourself.

## 3. Approve a repair

1. Read the finding count and allowed files.
2. Check whether draft-PR creation is permitted.
3. Select **Approve scoped repair**.
4. The worker creates an isolated Git worktree; original source files remain unchanged.

Self-repair is allowed only within the approved finding set and file scope. Any new file or capability requires renewed approval.

## 4. Understand the result

- **Verification failed:** the patched application did not satisfy a required behavioral check. Mend may retry within the approved scope.
- **Validated locally:** every selected check passed in an independent patched-worktree build.
- **Blocked:** the repair could not be validated. It is not presented as fixed.

The Proof Receipt shows changed files, checks, branch, and deployment state. Validation does not mean merged, deployed, higher rankings, or guaranteed AI citations.

## 5. Run a bulk audit

1. Expand **Bulk authorized-site audit**.
2. Enter a registrable domain such as `example.com`, not just a suffix such as `com`.
3. Add one authorized URL per line. Subdomains must belong to the same approved scope.
4. Confirm you own the targets or have explicit audit permission.
5. Select **Start passive bulk audit**.
6. Read per-site status and finding counts. Open **Run evidence** for stored analysis.

Bulk checks cover indexing, canonical targets, response policy, metadata, social previews, semantic structure, JSON-LD, content depth, internal links, answer extractability, robots, and sitemap discovery.

Bulk mode does not exploit targets, prove absence of vulnerabilities, or change code. Real public use additionally requires an ownership manifest or DNS verification instead of relying only on the confirmation checkbox.

## 6. What Mend checks

- **Security/response:** missing `X-Content-Type-Options`, indexing and canonical defects, and captured response evidence.
- **Technical SEO:** titles, descriptions, H1/main structure, image alt coverage, internal links, and content depth.
- **AI-search readiness:** JSON-LD validity, answer structure, social previews, crawler policy, and sitemap discovery.
- **Repair proof:** actual behavior in a patched build, not a generic audit score.

No unsupported “ASX” label or guaranteed SEO/AI-citation claim is used.

## 7. Deployment and boundaries

See `DEPLOYMENT.md` for production setup, process management, backups, and single-VM requirements. The workbench runs on port **7258**; the authorized fixture runs on port **3100**. Patched previews use separate ports and should never be publicly exposed.

Real Meta Model API and GitHub publication require credentials and have not been exercised in this environment. Local results are explicitly labeled `fixture-planner`.
