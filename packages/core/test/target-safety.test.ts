import { describe, expect, it } from "vitest";
import { assertPublicAddress } from "../src/target-safety";

describe("public target address classification", () => {
  it("allows public IPv4 and IPv6 addresses", () => {
    expect(() => assertPublicAddress("192.58.10.20")).not.toThrow();
    expect(() => assertPublicAddress("104.20.23.154")).not.toThrow();
    expect(() => assertPublicAddress("2606:4700:10::6814:179a")).not.toThrow();
  });
  it("rejects private, metadata, documentation, and link-local addresses", () => {
    for (const address of ["192.168.1.1", "169.254.169.254", "192.0.2.1", "fd00::1", "fe80::1", "2001:db8::1", "::ffff:127.0.0.1"]) expect(() => assertPublicAddress(address)).toThrow();
  });
});
