import { config } from "dotenv";
import { trustpatchPaths } from "@trustpatch/core";
import { startWorker } from "./orchestrator";
config({ path: `${trustpatchPaths().root}/.env`, quiet: true });
await startWorker();
