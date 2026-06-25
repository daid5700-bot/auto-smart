export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  try {
    const branchId = getActiveBranchId();
    console.log("[DEBUG] /api/technicians: branchId from cookies =", branchId);
    
    const dbCount = await prisma.technician.count();
    console.log("[DEBUG] /api/technicians: total technicians in DB =", dbCount);

    const technicians = await prisma.technician.findMany({
      where: (branchId ? { branchId } : {}) as any,
      orderBy: { code: "asc" },
      include: {
        _count: { select: { repairOrders: true } },
        performances: { select: { commissionAmount: true } },
      },
    });

    console.log(`[DEBUG] /api/technicians: found ${technicians.length} technicians for branchId ${branchId}`);

    const enriched = technicians.map((t: any) => ({
      ...t,
      completedOrders: t._count?.repairOrders || 0,
      totalCommission: (t.performances || []).reduce((sum: number, p: any) => sum + Number(p.commissionAmount), 0),
    }));

    return NextResponse.json({ 
      technicians: enriched,
      debug: {
        branchId,
        totalInDb: dbCount,
        returnedCount: enriched.length
      }
    });
  } catch (error: any) {
    console.error("[DEBUG] /api/technicians error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchId = getActiveBranchId();
    const tech = await prisma.technician.create({
      data: {
        code: body.code,
        name: body.name,
        phone: body.phone,
        commissionRate: body.commissionRate || 10,
        status: "IDLE",
        branchId,
      } as any,
    });
    return NextResponse.json(tech, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
