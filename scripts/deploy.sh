#!/bin/bash

# Exit immediately if any command fails
set -e

# Tự động di chuyển về thư mục gốc của dự án (thư mục cha của thư mục chứa script này)
cd "$(dirname "$0")/.."

echo "=================================================="
echo "🚀 AUTO-SMART ERP & CRM - DOCKER DEPLOYMENT 🚀"
echo "=================================================="

echo "📥 Bước 1: Đang cập nhật mã nguồn mới nhất từ Git..."
git pull

echo "🐳 Bước 2: Build lại và khởi động lại các Container Docker..."
# Build lại Next.js app image và restart services ở chế độ nền
docker-compose up -d --build

echo "=================================================="
echo "🎉 DOCKER DEPLOYMENT HOÀN THÀNH THÀNH CÔNG! 🎉"
echo "=================================================="
