import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Cleaning database & resetting sequences...");
  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        "UserBranch", "Price", "StockMovement", "OrderItem", 
        "RepairOrder", "ZnsLog", "Lead", "Vehicle", "Product", 
        "User", "Branch", "Customer", "TechPerformance", "Technician" 
      RESTART IDENTITY CASCADE;
    `);
  } catch (err) {
    console.log("Fallback to deleteMany due to:", err);
    await prisma.userBranch.deleteMany({});
    await prisma.price.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.repairOrder.deleteMany({});
    await prisma.znsLog.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.techPerformance.deleteMany({});
    await prisma.technician.deleteMany({});
  }

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

  // ===== USERS =====
  console.log("🌱 Seeding users and linking to branches...");
  const admin = await prisma.user.create({
    data: {
      name: "Nguyễn Văn Admin",
      email: "admin@autosmart.vn",
      password: "admin123",
      role: "ADMIN",
      branches: {
        create: [
          { branchId: branchQ1.id },
          { branchId: branchQ7.id },
        ],
      },
    },
  });
  const kho = await prisma.user.create({
    data: {
      name: "Trần Thị Kho",
      email: "kho@autosmart.vn",
      password: "kho123",
      role: "WAREHOUSE",
      branches: {
        create: [
          { branchId: branchQ1.id },
          { branchId: branchQ7.id },
        ],
      },
    },
  });
  const xuong = await prisma.user.create({
    data: {
      name: "Lê Văn Xưởng",
      email: "xuong@autosmart.vn",
      password: "xuong123",
      role: "WORKSHOP",
      branches: {
        create: [
          { branchId: branchQ1.id },
          { branchId: branchQ7.id },
        ],
      },
    },
  });
  const sales = await prisma.user.create({
    data: {
      name: "Phạm Thị Sales",
      email: "sales@autosmart.vn",
      password: "sales123",
      role: "SALES",
      branches: {
        create: [
          { branchId: branchQ7.id },
        ],
      },
    },
  });
  const cskh = await prisma.user.create({
    data: {
      name: "Hoàng Văn CSKH",
      email: "cskh@autosmart.vn",
      password: "cskh123",
      role: "CRM",
      branches: {
        create: [
          { branchId: branchQ1.id },
        ],
      },
    },
  });
  console.log("✅ Users created and linked");

  // ===== PRODUCTS (PARTS) =====
  console.log("🌱 Seeding products for branches...");
  // Branch Q1 Products
  const locGio = await prisma.product.create({
    data: {
      sku: "LG-001",
      name: "Lọc gió",
      category: "Lọc",
      unit: "Cái",
      productBranches: {
        create: [
          {
            branchId: branchQ1.id,
            stockCount: 45,
            stockMin: 10,
            stockMax: 100,
            lastImportDate: new Date("2026-05-20"),
          }
        ]
      },
      prices: {
        create: [
          { type: "RETAIL", amount: 150000 },
          { type: "WHOLESALE", amount: 120000 },
          { type: "INSURANCE", amount: 180000 },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      sku: "LG-001A",
      name: "Lọc gió thường",
      parentId: locGio.id,
      category: "Lọc",
      unit: "Cái",
      productBranches: {
        create: [
          {
            branchId: branchQ1.id,
            stockCount: 30,
            stockMin: 5,
            stockMax: 50,
            lastImportDate: new Date("2026-05-20"),
          }
        ]
      },
      prices: {
        create: [
          { type: "RETAIL", amount: 120000 },
          { type: "WHOLESALE", amount: 95000 },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      sku: "LG-001B",
      name: "Lọc gió cao cấp",
      parentId: locGio.id,
      category: "Lọc",
      unit: "Cái",
      productBranches: {
        create: [
          {
            branchId: branchQ1.id,
            stockCount: 15,
            stockMin: 5,
            stockMax: 50,
            lastImportDate: new Date("2026-05-15"),
          }
        ]
      },
      prices: {
        create: [
          { type: "RETAIL", amount: 250000 },
          { type: "WHOLESALE", amount: 200000 },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      sku: "ND-001",
      name: "Nhớt 5W-30",
      category: "Nhớt",
      unit: "Chai",
      conversionUnit: "Thùng",
      conversionFactor: 24,
      productBranches: {
        create: [
          {
            branchId: branchQ1.id,
            stockCount: 120,
            stockMin: 24,
            stockMax: 240,
            lastImportDate: new Date("2026-06-01"),
          }
        ]
      },
      prices: {
        create: [
          { type: "RETAIL", amount: 250000 },
          { type: "WHOLESALE", amount: 200000 },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      sku: "MP-001",
      name: "Má phanh trước",
      category: "Phanh",
      unit: "Bộ",
      productBranches: {
        create: [
          {
            branchId: branchQ1.id,
            stockCount: 8,
            stockMin: 10,
            stockMax: 40,
            lastImportDate: new Date("2026-04-10"),
          }
        ]
      },
      prices: {
        create: [
          { type: "RETAIL", amount: 850000 },
          { type: "WHOLESALE", amount: 700000 },
        ],
      },
    },
  });

  // Branch Q7 Products
  await prisma.product.create({
    data: {
      sku: "BQ-001",
      name: "Bình ắc quy 12V",
      category: "Điện",
      unit: "Cái",
      productBranches: {
        create: [
          {
            branchId: branchQ7.id,
            stockCount: 5,
            stockMin: 3,
            stockMax: 20,
            lastImportDate: new Date("2026-06-05"),
          }
        ]
      },
      prices: {
        create: [
          { type: "RETAIL", amount: 2500000 },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      sku: "LD-001",
      name: "Lọc dầu",
      category: "Lọc",
      unit: "Cái",
      productBranches: {
        create: [
          {
            branchId: branchQ7.id,
            stockCount: 50,
            stockMin: 10,
            stockMax: 80,
            lastImportDate: new Date("2026-06-10"),
          }
        ]
      },
      prices: {
        create: [
          { type: "RETAIL", amount: 120000 },
          { type: "WHOLESALE", amount: 90000 },
        ],
      },
    },
  });
  await prisma.product.create({
    data: {
      sku: "BL-001",
      name: "Bóng đèn LED H4",
      category: "Đèn",
      unit: "Cặp",
      productBranches: {
        create: [
          {
            branchId: branchQ7.id,
            stockCount: 2,
            stockMin: 5,
            stockMax: 30,
            lastImportDate: new Date("2026-03-01"),
          }
        ]
      },
      prices: {
        create: [
          { type: "RETAIL", amount: 450000 },
        ],
      },
    },
  });
  console.log("✅ Products created for branches");

  // ===== TECHNICIANS =====
  const ktv1 = await prisma.technician.create({ data: { code: "KTV-001", name: "Nguyễn Văn Hải", phone: "0911111111", status: "WORKING", commissionRate: 10, branchId: branchQ1.id } as any });
  const ktv2 = await prisma.technician.create({ data: { code: "KTV-002", name: "Trần Minh Đức", phone: "0922222222", status: "IDLE", commissionRate: 10, branchId: branchQ1.id } as any });
  const ktv3 = await prisma.technician.create({ data: { code: "KTV-003", name: "Lê Quang Vinh", phone: "0933333333", status: "WORKING", commissionRate: 12, branchId: branchQ7.id } as any });
  const ktv4 = await prisma.technician.create({ data: { code: "KTV-004", name: "Phạm Thanh Tùng", phone: "0944444444", status: "IDLE", commissionRate: 8, branchId: branchQ7.id } as any });
  console.log("✅ Technicians created");

  // ===== CUSTOMERS =====
  const c1 = await prisma.customer.create({ data: { name: "Nguyễn Minh Tuấn", phone: "0912345678", email: "tuan@gmail.com", source: "WALKIN", loyaltyPoints: 2500, totalSpent: 45000000, lastVisit: new Date("2026-06-10"), vehiclePlates: ["51A-123.45"], tags: ["VIP"], branchId: branchQ1.id } as any });
  const c2 = await prisma.customer.create({ data: { name: "Trần Thị Hương", phone: "0987654321", source: "FACEBOOK", loyaltyPoints: 800, totalSpent: 12000000, lastVisit: new Date("2026-05-20"), vehiclePlates: ["30A-678.90"], tags: [], branchId: branchQ7.id } as any });
  const c3 = await prisma.customer.create({ data: { name: "Lê Hoàng Nam", phone: "0909123456", source: "WEBSITE", loyaltyPoints: 5200, totalSpent: 89000000, lastVisit: new Date("2026-06-12"), vehiclePlates: ["51A-234.56", "51B-789.01"], tags: ["VIP", "Fleet"], branchId: branchQ7.id } as any });
  const c4 = await prisma.customer.create({ data: { name: "Phạm Văn Đức", phone: "0938765432", source: "REFERRAL", loyaltyPoints: 150, totalSpent: 3500000, lastVisit: new Date("2026-04-01"), vehiclePlates: ["29A-111.22"], tags: [], branchId: branchQ7.id } as any });
  const c5 = await prisma.customer.create({ data: { name: "Võ Thị Mai", phone: "0971234567", source: "WALKIN", loyaltyPoints: 1200, totalSpent: 22000000, lastVisit: new Date("2026-06-08"), vehiclePlates: ["51A-555.66"], tags: [], branchId: branchQ1.id } as any });
  console.log("✅ Customers created");

  // ===== VEHICLES =====
  await prisma.vehicle.create({
    data: { vin: "JTDKN3DU5A0123456", engineNumber: "2ZR-FE-1234", model: "Toyota Camry", variant: "2.5Q", color: "Đen", year: 2026, status: "AVAILABLE", listPrice: 1100000000, floorPrice: 1050000000, branchId: branchQ1.id }
  });
  await prisma.vehicle.create({
    data: { vin: "WBAPH5C55BA123456", engineNumber: "N20B20-5678", model: "BMW 320i", variant: "Sport Line", color: "Trắng", year: 2026, status: "AVAILABLE", listPrice: 1750000000, floorPrice: 1680000000, branchId: branchQ7.id }
  });
  await prisma.vehicle.create({
    data: { vin: "MHKA5A61MKJ123456", model: "Toyota Vios", variant: "1.5G CVT", color: "Bạc", year: 2026, status: "RESERVED", listPrice: 545000000, floorPrice: 520000000, branchId: branchQ1.id }
  });
  await prisma.vehicle.create({
    data: { vin: "RLHGD58809T123456", model: "Honda City", variant: "RS", color: "Đỏ", year: 2026, status: "INCOMING", listPrice: 599000000, floorPrice: 575000000, branchId: branchQ7.id }
  });
  await prisma.vehicle.create({
    data: { vin: "KNAGM4A70G5123456", model: "Kia Seltos", variant: "1.6 Turbo", color: "Xanh", year: 2025, status: "SOLD", listPrice: 719000000, floorPrice: 690000000, customerId: c1.id, branchId: branchQ1.id }
  });
  console.log("✅ Vehicles created");

  // ===== REPAIR ORDERS =====
  await prisma.repairOrder.create({
    data: { customerId: c1.id, plateNumber: "51A-123.45", vehicleModel: "Toyota Camry 2.5Q", kmIn: 45000, symptoms: "Tiếng kêu khi phanh, đèn check engine sáng", status: "DOING", technicianId: ktv1.id, laborCost: 500000, partsCost: 970000, totalAmount: 1470000, createdById: xuong.id, branchId: branchQ1.id }
  });
  await prisma.repairOrder.create({
    data: { customerId: c3.id, plateNumber: "51A-234.56", vehicleModel: "BMW 320i Sport", kmIn: 30000, symptoms: "Bảo dưỡng định kỳ 30.000km", status: "WAITING_PARTS", technicianId: ktv3.id, laborCost: 800000, partsCost: 1270000, totalAmount: 2070000, createdById: xuong.id, branchId: branchQ7.id }
  });
  await prisma.repairOrder.create({
    data: { customerId: c5.id, plateNumber: "51A-555.66", vehicleModel: "Honda City RS", kmIn: 15000, symptoms: "Thay nhớt, kiểm tra tổng quát", status: "DONE", technicianId: ktv2.id, laborCost: 300000, partsCost: 1000000, totalAmount: 1300000, completedAt: new Date("2026-06-11"), createdById: xuong.id, branchId: branchQ1.id }
  });
  await prisma.repairOrder.create({
    data: { customerId: c2.id, plateNumber: "30A-678.90", vehicleModel: "Toyota Vios 1.5G", kmIn: 60000, symptoms: "Thay bóng đèn pha, check điện", status: "PENDING", laborCost: 200000, partsCost: 450000, totalAmount: 650000, createdById: xuong.id, branchId: branchQ7.id }
  });
  console.log("✅ Repair Orders created");

  // ===== LEADS =====
  await prisma.lead.create({
    data: { name: "Đặng Văn Hùng", phone: "0901234567", source: "FACEBOOK", status: "NEW", interest: "Toyota Camry 2026", branchId: branchQ1.id }
  });
  await prisma.lead.create({
    data: { name: "Bùi Thị Lan", phone: "0918765432", source: "WEBSITE", status: "CONSULTING", interest: "Bảo dưỡng 10.000km", assignedToId: cskh.id, branchId: branchQ1.id }
  });
  await prisma.lead.create({
    data: { name: "Nguyễn Minh Tuấn", phone: "0912345678", source: "WALKIN", status: "POTENTIAL", interest: "BMW 320i Sport", assignedToId: sales.id, customerId: c1.id, branchId: branchQ7.id }
  });
  await prisma.lead.create({
    data: { name: "Trương Quốc Bảo", phone: "0945678901", source: "REFERRAL", status: "CONVERTED", interest: "Kia Seltos 1.6 Turbo", branchId: branchQ1.id }
  });
  await prisma.lead.create({
    data: { name: "Lý Thị Nhung", phone: "0967890123", source: "FACEBOOK", status: "LOST", interest: "Honda City RS", branchId: branchQ7.id }
  });
  console.log("✅ Leads created");

  // ===== ZNS LOGS =====
  await prisma.znsLog.createMany({
    data: [
      { customerId: c1.id, phone: "84912345678", messageType: "THANK_YOU", content: "Cảm ơn anh Tuấn đã sử dụng dịch vụ!", status: "SENT", branchId: branchQ1.id } as any,
      { customerId: c5.id, phone: "84971234567", messageType: "MAINTENANCE", content: "Xe chị Mai đã đến lịch thay dầu!", status: "SENT", branchId: branchQ1.id } as any,
      { customerId: c2.id, phone: "84987654321", messageType: "BIRTHDAY", content: "Chúc mừng sinh nhật! Voucher giảm 10%!", status: "SENT", branchId: branchQ7.id } as any,
      { customerId: c3.id, phone: "84909123456", messageType: "PROMOTION", content: "Ưu đãi VIP - Giảm 15% dịch vụ!", status: "FAILED", error: "Invalid phone format", branchId: branchQ7.id } as any,
    ],
  });
  console.log("✅ ZNS Logs created");

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
