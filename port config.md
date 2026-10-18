# ==============================================================================
# T-CONNECT MIKROTIK hAP ax3 (RouterOS v7.16.2) FULL-STACK ALIGNMENT SCRIPT
# ==============================================================================
# Wiring Layout:
# - ether1: Internet WAN Uplink (Starlink / ISP) - Strictly isolated from bridges
# - ether2, ether3, ether4, ether5: Bridged into bridgeLocal (10.10.0.1/22 Hotspot)
#   for External Access Points (Bridge/AP Mode) & Wired PC Testing
# - wifi1, wifi2: Open SSID "MIKROTIK-TC" bound to bridgeLocal (10.10.0.1/22 Hotspot)
# - On-Router Splash Page: Fetched live from http://169.58.98.92:3000/api/portal/router-login.html
#   (Supports EcoCash & 16-Digit OTT Voucher PIN with 4x4 auto-formatting)
# ==============================================================================

# 1. Ensure Target Bridge 'bridgeLocal' Exists with ARP & RSTP Enabled
:if ([:len [/interface bridge find name="bridgeLocal"]] = 0) do={
  /interface bridge add name="bridgeLocal" arp=enabled protocol-mode=rstp disabled=no comment="T-Connect Hotspot & AP Local Bridge"
} else={
  /interface bridge set [find name="bridgeLocal"] arp=enabled protocol-mode=rstp disabled=no
}

# 2. Isolate WAN (ether1) from ALL Bridges & Ensure ether2-ether5 Are Never Treated as WAN
:do { /interface bridge port remove [find interface="ether1"] } on-error={}
:do { /ip dhcp-client remove [find interface!="ether1"] } on-error={}
:do { /interface list member remove [find list=WAN interface!="ether1"] } on-error={}
:do { :if ([:len [/ip dhcp-client find interface="ether1"]] = 0) do={ /ip dhcp-client add interface="ether1" disabled=no add-default-route=yes default-route-distance=1 use-peer-dns=yes comment="T-Connect WAN ether1" } else={ /ip dhcp-client set [find interface="ether1"] disabled=no add-default-route=yes default-route-distance=1 } } on-error={}
:do { /ip route remove [find comment="tc-wan2-backup"] } on-error={}
:do { /ip route remove [find comment="tc-wan1-primary"] } on-error={}
:do { /ip route remove [find comment="tc-wan1-canary"] } on-error={}
:do { /ip route remove [find gateway~"ether2|ether3|ether4|ether5"] } on-error={}

# 3. Enable & Move ether2, ether3, ether4, ether5, wifi1, wifi2 into 'bridgeLocal' (Transparent L2 AP Bridge)
:do { /interface ethernet set [find default-name~"ether2|ether3|ether4|ether5"] disabled=no arp=enabled } on-error={}
:foreach p in={"ether2";"ether3";"ether4";"ether5";"wifi1";"wifi2"} do={
  :do {
    :if ([:len [/interface bridge port find interface=$p]] > 0) do={
      /interface bridge port set [find interface=$p] bridge="bridgeLocal" horizon=none disabled=no
    } else={
      /interface bridge port add bridge="bridgeLocal" interface=$p horizon=none disabled=no
    }
  } on-error={}
}

# 4. ConfigureRouterOS 7.16.2 wifi-qcom Radios with Open SSID "MIKROTIK-TC" on 'bridgeLocal'
:do {
  :foreach w in=[/interface wifi find] do={
    /interface wifi set $w configuration.ssid="MIKROTIK-TC" configuration.mode=ap datapath.bridge="bridgeLocal" disabled=no
    :do { /interface wifi unset $w security } on-error={}
    :do { /interface wifi unset $w security.passphrase } on-error={}
  }
} on-error={}

