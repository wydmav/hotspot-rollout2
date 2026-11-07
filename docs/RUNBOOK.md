# Production Operations & Deployment Runbook (`docs/RUNBOOK.md`)

## 1. Zero-Loss Production Update Command (Preserves Routers, Leads & Gateways)
Whenever new code is pushed to `origin/main`, SSH into `wydmav@vmi3475343:/opt/t-connect-hotspot/hotspot-rollout2` and run:

```bash
sudo cp -a data /tmp/tconnect-data-safe && sudo git fetch origin main && sudo git reset --hard origin/main && sudo cp -a /tmp/tconnect-data-safe/. data/ && sudo docker compose up -d --build
```

## 2. First 30-Minute Post-Deploy Smoke Test Checklist
1. **Container Health**:
   ```bash
   sudo docker compose ps
   curl -s http://127.0.0.1:3000/api/health
   ```
2. **Gateway Readiness (`PayLesotho` & `OTT Voucher`)**:
   - Open **Billing & Vouchers $\rightarrow$ Payment Gateways** and verify both **PayLesotho & XPayments Aggregator** (`T-Connect`, M-Pesa `62915`, EcoCash `63165430`) and **OTT Voucher Lesotho** show **LIVE / OPERATIONAL**.
3. **WG Swarm & Watchdog Accuracy**:
   - Verify `GET /api/devices/watchdog/status` returns `deadmanThresholdSeconds: 60` and only counts routers with a real heartbeat within the last 60s as `online`.
4. **Captive Portal Splash Check**:
   - Visit `http://169.58.98.92:3000/portal` and verify sponsor carousel slides, Sesotho Terms & Conditions, and M-Pesa / EcoCash / 16-Digit OTT tabs render cleanly.

## 3. Rollback Procedure
If a deployment introduces a regression:
```bash
sudo cp -a data /tmp/tconnect-data-safe
sudo git reset --hard HEAD~1
sudo cp -a /tmp/tconnect-data-safe/. data/
sudo docker compose up -d --build
```
