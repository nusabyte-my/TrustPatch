import { config } from "dotenv";
import { startWorker } from "./orchestrator.js";
config({ path: ".env", quiet: true });
await startWorker();
