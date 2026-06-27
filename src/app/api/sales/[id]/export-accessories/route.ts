export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveBranchId } from "@/lib/branch";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const branchId = getActiveBranchId();

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!vehicle) return NextResponse.json({ error: "Không tìm thấy hồ sơ xe" }, { status: 404 });

    const accessories = JSON.parse(vehicle.accessoriesJson || "[]");
    if (accessories.length === 0) {
      return NextResponse.json({ error: "Hồ sơ này không có phụ tùng/dịch vụ mua kèm" }, { status: 400 });
    }

    // Prepare code
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `PKX-${dateStr}-${randomStr}`; // Phụ Kiện Xe
    
    // Check if already exported
    const existingOrder = await prisma.inventoryOrder.findFirst({
      where: { reason: `Xuất phụ kiện bán kèm xe VIN: ${vehicle.vin}` }
    });
    if (existingOrder) {
      return NextResponse.json({ error: "Phụ kiện của xe này đã được xuất kho trước đó!" }, { status: 400 });
    }

    const userRole = req.cookies.get("user_role")?.value || "Hệ thống";
    
    // Check if enough stock
    for (const acc of accessories) {
      const productId = Number(acc.productId || acc.id);
      if (isNaN(productId)) {
        return NextResponse.json({ error: "ID phụ tùng không hợp lệ trong dữ liệu xe" }, { status: 400 });
      }
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return NextResponse.json({ error: `Phụ tùng ID ${productId} không tồn tại` }, { status: 400 });
      }
      const productBranch = await prisma.productBranch.findUnique({
        where: { productId_branchId: { productId, branchId: vehicle.branchId || 1 } }
      });
      if (!productBranch) {
        return NextResponse.json({ error: `Sản phẩm [${product.sku}] ${product.name} chưa cấu hình kho.` }, { status: 400 });
      }
      if (productBranch.stockCount < acc.quantity) {
        return NextResponse.json({ error: `Sản phẩm [${product.sku}] ${product.name} không đủ tồn kho (Cần ${acc.quantity}, Hiện có ${productBranch.stockCount})` }, { status: 400 });
      }
    }

    // Create Inventory Order and Movements inside transaction
    const order = await prisma.$transaction(async (tx) => {
      const totalAmount = accessories.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);

      const invOrder = await tx.inventoryOrder.create({
        data: {
          code,
          customerId: vehicle.customerId,
          type: "EXPORT_RETAIL",
          totalAmount,
          paidAmount: totalAmount, // Giả sử đã thanh toán gộp trong tiền xe
          debtAmount: 0,
          status: "PAID",
          reason: `Xuất phụ kiện bán kèm xe VIN: ${vehicle.vin}`,
          branchId: vehicle.branchId || branchId,
          createdBy: "Hệ thống (Bán Xe)",
        }
      });

      for (const item of accessories) {
        const productId = Number(item.productId || item.id);
        if (isNaN(productId)) continue;
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) continue;

        const quantity = Number(item.quantity);
        
        const pb = await tx.productBranch.findUnique({
          where: { productId_branchId: { productId, branchId: vehicle.branchId || 1 } }
        });
        const cogsUnit = Number(pb?.movingAvgCost || 0);

        await tx.stockMovement.create({
          data: {
            productId,
            type: "EXPORT",
            quantity,
            unitCost: cogsUnit,
            totalCost: cogsUnit * quantity,
            reason: `Xuất theo hồ sơ xe ${vehicle.vin}`,
            inventoryOrderId: invOrder.id,
            createdBy: "Hệ thống (Bán Xe)"
          }
        });

        await tx.productBranch.update({
          where: { productId_branchId: { productId, branchId: vehicle.branchId || 1 } },
          data: { stockCount: { decrement: quantity } }
        });
      }

      return invOrder;
    });

    return NextResponse.json({ success: true, message: "Đã xuất kho phụ kiện thành công", orderCode: order.code });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
