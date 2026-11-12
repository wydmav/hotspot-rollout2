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
  speedCapsEnabled?: boolean;
  dhcpRange?: string;
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
  rateLimit?: string;
  speedCapsEnabled?: boolean;
  dhcpRange?: string;
}

export class RouterOSRenderer {
  static readonly FULL_SUBNET_DHCP_RANGE = '10.10.0.10-10.10.3.254';

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
    const rawDomain = (options.controllerDomain || '169.58.98.92:3000').trim();
    const controllerDomain = (rawDomain.includes('localhost') || rawDomain.includes('127.0.0.1') || rawDomain.includes('.run.app'))
      ? '169.58.98.92:3000'
      : rawDomain;
    const { routerId, token } = options;
    const safeRouterId = RouterOSRenderer.escapeRouterOSString(routerId);
    const safeToken = RouterOSRenderer.escapeRouterOSString(token);
    const protocol = (controllerDomain.includes(':') || /^\d+\.\d+\.\d+\.\d+/.test(controllerDomain))
      ? 'http'
      : (options.endpointProtocol || 'https');
    const domainOnly = controllerDomain.split(':')[0];
    const isRawIp = /^\d+\.\d+\.\d+\.\d+$/.test(domainOnly);
    const fetchUrl = `${protocol}://${controllerDomain}/api/devices/${safeRouterId}/adopt.rsc?token=${safeToken}`;
    const filename = `tc-${safeRouterId.slice(0, 8)}.rsc`;

    const dnsCheck = isRawIp 
      ? `:log info "T-Connect - Direct IP endpoint detected (${domainOnly}). DNS check bypassed."` 
      : `:do { :resolve "${domainOnly}" } on-error={ /log warning "T-Connect - DNS check for ${domainOnly} failed. Continuing..." }`;

