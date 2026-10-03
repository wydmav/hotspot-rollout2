# T-Connect Cloud Controller — Contabo VPS Deployment & Router Adoption Guide

This guide walks you through deploying **T-Connect** to your **Contabo VPS (Ubuntu LTS)** using Docker Compose with automatic Let's Encrypt HTTPS, and testing with a physical MikroTik router.

---

## 1. Push Code to GitHub

From your local machine or workspace:

```bash
git init
git add .
git commit -m "feat: complete T-Connect multi-tenant cloud controller with Supabase ledger and MikroTik adoption"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tconnect-controller.git
git push -u origin main
```

---

## 2. Server Preparation (Contabo Ubuntu LTS)

SSH into your Contabo VPS:

```bash
ssh root@YOUR_VPS_IP
```

### Install Docker & Docker Compose:

```bash
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban

# Install Docker
curl -fsSL https://get.docker.com | sh

# Enable Docker on boot
systemctl enable docker
systemctl start docker
```

### Configure Firewall (UFW):

```bash
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP (Let's Encrypt challenge)
ufw allow 443/tcp     # HTTPS
ufw allow 51820/udp   # WireGuard VPN Tunnel
ufw enable
```

---

## 3. Clone & Deploy T-Connect

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/tconnect-controller.git /opt/tconnect
cd /opt/tconnect

# Copy example environment configuration
cp .env.example .env
nano .env
```

Set your configuration in `.env`:
```env
DOMAIN=hotspot.yourdomain.co.ls
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
RADIUS_SECRET=your-secure-radius-secret
ROUTER_API_PASSWORD=your-secure-routeros-password
```

*(Note: If you are testing directly on your VPS IP without a domain yet, set `DOMAIN=YOUR_VPS_IP` and use `http://YOUR_VPS_IP:3000`)*

### Start the Stack:

```bash
docker compose up -d --build
```

Check running containers:
```bash
docker compose ps
docker compose logs -f app
```

---

## 4. Test With a Physical MikroTik Router

1. Open your browser and go to `https://hotspot.yourdomain.co.ls` (or `http://YOUR_VPS_IP:3000`).
2. Navigate to **Routers & Adoption** in the sidebar.
3. Click **+ Add Router to Fleet** and enter:
   * **Name**: e.g., `hAP-ax3-Main-Cafe`
   * **Site Location**: e.g., `Pioneer Mall Maseru`
   * **Hardware Model**: Select your model (e.g., `MikroTik hAP ax³ (v7)` or `RB4011 (v6)`)
   * **RouterOS Version**: `v7` or `v6`
4. The system will generate your custom **One-Line RouterOS Script**:
   * It will show your VPS host endpoint (`YOUR_VPS_IP:3000` or your domain).
   * Click **Copy Script**.
5. Connect to your MikroTik router via **Winbox**:
   * Click **New Terminal**.
   * Paste the script and press Enter.

### What Happens Automatically on the Router:
1. **Connectivity Check**: Tests DNS resolution or IP reachability to your VPS.
2. **Device Mode Verification**: Confirms `/system/device-mode` allows fetch.
3. **One-Time Fetch**: Downloads the encrypted `.rsc` configuration payload from your VPS via `/api/devices/:id/adopt.rsc`.
4. **Automated Provisioning**: Configures:
   * Encrypted **WireGuard management tunnel** back to your VPS (never exposing Winbox/API to the public WAN).
   * **Captive portal profiles** and FreeRADIUS authentication on port 1812/1813.
   * **Walled Garden** entries for Lesotho payment gateways (EcoCash, MyWallet, OTTvoucher, xPayments) and captive portal detection endpoints (Apple, Android, Windows).
   * **DNS Sinkhole** redirecting port 53 queries through the local content filter.
5. **Self-Cleaning**: Deletes the temporary `.rsc` file immediately after importing.
6. **Controller Handshake**: The router reports online status to your dashboard!

---

## 5. Testing Vouchers & Captive Portal

1. In the T-Connect dashboard, go to **Billing & Vouchers > Plans & Vouchers**.
2. Click **Issue Single Voucher** on the Day Pass plan.
3. Switch to **Network & Security > Captive Portal**.
4. In the simulated captive portal login screen, enter the voucher code and click **Connect to Internet**.
5. Watch the active session instantly appear in the **Active Subscriber Session Ledger** on the **Fleet Overview** dashboard!

---

## 6. Supabase Database Verification

1. Click **Connect Supabase** in the top header.
2. Run the SQL schema from the **SQL Schema (DDL)** tab in your Supabase SQL Editor.
3. Paste your Supabase Project URL and Anon API Key.
4. Click **Connect & Verify Database**. All new routers, vouchers, and transactions will sync live to your remote PostgreSQL ledger.
