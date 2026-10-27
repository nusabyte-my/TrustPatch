import { describe, expect, it } from "vitest";
import { checkRevisionScope, type Approval } from "@trustpatch/contracts";
import { fixtureRepairPlan } from "@trustpatch/core";

const approval: Approval = { findingIds: ["finding-1"], allowedFiles: ["app/services/page.tsx", "app/layout.tsx"], createPr: false, scopeDigest: "a".repeat(64) };
describe("Mend authority boundaries", () => {
  it("allows self-repair only inside the approved finding and file scope", () => {
    expect(checkRevisionScope({ findingIds: ["finding-1"], changedFiles: ["app/layout.tsx"], approval }).allowed).toBe(true);
    expect(checkRevisionScope({ findingIds: ["finding-1"], changedFiles: ["app/layout.tsx", "app/api/secret/route.ts"], approval }).allowed).toBe(false);
    expect(checkRevisionScope({ findingIds: ["finding-1"], changedFiles: ["app/layout.tsx"], approval, newCapability: true }).allowed).toBe(false);
  });
  it("returns a typed empty plan rather than inventing an edit", () => {
    const plan = fixtureRepairPlan({ contract: {} as never, findings: [], files: {}, attempt: 0 });
    expect(plan.edits).toEqual([]);
  });
});
