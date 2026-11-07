#!/usr/bin/env bash
# ==============================================================================
# T-Connect Platform — Root Manual Data Reset Script (reset-platform-data.sh)
# ==============================================================================
# Wipes manually added platform data (captured guest leads, custom partner/sponsor
# groups, partner API keys, transactions, vouchers, and optionally routers)
# while STRICTLY PRESERVING Payment Gateways (PayLesotho & OTT Voucher Lesotho).
#
# Usage:
#   ./reset-platform-data.sh --keep-routers      (Default: keeps adopted routers & payment gateways)
#   ./reset-platform-data.sh --wipe-all-manual   (Wipes routers, leads, partners, transactions, vouchers; keeps payment gateways)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODE="keep-routers"
for arg in "$@"; do
  case "$arg" in
    --wipe-all-manual|--wipe-routers)
      MODE="wipe-all-manual"
      ;;
    --keep-routers)
      MODE="keep-routers"
      ;;
    -h|--help)
      echo "Usage: ./reset-platform-data.sh [--keep-routers | --wipe-all-manual]"
      echo "  --keep-routers     Wipes leads, custom partner groups, partner API keys, transactions & vouchers (keeps routers & payment gateways)"
      echo "  --wipe-all-manual  Wipes routers, leads, custom partner groups, partner API keys, transactions & vouchers (keeps payment gateways)"
      exit 0
      ;;
  esac
done

echo "=================================================================="
echo "🧹 T-Connect Platform Reset (Mode: ${MODE})"
echo "🔒 Payment Gateways (PayLesotho & OTT Lesotho) will be PRESERVED."
echo "=================================================================="

WIPE_ROUTERS_BOOL="false"
if [ "$MODE" = "wipe-all-manual" ]; then
  WIPE_ROUTERS_BOOL="true"
fi

# ------------------------------------------------------------------------------
# STEP 1: API-First Reset (via running Node / Docker container on port 3000)
# The running server process owns data/server-store.json inside the container
# and resets both in-memory state and disk state atomically.
# ------------------------------------------------------------------------------
API_RESET_OK="false"
if command -v curl >/dev/null 2>&1; then
  HTTP_RESP="$(curl -sS -X POST "http://127.0.0.1:${PORT:-3000}/api/admin/reset-production" \
    -H "Content-Type: application/json" \
    -d "{\"wipeRouters\": ${WIPE_ROUTERS_BOOL}, \"wipeLeads\": true, \"wipePartners\": true}" 2>/dev/null || true)"
  if echo "$HTTP_RESP" | grep -q '"success":true'; then
    API_RESET_OK="true"
    echo "✅ Live server API (127.0.0.1:${PORT:-3000}) reset in-memory & disk state."
  fi
fi

# ------------------------------------------------------------------------------
# STEP 2: Fix Docker root-owned data/ permissions & synchronize disk store
# When Docker Compose runs as root, data/server-store.json may be owned by root:root.
# Automatically restore ownership to current user (e.g. wydmav) before writing.
# ------------------------------------------------------------------------------
mkdir -p data 2>/dev/null || sudo mkdir -p data

if [ ! -w "data" ] || { [ -f "data/server-store.json" ] && [ ! -w "data/server-store.json" ]; }; then
  echo "🔧 Fixing Docker root-owned permissions on ./data for user $(whoami)..."
  if command -v sudo >/dev/null 2>&1; then
    sudo chown -R "$(id -u):$(id -g)" data 2>/dev/null || true
    sudo chmod -R u+rwX data 2>/dev/null || true
  fi
fi

export RESET_MODE="$MODE"

NODE_CMD=(node)
if [ -f "data/server-store.json" ] && [ ! -w "data/server-store.json" ] && command -v sudo >/dev/null 2>&1; then
  NODE_CMD=(sudo -E node)
fi

"${NODE_CMD[@]}" -e '
const fs = require("fs");
const path = require("path");
try { require("dotenv").config(); } catch (e) {}

const mode = process.env.RESET_MODE || "keep-routers";
const wipeRouters = mode === "wipe-all-manual";
const storeFile = path.join(process.cwd(), "data", "server-store.json");

let current = {};
if (fs.existsSync(storeFile)) {
  try {
    current = JSON.parse(fs.readFileSync(storeFile, "utf-8"));
  } catch (e) {
    current = {};
  }
}

