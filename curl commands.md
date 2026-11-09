# T-Connect VPS Payment Gateway & OTT Voucher `curl` Test Commands

Use these commands directly from your Linux VPS terminal (`169.58.98.92`) to test every payment gateway channel (**PayLesotho M-Pesa**, **PayLesotho EcoCash**, **PayLesotho Bank / Card via XPayments**, **PayLesotho OTT Voucher Issuance**, and **OTT Lesotho 16-Digit Voucher Redemption**) both **via the T-Connect VPS Controller** and **directly against the upstream APIs**.

---

## 0. Set Environment Variables in Your VPS Terminal (Run Once Per Session)

```bash
# Your local or public T-Connect VPS URL
export VPS_URL="http://127.0.0.1:3000"

# PayLesotho Bearer Token (from PayLesotho Merchant Portal)
export PAYLESOTHO_BEARER="YOUR_PAYLESOTHO_BEARER_TOKEN"

# PayLesotho Official T-Connect Merchant IDs
export MPESA_MERCHANT_ID="62915"
export ECOCASH_MERCHANT_ID="63165430"
export MERCHANT_NAME="T-Connect"

# XPayments (Bank / Card) Application & Certificate IDs (if testing direct upstream card checkout)
export XPAY_APP_ID="YOUR_XPAYMENTS_APP_ID"
export XPAY_CERT_ID="YOUR_XPAYMENTS_CERT_ID"

# OTT Lesotho Direct API Credentials (from https://portal.ottlesotho.com/APISettings)
export OTT_USER="TCONNECTLES1"
export OTT_API_KEY="YOUR_OTT_API_KEY"
export OTT_API_PASSWORD="YOUR_OTT_API_PASSWORD"
export OTT_VENDOR_ID="11"
```

---

## PART 1: Test via T-Connect VPS Controller (`http://127.0.0.1:3000`)

These endpoints run the full T-Connect payment workflow:
**Initiate Payment (M-Pesa / EcoCash / Bank Card) $\rightarrow$ Verify Payment $\rightarrow$ Issue 16-Digit OTT Voucher $\rightarrow$ Copy & Redeem OTT Voucher**.

### 1.1 Check Configured Gateways & Health on VPS
```bash
curl -s "${VPS_URL}/api/gateways" | jq .
```

### 1.2 Run PayLesotho 4-Stage Diagnostic Test (M-Pesa + EcoCash + OTT Get + OTT Check)
```bash
curl -s -X POST "${VPS_URL}/api/gateways/paylesotho/test" \
  -H "Content-Type: application/json" \
  -d "{
    \"bearerToken\": \"${PAYLESOTHO_BEARER}\",
    \"ottBearerToken\": \"${PAYLESOTHO_BEARER}\",
    \"merchantName\": \"T-Connect\",
    \"mpesaMerchantId\": \"62915\",
    \"ecocashMerchantId\": \"63165430\",
    \"endpointUrl\": \"https://api.paylesotho.co.ls\",
    \"xpaymentsEndpointUrl\": \"https://xpayments.paylesotho.co.ls\",
    \"ottVoucherEndpointUrl\": \"https://api.paylesotho.co.ls/api/ott/voucher/get\"
  }" | jq .
```

---

### 1.3 PayLesotho Channel 1: Vodacom M-Pesa $\rightarrow$ Get 16-Digit OTT Voucher

#### Step A: Initiate M-Pesa USSD Push (`5xxxxxxx` 8-digit Lesotho number)
```bash
curl -s -X POST "${VPS_URL}/api/gateways/paylesotho/initiate" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "mpesa",
    "phoneNumber": "58123456",
    "amount": 10,
    "planId": "hs_1d",
    "planName": "Daily Pass",
    "durationSeconds": 86400,
    "guestName": "Thabo Mokoena",
    "guestEmail": "thabo@tconnect.co.ls",
    "scope": "hotspot"
  }' | jq .
```

#### Step B: Poll Status & Retrieve the Issued 16-Digit OTT Voucher PIN
*(Replace `tx_pl_XXXXXXXXXXXXX` with the `transactionId` returned in Step A)*
```bash
curl -s "${VPS_URL}/api/gateways/paylesotho/status/tx_pl_XXXXXXXXXXXXX" | jq .
```

---

### 1.4 PayLesotho Channel 2: Econet EcoCash $\rightarrow$ Get 16-Digit OTT Voucher

