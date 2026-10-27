# TrustPatch

**Mend turns verified website findings into tested, human-approved repairs.**

Local hackathon implementation for the Meta Global AI Developer Hackathon, Startup track / Build for Your World. See `TRUSTPATCH_HACKATHON_PLAN.md` for the product, architecture, and submission plan.

## Implemented surface

- Chat-driven run creation and read-only investigation mode.
- Mend coordinator with Inspector, Mapper, Repair, and Verifier roles.
- Raw HTML, rendered DOM, headers, screenshots, source context, diffs, and verification artifacts persisted with SHA-256 metadata.
- Scoped approval digest with file allowlist and in-scope revision checks.
- Isolated Git worktree repair for the authorized Next.js fixture.
- Independent patched-worktree build and preview verification.
- Read-only, `noindex`, canonical, and `X-Content-Type-Options` workflows.
- Live Mend activity stream: queued inspection, per-URL checks, vulnerability alerts, approval requests, patch attempts, failed verification, and completion states.
- SEO/AEO/GEO analysis: metadata, social previews, semantic structure, JSON-LD, content depth, internal links, answer extractability, robots, and sitemap discovery.
- Scoped bulk authorized-site auditing with passive checks, per-site progress, and failure isolation.
- Findings, approval card, diff viewer, and Proof Receipt UI.
- Meta Responses API tool-call planner for `AGENT_MODE=meta`; labeled deterministic `fixture-planner` for offline development.
- GitHub draft-PR publication when credentials are configured; no merge or deployment path.

## Stack

Node 22 · TypeScript · pnpm workspaces · Next.js App Router · SQLite/Drizzle · Playwright · Zod · Git worktrees

## Setup

```bash
pnpm install
pnpm exec playwright install chromium
pnpm db:migrate
cp .env.example .env
pnpm dev
```

Open `http://localhost:7258`; the fixture runs at `http://localhost:3100`. Patched verification previews use separately allocated ports. See `USING_TRUSTPATCH.md` for the user workflow and `DEPLOYMENT.md` for production build, single-VM process, reverse-proxy, backup, and bulk-audit authorization instructions.

The default `AGENT_MODE=fixture` is deliberately deterministic and labeled in the UI. It is not represented as Meta-model output. The Meta Responses API integration is **implemented but not exercised end-to-end** because no API credential is available in this environment. To enable it for verification, set `AGENT_MODE=meta`, `MODEL_API_KEY`, and optionally `MODEL_ID` / `MODEL_API_URL` in the root `.env`.

## Verification

Exercised successfully on October 27, 2026:

```bash
pnpm typecheck
pnpm test
pnpm test:adversarial
pnpm build
```

The actual UI flow on `http://localhost:7258` produced a two-attempt repair: first verification failed on inherited `noindex`, second in-scope repair passed indexing, canonical, and `nosniff` checks. Browser checks at 1440px and 375px found no horizontal page overflow.

Actual local acceptance path:

1. Create an investigate-only run and inspect its evidence.
2. Create a repair run and review the exact scope.
3. Approve the repair. The worker builds the patched worktree on a separate local preview port.
4. Read the failed-first-attempt evidence, successful in-scope recovery, and Proof Receipt.

The default `FIXTURE_RECOVERY=true` deliberately removes only the page-level indexing override on attempt 1. Verification then exposes the inherited layout `noindex`; attempt 2 repairs the layout within the approved file scope. Set `FIXTURE_RECOVERY=false` for a single-attempt deterministic run.

## GitHub publication

Optional and never required for local validation. Set server-side `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` to publish a validated branch as a draft PR. Use a fine-grained token restricted to a disposable demo repository. The implementation never merges or deploys.

## Local-only boundary

This build accepts only the explicitly authorized local fixture by default. It does not provide general remote-domain ownership verification, arbitrary target scanning, active exploitation, or production deployment. Do not present it as a general-purpose security scanner.

## Current limitations

- Fixture planner handles the included fixture's known defect shapes; it is not a general repair engine.
- General custom-repository support requires project-specific mapping, ownership, and execution policies.
- GitHub publication is implemented but requires a user-provided disposable repository for end-to-end verification.
- Local development currently uses a single worker and synchronous investigation request; durable queue-backed investigation is a production hardening step.
- The real Meta Model API and GitHub draft-PR paths still require credentials for live verification.
- `test:e2e` runs the real two-attempt workflow against the local fixture on port 3100, using an isolated database and two real Next.js builds. It expects the fixture server to be running.
