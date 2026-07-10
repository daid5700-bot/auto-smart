import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { validatePasswordChange } from "@/lib/account-security";

const hash = bcrypt.hashSync("old-password", 10);

assert.equal(
  validatePasswordChange(hash, "wrong-password", "new-password", "new-password").ok,
  false,
);
assert.equal(
  validatePasswordChange(hash, "old-password", "12345", "12345").ok,
  false,
);
assert.equal(
  validatePasswordChange(hash, "old-password", "new-password", "different").ok,
  false,
);
assert.deepEqual(
  validatePasswordChange(hash, "old-password", "new-password", "new-password"),
  { ok: true },
);

console.log("Account security checks passed.");
