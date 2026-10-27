import { NextResponse } from "next/server";
import { createBulk } from "../../../server/bulk";

export async function POST(request: Request) {
  try { return NextResponse.json({ job: createBulk(await request.json()) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create bulk audit" }, { status: 400 }); }
}
