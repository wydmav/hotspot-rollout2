#!/usr/bin/env bash
# =============================================================================
# T-Connect Automated Backup & Restore Script (E2 & Phase 8 Runbook)
# Usage:
#   ./scripts/backup-restore.sh backup
#   ./scripts/backup-restore.sh restore <backup_archive.tar.gz>
# =============================================================================
set -euo pipefail

ACTION="${1:-backup}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/tmp/tconnect-backups}"
mkdir -p "$BACKUP_DIR"

if [ "$ACTION" = "backup" ]; then
  STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
  OUT_FILE="$BACKUP_DIR/tconnect-backup-$STAMP.tar.gz"
  tar -czf "$OUT_FILE" -C "$ROOT_DIR" data
  chmod 600 "$OUT_FILE"
  echo "[OK] Encrypted-permissions backup archive created at: $OUT_FILE"
elif [ "$ACTION" = "restore" ]; then
  ARCHIVE="${2:-}"
  if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
    echo "[ERROR] Please provide a valid backup archive path to restore."
    exit 1
  fi
  tar -xzf "$ARCHIVE" -C "$ROOT_DIR"
  echo "[OK] Restored data/ state from $ARCHIVE"
else
  echo "Usage: $0 {backup|restore <archive>}"
  exit 1
fi
