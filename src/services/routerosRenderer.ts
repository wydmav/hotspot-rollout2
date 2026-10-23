import { RouterDevice, RouterAccessMode } from '../types';

export interface OneLinerOptions {
  controllerDomain: string;
  routerId: string;
  token: string;
  rosVersion?: 'v7' | 'v6';
  endpointProtocol?: string;
}

export interface AccessPolicyOptions {
  router: RouterDevice;
  accessMode: RouterAccessMode;
  freeDurationMinutes?: number;
  rateLimit?: string;
  portalBaseUrl?: string;
}

export interface ProvisioningOptions {
  router: RouterDevice;
  hubDomain: string;
  hubWgPort: number;
  hubTunnelIp: string;
  routerWgIp: string;
  routerPrivateKey: string;
  hubPublicKey: string;
  radiusSecret: string;
  apiPassword: string;
  walledGardenDomains: string[];
  blockDoH?: boolean;
  endpointProtocol?: string;
  controllerHost?: string;
}

export class RouterOSRenderer {
  /**
   * Generates the MKController-style one-liner script to be pasted directly into RouterOS terminal.
   * Performs DNS resolution check, device-mode fetch capability check, HTTP/HTTPS download with single-use token,
   * verbose import for error visibility, and clean cleanup.
   */
  static renderOneLiner(options: OneLinerOptions): string {
    const { controllerDomain, routerId, token } = options;
    const protocol = options.endpointProtocol || (controllerDomain.includes('localhost') || controllerDomain.includes(':') || /^\d+\.\d+\.\d+\.\d+/.test(controllerDomain) ? 'http' : 'https');
    const domainOnly = controllerDomain.split(':')[0];
    const isRawIp = /^\d+\.\d+\.\d+\.\d+$/.test(domainOnly);
    const fetchUrl = `${protocol}://${controllerDomain}/api/devices/${routerId}/adopt.rsc?token=${token}`;
    const filename = `tc-${routerId.slice(0, 8)}.rsc`;

    const dnsCheck = isRawIp 
      ? `:log info "T-Connect - Direct IP endpoint detected (${domainOnly}). DNS check bypassed.";` 
      : `:do { :resolve "${domainOnly}" } on-error={ /log warning "T-Connect - DNS check for ${domainOnly} failed. Continuing..."; };`;

    return `${dnsCheck} :local fetchDisabled false;; :do { :local chk [:parse ":return ([/system/device-mode/get fetch] = false)"]; :set fetchDisabled [$chk] } on-error={};; :if ($fetchDisabled) do={ /log error "T-Connect - Fetch is locked by Device Mode. Enable fetch in /system/device-mode and retry."; :error "Device Mode restricted" };; :local fwVer [/system resource get version];; :put "T-Connect: Fetching provisioning configuration from ${protocol}://${controllerDomain}...";; :do { /tool fetch url="${fetchUrl}" http-method=post http-data="fw=$fwVer" dst-path="${filename}" check-certificate=no; } on-error={ /tool fetch url="${fetchUrl}" http-method=get dst-path="${filename}" check-certificate=no; };; :do { /import file-name="${filename}" verbose=yes; :delay 1s; /file remove "${filename}"; /log info "T-Connect - Device adopted successfully. WireGuard and RADIUS operational."; :put "T-Connect: [SUCCESS] Router adopted successfully! WireGuard and RADIUS operational."; } on-error={ /log error "T-Connect - Adoption script encountered an error during import. File retained as ${filename} for inspection."; :put "T-Connect: [ERROR] Import encountered an issue. File retained as ${filename}. Run: /import file-name=${filename} verbose=yes"; :error "Import failed" };`;
  }

  /**
   * Builds RouterOS commands to immediately bridge all 5+ downstream LAN/AP ports
   * (ether2, ether3, ether4, ether5, ether6, sfp1, sfp-sfpplus1 + wifi1, wifi2, wlan1, wlan2)
   * into bridgeLocal while isolating ether1 as Starlink WAN.
   */
  static buildImmediateMultiPortBridgeCommands(bridgeName: string = 'bridgeLocal'): string {
    return [
      `# Ensure ${bridgeName} exists & isolate ether1 as Starlink WAN`,
      `:if ([:len [/interface bridge find name="${bridgeName}"]] = 0) do={ /interface bridge add name="${bridgeName}" arp=enabled protocol-mode=rstp disabled=no comment="T-Connect Hotspot & AP Local Bridge" } else={ /interface bridge set [find name="${bridgeName}"] arp=enabled protocol-mode=rstp disabled=no }`,
      `:do { /interface bridge port remove [find interface="ether1"] } on-error={}`,
      `:do { /ip dhcp-client remove [find interface!="ether1"] } on-error={}`,
      `:do { /interface ethernet set [find default-name~"ether2|ether3|ether4|ether5|ether6|sfp"] disabled=no arp=enabled } on-error={}`,
      `# Immediately bridge all 5+ downstream ports & Wi-Fi radios into ${bridgeName}`,
      `:foreach p in={"ether2";"ether3";"ether4";"ether5";"ether6";"sfp1";"sfp-sfpplus1";"wifi1";"wifi2";"wlan1";"wlan2"} do={ :do { :if ([:len [/interface find name=$p]] > 0) do={ :if ([:len [/interface bridge port find interface=$p]] > 0) do={ /interface bridge port set [find interface=$p] bridge="${bridgeName}" horizon=none disabled=no } else={ /interface bridge port add bridge="${bridgeName}" interface=$p horizon=none disabled=no } } } on-error={} }`,
      `:do { :foreach w in=[/interface wifi find] do={ /interface wifi set $w configuration.ssid="MIKROTIK-TC" configuration.mode=ap datapath.bridge="${bridgeName}" disabled=no; :do { /interface wifi unset $w security } on-error={}; :do { /interface wifi unset $w security.passphrase } on-error={} } } on-error={}`
    ].join('\n');
  }

