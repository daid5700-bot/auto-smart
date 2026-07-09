import { prisma } from "../src/lib/prisma";

async function main() {
  const code = "PX-1783622244061-540";
  const order = await prisma.inventoryOrder.findUnique({
    where: { code },
    include: {
      movements: true
    }
  });
  console.log("Order details:", JSON.stringify(order, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
