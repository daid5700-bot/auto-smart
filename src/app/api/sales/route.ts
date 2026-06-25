export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// Helper to find or upsert a Customer
async function getOrCreateCustomer(name: string, phone: string, birthdayStr?: string, branchId?: number | null) {
  if (!phone || !name) return null;
  
  let birthday: Date | null = null;
  if (birthdayStr) {
    birthday = new Date(birthdayStr);
  }

  const existing = await prisma.customer.findUnique({
    where: { phone }
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name,
        ...(birthday ? { birthday } : {})
      }
    });
  } else {
    return prisma.customer.create({
      data: {
        name,
        phone,
        source: "WALKIN",
        birthday,
        branchId
      }
    });
  }
}

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
  const [vehicles, total, countAvailable, countReserved, countIncoming, countSold, remainingStats] = await Promise.all([
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
    prisma.vehicle.aggregate({
      where: {
        status: { in: ["AVAILABLE", "RESERVED", "INCOMING"] },
        ...(branchId ? { branchId } : {})
      },
      _sum: {
        listPrice: true,
        floorPrice: true
      }
    })
  ]);

  const counts = {
    AVAILABLE: countAvailable,
    RESERVED: countReserved,
    INCOMING: countIncoming,
    SOLD: countSold,
    remainingCount: countAvailable + countReserved + countIncoming,
    remainingListValue: Number(remainingStats._sum.listPrice || 0),
    remainingFloorValue: Number(remainingStats._sum.floorPrice || 0),
  };

  return NextResponse.json({ 
    vehicles, 
    counts, 
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } 
  });
}
// POST /api/sales — add vehicle with linked customer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchId = getActiveBranchId();
    
    const { 
      vin, model, variant, color, year, status, listPrice, floorPrice, image,
      bankStatus, plateStatus, plateCost, accessoriesJson, notes,
      customerName, customerPhone, customerBirthday
    } = body;

    let customerId: number | null = null;
    if (customerPhone && customerName) {
      const customer = await getOrCreateCustomer(customerName, customerPhone, customerBirthday, branchId);
      if (customer) {
        customerId = customer.id;
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        vin,
        model,
        variant: variant || null,
        color: color || null,
        year: Number(year) || new Date().getFullYear(),
        status: status || "AVAILABLE",
        listPrice: Number(listPrice) || 0,
        floorPrice: Number(floorPrice) || 0,
        image: image || null,
        bankStatus: bankStatus || "NONE",
        plateStatus: plateStatus || "PENDING",
        plateCost: plateCost !== undefined ? Number(plateCost) : 0,
        accessoriesJson: accessoriesJson || "[]",
        notes: notes || null,
        customerId,
        branchId,
      },
      include: { customer: true }
    });
    
    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
