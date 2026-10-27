import { NextResponse } from "next/server";
import { planConsole } from "../../../../server/console";

export async function POST(request: Request) {
  try { return NextResponse.json({ plan: planConsole(await request.json()) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not plan target instruction" }, { status: 400 }); }
}
