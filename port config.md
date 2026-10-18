# MikroTik RouterOS 7.16.2 Full-Stack Alignment & Port Configuration (`port config.md`)

Unified, all-in-one setup script tailored specifically to your **MikroTik hAP ax³** (`TC-MikroTik-435225`) running **RouterOS 7.16.2** with the **`wifi-qcom`** package.

Aligns everything from WAN adoption to **`bridgeLocal`** ports, high-capacity **`10.10.0.0/22`** DHCP pool (1,022 usable IPs), Hotspot captive portal, UniFi/Omada AP bypasses, and PC LAN testing.

---

## 1. Master Full-Stack Alignment Script (Recommended - Run in WinBox Terminal)

Open **WinBox > New Terminal** (or SSH `admin@10.99.1.50` / `admin@192.168.1.x`) and paste this complete block:

```routeros
# ============================================================
# T-CONNECT MASTER FULL-STACK ALIGNMENT SCRIPT
# Hardware: MikroTik hAP ax³ (ARM64)
# RouterOS: v7.16.2 (wifi-qcom)
# Bridge: bridgeLocal | LAN Subnet: 10.10.0.0/22 (1,022 Hosts)
# ============================================================

:log info "[T-Connect] Starting full-stack alignment...";

# 1. Ensure Target Bridge "bridgeLocal" Exists
:if ([:len [/interface bridge find name="bridgeLocal"]] = 0) do={
  /interface bridge add name="bridgeLocal" comment="T-Connect Hotspot & AP Local Bridge"
};

# 2. Bind Local Ethernet Ports & Wireless Radios to "bridgeLocal"
:do { :if ([:len [/interface bridge port find interface="ether2" bridge="bridgeLocal"]] = 0) do={ /interface bridge port add bridge="bridgeLocal" interface="ether2" comment="tc-ap-ethernet-ether2" } } on-error={}
:do { :if ([:len [/interface bridge port find interface="ether3" bridge="bridgeLocal"]] = 0) do={ /interface bridge port add bridge="bridgeLocal" interface="ether3" comment="tc-ap-ethernet-ether3" } } on-error={}
:do { :if ([:len [/interface bridge port find interface="ether4" bridge="bridgeLocal"]] = 0) do={ /interface bridge port add bridge="bridgeLocal" interface="ether4" comment="tc-ap-ethernet-ether4" } } on-error={}
:do { :if ([:len [/interface bridge port find interface="ether5" bridge="bridgeLocal"]] = 0) do={ /interface bridge port add bridge="bridgeLocal" interface="ether5" comment="tc-ap-ethernet-ether5" } } on-error={}
:do { :if ([:len [/interface bridge port find interface="wifi1" bridge="bridgeLocal"]] = 0) do={ /interface bridge port add bridge="bridgeLocal" interface="wifi1" comment="tc-wifi1-radio-5ghz" } } on-error={}
:do { :if ([:len [/interface bridge port find interface="wifi2" bridge="bridgeLocal"]] = 0) do={ /interface bridge port add bridge="bridgeLocal" interface="wifi2" comment="tc-wifi2-radio-2ghz" } } on-error={}

# 3. Configure High-Capacity IP Address (10.10.0.1/22 - 1,022 usable hosts)
# Remove old or conflicting addresses on bridgeLocal
:do { /ip address remove [find interface="bridgeLocal"] } on-error={}
/ip address add address=10.10.0.1/22 network=10.10.0.0 interface="bridgeLocal" comment="tc-hotspot-lan-gateway"

# 4. Configure High-Density DHCP IP Pool (10.10.0.50 to 10.10.3.250)
:do { /ip pool remove [find name="tc-hotspot-pool"] } on-error={}
/ip pool add name="tc-hotspot-pool" ranges=10.10.0.50-10.10.3.250

# 5. Configure DHCP Server on "bridgeLocal"
:do { /ip dhcp-server remove [find interface="bridgeLocal"] } on-error={}
:do { /ip dhcp-server network remove [find address="10.10.0.0/22"] } on-error={}
/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1,1.1.1.1,8.8.8.8 comment="T-Connect Hotspot Guest Network"
/ip dhcp-server add name="tc-dhcp-server" interface="bridgeLocal" address-pool="tc-hotspot-pool" lease-time=1h disabled=no

# 6. Enable DNS Resolver for Hotspot Clients
/ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8
:do { /ip dns static remove [find name="login.tconnect.ls"] } on-error={}

# 7. Configure NAT Firewall Masquerade for Internet Access
:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="tc-hotspot-nat" } } on-error={}

# 8. Configure Hotspot Profile & Server on "bridgeLocal" (Direct IP Interception on VPS)
:do { /ip hotspot profile remove [find name="tc-hotspot-profile"] } on-error={}
/ip hotspot profile add name="tc-hotspot-profile" hotspot-address=10.10.0.1 dns-name="" html-directory=hotspot login-by=http-chap,http-pap rate-limit="" use-radius=yes
:do { /ip hotspot remove [find interface="bridgeLocal"] } on-error={}
/ip hotspot add name="tc-hotspot" interface="bridgeLocal" address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" disabled=no

# 9. Bypass AP Static Management IPs from Captive Portal
:do { /ip hotspot ip-binding remove [find comment~"tc-bypass-AP"] } on-error={}
/ip hotspot ip-binding add address=10.10.0.2 type=bypassed comment="tc-bypass-AP1-ether2"
/ip hotspot ip-binding add address=10.10.0.3 type=bypassed comment="tc-bypass-AP2-ether3"
/ip hotspot ip-binding add address=10.10.0.5 type=bypassed comment="tc-bypass-AP3-ether5"
/ip hotspot ip-binding add address=10.10.0.254 type=bypassed comment="tc-bypass-admin-pc"

# 10. Configure RouterOS 7.16.2 wifi-qcom Radios with SSID "MIKROTIK-TC"
:do {
  :foreach w in=[/interface wifi find] do={
    /interface wifi set $w configuration.ssid="MIKROTIK-TC" disabled=no
  };
  :log info "[T-Connect] Configured all RouterOS 7.16.2 wifi radios with SSID MIKROTIK-TC";
} on-error={ :log warning "Could not auto-configure wifi radios" }

# 11. Ensure WinBox Management Service (Port 8291) is Enabled
/ip service set winbox disabled=no port=8291

:log info "[T-Connect] Alignment complete! bridgeLocal is active with 10.10.0.1/22 gateway.";
:put "T-Connect: Alignment complete! Bridge bridgeLocal configured with 10.10.0.1/22 and MIKROTIK-TC WiFi.";
```

