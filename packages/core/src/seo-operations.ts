import type { Finding } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";
import { storeEvidence } from "./evidence";
import { addEvent } from "./store";

export interface SeoOperation {
  findingId: string;
  kind: Finding["kind"];
  red: { challenge: string; attackPath: string };
  blue: { action: string; verification: string };
  evidenceIds: string[];
}
const playbooks: Partial<Record<Finding["kind"], { challenge: string; attackPath: string; action: string; verification: string }>> = {
  noindex: { challenge: "Search crawlers may be explicitly told to exclude this page.", attackPath: "Rendered robots meta contains an exclusion directive.", action: "Remove the exclusion only where indexation is intended; keep private or staging paths excluded.", verification: "Rendered robots meta allows the intended indexing policy." },
  canonical: { challenge: "Search engines may consolidate authority on the wrong URL or host.", attackPath: "The declared canonical differs from the approved production URL.", action: "Set the canonical to the real public URL for this page, not a staging or placeholder host.", verification: "Canonical resolves to the approved production URL." },
  seo_metadata: { challenge: "Search snippets may not explain the page's actual purpose.", attackPath: "Title or description is missing, duplicated, or too generic for the observed content.", action: "Write a specific title and description from the visible page intent; avoid keyword stuffing.", verification: "Title and description exist and match visible content." },
  seo_social: { challenge: "Shared links may render with incomplete or misleading previews.", attackPath: "Open Graph or Twitter preview fields are incomplete.", action: "Add accurate social title, description, canonical URL, and preview image.", verification: "Required social preview metadata is present and accurate." },
  seo_structure: { challenge: "Search engines and assistive agents may not understand the page hierarchy.", attackPath: "Missing main landmark, multiple primary headings, or absent image alternatives.", action: "Use one clear H1, semantic main content, and meaningful image alt text.", verification: "Landmarks and heading hierarchy match the visible page." },
  seo_schema: { challenge: "Machines may lack reliable entity and content context.", attackPath: "Structured data is missing or invalid.", action: "Add only schema that matches visible content and validate every JSON-LD block.", verification: "JSON-LD parses and accurately describes visible entities." },
  seo_content: { challenge: "The page may not satisfy a clear user or search intent.", attackPath: "Observed main content lacks depth or attribution.", action: "Add useful first-hand information, authorship, and dates where appropriate; do not pad word count.", verification: "Content answers the intended task with clear attribution." },
  seo_links: { challenge: "Important pages may be isolated from crawl paths and users.", attackPath: "No crawlable internal links were observed.", action: "Add relevant internal links to useful related pages.", verification: "At least one relevant crawlable internal link exists." },
  seo_answer: { challenge: "AI assistants may struggle to extract a self-contained answer.", attackPath: "No concise answer block or useful section structure was observed.", action: "Lead sections with direct people-first answers and appropriate lists, tables, or FAQs.", verification: "Key sections contain self-contained answers without AI-only filler." },
  seo_crawl: { challenge: "Search or AI crawlers may be unable to discover or access content.", attackPath: "robots.txt or sitemap discovery indicates an access limitation.", action: "Review crawler directives intentionally; allow desired search bots and publish an accurate sitemap.", verification: "Crawler policy and sitemap match the intended discovery strategy." },
  security_header: { challenge: "The browser lacks a response policy expected for safer content handling.", attackPath: "Required security response header is absent.", action: "Set the approved response header without weakening existing controls.", verification: "The response contains the approved security header." }
};

export function buildSeoOperations(findings: Finding[]): SeoOperation[] {
  return findings.filter((finding) => playbooks[finding.kind]).map((finding) => {
    const playbook = playbooks[finding.kind]!;
    return { findingId: finding.id, kind: finding.kind, red: { challenge: playbook.challenge, attackPath: playbook.attackPath }, blue: { action: playbook.action, verification: playbook.verification }, evidenceIds: finding.evidenceIds };
  });
}

export function runSeoOperations(store: TrustpatchDb, runId: string, findings: Finding[]) {
  const operations = buildSeoOperations(findings);
  const evidence = storeEvidence(store, runId, "red-blue-seo-operations", { mode: "red_blue", operations, limitations: "Recommendations are evidence-led review actions, not guaranteed rankings, citations, traffic, or automatic rewrites." });
  addEvent(store, runId, "seo", "activity", `Red Team complete: ${operations.length} evidence-backed SEO challenges identified. No exploit attempts or ranking claims.`, { activity: "seo_red", status: operations.length ? "warning" : "success", count: operations.length, evidenceId: evidence.id });
  addEvent(store, runId, "seo", "activity", `Blue Team complete: ${operations.length} bounded optimization actions prepared with verification targets. No content rewritten automatically.`, { activity: "seo_blue", status: "success", count: operations.length, evidenceId: evidence.id });
  return { operations, evidenceId: evidence.id };
}
