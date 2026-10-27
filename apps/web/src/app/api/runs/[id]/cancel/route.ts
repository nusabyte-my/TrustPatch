import { NextResponse } from "next/server";
import { cancelRun } from "../../../../../server/run.js";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ run: await cancelRun((await context.params).id) });
}
