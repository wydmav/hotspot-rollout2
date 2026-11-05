#!/usr/bin/env bash
set -euo pipefail

echo "================================================================"
echo "  T-CONNECT CLOUD CONTROLLER — PRODUCTION ZERO-STATE RESET"
echo "================================================================"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT_DIR/data"
STORE_FILE="$DATA_DIR/portal-guest-store.json"

mkdir -p "$DATA_DIR"

# If store file exists, preserve only the 2 active gateways (PayLesotho & 16-Digit OTT Voucher) & ad config while wiping all runtime records
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

const rawGateways = Array.isArray(existing.gateways) ? existing.gateways : [];
const filteredGateways = rawGateways
  .filter((g) => g.provider === "paylesotho" || g.provider === "ottvoucher")
  .map((g) => {
    if (g.provider === "paylesotho") {
      return {
        ...g,
        merchantName: g.merchantName || "T-Connect",
        username: g.username || "T-Connect",
        merchantId: g.merchantId || "62915",
        mpesaMerchantId: g.mpesaMerchantId || "62915",
        ecocashMerchantId: g.ecocashMerchantId || "63165430",
        ottVoucherEndpointUrl: g.ottVoucherEndpointUrl || "https://api.paylesotho.co.ls/api/ott/voucher/get",
        ottVoucherCheckUrl: g.ottVoucherCheckUrl || "https://api.paylesotho.co.ls/ott/voucher/check"
      };
    }
    return g;
  });

const cleanState = {
  ...existing,
  gateways: filteredGateways.length > 0 ? filteredGateways : [
    {
      provider: "paylesotho",
      isLive: false,
      isSandbox: true,
      merchantId: "62915",
      merchantName: "T-Connect",
      username: "T-Connect",
      apiKey: "",
      bearerToken: "",
      mpesaMerchantId: "62915",
      ecocashMerchantId: "63165430",
      xpaymentsAppId: "",
      xpaymentsCertId: "",
      endpointUrl: "https://api.paylesotho.co.ls",
      xpaymentsEndpointUrl: "https://xpayments.paylesotho.co.ls",
      ottVoucherEndpointUrl: "https://api.paylesotho.co.ls/api/ott/voucher/get",
      ottVoucherCheckUrl: "https://api.paylesotho.co.ls/ott/voucher/check",
      status: "unconfigured"
    },
    {
      provider: "ottvoucher",
      isLive: false,
      isSandbox: true,
      merchantId: "",
      username: "",
      password: "",
      apiKey: "",
      webhookSecret: "",
      endpointUrl: "https://api.ottvoucher.co.ls/api/v1/RemitVoucher",
      status: "unconfigured"
    }
  ],
  guestEvents: [],
  transactions: [],
  vouchers: [],
  redeemedOttPins: [],
  issuedPayLesothoOttVouchers: [],
  routers: [],
  auditLogs: []
};

fs.writeFileSync(storeFile, JSON.stringify(cleanState, null, 2), "utf8");
console.log("[OK] Reset data/portal-guest-store.json to zero-state (2 gateways: PayLesotho [M-Pesa 62915 / EcoCash 63165430 / T-Connect] & 16-Digit OTT Voucher; 0 transactions, 0 hotspots, 0 guest events).");
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
