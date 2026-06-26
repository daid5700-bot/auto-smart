export const dynamic = "force-dynamic";
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

    updateData.debtAmount = newDebtAmount;

    const vehicle = await prisma.$transaction(async (tx) => {
      // 1. Calculate old amounts
      const oldAccessories = JSON.parse(currentVehicle.accessoriesJson || "[]");
      const oldAccCost = oldAccessories.reduce((acc: number, curr: any) => acc + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
      const oldTotalAmount = currentVehicle.listPrice.toNumber() + (currentVehicle.plateCost ? currentVehicle.plateCost.toNumber() : 0) + oldAccCost;
      const oldDebtAmount = currentVehicle.debtAmount.toNumber();

      // 2. Determine statuses
      const oldStatus = currentVehicle.status;
      const newStatus = updateData.status || oldStatus;
      
      const wasActive = ["RESERVED", "SOLD"].includes(oldStatus);
      const isNowActive = ["RESERVED", "SOLD"].includes(newStatus);

      // 3. Update the vehicle
      const v = await tx.vehicle.update({
        where: { id },
        data: updateData,
        include: { customer: true }
      });

      // 4. Handle customer debt and spent adjustments
      const oldCustomerId = currentVehicle.customerId;
      const newCustomerId = v.customerId;

      if (oldCustomerId !== newCustomerId) {
        // Customer changed: Revert from old customer (if was active), apply to new customer (if now active)
        if (oldCustomerId && wasActive) {
          await tx.customer.update({
            where: { id: oldCustomerId },
            data: {
              totalDebt: { decrement: oldDebtAmount },
              totalSpent: { decrement: oldTotalAmount }
            }
          });
        }
        if (newCustomerId && isNowActive) {
          await tx.customer.update({
            where: { id: newCustomerId },
            data: {
              totalDebt: { increment: newDebtAmount },
              totalSpent: { increment: newTotalAmount }
            }
          });
        }
      } else if (newCustomerId) {
        // Same customer: Calculate delta based on status transition and price changes
        let debtChange = 0;
        let spentChange = 0;
        
        if (!wasActive && isNowActive) {
          // Transition to SOLD/RESERVED
          debtChange = newDebtAmount;
          spentChange = newTotalAmount;
        } else if (wasActive && !isNowActive) {
          // Transition out of SOLD/RESERVED
          debtChange = -oldDebtAmount;
          spentChange = -oldTotalAmount;
        } else if (wasActive && isNowActive) {
          // Kept SOLD/RESERVED, but prices might have changed
          debtChange = newDebtAmount - oldDebtAmount;
          spentChange = newTotalAmount - oldTotalAmount;
        }

        if (debtChange !== 0 || spentChange !== 0) {
          await tx.customer.update({
            where: { id: newCustomerId },
            data: { 
              totalDebt: { increment: debtChange },
              totalSpent: { increment: spentChange }
            }
          });
        }
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

    await prisma.$transaction(async (tx) => {
      // Revert customer debt and spent if it was sold/reserved
      if (currentVehicle.customerId && ["RESERVED", "SOLD"].includes(currentVehicle.status)) {
        const accessories = JSON.parse(currentVehicle.accessoriesJson || "[]");
        const accCost = accessories.reduce((acc: number, curr: any) => acc + (Number(curr.price) * (Number(curr.quantity) || 1)), 0);
        const totalAmount = currentVehicle.listPrice.toNumber() + (currentVehicle.plateCost ? currentVehicle.plateCost.toNumber() : 0) + accCost;
        const debtAmount = currentVehicle.debtAmount.toNumber();

        await tx.customer.update({
          where: { id: currentVehicle.customerId },
          data: {
            totalDebt: { decrement: debtAmount },
            totalSpent: { decrement: totalAmount }
          }
        });
      }

      await tx.vehicle.update({ 
        where: { id },
        data: { status: "CANCELLED" }
      });
    });
    return NextResponse.json({ success: true, message: "Đã hủy (xóa mềm) hồ sơ xe thành công" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
