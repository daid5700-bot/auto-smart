export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// GET /api/workshop — list repair orders + technicians
export async function GET(req: NextRequest) {
  const branchId = getActiveBranchId();
  const { searchParams } = req.nextUrl;
  
  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const skip = (page - 1) * limit;

  // Run independent queries in parallel for speed
  const [repairOrders, totalROs, technicians] = await Promise.all([
    prisma.repairOrder.findMany({
      where: {
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { customer: true, technician: true, items: { include: { product: true } } },
    }),
    prisma.repairOrder.count({
      where: {
        isDeleted: false,
        ...(branchId ? { branchId } : {}),
      },
    }),
    prisma.technician.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: { repairOrders: true }
        },
      },
    })
  ]);

  // Enrich technicians with totals
  const enrichedTechs = technicians.map((t: any) => ({
    ...t,
    completedOrders: t._count.repairOrders,
  }));

  return NextResponse.json({ 
    repairOrders, 
    technicians: enrichedTechs,
    pagination: { total: totalROs, page, limit, totalPages: Math.ceil(totalROs / limit) }
  });
}

// POST /api/workshop — create repair order
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchId = getActiveBranchId();
    const ro = await prisma.repairOrder.create({
      data: {
        customerId: body.customerId,
        plateNumber: body.plateNumber,
        vehicleModel: body.vehicleModel,
        kmIn: body.kmIn || 0,
        symptoms: body.symptoms,
        photos: body.photos || [],
        status: body.status || "DOING",
        technicianId: body.technicianId,
        createdById: body.createdById,
        laborCost: body.laborCost || 0,
        partsCost: body.partsCost || 0,
        totalAmount: (body.laborCost || 0) + (body.partsCost || 0),
        branchId,
      },
      include: { customer: true, technician: true },
    });

    // Update technician status
    if (body.technicianId) {
      await prisma.technician.update({ where: { id: body.technicianId }, data: { status: "WORKING" } });
    }

    return NextResponse.json(ro, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DEPRECATED: PATCH /api/workshop — This endpoint was removed because it bypassed loyalty points,
// totalSpent calculation, and ZNS sending logic.
// All status/cost updates MUST go through PATCH /api/workshop/[id] which contains the full business logic.
export async function PATCH(req: NextRequest) {
  return NextResponse.json(
    {
      error: "Endpoint này đã bị loại bỏ. Vui lòng sử dụng PATCH /api/workshop/[id] thay thế.",
      hint: "Use PATCH /api/workshop/{id} with full body including status, laborCost, partsCost."
    },
    { status: 410 } // 410 Gone — intentionally removed
  );
}
