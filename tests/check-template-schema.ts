import fs from "fs";
import path from "path";

function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) {
      console.warn("⚠️ No .env file found.");
      return {};
    }
    const content = fs.readFileSync(envPath, "utf-8");
    const env: Record<string, string> = {};
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
      env[key] = val;
    }
    return env;
  } catch (err: any) {
    console.warn("⚠️ Failed to parse .env file:", err.message);
    return {};
  }
}

async function main() {
  const env = loadEnv();
  const token = env.ZALO_OA_ACCESS_TOKEN;
  const templateId = env.ZALO_TEMPLATE_OIL_REMIND || "595306";

  if (!token) {
    console.error("❌ ZALO_OA_ACCESS_TOKEN is missing in .env!");
    return;
  }

  console.log(`🔄 Fetching schema details for Template ID: ${templateId}...`);
  console.log(`Token prefix: ${token.substring(0, 10)}...`);

  try {
    const url = `https://business.openapi.zalo.me/template/info?template_id=${templateId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        access_token: token,
      },
    });

    const data = await response.json();
    console.log("\n--- Zalo API Response ---");
    console.log(JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error("❌ Request failed:", error.message);
  }
}

main();
