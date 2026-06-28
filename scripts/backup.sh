#!/bin/bash

# Đường dẫn tuyệt đối đến thư mục dự án
PROJECT_DIR="/Users/admin/Project/Web/AUTO-SMART CRM & ERP"
BACKUP_DIR="$HOME/Supabase_Backups"

# Tạo thư mục chứa backup nếu chưa có
mkdir -p "$BACKUP_DIR"

# Đọc file .env để lấy DIRECT_URL
if [ -f "$PROJECT_DIR/.env" ]; then
  # Đọc biến DIRECT_URL từ file .env
  DIRECT_URL=$(grep -E "^DIRECT_URL=" "$PROJECT_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
else
  echo "Error: Không tìm thấy file .env tại $PROJECT_DIR"
  exit 1
fi

if [ -z "$DIRECT_URL" ]; then
  echo "Error: Không tìm thấy biến DIRECT_URL trong file .env"
  exit 1
fi

# Tên file backup theo ngày giờ
FILENAME="supabase_backup_$(date +%Y%m%d_%H%M%S).sql"
OUTPUT_FILE="$BACKUP_DIR/$FILENAME"

echo "Đang tiến hành sao lưu dữ liệu Supabase..."

# Chạy pg_dump để backup cấu trúc và dữ liệu
# Lưu ý: pg_dump cần được cài đặt trên máy (ví dụ qua Homebrew: brew install postgresql)
if command -v pg_dump &> /dev/null; then
  pg_dump "$DIRECT_URL" -F p -f "$OUTPUT_FILE"
  
  if [ $? -eq 0 ]; then
    echo "Sao lưu thành công! File lưu tại: $OUTPUT_FILE"
    
    # Tự động xóa các file backup cũ hơn 30 ngày để tiết kiệm dung lượng
    find "$BACKUP_DIR" -name "supabase_backup_*.sql" -type f -mtime +30 -delete
    echo "Đã dọn dẹp các bản sao lưu cũ hơn 30 ngày."
  else
    echo "Error: Quá trình pg_dump thất bại."
    exit 1
  fi
else
  echo "Error: Không tìm thấy lệnh pg_dump trên máy này."
  echo "Vui lòng cài đặt PostgreSQL client bằng cách chạy: brew install postgresql"
  exit 1
fi
