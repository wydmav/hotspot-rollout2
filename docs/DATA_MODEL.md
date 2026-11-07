# Data Model & Persistence Specification (`docs/DATA_MODEL.md`)

## 1. Storage Architecture
* **Primary Runtime Store**: `/app/data/server-portal-store.json` & `/app/data/portal-configs.json` (mounted on host VPS at `./data:/app/data`).
* **Cloud Relational Replica**: Supabase PostgreSQL (`supabase/schema.sql`).

## 2. Core Entities
1. **`tenant_groups`**: Group-level policy (`access_mode`, `free_duration_minutes`, `free_rate_limit`, `free_daily_quota_mb`, `scope`).
2. **`routers`**: Router inventory, WireGuard IP (`10.99.1.x`), `status` (`online` | `offline` | `pending_adoption`), `lastRealHeartbeatAt`, and per-router policy overrides.
3. **`hotspot_plans`**: Packages with `price` (in LSL `M`), `duration_minutes`, `download_speed_mbps`, `upload_speed_mbps`, and `scope`.
4. **`transactions`**: Payment records for `paylesotho` (`mpesa` `62915`, `ecocash` `63165430`, `card`) and `ottvoucher` (`ott_pin`) under merchant `T-Connect`.
5. **`issuedPayLesothoOttVouchers` & `redeemedOttPins`**: 16-digit OTT Voucher lifecycle tracking (`issued` $\rightarrow$ `copied` $\rightarrow$ `redeemed`) preventing double-spend.
6. **`guestEvents` (Captive Leads)**: Mandatory opt-in records (`fullName`, `phone`, `email`, `mac`, `scope`, `siteName`, `timestamp`).
7. **`partnerApiKeys` & `partnerWebhookLogs`**: Scoped read-only partner credentials (`tc_live_*`) and HMAC-signed outbound webhook logs.
8. **`audit_logs`**: Immutable administrative audit trail.
