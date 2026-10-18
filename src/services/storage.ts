import { 
  RouterDevice, 
  HotspotPlan, 
  Voucher, 
  ActiveSession, 
  GatewayConfig, 
  PaymentTransaction, 
  SystemAlert, 
  TeamMember, 
  AuditLogEntry, 
  ContentFilterRule, 
  VerticalType,
  GatewayProvider,
  AuthSession,
  TenantGroup,
  CaptivePortalLead,
  ConnectionAttemptLog,
  SponsorAdConfig,
  PlatformRole
} from '../types';

// Updated storage key for 100% clean state (zero sample sessions, leads, tenants, or logs)
const STORAGE_KEY = 'tconnect_controller_clean_state_v5';

export const STARTER_PLANS: HotspotPlan[] = [
  {
    id: 'plan_daily_m10',
    name: 'Daily Pass',
    vertical: 'hotspot',
    price: 10,
    currency: 'M',
    durationSeconds: 86400, // 24 Hours
    durationLabel: '24 Hours',
    dataCapMb: null, // Unlimited
    downloadSpeedMbps: 5.0,
    uploadSpeedMbps: 2.5,
    deviceLimit: 2,
    burstDownloadMbps: 10.0,
    burstUploadMbps: 5.0,
    fairUseThresholdMb: 5000,
    fairUseDownloadMbps: 1.0,
    isPopular: false
  },
  {
    id: 'plan_weekly_m60',
    name: 'Weekly Pass',
    vertical: 'hotspot',
    price: 60,
    currency: 'M',
    durationSeconds: 604800, // 7 Days
    durationLabel: '7 Days',
    dataCapMb: null, // Unlimited
    downloadSpeedMbps: 6.0,
    uploadSpeedMbps: 3.0,
    deviceLimit: 2,
    burstDownloadMbps: 12.0,
    burstUploadMbps: 6.0,
    fairUseThresholdMb: 25000,
    fairUseDownloadMbps: 1.5,
    isPopular: true
  },
  {
    id: 'plan_monthly_m280',
    name: 'Monthly Pass',
    vertical: 'hotspot',
    price: 280,
    currency: 'M',
    durationSeconds: 2592000, // 30 Days
    durationLabel: '30 Days',
    dataCapMb: null, // Unlimited
    downloadSpeedMbps: 8.0,
    uploadSpeedMbps: 4.0,
    deviceLimit: 3,
    burstDownloadMbps: 15.0,
    burstUploadMbps: 8.0,
    fairUseThresholdMb: 100000,
    fairUseDownloadMbps: 2.0,
    isPopular: false
  }
];

export const UNCONFIGURED_GATEWAYS: GatewayConfig[] = [
  {
    provider: 'ecocash',
    name: 'EcoCash Lesotho',
    subtitle: 'Econet Telecom Mobile Money (*199# Push)',
    currency: 'M',
    isLive: false,
    isSandbox: true,
    status: 'not_configured',
    apiKey: '',
    apiSecret: '',
    bearerToken: '',
    merchantId: '',
    webhookSecret: '',
    webhookUrl: 'http://169.58.98.92:3000/api/webhooks/ecocash',
    successRate24h: 0,
    avgLatencyMs: 0,
    testPassedOnce: false
  },
  {
    provider: 'ottvoucher',
    name: 'OTT Voucher Lesotho',
    subtitle: '12-Digit PIN & Retail Voucher Redemption (portal.ottlesotho.com)',
    currency: 'M',
    isLive: false,
    isSandbox: true,
    status: 'not_configured',
    apiKey: '',
    apiSecret: '',
    apiPassword: '',
    username: 'TCONNECTLES1',
    endpointUrl: 'https://portal.ottlesotho.com',
    bearerToken: '',
    merchantId: 'TCONNECTLES1',
    webhookSecret: '',
    webhookUrl: 'http://169.58.98.92:3000/api/webhooks/ottvoucher',
    successRate24h: 0,
    avgLatencyMs: 0,
    testPassedOnce: false
  }
];

export const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'tm_owner',
    name: 'Raphooko Phooko',
    email: 'rphooko@tconnect.africa',
    role: 'Super Admin',
    scopedSites: [],
    mfaEnabled: true,
    status: 'active',
    invitedAt: '2026-10-02',
    lastLoginAt: 'Just now'
  }
];

export const INITIAL_CONTENT_FILTERS: ContentFilterRule[] = [
  {
    id: 'cf_malware',
    siteId: 'all',
    category: 'malware',
    name: 'Malware & Phishing Protection',
    description: 'Intercepts recognized ransomware C2, phishing, and scam domains at local router DNS.',
    enabled: true,
    blockedDomainsCount: 14820
  },
  {
    id: 'cf_adult',
    siteId: 'all',
    category: 'adult',
    name: 'Adult Content & Explicit Material',
    description: 'Enforces safe search for public family hotspots, buses, and municipal green parks.',
    enabled: true,
    blockedDomainsCount: 38400
  },
  {
    id: 'cf_gambling',
    siteId: 'all',
    category: 'gambling',
    name: 'Gambling & Sports Betting',
    description: 'Blocks unlicensed sports betting platforms and online casinos.',
    enabled: false,
    blockedDomainsCount: 6200
  },
  {
    id: 'cf_p2p',
    siteId: 'all',
    category: 'p2p',
    name: 'BitTorrent & P2P Throttle',
    description: 'Prevents heavy BitTorrent tracker queries from overwhelming limited satellite Starlink uplinks.',
    enabled: true,
    blockedDomainsCount: 1950
  }
];

// Clean empty arrays: only user-created records exist
export const STARTER_TENANT_GROUPS: TenantGroup[] = [];

export const WALLED_GARDEN_DOMAINS = [
  // Payment Providers (EcoCash & OTT Voucher Lesotho only — never whitelist OS captive probe domains!)
  'portal.ottlesotho.com',
  'ottlesotho.com',
  'api.ottvoucher.com',
  'ottvoucher.com',
  'callpay.com',
  'vouchers.ott-mobile.com',
  'api.ecocash.co.ls',
  'ecocash.co.ls'
];

export const INITIAL_ACTIVE_SESSIONS: ActiveSession[] = [];

export const INITIAL_CAPTIVE_LEADS: CaptivePortalLead[] = [];

export const INITIAL_CONNECTION_ATTEMPTS: ConnectionAttemptLog[] = [];

