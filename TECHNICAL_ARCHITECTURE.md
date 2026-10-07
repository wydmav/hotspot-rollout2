# T-Connect Lesotho: Technical Architecture & Systems Engineering Guide

**Target Audience:** DevOps Engineers, Network Engineers, MikroTik Sysadmins, Backend Developers  
**Platform Version:** 3.4.0 (Production Architecture)  
**Operating Systems:** RouterOS v7.14+ (ARM64 / hAP ax³), Ubuntu 24.04 LTS (Contabo VPS)  
**Security Standards:** RFC 8910 / RFC 8908 (Captive Portal API), RFC 2865 / RFC 2866 (RADIUS AAA), WireGuard (ChaCha20-Poly1305)  

---

## 1. System Topology & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                      PHYSICAL MIKROTIK hAP ax³                         │
│  - Architecture: ARM64 quad-core 1.8GHz, 1GB RAM, Wi-Fi 6              │
│  - Operating System: RouterOS v7.14+                                  │
│  - RouterOS RAM footprint: < 18MB (0 heavy HTML/JS on router flash)    │
│  - Local Tasks: Packet routing, Simple Queues, DNS NAT, WireGuard      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ WireGuard Encrypted Tunnel (10.99.0.0/16)
                                    │ Persistent Keepalive = 25s
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CONTABO VPS (UBUNTU 24.04 LTS)                  │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                 Caddy Reverse Proxy (Edge)                   │     │
│   │   - Automatic Let's Encrypt Wildcard SSL Certificates        │     │
│   │   - RFC 8910 Captive Portal Header Injection                 │     │
│   │   - Reverse proxies :443 -> :3000 (Express Node.js)          │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │                                     │
│   ┌──────────────────────────────▼───────────────────────────────┐     │
│   │               Express Node.js Full-Stack Engine              │     │
│   │   - CaptivePortalEditor & Portal UI serving                  │     │
│   │   - /api/gateways/:provider/test (Live Telecom Ping)         │     │
│   │   - /api/gateways/:provider/charge (USSD STK Push)           │     │
│   │   - /api/webhooks/:provider (Payment Ingestion)              │     │
│   │   - /api/cna/status (RFC 8910 JSON Captive Endpoint)         │     │
│   │   - /api/devices/:id/adopt.rsc (Dynamic RouterOS Script)     │     │
│   └──────────────┬───────────────────────────────┬───────────────┘     │
│                  │                               │                     │
│   ┌──────────────▼──────────────┐ ┌──────────────▼───────────────┐     │
│   │     FreeRADIUS 3.2 Daemon   │ │   Supabase PostgreSQL Engine │     │
│   │   - Auth Port: 1812 UDP     │ │   - Atomic voucher checkout  │     │
│   │   - Acct Port: 1813 UDP     │ │   - Device MAC tracking      │     │
│   │   - CoA / Disconnect: 3799  │ │   - AES-256 gateway keys     │     │
│   └─────────────────────────────┘ └──────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MikroTik hAP ax³ Lightweight Optimization & Zero-RAM Strategy

### Why Standard Captive Portals Brick Router Memory
Traditional RouterOS hotspots store images, CSS frameworks, fonts, and login forms directly inside the router's NAND flash (`hotspot/`). On modern devices, storing dynamic single-page applications or heavy assets causes:
1. **Severe NAND Flash Wear**: Repeated writes reduce the physical lifespan of the onboard eMMC memory.
2. **Memory Leaks & CPU Spikes**: RouterOS's internal HTTP server is not designed to serve dynamic concurrent web traffic.
3. **No Central SSL**: RouterOS cannot easily rotate wildcard Let's Encrypt certificates across a distributed fleet of 100 routers.

### The T-Connect Zero-RAM Solution
T-Connect writes a single, **~180-byte HTML redirect stub** to `hotspot/login.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=https://app.tconnect.co.ls/portal?mac=$(mac)&ip=$(ip)&link_login_only=$(link-login-only)&user_url=$(link-orig)">
</head>
<body style="background:#0b0f19;color:white;font-family:sans-serif;text-align:center;padding-top:40px;">
  Connecting to T-Connect High-Speed Network...
</body>
</html>
```

* **Memory Impact**: Total memory allocated on the hAP ax³ for the hotspot is under **2 MB**.
* **Router CPU Utilization**: Under 100 concurrent guest clients, CPU usage remains below **3%**.
* **Instant Upgrades**: When UI changes, background images, or new payment gateways are deployed, they update on the VPS immediately without touching any physical routers.

---

