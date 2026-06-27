const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const whereSold = { status: 'SOLD' };
    const [
      soldVehicles,
      soldValueResult,
      soldList
    ] = await Promise.all([
      prisma.vehicle.count({ where: whereSold }),
      prisma.vehicle.aggregate({
        _sum: { 
          listPrice: true,
          plateCost: true,
        },
        where: whereSold
      }),
      prisma.vehicle.findMany({
        where: whereSold,
        include: {
          customer: {
            select: { name: true, phone: true }
          }
        }
      })
    ]);

    console.log('soldVehicles:', soldVehicles);
    console.log('soldValueResult:', soldValueResult);
    
    const soldValue = Number(soldValueResult._sum.listPrice || 0);
    const totalPlateCost = Number(soldValueResult._sum.plateCost || 0);
    console.log('soldValue:', soldValue);
    console.log('totalPlateCost:', totalPlateCost);

    let totalAccessoriesCost = 0;
    soldList.forEach((v, idx) => {
      console.log(`Vehicle ${idx + 1} (ID: ${v.id}, VIN: ${v.vin}):`);
      console.log('  plateCost:', v.plateCost);
      console.log('  accessoriesJson:', v.accessoriesJson);
      try {
        const accs = JSON.parse(v.accessoriesJson || "[]");
        accs.forEach((a, aIdx) => {
          const itemPrice = Number(a.price || 0);
          const itemQty = Number(a.quantity || 1);
          console.log(`    Acc ${aIdx + 1}: price=${a.price} (${itemPrice}), quantity=${a.quantity} (${itemQty})`);
          totalAccessoriesCost += itemPrice * itemQty;
        });
      } catch (e) {
        console.log('    Failed to parse accessoriesJson:', e.message);
      }
    });

    console.log('totalAccessoriesCost:', totalAccessoriesCost);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
