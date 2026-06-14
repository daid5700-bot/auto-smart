import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/sales — list vehicles
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const branchId = getActiveBranchId();

  const where: any = {};
  if (branchId) where.branchId = branchId;
  if (search) {
    where.OR = [
      { model: { contains: search, mode: "insensitive" } },
      { vin: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;

  const vehicles = await prisma.vehicle.findMany({ where, orderBy: { createdAt: "desc" }, include: { customer: true } });

  const counts = {
    AVAILABLE: await prisma.vehicle.count({ where: { status: "AVAILABLE", ...(branchId ? { branchId } : {}) } }),
    RESERVED: await prisma.vehicle.count({ where: { status: "RESERVED", ...(branchId ? { branchId } : {}) } }),
    INCOMING: await prisma.vehicle.count({ where: { status: "INCOMING", ...(branchId ? { branchId } : {}) } }),
    SOLD: await prisma.vehicle.count({ where: { status: "SOLD", ...(branchId ? { branchId } : {}) } }),
  };

  return NextResponse.json({ vehicles, counts });
}

// POST /api/sales — add vehicle
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchId = getActiveBranchId();
    const vehicle = await prisma.vehicle.create({
      data: {
        ...body,
        branchId,
      },
    });
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
