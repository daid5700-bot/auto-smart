import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Cleaning database & resetting sequences...");
  
  // Clear all tables in dependency order
  await prisma.userBranch.deleteMany({});
  await prisma.price.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.partsRequisitionItem.deleteMany({});
  await prisma.partsRequisition.deleteMany({});
  await prisma.repairOrder.deleteMany({});
  await prisma.znsLog.deleteMany({});
  await prisma.loyaltyTransaction.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.productBranch.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.inventoryOrder.deleteMany({});
  await prisma.technician.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.systemConfig.deleteMany({});

  console.log("🌱 Seeding branches...");
  const branchQ1 = await prisma.branch.create({
    data: {
      name: "Chi nhánh Quận 1",
      address: "123 Nguyễn Thị Minh Khai, Quận 1, TP. HCM",
      phone: "028.39111111",
    },
  });
  const branchQ7 = await prisma.branch.create({
    data: {
      name: "Chi nhánh Quận 7",
      address: "456 Nguyễn Văn Linh, Quận 7, TP. HCM",
      phone: "028.37444444",
    },
  });
  console.log("✅ Branches created");

  console.log("🌱 Seeding admin user...");
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  const adminUser = await prisma.user.create({
    data: {
      name: "Nguyễn Văn Admin",
      email: "admin@autosmart.vn",
      password: hashedPassword,
      role: "ADMIN",
      branches: {
        create: [
          { branchId: branchQ1.id },
          { branchId: branchQ7.id },
        ],
      },
    },
  });
  console.log("✅ Admin user created");

  console.log("🌱 Seeding default system configuration...");
  await prisma.systemConfig.create({
    data: {
      key: "points_rate",
      value: "1.0",
    },
  });
  console.log("✅ Default system configuration created");

  console.log("🌱 Seeding sample products...");
  const engineOil = await prisma.product.create({
    data: {
      sku: "DUMMY-OIL-10W40",
      name: "Dầu nhớt tổng hợp 10W40",
      category: "Dầu nhớt",
      unit: "Chai",
      prices: {
        create: [
          { type: "RETAIL", amount: 180000 },
          { type: "WHOLESALE", amount: 155000 },
        ],
      },
      productBranches: {
        create: [
          { branchId: branchQ1.id, stockCount: 40, stockMin: 5, stockMax: 100, movingAvgCost: 120000 },
          { branchId: branchQ7.id, stockCount: 25, stockMin: 5, stockMax: 100, movingAvgCost: 120000 },
        ],
      },
    },
  });
  console.log(`✅ Product created: ${engineOil.name}`);

  console.log("🌱 Seeding sample technicians...");
  const technicianQ1 = await prisma.technician.create({
    data: { code: "KTV-Q1-01", name: "Nguyễn Hoàng KTV", phone: "0909000001", branchId: branchQ1.id },
  });
  const technicianQ7 = await prisma.technician.create({
    data: { code: "KTV-Q7-01", name: "Trần Minh KTV", phone: "0909000002", branchId: branchQ7.id },
  });

  console.log("🌱 Seeding sample customers...");
  const customerAn = await prisma.customer.create({
    data: {
      name: "Nguyễn Minh An",
      phone: "0901000001",
      email: "an.demo@autosmart.vn",
      source: "WEBSITE",
      loyaltyPoints: 850,
      totalSpent: 12500000,
      lastVisit: new Date("2026-07-10"),
      vehiclePlates: ["51A-111.11"],
      tags: ["VIP"],
      branchId: branchQ1.id,
    },
  });
  const customerBao = await prisma.customer.create({
    data: {
      name: "Trần Quốc Bảo",
      phone: "0901000002",
      email: "bao.demo@autosmart.vn",
      source: "REFERRAL",
      loyaltyPoints: 420,
      totalSpent: 8200000,
      lastVisit: new Date("2026-07-12"),
      vehiclePlates: ["51H-222.22", "51Q-777.77"],
      tags: ["Khách thân thiết"],
      // Hồ sơ khách hàng ở Quận 1, nhưng có giao dịch thêm tại Quận 7.
      branchId: branchQ1.id,
    },
  });
  const customerHoa = await prisma.customer.create({
    data: {
      name: "Lê Thị Hoa",
      phone: "0901000003",
      source: "WALKIN",
      loyaltyPoints: 120,
      totalSpent: 2600000,
      lastVisit: new Date("2026-02-15"),
      vehiclePlates: ["59B-333.33"],
      tags: [],
      branchId: branchQ7.id,
    },
  });
  const customerDuy = await prisma.customer.create({
    data: {
      name: "Phạm Gia Duy",
      phone: "0901000004",
      source: "FACEBOOK",
      loyaltyPoints: 60,
      totalSpent: 950000,
      lastVisit: new Date("2026-01-20"),
      vehiclePlates: [],
      tags: ["Tiềm năng"],
      branchId: branchQ7.id,
    },
  });
  console.log("✅ 4 sample customers created");

  console.log("🌱 Seeding sample vehicles and transactions...");
  const vehicleAn = await prisma.vehicle.create({
    data: {
      vin: "DEMO-VIN-AN-0001",
      model: "Yamaha Grande",
      variant: "Đặc biệt",
      color: "Xanh đen",
      year: 2025,
      status: "SOLD",
      listPrice: 52000000,
      floorPrice: 50000000,
      paidAmount: 52000000,
      debtAmount: 0,
      customerId: customerAn.id,
      branchId: branchQ1.id,
    },
  });
  const vehicleBaoQ1 = await prisma.vehicle.create({
    data: {
      vin: "DEMO-VIN-BAO-Q1",
      model: "Honda SH Mode",
      variant: "Thời trang",
      color: "Trắng",
      year: 2024,
      status: "SOLD",
      listPrice: 62000000,
      floorPrice: 60000000,
      paidAmount: 62000000,
      debtAmount: 0,
      customerId: customerBao.id,
      branchId: branchQ1.id,
    },
  });
  const vehicleBaoQ7 = await prisma.vehicle.create({
    data: {
      vin: "DEMO-VIN-BAO-Q7",
      model: "Yamaha Janus",
      variant: "Tiêu chuẩn",
      color: "Đỏ",
      year: 2025,
      status: "SOLD",
      listPrice: 32000000,
      floorPrice: 30000000,
      paidAmount: 30000000,
      debtAmount: 2000000,
      customerId: customerBao.id,
      branchId: branchQ7.id,
    },
  });
  await prisma.vehicle.create({
    data: {
      vin: "DEMO-VIN-HOA-0001",
      model: "Honda Vision",
      variant: "Cao cấp",
      color: "Đen",
      year: 2024,
      status: "SOLD",
      listPrice: 38000000,
      floorPrice: 36000000,
      paidAmount: 38000000,
      debtAmount: 0,
      customerId: customerHoa.id,
      branchId: branchQ7.id,
    },
  });

  const repairAn = await prisma.repairOrder.create({
    data: {
      customerId: customerAn.id,
      plateNumber: "51A-111.11",
      vehicleModel: vehicleAn.model,
      kmIn: 8500,
      symptoms: "Bảo dưỡng định kỳ, thay dầu nhớt",
      status: "DELIVERED",
      technicianId: technicianQ1.id,
      createdById: adminUser.id,
      branchId: branchQ1.id,
      laborCost: 150000,
      partsCost: 180000,
      totalAmount: 330000,
      paidAmount: 330000,
      debtAmount: 0,
      completedAt: new Date("2026-07-10"),
      photos: [],
      items: {
        create: [{ productId: engineOil.id, quantity: 1, unitPrice: 180000, totalPrice: 180000 }],
      },
    },
  });
  const repairBaoQ7 = await prisma.repairOrder.create({
    data: {
      customerId: customerBao.id,
      plateNumber: "51Q-777.77",
      vehicleModel: vehicleBaoQ7.model,
      kmIn: 12000,
      symptoms: "Kiểm tra phanh và thay dầu",
      status: "DONE",
      technicianId: technicianQ7.id,
      createdById: adminUser.id,
      branchId: branchQ7.id,
      laborCost: 250000,
      partsCost: 180000,
      totalAmount: 430000,
      paidAmount: 430000,
      debtAmount: 0,
      completedAt: new Date("2026-07-12"),
      photos: [],
      items: {
        create: [{ productId: engineOil.id, quantity: 1, unitPrice: 180000, totalPrice: 180000 }],
      },
    },
  });

  await prisma.inventoryOrder.create({
    data: {
      code: "DEMO-ORD-Q1-0001",
      customerId: customerAn.id,
      type: "EXPORT_RETAIL",
      totalAmount: 180000,
      paidAmount: 180000,
      debtAmount: 0,
      status: "PAID",
      reason: "Bán dầu nhớt mẫu",
      branchId: branchQ1.id,
      createdBy: "Seed dữ liệu mẫu",
    },
  });
  await prisma.inventoryOrder.create({
    data: {
      code: "DEMO-ORD-Q7-0001",
      customerId: customerBao.id,
      type: "EXPORT_RETAIL",
      totalAmount: 180000,
      paidAmount: 0,
      debtAmount: 180000,
      status: "DEBT",
      reason: "Bán dầu nhớt mẫu - công nợ",
      branchId: branchQ7.id,
      createdBy: "Seed dữ liệu mẫu",
    },
  });

  await prisma.loyaltyTransaction.createMany({
    data: [
      { customerId: customerAn.id, type: "EARN", points: 330, description: "Tích điểm từ bảo dưỡng", relatedRoId: repairAn.id, branchId: branchQ1.id },
      { customerId: customerBao.id, type: "EARN", points: 430, description: "Tích điểm từ dịch vụ", relatedRoId: repairBaoQ7.id, branchId: branchQ7.id },
      { customerId: customerHoa.id, type: "EARN", points: 120, description: "Tích điểm từ mua xe", branchId: branchQ7.id },
    ],
  });

  await prisma.paymentTransaction.createMany({
    data: [
      { code: "DEMO-PAY-Q1-0001", amount: 330000, method: "CASH", type: "INCOME", referenceId: repairAn.id, referenceType: "REPAIR_ORDER", note: "Thanh toán bảo dưỡng mẫu", branchId: branchQ1.id, createdBy: "Seed dữ liệu mẫu" },
      { code: "DEMO-PAY-Q7-0001", amount: 430000, method: "BANK_TRANSFER", type: "INCOME", referenceId: repairBaoQ7.id, referenceType: "REPAIR_ORDER", note: "Thanh toán sửa chữa mẫu", branchId: branchQ7.id, createdBy: "Seed dữ liệu mẫu" },
      { code: "DEMO-PAY-Q1-0002", amount: 52000000, method: "BANK_TRANSFER", type: "INCOME", referenceId: vehicleAn.id, referenceType: "VEHICLE_SALE", note: "Thanh toán mua xe mẫu", branchId: branchQ1.id, createdBy: "Seed dữ liệu mẫu" },
    ],
  });
  console.log("✅ Sample vehicles, repair orders, inventory orders and payments created");

  console.log("🎉 Cleaning and sample data setup complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
