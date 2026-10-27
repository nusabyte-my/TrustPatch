import { describe, expect, it } from "vitest";
import { assertTargetInScope, buildBulkContracts, createBulkJob, parseScopeDomain } from "../src/bulk";

const target = (url: string) => ({ url, paths: ["/"] as const, authorized: true as const });
describe("authorized bulk target scoping", () => {
  it("accepts only the approved registrable domain and subdomains", () => {
    expect(parseScopeDomain("https://Example.com/")).toBe("example.com");
    expect(assertTargetInScope("https://docs.example.com", "example.com").hostname).toBe("docs.example.com");
    expect(() => assertTargetInScope("https://other.test", "example.com")).toThrow("outside approved scope");
    expect(() => assertTargetInScope("http://127.0.0.1:3100", "example.com")).toThrow("Private, reserved, or metadata IP targets are not allowed");
    expect(() => assertTargetInScope("http://169.254.169.254/latest/meta-data", "example.com")).toThrow("Private, reserved, or metadata IP targets are not allowed");
    expect(() => parseScopeDomain("com")).toThrow("bare TLD");
    expect(() => assertTargetInScope("https://service.internal", "service.internal")).toThrow("Loopback and internal hostnames");
    expect(() => assertTargetInScope("http://0177.0.0.1", "example.com")).toThrow("Private, reserved, or metadata IP targets are not allowed");
    expect(assertTargetInScope("https://10.example.com", "example.com").hostname).toBe("10.example.com");
  });
  it("forces passive read-only contracts without repository or PR authority", () => {
    const [contract] = buildBulkContracts(createBulkJob("example.com", [target("https://example.com")]));
    expect(contract?.readOnly).toBe(true);
    expect(contract?.createPr).toBe(false);
    expect(contract?.repositoryPath).toBe("bulk://example.com");
    expect(contract?.scope.includeChecks).toContain("seo_schema");
  });
});
