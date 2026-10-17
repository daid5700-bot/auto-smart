-- Lưu lại loại giá đã dùng để tính tiền cho phiếu xuất kho.
-- Trước đây loại giá chỉ được suy ra từ "type" ở client nên không truy vết được.
ALTER TABLE "InventoryOrder"
  ADD COLUMN "priceType" TEXT NOT NULL DEFAULT 'RETAIL';

-- Tái hiện ĐÚNG hành vi của "cầu nối" cũ (movements/page.tsx:169,
-- orders/new/page.tsx:192). Không phiếu nào đổi ý nghĩa hay đổi số tiền.
UPDATE "InventoryOrder" SET "priceType" = 'DEALER' WHERE "type" = 'EXPORT_WHOLESALE';