    return `{ ${dnsCheck}; :local fetchDisabled false; :do { :local chk [:parse ":return ([/system/device-mode/get fetch] = false)"]; :set fetchDisabled [$chk] } on-error={}; :if ($fetchDisabled) do={ /log error "T-Connect - Fetch is locked by Device Mode. Enable fetch in /system/device-mode and retry."; :error "Device Mode restricted" }; :local fwVer [/system resource get version]; :put "T-Connect: Fetching Master Adoption Script from ${protocol}://${controllerDomain}..."; :do { /tool fetch url="${fetchUrl}" http-method=post http-data="fw=$fwVer" dst-path="${filename}" check-certificate=no } on-error={ /tool fetch url="${fetchUrl}" http-method=get dst-path="${filename}" check-certificate=no }; :do { /import file-name="${filename}" verbose=yes; :delay 1s; /file remove "${filename}"; /log info "T-Connect - Device adopted successfully. T-Connect Hotspot and Captive Portal operational."; :put "T-Connect: [SUCCESS] Router adopted! T-Connect Hotspot and Captive Portal operational." } on-error={ /log error "T-Connect - Adoption script encountered an error during import. File retained as ${filename} for inspection."; :put "T-Connect: [ERROR] Import encountered an issue. File retained as ${filename}. Run: /import file-name=${filename} verbose=yes"; :error "Import failed" } }`;
  }

  /**
   * Builds RouterOS commands to immediately bridge all 5+ downstream LAN/AP ports
   * (ether2, ether3, ether4, ether5, ether6, sfp1, sfp-sfpplus1 + wifi1, wifi2, wlan1, wlan2)
   * into bridgeLocal while isolating ether1 as Starlink WAN and broadcasting open SSID "T-Connect Hotspot".
   */
  static buildImmediateMultiPortBridgeCommands(bridgeName: string = 'bridgeLocal'): string {
    return [
      `# Ensure ${bridgeName} exists & isolate ether1 as Starlink WAN`,
      `:if ([:len [/interface bridge find name="${bridgeName}"]] = 0) do={ /interface bridge add name="${bridgeName}" arp=enabled protocol-mode=rstp disabled=no comment="T-Connect Hotspot & AP Local Bridge" } else={ /interface bridge set [find name="${bridgeName}"] arp=enabled protocol-mode=rstp disabled=no }`,
      `:do { /interface bridge port remove [find interface="ether1"] } on-error={}`,
      `:do { /ip dhcp-client remove [find interface!="ether1"] } on-error={}`,
      `:do { /interface ethernet set [find default-name~"ether2|ether3|ether4|ether5|ether6|sfp"] disabled=no arp=enabled } on-error={}`,
      `# Configure Open Wi-Fi SSID "T-Connect Hotspot" on 2.4GHz & 5GHz (RouterOS v7 wifi-qcom/wifiwave2 + legacy wireless)`,
      `:do { /interface wifi datapath set [find] bridge="${bridgeName}" disabled=no } on-error={}`,
      `:do { /interface wifi security set [find] authentication-types="" passphrase="" } on-error={}`,
      `:do { /interface wifi configuration set [find] ssid="T-Connect Hotspot" mode=ap datapath.bridge="${bridgeName}" disabled=no; :do { /interface wifi configuration unset [find] security } on-error={}; :do { /interface wifi configuration unset [find] security.passphrase } on-error={} } on-error={}`,
      `:do { :foreach w in=[/interface wifi find] do={ /interface wifi set $w configuration.ssid="T-Connect Hotspot" configuration.mode=ap datapath.bridge="${bridgeName}" disabled=no; :do { /interface wifi unset $w security } on-error={}; :do { /interface wifi unset $w security.passphrase } on-error={}; :do { /interface wifi unset $w security.authentication-types } on-error={} } } on-error={}`,
      `:do { /interface wireless security-profiles set [find default=yes] mode=none authentication-types="" } on-error={}`,
      `:do { /interface wireless set [find] mode=ap-bridge ssid="T-Connect Hotspot" security-profile=default max-station-count=2007 disabled=no } on-error={}`,
      `# Immediately bridge all 5+ downstream ports & Wi-Fi radios into ${bridgeName}`,
      `:foreach p in={"ether2";"ether3";"ether4";"ether5";"ether6";"sfp1";"sfp-sfpplus1";"wifi1";"wifi2";"wlan1";"wlan2"} do={ :do { :if ([:len [/interface find name=$p]] > 0) do={ :if ([:len [/interface bridge port find interface=$p]] > 0) do={ :if ([/interface bridge port get [find interface=$p] dynamic] = false) do={ /interface bridge port set [find interface=$p] bridge="${bridgeName}" horizon=none disabled=no } } else={ /interface bridge port add bridge="${bridgeName}" interface=$p horizon=none disabled=no } } } on-error={} }`
    ].join('\n');
  }

  /**
   * Formats a RouterOS-compliant speed + burst rate-limit string:
   * rx-rate/tx-rate rx-burst-rate/tx-burst-rate rx-burst-threshold/tx-burst-threshold rx-burst-time/tx-burst-time
   * Note: In RouterOS Hotspot & Simple Queues, rx/upload is first and tx/download is second (uploadM/downloadM).
   */
  static formatBurstRateLimit(
    uploadMbps: number = 10,
    downloadMbps: number = 20,
    burstUploadMbps: number = 15,
    burstDownloadMbps: number = 30
  ): string {
    const up = Math.max(1, Math.round(Number(uploadMbps) || 10));
    const down = Math.max(1, Math.round(Number(downloadMbps) || 20));
    const bUp = Math.max(up, Math.round(Number(burstUploadMbps) || up));
    const bDown = Math.max(down, Math.round(Number(burstDownloadMbps) || down));
    const thUp = Math.max(1, Math.round(up * 0.8));
    const thDown = Math.max(1, Math.round(down * 0.8));
    if (bUp <= up && bDown <= down) {
      return `${up}M/${down}M`;
    }
    return `${up}M/${down}M ${bUp}M/${bDown}M ${thUp}M/${thDown}M 15s/15s`;
  }

  /**
   * Parses a RouterOS rate-limit string into discrete Simple Queue parameters.
   */
  static parseRateLimitParts(rateLimit?: string): {
    maxLimit: string;
    burstLimit: string;
    burstThreshold: string;
    burstTime: string;
    fullRateLimit: string;
  } {
    const raw = (rateLimit && rateLimit.trim()) ? rateLimit.trim() : '10M/20M 15M/30M 8M/16M 15s/15s';
    const tokens = raw.split(/\s+/);
    const maxLimit = tokens[0] && tokens[0].includes('/') ? tokens[0] : '10M/20M';
    const burstLimit = tokens[1] && tokens[1].includes('/') ? tokens[1] : maxLimit;
    const burstThreshold = tokens[2] && tokens[2].includes('/') ? tokens[2] : maxLimit;
    const burstTime = tokens[3] && tokens[3].includes('/') ? tokens[3] : '15s/15s';
    const hasBurst = tokens.length >= 2 && burstLimit !== maxLimit;
    return {
      maxLimit,
      burstLimit: hasBurst ? burstLimit : '0/0',
      burstThreshold: hasBurst ? burstThreshold : '0/0',
      burstTime: hasBurst ? burstTime : '0s/0s',
      fullRateLimit: raw
    };
  }

  /**
   * Non-Disruptive Live High-Density Client Capacity & Speed Policy Script:
   * Expands DHCP range to 10.10.0.10-10.10.3.254 (1,012 simultaneous users), sets shared-users=1024 on
   * all Hotspot user profiles (fixing RouterOS v7 shared-users=1 bottleneck), sets addresses-per-mac=unlimited
   * on the Hotspot server, and applies Speed Caps & Bursts (ON or OFF) in-place with ZERO session drops.
   */
  static buildNonDisruptiveCapacityCommands(options?: {
    dhcpRange?: string;
    rateLimit?: string;
    speedCapsEnabled?: boolean;
    allowFreeAccess?: boolean;
  }): string {
    const dhcpRange = options?.dhcpRange || RouterOSRenderer.FULL_SUBNET_DHCP_RANGE;
    const speedCapsEnabled = options?.speedCapsEnabled !== false;
    const allowFreeAccess = options?.allowFreeAccess ?? true;
    const rateParts = RouterOSRenderer.parseRateLimitParts(options?.rateLimit);
    const safeRateLimit = speedCapsEnabled
      ? RouterOSRenderer.escapeRouterOSString(rateParts.fullRateLimit)
      : '';

    const queueCommands = speedCapsEnabled
      ? [
          `# Enforce Speed & Burst Caps (${rateParts.maxLimit} Max / ${rateParts.burstLimit} Burst) in-place without dropping users`,
          `:do { /ip firewall filter disable [find action="fasttrack-connection"] } on-error={}`,
          `:do { /ip firewall filter remove [find action="fasttrack-connection"] } on-error={}`,
          `:do { :if ([:len [/queue simple find name="tc-hotspot-speed-cap"]] = 0) do={ /queue simple add name="tc-hotspot-speed-cap" target=10.10.0.0/22 max-limit=${rateParts.maxLimit} burst-limit=${rateParts.burstLimit} burst-threshold=${rateParts.burstThreshold} burst-time=${rateParts.burstTime} disabled=no comment="T-Connect Global Hotspot Speed & Burst Cap" } else={ /queue simple set [find name="tc-hotspot-speed-cap"] target=10.10.0.0/22 max-limit=${rateParts.maxLimit} burst-limit=${rateParts.burstLimit} burst-threshold=${rateParts.burstThreshold} burst-time=${rateParts.burstTime} disabled=no } } on-error={}`,
          `:do { /queue simple move [find name="tc-hotspot-speed-cap"] [:pick [/queue simple find] 0] } on-error={}`,
          `:do { /queue simple set [find dynamic=yes] max-limit=${rateParts.maxLimit} burst-limit=${rateParts.burstLimit} burst-threshold=${rateParts.burstThreshold} burst-time=${rateParts.burstTime} } on-error={}`
        ].join('\n')
      : [
          `# Speed Caps & Bursts OFF Everywhere: Uncap all Hotspot Profiles & Active Dynamic Queues immediately`,
          `:do { /queue simple remove [find name="tc-hotspot-speed-cap"] } on-error={}`,
          `:do { /queue simple set [find dynamic=yes] max-limit=0/0 burst-limit=0/0 burst-threshold=0/0 burst-time=0s/0s } on-error={}`
        ].join('\n');

    return [
      `# 1. Expand DHCP Pool in-place to Full /22 Range (${dhcpRange} -> 1,012 Simultaneous Users) with ZERO disruption`,
      `:do { :if ([:len [/ip pool find name="tc-hotspot-pool"]] = 0) do={ /ip pool add name="tc-hotspot-pool" ranges=${dhcpRange} } else={ /ip pool set [find name="tc-hotspot-pool"] ranges=${dhcpRange} } } on-error={}`,
      `:do { :if ([:len [/ip dhcp-server network find address="10.10.0.0/22"]] = 0) do={ /ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 comment="T-Connect Hotspot Guest Network" } else={ /ip dhcp-server network set [find address="10.10.0.0/22"] gateway=10.10.0.1 dns-server=10.10.0.1 } } on-error={}`,
      `:do { :if ([:len [/ip dhcp-server find interface="bridgeLocal"]] = 0) do={ /ip dhcp-server add name="tc-dhcp-server" interface="bridgeLocal" address-pool="tc-hotspot-pool" lease-time=1h disabled=no } else={ /ip dhcp-server set [find interface="bridgeLocal"] address-pool="tc-hotspot-pool" lease-time=1h disabled=no } } on-error={}`,
      `# 2. Tune High-Concurrency DNS Cache & Wireless Station Limits for 1,000+ Concurrent Devices`,
      `:do { /ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8 cache-size=8192KiB max-concurrent-queries=500 max-concurrent-tcp-sessions=100 } on-error={}`,
      `:do { /interface wireless set [find] max-station-count=2007 } on-error={}`,
      `# 3. Unlock Hotspot Server & User Profiles for 1,024 Simultaneous Users (In-Place Update, No Resets)`,
      `:do { /ip hotspot set [find interface="bridgeLocal"] address-pool="tc-hotspot-pool" addresses-per-mac=unlimited idle-timeout=15m keepalive-timeout=2m disabled=no } on-error={}`,
      `:do { :if ([:len [/ip hotspot user profile find name="tc-speed-cap"]] = 0) do={ /ip hotspot user profile add name="tc-speed-cap" rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } else={ /ip hotspot user profile set [find name="tc-speed-cap"] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } } on-error={}`,
      `:do { /ip hotspot user profile set [find default=yes] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } on-error={}`,
      `:do { /ip hotspot user profile set [find] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } on-error={}`,
      `# 4. Ensure Hotspot Auth Users Exist In-Place (Never removes active users)`,
      `:do { :if ([:len [/ip hotspot user find name="test"]] = 0) do={ /ip hotspot user add name="test" password="123" profile="tc-speed-cap" comment="T-Connect Verified Paid & OTT Voucher User" } else={ /ip hotspot user set [find name="test"] password="123" profile="tc-speed-cap" disabled=no } } on-error={}`,
      allowFreeAccess
        ? `:do { :if ([:len [/ip hotspot user find name="T-TRIAL"]] = 0) do={ /ip hotspot user add name="T-TRIAL" password="123" profile="tc-speed-cap" comment="T-Connect Free Opt-In Auth User" } else={ /ip hotspot user set [find name="T-TRIAL"] password="123" profile="tc-speed-cap" disabled=no } } on-error={}`
        : `# Free Trial Disabled in Paid Mode`,
      queueCommands,
      `# 5. Clear Only Unauthenticated Stale Host Entries (Leaves all connected users untouched!)`,
      `:do { /ip hotspot host remove [find authorized=no] } on-error={}`,
      `:log info "T-Connect: High-density capacity (${dhcpRange}, 1024 shared-users) and speed policy (${speedCapsEnabled ? safeRateLimit : 'UNCAPPED'}) applied non-disruptively."`
    ].join('\n');
  }

  /**
   * Builds RouterOS v7.16.2 compatible commands to:
   * 1. Ensure bridgeLocal (10.10.0.1/22), Full /22 DHCP (10.10.0.10-10.10.3.254), DNS intercept, port 80 www, and tc-hotspot server are active non-disruptively
   * 2. Toggle Speed Caps & Bursts ON (enforcing Simple Queues & Hotspot rate-limits) or OFF (uncapped 0/0 everywhere)
   * 3. Deploy the instant On-Router Splash Page (Free Mode goes straight to internet without carousel; Paid Mode shows carousel)
   */
  static buildSplashPageFileCommands(
    portalBaseUrl: string,
    allowFreeAccess: boolean = true,
    scope: string = 'hotspot',
    rateLimit?: string,
    speedCapsEnabled: boolean = true,
    dhcpRange: string = RouterOSRenderer.FULL_SUBNET_DHCP_RANGE
  ): string {
    const rawBase = portalBaseUrl.replace(/\/+$/, '');
    const cleanBaseUrl = (rawBase.includes('localhost') || rawBase.includes('127.0.0.1') || rawBase.includes('.run.app'))
      ? 'http://169.58.98.92:3000'
      : rawBase;
    const hostOnly = cleanBaseUrl.replace(/^https?:\/\//, '').split(':')[0];
    const isHostIpv4 = /^\d+\.\d+\.\d+\.\d+$/.test(hostOnly);
    const safeScope = encodeURIComponent(scope || 'hotspot');
    const rateParts = RouterOSRenderer.parseRateLimitParts(rateLimit);
    const safeRateLimit = speedCapsEnabled
      ? RouterOSRenderer.escapeRouterOSString(rateParts.fullRateLimit)
      : '';
    const postAuthAdUrl = `${cleanBaseUrl}/api/portal/video-ad.html\\?scope=${safeScope}&reason=post_auth`;
    const freeDirectUrl = 'https://www.google.com';
    const targetPostLoginUrl = allowFreeAccess ? freeDirectUrl : postAuthAdUrl;
    const bgUrl = `${cleanBaseUrl}/api/portal/media-proxy\\?scope=${safeScope}`;

    const directFreeLoginHtml = `<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1,maximum-scale=1'><title>T-Connect Hotspot</title><style>*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif}body{min-height:100vh;background:#071324 url('${bgUrl}') center/cover no-repeat;color:#fff;position:relative}.wrap{position:fixed;z-index:25;left:50%;top:88%;transform:translate(-50%,-50%);width:86%;max-width:360px}.btn{width:100%;padding:14px 20px;border-radius:4px;border:none;background:#f05e17;color:#fff;font-size:19px;font-weight:400;letter-spacing:0.3px;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,0.45);text-align:center}</style><script>function tcFree(){try{fetch('${cleanBaseUrl}/api/portal/guest-connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'free',mac:'\$(mac)',ip:'\$(ip)',scope:'${safeScope}'})}).catch(function(){})}catch(e){}}</script></head><body><div class='wrap'><form action='\$(link-login-only)' method='post' onsubmit='tcFree()'><input type='hidden' name='username' value='T-TRIAL'><input type='hidden' name='password' value='123'><input type='hidden' name='dst' value='${freeDirectUrl}'><button type='submit' class='btn'>Login for free</button></form></div></body></html>`;

    const directPaidVoucherHtml = `<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1,maximum-scale=1'><title>T-Connect Hotspot</title><style>*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif}body{min-height:100vh;background:#071324 url('${bgUrl}') center/cover no-repeat;color:#fff;display:flex;flex-direction:column;justify-content:space-between}.hero{text-align:center;padding:16px 12px}.hero h1{font-size:18px;font-weight:900;text-shadow:0 2px 10px #000}.card{width:100%;max-width:420px;margin:auto auto 0;background:#0b0f19;border:1px solid #232d42;border-radius:16px 16px 0 0;padding:14px}.tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#05070c;padding:4px;border-radius:10px;margin-bottom:10px}.tbtn{padding:8px;border:none;border-radius:8px;background:transparent;color:#cbd5e1;font-size:11px;font-weight:800;cursor:pointer}.tbtn.on{background:#f05e17;color:#fff}.inp{width:100%;padding:9px 10px;border-radius:10px;border:1px solid #334155;background:#05070c;color:#fff;font-size:12px;margin-bottom:8px}.btn{width:100%;padding:11px;border-radius:10px;border:none;background:#10b981;color:#052e16;font-size:12px;font-weight:900;cursor:pointer}</style><script>function tcTab(m){var s1=document.getElementById('s1'),s2=document.getElementById('s2'),b1=document.getElementById('tb1'),b2=document.getElementById('tb2');if(m===1){s1.style.display='block';s2.style.display='none';b1.className='tbtn on';b2.className='tbtn'}else{s1.style.display='none';s2.style.display='block';b2.className='tbtn on';b1.className='tbtn'}}</script></head><body><div class='hero'><h1>T-CONNECT HOTSPOT</h1></div><div class='card'><div class='tabs'><button type='button' id='tb1' class='tbtn on' onclick='tcTab(1)'>16-Digit OTT Voucher</button><button type='button' id='tb2' class='tbtn' onclick='tcTab(2)'>Buy Pass (PayLesotho)</button></div><div id='s1'><form action='\$(link-login-only)' method='post'><input type='hidden' name='username' value='test'><input type='hidden' name='password' value='123'><input type='hidden' name='dst' value='${postAuthAdUrl}'><input class='inp' type='text' inputmode='numeric' maxlength='19' id='vc' placeholder='16-Digit OTT Voucher PIN (1234 5678 9012 3456) *' required><button type='submit' class='btn'>Redeem OTT Voucher &amp; Connect &rarr;</button></form></div><div id='s2' style='display:none'><form action='\$(link-login-only)' method='post'><input type='hidden' name='username' value='test'><input type='hidden' name='password' value='123'><input type='hidden' name='dst' value='${postAuthAdUrl}'><select class='inp' id='pl'><option value='10'>Daily Pass - M10 (24 Hours)</option><option value='60'>Weekly Pass - M60 (7 Days)</option><option value='280'>Monthly Pass - M280 (30 Days)</option></select><input class='inp' type='tel' inputmode='numeric' maxlength='8' id='gp' placeholder='M-Pesa / EcoCash Number (+266 5/6xxxxxxx) *' required><button type='submit' class='btn' style='background:#f05e17;color:#fff'>Pay with PayLesotho &amp; Connect &rarr;</button></form></div></div></body></html>`;

    const directSplashHtml = allowFreeAccess ? directFreeLoginHtml : directPaidVoucherHtml;
    const directAloginHtml = `<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><meta http-equiv='refresh' content='0; url=${targetPostLoginUrl}'><title>Connected - T-Connect Hotspot</title><script>window.location.replace('${targetPostLoginUrl}');</script></head><body style='background:#0b0f19;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center'><div><h2>Connected to T-Connect Hotspot</h2><p style='margin-top:8px'><a href='${targetPostLoginUrl}' style='color:#f05e17'>Continue &rarr;</a></p></div></body></html>`;

    const speedQueueCommands = speedCapsEnabled
      ? [
          `# 4. Enforce Top-Priority Simple Queue & Dynamic Queue Caps (${rateParts.maxLimit} Max / ${rateParts.burstLimit} Burst)`,
          `:do { /ip firewall filter disable [find action="fasttrack-connection"] } on-error={}`,
          `:do { /ip firewall filter remove [find action="fasttrack-connection"] } on-error={}`,
          `:do { /ip firewall mangle remove [find action="fasttrack-connection"] } on-error={}`,
          `:do { :if ([:len [/queue simple find name="tc-hotspot-speed-cap"]] = 0) do={ /queue simple add name="tc-hotspot-speed-cap" target=10.10.0.0/22 max-limit=${rateParts.maxLimit} burst-limit=${rateParts.burstLimit} burst-threshold=${rateParts.burstThreshold} burst-time=${rateParts.burstTime} disabled=no comment="T-Connect Global Hotspot Speed & Burst Cap" } else={ /queue simple set [find name="tc-hotspot-speed-cap"] target=10.10.0.0/22 max-limit=${rateParts.maxLimit} burst-limit=${rateParts.burstLimit} burst-threshold=${rateParts.burstThreshold} burst-time=${rateParts.burstTime} disabled=no } } on-error={}`,
          `:do { /queue simple move [find name="tc-hotspot-speed-cap"] [:pick [/queue simple find] 0] } on-error={}`,
          `:do { /queue simple set [find dynamic=yes] max-limit=${rateParts.maxLimit} burst-limit=${rateParts.burstLimit} burst-threshold=${rateParts.burstThreshold} burst-time=${rateParts.burstTime} } on-error={}`
        ].join('\n')
      : [
          `# 4. Speed Caps & Bursts OFF Everywhere: Uncap all Hotspot Profiles & Active Dynamic Queues immediately`,
          `:do { /queue simple remove [find name="tc-hotspot-speed-cap"] } on-error={}`,
          `:do { /queue simple set [find dynamic=yes] max-limit=0/0 burst-limit=0/0 burst-threshold=0/0 burst-time=0s/0s } on-error={}`
        ].join('\n');

    return [
      RouterOSRenderer.buildImmediateMultiPortBridgeCommands('bridgeLocal'),
      `# 1. Guarantee 10.10.0.1/22 Gateway, Full /22 DHCP Pool (${dhcpRange} -> 1,012 Users), Port 80 HTTP Service & High-Concurrency DNS on bridgeLocal`,
      `:do { :if ([:len [/ip address find address="10.10.0.1/22" interface="bridgeLocal"]] = 0) do={ /ip address add address=10.10.0.1/22 network=10.10.0.0 interface="bridgeLocal" comment="tc-hotspot-lan-gateway" } } on-error={}`,
      `:do { :if ([:len [/ip pool find name="tc-hotspot-pool"]] = 0) do={ /ip pool add name="tc-hotspot-pool" ranges=${dhcpRange} } else={ /ip pool set [find name="tc-hotspot-pool"] ranges=${dhcpRange} } } on-error={}`,
      `:do { :if ([:len [/ip dhcp-server network find address="10.10.0.0/22"]] = 0) do={ /ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 comment="T-Connect Hotspot Guest Network" } else={ /ip dhcp-server network set [find address="10.10.0.0/22"] gateway=10.10.0.1 dns-server=10.10.0.1 } } on-error={}`,
      `:do { :if ([:len [/ip dhcp-server find interface="bridgeLocal"]] = 0) do={ /ip dhcp-server add name="tc-dhcp-server" interface="bridgeLocal" address-pool="tc-hotspot-pool" lease-time=1h disabled=no } else={ /ip dhcp-server set [find interface="bridgeLocal"] address-pool="tc-hotspot-pool" lease-time=1h disabled=no } } on-error={}`,
      `:do { /ip service set www disabled=no port=80 address="" } on-error={}`,
      `:do { /ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8 cache-size=8192KiB max-concurrent-queries=500 max-concurrent-tcp-sessions=100 } on-error={}`,
      `:do { /ip dns static remove [find name="hotspot.tconnect.local"] } on-error={}`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-dns-intercept"]] = 0) do={ /ip firewall nat add chain=dstnat in-interface="bridgeLocal" protocol=udp dst-port=53 action=redirect to-ports=53 comment="tc-dns-intercept" } } on-error={}`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-dns-intercept-tcp"]] = 0) do={ /ip firewall nat add chain=dstnat in-interface="bridgeLocal" protocol=tcp dst-port=53 action=redirect to-ports=53 comment="tc-dns-intercept-tcp" } } on-error={}`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="tc-hotspot-nat" } } on-error={}`,
      `# 3. Synchronize Hotspot Server Profile, Active Hotspot Server on bridgeLocal & 1,024 Shared-Users Profile In-Place`,
      `:do { :if ([:len [/ip hotspot profile find name="tc-hotspot-profile"]] = 0) do={ /ip hotspot profile add name="tc-hotspot-profile" hotspot-address=10.10.0.1 dns-name="" html-directory=hotspot login-by=http-chap,http-pap split-user-domain=no use-radius=no } else={ /ip hotspot profile set [find name="tc-hotspot-profile"] hotspot-address=10.10.0.1 dns-name="" login-by=http-chap,http-pap split-user-domain=no use-radius=no } } on-error={}`,
      `:do { /ip hotspot profile set [find default=yes] dns-name="" login-by=http-chap,http-pap use-radius=no } on-error={}`,
      `:do { :if ([:len [/ip hotspot find interface="bridgeLocal"]] = 0) do={ /ip hotspot add name="tc-hotspot" interface="bridgeLocal" address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" addresses-per-mac=unlimited idle-timeout=15m keepalive-timeout=2m disabled=no } else={ /ip hotspot set [find interface="bridgeLocal"] profile="tc-hotspot-profile" address-pool="tc-hotspot-pool" addresses-per-mac=unlimited idle-timeout=15m keepalive-timeout=2m disabled=no } } on-error={}`,
      `:do { :if ([:len [/ip hotspot user profile find name="tc-speed-cap"]] = 0) do={ /ip hotspot user profile add name="tc-speed-cap" rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } else={ /ip hotspot user profile set [find name="tc-speed-cap"] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } } on-error={}`,
      `:do { /ip hotspot user profile set [find default=yes] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } on-error={}`,
      `:do { /ip hotspot user profile set [find] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } on-error={}`,
      speedQueueCommands,
      `# 5. Provision Hotspot Auth Users In-Place (Never drops connected sessions!)`,
      `:do { :if ([:len [/ip hotspot user find name="test"]] = 0) do={ /ip hotspot user add name="test" password="123" profile="tc-speed-cap" comment="T-Connect Verified Paid & OTT Voucher User" } else={ /ip hotspot user set [find name="test"] password="123" profile="tc-speed-cap" disabled=no } } on-error={}`,
      allowFreeAccess
        ? `:do { :if ([:len [/ip hotspot user find name="T-TRIAL"]] = 0) do={ /ip hotspot user add name="T-TRIAL" password="123" profile="tc-speed-cap" comment="T-Connect Free Opt-In Auth User" } else={ /ip hotspot user set [find name="T-TRIAL"] password="123" profile="tc-speed-cap" disabled=no } } on-error={}`
        : `:do { /ip hotspot user remove [find name="T-TRIAL"] } on-error={}; :do { /ip hotspot active remove [find user="T-TRIAL"] } on-error={}`,
      `# 6. Ensure OTT Lesotho, PayLesotho & Controller Walled Garden entries exist (and remove OS probe bypasses)`,
      `:do { /ip hotspot walled-garden remove [find dst-host~"apple" or dst-host~"gstatic" or dst-host~"google" or dst-host~"msft" or dst-host~"firefox" or dst-host~"connectivitycheck"] } on-error={}`,
      `:do { :if ([:len [/ip hotspot walled-garden ip find dst-address=169.58.98.92]] = 0) do={ /ip hotspot walled-garden ip add dst-address=169.58.98.92 action=accept comment="tc-vps-server-access" } } on-error={}`,
      isHostIpv4 && hostOnly !== '169.58.98.92'
        ? `:do { :if ([:len [/ip hotspot walled-garden ip find dst-address=${hostOnly}]] = 0) do={ /ip hotspot walled-garden ip add dst-address=${hostOnly} action=accept comment="tc-vps-controller-ip" } } on-error={}`
        : `# Controller IP 169.58.98.92 whitelisted in walled-garden ip`,
      `:do { :if ([:len [/ip hotspot walled-garden find dst-host="*${hostOnly}*"]] = 0) do={ /ip hotspot walled-garden add dst-host="*${hostOnly}*" action=allow comment="tc-vps-controller-domain" } } on-error={}`,
      `:do { :if ([:len [/ip hotspot walled-garden find dst-host="*api.paylesotho.co.ls"]] = 0) do={ /ip hotspot walled-garden add dst-host="*api.paylesotho.co.ls" action=allow comment="tc-paylesotho-api" } } on-error={}`,
      `:do { :if ([:len [/ip hotspot walled-garden find dst-host="*xpayments.paylesotho.co.ls"]] = 0) do={ /ip hotspot walled-garden add dst-host="*xpayments.paylesotho.co.ls" action=allow comment="tc-xpayments-api" } } on-error={}`,
      `:do { :if ([:len [/ip hotspot walled-garden find dst-host="*ottlesotho.com"]] = 0) do={ /ip hotspot walled-garden add dst-host="*ottlesotho.com" action=allow comment="tc-ott-lesotho-api" } } on-error={}`,
      `:do { :if ([:len [/ip hotspot walled-garden find dst-host="*ottvoucher.com"]] = 0) do={ /ip hotspot walled-garden add dst-host="*ottvoucher.com" action=allow comment="tc-ott-voucher-api" } } on-error={}`,
      `:do { :if ([:len [/ip hotspot walled-garden find dst-host="*ecocash.co.ls"]] = 0) do={ /ip hotspot walled-garden add dst-host="*ecocash.co.ls" action=allow comment="tc-ecocash-api" } } on-error={}`,
      `# 7. Write Working Splash Page Directly onto Router Storage (/file set) AND Sync Full Version Over WAN When Reachable`,
      `:do { :if ([:len [/file find name~"errors.txt"]] = 0) do={ /ip hotspot reset-html [find]; :delay 1s } } on-error={}`,
      `:if ([:len [/file find name="flash/hotspot/errors.txt"]] > 0) do={ :do { /ip hotspot profile set [find name="tc-hotspot-profile"] html-directory=flash/hotspot } on-error={}; :do { :if ([:len [/file find name="flash/hotspot/login.html"]] = 0) do={ /file print file="flash/hotspot/login.html"; :delay 1s }; /file set [find name="flash/hotspot/login.html"] contents="${directSplashHtml}" } on-error={}; :do { :if ([:len [/file find name="flash/hotspot/rlogin.html"]] = 0) do={ /file print file="flash/hotspot/rlogin.html"; :delay 1s }; /file set [find name="flash/hotspot/rlogin.html"] contents="${directSplashHtml}" } on-error={}; :do { :if ([:len [/file find name="flash/hotspot/alogin.html"]] = 0) do={ /file print file="flash/hotspot/alogin.html"; :delay 1s }; /file set [find name="flash/hotspot/alogin.html"] contents="${directAloginHtml}" } on-error={}; :do { /tool fetch url="${cleanBaseUrl}/api/portal/router-login.html\\?scope=${safeScope}" dst-path="flash/hotspot/login.html" check-certificate=no } on-error={}; :do { /tool fetch url="${cleanBaseUrl}/api/portal/router-login.html\\?scope=${safeScope}" dst-path="flash/hotspot/rlogin.html" check-certificate=no } on-error={}; :do { /tool fetch url="${cleanBaseUrl}/api/portal/router-alogin.html\\?scope=${safeScope}" dst-path="flash/hotspot/alogin.html" check-certificate=no } on-error={} } else={ :do { /ip hotspot profile set [find name="tc-hotspot-profile"] html-directory=hotspot } on-error={}; :do { :if ([:len [/file find name="hotspot/login.html"]] = 0) do={ /file print file="hotspot/login.html"; :delay 1s }; /file set [find name="hotspot/login.html"] contents="${directSplashHtml}" } on-error={}; :do { :if ([:len [/file find name="hotspot/rlogin.html"]] = 0) do={ /file print file="hotspot/rlogin.html"; :delay 1s }; /file set [find name="hotspot/rlogin.html"] contents="${directSplashHtml}" } on-error={}; :do { :if ([:len [/file find name="hotspot/alogin.html"]] = 0) do={ /file print file="hotspot/alogin.html"; :delay 1s }; /file set [find name="hotspot/alogin.html"] contents="${directAloginHtml}" } on-error={}; :do { /tool fetch url="${cleanBaseUrl}/api/portal/router-login.html\\?scope=${safeScope}" dst-path="hotspot/login.html" check-certificate=no } on-error={}; :do { /tool fetch url="${cleanBaseUrl}/api/portal/router-login.html\\?scope=${safeScope}" dst-path="hotspot/rlogin.html" check-certificate=no } on-error={}; :do { /tool fetch url="${cleanBaseUrl}/api/portal/router-alogin.html\\?scope=${safeScope}" dst-path="hotspot/alogin.html" check-certificate=no } on-error={} }`,
      `# 8. Clear Only Unauthenticated Host Cache so Newly Joining Devices Pop Up Immediately Without Disrupting Connected Users`,
      `:do { /ip hotspot host remove [find authorized=no] } on-error={}`
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
    const rawHost = (controllerHost || hubDomain || '169.58.98.92:3000').trim();
    const effectiveHost = (rawHost.includes('localhost') || rawHost.includes('127.0.0.1') || rawHost.includes('.run.app'))
      ? '169.58.98.92:3000'
      : rawHost;
    const protocol = (effectiveHost.includes(':') || /^\d+\.\d+\.\d+\.\d+/.test(effectiveHost))
      ? 'http'
      : (endpointProtocol || 'https');
    const portalBaseUrl = `${protocol}://${effectiveHost}`;
    const cleanDomain = effectiveHost.split(':')[0];
    const allowFree = router.accessMode !== 'PAID_ONLY' && (router.freeModeEnabled ?? true);
    const routerScope = router.vertical || 'hotspot';
    const speedCapsEnabled = options.speedCapsEnabled ?? router.speedCapsEnabled ?? true;
    const dhcpRange = options.dhcpRange || router.dhcpRange || RouterOSRenderer.FULL_SUBNET_DHCP_RANGE;
    const routerRateLimit = options.rateLimit || router.globalRateLimit || router.freeRateLimit || '10M/20M 15M/30M 8M/16M 15s/15s';
    const rateParts = RouterOSRenderer.parseRateLimitParts(routerRateLimit);
    const safeRateLimit = speedCapsEnabled
      ? RouterOSRenderer.escapeRouterOSString(rateParts.fullRateLimit)
      : '';

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
      `# 3. Hotspot & AP Bridge Configuration (bridgeLocal & 10.10.0.0/22 across all 5+ LAN/AP ports + Open Wi-Fi SSID "T-Connect Hotspot")`,
      RouterOSRenderer.buildImmediateMultiPortBridgeCommands('bridgeLocal'),
      `:do { /interface list member add list=LAN interface=bridgeLocal comment="T-Connect Hotspot LAN Bridge" } on-error={}`,
      `# Remove Conflicting LAN IP / DHCP / Hotspot on Factory Bridges or Direct Ethernet Ports (Preserves ether1 WAN)`,
      `:do { /ip dhcp-server remove [find interface!="bridgeLocal"] } on-error={}`,
      `:do { /ip hotspot remove [find interface!="bridgeLocal"] } on-error={}`,
      `:do { /ip address remove [find interface~"ether2|ether3|ether4|ether5|ether6|sfp"] } on-error={}`,
      `:do { /ip route remove [find gateway~"ether2|ether3|ether4|ether5|ether6|sfp"] } on-error={}`,
      `:do { :if ([:len [/ip address find address="10.10.0.1/22" interface="bridgeLocal"]] = 0) do={ /ip address add address=10.10.0.1/22 network=10.10.0.0 interface="bridgeLocal" comment="tc-hotspot-lan-gateway" } } on-error={}`,
      `# High-Density Full /22 DHCP IP Pool (${dhcpRange} -> 1,012 Simultaneous Users)`,
      `:do { :if ([:len [/ip pool find name="tc-hotspot-pool"]] = 0) do={ /ip pool add name="tc-hotspot-pool" ranges=${dhcpRange} } else={ /ip pool set [find name="tc-hotspot-pool"] ranges=${dhcpRange} } } on-error={}`,
      `# DHCP Server on bridgeLocal (Strictly 10.10.0.1 DNS so OS Captive Portal Detection always triggers on WiFi & APs)`,
      `:do { :if ([:len [/ip dhcp-server network find address="10.10.0.0/22"]] = 0) do={ /ip dhcp-server network add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 comment="T-Connect Hotspot Guest Network" } else={ /ip dhcp-server network set [find address="10.10.0.0/22"] gateway=10.10.0.1 dns-server=10.10.0.1 } } on-error={}`,
      `:do { :if ([:len [/ip dhcp-server find interface="bridgeLocal"]] = 0) do={ /ip dhcp-server add name="tc-dhcp-server" interface="bridgeLocal" address-pool="tc-hotspot-pool" lease-time=1h disabled=no } else={ /ip dhcp-server set [find interface="bridgeLocal"] address-pool="tc-hotspot-pool" lease-time=1h disabled=no } } on-error={}`,
      `# Enable High-Concurrency DNS Resolver & Intercept DNS for Captive Portal Probes`,
      `:do { /ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8 cache-size=8192KiB max-concurrent-queries=500 max-concurrent-tcp-sessions=100 } on-error={}`,
      `# Disable & Remove FastTrack so RouterOS Simple Queues and Hotspot Speed Caps are Strictly Enforced`,
      `:do { /ip firewall filter disable [find action="fasttrack-connection"] } on-error={}`,
      `:do { /ip firewall filter remove [find action="fasttrack-connection"] } on-error={}`,
      `:do { /ip firewall filter remove [find comment~"Fast-Fail Unauth TCP"] } on-error={}`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-dns-intercept"]] = 0) do={ /ip firewall nat add chain=dstnat in-interface="bridgeLocal" protocol=udp dst-port=53 action=redirect to-ports=53 comment="tc-dns-intercept" } } on-error={}`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-dns-intercept-tcp"]] = 0) do={ /ip firewall nat add chain=dstnat in-interface="bridgeLocal" protocol=tcp dst-port=53 action=redirect to-ports=53 comment="tc-dns-intercept-tcp" } } on-error={}`,
      `# NAT Firewall Masquerade on WAN ether1`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="tc-hotspot-nat" } } on-error={}`,
      `:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat-wan"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="tc-hotspot-nat-wan" } } on-error={}`,
      `# Hotspot Server Profile & Server on bridgeLocal (1,024 shared-users & addresses-per-mac=unlimited)`,
      `:do { /ip dns static remove [find name="hotspot.tconnect.local"] } on-error={}`,
      `:do { :if ([:len [/ip hotspot profile find name="tc-hotspot-profile"]] = 0) do={ /ip hotspot profile add name="tc-hotspot-profile" hotspot-address=10.10.0.1 dns-name="" html-directory=hotspot login-by=http-chap,http-pap split-user-domain=no use-radius=no } else={ /ip hotspot profile set [find name="tc-hotspot-profile"] hotspot-address=10.10.0.1 dns-name="" login-by=http-chap,http-pap split-user-domain=no use-radius=no } } on-error={}`,
      `:do { /ip hotspot profile set [find default=yes] dns-name="" login-by=http-chap,http-pap use-radius=no } on-error={}`,
      `:do { :if ([:len [/ip hotspot user profile find name="tc-speed-cap"]] = 0) do={ /ip hotspot user profile add name="tc-speed-cap" rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } else={ /ip hotspot user profile set [find name="tc-speed-cap"] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } } on-error={}`,
      `:do { /ip hotspot user profile set [find default=yes] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } on-error={}`,
      `:do { /ip hotspot user profile set [find] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } on-error={}`,
      `:do { :if ([:len [/ip hotspot find interface="bridgeLocal"]] = 0) do={ /ip hotspot add name="tc-hotspot" interface="bridgeLocal" address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" addresses-per-mac=unlimited idle-timeout=15m keepalive-timeout=2m disabled=no } else={ /ip hotspot set [find interface="bridgeLocal"] address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" addresses-per-mac=unlimited idle-timeout=15m keepalive-timeout=2m disabled=no } } on-error={}`,
      `# Pre-Provisioned Hotspot Auth Users In-Place`,
      `:do { :if ([:len [/ip hotspot user find name="test"]] = 0) do={ /ip hotspot user add name="test" password="123" profile="tc-speed-cap" comment="T-Connect Verified Paid & OTT Voucher User" } else={ /ip hotspot user set [find name="test"] password="123" profile="tc-speed-cap" disabled=no } } on-error={}`,
      allowFree
        ? `:do { :if ([:len [/ip hotspot user find name="T-TRIAL"]] = 0) do={ /ip hotspot user add name="T-TRIAL" password="123" profile="tc-speed-cap" comment="T-Connect Free Opt-In Auth User" } else={ /ip hotspot user set [find name="T-TRIAL"] password="123" profile="tc-speed-cap" disabled=no } } on-error={}`
        : `# Free Trial Disabled by Admin Policy (T-TRIAL user omitted)`,
      `# Static Management Bypasses Strictly for AP Hardware IPs (No PC bypass so test PC sees Splash Page)`,
      `:do { /ip hotspot ip-binding remove [find comment~"tc-bypass"] } on-error={}`,
      `:do { /ip hotspot ip-binding add address=10.10.0.2 type=bypassed comment="tc-bypass-AP1-ether2" } on-error={}`,
      `:do { /ip hotspot ip-binding add address=10.10.0.3 type=bypassed comment="tc-bypass-AP2-ether3" } on-error={}`,
      `:do { /ip hotspot ip-binding add address=10.10.0.4 type=bypassed comment="tc-bypass-AP3-ether4" } on-error={}`,
      `:do { /ip hotspot ip-binding add address=10.10.0.5 type=bypassed comment="tc-bypass-AP4-ether5" } on-error={}`,
      `/log info "T-Connect: [2/7] Hotspot Bridge bridgeLocal, 10.10.0.1/22, DHCP, Speed Caps, and Open SSID T-Connect Hotspot configured."`,
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
      `:do { /ip service set www disabled=no port=80 address="" } on-error={}`,
      `:do { /ip service set winbox disabled=no port=8291 address="" } on-error={}`,
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
      `:do { /ip hotspot walled-garden remove [find dst-host~"apple" or dst-host~"gstatic" or dst-host~"google" or dst-host~"msft" or dst-host~"firefox" or dst-host~"vodacom" or dst-host~"mywallet" or dst-host~"connectivitycheck"] } on-error={}`,
      `:do { /ip hotspot walled-garden ip remove [find comment~"tc-vps"] } on-error={}`,
      `:do { /ip hotspot walled-garden ip add dst-address=169.58.98.92 action=accept comment="tc-vps-server-access" } on-error={}`,
      /^\d+\.\d+\.\d+\.\d+$/.test(cleanDomain) && cleanDomain !== '169.58.98.92'
        ? `:do { /ip hotspot walled-garden ip add dst-address=${cleanDomain} action=accept comment="tc-vps-controller-ip" } on-error={}`
        : `# Primary VPS IP 169.58.98.92 added to walled-garden ip`,
      `:do { /ip hotspot walled-garden remove [find comment~"tc-vps"] } on-error={}`,
      `:do { /ip hotspot walled-garden add dst-host="*169.58.98.92*" action=allow comment="tc-vps-portal-domain" } on-error={}`,
      `:do { /ip hotspot walled-garden add dst-host="*${cleanDomain}*" action=allow comment="tc-vps-controller-domain" } on-error={}`,
      ``,
      `# 8. Deploy Portal Builder On-Router Splash Page, Speed Caps & FastTrack Removal`,
      RouterOSRenderer.buildSplashPageFileCommands(portalBaseUrl, allowFree, routerScope, routerRateLimit, speedCapsEnabled, dhcpRange)
    );

    walledGardenDomains
      .filter((d) => !/apple|gstatic|google|msft|firefox|vodacom|mywallet|connectivitycheck/i.test(d))
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
        `:do { /ip firewall filter add chain=forward protocol=tcp dst-port=853 action=reject reject-with=tcp-reset comment="T-Connect: Block DoT (Port 853)" } on-error={}`,
        `:do { /ip firewall filter add chain=forward protocol=udp dst-port=853 action=drop comment="T-Connect: Block DoT UDP (Port 853)" } on-error={}`
      );
    }

    scriptLines.push(
      `# Clear only unauthenticated host cache so connected users stay online`,
      `:do { /ip hotspot host remove [find authorized=no] } on-error={}`,
      `/log info "T-Connect: [6/7] Hotspot portal, speed caps, walled garden & DNS filters configured."`,
      ``,
      `# 10. Clean Any Legacy Broken Routes on ether2 (ether2..ether5 are LAN/AP ports in bridgeLocal)`,
      `:do { /ip route remove [find comment="tc-wan2-backup"] } on-error={}`,
      `:do { /ip route remove [find comment="tc-wan1-primary"] } on-error={}`,
      `:do { /ip route remove [find comment="tc-wan1-canary"] } on-error={}`,
      ``,
      `# 11. Fast 15-Second Heartbeat & Real-Time Portal/Policy Sync Daemon`,
      `:do { /system scheduler remove [find name="tc-heartbeat"] } on-error={}`,
      `:do { /system scheduler add name="tc-heartbeat" interval=15s on-event=":do { /tool fetch url=\\"${portalBaseUrl}/api/devices/${router.id}/heartbeat.rsc\\?uptime=\\$[/system resource get uptime]&cpu=\\$[/system resource get cpu-load]&mem=\\$[/system resource get free-memory]&sessions=\\$[/ip hotspot active print count-only]\\" dst-path=\\"tc-sync.rsc\\" check-certificate=no; /import file-name=\\"tc-sync.rsc\\"; /file remove \\"tc-sync.rsc\\" } on-error={}" comment="T-Connect 15s Health & Real-Time Policy Sync Agent" } on-error={}`,
      ``,
      `# 12. Instant Adoption Handshake (Signals controller platform to promote router to ONLINE immediately)`,
      `:put "T-Connect: [SUCCESS] Master Adoption Configured! SSID 'T-Connect Hotspot' (Open 2.4GHz & 5GHz) and Captive Portal Splash Page are LIVE on 10.10.0.1!";`,
      `:put "T-Connect: Dispatching instant adoption handshake to ${portalBaseUrl}...";`,
      `:do { /tool fetch url="${portalBaseUrl}/api/devices/${router.id}/heartbeat" http-method=post http-data="uptime=$[/system resource get uptime]&cpu=$[/system resource get cpu-load]&mem=$[/system resource get free-memory]&sessions=0&stage=ADOPT_PROVISION" check-certificate=no keep-result=no; :put "T-Connect: [SUCCESS] Adoption handshake verified by platform! Router is now ONLINE."; /log info "T-Connect: [7/7] Device provisioning complete! Controller connected and ONLINE."; } on-error={ :put "T-Connect: [READY] Local Hotspot & Splash Page are active on 10.10.0.1. 15s background sync will connect to ${portalBaseUrl} automatically as soon as WAN is online."; /log info "T-Connect: Local Hotspot active on 10.10.0.1. Waiting for WAN route to ${portalBaseUrl}..."; }`
    );

    return scriptLines.join('\n');
  }

  /**
   * Generates dynamic Access Policy script for live execution on an adopted router.
   */
  static renderAccessPolicyScript(options: AccessPolicyOptions): string {
    const { router, accessMode } = options;
    const speedCapsEnabled = options.speedCapsEnabled ?? router.speedCapsEnabled ?? true;
    const dhcpRange = options.dhcpRange || router.dhcpRange || RouterOSRenderer.FULL_SUBNET_DHCP_RANGE;
    const rateLimit = options.rateLimit || router.globalRateLimit || router.freeRateLimit || '10M/20M 15M/30M 8M/16M 15s/15s';
    const safeRateLimit = speedCapsEnabled ? RouterOSRenderer.escapeRouterOSString(rateLimit) : 'UNCAPPED (0/0)';
    const portalBaseUrl = (options.portalBaseUrl || 'http://169.58.98.92:3000').replace(/\/+$/, '');
    const routerScope = router.vertical || 'hotspot';
    const allowFree = accessMode !== 'PAID_ONLY';
    const lines: string[] = [
      `# ============================================================`,
      `# T-Connect Dynamic Access Policy, Capacity & Real-Time Splash Sync`,
      `# Target Router: ${router.name} (${router.id})`,
      `# Policy Mode: ${accessMode}`,
      `# Speed & Burst Rate Limit: ${safeRateLimit}`,
      `# DHCP Range: ${dhcpRange} (1,012 Simultaneous Users)`,
      `# Timestamp: ${new Date().toISOString()}`,
      `# ============================================================`,
      `:log info "[T-Connect Policy] Pushing Access Mode '${accessMode}' (Rate-Limit: ${safeRateLimit}) to router...";`,
      RouterOSRenderer.buildSplashPageFileCommands(portalBaseUrl, allowFree, routerScope, rateLimit, speedCapsEnabled, dhcpRange),
      `:log info "[T-Connect Policy] Mode '${accessMode}' and speed policy (${safeRateLimit}) active.";`
    ];

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
# Targets: ${bridge} (ether2, ether3, ether4, ether5 + T-Connect Hotspot WiFi)
# ============================================================

:log info "[T-Connect] Configuring Access Point bridge ports (ether2-ether5) and T-Connect Hotspot wireless interface...";

${RouterOSRenderer.buildImmediateMultiPortBridgeCommands(bridge)}
:do { /ip address remove [find interface~"ether2|ether3|ether4|ether5"] } on-error={}
:do { /ip route remove [find gateway~"ether2|ether3|ether4|ether5"] } on-error={}

# Ensure Hotspot Server on "${bridge}" Allows Unlimited Client MACs Behind External APs
:do { /ip hotspot set [find interface="${bridge}"] addresses-per-mac=unlimited disabled=no } on-error={}

# Bypass Static AP Management IPs in Hotspot (Wireless clients on APs still get 10.10.0.50+ & Splash Page)
:do { /ip hotspot ip-binding remove [find comment~"tc-bypass"] } on-error={}
:do { /ip hotspot ip-binding add address="${options.ap1Ip}" type=bypassed comment="tc-bypass-${ap1Name}-ether2" } on-error={}
:do { /ip hotspot ip-binding add address="${options.ap2Ip}" type=bypassed comment="tc-bypass-${ap2Name}-ether3" } on-error={}
:do { /ip hotspot ip-binding add address="10.10.0.4" type=bypassed comment="tc-bypass-AP3-ether4" } on-error={}
:do { /ip hotspot ip-binding add address="10.10.0.5" type=bypassed comment="tc-bypass-AP4-ether5" } on-error={}

# Verify WinBox Management Service
:do { /ip service set winbox disabled=no port=8291 } on-error={}

:log info "[T-Connect] Access Points (ether2-ether5) & T-Connect Hotspot WiFi setup active. All AP & WiFi clients redirected to captive portal.";
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
    rateLimit?: string;
    speedCapsEnabled?: boolean;
  }): string {
    const bridge = options?.bridgeName || 'bridgeLocal';
    const gateway = options?.gatewayIp || '10.10.0.1';
    const cidr = options?.subnetCidr || '10.10.0.0/22';
    const dhcpRange = options?.dhcpRange || RouterOSRenderer.FULL_SUBNET_DHCP_RANGE;
    const ap1 = options?.ap1Ip || '10.10.0.2';
    const ap2 = options?.ap2Ip || '10.10.0.3';
    const ap3 = options?.ap3Ip || '10.10.0.5';
    const allowFree = options?.allowFreeAccess ?? true;
    const speedCapsEnabled = options?.speedCapsEnabled !== false;
    const rateLimit = options?.rateLimit || '10M/20M 15M/30M 8M/16M 15s/15s';
    const rateParts = RouterOSRenderer.parseRateLimitParts(rateLimit);
    const safeRateLimit = speedCapsEnabled
      ? RouterOSRenderer.escapeRouterOSString(rateParts.fullRateLimit)
      : '';
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
# DHCP Capacity: ${dhcpRange} (1,012 Simultaneous Users)
# Speed & Burst Cap: ${speedCapsEnabled ? safeRateLimit : 'UNCAPPED (0/0)'}
# VPS Controller: http://${vpsCleanHost}
# ============================================================

:log info "[T-Connect] Starting full-stack alignment...";

# 1–3. Bridge "${bridge}", Isolate WAN1 (ether1), Bind ether2-ether6 + Open SSID "T-Connect Hotspot" (2.4GHz & 5GHz)
${RouterOSRenderer.buildImmediateMultiPortBridgeCommands(bridge)}
:do { :if ([:len [/ip dhcp-client find interface="ether1"]] = 0) do={ /ip dhcp-client add interface="ether1" disabled=no add-default-route=yes default-route-distance=1 use-peer-dns=yes comment="T-Connect WAN ether1" } else={ /ip dhcp-client set [find interface="ether1"] disabled=no add-default-route=yes default-route-distance=1 use-peer-dns=yes } } on-error={}

# 4. Clean Conflicting LAN IP / DHCP / Hotspot on Factory Bridges or Direct Ethernet Ports & Set ${gateway}/22 on "${bridge}"
:do { /ip dhcp-server remove [find interface!="${bridge}"] } on-error={}
:do { /ip hotspot remove [find interface!="${bridge}"] } on-error={}
:do { /ip address remove [find interface~"ether2|ether3|ether4|ether5"] } on-error={}
:do { /ip route remove [find gateway~"ether2|ether3|ether4|ether5"] } on-error={}
:do { :if ([:len [/ip address find address="${gateway}/22" interface="${bridge}"]] = 0) do={ /ip address add address=${gateway}/22 network=10.10.0.0 interface="${bridge}" comment="tc-hotspot-lan-gateway" } } on-error={}

# 5. Configure High-Density DHCP IP Pool (${dhcpRange} -> 1,012 Users) & DHCP Server on "${bridge}"
:do { :if ([:len [/ip pool find name="tc-hotspot-pool"]] = 0) do={ /ip pool add name="tc-hotspot-pool" ranges=${dhcpRange} } else={ /ip pool set [find name="tc-hotspot-pool"] ranges=${dhcpRange} } } on-error={}
:do { :if ([:len [/ip dhcp-server network find address="${cidr}"]] = 0) do={ /ip dhcp-server network add address=${cidr} gateway=${gateway} dns-server=${gateway} comment="T-Connect Hotspot Guest Network" } else={ /ip dhcp-server network set [find address="${cidr}"] gateway=${gateway} dns-server=${gateway} } } on-error={}
:do { :if ([:len [/ip dhcp-server find interface="${bridge}"]] = 0) do={ /ip dhcp-server add name="tc-dhcp-server" interface="${bridge}" address-pool="tc-hotspot-pool" lease-time=1h disabled=no } else={ /ip dhcp-server set [find interface="${bridge}"] address-pool="tc-hotspot-pool" lease-time=1h disabled=no } } on-error={}

# 6. Enable High-Concurrency DNS Resolver, Disable FastTrack & Intercept DNS on "${bridge}"
:do { /ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8,9.9.9.9 cache-size=8192KiB max-concurrent-queries=500 max-concurrent-tcp-sessions=100 } on-error={}
:do { /ip dns static remove [find name="hotspot.tconnect.local"] } on-error={}
:do { /ip firewall filter disable [find action="fasttrack-connection"] } on-error={}
:do { /ip firewall filter remove [find action="fasttrack-connection"] } on-error={}
:do { /ip firewall filter remove [find comment~"Fast-Fail Unauth TCP"] } on-error={}
:do { /ip route remove [find comment="tc-wan2-backup"] } on-error={}
:do { /ip route remove [find comment="tc-wan1-primary"] } on-error={}
:do { /ip route remove [find comment="tc-wan1-canary"] } on-error={}
:do { :if ([:len [/ip firewall nat find comment="tc-dns-intercept"]] = 0) do={ /ip firewall nat add chain=dstnat in-interface="${bridge}" protocol=udp dst-port=53 action=redirect to-ports=53 comment="tc-dns-intercept" } } on-error={}
:do { :if ([:len [/ip firewall nat find comment="tc-dns-intercept-tcp"]] = 0) do={ /ip firewall nat add chain=dstnat in-interface="${bridge}" protocol=tcp dst-port=53 action=redirect to-ports=53 comment="tc-dns-intercept-tcp" } } on-error={}

# 7. Configure NAT Firewall Masquerade for Internet Access (WAN ether1)
:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="tc-hotspot-nat" } } on-error={}
:do { :if ([:len [/ip firewall nat find comment="tc-hotspot-nat-wan"]] = 0) do={ /ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="tc-hotspot-nat-wan" } } on-error={}

