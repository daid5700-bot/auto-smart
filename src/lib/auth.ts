const DEVELOPMENT_SECRET = "development-only-change-me";

function getSecret() {
  const configured = process.env.COOKIE_SIGN_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("COOKIE_SIGN_SECRET phải được cấu hình tối thiểu 32 ký tự.");
  }
  return configured || DEVELOPMENT_SECRET;
}

const encoder = new TextEncoder();

async function hmacSha256(message: string, secret: string): Promise<string> {
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  // Import the secret key for HMAC SHA-256
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the message
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, msgData);

  // Convert buffer to hex string
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function signRole(role: string): Promise<string> {
  const SECRET = getSecret();
  const data = `${role}:${SECRET}`;
  const signature = await hmacSha256(data, SECRET);
  return `${role}.${signature}`;
}

export async function verifyRole(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;

  // Clean double quotes and decode URI just in case
  let cleanValue = cookieValue.trim();
  if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
    cleanValue = cleanValue.slice(1, -1);
  }
  try {
    cleanValue = decodeURIComponent(cleanValue);
  } catch {
    // ignore
  }
  if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
    cleanValue = cleanValue.slice(1, -1);
  }

  const parts = cleanValue.split(".");
  if (parts.length !== 2) return null;
  const [role, signature] = parts;

  const SECRET = getSecret();
  const data = `${role}:${SECRET}`;
  const expectedSignature = await hmacSha256(data, SECRET);
  if (signature === expectedSignature) {
    return role;
  }

  return null;
}

export async function signData(value: string): Promise<string> {
  const SECRET = getSecret();
  const data = `${value}:${SECRET}`;
  const signature = await hmacSha256(data, SECRET);
  return `${value}.${signature}`;
}

export async function verifyData(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;

  let cleanValue = cookieValue.trim();
  if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
    cleanValue = cleanValue.slice(1, -1);
  }
  try {
    cleanValue = decodeURIComponent(cleanValue);
  } catch {
    // ignore
  }
  if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
    cleanValue = cleanValue.slice(1, -1);
  }

  const parts = cleanValue.split(".");
  if (parts.length !== 2) return null;
  const [data, signature] = parts;

  const SECRET = getSecret();
  const message = `${data}:${SECRET}`;
  const expectedSignature = await hmacSha256(message, SECRET);
  if (signature === expectedSignature) {
    return data;
  }

  return null;
}
