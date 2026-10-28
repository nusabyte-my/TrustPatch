export interface McpToolDefinition { name: string; description?: string; inputSchema?: Record<string, unknown> }
interface McpResult { structuredContent?: unknown; content?: Array<{ type: string; text?: string; isError?: boolean }>; isError?: boolean }
interface McpReply { id?: number; result?: { tools?: McpToolDefinition[] } & McpResult; error?: { message: string } }

export class McpClient {
  private session: string | undefined;
  private sequence = 0;
  constructor(readonly endpoint: string, readonly apiKey?: string, readonly clientName = "trustpatch") {}

  private async request(method: string, params?: unknown, identified = true): Promise<McpResult | { tools?: McpToolDefinition[] } | null> {
    const id = identified ? ++this.sequence : undefined;
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...(this.session ? { "Mcp-Session-Id": this.session } : {}), ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, ...(id ? { id } : {}) }),
      signal: AbortSignal.timeout(30_000)
    });
    this.session = response.headers.get("mcp-session-id") ?? this.session;
    if (!response.ok) throw new Error(`MCP returned HTTP ${response.status}`);
    if (!id) return null;
    const body = await response.text();
    const replies = response.headers.get("content-type")?.includes("text/event-stream")
      ? body.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => JSON.parse(line.slice(5).trim()) as McpReply)
      : [JSON.parse(body) as McpReply];
    const reply = replies.find((item) => item.id === id);
    if (!reply || reply.error) throw new Error(reply?.error?.message ?? "MCP returned no result");
    return reply.result ?? null;
  }

  async initialize() {
    await this.request("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: this.clientName, version: "0.1.0" } });
    await this.request("notifications/initialized", {}, false);
  }
  async listTools(): Promise<McpToolDefinition[]> {
    const result = await this.request("tools/list", {}) as { tools?: McpToolDefinition[] } | null;
    return result?.tools ?? [];
  }
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const result = await this.request("tools/call", { name, arguments: args }) as McpResult | null;
    if (result?.isError) throw new Error(result.content?.find((item) => item.type === "text")?.text ?? `MCP tool ${name} failed`);
    const text = result?.content?.find((item) => item.type === "text")?.text;
    if (result?.structuredContent !== undefined) return result.structuredContent;
    if (text !== undefined) { try { return JSON.parse(text) as unknown; } catch { return text; } }
    return result;
  }
}
