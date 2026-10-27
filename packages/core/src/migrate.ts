import { createDatabase, migrateDatabase } from "./db.js";
const { sqlite } = createDatabase();
migrateDatabase(sqlite);
console.log("TrustPatch database migrated.");
sqlite.close();
