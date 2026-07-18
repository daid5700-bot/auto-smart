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

// Helper to expand unaccented Vietnamese search terms
function expandVietnameseKeyword(keyword: string): string[] {
  const lower = keyword.toLowerCase();
  const variants = new Set<string>([keyword, lower]);

  // If the word does not contain any transformable characters, return early
  if (!/[aadeiouydăâêôơưđ]/.test(lower)) {
    return Array.from(variants);
  }

  // Character replacement groups for Vietnamese accents and casing
  const charGroups: Record<string, string[]> = {
    'a': ['a', 'á', 'à', 'ả', 'ã', 'ạ', 'ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ', 'â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ', 'A', 'Á', 'À', 'Ả', 'Ã', 'Ạ', 'Ă', 'Ắ', 'Ằ', 'Ẳ', 'Ẵ', 'Ặ', 'Â', 'Ấ', 'Ầ', 'Ẩ', 'Ẫ', 'Ậ'],
    'e': ['e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ế', 'ề', 'ể', 'ễ', 'ệ', 'E', 'É', 'È', 'Ẻ', 'Ẽ', 'Ẹ', 'Ê', 'Ế', 'Ề', 'Ể', 'Ễ', 'Ệ'],
    'i': ['i', 'í', 'ì', 'ỉ', 'ĩ', 'ị', 'I', 'Í', 'Ì', 'Ỉ', 'Ĩ', 'Ị'],
    'o': ['o', 'ó', 'ò', 'ỏ', 'õ', 'ọ', 'ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ', 'ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ', 'O', 'Ó', 'Ò', 'Ỏ', 'Õ', 'Ọ', 'Ô', 'Ố', 'Ồ', 'Ổ', 'Ỗ', 'Ộ', 'Ơ', 'Ớ', 'Ờ', 'Ở', 'Ỡ', 'Ợ'],
    'u': ['u', 'ú', 'ù', 'ủ', 'ũ', 'ụ', 'ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự', 'U', 'Ú', 'Ù', 'Ủ', 'Ũ', 'Ụ', 'Ư', 'Ứ', 'Ừ', 'Ử', 'Ữ', 'Ự'],
    'y': ['y', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ', 'Y', 'Ý', 'Ỳ', 'Ỷ', 'Ỹ', 'Ỵ'],
    'd': ['d', 'đ', 'D', 'Đ'],
    'đ': ['d', 'đ', 'D', 'Đ'],
    'ă': ['a', 'á', 'à', 'ả', 'ã', 'ạ', 'ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ', 'â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ', 'A', 'Á', 'À', 'Ả', 'Ã', 'Ạ', 'Ă', 'Ắ', 'Ằ', 'Ẳ', 'Ẵ', 'Ặ', 'Â', 'Ấ', 'Ầ', 'Ẩ', 'Ẫ', 'Ậ'],
    'â': ['a', 'á', 'à', 'ả', 'ã', 'ạ', 'ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ', 'â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ', 'A', 'Á', 'À', 'Ả', 'Ã', 'Ạ', 'Ă', 'Ắ', 'Ằ', 'Ẳ', 'Ẵ', 'Ặ', 'Â', 'Ấ', 'Ầ', 'Ẩ', 'Ẫ', 'Ậ'],
    'ê': ['e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ế', 'ề', 'ể', 'ễ', 'ệ', 'E', 'É', 'È', 'Ẻ', 'Ẽ', 'Ẹ', 'Ê', 'Ế', 'Ề', 'Ể', 'Ễ', 'Ệ'],
    'ô': ['o', 'ó', 'ò', 'ỏ', 'õ', 'ọ', 'ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ', 'ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ', 'O', 'Ó', 'Ò', 'Ỏ', 'Õ', 'Ọ', 'Ô', 'Ố', 'Ồ', 'Ổ', 'Ỗ', 'Ộ', 'Ơ', 'Ớ', 'Ờ', 'Ở', 'Ỡ', 'Ợ'],
    'ơ': ['o', 'ó', 'ò', 'ỏ', 'õ', 'ọ', 'ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ', 'ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ', 'O', 'Ó', 'Ò', 'Ỏ', 'Õ', 'Ọ', 'Ô', 'Ố', 'Ồ', 'Ổ', 'Ỗ', 'Ộ', 'Ơ', 'Ớ', 'Ờ', 'Ở', 'Ỡ', 'Ợ'],
    'ư': ['u', 'ú', 'ù', 'ủ', 'ũ', 'ụ', 'ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự', 'U', 'Ú', 'Ù', 'Ủ', 'Ũ', 'Ụ', 'Ư', 'Ứ', 'Ừ', 'Ử', 'Ữ', 'Ự'],
  };

  const baseChars = lower.split('');
  let results = [lower];

  for (let i = 0; i < baseChars.length; i++) {
    const char = baseChars[i];
    const group = charGroups[char];
    if (group) {
      const nextResults: string[] = [];
      results.forEach(r => {
        group.forEach(gChar => {
          nextResults.push(r.substring(0, i) + gChar + r.substring(i + 1));
        });
      });
      // Safety cap to avoid combinatorial explosion in database queries
      if (nextResults.length <= 150) {
        results = nextResults;
      } else {
        break;
      }
    }
  }

  results.forEach(r => variants.add(r));

  const capitalized = keyword.charAt(0).toUpperCase() + keyword.slice(1);
  variants.add(capitalized);
  variants.add(keyword.toUpperCase());

  return Array.from(variants);
}

// GET /api/sales — list vehicles
export async function GET(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const saleType = searchParams.get("saleType") || "";
  const color = searchParams.get("color") || "";

  // Pagination params
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const branchId = getActiveBranchId();

  const where: any = {};
  if (branchId) where.branchId = branchId;
  if (saleType) where.saleType = saleType;
  if (color) where.color = color;
  const customerId = searchParams.get("customerId");
  if (customerId) where.customerId = parseInt(customerId);
  if (search) {
    const trimmed = search.trim();
    const keywords = trimmed.split(/\s+/).filter(Boolean);
    if (keywords.length > 0) {
      where.AND = keywords.map(keyword => {
        const expanded = expandVietnameseKeyword(keyword);
        const keywordOr: any[] = [];

        expanded.forEach(kw => {
          keywordOr.push(
            { model: { contains: kw, mode: "insensitive" } },
            { vin: { contains: kw, mode: "insensitive" } },
            { variant: { contains: kw, mode: "insensitive" } },
            { engineNumber: { contains: kw, mode: "insensitive" } }
          );
        });

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
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) } : {}),
    };
  }

  // Run heavy queries in parallel
  const [vehicles, total, statusGroups, colorsGroup] = await Promise.all([
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
      where: { color: { not: null } }
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
    floorPrice: v.floorPrice ? Number(v.floorPrice) : 0,
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

  const countWhere = { ...where };
  delete countWhere.saleType;

  const matchingForCount = await prisma.vehicle.findMany({
    where: countWhere,
    select: {
      id: true,
      saleType: true,
      customerId: true,
      updatedAt: true
    }
  });

  const retailCount = matchingForCount.filter(v => (v.saleType || "RETAIL") === "RETAIL").length;
  const wholesaleVehicles = matchingForCount.filter(v => v.saleType === "WHOLESALE");
  const wholesaleGroups = new Set<string>();
  wholesaleVehicles.forEach(v => {
    const dateKey = v.updatedAt ? new Date(v.updatedAt).toISOString().split('T')[0] : "unknown";
    const key = v.customerId ? `${v.customerId}_${dateKey}` : `v_${v.id}`;
    wholesaleGroups.add(key);
  });
  const wholesaleCount = wholesaleGroups.size;

  return NextResponse.json({
    vehicles: serializedVehicles,
    counts,
    uniqueColors,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    retailCount,
    wholesaleCount
  });
}
// POST /api/sales — add vehicle with linked customer
export async function POST(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const body = await parseJson(req, createVehicleSchema);
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
