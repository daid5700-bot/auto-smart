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

    // Check if already requested (PENDING or PAID)
    const existingOrder = await prisma.inventoryOrder.findFirst({
      where: { reason: `Xuất phụ kiện bán kèm xe VIN: ${vehicle.vin}` }
    });
    if (existingOrder) {
      if (existingOrder.status === "PENDING") {
        return NextResponse.json({ error: "Đã có lệnh xuất kho đang chờ kho duyệt!" }, { status: 400 });
      }
      return NextResponse.json({ error: "Phụ kiện của xe này đã được xuất kho!" }, { status: 400 });
    }

    // Validate all products exist (but don't check stock — stock is checked at approval time)
    for (const acc of accessories) {
      const productId = Number(acc.productId || acc.id);
      if (isNaN(productId)) {
        return NextResponse.json({ error: "ID phụ tùng không hợp lệ trong dữ liệu xe" }, { status: 400 });
      }
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return NextResponse.json({ error: `Phụ tùng ID ${productId} không tồn tại` }, { status: 400 });
      }
    }

    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `PKX-${dateStr}-${randomStr}`;

    const totalAmount = accessories.reduce(
      (sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0
    );

    // Create PENDING inventory order — no stock deduction yet
    const invOrder = await prisma.inventoryOrder.create({
      data: {
        code,
        customerId: vehicle.customerId,
        type: "EXPORT_RETAIL",
        totalAmount,
        paidAmount: totalAmount,
        debtAmount: 0,
        status: "PENDING", // Chờ kho duyệt
        reason: `Xuất phụ kiện bán kèm xe VIN: ${vehicle.vin}`,
        branchId: vehicle.branchId || branchId,
        createdBy: "Hệ thống (Bán Xe)",
      }
    });

    return NextResponse.json({
      success: true,
      message: "Đã gửi lệnh xuất kho — đang chờ nhân viên kho phê duyệt",
      orderCode: invOrder.code,
      orderId: invOrder.id,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
