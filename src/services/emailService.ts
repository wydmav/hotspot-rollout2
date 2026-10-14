import nodemailer, { Transporter } from 'nodemailer';

export interface EmailAlertLog {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  eventType: 'ROUTER_OFFLINE' | 'ROUTER_RECOVERED' | 'TEST_ALERT' | 'GATEWAY_ALERT';
  routerId?: string;
  routerName?: string;
  status: 'sent' | 'simulated' | 'failed';
  error?: string;
  details: Record<string, any>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  recipientEmail: string;
}

export class EmailService {
  private config: SmtpConfig;
  private alertLogs: EmailAlertLog[] = [];
  private transporter: Transporter | null = null;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'smtp.resend.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== 'false',
      user: process.env.SMTP_USER || 'resend',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || 'T-Connect Alerts <alerts@t-connect.lesotho>',
      recipientEmail: process.env.ALERT_EMAIL_TO || 'taylorphooko@gmail.com'
    };

    this.initTransporter();
  }

  private initTransporter() {
    if (this.config.pass && this.config.pass.trim().length > 0) {
      try {
        this.transporter = nodemailer.createTransport({
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth: {
            user: this.config.user,
            pass: this.config.pass
          }
        });
      } catch (err) {
        console.warn('[EmailService] Transporter init error:', err);
        this.transporter = null;
      }
    } else {
      this.transporter = null;
    }
  }

  public getConfig(): SmtpConfig {
    return {
      ...this.config,
      pass: this.config.pass ? '••••••••' + this.config.pass.slice(-4) : ''
    };
  }

  public updateConfig(newConfig: Partial<SmtpConfig>) {
    if (newConfig.host) this.config.host = newConfig.host;
    if (newConfig.port) this.config.port = Number(newConfig.port);
    if (typeof newConfig.secure === 'boolean') this.config.secure = newConfig.secure;
    if (newConfig.user) this.config.user = newConfig.user;
    if (newConfig.pass && !newConfig.pass.startsWith('••••')) this.config.pass = newConfig.pass;
    if (newConfig.from) this.config.from = newConfig.from;
    if (newConfig.recipientEmail) this.config.recipientEmail = newConfig.recipientEmail;

    this.initTransporter();
    return this.getConfig();
  }

  public getAlertLogs(): EmailAlertLog[] {
    return [...this.alertLogs].reverse();
  }

  /**
   * Dispatch an immediate Router Offline / Uplink Severed alert
   */
  public async sendRouterOfflineAlert(router: {
    id: string;
    name: string;
    siteName?: string;
    publicWanIp?: string;
    wireguardIp?: string;
    lastHeartbeat?: string;
    secondsSinceHeartbeat?: number;
    missedBeats?: number;
  }): Promise<EmailAlertLog> {
    const subject = `🚨 [CRITICAL ALERT] MikroTik Router Offline: ${router.name} (Starlink/WAN Disconnected)`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 24px; text-align: left;">
          <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff;">🚨 Router Offline Alert</h1>
          <p style="margin: 0; color: #fecaca; font-size: 14px;">Deadman Watchdog detected missed heartbeats (30-second threshold exceeded).</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background: #1e293b; border-radius: 8px; padding: 18px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #ffffff;">Incident Summary:</p>
            <p style="margin: 0; font-size: 14px; color: #cbd5e1; line-height: 1.5;">
              Router <strong>${router.name}</strong> (${router.id}) at <strong>${router.siteName || 'Hotspot Site'}</strong> stopped communicating with the T-Connect Control Tower. Uplink cable (e.g. Starlink terminal, LTE, or POE fiber) may be disconnected or powered off.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 0; color: #94a3b8;">Router Name:</td>
              <td style="padding: 10px 0; font-weight: 600; color: #ffffff; text-align: right;">${router.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 0; color: #94a3b8;">Site Location:</td>
              <td style="padding: 10px 0; font-weight: 600; color: #ffffff; text-align: right;">${router.siteName || 'Hotspot Site'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 0; color: #94a3b8;">WireGuard Management IP:</td>
              <td style="padding: 10px 0; font-family: monospace; color: #38bdf8; text-align: right;">${router.wireguardIp || '10.99.1.50'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 0; color: #94a3b8;">Public WAN IP:</td>
              <td style="padding: 10px 0; font-family: monospace; color: #cbd5e1; text-align: right;">${router.publicWanIp || 'Unknown'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 0; color: #94a3b8;">Elapsed Silence:</td>
              <td style="padding: 10px 0; font-weight: 700; color: #f87171; text-align: right;">~${router.secondsSinceHeartbeat || 30}s (2 missed heartbeats)</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 0; color: #94a3b8;">Detected At:</td>
              <td style="padding: 10px 0; color: #cbd5e1; text-align: right;">${new Date().toLocaleString('en-US', { timeZone: 'Africa/Maseru' })} (Lesotho Time)</td>
            </tr>
          </table>

          <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #f59e0b;">Recommended Troubleshooting Steps:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #94a3b8; line-height: 1.6;">
              <li>Verify Starlink Dishy power supply and Ethernet adapter cable connectivity to Port 1 (ether1).</li>
              <li>Check local AC/Solar battery voltage on the site.</li>
              <li>If physical cable is intact, check local LAN/WebFig via <a href="http://192.168.88.1" style="color: #38bdf8;">192.168.88.1</a>.</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="http://${process.env.APP_URL || 'localhost:3000'}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">Open T-Connect Control Tower</a>
          </div>
        </div>

        <div style="background: #090d16; padding: 16px; text-align: center; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b;">
          T-Connect Automated Fleet Sentinel • Lesotho Control Tower
        </div>
      </div>
    `;

    return this.sendMail({
      recipient: this.config.recipientEmail,
      subject,
      html,
      eventType: 'ROUTER_OFFLINE',
      routerId: router.id,
      routerName: router.name,
      details: { ...router }
    });
  }

  /**
   * Dispatch a Router Online Recovery alert
   */
  public async sendRouterOnlineAlert(router: {
    id: string;
    name: string;
    siteName?: string;
    downtimeSeconds?: number;
    wireguardIp?: string;
  }): Promise<EmailAlertLog> {
    const downtimeDesc = router.downtimeSeconds 
      ? `${Math.floor(router.downtimeSeconds / 60)}m ${router.downtimeSeconds % 60}s`
      : 'under 1 minute';

    const subject = `✅ [RESOLVED] MikroTik Router Restored Online: ${router.name} (Starlink Uplink Restored)`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 24px; text-align: left;">
          <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff;">✅ Router Restored Online</h1>
          <p style="margin: 0; color: #bbf7d0; font-size: 14px;">Heartbeats received successfully. Hotspot & WireGuard tunnel operational.</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background: #1e293b; border-radius: 8px; padding: 18px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #ffffff;">Recovery Confirmation:</p>
            <p style="margin: 0; font-size: 14px; color: #cbd5e1; line-height: 1.5;">
              Router <strong>${router.name}</strong> (${router.id}) at <strong>${router.siteName || 'Hotspot Site'}</strong> is back online. Starlink / WAN uplink has resumed communication.
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 0; color: #94a3b8;">Router Name:</td>
              <td style="padding: 10px 0; font-weight: 600; color: #ffffff; text-align: right;">${router.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 0; color: #94a3b8;">Total Outage Duration:</td>
              <td style="padding: 10px 0; font-weight: 700; color: #4ade80; text-align: right;">${downtimeDesc}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 0; color: #94a3b8;">WireGuard Tunnel:</td>
              <td style="padding: 10px 0; font-family: monospace; color: #38bdf8; text-align: right;">${router.wireguardIp || '10.99.1.50'} (CONNECTED)</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 10px 0; color: #94a3b8;">Recovery Time:</td>
              <td style="padding: 10px 0; color: #cbd5e1; text-align: right;">${new Date().toLocaleString('en-US', { timeZone: 'Africa/Maseru' })} (Lesotho Time)</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="http://${process.env.APP_URL || 'localhost:3000'}" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">View In Control Tower</a>
          </div>
        </div>

        <div style="background: #090d16; padding: 16px; text-align: center; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b;">
          T-Connect Automated Fleet Sentinel • Lesotho Control Tower
        </div>
      </div>
    `;

    return this.sendMail({
      recipient: this.config.recipientEmail,
      subject,
      html,
      eventType: 'ROUTER_RECOVERED',
      routerId: router.id,
      routerName: router.name,
      details: { ...router, downtimeDesc }
    });
  }

  /**
   * Dispatch a test alert email to verify SMTP delivery
   */
  public async sendTestAlert(recipient?: string): Promise<EmailAlertLog> {
    const target = recipient || this.config.recipientEmail;
    const subject = `🔔 [TEST NOTIFICATION] T-Connect Sentinel Email System Verification`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; text-align: left;">
          <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #ffffff;">🔔 Test Alert Dispatched</h1>
          <p style="margin: 0; color: #bfdbfe; font-size: 14px;">Email gateway is configured and active.</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">
            This is a test notification from the <strong>T-Connect Control Tower</strong> deadman watchdog.
            Router offline and uplink disconnection notifications will be delivered instantly to <strong>${target}</strong> within 30 seconds of an outage.
          </p>
          <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 13px; color: #38bdf8;">
            Deadman Interval: 15s | Max Missed Beats: 2 (30s) | Target: ${target}
          </div>
        </div>
        <div style="background: #090d16; padding: 16px; text-align: center; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b;">
          T-Connect Automated Fleet Sentinel
        </div>
      </div>
    `;

    return this.sendMail({
      recipient: target,
      subject,
      html,
      eventType: 'TEST_ALERT',
      details: { recipient: target, time: new Date().toISOString() }
    });
  }

  private async sendMail(options: {
    recipient: string;
    subject: string;
    html: string;
    eventType: EmailAlertLog['eventType'];
    routerId?: string;
    routerName?: string;
    details: Record<string, any>;
  }): Promise<EmailAlertLog> {
    const logEntry: EmailAlertLog = {
      id: `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      recipient: options.recipient,
      subject: options.subject,
      eventType: options.eventType,
      routerId: options.routerId,
      routerName: options.routerName,
      status: 'simulated',
      details: options.details
    };

    console.log(`[EmailService] Dispatching ${options.eventType} to: ${options.recipient} | Subject: "${options.subject}"`);

    if (this.transporter && this.config.pass) {
      try {
        const info = await this.transporter.sendMail({
          from: this.config.from,
          to: options.recipient,
          subject: options.subject,
          html: options.html
        });
        logEntry.status = 'sent';
        logEntry.details.messageId = info.messageId;
        console.log(`[EmailService] ✅ Email sent via SMTP: ${info.messageId}`);
      } catch (err: any) {
        logEntry.status = 'failed';
        logEntry.error = err.message || String(err);
        console.warn(`[EmailService] ⚠️ SMTP transport error: ${err.message}. Logged to internal feed.`);
      }
    } else {
      // Clean simulated logging when SMTP credentials not provided yet
      logEntry.status = 'simulated';
      console.log(`[EmailService] ℹ️ SMTP credentials not configured in env (SMTP_PASS). Alert logged to internal alert feed for ${options.recipient}.`);
    }

    this.alertLogs.push(logEntry);
    if (this.alertLogs.length > 100) {
      this.alertLogs.shift();
    }

    return logEntry;
  }
}

export const emailService = new EmailService();
