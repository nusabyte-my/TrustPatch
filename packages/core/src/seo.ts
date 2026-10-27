import { randomUUID } from "node:crypto";
import type { CheerioAPI } from "cheerio";
import type { Finding, RunContract } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";
import { storeEvidence } from "./evidence";
import { addEvent } from "./store";
import { fetchPublic } from "./target-safety";

export interface SeoPageInput {
  runId: string;
  url: string;
  path: string;
  title: string;
  description: string;
  status: number;
  headers: Record<string, string>;
  evidenceIds: string[];
}
export interface SeoPolicyResult {
  robotsText: string | null;
  sitemapStatus: number;
  blockedAgents: string[];
}

function issue(store: TrustpatchDb, input: SeoPageInput, kind: Finding["kind"], title: string, summary: string, observed: Record<string, unknown>): Finding {
  const finding: Finding = {
    id: `find_${randomUUID()}`, runId: input.runId, kind, state: "observed", title,
    url: input.url, summary, observed, sourceFiles: [], evidenceIds: input.evidenceIds
  };
  addEvent(store, input.runId, "seo", "activity", `SEO opportunity on ${input.path}: ${summary}`, {
    activity: "seo", status: "warning", findingId: finding.id, kind, url: input.url
  });
  return finding;
}

export function analyzeSeoPage(store: TrustpatchDb, $: CheerioAPI, input: SeoPageInput, contract: RunContract): Finding[] {
  const enabled = (kind: Finding["kind"]) => contract.scope.includeChecks.includes(kind) && !contract.scope.excludeChecks.includes(kind);
  const findings: Finding[] = [];
  const title = $("title").first().text().trim();
  const description = $("meta[name='description']").attr("content")?.trim() ?? "";
  const h1Count = $("h1").length;
  const mainCount = $("main").length;
  const jsonLd = $("script[type='application/ld+json']").toArray().map((node) => $(node).text());
  const ogMissing = ["og:title", "og:description", "og:url", "og:image"].filter((name) => !$(`meta[property='${name}']`).attr("content")?.trim());
  const missingAlt = $("img").toArray().filter((node) => $(node).attr("alt") === undefined).length;
  const internalLinks = $("a[href]").toArray().filter((node) => {
    const href = $(node).attr("href") ?? "";
    return href.startsWith("/") || href.startsWith(contract.targetUrl);
  }).length;
  const structuredBlocks = $("dl, ul, ol, table, details, [data-answer], .answer, .faq").length;
  const headingCount = $("h2, h3").length;
  const text = $("main").first().text().replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;

  if (enabled("seo_metadata")) {
    const issues: string[] = [];
    if (!title) issues.push("title is missing");
    else if (title.length < 10 || title.length > 60) issues.push(`title is ${title.length} characters`);
    if (!description) issues.push("meta description is missing");
    else if (description.length < 50 || description.length > 170) issues.push(`meta description is ${description.length} characters`);
    if (issues.length) findings.push(issue(store, input, "seo_metadata", "Search metadata needs attention", issues.join("; "), { title, description }));
    else addEvent(store, input.runId, "seo", "activity", `${input.path}: title and meta description are present and within review thresholds.`, { activity: "seo", status: "success", check: "metadata", url: input.url });
  }
  if (enabled("seo_social")) {
    const twitterCard = $("meta[name='twitter:card']").attr("content")?.trim() ?? "";
    if (ogMissing.length || !twitterCard) findings.push(issue(store, input, "seo_social", "Social preview metadata incomplete", `Missing ${[...ogMissing, ...(!twitterCard ? ["twitter:card"] : [])].join(", ")}`, { ogMissing, twitterCard }));
    else addEvent(store, input.runId, "seo", "activity", `${input.path}: Open Graph and Twitter preview metadata are present.`, { activity: "seo", status: "success", check: "social", url: input.url });
  }
  if (enabled("seo_structure")) {
    const problems: string[] = [];
    if (h1Count !== 1) problems.push(`${h1Count} H1 elements`);
    if (!mainCount) problems.push("no main landmark");
    if (missingAlt) problems.push(`${missingAlt} image${missingAlt === 1 ? "" : "s"} missing alt attributes`);
    if (problems.length) findings.push(issue(store, input, "seo_structure", "Semantic page structure needs attention", problems.join("; "), { h1Count, mainCount, missingAlt }));
    else addEvent(store, input.runId, "seo", "activity", `${input.path}: one H1, main landmark, and image alt coverage confirmed.`, { activity: "seo", status: "success", check: "structure", url: input.url });
  }
  if (enabled("seo_schema")) {
    const invalid: string[] = [];
    jsonLd.forEach((block, index) => { try { JSON.parse(block); } catch { invalid.push(`block ${index + 1}`); } });
    if (invalid.length) findings.push(issue(store, input, "seo_schema", "Invalid JSON-LD structured data", `${invalid.join(", ")} could not be parsed`, { invalid }));
    else if (!jsonLd.length) findings.push(issue(store, input, "seo_schema", "No structured data found", "No JSON-LD schema was found; consider accurate Organization, WebSite, Article, Service, or FAQ markup only where it matches visible content", { jsonLdCount: 0 }));
    else addEvent(store, input.runId, "seo", "activity", `${input.path}: ${jsonLd.length} JSON-LD block${jsonLd.length === 1 ? "" : "s"} parsed successfully.`, { activity: "seo", status: "success", check: "schema", url: input.url });
  }
  if (enabled("seo_content") && words < 120) findings.push(issue(store, input, "seo_content", "Content may be too thin for search intent", `Main content contains ${words} words; expand only where it helps users complete their task`, { words }));
  if (enabled("seo_links") && !internalLinks) findings.push(issue(store, input, "seo_links", "No internal links discovered", "No crawlable internal links were found on this page", { internalLinks }));
  if (enabled("seo_answer") && !structuredBlocks && headingCount < 2) findings.push(issue(store, input, "seo_answer", "Answer extractability can improve", "No concise answer block, list, definition list, table, FAQ, or sufficient section structure detected; add only useful people-first structure", { structuredBlocks, headingCount, aiCitationGuaranteed: false }));
  if (input.path === "/blog" && enabled("seo_content") && !$("time, [rel='author'], .author, [itemprop='author']").length) findings.push(issue(store, input, "seo_content", "Content attribution is unclear", "No author or publication date was detected on this content page", { hasAttribution: false }));
  return findings;
}

