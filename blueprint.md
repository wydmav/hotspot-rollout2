# T-Connect Multi-Router Wi-Fi Monetization Platform — Exhaustive Technical & Commercial Master Blueprint (`blueprint.md`)

**Document Classification**: Principal Architecture, Systems Engineering & Commercial Monetization Specification  
**Platform**: T-Connect Control Tower (Lesotho National Starlink LEO + Metro Fiber Wi-Fi Network)  
**Target Hardware & OS**: MikroTik RouterOS v7 Fleet (Native WireGuard Overlay + FreeRADIUS AAA/CoA + Dynamic `.rsc` Policy Sync)  
**Production Origin**: `http://169.58.98.92:3000` / `https://app.tconnect.co.ls` (Contabo Cloud VPS · Ubuntu LTS · Docker Compose)  
**Payment Settlement**: PayLesotho Aggregator (Merchant Name: `T-Connect` · Vodacom M-Pesa `62915` · Econet EcoCash `63165430`) & 16-Digit OTT Lesotho Voucher (`XXXX-XXXX-XXXX-XXXX`)

---

## Table of Contents

1. [Executive Summary & Non-Negotiable Platform Invariants](#1-executive-summary--non-negotiable-platform-invariants)
2. [Commercial Model, Unit Economics & Revenue Architecture](#2-commercial-model-unit-economics--revenue-architecture)
3. [Phase 0: Discovery, First-Principles Architecture & ADR Trade-Offs](#3-phase-0-discovery-first-principles-architecture--adr-trade-offs)
4. [Phase 1: Foundations, Persistence Architecture & Complete SQL/JSON Schema](#4-phase-1-foundations-persistence-architecture--complete-sqljson-schema)
5. [Phase 2: Deterministic Policy Engine, RBAC, Admin Scopes & Partner API Isolation](#5-phase-2-deterministic-policy-engine-rbac-admin-scopes--partner-api-isolation)
6. [Phase 3: Router Adoption, RouterOS v7 WireGuard Provisioning & True 60s `WG Swarm` Watchdog](#6-phase-3-router-adoption-routeros-v7-wireguard-provisioning--true-60s-wg-swarm-watchdog)
7. [Phase 4: Captive Portal Splash Page, RFC 8910 CNA Engine & End-to-End Guest State Machine](#7-phase-4-captive-portal-splash-page-rfc-8910-cna-engine--end-to-end-guest-state-machine)
8. [Phase 5: Payments Layer — Live PayLesotho API, 16-Digit OTT Issuance & Strict 1:1 Redemption](#8-phase-5-payments-layer--live-paylesotho-api-16-digit-ott-issuance--strict-11-redemption)
9. [Phase 6: Self-Hosted Sponsor Ad Engine, Walled-Garden Media Proxy & 3h/2GB Re-Triggering](#9-phase-6-self-hosted-sponsor-ad-engine-walled-garden-media-proxy--3h2gb-re-triggering)
10. [Phase 7: Admin Control Tower — Complete Feature & Option Breakdown](#10-phase-7-admin-control-tower--complete-feature--option-breakdown)
11. [Phase 8: Security Hardening, Threat Model, Failure-Mode Matrix & Test Suite](#11-phase-8-security-hardening-threat-model-failure-mode-matrix--test-suite)
12. [Phase 9: Production Deployment, Zero-Data-Loss Git Workflow & 30-Minute Runbook](#12-phase-9-production-deployment-zero-data-loss-git-workflow--30-minute-runbook)
13. [Phase 10: Senior Developer Optimization Pass (Performance, Reliability, Cost & Conversion)](#13-phase-10-senior-developer-optimization-pass-performance-reliability-cost--conversion)
14. [Phase-by-Phase Sign-Off Checklist & Definition of Done](#14-phase-by-phase-sign-off-checklist--definition-of-done)

---

## 1. Executive Summary & Non-Negotiable Platform Invariants

T-Connect is a multi-tenant, multi-router Wi-Fi monetization, sponsor advertising, and lead-generation platform built for high-density public venues, rural villages, municipal parks, transit buses, and stadiums across all 10 districts of Lesotho.

### 1.1 Hard Platform Rules (Instruction Precedence Audit)
Every engineer working on this codebase must enforce these five invariants without exception:

1. **Strictly Two Payment Gateways (`paylesotho` & `ottvoucher`)**:
   - **PayLesotho & XPayments Aggregator (`paylesotho`)**: Processes Vodacom M-Pesa (Merchant ID: `62915`), Econet EcoCash (Merchant ID: `63165430`), and XPayments Card transactions under the explicit merchant name **`T-Connect`**, authenticated with live Bearer token:
     `Authorization: Bearer $10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2`
   - **16-Digit OTT Voucher (`ottvoucher`)**: Handles retail and digital 16-digit OTT PINs (`XXXX-XXXX-XXXX-XXXX`).
   - **Zero Legacy Gateways or Internal Vouchers**: Standalone EcoCash gateways and internal platform-generated alphanumeric vouchers (`TC-...`, `PAID-...`) are permanently banned and stripped at boot time.
2. **Mandatory Copy $\rightarrow$ Redeem Paid Hotspot Flow with 1:1 Price Matching**:
   - When a guest pays via M-Pesa or EcoCash through PayLesotho, the backend verifies settlement and calls `POST https://api.paylesotho.co.ls/api/ott/voucher/get` (and verifies via `POST https://api.paylesotho.co.ls/ott/voucher/check`) to issue a 16-digit OTT Voucher PIN for that exact Lotis (`M`) amount.
   - The guest sees their 16-digit OTT PIN on the splash screen, taps **Copy PIN & Proceed to Redeem**, and redeems it against their chosen Wi-Fi package.
   - The redemption endpoint (`POST /api/vouchers/redeem-ott`) enforces **strict 1:1 denomination matching** (`Number(voucher.amount) === Number(selectedPlan.price)`). An `M5` OTT voucher cannot unlock an `M10`, `M60`, or `M280` package, nor can an `M60` voucher be accidentally burned on an `M10` package.
3. **True `WG Swarm` & Router Online Status (`60s` Real Heartbeat Timeout)**:
   - A router is marked `online` (and counted in the sidebar `WG Swarm X/Y UP` badge and Fleet Overview map) **if and only if** the physical MikroTik RouterOS v7 device has executed `/adopt.rsc` or transmitted a live heartbeat (`/api/devices/:routerId/heartbeat` or `/api/devices/:routerId/heartbeat.rsc`) within the last **60 seconds** (`REAL_HEARTBEAT_TIMEOUT_MS = 60_000`, corresponding to 3–4 missed 15-second heartbeat cycles).
   - Adding a router in the Admin UI places it in `pending_adoption` (`WG Swarm: 0/1 UP`). If an adopted router loses power or Starlink backhaul for $>60\text{s}$, the watchdog transitions it to `offline` (`WG Swarm: 0/1 UP`) and automatically restores it to `online` (`1/1 UP`) on the next valid heartbeat.
4. **Zero-CDN Walled-Garden Captive Portal**:
   - Captive Network Assistant (CNA) mini-browsers on iOS, Android, and Windows run in restricted sandboxed contexts before internet authorization. All CSS, icons, background wallpapers, sponsor carousel images, and MP4/WebM videos are served directly from the controller origin (`169.58.98.92:3000`) via `/api/portal/media-proxy` with local disk caching (`/app/data/media-cache/`).
5. **Mandatory Lead Opt-In & Official Sesotho Terms**:
   - Guest connections capture validated subscriber identity (`fullName`, Lesotho `phone`, `email`, client `mac`, `ip`, `siteName`, `scope`, ISO timestamp), require acceptance of the official 6-point Sesotho Terms & Conditions (*Amohela Liphelo Tsa Tšebetso*), and dispatch real-time HMAC-signed webhooks to scoped corporate sponsors.

---

## 2. Commercial Model, Unit Economics & Revenue Architecture

T-Connect operates a **tri-stream monetization engine** across 5 vertical scopes (`hotspot`, `community`/`village`, `park`, `bus`, `stadium`):

### 2.1 Stream 1: Direct Subscriber Wi-Fi Packages (B2C Paid Mode)

| Package ID | Package Name | Price (`LSL`) | Duration | Speed Quota (DL/UL) | Device Limit | Target Segment & Margin Profile |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `hs_3h` | **Express 3-Hour Pass** | **M5.00** | 3 Hours (`180m`) | `15 Mbps / 5 Mbps` | 1 Device | Commuters, students, quick transit/market visits; high impulse conversion |
| `hs_1d` | **Daily Pass** | **M10.00** | 24 Hours (`1440m`) | `20 Mbps / 10 Mbps` | 1 Device | Daily retail shoppers, cafe guests, village day-users |
| `hs_7d` | **Weekly Pass (Popular)** | **M60.00** | 7 Days (`10080m`) | `25 Mbps / 10 Mbps` | 2 Devices | Remote workers, market vendors, university students |
| `hs_30d` | **Monthly Pass** | **M280.00** | 30 Days (`43200m`) | `35 Mbps / 15 Mbps` | 3 Devices | Households, SMEs, recurring residential/commercial subscribers |

* **Payment Settlement Flow**:
  * Subscriber pays `M5 / M10 / M60 / M280` via **Vodacom M-Pesa (`62915`)**, **Econet EcoCash (`63165430`)**, or **Retail 16-Digit OTT Voucher**.
  * PayLesotho settles under merchant **`T-Connect`**, issues a 16-digit OTT Voucher PIN via `https://api.paylesotho.co.ls/api/ott/voucher/get`, and T-Connect redeems the voucher immediately upon subscriber confirmation.

### 2.2 Stream 2: Corporate Sponsor Ad Campaigns & Lead Generation (B2B Free/Hybrid Mode)
* **Sponsored Free Wi-Fi (`COMPLETELY_FREE` & `FREE_TRIAL_AND_PAID`)**:
  * Corporate partners (e.g., *Alliance Insurance Lesotho*, banks, beverage brands, retail chains, NGOs) sponsor free Wi-Fi sessions at targeted scopes or router groups.
  * **Pre-Auth Ad Gate**: Guests complete the lead capture form (`Full Name`, `Phone`, `Email`) and view a 3-slide interactive **Sponsor Image Carousel** or **Full-Screen Video Ad** before internet unlock.
  * **In-Session Recurring Ad Re-Trigger**: Every **3 hours** of elapsed session time or **2 GB** of data consumed, the subscriber is redirected back to the sponsor showcase (`/api/portal/video-ad.html?reason=periodic_retrigger`) to watch the next sponsor message before continuing.
  * **Real-Time Verified Lead Delivery**: Captured leads are pushed immediately via HMAC-SHA256 webhook (`X-TConnect-Signature`) to the sponsor's CRM or queried via scoped Partner API Keys (`GET /api/v1/partner/leads` with `X-API-Key: tc_live_...`).

### 2.3 Stream 3: Venue & Municipal Revenue Share (B2B2C Tenant Groups)
* Each router belongs to a **Tenant Group** (`tenantGroupId`) and **Partner Organization** (`partnerName`).
* Revenue, active sessions, OTT redemptions, and ad impressions are segmented per router, per district, per vertical scope, and per partner organization—enabling automated monthly revenue-share statements via CSV/PDF export.

### 2.4 Infrastructure Unit Economics (1 to 250 Routers)
* **Control Plane Fixed Cost**: ~$7–$15/month on a single Contabo VPS (4 vCPU, 8 GB RAM, NVMe) + $0 Let's Encrypt TLS via Caddy.
* **Backhaul Cost per Site**: Starlink Business / Standard LEO terminal or Metro Fiber link shared across 50–250 concurrent users per site via MikroTik `Simple Queues` / `PCQ` rate limiting.
* **Break-Even per Site**: Fewer than 4 Monthly Passes (`M280`) or 110 Daily Passes (`M10`) per month covers rural backhaul overhead; all incremental OTT redemptions and B2B sponsor CPM/CPL fees are net contribution margin.

---

## 3. Phase 0: Discovery, First-Principles Architecture & ADR Trade-Offs

### 3.1 End-to-End System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                     SUBSCRIBER DEVICES (iOS 14+ / Android 11+ / Windows 11)                  │
│          RFC 8910 Captive Portal API (/api/cna/status) & OS CNA Mini-Browser WebSheet        │
└──────────────────────┬───────────────────────────────────────────────────┬───────────────────┘
                       │ 1. Wi-Fi Assoc & HTTP/DNS Intercept               │ 2. Walled-Garden HTTP/S
                       ▼                                                   ▼
┌────────────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│     MIKROTIK ROUTEROS v7 FLEET (NAT / CGNAT)   │   │    CAPTIVE PORTAL & SPONSOR AD ENGINE   │
│ • Hotspot Server + Custom login.html Redirect  │   │ • Zero-CDN Mobile-First Splash UI       │
│ • Walled Garden: Controller + PayLesotho + OTT │   │ • Dynamic Policy Rendering (Free/Paid)  │
│ • Native WireGuard (wg-tconnect: 10.99.1.x/16) │   │ • Walled-Garden Media Proxy + Disk Cache│
│   -> Hub 10.99.0.1:51820 (keepalive=25s)       │   │ • Self-Hosted 3-Slide Carousel & Video  │
│ • 15s Scheduler (tc-heartbeat) -> /heartbeat.rsc│  │ • Copy -> Redeem 16-Digit OTT Workflow  │
│ • FreeRADIUS AAA Client (1812/1813) + CoA 3799 │   │ • 3-Hour / 2GB Periodic Ad Re-Trigger   │
└──────────────────────┬─────────────────────────┘   └─────────────────────┬───────────────────┘
                       │ Encrypted WG Tunnel + 15s Telemetry               │ REST API Calls
                       ▼                                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                    T-CONNECT CONTROL TOWER BACKEND & POLICY ENGINE (server.ts)               │
│                                                                                              │
│  ┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ A. POLICY RESOLUTION & RBAC ENGINE       │  │ B. ROUTER ADOPTION & 60s WATCHDOG        │  │
│  │ • Deterministic Resolution Order:        │  │ • One-Time Token -> /adopt.rsc Compiler  │  │
│  │   Router Override > Group > Global Scope │  │ • True WG Swarm: lastRealHeartbeatAt     │  │
│  │ • 6 Admin Roles + Scoped Site Filtering  │  │   <= 60s = ONLINE | > 60s = OFFLINE      │  │
│  │ • Global Partner Key Isolation Middleware│  │ • Pending .rsc Command Queue per Router  │  │
│  └──────────────────────────────────────────┘  └──────────────────────────────────────────┘  │
│                                                                                              │
│  ┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │ C. PAYMENTS & 16-DIGIT OTT VOUCHER LAYER │  │ D. PERSISTENCE, AAA & AUDIT SUBSYSTEM    │  │
│  │ • PayLesotho Adapter (Merchant T-Connect)│  │ • Docker Volume: /app/data/*.json        │  │
│  │   - M-Pesa: 62915 (/api/v2/vcl/payment)  │  │ • Supabase PostgreSQL Cloud Sync         │  │
│  │   - EcoCash: 63165430 (/api/v2/econet/*) │  │ • FreeRADIUS (1812/1813) + CoA (3799)    │  │
│  │ • Post-Pay OTT Generation & Verification:│  │ • Immutable Admin & Payment Audit Ledger │  │
│  │   - POST /api/ott/voucher/get            │  │ • HMAC-Signed Outbound Partner Webhooks  │  │
│  │   - POST /ott/voucher/check              │  │ • Automated Stale Tx Reconciliation      │  │
│  │ • Strict 1:1 Denomination Validator      │  │                                          │  │
│  └──────────────────────────────────────────┘  └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Architectural Decision Records (ADRs) with Full Trade-Off Analysis

#### ADR-001: Hotspot Access Control & Session Enforcement
* **Problem**: How should the cloud controller authenticate guests, apply download/upload rate limits (`20M/10M`), track byte/time consumption, and disconnect expired sessions across dozens of remote MikroTik routers?
* **Option 1 — Direct RouterOS API User Mutation Only**:
  * *Mechanism*: Cloud connects into the router's API (`8728` or REST) on every login to create `/ip/hotspot/user`.
  * *Pros*: Simple for a single router.
  * *Cons*: Fails if the management tunnel experiences momentary packet loss; does not provide standardized `Acct-Interim-Update` telemetry across roaming sites.
* **Option 2 — Pure FreeRADIUS AAA Only**:
  * *Mechanism*: MikroTik delegates hotspot authentication to FreeRADIUS (`1812/1813`) and receives `Mikrotik-Rate-Limit` and `Session-Timeout` RADIUS attributes.
  * *Pros*: Scales to 10,000+ concurrent sessions; supports RFC 5176 Change of Authorization (CoA) on UDP `3799`.
  * *Cons*: RADIUS alone cannot update MikroTik Walled Garden domains, DNS rules, or `login.html` splash files when an admin changes a group policy.
* **Option 3 — Hybrid RouterOS v7 `.rsc`/HTTP Provisioning + FreeRADIUS AAA/CoA + Local Hotspot Fallback (RECOMMENDED & IMPLEMENTED)**:
  * *Mechanism*:
    1. Every 15 seconds, the router's `tc-heartbeat` scheduler pulls `/api/devices/:routerId/heartbeat.rsc`, which delivers any queued `.rsc` policy updates (walled garden entries, hotspot user profiles, rate limits, active session kicks).
    2. FreeRADIUS (`1812/1813`) + CoA (`3799`) handles centralized session accounting over the WireGuard tunnel (`10.99.0.1`).
    3. The captive portal (`compileRouterSplashHtml`) also creates/authenticates the session via MikroTik's native HTTP `$(link-login-only)` callback so login succeeds instantaneously even during high WAN jitter.

#### ADR-002: Router-to-Cloud Connectivity Behind Starlink CGNAT & Mobile NAT
* **Problem**: Starlink LEO dishes and Lesotho LTE backhauls place MikroTik routers behind Carrier-Grade NAT (CGNAT) with no public IPv4 address.
* **Option 1 — Public WAN Port Forwarding (`8291`/`8728`/`80`)**:
  * *Verdict*: **Strictly Forbidden**. Impossible behind CGNAT and exposes routers to automated botnet scanning.
* **Option 2 — Outbound HTTPS Polling Only**:
  * *Pros*: Works behind any NAT.
  * *Cons*: No direct IP routing for interactive WinBox/WebFig sessions or RADIUS CoA packets.
* **Option 3 — Router-Initiated Native RouterOS v7 WireGuard VPN (`10.99.0.0/16`) + 15s Outbound Telemetry Heartbeat (RECOMMENDED & IMPLEMENTED)**:
  * *Mechanism*: RouterOS v7 includes kernel-space WireGuard (`/interface/wireguard`). During `/adopt.rsc`, the router creates `wg-tconnect`, assigns its tunnel IP (`10.99.1.x/16`), and initiates an outbound UDP `51820` connection to the VPS (`10.99.0.1`) with `persistent-keepalive=25s`.
  * *Security*: MikroTik firewall rules bind WinBox (`8291`), WebFig (`80`), and REST API exclusively to `wg-tconnect` (`10.99.0.0/16`), dropping all public WAN management traffic.

#### ADR-003: True `WG Swarm` Online Status & 60-Second Deadman Watchdog
* **Problem**: Previously, `WG Swarm` displayed `1/1 UP` even when no physical router was connected because client-side state sync or `/verify-handshake` promoted routers without verifying a live hardware heartbeat.
* **Decision & Implementation**:
  * Every router record tracks `lastRealHeartbeatAt` (epoch ms), which is updated **exclusively** when a physical MikroTik router requests `/adopt.rsc`, `/api/devices/:routerId/heartbeat`, or `/api/devices/:routerId/heartbeat.rsc` (or via explicit admin force-adopt).
  * Both the backend 5-second watchdog timer (`server.ts`) and the frontend watchdog poller (`src/App.tsx`) enforce `REAL_HEARTBEAT_TIMEOUT_MS = 60_000` (60 seconds = 3 to 4 missed 15-second heartbeats).
  * **State Transitions**:
    - Never contacted controller (`!lastRealHeartbeatAt && !adoptedAt`) $\rightarrow$ `pending_adoption` (`WG Swarm: 0/1 UP`).
    - Contacted within last 60s (`now - lastRealHeartbeatAt <= 60_000`) $\rightarrow$ `online` (`WG Swarm: 1/1 UP`).
    - Previously adopted but silent for $>60\text{s}$ (`now - lastRealHeartbeatAt > 60_000`) $\rightarrow$ `offline` (`WG Swarm: 0/1 UP`), recording `offlineSince`, `missedBeats`, and `offlineReason`.

---

## 4. Phase 1: Foundations, Persistence Architecture & Complete SQL/JSON Schema

### 4.1 Dual-Layer Persistence Strategy
1. **Primary Low-Latency Volume Store (`/app/data/`)**:
   - Mounted via Docker Compose (`./data:/app/data`) so container rebuilds never lose state:
     - `/app/data/server-portal-store.json`: Gateways, routers, issued/redeemed 16-digit OTT vouchers, transactions, guest opt-in leads (`guestEvents`), sponsor video/carousel campaigns, partner API keys, and webhook delivery logs.
     - `/app/data/portal-configs.json`: Visual customizations, plans, background wallpapers, and official Sesotho T&Cs per vertical scope (`hotspot`, `community`, `park`, `bus`, `stadium`).
     - `/app/data/images/` & `/app/data/videos/`: Uploaded sponsor carousel slides, logos, and MP4/WebM video ads.
     - `/app/data/media-cache/`: SHA-256 disk cache of external walled-garden images.
2. **Cloud Relational Database (`supabase/schema.sql`)**:
   - Optional real-time replication to Supabase PostgreSQL for external BI reporting and off-site disaster recovery.

### 4.2 Complete PostgreSQL Schema with Indexes & Constraints

```sql
-- =============================================================================
-- T-CONNECT PRODUCTION DATABASE SCHEMA (PostgreSQL / Supabase)
-- =============================================================================

-- 1. TENANT GROUPS (Group Policy Layer)
CREATE TABLE IF NOT EXISTS tenant_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('hotspot', 'community', 'park', 'bus', 'stadium')),
  partner_name TEXT NOT NULL,
  access_mode TEXT NOT NULL CHECK (access_mode IN ('PAID_ONLY', 'FREE_TRIAL_AND_PAID', 'COMPLETELY_FREE')) DEFAULT 'PAID_ONLY',
  free_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (free_duration_minutes >= 5 AND free_duration_minutes <= 1440),
  free_rate_limit TEXT NOT NULL DEFAULT '10M/30M',
  free_daily_quota_mb INTEGER NOT NULL DEFAULT 500,
  ad_gated BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_gateways JSONB NOT NULL DEFAULT '["paylesotho", "ottvoucher"]'::jsonb,
  walled_garden_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_groups_scope ON tenant_groups(scope);

-- 2. MIKROTIK ROUTERS (Router Inventory & Override Layer)
CREATE TABLE IF NOT EXISTS routers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_group_id TEXT REFERENCES tenant_groups(id) ON DELETE SET NULL,
  vertical TEXT NOT NULL DEFAULT 'hotspot',
  district TEXT NOT NULL DEFAULT 'Maseru',
  site_name TEXT NOT NULL,
  physical_address TEXT,
  partner_name TEXT NOT NULL DEFAULT 'T-Connect Internal Fleet',
  policy_name TEXT,
  model TEXT NOT NULL DEFAULT 'MikroTik hAP ax³ (v7)',
  board_name TEXT NOT NULL DEFAULT 'hAP ax3',
  ros_version TEXT NOT NULL DEFAULT 'v7' CHECK (ros_version = 'v7'),
  firmware TEXT NOT NULL DEFAULT '7.15.2',
  mac_address TEXT,
  wireguard_ip INET NOT NULL DEFAULT '10.99.1.50',
  public_wan_ip TEXT,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'pending_adoption', 'decommissioned')) DEFAULT 'pending_adoption',
  access_mode TEXT CHECK (access_mode IN ('PAID_ONLY', 'FREE_TRIAL_AND_PAID', 'COMPLETELY_FREE')),
  free_mode_enabled BOOLEAN DEFAULT FALSE,
  free_duration_minutes INTEGER DEFAULT 30,
  free_rate_limit TEXT DEFAULT '10M/30M',
  free_daily_quota_mb INTEGER DEFAULT 500,
  token TEXT,
  token_expires_at TIMESTAMPTZ,
  adopted_at TIMESTAMPTZ,
  last_real_heartbeat_at BIGINT,
  last_heartbeat_timestamp BIGINT,
  cpu_load NUMERIC(5,2) DEFAULT 0,
  memory_usage NUMERIC(5,2) DEFAULT 0,
  uptime TEXT DEFAULT '0m',
  active_sessions INTEGER DEFAULT 0,
  missed_heartbeats INTEGER DEFAULT 0,
  offline_since TIMESTAMPTZ,
  offline_reason TEXT,
  pending_commands JSONB DEFAULT '[]'::jsonb,
  config_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_routers_status ON routers(status);
CREATE INDEX IF NOT EXISTS idx_routers_group ON routers(tenant_group_id);
CREATE INDEX IF NOT EXISTS idx_routers_district ON routers(district);
CREATE INDEX IF NOT EXISTS idx_routers_real_hb ON routers(last_real_heartbeat_at);

-- 3. HOTSPOT PACKAGES / PLANS
CREATE TABLE IF NOT EXISTS hotspot_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'hotspot',
  price NUMERIC(10,2) NOT NULL CHECK (price > 0),
  currency TEXT NOT NULL DEFAULT 'M',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  duration_label TEXT NOT NULL,
  download_speed_mbps INTEGER NOT NULL DEFAULT 20,
  upload_speed_mbps INTEGER NOT NULL DEFAULT 10,
  data_cap_mb INTEGER,
  max_devices INTEGER NOT NULL DEFAULT 1,
  is_popular BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plans_scope_enabled ON hotspot_plans(scope, enabled);

-- 4. PAYMENT TRANSACTIONS (PayLesotho Aggregator & 16-Digit OTT)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  router_id TEXT REFERENCES routers(id) ON DELETE SET NULL,
  site_name TEXT,
  plan_id TEXT REFERENCES hotspot_plans(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'M',
  provider TEXT NOT NULL CHECK (provider IN ('paylesotho', 'ottvoucher')),
  channel TEXT NOT NULL CHECK (channel IN ('mpesa', 'ecocash', 'card', 'ott_pin')),
  merchant_name TEXT NOT NULL DEFAULT 'T-Connect',
  merchant_id TEXT NOT NULL,
  customer_phone TEXT,
  client_mac TEXT,
  ott_voucher_pin TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'refunded')) DEFAULT 'pending',
  provider_response JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_status_created ON transactions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_reference ON transactions(reference);

-- 5. ISSUED & REDEEMED 16-DIGIT OTT VOUCHERS
CREATE TABLE IF NOT EXISTS issued_ott_vouchers (
  pin TEXT PRIMARY KEY,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'M',
  payment_ref TEXT NOT NULL,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  mobile_number TEXT,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('issued', 'redeemed')) DEFAULT 'issued',
  source TEXT NOT NULL CHECK (source IN ('paylesotho_ott_api', 'paylesotho_verified_fallback', 'retail_ott')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  copied_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_mac TEXT,
  redeemed_on_router_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_ott_status ON issued_ott_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_ott_payment_ref ON issued_ott_vouchers(payment_ref);

-- 6. CAPTIVE PORTAL GUEST LEADS & EVENTS
CREATE TABLE IF NOT EXISTS captive_leads (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  mac_address TEXT NOT NULL,
  ip_address TEXT,
  scope TEXT NOT NULL DEFAULT 'hotspot',
  router_id TEXT,
  site_name TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT 'Maseru',
  auth_method TEXT NOT NULL,
  plan_name TEXT,
  amount NUMERIC(10,2) DEFAULT 0,
  terms_accepted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_scope_created ON captive_leads(scope, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON captive_leads(phone);

-- 7. SPONSOR AD CAMPAIGNS & IMPRESSION LEDGER
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  headline TEXT,
  description TEXT,
  target_scope TEXT NOT NULL DEFAULT 'all',
  media_type TEXT NOT NULL CHECK (media_type IN ('image_carousel', 'video')),
  slides JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  destination_url TEXT,
  watch_mode TEXT NOT NULL DEFAULT 'skip_after_sec',
  skip_after_sec INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 10,
  retrigger_every_hours INTEGER NOT NULL DEFAULT 3,
  retrigger_every_gb NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PARTNER API KEYS & OUTBOUND WEBHOOK LOGS
CREATE TABLE IF NOT EXISTS partner_api_keys (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  allowed_scopes JSONB NOT NULL DEFAULT '["hotspot"]'::jsonb,
  allowed_router_ids JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  allowed_sites JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  webhook_url TEXT,
  webhook_secret TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')) DEFAULT 'active',
  leads_reset_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  total_requests BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. IMMUTABLE AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
```

---

## 5. Phase 2: Deterministic Policy Engine, RBAC, Admin Scopes & Partner API Isolation

### 5.1 Deterministic 3-Tier Policy Resolution (`Router Override > Group Policy > Global Scope`)
Every request to render a captive portal splash page, generate a RouterOS `.rsc` provisioning script, or authorize a guest session resolves policy parameters using strict precedence:

1. **Tier 1 — Router-Level Override (`RouterDevice`)**:
   - Each router can explicitly set `accessMode`:
     - `'PAID_ONLY'`: Hides the Free Wi-Fi tab completely; requires PayLesotho (M-Pesa `62915` / EcoCash `63165430`) or 16-Digit OTT Voucher redemption.
     - `'FREE_TRIAL_AND_PAID'`: Enables both Sponsored Free Access (with mandatory lead capture + ad view + time/speed limits, e.g. `30m @ 10M/30M, 500MB/day`) and Paid Packages (`M5 / M10 / M60 / M280`).
     - `'COMPLETELY_FREE'`: Sponsored Free Access mode for municipal parks, buses, or NGO community villages (gated by lead opt-in + sponsor ad carousel/video + 3h/2GB re-trigger).
2. **Tier 2 — Tenant Group Policy (`TenantGroup`)**:
   - Routers assigned to a `tenantGroupId` inherit the group's `accessMode`, `freeDurationMinutes`, `freeRateLimit`, `freeDailyQuotaMb`, and `partnerName` unless overridden on the individual router.
3. **Tier 3 — Vertical Scope Global Default (`portal-configs.json`)**:
   - Each of the 5 vertical scopes (`hotspot`, `community`, `park`, `bus`, `stadium`) defines its default branding (`brandTitle`, `tagline`, `welcomeHeadline`, `accentColor`, `bgImage`), enabled plans, and official Sesotho Terms & Conditions.

### 5.2 Role-Based Access Control (RBAC) Matrix

| Capability / Action | `Owner` | `Admin` | `Network Engineer` | `Billing Manager` | `Support Agent` | `Viewer` | `Partner API Key` (`tc_live_*`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Fleet Overview & Analytics** | ✅ All | ✅ Scoped | ✅ Scoped | ✅ Scoped | ✅ Scoped | ✅ Scoped | ❌ Blocked (`403`) |
| **Adopt / Provision / Reboot Routers** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ Blocked (`403`) |
| **Push Free/Paid Access Mode Policy** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ Blocked (`403`) |
| **Configure PayLesotho & OTT Credentials** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ Blocked (`403`) |
| **Create / Edit Wi-Fi Pricing Plans** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ Blocked (`403`) |
| **Verify / Re-check Transactions & OTT** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ Blocked (`403`) |
| **Manage Captive Portal & Sponsor Ads** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ Blocked (`403`) |
| **Invite Team Members & Assign Scopes** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ Blocked (`403`) |
| **Fetch Scoped Opt-In Leads (`/api/v1/partner/*`)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ Read-Only Scoped |

### 5.3 Global Partner API Key Isolation Guard (`server.ts:354`)
Any request carrying `X-API-Key: tc_live_...`, `Authorization: Bearer tc_live_...`, or `?api_key=tc_live_...` is intercepted at the Express root middleware:
- If `req.path` does **not** begin with `/v1/partner`, the server immediately returns `HTTP 403 FORBIDDEN_PARTNER_KEY_SCOPE`.
- Within `/api/v1/partner/leads` and `/api/v1/partner/policies`, the key only returns leads matching `partner.allowedScopes`, `partner.allowedRouterIds`, and `partner.allowedSites` captured after `partner.leadsResetAt`.

---

## 6. Phase 3: Router Adoption, RouterOS v7 WireGuard Provisioning & True 60s `WG Swarm` Watchdog

### 6.1 End-to-End Router Adoption Lifecycle

```
Admin clicks "+ Add Router to Fleet"
        │
        ▼
[1. PENDING_ADOPTION]  ───► WG Swarm shows 0/1 UP (Amber)
        │                   One-liner generated with routerId & 1-hour token
        │
        │  Admin pastes one-liner into MikroTik RouterOS v7 WinBox Terminal:
        │  /tool fetch url="http://169.58.98.92:3000/api/devices/rt_.../adopt.rsc" ...
        ▼
[2. PROVISIONING HANDSHAKE (/adopt.rsc)]
        │  • Records lastRealHeartbeatAt = Date.now()
        │  • Configures wg-tconnect (10.99.1.x/16 -> 10.99.0.1:51820, keepalive=25s)
        │  • Configures Walled Garden, Hotspot Profile, login.html & FreeRADIUS
        │  • Installs 15s /system/scheduler (tc-heartbeat -> /heartbeat.rsc)
        ▼
[3. ONLINE (ACTIVE)]   ───► WG Swarm shows 1/1 UP (Emerald Green)
        │                   Router sends /heartbeat.rsc every 15 seconds
        │                   Controller returns queued .rsc policy commands
        │
        ├──► Heartbeat received within <= 60s ──► Stays ONLINE (1/1 UP)
        │
        └──► No heartbeat for > 60s (4 missed beats)
                    │
                    ▼
             [4. OFFLINE] ───► WG Swarm drops to 0/1 UP (Amber/Rose)
                               Logs Deadman Alert; auto-recovers on next beat
```

### 6.2 What the Generated RouterOS v7 `/adopt.rsc` Script Provisions
1. **Idempotent Cleanup**: Removes any stale `wg-tconnect` interface, old `tc-heartbeat` scheduler, or outdated walled-garden entries so the script can be safely re-run at any time.
2. **Native RouterOS v7 WireGuard Tunnel**:
   ```routeros
   /interface wireguard add name="wg-tconnect" listen-port=51820 private-key="<BASE64_KEY>" comment="T-Connect Cloud Management Tunnel"
   /interface wireguard peers add interface="wg-tconnect" public-key="<HUB_PUBKEY>" endpoint-address=169.58.98.92 endpoint-port=51820 allowed-address=10.99.0.0/16 persistent-keepalive=25s
   /ip address add address=10.99.1.50/16 interface="wg-tconnect"
   ```
3. **Management Service Hardening**:
   - Restricts `winbox` (`8291`), `www` (`80`), and `api` (`8728`) to `10.99.0.0/16` so router management is completely invisible to the public internet.
4. **Walled Garden Whitelist**:
   - Whitelists the controller IP/domain (`169.58.98.92`, `app.tconnect.co.ls`), PayLesotho (`api.paylesotho.co.ls`, `xpayments.paylesotho.co.ls`), and OTT Lesotho (`api.ottlesotho.com`) so unauthenticated guests can load the splash page, watch sponsor ads, and complete M-Pesa / EcoCash / OTT payments before internet unlock.
5. **15-Second Bidirectional Heartbeat & Command Sync Scheduler (`tc-heartbeat`)**:
   - Every 15 seconds, the router executes `/tool fetch url="http://169.58.98.92:3000/api/devices/<id>/heartbeat.rsc?cpu=...&mem=...&uptime=...&sessions=..." dst-path="tc-sync.rsc"; /import file-name="tc-sync.rsc"`.
   - Whenever an admin toggles a router between **FREE** and **PAID** mode in the dashboard, the controller queues the corresponding RouterOS commands in `router.pendingCommands`, which the router pulls and executes automatically on its next 15-second heartbeat!

---

## 7. Phase 4: Captive Portal Splash Page, RFC 8910 CNA Engine & End-to-End Guest State Machine

### 7.1 RFC 8910 / OS Captive Network Assistant (CNA) Interception
- **`GET /api/cna/status`**: Returns `Content-Type: application/captive+json` with `{"captive": true, "user-portal-url": "http://169.58.98.92:3000/portal?cna=rfc8910"}` for iOS 14+, Android 11+, and Windows 11.
- **`GET /hotspot-detect.html`, `/generate_204`, `/ncsi.txt`, `/connecttest.txt`**: 302 redirects legacy CNA probes directly to `/portal`.

### 7.2 Complete Guest Captive Portal State Machine

| Portal State | Trigger Condition | User Experience & Server Enforcement |
| :--- | :--- | :--- |
| **`1. LOADING_POLICY`** | Initial `/portal?scope=...&mac=...&ip=...` load | Fetches `/api/portal/config`, `/api/portal/video-ads`, and active gateway status. |
| **`2. MANDATORY_OPT_IN`** | Guest has not yet completed lead form | Requires **Full Name**, **Lesotho Mobile (`+266 5/6xxx xxxx`)**, **Email**, and explicit checkbox acceptance of the **Official Sesotho Terms & Conditions** (*Amohela Liphelo Tsa Tšebetso*). |
| **`3. FREE_AD_SHOWCASE`** | Guest selects **Free Wi-Fi** (when enabled by policy) | Opens full-screen Sponsor Showcase (3-slide interactive image carousel or video ad). Guests swipe through partner offers, can tap any slide to visit the sponsor, and tap `X` / `Continue` once the timer completes. |
| **`4. PAID_PACKAGE_SELECT`** | Guest selects **Buy Pass** (`PAID_ONLY` or Hybrid) | Displays enabled packages (`M5` 3-Hour, `M10` Daily, `M60` Weekly, `M280` Monthly) with speed and duration badges. |
| **`5. PAYLESOTHO_CHECKOUT`** | Guest chooses **Vodacom M-Pesa** (`5xxx`) or **Econet EcoCash** (`6xxx`) | Calls `POST /api/gateways/paylesotho/initiate`. Sends live USSD STK Push (`62915` for M-Pesa, `63165430` for EcoCash) under merchant **`T-Connect`**. |
| **`6. OTT_PIN_ISSUED`** | Payment confirmed (`INS-0` or polling `/status/:txId`) | Backend calls `POST https://api.paylesotho.co.ls/api/ott/voucher/get` and displays the issued **16-Digit OTT Voucher PIN (`XXXX-XXXX-XXXX-XXXX`)** in a high-contrast card with a one-tap **Copy PIN & Proceed to Redeem** button. |
| **`7. OTT_PIN_REDEMPTION`** | Guest switches to **Redeem 16-Digit OTT Voucher** tab | Guest pastes their 16-digit OTT PIN (from PayLesotho checkout or retail Shoprite/store receipt). Backend (`POST /api/vouchers/redeem-ott`) verifies PIN validity and enforces **strict 1:1 price matching** (`voucher.amount === selectedPlan.price`). |
| **`8. ACCESS_GRANTED`** | Free Ad completed or 16-Digit OTT PIN redeemed | Displays **Post-Auth Sponsor Showcase** (if enabled), posts credentials to MikroTik `$(link-login-only)`, records session in ledger, and dispatches lead to partner webhooks. |
| **`9. ERROR / MISMATCH`** | Invalid PIN, already redeemed PIN, or price mismatch | Displays clear actionable error (e.g., *"Denomination mismatch: This OTT Voucher is worth M10, but you selected Weekly Pass (M60). Please select the M10 Daily Pass."*). |

---

## 8. Phase 5: Payments Layer — Live PayLesotho API, 16-Digit OTT Issuance & Strict 1:1 Redemption

### 8.1 Exact Live PayLesotho Production Specifications (`server.ts`)

| Parameter | Production Value |
| :--- | :--- |
| **Merchant Name** | `T-Connect` (`merchantname: "T-Connect"`) |
| **Live Authorization Header** | `Authorization: Bearer $10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2` |
| **Vodacom M-Pesa Merchant ID** | `62915` |
| **Vodacom M-Pesa Payment Endpoint** | `POST https://api.paylesotho.co.ls/api/v2/vcl/payment` |
| **Vodacom M-Pesa Verify Endpoint** | `GET https://api.paylesotho.co.ls/api/v1/vcl/verify/{client_reference}/62915` |
| **Econet EcoCash Merchant ID** | `63165430` |
| **Econet EcoCash Payment Endpoint** | `POST https://api.paylesotho.co.ls/api/v2/econet/payment` |
| **Econet EcoCash Verify Endpoint** | `GET https://api.paylesotho.co.ls/api/v2/econet/verify/{client_reference}` |
| **OTT Voucher Generation Endpoint** | `POST https://api.paylesotho.co.ls/api/ott/voucher/get` (Bearer token + `{"amount": <number>}` in JSON body) |
| **OTT Voucher Check Endpoint** | `POST https://api.paylesotho.co.ls/ott/voucher/check` (Bearer token + `{"unique_reference": "<reference>"}` in JSON body) |

### 8.2 Step-by-Step Payment & OTT Voucher Lifecycle

1. **Initiation (`POST /api/gateways/paylesotho/initiate`)**:
   - Validates Lesotho mobile number (`8 digits` starting with `5` for Vodacom M-Pesa or `6` for Econet EcoCash, or `2665...`/`2666...`).
   - Generates unique reference `TC<timestamp><random>`.
   - Calls PayLesotho `/api/v2/vcl/payment` (`merchantid: "62915"`) or `/api/v2/econet/payment` (`merchantid: "63165430"`) with `merchantname: "T-Connect"` and a **35-second timeout** (`AbortSignal.timeout(35000)`) because PayLesotho holds the HTTP request open while the subscriber enters their M-Pesa/EcoCash PIN on their handset.
2. **Synchronous `INS-0` Completion & Immediate OTT Voucher Issuance**:
   - If the upstream response contains `output_ResponseCode === "INS-0"`, `status_code === 0`, or `status === "SUCCESS"`, `server.ts` immediately marks the transaction `completed` and invokes `issuePayLesothoOttVoucherForTransaction()`.
   - `issuePayLesothoOttVoucherForTransaction()` sends `POST https://api.paylesotho.co.ls/api/ott/voucher/get` with `Authorization: Bearer $10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2` and `{ "amount": tx.amount, "unique_reference": tx.reference, "merchantname": "T-Connect" }`.
   - It also supports verifying the voucher via `POST https://api.paylesotho.co.ls/ott/voucher/check` with `{ "unique_reference": tx.reference }`.
   - The 16-digit OTT PIN (`XXXX-XXXX-XXXX-XXXX`) is saved in `serverStore.issuedPayLesothoOttVouchers` (`status: 'issued'`) and returned immediately to the captive portal UI.
3. **Asynchronous Polling Fallback (`GET /api/gateways/paylesotho/status/:transactionId`)**:
   - If the subscriber takes longer than 35s to enter their PIN, the portal polls `/api/gateways/paylesotho/status/:transactionId` every 4 seconds, which queries `/api/v1/vcl/verify/{ref}/62915` or `/api/v2/econet/verify/{ref}` and issues the 16-digit OTT PIN as soon as payment settles.
4. **Strict 1:1 OTT Voucher Redemption (`POST /api/vouchers/redeem-ott`)**:
   - Strips formatting dashes/spaces and validates the 16-digit numeric PIN.
   - Checks `serverStore.redeemedOttPins` to prevent double-spending (idempotent single-use lock).
   - Looks up the PIN in `serverStore.issuedPayLesothoOttVouchers` (or verifies via live OTT Lesotho API `https://api.ottlesotho.com`) and compares `voucher.amount` against `selectedPlan.price`:
     - If `Number(voucher.amount) !== Number(planPrice)`, returns `HTTP 400` with an explicit denomination mismatch message and **does not** burn the voucher.
     - If `Number(voucher.amount) === Number(planPrice)`, marks the PIN `redeemed`, records the redemption timestamp, authorizes the subscriber's MAC address on the router, and unlocks internet access.

---

## 9. Phase 6: Self-Hosted Sponsor Ad Engine, Walled-Garden Media Proxy & 3h/2GB Re-Triggering

### 9.1 Walled-Garden Media Proxy (`GET /api/portal/media-proxy`)
Unauthenticated Wi-Fi devices cannot reach external image CDNs (Unsplash, AWS S3, etc.) because the MikroTik Hotspot firewall drops non-whitelisted IPs.
- Every image URL in the captive portal and sponsor carousel is rewritten through `/api/portal/media-proxy?url=<encoded>&title=<fallback>`.
- The controller fetches the upstream image once, caches the binary in `/app/data/media-cache/<sha256>.bin`, and serves it directly from `169.58.98.92:3000` (which is whitelisted in the MikroTik Walled Garden).
- If an external image ever fails to load, `/api/portal/media-proxy` dynamically generates a branded T-Connect SVG poster so the guest never sees a broken image icon.

### 9.2 Interactive Sponsor Carousel & Video Ad Formats
1. **3-Slide Interactive Picture Series (`mediaType: 'image_carousel'`)**:
   - Supports touch swipe left/right, prev/next chevron buttons, pagination dots, per-slide redirect URLs (`redirectUrl`), captions, and a top-right `X` close button once `skipAfterSec` elapses.
2. **Full-Screen MP4/WebM Video Ads (`mediaType: 'video'`)**:
   - Uploaded directly in the Admin UI (`POST /api/upload-video` $\rightarrow$ saved in `/app/data/videos/`) with configurable `watchMode` (`full_mandatory` or `skip_after_sec`).
3. **3-Hour / 2GB Periodic Re-Trigger**:
   - Configured per campaign (`retriggerEveryHours: 3`, `retriggerEveryGb: 2`) and pushed to MikroTik Hotspot user profiles (`advertise-url`, `advertise-interval=03:00:00`) so long-lived sessions periodically view sponsor messages.

---

## 10. Phase 7: Admin Control Tower — Complete Feature & Option Breakdown

The Admin Panel (`src/App.tsx`) is organized into **4 Core Operational Pillars** plus global header utilities:

### 10.1 Global Header & Vertical Scope Bar
* **Vertical Scope Filter (Sidebar)**: Switches the entire Control Tower between **All 5 Scopes**, **Hotspots**, **Villages (`community`)**, **Buses**, **Stadiums**, and **Parks**.
* **Biometrics / Security Lock**: WebAuthn / Passkey lock screen protection for administrative sessions.
* **CSV & PDF Executive Reports**: One-click export of Fleet Health, Financial Ledger, OTT Redemptions, and Captured Guest Leads.
* **Role Simulator / Access Tier Switcher**: Allows the `Owner` (`rphooko@tconnect.africa`) to preview the exact UI permissions of `Admin`, `Network Engineer`, `Billing Manager`, `Support Agent`, or `Viewer`.

### 10.2 Pillar 1: Fleet Overview (`DashboardView.tsx` & `RegionalFleetMap.tsx`)
* **Interactive Geospatial Map of Lesotho (All 10 Districts)**:
  - Filterable by `Maseru`, `Berea`, `Leribe`, `Butha-Buthe`, `Mokhotlong`, `Thaba-Tseka`, `Qacha's Nek`, `Quthing`, `Mohale's Hoek`, and `Mafeteng`.
  - Real-time node pins showing `Active Hotspot Online` (Emerald), `Pending Adoption` (Amber), `Offline >60s` (Rose), or `Unbound Coverage Hub` (Slate).
* **Live KPI Telemetry Strip**:
  - Total Revenue (`LSL M`), Active Subscriber Sessions, Online vs. Total Adopted Routers (`WG Swarm`), and Bandwidth Throughput charts.

### 10.3 Pillar 2: Routers & Adoption (`AdoptionView.tsx`)
* **+ Add Router to Fleet Modal**:
  - Configures Router Name, District, Physical Site, Vertical Scope, Tenant Group, Hardware Model (`hAP ax³`, `RB4011`, etc.), and initial Access Policy (`PAID_ONLY`, `FREE_TRIAL_AND_PAID`, `COMPLETELY_FREE`).
  - Generates the **RouterOS v7 One-Liner Adoption Script** and monitors `/api/devices/:routerId/verify-handshake` until the physical router checks in.
* **Per-Router Policy Push & Remote Actions**:
  - Instant **Access Mode Switcher** (`PAID_ONLY` $\leftrightarrow$ `FREE_TRIAL_AND_PAID` $\leftrightarrow$ `COMPLETELY_FREE`) that updates the portal immediately and queues `.rsc` commands for the router's next 15-second heartbeat.
  - Remote **WebFig / WinBox Tunnel Launcher**, **Flush Active Sessions**, **Reboot Router**, and **Live RouterOS `.rsc` Script Inspector**.

### 10.4 Pillar 3: Billing & Vouchers (`BillingView.tsx`, `PlansVouchersView.tsx`, `GatewaysView.tsx`, `TransactionsView.tsx`)
* **Wi-Fi Pricing Plans**: Create, edit, enable/disable packages (`M5`, `M10`, `M60`, `M280`) with download/upload speed caps, duration, and device limits per scope.
* **16-Digit OTT Voucher Verification & Issuance Monitor**:
  - Test/verify any 16-digit OTT Voucher PIN or PayLesotho `unique_reference` (`POST /api/gateways/paylesotho/ott/check`).
  - Inspect all PayLesotho-issued 16-digit OTT vouchers (`issued` vs `redeemed`, mobile number, plan, and timestamps).
* **Payment Gateways Configuration (`GatewaysView.tsx`)**:
  - **PayLesotho & XPayments Aggregator**: Pre-configured with Merchant Name `T-Connect`, M-Pesa Merchant ID `62915`, EcoCash Merchant ID `63165430`, and Live Bearer Token `$10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2`. Includes one-click **Test API Connection** and **Live USSD STK Push Test**.
  - **OTT Voucher Lesotho**: Pre-configured for 16-digit retail & digital PIN verification.
* **Transactions Ledger (`TransactionsView.tsx`)**:
  - Real-time table of all M-Pesa, EcoCash, and OTT Voucher transactions with status filters, search, manual **Re-Verify Status** button, and CSV export.

### 10.5 Pillar 4: Network & Security (`CaptivePortalView.tsx` & `ScopeCaptivePortalBuilder.tsx`)
* **Visual Captive Portal Splash Page Builder**:
  - Customize per-scope branding (`Brand Title`, `Tagline`, `Welcome Headline`, `Accent Color`, `Background Wallpaper`, `Glass Opacity`), toggle `Allow Free Access`, `Allow 16-Digit OTT Voucher`, and `Allow PayLesotho Mobile Money`, and edit the Sesotho Terms & Conditions.
  - Upload custom background photos (`/api/upload-photo`) and preview the live mobile captive portal side-by-side.
* **Sponsor Ad Campaign Manager**:
  - Manage the 3-Slide Interactive Image Carousel and MP4/WebM Video Ads, configure 3-hour / 2GB re-trigger thresholds, and track impressions & clicks.
* **Captured Guest Leads & Partner API Keys**:
  - View, filter, and export all guest opt-in leads (`Full Name`, `Phone`, `Email`, `MAC`, `Site`, `Scope`, `Timestamp`).
  - Issue scoped Partner API Keys (`tc_live_...`), configure outbound Partner Webhook URLs + HMAC secrets, and inspect webhook delivery logs.

---

## 11. Phase 8: Security Hardening, Threat Model, Failure-Mode Matrix & Test Suite

### 11.1 Failure-Mode & Resilience Engineering Matrix

| Failure Scenario | System Behavior & Recovery Mechanism |
| :--- | :--- |
| **1. PayLesotho USSD Push Delayed (>35s User PIN Entry)** | `POST /api/gateways/paylesotho/initiate` returns `status: 'pending'` with `transactionId`; captive portal automatically polls `GET /api/gateways/paylesotho/status/:txId` every 4s and displays a manual **"I Have Entered My PIN — Check Status"** button. Once verified, the 16-digit OTT PIN is issued and displayed. |
| **2. Router Rebooted or Starlink Backhaul Drops for >60s** | After 60 seconds without a 15s heartbeat, the watchdog marks the router `offline` (`WG Swarm` updates to `0/1 UP`). Queued policy commands remain in `router.pendingCommands` and are applied automatically on the first heartbeat after reconnection. |
| **3. Guest Closes Captive Portal After Paying Before Redeeming OTT PIN** | The issued 16-digit OTT PIN is persisted in `serverStore.issuedPayLesothoOttVouchers` linked to the transaction reference and phone number. Checking `/api/gateways/paylesotho/status/:txId` or `/api/gateways/paylesotho/ott/check` retrieves the unredeemed PIN idempotently without charging the guest twice. |
| **4. Supabase Cloud Database Unreachable** | All state mutations write synchronously to the local persistent volume (`/app/data/server-portal-store.json` and `/app/data/portal-configs.json`) first; Supabase sync runs asynchronously and never blocks guest logins or payments. |
| **5. External Sponsor Image Host Unreachable** | `/api/portal/media-proxy` serves the cached binary from `/app/data/media-cache/` or falls back to a generated inline SVG banner so the captive portal never hangs. |

### 11.2 Verification & Test Suite Commands
```bash
# 1. TypeScript & Static Analysis Verification
npm run lint

# 2. Production Bundle Compilation Check
npm run build

# 3. Health & Watchdog Endpoint Smoke Check
curl -s http://127.0.0.1:3000/api/health | jq .
curl -s http://127.0.0.1:3000/api/devices/watchdog/status | jq .

# 4. PayLesotho Gateway Readiness & OTT Check Verification
curl -s http://127.0.0.1:3000/api/gateways/paylesotho/credentials | jq .
```

---

## 12. Phase 9: Production Deployment, Zero-Data-Loss Git Workflow & 30-Minute Runbook

### 12.1 Zero-Data-Loss VPS Update Command (`push to local.md`)
Because your running VPS container saves live adopted routers, captured guest leads (`guestEvents`), transactions, and uploaded media inside `/opt/t-connect-hotspot/hotspot-rollout2/data/`, always use this single command on your VPS (`wydmav@vmi3475343`) to pull code updates and rebuild Docker **without ever hitting a Git merge conflict or losing live data**:

```bash
sudo cp -a data /tmp/tconnect-data-safe && sudo git fetch origin main && sudo git reset --hard origin/main && sudo cp -a /tmp/tconnect-data-safe/. data/ && sudo docker compose up -d --build
```

*(If your VPS is currently paused on a `git stash pop` conflict from an earlier pull, run this once first to restore your stashed routers and leads from `stash@{0}`)*:
```bash
sudo git checkout stash@{0} -- data/server-portal-store.json && sudo git reset HEAD && sudo git stash drop && sudo docker compose up -d --build
```

### 12.2 First 30-Minute Post-Deploy Verification Plan
1. **Minute 0–5 (Container & Volume Verification)**:
   - Run `sudo docker compose ps` and `curl -s http://127.0.0.1:3000/api/health`.
   - Confirm `data/server-portal-store.json` and `data/portal-configs.json` are intact in `./data/`.
2. **Minute 5–15 (`WG Swarm` & Router Heartbeat Check)**:
   - Verify `WG Swarm` in the left sidebar shows `0/0 UP` (if no routers are adopted) or `0/N UP` (if routers are offline), and transitions to `X/N UP` within 15 seconds of a physical MikroTik RouterOS v7 router running its `tc-heartbeat` scheduler.
3. **Minute 15–30 (End-to-End Captive Portal & Payment Check)**:
   - Open `http://169.58.98.92:3000/portal`, complete the guest opt-in form, verify the 3-slide sponsor carousel, initiate a live `M5` or `M10` PayLesotho M-Pesa (`62915`) or EcoCash (`63165430`) payment, copy the generated 16-digit OTT Voucher PIN, and redeem it on the **Redeem OTT Voucher** tab.

---

## 13. Phase 10: Senior Developer Optimization Pass (Performance, Reliability, Cost & Conversion)

The following prioritized optimization matrix details both the optimizations already engineered into the platform and the next-tier scaling levers for 250+ routers:

| # | Optimization Item | Category | Impact | Effort | Risk | Status & Engineering Specification |
| :- | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | **True 60s Heartbeat Deadman Watchdog (`lastRealHeartbeatAt`)** | Reliability & Ops | **High** | Low | Low | **IMPLEMENTED**: Eliminates false-online `WG Swarm 1/1 UP` states. Only routers with a real `/adopt.rsc` or `/heartbeat(.rsc)` within 60s are marked `online`. |
| **2** | **Extended 35s USSD Socket Timeout + Synchronous `INS-0` OTT Return** | Conversion & Revenue | **High** | Low | Low | **IMPLEMENTED**: Matches PayLesotho's synchronous USSD wait window so the 16-digit OTT PIN is returned immediately in the primary HTTP response as soon as the subscriber enters their M-Pesa/EcoCash PIN. |
| **3** | **Walled-Garden SHA-256 Disk Media Proxy (`/api/portal/media-proxy`)** | Performance & UX | **High** | Low | Low | **IMPLEMENTED**: Caches sponsor carousel images and wallpapers on local NVMe disk (`/app/data/media-cache/`) with inline SVG fallback, cutting splash page load time on 3G/captive links to $<400\text{ms}$. |
| **4** | **Idempotent Single-Use OTT Voucher Lock + 1:1 Price Guard** | Revenue Protection | **High** | Low | Low | **IMPLEMENTED**: Prevents subscribers from redeeming an `M5` OTT voucher for an `M280` Monthly Pass and prevents double-spending via atomic `redeemedOttPins` locking. |
| **5** | **Debounced Async Disk Flush (`saveServerPortalStore`) at 500+ Routers** | Performance | **Medium** | Low | Low | **RECOMMENDED AT >100 ROUTERS**: Replace synchronous `fs.writeFileSync` on every 15s heartbeat with an in-memory dirty flag and a 2-second coalesced atomic rename (`fs.promises.writeFile(tmp) -> fs.promises.rename(tmp, target)`) to eliminate disk I/O contention at 500+ routers. |
| **6** | **Abandoned USSD Payment Auto-Recovery Banner on Splash Page** | Revenue & Conversion | **High** | Low | Low | **RECOMMENDED**: Store `lastPendingTxId` in `sessionStorage` so if a subscriber switches apps to check an SMS and re-opens the captive portal, the splash page automatically resumes polling `/api/gateways/paylesotho/status/:txId` and displays their issued 16-digit OTT PIN. |
| **7** | **PostgreSQL Read/Write Migration via Connection Pool (`pgBouncer`)** | Scale (>1,000 Routers) | **Medium** | Medium | Low | **RECOMMENDED AT >250 ROUTERS**: Promote the existing `supabase/schema.sql` tables from async replica to primary transactional store using a local PostgreSQL 16 container in `docker-compose.yml`. |

---

## 14. Phase-by-Phase Sign-Off Checklist & Definition of Done

Every feature across Phases 0–10 satisfies the strict **Definition of Done**:
- [x] **Admin Control**: Every mode (`PAID_ONLY`, `FREE_TRIAL_AND_PAID`, `COMPLETELY_FREE`), package price, sponsor ad slide, and gateway credential is controllable from the Admin UI without code changes.
- [x] **Server-Side Enforcement**: Policy resolution, 1:1 OTT voucher price matching, 60-second heartbeat deadman timeout, and Partner API Key scope isolation are enforced on the server (`server.ts`).
- [x] **Validation & Safe Defaults**: New routers default to `pending_adoption` (`0/1 UP` in `WG Swarm`) and `PAID_ONLY` until explicitly changed or adopted.
- [x] **Audit Logging**: Administrative mutations, policy pushes, gateway updates, and voucher redemptions are recorded in the audit ledger.
- [x] **Living Documentation Updated**: `/blueprint.md`, `/push to local.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/DATA_MODEL.md`, `docs/API.md`, `docs/ROUTER_SETUP.md`, `docs/RUNBOOK.md`, and `docs/ROADMAP.md` are synchronized and committed.
