# Personal Profile and Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép người dùng chỉnh sửa họ tên và đổi mật khẩu từ dropdown tài khoản ở sidebar, đồng thời ẩn thông báo và avatar khỏi header.

**Architecture:** Đăng nhập sẽ cấp thêm cookie `user_id` được ký bằng `signData`; hai route `/api/me/profile` và `/api/me/password` xác minh chữ ký để thao tác đúng tài khoản hiện tại. Sidebar trong dashboard layout quản lý dropdown và hai modal, còn Zustand cập nhật user cục bộ sau khi đổi tên.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Zustand, Prisma 5, bcryptjs, PowerShell/tsx.

## Global Constraints

- Chỉ cho phép chỉnh sửa `User.name`; email, vai trò và avatar là chỉ đọc/không thay đổi.
- Mật khẩu mới tối thiểu 6 ký tự, xác nhận mật khẩu mới phải trùng, và phải kiểm tra mật khẩu hiện tại bằng bcrypt.
- Không nhận `userId` từ request body cho các thao tác tài khoản cá nhân.
- Không trả trường `password` trong bất kỳ response nào.
- Đổi mật khẩu không buộc đăng xuất phiên hiện tại.
- Header phải ẩn chuông thông báo và avatar; sidebar cung cấp dropdown tài khoản.
- Không thêm dependency mới.

---

## File map

- Create: `src/app/api/me/profile/route.ts` — cập nhật tên người dùng hiện tại.
- Create: `src/app/api/me/password/route.ts` — xác minh và đổi mật khẩu người dùng hiện tại.
- Create: `src/lib/account-security.ts` — hàm kiểm tra mật khẩu mới dùng chung và dễ test.
- Create: `scripts/tests/account_security_check.ts` — kiểm tra hồi quy các quy tắc mật khẩu bằng `tsx`.
- Modify: `src/app/api/auth/login/route.ts` — phát cookie `user_id` đã ký.
- Modify: `src/lib/store.ts` — expose action cập nhật user và xóa cookie `user_id` khi logout.
- Modify: `src/app/(dashboard)/layout.tsx` — dropdown sidebar, modal profile/password, ẩn header notification/avatar.
- Modify: `src/lib/auth.ts` — không cần thay đổi API; dùng `verifyData` hiện có cho `user_id`.

## Task 1: Add failing password validation tests

**Files:**
- Create: `src/lib/account-security.ts`
- Create: `scripts/tests/account_security_check.ts`

**Interfaces:**
- Produces `validatePasswordChange(currentHash, currentPassword, newPassword, confirmPassword): { ok: true } | { ok: false; error: string }`.
- The script exits 1 for invalid cases and prints `Account security checks passed.` only when all assertions pass.

- [ ] **Step 1: Write the tests before implementation**

In `scripts/tests/account_security_check.ts`, import `bcryptjs` and the not-yet-created `validatePasswordChange`. Hash a known current password with `bcrypt.hashSync("old-password", 10)` and assert:

```ts
assert.equal(validatePasswordChange(hash, "wrong-password", "new-password", "new-password").ok, false);
assert.equal(validatePasswordChange(hash, "old-password", "12345", "12345").ok, false);
assert.equal(validatePasswordChange(hash, "old-password", "new-password", "different").ok, false);
assert.deepEqual(validatePasswordChange(hash, "old-password", "new-password", "new-password"), { ok: true });
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
npx tsx scripts/tests/account_security_check.ts
```

Expected: FAIL because `src/lib/account-security.ts` and `validatePasswordChange` do not exist.

- [ ] **Step 3: Implement the minimal validator**

Implement `validatePasswordChange` with this order: compare current hash using `bcrypt.compareSync`; reject new passwords shorter than 6 characters; reject non-matching confirmation; return `{ ok: true }` otherwise. Use Vietnamese error strings suitable for displaying in the modal.

- [ ] **Step 4: Run the test to verify GREEN**

Run the same command. Expected: `Account security checks passed.` and exit code 0.

