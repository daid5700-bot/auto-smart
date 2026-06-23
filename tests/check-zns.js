const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.systemConfig.findMany();
  console.log("=== SystemConfig in DB ===");
  configs.forEach(c => {
    if (c.key.includes("TOKEN") || c.key.includes("SECRET")) {
      console.log(`${c.key}: ${c.value.substring(0, 15)}...`);
    } else {
      console.log(`${c.key}: ${c.value}`);
    }
  });

  const logs = await prisma.znsLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5
  });
  console.log("\n=== Recent ZNS Logs ===");
  logs.forEach(l => {
    console.log(`[${l.createdAt.toLocaleString()}] To: ${l.phone} | Status: ${l.status} | TemplateId: ${l.templateId} | Error: ${l.error}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