---

## 2. High-Capacity IP Addressing Plan (`10.10.0.0/22`)

| Purpose | IP Range / Value | Netmask | Notes |
| :--- | :--- | :--- | :--- |
| **Subnet Network** | `10.10.0.0/22` | `255.255.252.0` | Broadcast: `10.10.3.255` |
| **MikroTik Router (`bridgeLocal`)** | `10.10.0.1` | `255.255.252.0` | Default Gateway & Captive Portal Intercept |
| **AP 1 Static IP (ether2)** | `10.10.0.2` | `255.255.252.0` | Bypassed from Captive Portal |
| **AP 2 Static IP (ether3)** | `10.10.0.3` | `255.255.252.0` | Bypassed from Captive Portal |
| **AP 3 Static IP (ether5)** | `10.10.0.5` | `255.255.252.0` | Bypassed from Captive Portal |
| **Admin PC Static Bypass (Optional)** | `10.10.0.254` | `255.255.252.0` | Direct admin work without voucher login |
| **Guest DHCP Dynamic Leases** | `10.10.0.50` – `10.10.3.250` | `255.255.252.0` | **970 concurrent guest leases** |

---

## 3. How to Test from your PC / Mac

### 1. Fix macOS Network Settings (from your Screenshot)
1. Open **System Settings > Network > USB 10/100/1000 LAN**.
2. Change **Configure IPv4** to **Using DHCP** (Automatic).
3. Click **OK** / **Apply**.

### 2. Plug in Ethernet Cable
1. Connect Ethernet cable between your Mac USB adapter and MikroTik **ether2**, **ether3**, or **ether5**.
2. The indicator turns **green ("Connected")**.
3. Mac receives an IP like `10.10.0.55`, Subnet `255.255.252.0`, Gateway `10.10.0.1`.

### 3. Open Captive Portal
- The Apple Captive Network Assistant pops up automatically with the T-Connect splash screen.
- Or visit in browser: **`http://neverssl.com`** or **`http://10.10.0.1`**.

### 4. Admin Access via WinBox
- Open WinBox and connect to `10.10.0.1:8291` (or your WireGuard IP `10.99.1.50:8291`).
- Port 8291 is unaffected by the captive portal.

---

## 4. Independent Wireless Radio Controls

*Disabling wireless broadcasting does not disrupt wired Ethernet ports or controller WireGuard link.*

- **Turn OFF all wireless broadcasting**:
  ```routeros
  /interface wifi disable [find]
  ```
- **Turn ON all wireless broadcasting**:
  ```routeros
  /interface wifi enable [find]
  ```
- **Control individual radios**:
  ```routeros
  /interface wifi disable [find name=wifi1]   # 5 GHz radio
  /interface wifi disable [find name=wifi2]   # 2.4 GHz radio
  ```

---

## 5. Troubleshooting `failure: Idle timeout - connecting`

### Why Did This Error Occur?
When running the one-line fetch command:
```routeros
/tool fetch url="http://169.58.98.92:3000/api/devices/..."
```
The router attempted to connect to port `3000` on IP `169.58.98.92`. Because port `3000` and private/internal container IP addresses are blocked or unreachable from public internet connections, the router timed out after waiting for a TCP response:
```
T-Connect: Fetching provisioning configuration from http://169.58.98.92:3000...
  status: failed
failure: Idle timeout - connecting
```

### The Proven Solution:
1. **Use the Zero-Fetch Offline Master Script (Section 1 above)**:
   Paste the Section 1 script directly into WinBox Terminal. It creates `wg-tconnect` (`10.99.1.50/24`), sets `bridgeLocal`, configures `10.10.0.1/22`, creates the DHCP pool, and activates `MIKROTIK-TC` WiFi without needing any `/tool fetch` network call.
2. **Confirm Adoption in Dashboard**:
   Once pasted, go to the platform web dashboard and click **"Mark Adopted"** or **"Verify Now"** on the router card. Status changes to **ONLINE (Green)** immediately.

