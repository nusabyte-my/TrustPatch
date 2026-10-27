import { config } from "dotenv";
import { resolve } from "node:path";
import { createDatabase, migrateDatabase, type TrustpatchDb } from "@trustpatch/core";
config({ path: resolve(process.cwd(), ".env"), quiet: true });
const globalStore = globalThis as typeof globalThis & { trustpatchStore?: TrustpatchDb };
export const store = globalStore.trustpatchStore ?? createDatabase();
globalStore.trustpatchStore = store;
migrateDatabase(store.sqlite);
