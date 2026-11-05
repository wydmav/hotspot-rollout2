# T-CONNECT CLOUD CONTROLLER & CAPTIVE PORTAL
## Executive User Journey & Content Creator Playbook (Management & Marketing Edition)

---

## 1. Executive Overview for Management
**T-Connect** is Lesotho's unified Wi-Fi monetization, sponsor engagement, and MikroTik fleet control platform. Every hotspot deployed across Lesotho's **10 districts** (Maseru, Berea, Leribe, Botha-Bothe, Mokhotlong, Thaba-Tseka, Qacha's Nek, Quthing, Mohale's Hoek, and Mafeteng) operates under a strict **5-Pillar Governance Model**:

1. **Vertical Scope:** Public Hotspots (`hotspot`), Connected Villages (`village`), Transit Buses (`bus`), Stadiums & Arenas (`stadium`), or Smart Parks (`park`).
2. **Partner / Sponsor Group:** Every hotspot is bound to an official Partner or Sponsor Group (e.g., *Vodacom Lesotho*, *Econet Telecom Lesotho*, *Standard Lesotho Bank*, *Maseru Mall*, or *T-Connect Core*).
3. **Hotspot Access Policy:** Defines the subscriber experience, speed tier, session timeout, and whether **Free Sponsored Access**, **16-Digit OTT Voucher Redemption**, or **PayLesotho Buy Pass** are active.
4. **Lesotho District:** Accurate district classification for executive telemetry and regional performance tracking.
5. **Venue & Physical Address:** Exact site location plotted dynamically on the **Lesotho Regional Fleet Map** only after the physical MikroTik router is adopted into the controller.

### Strictly 2 Payment Gateways & 100% 16-Digit OTT Voucher Architecture
- **No Built-In Platform Vouchers:** T-Connect does **not** generate or use proprietary internal voucher codes (`TC-...`). The **16-Digit OTT Voucher (`XXXX-XXXX-XXXX-XXXX`)** is the **only** voucher used across the entire platform and subscriber journey.
- **No Standalone EcoCash Gateway:** All Mobile Money and Card payments are consolidated into **PayLesotho** under the official merchant name **`T-Connect`**:
  1. **PayLesotho & XPayments Aggregator:** Handles **Vodacom M-Pesa (Merchant ID: `62915`)**, **Econet EcoCash (Merchant ID: `63165430`)**, and **XPayments 3D-Secure Bank Cards**, automatically generating and verifying 16-digit OTT Vouchers via PayLesotho's OTT APIs.
  2. **16-Digit OTT Voucher Redemption:** Validates and redeems the 16-digit OTT PIN (`XXXX-XXXX-XXXX-XXXX`) with strict 1:1 denomination matching.

---

## 2. The Official Subscriber User Journey (Step-by-Step)
> **For Content Creators & Marketing Teams:** Use this exact 5-step flow when filming TikTok/Reels tutorials, designing posters at taxi ranks/campuses/villages, or writing social media ad copy.

### Step 1: Connect to T-Connect Wi-Fi
- The subscriber opens their phone's Wi-Fi settings at any T-Connect venue (campus, mall, community council, bus, stadium, or park) and taps the **T-Connect Wi-Fi** network.
- Their phone automatically opens the branded **T-Connect Captive Portal** splash screen—no app download required.

### Step 2: Enter Subscriber Details
- Before unlocking Free Wi-Fi, redeeming an OTT Voucher, or buying a pass, the subscriber enters their:
  - **First Name & Surname**
  - **8-Digit Lesotho Mobile Number** (`+266 5XXXXXXX` for Vodacom or `+266 6XXXXXXX` for Econet)
  - **Email Address** & accepts the Terms of Service.
- *Why this matters for Management & Sponsors:* Every connection builds a verified, POPIA/GDPR-compliant first-party CRM database segmented by venue, district, and sponsor campaign.

### Step 3: Choose a Package & Pay via PayLesotho (`T-Connect`)
- The subscriber selects their desired Wi-Fi package denomination (e.g., **M5 Express Pass**, **M10 Daily Unlimited**, **M25 Weekly Pass**, or **M100 Monthly Pass**).
- Powered by **PayLesotho** (processing under Merchant Name **`T-Connect`**), the subscriber chooses how to pay right inside the portal:
  - **Vodacom M-Pesa (`+266 5...` — Merchant ID `62915`):** Instant USSD/STK Push prompt pops up on their phone showing **`T-Connect`** to enter their M-Pesa PIN.
  - **Econet EcoCash (`+266 6...` — Merchant ID `63165430`):** Instant `*199#` USSD Push prompt pops up on their phone showing **`T-Connect`** to authorize payment.
  - **PayLesotho XPayments Bank Card:** Secure 3D-Secure Visa / Mastercard checkout for local and international debit/credit cards.

