# MikroTik RouterOS Port & WiFi Configuration (`port config.md`)

Bulletproof RouterOS CLI setup commands for Ethernet ports **ether2**, **ether3**, **ether5**, and wireless interface (open WiFi SSID `"MIKROTIK-TC"`) with **direct default bridge commands** (`bridge` / `bridge1`) and **RouterOS v6/v7 auto-detection script syntax fixes** (`[:pick ...]`).

---

## 1. Direct Copy-Paste Commands (Simplest & Most Reliable)

Run these direct commands in **WinBox > New Terminal** or SSH console. Choose the set matching your router's default bridge name (`bridge` or `bridge1`).

### Option A: If your main bridge is named `bridge` (Default on most MikroTik routers)

```routeros
# Add Ethernet Ports to main "bridge"
/interface bridge port add bridge=bridge interface=ether2 comment="tc-ap-ethernet-ether2"
/interface bridge port add bridge=bridge interface=ether3 comment="tc-ap-ethernet-ether3"
/interface bridge port add bridge=bridge interface=ether5 comment="tc-ap-ethernet-ether5"

# Configure Open Test WiFi SSID "MIKROTIK-TC" (RouterOS v6)
/interface wireless set [find] ssid="MIKROTIK-TC" mode=ap-bridge frequency=auto disabled=no

# Configure Open Test WiFi SSID "MIKROTIK-TC" (RouterOS v7)
/interface wifi set [find] configuration.ssid="MIKROTIK-TC" disabled=no
```

---

### Option B: If your main bridge is named `bridge1`

```routeros
# Add Ethernet Ports to "bridge1"
/interface bridge port add bridge=bridge1 interface=ether2 comment="tc-ap-ethernet-ether2"
/interface bridge port add bridge=bridge1 interface=ether3 comment="tc-ap-ethernet-ether3"
/interface bridge port add bridge=bridge1 interface=ether5 comment="tc-ap-ethernet-ether5"

# Configure Open Test WiFi SSID "MIKROTIK-TC" (RouterOS v6)
/interface wireless set [find] ssid="MIKROTIK-TC" mode=ap-bridge frequency=auto disabled=no

# Configure Open Test WiFi SSID "MIKROTIK-TC" (RouterOS v7)
/interface wifi set [find] configuration.ssid="MIKROTIK-TC" disabled=no
```

---

## 2. All-in-One Auto-Detecting RouterOS Script

This script automatically detects existing bridges (`bridge`, `bridge1`, `hs-bridge`, or `tctower-bridge`), uses valid RouterOS syntax (`[:pick ...]` with leading colon), and handles both RouterOS v6 and v7 wireless drivers.

