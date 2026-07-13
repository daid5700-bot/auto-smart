import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

// Format phone number for Zalo (e.g. 0901234567 -> 84901234567)
export function formatPhoneForZalo(phone: string): string {
  let cleaned = phone.replace(/\D/g, ""); // Keep only digits
  if (cleaned.startsWith("0")) {
    cleaned = "84" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("84") && cleaned.length > 0) {
    cleaned = "84" + cleaned;
  }
  return cleaned;
}

// Get credential from Database only
export async function getZaloCredential(key: string): Promise<string> {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    return config?.value || "";
  } catch (dbErr) {
    console.error(`❌ [ZALO] Could not read ${key} from DB:`, dbErr);
    return "";
  }
}

// Update token in DB only
export async function updateZaloCredentials(updates: Record<string, string>) {
  for (const [key, value] of Object.entries(updates)) {
    try {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      console.log(`✅ Persisted Zalo key ${key} to database.`);
    } catch (dbErr: any) {
      console.error(`❌ Failed to save ${key} to database:`, dbErr.message);
    }
  }
}

// Refresh Zalo OA Access Token using Refresh Token
export async function refreshZaloToken(): Promise<string> {
  const appId = await getZaloCredential("ZALO_APP_ID");
  const secretKey = await getZaloCredential("ZALO_APP_SECRET");
  const refreshToken = await getZaloCredential("ZALO_REFRESH_TOKEN");

  if (!appId || !secretKey || !refreshToken) {
    throw new Error("Missing Zalo credentials (App ID, Secret Key, or Refresh Token) in environment/database");
  }

  console.log("🔄 Attempting to refresh Zalo OA Access Token...");

  const params = new URLSearchParams();
  params.append("refresh_token", refreshToken);
  params.append("app_id", appId);
  params.append("grant_type", "refresh_token");

  let response = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
    method: "POST",
    headers: {
      "secret_key": secretKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  let data = await response.json();

  if (data.access_token && data.refresh_token) {
    await updateZaloCredentials({
      ZALO_OA_ACCESS_TOKEN: data.access_token,
      ZALO_REFRESH_TOKEN: data.refresh_token,
    });
    return data.access_token;
  } else {
    console.error("❌ Zalo Token Refresh Error Response:", data);
    throw new Error(data.error_description || data.message || "Failed to refresh Zalo access token");
  }
}

// Send ZNS using the official Zalo OpenAPI
export async function sendZaloZns(
  phone: string,
  templateId: string,
  templateData: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const formattedPhone = formatPhoneForZalo(phone);
  let accessToken = await getZaloCredential("ZALO_OA_ACCESS_TOKEN");

  if (!accessToken) {
    try {
      accessToken = await refreshZaloToken();
    } catch (err: any) {
      return { success: false, error: `No access token available and refresh failed: ${err.message}` };
    }
  }

  // Map internal logical template IDs to actual Zalo ZNS numerical IDs
  let realTemplateId = templateId;
  if (templateId === "CRM_THANK_YOU_001") {
    const dbVal = await getZaloCredential("ZALO_TEMPLATE_THANK_YOU");
    if (dbVal) realTemplateId = dbVal;
  } else if (templateId === "CRM_OIL_REMIND_002" || templateId === "CRM_SERVICE_REMIND_002") {
    const dbVal = await getZaloCredential("ZALO_TEMPLATE_OIL_REMIND");
    if (dbVal) realTemplateId = dbVal;
  } else if (templateId === "CRM_BIRTHDAY_003") {
    const dbVal = await getZaloCredential("ZALO_TEMPLATE_BIRTHDAY");
    if (dbVal) realTemplateId = dbVal;
  } else if (templateId === "CRM_INSPECT_004") {
    const dbVal = await getZaloCredential("ZALO_TEMPLATE_INSPECT");
    if (dbVal) realTemplateId = dbVal;
  }

  const trackingId = `zns_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const payload = {
    phone: formattedPhone,
    template_id: realTemplateId,
    template_data: templateData,
    tracking_id: trackingId,
  };

  // === LOG CHI TIẾT KHI GỬI ZNS ===
  console.log("[ZNS] ====== BẮT ĐẦU GỬI ZNS ======");
  console.log(`[ZNS] 📱 Số điện thoại: ${formattedPhone}`);
  console.log(`[ZNS] 📋 Template ID (nội bộ): ${templateId} → (Zalo): ${realTemplateId}`);
  console.log(`[ZNS] 🔑 Access Token (10 ký tự đầu): ${accessToken?.substring(0, 10)}...`);
  console.log(`[ZNS] 📤 Template Data:`, JSON.stringify(templateData));
  console.log(`[ZNS] 🏷️  Tracking ID: ${trackingId}`);

  const makeRequest = async (token: string) => {
    console.log(`[ZNS] 🚀 Gửi yêu cầu POST đến https://business.openapi.zalo.me/message/template`);
    console.log(`[ZNS] 🚀 Headers: { access_token: "${token.substring(0, 10)}...", Content-Type: "application/json" }`);
    console.log(`[ZNS] 🚀 Payload gửi đi:`, JSON.stringify(payload, null, 2));
    return fetch("https://business.openapi.zalo.me/message/template", {
      method: "POST",
      headers: {
        "access_token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  };

  try {
    let response = await makeRequest(accessToken);
    let resData = await response.json();

    console.log(`[ZNS] 📨 Zalo API HTTP Status: ${response.status}`);
    console.log(`[ZNS] 📨 Phản hồi từ Zalo: error=${resData.error}, message=${resData.message}`);
    console.log(`[ZNS] 📨 Chi tiết phản hồi:`, JSON.stringify(resData, null, 2));

    // Auto-refresh khi token hết hạn hoặc không hợp lệ (-124, -216, -301)
    if (resData.error === -124 || resData.error === -216 || resData.error === -301) {
      console.warn(`⚠️ [ZNS] Token lỗi (${resData.error}: ${resData.message}). Đang tự động lấy token mới...`);
      try {
        const newAccessToken = await refreshZaloToken();
        console.log(`[ZNS] ✅ Lấy token mới thành công! Token mới (10 ký tự đầu): ${newAccessToken.substring(0, 10)}...`);
        response = await makeRequest(newAccessToken);
        resData = await response.json();
        console.log(`[ZNS] 📨 Phản hồi sau khi dùng token mới: error=${resData.error}, message=${resData.message}`);
        console.log(`[ZNS] 📨 Chi tiết phản hồi sau refresh:`, JSON.stringify(resData, null, 2));
      } catch (refreshErr: any) {
        console.warn(`⚠️ [ZNS] Lấy token mới thất bại: ${refreshErr.message}`);
      }
    }

    if (resData.error === 0) {
      console.log(`[ZNS] ✅ GỬI THÀNH CÔNG đến ${formattedPhone} | msg_id: ${resData.data?.msg_id}`);
      console.log("[ZNS] ====== KẾT THÚC GỬI ZNS ======");
      return { success: true, data: resData };
    } else {
      const detailedError = `Lỗi Zalo API [Mã ${resData.error}]: ${resData.message} | Phản hồi đầy đủ: ${JSON.stringify(resData)}`;
      console.error(`[ZNS] ❌ GỬI THẤT BẠI đến ${formattedPhone} | ${detailedError}`);
      console.log("[ZNS] ====== KẾT THÚC GỬI ZNS ======");
      return { success: false, error: detailedError };
    }
  } catch (error: any) {
    const networkError = `Lỗi kết nối mạng khi gửi ZNS đến ${formattedPhone}: ${error.message}`;
    console.error(`❌ ${networkError}`, error);
    return { success: false, error: networkError };
  }
}

// Format date strictly to DD/MM/YYYY for Zalo ZNS API parameters
export function formatDateForZalo(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

