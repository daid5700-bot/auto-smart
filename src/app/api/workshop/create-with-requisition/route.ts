import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

// POST /api/workshop/create-with-requisition
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const branchId = getActiveBranchId();
    if (!branchId) {
      return NextResponse.json({ error: "Không xác định được chi nhánh hiện tại" }, { status: 400 });
    }

    const {
      customerId,
      plateNumber,
      vehicleModel,
      kmIn,
      symptoms,
      carCondition,
      technicianId,
      createdById,
      laborCost,
      items, // array of { productId, quantity, unitPrice }
    } = body;

    if (!customerId) {
      return NextResponse.json({ error: "Thiếu thông tin khách hàng" }, { status: 400 });
    }
    if (!plateNumber) {
      return NextResponse.json({ error: "Thiếu biển số xe" }, { status: 400 });
    }

    // Create the Repair Order and Requisition inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Calculate parts total cost
      let calculatedPartsCost = 0;
      for (const item of items) {
        calculatedPartsCost += Number(item.unitPrice) * Number(item.quantity);
      }

      // Determine initial RO status: if there are parts, set to "WAITING_PARTS", otherwise "PENDING"
      const status = items.length > 0 ? "WAITING_PARTS" : "PENDING";

      // 2. Create the RO
      const ro = await tx.repairOrder.create({
        data: {
          customerId: Number(customerId),
          plateNumber,
          vehicleModel: vehicleModel || "Chưa xác định",
          kmIn: Number(kmIn) || 0,
          symptoms: symptoms || "",
          status,
          technicianId: technicianId ? Number(technicianId) : null,
          createdById: createdById ? Number(createdById) : null,
          laborCost: Number(laborCost) || 0,
          partsCost: calculatedPartsCost,
          totalAmount: (Number(laborCost) || 0) + calculatedPartsCost,
          branchId,
        },
      });

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

        for (const item of items) {
          // Create PartsRequisitionItem
          await tx.partsRequisitionItem.create({
            data: {
              requisitionId: requisition.id,
              productId: Number(item.productId),
              quantity: Number(item.quantity),
            },
          });

          // Create OrderItem (as placeholder for invoice estimation, but not final stock movement)
          await tx.orderItem.create({
            data: {
              repairOrderId: ro.id,
              productId: Number(item.productId),
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.unitPrice) * Number(item.quantity),
            },
          });
        }
      }

      return ro;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create RO with requisition:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
