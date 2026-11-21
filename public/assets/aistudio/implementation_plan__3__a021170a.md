# Implementation Plan: Free Mode Step 2 T-Connect Voucher (`TC-XXXX-XXXX`) Flow & x300 Printable / Cuttable Voucher Sheet Exporter

## Overview
We are upgrading **Free Mode** on the T-Connect Captive Portal so that after a guest enters their contact details on **Step 1 (Lead Capture)**, **Step 2 always requires a T-Connect Voucher (`TC-XXXX-XXXX`)** before authenticating the device on the MikroTik router with **uncapped speed** (Starlink throughput + hardware FastTrack + PCQ fair queuing). We are also adding a **1-Click x300 Printable & Cuttable T-Connect Voucher Sheet Generator & Exporter** in **Billing & Vouchers → Plans & Vouchers**, designed with the T-Connect logo and cutlines so clubhouse receptionists or bar staff can print, cut, and hand out vouchers effortlessly.

---

## 1. Free Mode Step 1 (Lead Capture) → Step 2 (T-Connect Voucher `TC-XXXX-XXXX` Entry & Uncapped Auth)
- **Step 1 (Unchanged & Zero Disruption)**:
  - Guest connects to Wi-Fi, captive portal pops up automatically (preserving DHCP Option 114 and iOS CNA `Success` -> `Done` handshake).
  - Guest enters **First Name**, **Surname**, **8-Digit Lesotho Phone (`+266`)**, optional **Email Address**, accepts Terms & Conditions, and taps **`Continue →`**.
  - The lead is immediately captured and saved to the Guest Leads CRM & Partner API ledger under Free Mode.
- **Step 2 (Mandatory T-Connect Voucher `TC-XXXX-XXXX` over Full-Screen Wallpaper)**:
  - Instead of an unverified 1-tap free button, Step 2 displays a glassmorphism voucher card over the full-screen background wallpaper:
    - Shows a personalized greeting (`"Welcome, [First Name]!"`).
    - Features an auto-formatting **`TC-XXXX-XXXX` Voucher Code input** (automatically formats uppercase alphanumeric characters with dashes as the guest types).
    - Tapping **`Verify Voucher & Connect →`** calls `POST /api/vouchers/redeem-tconnect` with the voucher code, guest MAC address, router identity, and Step 1 lead details.
  - **Uncapped Router Authentication**:
    - Once verified, the splash page submits the MikroTik `#freeForm` (`T-TRIAL`) session with **no per-user speed cap** (24-hour session validity, uncapped Starlink speed), triggering the exact same working authentication and iOS CNA completion flow.
  - Applied consistently across:
    1. **On-Router Compiled `hotspot/login.html`** (`compileRouterSplashHtml` in `server.ts`)
    2. **Standalone Cloud Captive Portal** (`src/components/views/StandalonePortalView.tsx`)
    3. **Captive Portal Builder Live Preview** (`src/components/views/ScopeCaptivePortalBuilder.tsx`)

---

## 2. Multi-Device (Up to 3 Devices), 24-Hour Validity, Uncapped T-Connect Voucher Engine
- **Server-Side Voucher Batch & Multi-Device Redemption (`server.ts` & `src/services/storage.ts`)**:
  - **`POST /api/vouchers/generate-batch`**:
    - Generates a batch of **`300`** (or custom count) unique `TC-XXXX-XXXX` vouchers in a single request.
    - Each voucher is configured with:
      - `deviceLimit: 3` (up to 3 concurrent devices per voucher)
      - `durationSeconds: 86400` (24 Hours validity from first redemption)
      - `speedLimit: 'Uncapped'` (Free Mode uncapped Starlink speed)
      - `associatedDevices: []` (tracks up to 3 distinct MAC addresses)
    - Persists immediately to `serverStore.vouchers` (`/app/data/server-portal-store.json`) and syncs to Supabase (`vouchers` table) and browser storage.
  - **`POST /api/vouchers/redeem-tconnect`** (and integrated into `POST /api/vouchers/redeem`):
    - Validates the `TC-XXXX-XXXX` code (case-insensitive, accepts with or without dashes).
    - Checks 24-hour expiration window (`expiresAt` is set to `firstUsedAt + 24h` on the first device activation).
    - Enforces the **3-device limit**:
      - If the guest's MAC address is already in `associatedDevices`, re-authenticates immediately (allowing seamless reconnects within the 24h window).
      - If the guest's MAC address is new and `associatedDevices.length < 3`, adds the MAC address and authorizes the connection.
      - If 3 distinct devices have already used the voucher, returns a clear message: `"This voucher has reached its 3-device limit."`
    - Updates the guest's Step 1 Free Mode lead in `serverStore.guestEvents` with the redeemed `voucherCode` (`TC-XXXX-XXXX`) for full auditability in Guest Leads CRM.

---

## 3. Aesthetic Printable & Cuttable x300 T-Connect Voucher Sheet Exporter (with T-Connect Logo)
- **Billing & Vouchers → Plans & Vouchers (`src/components/views/PlansVouchersView.tsx` & `src/services/exportService.ts`)**:
  - Add a prominent **"Generate & Print x300 Free Mode Vouchers (Clubhouse / Reception)"** action bar and modal:
    - **1-Click x300 Batch Generation**: Generates 300 fresh `TC-XXXX-XXXX` vouchers (24h · Up to 3 Devices · Uncapped Speed) and syncs them directly to the server so they work immediately on live routers.
    - **Aesthetic Cuttable Voucher Grid (15 Cards per A4 Page × 20 Pages = 300 Vouchers, or 12 Cards per Page)**:
      - Each voucher card features:
        - **Authentic T-Connect Brand Header**: T-Connect Orange (`#FF5500`) & Deep Navy (`#0B192C`) logo lockup with Wi-Fi signal emblem + site/venue badge (e.g., `"CLUBHOUSE FREE WI-FI VOUCHER"`).
        - **High-Contrast Monospace Voucher Code**: Large, easy-to-read `TC-XXXX-XXXX` code box in `JetBrains Mono`.
        - **Specs Pill**: `"24 HOURS · UP TO 3 DEVICES · UNCAPPED"`
        - **2-Step Guest Instructions**: `"1. Connect to Wi-Fi & enter Name & Phone  2. Enter Voucher Code to connect"`
        - **Serial Number (`#001` – `#300`) & Scissor Dashed Cut Lines (`✂`)** around every card for fast guillotine or scissor cutting.
    - **Three Export / Print Options (Zero Popup Blocker Issues)**:
      1. **In-App Print Preview & Direct Print Button** (uses an embedded print frame so it works reliably inside the browser without `window.open` popup blocks).
      2. **Download Vector Cuttable PDF (`tconnect_300_vouchers_cuttable.pdf`)** via `jsPDF` with vector T-Connect logos, dashed cut lines, and 300 formatted voucher cards across 20 A4 pages (3 columns × 5 rows per page).
      3. **Download Standalone Printable HTML Sheet (`tconnect_300_vouchers_printable.html`)** for offline printing at any print shop.

---

## 4. Safe One-Click Splash Sync for Live Adopted Routers
- Clicking **"One-Click Sync Splash (Safe)"** in **Captive Portal Builder** pushes only the updated `hotspot/login.html` with the Step 2 `TC-XXXX-XXXX` voucher prompt to the adopted router (e.g., Maseru Golf Course Clubhouse) without touching WireGuard, DHCP Option 114, or active sessions.