const defaultGateways = [
  {
    provider: "paylesotho",
    name: "PayLesotho & XPayments Aggregator",
    subtitle: "Merchant: T-Connect · M-Pesa (62915), EcoCash (63165430), XPayments & OTT Voucher Issuance (api.paylesotho.co.ls)",
    currency: "M",
    isLive: true,
    isSandbox: false,
    status: "operational",
    apiKey: "",
    apiSecret: "",
    apiPassword: "",
    username: process.env.PAYLESOTHO_MERCHANT_NAME || "T-Connect",
    merchantName: process.env.PAYLESOTHO_MERCHANT_NAME || "T-Connect",
    vendorId: process.env.PAYLESOTHO_MPESA_MERCHANT_ID || "62915",
    endpointUrl: process.env.PAYLESOTHO_ENDPOINT_URL || "https://api.paylesotho.co.ls",
    xpaymentsEndpointUrl: process.env.PAYLESOTHO_XPAYMENTS_ENDPOINT_URL || "https://xpayments.paylesotho.co.ls",
    ottVoucherEndpointUrl: "https://api.paylesotho.co.ls/api/ott/voucher/get",
    ottVoucherCheckUrl: "https://api.paylesotho.co.ls/ott/voucher/check",
    bearerToken: process.env.PAYLESOTHO_BEARER_TOKEN || "",
    ottBearerToken: process.env.PAYLESOTHO_OTT_BEARER_TOKEN || process.env.PAYLESOTHO_BEARER_TOKEN || "",
    merchantId: process.env.PAYLESOTHO_MPESA_MERCHANT_ID || "62915",
    mpesaMerchantId: process.env.PAYLESOTHO_MPESA_MERCHANT_ID || "62915",
    ecocashMerchantId: process.env.PAYLESOTHO_ECOCASH_MERCHANT_ID || "63165430",
    xpaymentsAppId: "",
    xpaymentsCertId: "",
    webhookSecret: "whsec_paylesotho_tconnect_2026",
    webhookUrl: "http://169.58.98.92:3000/api/gateways/paylesotho/webhook",
    successRate24h: 99.8,
    avgLatencyMs: 240,
    testPassedOnce: true
  },
  {
    provider: "ottvoucher",
    name: "OTT Voucher Lesotho",
    subtitle: "16-Digit PIN & Retail Voucher Redemption (api.ottlesotho.com)",
    currency: "M",
    isLive: true,
    isSandbox: false,
    status: "operational",
    username: process.env.OTTVOUCHER_MERCHANT_ID || "TCONNECTLES1",
    apiPassword: process.env.OTTVOUCHER_API_PASSWORD || "",
    apiKey: process.env.OTTVOUCHER_API_KEY || "",
    apiSecret: "",
    vendorId: process.env.OTTVOUCHER_VENDOR_ID || "1, 11",
    endpointUrl: "https://api.ottlesotho.com",
    bearerToken: "",
    merchantId: process.env.OTTVOUCHER_MERCHANT_ID || "TCONNECTLES1",
    webhookSecret: "",
    webhookUrl: "http://169.58.98.92:3000/api/webhooks/ottvoucher",
    successRate24h: 100,
    avgLatencyMs: 320,
    testPassedOnce: true
  }
];

const preservedGateways = Array.isArray(current.gateways) && current.gateways.length > 0
  ? current.gateways
  : defaultGateways;

const defaultPartnerGroups = [
  "Alliance Insurance Lesotho",
  "Vodacom Lesotho Foundation",
  "Econet Telecom Lesotho",
  "Standard Lesotho Bank",
  "Maluti Mountain Brewery",
  "First National Bank Lesotho",
  "Metropolitan Lesotho",
  "LNDC Lesotho",
  "T-Connect Internal Fleet",
  "Lab / Test (MIKROTIK-TC)",
  "Quarantine (Holding Group)"
];

const cleanStore = {
  gateways: preservedGateways,
  vouchers: [],
  transactions: [],
  guestEvents: [],
  redeemedOttPins: [],
  issuedPayLesothoOttVouchers: [],
  partnerGroups: defaultPartnerGroups,
  partnerApiKeys: [],
  routers: wipeRouters ? [] : (Array.isArray(current.routers) ? current.routers : []),
  supabaseConfig: current.supabaseConfig || undefined,
  updatedAt: new Date().toISOString()
};

fs.writeFileSync(storeFile, JSON.stringify(cleanStore, null, 2), "utf-8");
console.log("✅ data/server-store.json reset completed.");
console.log("   • Payment Gateways preserved:", cleanStore.gateways.map(g => g.provider).join(", "));
console.log("   • Adopted Routers preserved:", cleanStore.routers.length);
console.log("   • Leads, Transactions, Vouchers & Custom Partner Groups wiped to 0.");
'

# Re-notify the live server if it started or was running so in-memory matches disk
if [ "$API_RESET_OK" = "false" ] && command -v curl >/dev/null 2>&1; then
  curl -sS -X POST "http://127.0.0.1:${PORT:-3000}/api/admin/reset-production" \
    -H "Content-Type: application/json" \
    -d "{\"wipeRouters\": ${WIPE_ROUTERS_BOOL}, \"wipeLeads\": true, \"wipePartners\": true}" >/dev/null 2>&1 || true
fi

echo "=================================================================="
echo "✅ Platform manual data reset complete!"
echo "=================================================================="
