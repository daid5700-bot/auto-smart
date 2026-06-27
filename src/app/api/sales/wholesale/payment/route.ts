import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const { vehicleIds, amount } = await req.json();

    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return NextResponse.json({ error: "Danh sách xe không hợp lệ" }, { status: 400 });
    }

    const targetPaidAmount = Number(amount);
    if (isNaN(targetPaidAmount) || targetPaidAmount < 0) {
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
      const accessories = JSON.parse(v.accessoriesJson || "[]");
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

    const newGroupPaid = Math.min(targetPaidAmount, groupTotalPrice);
    const newGroupDebt = groupTotalPrice - newGroupPaid;
    const debtDelta = newGroupDebt - oldGroupDebt;
    const diffPaid = newGroupPaid - oldGroupPaid;

    // Distribute paid amount among vehicles
    let remainingPaidToDistribute = newGroupPaid;

    const updates = vehiclePricing.map(vp => {
      const allocatedPaid = Math.min(remainingPaidToDistribute, vp.totalPrice);
      remainingPaidToDistribute -= allocatedPaid;
      const allocatedDebt = vp.totalPrice - allocatedPaid;

      // Status logic: if fully paid, transition to "SOLD", otherwise "RESERVED"
      const status = allocatedDebt === 0 ? "SOLD" : "RESERVED";

      return {
        id: vp.id,
        paidAmount: allocatedPaid,
        debtAmount: allocatedDebt,
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

      // 3. Update customer's totalDebt
      if (customerId && debtDelta !== 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalDebt: { increment: debtDelta }
          }
        });
      }

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in wholesale payment PATCH:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
