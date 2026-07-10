import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Starting database cleanup for StockMovement branchId...");

  // 1. Fix movements linked to InventoryOrder
  const movementsToFixOrder = await prisma.stockMovement.findMany({
    where: {
      branchId: null,
      inventoryOrderId: { not: null }
    },
    include: {
      inventoryOrder: true
    }
  });

  console.log(`Found ${movementsToFixOrder.length} movements linked to InventoryOrders with null branchId.`);

  let fixedOrderCount = 0;
  for (const movement of movementsToFixOrder) {
    if (movement.inventoryOrder && movement.inventoryOrder.branchId) {
      await prisma.stockMovement.update({
        where: { id: movement.id },
        data: { branchId: movement.inventoryOrder.branchId }
      });
      fixedOrderCount++;
    }
  }
  console.log(`Successfully fixed ${fixedOrderCount} movements linked to InventoryOrders.`);

  // 2. Fix movements linked to RepairOrder
  const movementsToFixRo = await prisma.stockMovement.findMany({
    where: {
      branchId: null,
      relatedRoId: { not: null }
    }
  });

  console.log(`Found ${movementsToFixRo.length} movements linked to RepairOrders with null branchId.`);

  let fixedRoCount = 0;
  for (const movement of movementsToFixRo) {
    if (movement.relatedRoId) {
      const ro = await prisma.repairOrder.findUnique({
        where: { id: movement.relatedRoId }
      });
      if (ro && ro.branchId) {
        await prisma.stockMovement.update({
          where: { id: movement.id },
          data: { branchId: ro.branchId }
        });
        fixedRoCount++;
      }
    }
  }
  console.log(`Successfully fixed ${fixedRoCount} movements linked to RepairOrders.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
