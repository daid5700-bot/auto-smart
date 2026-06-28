const { signRole, verifyRole } = require('./src/lib/auth.ts');

console.log("SECRET:", process.env.COOKIE_SIGN_SECRET || "super-secret-key-auto-smart-crm-erp");
const signed = signRole("ADMIN");
console.log("Signed:", signed);
const verified = verifyRole(signed);
console.log("Verified:", verified);
