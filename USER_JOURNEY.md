# T-Connect Lesotho — End-to-End User Journey & Control Tower Blueprint

This document specifies the complete user and administrative journey across the **T-Connect Starlink Hotspot Network** deployed throughout the Kingdom of Lesotho. It details how phones authenticate, pay, and automatically resume connectivity without friction, alongside how internal and external teams interact with the Control Tower.

---

## 1. System Architecture Overview

```
 [ Guest Phone / Device ]
   │  (iOS CNA / Android Captive Portal)
   ▼
 [ MikroTik RouterOS Gateway ]  (e.g., 10.10.0.1 / DNS Walled Garden)
   │  (Uplink: Starlink Low-Latency Satellite)
   ▼
 [ T-Connect Control Tower Backend ] (Origin: 169.58.98.92:3000)
   ├── Express REST API + Static Asset Engine
   ├── PayLesotho Gateway Aggregator (M-Pesa, EcoCash, Cards)
   ├── OTT Lesotho Direct API (api.ottlesotho.com — 16-digit verification)
   └── External Partner API (Isolated Policies & Leads with District)
```

---

## 2. End-User Captive Portal Journeys

### Journey 1: Free Wi-Fi Mode (Sponsored Ad & Instant Device Resume)
1. **Wi-Fi Association**: The user connects to the open SSID (e.g., `T-Connect_Cafe_FreeWiFi`).
2. **Captive Sheet Trigger**: Apple Captive Network Assistant (iOS CNA) or Android Captive Login automatically opens `http://10.10.0.1/login`, instantly routing to `/portal`.
3. **Guest Identification**:
   - First Name & Surname (mandatory).
   - Lesotho Mobile Number: strictly enforces **8 digits starting with 5 or 6** (`+266 5xxxxxxx` or `+266 6xxxxxxx`).
   - Email Address: verified format with auto-domain suggestions.
   - Terms & Conditions: mandatory Sesotho legal checkbox (*"Amohela Liphelo Tsa Tšebetso"*).
4. **Partner Sponsor Ad**:
   - High-definition partner slide/carousel loads with zero delay directly from local server storage (`/assets/aistudio/...`).
   - **No Background Text Bleed**: The underlying sign-up layout is unmounted while viewing the ad.
5. **Instant Device Resume**:
   - When the user taps **"✕"** on the ad:
     1. MikroTik RouterOS is authenticated in the background via hidden form/iframe beacon (`/login?username=T-TRIAL&password=123`).
     2. Active session is saved in `localStorage`.
     3. Captive mini-browser receives `window.close()` and redirects to destination (`https://www.google.com`), immediately dismissing the sheet so the user resumes to their device apps (WhatsApp, TikTok, browser) without any lingering *"You're online!"* blocker.

---

### Journey 2: 16-Digit OTT Voucher Redemption (Retail & Spaza PINs)
1. **Voucher Acquisition**: The user purchases an official 16-digit OTT Voucher at a local shop, retail partner, or online.
2. **Portal Entry**: Guest selects the **"Voucher"** tab or **"Buy Pass -> OTT Voucher"**.
3. **16-Digit PIN Validation**:
   - Input automatically formats the code into 4-digit readable clusters: `1234 5678 9012 3456`.
   - Real-time digit counter enforces all 16 numeric digits.
   - Platform rejects any legacy/mock vouchers (such as `TC-XXXX`), accepting **exclusively genuine 16-digit OTT Lesotho Vouchers**.
4. **Direct API Verification**:
   - The Control Tower makes a real-time call to `https://api.ottlesotho.com` using HTTP Basic Auth + SHA-256 digital signature.
   - Checks against the active redeemed PIN ledger to prevent double-spending.
5. **Automatic Connection**:
   - Once verified, the user is authorized on MikroTik and **automatically released to their device** to start browsing immediately.

---

### Journey 3: PayLesotho Payment Gateway Aggregator (M-Pesa, EcoCash & Cards)
1. **Plan Selection**: User selects their desired Starlink speed pass (e.g., Daily M10, Weekly M60, Monthly M280).
2. **Payment Method Selection**: User taps **"PayLesotho"** and chooses their payment channel:
   - **Vodacom M-Pesa** (`mpesa`): Prompts USSD `*111#` push to their Vodacom Lesotho number (`5xxxxxxx`).
   - **Econet EcoCash** (`ecocash`): Prompts USSD `*199#` push to their Econet Lesotho number (`6xxxxxxx`).
   - **Credit / Debit Card & Instant EFT** (`card`): Directs to 3D-Secure 256-bit encrypted checkout powered by PayLesotho Gateway.
3. **Automated Status Polling**:
   - Frontend polls `/api/gateways/paylesotho/status/:transactionId` every 1.5 seconds.
   - Instant webhook callback listener at `/api/gateways/paylesotho/webhook` marks the transaction completed upon receiving provider IPN.
