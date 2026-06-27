export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Check stock before approving
    for (const acc of accessories) {
      const productId = Number(acc.productId || acc.id);
      if (isNaN(productId)) continue;
      const pb = await prisma.productBranch.findUnique({
        where: { productId_branchId: { productId, branchId } }
      });
      if (!pb) {
        return NextResponse.json({ error: `Sản phẩm ID ${productId} chưa cấu hình kho chi nhánh` }, { status: 400 });
      }
      if (pb.stockCount < Number(acc.quantity)) {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        return NextResponse.json({
          error: `[${product?.sku}] ${product?.name}: không đủ tồn (cần ${acc.quantity}, còn ${pb.stockCount})`
        }, { status: 400 });
      }
    }

    // Approve: create movements + deduct stock
    await prisma.$transaction(async (tx) => {
      // Update order status to PAID
      await tx.inventoryOrder.update({
        where: { id: orderId },
        data: { status: "PAID" }
      });

      for (const item of accessories) {
        const productId = Number(item.productId || item.id);
        if (isNaN(productId)) continue;
        const quantity = Number(item.quantity);

        const pb = await tx.productBranch.findUnique({
          where: { productId_branchId: { productId, branchId } }
        });
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
            createdBy: "Hệ thống (Bán Xe)"
          }
        });

        await tx.productBranch.update({
          where: { productId_branchId: { productId, branchId } },
          data: { stockCount: { decrement: quantity } }
        });
      }
    });

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

    return NextResponse.json({ success: true, message: "Đã từ chối lệnh xuất kho" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
