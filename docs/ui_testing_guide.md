# TÀI LIỆU HƯỚNG DẪN KIỂM THỬ GIAO DIỆN (UI TESTING GUIDE)

> [!NOTE]  
> Tài liệu này hướng dẫn chi tiết các bước kiểm thử trên giao diện (UI/UX) nhằm xác minh tính chính xác của các bản sửa lỗi bảo mật, phân quyền, logic tính tiền và quản trị Kỹ thuật viên vừa được triển khai.

---

## 📋 Tóm tắt các Kịch bản kiểm thử (Test Cases)

| STT | Kịch bản kiểm thử | Module | Mục tiêu xác minh |
| :--- | :--- | :--- | :--- |
| 1 | Kiểm tra Cập nhật thông tin Kỹ thuật viên | Workshop | Xác minh tỷ lệ hoa hồng không bị reset về 0% và hiển thị đúng trên bảng. |
| 2 | Lập phiếu xuất kho phụ tùng có trả trước | Inventory | Xác minh hệ thống ghi nhận đúng số tiền trả trước và số tiền nợ lúc sinh đơn. |
| 3 | Trả nợ đơn hàng kho | Inventory | Xác minh nhập số tiền trả thêm (Delta) cập nhật đúng công nợ và sổ quỹ tiền mặt. |
| 4 | Tạo Lệnh sửa chữa kèm phụ tùng và Phê duyệt | Workshop | Xác minh hóa đơn không bị nhân đôi số lượng phụ tùng và tính đúng tổng tiền. |
| 5 | Kiểm tra đăng nhập ẩn danh & Bypass Middleware | System | Xác minh tính năng đăng nhập nhanh bị khóa ở Production và API được bảo mật sâu. |

---

## 🛠️ Chi tiết các bước thực hiện kiểm thử

### Kịch bản 1: Quản lý Kỹ thuật viên (KTV) và Hoa hồng
*   **Đường dẫn truy cập:** `http://localhost:3000/workshop/commission` hoặc `http://localhost:3000/workshop/technicians`
*   **Các bước thực hiện:**
    1.  Nhấn nút **"Thêm KTV mới"**. Quan sát xem có trường **"Tỷ lệ hoa hồng (%)"** mới xuất hiện trên form modal hay không. Nhập thông tin và điền tỷ lệ hoa hồng là `15%`. Lưu lại.
    2.  Quan sát cột **"Tỷ lệ hoa hồng (%)"** trên danh sách KTV vừa được hiển thị.
    3.  Nhấp vào biểu tượng **Sửa (Edit)** KTV đó. Thay đổi số điện thoại và nhấn **Lưu lại** (không chạm vào ô tỷ lệ hoa hồng).
*   **Kết quả kỳ vọng (Expected):**
    *   Form modal hiển thị đầy đủ trường nhập hoa hồng.
    *   Tỷ lệ hoa hồng của KTV được hiển thị chính xác trên bảng danh sách.
    *   Sau khi sửa thông tin, tỷ lệ hoa hồng **vẫn giữ nguyên là 15%**, không bị đưa về `0%` như trước đây.

---

### Kịch bản 2: Lập phiếu xuất/bán kho mới có trả trước
*   **Đường dẫn truy cập:** `http://localhost:3000/inventory/orders/new`
*   **Các bước thực hiện:**
    1.  Chọn một khách hàng và thêm một số sản phẩm vào danh sách xuất kho.
    2.  Giả sử tổng giá trị đơn hàng là **1.000.000đ**.
    3.  Tại ô **"Khách thanh toán"**, nhập số tiền trả trước là **400.000đ**.
    4.  Nhấp **"Lập phiếu xuất/bán mới"**.
*   **Kết quả kỳ vọng (Expected):**
    *   Đơn hàng được tạo thành công và chuyển hướng về danh sách đơn kho.
    *   Trạng thái đơn hàng hiển thị là **"Đang nợ"**.
    *   Số tiền còn nợ hiển thị đúng là **600.000đ** (thay vì 1.000.000đ như trước).
    *   Hệ thống ghi nhận một phiếu thu quỹ (Dòng tiền INCOME) trị giá **400.000đ** tại trang sổ quỹ.

