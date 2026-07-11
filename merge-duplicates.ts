import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Tìm các OrderItem bị trùng lặp repairOrderId và productId...");
  
  // Lấy các group bị trùng
  const duplicates = await prisma.orderItem.groupBy({
    by: ['repairOrderId', 'productId'],
    _count: {
      id: true
    },
    having: {
      id: {
        _count: {
          gt: 1
        }
      }
    }
  });

  console.log(`Tìm thấy ${duplicates.length} cặp (repairOrderId, productId) bị trùng lặp.`);

  for (const dup of duplicates) {
    const { repairOrderId, productId } = dup;
    
    // Lấy tất cả các items của cặp này
    const items = await prisma.orderItem.findMany({
      where: {
        repairOrderId,
        productId
      },
      orderBy: {
        id: 'asc' // Giữ lại item đầu tiên
      }
    });

    if (items.length > 1) {
      const mainItem = items[0];
      const itemsToDelete = items.slice(1);
      
      // Tính tổng số lượng và tiền
      let extraQuantity = 0;
      let extraTotalPrice = 0;
      
      for (const item of itemsToDelete) {
        extraQuantity += Number(item.quantity);
        extraTotalPrice += Number(item.totalPrice);
      }

      console.log(`Gộp ${itemsToDelete.length} items vào OrderItem #${mainItem.id} (RO #${repairOrderId}, Product #${productId})`);
      
      // Update the main item
      await prisma.orderItem.update({
        where: { id: mainItem.id },
        data: {
          quantity: { increment: extraQuantity },
          totalPrice: { increment: extraTotalPrice }
        }
      });

      // Delete the duplicates
      for (const item of itemsToDelete) {
        await prisma.orderItem.delete({
          where: { id: item.id }
        });
      }
    }
  }

  console.log("Hoàn tất dọn dẹp dữ liệu trùng lặp!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
