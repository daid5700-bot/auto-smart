#!/bin/sh

set -eu

MAX_ATTEMPTS="${MIGRATION_MAX_ATTEMPTS:-30}"
RETRY_SECONDS="${MIGRATION_RETRY_SECONDS:-2}"
attempt=1

echo "[migration] Checking database and legacy Docker baseline..."
while true; do
  set +e
  node ./scripts/migration-bootstrap.mjs
  bootstrap_status=$?
  set -e

  if [ "$bootstrap_status" -eq 0 ]; then
    break
  fi
  if [ "$bootstrap_status" -ne 75 ] || [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "[migration] Baseline check failed; application startup is cancelled."
    exit "$bootstrap_status"
  fi

  echo "[migration] Database is not ready (${attempt}/${MAX_ATTEMPTS}); retrying in ${RETRY_SECONDS}s..."
  attempt=$((attempt + 1))
  sleep "$RETRY_SECONDS"
done

echo "[migration] Applying pending Prisma migrations..."
./node_modules/.bin/prisma migrate deploy
echo "[migration] Database is up to date."

if [ "$#" -gt 0 ]; then
  exec "$@"
fi
