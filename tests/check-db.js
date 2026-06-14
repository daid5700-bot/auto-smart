const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const techs = await prisma.technician.findMany();
  console.log("Technicians count:", techs.length);
  console.log("Technicians branchIds:", techs.map(t => ({ id: t.id, name: t.name, branchId: t.branchId })));
  
  const branches = await prisma.branch.findMany();
  console.log("Branches:", branches.map(b => ({ id: b.id, name: b.name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
