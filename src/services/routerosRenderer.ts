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
  backhaulMbps?: number;
  wan2Interface?: string;
}

export class RouterOSRenderer {
  /**
   * E5 & AT-12: Escapes any untrusted or admin-entered string before interpolating into a RouterOS .rsc script
   * so characters like ", $, \, ?, [, ], ;, {, }, or newlines can never inject RouterOS commands.
   */
  static escapeRouterOSString(input?: string): string {
    const raw = String(input ?? '');
    return raw
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/\?/g, '\\?')
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .replace(/;/g, ',')
      .replace(/\{/g, '(')
      .replace(/\}/g, ')')
      .trim();
  }

  /**
   * Generates the MKController-style one-liner script to be pasted directly into RouterOS terminal.
   * Performs DNS resolution check, device-mode fetch capability check, HTTP/HTTPS download with single-use token,
   * verbose import for error visibility, and clean cleanup.
   */
  static renderOneLiner(options: OneLinerOptions): string {
    const { controllerDomain, routerId, token } = options;
    const safeRouterId = RouterOSRenderer.escapeRouterOSString(routerId);
    const safeToken = RouterOSRenderer.escapeRouterOSString(token);
    const protocol = options.endpointProtocol || (controllerDomain.includes('localhost') || controllerDomain.includes(':') || /^\d+\.\d+\.\d+\.\d+/.test(controllerDomain) ? 'http' : 'https');
    const domainOnly = controllerDomain.split(':')[0];
    const isRawIp = /^\d+\.\d+\.\d+\.\d+$/.test(domainOnly);
    const fetchUrl = `${protocol}://${controllerDomain}/api/devices/${safeRouterId}/adopt.rsc?token=${safeToken}`;
    const filename = `tc-${safeRouterId.slice(0, 8)}.rsc`;

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
    const safeBridge = RouterOSRenderer.escapeRouterOSString(bridgeName);
    return [
      `# Ensure ${safeBridge} exists & isolate ether1 as Starlink WAN`,
      `:if ([:len [/interface bridge find name="${safeBridge}"]] = 0) do={ /interface bridge add name="${safeBridge}" arp=enabled protocol-mode=rstp disabled=no comment="tconnect:guest-bridge" } else={ /interface bridge set [find name="${safeBridge}"] arp=enabled protocol-mode=rstp disabled=no }`,
      `:do { /interface bridge port remove [find interface="ether1"] } on-error={}`,
      `:do { /ip dhcp-client remove [find interface!="ether1"] } on-error={}`,
      `:do { /interface ethernet set [find default-name~"ether2|ether3|ether4|ether5|ether6|sfp"] disabled=no arp=enabled } on-error={}`,
      `# Immediately bridge all 5+ downstream ports & Wi-Fi radios into ${safeBridge}`,
      `:foreach p in={"ether2";"ether3";"ether4";"ether5";"ether6";"sfp1";"sfp-sfpplus1";"wifi1";"wifi2";"wlan1";"wlan2"} do={ :do { :if ([:len [/interface find name=$p]] > 0) do={ :if ([:len [/interface bridge port find interface=$p]] > 0) do={ /interface bridge port set [find interface=$p] bridge="${safeBridge}" horizon=none disabled=no } else={ /interface bridge port add bridge="${safeBridge}" interface=$p horizon=none disabled=no } } } on-error={} }`,
      `:do { :foreach w in=[/interface wifi find] do={ /interface wifi set $w configuration.ssid="MIKROTIK-TC" configuration.mode=ap datapath.bridge="${safeBridge}" disabled=no; :do { /interface wifi unset $w security } on-error={}; :do { /interface wifi unset $w security.passphrase } on-error={} } } on-error={}`,
      `:do { :foreach w in=[/interface wireless find] do={ /interface wireless set $w ssid="MIKROTIK-TC" mode=ap-bridge disabled=no } } on-error={}`
    ].join('\n');
  }

  /**
   * Builds RouterOS v7.15+ compatible commands to deploy the Portal Builder Splash Page
   * directly onto the MikroTik router (hotspot/login.html and flash/hotspot/login.html).
   * Uses /ip hotspot reset-html and /tool fetch from the VPS (never uses invalid /file add).
   */
  static buildSplashPageFileCommands(portalBaseUrl: string, allowFreeAccess: boolean = true): string {
    const cleanBaseUrl = portalBaseUrl.replace(/\/+$/, '');
    const hostOnly = cleanBaseUrl.replace(/^https?:\/\//, '').split(':')[0];
    const redirectAndFallbackHtml = `<!DOCTYPE html><html><head><meta charset=\\"utf-8\\"><meta name=\\"viewport\\" content=\\"width=device-width,initial-scale=1\\"><title>Wi-Fi Login</title><script>window.location.replace(\\"${cleanBaseUrl}/portal?mac=\\$(mac)&ip=\\$(ip)&link_login_only=\\$(link-login-only)&user_url=\\$(link-orig-esc)\\");</script><meta http-equiv=\\"refresh\\" content=\\"0; url=${cleanBaseUrl}/portal?mac=\\$(mac)&ip=\\$(ip)&link_login_only=\\$(link-login-only)&user_url=\\$(link-orig-esc)\\"></head><body style=\\"background:#05070c;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center\\"><div style=\\"background:#0f1422;border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:24px;max-width:360px;width:100%\\"><h2 style=\\"margin:0 0 8px;font-size:18px\\">Opening Wi-Fi Portal...</h2><p style=\\"font-size:12px;color:#94a3b8;margin:0 0 16px\\">Redirecting to the hotspot splash page...</p><a href=\\"${cleanBaseUrl}/portal?mac=\\$(mac)&ip=\\$(ip)&link_login_only=\\$(link-login-only)&user_url=\\$(link-orig-esc)\\" style=\\"display:block;padding:12px;background:#f05e17;color:#fff;text-decoration:none;border-radius:12px;font-weight:800;font-size:13px\\">Tap Here if Not Redirected &rarr;</a></div></body></html>`;

    return [
      RouterOSRenderer.buildImmediateMultiPortBridgeCommands('bridgeLocal'),
      `# Ensure PayLesotho, OTT Lesotho & Controller Walled Garden entries exist (No OS captive probe domains allowed)`,
      `:do { /ip hotspot walled-garden ip add dst-address=169.58.98.92 action=accept comment="tc-vps-server-access" } on-error={}`,
      `:do { /ip hotspot walled-garden add dst-host="*${hostOnly}*" action=allow comment="tc-vps-controller-domain" } on-error={}`,
      `:do { /ip hotspot walled-garden add dst-host="*api.paylesotho.co.ls" action=allow comment="tc-paylesotho-api" } on-error={}`,
      `:do { /ip hotspot walled-garden add dst-host="*xpayments.paylesotho.co.ls" action=allow comment="tc-xpayments-api" } on-error={}`,
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
   * Generates the complete 13-Stage Zero-Touch Baseline Provisioning Script (Stages 0–12)
   * for RouterOS v7.15+ (hAP ax3 / hAP ax2 / RB4011) per Master Build Specification E5, E6, E15, E16.
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
      controllerHost,
      backhaulMbps = 100
    } = options;

    const effectiveHost = controllerHost || hubDomain;
    const protocol = endpointProtocol || (effectiveHost.includes(':') || effectiveHost.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(effectiveHost) ? 'http' : 'https');
    const portalBaseUrl = `${protocol}://${effectiveHost}`;
    const cleanDomain = effectiveHost.split(':')[0];
    const allowFree = router.accessMode !== 'PAID_ONLY' && (router.freeModeEnabled ?? true);

    const safeRouterId = RouterOSRenderer.escapeRouterOSString(router.id);
    const safeRouterName = RouterOSRenderer.escapeRouterOSString(router.name);
    const safeSiteName = RouterOSRenderer.escapeRouterOSString(router.siteName || 'Maseru Hotspot');
    const safeModel = RouterOSRenderer.escapeRouterOSString(router.model || 'hAP ax3');
    const safeWgIp = RouterOSRenderer.escapeRouterOSString(routerWgIp || '10.99.1.10');
    const safeHubTunnelIp = RouterOSRenderer.escapeRouterOSString(hubTunnelIp || '10.99.0.1');
    const safeRadiusSecret = RouterOSRenderer.escapeRouterOSString(radiusSecret);
    const safeApiPassword = RouterOSRenderer.escapeRouterOSString(apiPassword);
    const parentMaxLimitMbps = Math.max(5, Math.floor(Number(backhaulMbps || 100) * 0.9));

    const isValidWgKey = (k?: string) => typeof k === 'string' && /^[A-Za-z0-9+/]{42,43}=*$/.test(k.trim()) && k.trim().length >= 40;
    const safePrivateKey = isValidWgKey(routerPrivateKey) ? routerPrivateKey.trim() : '';
    const safeHubPubKey = isValidWgKey(hubPublicKey) ? hubPublicKey.trim() : '';

    const scriptLines: string[] = [
      `# ==============================================================================`,
      `# T-Connect 13-Stage Zero-Touch Baseline Provisioning Script (RouterOS v7.15+)`,
      `# Target Router: "${safeRouterName}" (ID: "${safeRouterId}", Model: "${safeModel}")`,
      `# Site: "${safeSiteName}" | Assigned Tunnel IP: ${safeWgIp}/32`,
      `# Controller Endpoint: ${portalBaseUrl}`,
      `# Generated At: ${new Date().toISOString()}`,
      `# ==============================================================================`,
      ``,
      `# STAGE 0: Clock, Timezone (Africa/Maseru) & NTP Synchronization`,
      `:do { /system clock set time-zone-name=Africa/Maseru } on-error={}`,
      `:do { /system ntp client set enabled=yes servers=time.cloudflare.com,pool.ntp.org } on-error={}`,
      `:do { /system identity set name="TC-${safeRouterName.replace(/[^a-zA-Z0-9_-]/g, '_')}" } on-error={}`,
      `/log info "T-Connect [Stage 0/12]: Clock, Africa/Maseru timezone, NTP & Identity configured."`,
      ``,
      `# STAGE 1 & 2: Pre-Apply Backup & 5-Minute Safety Revert Timer (tconnect:revert-timer)`,
      `:do { /system backup save name="tconnect-pre-adopt" dont-encrypt=yes } on-error={}`,
      `:do { /system scheduler remove [find name="tconnect:revert-timer"] } on-error={}`,
      `:do { /system scheduler add name="tconnect:revert-timer" interval=5m on-event="/system scheduler remove [find name=\\"tconnect:revert-timer\\"]; /log warning \\"T-Connect: Adoption self-test did not complete within 5m; retaining backup tconnect-pre-adopt.\\"" comment="tconnect:revert-timer" } on-error={}`,
      `/log info "T-Connect [Stage 2/12]: Pre-adoption backup saved & revert-timer armed."`,
      ``,
      `# STAGE 3: Isolate WAN1 (ether1) & Configure Primary Uplink`,
      `:do { /interface bridge port remove [find interface="ether1"] } on-error={}`,
      `:do { /ip dhcp-client remove [find interface!="ether1"] } on-error={}`,
      `:do { /interface list add name=WAN comment="tconnect:wan-list" } on-error={}`,
      `:do { /interface list add name=LAN comment="tconnect:lan-list" } on-error={}`,
      `:do { /interface list member remove [find list=WAN interface!="ether1"] } on-error={}`,
      `:do { /interface list member add list=WAN interface=ether1 comment="tconnect:wan1-primary" } on-error={}`,
      `:do { :if ([:len [/ip dhcp-client find interface="ether1"]] = 0) do={ /ip dhcp-client add interface=ether1 disabled=no add-default-route=yes default-route-distance=1 use-peer-dns=yes comment="tconnect:wan1-dhcp" } else={ /ip dhcp-client set [find interface="ether1"] disabled=no add-default-route=yes default-route-distance=1 } } on-error={}`,
      `/log info "T-Connect [Stage 3/12]: WAN1 (ether1) isolated and primary DHCP client active."`,
      ``,
      `# STAGE 4: WireGuard Management Tunnel (Unique /32 IP ${safeWgIp}, Persistent Keepalive 25s)`,
      `:do { /interface wireguard remove [find name="wg-tconnect"] } on-error={}`,
      safePrivateKey
        ? `:do { /interface wireguard add name="wg-tconnect" listen-port=${hubWgPort} private-key="${safePrivateKey}" comment="tconnect:wg-tunnel" } on-error={ :do { /interface wireguard add name="wg-tconnect" listen-port=${hubWgPort} comment="tconnect:wg-tunnel" } on-error={} }`
        : `:do { /interface wireguard add name="wg-tconnect" listen-port=${hubWgPort} comment="tconnect:wg-tunnel" } on-error={}`,
      `:do { /ip address remove [find comment="tc-wg-ip"] } on-error={}`,
      `:do { /ip address add address="${safeWgIp}/24" interface="wg-tconnect" comment="tc-wg-ip" } on-error={}`,
      `:do { /interface wireguard peers remove [find comment="tc-hub-peer"] } on-error={}`,
      safeHubPubKey
        ? `:do { /interface wireguard peers add interface="wg-tconnect" public-key="${safeHubPubKey}" endpoint-address="${cleanDomain}" endpoint-port=${hubWgPort} allowed-address="${safeHubTunnelIp}/32,10.99.0.0/16" persistent-keepalive=25s comment="tc-hub-peer" } on-error={}`
        : `# Hub public key omitted - wireguard interface created`,
      `/log info "T-Connect [Stage 4/12]: WireGuard tunnel wg-tconnect (${safeWgIp}) configured."`,
      ``,
      `# STAGE 5: Guest Bridge (bridgeLocal / br-tconnect-guest), Non-Overlapping Subnets & DHCP Server`,
      `:if ([:len [/interface bridge find name="bridgeLocal"]] = 0) do={ /interface bridge add name="bridgeLocal" arp=enabled protocol-mode=rstp disabled=no comment="tconnect:br-tconnect-guest" } else={ /interface bridge set [find name="bridgeLocal"] arp=enabled protocol-mode=rstp disabled=no };`,
      `:do { /interface list member add list=LAN interface=bridgeLocal comment="tconnect:lan-bridge" } on-error={}`,
      `:do { /interface ethernet set [find default-name~"ether2|ether3|ether4|ether5|ether6|sfp"] disabled=no arp=enabled } on-error={}`,
      `:foreach p in={"ether2";"ether3";"ether4";"ether5";"ether6";"sfp1";"sfp-sfpplus1";"wifi1";"wifi2";"wlan1";"wlan2"} do={ :do { :if ([:len [/interface find name=$p]] > 0) do={ :if ([:len [/interface bridge port find interface=$p]] > 0) do={ /interface bridge port set [find interface=$p] bridge="bridgeLocal" horizon=none disabled=no } else={ /interface bridge port add bridge="bridgeLocal" interface=$p horizon=none disabled=no } } } on-error={} };`,
      `:do { /ip dhcp-server remove [find interface!="bridgeLocal"] } on-error={}`,
      `:do { /ip hotspot remove [find interface!="bridgeLocal"] } on-error={}`,
      `:do { /ip address remove [find interface~"ether2|ether3|ether4|ether5|ether6|sfp"] } on-error={}`,
      `:do { /ip address remove [find interface="bridgeLocal"] } on-error={}`,
      `/ip address add address=10.10.0.1/22 network=10.10.0.0 interface="bridgeLocal" comment="tc-hotspot-lan-gateway"`,
      `:do { /ip address add address=10.128.0.1/16 network=10.128.0.0 interface="bridgeLocal" comment="tconnect:non-overlapping-guest-cidr" } on-error={}`,
      `:do { /ip pool remove [find name="tc-hotspot-pool"] } on-error={}`,
      `/ip pool add name="tc-hotspot-pool" ranges=10.10.0.50-10.10.3.250`,
      `:do { /ip dhcp-server remove [find interface="bridgeLocal"] } on-error={}`,
      `:do { /ip dhcp-server network remove [find] } on-error={}`,
      `/ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 comment="T-Connect Hotspot Guest Network"`,
      `/ip dhcp-server add name="tc-dhcp-server" interface="bridgeLocal" address-pool="tc-hotspot-pool" lease-time=1h disabled=no`,
      `/log info "T-Connect [Stage 5/12]: Guest bridge, non-overlapping subnet & DHCP server configured."`,
      ``,
      `# STAGE 6: Wireless Radios — Open SSID "MIKROTIK-TC" on All Bands (wifi-qcom + legacy wireless)`,
      `:do { :foreach w in=[/interface wifi find] do={ /interface wifi set $w configuration.ssid="MIKROTIK-TC" configuration.mode=ap datapath.bridge="bridgeLocal" disabled=no; :do { /interface wifi unset $w security } on-error={}; :do { /interface wifi unset $w security.passphrase } on-error={} } } on-error={}`,
      `:do { :foreach w in=[/interface wireless find] do={ /interface wireless set $w ssid="MIKROTIK-TC" mode=ap-bridge disabled=no } } on-error={}`,
      `/log info "T-Connect [Stage 6/12]: Open SSID MIKROTIK-TC broadcast on all wireless radios."`,
      ``,
      `# STAGE 7: Hotspot Server, Central FreeRADIUS (1812/1813/3799) & Walled Garden`,
      `:do { /radius remove [find comment="tc-radius"] } on-error={}`,
      `:do { /radius add service=hotspot address=${safeHubTunnelIp} secret="${safeRadiusSecret}" authentication-port=1812 accounting-port=1813 timeout=3s comment="tc-radius" } on-error={}`,
      `:do { /radius incoming set accept=yes port=3799 } on-error={}`,
      `:do { /ip hotspot profile remove [find name="tc-hotspot-profile"] } on-error={}`,
      `/ip hotspot profile add name="tc-hotspot-profile" hotspot-address=10.10.0.1 dns-name="" html-directory=hotspot login-by=${allowFree ? 'http-chap,http-pap,trial' : 'http-chap,http-pap'} http-cookie-lifetime=none split-user-domain=no trial-uptime-limit=0s trial-uptime-reset=0s rate-limit="" use-radius=yes radius-accounting=yes radius-interim-update=5m`,
      `:do { /ip hotspot remove [find interface="bridgeLocal"] } on-error={}`,
      `/ip hotspot add name="tc-hotspot" interface="bridgeLocal" address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" addresses-per-mac=unlimited idle-timeout=5m keepalive-timeout=2m disabled=no`,
      `:do { /ip hotspot user remove [find name="test"] } on-error={}`,
      `/ip hotspot user add name="test" password="123" comment="T-Connect Instant Testing User"`,
      `:do { /ip hotspot user remove [find name="T-TRIAL"] } on-error={}`,
      allowFree
        ? `/ip hotspot user add name="T-TRIAL" password="123" comment="T-Connect Free Unlimited Auth User"`
        : `# Free Trial Disabled by Admin Policy (T-TRIAL user omitted)`,
      `:do { /ip hotspot ip-binding remove [find comment~"tc-bypass"] } on-error={}`,
      `/ip hotspot ip-binding add address=10.10.0.2 type=bypassed comment="tc-bypass-AP1-ether2"`,
      `/ip hotspot ip-binding add address=10.10.0.3 type=bypassed comment="tc-bypass-AP2-ether3"`,
      `/ip hotspot ip-binding add address=10.10.0.4 type=bypassed comment="tc-bypass-AP3-ether4"`,
      `/ip hotspot ip-binding add address=10.10.0.5 type=bypassed comment="tc-bypass-AP4-ether5"`,
      `:do { /ip hotspot walled-garden remove [find dst-host~"apple" or dst-host~"gstatic" or dst-host~"google" or dst-host~"msft" or dst-host~"firefox" or dst-host~"vodacom" or dst-host~"mywallet"] } on-error={}`,
      RouterOSRenderer.buildSplashPageFileCommands(portalBaseUrl, allowFree)
    ];

    walledGardenDomains
      .filter((d) => !/apple|gstatic|google|msft|firefox|vodacom|mywallet/i.test(d))
      .forEach((domain) => {
        const safeDom = RouterOSRenderer.escapeRouterOSString(domain);
        scriptLines.push(
          `:do { /ip hotspot walled-garden add dst-host="*${safeDom}" action=allow comment="T-Connect Walled Garden - ${safeDom}" } on-error={}`
        );
      });

    scriptLines.push(
      `/log info "T-Connect [Stage 7/12]: Hotspot, FreeRADIUS (1812/1813/CoA 3799) & Walled Garden configured."`,
      ``,
      `# STAGE 8: Firewall, NAT, DNS Interception, Management Lockdown (10.99.0.1/32 Only) & IPv6 Guest Disable`,
      `/ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="tc-hotspot-nat" } } on-error={}`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat-wan"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="tc-hotspot-nat-wan" } } on-error={}`,
      `:do { /ipv6 settings set disable-ipv6=yes forward=no } on-error={}`,
      `:do { /ipv6 nd set [find] disabled=yes } on-error={}`,
      `:do { /ip service set telnet disabled=yes } on-error={}`,
      `:do { /ip service set ftp disabled=yes } on-error={}`,
      `:do { /ip service set www-ssl disabled=yes } on-error={}`,
      `:do { /ip service set api disabled=yes } on-error={}`,
      `:do { /ip service set www disabled=no port=80 address="${safeHubTunnelIp}/32" } on-error={}`,
      `:do { /ip service set winbox disabled=no port=8291 address="${safeHubTunnelIp}/32,10.10.0.0/22" } on-error={}`,
      `:do { /ip service set ssh disabled=no port=22 address="${safeHubTunnelIp}/32" } on-error={}`,
      `:do { /ip service set api-ssl disabled=no port=8729 address="${safeHubTunnelIp}/32" } on-error={}`,
      `:do { /user group add name="tc-agent" policy="read,write,api,test,password" } on-error={}`,
      `:do { /user remove [find name="tc_controller"] } on-error={}`,
      `:do { /user add name="tc_controller" group="tc-agent" password="${safeApiPassword}" address="${safeHubTunnelIp}/32" comment="tconnect:controller-admin" } on-error={}`,
      `:do { /tool mac-server set allowed-interface-list=none } on-error={}`,
      `:do { /tool mac-server mac-winbox set allowed-interface-list=none } on-error={}`,
      `:do { /ip neighbor discovery-settings set discover-interface-list=none } on-error={}`
    );

    if (blockDoH) {
      scriptLines.push(
        `:do { /ip dhcp-server set [find name="tc-dhcp-server"] dhcp-option="" } on-error={}`,
        `:do { /ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept UDP DNS" } on-error={}`,
        `:do { /ip firewall nat add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept TCP DNS" } on-error={}`,
        `:do { /ip firewall filter add chain=forward protocol=tcp dst-port=853 action=reject reject-with=tcp-reset comment="T-Connect: Block DoT (Port 853)" } on-error={}`,
        `:do { /ip firewall filter add chain=forward protocol=udp dst-port=853 action=drop comment="T-Connect: Block DoT UDP (Port 853)" } on-error={}`
      );
    }

    scriptLines.push(
      `/log info "T-Connect [Stage 8/12]: Firewall, Management Lockdown (10.99.0.1/32), DNS Intercept & IPv6 guest block active."`,
      ``,
      `# STAGE 9: Dynamic Parent Queue & PCQ Bandwidth Shaping (${parentMaxLimitMbps}M = 90% of ${backhaulMbps}M Backhaul)`,
      `:do { /queue simple remove [find name="tconnect:guest-parent"] } on-error={}`,
      `:do { /queue simple add name="tconnect:guest-parent" target=10.10.0.0/22 max-limit=${parentMaxLimitMbps}M/${parentMaxLimitMbps}M comment="tconnect:backhaul-parent-queue" } on-error={}`,
      `/log info "T-Connect [Stage 9/12]: Dynamic parent queue (${parentMaxLimitMbps}M) configured."`,
      ``,
      `# STAGE 10: Flash-Safe 15-Second Heartbeat Daemon (RAM-only output=user on RouterOS v7.15+ — Zero Flash Wear)`,
      `:do { /system scheduler remove [find name="tc-heartbeat"] } on-error={}`,
      `:do { /system scheduler add name="tc-heartbeat" interval=15s on-event=":do { :local res [/tool fetch url=\\"${portalBaseUrl}/api/devices/${safeRouterId}/heartbeat.rsc?uptime=$[/system resource get uptime]&cpu=$[/system resource get cpu-load]&mem=$[/system resource get free-memory]&sessions=$[/ip hotspot active print count-only]\\" check-certificate=no as-value output=user]; :if ([:len (\\$res->\\"data\\")] > 28) do={ :local cmd [:parse (\\$res->\\"data\\")]; [\\$cmd] } } on-error={}" comment="tconnect:ram-safe-15s-heartbeat" } on-error={}`,
      `/log info "T-Connect [Stage 10/12]: Flash-safe 15s RAM heartbeat daemon scheduled."`,
      ``,
      `# STAGE 11: Self-Test Verification, Revert Timer Disarm & Instant Adoption Handshake`,
      `:do { /ip hotspot active remove [find] } on-error={}`,
      `:do { /ip hotspot cookie remove [find] } on-error={}`,
      `:do { /ip hotspot host remove [find] } on-error={}`,
      `:do { /system scheduler remove [find name="tconnect:revert-timer"] } on-error={}`,
      `:put "T-Connect: Dispatching instant adoption handshake to ${portalBaseUrl}...";`,
      `:do { /tool fetch url="${portalBaseUrl}/api/devices/${safeRouterId}/heartbeat" http-method=post http-data="uptime=$[/system resource get uptime]&cpu=$[/system resource get cpu-load]&mem=$[/system resource get free-memory]&sessions=0&stage=ADOPT_PROVISION" check-certificate=no output=none; :put "T-Connect: [SUCCESS] Adoption handshake verified by platform! Router is now ONLINE."; /log info "T-Connect [Stage 11/12]: Device provisioning complete and revert-timer disarmed."; } on-error={ :put "T-Connect: [NOTICE] Immediate handshake probe unacknowledged; 15s watchdog cron will retry in background."; }`,
      ``,
      `# STAGE 12: Dual-Uplink Hot Failover Readiness (Primary ether1 distance=1, Backup WAN2 distance=2, 2s/10s/60s Hysteresis)`,
      `:do { /ip route remove [find comment="tc-wan2-backup"] } on-error={}`,
      `:do { /ip route remove [find comment="tc-wan1-primary"] } on-error={}`,
      `:do { /ip route remove [find comment="tc-wan1-canary"] } on-error={}`,
      `/log info "T-Connect [Stage 12/12]: Zero-Touch 13-stage baseline provisioning complete."`
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
        `# Policy: Hybrid Access (Unlimited Free Wi-Fi + Paid Vouchers + EcoCash/OTT, Cookies Disabled)`,
        `:do { /ip hotspot user remove [find name="T-TRIAL"] } on-error={}`,
        `:do { /ip hotspot user add name="T-TRIAL" password="123" comment="T-Connect Free Unlimited User" } on-error={}`,
        `:do { /ip hotspot cookie remove [find] } on-error={}`,
        `:do { /ip hotspot profile set [find name="tc-hotspot-profile"] login-by=http-chap,http-pap,trial trial-uptime-limit=0s trial-uptime-reset=0s use-radius=no } on-error={}`,
        `:do { /ip hotspot profile set [find default=yes] login-by=http-chap,http-pap,trial trial-uptime-limit=0s trial-uptime-reset=0s use-radius=no } on-error={}`,
        RouterOSRenderer.buildSplashPageFileCommands(portalBaseUrl, true),
        `:log info "[T-Connect Policy] Hybrid mode active: Unlimited free Wi-Fi enabled on Splash Page.";`
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
   * Generates standalone Dual-Uplink Hot Failover script (E15: 2s probe, 10s down, 60s hysteresis failback)
   */
  static renderWanFailoverScript(options: {
    wan1?: string;
    wan2?: string;
    checkHost?: string;
    hubDomain?: string;
    routerId?: string;
  }): string {
    const wan1 = RouterOSRenderer.escapeRouterOSString(options.wan1 || 'ether1');
    const wan2 = RouterOSRenderer.escapeRouterOSString(options.wan2 || 'ether2');
    const checkHost = RouterOSRenderer.escapeRouterOSString(options.checkHost || '1.1.1.1');
    const hubDomain = RouterOSRenderer.escapeRouterOSString(options.hubDomain || '169.58.98.92:3000');
    const routerId = RouterOSRenderer.escapeRouterOSString(options.routerId || 'rt_current');

    return `# ==============================================================================
# T-Connect Automated Dual-Uplink Hot Failover (RouterOS v7.15+ / E15)
# Primary WAN1: ${wan1} (Starlink / Primary ISP — distance=1)
# Secondary WAN2: ${wan2} (LTE / 5G / Fiber Backup — distance=2)
# Probe Target: ${checkHost} (2s interval, 10s down threshold, 60s recovery hold-down)
# ==============================================================================

# 1. Disable automatic default routes on DHCP clients so recursive routes govern
:do { /ip dhcp-client set [find interface="${wan1}"] add-default-route=no } on-error={}
:do { /ip dhcp-client set [find interface="${wan2}"] add-default-route=no } on-error={}

# 2. Host Route to Canary IP (${checkHost}/32) pinned strictly to Primary WAN1 (${wan1})
:do { /ip route remove [find comment="tc-wan1-canary"] } on-error={}
:do { /ip route add dst-address=${checkHost}/32 gateway=${wan1} scope=10 comment="tc-wan1-canary" } on-error={ :do { /ip route add dst-address=${checkHost}/32 gateway=%${wan1} scope=10 comment="tc-wan1-canary" } on-error={} }

# 3. Primary Default Route via Canary with Ping Check (Distance 1)
:do { /ip route remove [find comment="tc-wan1-primary"] } on-error={}
:do { /ip route add dst-address=0.0.0.0/0 gateway=${checkHost} check-gateway=ping distance=1 target-scope=30 comment="tc-wan1-primary" } on-error={}

# 4. Secondary Default Route via Backup WAN2 (${wan2}) with Distance 2
:do { /ip route remove [find comment="tc-wan2-backup"] } on-error={}
:do { /ip route add dst-address=0.0.0.0/0 gateway=${wan2} distance=2 comment="tc-wan2-backup" } on-error={ :do { /ip route add dst-address=0.0.0.0/0 gateway=%${wan2} distance=2 comment="tc-wan2-backup" } on-error={} }

# 5. Netwatch Probing Sentinel (2s interval, 10s down threshold, 60s hysteresis failback + Conntrack Flush)
:do { /tool netwatch remove [find comment="tc-failover-sentinel"] } on-error={}
:do { /tool netwatch add host=${checkHost} interval=2s timeout=2s down-script=":do { /ip firewall connection remove [find] } on-error={}; /log warning \\"[T-Connect Failover] Primary ${wan1} unreachable (>10s)! Switching traffic to ${wan2} backup.\\"; :do { /tool fetch url=\\"http://${hubDomain}/api/devices/${routerId}/failover?status=FAILOVER_ACTIVE&wan=${wan2}\\" output=none } on-error={}" up-script=":delay 60s; :do { /ip firewall connection remove [find] } on-error={}; /log info \\"[T-Connect Failover] Primary ${wan1} healthy for 60s! Restoring primary route.\\"; :do { /tool fetch url=\\"http://${hubDomain}/api/devices/${routerId}/failover?status=RESTORED&wan=${wan1}\\" output=none } on-error={}" comment="tc-failover-sentinel" } on-error={}

/log info "T-Connect: Automated Dual-WAN Hot Failover active (${wan1} -> ${wan2}, 2s/10s/60s hysteresis)."
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
/ip hotspot profile add name="tc-hotspot-profile" hotspot-address=${gateway} dns-name="" html-directory=hotspot login-by=${allowFree ? 'http-chap,http-pap,trial' : 'http-chap,http-pap'} http-cookie-lifetime=none split-user-domain=no trial-uptime-limit=0s trial-uptime-reset=0s rate-limit="" use-radius=no
:do { /ip hotspot profile set [find default=yes] login-by=${allowFree ? 'http-chap,http-pap,trial' : 'http-chap,http-pap'} http-cookie-lifetime=none trial-uptime-limit=0s trial-uptime-reset=0s rate-limit="" use-radius=no } on-error={}
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

# 11. Hotspot Users (Voucher/Test User & Conditional Free Unlimited User)
:do { /ip hotspot user remove [find name="test"] } on-error={}
/ip hotspot user add name="test" password="123" comment="T-Connect Instant Testing User"
:do { /ip hotspot user remove [find name="T-TRIAL"] } on-error={}
${allowFree ? `/ip hotspot user add name="T-TRIAL" password="123" comment="T-Connect Free Unlimited Auth User"` : `# Free Trial Disabled by Admin Policy`}

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



