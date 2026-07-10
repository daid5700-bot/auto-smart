# Thiết kế thông tin cá nhân và đổi mật khẩu

## Mục tiêu

Cho phép người dùng đang đăng nhập chỉnh sửa họ tên và đổi mật khẩu của chính mình. Tạm thời ẩn chuông thông báo và avatar ở header; thay vùng người dùng trong sidebar thành menu dropdown để mở các chức năng tài khoản.

## Phạm vi dữ liệu

- Cho phép chỉnh sửa: `User.name`.
- Hiển thị chỉ đọc: `User.email` và vai trò hiện tại.
- Không chỉnh sửa avatar, email, vai trò hoặc cơ sở được phân quyền.
- Không thay đổi schema vì model `User` đã có đủ trường cần thiết.

## Backend và bảo mật

Tạo hai endpoint riêng cho tài khoản hiện tại:

- `PATCH /api/me/profile`: xác thực cookie `user_role`, lấy người dùng hiện tại từ session/cookie hiện có và chỉ cập nhật `name`. Không nhận `userId` từ client để tránh sửa nhầm tài khoản khác.
- `PATCH /api/me/password`: xác thực người dùng hiện tại; nhận `currentPassword`, `newPassword`, `confirmPassword`; dùng bcrypt kiểm tra mật khẩu hiện tại, yêu cầu mật khẩu mới tối thiểu 6 ký tự và hai giá trị mới trùng nhau; hash bằng bcrypt trước khi lưu. Không trả mật khẩu trong response.

Vì cookie hiện tại chỉ chứa role và chưa chứa user ID, backend sẽ dùng một cookie/session định danh người dùng đã được ký trong luồng đăng nhập, hoặc bổ sung cookie định danh được ký bằng cơ chế `signData`/`verifyData`. Giá trị định danh không được tin cậy nếu chưa xác minh chữ ký.

## Frontend

- Trong `src/app/(dashboard)/layout.tsx`, ẩn chuông và avatar ở header.
- Sidebar user section là button; click mở dropdown gồm `Thông tin cá nhân`, `Mật khẩu`, `Đăng xuất`.
- Dropdown đóng khi click ngoài hoặc chọn một mục.
- Modal thông tin cá nhân hiển thị email/vai trò chỉ đọc và form họ tên.
- Modal mật khẩu có ba input: mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu mới.
- Hiển thị lỗi API trong modal và thông báo thành công sau khi lưu.
- Sau khi cập nhật tên, cập nhật `useAuth` và `localStorage.user_session` để giao diện đổi ngay.
- Đổi mật khẩu không buộc đăng xuất phiên hiện tại.

## Kiểm thử

- Kiểm tra API cập nhật tên thành công và không cho cập nhật trường ngoài phạm vi.
- Kiểm tra đổi mật khẩu bị từ chối khi mật khẩu hiện tại sai, mật khẩu mới ngắn hoặc xác nhận không khớp.
- Kiểm tra đổi mật khẩu thành công lưu bcrypt hash mới và không trả password.
- Chạy typecheck, lint/build phù hợp và kiểm tra thủ công dropdown/sidebar/header.

## Phương án đã cân nhắc

- Tái sử dụng `/api/users/[id]`: ít endpoint hơn nhưng trộn quyền admin với quyền tự quản lý tài khoản.
- Dùng server action: không phù hợp bằng API route với cấu trúc xác thực hiện tại.

Chọn endpoint `/api/me/*` riêng để giới hạn quyền rõ ràng và không để client tự chỉ định ID người dùng.
