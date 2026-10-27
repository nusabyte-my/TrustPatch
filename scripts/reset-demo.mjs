import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const gitDir = resolve(root, ".data/fixture-baseline.git");
const workTree = resolve(root, "fixtures/broken-next-site");
execFileSync("git", [`--git-dir=${gitDir}`, `--work-tree=${workTree}`, "restore", "."], { stdio: "inherit" });
console.log("Fixture source restored. Existing run evidence is preserved; use a new run for a clean demo.");
