import fs from "fs";
import path from "path";

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

// Update local .env file programmatically
export function updateEnvFile(updates: Record<string, string>) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) {
      console.warn("No .env file found to update Zalo tokens.");
      return;
    }
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
    
    // Also update current process.env variables so they are available immediately
    for (const [key, value] of Object.entries(updates)) {
      process.env[key] = value;
    }
    console.log("✅ Successfully updated tokens in .env");
  } catch (error: any) {
    console.error("❌ Failed to update .env file:", error.message);
  }
}

// Refresh Zalo OA Access Token using Refresh Token
export async function refreshZaloToken(): Promise<string> {
  const appId = process.env.ZALO_APP_ID;
  const secretKey = process.env.ZALO_APP_SECRET;
  const refreshToken = process.env.ZALO_REFRESH_TOKEN;

  if (!appId || !secretKey || !refreshToken) {
    throw new Error("Missing Zalo credentials (App ID, Secret Key, or Refresh Token) in environment");
  }

  console.log("🔄 Attempting to refresh Zalo OA Access Token...");

  const params = new URLSearchParams();
  params.append("refresh_token", refreshToken);
  params.append("app_id", appId);
  params.append("grant_type", "refresh_token");

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
    updateEnvFile({
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
  let accessToken = process.env.ZALO_OA_ACCESS_TOKEN || "";

  if (!accessToken) {
    try {
      accessToken = await refreshZaloToken();
    } catch (err: any) {
      return { success: false, error: `No access token available and refresh failed: ${err.message}` };
    }
  }

  const payload = {
    phone: formattedPhone,
    template_id: templateId,
    template_data: templateData,
  };

  const makeRequest = async (token: string) => {
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

    // Check if access token is invalid/expired (error code -216 or -301)
    if (resData.error === -216 || resData.error === -301) {
      console.warn("⚠️ Zalo Access Token expired or invalid. Attempting auto-refresh...");
      try {
        const newAccessToken = await refreshZaloToken();
        response = await makeRequest(newAccessToken);
        resData = await response.json();
      } catch (refreshErr: any) {
        return { success: false, error: `Token refresh failed during retry: ${refreshErr.message}` };
      }
    }

    if (resData.error === 0) {
      console.log(`✅ ZNS message sent successfully to ${formattedPhone}`);
      return { success: true, data: resData };
    } else {
      console.error(`❌ Zalo ZNS API Error for ${formattedPhone}:`, resData);
      return { success: false, error: resData.message || `Error code: ${resData.error}` };
    }
  } catch (error: any) {
    console.error(`❌ Network error while sending ZNS to ${formattedPhone}:`, error.message);
    return { success: false, error: error.message };
  }
}
