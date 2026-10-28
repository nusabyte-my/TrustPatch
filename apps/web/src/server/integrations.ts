import { jebatStatus, llmHealth, mcpHealth } from "@trustpatch/core";

export async function integrationStatus() {
  const [llm, jebat, mcp] = await Promise.all([llmHealth(), jebatStatus(), mcpHealth()]);
  return {
    llm: { mode: llm.mode, model: llm.model, ready: llm.ready, configured: llm.configured, detail: llm.detail },
    jebat: { configured: jebat.configured, available: jebat.available, tools: jebat.tools.length, error: jebat.error },
    cve: { configured: Boolean(process.env.CVE_MCP_URL), url: process.env.CVE_MCP_URL ? new URL(process.env.CVE_MCP_URL).origin : null },
    rea: { configured: Boolean(process.env.REA_MCP_URL && process.env.REA_CDP_URL) },
    mcp
  };
}
