import { store } from "./runtime";
import { bulkTargetSchema, getBulkAudit, markBulkComplete, queueBulkAudit, type BulkTarget } from "@trustpatch/core";
import { z } from "zod";

const inputSchema = z.object({ scopeDomain: z.string(), targets: z.array(bulkTargetSchema).min(1).max(20), ownershipConfirmed: z.literal(true) });
export function createBulk(input: unknown) {
  const parsed = inputSchema.parse(input);
  return queueBulkAudit(store, parsed.scopeDomain, parsed.targets);
}
export function readBulk(id: string) { return markBulkComplete(store, id); }