## Task 2: Add signed current-user identity and secure account APIs

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/lib/store.ts`
- Create: `src/app/api/me/profile/route.ts`
- Create: `src/app/api/me/password/route.ts`
- Modify: `src/lib/account-security.ts`

**Interfaces:**
- `PATCH /api/me/profile` body `{ name: string }`, response `{ user: { id, name, email, role, avatar? } }`.
- `PATCH /api/me/password` body `{ currentPassword: string, newPassword: string, confirmPassword: string }`, response `{ success: true }`.
- Both routes return 401 for missing/invalid signed identity, 400 for validation failures, and never expose `password`.

- [ ] **Step 1: Add signed user ID to login response cookie**

In the login route, import/use `signData(String(user.id))`; set `user_id` with `httpOnly: true`, `sameSite: "lax"`, `secure: isProd`, `path: "/"`, and `maxAge: 86400`. Return no user ID token in the JSON body unless needed by existing client behavior.

- [ ] **Step 2: Add identity cleanup to logout**

In `store.ts`, clear `user_id` alongside `user_role`, `allowed_branches`, and `active_branch_id`. Add `updateUser(user: AuthUser): void` to the store interface and implementation; it must update Zustand and `localStorage.user_session`.

- [ ] **Step 3: Implement current-user lookup in profile API**

Read `user_id`, call `verifyData`, parse a positive integer, and load the user with Prisma `findUnique`. Reject missing/invalid user or empty trimmed name. Update only `{ name: trimmedName }`, destructure out `password`, and return `{ user: safeUser }`.

- [ ] **Step 4: Implement password API**

Read and verify `user_id`, load the user including password, call `validatePasswordChange`, return its error with status 400 when invalid, then hash `newPassword` with `bcrypt.hashSync(newPassword, 10)` and update only the password. Return `{ success: true }` without user data or password.

- [ ] **Step 5: Verify API contracts statically and by typecheck**

Run:

```powershell
npx tsx scripts/tests/account_security_check.ts
npx prisma generate
npx tsc --noEmit
```

Expected: security check and typecheck pass.

## Task 3: Implement sidebar account dropdown and modals

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Clicking the sidebar user area toggles one menu with `Thông tin cá nhân`, `Mật khẩu`, and `Đăng xuất`.
- Profile modal sends `PATCH /api/me/profile`, then calls `updateUser`.
- Password modal sends `PATCH /api/me/password` and clears its fields after success.

- [ ] **Step 1: Add UI state and outside-click handling**

Add state for `accountMenuOpen`, `profileModalOpen`, and `passwordModalOpen`, plus a ref for the account menu. Add an effect that closes the menu on `mousedown` outside. Selecting a menu item closes the dropdown before opening the corresponding modal.

- [ ] **Step 2: Replace sidebar user block with the dropdown trigger**

Wrap the existing user identity display in a button/interactive container. Preserve the avatar initial and role text in the sidebar. Keep the existing logout action as the third dropdown item. Ensure collapsed sidebar still provides an accessible title and clickable trigger.

- [ ] **Step 3: Hide header notification and avatar**

Remove the header `Bell` button and the header avatar/logout button. Keep the branch selector, global search, mobile menu and page title unchanged. Remove `Bell` from the lucide import only if no other use remains.

- [ ] **Step 4: Add profile modal**

Render a modal with read-only email and role fields plus an editable name input. On submit, call `PATCH /api/me/profile`; show the API error in the modal, call `updateUser(data.user)` on success, close the modal, and show the existing toast/feedback pattern if available.

- [ ] **Step 5: Add password modal**

Render current password, new password and confirmation inputs with `type="password"`. On submit, call `PATCH /api/me/password`; display server validation errors, reset all fields and close after success. Do not mutate or display stored password data.

## Task 4: Final verification and regression review

**Files:**
- Modify only files from Tasks 1–3 if verification finds a direct defect.

- [ ] **Step 1: Run account security regression**

```powershell
npx tsx scripts/tests/account_security_check.ts
```

Expected: PASS.

- [ ] **Step 2: Search for security and UI regressions**

```powershell
rg -n "user_id|PATCH.*api/me|currentPassword|newPassword|Bell|accountMenuOpen|profileModalOpen|passwordModalOpen" src
```

Confirm that `user_id` is signed/verified, the header notification/avatar are absent, and no endpoint accepts an arbitrary user ID for personal edits.

- [ ] **Step 3: Run project checks**

```powershell
npx prisma validate
npx tsc --noEmit
npm run build
```

Expected: all commands exit 0. Run `npm run lint` if the existing ESLint configuration is available; otherwise record the repository's existing interactive-config limitation.

- [ ] **Step 4: Review the diff**

```powershell
git diff --check
git status --short
git diff --stat
```

Confirm no password values, unrelated user-admin behavior, header search, branch selection or logout behavior were accidentally changed.
