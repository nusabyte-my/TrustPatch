import { NextResponse } from "next/server";
import { z } from "zod";
import { getRunView } from "@trustpatch/core";
import { store } from "../../../../../../../server/runtime";
import { sendFindingEmail } from "../../../../../../../server/finding-email";

const recipientSchema = z.object({ email: z.email(), confirmed: z.literal(true) });
export async function POST(request: Request, context: { params: Promise<{ id: string; findingId: string }> }) {
  try {
    const input = recipientSchema.parse(await request.json());
    const { id, findingId } = await context.params;
    const run = getRunView(store, id);
    const finding = run.proof?.findings.find((item) => item.id === findingId);
    if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    const result = await sendFindingEmail(run, finding, input.email, new URL(request.url).origin);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not prepare email report" }, { status: 400 });
  }
}
