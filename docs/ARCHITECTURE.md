# T-Connect Control Tower — System Architecture (`docs/ARCHITECTURE.md`)

## 1. High-Level Topology

```
Guest Device (CNA Mini-Browser)
   │
   ├── 1. Wi-Fi Assoc & HTTP Redirect ──► MikroTik RouterOS v7 (WireGuard 10.99.1.x/16)
   │                                         │
   │                                         ├── UDP 51820 (25s keepalive)
   │                                         ├── 15s /heartbeat.rsc (60s Deadman Timeout)
   │                                         └── FreeRADIUS AAA (1812/1813) + CoA (3799)
   ▼                                         ▼
T-Connect Control Tower & Captive Portal (169.58.98.92:3000 / app.tconnect.co.ls)
   ├── Policy Engine (Router Override > Group Policy > Global Default)
   ├── Self-Hosted Ad Server (/api/portal/media-proxy + View Tokens)
   └── Payment Adapters:
       ├── PayLesotho Aggregator (Merchant: T-Connect | M-Pesa 62915 | EcoCash 63165430)
       └── 16-Digit OTT Voucher Issuance & 1:1 Redemption (/api/vouchers/redeem-ott)
```

## 2. Core Subsystems

1. **Backend API & Policy Engine (`server.ts`)**: Single source of truth resolving `Router Override > Group Policy > Global Default` across all 5 vertical scopes (`hotspot`, `community`, `park`, `bus`, `stadium`).
2. **Router Adoption & Watchdog Engine**: Generates RouterOS v7 `/adopt.rsc` scripts and enforces a strict **60-second real heartbeat timeout** (`lastRealHeartbeatAt <= 60_000ms`) so `WG Swarm` only reports `online` (`X/Y UP`) when physical routers are actively checking in.
3. **Captive Portal & Self-Hosted Ad Engine**: Serves zero-CDN splash pages, official Sesotho T&Cs, image carousels, and MP4/WebM video ads through the Walled-Garden Media Proxy.
4. **Payments & 16-Digit OTT Voucher Layer**: Integrates PayLesotho (`https://api.paylesotho.co.ls`) and OTT Lesotho (`https://api.ottlesotho.com`) with strict 1:1 package price matching.
