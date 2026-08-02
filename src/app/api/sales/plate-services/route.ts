import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { getActiveBranchId } from "@/lib/branch";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { parseAppDateRange } from "@/lib/date-range";
import {
  calculatePlateServiceProfit,
  exportPlateFrame,
  serializePlateService,
} from "@/lib/sales/plate-service";
import { encryptPlateServicePassword } from "@/lib/plate-service-secret";
import { createPlateServiceSchema } from "@/lib/validation/plate-service";

const serviceInclude = {
  vehicle: {
    select: {
      id: true,
      vin: true,
      model: true,
      variant: true,
      color: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
  },
  plateFrameProduct: { select: { id: true, sku: true, name: true } },
} satisfies Prisma.PlateServiceInclude;

export async function GET(req: NextRequest) {
  const guard = await requireAuth(req, ["ADMIN", "SALES"]);
  if (!guard.ok) return guard.response;

  try {
    const branchId = await getActiveBranchId();
    if (!branchId) throw new ApiError("Vui lòng chọn cơ sở hiện tại.", 400, "BRANCH_REQUIRED");

    const { searchParams } = req.nextUrl;
    const mode = searchParams.get("mode");
    const search = searchParams.get("search")?.trim() || "";

    if (mode === "eligible") {
      const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
      const vehicles = await prisma.vehicle.findMany({
        where: {
          branchId,
          hasPlateService: true,
          saleType: "RETAIL",
          status: { in: ["RESERVED", "SOLD"] },
          customerId: { not: null },
          plateService: null,
          ...(search
            ? {
                OR: [
                  { vin: { contains: search, mode: "insensitive" } },
                  { model: { contains: search, mode: "insensitive" } },
                  { customer: { name: { contains: search, mode: "insensitive" } } },
                  { customer: { phone: { contains: search } } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          vin: true,
          model: true,
          variant: true,
          color: true,
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
      return NextResponse.json({ vehicles });
    }

    if (mode === "products") {
      const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") || 20)));
      const selectedId = Number(searchParams.get("selectedId") || 0);
      const productSelect = {
        id: true,
        sku: true,
        name: true,
        productBranches: {
          where: { branchId },
          select: { stockCount: true, movingAvgCost: true },
          take: 1,
        },
      } satisfies Prisma.ProductSelect;
      const productWhere: Prisma.ProductWhereInput = {
        status: "ACTIVE",
        isDeleted: false,
        productBranches: { some: { branchId } },
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const [matches, selected] = await Promise.all([
        prisma.product.findMany({
          where: productWhere,
          select: productSelect,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          take: limit,
        }),
        selectedId > 0
          ? prisma.product.findFirst({
              where: {
                id: selectedId,
                status: "ACTIVE",
                isDeleted: false,
                productBranches: { some: { branchId } },
              },
              select: productSelect,
            })
          : Promise.resolve(null),
      ]);

      const productsById = new Map(
        [...(selected ? [selected] : []), ...matches].map((product) => [
          product.id,
          product,
        ]),
      );
      return NextResponse.json({
        products: Array.from(productsById.values()).map((product) => ({
          id: product.id,
          sku: product.sku,
          name: product.name,
          stockCount: Number(product.productBranches[0]?.stockCount || 0),
          movingAvgCost: Number(product.productBranches[0]?.movingAvgCost || 0),
        })),
      });
    }

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const status = searchParams.get("status") || "";
    const { startDate, endDate } = parseAppDateRange(
      searchParams.get("dateFrom"),
      searchParams.get("dateTo"),
    );
    const where: Prisma.PlateServiceWhereInput = {
      branchId,
      ...(status ? { status } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { registrationNumber: { contains: search, mode: "insensitive" } },
              { dossierCode: { contains: search, mode: "insensitive" } },
              { plateNumber: { contains: search, mode: "insensitive" } },
              { vehicle: { vin: { contains: search, mode: "insensitive" } } },
              { vehicle: { model: { contains: search, mode: "insensitive" } } },
              { vehicle: { customer: { name: { contains: search, mode: "insensitive" } } } },
              { vehicle: { customer: { phone: { contains: search } } } },
            ],
          }
        : {}),
    };

    const [services, statusGroups] = await Promise.all([
      prisma.plateService.findMany({
        where,
        include: serviceInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.plateService.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: { profit: true, plateFrameQuantity: true },
      }),
    ]);

    const total = statusGroups.reduce(
      (sum, item) => sum + item._count._all,
      0,
    );
    const totalProfit = statusGroups.reduce(
      (sum, item) => sum + Number(item._sum.profit || 0),
      0,
    );
    const exportedQuantity = statusGroups.reduce(
      (sum, item) => sum + Number(item._sum.plateFrameQuantity || 0),
      0,
    );
    const statusCounts = new Map(
      statusGroups.map((item) => [item.status, item._count._all]),
    );
    return NextResponse.json({
      services: services.map(serializePlateService),
      stats: {
        total,
        completed: statusCounts.get("DELIVERED_TO_CUSTOMER") || 0,
        returnedAfterTax: statusCounts.get("RETURNED_AFTER_TAX") || 0,
        totalProfit,
        exportedQuantity,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return handleApiError(error, "PLATE_SERVICE_LIST", "Không thể tải dịch vụ biển.");
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAuth(req, ["ADMIN", "SALES"]);
  if (!guard.ok) return guard.response;

  try {
    const body = await parseJson(req, createPlateServiceSchema);
    const branchId = await getActiveBranchId();
    if (!branchId) throw new ApiError("Vui lòng chọn cơ sở hiện tại.", 400, "BRANCH_REQUIRED");

    const creator = await prisma.user.findUnique({
      where: { id: guard.userId },
      select: { name: true },
    });

    const service = await prisma.$transaction(async (tx) => {
      if (!body.vehicleId) {
        throw new ApiError("Vui lòng chọn hồ sơ bán xe.", 400, "VEHICLE_REQUIRED");
      }
      const vehicle = await tx.vehicle.findFirst({
        where: {
          id: body.vehicleId,
          branchId,
          hasPlateService: true,
          saleType: "RETAIL",
          status: { in: ["RESERVED", "SOLD"] },
        },
        select: {
          id: true,
          vin: true,
          customerId: true,
          customer: { select: { id: true } },
          plateService: { select: { id: true } },
        },
      });
      if (!vehicle) {
        throw new ApiError(
          "Hồ sơ bán xe không tồn tại, không thuộc cơ sở hoặc chưa chọn dịch vụ biển.",
          400,
          "VEHICLE_NOT_ELIGIBLE",
        );
      }
      if (vehicle.plateService) {
        throw new ApiError("Hồ sơ bán xe này đã có dịch vụ biển.", 409, "PLATE_SERVICE_EXISTS");
      }

      const regNum = body.registrationNumber?.trim() || "";
      const dossierCode = body.dossierCode?.trim() || "";
      const portalPass = body.portalPassword || "";

      if (regNum || dossierCode) {
        const duplicate = await tx.plateService.findFirst({
          where: {
            branchId,
            OR: [
              ...(regNum
                ? [{
                    registrationNumber: {
                      equals: regNum,
                      mode: "insensitive" as const,
                    },
                  }]
                : []),
              ...(dossierCode
                ? [{
                    dossierCode: {
                      equals: dossierCode,
                      mode: "insensitive" as const,
                    },
                  }]
                : []),
            ],
          },
          select: { registrationNumber: true, dossierCode: true },
        });
        if (duplicate) {
          throw new ApiError(
            duplicate.registrationNumber === regNum
              ? "Số đăng ký đã tồn tại tại cơ sở này."
              : "Mã hồ sơ đã tồn tại tại cơ sở này.",
            409,
            "PLATE_SERVICE_DUPLICATE",
          );
        }
      }

      const plateFrameQuantity = Number(body.plateFrameQuantity || 0);
      let plateFrameUnitCost = 0;
      let plateFrameTotalCost = 0;
      if (body.plateFrameProductId && plateFrameQuantity > 0) {
        const snapshot = await exportPlateFrame(tx, {
          branchId,
          productId: body.plateFrameProductId,
          quantity: plateFrameQuantity,
        });
        plateFrameUnitCost = snapshot.unitCost;
        plateFrameTotalCost = snapshot.totalCost;
      }

      const profit = calculatePlateServiceProfit({
        totalRevenue: body.totalRevenue,
        registrationTax: body.registrationTax ?? 0,
        plateFee: body.plateFee ?? 0,
        policeFee: body.policeFee ?? 0,
        plateFrameTotalCost,
      });

      const created = await tx.plateService.create({
        data: {
          vehicleId: vehicle.id,
          branchId,
          registrationNumber: regNum,
          dossierCode: dossierCode,
          portalPasswordEncrypted: encryptPlateServicePassword(portalPass),
          plateNumber: body.plateNumber || null,
          totalRevenue: body.totalRevenue,
          registrationTax: body.registrationTax ?? 0,
          plateFee: body.plateFee ?? 0,
          policeFee: body.policeFee ?? 0,
          plateFrameProductId: body.plateFrameProductId || null,
          plateFrameQuantity: body.plateFrameProductId ? plateFrameQuantity : 0,
          plateFrameUnitCost,
          plateFrameTotalCost,
          profit,
          status: body.status,
          completedAt: body.status === "DELIVERED_TO_CUSTOMER" ? new Date() : null,
          notes: body.notes || null,
          createdById: guard.userId,
        },
        include: serviceInclude,
      });

      if (body.plateFrameProductId && plateFrameQuantity > 0) {
        // Tự động tạo phiếu xuất kho (InventoryOrder) - Trạng thái PAID (Hoàn thành, không cần duyệt)
        const orderCode = `PX-OB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const inventoryOrder = await tx.inventoryOrder.create({
          data: {
            code: orderCode,
            customerId: vehicle.customerId || null,
            vehicleId: vehicle.id,
            type: "EXPORT_PLATE_SERVICE",
            totalAmount: plateFrameTotalCost,
            paidAmount: plateFrameTotalCost,
            debtAmount: 0,
            status: "PAID",
            reason: `Tự động xuất ốp biển khi tạo hồ sơ dịch vụ biển (Mã HS: ${dossierCode || "N/A"} - VIN: ${vehicle.vin})`,
            branchId,
            createdBy: creator?.name || `Hệ thống (Dịch vụ biển)`,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: body.plateFrameProductId,
            inventoryOrderId: inventoryOrder.id,
            type: "EXPORT_PLATE_SERVICE",
            quantity: plateFrameQuantity,
            unitCost: plateFrameUnitCost,
            totalCost: plateFrameTotalCost,
            reason: `Xuất ốp biển cho hồ sơ ${dossierCode} - VIN ${vehicle.vin}`,
            plateServiceId: created.id,
            vehicleId: vehicle.id,
            branchId,
            createdBy: creator?.name || `Người dùng #${guard.userId}`,
          },
        });
      }
      return created;
    });

    return NextResponse.json(serializePlateService(service), { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "Số đăng ký, mã hồ sơ hoặc hồ sơ bán xe đã tồn tại tại cơ sở này.",
          code: "PLATE_SERVICE_DUPLICATE",
        },
        { status: 409 },
      );
    }
    return handleApiError(error, "PLATE_SERVICE_CREATE", "Không thể tạo dịch vụ biển.");
  }
}