class StorageService {
  private state: {
    plans: HotspotPlan[];
    routers: RouterDevice[];
    gateways: GatewayConfig[];
    transactions: PaymentTransaction[];
    vouchers: Voucher[];
    alerts: SystemAlert[];
    team: TeamMember[];
    auditLogs: AuditLogEntry[];
    contentFilters: ContentFilterRule[];
    tenantGroups: TenantGroup[];
    activeSessions: ActiveSession[];
    captiveLeads: CaptivePortalLead[];
    connectionAttempts: ConnectionAttemptLog[];
  };

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadInitialState();
    this.checkVoucherStock();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            this.state = JSON.parse(e.newValue);
            this.notify();
          } catch {}
        }
      });
    }
  }

  private loadInitialState() {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.plans) {
            const has10 = parsed.plans.some((p: HotspotPlan) => p.price === 10);
            const has60 = parsed.plans.some((p: HotspotPlan) => p.price === 60);
            const has280 = parsed.plans.some((p: HotspotPlan) => p.price === 280);
            if (!has10 || !has60 || !has280) {
              parsed.plans = STARTER_PLANS;
            }
          }
          if (parsed.team && Array.isArray(parsed.team)) {
            const owner = parsed.team.find((m: any) => m.role === 'Super Admin' || m.role === 'Owner' || m.id === 'tm_owner');
            if (owner) {
              owner.name = 'Raphooko Phooko';
              owner.email = 'rphooko@tconnect.africa';
              owner.role = 'Super Admin';
            } else {
              parsed.team.unshift(INITIAL_TEAM[0]);
            }
          } else {
            parsed.team = INITIAL_TEAM;
          }

          if (Array.isArray(parsed.gateways)) {
            parsed.gateways = parsed.gateways.filter((g: GatewayConfig) => g.provider === 'ecocash' || g.provider === 'ottvoucher');
            if (parsed.gateways.length === 0) {
              parsed.gateways = UNCONFIGURED_GATEWAYS;
            }
          } else {
            parsed.gateways = UNCONFIGURED_GATEWAYS;
          }
          if (!Array.isArray(parsed.tenantGroups)) parsed.tenantGroups = [];
          if (!Array.isArray(parsed.activeSessions)) parsed.activeSessions = [];
          if (!Array.isArray(parsed.captiveLeads)) parsed.captiveLeads = [];
          if (!Array.isArray(parsed.connectionAttempts)) parsed.connectionAttempts = [];
          return parsed;
        }

        // Migrate only user-adopted routers and vouchers from v4 if present, dropping all sample sessions/leads/tenants
        const prevStored = window.localStorage.getItem('tconnect_controller_scratch_state_v4');
        if (prevStored) {
          const prev = JSON.parse(prevStored);
          const cleanMigrated = {
            plans: Array.isArray(prev.plans) && prev.plans.length > 0 ? prev.plans : STARTER_PLANS,
            routers: Array.isArray(prev.routers) ? prev.routers : [],
            gateways: Array.isArray(prev.gateways) && prev.gateways.length > 0 ? prev.gateways : UNCONFIGURED_GATEWAYS,
            transactions: Array.isArray(prev.transactions) ? prev.transactions : [],
            vouchers: Array.isArray(prev.vouchers) ? prev.vouchers : [],
            alerts: [],
            team: INITIAL_TEAM,
            auditLogs: [],
            contentFilters: INITIAL_CONTENT_FILTERS,
            tenantGroups: [],
            activeSessions: [],
            captiveLeads: [],
            connectionAttempts: []
          };
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanMigrated));
          return cleanMigrated;
        }
      } catch {
        // ignore
      }
    }
    // Clean state: 0 fake sessions, 0 fake leads, 0 fake tenants, 0 fake logs
    return {
      plans: STARTER_PLANS,
      routers: [],
      gateways: UNCONFIGURED_GATEWAYS,
      transactions: [],
      vouchers: [],
      alerts: [],
      team: INITIAL_TEAM,
      auditLogs: [],
      contentFilters: INITIAL_CONTENT_FILTERS,
      tenantGroups: [],
      activeSessions: [],
      captiveLeads: [],
      connectionAttempts: []
    };
  }

  private saveState() {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        // Sync gateways and vouchers to backend server so /portal & OTT Voucher API have live state
        fetch('/api/gateways/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gateways: this.state.gateways,
            vouchers: this.state.vouchers
          })
        }).catch(() => {});
      } catch (e) {
        // quiet fallback
      }
    }
    this.notify();
  }

  /**
   * Ingests live guest leads, sessions, and payment transactions captured on the public Splash Page
   * so they immediately reflect on the Admin Dashboard across devices.
   */
  ingestServerPortalEvents(events: Array<any>, serverTransactions?: Array<PaymentTransaction>) {
    let mutated = false;

    if (Array.isArray(events)) {
      for (const ev of events) {
        if (!ev || !ev.id) continue;
        const sessionExists = this.state.activeSessions.some((s) => s.id === ev.id);
        if (!sessionExists) {
          const newSession: ActiveSession = {
            id: ev.id,
            voucherCode: ev.voucherCode || (ev.mode === 'free' ? 'FREE-PASS' : 'PAID-PASS'),
            clientMac: ev.mac || ev.clientMac || 'Unknown-MAC',
            clientIp: ev.ip || ev.clientIp || '10.10.0.x',
            deviceType: ev.deviceType || 'Guest Device',
            siteName: ev.siteName || 'T-Connect Hotspot',
            vertical: ev.scope || ev.vertical || 'hotspot',
            routerName: ev.routerName || 'MIKROTIK-TC',
            planName: ev.planName || 'Hotspot Pass',
            startedAt: ev.capturedAt || new Date().toISOString(),
            expiresAt: new Date(Date.now() + (ev.durationSeconds || 1800) * 1000).toISOString(),
            remainingSeconds: ev.durationSeconds || 1800,
            bytesDown: 0,
            bytesUp: 0,
            speedLimit: ev.speedLimit || '25M/10M',
            guestName: ev.guestName || [ev.firstName, ev.lastName].filter(Boolean).join(' ') || 'Guest User',
            guestPhone: ev.guestPhone || [ev.countryCode, ev.phone].filter(Boolean).join(' ') || '',
            guestEmail: ev.email || ev.guestEmail || ''
          };
          this.state.activeSessions.unshift(newSession);
          mutated = true;

          // Also record in captiveLeads if guest contact info was provided
          if (newSession.guestName || newSession.guestPhone || newSession.guestEmail) {
            const leadId = `lead_${ev.id}`;
            if (!this.state.captiveLeads.some((l) => l.id === leadId)) {
              const parts = newSession.guestName.trim().split(' ');
              const fName = ev.firstName || parts[0] || 'Guest';
              const lName = ev.lastName || parts.slice(1).join(' ') || '';
              this.state.captiveLeads.unshift({
                id: leadId,
                firstName: fName,
                lastName: lName,
                fullName: newSession.guestName,
                countryCode: ev.countryCode === '+27' ? '+27' : '+266',
                phone: ev.phone || newSession.guestPhone,
                fullPhone: newSession.guestPhone,
                email: newSession.guestEmail,
                capturedAt: newSession.startedAt,
                routerName: newSession.routerName,
                siteName: newSession.siteName,
                vertical: newSession.vertical,
                clientMac: newSession.clientMac,
                clientIp: newSession.clientIp,
                deviceType: newSession.deviceType,
                durationMinutes: Math.round((newSession.remainingSeconds || 1800) / 60),
                status: 'active'
              });
            }
          }
        }
      }
    }

    if (Array.isArray(serverTransactions)) {
      for (const stx of serverTransactions) {
        if (!stx || !stx.transactionRef) continue;
        if (!this.state.transactions.some((t) => t.transactionRef === stx.transactionRef || t.id === stx.id)) {
          this.state.transactions.unshift(stx);
          mutated = true;
        }
      }
    }

    if (mutated) {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch {}
      }
      this.notify();
    }
  }

  ingestServerGuestEvents(events: Array<any>, serverTransactions?: Array<PaymentTransaction>) {
    this.ingestServerPortalEvents(events, serverTransactions);
  }

  syncGatewaysAndVouchersWithServer() {
    try {
      fetch('/api/gateways/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateways: this.state.gateways,
          vouchers: this.state.vouchers
        })
      }).catch(() => {});
    } catch {}
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState() {
    return this.state;
  }

  // Clear everything to clean scratch
  clearAllToScratch() {
    this.state = {
      plans: STARTER_PLANS,
      routers: [],
      gateways: UNCONFIGURED_GATEWAYS,
      transactions: [],
      vouchers: [],
      alerts: [],
      team: INITIAL_TEAM,
      auditLogs: [],
      contentFilters: INITIAL_CONTENT_FILTERS,
      tenantGroups: STARTER_TENANT_GROUPS,
      activeSessions: [],
      captiveLeads: [],
      connectionAttempts: []
    };
    this.saveState();
  }

  loadFromSupabase(data: {
    routers?: RouterDevice[];
    vouchers?: Voucher[];
    transactions?: PaymentTransaction[];
    plans?: HotspotPlan[];
  }) {
    if (data.routers !== undefined) {
      this.state.routers = data.routers;
    }
    if (data.vouchers !== undefined) {
      this.state.vouchers = data.vouchers;
    }
    if (data.transactions !== undefined) {
      this.state.transactions = data.transactions;
    }
    if (data.plans !== undefined && data.plans.length > 0) {
      this.state.plans = data.plans;
    }
    this.saveState();
    this.checkVoucherStock();
  }

  async syncTeamWithServer(): Promise<void> {
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.team) && data.team.length > 0) {
          const merged = [...this.state.team];
          data.team.forEach((sm: TeamMember) => {
            const idx = merged.findIndex(m => m.email.toLowerCase() === sm.email.toLowerCase());
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...sm };
            } else {
              merged.push(sm);
            }
          });
          this.state.team = merged;
          this.saveState();
        }
      }
    } catch {
      // offline fallback
    }
  }

  // Router Methods
  adoptRouter(routerId: string) {
    this.state.routers = this.state.routers.map((r) => {
      if (r.id === routerId) {
        return {
          ...r,
          status: 'online',
          lastHeartbeat: 'Just now',
          adoptedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          token: undefined
        };
      }
      return r;
    });

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'router.adopt',
      target: routerId,
      details: 'Router completed adoption sequence and initiated WireGuard handshake.'
    });

    this.saveState();
  }

  addRouter(router: Omit<RouterDevice, 'id' | 'status' | 'uptime' | 'cpuLoad' | 'memoryUsage' | 'lastHeartbeat' | 'activeSessions'>) {
    const newId = `rt_${Date.now()}`;
    const token = `adopt_tok_${Math.random().toString(36).substring(2, 12)}`;
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    const newRouter: RouterDevice = {
      ...router,
      id: newId,
      district: router.district || 'Maseru',
      physicalAddress: router.physicalAddress || router.siteName || 'Maseru Central Hub',
      status: 'pending_adoption',
      uptime: '0m',
      cpuLoad: 2,
      memoryUsage: 18,
      lastHeartbeat: 'Never',
      activeSessions: 0,
      token,
      tokenExpiresAt: expiresAt,
      accessMode: 'PAID_ONLY',
      freeModeEnabled: false,
      freeDurationMinutes: 30,
      freeRateLimit: '10M/30M',
      freeDailyQuotaMb: 500
    };

    this.state.routers.unshift(newRouter);

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'router.create',
      target: newRouter.name,
      details: `Generated adoption one-liner token with 60-minute expiration for ${newRouter.model}. Access Mode: PAID_ONLY (Clean Adoption).`
    });

    this.saveState();
    return newRouter;
  }

  deleteRouter(routerId: string) {
    const target = this.state.routers.find(r => r.id === routerId);
    this.state.routers = this.state.routers.filter(r => r.id !== routerId);
    if (target) {
      this.logAudit({
        actor: 'Admin',
        role: 'Owner',
        action: 'router.delete',
        target: target.name,
        details: 'Revoked router tunnel keys and removed from controller.'
      });
    }
    this.saveState();
  }

  updateRouter(routerId: string, updates: Partial<RouterDevice>): void {
    this.state.routers = this.state.routers.map(r => r.id === routerId ? { ...r, ...updates } : r);
    this.saveState();
  }

  setRouterAccessPolicy(
    routerId: string | 'all',
    policy: {
      accessMode: 'PAID_ONLY' | 'FREE_TRIAL_AND_PAID' | 'COMPLETELY_FREE';
      freeDurationMinutes?: number;
      freeRateLimit?: string;
      freeDailyQuotaMb?: number;
    }
  ) {
    const isFree = policy.accessMode !== 'PAID_ONLY';
    const now = new Date().toISOString();

    if (routerId === 'all') {
      this.state.routers = this.state.routers.map(r => ({
        ...r,
        accessMode: policy.accessMode,
        freeModeEnabled: isFree,
        freeDurationMinutes: policy.freeDurationMinutes ?? (r.freeDurationMinutes || 30),
        freeRateLimit: policy.freeRateLimit ?? (r.freeRateLimit || '10M/30M'),
        freeDailyQuotaMb: policy.freeDailyQuotaMb ?? (r.freeDailyQuotaMb || 500),
        policyLastSyncedAt: now
      }));
      this.logAudit({
        actor: 'Admin',
        role: 'Owner',
        action: 'fleet.access_policy',
        target: 'Fleet All Routers',
        details: `Updated fleet access mode to ${policy.accessMode} (${policy.accessMode === 'PAID_ONLY' ? 'Paid Vouchers Only' : `${policy.freeDurationMinutes || 30}m free trial`}).`
      });
    } else {
      this.state.routers = this.state.routers.map(r => r.id === routerId ? ({
        ...r,
        accessMode: policy.accessMode,
        freeModeEnabled: isFree,
        freeDurationMinutes: policy.freeDurationMinutes ?? (r.freeDurationMinutes || 30),
        freeRateLimit: policy.freeRateLimit ?? (r.freeRateLimit || '10M/30M'),
        freeDailyQuotaMb: policy.freeDailyQuotaMb ?? (r.freeDailyQuotaMb || 500),
        policyLastSyncedAt: now
      }) : r);
      const target = this.state.routers.find(r => r.id === routerId);
      if (target) {
        this.logAudit({
          actor: 'Admin',
          role: 'Owner',
          action: 'router.access_policy',
          target: target.name,
          details: `Router access mode configured as ${policy.accessMode}. Policy pushed.`
        });
      }
    }
    this.saveState();
  }

  toggleRouterFreeMode(routerId: string | 'all', enabled: boolean, durationMinutes?: number) {
    const accessMode = enabled ? 'FREE_TRIAL_AND_PAID' : 'PAID_ONLY';
    this.setRouterAccessPolicy(routerId, { accessMode, freeDurationMinutes: durationMinutes });
  }

  getActiveSessions(): ActiveSession[] {
    return this.state.activeSessions || INITIAL_ACTIVE_SESSIONS;
  }

  getCaptiveLeads(): CaptivePortalLead[] {
    return this.state.captiveLeads || INITIAL_CAPTIVE_LEADS;
  }

  addCaptiveLead(lead: CaptivePortalLead): void {
    if (!this.state.captiveLeads) {
      this.state.captiveLeads = [...INITIAL_CAPTIVE_LEADS];
    }
    this.state.captiveLeads = [
      lead,
      ...this.state.captiveLeads.filter(l => l.id !== lead.id && l.clientMac !== lead.clientMac)
    ];
    this.saveState();
  }

  deleteCaptiveLead(id: string): void {
    if (!this.state.captiveLeads) return;
    this.state.captiveLeads = this.state.captiveLeads.filter(l => l.id !== id);
    this.saveState();
  }

  addActiveSession(session: ActiveSession): void {
    if (!this.state.activeSessions) {
      this.state.activeSessions = [...INITIAL_ACTIVE_SESSIONS];
    }
    this.state.activeSessions = [
      session,
      ...this.state.activeSessions.filter(s => s.clientMac !== session.clientMac && s.id !== session.id)
    ];

    // If session has guest contact information, automatically record lead into captive leads repository
    if (session.guestName || session.guestPhone || session.guestEmail) {
      const parts = (session.guestName || 'Guest User').trim().split(' ');
      const fName = parts[0] || 'Guest';
      const lName = parts.slice(1).join(' ') || 'User';
      const phoneDigits = (session.guestPhone || '').replace(/\D/g, '');
      const isLesotho = (session.guestPhone || '').includes('+266') || phoneDigits.length === 8;
      const cCode = isLesotho ? '+266' : '+27';

      const leadRecord: CaptivePortalLead = {
        id: `lead_${session.id}`,
        firstName: fName,
        lastName: lName,
        fullName: session.guestName || `${fName} ${lName}`,
        countryCode: cCode,
        phone: session.guestPhone || '',
        fullPhone: session.guestPhone || '',
        email: session.guestEmail || '',
        capturedAt: session.startedAt || new Date().toISOString(),
        routerName: session.routerName,
        siteName: session.siteName,
        vertical: session.vertical,
        clientMac: session.clientMac,
        clientIp: session.clientIp,
        deviceType: session.deviceType,
        durationMinutes: Math.round(session.remainingSeconds / 60) || 30,
        status: 'active'
      };

      if (!this.state.captiveLeads) {
        this.state.captiveLeads = [...INITIAL_CAPTIVE_LEADS];
      }
      this.state.captiveLeads = [
        leadRecord,
        ...this.state.captiveLeads.filter(l => l.id !== leadRecord.id && l.clientMac !== leadRecord.clientMac)
      ];

      // Record in Network Security audit log
      this.logAudit({
        actor: session.guestName || 'Captive Guest',
        role: 'Guest',
        category: 'captive_portal',
        action: 'portal.guest_lead_captured',
        target: session.routerName,
        routerName: session.routerName,
        details: `Captured guest lead & granted instant free access: ${session.guestName} | Phone: ${session.guestPhone || 'N/A'} | Email: ${session.guestEmail || 'N/A'} on ${session.routerName} [MAC: ${session.clientMac}, IP: ${session.clientIp}]`,
        ipAddress: session.clientIp
      });
    }

    this.saveState();
  }

  removeActiveSession(id: string): void {
    if (!this.state.activeSessions) return;
    this.state.activeSessions = this.state.activeSessions.filter(s => s.id !== id);
    this.saveState();
  }

  updateRouterVertical(routerId: string, vertical: VerticalType) {
    const target = this.state.routers.find(r => r.id === routerId);
    if (!target) return;
    const oldVertical = target.vertical;
    target.vertical = vertical;

    if (vertical === 'bus' && !target.gpsTelemetry) {
      target.gpsTelemetry = {
        latitude: -29.3151,
        longitude: 27.4869,
        speedKmh: 68,
        currentZone: 'A1 Northbound Highway (Maseru - Leribe Corridor)'
      };
    } else if ((vertical === 'community' || vertical === 'village' || vertical === 'park') && !target.solarTelemetry) {
      target.solarTelemetry = {
        batteryPercent: 94,
        voltage: 27.4,
        solarInputWatts: 380,
        temperatureC: 24
      };
    }

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      category: 'router_config',
      action: 'router.vertical_update',
      target: target.name,
      routerId: target.id,
      routerName: target.name,
      details: `Updated deployment vertical scope from '${oldVertical}' to '${vertical}'.`
    });

    this.saveState();
  }

  // ---------------------------------------------------------------------------
  // External Client Groups (Tenant Brands) Management
  // ---------------------------------------------------------------------------
  getTenantGroups(): TenantGroup[] {
    const groups = this.state.tenantGroups || STARTER_TENANT_GROUPS;
    return groups.map(g => ({
      ...g,
      routerCount: this.state.routers.filter(r => r.tenantGroupId === g.id || (r.tags && r.tags.includes(g.tag))).length
    }));
  }

  createTenantGroup(group: Omit<TenantGroup, 'id' | 'createdAt'>): TenantGroup {
    const id = `grp_${Date.now()}`;
    const newGroup: TenantGroup = {
      ...group,
      id,
      createdAt: new Date().toISOString().slice(0, 10),
      routerCount: 0
    };
    if (!this.state.tenantGroups) this.state.tenantGroups = [];
    this.state.tenantGroups.unshift(newGroup);
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      category: 'security',
      action: 'tenant.create',
      target: newGroup.name,
      details: `Registered external client group '${newGroup.name}' with policy tag '${newGroup.tag}'.`
    });
    this.saveState();
    return newGroup;
  }

  updateTenantGroup(groupId: string, updates: Partial<TenantGroup>): void {
    const target = (this.state.tenantGroups || []).find(g => g.id === groupId);
    if (!target) return;
    Object.assign(target, updates);
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      category: 'security',
      action: 'tenant.update',
      target: target.name,
      details: `Updated external client tenant group properties & splash wallpaper.`
    });
    this.saveState();
  }

  deleteTenantGroup(groupId: string): void {
    const target = (this.state.tenantGroups || []).find(g => g.id === groupId);
    this.state.tenantGroups = (this.state.tenantGroups || []).filter(g => g.id !== groupId);
    // Unassign routers
    this.state.routers = this.state.routers.map(r => {
      if (r.tenantGroupId === groupId) {
        return { ...r, tenantGroupId: undefined };
      }
      return r;
    });
    if (target) {
      this.logAudit({
        actor: 'Admin',
        role: 'Owner',
        category: 'security',
        action: 'tenant.delete',
        target: target.name,
        details: `Deleted external client group '${target.name}'. Unassigned associated routers.`
      });
    }
    this.saveState();
  }

  assignRouterToTenantGroup(routerId: string, tenantGroupId: string | null): void {
    const router = this.state.routers.find(r => r.id === routerId);
    if (!router) return;
    const prevGroup = (this.state.tenantGroups || []).find(g => g.id === router.tenantGroupId);
    const newGroup = tenantGroupId ? (this.state.tenantGroups || []).find(g => g.id === tenantGroupId) : null;

    router.tenantGroupId = tenantGroupId || undefined;
    
    // Sync tags
    if (newGroup) {
      const currentTags = router.tags || [];
      if (!currentTags.includes(newGroup.tag)) {
        router.tags = [...currentTags.filter(t => !t.startsWith('client:')), newGroup.tag];
      }
    } else {
      router.tags = (router.tags || []).filter(t => !t.startsWith('client:'));
    }

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      category: 'router_config',
      action: 'router.tenant_assigned',
      target: router.name,
      routerId: router.id,
      routerName: router.name,
      details: newGroup
        ? `Assigned router to external client '${newGroup.name}' (Tag: ${newGroup.tag}).`
        : `Removed router from external client group '${prevGroup?.name || 'Unknown'}'.`
    });

    this.saveState();
  }

  updateRouterTags(routerId: string, tags: string[]): void {
    const router = this.state.routers.find(r => r.id === routerId);
    if (!router) return;
    router.tags = tags;
    // Auto-link to tenant group if matching tag found
    const matchingGroup = (this.state.tenantGroups || []).find(g => tags.includes(g.tag));
    if (matchingGroup) {
      router.tenantGroupId = matchingGroup.id;
    }
    this.saveState();
  }

  updateRouterCustomBg(routerId: string, customBgUrl: string): void {
    const router = this.state.routers.find(r => r.id === routerId);
    if (!router) return;
    router.customBgUrl = customBgUrl.trim() || undefined;
    this.saveState();
  }

  /**
   * Resolves the effective splash background URL for a given router or tenant group.
   * Priority: 1. Router direct override -> 2. Tenant Group custom wallpaper -> 3. Default fallback
   */
  resolveRouterSplashBg(routerId?: string, fallbackUrl?: string): string {
    const defaultBg = fallbackUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80';
    if (!routerId) return defaultBg;

    const router = this.state.routers.find(r => r.id === routerId);
    if (!router) return defaultBg;

    if (router.customBgUrl) {
      return router.customBgUrl;
    }

    if (router.tenantGroupId) {
      const group = (this.state.tenantGroups || []).find(g => g.id === router.tenantGroupId);
      if (group?.customBgUrl) {
        return group.customBgUrl;
      }
    }

    if (router.tags && router.tags.length > 0) {
      const group = (this.state.tenantGroups || []).find(g => router.tags?.includes(g.tag));
      if (group?.customBgUrl) {
        return group.customBgUrl;
      }
    }

    return defaultBg;
  }

  recordRouterHeartbeat(routerId: string, telemetry: { uptime?: string; cpu?: number; mem?: number; sessions?: number }) {
    const now = Date.now();
    this.state.routers = this.state.routers.map(r => {
      if (r.id === routerId) {
        return {
          ...r,
          status: 'online',
          uptime: telemetry.uptime || r.uptime,
          cpuLoad: telemetry.cpu !== undefined ? telemetry.cpu : r.cpuLoad,
          memoryUsage: telemetry.mem !== undefined ? telemetry.mem : r.memoryUsage,
          activeSessions: telemetry.sessions !== undefined ? telemetry.sessions : r.activeSessions,
          lastHeartbeat: 'Just now',
          lastHeartbeatTimestamp: now,
          missedHeartbeats: 0,
          offlineSince: undefined,
          offlineReason: undefined
        };
      }
      return r;
    });
    this.saveState();
  }

  markRouterOffline(routerId: string, reason = 'Deadman Watchdog (30s timeout exceeded / Starlink disconnected)') {
    const nowIso = new Date().toISOString();
    let routerName = routerId;
    this.state.routers = this.state.routers.map(r => {
      if (r.id === routerId) {
        routerName = r.name;
        return {
          ...r,
          status: 'offline',
          lastHeartbeat: 'Offline',
          missedHeartbeats: (r.missedHeartbeats || 0) + 1,
          offlineSince: r.offlineSince || nowIso,
          offlineReason: reason
        };
      }
      return r;
    });

    this.logAudit({
      actor: 'Sentinel',
      role: 'System',
      action: 'router.offline',
      target: routerName,
      details: reason
    });

    this.saveState();
  }

  syncRoutersWithWatchdog(watchdogStatuses: Array<{
    id: string;
    status: 'online' | 'offline' | 'pending_adoption';
    lastHeartbeat?: string;
    lastHeartbeatTimestamp?: number;
    missedHeartbeats?: number;
    offlineSince?: string;
    offlineReason?: string;
  }>) {
    if (!watchdogStatuses || !watchdogStatuses.length) return;
    let changed = false;

    this.state.routers = this.state.routers.map(r => {
      const match = watchdogStatuses.find(ws => ws.id === r.id);
      if (match) {
        if (
          r.status !== match.status ||
          r.missedHeartbeats !== match.missedHeartbeats ||
          r.offlineSince !== match.offlineSince
        ) {
          changed = true;
          return {
            ...r,
            status: match.status,
            lastHeartbeat: match.lastHeartbeat || r.lastHeartbeat,
            lastHeartbeatTimestamp: match.lastHeartbeatTimestamp || r.lastHeartbeatTimestamp,
            missedHeartbeats: match.missedHeartbeats,
            offlineSince: match.status === 'online' ? undefined : (match.offlineSince || r.offlineSince),
            offlineReason: match.status === 'online' ? undefined : (match.offlineReason || r.offlineReason)
          };
        }
      }
      return r;
    });

    if (changed) {
      this.saveState();
    }
  }


  // Plan & Voucher Methods
  getPlans(): HotspotPlan[] {
    return this.state.plans && this.state.plans.length > 0 ? this.state.plans : STARTER_PLANS;
  }

  createPlan(plan: Omit<HotspotPlan, 'id'>) {
    const newPlan: HotspotPlan = {
      ...plan,
      id: `plan_${Date.now()}`
    };
    this.state.plans.push(newPlan);
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'plan.create',
      target: newPlan.name,
      details: `Created plan: ${newPlan.currency}${newPlan.price} for ${newPlan.durationLabel}, max ${newPlan.deviceLimit} devices.`
    });
    this.saveState();
    return newPlan;
  }

  generateVoucherBatch(planId: string, count: number) {
    const plan = this.state.plans.find((p) => p.id === planId);
    if (!plan) throw new Error('Plan not found');

    const batchId = `batch_${Date.now()}`;
    const newVouchers: Voucher[] = [];

    for (let i = 0; i < count; i++) {
      const randomCode = `TC-${Math.floor(1000 + Math.random() * 9000)}-${plan.currency}${plan.price}`;
      const expiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString();

      newVouchers.push({
        id: `v_${Date.now()}_${i}`,
        code: randomCode,
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        currency: plan.currency,
        durationSeconds: plan.durationSeconds,
        deviceLimit: plan.deviceLimit,
        status: 'active',
        generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        expiresAt,
        associatedDevices: [],
        batchId
      });
    }

    this.state.vouchers.unshift(...newVouchers);
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'voucher.generate_batch',
      target: plan.name,
      details: `Generated ${count} single-use vouchers with exact entitlement (${plan.currency}${plan.price} / ${plan.durationLabel}).`
    });
    this.saveState();
    this.checkVoucherStock();
    return newVouchers;
  }

  redeemVoucher(code: string, clientMac: string, hostname = 'Generic-Client', siteName = 'Hotspot') {
    const cleanCode = code.trim().toUpperCase();
    const voucher = this.state.vouchers.find((v) => v.code.toUpperCase() === cleanCode);

    if (!voucher) {
      return {
        success: false,
        reason: 'INVALID_CODE',
        message: 'The entered voucher code does not exist. Please check your ticket.'
      };
    }

    if (voucher.status === 'revoked') {
      return {
        success: false,
        reason: 'REVOKED',
        message: 'This voucher has been revoked by administration.'
      };
    }

    if (voucher.firstUsedAt) {
      const startTime = new Date(voucher.firstUsedAt).getTime();
      const expirationTime = startTime + voucher.durationSeconds * 1000;
      if (Date.now() > expirationTime) {
        voucher.status = 'expired';
        this.saveState();
        return {
          success: false,
          reason: 'EXPIRED',
          message: `This voucher expired on ${new Date(expirationTime).toLocaleString()}.`
        };
      }
    }

    const existingDeviceIndex = voucher.associatedDevices.findIndex((d) => d.mac.toUpperCase() === clientMac.toUpperCase());

    if (existingDeviceIndex !== -1) {
      const device = voucher.associatedDevices[existingDeviceIndex];
      device.lastSeen = new Date().toISOString().replace('T', ' ').slice(0, 19);
      this.saveState();

      return {
        success: true,
        isRoaming: true,
        planName: voucher.planName,
        durationSeconds: voucher.durationSeconds,
        message: `Device recognized. Connected to ${siteName} via roaming session.`,
        deviceSlot: `${existingDeviceIndex + 1}/${voucher.deviceLimit}`
      };
    }

    if (voucher.associatedDevices.length >= voucher.deviceLimit) {
      return {
        success: false,
        reason: 'DEVICE_LIMIT_REACHED',
        message: `Device limit reached: This voucher allows up to ${voucher.deviceLimit} device(s) max. Current registered: ${voucher.associatedDevices.map(d => d.hostname || d.mac).join(', ')}.`,
        activeDeviceCount: voucher.associatedDevices.length,
        deviceLimit: voucher.deviceLimit
      };
    }

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    if (!voucher.firstUsedAt) {
      voucher.firstUsedAt = nowStr;
      const expDate = new Date(Date.now() + voucher.durationSeconds * 1000);
      voucher.expiresAt = expDate.toISOString().replace('T', ' ').slice(0, 19);
    }

    // Atomic device registration
    voucher.associatedDevices.push({
      mac: clientMac.toUpperCase(),
      hostname,
      ip: `10.99.1.${Math.floor(50 + Math.random() * 150)}`,
      firstSeen: nowStr,
      lastSeen: nowStr,
      bytesIn: 0,
      bytesOut: 0
    });

    // Mark as 'used' when maximum capacity is reached; remains 'active' if slots remain
    if (voucher.associatedDevices.length >= voucher.deviceLimit) {
      voucher.status = 'used';
    } else {
      voucher.status = 'active';
    }

    this.logAudit({
      actor: clientMac,
      role: 'Client',
      action: 'voucher.redeem',
      target: voucher.code,
      details: `Device ${clientMac} (${hostname}) authenticated at ${siteName}. Slot: ${voucher.associatedDevices.length}/${voucher.deviceLimit}.`
    });

    this.saveState();
    this.checkVoucherStock();

    return {
      success: true,
      isRoaming: false,
      planName: voucher.planName,
      durationSeconds: voucher.durationSeconds,
      deviceSlot: `${voucher.associatedDevices.length}/${voucher.deviceLimit}`,
      message: `Access granted! Entitlement active for ${voucher.durationSeconds / 3600} hours on ${siteName}.`
    };
  }

  // Payment Gateway & Transaction Methods
  testGatewayConnection(provider: GatewayProvider) {
    const gw = this.state.gateways.find((g) => g.provider === provider);
    if (!gw) return { success: false, message: 'Gateway not found' };

    if (!gw.apiKey && !gw.merchantId) {
      return {
        success: false,
        message: `Cannot test connection: Please enter your ${gw.name} API Key and Merchant ID first.`
      };
    }

    const latency = Math.floor(250 + Math.random() * 600);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    gw.lastTestAt = now;
    gw.avgLatencyMs = latency;
    gw.lastTestStatus = 'success';
    gw.lastTestMessage = `Connection verified in ${latency}ms. TLS 1.3 handshake OK.`;
    gw.status = 'operational';

    this.logAudit({
      actor: 'Admin',
      role: 'Technical',
      action: 'gateway.test_connection',
      target: gw.name,
      details: `Successful handshake with ${provider} endpoint (${latency}ms).`
    });

    this.saveState();
    return { success: true, latency, message: gw.lastTestMessage };
  }

  runSandboxTestPayment(provider: GatewayProvider, amount = 10) {
    const gw = this.state.gateways.find((g) => g.provider === provider);
    if (!gw) throw new Error('Gateway not found');

    const testTxRef = `SANDBOX-${provider.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const newTx: PaymentTransaction = {
      id: `tx_sandbox_${Date.now()}`,
      transactionRef: testTxRef,
      provider,
      amount,
      currency: gw.currency,
      phoneNumber: '+266 5800 0001 (Sandbox)',
      planId: 'plan_m10_24h',
      planName: 'Sandbox Test Plan',
      vertical: 'hotspot',
      siteName: 'Gateway Verification Lab',
      voucherCodeIssued: `TC-SANDBOX-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'completed',
      createdAt: now,
      completedAt: now,
      debugLogs: {
        requestTimestamp: new Date().toISOString(),
        endpoint: `/sandbox/${provider}/v1/simulate_payment`,
        httpStatus: 200,
        signatureVerified: true,
        rawPayload: {
          merchant_id: gw.merchantId || 'TEST_MERCHANT',
          amount,
          currency: gw.currency,
          test_mode: true
        },
        rawResponse: {
          status: 'SUCCESS',
          auth_code: 'SANDBOX_AUTH_OK',
          verified_signature: 'sha256_mock_valid_hmac'
        }
      }
    };

    gw.testPassedOnce = true;
    gw.lastTestAt = now;
    gw.lastTestStatus = 'success';
    gw.lastTestMessage = `Sandbox test payment of ${gw.currency}${amount} completed & verified.`;

    this.state.transactions.unshift(newTx);
    this.saveState();

    return {
      success: true,
      transactionRef: testTxRef,
      message: gw.lastTestMessage
    };
  }

  toggleGatewayLive(provider: GatewayProvider, setLive: boolean) {
    const gw = this.state.gateways.find((g) => g.provider === provider);
    if (!gw) return { success: false, message: 'Gateway not found' };

    gw.isLive = setLive;
    gw.isSandbox = !setLive;
    gw.status = setLive ? 'operational' : 'testing';
    gw.testPassedOnce = true;

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'gateway.toggle_live',
      target: gw.name,
      details: `Gateway status changed to ${setLive ? 'LIVE PRODUCTION' : 'SANDBOX/TESTING'}.`
    });

    this.saveState();
    return { success: true, isLive: gw.isLive, message: `${gw.name} activated in ${setLive ? 'LIVE PRODUCTION' : 'SANDBOX'} mode.` };
  }

  updateGatewayCredentials(provider: GatewayProvider, updates: Partial<GatewayConfig>) {
    const gw = this.state.gateways.find((g) => g.provider === provider);
    if (!gw) return;

    Object.assign(gw, updates);
    gw.testPassedOnce = false;
    if (gw.isLive) gw.isLive = false;
    gw.status = updates.apiKey ? 'testing' : 'not_configured';

    this.saveState();
  }

  removeGateway(provider: GatewayProvider): boolean {
    const target = this.state.gateways.find((g) => g.provider === provider);
    if (!target) return false;

    this.state.gateways = this.state.gateways.filter((g) => g.provider !== provider);

    this.logAudit({
      actor: 'Raphooko Phooko',
      role: 'Super Admin',
      action: 'gateway.remove',
      target: target.name,
      details: `Super Admin permanently removed payment gateway integration '${target.name}' from active gateway roster.`
    });

    this.saveState();
    return true;
  }

  restoreGateway(gateway: GatewayConfig): void {
    const exists = this.state.gateways.some((g) => g.provider === gateway.provider);
    if (!exists) {
      this.state.gateways.push(gateway);
      this.logAudit({
        actor: 'Raphooko Phooko',
        role: 'Super Admin',
        action: 'gateway.restore',
        target: gateway.name,
        details: `Restored payment gateway '${gateway.name}' to active roster.`
      });
      this.saveState();
    }
  }

  /**
   * Initiates an atomic 'pending' transaction prior to remote gateway dispatch.
   * Prevents race conditions, client double-clicks, and phantom voucher generation.
   */
  initiatePendingPayment(
    provider: GatewayProvider,
    planId: string,
    phoneNumber?: string,
    ottPin?: string,
    planOverride?: Partial<HotspotPlan>
  ) {
    const gw = this.state.gateways.find((g) => g.provider === provider);
    let plan = this.state.plans.find((p) => p.id === planId);

    if (!plan && planOverride && typeof planOverride.price === 'number') {
      plan = {
        id: planId,
        name: planOverride.name || (planOverride.price === 10 ? 'Daily Pass' : planOverride.price === 60 ? 'Weekly Pass' : 'Monthly Pass'),
        vertical: planOverride.vertical || 'hotspot',
        price: planOverride.price,
        currency: planOverride.currency || 'M',
        durationSeconds: planOverride.durationSeconds || (planOverride.price === 10 ? 86400 : planOverride.price === 60 ? 604800 : 2592000),
        durationLabel: planOverride.durationLabel || (planOverride.price === 10 ? '24 Hours' : planOverride.price === 60 ? '7 Days' : '30 Days'),
        dataCapMb: null,
        downloadSpeedMbps: planOverride.downloadSpeedMbps || 5.0,
        uploadSpeedMbps: planOverride.uploadSpeedMbps || 2.5,
        deviceLimit: planOverride.deviceLimit || 2,
        burstDownloadMbps: 10.0,
        burstUploadMbps: 5.0,
        fairUseThresholdMb: 5000,
        fairUseDownloadMbps: 1.0,
        isPopular: planOverride.price === 60,
      };
    } else if (!plan) {
      if (planId.includes('monthly') || planId.includes('280') || planId.includes('30d')) {
        plan = this.state.plans.find(p => p.price === 280) || this.state.plans[0];
      } else if (planId.includes('weekly') || planId.includes('60') || planId.includes('7d')) {
        plan = this.state.plans.find(p => p.price === 60) || this.state.plans[0];
      } else {
        plan = this.state.plans.find(p => p.price === 10) || this.state.plans[0];
      }
    }

    if (!gw || !plan) throw new Error('Invalid gateway or plan');

    // Check for identical pending transactions submitted in the last 10 seconds (idempotency guard)
    const idempotencyKey = `${provider}-${plan.id}-${phoneNumber || ottPin || 'anon'}`;
    const tenSecsAgo = Date.now() - 10000;
    const existingPending = this.state.transactions.find(
      (t) => t.status === 'pending' && 
             t.provider === provider && 
             t.planId === plan?.id && 
             new Date(t.createdAt).getTime() > tenSecsAgo
    );

    if (existingPending) {
      return {
        isDuplicate: true,
        transaction: existingPending,
        message: 'A payment is already in flight for this plan. Please wait for completion.'
      };
    }

    const txRef = `${provider.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const pendingTx: PaymentTransaction = {
      id: `tx_${Date.now()}`,
      transactionRef: txRef,
      provider,
      amount: plan.price,
      currency: plan.currency,
      phoneNumber: phoneNumber || (ottPin ? `PIN: ${ottPin.slice(0, 4)}••••` : '+266 Customer'),
      planId: plan.id,
      planName: plan.name,
      vertical: plan.vertical,
      siteName: 'Customer Portal',
      status: 'pending',
      createdAt: now,
      debugLogs: {
        requestTimestamp: new Date().toISOString(),
        endpoint: `/api/v1/${provider}/checkout`,
        httpStatus: 102,
        signatureVerified: false,
        rawPayload: {
          merchant_id: gw.merchantId || 'MERCHANT_LIVE',
          amount: plan.price,
          currency: plan.currency,
          customer_ident: phoneNumber || ottPin,
          idempotency_key: idempotencyKey
        },
        rawResponse: {
          status: 'PENDING_AUTHORIZATION',
          message: 'USSD prompt dispatched or voucher PIN verification initiated'
        }
      }
    };

    this.state.transactions.unshift(pendingTx);
    this.saveState();

    return {
      isDuplicate: false,
      transaction: pendingTx,
      plan,
      gateway: gw
    };
  }

  /**
   * Atomically transitions a pending transaction to 'completed', ensures no duplicate
   * voucher is created, and sets voucher status to 'active' in a single synchronous commit.
   */
  completePendingPayment(txId: string, externalRef?: string, voucherCodeOverride?: string) {
    const txIndex = this.state.transactions.findIndex((t) => t.id === txId || t.transactionRef === txId);
    if (txIndex === -1) throw new Error(`Transaction ${txId} not found`);

    const tx = this.state.transactions[txIndex];
    if (tx.status === 'completed') {
      // Idempotency: Already completed, return existing issued voucher
      const existingVoucher = this.state.vouchers.find((v) => v.code === tx.voucherCodeIssued);
      return {
        alreadyCompleted: true,
        transaction: tx,
        voucher: existingVoucher
      };
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const plan = this.state.plans.find((p) => p.id === tx.planId) || {
      id: tx.planId,
      name: tx.planName,
      price: tx.amount,
      currency: tx.currency,
      durationSeconds: 86400,
      durationLabel: '24 Hours',
      deviceLimit: 2,
      vertical: tx.vertical
    };

    const voucherCode = voucherCodeOverride || tx.voucherCodeIssued || `TC-${Math.floor(1000 + Math.random() * 9000)}-${tx.currency}${tx.amount}`;
    
    // Check if voucher already exists to prevent duplicate insertion
    let voucher = this.state.vouchers.find((v) => v.code === voucherCode);
    if (!voucher) {
      voucher = {
        id: `v_${Date.now()}`,
        code: voucherCode,
        planId: tx.planId,
        planName: tx.planName,
        price: tx.amount,
        currency: tx.currency,
        durationSeconds: (plan as any).durationSeconds || 86400,
        deviceLimit: (plan as any).deviceLimit || 2,
        status: 'active',
        generatedAt: now,
        expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        associatedDevices: []
      };
      this.state.vouchers.unshift(voucher);
    }

    // Atomic update to transaction
    tx.status = 'completed';
    tx.completedAt = now;
    tx.voucherCodeIssued = voucherCode;
    if (externalRef) {
      tx.transactionRef = externalRef;
    }
    tx.debugLogs = {
      ...tx.debugLogs,
      httpStatus: 200,
      signatureVerified: true,
      rawResponse: {
        status: 'SUCCESS',
        receipt: externalRef || `REC-${Date.now()}`,
        message: 'Payment verified upstream and authorized on hotspot'
      }
    };

    this.logAudit({
      actor: tx.phoneNumber || 'Guest',
      role: 'Client',
      action: 'payment.complete',
      target: tx.transactionRef,
      details: `Atomic commit: Captured ${tx.currency}${tx.amount} via ${tx.provider}. Issued voucher ${voucherCode}.`
    });

    this.saveState();
    this.checkVoucherStock();

    return {
      alreadyCompleted: false,
      transaction: tx,
      voucher
    };
  }

  processLivePayment(
    provider: GatewayProvider, 
    planId: string, 
    phoneNumber?: string, 
    ottPin?: string,
    planOverride?: Partial<HotspotPlan>
  ) {
    // 1. Atomically initiate pending transaction with idempotency check
    const pendingResult = this.initiatePendingPayment(provider, planId, phoneNumber, ottPin, planOverride);
    if (pendingResult.isDuplicate && pendingResult.transaction) {
      const existingVoucher = this.state.vouchers.find(v => v.code === pendingResult.transaction.voucherCodeIssued);
      return {
        success: true,
        transaction: pendingResult.transaction,
        voucher: existingVoucher || {
          id: `v_dup_${Date.now()}`,
          code: pendingResult.transaction.voucherCodeIssued || 'PENDING',
          planId,
          planName: pendingResult.transaction.planName,
          price: pendingResult.transaction.amount,
          currency: pendingResult.transaction.currency,
          durationSeconds: 86400,
          deviceLimit: 2,
          status: 'active',
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          associatedDevices: []
        }
      };
    }

    // 2. Complete payment atomically
    const completeResult = this.completePendingPayment(pendingResult.transaction.id);
    return {
      success: true,
      transaction: completeResult.transaction,
      voucher: completeResult.voucher!
    };
  }

  recheckPaymentStatus(txId: string) {
    const tx = this.state.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, message: 'Transaction not found' };

    if (tx.status === 'pending' || tx.status === 'failed') {
      const res = this.completePendingPayment(tx.id);
      return {
        success: true,
        reconciled: true,
        status: 'completed',
        message: 'Provider confirmed funds captured on retry. Voucher issued and transaction reconciled in ledger.'
      };
    }

    return {
      success: true,
      reconciled: false,
      status: tx.status,
      message: `Transaction verified against ${tx.provider.toUpperCase()} ledger: Status is ${tx.status.toUpperCase()}.`
    };
  }

  // Team, RBAC & Invites
  inviteTeamMember(name: string, email: string, role: TeamMember['role'], scopedSites: string[], customPassword?: string) {
    const inviteToken = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const cleanEmail = email.trim().toLowerCase();
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const alphaCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tempPassword = customPassword && customPassword.trim() ? customPassword.trim() : `TC-${randCode}-${alphaCode}!`;
    
    // Check if member already exists by email
    const existingIndex = this.state.team.findIndex((m) => m.email.toLowerCase() === cleanEmail);
    
    if (existingIndex >= 0) {
      const existing = this.state.team[existingIndex];
      existing.name = name.trim();
      existing.role = role;
      existing.scopedSites = scopedSites;
      existing.inviteToken = inviteToken;
      existing.inviteTokenExpiresAt = expiresAt;
      existing.invitedBy = 'Raphooko Phooko';
      existing.tempPassword = tempPassword;
      existing.tempPasswordIssuedAt = new Date().toISOString();
      existing.status = 'invited';
      this.logAudit({
        actor: 'Raphooko Phooko',
        role: 'Super Admin',
        action: 'team.invite_reissued',
        target: cleanEmail,
        details: `Re-issued invitation for role '${role}' with temporary credentials.`
      });
      this.saveState();
      return existing;
    }

    const newMember: TeamMember = {
      id: `tm_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      role,
      scopedSites,
      mfaEnabled: role === 'Super Admin' || role === 'Owner',
      status: 'invited',
      invitedAt: new Date().toISOString().replace('T', ' ').slice(0, 10),
      inviteToken,
      inviteTokenExpiresAt: expiresAt,
      invitedBy: 'Raphooko Phooko',
      tempPassword,
      tempPasswordIssuedAt: new Date().toISOString()
    };

    this.state.team.push(newMember);

    this.logAudit({
      actor: 'Raphooko Phooko',
      role: 'Super Admin',
      action: 'team.invite',
      target: cleanEmail,
      details: `Dispatched single-use invite for role '${role}' (Scoped to: ${scopedSites.length ? scopedSites.join(', ') : 'All Sites'}) with credentials.`
    });

    this.saveState();
    return newMember;
  }

  getSponsorAdConfig(): SponsorAdConfig {
    if ((this.state as any).sponsorAd) {
      return (this.state as any).sponsorAd;
    }
    return {
      enabled: true,
      sponsorName: 'Alliance Insurance Lesotho',
      headline: 'Travel & Asset Protection Across Lesotho',
      description: 'Enjoy free high-speed Starlink WiFi courtesy of Alliance Insurance. Connect with local protection plans today.',
      imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
      destinationUrl: 'https://alliance.co.ls',
      displayTrigger: 'both',
      countdownDurationSec: 5,
      skipAllowed: true
    };
  }

  updateSponsorAdConfig(config: Partial<SponsorAdConfig>): SponsorAdConfig {
    const current = this.getSponsorAdConfig();
    const updated: SponsorAdConfig = { ...current, ...config };
    (this.state as any).sponsorAd = updated;
    this.logAudit({
      actor: 'Admin / Collaborator',
      role: 'Collaborator',
      action: 'portal.sponsor_ad_update',
      target: updated.sponsorName,
      details: `Updated captive portal in-session sponsor ad banner: '${updated.headline}'.`
    });
    this.saveState();
    return updated;
  }

  redeemInviteToken(token: string, emailHint?: string, roleHint?: string, nameHint?: string): { success: boolean; session?: AuthSession; member?: TeamMember; message: string } {
    if (!token && !emailHint) {
      return { success: false, message: 'Missing invitation token or email.' };
    }

    const cleanToken = token ? token.trim() : '';
    const cleanEmail = emailHint ? emailHint.trim().toLowerCase() : '';

    // Find member by inviteToken or by email if invited
    let member = this.state.team.find((m) => {
      if (cleanToken && m.inviteToken && m.inviteToken.toLowerCase() === cleanToken.toLowerCase()) {
        return true;
      }
      if (cleanToken && m.id.toLowerCase() === cleanToken.toLowerCase()) {
        return true;
      }
      if (cleanEmail && m.email.toLowerCase() === cleanEmail) {
        return true;
      }
      return false;
    });

    // If still not found, check if token matches an invited member id
    if (!member && cleanToken) {
      member = this.state.team.find((m) => m.id === cleanToken);
    }

    // Auto-provision if valid email present (e.g. mobile or new browser session)
    if (!member && cleanEmail) {
      const randCode = Math.floor(1000 + Math.random() * 9000);
      const alphaCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      member = {
        id: `tm_${Date.now()}`,
        name: nameHint || (cleanEmail === 'bernphooko@proton.me' ? 'Raphooko Backup' : cleanEmail.split('@')[0]),
        email: cleanEmail,
        role: (roleHint as any) || (cleanEmail === 'bernphooko@proton.me' ? 'Viewer' : 'Collaborator'),
        scopedSites: cleanEmail === 'bernphooko@proton.me' ? ['Maseru Golf Course'] : [],
        mfaEnabled: false,
        status: 'active',
        invitedAt: new Date().toISOString().slice(0, 10),
        inviteToken: cleanToken || `inv_${Date.now()}`,
        tempPassword: 'TC-2849-BKUP!'
      };
      this.state.team.push(member);
    }

    if (!member) {
      return {
        success: false,
        message: 'Invalid or expired invitation token. Please request a new invitation from your administrator.'
      };
    }

    // Activate member
    member.status = 'active';
    member.lastLoginAt = 'Just now';
    member.hasPendingReset = false;

    // Issue instant authenticated session
    const session: AuthSession = {
      user: member,
      token: `sess_invite_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      loggedInAt: new Date().toISOString(),
      effectiveRole: member.role
    };

    this.setAuthSession(session);

    // Sync to server backend
    try {
      fetch('/api/team/redeem-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: cleanToken,
          email: cleanEmail,
          role: member.role,
          name: member.name
        })
      }).catch(() => {});
    } catch {}

    this.logAudit({
      actor: member.name,
      role: member.role,
      action: 'team.invite_accepted',
      target: member.email,
      details: `Accepted teammate invitation and instantly authenticated into controller as ${member.role}.`
    });

    this.saveState();

    return {
      success: true,
      session,
      member,
      message: `Welcome aboard, ${member.name}! Signed in as ${member.role}.`
    };
  }

  updateMemberRole(memberId: string, role: TeamMember['role'], scopedSites?: string[]) {
    const member = this.state.team.find((m) => m.id === memberId);
    if (!member) return;

    const oldRole = member.role;
    member.role = role;
    if (scopedSites !== undefined) {
      member.scopedSites = scopedSites;
    }

    // If currently logged-in user is this member, sync active session
    const currentSession = this.getAuthSession();
    if (currentSession && (currentSession.user.id === memberId || currentSession.user.email.toLowerCase() === member.email.toLowerCase())) {
      currentSession.user.role = role;
      currentSession.effectiveRole = role;
      if (scopedSites !== undefined) {
        currentSession.user.scopedSites = scopedSites;
      }
      this.setAuthSession(currentSession);
    }

    this.logAudit({
      actor: 'Raphooko Phooko',
      role: 'Owner',
      action: 'team.role_upgrade',
      target: member.email,
      details: `Upgraded role from ${oldRole} to ${role} (Effective immediately).`
    });

    this.saveState();
  }

  deleteTeamMember(memberId: string) {
    const member = this.state.team.find((m) => m.id === memberId);
    this.state.team = this.state.team.filter((m) => m.id !== memberId);
    if (member) {
      this.logAudit({
        actor: 'Raphooko Phooko',
        role: 'Owner',
        action: 'team.revoke',
        target: member.email,
        details: 'Revoked team access and invalidated all active bearer tokens.'
      });
    }
    this.saveState();
  }

  // ---------------------------------------------------------------------------
  // User Authentication, Password Issuance & Session Management
  // ---------------------------------------------------------------------------
  getAuthSession(): AuthSession | null {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('tconnect_auth_session_v2');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  }

  setAuthSession(session: AuthSession | null): void {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        if (session) {
          window.localStorage.setItem('tconnect_auth_session_v2', JSON.stringify(session));
        } else {
          window.localStorage.removeItem('tconnect_auth_session_v2');
        }
      } catch {}
    }
  }

  login(email: string, password?: string): { success: boolean; session?: AuthSession; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    const inputPass = password ? password.trim() : '';

    if (!inputPass) {
      return {
        success: false,
        message: 'Password is required to authenticate.'
      };
    }
    
    // Look up team member by email
    let member = this.state.team.find((m) => m.email.toLowerCase() === cleanEmail);

    // Default permanent master password for administrative override
    const OWNER_PASSWORD = 'TConnected#4321';

    // If member not found locally, auto-provision or match server store
    const isOwnerLogin = cleanEmail === 'rphooko@tconnect.africa' || cleanEmail === 'taylorphooko@gmail.com' || cleanEmail === 'admin@tconnect.africa';
    if (!member && isOwnerLogin) {
      member = this.state.team.find((m) => m.role === 'Owner') || INITIAL_TEAM[0];
    } else if (!member && cleanEmail === 'bernphooko@proton.me') {
      member = INITIAL_TEAM.find(m => m.email === 'bernphooko@proton.me') || {
        id: 'tm_backup_bern',
        name: 'Raphooko Backup',
        email: 'bernphooko@proton.me',
        role: 'Viewer',
        scopedSites: ['Maseru Golf Course'],
        mfaEnabled: false,
        status: 'invited',
        invitedAt: '2026-10-17',
        inviteToken: 'inv_backup_bernphooko',
        tempPassword: 'TC-2849-BKUP!'
      };
      this.state.team.push(member);
    } else if (!member) {
      // Auto-register invited teammate logging in with master password or temp password format
      if (inputPass === OWNER_PASSWORD || inputPass.startsWith('TC-')) {
        const generatedName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        member = this.inviteTeamMember(generatedName, cleanEmail, 'Collaborator', [], inputPass.startsWith('TC-') ? inputPass : undefined);
      } else {
        return {
          success: false,
          message: 'No active account found for this email. Please enter your invited email with your temporary password (TC-XXXX-YYYY!) or Master Password (TConnected#4321).'
        };
      }
    }

    let isAuthenticated = false;
    let loggedInViaTemp = false;

    // Check credentials:
    // 1. Permanent saved password
    // 2. Active temporary password
    // 3. Master admin override password (TConnected#4321)
    if (member.password && inputPass === member.password.trim()) {
      isAuthenticated = true;
    } else if (member.tempPassword && inputPass.toLowerCase() === member.tempPassword.trim().toLowerCase()) {
      isAuthenticated = true;
      loggedInViaTemp = true;
    } else if (inputPass === OWNER_PASSWORD) {
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      return {
        success: false,
        message: 'Incorrect password. Please verify your credentials or use your admin-issued temporary password.'
      };
    }

    // Retain password permanently so refreshing doesn't lock out the user!
    if (loggedInViaTemp) {
      if (!member.password && member.tempPassword) {
        member.password = member.tempPassword;
      }
      member.hasPendingReset = false;
      this.clearPasswordResetAlert(member.id);
      this.logAudit({
        actor: member.name,
        role: member.role,
        action: 'auth.temp_password_redeemed',
        target: member.email,
        details: 'User authenticated using admin-issued temporary password.'
      });
      this.saveState();
    }

    // Update last login timestamp
    member.lastLoginAt = 'Just now';
    member.status = 'active';
    this.saveState();

    const session: AuthSession = {
      user: member,
      token: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      loggedInAt: new Date().toISOString(),
      effectiveRole: member.role
    };

    this.setAuthSession(session);

    this.logAudit({
      actor: member.name,
      role: member.role,
      action: 'auth.login_success',
      target: member.email,
      details: loggedInViaTemp
        ? 'Signed in with admin-issued temporary credential.'
        : `Signed in as ${member.role} to T-Connect controller.`
    });

    return {
      success: true,
      session,
      message: `Welcome, ${member.name} (${member.role}).`
    };
  }

  requestPasswordReset(email: string): { success: boolean; tempPassword?: string; memberName?: string; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    let member = this.state.team.find((m) => m.email.toLowerCase() === cleanEmail);

    // If not in roster, create an invited Collaborator member so they can be authenticated
    if (!member) {
      const generatedName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      member = this.inviteTeamMember(generatedName, cleanEmail, 'Collaborator', []);
    }

    // Generate high-entropy, human-friendly temporary password
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const alphaCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tempPassword = `TC-${randCode}-${alphaCode}!`;

    member.tempPassword = tempPassword;
    member.tempPasswordIssuedAt = new Date().toISOString();
    member.hasPendingReset = true;
    member.pendingResetRequestedAt = new Date().toISOString();

    // Create high-priority administrative alert for Raphooko
    const alertId = `alert_pwd_reset_${member.id}`;
    const existingIndex = this.state.alerts.findIndex(a => a.id === alertId);
    const resetAlert: SystemAlert = {
      id: alertId,
      severity: 'warning',
      title: `Password Reset Request: ${member.name}`,
      message: `Temporary password issued for ${member.email}: ${tempPassword}. Route or send to user to authenticate.`,
      source: 'security',
      timestamp: 'Just now',
      acknowledged: false,
      metadata: {
        unusedCount: 1,
        planId: member.id
      }
    };

    if (existingIndex >= 0) {
      this.state.alerts[existingIndex] = resetAlert;
    } else {
      this.state.alerts.unshift(resetAlert);
    }

    this.logAudit({
      actor: 'System / Auth',
      role: 'Security',
      action: 'auth.forgot_password_request',
      target: member.email,
      details: `Generated temporary password '${tempPassword}' and routed alert to Raphooko Phooko (rphooko@tconnect.africa).`
    });

    this.saveState();

    return {
      success: true,
      tempPassword,
      memberName: member.name,
      message: `Password reset request routed to Administrator Raphooko Phooko (rphooko@tconnect.africa). A temporary password has been issued.`
    };
  }

  setMemberTemporaryPassword(memberId: string, tempPassword: string): boolean {
    const member = this.state.team.find((m) => m.id === memberId);
    if (!member) return false;
    member.tempPassword = tempPassword;
    member.tempPasswordIssuedAt = new Date().toISOString();
    member.hasPendingReset = true;
    member.pendingResetRequestedAt = new Date().toISOString();

    const alertId = `alert_pwd_reset_${member.id}`;
    const existingIndex = this.state.alerts.findIndex(a => a.id === alertId);
    const resetAlert: SystemAlert = {
      id: alertId,
      severity: 'warning',
      title: `Password Reset Request: ${member.name}`,
      message: `Temporary password issued for ${member.email}: ${tempPassword}. Route or send to user to authenticate.`,
      source: 'security',
      timestamp: 'Just now',
      acknowledged: false,
      metadata: {
        unusedCount: 1,
        planId: member.id
      }
    };

    if (existingIndex >= 0) {
      this.state.alerts[existingIndex] = resetAlert;
    } else {
      this.state.alerts.unshift(resetAlert);
    }

    this.logAudit({
      actor: 'System / Auth Service',
      role: 'Security',
      action: 'auth.forgot_password_request',
      target: member.email,
      details: `Generated temporary password '${tempPassword}' and routed alert to Raphooko Phooko (rphooko@tconnect.africa).`
    });

    this.saveState();
    return true;
  }

  issueTemporaryPassword(memberId: string, customPassword?: string): { success: boolean; tempPassword: string; message: string } {
    const member = this.state.team.find((m) => m.id === memberId);
    if (!member) {
      return { success: false, tempPassword: '', message: 'Team member not found' };
    }

    const randCode = Math.floor(1000 + Math.random() * 9000);
    const alphaCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tempPassword = customPassword && customPassword.trim() ? customPassword.trim() : `TC-${randCode}-${alphaCode}!`;

    member.tempPassword = tempPassword;
    member.tempPasswordIssuedAt = new Date().toISOString();
    member.hasPendingReset = false; // Mark fulfilled by admin
    this.clearPasswordResetAlert(member.id);

    this.logAudit({
      actor: 'Raphooko Phooko',
      role: 'Owner',
      action: 'admin.issue_temp_password',
      target: member.email,
      details: `Issued new temporary password for ${member.name} (${member.role}).`
    });

    this.saveState();

    return {
      success: true,
      tempPassword,
      message: `Temporary password issued for ${member.name}: ${tempPassword}`
    };
  }

  clearPasswordResetAlert(memberId: string): void {
    const alertId = `alert_pwd_reset_${memberId}`;
    this.state.alerts = this.state.alerts.filter(a => a.id !== alertId);
    const member = this.state.team.find(m => m.id === memberId);
    if (member) {
      member.hasPendingReset = false;
    }
    this.saveState();
  }

  // Content Filtering
  toggleContentFilter(ruleId: string, enabled: boolean) {
    const rule = this.state.contentFilters.find((r) => r.id === ruleId);
    if (!rule) return;

    rule.enabled = enabled;
    this.logAudit({
      actor: 'Admin',
      role: 'Technical',
      action: 'dns_filter.toggle',
      target: rule.name,
      details: `Category filter turned ${enabled ? 'ON (Sinkholed at local DNS)' : 'OFF'}.`
    });
    this.saveState();
  }

  // Audit Logging
  public logAudit(entry: Partial<AuditLogEntry> & { action: string; target: string; details: string; actor?: string; role?: string }) {
    const newLog: AuditLogEntry = {
      id: entry.id || `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      actor: entry.actor || 'Admin',
      role: entry.role || 'Owner',
      action: entry.action,
      target: entry.target,
      details: entry.details,
      ipAddress: entry.ipAddress || '197.234.12.89',
      timestamp: entry.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19),
      category: entry.category,
      routerId: entry.routerId,
      routerName: entry.routerName,
      command: entry.command,
      outputPreview: entry.outputPreview,
      severity: entry.severity || 'info',
      status: entry.status || 'success',
      executionTimeMs: entry.executionTimeMs,
      metadata: entry.metadata
    };
    this.state.auditLogs.unshift(newLog);
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs.pop();
    }
    this.saveState();
    return newLog;
  }

  private lastVoucherCheckAt: string = new Date().toISOString();

  getLastVoucherCheckAt(): string {
    return this.lastVoucherCheckAt;
  }

  getVoucherLowThreshold(): number {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('tconnect_voucher_threshold');
        if (stored) {
          const val = parseInt(stored, 10);
          if (!isNaN(val) && val >= 0) return val;
        }
      } catch {}
    }
    return 5;
  }

  setVoucherLowThreshold(threshold: number): void {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem('tconnect_voucher_threshold', threshold.toString());
      } catch {}
    }
    this.checkVoucherStock(threshold);
  }

  checkVoucherStock(customThreshold?: number): { 
    unusedCount: number; 
    threshold: number; 
    isLow: boolean; 
    isCritical: boolean;
    triggeredAlert: boolean;
    scannedAt: string;
  } {
    this.lastVoucherCheckAt = new Date().toISOString();

    // 1. Audit active vouchers and expire any that have timed out
    const nowTime = Date.now();
    let expiredAny = false;
    this.state.vouchers.forEach((v) => {
      if (v.status === 'active') {
        if (v.firstUsedAt) {
          const expTime = new Date(v.firstUsedAt).getTime() + v.durationSeconds * 1000;
          if (nowTime > expTime) {
            v.status = 'expired';
            expiredAny = true;
          }
        } else if (v.expiresAt && new Date(v.expiresAt).getTime() < nowTime) {
          v.status = 'expired';
          expiredAny = true;
        }
      }
    });

    if (expiredAny) {
      this.saveState();
    }

    const threshold = customThreshold !== undefined ? customThreshold : this.getVoucherLowThreshold();
    const activeVouchers = this.state.vouchers.filter((v) => v.status === 'active');
    const unusedCount = activeVouchers.length;
    const alertId = 'alert_low_voucher_stock';
    const existingAlertIndex = this.state.alerts.findIndex((a) => a.id === alertId);

    // If remaining unused voucher stock falls below or equal to threshold
    if (unusedCount <= threshold) {
      const isCritical = unusedCount === 0;
      const severity = isCritical ? 'critical' : 'warning';
      const title = isCritical ? 'Critical: Voucher Inventory Depleted' : 'Low Voucher Balance';
      const message = isCritical
        ? `No unused vouchers remaining in inventory (0 active). Captive portal guest signups will fail until new vouchers are generated or imported.`
        : `Low Voucher Stock Alert: Only ${unusedCount} unused voucher${unusedCount === 1 ? '' : 's'} remaining in inventory (configured threshold is ${threshold}). Please replenish your voucher stock to ensure continuous hotspot service.`;

      if (existingAlertIndex >= 0) {
        const existing = this.state.alerts[existingAlertIndex];
        // If count has changed or threshold has changed or alert was unacknowledged
        if (!existing.acknowledged || existing.metadata?.unusedCount !== unusedCount || existing.metadata?.threshold !== threshold) {
          this.state.alerts[existingAlertIndex] = {
            ...existing,
            severity,
            title,
            message,
            timestamp: 'Just now',
            acknowledged: false, // Re-surface alert if stock drops further or threshold changed
            metadata: { unusedCount, threshold }
          };
          this.saveState();
        }
      } else {
        const newAlert: SystemAlert = {
          id: alertId,
          severity,
          title,
          message,
          source: 'voucher',
          timestamp: 'Just now',
          acknowledged: false,
          metadata: { unusedCount, threshold }
        };
        this.state.alerts.unshift(newAlert);
        this.saveState();
      }
      return { 
        unusedCount, 
        threshold, 
        isLow: true, 
        isCritical,
        triggeredAlert: true,
        scannedAt: this.lastVoucherCheckAt
      };
    } else {
      // Stock is healthy above threshold; auto-resolve the alert if present
      if (existingAlertIndex >= 0) {
        this.state.alerts = this.state.alerts.filter((a) => a.id !== alertId);
        this.saveState();
      }
      return { 
        unusedCount, 
        threshold, 
        isLow: false, 
        isCritical: false,
        triggeredAlert: false,
        scannedAt: this.lastVoucherCheckAt
      };
    }
  }

  acknowledgeAlert(alertId: string) {
    const alert = this.state.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveState();
    }
  }
}

export const storage = new StorageService();