```routeros
# ============================================================
# T-CONNECT AUTO-DETECTING PORT & WIFI CONFIGURATION SCRIPT
# Configures ether2, ether3, ether5 & open SSID "MIKROTIK-TC"
# ============================================================

:log info "[T-Connect] Initiating port & WiFi configuration...";

# 1. Determine Target Bridge (Checks bridge, bridge1, tctower-bridge, or first available bridge)
:local targetBridge "";
:if ([:len [/interface bridge find name="bridge"]] > 0) do={
  :set targetBridge "bridge";
} else={
  :if ([:len [/interface bridge find name="bridge1"]] > 0) do={
    :set targetBridge "bridge1";
  } else={
    :if ([:len [/interface bridge find name="tctower-bridge"]] > 0) do={
      :set targetBridge "tctower-bridge";
    } else={
      :if ([:len [/interface bridge find]] > 0) do={
        :set targetBridge [/interface bridge get [:pick [/interface bridge find] 0] name];
      } else={
        /interface bridge add name="bridge" comment="T-Connect Hotspot & AP Bridge";
        :set targetBridge "bridge";
      };
    };
  };
};

:log info ("[T-Connect] Using target bridge: " . $targetBridge);

# 2. Add Ethernet Ports (ether2, ether3, ether5) to Target Bridge
:do { :if ([:len [/interface bridge port find interface="ether2" bridge=$targetBridge]] = 0) do={ /interface bridge port add bridge=$targetBridge interface="ether2" comment="tc-ap-ethernet-ether2" } } on-error={ :log warning "Port ether2 already in bridge or unavailable" }
:do { :if ([:len [/interface bridge port find interface="ether3" bridge=$targetBridge]] = 0) do={ /interface bridge port add bridge=$targetBridge interface="ether3" comment="tc-ap-ethernet-ether3" } } on-error={ :log warning "Port ether3 already in bridge or unavailable" }
:do { :if ([:len [/interface bridge port find interface="ether5" bridge=$targetBridge]] = 0) do={ /interface bridge port add bridge=$targetBridge interface="ether5" comment="tc-ap-ethernet-ether5" } } on-error={ :log warning "Port ether5 already in bridge or unavailable" }

# 3. Configure Open Test WiFi SSID "MIKROTIK-TC" (RouterOS v6 & v7 Compatible)
:do {
  :if ([:len [/interface wireless find]] > 0) do={
    /interface wireless set [:pick [/interface wireless find] 0] ssid="MIKROTIK-TC" mode=ap-bridge frequency=auto disabled=no
    :log info "[T-Connect] RouterOS v6 wireless wlan1 configured with SSID MIKROTIK-TC";
  }
} on-error={}

:do {
  :if ([:len [/interface wifi find]] > 0) do={
    /interface wifi set [:pick [/interface wifi find] 0] configuration.ssid="MIKROTIK-TC" disabled=no
    :log info "[T-Connect] RouterOS v7 wifi configured with SSID MIKROTIK-TC";
  }
} on-error={}

:do {
  :if ([:len [/interface wifiwave2 find]] > 0) do={
    /interface wifiwave2 set [:pick [/interface wifiwave2 find] 0] configuration.ssid="MIKROTIK-TC" disabled=no
    :log info "[T-Connect] RouterOS v7 wifiwave2 configured with SSID MIKROTIK-TC";
  }
} on-error={}

# 4. Bypass Static Management IPs for Access Points
:do { /ip hotspot ip-binding remove [find comment~"tc-bypass-AP"] } on-error={}
:do { /ip hotspot ip-binding add address=192.168.88.2 type=bypassed comment="tc-bypass-AP-ether2" } on-error={}
:do { /ip hotspot ip-binding add address=192.168.88.3 type=bypassed comment="tc-bypass-AP-ether3" } on-error={}
:do { /ip hotspot ip-binding add address=192.168.88.5 type=bypassed comment="tc-bypass-AP-ether5" } on-error={}

# 5. Enable WinBox Management Service (Port 8291)
:do { /ip service set winbox disabled=no port=8291 } on-error={}

:log info "[T-Connect] Configuration complete! Ethernet clients on ether2, ether3, ether5 and wireless guests on MIKROTIK-TC are active.";
```

---

## 3. Independent WiFi CLI Controls (Disable & Enable)

> [!NOTE]
> **Disabling WiFi radio broadcasting ONLY turns off wireless broadcasting.**
> Wired Ethernet clients connected via **ether2**, **ether3**, and **ether5** as well as the T-Connect WireGuard controller connection remain **100% active and connected**.

### Disable WiFi Radio Broadcasting:
```routeros
# RouterOS v6
/interface wireless disable [find]

# RouterOS v7
/interface wifi disable [find]
```

### Enable WiFi Radio Broadcasting:
```routeros
# RouterOS v6
/interface wireless enable [find]

# RouterOS v7
/interface wifi enable [find]
```

---

## 4. AP Hotspot IP Bypasses & WinBox Service

```routeros
# Bypass AP static management IPs from Hotspot login prompt
/ip hotspot ip-binding add address=192.168.88.2 type=bypassed comment="tc-bypass-AP-ether2"
/ip hotspot ip-binding add address=192.168.88.3 type=bypassed comment="tc-bypass-AP-ether3"
/ip hotspot ip-binding add address=192.168.88.5 type=bypassed comment="tc-bypass-AP-ether5"

# Ensure WinBox service port 8291 is enabled
/ip service set winbox disabled=no port=8291
```

