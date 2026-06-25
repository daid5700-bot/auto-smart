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

    // Create the Repair Order and Requisition inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create/update customer
      let customer = await tx.customer.findUnique({
        where: { phone },
      });

      let finalCustomerId: number;
      if (customer) {
        let updatedPlates = [...customer.vehiclePlates];
        if (plateNumber && !updatedPlates.includes(plateNumber)) {
          updatedPlates.push(plateNumber);
        }
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: customerName,
            vehiclePlates: updatedPlates,
          },
        });
        finalCustomerId = customer.id;
      } else {
        const newCustomer = await tx.customer.create({
          data: {
            name: customerName,
            phone,
            vehiclePlates: plateNumber ? [plateNumber] : [],
            branchId,
          },
        });
        finalCustomerId = newCustomer.id;
      }

      // 2. Calculate parts total cost
      let calculatedPartsCost = 0;
      for (const item of items) {
        calculatedPartsCost += Number(item.unitPrice) * Number(item.quantity);
      }

      // Determine initial RO status: if there are parts, set to "WAITING_PARTS", otherwise "PENDING"
      const status = items.length > 0 ? "WAITING_PARTS" : "PENDING";

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
          
          // Tăng reservedStock (giữ chỗ)
          await tx.productBranch.update({
             where: { productId_branchId: { productId: Number(item.productId), branchId } },
             data: { reservedStock: { increment: Number(item.quantity) } }
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
