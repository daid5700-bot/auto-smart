import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/sales — list vehicles
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  
  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

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

  // Run heavy queries in parallel
  const [vehicles, total, countAvailable, countReserved, countIncoming, countSold] = await Promise.all([
    prisma.vehicle.findMany({ 
      where, 
      orderBy: { createdAt: "desc" }, 
      skip,
      take: limit,
      include: { customer: true } 
    }),
    prisma.vehicle.count({ where }),
    prisma.vehicle.count({ where: { status: "AVAILABLE", ...(branchId ? { branchId } : {}) } }),
    prisma.vehicle.count({ where: { status: "RESERVED", ...(branchId ? { branchId } : {}) } }),
    prisma.vehicle.count({ where: { status: "INCOMING", ...(branchId ? { branchId } : {}) } }),
    prisma.vehicle.count({ where: { status: "SOLD", ...(branchId ? { branchId } : {}) } }),
  ]);

  const counts = {
    AVAILABLE: countAvailable,
    RESERVED: countReserved,
    INCOMING: countIncoming,
    SOLD: countSold,
  };

  return NextResponse.json({ 
    vehicles, 
    counts, 
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } 
  });
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
