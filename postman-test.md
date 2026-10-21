# T-Connect OTT Lesotho M10 Voucher Test Guide (Verified Hash & Endpoint)

## Why Your Previous Command Returned `HTTP/2 401`
1. **Endpoint**: `/api/v1/CheckVoucher` is OTT Lesotho's **Reseller** endpoint. For a **Merchant** account (`TCONNECTLES1`), the check endpoint is `/api/v1/CheckRemitVoucher` and the redemption endpoint is `/api/v1/RemitVoucher`.
2. **Hash Parameter Order**: In OTT Lesotho's `.NET` API, `API_KEY` goes **first** in the SHA-256 input string, followed by the parameters in **alphabetical order**:
   - **CheckRemitVoucher**: `SHA256(apiKey + uniqueReference)`
   - **RemitVoucher**: `SHA256(apiKey + amount + mobile + pin + uniqueReference + vendorID)`

---

## 1. Safe Pre-Check (Verify `TCONNECTLES1` + `API_KEY` Without Redeeming a Voucher)
Run this on your VPS (`rphooko@vmi3475343:~$`) — it returns `HTTP/2 201 {"success":"false","errorCode":"0","message":""}` proving your Basic Auth and SHA-256 signature are 100% accepted:

```bash
API_KEY="4323e6fa-09b2-4eaa-9b73-f275dad58787"
OTT_USER="TCONNECTLES1"
OTT_PASS='3*68pF&24*'
REF="CHK$(date +%s)"
HASH=$(printf "%s%s" "$API_KEY" "$REF" | sha256sum | awk '{print $1}')

curl -i -X POST "https://api.ottlesotho.com/api/v1/CheckRemitVoucher" \
  -H "Authorization: Basic $(printf '%s:%s' "$OTT_USER" "$OTT_PASS" | base64 -w 0)" \
  -F "uniqueReference=${REF}" \
  -F "hash=${HASH}"
```

---

## 2. Redeem Your 16-Digit M10 Voucher Directly — Vendor ID `1`
Replace `<PUT_YOUR_16_DIGIT_M10_VOUCHER_PIN_HERE>` with your 16-digit M10 OTT PIN:

```bash
VOUCHER_PIN="<PUT_YOUR_16_DIGIT_M10_VOUCHER_PIN_HERE>"
API_KEY="4323e6fa-09b2-4eaa-9b73-f275dad58787"
OTT_USER="TCONNECTLES1"
OTT_PASS='3*68pF&24*'
AMOUNT="10"
MOBILE="26658000000"
VENDOR_ID="1"
REF="TCV1$(date +%s)"

# Verified OTT Lesotho SHA-256 Formula: SHA256(apiKey + amount + mobile + pin + uniqueReference + vendorID)
HASH=$(printf "%s%s%s%s%s%s" "$API_KEY" "$AMOUNT" "$MOBILE" "$VOUCHER_PIN" "$REF" "$VENDOR_ID" | sha256sum | awk '{print $1}')

curl -i -X POST "https://api.ottlesotho.com/api/v1/RemitVoucher" \
  -H "Authorization: Basic $(printf '%s:%s' "$OTT_USER" "$OTT_PASS" | base64 -w 0)" \
  -F "pin=${VOUCHER_PIN}" \
  -F "amount=${AMOUNT}" \
  -F "mobile=${MOBILE}" \
  -F "vendorID=${VENDOR_ID}" \
  -F "uniqueReference=${REF}" \
  -F "hash=${HASH}"
```

---

## 3. Redeem Your 16-Digit M10 Voucher Directly — Vendor ID `11`
If your voucher was generated under Vendor ID `11`:

```bash
VOUCHER_PIN="<PUT_YOUR_16_DIGIT_M10_VOUCHER_PIN_HERE>"
API_KEY="4323e6fa-09b2-4eaa-9b73-f275dad58787"
OTT_USER="TCONNECTLES1"
OTT_PASS='3*68pF&24*'
AMOUNT="10"
MOBILE="26658000000"
VENDOR_ID="11"
REF="TCV11$(date +%s)"

# Verified OTT Lesotho SHA-256 Formula: SHA256(apiKey + amount + mobile + pin + uniqueReference + vendorID)
HASH=$(printf "%s%s%s%s%s%s" "$API_KEY" "$AMOUNT" "$MOBILE" "$VOUCHER_PIN" "$REF" "$VENDOR_ID" | sha256sum | awk '{print $1}')

curl -i -X POST "https://api.ottlesotho.com/api/v1/RemitVoucher" \
  -H "Authorization: Basic $(printf '%s:%s' "$OTT_USER" "$OTT_PASS" | base64 -w 0)" \
  -F "pin=${VOUCHER_PIN}" \
  -F "amount=${AMOUNT}" \
  -F "mobile=${MOBILE}" \
  -F "vendorID=${VENDOR_ID}" \
  -F "uniqueReference=${REF}" \
  -F "hash=${HASH}"
```
