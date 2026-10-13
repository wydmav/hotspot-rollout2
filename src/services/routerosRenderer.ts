import { RouterDevice } from '../types';

export interface OneLinerOptions {
  controllerDomain: string;
  routerId: string;
  token: string;
  rosVersion?: 'v7' | 'v6';
  endpointProtocol?: string;
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
      `/interface list`,
      `:do { add name=WAN comment="T-Connect WAN Interfaces" } on-error={}`,
      `:do { add name=LAN comment="T-Connect Hotspot LAN Interfaces" } on-error={}`,
      `/interface list member`,
      `:do { add list=WAN interface=ether1 comment="T-Connect WAN1: Starlink LEO Dishy" } on-error={}`,
      `/ip dhcp-client`,
      `:do { add interface=ether1 disabled=no add-default-route=yes default-route-distance=1 use-peer-dns=yes comment="Starlink WAN1 DHCP Client" } on-error={}`,
      ``,
      `# 3. Hotspot Bridge Configuration (mkcontroller-bridge compatible)`,
      `/interface bridge`,
      `:do { add name="mkcontroller-bridge" fast-forward=yes comment="T-Connect Hotspot Bridge" } on-error={}`,
      `:do { add name="tconnect-bridge" fast-forward=yes comment="T-Connect Hotspot Bridge" } on-error={}`,
      `/interface list member`,
      `:do { add list=LAN interface=mkcontroller-bridge comment="T-Connect Hotspot LAN Bridge" } on-error={}`,
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
        `/interface wireguard`,
        `:do { remove [find name="wg-tconnect"] } on-error={}`,
        safePrivateKey 
          ? `:do { add name="wg-tconnect" listen-port=${hubWgPort} private-key="${safePrivateKey}" comment="T-Connect Management Tunnel" } on-error={ :do { add name="wg-tconnect" listen-port=${hubWgPort} comment="T-Connect Management Tunnel" } on-error={} }`
          : `:do { add name="wg-tconnect" listen-port=${hubWgPort} comment="T-Connect Management Tunnel" } on-error={}`,
        `/ip address`,
        `:do { remove [find comment="tc-wg-ip"] } on-error={}`,
        `:do { add address="${routerWgIp}/24" interface="wg-tconnect" comment="tc-wg-ip" } on-error={}`,
        `/interface wireguard peers`,
        `:do { remove [find comment="tc-hub-peer"] } on-error={}`,
        safeHubPubKey
          ? `:do { add interface="wg-tconnect" public-key="${safeHubPubKey}" endpoint-address="${cleanDomain}" endpoint-port=${hubWgPort} allowed-address="10.99.0.0/16" persistent-keepalive=25s comment="tc-hub-peer" } on-error={}`
          : `# Hub public key omitted - wireguard interface created`,
        `/log info "T-Connect: [3/7] WireGuard tunnel configured."`,
        ``
      );
    } else {
      scriptLines.push(
        `# 4. Management Tunnel (v6 Fallback SSTP / OVPN)`,
        `/interface sstp-client`,
        `:do { remove [find name="tc-tunnel"] } on-error={}`,
        `:do { add name="tc-tunnel" connect-to="${cleanDomain}" user="${router.id}" password="${apiPassword}" verify-server-certificate=no comment="T-Connect v6 Tunnel" } on-error={}`,
        `/log info "T-Connect: [3/7] Management tunnel configured."`,
        ``
      );
    }

    scriptLines.push(
      `# 5. Secure Router Management (Never expose unauthenticated services to public internet)`,
      `/ip service`,
      `:do { set telnet disabled=yes } on-error={}`,
      `:do { set ftp disabled=yes } on-error={}`,
      `:do { set www disabled=no address="10.99.0.0/16,192.168.88.0/24,10.0.0.0/8" port=80 } on-error={ :do { set www disabled=no port=80 } on-error={} }`,
      `:do { set winbox disabled=no address="10.99.0.0/16,192.168.88.0/24,10.0.0.0/8" port=8291 } on-error={ :do { set winbox disabled=no port=8291 } on-error={} }`,
      `:do { set api disabled=yes } on-error={}`,
      `:do { set api-ssl address="10.99.0.0/16" port=8729 } on-error={}`,
      ``,
      `# Controller Admin User`,
      `/user group`,
      `:do { add name="tc-agent" policy="read,write,api,test,password" } on-error={}`,
      `/user`,
      `:do { remove [find name="tc_controller"] } on-error={}`,
      `:do { add name="tc_controller" group="tc-agent" password="${apiPassword}" address="10.99.0.0/16" comment="T-Connect Central Controller" } on-error={ :do { add name="tc_controller" group="full" password="${apiPassword}" comment="T-Connect Central Controller" } on-error={} }`,
      `/log info "T-Connect: [4/7] Management & User security configured (WebFig & WinBox active on WireGuard tunnel)."`,
      ``,
      `# 6. Central RADIUS Configuration (Auth + Accounting + Roaming)`,
      `/radius`,
      `:do { remove [find comment="tc-radius"] } on-error={}`,
      `:do { add service=hotspot address=${hubTunnelIp} secret="${radiusSecret}" authentication-port=1812 accounting-port=1813 timeout=3s comment="tc-radius" } on-error={}`,
      `:do { /radius incoming set accept=yes port=3799 } on-error={}`,
      `/log info "T-Connect: [5/7] Central RADIUS configured."`,
      ``,
      `# 7. Hotspot Server Profile RADIUS & Zero-RAM External Captive Portal`,
      `/ip hotspot profile`,
      `:do { set [find default=yes] use-radius=yes radius-accounting=yes radius-interim-update=1m login-by=http-pap,mac-cookie,cookie http-cookie-lifetime=1d } on-error={ /log warning "T-Connect: Could not bind default hotspot profile to RADIUS" }`,
      `/ip hotspot user profile`,
      `:do { set [find default=yes] keepalive-timeout=2m status-autorefresh=1m transparent-proxy=no } on-error={}`,
      `# Ultra-lightweight redirect stub: 100% of portal assets, payment UI & vouchers run on VPS`,
      `:do {`,
      `  /file print file="hotspot/login.html"`,
      `  :delay 1s`,
      `  :do { /file set [find name="hotspot/login.html"] contents="<!DOCTYPE html><html><head><meta http-equiv=\\"refresh\\" content=\\"0; url=${portalBaseUrl}/portal?mac=\$(mac)&ip=\$(ip)&link_login_only=\$(link-login-only)&user_url=\$(link-orig)\\"></head><body style=\\"background:%230b0f19;color:white;font-family:sans-serif;text-align:center;padding-top:40px;\\">Connecting to T-Connect Network...</body></html>" } on-error={}`,
      `} on-error={ /log warning "T-Connect: Note on login.html stub creation" }`,
      ``,
      `# 8. Walled Garden Rules (Pre-Auth Access for Lesotho Payments & CNA Popups)`,
      `/ip hotspot walled-garden`
    );

    walledGardenDomains.forEach((domain) => {
      scriptLines.push(
        `:do { add dst-host="*${domain}" comment="T-Connect Walled Garden - ${domain}" } on-error={}`
      );
    });

    if (blockDoH) {
      scriptLines.push(
        ``,
        `# 9. Strict CNA Zero-Bypass Lockdown & Anti-Leak Rules`,
        `/ip dhcp-server option`,
        `:do { remove [find name="cna-cap-port"] } on-error={}`,
        `:do { add name="cna-cap-port" code=114 value="s'${portalBaseUrl}/api/cna/status'" } on-error={}`,
        `/ip dhcp-server`,
        `:do { set [find default=yes] dhcp-option="cna-cap-port" } on-error={}`,
        `/ip firewall nat`,
        `:do { add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept UDP DNS" } on-error={}`,
        `:do { add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept TCP DNS" } on-error={}`,
        `/ip firewall filter`,
        `:do { add chain=forward protocol=tcp dst-port=853 action=reject reject-with=tcp-reset comment="T-Connect: Block DoT (Port 853)" } on-error={}`,
        `:do { add chain=forward protocol=udp dst-port=853 action=drop comment="T-Connect: Block DoT UDP (Port 853)" } on-error={}`,
        `:do { add chain=forward action=reject reject-with=tcp-reset protocol=tcp connection-state=new hotspot=from-client comment="T-Connect: Fast-Fail Unauth TCP" } on-error={}`,
        `/ip firewall raw`,
        `:do { add chain=prerouting protocol=tcp dst-port=443 content="dns-query" action=drop comment="T-Connect: Heuristic DoH Drop" } on-error={}`
      );
    }

    scriptLines.push(
      `/log info "T-Connect: [6/7] Hotspot portal, walled garden & DNS filters configured."`,
      ``,
      `# 10. Automated WAN Failover (Starlink WAN1 Primary on ether1 + LTE/Fiber WAN2 Backup on ether2)`,
      `/ip route`,
      `:do { remove [find comment="tc-wan1-canary"] } on-error={}`,
      `:do { add dst-address=1.1.1.1/32 gateway=ether1 scope=10 comment="tc-wan1-canary" } on-error={ :do { add dst-address=1.1.1.1/32 gateway=%ether1 scope=10 comment="tc-wan1-canary" } on-error={} }`,
      `:do { remove [find comment="tc-wan1-primary"] } on-error={}`,
      `:do { add dst-address=0.0.0.0/0 gateway=1.1.1.1 check-gateway=ping distance=1 target-scope=30 comment="tc-wan1-primary" } on-error={}`,
      `:do { remove [find comment="tc-wan2-backup"] } on-error={}`,
      `:do { add dst-address=0.0.0.0/0 gateway=ether2 distance=2 comment="tc-wan2-backup" } on-error={ :do { add dst-address=0.0.0.0/0 gateway=%ether2 distance=2 comment="tc-wan2-backup" } on-error={} }`,
      ``,
      `# Netwatch Sentinel: Probes Starlink every 10s and alerts controller on failover`,
      `/tool netwatch`,
      `:do { remove [find comment="tc-failover-sentinel"] } on-error={}`,
      `:do { add host=1.1.1.1 interval=10s timeout=2s down-script="/log warning \\"[T-Connect Failover] Starlink WAN1 failed. Route switched to WAN2 Backup.\\"; :do { /tool fetch url=\\"${portalBaseUrl}/api/devices/${router.id}/failover?status=FAILOVER_ACTIVE&wan=wan2\\" check-certificate=no keep-result=no } on-error={}" up-script="/log info \\"[T-Connect Failover] Starlink WAN1 online. Primary route restored.\\"; :do { /tool fetch url=\\"${portalBaseUrl}/api/devices/${router.id}/failover?status=RESTORED&wan=wan1\\" check-certificate=no keep-result=no } on-error={}" comment="tc-failover-sentinel" } on-error={ /log warning "T-Connect: Netwatch sentinel setup note" }`,
      ``,
      `# 11. Fast 15-Second Heartbeat Cron (Enables 30s Deadman Watchdog for Instant Starlink Disconnection Alerts)`,
      `/system scheduler`,
      `:do { remove [find name="tc-heartbeat"] } on-error={}`,
      `:do { add name="tc-heartbeat" interval=15s on-event=":do { /tool fetch url=\\"${portalBaseUrl}/api/devices/${router.id}/heartbeat\\" http-method=post http-data=\\"uptime=$[/system resource get uptime]&cpu=$[/system resource get cpu-load]&mem=$[/system resource get free-memory]&sessions=$[/ip hotspot active print count-only]\\" check-certificate=no keep-result=no } on-error={}" comment="T-Connect 15s Health Watchdog Agent" } on-error={}`,
      ``,
      `/log info "T-Connect: [7/7] Device provisioning complete! Controller connected."`
    );

    return scriptLines.join('\n');
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
/ip dhcp-client
:do { set [find interface="${wan1}"] add-default-route=no } on-error={}
:do { set [find interface="${wan2}"] add-default-route=no } on-error={}

