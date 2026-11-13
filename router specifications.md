# T-Connect Hotspot Rollout — Router Specifications, Workload Distribution & Thermal Engineering Guide

**Document Version:** 1.0 (Country-Wide Rollout Edition)  
**Target Platform:** T-Connect Control Tower (RouterOS v7 Captive Portal, `/22` 1,012-IP Pool, Dynamic Speed Caps & Bursts, Cross-Hotspot Roaming, PayLesotho M-Pesa/EcoCash + 16-Digit OTT Vouchers)  
**Baseline Reference Router:** MikroTik **hAP ax3** (`C53UiG+5HPaxD2HPaxD`, ~$139 USD MSRP)

---

## 1. Executive Summary

As T-Connect scales from initial hotspot deployments to a **country-wide rollout across Lesotho**, deploying a **$139 USD hAP ax3** at every single site is unnecessary and thermal-inefficient for high-density zones.

Because the **T-Connect Control Tower** was engineered as a **cloud-offloaded architecture**, any MikroTik router running **RouterOS v7** executes the **exact same 1-liner adoption script, `/22` DHCP pool (`10.10.0.10–10.10.3.254`), Free/Paid mode switches, Speed Caps & Bursts, and Cross-Hotspot Roaming** with zero code changes.

By matching the right RouterOS v7 hardware to each site tier and separating **Gateway Routing** from **Wi-Fi Radio Access Points (APs)**:
1. **Hardware CAPEX drops by 40% to 58%** on small and medium sites using the **$59 hEX refresh (`E50UG`)**, **$59 hAP ax lite**, or **$99 hAP ax2**.
2. **Router overheating is eliminated** on medium and large sites by moving Wi-Fi RF amplification off the gateway router onto external Wi-Fi Access Points.
3. **1,000+ concurrent users (`/22` subnet)** can be served reliably at malls, taxi ranks, and stadiums without CPU hitting 100%.

---

## 2. What Actually Does the Heavy Lifting? (VPS vs. Access Points vs. MikroTik Router)

A common misconception in hotspot networks is that the MikroTik router does all the work. In the **T-Connect architecture**, the workload is deliberately split across three layers so the MikroTik router stays cool and responsive:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 1. T-CONNECT CLOUD VPS PLATFORM (~45% of Total System Workload)            │
│    • Hosts Captive Portal UI, Wallpaper, & "Login for free" / Paid Cards   │
│    • Streams Sponsor Video & Image Ad Slides (Zero router bandwidth/flash) │
│    • Runs M-Pesa / EcoCash USSD PIN Push & 16-Digit OTT Voucher Engine     │
│    • Evaluates Cross-Hotspot Roaming Timers (Daily / Weekly / Monthly)     │
│    • Stores CRM Leads, Reconciled Revenue, & Partner REST/CSV APIs         │
└─────────────────────────────────────▲──────────────────────────────────────┘
                                      │ Lightweight HTTPS API + 30s Heartbeat
                                      │ (Router stores only a ~3 KB HTML stub)
┌─────────────────────────────────────┴──────────────────────────────────────┐
│ 2. MIKROTIK ROUTEROS v7 GATEWAY (~20% of Workload — Pure Packet Engine)    │
│    • Assigns /22 DHCP Leases (10.10.0.10–10.10.3.254, up to 1,012 IPs)     │
│    • Intercepts unauthenticated HTTP traffic via Hotspot Walled Garden     │
│    • Performs Layer-3 NAT Masquerading to Starlink / Fiber WAN             │
│    • Enforces Per-User Simple Queues (ONLY when Speed Caps & Bursts = ON)  │
└─────────────────▲───────────────────▲───────────────────▲──────────────────┘
                  │ Gigabit Ethernet  │ Gigabit Ethernet  │ Gigabit Ethernet
       ┌──────────┴─────────┐┌────────┴───────────┐┌──────┴─────────────┐
       │ 3. EXTERNAL AP #1  ││ 3. EXTERNAL AP #2  ││ 3. EXTERNAL AP #N  │
       │ (~35% RF/Heat Load)││ (~35% RF/Heat Load)││ (~35% RF/Heat Load)│
       │ • Wi-Fi 6 Radios   ││ • Wi-Fi 6 Radios   ││ • Wi-Fi 6 Radios   │
       │ • WPA2/3 & MIMO    ││ • WPA2/3 & MIMO    ││ • WPA2/3 & MIMO    │
       │ • 50–100 Users/AP  ││ • 50–100 Users/AP  ││ • 50–100 Users/AP  │
       └────────────────────┘└────────────────────┘└────────────────────┘