4. **Immediate Device Release**:
   - As soon as the transaction is approved, the subscriber is authenticated on the router and **automatically resumes to their device**. No intermediate screens, no delay.

---

## 3. Control Tower Operator / Admin Experience

### Payment Gateway Hub
- Located at **Payment Gateways** tab in the Control Tower.
- Manages three primary channels:
  1. **PayLesotho Gateway Aggregator**: Full credentials (API Key, Merchant ID, Secret), channel selector (EcoCash, M-Pesa, Card), live ping latency test, and sandbox/production toggle.
  2. **OTT Voucher Lesotho**: Direct `api.ottlesotho.com` integration, live credentials verification, balance checks, and vendor ID routing (`1, 11`).
  3. **EcoCash Lesotho Direct**: Direct Cassava/Econet USSD push backup integration.

### 16-Digit OTT Voucher Live Inspector & Audit Ledger
- Replaces all legacy code generators.
- Allows operators to test any 16-digit PIN in real time against the OTT Lesotho production or test API.
- Live redemptions table records timestamp, plan, subscriber phone, price in Maloti (M), and receipt reference with one-click clipboard copying.

### Fleet Synchronization & Hardware Bridging
- Operators can click **"Sync OTT & 5-Port Bridge to All Routers"** to push:
  - Bridge configuration binding ports 1 through 5 to `bridgeLocal`.
  - Walled-garden entries allowing `api.ottlesotho.com`, `gateway.paylesotho.co.ls`, and Control Tower IP (`169.58.98.92`).
  - Latest compact Sesotho Terms & Conditions splash pages.

### Reset Leads Feature (Clean Slate for Sponsors)
- When a new sponsor or partner API key is issued, leads can be reset either globally or per-policy.
- Only leads captured **after** key issuance are delivered to external partners.
- Every command, API key, cURL snippet, and voucher has an instant **Copy to Clipboard** button with visual feedback.

---

## 4. External Partner Integration Contract Rules

For third-party insurance, retail, and corporate sponsors integrating with T-Connect:

- **Base URL**:
  ```
  https://your-control-tower-domain.com/api/v1/partner/policies
  ```
- **Strictly Enforced Mandatory Fields**:
  - `fullName`: First Name and Surname required.
  - `phone`: Exactly 8 digits starting with 5 or 6 (e.g., `58123456`).
  - `email`: Valid RFC 5322 email string.
- **Hotspot Location Metadata**:
  - Each partner's hotspot data returns:
    - `district`: One of the 10 official Lesotho districts (Maseru, Berea, Leribe, Mafeteng, Mohale's Hoek, Quthing, Qacha's Nek, Mokhotlong, Thaba-Tseka, Butha-Buthe).
    - `hotspotName`: Actual operational name assigned by internal team (e.g. *Alliance Maseru Central Hub*).
    - `optInDateTime`: ISO-8601 timestamp of user opt-in.
- **Privacy Enforcement**:
  - `mac` (Device MAC Address) is **strictly withheld from external partners** and visible only to the internal network engineering team.

---

## 5. API Verification Quick Reference

### Test PayLesotho Gateway
```bash
curl -X POST http://localhost:3000/api/gateways/paylesotho/test \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"pl_live_key"}'
```

### Initiate M-Pesa / EcoCash / Card Transaction
```bash
# Vodacom M-Pesa
curl -X POST http://localhost:3000/api/gateways/paylesotho/initiate \
  -H "Content-Type: application/json" \
  -d '{"amount":10,"channel":"mpesa","phoneNumber":"58123456","customerName":"Thabo Mokoena","customerEmail":"thabo@example.com"}'

# Econet EcoCash
curl -X POST http://localhost:3000/api/gateways/paylesotho/initiate \
  -H "Content-Type: application/json" \
  -d '{"amount":10,"channel":"ecocash","phoneNumber":"62123456","customerName":"Lerato Nko","customerEmail":"lerato@example.com"}'

# Bank Card / Instant EFT
curl -X POST http://localhost:3000/api/gateways/paylesotho/initiate \
  -H "Content-Type: application/json" \
  -d '{"amount":60,"channel":"card","customerName":"Palesa Moloi","customerEmail":"palesa@example.com"}'
```

### Test 16-Digit OTT Voucher Redemption
```bash
curl -X POST http://localhost:3000/api/vouchers/redeem \
  -H "Content-Type: application/json" \
  -d '{"code":"1234567890123456","phone":"58123456"}'
```

### Query External Partner Policies & Leads
```bash
curl -H "Authorization: Bearer <PARTNER_API_KEY>" \
  https://your-control-tower-domain.com/api/v1/partner/policies
```
