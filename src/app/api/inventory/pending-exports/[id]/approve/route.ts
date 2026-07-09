export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyRequisitionCountChanged } from "@/lib/requisition-events";

// POST /api/inventory/pending-exports/[id]/approve — Warehouse approves → deduct stock
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = parseInt(params.id);

    const order = await prisma.inventoryOrder.findUnique({
      where: { id: orderId },
      include: { movements: { include: { product: true } } }
    });

    if (!order) return NextResponse.json({ error: "Không tìm thấy lệnh xuất kho" }, { status: 404 });
    if (order.status !== "PENDING") {
      return NextResponse.json({ error: "Lệnh này không ở trạng thái chờ duyệt" }, { status: 400 });
    }
    if (order.createdBy !== "Hệ thống (Bán Xe)") {
      return NextResponse.json({ error: "Lệnh này không phải lệnh xuất phụ kiện bán xe" }, { status: 400 });
    }

    // Parse accessories from the order reason (VIN embedded in reason)
    // Get vehicle to re-read accessories
    const vinMatch = order.reason?.match(/Xuất phụ kiện bán kèm xe VIN:\s*(.+)$/);
    if (!vinMatch) return NextResponse.json({ error: "Không xác định được xe liên quan" }, { status: 400 });
    const vin = vinMatch[1].trim();

    const vehicle = await prisma.vehicle.findUnique({ where: { vin } });
    if (!vehicle) return NextResponse.json({ error: "Không tìm thấy hồ sơ xe" }, { status: 404 });

    const accessories = JSON.parse(vehicle.accessoriesJson || "[]");
    const branchId = vehicle.branchId || 1;

    // Approve: validate stock AND create movements + deduct — all inside one transaction to prevent race condition
    await prisma.$transaction(async (tx) => {
      // Re-fetch order status inside transaction to prevent double-approval race
      const freshOrder = await tx.inventoryOrder.findUnique({ where: { id: orderId } });
      if (!freshOrder || freshOrder.status !== "PENDING") {
        throw new Error("Lệnh này đã được xử lý bởi người khác. Vui lòng tải lại trang.");
      }

      const productIds = accessories
        .map((acc: any) => Number(acc.productId || acc.id))
        .filter((id: number) => !isNaN(id));

      const pbs = await tx.productBranch.findMany({
        where: {
          productId: { in: productIds },
          branchId
        },
        include: { product: true }
      });
      const pbMap = new Map(pbs.map(pb => [pb.productId, pb]));

      // Validate stock INSIDE the transaction (atomic check-then-act)
      for (const acc of accessories) {
        const productId = Number(acc.productId || acc.id);
        if (isNaN(productId)) continue;
        const pb = pbMap.get(productId);
        if (!pb) {
          throw new Error(`Sản phẩm ID ${productId} chưa cấu hình kho chi nhánh`);
        }
        if (pb.stockCount < Number(acc.quantity)) {
          throw new Error(
            `[${pb.product.sku}] ${pb.product.name}: không đủ tồn (cần ${acc.quantity}, còn ${pb.stockCount})`
          );
        }
      }

      // Update order status to PAID
      await tx.inventoryOrder.update({
        where: { id: orderId },
        data: { status: "PAID" }
      });

      for (const item of accessories) {
        const productId = Number(item.productId || item.id);
        if (isNaN(productId)) continue;
        const quantity = Number(item.quantity);

        const pb = pbMap.get(productId);
        const cogsUnit = Number(pb?.movingAvgCost || 0);

        await tx.stockMovement.create({
          data: {
            productId,
            type: "EXPORT",
            quantity,
            unitCost: cogsUnit,
            totalCost: cogsUnit * quantity,
            reason: `Duyệt lệnh xuất theo hồ sơ xe ${vin}`,
            inventoryOrderId: orderId,
            createdBy: "Hệ thống (Bán Xe)",
            branchId: branchId
          }
        });

        await tx.productBranch.update({
          where: { productId_branchId: { productId, branchId } },
          data: { stockCount: { decrement: quantity } }
        });
      }
    });

    notifyRequisitionCountChanged(order.branchId);

    return NextResponse.json({ success: true, message: "Đã phê duyệt và xuất kho thành công", orderCode: order.code });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST reject
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = parseInt(params.id);
    const { reason } = await req.json().catch(() => ({ reason: "Từ chối bởi nhân viên kho" }));

    const order = await prisma.inventoryOrder.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Không tìm thấy lệnh" }, { status: 404 });
    if (order.status !== "PENDING") return NextResponse.json({ error: "Lệnh không ở trạng thái chờ duyệt" }, { status: 400 });

    await prisma.inventoryOrder.update({
      where: { id: orderId },
      data: { status: "CANCELLED", reason: `${order.reason} | Từ chối: ${reason || "Không đủ hàng"}` }
    });

    notifyRequisitionCountChanged(order.branchId);

    return NextResponse.json({ success: true, message: "Đã từ chối lệnh xuất kho" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
