import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { getActiveBranchId } from "@/lib/branch";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import {
  calculatePlateServiceProfit,
  exportPlateFrame,
  restorePlateFrame,
  serializePlateService,
} from "@/lib/sales/plate-service";
import {
  decryptPlateServicePassword,
  encryptPlateServicePassword,
} from "@/lib/plate-service-secret";
import { updatePlateServiceSchema } from "@/lib/validation/plate-service";

const detailInclude = {
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth(req, ["ADMIN", "SALES"]);
  if (!guard.ok) return guard.response;

  try {
    const id = Number((await params).id);
    const branchId = await getActiveBranchId();
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID không hợp lệ.");
    if (!branchId) throw new ApiError("Vui lòng chọn cơ sở hiện tại.");

    const service = await prisma.plateService.findFirst({
      where: { id, branchId },
      include: detailInclude,
    });
    if (!service) throw new ApiError("Không tìm thấy dịch vụ biển.", 404, "NOT_FOUND");

    return NextResponse.json({
      ...serializePlateService(service),
      portalPassword: decryptPlateServicePassword(service.portalPasswordEncrypted),
    });
  } catch (error) {
    return handleApiError(error, "PLATE_SERVICE_DETAIL", "Không thể tải dịch vụ biển.");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth(req, ["ADMIN", "SALES"]);
  if (!guard.ok) return guard.response;

  try {
    const id = Number((await params).id);
    const body = await parseJson(req, updatePlateServiceSchema);
    const branchId = await getActiveBranchId();
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID không hợp lệ.");
    if (!branchId) throw new ApiError("Vui lòng chọn cơ sở hiện tại.");

    const creator = await prisma.user.findUnique({
      where: { id: guard.userId },
      select: { name: true },
    });

    const service = await prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT "id"
        FROM "PlateService"
        WHERE "id" = ${id}
          AND "branchId" = ${branchId}
        FOR UPDATE
      `);
      if (!lockedRows[0]) {
        throw new ApiError("Không tìm thấy dịch vụ biển.", 404, "NOT_FOUND");
      }

      // Read only after the row lock is acquired. A concurrent PATCH must wait
      // and will then observe the latest plate-frame snapshot, preventing the
      // old quantity from being restored to stock twice.
      const current = await tx.plateService.findUnique({
        where: { id },
      });
      if (!current) throw new ApiError("Không tìm thấy dịch vụ biển.", 404, "NOT_FOUND");

      if (body.registrationNumber || body.dossierCode) {
        const duplicate = await tx.plateService.findFirst({
          where: {
            id: { not: id },
            branchId,
            OR: [
              ...(body.registrationNumber
                ? [{
                    registrationNumber: {
                      equals: body.registrationNumber,
                      mode: "insensitive" as const,
                    },
                  }]
                : []),
              ...(body.dossierCode
                ? [{
                    dossierCode: {
                      equals: body.dossierCode,
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
            duplicate.registrationNumber === body.registrationNumber
              ? "Số đăng ký đã tồn tại tại cơ sở này."
              : "Mã hồ sơ đã tồn tại tại cơ sở này.",
            409,
            "PLATE_SERVICE_DUPLICATE",
          );
        }
      }

      const nextProductId = Object.prototype.hasOwnProperty.call(body, "plateFrameProductId")
        ? body.plateFrameProductId || null
        : current.plateFrameProductId;
      const nextQuantity = nextProductId
        ? Object.prototype.hasOwnProperty.call(body, "plateFrameQuantity")
          ? Number(body.plateFrameQuantity || 0)
          : current.plateFrameQuantity
        : 0;
      const plateFrameChanged =
        nextProductId !== current.plateFrameProductId ||
        nextQuantity !== current.plateFrameQuantity;

      let plateFrameUnitCost = Number(current.plateFrameUnitCost);
      let plateFrameTotalCost = Number(current.plateFrameTotalCost);

      if (plateFrameChanged) {
        if (current.plateFrameProductId && current.plateFrameQuantity > 0) {
          await restorePlateFrame(tx, {
            branchId,
            productId: current.plateFrameProductId,
            quantity: current.plateFrameQuantity,
          });
          await tx.stockMovement.create({
            data: {
              productId: current.plateFrameProductId,
              type: "IMPORT_PLATE_SERVICE_RETURN",
              quantity: current.plateFrameQuantity,
              unitCost: current.plateFrameUnitCost,
              totalCost: current.plateFrameTotalCost,
              reason: `Hoàn kho do cập nhật dịch vụ biển #${current.id}`,
              plateServiceId: current.id,
              branchId,
              createdBy: creator?.name || `Người dùng #${guard.userId}`,
            },
          });
        }

        plateFrameUnitCost = 0;
        plateFrameTotalCost = 0;
        if (nextProductId && nextQuantity > 0) {
          const snapshot = await exportPlateFrame(tx, {
            branchId,
            productId: nextProductId,
            quantity: nextQuantity,
          });
          plateFrameUnitCost = snapshot.unitCost;
          plateFrameTotalCost = snapshot.totalCost;

          const orderCode = `PX-OB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const inventoryOrder = await tx.inventoryOrder.create({
            data: {
              code: orderCode,
              vehicleId: current.vehicleId,
              type: "EXPORT_PLATE_SERVICE",
              totalAmount: plateFrameTotalCost,
              paidAmount: plateFrameTotalCost,
              debtAmount: 0,
              status: "PAID",
              reason: `Tự động xuất ốp biển khi cập nhật dịch vụ biển #${current.id}`,
              branchId,
              createdBy: creator?.name || `Hệ thống (Dịch vụ biển)`,
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: nextProductId,
              inventoryOrderId: inventoryOrder.id,
              type: "EXPORT_PLATE_SERVICE",
              quantity: nextQuantity,
              unitCost: plateFrameUnitCost,
              totalCost: plateFrameTotalCost,
              reason: `Xuất ốp biển khi cập nhật dịch vụ biển #${current.id}`,
              plateServiceId: current.id,
              vehicleId: current.vehicleId,
              branchId,
              createdBy: creator?.name || `Người dùng #${guard.userId}`,
            },
          });
        }
      }

      const totalRevenue = body.totalRevenue ?? Number(current.totalRevenue);
      const registrationTax = body.registrationTax ?? Number(current.registrationTax);
      const plateFee = body.plateFee ?? Number(current.plateFee);
      const policeFee = body.policeFee ?? Number(current.policeFee);
      const profit = calculatePlateServiceProfit({
        totalRevenue,
        registrationTax,
        plateFee,
        policeFee,
        plateFrameTotalCost,
      });
      const status = body.status ?? current.status;

      return tx.plateService.update({
        where: { id },
        data: {
          ...(body.registrationNumber !== undefined
            ? { registrationNumber: body.registrationNumber }
            : {}),
          ...(body.dossierCode !== undefined ? { dossierCode: body.dossierCode } : {}),
          ...(body.portalPassword
            ? { portalPasswordEncrypted: encryptPlateServicePassword(body.portalPassword) }
            : {}),
          ...(body.plateNumber !== undefined
            ? { plateNumber: body.plateNumber || null }
            : {}),
          totalRevenue,
          registrationTax,
          plateFee,
          policeFee,
          plateFrameProductId: nextProductId,
          plateFrameQuantity: nextQuantity,
          plateFrameUnitCost,
          plateFrameTotalCost,
          profit,
          status,
          completedAt:
            status === "DELIVERED_TO_CUSTOMER"
              ? current.completedAt || new Date()
              : null,
          ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
        },
        include: detailInclude,
      });
    });

    return NextResponse.json(serializePlateService(service));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "Số đăng ký hoặc mã hồ sơ đã tồn tại tại cơ sở này.",
          code: "PLATE_SERVICE_DUPLICATE",
        },
        { status: 409 },
      );
    }
    return handleApiError(error, "PLATE_SERVICE_UPDATE", "Không thể cập nhật dịch vụ biển.");
  }
}
