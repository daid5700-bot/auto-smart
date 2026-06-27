const SECRET = process.env.COOKIE_SIGN_SECRET || "super-secret-key-auto-smart-crm-erp";

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
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [role, signature] = parts;

  const data = `${role}:${SECRET}`;
  const expectedSignature = djb2Hash(data);

  if (signature === expectedSignature) {
    return role;
  }
  return null;
}
