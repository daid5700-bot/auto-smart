const DEFAULT_SECRET = "super-secret-key-auto-smart-crm-erp";
const SECRET = process.env.COOKIE_SIGN_SECRET || DEFAULT_SECRET;

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

  // Try verifying with the active SECRET
  const data = `${role}:${SECRET}`;
  const expectedSignature = await hmacSha256(data, SECRET);
  if (signature === expectedSignature) {
    return role;
  }

  // Fallback: try verifying with the default secret if active SECRET is different
  if (SECRET !== DEFAULT_SECRET) {
    const fallbackData = `${role}:${DEFAULT_SECRET}`;
    const fallbackSignature = await hmacSha256(fallbackData, DEFAULT_SECRET);
    if (signature === fallbackSignature) {
      return role;
    }
  }

  return null;
}

export async function signData(value: string): Promise<string> {
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

  // Try verifying with the active SECRET
  const message = `${data}:${SECRET}`;
  const expectedSignature = await hmacSha256(message, SECRET);
  if (signature === expectedSignature) {
    return data;
  }

  // Fallback: try verifying with the default secret
  if (SECRET !== DEFAULT_SECRET) {
    const fallbackMessage = `${data}:${DEFAULT_SECRET}`;
    const fallbackSignature = await hmacSha256(fallbackMessage, DEFAULT_SECRET);
    if (signature === fallbackSignature) {
      return data;
    }
  }

  return null;
}
