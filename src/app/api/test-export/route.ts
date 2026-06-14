import { NextRequest, NextResponse } from "next/server";
import { createManualExport } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const log: string[] = [];
  try {
    log.push("🧪 Bắt đầu kiểm thử createManualExport...");

    // 1. Tìm sản phẩm hoạt động để test
    const product = await prisma.product.findFirst({
      where: { status: "ACTIVE" },
      include: { prices: true }
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "Không tìm thấy sản phẩm hoạt động để test" }, { status: 400 });
    }

    const initialStock = product.stockCount;
    log.push(`Tìm thấy sản phẩm: ${product.name} (SKU: ${product.sku}), Tồn kho ban đầu: ${initialStock}`);

    // === THỬ NGHIỆM 1: XUẤT KHO BÁN LẺ ===
    log.push("Đang chạy thử nghiệm Xuất kho bán lẻ...");
    const retailRes = await createManualExport({
      items: [{
        productId: product.id,
        quantity: 1,
        priceType: "RETAIL"
      }],
      exportType: "RETAIL",
      reason: "Đơn xuất thử nghiệm bán lẻ API",
      createdBy: "Hệ thống kiểm thử"
    });

    if (!retailRes.success || !retailRes.movements || retailRes.movements.length === 0) {
      throw new Error("Lỗi gọi hàm xuất kho bán lẻ");
    }

    // Kiểm tra tồn kho sau khi bán lẻ
    const productAfterRetail = await prisma.product.findUnique({
      where: { id: product.id }
    });
    log.push(`Tồn kho sau khi bán lẻ: ${productAfterRetail?.stockCount}`);
    if (productAfterRetail?.stockCount !== initialStock - 1) {
      throw new Error("Tồn kho sau khi xuất bán lẻ không khớp");
    }

    // Kiểm tra bản ghi StockMovement được tạo
    const retailMovement = await prisma.stockMovement.findFirst({
      where: { id: retailRes.movements[0].id }
    });
    if (!retailMovement || retailMovement.reason !== "Đơn xuất thử nghiệm bán lẻ API" || retailMovement.type !== "EXPORT") {
      throw new Error("Bản ghi biến động kho bán lẻ không chính xác");
    }
    log.push("✅ Thử nghiệm Xuất kho bán lẻ: THÀNH CÔNG");

    // === THỬ NGHIỆM 2: XUẤT KHO SỬA CHỮA (RO) ===
    const ro = await prisma.repairOrder.findFirst();
    let repairPassed = "Bị bỏ qua (Không có RO)";
    
    if (ro) {
      log.push(`Tìm thấy Lệnh sửa chữa: RO #${ro.id}, Tiền phụ tùng ban đầu: ${ro.partsCost}, Tổng cộng: ${ro.totalAmount}`);
      log.push("Đang chạy thử nghiệm Xuất kho sửa chữa...");

      const repairRes = await createManualExport({
        items: [{
          productId: product.id,
          quantity: 1,
          priceType: "RETAIL"
        }],
        exportType: "REPAIR",
        repairOrderId: ro.id,
        reason: "Đơn xuất thử nghiệm sửa chữa API",
        createdBy: "Hệ thống kiểm thử"
      });

      if (!repairRes.success) {
        throw new Error("Lỗi gọi hàm xuất kho sửa chữa");
      }

      if (!repairRes.items || repairRes.items.length === 0 || !repairRes.movements || repairRes.movements.length === 0) {
        throw new Error("Thông tin phản hồi từ hàm xuất sửa chữa thiếu dữ liệu");
      }

      // Kiểm tra tồn kho sau khi xuất sửa chữa
      const productAfterRepair = await prisma.product.findUnique({
        where: { id: product.id }
      });
      log.push(`Tồn kho sau khi xuất sửa chữa: ${productAfterRepair?.stockCount}`);
      if (productAfterRepair?.stockCount !== initialStock - 2) {
        throw new Error("Tồn kho sau khi xuất sửa chữa không khớp");
      }

      // Kiểm tra OrderItem được tạo
      const orderItem = await prisma.orderItem.findFirst({
        where: { id: repairRes.items[0].id }
      });
      if (!orderItem || orderItem.repairOrderId !== ro.id || orderItem.productId !== product.id) {
        throw new Error("Bản ghi OrderItem được tạo không chính xác");
      }

      // Kiểm tra hóa đơn sửa chữa RO được cập nhật tiền phụ tùng
      const updatedRo = await prisma.repairOrder.findUnique({
        where: { id: ro.id }
      });
      log.push(`RO #${ro.id} sau khi xuất vật tư - Tiền phụ tùng: ${updatedRo?.partsCost}, Tổng tiền: ${updatedRo?.totalAmount}`);
      if (Number(updatedRo?.partsCost) === Number(ro.partsCost)) {
        throw new Error("Hóa đơn RO không được cộng thêm tiền phụ tùng");
      }

      log.push("✅ Thử nghiệm Xuất kho sửa chữa: THÀNH CÔNG");
      repairPassed = "THÀNH CÔNG";

      // --- DỌN DẸP DỮ LIỆU ĐỂ TRÁNH ẢNH HƯỞNG DB THẬT ---
      log.push("Đang dọn dẹp dữ liệu kiểm thử...");
      // Xóa bản ghi OrderItem và cập nhật lại RO về ban đầu
      await prisma.orderItem.delete({ where: { id: repairRes.items[0].id } });
      await prisma.repairOrder.update({
        where: { id: ro.id },
        data: {
          partsCost: ro.partsCost,
          totalAmount: ro.totalAmount
        }
      });
      // Xóa StockMovement của xuất sửa chữa
      await prisma.stockMovement.delete({ where: { id: repairRes.movements[0].id } });
    }

    // Dọn dẹp bản ghi xuất bán lẻ
    await prisma.stockMovement.delete({ where: { id: retailRes.movements[0].id } });
    
    // Khôi phục lại tồn kho sản phẩm về ban đầu
    await prisma.product.update({
      where: { id: product.id },
      data: { stockCount: initialStock }
    });
    
    log.push("🧹 Dọn dẹp dữ liệu hoàn tất!");

    return NextResponse.json({
      success: true,
      results: {
        retailExport: "THÀNH CÔNG",
        repairExport: repairPassed,
      },
      log
    });
  } catch (error: any) {
    log.push(`❌ Lỗi: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error.message,
      log
    }, { status: 500 });
  }
}
