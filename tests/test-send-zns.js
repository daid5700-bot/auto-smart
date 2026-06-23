const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("No .env file found!");
    return {};
  }
  const envContent = fs.readFileSync(envPath, "utf-8");
  const env = {};
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

async function testSendZns() {
  const env = loadEnv();
  const token = env.ZALO_OA_ACCESS_TOKEN;
  
  if (!token) {
    console.error("❌ ZALO_OA_ACCESS_TOKEN is empty");
    return;
  }

  const phone = "84325459901"; // Test phone number
  const templateId = "595306";
  const payload = {
    phone: phone,
    template_id: templateId,
    template_data: {
      customer_name: "Khách hàng Test",
      order_date: "22/06/2026",
      note: "Thay dầu máy định kỳ",
      point: "10",
      total_point: "100"
    },
    tracking_id: `test_send_${Date.now()}`
  };

  console.log("📤 Sending ZNS message with payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch("https://business.openapi.zalo.me/message/template", {
      method: "POST",
      headers: {
        access_token: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("📨 Response from Zalo:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Error sending request:", error.message);
  }
}

testSendZns();
