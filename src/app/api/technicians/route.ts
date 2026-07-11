export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function GET(req: NextRequest) {
  try {
    const branchId = getActiveBranchId();

    const technicians = await prisma.technician.findMany({
      where: (branchId ? { branchId } : {}) as any,
      orderBy: { code: "asc" },
      include: {
        _count: { select: { repairOrders: true } },
      },
    });

    const enriched = technicians.map((t: any) => ({
      ...t,
      completedOrders: t._count?.repairOrders || 0,
    }));

    return NextResponse.json({ 
      technicians: enriched,
    });
  } catch (error: any) {
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
        status: "IDLE",
        branchId,
      } as any,
    });
    return NextResponse.json(tech, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
