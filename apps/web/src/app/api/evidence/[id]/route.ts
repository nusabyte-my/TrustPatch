import { NextResponse } from "next/server";
import { readEvidence } from "@trustpatch/core";
import { store } from "../../../../server/runtime";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const item = readEvidence(store, (await context.params).id);
  if (!item) return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  const image = item.kind.startsWith("screenshot");
  return new NextResponse(new Uint8Array(item.content), { headers: {
    "Content-Type": image ? "image/png" : "text/plain; charset=utf-8",
    "X-Content-SHA256": item.sha256,
    "Cache-Control": "no-store"
  } });
}
