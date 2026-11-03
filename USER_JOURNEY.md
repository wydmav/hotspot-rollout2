# T-Connect Lesotho — End-to-End User Journey & PayLesotho / OTT Voucher Blueprint

This document specifies the complete user and administrative journey across the **T-Connect Starlink Hotspot Network** deployed throughout the Kingdom of Lesotho. It details the exact 5-step captive portal payment, OTT Voucher generation (`https://api.paylesotho.co.ls/api/ott/voucher/get`), Copy-then-Redeem verification, sponsor ad display, and automatic device connection flow.

---

## 1. Official 5-Step Captive Portal User Journey

1. **Step 1 — User Connects to the Wi-Fi**:
   - The user associates with the T-Connect Starlink Wi-Fi SSID on their phone or laptop.
   - Apple Captive Network Assistant (iOS CNA) or Android Captive Portal automatically opens the T-Connect captive portal (`http://10.10.0.1/login` -> `/portal`).

2. **Step 2 — Mandatory Guest Details Entry**:
   - Before any payment or voucher redemption can proceed, the user enters their mandatory details:
     - **First Name** & **Surname** (mandatory).
     - **Lesotho Mobile Number**: Strictly validated as **8 digits starting with `5` or `6`** (`+266 5xxxxxxx` for Vodacom or `+266 6xxxxxxx` for Econet).
     - **Email Address**: Validated format.
     - **Terms & Conditions**: Mandatory Sesotho legal checkbox (*"Amohela Liphelo Tsa Tšebetso"*).

3. **Step 3 — PayLesotho / XPayments Payment Prompt (M-Pesa, EcoCash, or Card)**:
   - The user selects a Wi-Fi package (e.g., Daily Pass `M10`, Weekly Pass `M60`, Monthly Pass `M280`) and is prompted for payment via **Vodacom M-Pesa** (`*111#`), **Econet EcoCash** (`*199#`), or **XPayments Card** through **PayLesotho** (`https://api.paylesotho.co.ls` / `https://xpayments.paylesotho.co.ls`).

4. **Step 4 — Denomination Verification & 16-Digit OTT Voucher Issuance**:
   - Only after PayLesotho verifies that the user has paid the **exact denomination** matching the selected package value (`INS-0` for M-Pesa, `200` for EcoCash, or `00` for XPayments), the backend calls `https://api.paylesotho.co.ls/api/ott/voucher/get` using the configured OTT API Key / Bearer Token to issue a **16-digit OTT Voucher PIN** for that exact denomination.
   - The 16-digit OTT Voucher PIN is displayed inside the captive portal.

5. **Step 5 — Copy OTT Voucher First -> Redeem in Captive Portal -> Sponsor Ad -> Automatic Device Resume**:
   - The user **must click "Step 1: Copy OTT Voucher PIN"** first to copy the 16-digit PIN to their clipboard.
   - Only after copying the OTT Voucher does **"Step 2: Redeem OTT Voucher & Connect"** unlock in the captive portal.
   - When redeemed, the backend strictly verifies that:
     1. The voucher is a genuine 16-digit OTT Voucher (zero internally generated `TC-XXXX` vouchers exist anywhere in the platform).
     2. The OTT Voucher denomination **strictly equals** the selected package price (`voucher.amount === selectedPlan.price`).
   - Upon successful redemption:
     - If **Sponsor Ads** are enabled for the hotspot scope, the full-screen sponsor ad carousel/video is displayed with **zero background text bleed**.
     - Immediately after the ad (or immediately upon redemption if ads are disabled), MikroTik RouterOS authorizes the device in the background and the captive portal **automatically closes/resumes to the user's device** with no *"You're online!"* screen.

---

## 2. PayLesotho Postman API Endpoints in Full Effect

Reference Documentation: `https://documenter.getpostman.com/view/22835775/2s9Y5ZwN7r`

