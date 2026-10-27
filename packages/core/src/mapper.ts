import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RunContract } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db";
import { storeEvidence } from "./evidence";
import { addEvent } from "./store";

export function mapRepository(store: TrustpatchDb, runId: string, contract: RunContract, repositoryPath = contract.repositoryPath) {
  const files: Record<string, string> = {};
  for (const file of contract.scope.allowedFiles) {
    try {
      const content = readFileSync(resolve(repositoryPath, file), "utf8");
      files[file] = content.length > 120_000 ? `${content.slice(0, 120_000)}\n/* excerpt truncated; full source remains in repository */` : content;
    } catch { files[file] = "/* file not present */"; }
  }
  addEvent(store, runId, "mapper", "activity", `Mapped ${Object.keys(files).length} scoped files from ${repositoryPath === contract.repositoryPath ? "the approved repository" : "the isolated worktree"}.`, { activity: "mapping", status: "active", count: Object.keys(files).length });
  const evidence = storeEvidence(store, runId, "repository-context", { baseBranch: contract.baseBranch, files });
  return { files, evidenceId: evidence.id };
}