---

### Kịch bản 3: Trả nợ Đơn kho (Khách trả thêm tiền)
*   **Đường dẫn truy cập:** `http://localhost:3000/inventory/orders`
*   **Các bước thực hiện:**
    1.  Tìm đơn hàng vừa tạo ở kịch bản 2 (Đang nợ **600.000đ**).
    2.  Nhấp vào biểu tượng **"Cập nhật thanh toán" (Hình biểu tượng đô la)**.
    3.  Trên modal cập nhật nợ, tại ô **"Khách trả thêm"**, nhập số tiền khách đưa thêm lần này là **200.000đ**.
    4.  Nhấn **"Cập nhật"**.
*   **Kết quả kỳ vọng (Expected):**
    *   Đơn hàng cập nhật thành công. Số tiền còn nợ giảm xuống còn **400.000đ**.
    *   Mở Sổ quỹ/Giao dịch dòng tiền: Có phiếu thu mới **200.000đ** ghi nhận thành công (không bị ghi nhận 0đ hay âm tiền).
    *   Mở thông tin Khách hàng đó trong CRM: Công nợ khách hàng giảm đi đúng **200.000đ** và doanh số tích lũy tăng thêm đúng **200.000đ**.

---

### Kịch bản 4: Tạo Lệnh sửa chữa (RO) có yêu cầu phụ tùng
*   **Đường dẫn truy cập:** `http://localhost:3000/workshop/new`
*   **Các bước thực hiện:**
    1.  Nhập thông tin khách hàng, biển số xe và tiền công thợ (VD: **200.000đ**).
    2.  Thêm phụ tùng yêu cầu (VD: *Nhông xích*, số lượng `1`, đơn giá **300.000đ**).
    3.  Nhấn **"Tạo lệnh sửa chữa"**. Lúc này trạng thái RO là `WAITING_PARTS` (Chờ phụ tùng).
    4.  Truy cập trang duyệt kho của thủ kho: `http://localhost:3000/inventory/requisitions` (hoặc nhấn nút Duyệt yêu cầu trên bảng điều khiển thủ kho).
    5.  Tìm phiếu yêu cầu tương ứng với Lệnh sửa chữa vừa tạo và nhấn **"Phê duyệt"**.
    6.  Quay lại trang chi tiết Lệnh sửa chữa: `http://localhost:3000/workshop`.
*   **Kết quả kỳ vọng (Expected):**
    *   Tại chi tiết RO, phần danh sách phụ tùng hiển thị số lượng *Nhông xích* đúng bằng `1` (Không bị nhân đôi thành `2` cái).
    *   Tổng hóa đơn thanh toán hiển thị đúng bằng **500.000đ** (300K phụ tùng + 200K tiền công).
    *   Tồn kho của sản phẩm *Nhông xích* bị trừ đi đúng `1` cái.

---

### Kịch bản 5: Đăng nhập & Bypass Phân quyền hệ thống
*   **Các bước thực hiện:**
    1.  Đăng xuất khỏi hệ thống.
    2.  Mở tab ẩn danh (Incognito) của trình duyệt.
    3.  Nhập trực tiếp các đường dẫn API nhạy cảm vào thanh địa chỉ, ví dụ:
        *   `http://localhost:3000/api/users`
        *   `http://localhost:3000/api/branches`
*   **Kết quả kỳ vọng (Expected):**
    *   Trình duyệt hiển thị mã lỗi **403 Forbidden** hoặc JSON `{ "error": "Access denied" }`.
    *   Không thể bypass bằng cách tắt Javascript hay giả mạo middleware vì API đã có hàm `verifyRole` trực tiếp chặn ở phía máy chủ.
    *   Tại trang login: Nút đăng nhập nhanh (nhập sẵn mật khẩu thô của admin/kho) **không được phép hiển thị** trên giao diện nếu ứng dụng đang chạy ở chế độ Production (`process.env.NODE_ENV === "production"`).