| # | Postman Section | Upstream Endpoint | Method | Success Condition |
|---|---|---|---|---|
| 1 | **M-Pesa Payment (USSD Push)** (`#23c9c4c9-df20-4d62-977f-b8222a6c666a`) | `https://api.paylesotho.co.ls/api/v2/vcl/payment` | `POST` | `status_code === "INS-0"` |
| 2 | **M-Pesa Verify Transaction** (`#b05e5278-37ce-4726-a18f-4bbc4421d998`) | `https://api.paylesotho.co.ls/api/v1/vcl/verify/:mpesa_reference/:service_provider_code` | `GET` | `status_code === "INS-0"` |
| 3 | **EcoCash Payment (USSD Push)** (`#4f71df8d-c3f1-44ac-bdfa-65b3022d1fd0`) | `https://api.paylesotho.co.ls/api/v2/econet/payment` | `POST` | `status_code === "200"` |
| 4 | **EcoCash Verify Transaction** (`#7df2735e-ddf9-45ad-b49f-1f75f8d3aa7e`) | `https://api.paylesotho.co.ls/api/v2/econet/verify/:reference` | `GET` | `status_code === "200"` |
| 5 | **XPayments Card Initiate & Verify** (`#159537ea-2504-4fbd-9ccf-f4ebc3895fab`) | `https://xpayments.paylesotho.co.ls/api/v1/initiate-payment` & `/api/transactions/status` | `POST` | `statusCode === "00"` |
| 6 | **PayLesotho OTT Voucher Generation** | `https://api.paylesotho.co.ls/api/ott/voucher/get` | `POST` / `GET` | Issues 16-digit OTT Voucher PIN for paid denomination |
| 7 | **OTT Lesotho Voucher Remittance** | `https://api.ottlesotho.com/api/v1/RemitVoucher` | `POST` | HTTP `200`/`201` (`success: true`, exact denomination match) |

---

## 3. Configuring the OTT Bearer Token / API Key & PayLesotho Credentials

1. Open the Control Tower Dashboard -> **Payment Gateways** -> Select **PayLesotho Gateway Aggregator**.
2. Under **Step 1: Merchant Credentials**, enter or update:
   - **1. PAYLESOTHO API BASE URL**: `https://api.paylesotho.co.ls`
   - **2. XPAYMENTS CARD BASE URL**: `https://xpayments.paylesotho.co.ls`
   - **3. OTT VOUCHER GENERATE URL**: `https://api.paylesotho.co.ls/api/ott/voucher/get`
   - **4. PAYLESOTHO BEARER TOKEN**: Your `Authorization: Bearer <token>` for M-Pesa & EcoCash requests.
   - **5. OTT VOUCHER API KEY / BEARER TOKEN**: Paste the OTT API key or Bearer token for `https://api.paylesotho.co.ls/api/ott/voucher/get` once shared.
   - **6. M-PESA MERCHANT ID**: `service_provider_code` / `merchantid` for Vodacom M-Pesa.
   - **7. ECOCASH MERCHANT ID**: `merchantid` for Econet EcoCash.
   - **8. XPAYMENTS APP ID** & **9. XPAYMENTS CERT ID**: Credentials for XPayments Card checkout.
3. Click **Save PayLesotho & OTT Voucher Credentials**.

---

## 4. External Partner Integration Contract Rules

- **Base URL**:
  ```
  https://your-control-tower-domain.com/api/v1/partner/policies
  ```
- **Strictly Enforced Mandatory Fields**:
  - `fullName`: First Name and Surname required.
  - `phone`: Exactly 8 digits starting with `5` or `6` (e.g., `58123456`).
  - `email`: Valid RFC 5322 email string.
- **Hotspot Location Metadata**:
  - `district`: Official Lesotho district (Maseru, Berea, Leribe, Mafeteng, Mohale's Hoek, Quthing, Qacha's Nek, Mokhotlong, Thaba-Tseka, Butha-Buthe).
  - `hotspotName`: Internal hotspot name assigned by the T-Connect team.
  - `optInDateTime`: ISO-8601 timestamp of user opt-in.
- **Privacy Enforcement**:
  - `mac` (Device MAC Address) is **strictly stripped from all external partner responses** and visible only to the internal team.
