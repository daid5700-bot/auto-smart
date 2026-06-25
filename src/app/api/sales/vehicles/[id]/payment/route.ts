import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const { amount } = await req.json();
    
    // Allow setting absolute paidAmount, just like inventory orders
    const targetPaidAmount = Number(amount);
    if (isNaN(targetPaidAmount) || targetPaidAmount < 0) {
      return NextResponse.json({ error: "Số tiền không hợp lệ" }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!vehicle) return NextResponse.json({ error: "Không tìm thấy xe" }, { status: 404 });

    // Calculate total bill for the vehicle
    const accessories = JSON.parse(vehicle.accessoriesJson || "[]");
    const accCost = accessories.reduce((acc: number, curr: any) => acc + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
    const totalAmount = vehicle.listPrice.toNumber() + (vehicle.plateCost ? vehicle.plateCost.toNumber() : 0) + accCost;

    const newPaidAmount = Math.min(targetPaidAmount, totalAmount);
    const newDebtAmount = totalAmount - newPaidAmount;

    // Delta debt to adjust customer's totalDebt
    const oldDebtAmount = vehicle.debtAmount.toNumber();
    const debtDelta = newDebtAmount - oldDebtAmount; // If debt increases, delta > 0. If debt decreases, delta < 0.

    const updatedVehicle = await prisma.$transaction(async (tx) => {
      // update vehicle
      const v = await tx.vehicle.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          debtAmount: newDebtAmount,
        }
      });

      // update customer debt
      if (vehicle.customerId && debtDelta !== 0) {
        await tx.customer.update({
          where: { id: vehicle.customerId },
          data: {
            totalDebt: { increment: debtDelta }
          }
        });
      }

      return v;
    });

    return NextResponse.json(updatedVehicle);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
