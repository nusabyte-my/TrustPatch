import { config } from "dotenv";
import { startWorker } from "./orchestrator";
config({ path: ".env", quiet: true });
await startWorker();
