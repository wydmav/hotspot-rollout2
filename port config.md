# MikroTik RouterOS Port & WiFi Configuration (`port config.md`)

Bulletproof RouterOS CLI setup commands for Ethernet ports **ether2**, **ether3**, **ether5**, and **wlan1** (open WiFi SSID `"MIKROTIK-TC"`) with **bridge auto-detection** and **RouterOS v6/v7 wireless compatibility**.

---

## 1. Combined All-in-One Auto-Detecting RouterOS Script

Paste this complete block into **WinBox > New Terminal** or SSH console. It automatically detects your router's active bridge name (e.g. `bridge`, `bridge1`, `hs-bridge`, or `tctower-bridge`) to avoid "input does not match any value of bridge" errors and handles wireless interface syntax for RouterOS v6 & v7:

```routeros
# ============================================================
# T-CONNECT AUTO-DETECTING PORT & WIFI CONFIGURATION SCRIPT
# Configures ether2, ether3, ether5 & open SSID "MIKROTIK-TC"
# ============================================================

:log info "[T-Connect] Initiating port & WiFi configuration...";

# 1. Auto-Detect Existing Active Bridge or Create Target Bridge
:local targetBridge "tctower-bridge";
:if ([:len [/interface bridge find name="tctower-bridge"]] = 0) do={
  :if ([:len [/interface bridge find]] > 0) do={
    :set targetBridge [/interface bridge get [pick [/interface bridge find] 0] name];
    :log info ("[T-Connect] Detected active bridge: " . $targetBridge);
  } else={
    /interface bridge add name="tctower-bridge" comment="T-Connect Hotspot & AP Bridge";
    :set targetBridge "tctower-bridge";
    :log info "[T-Connect] Created bridge: tctower-bridge";
  }
} else={
  :log info "[T-Connect] Using existing bridge: tctower-bridge";
};

# 2. Add Ethernet Ports (ether2, ether3, ether5) to Target Bridge
:do { :if ([:len [/interface bridge port find interface="ether2" bridge=$targetBridge]] = 0) do={ /interface bridge port add bridge=$targetBridge interface="ether2" comment="tc-ap-ethernet-ether2" } } on-error={ :log warning "Port ether2 already in bridge or unavailable" }
:do { :if ([:len [/interface bridge port find interface="ether3" bridge=$targetBridge]] = 0) do={ /interface bridge port add bridge=$targetBridge interface="ether3" comment="tc-ap-ethernet-ether3" } } on-error={ :log warning "Port ether3 already in bridge or unavailable" }
:do { :if ([:len [/interface bridge port find interface="ether5" bridge=$targetBridge]] = 0) do={ /interface bridge port add bridge=$targetBridge interface="ether5" comment="tc-ap-ethernet-ether5" } } on-error={ :log warning "Port ether5 already in bridge or unavailable" }

# 3. Configure Open Test WiFi SSID "MIKROTIK-TC" (RouterOS v6 & v7 Compatible)
:do {
  :if ([:len [/interface wireless find]] > 0) do={
    /interface wireless set [pick [/interface wireless find] 0] ssid="MIKROTIK-TC" mode=ap-bridge frequency=auto disabled=no
    :log info "[T-Connect] RouterOS v6 wireless wlan1 configured with SSID MIKROTIK-TC";
  }
} on-error={}

:do {
  :if ([:len [/interface wifi find]] > 0) do={
    /interface wifi set [pick [/interface wifi find] 0] configuration.ssid="MIKROTIK-TC" disabled=no
    :log info "[T-Connect] RouterOS v7 wifi configured with SSID MIKROTIK-TC";
  }
} on-error={}

:do {
  :if ([:len [/interface wifiwave2 find]] > 0) do={
    /interface wifiwave2 set [pick [/interface wifiwave2 find] 0] configuration.ssid="MIKROTIK-TC" disabled=no
    :log info "[T-Connect] RouterOS v7 wifiwave2 configured with SSID MIKROTIK-TC";
  }
} on-error={}

# 4. Bypass Static Management IPs for Access Points (Prevents Splash Interception)
:do { /ip hotspot ip-binding remove [find comment~"tc-bypass-AP"] } on-error={}
:do { /ip hotspot ip-binding add address=192.168.88.2 type=bypassed comment="tc-bypass-AP-ether2" } on-error={}
:do { /ip hotspot ip-binding add address=192.168.88.3 type=bypassed comment="tc-bypass-AP-ether3" } on-error={}
:do { /ip hotspot ip-binding add address=192.168.88.5 type=bypassed comment="tc-bypass-AP-ether5" } on-error={}

# 5. Enable WinBox Service (Port 8291)
:do { /ip service set winbox disabled=no port=8291 } on-error={}

:log info "[T-Connect] Configuration complete! Wired ethernet clients on ether2, ether3, ether5 and wireless guests on MIKROTIK-TC are active.";
```

---

## 2. Modular Command Reference & Step-by-Step Breakdown

### Part A: Add Ethernet Ports (ether2, ether3, ether5) to Active Bridge

If your bridge is named `bridge` or `bridge1`, replace `YOUR_BRIDGE_NAME` with your actual bridge name (or run the snippet below which auto-detects it):

```routeros
# Auto-detect bridge and add ether2
:local b [/interface bridge get [pick [/interface bridge find] 0] name];
/interface bridge port add bridge=$b interface="ether2" comment="tc-ap-ethernet-ether2"

# Auto-detect bridge and add ether3
:local b [/interface bridge get [pick [/interface bridge find] 0] name];
/interface bridge port add bridge=$b interface="ether3" comment="tc-ap-ethernet-ether3"

# Auto-detect bridge and add ether5
:local b [/interface bridge get [pick [/interface bridge find] 0] name];
/interface bridge port add bridge=$b interface="ether5" comment="tc-ap-ethernet-ether5"
```

---

### Part B: Configure Open Test WiFi SSID (`MIKROTIK-TC`)

#### RouterOS v6 (Standard Wireless):
```routeros
/interface wireless set wlan1 ssid="MIKROTIK-TC" mode=ap-bridge frequency=auto disabled=no
```

#### RouterOS v7 (WifiWave2):
```routeros
/interface wifi set [pick [/interface wifi find] 0] configuration.ssid="MIKROTIK-TC" disabled=no
```

---

### Part C: Independent WiFi Radio Controls (Disable & Enable)

> [!NOTE]
> **Disabling WiFi radio broadcasting ONLY turns off the wireless signal.**
> Wired Ethernet clients connected via **ether2**, **ether3**, and **ether5** as well as the T-Connect controller platform over WireGuard remain **100% active and connected**.

#### Disable WiFi Radio Broadcasting:
```routeros
# RouterOS v6
/interface wireless disable [find]

# RouterOS v7
/interface wifi disable [find]
```

#### Enable WiFi Radio Broadcasting:
```routeros
# RouterOS v6
/interface wireless enable [find]

# RouterOS v7
/interface wifi enable [find]
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
