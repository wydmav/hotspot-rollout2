# MikroTik RouterOS 7.16.2 Full-Stack Alignment & Port Configuration (`port config.md`)

Unified, all-in-one setup script tailored specifically to your **MikroTik hAP ax³** (`TC-MikroTik-435225`) running **RouterOS 7.16.2** with the **`wifi-qcom`** package.

Everything is served directly from your VPS (no hallucinated external domains).

---

## 1. Why Phones/PCs Say "No Internet Connection" When Connecting to `MIKROTIK-TC`

When you connect to **`MIKROTIK-TC`** WiFi:
1. **The Hotspot Sandbox is Working as Designed**: By default, MikroTik Hotspot blocks all regular internet access for unauthenticated guests and holds them in a captive "walled garden" waiting for them to log in or redeem a voucher.
2. **Device Detection**: Your phone (Android/iOS) sends an HTTP probe (`connectivitycheck.gstatic.com` or `captive.apple.com`). Because it has not passed through the captive portal yet, it flags **"No Internet Connection"** or prompts **"Sign in to network"**.
3. **Reaching the VPS Portal**: For the captive portal splash screen to open from your VPS, the VPS IP address must be allowed in `/ip hotspot walled-garden ip` so the phone's browser can load the web page from the VPS without being blocked!

---

## 2. Master Full-Stack Alignment Script (Run in WinBox Terminal)

Open **WinBox > New Terminal** (or SSH) and paste this complete block. It configures the bridge, 10.10.0.1/22 subnet, DHCP, DNS intercept, NAT masquerade, VPS walled garden, captive portal redirect, built-in test user, and WiFi radios:

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

# 6. Enable DNS Resolver & Intercept UDP DNS for Captive Portal Probes
/ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8
:do { :if ([:len [/ip firewall nat find comment="tc-dns-intercept"]] = 0) do={ /ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="tc-dns-intercept" } } on-error={}

# 7. Configure NAT Firewall Masquerade for Internet Access (WAN ether1)
:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="tc-hotspot-nat" } } on-error={}
:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat-wan"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="tc-hotspot-nat-wan" } } on-error={}

# 8. Configure Hotspot Profile & Server on "bridgeLocal"
:do { /ip hotspot profile remove [find name="tc-hotspot-profile"] } on-error={}
/ip hotspot profile add name="tc-hotspot-profile" hotspot-address=10.10.0.1 dns-name="" html-directory=hotspot login-by=http-chap,http-pap,trial trial-uptime-limit=1h trial-uptime-reset=1d rate-limit="" use-radius=no
:do { /ip hotspot remove [find interface="bridgeLocal"] } on-error={}
/ip hotspot add name="tc-hotspot" interface="bridgeLocal" address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" disabled=no

# 9. VPS Walled Garden Rules (Allows clients to reach VPS portal at 169.58.98.92)
:do { /ip hotspot walled-garden ip remove [find comment~"tc-vps"] } on-error={}
/ip hotspot walled-garden ip add dst-address=169.58.98.92 action=accept comment="tc-vps-server-access"
:do { /ip hotspot walled-garden remove [find comment~"tc-vps"] } on-error={}
/ip hotspot walled-garden add dst-host="*169.58.98.92*" action=allow comment="tc-vps-portal-domain"

# 10. Captive Portal Redirect to VPS (/portal)
:do { /file add name="hotspot/login.html" contents="<!DOCTYPE html><html><head><meta http-equiv=\"refresh\" content=\"0; url=http://169.58.98.92:3000/portal?mac=\$(mac)&ip=\$(ip)&link_login_only=\$(link-login-only)&user_url=\$(link-orig)\"></head><body style=\"background:#0b0f19;color:white;font-family:sans-serif;text-align:center;padding-top:40px;\">Connecting to T-Connect Portal...</body></html>" } on-error={ :do { /file set [find name="hotspot/login.html"] contents="<!DOCTYPE html><html><head><meta http-equiv=\"refresh\" content=\"0; url=http://169.58.98.92:3000/portal?mac=\$(mac)&ip=\$(ip)&link_login_only=\$(link-login-only)&user_url=\$(link-orig)\"></head><body style=\"background:#0b0f19;color:white;font-family:sans-serif;text-align:center;padding-top:40px;\">Connecting to T-Connect Portal...</body></html>" } on-error={} }

