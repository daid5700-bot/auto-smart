import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// Helper to find or upsert a Customer
async function getOrCreateCustomer(name: string, phone: string, birthdayStr?: string, branchId?: number | null) {
  if (!phone || !name) return null;
  
  let birthday: Date | null = null;
  if (birthdayStr) {
    birthday = new Date(birthdayStr);
  }

  const existing = await prisma.customer.findUnique({
    where: { phone }
  });

  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name,
        ...(birthday ? { birthday } : {})
      }
    });
  } else {
    return prisma.customer.create({
      data: {
        name,
        phone,
        source: "WALKIN",
        birthday,
        branchId
      }
    });
  }
}

// GET /api/sales/[id] — retrieve a single vehicle details
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const branchId = getActiveBranchId();

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
      include: { customer: true }
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Hồ sơ xe không tồn tại" }, { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// PATCH /api/sales/[id] — update vehicle details
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const branchId = getActiveBranchId();

    const currentVehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentVehicle) {
      return NextResponse.json({ error: "Thông tin xe không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });
    }

    const { 
      vin, model, variant, color, year, status, listPrice, floorPrice, image,
      bankStatus, plateStatus, plateCost, accessoriesJson, notes,
      customerName, customerPhone, customerBirthday
    } = body;

    let customerId = currentVehicle.customerId;
    if (customerPhone && customerName) {
      const customer = await getOrCreateCustomer(customerName, customerPhone, customerBirthday, branchId);
      if (customer) {
        customerId = customer.id;
      }
    }

    const updateData: any = {};
    if (vin !== undefined) updateData.vin = vin;
    if (model !== undefined) updateData.model = model;
    if (variant !== undefined) updateData.variant = variant;
    if (color !== undefined) updateData.color = color;
    if (year !== undefined) updateData.year = Number(year);
    if (status !== undefined) updateData.status = status;
    if (listPrice !== undefined) updateData.listPrice = Number(listPrice);
    if (floorPrice !== undefined) updateData.floorPrice = Number(floorPrice);
    if (image !== undefined) updateData.image = image;
    if (bankStatus !== undefined) updateData.bankStatus = bankStatus;
    if (plateStatus !== undefined) updateData.plateStatus = plateStatus;
    if (plateCost !== undefined) updateData.plateCost = Number(plateCost);
    if (accessoriesJson !== undefined) updateData.accessoriesJson = accessoriesJson;
    if (notes !== undefined) updateData.notes = notes;
    
    // Explicitly set customerId if it was resolved
    updateData.customerId = customerId;

    // Calculate new total amount and debt
    const finalListPrice = updateData.listPrice ?? currentVehicle.listPrice.toNumber();
    const finalPlateCost = updateData.plateCost ?? (currentVehicle.plateCost ? currentVehicle.plateCost.toNumber() : 0);
    const finalAcc = updateData.accessoriesJson ?? currentVehicle.accessoriesJson ?? "[]";
    const accessories = JSON.parse(finalAcc);
    const accCost = accessories.reduce((acc: number, curr: any) => acc + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
    
    const newTotalAmount = finalListPrice + finalPlateCost + accCost;
    const paid = currentVehicle.paidAmount.toNumber();
    const newDebtAmount = newTotalAmount - paid;
    const oldDebtAmount = currentVehicle.debtAmount.toNumber();
    const debtDelta = newDebtAmount - oldDebtAmount;

    updateData.debtAmount = newDebtAmount;

    const vehicle = await prisma.$transaction(async (tx) => {
      const v = await tx.vehicle.update({
        where: { id },
        data: updateData,
        include: { customer: true }
      });

      if (customerId && debtDelta !== 0 && ["RESERVED", "SOLD"].includes(v.status)) {
        await tx.customer.update({
          where: { id: customerId },
          data: { totalDebt: { increment: debtDelta } }
        });
      }

      return v;
    });    
    return NextResponse.json(vehicle);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE /api/sales/[id] — delete vehicle
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const branchId = getActiveBranchId();

    const currentVehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        ...(branchId ? { branchId } : {}),
      },
    });
    if (!currentVehicle) {
      return NextResponse.json({ error: "Thông tin xe không tồn tại hoặc không thuộc cơ sở này" }, { status: 404 });
    }

    await prisma.vehicle.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Xóa thông tin xe thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