# 5. Clean Conflicting LAN IPs / DHCP / Hotspots & Assign 10.10.0.1/22 to 'bridgeLocal'
:do { /ip dhcp-server remove [find interface!="bridgeLocal"] } on-error={}
:do { /ip hotspot remove [find interface!="bridgeLocal"] } on-error={}
:do { /ip address remove [find interface~"ether2|ether3|ether4|ether5"] } on-error={}
:do { /ip address remove [find interface="bridge"] } on-error={}
:do { /ip address remove [find interface="bridgeLocal"] } on-error={}
/ip address add address=10.10.0.1/22 network=10.10.0.0 interface="bridgeLocal" comment="tc-hotspot-lan-gateway"

# 6. Configure DHCP Pool (10.10.0.50-10.10.3.250) & DHCP Server on 'bridgeLocal'
# Strictly sets DNS to 10.10.0.1 so Android, iOS, Windows & macOS trigger Captive Portal immediately on WiFi & APs
:do { /ip pool remove [find name="tc-hotspot-pool"] } on-error={}
/ip pool add name="tc-hotspot-pool" ranges=10.10.0.50-10.10.3.250
:do { /ip dhcp-server remove [find interface="bridgeLocal"] } on-error={}
:do { /ip dhcp-server network remove [find] } on-error={}
/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 comment="T-Connect Hotspot Guest Network"
/ip dhcp-server add name="tc-dhcp-server" interface="bridgeLocal" address-pool="tc-hotspot-pool" lease-time=1h disabled=no

# 7. DNS Resolver, DNS Intercept & WAN Masquerade NAT
/ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8
:do { /ip firewall filter remove [find comment~"Fast-Fail Unauth TCP"] } on-error={}
:do { :if ([:len [/ip firewall nat find comment="tc-dns-intercept"]] = 0) do={ /ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="tc-dns-intercept" } } on-error={}
:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="tc-hotspot-nat" } } on-error={}

# 8. Hotspot Profile & Server on 'bridgeLocal' (Cookies Disabled; addresses-per-mac=unlimited for APs on ether2-ether5)
:do { /ip hotspot profile remove [find name="tc-hotspot-profile"] } on-error={}
/ip hotspot profile add name="tc-hotspot-profile" hotspot-address=10.10.0.1 dns-name="" html-directory=hotspot login-by=http-chap,http-pap,trial http-cookie-lifetime=none split-user-domain=no trial-uptime-limit=30m trial-uptime-reset=1d rate-limit="" use-radius=no
:do { /ip hotspot profile set [find default=yes] login-by=http-chap,http-pap,trial http-cookie-lifetime=none use-radius=no } on-error={}
:do { /ip hotspot remove [find interface="bridgeLocal"] } on-error={}
/ip hotspot add name="tc-hotspot" interface="bridgeLocal" address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" addresses-per-mac=unlimited idle-timeout=5m keepalive-timeout=2m disabled=no

# 9. Hotspot Auth Users (Paid/Voucher 'test' User & Free Mode 'T-TRIAL' User)
:do { /ip hotspot user remove [find name="test"] } on-error={}
/ip hotspot user add name="test" password="123" comment="T-Connect Paid/Voucher Auth User"
:do { /ip hotspot user remove [find name="T-TRIAL"] } on-error={}
/ip hotspot user add name="T-TRIAL" password="123" limit-uptime=30m comment="T-Connect Free Trial Auth User"

# 10. Bypass Only Static AP Management IPs (Wireless guests on APs get 10.10.0.50+ & Splash Page)
:do { /ip hotspot ip-binding remove [find comment~"tc-bypass"] } on-error={}
/ip hotspot ip-binding add address=10.10.0.2 type=bypassed comment="tc-bypass-AP1-ether2"
/ip hotspot ip-binding add address=10.10.0.3 type=bypassed comment="tc-bypass-AP2-ether3"
/ip hotspot ip-binding add address=10.10.0.4 type=bypassed comment="tc-bypass-AP3-ether4"
/ip hotspot ip-binding add address=10.10.0.5 type=bypassed comment="tc-bypass-AP4-ether5"

