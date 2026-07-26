-- Optional vehicle model compatibility for inventory products.
-- Existing products remain unchanged because the new column is nullable.
ALTER TABLE "Product" ADD COLUMN "vehicleModel" TEXT;
