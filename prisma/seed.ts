import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Cleaning database & resetting sequences...");
  
  // Clear all tables in dependency order
  await prisma.userBranch.deleteMany({});
  await prisma.price.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.techPerformance.deleteMany({});
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
  await prisma.user.create({
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
  console.log("✅ Admin user created");

  console.log("🌱 Seeding default system configuration...");
  await prisma.systemConfig.create({
    data: {
      key: "points_rate",
      value: "1.0",
    },
  });
  console.log("✅ Default system configuration created");

  console.log("🎉 Cleaning and admin setup complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
