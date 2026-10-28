import { McpClient } from "./mcp";

export function llmSettings() {
  const mode = process.env.AGENT_MODE ?? "fixture";
  return {
    mode,
    configured: mode === "meta" || mode === "llm",
    model: process.env.MODEL_ID ?? "muse-spark-1.3",
    endpoint: process.env.MODEL_API_URL ?? "https://api.meta.ai/v1",
    protocol: process.env.MODEL_API_PROTOCOL ?? "responses",
    hasCredential: Boolean(process.env.MODEL_API_KEY)
  };
}
export async function llmHealth() {
  const settings = llmSettings();
  if (!settings.configured) return { ...settings, ready: false, detail: "Deterministic fixture planner; no LLM claim." };
  if (!settings.hasCredential) return { ...settings, ready: false, detail: "MODEL_API_KEY is missing." };
  try {
    const response = await fetch(`${settings.endpoint.replace(/\/$/, "")}/models`, { headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}` }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return { ...settings, ready: false, detail: `Model provider returned HTTP ${response.status}.` };
    return { ...settings, ready: true, detail: "Model credential accepted by the provider catalog; repair tool-call verification runs separately." };
  } catch (error) {
    return { ...settings, ready: false, detail: error instanceof Error ? error.message : "Model provider unavailable." };
  }
}
export async function mcpHealth() {
  const endpoint = process.env.JEBAT_MCP_URL;
  if (!endpoint) return { configured: false, available: false, tools: 0 };
  try {
    const client = new McpClient(endpoint, process.env.JEBAT_MCP_API_KEY, "trustpatch-health");
    await client.initialize();
    return { configured: true, available: true, tools: (await client.listTools()).length };
  } catch {
    return { configured: true, available: false, tools: 0 };
  }
}
