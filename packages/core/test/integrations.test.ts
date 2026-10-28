import { afterEach, describe, expect, it, vi } from "vitest";
import { runContractSchema } from "@trustpatch/contracts";
import { callJebatTool } from "../src/jebat";
import { metaRepairPlan, plannerName } from "../src/model";

afterEach(() => { vi.unstubAllGlobals(); delete process.env.MODEL_API_KEY; delete process.env.AGENT_MODE; });
const contract = runContractSchema.parse({ objective: "Repair indexing", targetUrl: "http://127.0.0.1:3100", productionOrigin: "http://127.0.0.1:3100", repositoryPath: ".", authorizedLocalFixture: true, scope: { allowedFiles: ["app/services/page.tsx"] } });
const finding = { id: "find_test", runId: "run_test", kind: "noindex" as const, state: "observed" as const, title: "Indexing blocked", url: "http://127.0.0.1:3100/services", summary: "Observed noindex", observed: {}, sourceFiles: [], evidenceIds: [] };

describe("LLM and scoped JEBAT integrations", () => {
  it("parses a structured chat-completions repair call and labels the provider", async () => {
    process.env.MODEL_API_KEY = "test-key";
    process.env.AGENT_MODE = "llm";
    process.env.MODEL_API_PROTOCOL = "chat_completions";
    process.env.MODEL_API_URL = "https://models.test/v1";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ type: "function", function: { name: "propose_repairs", arguments: JSON.stringify({ summary: "Enable indexing", edits: [{ file: "app/services/page.tsx", oldString: "index: false", newString: "index: true", reason: "Remove noindex" }] }) } }] } }] }), { status: 200 })));
    const plan = await metaRepairPlan({ contract, findings: [finding], files: { "app/services/page.tsx": "index: false" }, attempt: 0 });
    expect(plan.edits[0]?.file).toBe("app/services/page.tsx");
    expect(plannerName()).toBe("llm-model");
  });
  it("rejects unrestricted JEBAT tools before any network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(callJebatTool("terminal", { command: "whoami" })).rejects.toThrow("outside the TrustPatch read-only allowlist");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