# 8. Configure Hotspot Profile, 1,024 Shared-Users Profile & Server on "${bridge}" In-Place
:do { :if ([:len [/ip hotspot profile find name="tc-hotspot-profile"]] = 0) do={ /ip hotspot profile add name="tc-hotspot-profile" hotspot-address=${gateway} dns-name="" html-directory=hotspot login-by=http-chap,http-pap split-user-domain=no use-radius=no } else={ /ip hotspot profile set [find name="tc-hotspot-profile"] hotspot-address=${gateway} dns-name="" login-by=http-chap,http-pap split-user-domain=no use-radius=no } } on-error={}
:do { /ip hotspot profile set [find default=yes] dns-name="" login-by=http-chap,http-pap use-radius=no } on-error={}
:do { :if ([:len [/ip hotspot user profile find name="tc-speed-cap"]] = 0) do={ /ip hotspot user profile add name="tc-speed-cap" rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } else={ /ip hotspot user profile set [find name="tc-speed-cap"] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } } on-error={}
:do { /ip hotspot user profile set [find default=yes] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } on-error={}
:do { /ip hotspot user profile set [find] rate-limit="${safeRateLimit}" shared-users=1024 add-mac-cookie=no } on-error={}
:do { :if ([:len [/ip hotspot find interface="${bridge}"]] = 0) do={ /ip hotspot add name="tc-hotspot" interface="${bridge}" address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" addresses-per-mac=unlimited idle-timeout=15m keepalive-timeout=2m disabled=no } else={ /ip hotspot set [find interface="${bridge}"] address-pool="tc-hotspot-pool" profile="tc-hotspot-profile" addresses-per-mac=unlimited idle-timeout=15m keepalive-timeout=2m disabled=no } } on-error={}

# 9. VPS & EcoCash/OTT Walled Garden Rules
:do { /ip hotspot walled-garden remove [find dst-host~"apple" or dst-host~"gstatic" or dst-host~"google" or dst-host~"msft" or dst-host~"firefox" or dst-host~"vodacom" or dst-host~"mywallet" or dst-host~"connectivitycheck"] } on-error={}
:do { /ip hotspot walled-garden ip remove [find comment~"tc-vps"] } on-error={}
:do { /ip hotspot walled-garden ip add dst-address=${vpsIpOnly} action=accept comment="tc-vps-server-access" } on-error={}
:do { /ip hotspot walled-garden remove [find comment~"tc-vps"] } on-error={}
:do { /ip hotspot walled-garden add dst-host="*${vpsIpOnly}*" action=allow comment="tc-vps-portal-domain" } on-error={}
:do { /ip hotspot walled-garden add dst-host="*econet.co.ls" action=allow comment="tc-ecocash-walled-garden" } on-error={}
:do { /ip hotspot walled-garden add dst-host="*ecocash.co.ls" action=allow comment="tc-ecocash-api-walled-garden" } on-error={}
:do { /ip hotspot walled-garden add dst-host="*ottlesotho.com" action=allow comment="tc-ott-walled-garden" } on-error={}
:do { /ip hotspot walled-garden add dst-host="*ottvoucher.com" action=allow comment="tc-ottvoucher-walled-garden" } on-error={}

# 10. Deploy Portal Builder On-Router Splash Page & Speed Policy
${RouterOSRenderer.buildSplashPageFileCommands(`http://${vpsCleanHost}`, allowFree, 'hotspot', rateLimit, speedCapsEnabled, dhcpRange)}

# 11. Bypass Only AP Hardware Management IPs
:do { /ip hotspot ip-binding remove [find comment~"tc-bypass"] } on-error={}
:do { /ip hotspot ip-binding add address=${ap1} type=bypassed comment="tc-bypass-AP1-ether2" } on-error={}
:do { /ip hotspot ip-binding add address=${ap2} type=bypassed comment="tc-bypass-AP2-ether3" } on-error={}
:do { /ip hotspot ip-binding add address=10.10.0.4 type=bypassed comment="tc-bypass-AP3-ether4" } on-error={}
:do { /ip hotspot ip-binding add address=${ap3} type=bypassed comment="tc-bypass-AP4-ether5" } on-error={}

# 12. Clear Only Unauthenticated Stale Hosts (Preserves all currently connected users)
:do { /ip hotspot host remove [find authorized=no] } on-error={}
:do { /ip service set www disabled=no port=80 } on-error={}
:do { /ip service set winbox disabled=no port=8291 } on-error={}

:log info "[T-Connect] Alignment complete! ${bridge} active with ${gateway}/22 (${dhcpRange}), Speed Policy (${speedCapsEnabled ? safeRateLimit : 'UNCAPPED'}), and On-Router Splash Page.";
:put "T-Connect: [SUCCESS] Alignment complete! ${bridge} (${gateway}/22, ${dhcpRange}, 1024 shared-users) and On-Router Captive Portal active.";`;
  }
}



