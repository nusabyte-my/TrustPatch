import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export function assertPublicTarget(value: string, allowFixture = false) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) targets are supported");
  if (url.username || url.password) throw new Error("URLs containing credentials are not allowed");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (allowFixture && ["localhost", "127.0.0.1", "::1"].includes(host)) return url;
  if (["localhost", "0.0.0.0", "::", "::1"].includes(host) || host.endsWith(".localhost") || /(?:^|\.)(?:local|internal|lan|intranet|corp|home\.arpa)$/i.test(host)) throw new Error("Loopback and internal hostnames are not allowed for external inspection");
  if (isIP(host)) assertPublicAddress(host);
  return url;
}

export function assertPublicAddress(address: string) {
  const normalized = address.toLowerCase().split("%")[0] ?? "";
  if (isIP(normalized) === 4) {
    const parts = normalized.split(".").map(Number);
    const [a = 0, b = 0] = parts;
    if (a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0) || (a === 192 && b === 168) || (a === 192 && b === 0 && parts[2] === 0) || (a === 192 && b === 0 && parts[2] === 2) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51) || (a === 203 && b === 0) || a >= 224) throw new Error("Private, reserved, or metadata IP targets are not allowed");
    return;
  }
  if (isIP(normalized) === 6) {
    const first = normalized.split(":")[0] ?? "";
    if (normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || /^0{0,3}f(?:e[c-f]|ff)/.test(normalized) || first === "2001" && normalized.includes("db8") || normalized.startsWith("::ffff:")) throw new Error("Private, mapped, reserved, or link-local IPv6 targets are not allowed");
    return;
  }
  throw new Error("Invalid target IP address");
}

export async function assertResolvablePublicTarget(value: string, allowFixture = false) {
  const url = assertPublicTarget(value, allowFixture);
  if (allowFixture && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) return url;
  if (isIP(url.hostname)) return url;
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error("Target hostname did not resolve");
  for (const { address } of addresses) assertPublicAddress(address);
  return url;
}

export async function fetchPublic(url: string, allowFixture = false) {
  let current = url;
  for (let redirect = 0; redirect < 5; redirect += 1) {
    await assertResolvablePublicTarget(current, allowFixture);
    const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "TrustPatch-Authorized-Inspection/0.1" } });
    const location = response.headers.get("location");
    if (!location || response.status < 300 || response.status >= 400) return response;
    current = new URL(location, current).toString();
  }
  throw new Error("Target exceeded the safe redirect limit");
}
