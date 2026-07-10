# Thiết kế loại bỏ hoa hồng kỹ thuật viên

## Mục tiêu

Loại bỏ hoàn toàn tính năng hoa hồng kỹ thuật viên khỏi ứng dụng: giao diện, API, phép tính, dữ liệu Prisma và quyền RBAC. Việc phân công kỹ thuật viên và các báo cáo hiệu suất không liên quan đến hoa hồng vẫn phải tiếp tục hoạt động.

## Phạm vi thay đổi

### Database

- Xóa trường `commissionRate` khỏi model `Technician`.
- Xóa model/bảng `TechPerformance` lưu hiệu suất hoa hồng và quan hệ `performances` khỏi `Technician`.
- Tạo migration Prisma để cập nhật database hiện tại.
- Không xóa `technicianId` khỏi RepairOrder; kỹ thuật viên vẫn được gán cho lệnh sửa chữa.

### Backend

- Xóa phép tính và ghi nhận `commissionAmount` khi lệnh sửa chữa hoàn tất.
- Xóa các trường hoa hồng khỏi API kỹ thuật viên và workshop.
- Xóa các truy vấn tổng hợp hoa hồng khỏi dashboard/thống kê.
- Giữ nguyên các cập nhật trạng thái kỹ thuật viên, điểm khách hàng và các nghiệp vụ hoàn tất khác.

### Frontend

- Xóa trang `/workshop/commission` và liên kết điều hướng tới trang này.
- Xóa trường nhập, cột hiển thị tỷ lệ hoa hồng và tổng hoa hồng ở trang quản lý kỹ thuật viên.
- Xóa các thẻ, cột hoặc nội dung hoa hồng ở những màn hình workshop/thống kê khác.
- Giữ lại tên kỹ thuật viên, phân công kỹ thuật viên và các chỉ số hiệu suất không phải hoa hồng.

### Quyền truy cập

- Xóa quyền `workshop.commission` khỏi cấu hình RBAC và các danh sách quyền mặc định.
- Đảm bảo không còn route/menu nào yêu cầu quyền đã xóa.

## Luồng dữ liệu sau thay đổi

Khi tạo hoặc cập nhật lệnh sửa chữa, hệ thống chỉ lưu thông tin lệnh, kỹ thuật viên được phân công, trạng thái, giảm giá, doanh thu và các nghiệp vụ hiện có. Khi hoàn tất lệnh, hệ thống không tạo bản ghi hoặc tính số tiền hoa hồng.

## Kiểm thử và xác minh

- Tìm toàn bộ repository với các từ khóa `commission`, `hoa hồng`, `commissionRate`, `commissionAmount`, `workshop.commission` và xác nhận chỉ còn các tham chiếu được giải thích trong tài liệu/migration nếu có.
- Chạy kiểm tra typecheck, lint, test hiện có và build production.
- Kiểm tra Prisma schema/migration hợp lệ.
- Kiểm tra các luồng tạo lệnh, hoàn tất lệnh, quản lý kỹ thuật viên và báo cáo không còn phụ thuộc vào trường hoa hồng.

## Phương án thay thế đã cân nhắc

- Giữ schema nhưng ẩn UI: loại bỏ không triệt để, vẫn còn logic và dữ liệu không còn dùng.
- Chỉ vô hiệu hóa theo cấu hình: tăng độ phức tạp và không đáp ứng yêu cầu xóa hoàn toàn.

Chọn xóa hoàn toàn vì phù hợp trực tiếp với yêu cầu và giảm mã chết, dữ liệu dư thừa và quyền truy cập không cần thiết.
