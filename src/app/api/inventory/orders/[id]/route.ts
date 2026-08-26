import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";
import { getActiveBranchId } from "@/lib/branch";
import { ApiError, handleApiError, parseJson } from "@/lib/api-response";
import { createInventoryOrderSchema } from "@/lib/validation/inventory";
import { ensureCustomerBranch, getOrCreateCustomerForBranch } from "@/lib/customer-branch";

const orderInclude = {
  customer: { select: { id: true, name: true, phone: true, address: true, totalDebt: true } },
  movements: {
    where: { type: "EXPORT" },
    orderBy: { id: "asc" },
    include: { product: { select: { id: true, sku: true, name: true, unit: true } } },
  },
} satisfies Prisma.InventoryOrderInclude;

function serializeOrder(order: any) {
  return {
    ...order,
    totalAmount: Number(order.totalAmount || 0),
    paidAmount: Number(order.paidAmount || 0),
    debtAmount: Number(order.debtAmount || 0),
    movements: (order.movements || []).map((movement: any) => ({
      ...movement,
      quantity: Number(movement.quantity || 0),
      unitCost: Number(movement.unitCost || 0),
      totalCost: Number(movement.totalCost || 0),
    })),
  };
}

function assertManualOrder(order: { vehicleId: number | null; status: string; createdBy: string }) {
  if (order.status === "CANCELLED") {
    throw new ApiError("Phiếu đã hủy nên không thể chỉnh sửa.", 409, "ORDER_CANCELLED");
  }
  if (order.vehicleId || order.createdBy.startsWith("Hệ thống")) {
    throw new ApiError(
      "Phiếu tự sinh từ bán xe hoặc xưởng dịch vụ phải được sửa tại hồ sơ nguồn.",
      409,
      "SYSTEM_ORDER_NOT_EDITABLE",
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const id = Number((await params).id);
    const branchId = await getActiveBranchId();
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID phiếu không hợp lệ.");
    if (!branchId) throw new ApiError("Vui lòng chọn chi nhánh hiện tại.", 400, "BRANCH_REQUIRED");

    const order = await prisma.inventoryOrder.findFirst({
      where: { id, branchId },
      include: orderInclude,
    });
    if (!order) throw new ApiError("Không tìm thấy phiếu xuất kho.", 404, "ORDER_NOT_FOUND");
    assertManualOrder(order);

    return NextResponse.json(serializeOrder(order));
  } catch (error) {
    return handleApiError(error, "INVENTORY_ORDER_DETAIL", "Không thể tải phiếu xuất kho.");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const id = Number((await params).id);
    const body = await parseJson(req, createInventoryOrderSchema);
    const branchId = await getActiveBranchId();
    if (!Number.isInteger(id) || id <= 0) throw new ApiError("ID phiếu không hợp lệ.");
    if (!branchId) throw new ApiError("Vui lòng chọn chi nhánh hiện tại.", 400, "BRANCH_REQUIRED");

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT "id"
        FROM "InventoryOrder"
        WHERE "id" = ${id} AND "branchId" = ${branchId}
        FOR UPDATE
      `);
      if (!locked[0]) throw new ApiError("Không tìm thấy phiếu xuất kho.", 404, "ORDER_NOT_FOUND");

      const current = await tx.inventoryOrder.findUnique({
        where: { id },
        include: orderInclude,
      });
      if (!current) throw new ApiError("Không tìm thấy phiếu xuất kho.", 404, "ORDER_NOT_FOUND");
      assertManualOrder(current);

      const currentPaid = Number(current.paidAmount || 0);
      if (Number(body.paidAmount || 0) !== currentPaid) {
        throw new ApiError(
          "Không sửa số tiền đã thanh toán tại đây. Hãy dùng chức năng cập nhật thanh toán.",
          400,
          "PAID_AMOUNT_IMMUTABLE",
        );
      }

      let customerId = body.customerId || null;
      if (!customerId && body.phone && body.customerName) {
        const customer = await getOrCreateCustomerForBranch(
          {
            name: body.customerName,
            phone: body.phone,
            address: body.address,
            branchId,
          },
          tx,
        );
        customerId = customer?.id || null;
      }
      if (body.type !== "INTERNAL" && !customerId) {
        throw new ApiError("Vui lòng chọn khách hàng.", 400, "CUSTOMER_REQUIRED");
      }
      if (customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: customerId, isDeleted: false },
          select: { id: true },
        });
        if (!customer) throw new ApiError("Khách hàng không tồn tại.", 404, "CUSTOMER_NOT_FOUND");
        await ensureCustomerBranch(customerId, branchId, tx);
        if (body.address) {
          await tx.customer.update({ where: { id: customerId }, data: { address: body.address } });
        }
      }

      const oldQuantity = new Map<number, number>();
      current.movements.forEach((movement) => {
        oldQuantity.set(
          movement.productId,
          (oldQuantity.get(movement.productId) || 0) + Number(movement.quantity),
        );
      });
      const newQuantity = new Map<number, number>();
      body.items.forEach((item) => {
        newQuantity.set(item.productId, (newQuantity.get(item.productId) || 0) + Number(item.quantity));
      });

      const productIds = Array.from(new Set([...oldQuantity.keys(), ...newQuantity.keys()])).sort((a, b) => a - b);
      const productBranches = await tx.productBranch.findMany({
        where: { branchId, productId: { in: productIds } },
        include: { product: { select: { sku: true, name: true } } },
      });
      const branchByProduct = new Map(productBranches.map((item) => [item.productId, item]));
      if (branchByProduct.size !== productIds.length) {
        throw new ApiError("Có phụ tùng chưa được cấu hình tại chi nhánh này.", 400, "PRODUCT_BRANCH_MISSING");
      }

      const lockedStock = await tx.$queryRaw<Array<{ productId: number; stockCount: Prisma.Decimal }>>(
        Prisma.sql`
          SELECT "productId", "stockCount"
          FROM "ProductBranch"
          WHERE "branchId" = ${branchId}
            AND "productId" IN (${Prisma.join(productIds)})
          ORDER BY "id"
          FOR UPDATE
        `,
      );
      const stockByProduct = new Map(lockedStock.map((item) => [item.productId, Number(item.stockCount)]));

      for (const productId of productIds) {
        const delta = (newQuantity.get(productId) || 0) - (oldQuantity.get(productId) || 0);
        if (delta > 0 && Number(stockByProduct.get(productId) || 0) < delta) {
          const product = branchByProduct.get(productId)?.product;
          throw new ApiError(
            `Phụ tùng [${product?.sku || productId}] ${product?.name || ""} không đủ tồn để tăng thêm ${delta}.`,
            409,
            "INSUFFICIENT_STOCK",
          );
        }
        if (delta !== 0) {
          await tx.productBranch.update({
            where: { productId_branchId: { productId, branchId } },
            data: {
              stockCount: delta > 0 ? { decrement: delta } : { increment: Math.abs(delta) },
            },
          });
        }
      }

      const totalAmount = body.items.reduce(
        (total, item) => total + Number(item.quantity) * Number(item.unitPrice),
        0,
      );
      if (currentPaid > totalAmount) {
        throw new ApiError(
          "Tổng tiền mới không được thấp hơn số tiền khách đã thanh toán.",
          400,
          "TOTAL_BELOW_PAID",
        );
      }
      const debtAmount = totalAmount - currentPaid;

      if (current.customerId !== customerId) {
        if (current.customerId) {
          await tx.customer.update({
            where: { id: current.customerId },
            data: {
              totalDebt: { decrement: Number(current.debtAmount || 0) },
              totalSpent: { decrement: currentPaid },
            },
          });
        }
        if (customerId) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              totalDebt: { increment: debtAmount },
              totalSpent: { increment: currentPaid },
              lastVisit: new Date(),
            },
          });
        }
      } else if (customerId) {
        const debtDelta = debtAmount - Number(current.debtAmount || 0);
        if (debtDelta !== 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { totalDebt: { increment: debtDelta }, lastVisit: new Date() },
          });
        }
      }

      await tx.stockMovement.deleteMany({
        where: { inventoryOrderId: id, type: "EXPORT" },
      });
      await tx.stockMovement.createMany({
        data: body.items.map((item) => ({
          inventoryOrderId: id,
          productId: item.productId,
          branchId,
          type: "EXPORT",
          quantity: item.quantity,
          unitCost: item.unitPrice,
          totalCost: Number(item.quantity) * Number(item.unitPrice),
          reason: body.reason || "Bán xuất kho",
          createdBy: current.createdBy,
        })),
      });

      return tx.inventoryOrder.update({
        where: { id },
        data: {
          customerId,
          type: body.type,
          totalAmount,
          debtAmount,
          status: debtAmount > 0 ? "DEBT" : "PAID",
          reason: body.reason || null,
        },
        include: orderInclude,
      });
    });

    return NextResponse.json(serializeOrder(updatedOrder));
  } catch (error) {
    return handleApiError(error, "INVENTORY_ORDER_UPDATE", "Không thể cập nhật phiếu xuất kho.");
  }
}
