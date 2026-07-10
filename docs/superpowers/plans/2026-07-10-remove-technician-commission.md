# Remove Technician Commission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xóa hoàn toàn tính năng hoa hồng kỹ thuật viên khỏi ứng dụng mà vẫn giữ nguyên việc phân công, trạng thái kỹ thuật viên, doanh thu và tích điểm khách hàng.

**Architecture:** Loại bỏ trường và model hoa hồng khỏi Prisma, sau đó bỏ các truy vấn/tính toán hoa hồng ở API và giao diện. Dùng một kiểm tra hồi quy tĩnh để bảo đảm các file runtime không còn tham chiếu tới các tên hoa hồng đã xóa, kết hợp với Prisma generate, typecheck, lint, API test và production build.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Prisma 5, PostgreSQL, PowerShell.

## Global Constraints

- Không xóa `technicianId` hoặc thông tin phân công kỹ thuật viên khỏi `RepairOrder`.
- Giữ nguyên cập nhật trạng thái kỹ thuật viên, điểm khách hàng và các nghiệp vụ hoàn tất lệnh khác.
- Xóa hoàn toàn `commissionRate`, `commissionAmount`, `TechPerformance` và quyền `workshop.commission` khỏi mã runtime.
- Không thêm dependency mới.
- Mọi bước code phải theo TDD: viết kiểm tra hồi quy trước, chạy thấy fail, sửa tối thiểu, rồi chạy lại đến pass.

---

## File map

- Create: `scripts/tests/commission_removal_check.ts` — kiểm tra hồi quy tĩnh cho việc không còn tham chiếu hoa hồng trong runtime và schema.
- Modify: `prisma/schema.prisma` — xóa `commissionRate`, `performances` và model `TechPerformance`.
- Modify: `src/config/rbac.ts` — xóa kiểu quyền và quyền mặc định `workshop.commission`.
- Modify: `src/app/api/workshop/[id]/route.ts` — bỏ ghi nhận hoa hồng khi hoàn tất lệnh.
- Modify: `src/app/api/workshop/route.ts` — bỏ truy vấn/enrichment hoa hồng của danh sách kỹ thuật viên.
- Modify: `src/app/api/technicians/route.ts` — bỏ truy vấn/enrichment hoa hồng và không nhận tỷ lệ khi tạo kỹ thuật viên.
- Modify: `src/app/api/technicians/[id]/route.ts` — không cập nhật tỷ lệ hoa hồng.
- Modify: `src/app/(dashboard)/workshop/technicians/page.tsx` — bỏ state, field, cột và input hoa hồng.
- Delete: `src/app/(dashboard)/workshop/commission/page.tsx` — xóa trang hoa hồng không còn được sử dụng.

## Task 1: Add the failing regression check

**Files:**
- Create: `scripts/tests/commission_removal_check.ts`

**Interfaces:**
- Produces executable command `npx tsx scripts/tests/commission_removal_check.ts`.
- The check reads runtime files from `src/` and `prisma/schema.prisma`, then exits non-zero when forbidden commission identifiers remain.

- [ ] **Step 1: Write the failing check**

Create a TypeScript script that recursively reads the scoped runtime files and asserts these strings are absent: `commissionRate`, `commissionAmount`, `TechPerformance`, `performances`, `totalCommission`, `workshop.commission`, and the `/workshop/commission` page path. Exclude the design/plan documents and the check file itself.

Use `process.cwd()`, `fs`, and `path`; print each offending file and matched identifier before throwing an error. The expected success output is `Technician commission removal check passed.`.

- [ ] **Step 2: Run it and verify RED**

Run:

```powershell
npx tsx scripts/tests/commission_removal_check.ts
```

Expected: FAIL, listing existing references in `prisma/schema.prisma`, workshop/technician API and UI files.

