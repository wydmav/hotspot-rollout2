# T-Connect Cloud Controller — VPS Deployment & First Router Adoption Guide

Complete guide for deploying **T-Connect** to your **VPS (Ubuntu 22.04 / 24.04 LTS)** using Docker Compose with automatic Let's Encrypt HTTPS (Caddy), syncing to GitHub, and adopting your first live MikroTik router via an encrypted WireGuard tunnel.

---

## 1. Sync & Push Code to GitHub

Your codebase has already been initialized on the `main` branch with all files committed cleanly.

To link and push to your GitHub repository:

```bash
# Add your GitHub remote repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/tconnect.git

# Push the main branch to GitHub
git push -u origin main
```

---

## 2. Deploy to VPS (Option A: Direct Tarball Upload - Fastest)

A self-contained production bundle `tconnect-production-vps.tar.gz` (463 KB) has been built and packaged in the root directory.

### Step 2.1: Upload Archive to VPS
From your terminal:
```bash
scp tconnect-production-vps.tar.gz root@YOUR_VPS_IP:/opt/
```

### Step 2.2: Extract on VPS
SSH into your VPS:
```bash
ssh root@YOUR_VPS_IP

mkdir -p /opt/tconnect
tar -xzf /opt/tconnect-production-vps.tar.gz -C /opt/tconnect
cd /opt/tconnect
```

---

## 2. Deploy to VPS (Option B: Clone from GitHub)

Alternatively, if you pushed to GitHub:
```bash
ssh root@YOUR_VPS_IP
git clone https://github.com/YOUR_USERNAME/tconnect.git /opt/tconnect
cd /opt/tconnect
```

---

## 3. Server Preparation & Docker Setup (Ubuntu LTS)

On your VPS terminal:

```bash
# Update packages
apt update && apt upgrade -y
apt install -y curl ufw wireguard

# Install Docker & Compose (if not already installed)
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Configure Host Firewall (UFW)
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP (Let's Encrypt ACME)
ufw allow 443/tcp     # HTTPS (Web app & RFC 8910 Captive Portal)
ufw allow 51820/udp   # WireGuard Encrypted Router Overlay
ufw --force enable
```

---

## 4. Configure Production Environment & Start Stack

```bash
cd /opt/tconnect

# Copy production template
cp .env.production.example .env

# Edit environment variables
nano .env
```

Ensure your `.env` has:
```env
DOMAIN=hotspot.yourdomain.co.ls
PORT=3000
VITE_CONTROLLER_DOMAIN=hotspot.yourdomain.co.ls
VITE_CURRENCY=M
RADIUS_SECRET=radsec_tconnect_lesotho_99120
ROUTER_API_PASSWORD=tc_pass_crypto_random_32char
```
*(Note: If you do not have a domain yet, set `DOMAIN=YOUR_VPS_IP` and Caddy will serve over HTTP, or access directly via `http://YOUR_VPS_IP:3000`).*

### Start Containers:
```bash
docker compose up -d --build
```

### Verify Running Services:
```bash
docker compose ps
docker compose logs -f
```

---

## 5. Adopting Your First Live MikroTik Router

### Step 5.1: Generate One-Liner Adoption Script
1. Open your browser and navigate to `https://hotspot.yourdomain.co.ls` (or `http://YOUR_VPS_IP:3000`).
2. In the sidebar, click **Routers & Adoption**.
3. Click **+ Add Router to Fleet**.
4. Fill in the details:
   - **Router Name:** e.g. `hAP-ax3-Pioneer-Cafe`
   - **Vertical / Venue:** e.g. `Public Hotspots` (or `Villages`, `Municipal Parks`, `Buses & Transit`, `Stadiums`)
   - **Site Location:** e.g. `Pioneer Mall, Maseru`
   - **Hardware Model:** Select your model (e.g., `hAP ax³`, `hEX S`, `RB4011`, etc.)
   - **RouterOS Version:** `RouterOS v7` (Recommended) or `v6`
5. Click **Generate Adoption Script** and copy the one-liner command:
   ```routeros
   /tool fetch url="https://hotspot.yourdomain.co.ls/api/devices/rt_pioneer_cafe/adopt.rsc" mode=https keep-result=yes dst-path="tconnect-adopt.rsc"; /import file-name="tconnect-adopt.rsc"; /file remove [find name="tconnect-adopt.rsc"]
   ```

### Step 5.2: Execute on MikroTik Router
1. Open **WinBox** and connect to your MikroTik router (via MAC or IP).
2. Click **New Terminal** in the left menu.
3. Paste the one-liner script and press **Enter**.

### Step 5.3: What the Script Provisions Automatically:
- **WireGuard Management VPN (`wg-tconnect`):** Establishes a tunnel to `10.99.0.1` at your VPS. The router receives internal IP `10.99.1.50`. WinBox and API are bound only to the WireGuard interface, never exposed to the public WAN.
- **Captive Portal Walled Garden:** Whitelists Lesotho gateways (EcoCash `ecocash.co.ls`, OTT Voucher `portal.ottlesotho.com`), DNS servers, and RFC 8910 Apple/Android/Windows detection endpoints.
- **FreeRADIUS Client:** Configures AAA accounting on port 1812/1813 with the shared `RADIUS_SECRET`.
- **Telemetry Scheduler:** Creates a 30-second heartbeat script reporting CPU, memory, uptime, and active subscriber sessions back to your VPS dashboard at `/api/devices/:id/heartbeat`.

### Step 5.4: Confirm Online Status
Return to the T-Connect dashboard. Your router will show green **ONLINE** status with live CPU load, firmware version, and session counters.

---

## 6. Testing Guest Connect & Payment Gateways

1. Connect a phone or laptop to the MikroTik Wi-Fi SSID (e.g. `T-Connect Hotspot`).
2. The OS Captive Network Assistant (CNA) immediately pops up with the customized captive portal for the assigned venue scope.
3. Select a plan:
   - **M10** — Daily Pass (24 Hours)
   - **M60** — Weekly Pass (7 Days)
   - **M280** — Monthly Pass (30 Days)
4. Choose payment:
   - **EcoCash:** Enter Lesotho phone (`+266 5xxx xxxx`) to receive *151# STK Push prompt.
   - **OTT Voucher:** Enter 12-digit digital voucher PIN purchased at Shoprite or retail merchant.
5. Upon successful authorization, the device is granted full internet access, and the transaction is recorded in the live ledger.
