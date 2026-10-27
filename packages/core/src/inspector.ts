import { randomUUID } from "node:crypto";
import { load } from "cheerio";
import { chromium } from "playwright";
import type { Finding, RunContract } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";
import { storeEvidence } from "./evidence";
import { addEvent } from "./store";
import { analyzeSeoPage, inspectSearchPolicy } from "./seo";

export async function inspectSite(store: TrustpatchDb, runId: string, contract: RunContract): Promise<Finding[]> {
  const findings: Finding[] = [];
  const enabled = (kind: Finding["kind"]) => contract.scope.includeChecks.includes(kind) && !contract.scope.excludeChecks.includes(kind);
  const paths = contract.scope.includePaths.filter((path) => !contract.scope.excludePaths.some((excluded) => path === excluded || path.startsWith(`${excluded}/`))).slice(0, contract.maxPages);
  const browser = await chromium.launch({ headless: true });
  const policy = await inspectSearchPolicy(store, runId, contract);
  try {
    const page = await browser.newPage();
    for (const path of paths) {
      const url = new URL(path, contract.targetUrl).toString();
      addEvent(store, runId, "inspector", "activity", `Inspecting ${path}: checking response, indexing directives, canonical target, and security headers.`, { activity: "inspection", status: "active", url });
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
      addEvent(store, runId, "inspector", "activity", `${path} returned HTTP ${status}. Captured raw HTML, rendered DOM, headers, and screenshot.`, { activity: "inspection", status: "info", url, httpStatus: status });
      const robots = $("meta[name='robots']").attr("content")?.toLowerCase() ?? "";
      const canonical = $("link[rel='canonical']").attr("href") ?? null;
      const common = { runId, state: "observed" as const, url, sourceFiles: [], evidenceIds: [rawEvidence.id, renderedEvidence.id, headerEvidence.id, screenshot.id] };
      const seoFindings = analyzeSeoPage(store, $, { ...common, path, title: $("title").text(), description: "", status, headers }, contract);
      findings.push(...seoFindings);
      addEvent(store, runId, "seo", "activity", `SEO analysis complete on ${path}: ${seoFindings.length} evidence-backed opportunities.`, { activity: "seo", status: seoFindings.length ? "warning" : "success", count: seoFindings.length, url });
      if (enabled("noindex") && /noindex/.test(robots)) {
        const finding: Finding = {
          ...common, id: `find_${randomUUID()}`, kind: "noindex", title: "Indexing blocked",
          summary: "The rendered page publishes a noindex directive.", observed: { robots, status }
        };
        findings.push(finding);
        addEvent(store, runId, "inspector", "activity", `Vulnerability observed on ${path}: indexing is blocked by “${robots}”.`, { activity: "vulnerability", status: "warning", findingId: finding.id, kind: finding.kind, url });
      } else {
        addEvent(store, runId, "inspector", "activity", `${path}: no indexing block observed.`, { activity: "inspection", status: "success", check: "noindex", url });
      }
      if (enabled("canonical") && canonical) {
        const expected = new URL(path, contract.productionOrigin).toString();
        if (new URL(canonical, url).toString() !== expected) {
          const finding: Finding = {
            ...common, id: `find_${randomUUID()}`, kind: "canonical", title: "Canonical host mismatch",
            summary: "The canonical URL does not match the approved production URL.", observed: { canonical, expected }
          };
          findings.push(finding);
          addEvent(store, runId, "inspector", "activity", `Vulnerability observed on ${path}: canonical points to ${canonical}, expected ${expected}.`, { activity: "vulnerability", status: "warning", findingId: finding.id, kind: finding.kind, url });
        } else {
          addEvent(store, runId, "inspector", "activity", `${path}: canonical target matches the approved production URL.`, { activity: "inspection", status: "success", check: "canonical", url });
        }
      }
      if (enabled("security_header")) {
        if (!headers["x-content-type-options"]) {
          const finding: Finding = {
            ...common, id: `find_${randomUUID()}`, kind: "security_header", title: "MIME-sniffing protection missing",
            summary: "The response lacks the project-approved X-Content-Type-Options header.", observed: { expected: "nosniff", status }
          };
          findings.push(finding);
          addEvent(store, runId, "inspector", "activity", `Vulnerability observed on ${path}: X-Content-Type-Options is missing; expected nosniff.`, { activity: "vulnerability", status: "warning", findingId: finding.id, kind: finding.kind, url });
        } else {
          addEvent(store, runId, "inspector", "activity", `${path}: X-Content-Type-Options is present.`, { activity: "inspection", status: "success", check: "security_header", url });
        }
      }
    }
  } finally { await browser.close(); }
  return findings;
}