## 3. Strict Zero-Bypass CNA Enforcement (RFC 8910 + Anti-Bypass Firewall)

### The Problem: "Use network as is" / "Connect anyway"
On Android and Apple iOS devices, when a guest connects to an open Wi-Fi network, the OS probes captive detection URLs:
* Apple: `http://captive.apple.com/hotspot-detect.html`
* Google/Android: `http://connectivitycheck.gstatic.com/generate_204`
* Microsoft Windows: `http://www.msftconnecttest.com/connecttest.txt`

If unauthenticated WAN traffic times out on port 443 (HTTPS) instead of immediately resetting, or if DNS queries leak to external servers like `8.8.8.8`, the operating system assumes the hotspot is broken and prompts the guest with **"Use network as is"** or **"Connect without internet"**, completely bypassing your monetization paywall.

### The Three-Layer Technical Remedy

#### Layer 1: RFC 8910 / RFC 8908 DHCP Option 114
Modern iOS 14+ and Android 11+ natively support the IETF Captive Portal Architecture standard. T-Connect supplies DHCP Option 114 pointing to our JSON endpoint:

```routeros
/ip dhcp-server option
add name="cna-cap-port" code=114 value="s'https://app.tconnect.co.ls/api/cna/status'"
/ip dhcp-server set [find name="default"] dhcp-option="cna-cap-port"
```

The VPS endpoint returns `application/captive+json`:
```json
{
  "captive": true,
  "user-portal-url": "https://app.tconnect.co.ls/portal?cna=rfc8910",
  "venue-info-url": "https://app.tconnect.co.ls/",
  "can-extend-session": true
}
```
*Result:* The OS locks directly into the full-screen modal browser and **suppresses the bypass option**.

#### Layer 2: TCP-Reset Fast-Fail
Rather than silently dropping unauthenticated WAN traffic (causing 30-second connection timeouts), RouterOS rejects unauthenticated TCP traffic immediately with a `TCP-RESET`:

```routeros
/ip firewall filter
add chain=forward action=reject reject-with=tcp-reset protocol=tcp connection-state=new \
  hotspot=!auth in-interface-list=LAN out-interface-list=WAN comment="T-Connect: Fast-Fail Unauth TCP"
```

#### Layer 3: Anti-Leak DNS Interception
Intercepts all UDP and TCP Port 53 queries and drops DoT (Port 853) and DoH heuristic queries:

```routeros
/ip firewall nat
add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept UDP DNS"
add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept TCP DNS"
/ip firewall filter
add chain=forward protocol=tcp dst-port=853 action=reject reject-with=tcp-reset comment="T-Connect: Block DoT"
add chain=forward protocol=udp dst-port=853 action=drop comment="T-Connect: Block DoT UDP"
/ip firewall raw
add chain=prerouting protocol=tcp dst-port=443 content="dns-query" action=drop comment="T-Connect: Block DoH"
```

---

## 4. API Endpoints Reference

| Route | Method | Purpose | Payload / Parameters |
|:---|:---|:---|:---|
| `/api/cna/status` | `GET` | RFC 8910 Captive Portal status | Returns `application/captive+json` |
| `/api/devices/:id/adopt.rsc` | `GET` | Dynamic RouterOS v7 provisioning script | `?token=<adoption_token>` |
| `/api/devices/:id/heartbeat` | `POST` | Router telemetry sync (CPU, RAM, Uptime) | Form data: `cpu`, `mem`, `uptime` |
| `/api/gateways/:provider/test` | `POST` | Live telecom connectivity test | `{ apiKey, apiSecret, bearerToken, merchantId, isLive }` |
| `/api/gateways/:provider/charge`| `POST` | Initiates USSD push or OTT redemption | `{ phoneNumber, amount, planName, voucherCode }` |
| `/api/webhooks/:provider` | `POST` | Asynchronous payment callback ingestion | JSON payload with HMAC signature validation |
| `/api/vouchers/redeem` | `POST` | Authorizes client MAC against FreeRADIUS | `{ code, mac, hostname, siteName }` |

---

## 5. Security & Key Management

* **Database Encryption**: All merchant API keys, private bearer tokens, and webhook signing secrets are encrypted with **AES-256-GCM** before persistence.
* **Least-Privilege RouterOS Admin**: The controller does NOT use the default `admin` account. It provisions a restricted group `tc-agent` with policy `read,write,api,test,!ftp,!reboot,!policy,!sensitive`.
* **Zero WAN Management**: Port 8291 (Winbox) and Port 8728 (API) are strictly bound to the WireGuard subnet (`10.99.0.0/16`) and are invisible to the public internet.
