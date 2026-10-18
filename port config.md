# ==============================================================================
# T-CONNECT MIKROTIK hAP ax3 (RouterOS v7.16.2) FULL-STACK ALIGNMENT SCRIPT
# ==============================================================================
# Wiring Layout:
# - ether1: Internet WAN Uplink (192.168.1.x DHCP Client -> NAT Masquerade)
# - ether2, ether3, ether4, ether5: Bridged into bridgeLocal (10.10.0.1/22 Hotspot)
# - wifi1 (5GHz) & wifi2 (2.4GHz): Bridged into bridgeLocal (MIKROTIK-TC WiFi)
#
# Paste this entire block into MikroTik WinBox -> New Terminal:
# ==============================================================================

# 1. Clean up any existing Hotspot on factory 'bridge' & create 'bridgeLocal'
:do { /ip hotspot remove [find interface="bridge"] } on-error={}
:do { /ip dhcp-server remove [find interface="bridge"] } on-error={}
:do { /ip address remove [find interface="bridge"] } on-error={}
:if ([:len [/interface bridge find name="bridgeLocal"]] = 0) do={
  /interface bridge add name="bridgeLocal" protocol-mode=rstp comment="T-Connect Unified Hotspot & AP Bridge"
} else={
  /interface bridge set [find name="bridgeLocal"] disabled=no
}

# 2. Isolate ether1 as dedicated WAN Uplink (NEVER bridge ether1 into LAN)
:do { /interface bridge port remove [find interface="ether1"] } on-error={}
:do { /ip dhcp-client remove [find interface="bridge"] } on-error={}
:do { /ip dhcp-client remove [find interface="bridgeLocal"] } on-error={}
:if ([:len [/ip dhcp-client find interface="ether1"]] = 0) do={
  /ip dhcp-client add interface="ether1" disabled=no use-peer-dns=yes add-default-route=yes comment="T-Connect Primary WAN Uplink"
} else={
  /ip dhcp-client set [find interface="ether1"] disabled=no add-default-route=yes
}
:do { /ip route remove [find gateway="ether2"] } on-error={}

# 3. Move ether2, ether3, ether4, ether5 AND wifi1, wifi2 from factory 'bridge' into 'bridgeLocal'
:foreach p in={"ether2";"ether3";"ether4";"ether5"} do={
  :if ([:len [/interface find name=$p]] > 0) do={
    :do { /interface bridge port remove [find interface=$p bridge!="bridgeLocal"] } on-error={}
    :if ([:len [/interface bridge port find interface=$p bridge="bridgeLocal"]] = 0) do={
      :do { /interface bridge port add bridge="bridgeLocal" interface=$p comment=("T-Connect LAN/AP Port " . $p) } on-error={}
    }
  }
}

# Configure WiFi 6 (wifi1 / wifi2) or legacy wlan1 / wlan2 for Open Captive Portal
:do {
  :if ([:len [/interface wifi find]] > 0) do={
    :do { /interface wifi security remove [find name="tc-open-sec"] } on-error={}
    /interface wifi security add name="tc-open-sec" authentication-types=""
    :foreach w in=[/interface wifi find] do={
      :local wname [/interface wifi get $w name]
      /interface wifi set $w configuration.mode=ap configuration.ssid="MIKROTIK-TC" security=tc-open-sec disabled=no
      :do { /interface bridge port remove [find interface=$wname bridge!="bridgeLocal"] } on-error={}
      :if ([:len [/interface bridge port find interface=$wname bridge="bridgeLocal"]] = 0) do={
        :do { /interface bridge port add bridge="bridgeLocal" interface=$wname comment="T-Connect Built-in WiFi" } on-error={}
      }
    }
  }
} on-error={}

# 4. Configure 10.10.0.1/22 Gateway & DHCP Server on bridgeLocal (Sole DNS = 10.10.0.1)
:do { /ip address remove [find interface="bridgeLocal" address!="10.10.0.1/22"] } on-error={}
:if ([:len [/ip address find address="10.10.0.1/22" interface="bridgeLocal"]] = 0) do={
  /ip address add address=10.10.0.1/22 interface="bridgeLocal" network=10.10.0.0 comment="T-Connect Hotspot Gateway"
}
:do { /ip pool remove [find name="tc-hotspot-pool"] } on-error={}
/ip pool add name="tc-hotspot-pool" ranges=10.10.0.10-10.10.3.254
:do { /ip dhcp-server remove [find interface="bridgeLocal"] } on-error={}
/ip dhcp-server add name="tc-dhcp" interface="bridgeLocal" address-pool="tc-hotspot-pool" lease-time=1h disabled=no
:do { /ip dhcp-server network remove [find address="10.10.0.0/22"] } on-error={}
/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 domain="portal.tconnect.local" comment="T-Connect Hotspot Network"