  /**
   * Builds RouterOS v7.16.2 compatible commands to deploy the Portal Builder Splash Page
   * directly onto the MikroTik router (hotspot/login.html and flash/hotspot/login.html).
   * Uses /ip hotspot reset-html and /tool fetch from the VPS (never uses invalid /file add).
   */
  static buildSplashPageFileCommands(portalBaseUrl: string, allowFreeAccess: boolean = true): string {
    const cleanBaseUrl = portalBaseUrl.replace(/\/+$/, '');
    const hostOnly = cleanBaseUrl.replace(/^https?:\/\//, '').split(':')[0];
    const redirectAndFallbackHtml = `<!DOCTYPE html><html><head><meta charset=\\"utf-8\\"><meta name=\\"viewport\\" content=\\"width=device-width,initial-scale=1\\"><title>Wi-Fi Login</title><script>window.location.replace(\\"${cleanBaseUrl}/portal?mac=\\$(mac)&ip=\\$(ip)&link_login_only=\\$(link-login-only)&user_url=\\$(link-orig-esc)\\");</script><meta http-equiv=\\"refresh\\" content=\\"0; url=${cleanBaseUrl}/portal?mac=\\$(mac)&ip=\\$(ip)&link_login_only=\\$(link-login-only)&user_url=\\$(link-orig-esc)\\"></head><body style=\\"background:#05070c;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center\\"><div style=\\"background:#0f1422;border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:24px;max-width:360px;width:100%\\"><h2 style=\\"margin:0 0 8px;font-size:18px\\">Opening Wi-Fi Portal...</h2><p style=\\"font-size:12px;color:#94a3b8;margin:0 0 16px\\">Redirecting to the hotspot splash page...</p><a href=\\"${cleanBaseUrl}/portal?mac=\\$(mac)&ip=\\$(ip)&link_login_only=\\$(link-login-only)&user_url=\\$(link-orig-esc)\\" style=\\"display:block;padding:12px;background:#f05e17;color:#fff;text-decoration:none;border-radius:12px;font-weight:800;font-size:13px\\">Tap Here if Not Redirected &rarr;</a></div></body></html>`;

    return [
      RouterOSRenderer.buildImmediateMultiPortBridgeCommands('bridgeLocal'),
      `# Ensure OTT Lesotho & Controller Walled Garden entries exist`,
      `:do { /ip hotspot walled-garden ip add dst-address=169.58.98.92 action=accept comment="tc-vps-server-access" } on-error={}`,
      `:do { /ip hotspot walled-garden add dst-host="*${hostOnly}*" action=allow comment="tc-vps-controller-domain" } on-error={}`,
      `:do { /ip hotspot walled-garden add dst-host="*ottlesotho.com" action=allow comment="tc-ott-lesotho-api" } on-error={}`,
      `:do { /ip hotspot walled-garden add dst-host="*ottvoucher.com" action=allow comment="tc-ott-voucher-api" } on-error={}`,
      `:do { /ip hotspot walled-garden add dst-host="*ecocash.co.ls" action=allow comment="tc-ecocash-api" } on-error={}`,
      `# Ensure default hotspot HTML directory files exist on router storage`,
      `:do { :if ([:len [/file find name~"login.html"]] = 0) do={ /ip hotspot reset-html [find] } } on-error={}`,
      `# Apply immediate redirect/splash HTML to existing login.html files (no /file add used)`,
      `:do { /file set [find name~"hotspot/login.html"] contents="${redirectAndFallbackHtml}" } on-error={}`,
      `:do { /file set [find name~"hotspot/rlogin.html"] contents="${redirectAndFallbackHtml}" } on-error={}`,
      `# Fetch live Portal Builder Splash Page & Full-Screen Ad Page directly from VPS controller`,
      `:do { /tool fetch url="${cleanBaseUrl}/api/portal/router-login.html" dst-path="hotspot/login.html" check-certificate=no } on-error={}`,
      `:do { /tool fetch url="${cleanBaseUrl}/api/portal/router-login.html" dst-path="flash/hotspot/login.html" check-certificate=no } on-error={}`,
      `:do { /tool fetch url="${cleanBaseUrl}/api/portal/router-login.html" dst-path="hotspot/rlogin.html" check-certificate=no } on-error={}`,
      `:do { /tool fetch url="${cleanBaseUrl}/api/portal/router-login.html" dst-path="flash/hotspot/rlogin.html" check-certificate=no } on-error={}`,
      `:do { /tool fetch url="${cleanBaseUrl}/api/portal/router-alogin.html" dst-path="hotspot/alogin.html" check-certificate=no } on-error={}`,
      `:do { /tool fetch url="${cleanBaseUrl}/api/portal/router-alogin.html" dst-path="flash/hotspot/alogin.html" check-certificate=no } on-error={}`,
      `:if ([:len [/file find name="flash/hotspot/login.html"]] > 0) do={ :do { /ip hotspot profile set [find name="tc-hotspot-profile"] html-directory=flash/hotspot } on-error={} } else={ :do { /ip hotspot profile set [find name="tc-hotspot-profile"] html-directory=hotspot } on-error={} }`
    ].join('\n');
  }

  /**
   * Generates the complete, idempotent, hardened RouterOS v7 (ARM64 hAP ax3) or v6 provisioning script.
   * Every command block is wrapped in safe error handlers to prevent partial-execution aborts.
   */
  static renderProvisioningScript(options: ProvisioningOptions): string {
    const {
      router,
      hubDomain,
      hubWgPort,
      hubTunnelIp,
      routerWgIp,
      routerPrivateKey,
      hubPublicKey,
      radiusSecret,
      apiPassword,
      walledGardenDomains,
      blockDoH = true,
      endpointProtocol,
      controllerHost
    } = options;

    const isV7 = router.rosVersion === 'v7';
    const effectiveHost = controllerHost || hubDomain;
    const protocol = endpointProtocol || (effectiveHost.includes(':') || effectiveHost.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(effectiveHost) ? 'http' : 'https');
    const portalBaseUrl = `${protocol}://${effectiveHost}`;
    const cleanDomain = effectiveHost.split(':')[0];
    const allowFree = router.accessMode !== 'PAID_ONLY' && (router.freeModeEnabled ?? true);

    // Helper to validate Base64 32-byte WireGuard key
    const isValidWgKey = (k?: string) => typeof k === 'string' && /^[A-Za-z0-9+/]{42,43}=*$/.test(k.trim()) && k.trim().length >= 40;
    const safePrivateKey = isValidWgKey(routerPrivateKey) ? routerPrivateKey.trim() : '';
    const safeHubPubKey = isValidWgKey(hubPublicKey) ? hubPublicKey.trim() : '';

    const scriptLines: string[] = [
      `# ============================================================`,
      `# T-Connect Hotspot Provisioning Script (Automated Fleet Agent)`,
      `# Target Router: ${router.name} (${router.model})`,
      `# Vertical: ${router.vertical.toUpperCase()}`,
      `# RouterOS Version: ${router.rosVersion.toUpperCase()}`,
      `# Controller Endpoint: ${portalBaseUrl}`,
      `# Generation Timestamp: ${new Date().toISOString()}`,
      `# ============================================================`,
      ``,
      `/log info "T-Connect: Beginning automated device provisioning..."`,
      ``,
      `# 1. System Identity`,
      `:do { /system identity set name="TC-${router.name.replace(/[^a-zA-Z0-9_-]/g, '_')}" } on-error={}`,
      `/log info "T-Connect: [1/7] System Identity configured."`,
      ``,
      `# 2. Isolate WAN (ether1) from All Bridges & Ensure ether2-ether5 Are Never Treated as WAN`,
      `:do { /interface bridge port remove [find interface="ether1"] } on-error={}`,
      `:do { /ip dhcp-client remove [find interface!="ether1"] } on-error={}`,
      `:do { /interface list add name=WAN comment="T-Connect WAN Interfaces" } on-error={}`,
      `:do { /interface list add name=LAN comment="T-Connect Hotspot LAN Interfaces" } on-error={}`,
      `:do { /interface list member remove [find list=WAN interface!="ether1"] } on-error={}`,
      `:do { /interface list member add list=WAN interface=ether1 comment="T-Connect WAN1: Starlink / ISP" } on-error={}`,
      `:do { :if ([:len [/ip dhcp-client find interface="ether1"]] = 0) do={ /ip dhcp-client add interface=ether1 disabled=no add-default-route=yes default-route-distance=1 use-peer-dns=yes comment="Starlink WAN1 DHCP Client" } else={ /ip dhcp-client set [find interface="ether1"] disabled=no add-default-route=yes default-route-distance=1 } } on-error={}`,
      ``,
      `# 3. Hotspot & AP Bridge Configuration (bridgeLocal & 10.10.0.0/22 across all 5+ LAN/AP ports + Wi-Fi radios)`,
      `:if ([:len [/interface bridge find name="bridgeLocal"]] = 0) do={ /interface bridge add name="bridgeLocal" arp=enabled protocol-mode=rstp disabled=no comment="T-Connect Hotspot & AP Local Bridge" } else={ /interface bridge set [find name="bridgeLocal"] arp=enabled protocol-mode=rstp disabled=no };`,
      `:do { /interface list member add list=LAN interface=bridgeLocal comment="T-Connect Hotspot LAN Bridge" } on-error={}`,
      `:do { /interface ethernet set [find default-name~"ether2|ether3|ether4|ether5|ether6|sfp"] disabled=no arp=enabled } on-error={}`,
      `# Reassign all 5+ downstream ports (ether2..ether6, sfp1, sfp-sfpplus1) & wifi1..wifi2/wlan1..wlan2 into bridgeLocal with horizon=none`,
      `:foreach p in={"ether2";"ether3";"ether4";"ether5";"ether6";"sfp1";"sfp-sfpplus1";"wifi1";"wifi2";"wlan1";"wlan2"} do={ :do { :if ([:len [/interface find name=$p]] > 0) do={ :if ([:len [/interface bridge port find interface=$p]] > 0) do={ /interface bridge port set [find interface=$p] bridge="bridgeLocal" horizon=none disabled=no } else={ /interface bridge port add bridge="bridgeLocal" interface=$p horizon=none disabled=no } } } on-error={} };`,
      `# Remove Conflicting LAN IP / DHCP / Hotspot on Factory Bridges or Direct Ethernet Ports (Preserves ether1 WAN)`,
      `:do { /ip dhcp-server remove [find interface!="bridgeLocal"] } on-error={}`,
      `:do { /ip hotspot remove [find interface!="bridgeLocal"] } on-error={}`,
      `:do { /ip address remove [find interface~"ether2|ether3|ether4|ether5|ether6|sfp"] } on-error={}`,
      `:do { /ip route remove [find gateway~"ether2|ether3|ether4|ether5|ether6|sfp"] } on-error={}`,
      `:do { /ip address remove [find interface="bridgeLocal"] } on-error={}`,
      `:do { /ip address remove [find interface="bridge"] } on-error={}`,
      `/ip address add address=10.10.0.1/22 network=10.10.0.0 interface="bridgeLocal" comment="tc-hotspot-lan-gateway"`,
      `# High-Density DHCP IP Pool (10.10.0.50 to 10.10.3.250)`,
      `:do { /ip pool remove [find name="tc-hotspot-pool"] } on-error={}`,
      `/ip pool add name="tc-hotspot-pool" ranges=10.10.0.50-10.10.3.250`,
      `# DHCP Server on bridgeLocal (Strictly 10.10.0.1 DNS so OS Captive Portal Detection always triggers on WiFi & APs)`,
      `:do { /ip dhcp-server remove [find interface="bridgeLocal"] } on-error={}`,
      `:do { /ip dhcp-server network remove [find] } on-error={}`,
      `/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 comment="T-Connect Hotspot Guest Network"`,
      `/ip dhcp-server add name="tc-dhcp-server" interface="bridgeLocal" address-pool="tc-hotspot-pool" lease-time=1h disabled=no`,
      `# Enable DNS Resolver & Intercept DNS for Captive Portal Probes`,
      `/ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8`,
      `:do { /ip firewall filter remove [find comment~"Fast-Fail Unauth TCP"] } on-error={}`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-dns-intercept"]] = 0) do={ /ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="tc-dns-intercept" } } on-error={}`,
      `# NAT Firewall Masquerade on WAN ether1`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="tc-hotspot-nat" } } on-error={}`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat-wan"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="tc-hotspot-nat-wan" } } on-error={}`,
      `# Hotspot Server Profile & Server on bridgeLocal (Cookies & MAC-Cookies disabled; addresses-per-mac=unlimited for APs)`,
      `:do { /ip hotspot profile remove [find name="tc-hotspot-profile"] } on-error={}`,
      `/ip hotspot profile add name="tc-hotspot-profile" hotspot-address=10.10.0.1 dns-name="" html-directory=hotspot login-by=${allowFree ? 'http-chap,http-pap,trial' : 'http-chap,http-pap'} http-cookie-lifetime=none split-user-domain=no trial-uptime-limit=30m trial-uptime-reset=1d rate-limit="" use-radius=no`,
      `:do { /ip hotspot profile set [find default=yes] login-by=${allowFree ? 'http-chap,http-pap,trial' : 'http-chap,http-pap'} http-cookie-lifetime=none use-radius=no } on-error={}`,
      `:do { /ip hotspot remove [find interface="bridgeLocal"] } on-error={}`,
      `/ip hotspot add name="tc-hotspot" interface="bridgeLocal" address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" addresses-per-mac=unlimited idle-timeout=5m keepalive-timeout=2m disabled=no`,
      `# Pre-Provisioned Hotspot Auth Users`,
      `:do { /ip hotspot user remove [find name="test"] } on-error={}`,
      `/ip hotspot user add name="test" password="123" comment="T-Connect Instant Testing User"`,
      `:do { /ip hotspot user remove [find name="T-TRIAL"] } on-error={}`,
      allowFree
        ? `/ip hotspot user add name="T-TRIAL" password="123" limit-uptime=30m comment="T-Connect Free Trial Auth User"`
        : `# Free Trial Disabled by Admin Policy (T-TRIAL user omitted)`,
      `# Static Management Bypasses Strictly for AP Hardware IPs (No PC bypass so test PC sees Splash Page)`,
      `:do { /ip hotspot ip-binding remove [find comment~"tc-bypass"] } on-error={}`,
      `/ip hotspot ip-binding add address=10.10.0.2 type=bypassed comment="tc-bypass-AP1-ether2"`,
      `/ip hotspot ip-binding add address=10.10.0.3 type=bypassed comment="tc-bypass-AP2-ether3"`,
      `/ip hotspot ip-binding add address=10.10.0.4 type=bypassed comment="tc-bypass-AP3-ether4"`,
      `/ip hotspot ip-binding add address=10.10.0.5 type=bypassed comment="tc-bypass-AP4-ether5"`,
      `# RouterOS 7.16.2 wifi-qcom Radios with Open SSID MIKROTIK-TC Bound to bridgeLocal`,
      `:do { :foreach w in=[/interface wifi find] do={ /interface wifi set $w configuration.ssid="MIKROTIK-TC" configuration.mode=ap datapath.bridge="bridgeLocal" disabled=no; :do { /interface wifi unset $w security } on-error={}; :do { /interface wifi unset $w security.passphrase } on-error={} } } on-error={}`,
      `/log info "T-Connect: [2/7] Hotspot Bridge bridgeLocal, 10.10.0.1/22, DHCP, and Radios configured."`,
      ``,
    ];

