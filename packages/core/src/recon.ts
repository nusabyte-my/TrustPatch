import type { ConsoleMessage, Page, Request, Response } from "playwright";
import type { TrustpatchDb } from "./db";
import { storeEvidence } from "./evidence";
import { addEvent } from "./store";

export interface ReactiveDiagnostics {
  url: string;
  finalUrl: string;
  console: Array<{ type: string; text: string }>;
  pageErrors: string[];
  failedRequests: Array<{ method: string; url: string; error: string }>;
  errorResponses: Array<{ status: number; url: string }>;
  scripts: string[];
  stylesheets: string[];
  limits: string[];
}

export function observeReactivePage(page: Page, url: string) {
  const consoleMessages: ReactiveDiagnostics["console"] = [];
  const pageErrors: string[] = [];
  const failedRequests: ReactiveDiagnostics["failedRequests"] = [];
  const errorResponses: ReactiveDiagnostics["errorResponses"] = [];
  const onConsole = (message: ConsoleMessage) => { if (["warning", "error"].includes(message.type()) && consoleMessages.length < 100) consoleMessages.push({ type: message.type(), text: message.text().slice(0, 2000) }); };
  const onPageError = (error: Error) => { if (pageErrors.length < 50) pageErrors.push(error.message.slice(0, 2000)); };
  const onRequestFailed = (request: Request) => { if (failedRequests.length < 100) failedRequests.push({ method: request.method(), url: request.url(), error: request.failure()?.errorText ?? "Request failed" }); };
  const onResponse = (response: Response) => { if (response.status() >= 400 && errorResponses.length < 100) errorResponses.push({ status: response.status(), url: response.url() }); };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);
  return async (): Promise<ReactiveDiagnostics> => {
    try {
      return {
        url, finalUrl: page.url(), console: consoleMessages, pageErrors, failedRequests, errorResponses,
        scripts: await page.locator("script[src]").evaluateAll((nodes) => nodes.map((node) => (node as HTMLScriptElement).src).filter(Boolean)),
        stylesheets: await page.locator("link[rel='stylesheet']").evaluateAll((nodes) => nodes.map((node) => (node as HTMLLinkElement).href).filter(Boolean)),
        limits: ["Observed only this navigation and idle window; not a complete runtime or security assessment.", "Failed requests and console messages may include third-party resources.", "No credentials, hidden storage values, or request/response bodies collected."]
      };
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
      page.off("response", onResponse);
    }
  };
}

export async function storeReactiveDiagnostics(store: TrustpatchDb, runId: string, diagnostics: ReactiveDiagnostics) {
  const evidence = storeEvidence(store, runId, "reactive-diagnostics", diagnostics);
  addEvent(store, runId, "recon", "activity", `Reactive evidence captured: ${diagnostics.pageErrors.length} runtime errors, ${diagnostics.failedRequests.length} failed requests, ${diagnostics.scripts.length} scripts.`, { activity: "recon", status: diagnostics.pageErrors.length || diagnostics.failedRequests.length ? "warning" : "success", evidenceId: evidence.id, pageErrors: diagnostics.pageErrors.length, failedRequests: diagnostics.failedRequests.length, scripts: diagnostics.scripts.length });
  return evidence.id;
}

interface McpReply { jsonrpc: string; id?: number; result?: { structuredContent?: unknown; content?: Array<{ type: string; text?: string }> }; error?: { message: string } }
export async function callReaTool(endpoint: string, tool: string, args: Record<string, unknown>) {
  let session: string | undefined;
  async function request(method: string, params?: unknown, id?: number) {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...(session ? { "Mcp-Session-Id": session } : {}) }, body: JSON.stringify({ jsonrpc: "2.0", method, params, ...(id ? { id } : {}) }), signal: AbortSignal.timeout(60_000) });
    session = response.headers.get("mcp-session-id") ?? session;
    if (!response.ok) throw new Error(`REA MCP returned HTTP ${response.status}`);
    if (!id) return null;
    const body = await response.text();
    const json = response.headers.get("content-type")?.includes("text/event-stream") ? body.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => JSON.parse(line.slice(5).trim()) as McpReply).find((reply) => reply.id === id) : JSON.parse(body) as McpReply;
    if (!json || json.error) throw new Error(json?.error?.message ?? "REA MCP returned no result");
    return json.result;
  }
  await request("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "trustpatch-recon", version: "0.1.0" } }, 1);
  await request("notifications/initialized");
  const result = await request("tools/call", { name: tool, arguments: args }, 2);
  const text = result?.content?.find((item) => item.type === "text")?.text;
  return result?.structuredContent ?? (text ? JSON.parse(text) as unknown : result);
}

export async function enrichWithRea(store: TrustpatchDb, runId: string, targetUrl: string) {
  const endpoint = process.env.REA_MCP_URL;
  const cdp = process.env.REA_CDP_URL;
  if (!endpoint || !cdp) { addEvent(store, runId, "recon", "activity", "Built-in reactive evidence complete. Optional REA enrichment is not configured; no REA result claimed.", { activity: "rea", status: "info", configured: false }); return null; }
  try {
    const targets = await callReaTool(endpoint, "list_browser_targets", { cdp_endpoint: cdp, origin: new URL(targetUrl).origin });
    const target = findTarget(targets, targetUrl);
    if (!target) throw new Error("No matching authorized page in the configured CDP browser. Open the target there first.");
    const [page, bundle] = await Promise.all([
      callReaTool(endpoint, "inspect_web_page", { cdp_endpoint: cdp, target_id: target, allowed_origins: [new URL(targetUrl).origin], observation_ms: 3000, include_script_sources: false, include_console_text: true }),
      callReaTool(endpoint, "analyze_web_bundle", { cdp_endpoint: cdp, target_id: target, allowed_origins: [new URL(targetUrl).origin], observation_ms: 3000, include_script_sources: true, fetch_source_maps: true })
    ]);
    const evidence = storeEvidence(store, runId, "rea-web-evidence", { page, bundle, limitations: "Passive CDP observation and static JavaScript analysis only; no target execution by REA." });
    addEvent(store, runId, "recon", "activity", "REA passive page evidence and static client-bundle analysis stored. Runtime observations remain separate from static inferences.", { activity: "rea", status: "success", evidenceId: evidence.id, configured: true });
    return evidence.id;
  } catch (error) {
    addEvent(store, runId, "recon", "activity", `REA enrichment unavailable: ${error instanceof Error ? error.message : "unknown error"}. Built-in reactive evidence remains valid.`, { activity: "rea", status: "warning", configured: true });
    return null;
  }
}
function findTarget(value: unknown, url: string): string | null {
  const origin = new URL(url).origin;
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) { for (const item of value) { const match = findTarget(item, url); if (match) return match; } return null; }
  const record = value as Record<string, unknown>;
  const id = typeof record.target_id === "string" ? record.target_id : typeof record.targetId === "string" ? record.targetId : null;
  const candidateUrl = typeof record.url === "string" ? record.url : null;
  if (id && candidateUrl) { try { if (new URL(candidateUrl).origin === origin) return id; } catch { return null; } }
  for (const child of Object.values(record)) { const match = findTarget(child, url); if (match) return match; }
  return null;
}
