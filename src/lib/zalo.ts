import {
  getBranchConfigValue,
  getBranchConfigValues,
  setBranchConfigValues,
} from "@/lib/branch-config";
import { createHmac } from "crypto";
import {
  ZALO_CREDENTIAL_KEYS,
  resolveZaloTemplateId,
  type ZaloCredentialKey,
  type ZaloCredentialValues,
} from "@/lib/zalo-config";

export { ZALO_CREDENTIAL_KEYS } from "@/lib/zalo-config";
export { resolveZaloTemplateId } from "@/lib/zalo-config";

const ZALO_TOKEN_URL = "https://oauth.zaloapp.com/v4/oa/access_token";
const ZALO_ZNS_URL = "https://business.openapi.zalo.me/message/template";
const INVALID_TOKEN_CODES = new Set([-124, -216, -301]);

interface ZaloTokenResponse {
  access_token?: string;
  refresh_token?: string;
  error_description?: string;
  message?: string;
}

interface ZaloZnsResponse {
  error?: number;
  message?: string;
  data?: { msg_id?: string } & Record<string, unknown>;
  [key: string]: unknown;
}

interface ZaloZnsPayload {
  phone: string;
  template_id: string;
  template_data: Record<string, unknown>;
  tracking_id: string;
}

export interface ZaloSendResult {
  success: boolean;
  data?: ZaloZnsResponse;
  error?: string;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function maskPhone(phone: string) {
  return phone.length > 4 ? `${phone.slice(0, 4)}***${phone.slice(-3)}` : "***";
}

async function getZaloCredentialValues(
  branchId?: number | null,
): Promise<ZaloCredentialValues> {
  const values = await getBranchConfigValues(ZALO_CREDENTIAL_KEYS, branchId);
  return values as ZaloCredentialValues;
}

// Format phone number for Zalo (e.g. 0901234567 -> 84901234567)
export function formatPhoneForZalo(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = `84${cleaned.substring(1)}`;
  if (!cleaned.startsWith("84") && cleaned.length > 0) cleaned = `84${cleaned}`;
  return cleaned;
}

export async function getZaloCredential(
  key: ZaloCredentialKey,
  branchId?: number | null,
): Promise<string> {
  try {
    return await getBranchConfigValue(key, branchId);
  } catch (error) {
    console.error(`[ZALO] Không thể đọc cấu hình ${key}:`, error);
    return "";
  }
}

export async function updateZaloCredentials(
  updates: Partial<Record<ZaloCredentialKey, string>>,
  branchId?: number | null,
) {
  const values = Object.fromEntries(
    Object.entries(updates).filter((entry): entry is [string, string] =>
      typeof entry[1] === "string",
    ),
  );
  await setBranchConfigValues(values, branchId);
}

export async function refreshZaloToken(
  branchId?: number | null,
): Promise<string> {
  const credentials = await getZaloCredentialValues(branchId);
  const appId = credentials.ZALO_APP_ID;
  const secretKey = credentials.ZALO_APP_SECRET;
  const refreshToken = credentials.ZALO_REFRESH_TOKEN;

  if (!appId || !secretKey || !refreshToken) {
    throw new Error(
      "Thiếu Zalo App ID, App Secret hoặc Refresh Token của chi nhánh",
    );
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    app_id: appId,
    grant_type: "refresh_token",
  });
  const response = await fetch(ZALO_TOKEN_URL, {
    method: "POST",
    headers: {
      secret_key: secretKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = (await response.json()) as ZaloTokenResponse;

  if (!data.access_token || !data.refresh_token) {
    console.error("[ZALO] Token refresh failed:", data);
    throw new Error(
      data.error_description || data.message || "Không thể làm mới Zalo token",
    );
  }

  await updateZaloCredentials(
    {
      ZALO_OA_ACCESS_TOKEN: data.access_token,
      ZALO_REFRESH_TOKEN: data.refresh_token,
    },
    branchId,
  );
  return data.access_token;
}

async function requestZaloZns(
  payload: ZaloZnsPayload,
  accessToken: string,
  appSecret: string,
): Promise<ZaloZnsResponse> {
  // Zalo verifies this proof against the same access token and App Secret.
  // It must be regenerated when a refreshed access token is used.
  const appSecretProof = createHmac("sha256", appSecret)
    .update(accessToken)
    .digest("hex");
  const response = await fetch(ZALO_ZNS_URL, {
    method: "POST",
    headers: {
      access_token: accessToken,
      appsecret_proof: appSecretProof,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as ZaloZnsResponse;
  console.info("[ZNS] Zalo response", {
    httpStatus: response.status,
    error: data.error,
    message: data.message,
    trackingId: payload.tracking_id,
  });
  return data;
}

async function sendWithTokenRetry(
  payload: ZaloZnsPayload,
  accessToken: string,
  appSecret: string,
  branchId?: number | null,
) {
  const firstResponse = await requestZaloZns(payload, accessToken, appSecret);
  if (!INVALID_TOKEN_CODES.has(firstResponse.error ?? 0)) return firstResponse;

  console.warn("[ZNS] Access token hết hạn, đang làm mới", {
    branchId,
    error: firstResponse.error,
  });
  const newAccessToken = await refreshZaloToken(branchId);
  return requestZaloZns(payload, newAccessToken, appSecret);
}

export async function sendZaloZns(
  phone: string,
  templateId: string,
  templateData: Record<string, unknown>,
  branchId?: number | null,
): Promise<ZaloSendResult> {
  const formattedPhone = formatPhoneForZalo(phone);

  try {
    const credentials = await getZaloCredentialValues(branchId);
    const accessToken =
      credentials.ZALO_OA_ACCESS_TOKEN || (await refreshZaloToken(branchId));
    const appSecret = credentials.ZALO_APP_SECRET;
    if (!appSecret) {
      throw new Error("Thiếu Zalo App Secret của chi nhánh");
    }
    const realTemplateId = resolveZaloTemplateId(templateId, credentials);
    const trackingId = `zns_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const payload: ZaloZnsPayload = {
      phone: formattedPhone,
      template_id: realTemplateId,
      template_data: templateData,
      tracking_id: trackingId,
    };

    console.info("[ZNS] Sending message", {
      branchId,
      phone: maskPhone(formattedPhone),
      logicalTemplateId: templateId,
      templateId: realTemplateId,
      trackingId,
    });

    const response = await sendWithTokenRetry(
      payload,
      accessToken,
      appSecret,
      branchId,
    );
    if (response.error === 0) return { success: true, data: response };

    return {
      success: false,
      error: `Lỗi Zalo API [Mã ${response.error}]: ${response.message || "Không rõ lỗi"}`,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[ZNS] Gửi thất bại", {
      branchId,
      phone: maskPhone(formattedPhone),
      error: message,
    });
    return { success: false, error: message };
  }
}

// Format date strictly to DD/MM/YYYY for Zalo ZNS API parameters
export function formatDateForZalo(
  dateInput: Date | string | number | null | undefined,
): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
