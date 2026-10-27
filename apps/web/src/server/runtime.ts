import { config } from "dotenv";
import { createDatabase, migrateDatabase, trustpatchPaths, type TrustpatchDb } from "@trustpatch/core";
config({ path: `${trustpatchPaths().root}/.env`, quiet: true });
const globalStore = globalThis as typeof globalThis & { trustpatchStore?: TrustpatchDb };
export const store = globalStore.trustpatchStore ?? createDatabase();
globalStore.trustpatchStore = store;
migrateDatabase(store.sqlite);