# 5. DNS Interception & NAT Masquerade for 10.10.0.0/22
/ip dns set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes
:do { /ip dns static remove [find name="portal.tconnect.local"] } on-error={}
/ip dns static add name="portal.tconnect.local" address=10.10.0.1 ttl=5m
:do { /ip firewall nat remove [find comment~"T-Connect: Prevent"] } on-error={}
/ip firewall nat add chain=dstnat in-interface="bridgeLocal" protocol=udp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Prevent DNS Leaks"
/ip firewall nat add chain=dstnat in-interface="bridgeLocal" protocol=tcp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Prevent TCP DNS Leaks"
:do { /ip firewall nat remove [find comment="T-Connect Hotspot Masquerade"] } on-error={}
/ip firewall nat add chain=srcnat src-address=10.10.0.0/22 action=masquerade comment="T-Connect Hotspot Masquerade"
:do { /ip firewall nat remove [find comment="T-Connect Global WAN Masquerade"] } on-error={}
/ip firewall nat add chain=srcnat out-interface="ether1" action=masquerade comment="T-Connect Global WAN Masquerade"

# 6. Enable MikroTik Captive Portal Hotspot on bridgeLocal (Cookies Disabled for Instant Redirect)
:do { /ip hotspot ip-binding remove [find type=bypassed] } on-error={}
:do { /ip hotspot cookie remove [find] } on-error={}
:do { /ip hotspot active remove [find] } on-error={}
:do { /ip hotspot host remove [find] } on-error={}
:if ([:len [/ip hotspot profile find name="tc-hotspot-profile"]] = 0) do={
  /ip hotspot profile add name="tc-hotspot-profile" hotspot-address=10.10.0.1 dns-name="portal.tconnect.local" html-directory=hotspot login-by=http-chap,http-pap,trial http-cookie-lifetime=none split-user-domain=no trial-uptime-limit=30m/1d use-radius=yes
} else={
  /ip hotspot profile set [find name="tc-hotspot-profile"] hotspot-address=10.10.0.1 dns-name="portal.tconnect.local" html-directory=hotspot login-by=http-chap,http-pap,trial http-cookie-lifetime=none split-user-domain=no trial-uptime-limit=30m/1d disabled=no
}
:if ([:len [/ip hotspot find interface="bridgeLocal"]] = 0) do={
  /ip hotspot add name="tc-hotspot-server" interface="bridgeLocal" address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" addresses-per-mac=1 disabled=no
} else={
  /ip hotspot set [find interface="bridgeLocal"] profile="tc-hotspot-profile" address-pool="tc-hotspot-pool" disabled=no
}

# 7. Walled Garden: Allow Controller (169.58.98.92) & EcoCash/OTT Only — Purge OS Probe Domains!
:do { /ip hotspot walled-garden remove [find dst-host~"apple" or dst-host~"icloud" or dst-host~"gstatic" or dst-host~"google" or dst-host~"msft" or dst-host~"microsoft" or dst-host~"firefox" or dst-host~"cloudflare" or dst-host~"vodacom" or dst-host~"mywallet"] } on-error={}
:do { /ip hotspot walled-garden ip remove [find comment~"T-Connect"] } on-error={}
/ip hotspot walled-garden ip add action=accept dst-address=169.58.98.92 comment="T-Connect Controller IP"
/ip hotspot walled-garden ip add action=accept dst-address=10.10.0.1 comment="T-Connect Local Gateway"

# 8. Provision Hotspot Users (T-TRIAL for Free Access + test/123)
:if ([:len [/ip hotspot user find name="T-TRIAL"]] = 0) do={
  /ip hotspot user add name="T-TRIAL" password="123" limit-uptime=30m comment="T-Connect Free Trial Auth User"
}
:if ([:len [/ip hotspot user find name="test"]] = 0) do={
  /ip hotspot user add name="test" password="123" comment="T-Connect Test User"
}

# 9. Deploy On-Router Portal Builder Splash Page (RouterOS v7.16.2 Safe - No /file add)
:do { /ip hotspot reset-html [find interface="bridgeLocal"] } on-error={}
:delay 1s
:do { /tool fetch url="http://169.58.98.92:3000/api/portal/router-login.html" dst-path="hotspot/login.html" check-certificate=no } on-error={}
:do { /tool fetch url="http://169.58.98.92:3000/api/portal/router-login.html" dst-path="flash/hotspot/login.html" check-certificate=no } on-error={}
:do { /tool fetch url="http://169.58.98.92:3000/api/portal/router-alogin.html" dst-path="hotspot/alogin.html" check-certificate=no } on-error={}
:do { /tool fetch url="http://169.58.98.92:3000/api/portal/router-alogin.html" dst-path="flash/hotspot/alogin.html" check-certificate=no } on-error={}
:if ([:len [/file find name="flash/hotspot/login.html"]] > 0) do={
  /ip hotspot profile set [find name="tc-hotspot-profile"] html-directory=flash/hotspot
} else={
  /ip hotspot profile set [find name="tc-hotspot-profile"] html-directory=hotspot
}

:log info "T-Connect Full-Stack Hotspot Alignment Complete: ether1=WAN, ether2-ether5+WiFi=10.10.0.1/22 Hotspot"
:put ">>> SUCCESS: T-CONNECT HOTSPOT ACTIVE ON 10.10.0.1/22 (ether2-ether5 + MIKROTIK-TC WiFi) <<<"