## Task 2: Remove the database representation and API behavior

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/workshop/[id]/route.ts`
- Modify: `src/app/api/workshop/route.ts`
- Modify: `src/app/api/technicians/route.ts`
- Modify: `src/app/api/technicians/[id]/route.ts`

**Interfaces:**
- `GET /api/technicians` continues returning technician identity, status and completed order count, but no commission fields.
- `POST /api/technicians` accepts code, name, phone and status behavior without commission data.
- `PATCH /api/technicians/:id` updates code, name, phone and status only.
- `PATCH /api/workshop/:id` still sets technician status to `IDLE`, loyalty points and ZNS logic when completing a repair order, but never creates `TechPerformance`.

- [ ] **Step 1: Remove Prisma commission fields**

In `Technician`, remove `commissionRate` and `performances`. Delete the `TechPerformance` model. Keep `repairOrders`, branch fields and all `RepairOrder.technicianId` fields unchanged.

- [ ] **Step 2: Remove completion-time commission writes**

In `src/app/api/workshop/[id]/route.ts`, keep the `prisma.technician.update` call that sets status to `IDLE`, and delete only the `commissionRate`, labor calculation, duplicate lookup and `prisma.techPerformance.create` block.

- [ ] **Step 3: Remove commission selections and totals from workshop APIs**

In both workshop and technician list APIs, remove `performances` selections and `totalCommission` mapping. Preserve `_count.repairOrders` and `completedOrders`.

- [ ] **Step 4: Remove commission input from technician APIs**

Remove `commissionRate` from technician create and update payloads. Do not reject unrelated extra request properties; simply do not persist them.

- [ ] **Step 5: Regenerate Prisma client and verify types**

Run:

```powershell
npx prisma generate
npx tsc --noEmit
```

Expected: Prisma client generation succeeds and TypeScript reports no references to deleted Prisma fields/models.

## Task 3: Remove UI and permission surface

**Files:**
- Modify: `src/config/rbac.ts`
- Modify: `src/app/(dashboard)/workshop/technicians/page.tsx`
- Delete: `src/app/(dashboard)/workshop/commission/page.tsx`

**Interfaces:**
- Technician management still supports create, edit, delete, phone, status and completed-order count.
- Workshop navigation continues exposing technician management through `workshop.manage`; no commission permission or page remains.

- [ ] **Step 1: Remove commission permission**

Delete `workshop.commission` from the `Permission` union and from the `ADMIN` and `WORKSHOP` default permission arrays. No navigation item currently uses it, so preserve all other navigation entries.

- [ ] **Step 2: Remove commission UI state and fields**

In the technician page, remove the `formatCurrency` import, `commissionRate` from form state and edit/reset payloads, the commission table header/cell, and the commission input block. Keep the existing API submit flow and all non-commission fields unchanged.

- [ ] **Step 3: Delete the commission page**

Delete `src/app/(dashboard)/workshop/commission/page.tsx`. Do not replace it with a new route because the feature is intentionally removed.

## Task 4: Make the regression check pass and validate all requirements

**Files:**
- Modify: `scripts/tests/commission_removal_check.ts` only if the check needs a precise scoped-file adjustment.

- [ ] **Step 1: Run the regression check**

Run:

```powershell
npx tsx scripts/tests/commission_removal_check.ts
```

Expected: PASS with `Technician commission removal check passed.`.

- [ ] **Step 2: Search for residual references**

Run:

```powershell
rg -n -i "commission|hoa hồng|hoa-hong" src prisma package.json
```

Expected: no runtime references to technician commission. Any remaining result must be unrelated percentage terminology and be reviewed manually.

- [ ] **Step 3: Run project verification**

Run each command and record its exit status:

```powershell
npx prisma validate
npx tsc --noEmit
npm run lint
npm run test:api
npm run build
```

Expected: all commands exit 0. If the API test requires a configured database, report the exact environmental blocker instead of claiming it passed.

- [ ] **Step 4: Review the final diff**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Confirm only the scoped files changed, the deleted page is absent, and no generated or unrelated files were modified.

- [ ] **Step 5: Commit the implementation**

```powershell
git add prisma/schema.prisma src/config/rbac.ts src/app scripts/tests/commission_removal_check.ts
git commit -m "refactor: remove technician commission"
```

