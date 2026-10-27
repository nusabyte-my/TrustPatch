import { NextResponse } from "next/server";
import { createAndExecuteRun } from "../../../server/run.js";

export async function POST(request: Request) {
  try {
    const run = await createAndExecuteRun(await request.json());
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create run" }, { status: 400 });
  }
}
