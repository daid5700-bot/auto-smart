import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";

// A simple zero-dependency env parser to avoid MODULE_NOT_FOUND issues
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) {
      console.warn("⚠️ No .env file found to parse.");
      return;
    }
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const firstEqual = trimmed.indexOf("=");
      if (firstEqual === -1) continue;
      const key = trimmed.substring(0, firstEqual).trim();
      let val = trimmed.substring(firstEqual + 1).trim();
      // Strip quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
    console.log("✅ Successfully parsed local .env variables.");
  } catch (err: any) {
    console.warn("⚠️ Failed to parse .env file:", err.message);
  }
}

async function main() {
  loadEnv();

  const accessToken = process.env.ZALO_OA_ACCESS_TOKEN;
  const refreshToken = process.env.ZALO_REFRESH_TOKEN;
  const appId = process.env.ZALO_APP_ID;
  const secret = process.env.ZALO_APP_SECRET;

  if (!accessToken || !refreshToken || !appId || !secret) {
    console.error("❌ Error: Missing Zalo variables in your local .env file!");
    console.error(`- ZALO_APP_ID: ${appId ? "Found" : "Missing"}`);
    console.error(`- ZALO_APP_SECRET: ${secret ? "Found" : "Missing"}`);
    console.error(`- ZALO_OA_ACCESS_TOKEN: ${accessToken ? "Found" : "Missing"}`);
    console.error(`- ZALO_REFRESH_TOKEN: ${refreshToken ? "Found" : "Missing"}`);
    process.exit(1);
  }

  console.log("🔄 Saving Zalo credentials to Supabase Database...");
  
  await prisma.systemConfig.upsert({
    where: { key: "ZALO_OA_ACCESS_TOKEN" },
    update: { value: accessToken },
    create: { key: "ZALO_OA_ACCESS_TOKEN", value: accessToken },
  });

  await prisma.systemConfig.upsert({
    where: { key: "ZALO_REFRESH_TOKEN" },
    update: { value: refreshToken },
    create: { key: "ZALO_REFRESH_TOKEN", value: refreshToken },
  });

  await prisma.systemConfig.upsert({
    where: { key: "ZALO_APP_ID" },
    update: { value: appId },
    create: { key: "ZALO_APP_ID", value: appId },
  });

  await prisma.systemConfig.upsert({
    where: { key: "ZALO_APP_SECRET" },
    update: { value: secret },
    create: { key: "ZALO_APP_SECRET", value: secret },
  });

  // Optional ZNS Template ID Mappings
  const templateMappings = {
    ZALO_TEMPLATE_THANK_YOU: process.env.ZALO_TEMPLATE_THANK_YOU,
    ZALO_TEMPLATE_OIL_REMIND: process.env.ZALO_TEMPLATE_OIL_REMIND,
    ZALO_TEMPLATE_BIRTHDAY: process.env.ZALO_TEMPLATE_BIRTHDAY,
    ZALO_TEMPLATE_INSPECT: process.env.ZALO_TEMPLATE_INSPECT,
  };

  for (const [key, val] of Object.entries(templateMappings)) {
    if (val) {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: val },
        create: { key, value: val },
      });
      console.log(`✅ Synced template config ${key} = ${val}`);
    }
  }

  console.log("✅ Success! Zalo tokens have been synced to the database.");
}

main()
  .catch((e) => {
    console.error("❌ Error running script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
