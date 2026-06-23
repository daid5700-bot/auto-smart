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

async function run() {
  const env = loadEnv();
  const token = env.ZALO_OA_ACCESS_TOKEN;
  const templateId = env.ZALO_TEMPLATE_OIL_REMIND || "595306";
  const phone = "84325459901"; // Số nhận tin test

  if (!token) {
    console.error("❌ Không tìm thấy ZALO_OA_ACCESS_TOKEN trong file .env!");
    return;
  }

  const payload = {
    phone: phone,
    template_id: templateId,
    template_data: {
      customer_name: "Nguyễn Minh Tuấn",
      order_date: "23/06/2026",
      note: "Thay dầu máy định kỳ cho xe 51A-123.45",
      point: "0",
      total_point: "100"
    },
    tracking_id: `test_${Date.now()}`
  };

  console.log("================ BẮT ĐẦU GỬI TEST DIRECT ================");
  console.log("🚀 URL: https://business.openapi.zalo.me/message/template");
  console.log("🔑 Token dùng test (15 ký tự đầu):", token.substring(0, 15) + "...");
  console.log("📤 Payload gửi đi:\n", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch("https://business.openapi.zalo.me/message/template", {
      method: "POST",
      headers: {
        "access_token": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();
    console.log("\n📨 HTTP Status Code:", response.status);
    console.log("📨 Phản hồi từ Zalo API:\n", JSON.stringify(resData, null, 2));
    console.log("=========================================================");
  } catch (err) {
    console.error("❌ Lỗi kết nối mạng khi gửi:", err.message);
  }
}

run();
