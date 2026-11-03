# MISSING FROM PAYLESOTHO — PRODUCTION GO-LIVE CHECKLIST

To push the **T-Connect Cloud Controller & Captive Portal** payment and OTT Voucher workflow into live production with **PayLesotho**, the following credentials, API specifications, and merchant parameters must be supplied by the **PayLesotho Technical & Commercial Integration Team**.

---

## 1. Live Authentication & API Security Credentials
Currently, the platform is wired to the official PayLesotho endpoints (`https://api.paylesotho.co.ls` and `https://xpayments.paylesotho.co.ls`), using the documentation sandbox token as a fallback when no production key is provided.

**What PayLesotho Must Provide:**
1. **Production Bearer Token (`Authorization: Bearer <LIVE_API_KEY>`)**
   - Required for authenticating live `POST` and `GET` calls to:
     - `https://api.paylesotho.co.ls/api/v1/Sales/post_make_payment_request/`
     - `https://api.paylesotho.co.ls/api/v1/Sales/get_verify_transaction/`
     - `https://xpayments.paylesotho.co.ls/api/v1/pay`
     - `https://xpayments.paylesotho.co.ls/api/v1/verify`
2. **Webhook Signing Secret (`webhookSecret` / HMAC Key)**
   - If PayLesotho signs asynchronous callback payloads sent to our webhook (`POST /api/gateways/paylesotho/webhook`), we need the production signing secret and header name (e.g., `X-PayLesotho-Signature`) to enforce cryptographic verification.

---

## 2. OTT Voucher Issuance Endpoint Specification (`/api/ott/voucher/get`)
The user journey requires that **every successful M-Pesa, EcoCash, or Bank Card payment automatically issues an official 16-digit OTT Voucher PIN** matching the exact package denomination, which the subscriber then copies and redeems inside the Captive Portal.

The URL `https://api.paylesotho.co.ls/api/ott/voucher/get` was shared, but its exact request/response schema is not yet documented in the public Postman collection.

**What PayLesotho Must Provide for `https://api.paylesotho.co.ls/api/ott/voucher/get`:**
1. **HTTP Method:** Confirm whether the endpoint expects `POST` or `GET`.
2. **Authentication Header:** Confirm whether it uses the same PayLesotho `Authorization: Bearer <token>` header or a dedicated OTT Vendor Bearer Token / API Key.
3. **Request Payload / Query Parameters:**
   - What is the exact field name for the voucher value/denomination? (e.g., `amount`, `value`, `denomination`: `"10.00"`)
   - What is the field name for linking the payment reference? (e.g., `reference`, `transaction_id`, `merchant_reference`)
   - Are any vendor/terminal identifiers required? (e.g., `vendor_id`, `merchant_id`, `currency: "LSL"`)
4. **Exact JSON Response Structure:**
   - Which JSON key holds the generated 16-digit OTT PIN? (e.g., `data.pin`, `voucher_pin`, `pin_code`, `serial_number`)
   - What status code or boolean flag indicates a successful live voucher generation?
5. **OTT Voucher Redemption / Consumption Endpoint:**
   - Confirm the live PayLesotho or OTT Vendor endpoint used to mark a 16-digit OTT PIN as **redeemed/consumed** when the subscriber clicks **"Redeem OTT Voucher & Connect"** in the portal, so a PIN purchased externally (or via PayLesotho) is validated and burned upstream in real time.
   - Confirm whether the response returns the voucher's face value (`amount` / `denomination` in LSL/ZAR) so our strict **Exact Denomination Match** check (`Voucher Value === Selected Package Price`) can validate externally purchased OTT vouchers.

---

## 3. Mobile Money Merchant Identifiers (M-Pesa & EcoCash)
For USSD/STK Push collections via `https://api.paylesotho.co.ls/api/v1/Sales/post_make_payment_request/`:

**What PayLesotho Must Provide:**
1. **Vodacom M-Pesa Merchant ID (`mpesaMerchantId` / `merchantid`):**
   - Production Merchant ID assigned to T-Connect (replacing the Postman sandbox value `222`).
2. **Econet EcoCash Merchant ID (`ecocashMerchantId` / `merchantid`):**
   - Production Merchant ID assigned to T-Connect for EcoCash Lesotho `*199#` USSD Push collections.
3. **`serviceProviderCode` (if applicable for direct Vodacom OpenAPI fallback):**
   - Production Shortcode / Service Provider Code (replacing sandbox `00000`).

---

## 4. XPayments Card Checkout Credentials (Visa / Mastercard 3D-Secure)
For bank card payments processed via `https://xpayments.paylesotho.co.ls/api/v1/pay` and `/verify`:

**What PayLesotho Must Provide:**
1. **Live `applicationId`** (replacing sandbox `"79"`).
2. **Live `certificateId`** (replacing sandbox `"85"`).
3. **Merchant Reference Prefix / Format Requirements** (`merchantReference`).
4. **3D-Secure Redirect / Return URL Handshake:**
   - Does `https://xpayments.paylesotho.co.ls/api/v1/pay` return a 3D-Secure challenge URL (`redirectUrl` / `acsUrl`) for live customer cards, or does it complete inline and notify via `/api/v1/verify`?

---

## 5. Network, Callback & Settlement Configuration
1. **Production Webhook Callback Registration:**
   - Please register our production webhook endpoint on the PayLesotho merchant profile:
     `https://<YOUR-PRODUCTION-DOMAIN>/api/gateways/paylesotho/webhook`
   - Provide a sample JSON payload of the asynchronous webhook POST sent by PayLesotho upon M-Pesa/EcoCash PIN completion.
2. **Server IP Whitelisting:**
   - Confirm whether PayLesotho requires whitelisting our production server IP address (e.g., `169.58.98.92` or cloud production static IP) for outbound calls to `api.paylesotho.co.ls` and `xpayments.paylesotho.co.ls`.
3. **Supported Voucher Denominations:**
   - Confirm whether `/api/ott/voucher/get` supports arbitrary package amounts (e.g., `M2.00`, `M5.00`, `M10.00`, `M25.00`, `M50.00`, `M150.00`) or only fixed preset OTT denominations, so Management can align Wi-Fi package prices 1:1 with allowed OTT voucher values.

---

### Where to Enter These Credentials Once Received
No code changes are needed to enter credentials once PayLesotho supplies them:
1. Open **T-Connect Control Tower** -> **Billing & Vouchers** -> **Payment Gateways (4)**.
2. In the **PayLesotho Unified Gateway** card and **16-Digit OTT Voucher** card:
   - Toggle Environment from `SANDBOX` to `LIVE`.
   - Paste the **Bearer Token (`apiKey`)**, **M-Pesa Merchant ID**, **EcoCash Merchant ID**, **XPayments Application ID**, and **Certificate ID**.
   - Click **Save Gateway Config**.
