import { NextResponse } from "next/server";
import { getRunView } from "@trustpatch/core";
import { store } from "../../../../../../../server/runtime";
import { createFindingReport } from "../../../../../../../server/finding-report";

export async function GET(request: Request, context: { params: Promise<{ id: string; findingId: string }> }) {
  try {
    const { id, findingId } = await context.params;
    const run = getRunView(store, id);
    const finding = run.proof?.findings.find((item) => item.id === findingId);
    if (!finding) return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    const content = await createFindingReport(run, finding, new URL(request.url).origin);
    return new NextResponse(new Uint8Array(content), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="trustpatch-rca-${finding.kind}-${findingId.slice(-8)}.pdf"`,
      "Cache-Control": "no-store"
    } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not generate report" }, { status: 400 });
  }
}
