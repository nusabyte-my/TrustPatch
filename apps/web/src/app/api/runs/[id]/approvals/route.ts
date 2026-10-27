import { NextResponse } from "next/server";
import { approveRun } from "../../../../../server/run";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json() as { scopeDigest?: string };
    if (!body.scopeDigest) return NextResponse.json({ error: "scopeDigest required" }, { status: 400 });
    return NextResponse.json({ run: await approveRun((await context.params).id, body.scopeDigest) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 400 });
  }
}
