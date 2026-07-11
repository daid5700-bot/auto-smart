export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { notifyRequisitionCountChanged } from "@/lib/requisition-events";

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
  const saleType = searchParams.get("saleType") || "";

  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const branchId = getActiveBranchId();

  const where: any = {};
  if (branchId) where.branchId = branchId;
  if (saleType) where.saleType = saleType;
  const customerId = searchParams.get("customerId");
  if (customerId) where.customerId = parseInt(customerId);
  if (search) {
    where.OR = [
      { model: { contains: search, mode: "insensitive" } },
      { vin: { contains: search, mode: "insensitive" } },
    ];
    if (/^\d+$/.test(search.trim())) {
      where.OR.push({ id: parseInt(search.trim(), 10) });
    }
  }
  if (status) {
    if (status.includes(",")) {
      where.status = { in: status.split(",") };
    } else {
      where.status = status;
    }
  } else {
    where.status = { not: "CANCELLED" };
  }

  // Run heavy queries in parallel
  const [vehicles, total, countAvailable, countReserved, countIncoming, countSold, remainingStats] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        customer: true,
        partsRequisitions: {
          where: { reason: { contains: "tặng phụ tùng", mode: "insensitive" }, status: { in: ["PENDING", "APPROVED"] } },
          include: {
            items: {
              include: { product: true }
            }
          }
        }
      }
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
        importPrice: true
      }
    })
  ]);

  const vins = vehicles.map(v => v.vin).filter(Boolean) as string[];
  const vehicleIds = vehicles.map(v => v.id);
  const exportedOrders = await prisma.inventoryOrder.findMany({
    where: {
      OR: [
        { vehicleId: { in: vehicleIds } },
        { reason: { in: vins.map((vin: string) => `Xuất phụ kiện bán kèm xe VIN: ${vin}`) } }
      ],
      createdBy: "Hệ thống (Bán Xe)"
    },
    select: { vehicleId: true, reason: true, status: true }
  });

  const exportStatusById = new Map<number, string>();
  exportedOrders.forEach(o => {
    let vId = o.vehicleId;
    if (!vId && o.reason) {
      const match = o.reason.match(/Xuất phụ kiện bán kèm xe VIN:\s*(.+)$/);
      if (match) {
        const vin = match[1].trim();
        const v = vehicles.find(vh => vh.vin === vin);
        if (v) vId = v.id;
      }
    }
    if (vId) {
      // PAID > PENDING > CANCELLED priority
      const current = exportStatusById.get(vId);
      if (!current || current === "CANCELLED" || (current === "PENDING" && o.status === "PAID")) {
        exportStatusById.set(vId, o.status);
      }
    }
  });



  const vehiclesWithExportStatus = vehicles.map(v => ({
    ...v,
    accessoriesExportStatus: exportStatusById.get(v.id) || "NONE",
    accessoriesExported: exportStatusById.get(v.id) === "PAID"
  }));

  const counts = {
    AVAILABLE: countAvailable,
    RESERVED: countReserved,
    INCOMING: countIncoming,
    SOLD: countSold,
    remainingCount: countAvailable + countReserved + countIncoming,
    remainingListValue: Number(remainingStats._sum.listPrice || 0),
    remainingImportValue: Number(remainingStats._sum.importPrice || 0),
  };

  return NextResponse.json({
    vehicles: vehiclesWithExportStatus,
    counts,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
  });
}
// POST /api/sales — add vehicle with linked customer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("POST /api/sales body:", body);
    const branchId = body.branchId !== undefined ? (body.branchId ? Number(body.branchId) : null) : getActiveBranchId();



    const {
      vin, sku, engineNumber, importPrice, importDate, stockCount, warehouse,
      model, variant, color, year, status, listPrice, floorPrice, image,
      bankStatus, plateStatus, plateCost, accessoriesJson, notes, saleType,
      customerName, customerPhone, customerBirthday
    } = body;

    if (vin && vin.trim() !== "") {
      const existingActive = await prisma.vehicle.findFirst({
        where: {
          vin: vin.trim(),
          status: { not: "CANCELLED" }
        }
      });
      if (existingActive) {
        return NextResponse.json({ error: `Số khung (VIN) '${vin.trim()}' đã tồn tại trên một xe khác đang hoạt động trong hệ thống.` }, { status: 400 });
      }
    }

    let customerId: number | null = null;
    if (customerPhone && customerName) {
      const customer = await getOrCreateCustomer(customerName, customerPhone, customerBirthday, branchId);
      if (customer) {
        customerId = customer.id;
      }
    }

    const parsedListPrice = Number(listPrice) || 0;
    const parsedPlateCost = plateCost !== undefined ? Number(plateCost) : 0;
    const accessories = JSON.parse(accessoriesJson || "[]");
    const accCost = accessories.reduce((acc: number, curr: any) => acc + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
    const initialDebtAmount = parsedListPrice + parsedPlateCost + accCost;

    let pendingExportBranchId: number | null | undefined = null;

    const vehicle = await prisma.$transaction(async (tx) => {
      const v = await tx.vehicle.create({
        data: {
          vin: vin && vin.trim() !== "" ? vin.trim() : `VIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          sku: sku || null,
          engineNumber: engineNumber || null,
          importPrice: importPrice !== undefined && importPrice !== "" ? Number(importPrice) : 0,
          importDate: importDate ? new Date(importDate) : new Date(),
          stockCount: stockCount || null,
          model: model && model.trim() !== "" ? model.trim() : "Chưa rõ",
          variant: variant || null,
          color: color || null,
          year: Number(year) || new Date().getFullYear(),
          status: status || "AVAILABLE",
          listPrice: parsedListPrice,
          floorPrice: Number(floorPrice) || 0,
          image: image || null,
          bankStatus: bankStatus || "NONE",
          plateStatus: plateStatus || "PENDING",
          plateCost: parsedPlateCost,
          accessoriesJson: accessoriesJson || "[]",
          debtAmount: initialDebtAmount,
          notes: notes || null,
          warehouse: warehouse || null,
          saleType: saleType || "RETAIL",
          customerId,
          branchId,
        } as any,
        include: { customer: true }
      });

      if (customerId && ["RESERVED", "SOLD"].includes(v.status)) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalDebt: { increment: v.debtAmount.toNumber() },
            totalSpent: { increment: v.paidAmount.toNumber() }
          }
        });
      }

      // Automatically request accessory export if there are any accessories
      if (accessories.length > 0) {
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const orderCode = `PKX-${dateStr}-${randomStr}`;

        const pendingOrder = await tx.inventoryOrder.create({
          data: {
            code: orderCode,
            customerId: customerId,
            type: "EXPORT_RETAIL",
            totalAmount: accCost,
            paidAmount: accCost,
            debtAmount: 0,
            status: "PENDING",
            reason: `Xuất phụ kiện bán kèm xe VIN: ${v.vin}`,
            branchId: branchId,
            createdBy: "Hệ thống (Bán Xe)",
          }
        });
        pendingExportBranchId = pendingOrder.branchId;
      }

      // Xử lý quà tặng phụ tùng
      const giftItems = body.giftItemsJson ? JSON.parse(body.giftItemsJson) : [];
      if (giftItems.length > 0 && branchId) {
        await tx.partsRequisition.create({
          data: {
            vehicleId: v.id,
            branchId: branchId,
            status: "PENDING",
            reason: `Quà tặng phụ tùng bán xe VIN: ${v.vin}`,
            createdBy: "Hệ thống (Bán Xe)",
            items: {
              create: giftItems.map((item: any) => ({
                productId: Number(item.productId || item.id),
                quantity: Number(item.quantity)
              }))
            }
          }
        });
        
        for (const item of giftItems) {
          await tx.productBranch.updateMany({
            where: { productId: Number(item.productId || item.id), branchId },
            data: { reservedStock: { increment: Number(item.quantity) || 1 } }
          });
        }
        
        pendingExportBranchId = branchId;
      }

      return v;
    });

    notifyRequisitionCountChanged(pendingExportBranchId);

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/sales error details:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
