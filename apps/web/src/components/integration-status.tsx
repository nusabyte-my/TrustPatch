import { integrationStatus } from "../server/integrations";

export async function IntegrationStatus() {
  const status = await integrationStatus();
  const llmLabel = !status.llm.configured ? "Fixture planner" : status.llm.ready ? "Credential accepted" : "Provider blocked";
  return <section className="integration-status" aria-label="Agent provider status"><span><i className={status.llm.ready ? "provider-ready" : "provider-pending"} /><strong>Muse / LLM</strong><small>{status.llm.model} · {llmLabel}</small></span><span><i className={status.jebat.available ? "provider-ready" : "provider-pending"} /><strong>JEBAT ecosystem</strong><small>{status.jebat.available ? `${status.jebat.tools} read-only MCP tools` : "MCP not connected"}</small></span><span><i className={status.cve.configured ? "provider-ready" : "provider-pending"} /><strong>Vulnerability intelligence</strong><small>{status.cve.configured ? "CVE MCP + OSV" : "OSV advisory evidence"}</small></span><span><i className={status.rea.configured ? "provider-ready" : "provider-pending"} /><strong>REA</strong><small>{status.rea.configured ? "Configured" : "Built-in browser evidence"}</small></span></section>;
}
