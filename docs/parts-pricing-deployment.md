# Triển khai giá phụ tùng đại lý, phân phối và thợ

## Thay đổi dữ liệu

Migration `20261014090000_migrate_parts_dealer_prices` sao chép giá `WHOLESALE`
sang `DEALER`. Giá `DEALER` đã có được ưu tiên và không bị ghi đè. Giữ
`WHOLESALE` bằng giá `DEALER` để bản cũ vẫn đọc được nếu cần rollback mã nguồn.
API mới ghi hai khóa trong cùng một transaction, kể cả khi nhận payload cũ.
Không thay đổi đơn giá, tổng tiền, công nợ hoặc tồn kho của phiếu đã tạo.

`Price.type` vẫn là String nên không cần thay cột/enum. `DISTRIBUTOR` và
`TECHNICIAN` là mức giá tùy chọn; khi chưa nhập thì dùng giá bán lẻ. Không tự
tạo mức chiết khấu hoặc giá 0 cho dữ liệu đang có. Nhập 0 là giá 0 thực sự;
để trống khi sửa sẽ giữ giá hiện có.

Phiếu yêu cầu mới lưu đơn giá đã chốt trong METADATA. Duyệt phiếu dùng giá này,
kể cả khi bảng giá đã đổi. Phiếu cũ chưa có snapshot dùng loại giá trong metadata
(bao gồm WHOLESALE); nếu không có metadata mới dùng giá bán lẻ.
Nếu bổ sung cùng phụ tùng ở một mức giá khác, cộng tiền của lần xuất mới vào
tiền đã chốt trước đó. Do hóa đơn dùng một dòng cho mỗi phụ tùng, đơn giá trên
dòng tổng hợp là giá bình quân; không áp giá mới lại cho số lượng đã xuất.

## Triển khai Docker hiện tại

Sau khi các thay đổi được commit/push/merge vào nhánh triển khai, chạy:

```sh
sh scripts/deploy.sh
```

Script hiện có cập nhật code, sao lưu DB, build image, chạy migration rồi thay
container ứng dụng. Nếu migration thất bại thì không khởi động phiên bản mới.
Không chạy `db:seed` trên production: seed hiện tại xóa dữ liệu để tạo dữ liệu mẫu.
Không dùng `db:push` thay cho migration dữ liệu này.

Nếu không dùng Docker và database đã có lịch sử Prisma migrations:

```sh
npm ci
npm run db:generate
npm run test:parts-pricing
npm run build
# Dừng nhận giao dịch trên bản cũ, sao lưu DB.
# DATABASE_URL và DIRECT_URL phải trỏ đến cùng database cần triển khai.
npm run db:migrate:deploy
npm run start
```

Database cũ chưa có lịch sử migrations cần dùng quy trình
`scripts/docker-migrate.sh`/`scripts/migration-bootstrap.mjs` của dự án; không
đánh dấu migration giá mới là đã áp dụng trước khi chạy SQL.

## Kiểm tra sau deploy

```sql
SELECT COUNT(*) AS missing_dealer
FROM "Price" old
WHERE old.type = 'WHOLESALE'
  AND NOT EXISTS (
    SELECT 1 FROM "Price" current
    WHERE current."productId" = old."productId" AND current.type = 'DEALER'
  );
```

Kết quả phải là 0. Kiểm tra một phụ tùng có giá sỉ cũ: giá đại lý giữ nguyên,
giá phân phối/thợ chưa đặt vẫn trống. Tạo và duyệt phiếu yêu cầu theo từng loại
giá; tiền hóa đơn phải bằng đơn giá đã chốt × số lượng. Kiểm tra lại phiếu cũ
và tồn kho. Nếu rollback code, giữ migration và dữ liệu mới để bản cũ đọc khóa
WHOLESALE; không xóa các mức giá mới.

Kiểm tra SQL migration trên database PostgreSQL tạm:

```sh
psql "$TEST_DATABASE_URL" -f scripts/tests/db/test_parts_price_migration.sql
```

Test dùng schema riêng và chạy SQL migration hai lần, kiểm tra trùng khóa,
giá 0, giữ giá đại lý hiện có và không đổi hóa đơn cũ.

Có thể kiểm tra API trên bản production/standalone đang chạy với database tạm:

```sh
TEST_DATABASE_URL='postgresql://USER@127.0.0.1:PORT/autosmart_pricing_test' \
TEST_APP_URL='http://127.0.0.1:APP_PORT' npm run test:parts-pricing:http
```

Chỉ dùng ứng dụng kết nối database tạm `autosmart_pricing_test`. Test tạo dữ liệu
mẫu riêng, kiểm tra đăng nhập/chọn chi nhánh, giá cũ/mới, rollback PATCH, duyệt
phiếu, snapshot, giá 0, giữ tiền cũ khi bổ sung phụ tùng, tồn kho và công nợ.
