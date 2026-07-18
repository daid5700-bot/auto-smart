import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { getActiveBranchId } from "@/lib/branch";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { wholesalePaymentSchema } from "@/lib/validation/payment";

export async function PATCH(req: NextRequest) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const { vehicleIds, amount: paymentDelta } = await parseJson(req, wholesalePaymentSchema);
    const activeBranchId = getActiveBranchId();

    // Fetch all vehicles in the wholesale group
    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, ...(activeBranchId ? { branchId: activeBranchId } : {}) },
      include: { customer: true }
    });

    if (vehicles.length !== vehicleIds.length) {
      throw new ApiError(
        "Một hoặc nhiều xe không tồn tại hoặc không thuộc chi nhánh hiện tại",
        404,
        "VEHICLE_NOT_FOUND",
      );
    }
    if (vehicles.some((vehicle) => vehicle.status === "CANCELLED")) {
      throw new ApiError("Không thể thanh toán cho hồ sơ xe đã hủy", 409, "VEHICLE_CANCELLED");
    }

    // Validate all vehicles belong to the same customer to prevent debt mis-assignment
    const uniqueCustomerIds = new Set(vehicles.map(v => v.customerId));
    if (uniqueCustomerIds.size > 1 || vehicles[0].customerId === null) {
      throw new ApiError("Các xe trong lô phải thuộc cùng một khách hàng", 400, "CUSTOMER_MISMATCH");
    }

    // Check if they all belong to the same customer
    const customerId = vehicles[0].customerId;
    const branchId = vehicles[0].branchId;
    const customerName = vehicles[0].customer?.name || "Khách mua buôn";

    // Snapshot the balances used to distribute the payment deterministically.
    const vehiclePricing = vehicles.map(v => {
      return {
        id: v.id,
        oldDebt: v.debtAmount.toNumber(),
        oldPaid: v.paidAmount.toNumber()
      };
    });

    const oldGroupDebt = vehiclePricing.reduce((sum, v) => sum + v.oldDebt, 0);

    const actualPaymentDelta = Math.min(paymentDelta, oldGroupDebt);
    const newGroupDebt = oldGroupDebt - actualPaymentDelta;
    const diffPaid = actualPaymentDelta;
    const debtDelta = newGroupDebt - oldGroupDebt;

    // Distribute actualPaymentDelta among vehicles that still have debt
    let remainingPaidToDistribute = actualPaymentDelta;

    const updates = vehiclePricing.map(vp => {
      const amountToPay = Math.min(remainingPaidToDistribute, vp.oldDebt);
      remainingPaidToDistribute -= amountToPay;

      const newPaid = vp.oldPaid + amountToPay;
      const newDebt = vp.oldDebt - amountToPay;

      // Status logic: if fully paid, transition to "SOLD", otherwise "RESERVED"
      const status = newDebt === 0 ? "SOLD" : "RESERVED";

      return {
        id: vp.id,
        paidAmount: newPaid,
        debtAmount: newDebt,
        status
      };
    });
    const updatesByVehicleId = new Map(updates.map((update) => [update.id, update]));

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update each vehicle
      for (const update of updates) {
        await tx.vehicle.update({
          where: { id: update.id },
          data: {
            paidAmount: update.paidAmount,
            debtAmount: update.debtAmount,
            status: update.status
          }
        });
      }

      // 2. Create payment transaction if there's a difference in paid amount
      if (diffPaid !== 0) {
        const pType = diffPaid > 0 ? "INCOME" : "EXPENSE";
        const txAmount = Math.abs(diffPaid);
        await tx.paymentTransaction.create({
          data: {
            code: `PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            amount: txAmount,
            method: "CASH",
            type: pType,
            referenceId: vehicles[0].id, // Reference the first vehicle of the wholesale lot
            referenceType: "VEHICLE_SALE",
            note: pType === "INCOME" 
              ? `Thu tiền thanh toán lô xe bán buôn của khách hàng ${customerName}` 
              : `Hoàn tiền lô xe bán buôn của khách hàng ${customerName}`,
            branchId,
            createdBy: String(guard.userId)
          }
        });
      }

      // 3. Update customer's totalDebt and totalSpent
      if (customerId) {
        let totalDebtChange = 0;
        let totalSpentChange = 0;

        for (const v of vehicles) {
          const update = updatesByVehicleId.get(v.id)!;
          const wasActive = ["RESERVED", "SOLD"].includes(v.status);
          const isNowActive = ["RESERVED", "SOLD"].includes(update.status);

          const oldVehicleDebt = v.debtAmount.toNumber();
          const oldVehiclePaid = v.paidAmount.toNumber();
          const newVehicleDebt = update.debtAmount;
          const newVehiclePaid = update.paidAmount;

          let debtChange = 0;
          let spentChange = 0;

          if (!wasActive && isNowActive) {
            // Became active: add whole debt and paid amounts to customer
            debtChange = newVehicleDebt;
            spentChange = newVehiclePaid;
          } else if (wasActive && !isNowActive) {
            // Became inactive: subtract
            debtChange = -oldVehicleDebt;
            spentChange = -oldVehiclePaid;
          } else if (wasActive && isNowActive) {
            // Stayed active: adjust deltas
            debtChange = newVehicleDebt - oldVehicleDebt;
            spentChange = newVehiclePaid - oldVehiclePaid;
          }

          totalDebtChange += debtChange;
          totalSpentChange += spentChange;
        }

        if (totalDebtChange !== 0 || totalSpentChange !== 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              totalDebt: { increment: totalDebtChange },
              totalSpent: { increment: totalSpentChange }
            }
          });
        }
      }

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "WHOLESALE_PAYMENT", "Không thể ghi nhận thanh toán lô xe");
  }
}