    if (isV7) {
      scriptLines.push(
        `# 4. WireGuard Management Tunnel (v7)`,
        `:do { /interface wireguard remove [find name="wg-tconnect"] } on-error={}`,
        safePrivateKey 
          ? `:do { /interface wireguard add name="wg-tconnect" listen-port=${hubWgPort} private-key="${safePrivateKey}" comment="T-Connect Management Tunnel" } on-error={ :do { /interface wireguard add name="wg-tconnect" listen-port=${hubWgPort} comment="T-Connect Management Tunnel" } on-error={} }`
          : `:do { /interface wireguard add name="wg-tconnect" listen-port=${hubWgPort} comment="T-Connect Management Tunnel" } on-error={}`,
        `:do { /ip address remove [find comment="tc-wg-ip"] } on-error={}`,
        `:do { /ip address add address="${routerWgIp}/24" interface="wg-tconnect" comment="tc-wg-ip" } on-error={}`,
        `:do { /interface wireguard peers remove [find comment="tc-hub-peer"] } on-error={}`,
        safeHubPubKey
          ? `:do { /interface wireguard peers add interface="wg-tconnect" public-key="${safeHubPubKey}" endpoint-address="${cleanDomain}" endpoint-port=${hubWgPort} allowed-address="10.99.0.0/16" persistent-keepalive=25s comment="tc-hub-peer" } on-error={}`
          : `# Hub public key omitted - wireguard interface created`,
        `/log info "T-Connect: [3/7] WireGuard tunnel configured."`,
        ``
      );
    } else {
      scriptLines.push(
        `# 4. Management Tunnel (v6 Fallback SSTP / OVPN)`,
        `:do { /interface sstp-client remove [find name="tc-tunnel"] } on-error={}`,
        `:do { /interface sstp-client add name="tc-tunnel" connect-to="${cleanDomain}" user="${router.id}" password="${apiPassword}" verify-server-certificate=no comment="T-Connect v6 Tunnel" } on-error={}`,
        `/log info "T-Connect: [3/7] Management tunnel configured."`,
        ``
      );
    }

