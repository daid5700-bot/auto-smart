import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("=== Fetching Customer 2 ===");
  try {
    const cust2 = await prisma.customer.findUnique({
      where: { id: 2 }
    });
    console.log("Customer 2 details:", cust2);

    if (cust2) {
      console.log("\n=== Checking for other customers with similar names or phone ===");
      const allCusts = await prisma.customer.findMany({
        take: 20
      });
      console.log("All Customers:");
      for (const c of allCusts) {
        console.log(`- ID: ${c.id}, Name: ${c.name}, Phone: ${c.phone}`);
      }
    }
  } catch (e: any) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