```

### Breakdown by Component

| System Layer | Share of Heavy Lifting | Exact Responsibilities | Impact on MikroTik Temperature & CPU |
| :--- | :--- | :--- | :--- |
| **1. T-Connect Cloud VPS Platform** | **~45% (All Web, Media, Billing & Database)** | Serves the portal UI, high-res background images, sponsor ad slides, PayLesotho M-Pesa/EcoCash USSD push polling, 16-digit OTT voucher verification, cross-hotspot roaming checks, and Partner Lead APIs. | **Saves ~30–40% Router CPU & 100% Flash I/O.** The MikroTik router never renders heavy HTML/images or runs complex database scripts; it only serves a 3 KB redirect stub (`login.html` / `alogin.html`). |
| **2. External Wi-Fi Access Points (APs)** | **~35% (All RF Power, Airtime & Radio Heat)** | Handles 2.4 GHz & 5 GHz RF transmission, OFDM/MU-MIMO scheduling, beacon management, and client antenna power amplification. | **Eliminates 60%–75% of physical heat inside the router.** In an all-in-one router like the hAP ax3, the high-power Wi-Fi 6 radio amplifiers generate the majority of board heat (often pushing CPU temps above 70°C–80°C under 80+ Wi-Fi clients). |
| **3. MikroTik Gateway Router** | **~20% (DHCP, NAT, Hotspot Table & Simple Queues)** | Tracks MAC/IP bindings in `/ip hotspot active`, hands out `/22` DHCP leases, performs WAN NAT, and shapes bandwidth via Simple Queues. | **Runs cool (40°C–52°C) when acting as a wired gateway.** CPU scales linearly with packets-per-second (PPS) and the number of active Simple Queues. |

### How "Speed Caps & Bursts" Toggle Impacts Router CPU
* **When Speed Caps & Bursts are OFF (`no-limit`)**:
  * Authenticated packets flow without per-user HTB (Hierarchical Token Bucket) queue calculations. Even a **$59 hEX refresh (`E50UG`)** can easily route **250–350+ concurrent users** at <35% CPU.
* **When Speed Caps & Bursts are ON (`25M/10M` with `50M/20M` bursts)**:
  * RouterOS creates one dynamic **Simple Queue** per active `/ip hotspot active` user. Every packet must be matched against the active queue list in CPU (disabling FastTrack for queued traffic).
  * **Rule of Thumb**: With Speed Caps & Bursts ON, each 100 active users consumes roughly **18%–25% CPU** on a dual-core ARM router (`E50UG` / `L009`) or **8%–12% CPU** on a quad-core ARM router (`hAP ax2` / `hAP ax3` / `RB5009`).

---

## 3. Predictive MikroTik Hardware Matrix (Cheaper Options than hAP ax3)

All models below run **RouterOS v7** and are **100% compatible** with the T-Connect adoption script, `/22` Maximize Capacity button, Free/Paid mode toggle, and live telemetry heartbeat.

| MikroTik Model | Product Code | CPU & Architecture | RAM / Flash | Approx. Price (USD) | Cost Savings vs. hAP ax3 ($139) | Safe Concurrent Users (Speed Caps OFF) | Safe Concurrent Users (Speed Caps ON) | Best Rollout Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. hEX refresh (2024)** ⭐ *Best Value Gateway* | `E50UG` | **ARM 64-bit Dual-Core** (`EN7562CT` @ 950 MHz) | **512 MB** / 128 MB | **$59** | **58% Cheaper (-$80)** | **250 – 350 users** | **150 – 220 users** | **#1 Choice for Dedicated Wired Gateway** paired with 1–4 external Wi-Fi APs. Modern ARM64 CPU, 512 MB RAM, 128 MB NAND, runs cool without Wi-Fi radios. |
| **2. hAP ax lite** ⭐ *Best Budget All-in-One* | `L41G-2axD` | **ARM Dual-Core** (`IPQ-5010` @ 800 MHz) | **256 MB** / 128 MB | **$59** | **58% Cheaper (-$80)** | **50 – 70 users** | **30 – 50 users** | **Small Retail, Cafes & Spaza Shops.** Built-in 2.4 GHz Wi-Fi 6 + 4 Gigabit ports. Ideal where <50 people connect at once. |
| **3. hEX / hEX S (Classic)** | `RB750Gr3` / `RB760iGS` | MMIPS Dual-Core (`MT7621A` @ 880 MHz, 4 threads) | **256 MB** / 16 MB | **$59 – $69** | **50–58% Cheaper** | **180 – 250 users** | **100 – 150 users** | **Legacy Wired Gateway.** Very stable, but only has **16 MB flash**. Since T-Connect stores only a 3 KB stub on flash, it works well, though **hEX refresh (`E50UG`)** is strictly superior at the same $59 price. |
| **4. hAP ax2** ⭐ *Best Mid-Tier All-in-One / Gateway* | `C52iG-5HaxD2HaxD-TC` | **ARM 64-bit Quad-Core** (`IPQ-6010` @ 864 MHz) | **1 GB** / 128 MB | **$99** | **29% Cheaper (-$40)** | **300 – 450 users** *(wired APs)* / **90 users** *(built-in Wi-Fi)* | **200 – 300 users** *(wired APs)* | **Medium Sites & Community Hubs.** Uses the **exact same 4-core IPQ-6010 CPU family and 1 GB RAM** as the hAP ax3 for $40 less. |
| **5. L009UiGS-RM** ⭐ *Best Rack/Wall Gateway* | `L009UiGS-RM` | **ARM 64-bit Dual-Core** (`IPQ-5018` @ 800 MHz) | **512 MB** / 128 MB | **$119** | **14% Cheaper (-$20)** | **300 – 450 users** | **180 – 260 users** | **Taxi Ranks & Multi-AP Plazas.** 8x Gigabit Ethernet ports + 2.5G SFP cage + PoE-in/out. Heavy metal chassis acts as a massive passive heatsink. |
| **6. hAP ax3** *(Current Baseline)* | `C53UiG+5HPaxD2HPaxD` | **ARM 64-bit Quad-Core** (`IPQ-6010` @ 1.8 GHz) | **1 GB** / 128 MB | **$139** | *Baseline (0%)* | **500 – 700 users** *(wired APs)* / **120 users** *(built-in Wi-Fi)* | **350 – 500 users** *(wired APs)* | **High-Performance Gateway or Flagship Retail.** Best when onboard Wi-Fi is either lightly loaded or turned OFF while driving external APs. |
| **7. RB5009UG+S+IN** ⭐ *High-Density `/22` Core* | `RB5009UG+S+IN` | **ARM 64-bit Quad-Core** (`Marvell 88F7040` @ 1.4 GHz) | **1 GB** / 1 GB | **$219** | *+$80 (Replaces 3x hAP ax3)* | **1,012+ users (Full `/22`)** | **800 – 1,012+ users** | **Malls, Stadiums & Central Bus Terminals.** Full heavy-duty metallic heatsink enclosure; handles the entire `/22` (1,012 active Simple Queues) effortlessly. |

---

## 4. Recommended Hardware Topology by Site Size (3-Tier Country-Wide Plan)

To maximize reliability, prevent overheating, and minimize rollout cost across Lesotho, standardize procurement into three repeatable kits:

### Tier 1: Small Retail, Clinics & Spaza Shops (20 to 80 Concurrent Users)
* **Option 1A (Lowest Cost All-in-One — Up to 50 users):**
  * **Router + Wi-Fi:** 1x **MikroTik hAP ax lite** (`L41G-2axD`) — **$59**
  * **Why it works:** 256 MB RAM and 128 MB NAND easily hold the `/22` DHCP pool and T-Connect 3 KB redirect stub.
* **Option 1B (Dual-Band Wi-Fi 6 All-in-One — Up to 80–100 users):**
  * **Router + Wi-Fi:** 1x **MikroTik hAP ax2** (`C52iG-5HaxD2HaxD-TC`) — **$99**
  * **Why it works:** Quad-core ARM64 + 1 GB RAM gives you hAP ax3-class routing power and dual-band 2.4/5 GHz Wi-Fi 6 for $40 less per site.

### Tier 2: Medium Community Hubs, Schools & Taxi Ranks (100 to 300 Concurrent Users)
> **Critical Thermal Rule for Tier 2+:** Never force 150–300 smartphones onto a single all-in-one router's built-in Wi-Fi antenna. Separate the **Gateway Router** from the **Wi-Fi Access Points**.

* **Gateway Router:** 1x **MikroTik hEX refresh (`E50UG`)** (**$59**) *or* 1x **MikroTik hAP ax2** with onboard Wi-Fi disabled (**$99**) *or* 1x **MikroTik L009UiGS-RM** (**$119**).
* **PoE Switch:** 1x 5-port or 8-port Gigabit PoE+ Switch (**~$35–$55**).
* **External Wi-Fi Access Points (2 to 4 APs in Bridge Mode):**
  * **MikroTik cAP ax** ($129) / **wAP ax** ($99 weatherproof outdoor)
  * *Or third-party bridge APs:* **TP-Link Omada EAP225-Outdoor / EAP610-Outdoor** ($69–$119) or **Ubiquiti UniFi U6+/U6-Mesh** ($99–$159).
* **Why it works:** Each external AP handles 60–80 Wi-Fi clients on non-overlapping channels (Channels 1, 6, 11 on 2.4 GHz; 36, 44, 149, 157 on 5 GHz). All APs bridge Layer-2 traffic back to the cool-running **$59 hEX refresh (`E50UG`)** gateway, which only manages `/22` DHCP, NAT, and T-Connect authentication.

### Tier 3: High-Density Malls, Universities & Stadiums (300 to 1,000+ Concurrent Users)
* **Core Gateway Router:** 1x **MikroTik RB5009UG+S+IN** (**$219**) *(or existing **hAP ax3** with built-in Wi-Fi radios disabled for up to ~500–600 users)*.
* **Distribution Switch:** 1x 8–24 Port Gigabit PoE+ Switch (e.g., MikroTik **CRS328-24P-4S+RM** or standard unmanaged/VLAN PoE+ switch).
* **External Wi-Fi Access Points (6 to 14 APs in Bridge Mode):**
  * Placed across physical zones (e.g., Food Court, Main Concourse, Taxi Loading Bay), capped at **75–90 clients per AP**.
* **Why it works:** The **RB5009**'s entire bottom chassis is a cast-aluminum heatsink, and its 1.4 GHz quad-core Marvell Armada CPU + 1 GB DDR4 RAM processes **1,000+ simultaneous `/22` leases and Simple Queues** at <45% CPU load without ever thermal-throttling.

---

## 5. Why Your Live hAP ax3 Gets Warm & 5 Ways to Prevent Router Overheating

The **MikroTik hAP ax3** uses a powerful **1.8 GHz IPQ-6010 Quad-Core CPU** paired with high-gain **5.5 dBi Wi-Fi 6 radio chains** inside a passive plastic enclosure. When it acts as both a **high-power Wi-Fi base station** AND a **Hotspot Queue Gateway**, internal temperatures can climb to **72°C–82°C**.

Follow these 5 rules across your fleet to keep router temperatures **15°C–22°C cooler**:

### Rule 1: Offload Wi-Fi to External APs on Busy Sites (>80 Concurrent Users)
* If a site has external APs plugged into the router's Ethernet ports, **disable the built-in Wi-Fi radios on the gateway router** (or lower its Tx power to cover only the immediate office room):
  ```routeros
  /interface wifi set [find] disabled=yes
  ```
* Turning off the internal 2.4 GHz & 5 GHz RF power amplifiers on an hAP ax3 or hAP ax2 immediately drops board temperature by **14°C to 18°C** and frees **15%–25% CPU** (interrupt handling for Wi-Fi frames) for pure `/22` routing.

### Rule 2: Keep Captive Portal Media 100% on the T-Connect Cloud VPS (Already Configured)
* Never upload large MP4 videos, high-res PNG wallpapers, or heavy JavaScript bundles into MikroTik `/file`.
* The T-Connect platform already enforces this best practice: your router only stores a tiny **3 KB `login.html` / `alogin.html` redirect stub**, while the Cloud VPS streams all wallpapers, sponsor ad slides, and payment prompts.

### Rule 3: Use Strategic Speed Caps & Bursts on Ultra-High-Density Event Days
* On normal days (50–300 users), keep **Speed Caps & Bursts ON** (`25M/10M` with `50M/20M` bursts) so no single user hogs the Starlink/Fiber backhaul.
* During a massive 800+ user stadium/festival surge on a mid-range router (like an hEX refresh or hAP ax2), if CPU approaches 80%, you can toggle **Speed Caps & Bursts OFF** with 1 click in the T-Connect Fleet Manager and let the external APs' built-in per-client airtime fairness regulate speeds while the router drops back to **<25% CPU**.

### Rule 4: Shorten Stale Connection Tracking Timeouts on `/22` Subnets
* On a `/22` hotspot with 1,000+ phones opening thousands of short-lived UDP/TCP sockets (WhatsApp, TikTok, DNS), the Linux conntrack table can swell and warm up the CPU.
* T-Connect's **Maximize Capacity (`/22` — 1,000+ Users)** configuration pairs best with clean DHCP lease times (`1h`) and automatic idle hotspot cleanup (`idle-timeout=15m` / `keepalive-timeout=2m`) so disconnected phones release their queues and IP leases promptly.

### Rule 5: Physical Mounting & Airflow Discipline
* **Mount Vertically:** On the **hAP ax3** and **hAP ax2**, the ventilation slots are designed for the **chimney effect** when stood vertically on the included stand or wall-mounted vertically. Laying the router flat inside a closed ceiling box or on top of a warm UPS battery traps heat.
* **Shade Outdoor Enclosures:** For taxi ranks and parks using weatherproof boxes, use a vented polycarbonate enclosure mounted in the shade (or under a reflective solar panel canopy) and prefer metal-cased gateways (**L009** or **RB5009**) or outdoor-rated **wAP ax** units.

---

## 6. Country-Wide Rollout Procurement Summary (100-Site Example)

If deploying **100 new hotspot sites across Lesotho** (60 Small Retail/Spaza, 30 Medium Community/Taxi Ranks, 10 High-Density Malls/Hubs):

| Strategy | Hardware Mix | Total Router CAPEX (100 Sites) | Thermal & Capacity Outcome |
| :--- | :--- | :--- | :--- |
| **Old Strategy (hAP ax3 Everywhere)** | 100x **hAP ax3** @ $139 | **$13,900 USD** | Overpaid on 60 small sites; single-AP bottleneck and high heat on 40 medium/large sites. |
| **Optimized T-Connect Tiered Strategy** | • 60x **hAP ax lite / hEX refresh** @ $59 ($3,540)<br>• 30x **hAP ax2 / L009** @ $99 ($2,970)<br>• 10x **RB5009** Core Gateways @ $219 ($2,190) | **$8,700 USD** *(Saves $5,200 USD on routers to fund external APs)* | **Zero overheating**, true `/22` 1,000+ user capacity at major hubs, and 100% identical T-Connect platform experience everywhere. |
