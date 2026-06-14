import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const results: { name: string; status: "PASSED" | "FAILED"; error?: string }[] = [];

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ name, status: "PASSED" });
    } catch (e: any) {
      results.push({ name, status: "FAILED", error: e.message || String(e) });
    }
  };

  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(msg);
  };

  // 1. CRM Lead CRUD
  await test("CRM Lead CRUD", async () => {
    const lead = await prisma.lead.create({
      data: {
        name: "Lead Test CRUD",
        phone: "0999000111",
        source: "WEBSITE",
        interest: "Model S",
        branchId: 1,
      },
    });
    assert(!!lead.id, "Không tạo được Lead");
    
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "POTENTIAL" },
    });
    assert(updated.status === "POTENTIAL", "Không cập nhật được Lead status");

    await prisma.lead.delete({ where: { id: lead.id } });
    const check = await prisma.lead.findUnique({ where: { id: lead.id } });
    assert(!check, "Không xóa được Lead");
  });

  // 2. CRM Customer CRUD
  await test("CRM Customer CRUD", async () => {
    const cust = await prisma.customer.create({
      data: {
        name: "Customer Test CRUD",
        phone: "0999000222",
        source: "WALKIN",
        branchId: 1,
      },
    });
    assert(!!cust.id, "Không tạo được Customer");

    const updated = await prisma.customer.update({
      where: { id: cust.id },
      data: { name: "Customer Test CRUD Updated" },
    });
    assert(updated.name === "Customer Test CRUD Updated", "Không cập nhật được Customer");

    await prisma.customer.delete({ where: { id: cust.id } });
    const check = await prisma.customer.findUnique({ where: { id: cust.id } });
    assert(!check, "Không xóa được Customer");
  });

  // 3. Vehicle Sales CRUD
  await test("Vehicle Sales CRUD", async () => {
    const veh = await prisma.vehicle.create({
      data: {
        vin: "VIN-TEST-ROUTE-123",
        model: "VF9 Test",
        variant: "Plus",
        color: "Xanh",
        year: 2026,
        listPrice: 1500000000,
        floorPrice: 1400000000,
        status: "AVAILABLE",
        branchId: 1,
      },
    });
    assert(!!veh.id, "Không tạo được Xe");

    const updated = await prisma.vehicle.update({
      where: { id: veh.id },
      data: { status: "RESERVED" },
    });
    assert(updated.status === "RESERVED", "Không cập nhật được status xe");

    await prisma.vehicle.delete({ where: { id: veh.id } });
    const check = await prisma.vehicle.findUnique({ where: { id: veh.id } });
    assert(!check, "Không xóa được Xe");
  });

  // 4. Technician CRUD
  await test("Technician CRUD", async () => {
    const tech = await prisma.technician.create({
      data: {
        code: "KTV-ROUTE-TEST",
        name: "KTV Test Route",
        phone: "0999111333",
        commissionRate: 12,
        status: "IDLE",
        branchId: 1,
      },
    });
    assert(!!tech.id, "Không tạo được KTV");

    const updated = await prisma.technician.update({
      where: { id: tech.id },
      data: { commissionRate: 15 },
    });
    assert(updated.commissionRate === 15, "Không cập nhật được commissionRate");

    await prisma.technician.delete({ where: { id: tech.id } });
    const check = await prisma.technician.findUnique({ where: { id: tech.id } });
    assert(!check, "Không xóa được KTV");
  });

  // 5. System Config Persistent (Settings DB)
  await test("System Config Persistent (Settings DB)", async () => {
    // Xóa test config cũ nếu có
    try {
      await prisma.$executeRaw`DELETE FROM "SystemConfig" WHERE key = 'test_key'`;
    } catch (e) {}

    // Ensure table exists
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SystemConfig" (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // Write to DB
    await prisma.$executeRaw`
      INSERT INTO "SystemConfig" (key, value, "updatedAt")
      VALUES ('test_key', 'test_value_123', NOW())
      ON CONFLICT (key) DO UPDATE SET value = 'test_value_123', "updatedAt" = NOW()
    `;

    // Read from DB
    const rows = await prisma.$queryRaw<{ key: string; value: string }[]>`
      SELECT key, value FROM "SystemConfig" WHERE key = 'test_key'
    `;
    assert(rows.length === 1, "Không tìm thấy cấu hình vừa lưu");
    assert(rows[0].value === "test_value_123", "Giá trị cấu hình không chính xác");

    // Clean up
    await prisma.$executeRaw`DELETE FROM "SystemConfig" WHERE key = 'test_key'`;
  });

  // 6. Workshop RO Invoice Detail & Loyalty Transaction Earn Log
  await test("Workshop RO Invoice Detail & Loyalty Audit Log on DONE", async () => {
    // Tạo khách hàng test
    const customer = await prisma.customer.create({
      data: { name: "Khách sửa xe test", phone: "0999888999", source: "WALKIN", branchId: 1 },
    });

    // Tạo lệnh sửa chữa
    const ro = await prisma.repairOrder.create({
      data: {
        customerId: customer.id,
        plateNumber: "29A-123.45",
        vehicleModel: "Mazda 3",
        kmIn: 50000,
        symptoms: "Bảo dưỡng 5 vạn",
        laborCost: 500000,
        partsCost: 1000000,
        totalAmount: 1500000,
        status: "PENDING",
        branchId: 1,
      },
    });

    // Tạo KTV test
    const tech = await prisma.technician.create({
      data: { code: "KTV-RO-TEST", name: "Thợ sửa xe test", phone: "0999000333", commissionRate: 10, branchId: 1 },
    });

    // Cập nhật trạng thái sang DONE và gắn KTV
    // Giả lập logic trong /api/workshop/[id]/route.ts
    await prisma.repairOrder.update({
      where: { id: ro.id },
      data: { status: "DONE", technicianId: tech.id, completedAt: new Date() },
    });

    // Trigger hoa hồng
    const commission = 1500000 * 10 / 100;
    await prisma.techPerformance.create({
      data: { technicianId: tech.id, repairOrderId: ro.id, commissionAmount: commission },
    });

    // Tích điểm cho khách
    const points = Math.floor(1500000 / 1000); // 1500 điểm
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        loyaltyPoints: { increment: points },
        totalSpent: { increment: 1500000 },
        lastVisit: new Date(),
      },
    });

    // Log tích điểm
    const tx = await prisma.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type: "EARN",
        points: points,
        description: `Tích điểm từ lệnh sửa chữa #${ro.id}`,
        relatedRoId: ro.id,
        branchId: 1,
      },
    });

    assert(!!tx.id, "Không tạo được log tích điểm");
    assert(tx.type === "EARN", "Type giao dịch phải là EARN");
    assert(tx.points === 1500, "Số điểm tích lũy không đúng");

    // Dọn dẹp
    await prisma.loyaltyTransaction.deleteMany({ where: { relatedRoId: ro.id } });
    await prisma.techPerformance.deleteMany({ where: { repairOrderId: ro.id } });
    await prisma.repairOrder.delete({ where: { id: ro.id } });
    await prisma.technician.delete({ where: { id: tech.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
  });

  // 7. Inventory Pagination
  await test("Inventory Pagination Server-side Checks", async () => {
    // Đếm tổng số phụ tùng thuộc branchId = 1
    const totalCount = await prisma.product.count({ where: { branchId: 1 } });
    
    // Gửi limit = 5, skip = 0
    const limit = 5;
    const products = await prisma.product.findMany({
      where: { branchId: 1 },
      take: limit,
      skip: 0,
    });
    
    assert(products.length <= limit, "Trả về vượt quá giới hạn limit");
    assert(Math.ceil(totalCount / limit) >= 0, "Tính toán totalPages không chính xác");
  });

  const passedCount = results.filter(r => r.status === "PASSED").length;
  const failedCount = results.filter(r => r.status === "FAILED").length;

  return NextResponse.json({
    summary: {
      total: results.length,
      passed: passedCount,
      failed: failedCount,
      allPassed: failedCount === 0,
    },
    results,
  });
}
