import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Bắt đầu cập nhật branchId = 4 cho các phiếu kho cũ...");
  
  // Cập nhật lịch sử xuất nhập (StockMovement)
  const result1 = await prisma.stockMovement.updateMany({
    where: { branchId: null },
    data: { branchId: 4 }
  });
  console.log(`✅ Đã cập nhật ${result1.count} bản ghi StockMovement.`);

  // Cập nhật các đơn hàng kho (InventoryOrder) nếu có bị trống
  const result2 = await prisma.inventoryOrder.updateMany({
    where: { branchId: null },
    data: { branchId: 4 }
  });
  console.log(`✅ Đã cập nhật ${result2.count} bản ghi InventoryOrder.`);


}

main()
  .catch(e => {
    console.error("Lỗi khi cập nhật:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
