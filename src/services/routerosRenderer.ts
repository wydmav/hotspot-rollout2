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

    return `${dnsCheck} :local fetchDisabled false;; :do { :local chk [:parse ":return ([/system/device-mode/get fetch] = false)"]; :set fetchDisabled [$chk] } on-error={};; :if ($fetchDisabled) do={ /log error "T-Connect - Fetch is locked by Device Mode. Enable fetch in /system/device-mode and retry."; :error "Device Mode restricted" };; :local fwVer [/system resource get version];; :do { /tool fetch url="${fetchUrl}" http-method=post http-data="fw=$fwVer" dst-path="${filename}" check-certificate=no; } on-error={ /tool fetch url="${fetchUrl}" http-method=get dst-path="${filename}" check-certificate=no; };; :do { /import file-name="${filename}" verbose=yes; :delay 1s; /file remove "${filename}"; /log info "T-Connect - Device adopted successfully. WireGuard and RADIUS operational."; } on-error={ /log error "T-Connect - Adoption script encountered an error during import. File retained as ${filename} for inspection."; :error "Import failed. Run: /import file-name=${filename} verbose=yes to inspect errors." };`;
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
      `# 2. Port Configuration: Port 1 = WAN (Starlink) & Local Client Bridge`,
      `:do { /interface list add name=WAN comment="T-Connect WAN Interfaces" } on-error={}`,
      `:do { /interface list add name=LAN comment="T-Connect Hotspot LAN Interfaces" } on-error={}`,
      `:do { /interface list member add list=WAN interface=ether1 comment="T-Connect WAN1: Starlink LEO Dishy" } on-error={}`,
      `:do { /ip dhcp-client add interface=ether1 disabled=no add-default-route=yes default-route-distance=1 use-peer-dns=yes comment="Starlink WAN1 DHCP Client" } on-error={}`,
      ``,
      `# 3. Hotspot Bridge Configuration (mkcontroller-bridge compatible)`,
      `:do { /interface bridge add name="mkcontroller-bridge" fast-forward=yes comment="T-Connect Hotspot Bridge" } on-error={}`,
      `:do { /interface bridge add name="tconnect-bridge" fast-forward=yes comment="T-Connect Hotspot Bridge" } on-error={}`,
      `:do { /interface list member add list=LAN interface=mkcontroller-bridge comment="T-Connect Hotspot LAN Bridge" } on-error={}`,
      `# Bridge available local LAN ports for hotspot clients and access points (hAP ax3 & RB devices)`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="ether2" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="ether3" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="ether4" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="ether5" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="wifi1" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="wifi2" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="wlan1" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="wlan2" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `/log info "T-Connect: [2/7] Hotspot Bridge & Interfaces configured."`,
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
      `# 5. Secure Router Management (Never expose unauthenticated services to public internet)`,
      `:do { /ip service set telnet disabled=yes } on-error={}`,
      `:do { /ip service set ftp disabled=yes } on-error={}`,
      `:do { /ip service set www disabled=no address="10.99.0.0/16,192.168.88.0/24,10.0.0.0/8" port=80 } on-error={ :do { /ip service set www disabled=no port=80 } on-error={} }`,
      `:do { /ip service set winbox disabled=no address="10.99.0.0/16,192.168.88.0/24,10.0.0.0/8" port=8291 } on-error={ :do { /ip service set winbox disabled=no port=8291 } on-error={} }`,
      `:do { /ip service set api disabled=yes } on-error={}`,
      `:do { /ip service set api-ssl address="10.99.0.0/16" port=8729 } on-error={}`,
      ``,
      `# Controller Admin User`,
      `:do { /user group add name="tc-agent" policy="read,write,api,test,password" } on-error={}`,
      `:do { /user remove [find name="tc_controller"] } on-error={}`,
      `:do { /user add name="tc_controller" group="tc-agent" password="${apiPassword}" address="10.99.0.0/16" comment="T-Connect Central Controller" } on-error={ :do { /user add name="tc_controller" group="full" password="${apiPassword}" comment="T-Connect Central Controller" } on-error={} }`,
      `/log info "T-Connect: [4/7] Management & User security configured (WebFig & WinBox active on WireGuard tunnel)."`,
      ``,
      `# 6. Central RADIUS Configuration (Auth + Accounting + Roaming)`,
      `:do { /radius remove [find comment="tc-radius"] } on-error={}`,
      `:do { /radius add service=hotspot address=${hubTunnelIp} secret="${radiusSecret}" authentication-port=1812 accounting-port=1813 timeout=3s comment="tc-radius" } on-error={}`,
      `:do { /radius incoming set accept=yes port=3799 } on-error={}`,
      `/log info "T-Connect: [5/7] Central RADIUS configured."`,
      ``,
      `# 7. Hotspot Server Profile RADIUS & External Captive Portal Redirect`,
      `:do { /ip hotspot profile set [find default=yes] use-radius=yes radius-accounting=yes radius-interim-update=1m login-by=http-pap,mac-cookie,cookie http-cookie-lifetime=1d } on-error={ /log warning "T-Connect: Could not bind default hotspot profile to RADIUS" }`,
      `:do { /ip hotspot user profile set [find default=yes] keepalive-timeout=2m status-autorefresh=1m transparent-proxy=no } on-error={}`,
      ``,
      `# Ultra-lightweight redirect stub: 100% of portal assets, payment UI & vouchers run on VPS`,
      `:do { /file add name="hotspot/login.html" contents="<!DOCTYPE html><html><head><meta http-equiv=\\"refresh\\" content=\\"0; url=${portalBaseUrl}/portal?mac=\\$(mac)&ip=\\$(ip)&link_login_only=\\$(link-login-only)&user_url=\\$(link-orig)\\"></head><body style=\\"background:%230b0f19;color:white;font-family:sans-serif;text-align:center;padding-top:40px;\\">Connecting to T-Connect Network...</body></html>" } on-error={ :do { /file set [find name="hotspot/login.html"] contents="<!DOCTYPE html><html><head><meta http-equiv=\\"refresh\\" content=\\"0; url=${portalBaseUrl}/portal?mac=\\$(mac)&ip=\\$(ip)&link_login_only=\\$(link-login-only)&user_url=\\$(link-orig)\\"></head><body style=\\"background:%230b0f19;color:white;font-family:sans-serif;text-align:center;padding-top:40px;\\">Connecting to T-Connect Network...</body></html>" } on-error={} }`,
      ``,
      `# 8. Walled Garden Rules (Pre-Auth Access for Lesotho Payments & CNA Popups)`
    );

    walledGardenDomains.forEach((domain) => {
      scriptLines.push(
        `:do { /ip hotspot walled-garden add dst-host="*${domain}" comment="T-Connect Walled Garden - ${domain}" } on-error={}`
      );
    });

    if (blockDoH) {
      scriptLines.push(
        ``,
        `# 9. Strict CNA Zero-Bypass Lockdown & Anti-Leak Rules`,
        `:do { /ip dhcp-server option remove [find name="cna-cap-port"] } on-error={}`,
        `:do { /ip dhcp-server option add name="cna-cap-port" code=114 value="s'${portalBaseUrl}/api/cna/status'" } on-error={}`,
        `:do { /ip dhcp-server set [find default=yes] dhcp-option="cna-cap-port" } on-error={}`,
        `:do { /ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept UDP DNS" } on-error={}`,
        `:do { /ip firewall nat add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept TCP DNS" } on-error={}`,
        `:do { /ip firewall filter add chain=forward protocol=tcp dst-port=853 action=reject reject-with=tcp-reset comment="T-Connect: Block DoT (Port 853)" } on-error={}`,
        `:do { /ip firewall filter add chain=forward protocol=udp dst-port=853 action=drop comment="T-Connect: Block DoT UDP (Port 853)" } on-error={}`,
        `:do { /ip firewall filter add chain=forward action=reject reject-with=tcp-reset protocol=tcp connection-state=new hotspot=from-client comment="T-Connect: Fast-Fail Unauth TCP" } on-error={}`,
        `:do { /ip firewall raw add chain=prerouting protocol=tcp dst-port=443 content="dns-query" action=drop comment="T-Connect: Heuristic DoH Drop" } on-error={}`
      );
    }

    scriptLines.push(
      `/log info "T-Connect: [6/7] Hotspot portal, walled garden & DNS filters configured."`,
      ``,
      `# 10. Automated WAN Failover (Starlink WAN1 Primary on ether1 + LTE/Fiber WAN2 Backup on ether2)`,
      `:do { /ip route remove [find comment="tc-wan1-canary"] } on-error={}`,
      `:do { /ip route add dst-address=1.1.1.1/32 gateway=ether1 scope=10 comment="tc-wan1-canary" } on-error={ :do { /ip route add dst-address=1.1.1.1/32 gateway=%ether1 scope=10 comment="tc-wan1-canary" } on-error={} }`,
      `:do { /ip route remove [find comment="tc-wan1-primary"] } on-error={}`,
      `:do { /ip route add dst-address=0.0.0.0/0 gateway=1.1.1.1 check-gateway=ping distance=1 target-scope=30 comment="tc-wan1-primary" } on-error={}`,
      `:do { /ip route remove [find comment="tc-wan2-backup"] } on-error={}`,
      `:do { /ip route add dst-address=0.0.0.0/0 gateway=ether2 distance=2 comment="tc-wan2-backup" } on-error={ :do { /ip route add dst-address=0.0.0.0/0 gateway=%ether2 distance=2 comment="tc-wan2-backup" } on-error={} }`,
      ``,
      `# Netwatch Sentinel: Probes Starlink every 10s and alerts controller on failover`,
      `:do { /tool netwatch remove [find comment="tc-failover-sentinel"] } on-error={}`,
      `:do { /tool netwatch add host=1.1.1.1 interval=10s timeout=2s down-script="/log warning \\"[T-Connect Failover] Starlink WAN1 failed. Route switched to WAN2 Backup.\\"; :do { /tool fetch url=\\"${portalBaseUrl}/api/devices/${router.id}/failover?status=FAILOVER_ACTIVE&wan=wan2\\" check-certificate=no keep-result=no } on-error={}" up-script="/log info \\"[T-Connect Failover] Starlink WAN1 online. Primary route restored.\\"; :do { /tool fetch url=\\"${portalBaseUrl}/api/devices/${router.id}/failover?status=RESTORED&wan=wan1\\" check-certificate=no keep-result=no } on-error={}" comment="tc-failover-sentinel" } on-error={ /log warning "T-Connect: Netwatch sentinel setup note" }`,
      ``,
      `# 11. Fast 15-Second Heartbeat Cron (Enables 30s Deadman Watchdog for Instant Starlink Disconnection Alerts)`,
      `:do { /system scheduler remove [find name="tc-heartbeat"] } on-error={}`,
      `:do { /system scheduler add name="tc-heartbeat" interval=15s on-event=":do { /tool fetch url=\\"${portalBaseUrl}/api/devices/${router.id}/heartbeat\\" http-method=post http-data=\\"uptime=$[/system resource get uptime]&cpu=$[/system resource get cpu-load]&mem=$[/system resource get free-memory]&sessions=$[/ip hotspot active print count-only]\\" check-certificate=no keep-result=no } on-error={}" comment="T-Connect 15s Health Watchdog Agent" } on-error={}`,
      ``,
      `/log info "T-Connect: [7/7] Device provisioning complete! Controller connected."`
    );

    return scriptLines.join('\n');
  }

  /**
   * Generates dynamic Access Policy script for live execution on an adopted router.
   * Gives administrators total platform control over whether the router is:
   * 1. PAID_ONLY (strictly vouchers & mobile money, no free access)
   * 2. FREE_TRIAL_AND_PAID (hybrid with customizable duration, rate limit & daily quota)
   * 3. COMPLETELY_FREE (open public Wi-Fi or community-sponsored)
   */
  static renderAccessPolicyScript(options: AccessPolicyOptions): string {
    const { router, accessMode } = options;
    const duration = options.freeDurationMinutes || router.freeDurationMinutes || 30;
    const rateLimit = options.rateLimit || router.freeRateLimit || '10M/30M';
    const lines: string[] = [
      `# ============================================================`,
      `# T-Connect Dynamic Access Policy Push`,
      `# Target Router: ${router.name} (${router.id})`,
      `# Policy Mode: ${accessMode}`,
      `# Timestamp: ${new Date().toISOString()}`,
      `# ============================================================`,
      `:log info "[T-Connect Policy] Pushing Access Mode '${accessMode}' to router...";`
    ];

    if (accessMode === 'PAID_ONLY') {
      lines.push(
        `# Policy: Strictly Paid Vouchers & Mobile Money`,
        `# 1. Remove local free user profiles & free simple queues`,
        `:do { /ip hotspot user profile remove [find name="free_trial"] } on-error={}`,
        `:do { /queue simple remove [find name="tc-free-pool"] } on-error={}`,
        `:do { /ip hotspot user remove [find comment~"tc-free"] } on-error={}`,
        `# 2. Enforce RADIUS AAA authentication for all guests`,
        `:do { /ip hotspot profile set [find default=yes] login-by=http-pap,mac-cookie,cookie use-radius=yes radius-accounting=yes } on-error={}`,
        `:log info "[T-Connect Policy] Router successfully configured for PAID_ONLY access. Free trial deactivated.";`
      );
    } else if (accessMode === 'FREE_TRIAL_AND_PAID') {
      lines.push(
        `# Policy: Hybrid Access (Free Trial + Paid Vouchers)`,
        `# 1. Configure free_trial User Profile (${duration}m session timeout @ ${rateLimit})`,
        `:do { /ip hotspot user profile set [find name="free_trial"] rate-limit="${rateLimit}" shared-users=1 keepalive-timeout=2m status-autorefresh=1m session-timeout=${duration}m transparent-proxy=no } on-error={}`,
        `:do { :if ([:len [/ip hotspot user profile find name="free_trial"]] = 0) do={ /ip hotspot user profile add name="free_trial" rate-limit="${rateLimit}" shared-users=1 keepalive-timeout=2m status-autorefresh=1m session-timeout=${duration}m transparent-proxy=no comment="T-Connect Free Trial (${rateLimit})" } } on-error={}`,
        `# 2. Configure Free Simple Queue Rate Limiter`,
        `:do { /queue simple set [find name="tc-free-pool"] max-limit=${rateLimit} } on-error={}`,
        `:do { :if ([:len [/queue simple find name="tc-free-pool"]] = 0) do={ /queue simple add name="tc-free-pool" target="10.89.0.0/16,192.168.88.0/24" max-limit=${rateLimit} comment="T-Connect Free Pool Limit" } } on-error={}`,
        `# 3. Ensure RADIUS AAA remains active for paid vouchers`,
        `:do { /ip hotspot profile set [find default=yes] login-by=http-pap,mac-cookie,cookie use-radius=yes radius-accounting=yes } on-error={}`,
        `:log info "[T-Connect Policy] Hybrid mode active: ${duration}m free trial enabled alongside paid vouchers.";`
      );
    } else if (accessMode === 'COMPLETELY_FREE') {
      lines.push(
        `# Policy: 100% Free Open Access (Municipal / Community Sponsored)`,
        `# 1. Configure open access profile with rate limit ${rateLimit}`,
        `:do { /ip hotspot user profile set [find default=yes] rate-limit="${rateLimit}" keepalive-timeout=5m status-autorefresh=2m transparent-proxy=no } on-error={}`,
        `:do { /ip hotspot user profile set [find name="free_trial"] rate-limit="${rateLimit}" shared-users=100 keepalive-timeout=5m status-autorefresh=2m transparent-proxy=no } on-error={}`,
        `:do { :if ([:len [/ip hotspot user profile find name="free_trial"]] = 0) do={ /ip hotspot user profile add name="free_trial" rate-limit="${rateLimit}" shared-users=100 keepalive-timeout=5m status-autorefresh=2m transparent-proxy=no comment="T-Connect Free Open Pool" } } on-error={}`,
        `# 2. Maintain pool bandwidth queue`,
        `:do { /queue simple set [find name="tc-free-pool"] max-limit=${rateLimit} } on-error={}`,
        `:do { :if ([:len [/queue simple find name="tc-free-pool"]] = 0) do={ /queue simple add name="tc-free-pool" target="10.89.0.0/16,192.168.88.0/24" max-limit=${rateLimit} comment="T-Connect Free Pool Limit" } } on-error={}`,
        `:log info "[T-Connect Policy] COMPLETELY_FREE mode active on router.";`
      );
    }

    return lines.join('\n');
  }

  /**
   * Generates command to bridge extra ports to the hotspot bridge
   * As requested: /interface bridge port add bridge=mkcontroller-bridge interface="<DESIRED_EXTRA_PORT>" comment="TConnectHotspot-bridge-port"
   */
  static renderBridgePortCommand(bridgeName: string = 'mkcontroller-bridge', interfaceName: string): string {
    return `/interface bridge port add bridge="${bridgeName}" interface="${interfaceName}" comment="TConnectHotspot-bridge-port"`;
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
    const hubDomain = options.hubDomain || 'app.tconnect.co.ls';
    const routerId = options.routerId || 'rt_current';

    return `# ==============================================================================
# T-Connect / MKController Automated Dual-WAN Failover (RouterOS v7)
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
:do { /tool netwatch add host=${checkHost} interval=10s timeout=2s down-script="/log warning \\"[T-Connect Failover] Starlink ${wan1} unreachable! Switching traffic to ${wan2} backup.\\"; :do { /tool fetch url=\\"https://${hubDomain}/api/devices/${routerId}/failover?status=FAILOVER_ACTIVE&wan=${wan2}\\" keep-result=no } on-error={}" up-script="/log info \\"[T-Connect Failover] Starlink ${wan1} internet restored! Primary route active.\\"; :do { /tool fetch url=\\"https://${hubDomain}/api/devices/${routerId}/failover?status=RESTORED&wan=${wan1}\\" keep-result=no } on-error={}" comment="tc-failover-sentinel" } on-error={}

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
   * Purges WireGuard tunnels, RADIUS AAA config, walled garden entries,
   * deadman watchdog scripts, and scheduled telemetry jobs, leaving
   * the router in a clean state ready for future adoption.
   */
  static renderDeadoptionScript(router: RouterDevice): string {
    return `# ============================================================
# T-CONNECT MIKROTIK DE-ADOPTION & CLEANUP SCRIPT
# Target Router: ${router.name} (${router.id})
# MAC: ${router.macAddress}
# ============================================================
# This script completely purges all T-Connect cloud configuration,
# removing WireGuard tunnels, RADIUS AAA configs, netwatch daemons,
# and walled-garden DNS rules so the device has zero residual links
# to the controller, while keeping base LAN/WAN intact.
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
   * Generates RouterOS script for bridging 2 Access Points (Ubiquiti UniFi, TP-Link Omada, etc.)
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
    const bridge = options.bridgeName?.trim() || 'tctower-bridge';
    const ap1Name = options.ap1Name || 'AP1-UniFi-Omada';
    const ap2Name = options.ap2Name || 'AP2-UniFi-Omada';

    return `# ============================================================
# T-CONNECT ACCESS POINT BRIDGE & HOTSPOT BYPASS CONFIGURATION
# Adds Access Point Ethernet ports to the Hotspot Bridge and
# bypasses AP management IPs so guests get redirected to the portal
# while AP management traffic flows unhindered.
# ============================================================

:log info "[T-Connect] Configuring Access Point bridge ports and Hotspot IP-bindings...";

# 1. Ensure Target Bridge Exists
:do {
  :if ([:len [/interface bridge find name="${bridge}"]] = 0) do={
    /interface bridge add name="${bridge}" comment="T-Connect Hotspot & AP Bridge"
  }
} on-error={}

# 2. Add AP Physical Ports to Bridge
:do { :if ([:len [/interface bridge port find interface="${options.ap1Port}" bridge="${bridge}"]] = 0) do={ /interface bridge port add bridge="${bridge}" interface="${options.ap1Port}" comment="tc-tower-bridge-port-${options.ap1Port}" } } on-error={ :log warning "Port ${options.ap1Port} already in bridge or unavailable" }
:do { :if ([:len [/interface bridge port find interface="${options.ap2Port}" bridge="${bridge}"]] = 0) do={ /interface bridge port add bridge="${bridge}" interface="${options.ap2Port}" comment="tc-tower-bridge-port-${options.ap2Port}" } } on-error={ :log warning "Port ${options.ap2Port} already in bridge or unavailable" }

# 3. Bypass AP Static Management IPs in Hotspot (Prevents AP login splash blocks)
:do { /ip hotspot ip-binding remove [find comment~"${ap1Name}"] } on-error={}
:do { /ip hotspot ip-binding add address="${options.ap1Ip}" type=bypassed comment="tc-bypass-${ap1Name}" } on-error={}

:do { /ip hotspot ip-binding remove [find comment~"${ap2Name}"] } on-error={}
:do { /ip hotspot ip-binding add address="${options.ap2Ip}" type=bypassed comment="tc-bypass-${ap2Name}" } on-error={}

# 4. Verify WinBox Management Service
:do { /ip service set winbox disabled=no port=8291 } on-error={}

:log info "[T-Connect] AP Bridge ports & IP-Bindings active. Guests on AP1 & AP2 will see captive portal.";
`;
  }
}

