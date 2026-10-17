# MikroTik RouterOS Port & WiFi Configuration (`port config.md`)

RouterOS CLI setup commands for Ethernet ports **ether2**, **ether3**, **ether5**, and **wlan1** (open WiFi SSID `"MIKROTIK-TC"`).

---

## 1. Combined All-in-One Copy-Paste RouterOS Script

Paste this complete block into **WinBox > New Terminal** or SSH console to configure all ports, bridge interfaces, open test WiFi SSID, and IP bindings at once:

```routeros
# ============================================================
# T-CONNECT HOTSPOT PORT & WIFI CONFIGURATION SCRIPT
# Configures ether2, ether3, ether5 & open SSID "MIKROTIK-TC"
# ============================================================

:log info "[T-Connect] Initiating port & WiFi configuration...";

# 1. Ensure Target Hotspot Bridge Exists
:do {
  :if ([:len [/interface bridge find name="tctower-bridge"]] = 0) do={
    /interface bridge add name="tctower-bridge" comment="T-Connect Hotspot & AP Bridge"
  }
} on-error={}

# 2. Add Ethernet Ports (ether2, ether3, ether5) to Hotspot Bridge
:do { :if ([:len [/interface bridge port find interface="ether2" bridge="tctower-bridge"]] = 0) do={ /interface bridge port add bridge="tctower-bridge" interface="ether2" comment="tc-ap-ethernet-ether2" } } on-error={ :log warning "Port ether2 already in bridge" }
:do { :if ([:len [/interface bridge port find interface="ether3" bridge="tctower-bridge"]] = 0) do={ /interface bridge port add bridge="tctower-bridge" interface="ether3" comment="tc-ap-ethernet-ether3" } } on-error={ :log warning "Port ether3 already in bridge" }
:do { :if ([:len [/interface bridge port find interface="ether5" bridge="tctower-bridge"]] = 0) do={ /interface bridge port add bridge="tctower-bridge" interface="ether5" comment="tc-ap-ethernet-ether5" } } on-error={ :log warning "Port ether5 already in bridge" }

# 3. Configure Open Test WiFi SSID "MIKROTIK-TC"
:do {
  /interface wireless set [find name=wlan1] ssid="MIKROTIK-TC" mode=ap-bridge band=2ghz-b/g/n frequency=auto wireless-protocol=802.11 security-profile=none disabled=no
} on-error={ :log warning "wlan1 interface not available on this RouterOS hardware model" }

# 4. Bypass Static Management IPs for Access Points (Prevents Splash Interception)
:do { /ip hotspot ip-binding remove [find comment~"tc-bypass-AP"] } on-error={}
:do { /ip hotspot ip-binding add address=192.168.88.2 type=bypassed comment="tc-bypass-AP-ether2" } on-error={}
:do { /ip hotspot ip-binding add address=192.168.88.3 type=bypassed comment="tc-bypass-AP-ether3" } on-error={}
:do { /ip hotspot ip-binding add address=192.168.88.5 type=bypassed comment="tc-bypass-AP-ether5" } on-error={}

# 5. Enable WinBox Service (Port 8291)
:do { /ip service set winbox disabled=no port=8291 } on-error={}

:log info "[T-Connect] Configuration applied successfully. Ethernet clients on ether2, ether3, ether5 and wireless clients on MIKROTIK-TC are redirected to captive portal.";
```

---

## 2. Modular Command Reference & Step-by-Step Breakdown

### Part A: Add Ethernet Ports (ether2, ether3, ether5) to Hotspot Bridge

Connecting an Ethernet cable directly to **ether2**, **ether3**, or **ether5** grants instant wired client connectivity and redirects connected devices or Access Points to the T-Connect captive portal.

```routeros
# Add ether2 to Hotspot Bridge
/interface bridge port add bridge=tctower-bridge interface="ether2" comment="tc-ap-ethernet-ether2"

# Add ether3 to Hotspot Bridge
/interface bridge port add bridge=tctower-bridge interface="ether3" comment="tc-ap-ethernet-ether3"

# Add ether5 to Hotspot Bridge
/interface bridge port add bridge=tctower-bridge interface="ether5" comment="tc-ap-ethernet-ether5"
```

---

### Part B: Configure Open Test WiFi SSID (`MIKROTIK-TC`)

Establishes an unencrypted open WiFi access point broadcasting the SSID **"MIKROTIK-TC"** for platform testing:

```routeros
/interface wireless set [find name=wlan1] ssid="MIKROTIK-TC" mode=ap-bridge band=2ghz-b/g/n frequency=auto wireless-protocol=802.11 security-profile=none disabled=no
```

---

### Part C: Independent WiFi Radio Controls (Disable & Enable)

> [!NOTE]
> **Disabling WiFi broadcasting ONLY turns off wireless radio `wlan1`.**
> Wired Ethernet clients connected via **ether2**, **ether3**, and **ether5** as well as the T-Connect platform controller over WireGuard remain **100% active and connected**.

#### Disable WiFi Broadcasting:
```routeros
/interface wireless disable [find name=wlan1]
```

#### Enable WiFi Broadcasting:
```routeros
/interface wireless enable [find name=wlan1]
```

---

### Part D: Bypass Access Point Static Management IPs

Bypasses static management IPs for Access Points plugged into **ether2**, **ether3**, or **ether5** so AP firmware downloads and cloud controller traffic bypass the captive portal login screen:

```routeros
# Bypass AP on ether2 (Static IP: 192.168.88.2)
/ip hotspot ip-binding add address=192.168.88.2 type=bypassed comment="tc-bypass-AP-ether2"

# Bypass AP on ether3 (Static IP: 192.168.88.3)
/ip hotspot ip-binding add address=192.168.88.3 type=bypassed comment="tc-bypass-AP-ether3"

# Bypass AP on ether5 (Static IP: 192.168.88.5)
/ip hotspot ip-binding add address=192.168.88.5 type=bypassed comment="tc-bypass-AP-ether5"
```

---

### Part E: Verify WinBox Service Port

Ensures WinBox desktop access remains open on port 8291:

```routeros
/ip service set winbox disabled=no port=8291
```
