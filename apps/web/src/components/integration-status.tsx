import { integrationStatus } from "../server/integrations";

export async function IntegrationStatus() {
  const status = await integrationStatus();
  const llmLabel = !status.llm.configured ? "Fixture planner" : status.llm.ready ? "Meta Model API Active" : "Meta Key Missing / Offline";
  const jebatLabel = status.jebat.available
    ? `${status.jebat.tools} MCP tools active`
    : status.jebat.configured
    ? "Local gateway offline (Optional)"
    : "Built-in AST Engine Active";
  return (
    <section className="integration-status" aria-label="Agent provider status">
      <span>
        <i className={status.llm.ready ? "provider-ready" : "provider-pending"} />
        <strong>Meta AI / Muse API</strong>
        <small>{status.llm.model} · {llmLabel}</small>
      </span>
      <span>
        <i className={status.jebat.available ? "provider-ready" : "provider-pending"} />
        <strong>JEBAT Intelligence</strong>
        <small>{jebatLabel}</small>
      </span>
      <span>
        <i className={status.cve.configured ? "provider-ready" : "provider-pending"} />
        <strong>Vulnerability Intelligence</strong>
        <small>{status.cve.configured ? "CVE MCP + OSV" : "OSV.dev Advisory Live"}</small>
      </span>
      <span>
        <i className={status.rea.configured ? "provider-ready" : "provider-pending"} />
        <strong>Runtime Verification</strong>
        <small>{status.rea.configured ? "REA Active" : "Headless Browser Active"}</small>
      </span>
    </section>
  );
}