    scriptLines.push(
      `# 5. Secure Router Management`,
      `:do { /ip service set telnet disabled=yes } on-error={}`,
      `:do { /ip service set ftp disabled=yes } on-error={}`,
      `:do { /ip service set www disabled=no port=80 } on-error={}`,
      `:do { /ip service set winbox disabled=no port=8291 } on-error={}`,
      `:do { /ip service set api disabled=yes } on-error={}`,
      `:do { /ip service set api-ssl address="10.99.0.0/16" port=8729 } on-error={}`,
      ``,
      `# Controller Admin User`,
      `:do { /user group add name="tc-agent" policy="read,write,api,test,password" } on-error={}`,
      `:do { /user remove [find name="tc_controller"] } on-error={}`,
      `:do { /user add name="tc_controller" group="tc-agent" password="${apiPassword}" address="10.99.0.0/16" comment="T-Connect Central Controller" } on-error={ :do { /user add name="tc_controller" group="full" password="${apiPassword}" comment="T-Connect Central Controller" } on-error={} }`,
      `/log info "T-Connect: [4/7] Management & User security configured."`,
      ``,
      `# 6. Central RADIUS Configuration`,
      `:do { /radius remove [find comment="tc-radius"] } on-error={}`,
      `:do { /radius add service=hotspot address=${hubTunnelIp} secret="${radiusSecret}" authentication-port=1812 accounting-port=1813 timeout=3s comment="tc-radius" } on-error={}`,
      `:do { /radius incoming set accept=yes port=3799 } on-error={}`,
      `/log info "T-Connect: [5/7] Central RADIUS configured."`,
      ``,
      `# 7. VPS & Payment Walled Garden Rules (Purge any OS captive probe domains so Captive Portal pops up immediately!)`,
      `:do { /ip hotspot walled-garden remove [find dst-host~"apple" or dst-host~"gstatic" or dst-host~"google" or dst-host~"msft" or dst-host~"firefox" or dst-host~"vodacom" or dst-host~"mywallet"] } on-error={}`,
      `:do { /ip hotspot walled-garden ip remove [find comment~"tc-vps"] } on-error={}`,
      `/ip hotspot walled-garden ip add dst-address=169.58.98.92 action=accept comment="tc-vps-server-access"`,
      /^\d+\.\d+\.\d+\.\d+$/.test(cleanDomain) && cleanDomain !== '169.58.98.92'
        ? `/ip hotspot walled-garden ip add dst-address=${cleanDomain} action=accept comment="tc-vps-controller-ip"`
        : `# Primary VPS IP 169.58.98.92 added to walled-garden ip`,
      `:do { /ip hotspot walled-garden remove [find comment~"tc-vps"] } on-error={}`,
      `/ip hotspot walled-garden add dst-host="*169.58.98.92*" action=allow comment="tc-vps-portal-domain"`,
      `/ip hotspot walled-garden add dst-host="*${cleanDomain}*" action=allow comment="tc-vps-controller-domain"`,
      ``,
      `# 8. Deploy Portal Builder On-Router Splash Page (hotspot/login.html & flash/hotspot/login.html)`,
      RouterOSRenderer.buildSplashPageFileCommands(portalBaseUrl, allowFree)
    );

    walledGardenDomains
      .filter((d) => !/apple|gstatic|google|msft|firefox|vodacom|mywallet/i.test(d))
      .forEach((domain) => {
        scriptLines.push(
          `:do { /ip hotspot walled-garden add dst-host="*${domain}" action=allow comment="T-Connect Walled Garden - ${domain}" } on-error={}`
        );
      });

    if (blockDoH) {
      scriptLines.push(
        ``,
        `# 9. DNS Interception for Instant Captive Portal Detection (No Option 114 override so router login.html triggers natively)`,
        `:do { /ip dhcp-server set [find name="tc-dhcp-server"] dhcp-option="" } on-error={}`,
        `:do { /ip dhcp-server option remove [find name="cna-cap-port"] } on-error={}`,
        `:do { /ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept UDP DNS" } on-error={}`,
        `:do { /ip firewall nat add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept TCP DNS" } on-error={}`,
        `:do { /ip firewall filter add chain=forward protocol=tcp dst-port=853 action=reject reject-with=tcp-reset comment="T-Connect: Block DoT (Port 853)" } on-error={}`,
        `:do { /ip firewall filter add chain=forward protocol=udp dst-port=853 action=drop comment="T-Connect: Block DoT UDP (Port 853)" } on-error={}`
      );
    }

    scriptLines.push(
      `# Flush any stale active hotspot sessions, hosts, or cookies so test devices immediately see the Splash Page`,
      `:do { /ip hotspot active remove [find] } on-error={}`,
      `:do { /ip hotspot cookie remove [find] } on-error={}`,
      `:do { /ip hotspot host remove [find] } on-error={}`,
      `/log info "T-Connect: [6/7] Hotspot portal, walled garden & DNS filters configured."`,
      ``,
      `# 10. Clean Any Legacy Broken Routes on ether2 (ether2..ether5 are LAN/AP ports in bridgeLocal)`,
      `:do { /ip route remove [find comment="tc-wan2-backup"] } on-error={}`,
      `:do { /ip route remove [find comment="tc-wan1-primary"] } on-error={}`,
      `:do { /ip route remove [find comment="tc-wan1-canary"] } on-error={}`,
      ``,
      `# 11. Fast 15-Second Heartbeat & Real-Time Portal/Policy Sync Daemon`,
      `:do { /system scheduler remove [find name="tc-heartbeat"] } on-error={}`,
      `:do { /system scheduler add name="tc-heartbeat" interval=15s on-event=":do { /tool fetch url=\\"${portalBaseUrl}/api/devices/${router.id}/heartbeat.rsc?uptime=$[/system resource get uptime]&cpu=$[/system resource get cpu-load]&mem=$[/system resource get free-memory]&sessions=$[/ip hotspot active print count-only]\\" dst-path=\\"tc-sync.rsc\\" check-certificate=no; /import file-name=\\"tc-sync.rsc\\"; /file remove \\"tc-sync.rsc\\" } on-error={}" comment="T-Connect 15s Health & Real-Time Policy Sync Agent" } on-error={}`,
      ``,
      `# 12. Instant Adoption Handshake (Signals controller platform to promote router to ONLINE immediately)`,
      `:put "T-Connect: Dispatching instant adoption handshake to ${portalBaseUrl}...";`,
      `:do { /tool fetch url="${portalBaseUrl}/api/devices/${router.id}/heartbeat" http-method=post http-data="uptime=$[/system resource get uptime]&cpu=$[/system resource get cpu-load]&mem=$[/system resource get free-memory]&sessions=0&stage=ADOPT_PROVISION" check-certificate=no keep-result=no; :put "T-Connect: [SUCCESS] Adoption handshake verified by platform! Router is now ONLINE."; /log info "T-Connect: [7/7] Device provisioning complete! Controller connected and ONLINE."; } on-error={ :put "T-Connect: [NOTICE] Immediate handshake probe unacknowledged; 15s watchdog cron will retry in background. Ensure ${portalBaseUrl} is reachable over WAN."; /log warning "T-Connect: Immediate handshake probe unacknowledged. Watchdog cron running."; }`
    );

