import bcrypt from "bcryptjs";

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validatePasswordChange(
  currentHash: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): PasswordValidationResult {
  if (!bcrypt.compareSync(currentPassword, currentHash)) {
    return { ok: false, error: "Mật khẩu hiện tại không đúng" };
  }

  if (newPassword.length < 6) {
    return { ok: false, error: "Mật khẩu mới phải có ít nhất 6 ký tự" };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Xác nhận mật khẩu không khớp" };
  }

  return { ok: true };
}
