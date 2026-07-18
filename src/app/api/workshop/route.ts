export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { requireAuth } from "@/lib/guard";

const serializeRepairOrder = (ro: any) => {
  if (!ro) return null;
  return {
    ...ro,
    laborCost: Number(ro.laborCost || 0),
    partsCost: Number(ro.partsCost || 0),
    discountAmount: Number(ro.discountAmount || 0),
    totalAmount: Number(ro.totalAmount || 0),
    paidAmount: Number(ro.paidAmount || 0),
    debtAmount: Number(ro.debtAmount || 0),
    items: ro.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.totalPrice || 0)
    })) || []
  };
};

// GET /api/workshop — list repair orders + technicians
export async function GET(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  const branchId = getActiveBranchId();
  const { searchParams } = req.nextUrl;
  
  const customerId = searchParams.get("customerId");
  
  // Pagination params
  const defaultLimit = customerId ? "1000" : "100";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") || defaultLimit)));
  const skip = (page - 1) * limit;

  const activeOnly = searchParams.get("activeOnly") === "true";
  const search = searchParams.get("search") || "";

  const whereClause: any = {
    isDeleted: false,
    ...(branchId ? { branchId } : {}),
  };

  if (customerId) {
    whereClause.customerId = parseInt(customerId);
  }

  if (activeOnly) {
    whereClause.status = { not: "DELIVERED" };
  }

  if (search) {
    whereClause.OR = [
      { plateNumber: { contains: search, mode: "insensitive" } },
      { vehicleModel: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { customer: { phone: { contains: search } } },
    ];
    if (/^\d+$/.test(search.trim())) {
      whereClause.OR.push({ id: parseInt(search.trim(), 10) });
    }
  }

  // Date range filter
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  if (dateFrom || dateTo) {
    whereClause.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) } : {}),
    };
  }

  // Run independent queries in parallel for speed
  const [repairOrders, totalROs, technicians] = await Promise.all([
    prisma.repairOrder.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { customer: true, technician: true, items: { include: { product: true } } },
    }),
    prisma.repairOrder.count({
      where: whereClause,
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

  const serializedROs = repairOrders.map(serializeRepairOrder);
  return NextResponse.json({ 
    repairOrders: serializedROs, 
    technicians: enrichedTechs,
    pagination: { total: totalROs, page, limit, totalPages: Math.ceil(totalROs / limit) }
  });
}

// POST /api/workshop — create repair order
export async function POST(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const branchId = getActiveBranchId();
    let customerId = body.customerId ? Number(body.customerId) : null;

    // The inline workshop form can create a new customer when no existing
    // customer is selected.
    if (!customerId && body.customerName && body.customerPhone) {
      const phone = String(body.customerPhone).trim();
      const name = String(body.customerName).trim();
      const existingCustomer = await prisma.customer.findUnique({ where: { phone } });

      if (existingCustomer) {
        customerId = existingCustomer.id;
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name,
            ...(branchId && !existingCustomer.branchId ? { branchId } : {}),
          },
        });
      } else {
        const newCustomer = await prisma.customer.create({
          data: {
            name,
            phone,
            branchId,
            vehiclePlates: body.plateNumber ? [body.plateNumber] : [],
          },
        });
        customerId = newCustomer.id;
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "Vui lòng chọn khách hàng hoặc nhập tên và số điện thoại khách hàng mới." },
        { status: 400 },
      );
    }

    const ro = await prisma.repairOrder.create({
      data: {
        customerId,
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

    return NextResponse.json(serializeRepairOrder(ro), { status: 201 });
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
