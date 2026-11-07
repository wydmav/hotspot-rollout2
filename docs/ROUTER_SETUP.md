# MikroTik RouterOS v7 Setup & Adoption Guide (`docs/ROUTER_SETUP.md`)

## 1. Prerequisites
* **Hardware**: MikroTik router running **RouterOS v7.12+** (e.g., `hAP ax³`, `hAP ax²`, `RB4011`, `LHG LTE6`).
* **WAN Connectivity**: Working internet uplink on `ether1` (Starlink, Fiber, or LTE—works behind NAT and CGNAT).
* **DNS**: Ensure `/ip/dns/set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes` is active.

## 2. Step-by-Step Adoption Flow
1. Log into the **T-Connect Control Tower** (`http://169.58.98.92:3000`).
2. Open **Routers & Adoption** $\rightarrow$ click **+ Add Router to Fleet**.
3. Enter the Router Name, District, Vertical Scope (`hotspot`, `community`, `park`, `bus`, `stadium`), and Access Policy (`PAID_ONLY`, `FREE_TRIAL_AND_PAID`, or `COMPLETELY_FREE`).
   * *Note*: At this stage, the router is in `pending_adoption` and `WG Swarm` displays `0/1 UP`.
4. Copy the generated RouterOS v7 one-liner command:
   ```routeros
   /tool fetch url="http://169.58.98.92:3000/api/devices/<ROUTER_ID>/adopt.rsc" mode=http keep-result=yes dst-path="tconnect-adopt.rsc"; /import file-name="tconnect-adopt.rsc"
   ```
5. Open **WinBox**, connect to your MikroTik router, open **New Terminal**, and paste the one-liner.
6. Within 5–15 seconds:
   - The router establishes its native WireGuard interface (`wg-tconnect` $\rightarrow$ `10.99.0.1:51820` with `persistent-keepalive=25s`).
   - The 15-second scheduler (`tc-heartbeat`) begins reporting live CPU, memory, uptime, and active sessions.
   - `WG Swarm` in the Control Tower transitions to **`1/1 UP` (ONLINE)**.

## 3. Verifying Heartbeat & Offline Detection (60s Timeout)
* In WinBox, inspect `/system/scheduler/print` to see `tc-heartbeat` executing every `00:00:15`.
* If the router is powered off or loses WAN for more than **60 seconds** (3–4 missed heartbeats), the Control Tower automatically marks it **`offline`** (`0/1 UP` in `WG Swarm`) and restores it to **`online`** (`1/1 UP`) as soon as connectivity returns.
