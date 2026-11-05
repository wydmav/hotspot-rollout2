# PAYLESOTHO INTEGRATION STATUS — LIVE PRODUCTION CONFIGURATION

The **T-Connect Cloud Controller & Captive Portal** is now **100% configured and active** with all official **PayLesotho** credentials, endpoints, and 16-digit OTT Voucher flows:

### ✅ Configured & Active in T-Connect Production Codebase
1. **Live Production Authorization Header (`Authorization: Bearer ...`):**
   - Configured globally across all PayLesotho and OTT Voucher endpoints:
     ```
     Authorization: Bearer $10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2
     ```
2. **Merchant Name (`merchantname`):**
   - Configured globally as **`T-Connect`** across all M-Pesa, EcoCash, XPayments, and OTT Voucher requests for reconciliation.
3. **Official Merchant IDs:**
   - **Vodacom M-Pesa Merchant ID:** `62915` (`POST https://api.paylesotho.co.ls/api/v2/vcl/payment` & `GET https://api.paylesotho.co.ls/api/v1/vcl/verify/{ref}/62915`)
   - **Econet EcoCash Merchant ID:** `63165430` (`POST https://api.paylesotho.co.ls/api/v2/econet/payment` & `GET https://api.paylesotho.co.ls/api/v2/econet/verify/{ref}`)
4. **OTT Voucher Issuance After Payment (`POST https://api.paylesotho.co.ls/api/ott/voucher/get`):**
   - Configured as `POST` with `Authorization: Bearer $10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2` and `amount` in the JSON body (`{ "amount": "10", "unique_reference": "...", "merchantname": "T-Connect" }`).
5. **OTT Voucher Verification After Purchase (`POST https://api.paylesotho.co.ls/ott/voucher/check`):**
   - Configured as `POST https://api.paylesotho.co.ls/ott/voucher/check` with `Authorization: Bearer $10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2` and JSON payload:
     ```json
     {
       "unique_reference": "Reference used when purchasing the OTT voucher"
     }
     ```
6. **Paid Hotspot Subscriber Flow (Copy -> Redeem 16-Digit OTT Voucher):**
   - Subscribers select a Wi-Fi package (e.g., Daily M10, Weekly M60, Monthly M280) and pay via **PayLesotho** (M-Pesa `62915` or EcoCash `63165430` under Merchant `T-Connect`) or enter an existing **16-Digit OTT Voucher (`XXXX-XXXX-XXXX-XXXX`)**.
   - Upon payment confirmation, a 16-digit OTT Voucher matching the exact package denomination is issued and displayed.
   - Subscribers click **1. Copy OTT Voucher PIN** first, then click **2. Redeem OTT Voucher & Connect** (enforcing strict 1:1 denomination matching) to unlock high-speed internet.

---

## Optional Future Enhancements from PayLesotho (Non-Blocking for Mobile Money & OTT Hotspots)
1. **XPayments Card Credentials (Only if Bank Cards are enabled alongside M-Pesa/EcoCash):**
   - Live `applicationId` and `certificateId` for `https://xpayments.paylesotho.co.ls/api/v1/initiate-payment`.
2. **Webhook URL Registration (Optional Push Callback):**
   - `https://<YOUR-PRODUCTION-DOMAIN>/api/gateways/paylesotho/webhook` (the platform already polls `/api/v1/vcl/verify/{ref}/62915`, `/api/v2/econet/verify/{ref}`, and `/ott/voucher/check` automatically in real time).
