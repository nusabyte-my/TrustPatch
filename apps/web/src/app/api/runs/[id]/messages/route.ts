import { NextResponse } from "next/server";
import { messageRun } from "../../../../../server/run.js";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json() as { message?: string };
    if (!body.message?.trim()) return NextResponse.json({ error: "message required" }, { status: 400 });
    return NextResponse.json({ run: await messageRun((await context.params).id, body.message.trim()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Message failed" }, { status: 400 });
  }
}