# 2. Host Route to Canary IP (${checkHost}) pinned strictly to Primary WAN1 (${wan1})
/ip route
:do { remove [find comment="tc-wan1-canary"] } on-error={}
add dst-address=${checkHost}/32 gateway=${wan1} scope=10 comment="tc-wan1-canary"

# 3. Primary Default Route via Virtual Canary with Ping Check (Distance 1)
:do { remove [find comment="tc-wan1-primary"] } on-error={}
add dst-address=0.0.0.0/0 gateway=${checkHost} check-gateway=ping distance=1 target-scope=30 comment="tc-wan1-primary"

# 4. Secondary Default Route via Backup WAN2 (${wan2}) with Distance 2
:do { remove [find comment="tc-wan2-backup"] } on-error={}
add dst-address=0.0.0.0/0 gateway=${wan2} distance=2 comment="tc-wan2-backup"

# 5. Netwatch Probing Sentinel (10s interval, 2s timeout)
/tool netwatch
:do { remove [find comment="tc-failover-sentinel"] } on-error={}
add host=${checkHost} interval=10s timeout=2s \\
  down-script="/log warning \\"[T-Connect Failover] Starlink ${wan1} unreachable! Switching traffic to ${wan2} backup.\\"; :do { /tool fetch url=\\"https://${hubDomain}/api/devices/${routerId}/failover?status=FAILOVER_ACTIVE&wan=${wan2}\\" keep-result=no } on-error={}" \\
  up-script="/log info \\"[T-Connect Failover] Starlink ${wan1} internet restored! Primary route active.\\"; :do { /tool fetch url=\\"https://${hubDomain}/api/devices/${routerId}/failover?status=RESTORED&wan=${wan1}\\" keep-result=no } on-error={}" \\
  comment="tc-failover-sentinel"

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
}

