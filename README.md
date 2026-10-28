# TrustPatch

**Mend turns verified website findings into tested, human-approved repairs.**

Local hackathon implementation for the Meta Global AI Developer Hackathon, Startup track / Build for Your World. See `TRUSTPATCH_HACKATHON_PLAN.md` for the product, architecture, and submission plan.

## Implemented surface

- Evidence-led landing: real latest completed local run, first-failure recovery, verification checks, and a direct link to the actual Proof Receipt. Fixture planner and target are labeled; no customer or production-performance claims.
- Unified visual system: chalk paper, ink evidence surfaces, cobalt actions, and mint verification across landing, mission, agent console, workflow, and drawers. Interactive React impact player uses actual run findings and checks with pause/restart/stage controls and reduced-motion support.
- Guided client mission: goal templates, target/authorization, structured read-only or local-repair authority, page/check selection, live mission summary, and evidence-driven recommendations.
- Interactive Agent Command Center: seven selectable roles with introductions, client/technical language, live workflow shimmer and real execution trace, compact approval/Proof panel, and on-demand evidence/diff/activity drawer. Mapper emits real repository and worktree mapping events.
- Reactive Recon: bounded Playwright console/page-error/failed-request/resource diagnostics on every target. Optional REA passive page + static bundle evidence via `REA_MCP_URL` and `REA_CDP_URL`; no REA claim when not configured.
- External-target safety: HTTP(S)-only, credential rejection, DNS/IP/private/metadata/link-local blocking, redirect and subresource checks, and best-effort Recon failure isolation. Authorized local fixture remains supported. Guard DNS checks are application-layer controls; Chromium performs its own resolution, so DNS-rebinding races are not fully eliminated. Do not treat this as a network egress sandbox.
- Autonomous Target Console: enter target + objective + constraints, then **Run agent** starts the complete typed-tool workflow without a second execute button. Tool plan is collapsed by default.
- Chat-driven run creation and read-only investigation mode.
- Mend coordinator with Inspector, Mapper, SEO, Recon, Repair, and Verifier roles. External URLs are supported for read-only inspection; repair remains restricted to the authorized local repository.
- Raw HTML, rendered DOM, headers, screenshots, source context, diffs, and verification artifacts persisted with SHA-256 metadata.
- Scoped approval digest with file allowlist and in-scope revision checks.
- Isolated Git worktree repair for the authorized Next.js fixture.
- Independent patched-worktree build and preview verification.
- Read-only, `noindex`, canonical, and `X-Content-Type-Options` workflows.
- Live Mend activity stream: queued inspection, per-URL checks, vulnerability alerts, approval requests, patch attempts, failed verification, and completion states.
- SEO/AEO/GEO analysis: metadata, social previews, semantic structure, JSON-LD, content depth, internal links, answer extractability, robots, and sitemap discovery.
- Scoped bulk authorized-site auditing with passive checks, per-site progress, and failure isolation. Verified by creating and completing an authorized `prodigylearning.my` audit with 3 findings; evidence navigation opens the stored run.
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

## Next quick wins

1. Exercise the real Meta Responses API repair with `AGENT_MODE=meta` and `MODEL_API_KEY`; keep fixture results labeled separately.
2. Publish the repository publicly and record the single-click target-to-proof demo.
3. Add per-page screenshot thumbnails beside findings without duplicating the activity stream.
4. Add a downloadable Proof Receipt JSON export from the existing run/evidence API.
5. Package the full single-click browser workflow as a repeatable test with configurable timeouts.

## Verification

Exercised successfully on October 27–28, 2026, including a complete compact multiagent run: role selection, real Mapper events, approval, recovery, validation, follow-up, evidence drawer, and 375px mobile layout. Also exercised an authorized read-only `https://nusabyte.my` run: reactive Recon captured 23 scripts with no runtime errors or failed requests during its bounded navigation window; REA enrichment was unconfigured and reported as such:

```bash
pnpm typecheck
pnpm test
pnpm test:adversarial
pnpm test:e2e
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
