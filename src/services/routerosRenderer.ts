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
}

export class RouterOSRenderer {
  /**
   * Generates the MKController-style one-liner script to be pasted directly into RouterOS terminal.
   * Performs DNS resolution check, device-mode fetch capability check, HTTPS download with single-use token,
   * safe import, and immediate self-deletion.
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

    return `${dnsCheck} :local fetchDisabled false;; :do { :local chk [:parse ":return ([/system/device-mode/get fetch] = false)"]; :set fetchDisabled [$chk] } on-error={};; :if ($fetchDisabled) do={ /log error "T-Connect - Fetch is locked by Device Mode. Enable fetch in /system/device-mode and retry."; :error "Device Mode restricted" };; :local fwVer [/system resource get version];; :do { /tool fetch url="${fetchUrl}" http-method=post http-data="fw=$fwVer" dst-path="${filename}" check-certificate=no; } on-error={ /tool fetch url="${fetchUrl}" http-method=get dst-path="${filename}" check-certificate=no; };; :do { import file-name="${filename}"; /file remove "${filename}"; /log info "T-Connect - Device adopted successfully. WireGuard and RADIUS operational."; } on-error={ /file remove [find name="${filename}"]; /log error "T-Connect - Failed to import adoption script."; :error "Import failed" };`;
  }

  /**
   * Generates the complete, idempotent, hardened RouterOS v7 or v6 provisioning script
   * applied to the router once the one-liner executes.
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
      blockDoH = true
    } = options;

    const isV7 = router.rosVersion === 'v7';

    const scriptLines: string[] = [
      `# ============================================================`,
      `# T-Connect Hotspot Provisioning Script (Automated Fleet Agent)`,
      `# Target Router: ${router.name} (${router.model})`,
      `# Vertical: ${router.vertical.toUpperCase()}`,
      `# RouterOS Version: ${router.rosVersion.toUpperCase()}`,
      `# Generation Timestamp: ${new Date().toISOString()}`,
      `# ============================================================`,
      ``,
      `/log info "T-Connect: Beginning automated device provisioning..."`,
      ``,
      `# 1. System Identity`,
      `/system identity set name="TC-${router.name.replace(/[^a-zA-Z0-9_-]/g, '_')}"`,
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
      `# Bridge available local LAN ports for hotspot clients and access points`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="ether3" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="ether4" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="ether5" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="wifi1" comment="TConnectHotspot-bridge-port" } on-error={}`,
      `:do { /interface bridge port add bridge="mkcontroller-bridge" interface="wifi2" comment="TConnectHotspot-bridge-port" } on-error={}`,
      ``,
    ];

    if (isV7) {
      scriptLines.push(
        `# 4. WireGuard Management Tunnel (v7)`,
        `/interface wireguard`,
        `:do { remove [find name="wg-tconnect"] } on-error={}`,
        `add name="wg-tconnect" listen-port=${hubWgPort} private-key="${routerPrivateKey}" comment="T-Connect Management Tunnel"`,
        `/ip address`,
        `:do { remove [find comment="tc-wg-ip"] } on-error={}`,
        `add address="${routerWgIp}/24" interface="wg-tconnect" comment="tc-wg-ip"`,
        `/interface wireguard peers`,
        `:do { remove [find comment="tc-hub-peer"] } on-error={}`,
        `add interface="wg-tconnect" public-key="${hubPublicKey}" endpoint-address="${hubDomain}" endpoint-port=${hubWgPort} allowed-address="10.99.0.0/16" persistent-keepalive=25s comment="tc-hub-peer"`,
        ``
      );
    } else {
      scriptLines.push(
        `# 2. Management Tunnel (v6 Fallback SSTP / OVPN)`,
        `/interface sstp-client`,
        `:do { remove [find name="tc-tunnel"] } on-error={}`,
        `add name="tc-tunnel" connect-to="${hubDomain}" user="${router.id}" password="${apiPassword}" verify-server-certificate=no comment="T-Connect v6 Tunnel"`,
        ``
      );
    }

    scriptLines.push(
      `# 3. Secure Router Management (Never expose to internet)`,
      `/ip service`,
      `set telnet disabled=yes`,
      `set ftp disabled=yes`,
      `set www disabled=yes`,
      `set api disabled=yes`,
      `set winbox address="10.99.0.0/16,192.168.88.0/24"`,
      `set api-ssl address="10.99.0.0/16" disabled=no port=8729`,
      ``,
      `# 4. Least-Privilege Controller Admin User`,
      `/user group`,
      `:do { add name="tc-agent" policy="read,write,api,test,!ftp,!reboot,!policy,!sensitive" } on-error={}`,
      `/user`,
      `:do { remove [find name="tc_controller"] } on-error={}`,
      `add name="tc_controller" group="tc-agent" password="${apiPassword}" address="10.99.0.0/16" comment="T-Connect Central Controller"`,
      ``,
      `# 5. Central RADIUS Configuration (Auth + Accounting + Roaming)`,
      `/radius`,
      `:do { remove [find comment="tc-radius"] } on-error={}`,
      `add service=hotspot address=${hubTunnelIp} secret="${radiusSecret}" authentication-port=1812 accounting-port=1813 timeout=3s comment="tc-radius"`,
      `/radius incoming set accept=yes port=3799`,
      ``,
      `# 6. Hotspot Server Profile RADIUS & Zero-RAM External Captive Portal`,
      `/ip hotspot profile`,
      `:do {`,
      `  set [find default=yes] use-radius=yes radius-accounting=yes radius-interim-update=1m login-by=http-pap,mac-cookie,cookie http-cookie-lifetime=1d`,
      `} on-error={ /log warning "T-Connect: Could not bind default hotspot profile to RADIUS" }`,
      `/ip hotspot user profile`,
      `:do { set [find default=yes] keepalive-timeout=2m status-autorefresh=1m transparent-proxy=no } on-error={}`,
      `# Ultra-lightweight redirect stub: 100% of portal assets, payment UI & vouchers run on VPS`,
      `:do {`,
      `  /file print file="hotspot/login.html"`,
      `  /delay delay-time=1s`,
      `  /file set "hotspot/login.html" contents="<!DOCTYPE html><html><head><meta http-equiv=\\"refresh\\" content=\\"0; url=https://${hubDomain}/portal?mac=\$(mac)&ip=\$(ip)&link_login_only=\$(link-login-only)&user_url=\$(link-orig)\\"></head><body style=\\"background:%230b0f19;color:white;font-family:sans-serif;text-align:center;padding-top:40px;\\">Connecting to T-Connect Network...</body></html>"`,
      `} on-error={ /log warning "T-Connect: Note on login.html stub creation" }`,
      ``,
      `# 7. Walled Garden Rules (Pre-Auth Access for Payments & CNA Popups)`
    );

    walledGardenDomains.forEach((domain) => {
      scriptLines.push(
        `/ip hotspot walled-garden ip add dst-host="*${domain}" action=accept comment="T-Connect Walled Garden - ${domain}"`
      );
    });

    if (blockDoH) {
      scriptLines.push(
        ``,
        `# 8. Strict CNA Zero-Bypass Lockdown & Anti-Leak Rules`,
        `/ip dhcp-server option`,
        `:do { remove [find name="cna-cap-port"] } on-error={}`,
        `add name="cna-cap-port" code=114 value="s'https://${hubDomain}/api/cna/status'"`,
        `/ip dhcp-server`,
        `:do { set [find default=yes] dhcp-option="cna-cap-port" } on-error={}`,
        `/ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept UDP DNS"`,
        `/ip firewall nat add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept TCP DNS"`,
        `/ip firewall filter add chain=forward protocol=tcp dst-port=853 action=reject reject-with=tcp-reset comment="T-Connect: Block DoT (Port 853)"`,
        `/ip firewall filter add chain=forward protocol=udp dst-port=853 action=drop comment="T-Connect: Block DoT UDP (Port 853)"`,
        `/ip firewall filter add chain=forward action=reject reject-with=tcp-reset protocol=tcp connection-state=new hotspot=!auth comment="T-Connect: Fast-Fail Unauth TCP"`,
        `/ip firewall raw add chain=prerouting protocol=tcp dst-port=443 content="dns-query" action=drop comment="T-Connect: Heuristic DoH Drop"`
      );
    }

    scriptLines.push(
      ``,
      `# 9. Automated WAN Failover (Starlink WAN1 Primary on ether1 + LTE/Fiber WAN2 Backup on ether2)`,
      `# Implements MKController Recursive Routing with canary host checking (1.1.1.1)`,
      `/ip route`,
      `:do { remove [find comment="tc-wan1-canary"] } on-error={}`,
      `add dst-address=1.1.1.1/32 gateway=ether1 scope=10 comment="tc-wan1-canary"`,
      `:do { remove [find comment="tc-wan1-primary"] } on-error={}`,
      `add dst-address=0.0.0.0/0 gateway=1.1.1.1 check-gateway=ping distance=1 target-scope=30 comment="tc-wan1-primary"`,
      `:do { remove [find comment="tc-wan2-backup"] } on-error={}`,
      `add dst-address=0.0.0.0/0 gateway=ether2 distance=2 comment="tc-wan2-backup"`,
      ``,
      `# Netwatch Sentinel: Probes Starlink every 10s and alerts controller on failover`,
      `/tool netwatch`,
      `:do { remove [find comment="tc-failover-sentinel"] } on-error={}`,
      `add host=1.1.1.1 interval=10s timeout=2s \\
        down-script="/log warning \\"[T-Connect Failover] Starlink WAN1 failed. Route switched to WAN2 Backup.\\"; /tool fetch url=\\"https://${hubDomain}/api/devices/${router.id}/failover?status=FAILOVER_ACTIVE&wan=wan2\\" keep-result=no" \\
        up-script="/log info \\"[T-Connect Failover] Starlink WAN1 online. Primary route restored.\\"; /tool fetch url=\\"https://${hubDomain}/api/devices/${router.id}/failover?status=RESTORED&wan=wan1\\" keep-result=no" \\
        comment="tc-failover-sentinel"`,
      ``,
      `# 10. Periodic Heartbeat / Telemetry Cron`,
      `/system scheduler`,
      `:do { remove [find name="tc-heartbeat"] } on-error={}`,
      `add name="tc-heartbeat" interval=60s on-event="/tool fetch url=\\"https://${hubDomain}/api/devices/${router.id}/heartbeat\\" http-method=post http-data=\\"uptime=$[/system resource get uptime]&cpu=$[/system resource get cpu-load]&mem=$[/system resource get free-memory]\\" keep-result=no" comment="T-Connect Periodic Health Agent"`,
      ``,
      `/log info "T-Connect: Device provisioning complete! Controller connected."`
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
}
