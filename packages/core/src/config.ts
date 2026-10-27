import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface TrustpatchPaths {
  root: string;
  database: string;
  artifacts: string;
  fixturePath: string;
  fixtureGitDir: string;
}
export function trustpatchPaths(): TrustpatchPaths {
  let current = process.cwd();
  while (!existsSync(resolve(current, "pnpm-workspace.yaml"))) {
    const parent = dirname(current);
    if (parent === current) throw new Error("TrustPatch workspace root not found");
    current = parent;
  }
  return {
    root: current,
    database: resolve(current, process.env.TRUSTPATCH_DATABASE ?? ".data/trustpatch.db"),
    artifacts: resolve(current, process.env.TRUSTPATCH_ARTIFACTS ?? "artifacts"),
    fixturePath: resolve(current, process.env.TRUSTPATCH_FIXTURE_PATH ?? "fixtures/broken-next-site"),
    fixtureGitDir: resolve(current, process.env.TRUSTPATCH_FIXTURE_GIT_DIR ?? ".data/fixture-baseline.git")
  };
}
