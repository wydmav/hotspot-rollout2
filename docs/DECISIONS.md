# Architectural Decision Records (`docs/DECISIONS.md`)

## ADR-001: Access Control Method (RouterOS v7 Provisioning + FreeRADIUS Hybrid)
* **Context**: Multi-router hotspot monetization across 10 districts in Lesotho requires reliable session authentication, bandwidth rate limiting, and instant disconnect support.
* **Options**:
  1. *RouterOS API only*: Simple, but lacks standardized interim accounting across roaming sites.
  2. *FreeRADIUS only*: Standard AAA, but cannot push Walled Garden domains or custom `login.html` files to routers.
  3. *Hybrid RouterOS v7 HTTP/`.rsc` + FreeRADIUS AAA/CoA (Chosen)*: Uses `.rsc` heartbeat sync over WireGuard for router configuration and FreeRADIUS (`1812/1813/3799`) + local fallback for session AAA.

## ADR-002: Router-to-Cloud Connectivity Behind NAT & Starlink CGNAT
* **Context**: Field routers operate behind Starlink CGNAT and LTE NAT where inbound port-forwarding is impossible.
* **Options**:
  1. *Public Port Forwarding*: Rejected (impossible on CGNAT, severe security risk).
  2. *Outbound HTTP Polling Only*: Works through NAT, but prevents remote WinBox/WebFig management.
  3. *Native RouterOS v7 WireGuard (`10.99.0.0/16`, `persistent-keepalive=25s`) + 15s Outbound Heartbeat (Chosen)*: Traverses any CGNAT while keeping WinBox (`8291`) and WebFig (`80`) isolated to the encrypted tunnel.

## ADR-003: True `WG Swarm` Online Status (`60s` Real Heartbeat Timeout)
* **Context**: Previously, routers added in the UI or previously adopted stayed marked `online` (`1/1 UP`) even when unplugged.
* **Decision**: Enforce `REAL_HEARTBEAT_TIMEOUT_MS = 60_000` (3–4 missed 15s heartbeats). A router is `online` **only** when `Date.now() - lastRealHeartbeatAt <= 60_000`.

## ADR-004: Payment Gateways & Single Voucher Standard (16-Digit OTT Only)
* **Context**: Platform reconciliation requires a single unified payment and voucher pipeline under merchant name `T-Connect`.
* **Decision**: Only two gateways exist: **PayLesotho Aggregator** (M-Pesa `62915`, EcoCash `63165430`, Bearer `$10$KLstBWXvvqvOc91kSNUSs.Y9z2q3XFSHYcvHMLWab4ArDzbXB5tl2`) and **16-Digit OTT Voucher**. Mobile money payments issue a 16-digit OTT Voucher (`POST https://api.paylesotho.co.ls/api/ott/voucher/get`) verified via `POST https://api.paylesotho.co.ls/ott/voucher/check` and redeemed with strict 1:1 denomination matching.