    return scriptLines.join('\n');
  }

  /**
   * Generates dynamic Access Policy script for live execution on an adopted router.
   * Gives administrators total platform control over whether the router is:
   * 1. PAID_ONLY (strictly vouchers & mobile money, free access completely hidden)
   * 2. FREE_TRIAL_AND_PAID (hybrid with customizable duration, rate limit & daily quota)
   * 3. COMPLETELY_FREE (open public Wi-Fi or community-sponsored)
   */
  static renderAccessPolicyScript(options: AccessPolicyOptions): string {
    const { router, accessMode } = options;
    const duration = options.freeDurationMinutes || router.freeDurationMinutes || 30;
    const rateLimit = options.rateLimit || router.freeRateLimit || '10M/30M';
    const portalBaseUrl = (options.portalBaseUrl || 'http://169.58.98.92:3000').replace(/\/+$/, '');
    const lines: string[] = [
      `# ============================================================`,
      `# T-Connect Dynamic Access Policy & Real-Time Splash Sync`,
      `# Target Router: ${router.name} (${router.id})`,
      `# Policy Mode: ${accessMode}`,
      `# Timestamp: ${new Date().toISOString()}`,
      `# ============================================================`,
      `:log info "[T-Connect Policy] Pushing Access Mode '${accessMode}' to router...";`
    ];

    if (accessMode === 'PAID_ONLY') {
      lines.push(
        `# Policy: Strictly Paid Vouchers & EcoCash/OTT (Free Access Hidden, Cookies Disabled)`,
        `:do { /ip hotspot user remove [find name="T-TRIAL"] } on-error={}`,
        `:do { /ip hotspot active remove [find user="T-TRIAL"] } on-error={}`,
        `:do { /ip hotspot cookie remove [find] } on-error={}`,
        `:do { /ip hotspot profile set [find name="tc-hotspot-profile"] login-by=http-chap,http-pap use-radius=no } on-error={}`,
        `:do { /ip hotspot profile set [find default=yes] login-by=http-chap,http-pap use-radius=no } on-error={}`,
        RouterOSRenderer.buildSplashPageFileCommands(portalBaseUrl, false),
        `:log info "[T-Connect Policy] Router configured for PAID_ONLY access. Free trial removed from Splash Page.";`
      );
    } else if (accessMode === 'FREE_TRIAL_AND_PAID') {
      lines.push(
        `# Policy: Hybrid Access (Free Trial + Paid Vouchers + EcoCash/OTT, Cookies Disabled)`,
        `:do { /ip hotspot user remove [find name="T-TRIAL"] } on-error={}`,
        `:do { /ip hotspot user add name="T-TRIAL" password="123" limit-uptime=${duration}m comment="T-Connect Free Trial (${duration}m)" } on-error={}`,
        `:do { /ip hotspot cookie remove [find] } on-error={}`,
        `:do { /ip hotspot profile set [find name="tc-hotspot-profile"] login-by=http-chap,http-pap,trial trial-uptime-limit=${duration}m trial-uptime-reset=1d use-radius=no } on-error={}`,
        `:do { /ip hotspot profile set [find default=yes] login-by=http-chap,http-pap,trial trial-uptime-limit=${duration}m trial-uptime-reset=1d use-radius=no } on-error={}`,
        RouterOSRenderer.buildSplashPageFileCommands(portalBaseUrl, true),
        `:log info "[T-Connect Policy] Hybrid mode active: ${duration}m free trial enabled on Splash Page.";`
      );
    } else if (accessMode === 'COMPLETELY_FREE') {
      lines.push(
        `# Policy: 100% Free Open Access (Community Sponsored)`,
        `:do { /ip hotspot user remove [find name="T-TRIAL"] } on-error={}`,
        `:do { /ip hotspot user add name="T-TRIAL" password="123" comment="T-Connect Free Open Pool" } on-error={}`,
        `:do { /ip hotspot cookie remove [find] } on-error={}`,
        `:do { /ip hotspot profile set [find name="tc-hotspot-profile"] login-by=http-chap,http-pap,trial rate-limit="${rateLimit}" use-radius=no } on-error={}`,
        RouterOSRenderer.buildSplashPageFileCommands(portalBaseUrl, true),
        `:log info "[T-Connect Policy] COMPLETELY_FREE mode active on router.";`
      );
    }

    return lines.join('\n');
  }

  /**
   * Generates command to bridge extra ports to the hotspot bridge
   */
  static renderBridgePortCommand(bridgeName: string = 'bridgeLocal', interfaceName: string): string {
    return `:do { :if ([:len [/interface bridge port find interface="${interfaceName}"]] > 0) do={ /interface bridge port set [find interface="${interfaceName}"] bridge="${bridgeName}" disabled=no } else={ /interface bridge port add bridge="${bridgeName}" interface="${interfaceName}" disabled=no comment="TConnectHotspot-bridge-port" } } on-error={}`;
  }

  /**
   * Generates standalone MKController-compatible WAN Failover script
   */
  static renderWanFailoverScript(options: {
    wan1?: string;
    wan2?: string;
    checkHost?: string;
    hubDomain?: string;
    routerId?: string;
  }): string {
    const wan1 = options.wan1 || 'ether1';
    const wan2 = options.wan2 || 'ether2';
    const checkHost = options.checkHost || '1.1.1.1';
    const hubDomain = options.hubDomain || '169.58.98.92:3000';
    const routerId = options.routerId || 'rt_current';

    return `# ==============================================================================
# T-Connect Automated Dual-WAN Failover (RouterOS v7)
# Primary WAN1: ${wan1} (Starlink LEO Satellite)
# Secondary WAN2: ${wan2} (LTE / 5G / Fiber Backup)
# Verification Target: ${checkHost} (Cloudflare Secure DNS)
# ==============================================================================

# 1. Disable default route creation on DHCP clients so recursive routes govern
:do { /ip dhcp-client set [find interface="${wan1}"] add-default-route=no } on-error={}
:do { /ip dhcp-client set [find interface="${wan2}"] add-default-route=no } on-error={}

# 2. Host Route to Canary IP (${checkHost}) pinned strictly to Primary WAN1 (${wan1})
:do { /ip route remove [find comment="tc-wan1-canary"] } on-error={}
:do { /ip route add dst-address=${checkHost}/32 gateway=${wan1} scope=10 comment="tc-wan1-canary" } on-error={ :do { /ip route add dst-address=${checkHost}/32 gateway=%${wan1} scope=10 comment="tc-wan1-canary" } on-error={} }

# 3. Primary Default Route via Virtual Canary with Ping Check (Distance 1)
:do { /ip route remove [find comment="tc-wan1-primary"] } on-error={}
:do { /ip route add dst-address=0.0.0.0/0 gateway=${checkHost} check-gateway=ping distance=1 target-scope=30 comment="tc-wan1-primary" } on-error={}

# 4. Secondary Default Route via Backup WAN2 (${wan2}) with Distance 2
:do { /ip route remove [find comment="tc-wan2-backup"] } on-error={}
:do { /ip route add dst-address=0.0.0.0/0 gateway=${wan2} distance=2 comment="tc-wan2-backup" } on-error={ :do { /ip route add dst-address=0.0.0.0/0 gateway=%${wan2} distance=2 comment="tc-wan2-backup" } on-error={} }

# 5. Netwatch Probing Sentinel (10s interval, 2s timeout)
:do { /tool netwatch remove [find comment="tc-failover-sentinel"] } on-error={}
:do { /tool netwatch add host=${checkHost} interval=10s timeout=2s down-script="/log warning \\"[T-Connect Failover] Starlink ${wan1} unreachable! Switching traffic to ${wan2} backup.\\"; :do { /tool fetch url=\\"http://${hubDomain}/api/devices/${routerId}/failover?status=FAILOVER_ACTIVE&wan=${wan2}\\" keep-result=no } on-error={}" up-script="/log info \\"[T-Connect Failover] Starlink ${wan1} internet restored! Primary route active.\\"; :do { /tool fetch url=\\"http://${hubDomain}/api/devices/${routerId}/failover?status=RESTORED&wan=${wan1}\\" keep-result=no } on-error={}" comment="tc-failover-sentinel" } on-error={}

/log info "T-Connect: Automated WAN Failover active. Monitoring ${wan1} -> ${wan2}."
`;
  }

  /**
   * Generates DNS category blocking static entries for RouterOS
   */
  static renderDnsBlocklist(category: string, domains: string[]): string {
    const lines = [
      `# ============================================================`,
      `# T-Connect DNS Category Filter: ${category.toUpperCase()}`,
      `# Domains to Sinkhole: ${domains.length}`,
      `# ============================================================`,
      `/ip dns static`
    ];

    domains.forEach((dom) => {
      lines.push(
        `:do { add name="${dom}" address=127.0.0.1 type=A comment="TC-Block-${category}" } on-error={}`
      );
    });

    return lines.join('\n');
  }

  /**
   * Generates direct WebFig management URL for this router
   */
  static getWebFigUrl(router: RouterDevice): string {
    const host = router.wireguardIp || router.publicWanIp || '10.99.1.50';
    return `http://${host}:80`;
  }

  /**
   * Generates WinBox connection parameters
   */
  static getWinBoxDetails(router: RouterDevice): { host: string; port: number; user: string } {
    return {
      host: router.wireguardIp || router.publicWanIp || '10.99.1.50',
      port: 8291,
      user: 'admin'
    };
  }

  /**
   * Generates terminal commands for quick router operations
   */
  static renderQuickCommand(action: 'reboot' | 'flush-sessions' | 'ping-uplink' | 'check-hotspot', router?: RouterDevice): string {
    switch (action) {
      case 'reboot':
        return `/system reboot`;
      case 'flush-sessions':
        return `/ip hotspot active remove [find]`;
      case 'ping-uplink':
        return `/ping 1.1.1.1 count=5`;
      default:
        return '';
    }
  }

  /**
   * Generates complete RouterOS cleanup and de-adoption script.
   */
  static renderDeadoptionScript(router: RouterDevice): string {
    return `# ============================================================
# T-CONNECT MIKROTIK DE-ADOPTION & CLEANUP SCRIPT
# Target Router: ${router.name} (${router.id})
# MAC: ${router.macAddress}
# ============================================================

:log warning "[T-Connect] Initiating complete router unbinding & configuration purge...";

# 1. Remove WireGuard Controller Interface & Peers
:do {
  /interface wireguard peers remove [find comment~"tconnect"];
  /interface wireguard remove [find name="wg-tconnect"];
  /ip address remove [find comment~"tconnect"];
} on-error={};

# 2. Remove RADIUS Authentication & Hotspot AAA Links
:do {
  /radius remove [find comment~"tconnect"];
  /ip hotspot profile set [find] use-radius=no;
} on-error={};

# 3. Purge Automated WAN Failover & Netwatch Sentinels
:do {
  /tool netwatch remove [find comment~"tc-failover"];
  /system script remove [find name~"tconnect" or name~"tc-"];
  /system scheduler remove [find name~"tconnect" or name~"tc-"];
} on-error={};

# 4. Remove Walled Garden & DNS Static Sinkholes
:do {
  /ip hotspot walled-garden remove [find comment~"tconnect"];
  /ip dns static remove [find comment~"TC-Block" or comment~"tconnect"];
} on-error={};

# 5. Flush Temporary Provisioning RSC Files
:do {
  /file remove [find name~"tc-" and name~".rsc"];
} on-error={};

:log info "[T-Connect] Router de-adoption complete. Device unlinked from controller.";
`;
  }

  /**
   * Generates RouterOS script for bridging Access Points (Ubiquiti UniFi, TP-Link Omada, etc.)
   * and bypassing AP management IPs from Hotspot authentication.
   */
  static renderApBridgeScript(options: {
    bridgeName?: string;
    ap1Port: string;
    ap2Port: string;
    ap1Ip: string;
    ap2Ip: string;
    ap1Name?: string;
    ap2Name?: string;
  }): string {
    const bridge = options.bridgeName?.trim() || 'bridgeLocal';
    const ap1Name = options.ap1Name || 'AP1-UniFi-Omada';
    const ap2Name = options.ap2Name || 'AP2-UniFi-Omada';

    return `# ============================================================
# T-CONNECT ACCESS POINTS (ether2-ether5) & WINBOX BRIDGE CONFIGURATION
# Hardware: MikroTik hAP ax3 / RouterOS 7.16.2 (wifi-qcom)
# Targets: ${bridge} (ether2, ether3, ether4, ether5 + MIKROTIK-TC WiFi)
# ============================================================

:log info "[T-Connect] Configuring Access Point bridge ports (ether2-ether5) and MIKROTIK-TC wireless interface...";

# 1. Ensure Target Bridge "${bridge}" Exists & Isolate ether1 WAN
:if ([:len [/interface bridge find name="${bridge}"]] = 0) do={
  /interface bridge add name="${bridge}" arp=enabled protocol-mode=rstp disabled=no comment="T-Connect Hotspot & AP Bridge";
} else={
  /interface bridge set [find name="${bridge}"] arp=enabled protocol-mode=rstp disabled=no;
};
:do { /interface bridge port remove [find interface="ether1"] } on-error={}
:do { /ip dhcp-client remove [find interface!="ether1"] } on-error={}
:do { /interface list member remove [find list=WAN interface!="ether1"] } on-error={}
:do { /ip address remove [find interface~"ether2|ether3|ether4|ether5"] } on-error={}
:do { /ip route remove [find gateway~"ether2|ether3|ether4|ether5"] } on-error={}

# 2. Enable & Bind All 5+ AP Ethernet Ports (ether2..ether6, sfp) + WiFi into "${bridge}"
:do { /interface ethernet set [find default-name~"ether2|ether3|ether4|ether5|ether6|sfp"] disabled=no arp=enabled } on-error={}
:foreach p in={"ether2";"ether3";"ether4";"ether5";"ether6";"sfp1";"sfp-sfpplus1";"wifi1";"wifi2";"wlan1";"wlan2"} do={
  :do {
    :if ([:len [/interface find name=$p]] > 0) do={
      :if ([:len [/interface bridge port find interface=$p]] > 0) do={
        /interface bridge port set [find interface=$p] bridge="${bridge}" horizon=none disabled=no
      } else={
        /interface bridge port add bridge="${bridge}" interface=$p horizon=none disabled=no comment="tc-ap-port-$p"
      }
    }
  } on-error={}
};

# 3. Ensure Hotspot Server on "${bridge}" Allows Unlimited Client MACs Behind External APs
:do { /ip hotspot set [find interface="${bridge}"] addresses-per-mac=unlimited disabled=no } on-error={}

# 4. Configure Open Test WiFi SSID "MIKROTIK-TC" (RouterOS 7.16.2 wifi-qcom Optimized)
:do {
  :foreach w in=[/interface wifi find] do={
    /interface wifi set $w configuration.ssid="MIKROTIK-TC" configuration.mode=ap datapath.bridge="${bridge}" disabled=no
    :do { /interface wifi unset $w security } on-error={}
    :do { /interface wifi unset $w security.passphrase } on-error={}
  };
} on-error={}

# 5. Bypass Static AP Management IPs in Hotspot (Wireless clients on APs still get 10.10.0.50+ & Splash Page)
:do { /ip hotspot ip-binding remove [find comment~"tc-bypass"] } on-error={}
:do { /ip hotspot ip-binding add address="${options.ap1Ip}" type=bypassed comment="tc-bypass-${ap1Name}-ether2" } on-error={}
:do { /ip hotspot ip-binding add address="${options.ap2Ip}" type=bypassed comment="tc-bypass-${ap2Name}-ether3" } on-error={}
:do { /ip hotspot ip-binding add address="10.10.0.4" type=bypassed comment="tc-bypass-AP3-ether4" } on-error={}
:do { /ip hotspot ip-binding add address="10.10.0.5" type=bypassed comment="tc-bypass-AP4-ether5" } on-error={}

# 6. Verify WinBox Management Service
:do { /ip service set winbox disabled=no port=8291 } on-error={}

:log info "[T-Connect] Access Points (ether2-ether5) & MIKROTIK-TC WiFi setup active. All AP & WiFi clients redirected to captive portal.";
`;
  }

  /**
   * Generates the Master Full-Stack Alignment Script:
   * Isolates ether1 WAN (eliminates 192.168.1.x leak), moves ether2..5 & wifi1..2 into bridgeLocal,
   * configures 10.10.0.1/22 subnet (1,022 usable IPs), DHCP server, DNS intercept, NAT masquerade,
   * Hotspot server with Portal Builder On-Router Splash Page, VPS walled-garden, and AP bypasses.
   */
  static renderFullStackAlignmentScript(options?: {
    bridgeName?: string;
    gatewayIp?: string;
    subnetCidr?: string;
    dhcpRange?: string;
    ap1Ip?: string;
    ap2Ip?: string;
    ap3Ip?: string;
    vpsHost?: string;
    allowFreeAccess?: boolean;
  }): string {
    const bridge = options?.bridgeName || 'bridgeLocal';
    const gateway = options?.gatewayIp || '10.10.0.1';
    const cidr = options?.subnetCidr || '10.10.0.0/22';
    const dhcpRange = options?.dhcpRange || '10.10.0.50-10.10.3.250';
    const ap1 = options?.ap1Ip || '10.10.0.2';
    const ap2 = options?.ap2Ip || '10.10.0.3';
    const ap3 = options?.ap3Ip || '10.10.0.5';
    const allowFree = options?.allowFreeAccess ?? true;
    const defaultVps = (typeof window !== 'undefined' && window.location.host && !window.location.host.includes('.run.app') && !window.location.host.includes('localhost'))
      ? window.location.host
      : '169.58.98.92:3000';
    const rawVpsHost = options?.vpsHost || defaultVps;
    const vpsCleanHost = rawVpsHost.trim();
    const vpsIpOnly = vpsCleanHost.split(':')[0];

    return `# ============================================================
# T-CONNECT MASTER FULL-STACK ALIGNMENT SCRIPT
# Hardware: MikroTik hAP ax3 (ARM64) | RouterOS: v7.16.2 (wifi-qcom)
# WAN: ether1 (Isolated) | LAN/AP Bridge: ${bridge} (${cidr})
# VPS Controller: http://${vpsCleanHost}
# ============================================================

:log info "[T-Connect] Starting full-stack alignment...";

# 1. Ensure Target Bridge "${bridge}" Exists with ARP & RSTP Enabled
:if ([:len [/interface bridge find name="${bridge}"]] = 0) do={
  /interface bridge add name="${bridge}" arp=enabled protocol-mode=rstp disabled=no comment="T-Connect Hotspot & AP Local Bridge"
} else={
  /interface bridge set [find name="${bridge}"] arp=enabled protocol-mode=rstp disabled=no
};

# 2. Isolate WAN Port (ether1) & Clean Any WAN/DHCP-Client Rules on ether2-ether5
:do { /interface bridge port remove [find interface="ether1"] } on-error={}
:do { /ip dhcp-client remove [find interface!="ether1"] } on-error={}
:do { /interface list member remove [find list=WAN interface!="ether1"] } on-error={}
:do { :if ([:len [/ip dhcp-client find interface="ether1"]] = 0) do={ /ip dhcp-client add interface="ether1" disabled=no add-default-route=yes default-route-distance=1 use-peer-dns=yes comment="T-Connect WAN ether1" } else={ /ip dhcp-client set [find interface="ether1"] disabled=no add-default-route=yes default-route-distance=1 } } on-error={}

# 3. Enable & Move All 5+ Downstream Ports (ether2..ether6, sfp1, sfp-sfpplus1, wifi1..2, wlan1..2) into "${bridge}" (Transparent L2 AP Bridge)
:do { /interface ethernet set [find default-name~"ether2|ether3|ether4|ether5|ether6|sfp"] disabled=no arp=enabled } on-error={}
:foreach p in={"ether2";"ether3";"ether4";"ether5";"ether6";"sfp1";"sfp-sfpplus1";"wifi1";"wifi2";"wlan1";"wlan2"} do={
  :do {
    :if ([:len [/interface find name=$p]] > 0) do={
      :if ([:len [/interface bridge port find interface=$p]] > 0) do={
        /interface bridge port set [find interface=$p] bridge="${bridge}" horizon=none disabled=no
      } else={
        /interface bridge port add bridge="${bridge}" interface=$p horizon=none disabled=no
      }
    }
  } on-error={}
};

# 4. Clean Conflicting LAN IP / DHCP / Hotspot on Factory Bridges or Direct Ethernet Ports & Set ${gateway}/22 on "${bridge}"
:do { /ip dhcp-server remove [find interface!="${bridge}"] } on-error={}
:do { /ip hotspot remove [find interface!="${bridge}"] } on-error={}
:do { /ip address remove [find interface~"ether2|ether3|ether4|ether5"] } on-error={}
:do { /ip route remove [find gateway~"ether2|ether3|ether4|ether5"] } on-error={}
:do { /ip address remove [find interface="${bridge}"] } on-error={}
:do { /ip address remove [find interface="bridge"] } on-error={}
/ip address add address=${gateway}/22 network=10.10.0.0 interface="${bridge}" comment="tc-hotspot-lan-gateway"

# 5. Configure High-Density DHCP IP Pool (${dhcpRange}) & DHCP Server on "${bridge}" (Strictly ${gateway} DNS for Captive Detection)
:do { /ip pool remove [find name="tc-hotspot-pool"] } on-error={}
/ip pool add name="tc-hotspot-pool" ranges=${dhcpRange}
:do { /ip dhcp-server remove [find interface="${bridge}"] } on-error={}
:do { /ip dhcp-server network remove [find] } on-error={}
/ip dhcp-server network add address=${cidr} gateway=${gateway} dns-server=${gateway} comment="T-Connect Hotspot Guest Network"
/ip dhcp-server add name="tc-dhcp-server" interface="${bridge}" address-pool="tc-hotspot-pool" lease-time=1h disabled=no

# 6. Enable DNS Resolver, Intercept DNS & Remove Any Legacy Blocking Routes/Filters
/ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8
:do { /ip firewall filter remove [find comment~"Fast-Fail Unauth TCP"] } on-error={}
:do { /ip route remove [find comment="tc-wan2-backup"] } on-error={}
:do { /ip route remove [find comment="tc-wan1-primary"] } on-error={}
:do { /ip route remove [find comment="tc-wan1-canary"] } on-error={}
:do { :if ([:len [/ip firewall nat find comment="tc-dns-intercept"]] = 0) do={ /ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="tc-dns-intercept" } } on-error={}

# 7. Configure NAT Firewall Masquerade for Internet Access (WAN ether1)
:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="tc-hotspot-nat" } } on-error={}
:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat-wan"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="tc-hotspot-nat-wan" } } on-error={}

# 8. Configure Hotspot Profile & Server on "${bridge}" (Cookies Disabled; addresses-per-mac=unlimited for APs on ether2-ether5)
:do { /ip hotspot profile remove [find name="tc-hotspot-profile"] } on-error={}
/ip hotspot profile add name="tc-hotspot-profile" hotspot-address=${gateway} dns-name="" html-directory=hotspot login-by=${allowFree ? 'http-chap,http-pap,trial' : 'http-chap,http-pap'} http-cookie-lifetime=none split-user-domain=no trial-uptime-limit=30m trial-uptime-reset=1d rate-limit="" use-radius=no
:do { /ip hotspot profile set [find default=yes] login-by=${allowFree ? 'http-chap,http-pap,trial' : 'http-chap,http-pap'} http-cookie-lifetime=none trial-uptime-limit=30m trial-uptime-reset=1d rate-limit="" use-radius=no } on-error={}
:do { /ip hotspot remove [find interface="${bridge}"] } on-error={}
/ip hotspot add name="tc-hotspot" interface="${bridge}" address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" addresses-per-mac=unlimited idle-timeout=5m keepalive-timeout=2m disabled=no

# 9. VPS & EcoCash/OTT Walled Garden Rules (Purges OS captive probe domains so phones/laptops redirect immediately)
:do { /ip hotspot walled-garden remove [find dst-host~"apple" or dst-host~"gstatic" or dst-host~"google" or dst-host~"msft" or dst-host~"firefox" or dst-host~"vodacom" or dst-host~"mywallet"] } on-error={}
:do { /ip hotspot walled-garden ip remove [find comment~"tc-vps"] } on-error={}
/ip hotspot walled-garden ip add dst-address=${vpsIpOnly} action=accept comment="tc-vps-server-access"
:do { /ip hotspot walled-garden remove [find comment~"tc-vps"] } on-error={}
/ip hotspot walled-garden add dst-host="*${vpsIpOnly}*" action=allow comment="tc-vps-portal-domain"
/ip hotspot walled-garden add dst-host="*econet.co.ls" action=allow comment="tc-ecocash-walled-garden"
/ip hotspot walled-garden add dst-host="*ecocash.co.ls" action=allow comment="tc-ecocash-api-walled-garden"
/ip hotspot walled-garden add dst-host="*ottlesotho.com" action=allow comment="tc-ott-walled-garden"
/ip hotspot walled-garden add dst-host="*ottvoucher.com" action=allow comment="tc-ottvoucher-walled-garden"

# 10. Deploy Portal Builder On-Router Splash Page (hotspot/login.html & flash/hotspot/login.html)
${RouterOSRenderer.buildSplashPageFileCommands(`http://${vpsCleanHost}`, allowFree)}

# 11. Hotspot Users (Voucher/Test User & Conditional Free Trial User)
:do { /ip hotspot user remove [find name="test"] } on-error={}
/ip hotspot user add name="test" password="123" comment="T-Connect Instant Testing User"
:do { /ip hotspot user remove [find name="T-TRIAL"] } on-error={}
${allowFree ? `/ip hotspot user add name="T-TRIAL" password="123" limit-uptime=30m comment="T-Connect Free Trial Auth User"` : `# Free Trial Disabled by Admin Policy`}

# 12. Bypass Only AP Hardware Management IPs (Removed 10.10.0.254 PC bypass so test PC sees Splash Page)
:do { /ip hotspot ip-binding remove [find comment~"tc-bypass"] } on-error={}
/ip hotspot ip-binding add address=${ap1} type=bypassed comment="tc-bypass-AP1-ether2"
/ip hotspot ip-binding add address=${ap2} type=bypassed comment="tc-bypass-AP2-ether3"
/ip hotspot ip-binding add address=10.10.0.4 type=bypassed comment="tc-bypass-AP3-ether4"
/ip hotspot ip-binding add address=${ap3} type=bypassed comment="tc-bypass-AP4-ether5"

# 13. Configure RouterOS 7.16.2 wifi-qcom Radios with Open SSID "MIKROTIK-TC" Bound to "${bridge}"
:do {
  :foreach w in=[/interface wifi find] do={
    /interface wifi set $w configuration.ssid="MIKROTIK-TC" configuration.mode=ap datapath.bridge="${bridge}" disabled=no
    :do { /interface wifi unset $w security } on-error={}
    :do { /interface wifi unset $w security.passphrase } on-error={}
  };
  :log info "[T-Connect] Configured all RouterOS 7.16.2 wifi radios with SSID MIKROTIK-TC on ${bridge}";
} on-error={ :log warning "Could not auto-configure wifi radios" }

# 14. Flush Active Sessions, Cookies & Hosts so Connecting Devices Trigger Captive Portal Immediately
:do { /ip hotspot active remove [find] } on-error={}
:do { /ip hotspot cookie remove [find] } on-error={}
:do { /ip hotspot host remove [find] } on-error={}
/ip service set www disabled=no port=80
/ip service set winbox disabled=no port=8291

:log info "[T-Connect] Alignment complete! ${bridge} is active with ${gateway}/22 gateway and Portal Builder Splash Page.";
:put "T-Connect: [SUCCESS] Alignment complete! ether1 isolated as WAN, ether2-5 & wifi1-2 on ${bridge} (${gateway}/22), and Portal Builder Splash Page active.";`;
  }
}



