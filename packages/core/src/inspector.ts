import { randomUUID } from "node:crypto";
import { load } from "cheerio";
import { chromium } from "playwright";
import type { Finding, RunContract } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";
import { storeEvidence } from "./evidence";

export async function inspectSite(store: TrustpatchDb, runId: string, contract: RunContract): Promise<Finding[]> {
  const findings: Finding[] = [];
  const enabled = (kind: Finding["kind"]) => contract.scope.includeChecks.includes(kind) && !contract.scope.excludeChecks.includes(kind);
  const paths = contract.scope.includePaths.filter((path) => !contract.scope.excludePaths.some((excluded) => path === excluded || path.startsWith(`${excluded}/`))).slice(0, contract.maxPages);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const path of paths) {
      const url = new URL(path, contract.targetUrl).toString();
      const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      if (!response) throw new Error(`No response from ${url}`);
      const status = response.status();
      const headers = response.headers();
      const raw = await (await page.request.get(url)).text();
      const rendered = await page.content();
      const screenshot = storeEvidence(store, runId, `screenshot-${path.replaceAll("/", "_") || "home"}`, await page.screenshot({ fullPage: true }));
      const rawEvidence = storeEvidence(store, runId, `raw-${path.replaceAll("/", "_") || "home"}`, raw);
      const renderedEvidence = storeEvidence(store, runId, `rendered-${path.replaceAll("/", "_") || "home"}`, rendered);
      const headerEvidence = storeEvidence(store, runId, `headers-${path.replaceAll("/", "_") || "home"}`, { url, status, headers });

      const $ = load(rendered);
      const robots = $("meta[name='robots']").attr("content")?.toLowerCase() ?? "";
      const canonical = $("link[rel='canonical']").attr("href") ?? null;
      const common = { runId, state: "observed" as const, url, sourceFiles: [], evidenceIds: [rawEvidence.id, renderedEvidence.id, headerEvidence.id, screenshot.id] };
      if (enabled("noindex") && /noindex/.test(robots)) findings.push({
        ...common, id: `find_${randomUUID()}`, kind: "noindex", title: "Indexing blocked",
        summary: "The rendered page publishes a noindex directive.", observed: { robots, status }
      });
      if (enabled("canonical") && canonical) {
        const expected = new URL(path, contract.productionOrigin).toString();
        if (new URL(canonical, url).toString() !== expected) findings.push({
          ...common, id: `find_${randomUUID()}`, kind: "canonical", title: "Canonical host mismatch",
          summary: "The canonical URL does not match the approved production URL.", observed: { canonical, expected }
        });
      }
      if (enabled("security_header") && !headers["x-content-type-options"]) findings.push({
        ...common, id: `find_${randomUUID()}`, kind: "security_header", title: "MIME-sniffing protection missing",
        summary: "The response lacks the project-approved X-Content-Type-Options header.", observed: { expected: "nosniff", status }
      });
    }
  } finally { await browser.close(); }
  return findings;
}
