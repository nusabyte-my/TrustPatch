import { createDatabase, migrateDatabase } from "./db";
const { sqlite } = createDatabase();
migrateDatabase(sqlite);
console.log("TrustPatch database migrated.");
sqlite.close();
