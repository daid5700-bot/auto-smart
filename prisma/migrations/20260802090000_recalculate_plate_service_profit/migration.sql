-- Lợi nhuận dịch vụ biển được hệ thống tự tính từ tổng thu và toàn bộ
-- chi phí thực tế, bao gồm giá vốn ốp biển đã chụp tại thời điểm xuất kho.
UPDATE "PlateService"
SET "profit" =
  "totalRevenue"
  - "registrationTax"
  - "plateFee"
  - "policeFee"
  - "plateFrameTotalCost"
WHERE "profit" IS DISTINCT FROM (
  "totalRevenue"
  - "registrationTax"
  - "plateFee"
  - "policeFee"
  - "plateFrameTotalCost"
);
