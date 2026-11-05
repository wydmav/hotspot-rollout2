# MISSING FROM PAYLESOTHO — FINAL PRODUCTION GO-LIVE CHECKLIST

The **T-Connect Cloud Controller & Captive Portal** has now been fully configured with the latest **PayLesotho** specifications provided:

### ✅ Already Configured & Active in T-Connect Codebase
1. **Merchant Name (`merchantname`):** Configured globally as **`T-Connect`** across all M-Pesa, EcoCash, and XPayments transactions for streamlined reconciliation.
2. **Official Merchant IDs:**
   - **Vodacom M-Pesa Merchant ID:** `62915`
   - **Econet EcoCash Merchant ID:** `63165430`
3. **OTT Voucher Issuance (`POST https://api.paylesotho.co.ls/api/ott/voucher/get`):**
   - Configured as `POST` with `Authorization: Bearer <token>` and `amount` in the JSON body (`{ "amount": "10", "unique_reference": "...", "merchantname": "T-Connect" }`).
4. **OTT Voucher Verification After Purchase (`POST https://api.paylesotho.co.ls/ott/voucher/check`):**
   - Configured as `POST https://api.paylesotho.co.ls/ott/voucher/check` with JSON payload:
     ```json
     {
       "unique_reference": "Reference used when purchasing the OTT voucher"
     }
     ```
5. **Gateway & Voucher Architecture:**
   - Standalone EcoCash gateway has been **removed** (all M-Pesa `62915`, EcoCash `63165430`, and Card payments route exclusively through **PayLesotho**).
   - Built-in platform vouchers have been **removed**; **16-Digit OTT Voucher (`XXXX-XXXX-XXXX-XXXX`)** is the **only** voucher used across the entire platform.

---

## Remaining Items Needed from PayLesotho for Live Production Cutover

### 1. Live Production Bearer Token (`Authorization: Bearer <LIVE_TOKEN>`)
- Please provide the **Production Bearer Token** authorized for Merchant **`T-Connect`** (`M-Pesa: 62915` / `EcoCash: 63165430`) to authenticate live calls to:
  - `POST https://api.paylesotho.co.ls/api/v2/vcl/payment` & `GET /api/v1/vcl/verify/{ref}/62915`
  - `POST https://api.paylesotho.co.ls/api/v2/econet/payment` & `GET /api/v2/econet/verify/{ref}`
  - `POST https://api.paylesotho.co.ls/api/ott/voucher/get`
  - `POST https://api.paylesotho.co.ls/ott/voucher/check`

### 2. XPayments Live Card Credentials (If Bank Cards Are Enabled at Launch)
- **Live `applicationId`** and **Live `certificateId`** for `POST https://xpayments.paylesotho.co.ls/api/v1/initiate-payment` and `POST https://xpayments.paylesotho.co.ls/api/transactions/status`.

### 3. Live OTT Voucher Redemption (`RemitVoucher`) Credentials
- When the subscriber copies their 16-digit OTT Voucher PIN after purchase and clicks **"Redeem OTT Voucher & Connect"** in the Captive Portal, confirm:
  - The live **OTT Vendor ID (`vendorID`)**, **Merchant ID (`merchantId`)**, and **API Key (`apiKey`)** for `POST https://api.ottvoucher.co.ls/api/v1/RemitVoucher` (or confirm if `POST https://api.paylesotho.co.ls/ott/voucher/check` also consumes/redeems externally bought OTT vouchers).

### 4. Production Webhook Registration & IP Whitelisting
- **Webhook URL:** Please register `https://<YOUR-PRODUCTION-DOMAIN>/api/gateways/paylesotho/webhook` on the **`T-Connect`** merchant profile (`62915` / `63165430`) and share the webhook signing secret (`webhookSecret`) if payloads are HMAC-signed.
- **Server IP Whitelisting:** Confirm if our production server IP (`169.58.98.92` or cloud static IP) needs to be whitelisted on `api.paylesotho.co.ls`.

---

### Where to Paste the Live Bearer Token Once Received
1. Open **T-Connect Control Tower** -> **Billing & Vouchers** -> **Payment Gateways (2)**.
2. In the **PayLesotho & XPayments Aggregator** card:
   - Verify **Merchant Name (`T-Connect`)**, **M-Pesa ID (`62915`)**, and **EcoCash ID (`63165430`)** are pre-filled.
   - Switch mode to **LIVE API** and paste the **Live Bearer Token**.
   - Click **Save & Sync PayLesotho**.
