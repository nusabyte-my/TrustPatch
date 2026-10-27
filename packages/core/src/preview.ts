import { execFile, spawn, type ChildProcess } from "node:child_process";
import { access, symlink } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { TrustpatchDb } from "./db.js";
import { storeEvidence } from "./evidence.js";

const execFileAsync = promisify(execFile);
export interface PreviewHandle { url: string; port: number; stop: () => Promise<void>; }

async function availablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") { server.close(); reject(new Error("Could not allocate preview port")); return; }
      const { port } = address;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}
async function waitForPreview(url: string, child: ChildProcess, logs: string[]) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Patched preview exited early (${child.exitCode}). ${logs.join("")}`);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) return; } catch { /* preview still starting */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Patched preview did not become ready. ${logs.join("")}`);
}
export async function startPatchedPreview(store: TrustpatchDb, runId: string, worktree: string, productionOrigin: string): Promise<PreviewHandle> {
  const packageRoot = resolve(import.meta.dirname, "../../..");
  try { await access(resolve(worktree, "node_modules")); }
  catch { await symlink(resolve(packageRoot, "node_modules"), resolve(worktree, "node_modules"), "junction"); }
  const localNext = resolve(worktree, "node_modules", "next", "dist", "bin", "next");
  const build = await execFileAsync(process.execPath, [localNext, "build"], {
    cwd: worktree,
    env: { ...process.env, NODE_PATH: resolve(packageRoot, "node_modules"), NEXT_PUBLIC_SITE_URL: productionOrigin },
    maxBuffer: 8 * 1024 * 1024,
    timeout: 180_000
  }).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Patched build failed. ${detail}`);
  });
  storeEvidence(store, runId, "patched-build", { stdout: build.stdout, stderr: build.stderr });
  const port = await availablePort();
  const logs: string[] = [];
  const child = spawn(process.execPath, [localNext, "start", "-p", String(port)], {
    cwd: worktree,
    env: { ...process.env, NODE_PATH: resolve(packageRoot, "node_modules"), NEXT_PUBLIC_SITE_URL: productionOrigin },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk: Buffer) => { logs.push(chunk.toString()); });
  child.stderr.on("data", (chunk: Buffer) => { logs.push(chunk.toString()); });
  const url = `http://127.0.0.1:${port}`;
  const stop = async () => {
    if (child.exitCode !== null) return;
    child.kill("SIGTERM");
    await Promise.race([
      new Promise<void>((resolveExit) => child.once("close", () => resolveExit())),
      new Promise<void>((resolveWait) => setTimeout(resolveWait, 3000))
    ]);
    if (child.exitCode === null) child.kill("SIGKILL");
  };
  try { await waitForPreview(url, child, logs); }
  catch (error) { await stop(); throw error; }
  storeEvidence(store, runId, "patched-preview", { url, port });
  return { url, port, stop };
}
