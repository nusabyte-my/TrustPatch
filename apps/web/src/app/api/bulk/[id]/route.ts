import { NextResponse } from "next/server";
import { readBulk } from "../../../../server/bulk";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json({ job: readBulk((await context.params).id) }); }
  catch { return NextResponse.json({ error: "Bulk audit not found" }, { status: 404 }); }
}
