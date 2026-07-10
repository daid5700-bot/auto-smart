import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [
  "prisma/schema.prisma",
  "src/config/rbac.ts",
  "src/app/api/workshop/[id]/route.ts",
  "src/app/api/workshop/route.ts",
  "src/app/api/technicians/route.ts",
  "src/app/api/technicians/[id]/route.ts",
  "src/app/(dashboard)/workshop/technicians/page.tsx",
  "src/app/(dashboard)/workshop/commission/page.tsx",
];
const forbidden = [
  "commissionRate",
  "commissionAmount",
  "TechPerformance",
  "performances",
  "totalCommission",
  "workshop.commission",
  "/workshop/commission",
];

const violations: string[] = [];

for (const relativeFile of files) {
  const absoluteFile = path.join(root, relativeFile);
  if (!fs.existsSync(absoluteFile)) continue;

  const content = fs.readFileSync(absoluteFile, "utf8");
  for (const identifier of forbidden) {
    if (content.includes(identifier)) {
      violations.push(`${relativeFile}: ${identifier}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Technician commission references remain:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Technician commission removal check passed.");
