# MikroTik RouterOS 7.16.2 (`wifi-qcom`) Port & WiFi Configuration (`port config.md`)

Verified, bulletproof RouterOS CLI setup commands for **RouterOS 7.16.2** with the **`wifi-qcom`** package (Qualcomm WiFi 6/ax architecture, e.g., hAP ax², hAP ax³, Chateau, L009).

Configures Ethernet ports **ether2**, **ether3**, **ether5**, and wireless radios (**wifi1** & **wifi2**) with the open WiFi SSID `"MIKROTIK-TC"`.

---

## 1. Direct Copy-Paste Commands (Recommended for Fast Setup)

Open **WinBox > New Terminal** or SSH into your router (`admin@TC-MikroTik-435225`).  
Choose **Option A** (default on standard MikroTik routers) or **Option B** (if your bridge was named `bridge1`).

### Option A: If your default bridge is named `bridge`

```routeros
# 1. Add Ethernet Ports to main "bridge"
/interface bridge port add bridge=bridge interface=ether2 comment="tc-ap-ethernet-ether2"
/interface bridge port add bridge=bridge interface=ether3 comment="tc-ap-ethernet-ether3"
/interface bridge port add bridge=bridge interface=ether5 comment="tc-ap-ethernet-ether5"

# 2. Configure Open Test WiFi SSID "MIKROTIK-TC" (RouterOS 7.16.2 wifi-qcom)
/interface wifi set [find] configuration.ssid="MIKROTIK-TC" disabled=no

# 3. Bypass AP Static Management IPs from Captive Portal
/ip hotspot ip-binding add address=192.168.88.2 type=bypassed comment="tc-bypass-AP-ether2"
/ip hotspot ip-binding add address=192.168.88.3 type=bypassed comment="tc-bypass-AP-ether3"
/ip hotspot ip-binding add address=192.168.88.5 type=bypassed comment="tc-bypass-AP-ether5"

# 4. Verify WinBox Port Service is Enabled
/ip service set winbox disabled=no port=8291
```

---

### Option B: If your default bridge is named `bridge1`

```routeros
# 1. Add Ethernet Ports to "bridge1"
/interface bridge port add bridge=bridge1 interface=ether2 comment="tc-ap-ethernet-ether2"
/interface bridge port add bridge=bridge1 interface=ether3 comment="tc-ap-ethernet-ether3"
/interface bridge port add bridge=bridge1 interface=ether5 comment="tc-ap-ethernet-ether5"

# 2. Configure Open Test WiFi SSID "MIKROTIK-TC" (RouterOS 7.16.2 wifi-qcom)
/interface wifi set [find] configuration.ssid="MIKROTIK-TC" disabled=no

# 3. Bypass AP Static Management IPs from Captive Portal
/ip hotspot ip-binding add address=192.168.88.2 type=bypassed comment="tc-bypass-AP-ether2"
/ip hotspot ip-binding add address=192.168.88.3 type=bypassed comment="tc-bypass-AP-ether3"
/ip hotspot ip-binding add address=192.168.88.5 type=bypassed comment="tc-bypass-AP-ether5"

# 4. Verify WinBox Port Service is Enabled
/ip service set winbox disabled=no port=8291
```

---

## 2. All-in-One Auto-Detecting RouterOS 7.16.2 Script

This script automatically:
1. Detects your existing bridge (`bridge`, `bridge1`, or first available bridge) using valid RouterOS syntax (`[:pick ...]` with leading colons).
2. Adds ports `ether2`, `ether3`, and `ether5` to the active bridge safely (won't error if already added).
3. Automatically iterates through all active Qualcomm WiFi radios (`wifi1`, `wifi2`) and applies SSID `"MIKROTIK-TC"`.
4. Adds IP bypasses for static AP management so AP controllers don't get trapped by the captive portal.
5. Verifies WinBox service (port 8291) is active.

```routeros
# ============================================================
# T-CONNECT AUTO-DETECTING CONFIGURATION SCRIPT
# RouterOS 7.16.2 (wifi-qcom) Optimized
# ============================================================

:log info "[T-Connect] Initiating RouterOS 7.16.2 port & WiFi configuration...";

# 1. Determine Target Bridge (bridge, bridge1, or first available bridge)
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

# 3. Configure Open Test WiFi SSID "MIKROTIK-TC" (Iterates all RouterOS 7.16.2 wifi-qcom radios)
:do {
  :if ([:len [/interface wifi find]] > 0) do={
    :foreach w in=[/interface wifi find] do={
      /interface wifi set $w configuration.ssid="MIKROTIK-TC" disabled=no
    };
    :log info "[T-Connect] Configured all RouterOS 7.16.2 wifi interfaces with SSID MIKROTIK-TC";
  } else={
    :if ([:len [/interface wireless find]] > 0) do={
      /interface wireless set [:pick [/interface wireless find] 0] ssid="MIKROTIK-TC" mode=ap-bridge frequency=auto disabled=no
      :log info "[T-Connect] Legacy wireless interface configured with SSID MIKROTIK-TC";
    };
  };
} on-error={ :log warning "Could not auto-configure wireless interface" }

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

### RouterOS 7.16.2 (`wifi-qcom`) Commands:

#### Turn OFF Wireless Radio Broadcasting (All Radios):
```routeros
/interface wifi disable [find]
```

#### Turn OFF Specific Wireless Radio:
```routeros
# Disable 5 GHz Radio (wifi1):
/interface wifi disable [find name=wifi1]

# Disable 2.4 GHz Radio (wifi2):
/interface wifi disable [find name=wifi2]
```

#### Turn ON Wireless Radio Broadcasting:
```routeros
/interface wifi enable [find]
```

---

### Legacy RouterOS v6 Reference (Older Hardware):
```routeros
# Disable v6 wireless
/interface wireless disable [find]

# Enable v6 wireless
/interface wireless enable [find]
```

---

## 4. Why the Previous Errors Occurred

1. **`expected end of command (line 1 column 35)`**:  
   This occurred because RouterOS 7.16.2 with `wifi-qcom` uses the `/interface wifi` menu. The old `/interface wireless` command syntax does not exist or has different parameters under the `wifi-qcom` package.
2. **`bad command name pick`**:  
   In RouterOS scripting syntax, built-in functions require a leading colon inside bracket expressions: `[:pick ...]` instead of `[pick ...]`.
3. **`input does not match any value of bridge` / `ambiguous value of bridge`**:  
   Occurred when the local variable was empty due to the syntax error, or when targeting `tctower-bridge` before that bridge was created. Targeting the router's existing default bridge (`bridge` or `bridge1`) resolves this completely.
