export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";
import { notifyRequisitionCountChanged } from "@/lib/requisition-events";
import { getOrCreateCustomerForBranch } from "@/lib/customer-branch";
import { requireAuth } from "@/lib/guard";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import {
  createRepairOrderWithRequisitionSchema,
} from "@/lib/validation/workshop";
import {
  applyDiscountCode,
  discountSnapshotData,
  type AppliedDiscount,
} from "@/lib/discounts";
import {
  buildWorkshopSymptoms,
  calculateWorkshopLaborCost,
  resolveWorkshopItemPrices,
} from "@/lib/workshop/pricing";

// POST /api/workshop/create-with-requisition
export async function POST(req: NextRequest) {
  const guard = await requireAuth(req, ["ADMIN", "WORKSHOP"]);
  if (!guard.ok) return guard.response;

  try {
    const body = await parseJson(req, createRepairOrderWithRequisitionSchema);
    const branchId = await getActiveBranchId();
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
      services,
      items: parsedItems, // array of { productId, quantity, unitPrice }
      pointsToRedeem,
      discountCodeId,
      birthday,
    } = body;
    const items = parsedItems ?? [];

    const laborCostNum = calculateWorkshopLaborCost(services);
    const sanitizedSymptoms = buildWorkshopSymptoms(symptoms, services);

    // 2. Find or create/update customer (OUTSIDE transaction to avoid deadlocks)
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone },
    });

    if (!existingCustomer && Number(pointsToRedeem || 0) > 0) {
      throw new ApiError("Khách hàng mới chưa có điểm tích lũy để quy đổi.", 400, "INSUFFICIENT_POINTS");
    }

    const customer = await getOrCreateCustomerForBranch({
      name: customerName,
      phone,
      branchId,
      birthday,
      vehiclePlate: plateNumber,
    });
    if (!customer) throw new ApiError("Không thể tạo khách hàng cho lệnh sửa chữa.", 400, "CUSTOMER_REQUIRED");
    const finalCustomerId = customer.id;

    // Create the Repair Order and Requisition inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      if (technicianId) {
        const technician = await tx.technician.findFirst({
          where: { id: Number(technicianId), branchId },
          select: { id: true },
        });
        if (!technician) {
          throw new ApiError(
            "Kỹ thuật viên không thuộc cơ sở hiện tại.",
            400,
            "TECHNICIAN_BRANCH_MISMATCH",
          );
        }
      }

      const pricedItems = await resolveWorkshopItemPrices(tx, branchId, items);
      const calculatedPartsCost = pricedItems.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      );
      const rawTotal = laborCostNum + calculatedPartsCost;
      let appliedDiscount: AppliedDiscount | null = null;
      let totalDiscountAmount = 0;
      let serviceDiscountPercent = 0;
      let partsDiscountPercent = 0;

      if (discountCodeId) {
        appliedDiscount = await applyDiscountCode(tx, {
          discountCodeId: Number(discountCodeId),
          branchId,
          scope: "WORKSHOP",
          subtotal: rawTotal,
          serviceSubtotal: laborCostNum,
          partsSubtotal: calculatedPartsCost,
        });
        totalDiscountAmount = appliedDiscount.amount;
        serviceDiscountPercent =
          appliedDiscount.discountType === "PERCENTAGE" && appliedDiscount.target === "SERVICE"
            ? appliedDiscount.value
            : 0;
        partsDiscountPercent =
          appliedDiscount.discountType === "PERCENTAGE" && appliedDiscount.target === "PARTS"
            ? appliedDiscount.value
            : 0;
      }

      const pointsDiscount = pointsToRedeem
        ? Math.min(Math.max(0, rawTotal - totalDiscountAmount), pointsToRedeem * 1000)
        : 0;
      const actualPointsToRedeem = Math.ceil(pointsDiscount / 1000);
      const finalTotalAmount = Math.max(0, rawTotal - totalDiscountAmount - pointsDiscount);

      // Deduct loyalty points inside transaction if requested
      if (actualPointsToRedeem > 0) {
        const currentCust = await tx.customer.findUnique({ where: { id: finalCustomerId } });
        if (!currentCust || currentCust.loyaltyPoints < actualPointsToRedeem) {
          throw new ApiError(
            `Khách hàng chỉ có ${currentCust?.loyaltyPoints || 0} điểm, không đủ để quy đổi ${actualPointsToRedeem} điểm.`,
            400,
            "INSUFFICIENT_POINTS",
          );
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
          symptoms: sanitizedSymptoms,
          status,
          technicianId: technicianId ? Number(technicianId) : null,
          createdById: guard.userId,
          laborCost: laborCostNum,
          servicesJson: services.map((service) => ({
            name: service.name,
            cost: Math.round(Number(service.cost) || 0),
          })),
          partsCost: calculatedPartsCost,
          discountPercent: serviceDiscountPercent,
          serviceDiscountPercent,
          partsDiscountPercent,
          ...(appliedDiscount
            ? discountSnapshotData(appliedDiscount)
            : { discountAmount: totalDiscountAmount }),
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
      if (pricedItems.length > 0) {
        const requisition = await tx.partsRequisition.create({
          data: {
            repairOrderId: ro.id,
            branchId,
            // Keep the agreed repair-order prices until warehouse approval.
            // PartsRequisitionItem has no price field, so this metadata is the
            // immutable pricing snapshot consumed by the approval endpoint.
            reason: `Yêu cầu phụ tùng khi tạo lệnh sửa chữa mới | METADATA:${JSON.stringify(
              pricedItems.map((item) => ({ productId: item.productId, unitPrice: item.unitPrice })),
            )}`,
            createdBy: "Hệ thống",
            status: "PENDING", // PENDING status, needs manual approval by warehouse
          },
        });

        // Execute all creations and updates concurrently to avoid N+1 transaction locking
        // Execute creations and updates sequentially to prevent transaction deadlocks, connection exhaustion, or transaction timeouts on the interactive transaction client
        // 1. Bulk create PartsRequisitionItem
        await tx.partsRequisitionItem.createMany({
          data: pricedItems.map((item) => ({
            requisitionId: requisition.id,
            productId: Number(item.productId),
            quantity: Number(item.quantity),
          }))
        });

        // 2. Sequentially increment reservedStock
        for (const item of pricedItems) {
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

    const serializeRepairOrder = (ro: any) => {
      if (!ro) return null;
      return {
        ...ro,
        laborCost: Number(ro.laborCost || 0),
        partsCost: Number(ro.partsCost || 0),
        discountAmount: Number(ro.discountAmount || 0),
        totalAmount: Number(ro.totalAmount || 0),
        paidAmount: Number(ro.paidAmount || 0),
        debtAmount: Number(ro.debtAmount || 0)
      };
    };

    return NextResponse.json(serializeRepairOrder(result), { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, "API_WORKSHOP_CREATE_WITH_REQUISITION", "Không thể tạo lệnh sửa chữa");
  }
}
