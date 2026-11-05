#!/usr/bin/env bash
set -euo pipefail

echo "================================================================"
echo "  T-CONNECT CLOUD CONTROLLER — PRODUCTION ZERO-STATE RESET"
echo "================================================================"

WIPE_ROUTERS="false"
if [ "${1:-}" = "--wipe-routers" ]; then
  WIPE_ROUTERS="true"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT_DIR/data"
STORE_FILE="$DATA_DIR/portal-guest-store.json"

mkdir -p "$DATA_DIR"

# Preserve the 2 active gateways (PayLesotho & 16-Digit OTT Voucher), ad config, and added/adopted routers (unless --wipe-routers is passed)
WIPE_ROUTERS="$WIPE_ROUTERS" node -e '
const fs = require("fs");
const path = require("path");
const storeFile = path.resolve(process.cwd(), "data/portal-guest-store.json");
const wipeRouters = process.env.WIPE_ROUTERS === "true";

let existing = {};
if (fs.existsSync(storeFile)) {
  try {
    existing = JSON.parse(fs.readFileSync(storeFile, "utf8"));
  } catch (e) {
    existing = {};
  }
}

const defaultPlBearer = "$10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2";
const rawGateways = Array.isArray(existing.gateways) ? existing.gateways : [];
const filteredGateways = rawGateways
  .filter((g) => g.provider === "paylesotho" || g.provider === "ottvoucher")
  .map((g) => {
    if (g.provider === "paylesotho") {
      return {
        ...g,
        isLive: true,
        isSandbox: false,
        status: "operational",
        merchantName: "T-Connect",
        username: "T-Connect",
        merchantId: "62915",
        mpesaMerchantId: "62915",
        ecocashMerchantId: "63165430",
        apiKey: g.apiKey || g.bearerToken || defaultPlBearer,
        bearerToken: g.bearerToken || g.apiKey || defaultPlBearer,
        ottBearerToken: g.ottBearerToken || g.bearerToken || defaultPlBearer,
        endpointUrl: g.endpointUrl || "https://api.paylesotho.co.ls",
        xpaymentsEndpointUrl: g.xpaymentsEndpointUrl || "https://xpayments.paylesotho.co.ls",
        ottVoucherEndpointUrl: g.ottVoucherEndpointUrl || "https://api.paylesotho.co.ls/api/ott/voucher/get",
        ottVoucherCheckUrl: g.ottVoucherCheckUrl || "https://api.paylesotho.co.ls/ott/voucher/check"
      };
    }
    if (g.provider === "ottvoucher") {
      return {
        ...g,
        isLive: true,
        isSandbox: false,
        status: "operational",
        merchantId: g.merchantId || "TCONNECTLES1",
        username: g.username || "TCONNECTLES1",
        apiKey: g.apiKey || "4323e6fa-09b2-4eaa-9b73-f275dad58787",
        apiPassword: g.apiPassword || "3*68pF&24*",
        vendorId: g.vendorId || "1, 11",
        endpointUrl: "https://api.ottlesotho.com"
      };
    }
    return g;
  });

const preservedRouters = wipeRouters ? [] : (Array.isArray(existing.routers) ? existing.routers : []);

const cleanState = {
  ...existing,
  gateways: filteredGateways.length > 0 ? filteredGateways : [
    {
      provider: "paylesotho",
      isLive: true,
      isSandbox: false,
      merchantId: "62915",
      merchantName: "T-Connect",
      username: "T-Connect",
      apiKey: defaultPlBearer,
      bearerToken: defaultPlBearer,
      ottBearerToken: defaultPlBearer,
      mpesaMerchantId: "62915",
      ecocashMerchantId: "63165430",
      xpaymentsAppId: "",
      xpaymentsCertId: "",
      endpointUrl: "https://api.paylesotho.co.ls",
      xpaymentsEndpointUrl: "https://xpayments.paylesotho.co.ls",
      ottVoucherEndpointUrl: "https://api.paylesotho.co.ls/api/ott/voucher/get",
      ottVoucherCheckUrl: "https://api.paylesotho.co.ls/ott/voucher/check",
      status: "operational"
    },
    {
      provider: "ottvoucher",
      isLive: true,
      isSandbox: false,
      merchantId: "TCONNECTLES1",
      username: "TCONNECTLES1",
      apiPassword: "3*68pF&24*",
      apiKey: "4323e6fa-09b2-4eaa-9b73-f275dad58787",
      vendorId: "1, 11",
      webhookSecret: "",
      endpointUrl: "https://api.ottlesotho.com",
      status: "operational"
    }
  ],
  guestEvents: [],
  transactions: [],
  vouchers: [],
  redeemedOttPins: [],
  issuedPayLesothoOttVouchers: [],
  routers: preservedRouters,
  auditLogs: []
};

fs.writeFileSync(storeFile, JSON.stringify(cleanState, null, 2), "utf8");
console.log(`[OK] Reset data/portal-guest-store.json (0 test transactions, 0 guest events; ${preservedRouters.length} router(s) preserved).`);
'

# Also notify running local server if reachable on port 3000
if command -v curl >/dev/null 2>&1; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{\"wipeRouters\": $WIPE_ROUTERS}" http://localhost:3000/api/admin/reset-production || true)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[OK] Triggered live POST /api/admin/reset-production on port 3000."
  else
    echo "[INFO] Local server not active or returned HTTP $HTTP_CODE; disk store is already updated."
  fi
fi

echo "================================================================"
echo "  PRODUCTION RESET COMPLETE — READY FOR DEPLOYMENT"
echo "================================================================"
