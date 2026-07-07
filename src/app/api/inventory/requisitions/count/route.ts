export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getActiveBranchId } from "@/lib/branch";
import { getPendingRequisitionCount } from "@/lib/requisition-events";

export async function GET() {
  const branchId = getActiveBranchId();
  if (!branchId) {
    return NextResponse.json({ error: "Không xác định được chi nhánh hiện tại" }, { status: 400 });
  }

  try {
    const count = await getPendingRequisitionCount(branchId);
    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
