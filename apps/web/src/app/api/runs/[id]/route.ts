import { NextResponse } from "next/server";
import { readRun } from "../../../../server/run";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await readRun((await context.params).id)); }
  catch { return NextResponse.json({ error: "Run not found" }, { status: 404 }); }
}
