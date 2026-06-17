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

// Get credential from Database first, fallback to process.env and auto-cache to DB
export async function getZaloCredential(key: string): Promise<string> {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    if (config?.value) return config.value;
  } catch (dbErr) {
    console.warn(`⚠️ Warning: Could not read ${key} from DB, falling back to process.env`);
  }

  const envValue = process.env[key] || "";
  
  if (envValue) {
    try {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: envValue },
        create: { key, value: envValue },
      });
    } catch (saveErr) {
      console.warn(`⚠️ Warning: Could not cache ${key} to DB:`, saveErr);
    }
  }

  return envValue;
}

// Update token in DB and safely try local .env (ignores write failures in read-only production environments like Vercel)
export async function updateZaloCredentials(updates: Record<string, string>) {
  // 1. Persist to Database (Production-safe, works on Vercel)
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

  // 2. Persist to local .env (For local development comfort)
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
  } catch (error: any) {
    // Silently ignore write failures on Vercel
    console.warn("⚠️ Local .env file could not be updated (this is normal on Vercel / serverless):", error.message);
  }

  // 3. Update current process memory
  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
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
