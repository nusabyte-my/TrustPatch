import { describe, expect, it } from "vitest";
import { planTargetInstruction } from "../src/target-console";

describe("Hermes-style target console", () => {
  it("maps target and read-only instruction to typed tools", () => {
    const plan = planTargetInstruction({ instruction: "Inspect http://127.0.0.1:3100. Check indexing and SEO. Read-only.", authorized: true });
    expect(plan.targetUrl).toBe("http://127.0.0.1:3100");
    expect(plan.readOnly).toBe(true);
    expect(plan.tools).toContain("site.inspect");
    expect(plan.tools).toContain("seo.analyze");
    expect(plan.tools).not.toContain("repair.propose");
  });
  it("adds approval-gated repair tools and scope checks", () => {
    const plan = planTargetInstruction({ instruction: "Fix indexing on https://example.com. Scope example.com", scopeDomain: "example.com", authorized: true });
    expect(plan.repairRequested).toBe(true);
    expect(plan.tools).toContain("repair.verify");
    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(() => planTargetInstruction({ instruction: "Inspect https://other.test. Scope example.com", scopeDomain: "example.com", authorized: true })).toThrow("outside approved scope");
  });
});
