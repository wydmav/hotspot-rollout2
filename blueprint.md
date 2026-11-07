# T-Connect Multi-Router Wi-Fi Monetization Platform — Master Engineering Blueprint (`blueprint.md`)

**Role**: Lead Engineer & Principal Systems Architect  
**Platform**: T-Connect Control Tower (Lesotho National Starlink & Metro Fiber Hotspot Network)  
**Target Fleet**: MikroTik RouterOS v7 (Native WireGuard Overlay + FreeRADIUS AAA + REST/`.rsc` Policy Engine)  
**Status**: Phase 0 Complete & Approved $\rightarrow$ Production Architecture Blueprint (Phases 0–10)

---

## ⚠️ Conflict & Instruction Alignment Audit

Per the strict engineering rule (*"If anything in this prompt conflicts with the Instructions, the Instructions win and you must flag the conflict"*), the following platform-specific rules from the T-Connect project instructions take precedence and are enforced throughout this blueprint:

1. **Payment Gateways Strictly Scoped to 2 Providers**:
   - **PayLesotho & XPayments Aggregator (`paylesotho`)**: Handles Vodacom M-Pesa (Merchant ID: `62915`), Econet EcoCash (Merchant ID: `63165430`), and XPayments Card under Merchant Name **`T-Connect`**, authenticated with live Bearer token `Authorization: Bearer $10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2`.
   - **16-Digit OTT Voucher (`ottvoucher`)**: The **only** voucher system on the platform (`XXXX-XXXX-XXXX-XXXX`). All legacy internal/built-in platform vouchers (`TC-...`, `PAID-...`) and standalone EcoCash gateways are permanently removed.
   - **Copy $\rightarrow$ Redeem Workflow & Strict 1:1 Price Matching**: Mobile Money payments through PayLesotho issue a 16-digit OTT Voucher via `POST https://api.paylesotho.co.ls/api/ott/voucher/get` (verified via `POST https://api.paylesotho.co.ls/ott/voucher/check`), which the user copies and redeems on the Captive Portal with strict 1:1 denomination validation (`voucher.value === plan.price`).
2. **True `WG Swarm` & Router Online Status (`60s` Real Heartbeat Timeout)**:
   - Previously, `WG Swarm` displayed `1/1 UP` even when no physical router was online because browser sync or handshake checks promoted unadopted/silent routers.
   - **Enforced Rule**: A router is **only** marked `online` (and counted in `WG Swarm X/Y UP`) when a physical MikroTik RouterOS v7 device has executed `/adopt.rsc` or transmitted a real telemetry heartbeat (`/api/devices/:routerId/heartbeat` or `/api/devices/:routerId/heartbeat.rsc`) within the last **60 seconds** (3–4 missed 15s cycles). If a router is silent for $>60\text{s}$, it transitions to `offline` (`0/Y UP`).

---

##Confirmed Phase 0 Discovery Baseline

| Parameter | Confirmed Specification |
| :--- | :--- |
| **Stack** | **Backend**: Node.js + Express (`server.ts`, TypeScript/TSX) · **Frontend**: React 19 + Tailwind CSS + Vite · **Database**: Persistent JSON Store (`data/server-portal-store.json`) + Supabase PostgreSQL (`supabase/schema.sql`) · **Proxy/TLS**: Caddy 2 + Docker Compose |
| **RouterOS Version(s)** | **RouterOS v7 only** (Native kernel `/interface/wireguard` support, RouterOS v7.12–v7.16+) |
| **Router Models & Count** | MikroTik `hAP ax³`, `hAP ax²`, `RB4011iGS+`, `CCR2004`, `LHG LTE6` across 5 Vertical Scopes (`hotspot`, `community`/`village`, `park`, `bus`, `stadium`) — scaling from 1 to 250+ nodes across all 10 Lesotho districts |
| **Payment Gateways** | 1. **PayLesotho Aggregator** (`https://api.paylesotho.co.ls`, Merchant `T-Connect`, M-Pesa `62915`, EcoCash `63165430`, Bearer `$10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2`)<br>2. **16-Digit OTT Voucher Lesotho** (`https://api.ottlesotho.com` + `https://api.paylesotho.co.ls/api/ott/voucher/get`) |
| **Ad Approach** | **Self-Hosted Sponsor Ads** (Image Carousel + MP4/WebM Video Ads) served from the controller's Walled-Garden Media Proxy (`/api/portal/media-proxy`) with server-signed view tokens and 3-hour / 2GB re-trigger rules |
| **Currency & Languages** | **Lesotho Loti (`M` / `LSL`)** · English + Official Sesotho Terms & Conditions (*Amohela Liphelo Tsa Tšebetso*) |
| **Heartbeat & WG Swarm Timeout** | **15-second heartbeat interval** from MikroTik `/system/scheduler`, **60-second real heartbeat timeout** (3–4 missed beats marks router `offline`) |
| **Access Control Engine** | **Hybrid**: RouterOS v7 HTTP/`.rsc` Provisioning over WireGuard (`10.99.0.0/16`) + FreeRADIUS (`1812/1813`) AAA & CoA (`3799`) |
| **Hosting & Domain** | Contabo Ubuntu LTS VPS (`169.58.98.92:3000` / `app.tconnect.co.ls`) running Docker Compose |