### Step 4: Copy & Redeem the 16-Digit OTT Voucher PIN (Exact Denomination Match)
- **What happens immediately after payment:**
  - Once PayLesotho confirms the M-Pesa (`62915`), EcoCash (`63165430`), or Card payment for the exact package amount:
    1. T-Connect requests a 16-digit OTT Voucher via `POST https://api.paylesotho.co.ls/api/ott/voucher/get` with the Bearer Token and exact `amount` in the JSON body.
    2. T-Connect verifies the voucher purchase via `POST https://api.paylesotho.co.ls/ott/voucher/check` using `{ "unique_reference": "..." }`.
    3. The portal displays the official **16-Digit OTT Voucher PIN** (`XXXX-XXXX-XXXX-XXXX`) matching that exact package value.
- **Mandatory Copy-Then-Redeem Security Flow:**
  1. The subscriber taps **"1. Copy 16-Digit OTT PIN"** on their screen.
  2. Only after copying the PIN does the **"2. Paste & Go to Redeem"** button unlock.
  3. The subscriber taps **"Redeem OTT Voucher & Connect"**.
  4. The platform verifies that the **16-digit OTT Voucher value matches the selected Wi-Fi package price 1:1** (preventing underpayment or voucher reuse) and marks the PIN as consumed.
- *Already bought an OTT Voucher at a shop or vendor?* Subscribers who already hold a physical or digital 16-digit OTT Voucher of the right denomination can jump straight to the **16-Digit OTT Voucher** tab, paste their 16 digits, and redeem immediately.

### Step 5: Sponsor Visual Showcase & Automatic Internet Release
- **If a Sponsor Ad Campaign is Active:**
  - Right after authentication/redemption, a clean, full-screen **Sponsor Video or Multi-Image Visual Carousel** plays (with zero cluttered text overlays so creative artwork shines).
  - Once the brief countdown finishes, the subscriber taps the **`X`** button.
- **Instant, Frictionless Internet Access:**
  - There is **no** redundant *"You're Online!"* holding screen. The MikroTik router authorizes the subscriber's device in the background and **automatically releases them straight back to their device and internet apps** (WhatsApp, TikTok, YouTube, banking, or browser).

---

## 3. Marketing Angles & Hooks for Content Creators

### Angle A: "Pay Your Way in Seconds — M-Pesa, EcoCash, Card, or OTT Voucher"
- **Visual Hook:** Show a student or commuter connecting to T-Connect Wi-Fi, getting the **PayLesotho (`T-Connect`)** M-Pesa or EcoCash prompt on their phone, tapping **Copy 16-Digit OTT PIN**, hitting **Redeem**, and immediately streaming or messaging.
- **Key Talking Point:** *"Whether you use Vodacom M-Pesa, Econet EcoCash, your bank card, or an OTT Voucher, T-Connect gets you online in under 30 seconds through PayLesotho."*

### Angle B: "Copy. Paste. Connected." (Educating Users on the 16-Digit OTT Voucher Step)
- **Visual Hook:** Close-up screen recording of the green **PayLesotho OTT Voucher Issued** card inside the captive portal.
- **3-Beat Script for Reels / TikTok:**
  1. *"Pick your T-Connect Wi-Fi bundle and approve your PayLesotho M-Pesa or EcoCash prompt."*
  2. *"Tap **Copy 16-Digit OTT PIN** right on the screen."*
  3. *"Tap **Paste & Redeem**—and boom, you're straight back to your apps with high-speed Wi-Fi!"*

### Angle C: "B2B Sponsor & Brand Partner Pitch" (For Commercial & Ad Sales Teams)
- **Value Proposition for Advertisers:**
  - **100% Guaranteed Viewability:** Every Wi-Fi user watches your full-screen video or multi-slide visual story before entering the internet.
  - **Hyper-Local Targeting:** Target specific Lesotho districts, university campuses, taxi ranks, buses, or rural villages.
  - **Verified Lead Capture:** Every impression is backed by a real subscriber profile (Name, `+266` Mobile Number, Venue, and Timestamp) visible in the Control Tower.

---

## 4. Management Control Tower Capabilities (At a Glance)
- **Zero-Clutter Dynamic Lesotho Map:** Hotspots appear on the regional map **only after** your engineering team provisions a router with its Scope, Partner/Group, Policy, District, and Venue.
- **Full Developer Transaction Inspector:** Every PayLesotho (M-Pesa `62915`, EcoCash `63165430`, XPayments Card) and 16-Digit OTT Voucher transaction is logged with its **full unmasked 16-digit OTT Voucher PIN** (`XXXX-XXXX-XXXX-XXXX`), customer phone number, venue, and complete raw JSON request/response payload for instant customer support and financial reconciliation.
- **One-Click Production Reset:** Before going live or handing over a clean environment, run `npm run reset-production` (or click **Production Reset** on the Regional Fleet Map) to wipe all test transactions, test guest sessions, and test routers while keeping your gateway configurations intact.
