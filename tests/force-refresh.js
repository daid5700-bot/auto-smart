const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) {
      console.warn("⚠️ No .env file found to parse.");
      return {};
    }
    const content = fs.readFileSync(envPath, "utf-8");
    const env = {};
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
  } catch (err) {
    console.warn("⚠️ Failed to parse .env file:", err.message);
    return {};
  }
}

async function getCredential(key, env) {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    if (config?.value) return config.value;
  } catch (dbErr) {
    console.warn(`⚠️ Warning: Could not read ${key} from DB, falling back to env`);
  }
  return env[key] || "";
}

async function updateCredentials(updates) {
  // 1. Save to DB
  for (const [key, value] of Object.entries(updates)) {
    try {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      console.log(`✅ Saved ${key} to Database.`);
    } catch (err) {
      console.error(`❌ Failed to save ${key} to Database:`, err.message);
    }
  }

  // 2. Save to .env
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf-8");
      for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${key}="${value}"`);
        } else {
          envContent += `\n${key}="${value}"`;
        }
      }
      fs.writeFileSync(envPath, envContent, "utf-8");
      console.log("✅ Updated tokens in local .env file");
    }
  } catch (err) {
    console.warn("⚠️ Local .env file could not be updated:", err.message);
  }
}

async function main() {
  const env = loadEnv();

  const appId = await getCredential("ZALO_APP_ID", env);
  const secretKey = await getCredential("ZALO_APP_SECRET", env);
  const refreshToken = await getCredential("ZALO_REFRESH_TOKEN", env);

  if (!appId || !secretKey || !refreshToken) {
    console.error("❌ Missing Zalo credentials!");
    console.log(`- ZALO_APP_ID: ${appId ? "Found" : "Missing"}`);
    console.log(`- ZALO_APP_SECRET: ${secretKey ? "Found" : "Missing"}`);
    console.log(`- ZALO_REFRESH_TOKEN: ${refreshToken ? "Found" : "Missing"}`);
    process.exit(1);
  }

  console.log("🔄 Sending refresh request to Zalo OAuth Server...");
  
  const params = new URLSearchParams();
  params.append("refresh_token", refreshToken);
  params.append("app_id", appId);
  params.append("grant_type", "refresh_token");

  try {
    const response = await fetch("https://oauth.zalo.me/v4/oa/access_token", {
      method: "POST",
      headers: {
        "secret_key": secretKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await response.json();

    if (data.access_token && data.refresh_token) {
      console.log("✅ Successfully refreshed tokens!");
      await updateCredentials({
        ZALO_OA_ACCESS_TOKEN: data.access_token,
        ZALO_REFRESH_TOKEN: data.refresh_token,
      });
      console.log("✨ Done!");
    } else {
      console.error("❌ Zalo returned an error response:", data);
    }
  } catch (err) {
    console.error("❌ Request to Zalo OAuth server failed:", err.message);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
