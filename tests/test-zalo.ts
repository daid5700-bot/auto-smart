import fs from "fs";
import path from "path";

// Simple env parser
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("No .env file found!");
    return {};
  }
  const envContent = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const firstEq = trimmed.indexOf("=");
    if (firstEq === -1) continue;
    const key = trimmed.substring(0, firstEq).trim();
    let val = trimmed.substring(firstEq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
  return env;
}

async function testZalo() {
  const env = loadEnv();
  const token = env.ZALO_OA_ACCESS_TOKEN;
  
  if (!token) {
    console.error("❌ ZALO_OA_ACCESS_TOKEN is empty in .env");
    return;
  }

  console.log("🔄 Testing Zalo OA connection...");
  console.log(`Token prefix: ${token.substring(0, 10)}...`);

  try {
    const response = await fetch("https://openapi.zalo.me/v2.0/oa/getoa", {
      method: "GET",
      headers: {
        access_token: token,
      },
    });

    const data = await response.json();
    console.log("\n--- API Response Status ---");
    console.log(`HTTP Status: ${response.status}`);
    
    if (data.error === 0) {
      console.log("✅ Success! Connected to Zalo OA successfully.");
      console.log(`OA Name: ${data.data?.name}`);
      console.log(`OA ID: ${data.data?.oa_id}`);
      console.log(`Description: ${data.data?.description}`);
      console.log(`Status: ${data.data?.status === 1 ? "Active" : "Inactive"}`);
    } else {
      console.log("❌ Zalo API Error:");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.error("❌ Network or request error:", error.message);
  }
}

testZalo();