#### Step A: Initiate EcoCash USSD Push (`6xxxxxxx` 8-digit Lesotho number)
```bash
curl -s -X POST "${VPS_URL}/api/gateways/paylesotho/initiate" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "ecocash",
    "phoneNumber": "62123456",
    "amount": 10,
    "planId": "hs_1d",
    "planName": "Daily Pass",
    "durationSeconds": 86400,
    "guestName": "Lerato Ntsane",
    "guestEmail": "lerato@tconnect.co.ls",
    "scope": "hotspot"
  }' | jq .
```

#### Step B: Poll Status & Retrieve the Issued 16-Digit OTT Voucher PIN
*(Replace `tx_pl_XXXXXXXXXXXXX` with the `transactionId` returned in Step A)*
```bash
curl -s "${VPS_URL}/api/gateways/paylesotho/status/tx_pl_XXXXXXXXXXXXX" | jq .
```

---

### 1.5 PayLesotho Channel 3: Bank / Card (XPayments) $\rightarrow$ Get 16-Digit OTT Voucher

#### Step A: Initiate Bank / Card Checkout Session
```bash
curl -s -X POST "${VPS_URL}/api/gateways/paylesotho/initiate" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "card",
    "amount": 60,
    "planId": "hs_7d",
    "planName": "Weekly Pass",
    "durationSeconds": 604800,
    "guestName": "Khotso Letsie",
    "guestEmail": "khotso@tconnect.co.ls",
    "scope": "hotspot"
  }' | jq .
```

#### Step B: Simulate / Trigger Bank Card Approval Webhook (or Poll Status) to Issue OTT Voucher
*(Replace `XPAY-XXXXXXXXXXXXX` with the `reference` or `transactionId` returned in Step A)*
```bash
# Option 1: Trigger IPN Webhook approval immediately
curl -s -X POST "${VPS_URL}/api/gateways/paylesotho/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "XPAY-XXXXXXXXXXXXX",
    "status": "APPROVED",
    "status_code": "200"
  }' | jq .

# Option 2: Fetch status and get the issued 16-digit ottVoucherPin
curl -s "${VPS_URL}/api/gateways/paylesotho/status/XPAY-XXXXXXXXXXXXX" | jq .
```

---

### 1.6 Directly Generate & Check a PayLesotho 16-Digit OTT Voucher on VPS

#### Generate 16-Digit OTT Voucher (`POST /api/gateways/paylesotho/ott-voucher/get`)
```bash
curl -s -X POST "${VPS_URL}/api/gateways/paylesotho/ott-voucher/get" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "mobileNumber": "58123456",
    "planId": "hs_1d",
    "planName": "Daily Pass",
    "durationSeconds": 86400
  }' | jq .
```

#### Verify OTT Voucher by Payment Reference (`POST /api/gateways/paylesotho/ott-voucher/check`)
*(Replace `PayRefMP123456` with the `paymentRef` returned above)*
```bash
curl -s -X POST "${VPS_URL}/api/gateways/paylesotho/ott-voucher/check" \
  -H "Content-Type: application/json" \
  -d '{
    "unique_reference": "PayRefMP123456"
  }' | jq .
```

---

### 1.7 Copy & Redeem the 16-Digit OTT Voucher PIN (Unlocks Wi-Fi Session)

#### Step 1: Mark Issued 16-Digit OTT Voucher PIN as Copied
*(Replace `4829103847561928` with your 16-digit `ottVoucherPin` / `voucherPin`)*
```bash
curl -s -X POST "${VPS_URL}/api/gateways/paylesotho/ott-voucher/mark-copied" \
  -H "Content-Type: application/json" \
  -d '{
    "voucherPin": "4829103847561928"
  }' | jq .
```

#### Step 2: Redeem the 16-Digit OTT Voucher PIN on the Captive Portal
```bash
curl -s -X POST "${VPS_URL}/api/vouchers/redeem" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "4829103847561928",
    "expectedAmount": 10,
    "planId": "hs_1d",
    "planName": "Daily Pass",
    "requireCopiedFirst": true,
    "firstName": "Thabo",
    "lastName": "Mokoena",
    "countryCode": "+266",
    "phone": "58123456",
    "guestEmail": "thabo@tconnect.co.ls",
    "mac": "AA:BB:CC:11:22:33",
    "ip": "10.10.0.254",
    "scope": "hotspot"
  }' | jq .
```

---

### 1.8 One-Liner End-to-End Automated Test (PayLesotho $\rightarrow$ Get OTT PIN $\rightarrow$ Copy $\rightarrow$ Redeem)

Copy and paste this block into your VPS terminal to test the entire lifecycle in one go:

```bash
# Change CHANNEL to "mpesa", "ecocash", or "card"
CHANNEL="mpesa"
PHONE="58123456"
AMOUNT=10

echo "1) Initiating PayLesotho ${CHANNEL} payment for M${AMOUNT}..."
INIT_JSON=$(curl -s -X POST "${VPS_URL}/api/gateways/paylesotho/initiate" \
  -H "Content-Type: application/json" \
  -d "{\"channel\":\"${CHANNEL}\",\"phoneNumber\":\"${PHONE}\",\"amount\":${AMOUNT},\"planName\":\"Daily Pass\",\"scope\":\"hotspot\"}")
echo "${INIT_JSON}" | jq .

TX_ID=$(echo "${INIT_JSON}" | jq -r '.transactionId')
echo "2) Waiting 4s for payment verification & OTT voucher generation (TX_ID=${TX_ID})..."
sleep 4

STATUS_JSON=$(curl -s "${VPS_URL}/api/gateways/paylesotho/status/${TX_ID}")
echo "${STATUS_JSON}" | jq .

OTT_PIN=$(echo "${STATUS_JSON}" | jq -r '.ottVoucherPin')
echo "3) Issued 16-Digit OTT Voucher PIN: ${OTT_PIN}"

echo "4) Marking OTT Voucher PIN as copied..."
curl -s -X POST "${VPS_URL}/api/gateways/paylesotho/ott-voucher/mark-copied" \
  -H "Content-Type: application/json" \
  -d "{\"voucherPin\":\"${OTT_PIN}\"}" | jq .

echo "5) Redeeming 16-Digit OTT Voucher PIN..."
curl -s -X POST "${VPS_URL}/api/vouchers/redeem" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"${OTT_PIN}\",\"expectedAmount\":${AMOUNT},\"planName\":\"Daily Pass\",\"requireCopiedFirst\":true,\"phone\":\"${PHONE}\",\"scope\":\"hotspot\"}" | jq .
```

---

## PART 2: Direct Upstream PayLesotho & OTT Lesotho API `curl` Commands (Bypassing App)

Use these commands on the VPS to test connectivity and credentials **directly** against PayLesotho (`api.paylesotho.co.ls` / `xpayments.paylesotho.co.ls`) and OTT Lesotho (`api.ottlesotho.com`).

### 2.1 Direct PayLesotho Vodacom M-Pesa Payment (`POST /api/v2/vcl/payment`)
```bash
curl -i -X POST "https://api.paylesotho.co.ls/api/v2/vcl/payment" \
  -H "Authorization: Bearer ${PAYLESOTHO_BEARER}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"merchantid\": \"${MPESA_MERCHANT_ID}\",
    \"amount\": \"10\",
    \"mobileNumber\": \"58123456\",
    \"merchantname\": \"${MERCHANT_NAME}\",
    \"clientReference\": \"TConnect-MPesa-Test-$(date +%s)\"
  }"
```

### 2.2 Direct PayLesotho Vodacom M-Pesa Verify (`GET /api/v1/vcl/verify/:reference/:merchantId`)
*(Replace `MPESA_REF_HERE` with the `reference` returned from `2.1`)*
```bash
curl -i -X GET "https://api.paylesotho.co.ls/api/v1/vcl/verify/MPESA_REF_HERE/${MPESA_MERCHANT_ID}" \
  -H "Authorization: Bearer ${PAYLESOTHO_BEARER}" \
  -H "Accept: application/json"
```

---

### 2.3 Direct PayLesotho Econet EcoCash Payment (`POST /api/v2/econet/payment`)
```bash
curl -i -X POST "https://api.paylesotho.co.ls/api/v2/econet/payment" \
  -H "Authorization: Bearer ${PAYLESOTHO_BEARER}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"amount\": \"10\",
    \"mobileNumber\": \"62123456\",
    \"merchantid\": \"${ECOCASH_MERCHANT_ID}\",
    \"merchantname\": \"${MERCHANT_NAME}\",
    \"client_reference\": \"TConnect-EcoCash-Test-$(date +%s)\"
  }"
```

### 2.4 Direct PayLesotho Econet EcoCash Verify (`GET /api/v2/econet/verify/:reference`)
*(Replace `ECOCASH_REF_HERE` with the `reference` returned from `2.3`)*
```bash
curl -i -X GET "https://api.paylesotho.co.ls/api/v2/econet/verify/ECOCASH_REF_HERE" \
  -H "Authorization: Bearer ${PAYLESOTHO_BEARER}" \
  -H "Accept: application/json"
```

