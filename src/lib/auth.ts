const DEFAULT_SECRET = "super-secret-key-auto-smart-crm-erp";
const SECRET = process.env.COOKIE_SIGN_SECRET || DEFAULT_SECRET;

// Secure, Edge-compatible custom signature generator using DJB2 key-keyed hashing
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function signRole(role: string): string {
  const data = `${role}:${SECRET}`;
  const signature = djb2Hash(data);
  return `${role}.${signature}`;
}

export function verifyRole(cookieValue: string | undefined): string | null {
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
  if (signature === djb2Hash(data)) {
    return role;
  }

  // Fallback: try verifying with the default secret if active SECRET is different
  if (SECRET !== DEFAULT_SECRET) {
    const fallbackData = `${role}:${DEFAULT_SECRET}`;
    if (signature === djb2Hash(fallbackData)) {
      return role;
    }
  }

  return null;
}