# 11. Instant Testing User for Fast Manual Logins (User: test / Pass: 123)
:do { /ip hotspot user remove [find name="test"] } on-error={}
/ip hotspot user add name="test" password="123" comment="T-Connect Instant Testing User"

# 12. Bypass AP Static Management IPs & Admin PC from Captive Portal
:do { /ip hotspot ip-binding remove [find comment~"tc-bypass-AP"] } on-error={}
/ip hotspot ip-binding add address=10.10.0.2 type=bypassed comment="tc-bypass-AP1-ether2"
/ip hotspot ip-binding add address=10.10.0.3 type=bypassed comment="tc-bypass-AP2-ether3"
/ip hotspot ip-binding add address=10.10.0.5 type=bypassed comment="tc-bypass-AP3-ether5"
/ip hotspot ip-binding add address=10.10.0.254 type=bypassed comment="tc-bypass-admin-pc"

# 13. Configure RouterOS 7.16.2 wifi-qcom Radios with SSID "MIKROTIK-TC"
:do {
  :foreach w in=[/interface wifi find] do={
    /interface wifi set $w configuration.ssid="MIKROTIK-TC" disabled=no
  };
  :log info "[T-Connect] Configured all RouterOS 7.16.2 wifi radios with SSID MIKROTIK-TC";
} on-error={ :log warning "Could not auto-configure wifi radios" }

# 14. Ensure WinBox Management Service (Port 8291) is Enabled
/ip service set winbox disabled=no port=8291

:log info "[T-Connect] Alignment complete! bridgeLocal is active with 10.10.0.1/22 gateway and VPS Walled Garden.";
:put "T-Connect: [SUCCESS] Alignment complete! Bridge bridgeLocal configured with 10.10.0.1/22 and MIKROTIK-TC WiFi.";
```

---

## 3. How to Test as a User (3 Ways)

### Option A: Test the Captive Portal User Flow
1. Connect phone or PC to WiFi **`MIKROTIK-TC`**.
2. Tap the **"Sign in to network"** notification, or open browser and go to **`http://10.10.0.1`** or **`http://neverssl.com`**.
3. You will see the **T-Connect Captive Portal**:
   - **Free Pass**: Tap "Connect Free (30 Mins)"
   - **Voucher**: Enter a voucher code or test user:
     - Username: `test`
     - Password: `123`
4. The hotspot grants you active status, and internet flows immediately!

### Option B: Direct VPS Portal Testing in Browser
If your phone is on WiFi and you want to open the portal UI directly:
- Open your phone's browser and go to:
  `http://169.58.98.92:3000/portal` (or your VPS address)
- Because `169.58.98.92` is in the Walled Garden, it opens without needing internet login first!

### Option C: Instant Full Internet Bypass (Verify Router NAT & Speed)
If you want to immediately verify that the router's internet and NAT are 100% working on your phone/PC without going through the captive portal:
In WinBox Terminal, run:
```routeros
# Temporarily bypass the hotspot for all devices:
/ip hotspot disable [find]
```
Test browsing (`google.com`, `fast.com`, YouTube).
When done testing direct browsing, re-enable the hotspot captive portal with:
```routeros
/ip hotspot enable [find]
```
Or bypass just your specific device by MAC address:
```routeros
/ip hotspot ip-binding add mac-address=YOUR_DEVICE_MAC type=bypassed comment="admin-phone"
```

---

## 4. High-Capacity IP Addressing Plan (`10.10.0.0/22`)

| Purpose | IP Range / Value | Netmask | Notes |
| :--- | :--- | :--- | :--- |
| **Subnet Network** | `10.10.0.0/22` | `255.255.252.0` | Broadcast: `10.10.3.255` |
| **MikroTik Router (`bridgeLocal`)** | `10.10.0.1` | `255.255.252.0` | Default Gateway & Captive Portal Intercept |
| **AP 1 Static IP (ether2)** | `10.10.0.2` | `255.255.252.0` | Bypassed from Captive Portal |
| **AP 2 Static IP (ether3)** | `10.10.0.3` | `255.255.252.0` | Bypassed from Captive Portal |
| **AP 3 Static IP (ether5)** | `10.10.0.5` | `255.255.252.0` | Bypassed from Captive Portal |
| **Admin PC Static Bypass (Optional)** | `10.10.0.254` | `255.255.252.0` | Direct admin work without voucher login |
| **Guest DHCP Dynamic Leases** | `10.10.0.50` – `10.10.3.250` | `255.255.252.0` | **970 concurrent guest leases** |
