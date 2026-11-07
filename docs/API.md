# REST API Reference (`docs/API.md`)

## 1. Router Adoption & Telemetry Watchdog
* **`GET /api/devices/:routerId/adopt.rsc`** — Generates the idempotent RouterOS v7 WireGuard + Hotspot + 15s Heartbeat provisioning script and records the initial adoption handshake.
* **`ALL /api/devices/:routerId/heartbeat`** & **`/heartbeat.rsc`** — Receives 15-second telemetry (`cpu`, `mem`, `uptime`, `sessions`), updates `lastRealHeartbeatAt = Date.now()`, marks the router `online`, and returns any queued `.rsc` policy commands.
* **`GET /api/devices/watchdog/status`** — Returns all monitored routers with live 60-second deadman evaluation (`status: 'online' | 'offline' | 'pending_adoption'`).
* **`POST /api/devices/:routerId/verify-handshake`** — Verifies whether a physical router has sent a real heartbeat within the last 60 seconds.

## 2. Payments & 16-Digit OTT Vouchers
* **`POST /api/gateways/paylesotho/initiate`** — Initiates live Vodacom M-Pesa (`62915`) or Econet EcoCash (`63165430`) USSD push under merchant `T-Connect` and issues a 16-digit OTT Voucher upon `INS-0` completion.
* **`GET /api/gateways/paylesotho/status/:transactionId`** — Verifies payment status with PayLesotho and triggers `POST https://api.paylesotho.co.ls/api/ott/voucher/get`.
* **`POST /api/gateways/paylesotho/ott/check`** — Proxies `POST https://api.paylesotho.co.ls/ott/voucher/check` with `{"unique_reference": "..."}`.
* **`POST /api/vouchers/redeem-ott`** — Redeems a 16-digit OTT Voucher PIN with strict 1:1 plan price matching (`voucherAmount === planPrice`).

## 3. Captive Portal, Ads & Partner API
* **`GET /api/portal/splash.html?scope=hotspot`** — Serves the compiled captive portal HTML for MikroTik routers.
* **`GET /api/portal/media-proxy?url=...`** — Walled-garden image proxy with local disk caching.
* **`GET /api/v1/partner/leads`** — Scoped partner lead retrieval (`X-API-Key: tc_live_...`).
