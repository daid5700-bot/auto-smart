import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const { vehicleIds, amount } = await req.json();

    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return NextResponse.json({ error: "Danh sách xe không hợp lệ" }, { status: 400 });
    }

    const paymentDelta = Number(amount);
    if (isNaN(paymentDelta) || paymentDelta < 0) {
      return NextResponse.json({ error: "Số tiền không hợp lệ" }, { status: 400 });
    }

    // Fetch all vehicles in the wholesale group
    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      include: { customer: true }
    });

    if (vehicles.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy xe nào" }, { status: 404 });
    }

    // Validate all vehicles belong to the same customer to prevent debt mis-assignment
    const uniqueCustomerIds = new Set(vehicles.map(v => v.customerId));
    if (uniqueCustomerIds.size > 1) {
      return NextResponse.json({ error: "Các xe trong lô không cùng một khách hàng. Vui lòng kiểm tra lại." }, { status: 400 });
    }

    // Check if they all belong to the same customer
    const customerId = vehicles[0].customerId;
    const branchId = vehicles[0].branchId;
    const customerName = vehicles[0].customer?.name || "Khách mua buôn";

    // Calculate total prices for each vehicle and group total
    const vehiclePricing = vehicles.map(v => {
      const accessories = typeof v.accessoriesJson === "string" ? JSON.parse(v.accessoriesJson) : (v.accessoriesJson as any) || [];
      const accCost = accessories.reduce((acc: number, curr: any) => acc + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
      const totalPrice = v.listPrice.toNumber() + (v.plateCost ? v.plateCost.toNumber() : 0) + accCost;
      return {
        id: v.id,
        vin: v.vin,
        totalPrice,
        oldDebt: v.debtAmount.toNumber(),
        oldPaid: v.paidAmount.toNumber()
      };
    });

    const groupTotalPrice = vehiclePricing.reduce((sum, v) => sum + v.totalPrice, 0);
    const oldGroupDebt = vehiclePricing.reduce((sum, v) => sum + v.oldDebt, 0);
    const oldGroupPaid = vehiclePricing.reduce((sum, v) => sum + v.oldPaid, 0);

    const actualPaymentDelta = Math.min(paymentDelta, oldGroupDebt);
    const newGroupPaid = oldGroupPaid + actualPaymentDelta;
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
            createdBy: "system"
          }
        });
      }

      // 3. Update customer's totalDebt and totalSpent
      if (customerId) {
        let totalDebtChange = 0;
        let totalSpentChange = 0;

        for (const v of vehicles) {
          const update = updates.find(u => u.id === v.id)!;
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
  } catch (error: any) {
    console.error("Error in wholesale payment PATCH:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
