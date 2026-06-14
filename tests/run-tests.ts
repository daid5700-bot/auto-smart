import assert from "assert";
import { prisma } from "../src/lib/prisma";
import {
  importStock,
  sellItem,
  updateROStatus,
  exportStockForRO,
  sendZNSMock
} from "../src/app/actions";
import {
  getPriceForCustomer,
  getFinalPrice,
  checkStockWarning,
  checkSlowMoving,
  calculatePoints,
  redeemPoints,
  calculateNextOilChange
} from "../src/lib/utils";
import { middleware } from "../src/middleware";
import { NextRequest, NextResponse } from "next/server";

async function runTests() {
  console.log("🚀 BẮT ĐẦU CHẠY 19 UNIT TEST CASES CHO AUTO-SMART NEXT-GEN...\n");

  let testCount = 0;
  let passedCount = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    testCount++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        res.then(() => {
          console.log(`✅ Test Case ${testCount}: ${name} - THÀNH CÔNG`);
          passedCount++;
        }).catch((err) => {
          console.error(`❌ Test Case ${testCount}: ${name} - THẤT BẠI`);
          console.error(err);
        });
      } else {
        console.log(`✅ Test Case ${testCount}: ${name} - THÀNH CÔNG`);
        passedCount++;
      }
    } catch (err) {
      console.error(`❌ Test Case ${testCount}: ${name} - THẤT BẠI`);
      console.error(err);
    }
  }

  // 1. Phân hệ Quản lý Phụ tùng (Inventory)

  // Test Case 1: Tính giá trung bình khi quy đổi
  test("Tính giá trung bình khi quy đổi (WAC)", async () => {
    // Giá 1 thùng (24 chai) là 2.400.000đ -> Giá 1 chai lẻ là 100.000đ
    const result = await importStock({
      productId: 1, // Dùng ID 1 của sản phẩm đã seed
      quantity: 1,
      unitCost: 2400000,
      conversionFactor: 24
    });
    assert.strictEqual(result.avgCost, 100000);
  });

  // Test Case 2: Cập nhật tồn kho sau khi bán lẻ
  test("Cập nhật tồn kho sau khi bán lẻ", async () => {
    // Tạo sản phẩm thử nghiệm với số lượng tồn ban đầu = 24
    const prod = await prisma.product.create({
      data: {
        sku: "TEST-INV-02",
        name: "Dầu Nhớt Test",
        unit: "Chai",
        stockCount: 24,
        stockMin: 5,
        stockMax: 100,
      }
    });

    try {
      // Bán 2 chai
      await sellItem(prod.id, 2);
      const updated = await prisma.product.findUnique({ where: { id: prod.id } });
      assert.strictEqual(updated?.stockCount, 22);
    } finally {
      // Dọn dẹp
      await prisma.product.delete({ where: { id: prod.id } });
    }
  });

  // Test Case 3: Xử lý quy đổi không chia hết
  test("Xử lý quy đổi không chia hết (Ném lỗi khi factor <= 0)", async () => {
    await assert.rejects(
      importStock({
        productId: 1,
        quantity: 1,
        unitCost: 2400000,
        conversionFactor: 0
      }),
      /Conversion factor must be greater than 0/
    );
  });

  // Test Case 4: Tự động chọn bảng giá theo loại khách
  test("Tự động chọn bảng giá theo loại khách hàng", () => {
    const mockProduct = {
      prices: [
        { type: "RETAIL", amount: 500000 },
        { type: "WHOLESALE", amount: 400000 }
      ]
    };
    const price = getPriceForCustomer(mockProduct, "Đại lý");
    assert.strictEqual(price, 400000);
  });

  // Test Case 5: Ưu tiên bảng giá thiết lập thủ công
  test("Ưu tiên bảng giá ghi đè thiết lập thủ công", () => {
    const mockProduct = {
      prices: [
        { type: "RETAIL", amount: 500000 },
        { type: "WHOLESALE", amount: 400000 }
      ]
    };
    const finalPrice = getFinalPrice(mockProduct, "Đại lý", 350000);
    assert.strictEqual(finalPrice, 350000);
  });

  // Test Case 6: Kiểm tra ngưỡng tồn kho thấp/cao
  test("Cảnh báo khi tồn kho dưới ngưỡng an toàn", () => {
    const mockProduct = { stockCount: 4, stockMin: 5 };
    const status = checkStockWarning(mockProduct);
    assert.strictEqual(status, "LOW_STOCK_WARNING");
  });

  // Test Case 7: Cảnh báo hàng tồn kho lâu ngày
  test("Cảnh báo hàng tồn kho lâu ngày (SLOW_MOVING)", () => {
    const hundredDaysAgo = new Date();
    hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);
    const mockProduct = { lastImportDate: hundredDaysAgo };
    const status = checkSlowMoving(mockProduct);
    assert.strictEqual(status, "SLOW_MOVING");
  });

  // 2. Phân hệ Xưởng dịch vụ (Workshop)

  // Test Case 8: Thay đổi trạng thái lệnh (Workflow)
  test("Thay đổi trạng thái lệnh sửa chữa sang DONE cập nhật completedAt", async () => {
    const customer = await prisma.customer.findFirst();
    if (!customer) throw new Error("Chưa seed khách hàng");

    const ro = await prisma.repairOrder.create({
      data: {
        customerId: customer.id,
        plateNumber: "29A-999.99",
        vehicleModel: "BMW M5",
        status: "PENDING",
        laborCost: 100000,
        partsCost: 0,
        totalAmount: 100000,
      }
    });

    try {
      const result = await updateROStatus({ repairOrderId: ro.id, newStatus: "DONE" });
      assert.ok(result.ro.completedAt);
    } finally {
      await prisma.repairOrder.delete({ where: { id: ro.id } }).catch(() => {});
    }
  });

  // Test Case 9: Tính tổng tiền Bill tự động
  test("Tính tổng tiền Bill tự động (Labor + Parts)", async () => {
    const customer = await prisma.customer.findFirst();
    const product = await prisma.product.create({
      data: {
        sku: "TEST-INV-09",
        name: "Má phanh Test",
        unit: "Bộ",
        stockCount: 10,
        prices: { create: { type: "RETAIL", amount: 200000 } }
      }
    });

    const ro = await prisma.repairOrder.create({
      data: {
        customerId: customer!.id,
        plateNumber: "29A-888.88",
        vehicleModel: "Lexus RX",
        status: "PENDING",
        laborCost: 100000,
        partsCost: 0,
        totalAmount: 100000,
      }
    });

    try {
      await exportStockForRO({
        repairOrderId: ro.id,
        productId: product.id,
        quantity: 1,
        priceType: "RETAIL"
      });

      const updatedRo = await prisma.repairOrder.findUnique({ where: { id: ro.id } });
      assert.strictEqual(Number(updatedRo?.totalAmount), 300000); // 100k công + 200k phụ tùng
    } finally {
      await prisma.repairOrder.delete({ where: { id: ro.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
    }
  });

  // Test Case 10: Tính hoa hồng KTV
  test("Tính hoa hồng cho Kỹ thuật viên khi hoàn thành lệnh", async () => {
    const customer = await prisma.customer.findFirst();
    const tech = await prisma.technician.create({
      data: { code: "T_TEST_10", name: "Thợ Test 10", commissionRate: 5 }
    });

    const ro = await prisma.repairOrder.create({
      data: {
        customerId: customer!.id,
        plateNumber: "29A-777.77",
        vehicleModel: "Audi R8",
        status: "REPAIRING",
        technicianId: tech.id,
        laborCost: 1000000,
        partsCost: 0,
        totalAmount: 1000000,
      }
    });

    try {
      await updateROStatus({ repairOrderId: ro.id, newStatus: "DONE" });
      const perf = await prisma.techPerformance.findFirst({ where: { repairOrderId: ro.id } });
      assert.strictEqual(Number(perf?.commissionAmount), 50000); // 5% của 1M = 50.000đ
    } finally {
      await prisma.repairOrder.delete({ where: { id: ro.id } }).catch(() => {});
      await prisma.technician.delete({ where: { id: tech.id } }).catch(() => {});
    }
  });

  // Test Case 11: Liên kết Kho - Xưởng
  test("Xuất kho cập nhật tồn kho phụ tùng dầu nhớt", async () => {
    const customer = await prisma.customer.findFirst();
    const product = await prisma.product.create({
      data: {
        sku: "OIL-TEST-11",
        name: "Dầu động cơ Test 11",
        unit: "Hộp",
        stockCount: 5,
        prices: { create: { type: "RETAIL", amount: 150000 } }
      }
    });

    const ro = await prisma.repairOrder.create({
      data: {
        customerId: customer!.id,
        plateNumber: "29A-666.66",
        vehicleModel: "Honda Civic",
        status: "PENDING",
        laborCost: 50000,
      }
    });

    try {
      await exportStockForRO({
        repairOrderId: ro.id,
        productId: product.id,
        quantity: 1,
        priceType: "RETAIL"
      });

      const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
      assert.strictEqual(updatedProduct?.stockCount, 4); // Giảm đi 1
    } finally {
      await prisma.repairOrder.delete({ where: { id: ro.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
    }
  });

  // 3. Phân hệ Bán xe (Sales)

  // Test Case 12: Kiểm tra trùng mã số khung (VIN)
  test("Ngăn chặn tạo xe trùng mã số khung (VIN)", async () => {
    const vin = "VIN-DUPLICATE-12";
    await prisma.vehicle.create({
      data: { vin, model: "Hyundai SantaFe", listPrice: 1000000000, floorPrice: 950000000, year: 2026 }
    });

    try {
      await assert.rejects(
        prisma.vehicle.create({
          data: { vin, model: "Hyundai Tucson", listPrice: 800000000, floorPrice: 750000000, year: 2026 }
        })
      );
    } finally {
      await prisma.vehicle.delete({ where: { vin } });
    }
  });

  // Test Case 13: Cập nhật trạng thái xe đặt cọc
  test("Cập nhật trạng thái xe sang RESERVED", async () => {
    const vehicle = await prisma.vehicle.create({
      data: { vin: "VIN-TEST-13", model: "Kia Seltos", listPrice: 650000000, floorPrice: 620000000, year: 2026, status: "AVAILABLE" }
    });

    try {
      const updated = await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { status: "RESERVED" }
      });
      assert.strictEqual(updated.status, "RESERVED");
    } finally {
      await prisma.vehicle.delete({ where: { id: vehicle.id } });
    }
  });

  // 4. Phân hệ Chăm sóc khách hàng (CRM)

  // Test Case 14: Tích điểm sau thanh toán
  test("Tích điểm khách hàng dựa trên tỷ lệ thanh toán", () => {
    const points = calculatePoints(10000000, 1); // 10 triệu * 1%
    assert.strictEqual(points, 100000);
  });

  // Test Case 15: Sử dụng điểm để giảm giá
  test("Sử dụng điểm Loyalty để trừ hóa đơn", () => {
    const { finalBill, remainingPoints } = redeemPoints(50000, 500000);
    assert.strictEqual(finalBill, 450000);
    assert.strictEqual(remainingPoints, 0);
  });

  // Test Case 16: Tính ngày nhắc lịch thay dầu
  test("Tính toán ngày nhắc lịch thay dầu bảo dưỡng định kỳ", () => {
    const lastChange = new Date("2024-01-01");
    const nextDate = calculateNextOilChange(lastChange, 6);
    assert.strictEqual(nextDate.getMonth(), 6); // Tháng 7 (Index 6)
    assert.strictEqual(nextDate.getDate(), 1);
  });

  // Test Case 17: Gửi tin ZNS giả lập
  test("Gửi tin nhắn ZNS giả lập và xác minh payload nhận được", async () => {
    const res = await sendZNSMock("0901234567", "T_THANK_YOU", { name: "Hùng" });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.sentTo, "0901234567");
    assert.strictEqual(res.payload.name, "Hùng");
  });

  // 5. Phân quyền & Bảo mật (Auth & RBAC)

  // Test Case 18: Phân quyền Middleware
  test("Middleware chặn truy cập trái phép của vai trò Sales", () => {
    const mockRequest = {
      nextUrl: { pathname: "/inventory/settings" },
      cookies: {
        get: (name: string) => {
          if (name === "user_role") return { value: "SALES" };
          return undefined;
        }
      },
      url: "http://localhost:3000/inventory/settings"
    } as unknown as NextRequest;

    const response = middleware(mockRequest);
    // Sales chỉ có quyền truy cập /sales và /crm, nên truy cập /inventory/settings sẽ bị chuyển hướng
    assert.ok(response?.headers.get("location")?.includes("/sales"));
  });

  // Test Case 19: Kiểm tra Token hết hạn (Thiếu cookie trả về redirect/error)
  test("Middleware redirect về login khi không có cookie session", () => {
    const mockRequest = {
      nextUrl: { pathname: "/admin" },
      cookies: {
        get: () => undefined
      },
      url: "http://localhost:3000/admin"
    } as unknown as NextRequest;

    const response = middleware(mockRequest);
    assert.ok(response?.headers.get("location")?.includes("/login"));
  });

  setTimeout(() => {
    console.log(`\n🎉 HOÀN THÀNH: Đã vượt qua ${passedCount}/${testCount} test cases!`);
  }, 4000);
}

runTests();
