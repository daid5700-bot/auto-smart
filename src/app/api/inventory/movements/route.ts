import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type") || undefined;
    const branchId = getActiveBranchId();

    const where: any = {};
    if (type) where.type = type;
    if (branchId) {
      where.product = { branchId };
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ movements });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