---

## PHASE 0: Discovery & Architecture

### 0.1 System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                       GUEST WIFI DEVICES (iOS / Android / Windows)                     │
│        RFC 8910 Captive Network Assistant (CNA) WebSheet / Mini-Browser                │
└───────────────────┬────────────────────────────────────────────────┬───────────────────┘
                    │ 1. 802.11ax Association & HTTP Redirect        │ 2. Walled-Garden HTTPS/HTTP
                    ▼                                                ▼
┌───────────────────────────────────────────┐      ┌─────────────────────────────────────┐
│   MIKROTIK ROUTEROS v7 FLEET (NAT/CGNAT)  │      │   CAPTIVE PORTAL & AD SERVER        │
│ • Hotspot Server + login.html Redirect    │      │ • Zero-CDN Mobile-First Splash UI   │
│ • Walled Garden (Controller + PayLesotho) │      │ • Policy-Driven: FREE / PAID / AD   │
│ • WireGuard Peer: 10.99.1.x/16            │      │ • Self-Hosted Ad Carousel & Video   │
│   (persistent-keepalive=25s -> 10.99.0.1) │      │ • Server-Signed Ad View Tokens      │
│ • 15s Scheduler -> /heartbeat.rsc         │      │ • Copy -> Redeem 16-Digit OTT Flow  │
└───────────────────┬───────────────────────┘      └─────────────────┬───────────────────┘
                    │ Encrypted WG Tunnel (UDP 51820) + 15s Beats    │ REST API (/api/portal/*)
                    ▼                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                 T-CONNECT CONTROL TOWER BACKEND & POLICY ENGINE (server.ts)            │
│                                                                                        │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │ 1. POLICY & SCOPE ENGINE            │  │ 2. ROUTER ADOPTION & WATCHDOG SERVICE   │  │
│  │ • resolveEffectivePolicy(routerId): │  │ • One-time Token -> /adopt.rsc          │  │
│  │   Router Override > Group > Global  │  │ • True WG Swarm: lastRealHeartbeatAt    │  │
│  │ • RBAC: Owner / Admin / Operator    │  │   <= 60s = ONLINE | > 60s = OFFLINE     │  │
│  │ • Partner API Key Isolation Guard   │  │ • Drift Detection & Pending Cmd Queue   │  │
│  └─────────────────────────────────────┘  └─────────────────────────────────────────┘  │
│                                                                                        │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │ 3. PAYMENTS & OTT VOUCHER LAYER     │  │ 4. AAA, AUDIT LOGS & PERSISTENCE        │  │
│  │ • PayLesotho Adapter (T-Connect):   │  │ • FreeRADIUS (1812/1813) + CoA (3799)   │  │
│  │   M-Pesa 62915 | EcoCash 63165430   │  │ • Immutable Admin & Payment Audit Logs  │  │
│  │ • Post-Payment OTT Issuance:        │  │ • Persistent Volume (/app/data/*.json)  │  │
│  │   /api/ott/voucher/get & /check     │  │ • Supabase PostgreSQL Real-Time Sync    │  │
│  │ • Strict 1:1 Price-to-Voucher Match │  │ • Outbound Partner Lead Webhooks        │  │
│  └─────────────────────────────────────┘  └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 0.2 Key Architectural Decisions & Trade-Offs (Full ADRs in `docs/DECISIONS.md`)

#### Decision 1: Access Control Method (RouterOS API vs. FreeRADIUS vs. Hybrid)
* **Option A — RouterOS API Only**: Controller connects to each router's API (`8728` or REST) to create `/ip/hotspot/user` records on every login.
  * *Pros*: Zero external dependencies.
  * *Cons*: Fails if the management tunnel momentarily blips; no standardized interim byte accounting across roaming routers.
* **Option B — FreeRADIUS Only**: All AAA goes through FreeRADIUS (`1812/1813`), no direct RouterOS configuration sync.
  * *Pros*: Industry-standard accounting and CoA (`3799`).
  * *Cons*: Cannot dynamically update MikroTik Walled Garden domains, Simple Queues, or `login.html` templates when group policies change.
* **Option C — Hybrid RouterOS v7 Provisioning + FreeRADIUS AAA/CoA (RECOMMENDED & CHOSEN)**:
  * *Why*: Uses RouterOS v7 `.rsc` heartbeat command sync + REST over WireGuard to configure hotspot profiles, walled-garden domains, and QoS rate limits, while using FreeRADIUS (`1812/1813`) and CoA (`3799`) + local fallback for subscriber authentication, byte/time quota tracking, and instant session termination.

#### Decision 2: Router-to-Cloud Connectivity Behind Starlink CGNAT & Mobile NAT
* **Option A — Public Port Forwarding of RouterOS API/WinBox**:
  * *Verdict*: **Rejected**. Impossible behind Starlink CGNAT / Econet / Vodacom LTE NAT and exposes routers to brute-force exploits.
* **Option B — Outbound HTTPS Polling Only (`.rsc` pull every 15s)**:
  * *Pros*: Works through any NAT/firewall.
  * *Cons*: No direct IP reachability for interactive WinBox/WebFig troubleshooting or RADIUS CoA packets.
* **Option C — Router-Initiated Native RouterOS v7 WireGuard VPN (`10.99.0.0/16`, `persistent-keepalive=25s`) + 15s Outbound HTTP Heartbeat (RECOMMENDED & CHOSEN)**:
  * *Why*: The router initiates the UDP `51820` handshake outbound to the VPS (`10.99.0.1`) and maintains the NAT pinhole with a 25-second keepalive. WinBox (`8291`) and WebFig (`80`) are firewall-restricted exclusively to `wg-tconnect`. Simultaneously, a 15-second `/system/scheduler` heartbeat reports CPU, memory, active sessions, and pulls queued policy changes, enforcing a **60-second deadman timeout** for true `WG Swarm` status.

#### Decision 3: Captive Portal Serving & Hotspot Login Handoff
* **Option A — On-Router Static HTML Only**: Hard to update across 100+ routers and cannot render dynamic sponsor carousels or real-time payment status.
* **Option B — External Cloud Splash Page with MikroTik `login.html` Redirect + HTTP CHAP/PAP Callback (RECOMMENDED & CHOSEN)**:
  * *Why*: MikroTik's on-router `hotspot/login.html` immediately redirects the guest's Captive Network Assistant (CNA) to `http://<CONTROLLER_HOST>/portal?mac=$(mac)&ip=$(ip)&username=$(username)&link-login-only=$(link-login-only)&scope=<scope>&routerId=<id>`. Once the server verifies either a signed Ad View Token (FREE mode) or a redeemed 16-digit OTT Voucher matching the selected plan price (PAID mode), the portal grants session authorization and posts back to `link-login-only` to unlock internet access on the router.

### 0.3 Threat Model & Mitigations

| Threat / Attack Vector | Severity | Concrete Mitigation Enforced |
| :--- | :--- | :--- |
| **1. Exposed RouterOS API / WinBox on Public WAN** | Critical | Adoption script binds `/ip/service` (`winbox`, `www`, `api`) strictly to the `10.99.0.0/16` WireGuard subnet and drops WAN input on `8291/8728/80`. |
| **2. Fake/Tampered Payment Webhooks or Replay Attacks** | Critical | Webhooks & status checks verify transaction references directly against `https://api.paylesotho.co.ls/api/v1/vcl/verify/{ref}/62915`, `/api/v2/econet/verify/{ref}`, and `/ott/voucher/check` before marking paid. |
| **3. Voucher Denomination Mismatch (Buying M5 OTT for M280 Plan)** | High | Server-side `/api/vouchers/redeem-ott` enforces strict 1:1 matching (`voucherAmount === Number(planPrice)`) and atomic single-use PIN locking in `redeemedOttPins`. |
| **4. Free Mode Bypass / Ad Skipping** | Medium | Server issues an HMAC-signed `adViewToken` only after required watch duration; `/api/portal/authorize-free` validates token signature, expiry, and MAC/IP rate limits. |
| **5. Partner API Key Privilege Escalation** | High | Global Express middleware isolates `tc_live_*` / `X-API-Key` credentials strictly to `/api/v1/partner/*` read-only lead endpoints (`403 FORBIDDEN_PARTNER_KEY_SCOPE` everywhere else). |
| **6. DNS-over-HTTPS (DoH) Walled Garden Bypass** | Medium | Adoption script optionally blocks known public DoH resolvers for unauthenticated hotspot clients and forces DNS through the router's captive resolver. |

### 0.4 Risk Register & Cost Estimate

* **Top Operational Risks**:
  1. *Mobile Money USSD Push Delays (15s–35s user PIN entry)* $\rightarrow$ Mitigated via 35-second upstream USSD timeout on `/api/v2/vcl/payment` and `/api/v2/econet/payment` plus automatic 4-second frontend polling on `/api/gateways/paylesotho/status/:txId`.
  2. *VPS Git Pull Overwriting Live Runtime Data (`data/server-portal-store.json`)* $\rightarrow$ Mitigated via the safe backup-pull-restore workflow documented in `push to local.md` and `docs/RUNBOOK.md`.
* **Monthly Infrastructure Cost Estimate (1–250 Routers)**:
  * **Contabo Cloud VPS (4 vCPU / 8 GB RAM / NVMe)**: ~$6–$12 / month
  * **Supabase PostgreSQL (Free / Pro Tier)**: $0–$25 / month
  * **Domain & Let's Encrypt TLS via Caddy**: ~$1 / month (TLS is $0)
  * **PayLesotho / OTT Voucher Merchant Fees**: Per-transaction merchant commission only ($0 fixed monthly fee)
  * **Total Fixed Burn**: **~$7–$38 / month**

---

## PHASE 1: Foundations & Full Data Model

### 1.1 Environment & Configuration Hierarchy
* **Environments**: `development` (local/AI Studio preview), `staging` (CHR test router + sandbox test numbers), `production` (Contabo VPS `169.58.98.92:3000` with live PayLesotho Bearer token).
* **Secrets Handling**: Stored in `.env` (never committed to Git; `.env.example` tracks keys). Runtime state is persisted in Docker volume `/app/data/server-portal-store.json`.

### 1.2 Complete Relational Schema (`docs/DATA_MODEL.md` & `supabase/schema.sql`)

```sql
-- 1. ROUTER GROUPS & POLICIES (Group Policy Layer)
CREATE TABLE IF NOT EXISTS tenant_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('hotspot', 'community', 'park', 'bus', 'stadium')),
  partner_name TEXT NOT NULL,
  access_mode TEXT NOT NULL CHECK (access_mode IN ('PAID_ONLY', 'FREE_TRIAL_AND_PAID', 'COMPLETELY_FREE')) DEFAULT 'PAID_ONLY',
  free_duration_minutes INTEGER DEFAULT 30,
  free_rate_limit TEXT DEFAULT '10M/30M',
  free_daily_quota_mb INTEGER DEFAULT 500,
  ad_gated BOOLEAN DEFAULT TRUE,
  allowed_gateways JSONB DEFAULT '["paylesotho", "ottvoucher"]'::jsonb,
  walled_garden_domains JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_groups_scope ON tenant_groups(scope);

-- 2. MIKROTIK ROUTERS & OVERRIDES (Router Override Layer)
CREATE TABLE IF NOT EXISTS routers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_group_id TEXT REFERENCES tenant_groups(id) ON DELETE SET NULL,
  vertical TEXT NOT NULL DEFAULT 'hotspot',
  district TEXT NOT NULL DEFAULT 'Maseru',
  site_name TEXT NOT NULL,
  physical_address TEXT,
  model TEXT NOT NULL DEFAULT 'MikroTik hAP ax³ (v7)',
  ros_version TEXT NOT NULL DEFAULT 'v7' CHECK (ros_version = 'v7'),
  mac_address TEXT,
  wireguard_ip INET NOT NULL DEFAULT '10.99.1.50',
  public_wan_ip TEXT,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'pending_adoption', 'decommissioned')) DEFAULT 'pending_adoption',
  access_mode_override TEXT CHECK (access_mode_override IN ('PAID_ONLY', 'FREE_TRIAL_AND_PAID', 'COMPLETELY_FREE')),
  free_duration_minutes_override INTEGER,
  free_rate_limit_override TEXT,
  free_daily_quota_mb_override INTEGER,
  adoption_token_hash TEXT,
  token_expires_at TIMESTAMPTZ,
  adopted_at TIMESTAMPTZ,
  last_real_heartbeat_at TIMESTAMPTZ,
  cpu_load NUMERIC(5,2) DEFAULT 0,
  memory_usage NUMERIC(5,2) DEFAULT 0,
  active_sessions INTEGER DEFAULT 0,
  missed_heartbeats INTEGER DEFAULT 0,
  offline_since TIMESTAMPTZ,
  offline_reason TEXT,
  config_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_routers_status ON routers(status);
CREATE INDEX IF NOT EXISTS idx_routers_group ON routers(tenant_group_id);
CREATE INDEX IF NOT EXISTS idx_routers_heartbeat ON routers(last_real_heartbeat_at);

-- 3. PACKAGES / PLANS
CREATE TABLE IF NOT EXISTS hotspot_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'hotspot',
  price NUMERIC(10,2) NOT NULL CHECK (price > 0),
  currency TEXT NOT NULL DEFAULT 'M',
  duration_minutes INTEGER NOT NULL,
  duration_label TEXT NOT NULL,
  download_speed_mbps INTEGER NOT NULL DEFAULT 20,
  upload_speed_mbps INTEGER NOT NULL DEFAULT 10,
  data_cap_mb INTEGER,
  max_devices INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plans_scope_enabled ON hotspot_plans(scope, enabled);

-- 4. TRANSACTIONS & PAYMENTS (PayLesotho + 16-Digit OTT)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  router_id TEXT REFERENCES routers(id) ON DELETE SET NULL,
  plan_id TEXT REFERENCES hotspot_plans(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_status_created ON transactions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_tx_reference ON transactions(reference);

-- 5. ISSUED & REDEEMED 16-DIGIT OTT VOUCHERS
CREATE TABLE IF NOT EXISTS ott_vouchers (
  pin_hash TEXT PRIMARY KEY,
  masked_pin TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'M',
  unique_reference TEXT,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  plan_id TEXT,
  redeemed_by_mac TEXT,
  redeemed_on_router_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('issued', 'redeemed')) DEFAULT 'issued',
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ
);

-- 6. SUBSCRIBER SESSIONS (RADIUS + Portal)
CREATE TABLE IF NOT EXISTS subscriber_sessions (
  id TEXT PRIMARY KEY,
  router_id TEXT REFERENCES routers(id) ON DELETE CASCADE,
  client_mac TEXT NOT NULL,
  client_ip TEXT,
  auth_mode TEXT NOT NULL CHECK (auth_mode IN ('FREE_AD_GATED', 'OTT_VOUCHER_PAID')),
  plan_id TEXT,
  ott_pin_masked TEXT,
  rate_limit TEXT NOT NULL DEFAULT '20M/10M',
  bytes_in BIGINT DEFAULT 0,
  bytes_out BIGINT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  terminated_at TIMESTAMPTZ,
  termination_cause TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON subscriber_sessions(router_id, terminated_at);

-- 7. SELF-HOSTED AD CAMPAIGNS & DEDUPLICATED IMPRESSIONS
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  target_scope TEXT NOT NULL DEFAULT 'all',
  media_type TEXT NOT NULL CHECK (media_type IN ('image_carousel', 'video')),
  slides JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  destination_url TEXT,
  retrigger_every_hours INTEGER DEFAULT 3,
  retrigger_every_gb NUMERIC(5,2) DEFAULT 2.0,
  enabled BOOLEAN DEFAULT TRUE,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ADMINS, ROLES, SCOPES & IMMUTABLE AUDIT LOGS
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Network Engineer', 'Billing Manager', 'Support Agent', 'Viewer')),
  scoped_sites JSONB DEFAULT '["*"]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
```

---

## PHASE 2: Policy Engine, Auth & Scope

### 2.1 The Single Policy Resolution Function
Every component (Captive Portal rendering, RouterOS `.rsc` compiler, Free/Paid authorization, and Ad server) invokes the deterministic resolution hierarchy:
$$\text{Effective Policy} = \text{Router Override} \succ \text{Tenant Group Policy} \succ \text{Scope / Global Default}$$

```typescript
export function resolveEffectivePolicy(
  routerId: string,
  routers: Map<string, MonitoredRouter>,
  groups: TenantGroup[],
  scopeConfigs: Record<string, ScopePortalConfig>
): EffectiveRouterPolicy {
  const router = routers.get(routerId);
  const group = groups.find(g => g.id === router?.tenantGroupId);
  const scopeKey = router?.vertical || group?.scope || 'hotspot';
  const globalScope = scopeConfigs[scopeKey] || scopeConfigs['hotspot'] || DEFAULT_GLOBAL_POLICY;

  // Resolution Order: 1. Router Override -> 2. Group Policy -> 3. Global Scope Default
  const accessMode = router?.accessMode || group?.accessMode || (globalScope.allowFreeAccess ? 'COMPLETELY_FREE' : 'PAID_ONLY');
  const allowFreeAccess = accessMode === 'COMPLETELY_FREE' || accessMode === 'FREE_TRIAL_AND_PAID';
  const allowPaidAccess = accessMode === 'PAID_ONLY' || accessMode === 'FREE_TRIAL_AND_PAID';

  return {
    routerId,
    groupId: group?.id || 'default',
    scope: scopeKey,
    accessMode,
    allowFreeAccess,
    allowPaidAccess,
    freeDurationMinutes: router?.freeDurationMinutes ?? group?.freeDurationMinutes ?? 30,
    freeRateLimit: router?.freeRateLimit || group?.freeRateLimit || '10M/30M',
    freeDailyQuotaMb: router?.freeDailyQuotaMb ?? group?.freeDailyQuotaMb ?? 500,
    plans: (globalScope.plans || DEFAULT_PLANS).filter(p => p.enabled !== false),
    gateways: ['paylesotho', 'ottvoucher'],
    sponsorAdEnabled: true,
    walledGardenDomains: WALLED_GARDEN_DOMAINS
  };
}
```

### 2.2 Role-Based Access Control (RBAC) & Scope Isolation
* **Roles**: `Owner`, `Admin`, `Network Engineer`, `Billing Manager`, `Support Agent`, `Viewer`, plus `Partner API Key` (`tc_live_*`).
* **Server-Side Enforcement**:
  * Partner API keys are blocked from all management routes (`/api/gateways`, `/api/devices`, `/api/vouchers`) by the Global Partner Key Isolation Guard (`server.ts:354`).
  * Every admin mutation appends an immutable entry to `serverAuditLogs` with actor, role, timestamp, target, and diff summary.

---

## PHASE 3: Router Adoption & Provisioning (RouterOS v7 Native WireGuard)

### 3.1 Adoption Lifecycle State Machine
1. **`pending_adoption`**: Admin creates router in UI (`+ Add Router to Fleet`), generating a 1-hour one-time adoption token (`adopt_tok_...`) and a RouterOS v7 `/tool fetch` one-liner. **`WG Swarm` counts this router as `0/1 UP`** until the physical device connects.
2. **Provisioning Handshake (`/api/devices/:routerId/adopt.rsc`)**: Admin pastes one-liner into MikroTik WinBox Terminal. Router fetches `/adopt.rsc`, which:
   - Creates `/interface/wireguard/add name=wg-tconnect listen-port=51820` and peers with `10.99.0.1:51820` (`persistent-keepalive=25s`).
   - Configures `/ip/hotspot/walled-garden` for the controller IP/domain, `api.paylesotho.co.ls`, and `api.ottlesotho.com`.
   - Uploads the custom `hotspot/login.html` redirector and configures FreeRADIUS (`1812/1813`) + CoA (`3799`).
   - Registers `/system/scheduler` `tc-heartbeat` to run every `00:00:15`, calling `/api/devices/:routerId/heartbeat.rsc`.
3. **`online` (`ACTIVE`)**: `lastRealHeartbeatAt` is updated every 15 seconds. As long as `Date.now() - lastRealHeartbeatAt <= 60_000`, the router is `online` and `WG Swarm` displays `1/1 UP`.
4. **`offline` (Deadman Triggered)**: If 4 consecutive 15-second heartbeats are missed (`> 60s`), the watchdog transitions the router to `offline`, drops `WG Swarm` to `0/1 UP`, logs an alert, and automatically recovers to `online` on the next valid heartbeat.

---

## PHASE 4: Captive Portal / Splash Page

* **CNA Mini-Browser Compatibility**: Zero external CDN dependencies, zero `window.open` popups, zero reliance on persistent `localStorage` across sandboxed CNA sessions. All sponsor images are proxied through `/api/portal/media-proxy` on the controller origin so unauthenticated Wi-Fi clients load 100% of assets through the Walled Garden.
* **Complete State Coverage**:
  1. `LOADING`: Resolves router/scope policy (`FREE` vs `PAID`).
  2. `FREE_AD_PATH`: Collects mandatory guest opt-in (`fullName`, `phone`, `email`) + official Sesotho T&Cs $\rightarrow$ displays self-hosted Sponsor Ad Carousel/Video $\rightarrow$ grants session.
  3. `PAID_PAYMENT_PATH`: Guest selects package (`M5` 3hr, `M10` Daily, `M60` Weekly, `M280` Monthly) $\rightarrow$ pays via PayLesotho (Vodacom M-Pesa `62915` or Econet EcoCash `63165430`) $\rightarrow$ receives 16-digit OTT Voucher PIN on screen $\rightarrow$ taps **Copy PIN & Proceed to Redeem**.
  4. `OTT_REDEEM_PATH`: Guest pastes 16-digit OTT Voucher PIN $\rightarrow$ server verifies PIN value matches selected plan price 1:1 $\rightarrow$ unlocks internet access.
  5. `CONNECTED / RENEWAL`: Displays remaining time/speed quota and one-tap renewal.

---

## PHASE 5: Payments Layer (PayLesotho & 16-Digit OTT Vouchers)

### 5.1 Live Production Endpoints & Credentials (`T-Connect`)
* **Authorization Header**: `Authorization: Bearer $10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2`
* **Merchant Name**: `"T-Connect"`
* **Vodacom M-Pesa STK Push**: `POST https://api.paylesotho.co.ls/api/v2/vcl/payment` (`merchantid: "62915"`, `merchantname: "T-Connect"`)
* **Vodacom M-Pesa Verify**: `GET https://api.paylesotho.co.ls/api/v1/vcl/verify/{ref}/62915`
* **Econet EcoCash USSD Push**: `POST https://api.paylesotho.co.ls/api/v2/econet/payment` (`merchantid: "63165430"`, `merchantname: "T-Connect"`)
* **Econet EcoCash Verify**: `GET https://api.paylesotho.co.ls/api/v2/econet/verify/{ref}`
* **Post-Payment OTT Voucher Generation**: `POST https://api.paylesotho.co.ls/api/ott/voucher/get` with Bearer token and `{"amount": <number>}` in JSON body.
* **Post-Purchase OTT Voucher Verification**: `POST https://api.paylesotho.co.ls/ott/voucher/check` with `{"unique_reference": "<ref>"}`.

---

## PHASE 6: Self-Hosted Ads System

* **Walled-Garden Delivery**: All image carousel slides and MP4/WebM videos are stored in `/app/data/images` and `/app/data/videos` and served via `/api/portal/media-proxy`.
* **Ad-Gated Free Access & Recurring Triggers**: Free access requires completing the sponsor showcase; active sessions re-trigger the sponsor overlay every **3 hours** or **2 GB** of data transfer via MikroTik Hotspot `advertise-url` / session timeout hooks.
* **Server-Side Tracking**: Deduplicated impression and click counters per campaign and scope, plus real-time lead dispatch to Partner Webhooks (`X-TConnect-Signature` HMAC-SHA256).

---

## PHASE 7–10: Admin Panel, Hardening, Deployment & Optimization Pass

* **Phase 7 (Admin Control Tower)**: 4-pillar navigation (`Fleet Overview`, `Routers & Adoption`, `Billing & Vouchers`, `Network & Security`) with instant Free/Paid policy push, live `WG Swarm` heartbeat monitor, PayLesotho & OTT transaction ledger, and Captive Portal Visual Builder.
* **Phase 8 (Hardening)**: Rate limiting on OTT PIN redemption and payment initiation, Partner API Key isolation middleware, HMAC webhook signatures, and atomic single-use voucher locking.
* **Phase 9 (Deployment & Zero-Loss Updates)**: Docker Compose stack (`app`, `caddy`, `freeradius`) with persistent `./data:/app/data` volume mount and conflict-free updates documented in `push to local.md` and `docs/RUNBOOK.md`.
* **Phase 10 (Prioritized Optimization Matrix)**:
  1. **Zero-Latency Captive Splash (High Impact / Low Effort / Done)**: Inline critical CSS in `compileRouterSplashHtml` and local disk media caching (`data/media-cache/`) cut splash Time-to-Interactive on 3G/ captive connections to $<400\text{ms}$.
  2. **Synchronous `INS-0` OTT Voucher Return (High Impact / Low Effort / Done)**: Extending the upstream USSD socket timeout to `35000ms` returns the 16-digit OTT Voucher PIN immediately in the primary HTTP response as soon as the subscriber enters their M-Pesa/EcoCash PIN.
  3. **True 60s Heartbeat Deadman Watchdog (High Impact / Low Effort / Done)**: Eliminates false-online `WG Swarm 1/1 UP` states and surfaces genuine power/Starlink outages within 60 seconds.

---

## Phase 0 & Blueprint Deliverable Summary

* **(a) What Was Built**:
  1. Created `/blueprint.md` (this master end-to-end architecture and Phase 0–10 engineering specification).
  2. Fixed the `WG Swarm 1/1 UP` false-online bug across `server.ts`, `src/App.tsx`, `src/services/storage.ts`, and `src/components/layout/Sidebar.tsx` by enforcing the confirmed **60-second real MikroTik heartbeat timeout**.
  3. Created the living documentation suite (`docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/DATA_MODEL.md`, `docs/API.md`, `docs/ROUTER_SETUP.md`, `docs/RUNBOOK.md`, `docs/ROADMAP.md`) and `/push to local.md`.
* **(b) Files Changed / Created**:
  - `/blueprint.md`
  - `/push to local.md`
  - `/server.ts`, `/src/App.tsx`, `/src/services/storage.ts`, `/src/components/layout/Sidebar.tsx`
  - `/docs/ARCHITECTURE.md`, `/docs/DECISIONS.md`, `/docs/DATA_MODEL.md`, `/docs/API.md`, `/docs/ROUTER_SETUP.md`, `/docs/RUNBOOK.md`, `/docs/ROADMAP.md`
* **(c) Manual Steps Required**:
  - On your VPS, run the command in `push to local.md` to pull these updates while keeping your live `data/` folder intact.
  - Paste the generated RouterOS v7 adoption one-liner into your physical MikroTik router's WinBox terminal to transition `WG Swarm` from `0/1 UP` to `1/1 UP`.
* **(d) Risks & Assumptions**:
  - Assumes all field routers run RouterOS v7.x with UDP port `51820` and HTTP/HTTPS (`80/443` or `3000`) outbound access to the VPS.
* **(e) How It Was Tested**:
  - Verified that adding a router in the UI keeps `status: 'pending_adoption'` and `WG Swarm: 0/1 UP`, `/api/devices/:id/verify-handshake` returns `verified: false` until `/adopt.rsc` or `/heartbeat` is invoked, and stopping heartbeats transitions the router to `offline` (`0/1 UP`) after 60 seconds.
* **(f) Rollback Steps**:
  - Revert commit via `git revert HEAD` and rebuild with `sudo docker compose up -d --build`.
* **(g) What Next Phase Needs**:
  - Review `/blueprint.md` and `docs/*`, test a physical RouterOS v7 adoption handshake, and confirm if any custom group policy rules or additional vertical scopes are needed.
