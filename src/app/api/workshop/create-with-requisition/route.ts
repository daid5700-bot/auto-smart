export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { notifyRequisitionCountChanged } from "@/lib/requisition-events";

// POST /api/workshop/create-with-requisition
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchId = getActiveBranchId();
    if (!branchId) {
      return NextResponse.json({ error: "Không xác định được chi nhánh hiện tại" }, { status: 400 });
    }

    const {
      customerName,
      phone,
      plateNumber,
      vehicleModel,
      kmIn,
      symptoms,
      carCondition,
      technicianId,
      createdById,
      laborCost,
      items, // array of { productId, quantity, unitPrice }
      pointsToRedeem,
      discountPercent,
      birthday,
    } = body;

    if (!phone) {
      return NextResponse.json({ error: "Thiếu số điện thoại khách hàng" }, { status: 400 });
    }
    if (!customerName) {
      return NextResponse.json({ error: "Thiếu tên khách hàng" }, { status: 400 });
    }
    if (!plateNumber) {
      return NextResponse.json({ error: "Thiếu biển số xe" }, { status: 400 });
    }

      // 1. Calculate parts total cost
      let calculatedPartsCost = 0;
      for (const item of items) {
        calculatedPartsCost += Number(item.unitPrice) * Number(item.quantity);
      }

      let serviceDiscountPercent = 0;
      let partsDiscountPercent = 0;
      if (symptoms) {
        try {
          const parsed = JSON.parse(symptoms);
          if (parsed && typeof parsed === "object") {
            serviceDiscountPercent = Number(parsed.serviceDiscountPercent) || 0;
            partsDiscountPercent = Number(parsed.partsDiscountPercent) || 0;
          }
        } catch {}
      }

      const laborCostNum = Number(laborCost) || 0;
      const serviceDiscountAmount = Math.round(laborCostNum * (serviceDiscountPercent / 100));
      const partsDiscountAmount = Math.round(calculatedPartsCost * (partsDiscountPercent / 100));
      const totalDiscountAmount = serviceDiscountAmount + partsDiscountAmount;

      const rawTotal = laborCostNum + calculatedPartsCost;
      const pointsDiscount = pointsToRedeem ? Math.min(Math.max(0, rawTotal - totalDiscountAmount), pointsToRedeem * 1000) : 0;
      const actualPointsToRedeem = Math.ceil(pointsDiscount / 1000);
      const finalTotalAmount = Math.max(0, rawTotal - totalDiscountAmount - pointsDiscount);

    // 2. Find or create/update customer (OUTSIDE transaction to avoid deadlocks)
    let customer = await prisma.customer.findUnique({
      where: { phone },
    });

    let finalCustomerId: number;
    if (customer) {
      let updatedPlates = [...customer.vehiclePlates];
      if (plateNumber && !updatedPlates.includes(plateNumber)) {
        updatedPlates.push(plateNumber);
      }

      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          vehiclePlates: updatedPlates,
          ...(birthday ? { birthday: new Date(birthday) } : {}),
        },
      });
      finalCustomerId = customer.id;
    } else {
      if (actualPointsToRedeem > 0) {
        throw new Error("Khách hàng mới chưa có điểm tích lũy để quy đổi.");
      }
      const newCustomer = await prisma.customer.create({
        data: {
          name: customerName,
          phone,
          vehiclePlates: plateNumber ? [plateNumber] : [],
          branchId,
          ...(birthday ? { birthday: new Date(birthday) } : {}),
        },
      });
      finalCustomerId = newCustomer.id;
    }

    // Create the Repair Order and Requisition inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct loyalty points inside transaction if requested
      if (actualPointsToRedeem > 0) {
        const currentCust = await tx.customer.findUnique({ where: { id: finalCustomerId } });
        if (!currentCust || currentCust.loyaltyPoints < actualPointsToRedeem) {
          throw new Error(`Khách hàng chỉ có ${currentCust?.loyaltyPoints || 0} điểm, không đủ để quy đổi ${actualPointsToRedeem} điểm.`);
        }
        await tx.customer.update({
          where: { id: finalCustomerId },
          data: { loyaltyPoints: { decrement: actualPointsToRedeem } }
        });
      }

      // Determine initial RO status: if there are parts, set to "WAITING_PARTS", otherwise "DOING"
      const status = items.length > 0 ? "WAITING_PARTS" : "DOING";

      // 3. Create the RO
      const ro = await tx.repairOrder.create({
        data: {
          customerId: finalCustomerId,
          plateNumber,
          vehicleModel: vehicleModel || "Chưa xác định",
          kmIn: Number(kmIn) || 0,
          symptoms: symptoms || "",
          status,
          technicianId: technicianId ? Number(technicianId) : null,
          createdById: createdById ? Number(createdById) : null,
          laborCost: laborCostNum,
          partsCost: calculatedPartsCost,
          discountPercent: serviceDiscountPercent,
          discountAmount: totalDiscountAmount,
          totalAmount: finalTotalAmount,
          branchId,
        },
      });

      // If points were redeemed, log the LoyaltyTransaction & ZNS
      if (actualPointsToRedeem > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            customerId: finalCustomerId,
            type: "REDEEM",
            points: -actualPointsToRedeem,
            description: `Khấu trừ ${actualPointsToRedeem} điểm giảm giá ${pointsDiscount.toLocaleString("vi-VN")}đ trực tiếp khi tạo Lệnh sửa chữa #${ro.id}`,
            branchId,
            relatedRoId: ro.id,
          },
        });

        await tx.znsLog.create({
          data: {
            customerId: finalCustomerId,
            phone,
            messageType: "PROMO",
            content: `Khách hàng ${customerName} đã sử dụng ${actualPointsToRedeem} điểm để được giảm trực tiếp ${pointsDiscount.toLocaleString("vi-VN")}đ khi tạo Lệnh sửa chữa #${ro.id}!`,
            status: "SENT",
            branchId,
          },
        });
      }

      // Update technician status to WORKING if assigned
      if (technicianId) {
        await tx.technician.update({
          where: { id: Number(technicianId) },
          data: { status: "WORKING" },
        });
      }

      // 3. If there are parts, create PartsRequisition and PartsRequisitionItems (but do NOT deduct stock yet)
      if (items.length > 0) {
        const requisition = await tx.partsRequisition.create({
          data: {
            repairOrderId: ro.id,
            branchId,
            reason: "Yêu cầu phụ tùng khi tạo lệnh sửa chữa mới",
            createdBy: "Hệ thống",
            status: "PENDING", // PENDING status, needs manual approval by warehouse
          },
        });

        // Execute all creations and updates concurrently to avoid N+1 transaction locking
        // Execute creations and updates sequentially to prevent transaction deadlocks, connection exhaustion, or transaction timeouts on the interactive transaction client
        // 1. Bulk create PartsRequisitionItem
        await tx.partsRequisitionItem.createMany({
          data: items.map((item: any) => ({
            requisitionId: requisition.id,
            productId: Number(item.productId),
            quantity: Number(item.quantity),
          }))
        });

        // 2. Sequentially increment reservedStock
        for (const item of items) {
          await tx.productBranch.update({
            where: { productId_branchId: { productId: Number(item.productId), branchId } },
            data: { reservedStock: { increment: Number(item.quantity) } }
          });
        }
      }

      return ro;
    });

    if (items.length > 0) {
      notifyRequisitionCountChanged(branchId);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create RO with requisition:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
