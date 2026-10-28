import { NextResponse } from "next/server";
import { integrationStatus } from "../../../server/integrations";

export async function GET() {
  return NextResponse.json(await integrationStatus(), { headers: { "Cache-Control": "no-store" } });
}
