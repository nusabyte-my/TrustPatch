import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RunContract } from "@trustpatch/contracts";
import type { TrustpatchDb } from "./db.js";
import { storeEvidence } from "./evidence.js";

export function mapRepository(store: TrustpatchDb, runId: string, contract: RunContract, repositoryPath = contract.repositoryPath) {
  const files: Record<string, string> = {};
  for (const file of contract.scope.allowedFiles) {
    try {
      const content = readFileSync(resolve(repositoryPath, file), "utf8");
      files[file] = content.length > 120_000 ? `${content.slice(0, 120_000)}\n/* excerpt truncated; full source remains in repository */` : content;
    } catch { files[file] = "/* file not present */"; }
  }
  const evidence = storeEvidence(store, runId, "repository-context", { baseBranch: contract.baseBranch, files });
  return { files, evidenceId: evidence.id };
}
