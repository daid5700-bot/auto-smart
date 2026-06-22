import { refreshZaloToken } from "../src/lib/zalo";
import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";

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

  console.log("🔄 Starting force token refresh...");
  try {
    const newToken = await refreshZaloToken();
    console.log("✅ Success! Zalo OA Access Token has been refreshed.");
    console.log(`New Access Token: ${newToken.substring(0, 15)}...`);
  } catch (err: any) {
    console.error("❌ Failed to refresh token:", err.message);
  }
}

main()
  .catch((e) => {
    console.error("❌ Error running script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
