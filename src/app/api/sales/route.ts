export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { notifyRequisitionCountChanged } from "@/lib/requisition-events";
import { requireAuth } from "@/lib/guard";
import { getOrCreateCustomerForBranch } from "@/lib/customer-branch";
import { handleApiError, parseJson } from "@/lib/api-response";
import { createVehicleSchema } from "@/lib/validation/sales";
import { parseItemArray } from "@/lib/sales/vehicle-update";
import { Prisma } from "@prisma/client";
import { parseAppDateRange } from "@/lib/date-range";

// GET /api/sales — list vehicles
export async function GET(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const saleType = searchParams.get("saleType") || "";
  const color = searchParams.get("color") || "";
  const plateStatus = searchParams.get("plateStatus") || "";
  const hasPlateService = searchParams.get("hasPlateService") || "";
  const discountFilter = searchParams.get("discount") || "";

  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const branchId = await getActiveBranchId();

  const where: any = {};
  if (branchId) where.branchId = branchId;
  if (saleType) where.saleType = saleType;
  if (color) where.color = color;
  if (hasPlateService === "true" || hasPlateService === "false") {
    where.hasPlateService = hasPlateService === "true";
  }
  if (plateStatus) {
    if (plateStatus === "PENDING") {
      where.OR = [{ plateStatus: "PENDING" }, { plateStatus: null }];
    } else {
      where.plateStatus = plateStatus;
    }
  }
  if (discountFilter === "ANY") {
    where.discountAmount = { gt: 0 };
  } else if (discountFilter === "NONE") {
    where.discountAmount = { lte: 0 };
  } else if (/^\d+$/.test(discountFilter)) {
    where.discountCodeId = Number(discountFilter);
  }
  const customerId = searchParams.get("customerId");
  if (customerId) where.customerId = parseInt(customerId);
  if (search) {
    const trimmed = search.trim();
    const keywords = trimmed.split(/\s+/).filter(Boolean);
    if (keywords.length > 0) {
      where.AND = keywords.map(keyword => {
        const keywordOr: any[] = [
          { model: { contains: keyword, mode: "insensitive" } },
          { vin: { contains: keyword, mode: "insensitive" } },
          { variant: { contains: keyword, mode: "insensitive" } },
          { engineNumber: { contains: keyword, mode: "insensitive" } },
          { customer: { name: { contains: keyword, mode: "insensitive" } } },
          { customer: { phone: { contains: keyword } } },
        ];

        if (/^\d+$/.test(keyword)) {
          keywordOr.push({ id: parseInt(keyword, 10) });
        }
        return { OR: keywordOr };
      });
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

  // Date range filter
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const { startDate, endDate } = parseAppDateRange(dateFrom, dateTo);
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
  }

  const includeCounts = searchParams.get("includeCounts") !== "false";
  const countConditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (branchId) countConditions.push(Prisma.sql`v."branchId" = ${branchId}`);
  if (color) countConditions.push(Prisma.sql`v."color" = ${color}`);
  if (hasPlateService === "true" || hasPlateService === "false") {
    countConditions.push(
      Prisma.sql`v."hasPlateService" = ${hasPlateService === "true"}`,
    );
  }
  if (plateStatus === "PENDING") {
    countConditions.push(Prisma.sql`COALESCE(v."plateStatus", 'PENDING') = 'PENDING'`);
  } else if (plateStatus) {
    countConditions.push(Prisma.sql`v."plateStatus" = ${plateStatus}`);
  }
  if (customerId) countConditions.push(Prisma.sql`v."customerId" = ${Number(customerId)}`);
  if (discountFilter === "ANY") {
    countConditions.push(Prisma.sql`v."discountAmount" > 0`);
  } else if (discountFilter === "NONE") {
    countConditions.push(Prisma.sql`v."discountAmount" <= 0`);
  } else if (/^\d+$/.test(discountFilter)) {
    countConditions.push(Prisma.sql`v."discountCodeId" = ${Number(discountFilter)}`);
  }
  if (status) {
    const statuses = status.split(",").filter(Boolean);
    countConditions.push(Prisma.sql`v."status" IN (${Prisma.join(statuses)})`);
  } else {
    countConditions.push(Prisma.sql`v."status" <> 'CANCELLED'`);
  }
  if (startDate) countConditions.push(Prisma.sql`v."createdAt" >= ${startDate}`);
  if (endDate) countConditions.push(Prisma.sql`v."createdAt" <= ${endDate}`);
  for (const keyword of search.trim().split(/\s+/).filter(Boolean)) {
    const pattern = `%${keyword}%`;
    const numericId = /^\d+$/.test(keyword) ? Number(keyword) : -1;
    countConditions.push(Prisma.sql`(
      v."model" ILIKE ${pattern}
      OR v."vin" ILIKE ${pattern}
      OR COALESCE(v."variant", '') ILIKE ${pattern}
      OR COALESCE(v."engineNumber", '') ILIKE ${pattern}
      OR COALESCE(c."name", '') ILIKE ${pattern}
      OR COALESCE(c."phone", '') ILIKE ${pattern}
      OR v."id" = ${numericId}
    )`);
  }

  const countsPromise = includeCounts
    ? prisma.$queryRaw<Array<{ retailCount: number; wholesaleCount: number }>>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (
            WHERE COALESCE(v."saleType", 'RETAIL') = 'RETAIL'
          )::integer AS "retailCount",
          COUNT(DISTINCT CASE
            WHEN v."saleType" = 'WHOLESALE' THEN
              CASE
                WHEN v."customerId" IS NULL THEN 'v_' || v."id"::text
                ELSE v."customerId"::text || '_' ||
                  TO_CHAR(v."updatedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')
              END
            ELSE NULL
          END)::integer AS "wholesaleCount"
        FROM "Vehicle" v
        LEFT JOIN "Customer" c ON c."id" = v."customerId"
        WHERE ${Prisma.join(countConditions, " AND ")}
      `)
    : Promise.resolve(null);

  // Run heavy queries in parallel
  const [vehicles, total, statusGroups, colorsGroup, countSummary] = await Promise.all([
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
    prisma.vehicle.groupBy({
      by: ["status"],
      where: branchId ? { branchId } : {},
      _count: {
        id: true
      },
      _sum: {
        listPrice: true,
        importPrice: true
      }
    }),
    prisma.vehicle.groupBy({
      by: ["color"],
      where: {
        color: { not: null },
        status: { not: "CANCELLED" },
        ...(branchId ? { branchId } : {}),
      }
    }),
    countsPromise,
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

  let countAvailable = 0;
  let countReserved = 0;
  let countIncoming = 0;
  let countSold = 0;
  let remainingListValue = 0;
  let remainingImportValue = 0;

  statusGroups.forEach(group => {
    const count = group._count.id || 0;
    const listPriceSum = Number(group._sum.listPrice || 0);
    const importPriceSum = Number(group._sum.importPrice || 0);

    if (group.status === "AVAILABLE") {
      countAvailable = count;
      remainingListValue += listPriceSum;
      remainingImportValue += importPriceSum;
    } else if (group.status === "RESERVED") {
      countReserved = count;
      remainingListValue += listPriceSum;
      remainingImportValue += importPriceSum;
    } else if (group.status === "INCOMING") {
      countIncoming = count;
      remainingListValue += listPriceSum;
      remainingImportValue += importPriceSum;
    } else if (group.status === "SOLD") {
      countSold = count;
    }
  });

  const counts = {
    AVAILABLE: countAvailable,
    RESERVED: countReserved,
    INCOMING: countIncoming,
    SOLD: countSold,
    remainingCount: countAvailable + countReserved + countIncoming,
    remainingListValue,
    remainingImportValue,
  };

  const uniqueColors = colorsGroup.map(g => g.color).filter(Boolean) as string[];

  const serializedVehicles = vehiclesWithExportStatus.map((v: any) => ({
    ...v,
    importPrice: v.importPrice ? Number(v.importPrice) : null,
    listPrice: v.listPrice ? Number(v.listPrice) : 0,
    originalListPrice: v.originalListPrice === null ? null : Number(v.originalListPrice),
    floorPrice: v.floorPrice ? Number(v.floorPrice) : 0,
    discountAmount: Number(v.discountAmount || 0),
    appliedDiscountValue: Number(v.appliedDiscountValue || 0),
    appliedDiscountMaxAmount:
      v.appliedDiscountMaxAmount === null
        ? null
        : Number(v.appliedDiscountMaxAmount),
    paidAmount: v.paidAmount ? Number(v.paidAmount) : 0,
    debtAmount: v.debtAmount ? Number(v.debtAmount) : 0,
    plateCost: v.plateCost ? Number(v.plateCost) : null,
    partsRequisitions: v.partsRequisitions?.map((pr: any) => ({
      ...pr,
      items: pr.items?.map((item: any) => ({
        ...item,
        quantity: Number(item.quantity)
      })) || []
    })) || []
  }));

  const retailCount = countSummary?.[0]?.retailCount;
  const wholesaleCount = countSummary?.[0]?.wholesaleCount;

  return NextResponse.json({
    vehicles: serializedVehicles,
    counts,
    uniqueColors,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    ...(retailCount !== undefined ? { retailCount } : {}),
    ...(wholesaleCount !== undefined ? { wholesaleCount } : {}),
  });
}
// POST /api/sales — add vehicle with linked customer
export async function POST(req: NextRequest) {
  const guard = await requireAuth(req, ["ADMIN", "SALES"]);
  if (!guard.ok) return guard.response;

  try {
    const body = await parseJson(req, createVehicleSchema);
    const branchId = await getActiveBranchId();
    if (!branchId) {
      return NextResponse.json({ error: "Không xác định được cơ sở hiện tại." }, { status: 400 });
    }

    const {
      vin, sku, engineNumber, importPrice, importDate, stockCount, warehouse,
      model, variant, color, year, status, listPrice, floorPrice, image,
      bankStatus, plateStatus, hasPlateService, plateCost, accessoriesJson, notes, saleType,
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
        const message = `Số khung (VIN) '${vin.trim()}' đã tồn tại trên một xe khác đang hoạt động trong hệ thống.`;
        return NextResponse.json({ error: message, code: "VIN_DUPLICATE", fields: { vin: [message] } }, { status: 400 });
      }
    }

    let customerId: number | null = null;
    if (customerPhone && customerName) {
      const customer = await getOrCreateCustomerForBranch({
        name: customerName,
        phone: customerPhone,
        birthday: customerBirthday,
        branchId,
      });
      if (customer) {
        customerId = customer.id;
      }
    }

    const parsedListPrice = Number(listPrice) || 0;
    const parsedPlateCost = plateCost !== undefined ? Number(plateCost) : 0;
    const accessories = parseItemArray(accessoriesJson || "[]");
    const normalizedAccessoriesJson = JSON.stringify(accessories);
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
          hasPlateService: Boolean(hasPlateService),
          plateCost: parsedPlateCost,
          accessoriesJson: normalizedAccessoriesJson,
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
            vehicleId: v.id,
          }
        });
        pendingExportBranchId = pendingOrder.branchId;
      }

      // Xử lý quà tặng phụ tùng
      const giftItems = parseItemArray(body.giftItemsJson || "[]");
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

    const serializedVehicle = {
      ...vehicle,
      importPrice: vehicle.importPrice ? Number(vehicle.importPrice) : null,
      listPrice: vehicle.listPrice ? Number(vehicle.listPrice) : 0,
      floorPrice: vehicle.floorPrice ? Number(vehicle.floorPrice) : 0,
      paidAmount: vehicle.paidAmount ? Number(vehicle.paidAmount) : 0,
      debtAmount: vehicle.debtAmount ? Number(vehicle.debtAmount) : 0,
      plateCost: vehicle.plateCost ? Number(vehicle.plateCost) : null
    };

    return NextResponse.json(serializedVehicle, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, "API_SALES_CREATE", "Không thể tạo hồ sơ xe");
  }
}