export async function inspectSearchPolicy(store: TrustpatchDb, runId: string, contract: RunContract): Promise<SeoPolicyResult> {
  if (!contract.scope.includeChecks.includes("seo_crawl") || contract.scope.excludeChecks.includes("seo_crawl")) return { robotsText: null, sitemapStatus: 0, blockedAgents: [] };
  const origin = new URL(contract.targetUrl).origin;
  addEvent(store, runId, "seo", "activity", `Checking ${origin}/robots.txt and sitemap discovery for search and AI crawlers.`, { activity: "seo", status: "active", check: "crawl" });
  let robotsResponse: Response;
  let sitemapResponse: Response;
  try {
    [robotsResponse, sitemapResponse] = await Promise.all([
      fetchPublic(`${origin}/robots.txt`, contract.authorizedLocalFixture),
      fetchPublic(`${origin}/sitemap.xml`, contract.authorizedLocalFixture)
    ]);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown network error";
    addEvent(store, runId, "seo", "activity", `Crawler policy check unavailable: ${detail}. Page inspection continues; no policy conclusion inferred.`, { activity: "seo", status: "info", check: "crawl", available: false });
    storeEvidence(store, runId, "crawler-policy-unavailable", { detail });
    return { robotsText: null, sitemapStatus: 0, blockedAgents: [] };
  }
  const robotsText = robotsResponse.ok ? await robotsResponse.text() : null;
  storeEvidence(store, runId, "robots-policy", { status: robotsResponse.status, content: robotsText });
  storeEvidence(store, runId, "sitemap-discovery", { status: sitemapResponse.status });
  const blockedAgents: string[] = [];
  if (robotsText) {
    for (const agent of ["GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended"]) {
      const group = new RegExp(`(?:^|\\n)\\s*User-agent:\\s*${agent}\\s*\\n([\\s\\S]*?)(?=\\n\\s*User-agent:|$)`, "i").exec(robotsText)?.[1] ?? "";
      if (/^\s*Disallow:\s*\/\s*$/im.test(group)) blockedAgents.push(agent);
    }
  }
  const wildcardBlock = /(?:^|\n)\s*User-agent:\s*\*\s*\n([\s\S]*?)(?=\n\s*User-agent:|$)/i.exec(robotsText ?? "")?.[1] ?? "";
  const wildcardDisallow = /^\s*Disallow:\s*\/\s*$/im.test(wildcardBlock);
  if (wildcardDisallow) addEvent(store, runId, "seo", "activity", "Robots.txt disallows all crawlers from the entire site, including search and AI crawlers.", { activity: "seo", status: "warning", check: "crawl", wildcardDisallow });
  else if (blockedAgents.length) addEvent(store, runId, "seo", "activity", `AI crawler access is explicitly blocked for ${blockedAgents.join(", ")}. Review the business tradeoff; this is not a ranking score.`, { activity: "seo", status: "warning", check: "crawl", blockedAgents });
  else addEvent(store, runId, "seo", "activity", robotsText ? "No explicit full-site AI-crawler disallow found for monitored agents." : "No robots.txt policy discovered; no explicit AI-crawler disallow to report.", { activity: "seo", status: "info", check: "crawl" });
  addEvent(store, runId, "seo", "activity", `Sitemap discovery returned HTTP ${sitemapResponse.status}.`, { activity: "seo", status: sitemapResponse.ok ? "success" : "info", check: "sitemap", httpStatus: sitemapResponse.status });
  return { robotsText, sitemapStatus: sitemapResponse.status, blockedAgents };
}