---

### 2.5 Direct PayLesotho Bank / Card Checkout via XPayments (`POST /api/v1/initiate-payment`)
```bash
REF="XPAY-$(date +%s)"
curl -i -X POST "https://xpayments.paylesotho.co.ls/api/v1/initiate-payment" \
  -H "Authorization: Bearer ${PAYLESOTHO_BEARER}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"transactionId\": \"tx_${REF}\",
    \"applicationId\": \"${XPAY_APP_ID}\",
    \"certificateId\": \"${XPAY_CERT_ID}\",
    \"amount\": 10,
    \"merchantRef\": \"${REF}\",
    \"successUrl\": \"http://169.58.98.92:3000/portal?payment=success&ref=${REF}\",
    \"failedUrl\": \"http://169.58.98.92:3000/portal?payment=failed&ref=${REF}\",
    \"callbackUrl\": \"https://api.paylesotho.co.ls/api/payment-callback\"
  }"
```

### 2.6 Direct PayLesotho Bank / Card Verify Status (`POST /api/transactions/status`)
```bash
curl -i -X POST "https://xpayments.paylesotho.co.ls/api/transactions/status" \
  -H "Authorization: Bearer ${PAYLESOTHO_BEARER}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"lookup_type\": \"merchant_reference\",
    \"lookup_value\": \"${REF}\",
    \"certificate_id\": \"${XPAY_CERT_ID}\",
    \"application_id\": \"${XPAY_APP_ID}\"
  }"
```

---

### 2.7 Direct PayLesotho Generate 16-Digit OTT Voucher (`POST /api/ott/voucher/get`)
```bash
OTT_REF="PayRefMP$(date +%s)"
curl -i -X POST "https://api.paylesotho.co.ls/api/ott/voucher/get" \
  -H "Authorization: Bearer ${PAYLESOTHO_BEARER}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"amount\": 10,
    \"value\": 10,
    \"unique_reference\": \"${OTT_REF}\",
    \"reference\": \"${OTT_REF}\",
    \"merchantname\": \"T-Connect\",
    \"mobileNumber\": \"58123456\"
  }"
```

### 2.8 Direct PayLesotho Check Issued OTT Voucher (`POST /ott/voucher/check`)
```bash
curl -i -X POST "https://api.paylesotho.co.ls/ott/voucher/check" \
  -H "Authorization: Bearer ${PAYLESOTHO_BEARER}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"unique_reference\": \"${OTT_REF}\"
  }"
```

---

### 2.9 Direct OTT Lesotho API Auth & SHA-256 Diagnostic (`POST https://api.ottlesotho.com/api/v1/CheckRemitVoucher`)
*(Tests your `TCONNECTLES1` Basic Auth + SHA-256 API Key without consuming a voucher)*
```bash
UNIQUE_REF="CHK$(date +%s)"
HASH=$(printf "%s" "${OTT_API_KEY}${UNIQUE_REF}" | sha256sum | awk '{print $1}')

curl -i -X POST "https://api.ottlesotho.com/api/v1/CheckRemitVoucher" \
  -u "${OTT_USER}:${OTT_API_PASSWORD}" \
  -F "uniqueReference=${UNIQUE_REF}" \
  -F "hash=${HASH}"
```

### 2.10 Direct OTT Lesotho 16-Digit PIN Redemption (`POST https://api.ottlesotho.com/api/v1/RemitVoucher`)
*(Computes official `SHA256(apiKey + amount + mobile + pin + uniqueReference + vendorID)` signature)*
```bash
PIN_16_DIGITS="1234567890123456"
AMOUNT="10"
MOBILE="26658123456"
UNIQUE_REF="TC$(date +%s)"
HASH=$(printf "%s" "${OTT_API_KEY}${AMOUNT}${MOBILE}${PIN_16_DIGITS}${UNIQUE_REF}${OTT_VENDOR_ID}" | sha256sum | awk '{print $1}')

curl -i -X POST "https://api.ottlesotho.com/api/v1/RemitVoucher" \
  -u "${OTT_USER}:${OTT_API_PASSWORD}" \
  -H "Accept: application/json" \
  -F "pin=${PIN_16_DIGITS}" \
  -F "amount=${AMOUNT}" \
  -F "mobile=${MOBILE}" \
  -F "vendorID=${OTT_VENDOR_ID}" \
  -F "uniqueReference=${UNIQUE_REF}" \
  -F "hash=${HASH}"
```
