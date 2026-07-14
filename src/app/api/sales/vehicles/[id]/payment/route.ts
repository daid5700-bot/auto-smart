import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const id = parseInt(params.id);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "ID xe không hợp lệ" }, { status: 400 });
    }

    const { amount } = await req.json();

    // `amount` is the ADDITIONAL payment delta (not absolute total paid)
    const paymentDelta = Number(amount);
    if (isNaN(paymentDelta) || paymentDelta <= 0) {
      return NextResponse.json({ error: "Số tiền phải lớn hơn 0" }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!vehicle) return NextResponse.json({ error: "Không tìm thấy xe" }, { status: 404 });

    // Calculate total bill for the vehicle
    let accessories: any[] = [];
    try {
      accessories = typeof vehicle.accessoriesJson === "string"
        ? JSON.parse(vehicle.accessoriesJson)
        : (vehicle.accessoriesJson as any) || [];
    } catch { accessories = []; }
    const accCost = accessories.reduce((acc: number, curr: any) => acc + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
    const totalAmount = vehicle.listPrice.toNumber() + (vehicle.plateCost ? vehicle.plateCost.toNumber() : 0) + accCost;

    const oldPaidAmount = vehicle.paidAmount.toNumber();
    const oldDebtAmount = vehicle.debtAmount.toNumber();

    // Cap delta so it cannot exceed remaining debt (no overpayment)
    const actualPaymentDelta = Math.min(paymentDelta, oldDebtAmount);
    const newPaidAmount = oldPaidAmount + actualPaymentDelta;
    const newDebtAmount = Math.max(0, totalAmount - newPaidAmount);
    const diffPaid = actualPaymentDelta;
    const debtDelta = newDebtAmount - oldDebtAmount;


    const updatedVehicle = await prisma.$transaction(async (tx) => {
      // update vehicle
      const v = await tx.vehicle.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          debtAmount: newDebtAmount,
        }
      });
      
      if (diffPaid !== 0) {
        const pType = diffPaid > 0 ? "INCOME" : "EXPENSE";
        const txAmount = Math.abs(diffPaid);
        await tx.paymentTransaction.create({
          data: {
            code: `PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            amount: txAmount,
            method: "CASH", 
            type: pType,
            referenceId: vehicle.id,
            referenceType: "VEHICLE_SALE",
            note: pType === "INCOME" ? `Thu tiền hồ sơ bán xe ${vehicle.vin}` : `Hoàn tiền hồ sơ bán xe ${vehicle.vin}`,
            branchId: vehicle.branchId,
            createdBy: "system"
          }
        });
      }

      // update customer debt and spent
      if (vehicle.customerId && (debtDelta !== 0 || diffPaid > 0)) {
        await tx.customer.update({
          where: { id: vehicle.customerId },
          data: {
            ...(debtDelta !== 0 ? { totalDebt: { increment: debtDelta } } : {}),
            ...(diffPaid > 0 ? { totalSpent: { increment: diffPaid } } : {})
          }
        });
      }

      return v;
    });

    const serializedVehicle = {
      ...updatedVehicle,
      importPrice: updatedVehicle.importPrice ? Number(updatedVehicle.importPrice) : null,
      listPrice: Number(updatedVehicle.listPrice),
      floorPrice: Number(updatedVehicle.floorPrice),
      paidAmount: Number(updatedVehicle.paidAmount),
      debtAmount: Number(updatedVehicle.debtAmount),
      plateCost: updatedVehicle.plateCost ? Number(updatedVehicle.plateCost) : null,
    };

    return NextResponse.json(serializedVehicle);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
