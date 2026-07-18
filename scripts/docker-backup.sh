#!/bin/sh

set -eu

cd "$(dirname "$0")/.."

if docker compose version >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose "$@"; }
else
  echo "Không tìm thấy Docker Compose."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"

backup_file="$BACKUP_DIR/crm_db_$(date +%Y%m%d_%H%M%S).dump"
temporary_file="${backup_file}.partial"
echo "[backup] Đang sao lưu PostgreSQL vào $backup_file"

trap 'rm -f "$temporary_file"' EXIT HUP INT TERM
compose exec -T crm-db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' \
  > "$temporary_file"

mv "$temporary_file" "$backup_file"
trap - EXIT HUP INT TERM
chmod 600 "$backup_file"
find "$BACKUP_DIR" -type f -name 'crm_db_*.dump' -mtime "+$BACKUP_RETENTION_DAYS" -delete
echo "[backup] Sao lưu hoàn tất."