# 11. Walled Garden for VPS Controller & Payment Gateways (EcoCash & OTT Voucher Only)
# Purges OS captive probe domains so connecting devices ALWAYS pop up the Splash Page immediately!
:do { /ip hotspot walled-garden remove [find dst-host~"apple" or dst-host~"gstatic" or dst-host~"google" or dst-host~"msft" or dst-host~"firefox" or dst-host~"vodacom" or dst-host~"mywallet"] } on-error={}
:do { /ip hotspot walled-garden ip remove [find comment~"tc-vps"] } on-error={}
/ip hotspot walled-garden ip add dst-address=169.58.98.92 action=accept comment="tc-vps-server-access"
:do { /ip hotspot walled-garden remove [find comment~"tc-vps"] } on-error={}
/ip hotspot walled-garden add dst-host="*169.58.98.92*" action=allow comment="tc-vps-portal-domain"
/ip hotspot walled-garden add dst-host="*econet.co.ls" action=allow comment="tc-ecocash-walled-garden"
/ip hotspot walled-garden add dst-host="*ecocash.co.ls" action=allow comment="tc-ecocash-api-walled-garden"
/ip hotspot walled-garden add dst-host="*ottlesotho.com" action=allow comment="tc-ott-walled-garden"
/ip hotspot walled-garden add dst-host="*ottvoucher.com" action=allow comment="tc-ottvoucher-walled-garden"

# 12. Fetch & Deploy Live On-Router Splash Page (with 16-Digit OTT Voucher PIN) from VPS
:do { :if ([:len [/file find name~"login.html"]] = 0) do={ /ip hotspot reset-html [find] } } on-error={}
:do { /tool fetch url="http://169.58.98.92:3000/api/portal/router-login.html" dst-path="hotspot/login.html" check-certificate=no } on-error={}
:do { /tool fetch url="http://169.58.98.92:3000/api/portal/router-login.html" dst-path="flash/hotspot/login.html" check-certificate=no } on-error={}
:do { /tool fetch url="http://169.58.98.92:3000/api/portal/router-login.html" dst-path="hotspot/rlogin.html" check-certificate=no } on-error={}
:do { /tool fetch url="http://169.58.98.92:3000/api/portal/router-login.html" dst-path="flash/hotspot/rlogin.html" check-certificate=no } on-error={}
:do { /tool fetch url="http://169.58.98.92:3000/api/portal/router-alogin.html" dst-path="hotspot/alogin.html" check-certificate=no } on-error={}
:do { /tool fetch url="http://169.58.98.92:3000/api/portal/router-alogin.html" dst-path="flash/hotspot/alogin.html" check-certificate=no } on-error={}
:if ([:len [/file find name="flash/hotspot/login.html"]] > 0) do={
  :do { /ip hotspot profile set [find name="tc-hotspot-profile"] html-directory=flash/hotspot } on-error={}
} else={
  :do { /ip hotspot profile set [find name="tc-hotspot-profile"] html-directory=hotspot } on-error={}
}

# 13. Flush Active Hotspot Sessions, Cookies & Hosts so All Devices Trigger Captive Portal Immediately
:do { /ip hotspot active remove [find] } on-error={}
:do { /ip hotspot cookie remove [find] } on-error={}
:do { /ip hotspot host remove [find] } on-error={}
/ip service set www disabled=no port=80
/ip service set winbox disabled=no port=8291

:log info "T-Connect Full-Stack Hotspot Alignment Complete: ether1=WAN, ether2-ether5+WiFi=10.10.0.1/22 Hotspot"
:put ">>> SUCCESS: T-CONNECT HOTSPOT ACTIVE ON 10.10.0.1/22 (ether2-ether5 APs + MIKROTIK-TC WiFi + 16-Digit OTT Voucher) <<<"
