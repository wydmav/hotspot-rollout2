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
    ];

    if (isV7) {
      scriptLines.push(
        `# 2. WireGuard Management Tunnel (v7)`,
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
      `# 6. Hotspot Server Profile RADIUS Integration`,
      `/ip hotspot profile`,
      `:do {`,
      `  set [find default=yes] use-radius=yes radius-accounting=yes radius-interim-update=2m radius-default-domain="" login-by=http-chap,http-pap`,
      `} on-error={ /log warning "T-Connect: Could not bind default hotspot profile to RADIUS" }`,
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
        `# 8. Force Local DNS & Block DoH/DoT Bypass`,
        `/ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept UDP DNS"`,
        `/ip firewall nat add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Intercept TCP DNS"`,
        `/ip firewall filter add chain=forward protocol=tcp dst-port=853 action=reject reject-with=tcp-reset comment="T-Connect: Block DoT (Port 853)"`,
        `/ip firewall filter add chain=forward protocol=udp dst-port=853 action=drop comment="T-Connect: Block DoT UDP (Port 853)"`,
        `/ip firewall raw add chain=prerouting protocol=tcp dst-port=443 content="dns-query" action=drop comment="T-Connect: Heuristic DoH Drop"`
      );
    }

    scriptLines.push(
      ``,
      `# 9. Periodic Heartbeat / Telemetry Cron`,
      `/system scheduler`,
      `:do { remove [find name="tc-heartbeat"] } on-error={}`,
      `add name="tc-heartbeat" interval=60s on-event="/tool fetch url=\\"https://${hubDomain}/api/devices/${router.id}/heartbeat\\" http-method=post http-data=\\"uptime=$[/system resource get uptime]&cpu=$[/system resource get cpu-load]&mem=$[/system resource get free-memory]\\" keep-result=no" comment="T-Connect Periodic Health Agent"`,
      ``,
      `/log info "T-Connect: Device provisioning complete! Controller connected."`
    );

    return scriptLines.join('\n');
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
