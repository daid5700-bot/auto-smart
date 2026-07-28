import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const VERSION = "v1";

function getEncryptionKey() {
  const configured =
    process.env.PLATE_SERVICE_ENCRYPTION_KEY ||
    process.env.COOKIE_SIGN_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "development-only-change-me");

  if (!configured || configured.length < 32) {
    throw new Error(
      "Cần cấu hình PLATE_SERVICE_ENCRYPTION_KEY hoặc COOKIE_SIGN_SECRET tối thiểu 32 ký tự.",
    );
  }

  return createHash("sha256")
    .update(`auto-smart:plate-service:${configured}`)
    .digest();
}

export function encryptPlateServicePassword(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptPlateServicePassword(value: string) {
  const [version, ivValue, authTagValue, encryptedValue] = value.split(".");
  if (
    version !== VERSION ||
    !ivValue ||
    !authTagValue ||
    encryptedValue === undefined
  ) {
    throw new Error("Dữ liệu mật khẩu dịch vụ biển không hợp lệ.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
