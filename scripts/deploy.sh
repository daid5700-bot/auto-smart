#!/bin/sh

# Exit immediately if any command fails
set -eu

# Tự động di chuyển về thư mục gốc của dự án (thư mục cha của thư mục chứa script này)
cd "$(dirname "$0")/.."

if docker compose version >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose "$@"; }
else
  echo "Không tìm thấy Docker Compose."
  exit 1
fi

echo "=================================================="
echo "🚀 AUTO-SMART ERP & CRM - DOCKER DEPLOYMENT 🚀"
echo "=================================================="

echo "📥 Bước 1: Đang cập nhật mã nguồn mới nhất từ Git..."
git pull

echo "🗄️  Bước 2: Khởi động PostgreSQL và chờ database sẵn sàng..."
compose up -d crm-db

attempt=1
while ! compose exec -T crm-db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; do
  if [ "$attempt" -ge 60 ]; then
    echo "Database không sẵn sàng sau 120 giây. Hủy deploy."
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

echo "💾 Bước 3: Sao lưu database trước migration..."
sh ./scripts/docker-backup.sh

echo "🐳 Bước 4: Build image ứng dụng mới (ứng dụng cũ vẫn đang chạy)..."
compose build crm-app

echo "🧱 Bước 5: Chạy migration trước khi thay container ứng dụng..."
compose run --rm --no-deps crm-app sh ./scripts/docker-migrate.sh

echo "🔄 Bước 6: Khởi động phiên bản ứng dụng mới..."
compose up -d --no-deps crm-app

echo "🔎 Bước 7: Trạng thái container..."
compose ps

echo "=================================================="
echo "🎉 DOCKER DEPLOYMENT HOÀN THÀNH THÀNH CÔNG! 🎉"
echo "=================================================="
