# TrustPatch Deployment Guide

This document describes how to deploy the local implementation. It does not deploy anything automatically.

## What runs where

| Surface | Purpose | Local URL |
|---|---|---|
| TrustPatch workbench | Chat, inspection, approvals, bulk audit, proof receipt | `http://localhost:7258` |
| Authorized broken fixture | Site being inspected and repaired | `http://127.0.0.1:3100` and `/services` |
| Patched preview | Temporary build used by Verifier | Separate allocated port per attempt |

The workbench displays the complete target URL during every run.

## 1. Local demonstration

Prerequisites: Node 22, pnpm 10, Git, and a Chromium-compatible environment supported by Playwright.

```bash
pnpm install
pnpm exec playwright install chromium
cp .env.example .env
pnpm db:migrate
pnpm dev
```

Open `http://localhost:7258`.

The fixture planner is explicitly labeled `fixture-planner`. To evaluate the real Meta integration, configure `AGENT_MODE=meta` and `MODEL_API_KEY` in root `.env`; the adapter uses the Meta Responses API. This has not been exercised in the current environment.

## 2. Production build verification

```bash
pnpm test
pnpm test:adversarial
pnpm test:e2e
pnpm typecheck
pnpm build
```

`test:e2e` requires the fixture server on port 3100 and runs two real Next.js builds. Do not run it against a production target.

## 3. Single-server deployment

Use a persistent Linux VM with Node 22 LTS, pnpm, Git, and Playwright Chromium system dependencies. A single VM is required for the current SQLite + local artifact + local Git-worktree architecture. Do not deploy this version as multiple stateless replicas. Install dependencies with `NODE_ENV=development` or without production-only pruning so the worker's `tsx` runtime is present; do not run `pnpm install --prod` for this package.

Recommended process model:

- One Next.js web process on `127.0.0.1:7258`.
- One Mend worker process.
- One explicitly authorized fixture or target repository process only when demonstrating the local fixture.
- Persistent `.data/` for SQLite and external fixture baseline metadata.
- Persistent `artifacts/` for complete evidence.
- Persistent isolated worktree parent directory.
- Nginx or Caddy terminates TLS and proxies to the web process.

### Server setup

```bash
# Run as a dedicated non-root service account.
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
cp .env.example .env
# Edit .env with server-side settings; never expose secrets via NEXT_PUBLIC_*.
pnpm db:migrate
pnpm build
```

### Production process commands

Add these package scripts before starting production processes:

```json
{
  "scripts": {
    "start:web": "pnpm --filter @trustpatch/web exec next start -p 7258",
    "start:worker": "pnpm --filter @trustpatch/worker exec tsx src/index.ts"
  }
}
```

Start them with the operating system's service manager, for example systemd:

```ini
[Unit]
Description=TrustPatch web
After=network.target

[Service]
Type=simple
User=trustpatch
Group=trustpatch
WorkingDirectory=/srv/trustpatch
Environment=NODE_ENV=production
EnvironmentFile=/srv/trustpatch/.env
ExecStart=/usr/bin/env pnpm start:web
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Use a second equivalent unit named `trustpatch-worker.service` with `ExecStart=/usr/bin/env pnpm start:worker`. Only the worker needs GitHub credentials and model mutation access. Avoid putting GitHub tokens into the web process environment where practical.

### Reverse proxy example

```nginx
server {
    listen 443 ssl;
    server_name trustpatch.example.com;

    location / {
        proxy_pass http://127.0.0.1:7258;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }
}
```

Provision TLS with the platform's normal certificate tooling. Do not expose the fixture or arbitrary patched-preview ports publicly.

## 4. Backup and recovery

Back up all of these together:

- `.data/trustpatch.db` plus any active `-wal` file
- `.data/fixture-baseline.git` when using the local fixture
- `artifacts/`
- Isolated worktree metadata if unfinished repairs must resume

Use a SQLite-aware online backup or stop writes briefly for a consistent snapshot. Test restore before the demonstration. No automatic deployment, merge, or rollback is performed by Mend.

## 5. Bulk audit authorization

Bulk mode is passive and audit-only. It requires:

- A registrable scope such as `example.com`; bare `com` is not accepted.
- Every URL to be the scope or one of its subdomains.
- Explicit ownership/authorization confirmation.
- No loopback/private-network targets; those belong to the local fixture workflow.

Bulk checks cover indexing, canonical metadata, security response policy, technical/on-page SEO, structured data, internal links, answer extractability, and crawler policy. They do not prove absence of vulnerabilities and do not attempt exploitation.

For customer-owned domains, replace the checkbox-only demo confirmation with a signed ownership manifest or DNS verification before accepting targets. This is required before public multi-tenant use.

## 6. Security and production limits

- Current local demo accepts only the explicitly authorized fixture for code repair.
- Remote arbitrary targets are not enabled for repair.
- There is no user authentication or tenant isolation in this implementation; put it behind trusted access controls before shared use.
- Secrets belong only in root server-side environment or a secrets manager.
- No public GitHub merge/deploy capability exists.
- No special AEO/GEO ranking or AI-citation guarantee is made. “ASX” is not used as a feature name because it is not an established SEO standard in the reviewed sources.
- Production multi-user operation needs authentication, tenant-scoped authorization, domain ownership verification, worker isolation, secret redaction, retention controls, and a production job queue before opening access beyond a trusted operator.
