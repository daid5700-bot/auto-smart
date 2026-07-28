export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { requireAuth } from "@/lib/guard";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { getOrCreateCustomerForBranch } from "@/lib/customer-branch";
import {
  adjustCustomerVehicleBalances,
  buildVehicleUpdateData,
  calculateUpdatedVehicleAmounts,
} from "@/lib/sales/vehicle-update";
import { applyDiscountCode, discountSnapshotData } from "@/lib/discounts";
import { createWholesaleDocumentSchema } from "@/lib/validation/sales";

// POST /api/sales/wholesale — creates one wholesale document atomically.
// All selected vehicles are committed together, or none of them are changed.
export async function POST(req: NextRequest) {
  const guard = await requireAuth(req, ["ADMIN", "SALES"]);
  if (!guard.ok) return guard.response;

  try {
    const body = await parseJson(req, createWholesaleDocumentSchema);
    const branchId = await getActiveBranchId();
    if (!branchId) {
      throw new ApiError("Không xác định được cơ sở hiện tại.", 400, "BRANCH_REQUIRED");
    }

    const requestedById = new Map(
      body.vehicles.map((vehicle) => [vehicle.id, vehicle]),
    );
    const vehicleIds = body.vehicles.map((vehicle) => vehicle.id);

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`
          SELECT "id"
          FROM "Vehicle"
          WHERE "id" IN (${Prisma.join(vehicleIds)})
          FOR UPDATE
        `,
      );

      const currentVehicles = await tx.vehicle.findMany({
        where: {
          id: { in: vehicleIds },
          branchId,
          status: { in: ["AVAILABLE", "INCOMING"] },
        },
      });
      if (currentVehicles.length !== vehicleIds.length) {
        throw new ApiError(
          "Có xe không còn sẵn sàng bán hoặc không thuộc cơ sở hiện tại. Chưa có xe nào được cập nhật.",
          409,
          "WHOLESALE_VEHICLE_CONFLICT",
        );
      }

      const customer = await getOrCreateCustomerForBranch(
        {
          name: body.customerName,
          phone: body.customerPhone,
          birthday: body.customerBirthday,
          address: body.customerAddress,
          branchId,
        },
        tx,
      );
      if (!customer) {
        throw new ApiError("Không thể tạo khách hàng bán buôn.", 400, "CUSTOMER_REQUIRED");
      }

      const updatedVehicleIds: number[] = [];
      for (const currentVehicle of currentVehicles) {
        const requested = requestedById.get(currentVehicle.id);
        if (!requested) {
          throw new ApiError("Dữ liệu xe bán buôn không hợp lệ.", 400, "WHOLESALE_DATA_INVALID");
        }

        const originalListPrice = Number(requested.listPrice);
        const updateData = buildVehicleUpdateData(
          currentVehicle,
          {
            status: body.status,
            bankStatus: "NONE",
            plateStatus: "PENDING",
            hasPlateService: false,
            plateCost: 0,
            listPrice: originalListPrice,
            accessoriesJson: "[]",
            notes: "Bán buôn",
            saleType: "WHOLESALE",
          },
          customer.id,
        );

        if (body.discountCodeId) {
          const appliedDiscount = await applyDiscountCode(tx, {
            discountCodeId: body.discountCodeId,
            branchId,
            scope: "SALES",
            subtotal: originalListPrice,
          });
          Object.assign(updateData, discountSnapshotData(appliedDiscount), {
            originalListPrice,
            listPrice: Math.max(0, originalListPrice - appliedDiscount.amount),
          });
        } else {
          Object.assign(updateData, discountSnapshotData(null), {
            originalListPrice,
            listPrice: originalListPrice,
          });
        }

        const { debtAmount } = calculateUpdatedVehicleAmounts(currentVehicle, updateData);
        updateData.debtAmount = debtAmount;

        const updated = await tx.vehicle.update({
          where: { id: currentVehicle.id },
          data: updateData,
        });
        await adjustCustomerVehicleBalances(tx, currentVehicle, updated, debtAmount);
        updatedVehicleIds.push(updated.id);
      }

      return {
        customerId: customer.id,
        vehicleIds: updatedVehicleIds,
        count: updatedVehicleIds.length,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(
      error,
      "SALES_WHOLESALE_CREATE",
      "Không thể tạo hồ sơ bán buôn",
    );
  }
}
