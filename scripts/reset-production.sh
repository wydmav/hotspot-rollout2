#!/usr/bin/env bash
set -euo pipefail

echo "================================================================"
echo "  T-CONNECT CLOUD CONTROLLER — PRODUCTION ZERO-STATE RESET"
echo "================================================================"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT_DIR/data"
STORE_FILE="$DATA_DIR/portal-guest-store.json"

mkdir -p "$DATA_DIR"

# If store file exists, preserve only gateway & ad config while wiping all runtime records
node -e '
const fs = require("fs");
const path = require("path");
const storeFile = path.resolve(process.cwd(), "data/portal-guest-store.json");

let existing = {};
if (fs.existsSync(storeFile)) {
  try {
    existing = JSON.parse(fs.readFileSync(storeFile, "utf8"));
  } catch (e) {
    existing = {};
  }
}

const cleanState = {
  ...existing,
  guestEvents: [],
  transactions: [],
  vouchers: [],
  redeemedOttPins: [],
  issuedPayLesothoOttVouchers: [],
  routers: [],
  auditLogs: []
};

fs.writeFileSync(storeFile, JSON.stringify(cleanState, null, 2), "utf8");
console.log("[OK] Reset data/portal-guest-store.json to zero-state (0 transactions, 0 hotspots, 0 guest events, 0 redeemed OTT PINs).");
'

# Also notify running local server if reachable on port 3000
if command -v curl >/dev/null 2>&1; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/admin/reset-production || true)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[OK] Triggered live POST /api/admin/reset-production on port 3000."
  else
    echo "[INFO] Local server not active or returned HTTP $HTTP_CODE; disk store is already wiped."
  fi
fi

echo "================================================================"
echo "  PRODUCTION RESET COMPLETE — READY FOR DEPLOYMENT"
echo "================================================================"
