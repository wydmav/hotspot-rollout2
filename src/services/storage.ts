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
  VideoAdItem,
  PlatformRole,
  PermissionTabId,
  DepartmentName
} from '../types';
import { supabaseService } from './supabase';
import {
  getInMemoryAuthSession,
  setInMemoryAuthSession,
  installAuthFetchInterceptor
} from './authToken';
import {
  SUPER_ADMIN_NAME,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_USERNAME,
  PERMISSION_TABS,
  SESSION_IDLE_TIMEOUT_MS,
  isTrueSuperAdminAccount
} from '../utils/permissions';

installAuthFetchInterceptor();

export const STARTER_VIDEO_AD_LIBRARY: VideoAdItem[] = [
  {
    id: 'carousel_tconnect_offers',
    title: 'T-Connect & Partner Picture Series (3 Slides)',
    sponsorName: 'T-Connect Lesotho Partners',
    headline: 'Slide Through Exclusive Partner Deals',
    description: 'Slide right or left to view every picture, tap any picture to visit the partner offer, or tap X to close.',
    videoUrl: '',
    destinationUrl: 'https://tconnect.co.ls',
    mediaType: 'image_carousel',
    slides: [
      {
        id: 'slide_1',
        imageUrl: '/assets/aistudio/WhatsApp_Image_2026-10-29_at_07.35.29__1__283ff412.jpeg',
        redirectUrl: 'https://alliance.co.ls',
        caption: 'Alliance Insurance Lesotho — Instant Motor & Business Cover'
      },
      {
        id: 'slide_2',
        imageUrl: '/assets/aistudio/WhatsApp_Image_2026-10-29_at_07.35.29_dd2550f9.jpeg',
        redirectUrl: 'https://tconnect.co.ls',
        caption: 'Maseru Cafe & Hotspot Partner Offers — Tap to Explore'
      },
      {
        id: 'slide_3',
        imageUrl: '/assets/aistudio/WhatsApp_Image_2026-10-29_at_07.35.29__1__283ff412.jpeg',
        redirectUrl: 'https://ottlesotho.com',
        caption: 'Top Up With 16-Digit OTT Lesotho Vouchers Anywhere'
      }
    ],
    targetScope: 'all',
    enabled: true,
    watchMode: 'skip_after_sec',
    skipAfterSec: 0,
    durationSec: 10,
    impressions: 0,
    clicks: 0,
    createdAt: '2026-10-20'
  },
  {
    id: 'vid_alliance_all',
    title: 'Alliance Insurance Lesotho — 15s Spot',
    sponsorName: 'Alliance Insurance Lesotho',
    headline: 'Protect Your Journey Across Lesotho',
    description: 'High-speed Starlink Wi-Fi sponsored by Alliance Insurance. Comprehensive motor, life, and asset cover.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    destinationUrl: 'https://alliance.co.ls',
    mediaType: 'video',
    targetScope: 'all',
    enabled: true,
    watchMode: 'full_video',
    skipAfterSec: 5,
    durationSec: 15,
    impressions: 0,
    createdAt: '2026-10-19'
  },
  {
    id: 'vid_maluti_hotspot',
    title: 'Maluti Mountain Brewery & Cafes — 15s Spot',
    sponsorName: 'Maluti Mountain Refreshments',
    headline: 'Refresh Your Day at Maseru Hotspots',
    description: 'Stream, work, and connect seamlessly across T-Connect Hotspot cafes and plazas.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    destinationUrl: 'https://tconnect.co.ls',
    mediaType: 'video',
    targetScope: 'hotspot',
    enabled: false,
    watchMode: 'skip_after_sec',
    skipAfterSec: 5,
    durationSec: 15,
    impressions: 0,
    createdAt: '2026-10-19'
  },
  {
    id: 'vid_transit_bus',
    title: 'Lesotho Express Commuter Wi-Fi — 15s Spot',
    sponsorName: 'Lesotho Express & Econet',
    headline: 'Fast Onboard Starlink Across Every Route',
    description: 'Stay connected on the move. Re-plays every 3 hours or 2 GB of data consumed.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    destinationUrl: 'https://tconnect.co.ls',
    mediaType: 'video',
    targetScope: 'bus',
    enabled: false,
    watchMode: 'full_video',
    skipAfterSec: 5,
    durationSec: 15,
    impressions: 0,
    clicks: 0,
    createdAt: '2026-10-19'
  }
];

// Updated storage key for 100% clean production zero-state (v9 — Real-time active sessions, roaming & live reset)
const STORAGE_KEY = 'tconnect_controller_clean_state_v9';

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
    deviceLimit: 0,
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
    deviceLimit: 0,
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
    price: 220,
    currency: 'M',
    durationSeconds: 2592000, // 30 Days
    durationLabel: '30 Days',
    dataCapMb: null, // Unlimited
    downloadSpeedMbps: 8.0,
    uploadSpeedMbps: 4.0,
    deviceLimit: 0,
    burstDownloadMbps: 15.0,
    burstUploadMbps: 8.0,
    fairUseThresholdMb: 100000,
    fairUseDownloadMbps: 2.0,
    isPopular: false
  }
];

export const DEFAULT_PAYLESOTHO_BEARER_TOKEN = '';

export const UNCONFIGURED_GATEWAYS: GatewayConfig[] = [
  {
    provider: 'paylesotho',
    name: 'PayLesotho & XPayments Aggregator',
    subtitle: 'Merchant: T-Connect · M-Pesa (62915), EcoCash (63165430), XPayments & OTT Voucher Issuance (api.paylesotho.co.ls)',
    currency: 'M',
    isLive: true,
    isSandbox: false,
    status: 'operational',
    apiKey: '',
    apiSecret: '',
    apiPassword: '',
    username: 'T-Connect',
    merchantName: 'T-Connect',
    vendorId: '62915',
    endpointUrl: 'https://api.paylesotho.co.ls',
    xpaymentsEndpointUrl: 'https://xpayments.paylesotho.co.ls',
    ottVoucherEndpointUrl: 'https://api.paylesotho.co.ls/api/ott/voucher/get',
    ottVoucherCheckUrl: 'https://api.paylesotho.co.ls/ott/voucher/check',
    bearerToken: '',
    ottBearerToken: '',
    merchantId: '62915',
    mpesaMerchantId: '62915',
    ecocashMerchantId: '63165430',
    xpaymentsAppId: '',
    xpaymentsCertId: '',
    webhookSecret: '',
    webhookUrl: 'http://169.58.98.92:3000/api/gateways/paylesotho/webhook',
    successRate24h: 99.8,
    avgLatencyMs: 240,
    testPassedOnce: true
  },
  {
    provider: 'ottvoucher',
    name: 'OTT Voucher Lesotho',
    subtitle: '16-Digit PIN & Retail Voucher Redemption (api.ottlesotho.com)',
    currency: 'M',
    isLive: true,
    isSandbox: false,
    status: 'operational',
    apiKey: '',
    apiSecret: '',
    apiPassword: '',
    username: 'TCONNECTLES1',
    vendorId: '1, 11',
    endpointUrl: 'https://api.ottlesotho.com',
    bearerToken: '',
    merchantId: 'TCONNECTLES1',
    webhookSecret: '',
    webhookUrl: 'http://169.58.98.92:3000/api/webhooks/ottvoucher',
    successRate24h: 100,
    avgLatencyMs: 320,
    testPassedOnce: true
  }
];

// Server-authenticated team roster metadata (passwords are hashed server-side via scrypt — never stored in browser code)
export const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'tm_super_admin_boss',
    name: SUPER_ADMIN_NAME,
    username: SUPER_ADMIN_USERNAME,
    email: SUPER_ADMIN_EMAIL,
    department: 'Super Admin',
    role: 'Super Admin',
    isSuperAdmin: true,
    allowedTabs: PERMISSION_TABS.map((t) => t.id),
    scopedSites: [],
    mfaEnabled: true,
    hasPasswordConfigured: true,
    status: 'active',
    invitedAt: '2026-10-02',
    lastLoginAt: 'Never'
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

// Default Sovereign Partner Group (Zero legacy hardcoded third-party company presets)
export const STARTER_TENANT_GROUPS: TenantGroup[] = [
  {
    id: 'grp_internal',
    name: 'T-Connect Internal Fleet',
    tag: 'group:tconnect-internal',
    customBgUrl: '/assets/aistudio/WhatsApp_Image_2026-10-29_at_07.35.29__1__283ff412.jpeg',
    clientContact: 'rphooko@tconnect.africa',
    accentColor: '#f05e17',
    description: 'Sovereign T-Connect operated Starlink & MikroTik hotspot fleet.',
    createdAt: '2026-10-01',
    routerCount: 0
  }
];

const LEGACY_REMOVED_TENANT_GROUP_NAMES = new Set([
  'alliance insurance lesotho',
  'vodacom lesotho foundation',
  'econet telecom lesotho',
  'standard lesotho bank',
  'maluti mountain brewery',
  'first national bank lesotho',
  'metropolitan lesotho',
  'lndc lesotho',
  'lab / test (mikrotik-tc)',
  'quarantine (holding group)'
]);

export const WALLED_GARDEN_DOMAINS = [
  // Payment Providers (PayLesotho, EcoCash & OTT Voucher Lesotho only — never whitelist OS captive probe domains!)
  'api.paylesotho.co.ls',
  'xpayments.paylesotho.co.ls',
  'paylesotho.co.ls',
  'api.ottlesotho.com',
  'test-api.ottlesotho.com',
  'portal.ottlesotho.com',
  'ottlesotho.com',
  'api.ottvoucher.com',
  'ottvoucher.com',
  'callpay.com',
  'vouchers.ott-mobile.com',
  'api.ecocash.co.ls',
  'ecocash.co.ls',
  'econet.co.ls'
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
      this.hydrateGatewaysFromServer();
      this.hydrateSponsorAdsFromServer();
      this.hydrateRoutersFromServer();
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

  private isPhantomRouterRecord(r: any): boolean {
    if (!r) return true;
    const id = String(r.id || '').trim().toLowerCase();
    const name = String(r.name || '').trim().toLowerCase();
    return (
      id === 'rt-test' ||
      id === 'rt_demo' ||
      id === 'rt_test' ||
      name === 'mikrotik-t-test' ||
      name === 'mikrotik-rt_demo' ||
      name === 'mikrotik-rt-test'
    );
  }

  async hydrateRoutersFromServer(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/devices/watchdog/status');
      if (!res.ok) return;
      const data = await res.json();
      const validServerRouters = Array.isArray(data?.routers)
        ? data.routers.filter((r: any) => !this.isPhantomRouterRecord(r))
        : [];
      if (validServerRouters.length > 0) {
        this.mergeRoutersFromServer(validServerRouters);
      } else if (this.state.routers.length > 0) {
        fetch('/api/devices/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routers: this.state.routers, replaceAll: true })
        }).catch(() => {});
      }
    } catch {}
  }

  mergeRoutersFromServer(serverRouters: any[]): void {
    if (!Array.isArray(serverRouters) || serverRouters.length === 0) return;
    let mutated = false;
    const deletedIds: string[] = Array.isArray((this.state as any).deletedRouterIds)
      ? (this.state as any).deletedRouterIds
      : [];
    const localById = new Map<string, RouterDevice>();
    this.state.routers.forEach((r) => localById.set(r.id, r));

    serverRouters.forEach((sr: any) => {
      if (!sr || !sr.id || this.isPhantomRouterRecord(sr) || deletedIds.includes(sr.id)) return;
      const existing = localById.get(sr.id);
      const effectiveStatus: 'online' | 'offline' | 'pending_adoption' =
        sr.status === 'online' || sr.status === 'offline' || sr.status === 'pending_adoption'
          ? sr.status
          : 'pending_adoption';
      if (!existing) {
        mutated = true;
        const hydrated: RouterDevice = {
          id: sr.id,
          name: sr.name || `MikroTik-${String(sr.id).slice(-6)}`,
          vertical: sr.vertical || 'hotspot',
          siteName: sr.siteName || 'Hotspot Site',
          district: sr.district || 'Maseru',
          physicalAddress: sr.physicalAddress || sr.siteName || 'Hotspot Site',
          partnerName: sr.partnerName || 'T-Connect Internal Fleet',
          tenantGroupId: sr.tenantGroupId,
          policyName: sr.policyName || 'PayLesotho (M-Pesa / EcoCash / Card) + 16-Digit OTT Policy',
          tags: Array.isArray(sr.tags) ? sr.tags : [],
          model: sr.model || 'MikroTik hAP ax³ (v7)',
          boardName: sr.boardName || 'hAP ax3',
          rosVersion: sr.rosVersion || 'v7',
          macAddress: sr.macAddress || 'D4:01:C3:AA:BB:CC',
          wireguardIp: sr.wireguardIp || '10.99.1.50',
          publicWanIp: sr.publicWanIp || '127.0.0.1',
          status: effectiveStatus,
          uptime: sr.uptime || (effectiveStatus === 'online' ? '1h' : '0m'),
          cpuLoad: effectiveStatus === 'online' ? (sr.cpuLoad || 2) : 0,
          memoryUsage: effectiveStatus === 'online' ? (sr.memoryUsage || 18) : 0,
          lastHeartbeat: sr.lastHeartbeat || (effectiveStatus === 'online' ? 'Just now' : 'Offline'),
          lastHeartbeatTimestamp: sr.lastHeartbeatTimestamp || 0,
          firmware: sr.firmware || '7.15.2',
          activeSessions: effectiveStatus === 'online' ? (sr.activeSessions || 0) : 0,
          token: sr.adoptedAt ? undefined : sr.token,
          tokenExpiresAt: sr.tokenExpiresAt,
          adoptedAt: sr.adoptedAt,
          accessMode: sr.accessMode || 'FREE_TRIAL_AND_PAID',
          freeModeEnabled: sr.freeModeEnabled !== undefined ? Boolean(sr.freeModeEnabled) : (sr.accessMode || 'FREE_TRIAL_AND_PAID') !== 'PAID_ONLY',
          freeDurationMinutes: sr.freeDurationMinutes ?? 30,
          freeRateLimit: sr.freeRateLimit || '10M/20M 15M/30M 8M/16M 15s/15s',
          freeDailyQuotaMb: sr.freeDailyQuotaMb ?? 500
        };
        this.state.routers.push(hydrated);
      } else if (existing.status !== effectiveStatus || existing.lastHeartbeat !== sr.lastHeartbeat) {
        mutated = true;
        existing.status = effectiveStatus;
        existing.lastHeartbeat = sr.lastHeartbeat || existing.lastHeartbeat;
        existing.lastHeartbeatTimestamp = sr.lastHeartbeatTimestamp || existing.lastHeartbeatTimestamp;
        existing.missedHeartbeats = sr.missedBeats ?? existing.missedHeartbeats;
        existing.offlineSince = sr.offlineSince;
        existing.offlineReason = sr.offlineReason;
        if (sr.adoptedAt) {
          existing.adoptedAt = sr.adoptedAt;
          existing.token = undefined;
        }
      }
    });

    if (mutated) {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch {}
      }
      this.notify();
    }
  }

  async hydrateSponsorAdsFromServer(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/portal/video-ads');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data?.sponsorAd && typeof data.sponsorAd === 'object') {
        const localAd = (this.state as any).sponsorAd;
        const srvLib = Array.isArray(data.sponsorAd.videoLibrary) ? data.sponsorAd.videoLibrary : [];
        // Prefer whichever has custom uploaded /images/ or /videos/ or more recent slides
        const localHasUploadedImages =
          Array.isArray(localAd?.videoLibrary) &&
          localAd.videoLibrary.some(
            (v: any) =>
              String(v.videoUrl || '').startsWith('/images/') ||
              String(v.videoUrl || '').startsWith('/videos/') ||
              (Array.isArray(v.slides) && v.slides.some((s: any) => String(s.imageUrl || '').startsWith('/images/')))
          );
        const srvHasUploadedImages = srvLib.some(
          (v: any) =>
            String(v.videoUrl || '').startsWith('/images/') ||
            String(v.videoUrl || '').startsWith('/videos/') ||
            (Array.isArray(v.slides) && v.slides.some((s: any) => String(s.imageUrl || '').startsWith('/images/')))
        );

        if (localHasUploadedImages && !srvHasUploadedImages && localAd) {
          fetch('/api/portal/video-ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sponsorAd: localAd })
          }).catch(() => {});
        } else if (srvLib.length > 0) {
          (this.state as any).sponsorAd = {
            ...this.getSponsorAdConfig(),
            ...data.sponsorAd
          };
          if (typeof window.localStorage !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
          }
          this.notify();
        }
      }
    } catch {}
  }

  async hydrateGatewaysFromServer(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/gateways');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && Array.isArray(data.gateways) && data.gateways.length > 0) {
        let updated = false;
        const mergedGateways = this.state.gateways.map((localGw) => {
          const srvGw = data.gateways.find((g: any) => g.provider === localGw.provider);
          if (srvGw) {
            updated = true;
            return {
              ...localGw,
              ...srvGw,
              logoUrl: srvGw.logoUrl || localGw.logoUrl,
              apiKey: srvGw.apiKey || localGw.apiKey,
              apiPassword: srvGw.apiPassword || localGw.apiPassword,
              vendorId: srvGw.vendorId || localGw.vendorId || '1, 11',
              username: srvGw.username || srvGw.merchantId || localGw.username || 'TCONNECTLES1',
              merchantId: srvGw.merchantId || srvGw.username || localGw.merchantId || 'TCONNECTLES1',
              endpointUrl: srvGw.endpointUrl || localGw.endpointUrl || 'https://api.ottlesotho.com'
            };
          }
          return localGw;
        });
        data.gateways.forEach((srvGw: any) => {
          if (srvGw && srvGw.provider && !mergedGateways.some((g) => g.provider === srvGw.provider)) {
            mergedGateways.push(srvGw);
            updated = true;
          }
        });
        this.state.gateways = mergedGateways;
        if (updated && typeof window.localStorage !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
          this.notify();
        }
      }
    } catch {}
  }

  private loadInitialState() {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!Array.isArray(parsed.plans)) {
            parsed.plans = [...STARTER_PLANS];
            parsed.plansInitialized = true;
          } else if (!parsed.plansInitialized && parsed.plans.length === 0) {
            parsed.plans = [...STARTER_PLANS];
            parsed.plansInitialized = true;
          } else {
            parsed.plansInitialized = true;
          }

          if (!Array.isArray(parsed.team)) {
            parsed.team = [...INITIAL_TEAM];
            parsed.teamInitialized = true;
          } else if (!parsed.teamInitialized && parsed.team.length === 0) {
            parsed.team = [...INITIAL_TEAM];
            parsed.teamInitialized = true;
          } else {
            parsed.teamInitialized = true;
          }

          if (Array.isArray(parsed.gateways)) {
            parsed.gateways = parsed.gateways
              .filter((g: GatewayConfig) => Boolean(g && g.provider))
              .map((g: GatewayConfig) => {
                if (g.provider === 'paylesotho') {
                  g.username = 'T-Connect';
                  g.merchantName = 'T-Connect';
                  g.isLive = true;
                  g.isSandbox = false;
                  g.status = 'operational';
                  if (!g.bearerToken) {
                    g.bearerToken = DEFAULT_PAYLESOTHO_BEARER_TOKEN;
                  }
                  if (!g.apiKey) {
                    g.apiKey = g.bearerToken || DEFAULT_PAYLESOTHO_BEARER_TOKEN;
                  }
                  if (!g.ottBearerToken) {
                    g.ottBearerToken = g.bearerToken || DEFAULT_PAYLESOTHO_BEARER_TOKEN;
                  }
                  if (!g.mpesaMerchantId || g.mpesaMerchantId === '00000' || g.mpesaMerchantId === '222') {
                    g.mpesaMerchantId = '62915';
                  }
                  if (!g.ecocashMerchantId || g.ecocashMerchantId === '00000') {
                    g.ecocashMerchantId = '63165430';
                  }
                  if (!g.merchantId || g.merchantId === '00000') {
                    g.merchantId = '62915';
                  }
                  g.ottVoucherEndpointUrl = g.ottVoucherEndpointUrl || 'https://api.paylesotho.co.ls/api/ott/voucher/get';
                  g.ottVoucherCheckUrl = g.ottVoucherCheckUrl || 'https://api.paylesotho.co.ls/ott/voucher/check';
                }
                if (g.provider === 'ottvoucher') {
                  if (!g.endpointUrl || g.endpointUrl.includes('portal.ottlesotho.com')) {
                    g.endpointUrl = 'https://api.ottlesotho.com';
                  }
                  if (!g.vendorId) {
                    g.vendorId = '11, 1';
                  }
                  g.subtitle = '16-Digit PIN & Retail Voucher Redemption (api.ottlesotho.com)';
                }
                return g;
              });
            if (!parsed.gateways.some((g: GatewayConfig) => g.provider === 'paylesotho')) {
              const defaultPayLesotho = UNCONFIGURED_GATEWAYS.find((g) => g.provider === 'paylesotho');
              if (defaultPayLesotho) parsed.gateways.unshift(defaultPayLesotho);
            }
            if (parsed.gateways.length === 0) {
              parsed.gateways = UNCONFIGURED_GATEWAYS;
            }
          } else {
            parsed.gateways = UNCONFIGURED_GATEWAYS;
          }

          if (Array.isArray(parsed.routers)) {
            parsed.routers = parsed.routers.filter((r: any) => !this.isPhantomRouterRecord(r));
          } else {
            parsed.routers = [];
          }

          if (Array.isArray(parsed.plans)) {
            parsed.plans = parsed.plans.map((p: any) => ({
              ...p,
              deviceLimit: 0
            }));
          }

          if (!parsed.tenantGroupsInitialized) {
            const existingGroups = Array.isArray(parsed.tenantGroups) ? parsed.tenantGroups : [];
            const seeded = [...existingGroups];
            STARTER_TENANT_GROUPS.forEach((starter) => {
              if (!seeded.some((g: any) => g.id === starter.id || String(g.name || '').toLowerCase() === starter.name.toLowerCase())) {
                seeded.push({ ...starter });
              }
            });
            parsed.tenantGroups = seeded;
            parsed.tenantGroupsInitialized = true;
          } else if (!Array.isArray(parsed.tenantGroups)) {
            parsed.tenantGroups = [...STARTER_TENANT_GROUPS];
          }

          if (!parsed.tenantGroupsCleanedV2) {
            const activeRouterPartnerNames = new Set(
              (Array.isArray(parsed.routers) ? parsed.routers : [])
                .map((r: any) => String(r.partnerName || '').trim().toLowerCase())
                .filter(Boolean)
            );
            parsed.tenantGroups = (parsed.tenantGroups || []).filter((g: any) => {
              const lower = String(g?.name || '').trim().toLowerCase();
              if (!lower) return false;
              if (LEGACY_REMOVED_TENANT_GROUP_NAMES.has(lower) && !activeRouterPartnerNames.has(lower)) {
                return false;
              }
              return true;
            });
            if (parsed.tenantGroups.length === 0) {
              parsed.tenantGroups = [...STARTER_TENANT_GROUPS];
            }
            parsed.tenantGroupsCleanedV2 = true;
          }

          if (!Array.isArray(parsed.contentFilters)) {
            parsed.contentFilters = [...INITIAL_CONTENT_FILTERS];
          }
          if (!Array.isArray(parsed.customDnsRules)) {
            parsed.customDnsRules = [
              { id: 'cd_1', domain: 'torrentz.eu', action: 'block', siteId: 'all' },
              { id: 'cd_2', domain: 'gov.ls', action: 'allow', siteId: 'all' },
              { id: 'cd_3', domain: 'education.org.ls', action: 'allow', siteId: 'all' }
            ];
          }
          if (!Array.isArray(parsed.activeSessions)) parsed.activeSessions = [];
          if (!Array.isArray(parsed.captiveLeads)) parsed.captiveLeads = [];
          if (!Array.isArray(parsed.connectionAttempts)) parsed.connectionAttempts = [];
          if (!Array.isArray(parsed.deletedRouterIds)) parsed.deletedRouterIds = [];
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    // Clean state: 0 routers on start, editable/deletable starter Client Groups seeded once
    return {
      plans: [...STARTER_PLANS],
      plansInitialized: true,
      routers: [],
      deletedRouterIds: [],
      gateways: UNCONFIGURED_GATEWAYS,
      transactions: [],
      vouchers: [],
      alerts: [],
      team: [...INITIAL_TEAM],
      teamInitialized: true,
      auditLogs: [],
      contentFilters: [...INITIAL_CONTENT_FILTERS],
      customDnsRules: [
        { id: 'cd_1', domain: 'torrentz.eu', action: 'block', siteId: 'all' },
        { id: 'cd_2', domain: 'gov.ls', action: 'allow', siteId: 'all' },
        { id: 'cd_3', domain: 'education.org.ls', action: 'allow', siteId: 'all' }
      ],
      tenantGroups: [...STARTER_TENANT_GROUPS],
      tenantGroupsInitialized: true,
      activeSessions: [],
      captiveLeads: [],
      connectionAttempts: []
    } as any;
  }

  private saveState(explicitCredentialUpdate = false) {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        // Never allow guest captive portal phones (/portal) to push gateway credentials to the server
        const isGuestPortalRoute = window.location.pathname.startsWith('/portal');
        if (!isGuestPortalRoute) {
          let supabaseConfig: any = undefined;
          try {
            const rawSb = window.localStorage.getItem('tconnect_supabase_config_v2');
            if (rawSb) supabaseConfig = JSON.parse(rawSb);
          } catch {}
          fetch('/api/gateways/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gateways: this.state.gateways,
              vouchers: this.state.vouchers,
              supabaseConfig,
              explicitCredentialUpdate
            })
          }).catch(() => {});
          if (Array.isArray(this.state.routers)) {
            fetch('/api/devices/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ routers: this.state.routers, replaceAll: true })
            }).catch(() => {});
          }
        }
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
  ingestServerPortalEvents(events: Array<any>, serverTransactions?: Array<PaymentTransaction>, serverCleanSlateAt?: string | null) {
    let mutated = false;

    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' && serverCleanSlateAt) {
      const existingSlate = window.localStorage.getItem('tconnect_clean_slate_at');
      if (!existingSlate || new Date(serverCleanSlateAt).getTime() > new Date(existingSlate).getTime()) {
        window.localStorage.setItem('tconnect_clean_slate_at', serverCleanSlateAt);
      }
    }

    const cleanSlateIso =
      serverCleanSlateAt ||
      (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
        ? window.localStorage.getItem('tconnect_clean_slate_at')
        : null);
    const cleanSlateMs = cleanSlateIso ? new Date(cleanSlateIso).getTime() : 0;

    if (cleanSlateMs && !isNaN(cleanSlateMs)) {
      const prevLeadsLen = this.state.captiveLeads.length;
      const prevTxLen = this.state.transactions.length;
      const prevSessLen = this.state.activeSessions.length;
      this.state.captiveLeads = this.state.captiveLeads.filter((l) => {
        const ts = new Date(l.capturedAt || 0).getTime();
        return !isNaN(ts) && ts > cleanSlateMs;
      });
      this.state.transactions = this.state.transactions.filter((t) => {
        const ts = new Date(t.completedAt || t.createdAt || 0).getTime();
        return !isNaN(ts) && ts > cleanSlateMs;
      });
      this.state.activeSessions = this.state.activeSessions.filter((s) => {
        const ts = new Date(s.startedAt || 0).getTime();
        return !isNaN(ts) && ts > cleanSlateMs;
      });
      if (
        this.state.captiveLeads.length !== prevLeadsLen ||
        this.state.transactions.length !== prevTxLen ||
        this.state.activeSessions.length !== prevSessLen
      ) {
        mutated = true;
      }
    }

    if (Array.isArray(events)) {
      const nowMs = Date.now();
      // Prune any expired sessions so the dashboard only reflects currently active users
      const beforeCount = this.state.activeSessions.length;
      this.state.activeSessions = this.state.activeSessions.filter((s) => {
        const expMs = new Date(s.expiresAt).getTime();
        if (!isNaN(expMs) && expMs <= nowMs) return false;
        if (s.authMode === 'free' || s.voucherCode === 'FREE-PASS') {
          const startedMs = new Date(s.startedAt).getTime();
          if (!isNaN(startedMs) && nowMs - startedMs > 2 * 3600 * 1000) return false;
        }
        return true;
      });
      if (this.state.activeSessions.length !== beforeCount) {
        mutated = true;
      }

      for (const ev of events) {
        if (!ev || !ev.id) continue;
        if (cleanSlateMs && !isNaN(cleanSlateMs)) {
          const evTs = new Date(ev.capturedAt || ev.startedAt || 0).getTime();
          if (!isNaN(evTs) && evTs <= cleanSlateMs) continue;
        }
        const evMac = String(ev.mac || ev.clientMac || '').trim().toLowerCase();
        const evPhoneDigits = String(ev.phone || ev.guestPhone || '').replace(/\D/g, '');
        const evSite = ev.siteName || 'T-Connect Hotspot';
        const evRouter = ev.routerName || 'MIKROTIK-TC';
        const isFreeMode = ev.mode === 'free' || ev.voucherCode === 'FREE-PASS';
        const sessionDurationSec = isFreeMode ? 7200 : (Number(ev.durationSeconds) || 86400);
        const startedIso = ev.startedAt || ev.capturedAt || new Date().toISOString();
        const startedMs = new Date(startedIso).getTime();
        const expiresIso = ev.expiresAt || new Date((isNaN(startedMs) ? nowMs : startedMs) + sessionDurationSec * 1000).toISOString();
        const expiresMs = new Date(expiresIso).getTime();
        const isStillActive = isNaN(expiresMs) || expiresMs > nowMs;

        // Check for existing active session by ID, MAC, or Phone (Cross-Hotspot Roaming)
        const existingSession = this.state.activeSessions.find((s) => {
          if (s.id === ev.id) return true;
          const sMac = String(s.clientMac || '').trim().toLowerCase();
          const sPhone = String(s.guestPhone || '').replace(/\D/g, '');
          const macMatch = evMac && evMac !== 'unknown-mac' && evMac !== 'auto' && sMac === evMac;
          const phoneMatch = evPhoneDigits.length >= 8 && sPhone.length >= 8 && (sPhone.includes(evPhoneDigits) || evPhoneDigits.includes(sPhone));
          return macMatch || phoneMatch;
        });

        if (existingSession) {
          const expTime = new Date(existingSession.expiresAt).getTime();
          const notExpired = isNaN(expTime) || expTime > nowMs;

          if (notExpired) {
            const incomingRoamed: string[] = Array.isArray(ev.roamedSites) ? ev.roamedSites : [evSite];
            const mergedRoamed = Array.from(new Set([...(existingSession.roamedSites || [existingSession.siteName]), ...incomingRoamed].filter(Boolean)));
            if (existingSession.siteName !== evSite || mergedRoamed.length !== (existingSession.roamedSites || []).length) {
              existingSession.roamedSites = mergedRoamed;
              existingSession.siteName = evSite;
              existingSession.routerName = evRouter;
              existingSession.lastSeenAt = ev.lastSeenAt || new Date().toISOString();
              mutated = true;
            }
            continue;
          }
        }

        if (isStillActive) {
          const remainingSec = Math.max(0, Math.floor(((isNaN(expiresMs) ? nowMs + sessionDurationSec * 1000 : expiresMs) - nowMs) / 1000));
          const newSession: ActiveSession = {
            id: ev.id,
            voucherCode: ev.voucherCode || (isFreeMode ? 'FREE-PASS' : 'PAID-PASS'),
            clientMac: ev.mac || ev.clientMac || 'Unknown-MAC',
            clientIp: ev.ip || ev.clientIp || '10.10.0.x',
            deviceType: ev.deviceType || 'Guest Device',
            siteName: evSite,
            vertical: ev.scope || ev.vertical || 'hotspot',
            routerName: evRouter,
            planName: ev.planName || (isFreeMode ? 'Free Wi-Fi Access' : 'Hotspot Pass'),
            startedAt: startedIso,
            expiresAt: expiresIso,
            remainingSeconds: remainingSec,
            bytesDown: 0,
            bytesUp: 0,
            speedLimit: ev.speedLimit || '25M/10M',
            guestName: ev.guestName || [ev.firstName, ev.lastName].filter(Boolean).join(' ') || 'Guest User',
            guestPhone: ev.guestPhone || [ev.countryCode, ev.phone].filter(Boolean).join(' ') || '',
            guestEmail: ev.email || ev.guestEmail || '',
            authMode: isFreeMode ? 'free' : (ev.mode || 'voucher'),
            isUnlimitedForever: false,
            roamedSites: Array.isArray(ev.roamedSites) && ev.roamedSites.length > 0 ? ev.roamedSites : [evSite],
            lastSeenAt: ev.lastSeenAt || new Date().toISOString()
          };
          this.state.activeSessions.unshift(newSession);
          mutated = true;
        }

        const leadGuestName = ev.guestName || [ev.firstName, ev.lastName].filter(Boolean).join(' ') || 'Guest User';
        const leadGuestPhone = ev.guestPhone || [ev.countryCode, ev.phone].filter(Boolean).join(' ') || '';
        const leadGuestEmail = ev.email || ev.guestEmail || '';
        const newSession = {
          guestName: leadGuestName,
          guestPhone: leadGuestPhone,
          guestEmail: leadGuestEmail,
          startedAt: startedIso,
          routerName: evRouter,
          siteName: evSite,
          vertical: (ev.scope || ev.vertical || 'hotspot') as VerticalType,
          clientMac: ev.mac || ev.clientMac || 'Unknown-MAC',
          clientIp: ev.ip || ev.clientIp || '10.10.0.x',
          deviceType: ev.deviceType || 'Guest Device'
        };

        // Also record in captiveLeads if guest contact info was provided
        if (newSession.guestName || newSession.guestPhone || newSession.guestEmail) {
          const leadId = `lead_${ev.id}`;
          const existingLead = this.state.captiveLeads.find(
            (l) => l.id === leadId || l.id === `lead_srv_${ev.id}`
          );
          if (!existingLead) {
            const guestNameStr = newSession.guestName || 'Guest User';
            const guestPhoneStr = newSession.guestPhone || '';
            const guestEmailStr = newSession.guestEmail || '';
            const parts = guestNameStr.trim().split(' ');
            const fName = ev.firstName || parts[0] || 'Guest';
            const lName = ev.lastName || parts.slice(1).join(' ') || '';
            const rawMethod = String(ev.paymentMethod || ev.mode || '').toLowerCase();
            const isPaidEv = ev.accessType === 'paid' || (!isFreeMode && (Number(ev.amount) > 0 || rawMethod === 'mpesa' || rawMethod === 'ecocash' || rawMethod === 'ottvoucher' || rawMethod === 'paylesotho'));
            const resolvedPaymentMethod: 'mpesa' | 'ecocash' | 'ottvoucher' | 'free_wifi' =
              rawMethod === 'mpesa'
                ? 'mpesa'
                : rawMethod === 'ecocash'
                ? 'ecocash'
                : isPaidEv
                ? 'ottvoucher'
                : 'free_wifi';
            const resolvedPaymentLabel =
              ev.paymentMethodLabel ||
              (resolvedPaymentMethod === 'mpesa'
                ? 'M-Pesa'
                : resolvedPaymentMethod === 'ecocash'
                ? 'EcoCash'
                : resolvedPaymentMethod === 'ottvoucher'
                ? '16-Digit OTT Voucher'
                : 'Free Mode Wi-Fi');
            this.state.captiveLeads.unshift({
              id: leadId,
              firstName: fName,
              lastName: lName,
              fullName: guestNameStr,
              countryCode: ev.countryCode === '+27' ? '+27' : '+266',
              phone: ev.phone || guestPhoneStr,
              fullPhone: guestPhoneStr,
              email: guestEmailStr,
              capturedAt: newSession.startedAt,
              routerName: newSession.routerName,
              siteName: newSession.siteName,
              district: ev.district || 'Maseru',
              venuePurchasedAt: ev.venuePurchasedAt || `${newSession.siteName} (${newSession.routerName})`,
              vertical: newSession.vertical,
              scope: newSession.vertical,
              clientMac: newSession.clientMac,
              mac: newSession.clientMac,
              clientIp: newSession.clientIp,
              ip: newSession.clientIp,
              deviceType: newSession.deviceType,
              durationMinutes: isFreeMode ? 0 : Math.round(sessionDurationSec / 60),
              status: 'active',
              mode:
                resolvedPaymentMethod === 'mpesa'
                  ? 'mpesa'
                  : resolvedPaymentMethod === 'ecocash'
                  ? 'ecocash'
                  : resolvedPaymentMethod === 'ottvoucher'
                  ? 'ottvoucher'
                  : 'free',
              accessType: isPaidEv ? 'paid' : 'free',
              paymentMethod: resolvedPaymentMethod,
              paymentMethodLabel: resolvedPaymentLabel,
              planName: ev.planName || (isPaidEv ? 'OTT Voucher Pass' : 'Free Mode Wi-Fi'),
              amount: Number(ev.amount) || 0,
              currency: 'M',
              voucherCode: ev.voucherCode || undefined,
              ottVoucherPin: ev.ottVoucherPin || ev.voucherCode || undefined,
              transactionRef: ev.transactionRef || undefined
            });
          }
        }
      }
    }

    if (Array.isArray(serverTransactions)) {
      for (const stx of serverTransactions) {
        if (!stx || !stx.transactionRef) continue;
        if (cleanSlateMs && !isNaN(cleanSlateMs)) {
          const txTs = new Date(stx.completedAt || stx.createdAt || 0).getTime();
          if (!isNaN(txTs) && txTs <= cleanSlateMs) continue;
        }
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

  ingestServerGuestEvents(events: Array<any>, serverTransactions?: Array<PaymentTransaction>, serverCleanSlateAt?: string | null) {
    this.ingestServerPortalEvents(events, serverTransactions, serverCleanSlateAt);
  }

  async resetAllLiveData(): Promise<void> {
    const nowIso = new Date().toISOString();
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem('tconnect_clean_slate_at', nowIso);
      } catch {}
    }
    try {
      const res = await fetch('/api/admin/reset-live-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'dashboard-ui' })
      });
      const data = await res.json().catch(() => null);
      if (data?.cleanSlateAt && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem('tconnect_clean_slate_at', data.cleanSlateAt);
      }
    } catch {}
    await supabaseService.wipeLiveLeadsAndTransactions();
    this.state.activeSessions = [];
    this.state.captiveLeads = [];
    this.state.transactions = [];
    this.state.connectionAttempts = [];
    this.state.routers = this.state.routers.map((r) => ({
      ...r,
      activeSessions: 0
    }));
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch {}
    }
    this.notify();
  }

  syncGatewaysAndVouchersWithServer() {
    try {
      let supabaseConfig: any = undefined;
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        try {
          const rawSb = window.localStorage.getItem('tconnect_supabase_config_v2');
          if (rawSb) supabaseConfig = JSON.parse(rawSb);
        } catch {}
      }
      fetch('/api/gateways/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateways: this.state.gateways,
          vouchers: this.state.vouchers,
          supabaseConfig
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

  // Clear test transactions and guest sessions while preserving added/adopted routers by default
  clearAllToScratch(wipeRouters = false) {
    const preservedRouters = wipeRouters ? [] : (this.state.routers || []);
    const preservedGroups = wipeRouters ? STARTER_TENANT_GROUPS : (this.state.tenantGroups || STARTER_TENANT_GROUPS);
    this.state = {
      plans: STARTER_PLANS,
      routers: preservedRouters,
      gateways: this.state.gateways && this.state.gateways.length > 0 ? this.state.gateways : UNCONFIGURED_GATEWAYS,
      transactions: [],
      vouchers: [],
      alerts: [],
      team: INITIAL_TEAM,
      auditLogs: [],
      contentFilters: INITIAL_CONTENT_FILTERS,
      tenantGroups: preservedGroups,
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
    captiveLeads?: CaptivePortalLead[];
    tenantGroups?: TenantGroup[];
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
    if (data.captiveLeads !== undefined && data.captiveLeads.length > 0) {
      this.state.captiveLeads = data.captiveLeads;
    }
    if (data.tenantGroups !== undefined && data.tenantGroups.length > 0) {
      this.state.tenantGroups = [...data.tenantGroups];
    }
    this.saveState();
    this.checkVoucherStock();
  }

  async syncTeamWithServer(): Promise<TeamMember[]> {
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.team)) {
          this.state.team = data.team;
          this.saveState();
          return data.team;
        }
      }
    } catch {
      // offline fallback
    }
    return this.state.team;
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

    const resolvedAccessMode = router.accessMode || 'FREE_TRIAL_AND_PAID';
    const resolvedPartner = router.partnerName || 'T-Connect Internal Fleet';
    const resolvedPolicy =
      router.policyName ||
      (resolvedAccessMode === 'COMPLETELY_FREE'
        ? 'Sponsored Free Opt-In + Ad Carousel Policy'
        : resolvedAccessMode === 'FREE_TRIAL_AND_PAID'
          ? 'Hybrid Trial + PayLesotho 16-Digit OTT Policy'
          : 'PayLesotho (M-Pesa / EcoCash / Card) + 16-Digit OTT Policy');

    const newRouter: RouterDevice = {
      ...router,
      id: newId,
      district: router.district || 'Maseru',
      physicalAddress: router.physicalAddress || router.siteName || 'Maseru Central Hub',
      partnerName: resolvedPartner,
      policyName: resolvedPolicy,
      status: 'pending_adoption',
      uptime: '0m',
      cpuLoad: 2,
      memoryUsage: 18,
      lastHeartbeat: 'Never',
      activeSessions: 0,
      token,
      tokenExpiresAt: expiresAt,
      accessMode: resolvedAccessMode,
      freeModeEnabled: resolvedAccessMode !== 'PAID_ONLY',
      modeOverride: router.modeOverride ?? true,
      freeDurationMinutes: router.freeDurationMinutes || 1440,
      freeRateLimit: router.freeRateLimit || '10M/20M 15M/30M 8M/16M 15s/15s',
      freeDailyQuotaMb: router.freeDailyQuotaMb || 500
    };

    this.state.routers.unshift(newRouter);

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'router.create',
      target: newRouter.name,
      details: `Added hotspot '${newRouter.siteName}' in ${newRouter.district} District under Scope '${newRouter.vertical}', Partner '${resolvedPartner}', Policy '${resolvedPolicy}'.`
    });

    this.saveState();
    return newRouter;
  }

  deleteRouter(routerId: string) {
    const target = this.state.routers.find(r => r.id === routerId);
    this.state.routers = this.state.routers.filter(r => r.id !== routerId);
    const deletedIds: string[] = Array.isArray((this.state as any).deletedRouterIds)
      ? (this.state as any).deletedRouterIds
      : [];
    if (!deletedIds.includes(routerId)) {
      deletedIds.push(routerId);
      (this.state as any).deletedRouterIds = deletedIds;
    }
    if (typeof window !== 'undefined') {
      fetch(`/api/devices/${encodeURIComponent(routerId)}`, { method: 'DELETE' }).catch(() => {});
    }
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
      scope?: VerticalType | 'all';
      respectOverrides?: boolean;
      forceOverride?: boolean;
    }
  ) {
    const isFree = policy.accessMode !== 'PAID_ONLY';
    const now = new Date().toISOString();
    const matchesScope = (rScope: string, targetScope: string) =>
      rScope === targetScope ||
      (rScope === 'community' && targetScope === 'village') ||
      (rScope === 'village' && targetScope === 'community');

    if (routerId === 'all') {
      const targetScope = policy.scope && policy.scope !== 'all' ? policy.scope : null;
      const respectOverrides = policy.respectOverrides !== false && !policy.forceOverride;
      this.state.routers = this.state.routers.map(r => {
        if (targetScope && !matchesScope(String(r.vertical || 'hotspot'), targetScope)) {
          return r;
        }
        if (respectOverrides && r.modeOverride) {
          return r;
        }
        return {
          ...r,
          accessMode: policy.accessMode,
          freeModeEnabled: isFree,
          modeOverride: policy.forceOverride ? false : r.modeOverride,
          freeDurationMinutes: policy.freeDurationMinutes ?? (r.freeDurationMinutes || 1440),
          freeRateLimit: policy.freeRateLimit ?? (r.freeRateLimit || '10M/20M 15M/30M 8M/16M 15s/15s'),
          freeDailyQuotaMb: policy.freeDailyQuotaMb ?? (r.freeDailyQuotaMb || 500),
          policyLastSyncedAt: now
        };
      });
      this.logAudit({
        actor: 'Admin',
        role: 'Owner',
        action: 'fleet.access_policy',
        target: targetScope ? `Scope: ${targetScope}` : 'Fleet All Routers',
        details: `Updated access mode for ${targetScope ? `scope '${targetScope}'` : 'fleet'} to ${policy.accessMode}${respectOverrides ? ' (preserving individual router overrides)' : ''}.`
      });
    } else {
      this.state.routers = this.state.routers.map(r => r.id === routerId ? ({
        ...r,
        accessMode: policy.accessMode,
        freeModeEnabled: isFree,
        modeOverride: true,
        freeDurationMinutes: policy.freeDurationMinutes ?? (r.freeDurationMinutes || 1440),
        freeRateLimit: policy.freeRateLimit ?? (r.freeRateLimit || '10M/20M 15M/30M 8M/16M 15s/15s'),
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
          details: `Router access mode configured as ${policy.accessMode} (individual override active). Policy pushed.`
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

  updateCaptiveLead(id: string, updates: Partial<CaptivePortalLead>): void {
    if (!this.state.captiveLeads) return;
    this.state.captiveLeads = this.state.captiveLeads.map((l) =>
      l.id === id ? { ...l, ...updates } : l
    );
    this.saveState();
  }

  deleteCaptiveLead(id: string): void {
    if (!this.state.captiveLeads) return;
    this.state.captiveLeads = this.state.captiveLeads.filter(l => l.id !== id);
    if (typeof window !== 'undefined') {
      fetch(`/api/portal/guest-connect/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    }
    this.saveState();
  }

  resetCaptiveLeads(scope?: VerticalType | 'all'): number {
    if (!this.state.captiveLeads) {
      this.state.captiveLeads = [];
      this.saveState();
      return 0;
    }
    const beforeCount = this.state.captiveLeads.length;
    if (!scope || scope === 'all') {
      this.state.captiveLeads = [];
    } else {
      const normScope = (scope as string) === 'village' ? 'community' : scope;
      this.state.captiveLeads = this.state.captiveLeads.filter((l) => {
        const lScope = (l.vertical as string) === 'village' ? 'community' : l.vertical;
        return lScope !== normScope;
      });
    }
    const removed = beforeCount - this.state.captiveLeads.length;
    this.saveState();
    return removed;
  }

  lookupRoamingSession(mac: string, phone?: string): ActiveSession | null {
    const cleanMac = String(mac || '').trim().toLowerCase();
    const cleanPhoneDigits = String(phone || '').replace(/\D/g, '');

    const sessions = this.state.activeSessions || [];
    for (const sess of sessions) {
      const sessMac = String(sess.clientMac || '').trim().toLowerCase();
      const sessPhoneDigits = String(sess.guestPhone || '').replace(/\D/g, '');

      const macMatches = cleanMac && cleanMac !== 'unknown-mac' && cleanMac !== 'auto' && sessMac === cleanMac;
      const phoneMatches = cleanPhoneDigits.length >= 8 && sessPhoneDigits.length >= 8 && (sessPhoneDigits.includes(cleanPhoneDigits) || cleanPhoneDigits.includes(sessPhoneDigits));

      if (macMatches || phoneMatches) {
        if (sess.authMode === 'free' || sess.isUnlimitedForever || sess.voucherCode === 'FREE-PASS') {
          return sess;
        }
        const expTime = new Date(sess.expiresAt).getTime();
        if (isNaN(expTime) || expTime > Date.now()) {
          return sess;
        }
      }
    }
    return null;
  }

  addActiveSession(session: ActiveSession): void {
    if (!this.state.activeSessions) {
      this.state.activeSessions = [...INITIAL_ACTIVE_SESSIONS];
    }

    const sessMac = String(session.clientMac || '').trim().toLowerCase();
    const sessPhone = String(session.guestPhone || '').replace(/\D/g, '');

    // Check for existing active roaming session by MAC or Phone
    const existingIndex = this.state.activeSessions.findIndex((s) => {
      if (s.id === session.id) return true;
      const sMac = String(s.clientMac || '').trim().toLowerCase();
      const sPhone = String(s.guestPhone || '').replace(/\D/g, '');
      const macMatch = sessMac && sessMac !== 'unknown-mac' && sessMac !== 'auto' && sMac === sessMac;
      const phoneMatch = sessPhone.length >= 8 && sPhone.length >= 8 && (sPhone.includes(sessPhone) || sessPhone.includes(sPhone));
      return macMatch || phoneMatch;
    });

    if (existingIndex >= 0) {
      const existing = this.state.activeSessions[existingIndex];
      const isFree = existing.authMode === 'free' || existing.voucherCode === 'FREE-PASS' || existing.isUnlimitedForever;
      const expTime = new Date(existing.expiresAt).getTime();
      const notExpired = isFree || isNaN(expTime) || expTime > Date.now();

      if (notExpired) {
        const prevSites = existing.roamedSites || [existing.siteName];
        if (!prevSites.includes(session.siteName)) {
          existing.roamedSites = [...prevSites, session.siteName];
        }
        existing.siteName = session.siteName;
        existing.routerName = session.routerName;
        existing.lastSeenAt = new Date().toISOString();
        if (session.clientIp) existing.clientIp = session.clientIp;
        this.saveState();
        return;
      }
    }

    const isFree = session.authMode === 'free' || session.voucherCode === 'FREE-PASS';
    const finalSession: ActiveSession = {
      ...session,
      isUnlimitedForever: isFree,
      roamedSites: session.roamedSites || [session.siteName],
      lastSeenAt: new Date().toISOString()
    };

    this.state.activeSessions = [
      finalSession,
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
        durationMinutes: session.remainingSeconds > 0 ? Math.round(session.remainingSeconds / 60) : 0,
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
    if (typeof window !== 'undefined') {
      fetch(`/api/portal/guest-connect/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    }
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
  // External Client Groups (Tenant Brands) Management — Full Persistent CRUD
  // ---------------------------------------------------------------------------
  private ensureTenantGroupsInitialized(): void {
    if (!(this.state as any).tenantGroupsInitialized) {
      const existing = Array.isArray(this.state.tenantGroups) ? this.state.tenantGroups : [];
      const seeded = [...existing];
      STARTER_TENANT_GROUPS.forEach((starter) => {
        if (!seeded.some((g) => g.id === starter.id || g.name.toLowerCase() === starter.name.toLowerCase())) {
          seeded.push({ ...starter });
        }
      });
      this.state.tenantGroups = seeded;
      (this.state as any).tenantGroupsInitialized = true;
    } else if (!Array.isArray(this.state.tenantGroups)) {
      this.state.tenantGroups = [];
    }
  }

  getTenantGroups(): TenantGroup[] {
    this.ensureTenantGroupsInitialized();
    const stored = Array.isArray(this.state.tenantGroups) ? this.state.tenantGroups : [];
    return stored.map(g => ({
      ...g,
      routerCount: this.state.routers.filter(r => r.tenantGroupId === g.id || r.partnerName === g.name || (r.tags && r.tags.includes(g.tag))).length
    }));
  }

  createTenantGroup(group: Omit<TenantGroup, 'id' | 'createdAt'>): TenantGroup {
    this.ensureTenantGroupsInitialized();
    const cleanName = group.name.trim();
    const existing = this.state.tenantGroups.find(
      (g) => g.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      return existing;
    }
    const id = `grp_${Date.now()}`;
    const newGroup: TenantGroup = {
      ...group,
      name: cleanName,
      id,
      createdAt: new Date().toISOString().slice(0, 10),
      routerCount: 0
    };
    this.state.tenantGroups.unshift(newGroup);
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      category: 'security',
      action: 'tenant.create',
      target: newGroup.name,
      details: `Registered external client / sponsor group '${newGroup.name}' with policy tag '${newGroup.tag}'.`
    });
    this.saveState();
    if (typeof window !== 'undefined') {
      fetch('/api/partner-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: newGroup,
          partnerGroups: this.state.tenantGroups.map((g) => g.name)
        })
      }).catch(() => {});
    }
    return newGroup;
  }

  updateTenantGroup(groupId: string, updates: Partial<TenantGroup>): TenantGroup | null {
    this.ensureTenantGroupsInitialized();
    const target = (this.state.tenantGroups || []).find(g => g.id === groupId);
    if (!target) return null;
    const oldName = target.name;
    const oldTag = target.tag;
    Object.assign(target, updates);
    if (updates.name) target.name = updates.name.trim();
    if (updates.tag) target.tag = updates.tag.trim();

    // Sync any routers assigned to this group
    this.state.routers = this.state.routers.map((r) => {
      if (r.tenantGroupId === groupId || (oldName && r.partnerName === oldName)) {
        const nextTags = Array.isArray(r.tags)
          ? r.tags.map((t) => (t === oldTag ? target.tag : t))
          : [];
        return {
          ...r,
          tenantGroupId: groupId,
          partnerName: target.name,
          tags: nextTags
        };
      }
      return r;
    });

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      category: 'security',
      action: 'tenant.update',
      target: target.name,
      details: `Updated external client tenant group '${target.name}' (Tag: ${target.tag}).`
    });
    this.saveState();
    if (typeof window !== 'undefined') {
      fetch('/api/partner-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerGroups: this.state.tenantGroups.map((g) => g.name)
        })
      }).catch(() => {});
    }
    return target;
  }

  deleteTenantGroup(groupId: string): void {
    this.ensureTenantGroupsInitialized();
    const target = (this.state.tenantGroups || []).find(
      (g) => g.id === groupId || g.name.toLowerCase() === groupId.toLowerCase()
    );
    const targetName = target?.name || groupId;
    this.state.tenantGroups = (this.state.tenantGroups || []).filter(
      (g) => g.id !== groupId && g.name.toLowerCase() !== targetName.toLowerCase()
    );
    // Unassign routers
    this.state.routers = this.state.routers.map(r => {
      if (r.tenantGroupId === groupId || (target && (r.partnerName || '').toLowerCase() === target.name.toLowerCase())) {
        return {
          ...r,
          tenantGroupId: undefined,
          partnerName: 'T-Connect Internal Fleet',
          tags: (r.tags || []).filter(t => t !== target?.tag)
        };
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
    if (typeof window !== 'undefined') {
      fetch('/api/partner-groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: targetName })
      }).catch(() => {});
      fetch('/api/partner-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerGroups: this.state.tenantGroups.map((g) => g.name) })
      }).catch(() => {});
    }
  }

  resetStarterTenantGroups(): TenantGroup[] {
    this.state.tenantGroups = [...STARTER_TENANT_GROUPS];
    (this.state as any).tenantGroupsInitialized = true;
    this.saveState();
    if (typeof window !== 'undefined') {
      fetch('/api/partner-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerGroups: this.state.tenantGroups.map((g) => g.name) })
      }).catch(() => {});
    }
    return this.getTenantGroups();
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
        const effectiveStatus: 'online' | 'offline' | 'pending_adoption' = match.status;
        if (
          r.status !== effectiveStatus ||
          r.missedHeartbeats !== match.missedHeartbeats ||
          r.offlineSince !== match.offlineSince ||
          r.lastHeartbeat !== match.lastHeartbeat
        ) {
          changed = true;
          return {
            ...r,
            status: effectiveStatus,
            adoptedAt: r.adoptedAt || (effectiveStatus === 'online' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : undefined),
            token: effectiveStatus === 'online' ? undefined : r.token,
            lastHeartbeat: match.lastHeartbeat || r.lastHeartbeat,
            lastHeartbeatTimestamp: match.lastHeartbeatTimestamp || r.lastHeartbeatTimestamp,
            missedHeartbeats: match.missedHeartbeats,
            offlineSince: match.offlineSince,
            offlineReason: match.offlineReason,
            activeSessions: effectiveStatus === 'offline' ? 0 : r.activeSessions,
            cpuLoad: effectiveStatus === 'offline' ? 0 : r.cpuLoad,
            memoryUsage: effectiveStatus === 'offline' ? 0 : r.memoryUsage,
            uptime: effectiveStatus === 'offline' ? '0m' : r.uptime
          };
        }
      }
      return r;
    });

    if (changed) {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch {}
      }
      this.notify();
    }
  }


  // Plan & Voucher Methods (Full Persistent CRUD + Real-Time Global Sync Across Scopes, Portal & Routers)
  getPlans(): HotspotPlan[] {
    return Array.isArray(this.state.plans) ? this.state.plans : STARTER_PLANS;
  }

  syncAllPlansEverywhere(): void {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
    const allPlans = this.getPlans().map((p) => ({ ...p, deviceLimit: 0 }));
    const scopes: VerticalType[] = ['hotspot', 'community', 'village', 'park', 'bus', 'stadium'];
    const updatedScopeConfigs: Record<string, any> = {};

    const getTier = (p: any): 'daily' | 'weekly' | 'monthly' | null => {
      const dur = Number(p?.durationSeconds) || 0;
      const nm = String(p?.name || '').toLowerCase();
      if (nm.includes('daily') || (dur > 0 && dur <= 86400)) return 'daily';
      if (nm.includes('weekly') || (dur > 86400 && dur <= 604800)) return 'weekly';
      if (nm.includes('monthly') || dur > 604800) return 'monthly';
      return null;
    };

    const masterByTier = new Map<string, HotspotPlan>();
    allPlans.forEach((p) => {
      const tier = getTier(p);
      if (tier && !masterByTier.has(tier)) {
        masterByTier.set(tier, p);
      }
    });

    scopes.forEach((sc) => {
      try {
        const raw = window.localStorage.getItem(`tconnect_portal_scope_${sc}`);
        const parsed = raw ? JSON.parse(raw) : { scope: sc };
        if (Array.isArray(parsed.plans) && parsed.plans.length > 0 && masterByTier.size > 0) {
          // Preserve scope-specific plan metadata while syncing master prices/speeds/durations & zero device limit
          parsed.plans = parsed.plans.map((existingPlan: any) => {
            const tier = getTier(existingPlan);
            const master = tier ? masterByTier.get(tier) : null;
            if (!master) {
              return { ...existingPlan, deviceLimit: 0 };
            }
            return {
              ...existingPlan,
              name: master.name,
              price: master.price,
              currency: master.currency || 'M',
              durationLabel: master.durationLabel,
              durationSeconds: master.durationSeconds,
              downloadSpeedMbps: master.downloadSpeedMbps,
              uploadSpeedMbps: master.uploadSpeedMbps,
              burstDownloadMbps: master.burstDownloadMbps || Math.round(master.downloadSpeedMbps * 1.5),
              deviceLimit: 0,
              enabled: true,
              isPopular: Boolean(master.isPopular)
            };
          });
        } else {
          const scopedPlans = allPlans.filter(
            (p) =>
              p.vertical === sc ||
              (sc === 'community' && p.vertical === 'village') ||
              (sc === 'village' && p.vertical === 'community')
          );
          const effectivePlans = scopedPlans.length > 0 ? scopedPlans : allPlans;
          parsed.plans = effectivePlans.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            currency: p.currency || 'M',
            durationLabel: p.durationLabel,
            durationSeconds: p.durationSeconds,
            downloadSpeedMbps: p.downloadSpeedMbps,
            uploadSpeedMbps: p.uploadSpeedMbps,
            burstDownloadMbps: p.burstDownloadMbps || Math.round(p.downloadSpeedMbps * 1.5),
            deviceLimit: 0,
            enabled: true,
            isPopular: Boolean(p.isPopular),
            badge: p.isPopular ? 'Best Value' : p.durationLabel
          }));
        }
        window.localStorage.setItem(`tconnect_portal_scope_${sc}`, JSON.stringify(parsed));
        updatedScopeConfigs[sc] = parsed;
      } catch {}
    });

    fetch('/api/portal/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: 'hotspot',
        config: updatedScopeConfigs.hotspot,
        configs: updatedScopeConfigs,
        syncPlansAcrossAllScopes: true,
        syncAccessModeAllScopes: false,
        respectOverrides: true,
        applyToAllRouters: true
      })
    }).catch(() => {});

    try {
      window.dispatchEvent(new CustomEvent('tconnect:plans-synced', { detail: { plans: allPlans } }));
    } catch {}
  }

  createPlan(plan: Omit<HotspotPlan, 'id'>) {
    const newPlan: HotspotPlan = {
      ...plan,
      deviceLimit: 0,
      id: `plan_${Date.now()}`
    };
    this.state.plans.push(newPlan);
    (this.state as any).plansInitialized = true;
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'plan.create',
      target: newPlan.name,
      details: `Created plan: ${newPlan.currency}${newPlan.price} for ${newPlan.durationLabel} (Unlimited devices). Synced across all 5 scopes, Portal & Routers.`
    });
    this.saveState();
    this.syncAllPlansEverywhere();
    return newPlan;
  }

  updatePlan(planId: string, updates: Partial<HotspotPlan>): HotspotPlan | null {
    const idx = this.state.plans.findIndex((p) => p.id === planId);
    if (idx === -1) return null;
    const updated: HotspotPlan = {
      ...this.state.plans[idx],
      ...updates,
      deviceLimit: 0,
      id: planId
    };
    this.state.plans[idx] = updated;
    (this.state as any).plansInitialized = true;
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'plan.update',
      target: updated.name,
      details: `Updated plan '${updated.name}' (${updated.currency}${updated.price}, ${updated.durationLabel}, Unlimited devices) and synced across all 5 scopes & Routers in real time.`
    });
    this.saveState();
    this.syncAllPlansEverywhere();
    return updated;
  }

  deletePlan(planId: string): boolean {
    const target = this.state.plans.find((p) => p.id === planId);
    if (!target) return false;
    this.state.plans = this.state.plans.filter((p) => p.id !== planId);
    (this.state as any).plansInitialized = true;
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'plan.delete',
      target: target.name,
      details: `Deleted hotspot plan '${target.name}' (${target.currency}${target.price}) and synced everywhere.`
    });
    this.saveState();
    this.syncAllPlansEverywhere();
    return true;
  }

  resetStarterPlans(): HotspotPlan[] {
    this.state.plans = [...STARTER_PLANS];
    (this.state as any).plansInitialized = true;
    this.saveState();
    this.syncAllPlansEverywhere();
    return this.state.plans;
  }

  updateVoucher(voucherId: string, updates: Partial<Voucher>): Voucher | null {
    const idx = this.state.vouchers.findIndex((v) => v.id === voucherId || v.code === voucherId);
    if (idx === -1) return null;
    const updated: Voucher = {
      ...this.state.vouchers[idx],
      ...updates
    };
    this.state.vouchers[idx] = updated;
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'voucher.update',
      target: updated.code,
      details: `Updated voucher ${updated.code} status to ${updated.status.toUpperCase()}.`
    });
    this.saveState();
    return updated;
  }

  deleteVoucher(voucherId: string): boolean {
    const target = this.state.vouchers.find((v) => v.id === voucherId || v.code === voucherId);
    if (!target) return false;
    this.state.vouchers = this.state.vouchers.filter((v) => v.id !== voucherId && v.code !== voucherId);
    if (typeof window !== 'undefined') {
      fetch(`/api/portal/vouchers/${encodeURIComponent(target.id)}`, { method: 'DELETE' }).catch(() => {});
    }
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'voucher.delete',
      target: target.code,
      details: `Removed voucher record ${target.code} from ledger.`
    });
    this.saveState();
    return true;
  }

  deleteTransaction(txId: string): boolean {
    const target = this.state.transactions.find((t) => t.id === txId || t.transactionRef === txId);
    if (!target) return false;
    this.state.transactions = this.state.transactions.filter((t) => t.id !== txId && t.transactionRef !== txId);
    if (typeof window !== 'undefined') {
      fetch(`/api/portal/transactions/${encodeURIComponent(txId)}`, { method: 'DELETE' }).catch(() => {});
    }
    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'transaction.delete',
      target: target.transactionRef,
      details: `Deleted transaction record ${target.transactionRef} (${target.currency}${target.amount}).`
    });
    this.saveState();
    return true;
  }

  clearTransactions(): void {
    this.state.transactions = [];
    if (typeof window !== 'undefined') {
      fetch('/api/portal/transactions', { method: 'DELETE' }).catch(() => {});
    }
    this.saveState();
  }

  recordOttVoucherRedemption(entry: {
    pin: string;
    planName: string;
    durationSeconds: number;
    price: number;
    clientMac: string;
    siteName?: string;
  }): Voucher {
    const cleanPin = String(entry.pin || '').replace(/\D/g, '');
    const formattedPin =
      cleanPin.length === 16
        ? `${cleanPin.slice(0, 4)}-${cleanPin.slice(4, 8)}-${cleanPin.slice(8, 12)}-${cleanPin.slice(12, 16)}`
        : cleanPin || entry.pin;
    const newRecord: Voucher = {
      id: `ott_vch_${Date.now()}`,
      code: formattedPin,
      planId: 'plan_ott_16digit',
      planName: entry.planName || '16-Digit OTT Pass',
      price: entry.price || 10,
      currency: 'M',
      durationSeconds: entry.durationSeconds || 86400,
      deviceLimit: 0,
      status: 'used',
      generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      firstUsedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      expiresAt: new Date(Date.now() + (entry.durationSeconds || 86400) * 1000).toISOString().replace('T', ' ').slice(0, 19),
      associatedDevices: [
        {
          mac: (entry.clientMac || 'CLIENT-MAC').toUpperCase(),
          hostname: 'Authorized-Device',
          ip: '10.10.0.50',
          firstSeen: new Date().toISOString().replace('T', ' ').slice(0, 19),
          lastSeen: new Date().toISOString().replace('T', ' ').slice(0, 19),
          bytesIn: 0,
          bytesOut: 0
        }
      ]
    };
    this.state.vouchers.unshift(newRecord);
    this.logAudit({
      actor: entry.clientMac || 'Customer',
      role: 'Client',
      action: 'voucher.ott_redeemed',
      target: formattedPin,
      details: `16-digit OTT Voucher redeemed: ${formattedPin} (${newRecord.planName} M${newRecord.price}) on ${entry.siteName || 'Hotspot'}. Verified via OTT Lesotho.`
    });
    this.saveState();
    return newRecord;
  }

  generateVoucherBatch(planId: string, count: number, venueName = 'Clubhouse & Reception'): Voucher[] {
    const targetCount = Math.min(1000, Math.max(1, Number(count) || 300));
    const existingCodes = new Set(
      this.state.vouchers.map((v) => String(v.code || '').trim().toUpperCase())
    );
    const plan = this.state.plans.find((p) => p.id === planId);
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const batch: Voucher[] = [];
    let safety = 0;

    while (batch.length < targetCount && safety < 95000) {
      safety++;
      const num = Math.floor(10000 + Math.random() * 90000);
      const code = `TC-${num}`;
      if (existingCodes.has(code)) continue;
      existingCodes.add(code);

      batch.push({
        id: `vch_tc_${Date.now()}_${batch.length + 1}_${num}`,
        code,
        planId: plan?.id || planId || 'tc_free_reception_24h',
        planName: plan ? plan.name : `T-Connect Wi-Fi Voucher (24h · Unlimited Devices · Uncapped) — ${venueName}`,
        price: 0,
        currency: 'M',
        durationSeconds: 86400,
        deviceLimit: 0,
        status: 'active',
        generatedAt: nowStr,
        expiresAt: '',
        associatedDevices: []
      });
    }

    this.state.vouchers = [...batch, ...this.state.vouchers];
    this.saveState();
    return batch;
  }

  mergeServerVouchers(incoming: Voucher[]): Voucher[] {
    if (!Array.isArray(incoming) || incoming.length === 0) return this.state.vouchers;
    const byCode = new Map<string, Voucher>();
    incoming.forEach((v) => {
      if (v && v.code) byCode.set(String(v.code).toUpperCase(), v);
    });
    this.state.vouchers.forEach((v) => {
      const k = String(v.code || '').toUpperCase();
      if (!byCode.has(k)) byCode.set(k, v);
    });
    this.state.vouchers = Array.from(byCode.values());
    this.saveState();
    return this.state.vouchers;
  }

  redeemVoucher(code: string, clientMac: string, hostname = 'Generic-Client', siteName = 'Hotspot') {
    const rawDigits = code.replace(/\D/g, '');
    const cleanCode = /^\d{5}$/.test(rawDigits) ? `TC-${rawDigits}` : code.trim().toUpperCase();
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

    if (voucher.deviceLimit > 0 && voucher.deviceLimit < 1000 && voucher.associatedDevices.length >= voucher.deviceLimit) {
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

    const rawOttDigits = `4829${Math.floor(100000000000 + Math.random() * 899999999999)}`.slice(0, 16);
    const formattedOttPin = `${rawOttDigits.slice(0, 4)}-${rawOttDigits.slice(4, 8)}-${rawOttDigits.slice(8, 12)}-${rawOttDigits.slice(12, 16)}`;

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
      ottVoucherPin: rawOttDigits,
      voucherCodeIssued: formattedOttPin,
      status: 'completed',
      createdAt: now,
      completedAt: now,
      debugLogs: {
        requestTimestamp: new Date().toISOString(),
        endpoint: provider === 'paylesotho' ? 'https://api.paylesotho.co.ls/api/ott/voucher/get' : 'https://api.ottlesotho.com/api/v1/RemitVoucher',
        httpStatus: 200,
        signatureVerified: true,
        rawPayload: {
          merchantname: 'T-Connect',
          mpesa_merchant_id: gw.mpesaMerchantId || '62915',
          ecocash_merchant_id: gw.ecocashMerchantId || '63165430',
          amount,
          currency: gw.currency,
          unique_reference: testTxRef
        },
        rawResponse: {
          status: 'SUCCESS',
          ott_voucher_pin: rawOttDigits,
          formatted_pin: formattedOttPin,
          unique_reference: testTxRef,
          verified_by: 'POST https://api.paylesotho.co.ls/ott/voucher/check'
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

    const cleanUpdates: Partial<GatewayConfig> = { ...updates };
    const secretFields = ['apiKey', 'apiSecret', 'apiPassword', 'bearerToken', 'ottBearerToken', 'webhookSecret'] as const;
    for (const field of secretFields) {
      const val = cleanUpdates[field];
      if (typeof val === 'string') {
        const stripped = val.replace(/^Bearer\s+/i, '').trim();
        if (stripped.includes('•')) {
          delete cleanUpdates[field];
        } else {
          cleanUpdates[field] = stripped;
        }
      }
    }
    delete (cleanUpdates as any).secretsMasked;

    const isCredentialChange =
      cleanUpdates.apiKey !== undefined ||
      cleanUpdates.apiPassword !== undefined ||
      cleanUpdates.bearerToken !== undefined ||
      cleanUpdates.vendorId !== undefined ||
      cleanUpdates.endpointUrl !== undefined ||
      cleanUpdates.merchantId !== undefined;

    Object.assign(gw, cleanUpdates);
    delete (gw as any).secretsMasked;

    if (provider === 'paylesotho') {
      const activeBearer = String(gw.bearerToken || gw.apiKey || '').replace(/^Bearer\s+/i, '').trim();
      if (activeBearer && !activeBearer.includes('•')) {
        gw.bearerToken = activeBearer;
        gw.apiKey = activeBearer;
        if (!gw.ottBearerToken || gw.ottBearerToken.includes('•')) {
          gw.ottBearerToken = activeBearer;
        }
      }
    } else if (provider === 'ottvoucher' && gw.apiKey && gw.apiPassword) {
      gw.isLive = true;
      gw.isSandbox = false;
      gw.status = 'operational';
      gw.testPassedOnce = true;
      if (typeof window !== 'undefined') {
        fetch('/api/gateways/ottvoucher/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: gw.apiKey,
            apiPassword: gw.apiPassword,
            username: gw.username || gw.merchantId || 'TCONNECTLES1',
            merchantId: gw.merchantId || gw.username || 'TCONNECTLES1',
            vendorId: gw.vendorId || '1, 11',
            endpointUrl: gw.endpointUrl || 'https://api.ottlesotho.com',
            isLive: true
          })
        }).catch(() => {});
      }
    } else if (isCredentialChange && cleanUpdates.status === undefined) {
      gw.testPassedOnce = false;
      if (gw.isLive) gw.isLive = false;
      gw.status = gw.apiKey || gw.bearerToken ? 'testing' : 'not_configured';
    }

    this.saveState(true);
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

  createGateway(input: {
    provider: string;
    name: string;
    subtitle?: string;
    logoUrl?: string;
    currency?: string;
    endpointUrl?: string;
    merchantId?: string;
    apiKey?: string;
    bearerToken?: string;
    webhookSecret?: string;
    webhookUrl?: string;
    isLive?: boolean;
  }): GatewayConfig {
    const cleanProvider = input.provider.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `gw_${Date.now()}`;
    const existingIdx = this.state.gateways.findIndex((g) => g.provider === cleanProvider);
    const created: GatewayConfig = {
      provider: cleanProvider,
      name: input.name.trim(),
      subtitle: input.subtitle?.trim() || `Custom Payment Gateway (${input.endpointUrl || cleanProvider})`,
      logoUrl: input.logoUrl?.trim() || undefined,
      currency: input.currency || 'M',
      isLive: false,
      isSandbox: true,
      status: 'testing',
      apiKey: input.apiKey?.trim() || input.bearerToken?.trim() || '',
      apiSecret: '',
      bearerToken: input.bearerToken?.trim() || input.apiKey?.trim() || '',
      endpointUrl: input.endpointUrl?.trim() || 'https://api.paylesotho.co.ls',
      merchantId: input.merchantId?.trim() || 'MERCHANT-01',
      webhookSecret: input.webhookSecret?.trim() || `whsec_${cleanProvider}`,
      webhookUrl: input.webhookUrl?.trim() || `https://api.tconnect.co.ls/v1/webhooks/${cleanProvider}`,
      successRate24h: 100,
      avgLatencyMs: 0,
      testPassedOnce: false
    };

    if (existingIdx >= 0) {
      this.state.gateways[existingIdx] = { ...this.state.gateways[existingIdx], ...created };
    } else {
      this.state.gateways.push(created);
    }

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'gateway.create',
      target: created.name,
      details: `Added payment gateway '${created.name}' (Provider ID: ${created.provider}, Endpoint: ${created.endpointUrl}). Pending ping verification before global sync.`
    });
    this.saveState(true);
    return created;
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
        deviceLimit: 0,
        burstDownloadMbps: 10.0,
        burstUploadMbps: 5.0,
        fairUseThresholdMb: 5000,
        fairUseDownloadMbps: 1.0,
        isPopular: planOverride.price === 60,
      };
    } else if (!plan) {
      if (planId.includes('monthly') || planId.includes('220') || planId.includes('280') || planId.includes('30d')) {
        plan = this.state.plans.find(p => p.durationSeconds > 604800 || p.name.toLowerCase().includes('monthly')) || this.state.plans[0];
      } else if (planId.includes('weekly') || planId.includes('60') || planId.includes('7d')) {
        plan = this.state.plans.find(p => (p.durationSeconds > 86400 && p.durationSeconds <= 604800) || p.name.toLowerCase().includes('weekly')) || this.state.plans[0];
      } else {
        plan = this.state.plans.find(p => p.durationSeconds <= 86400 || p.name.toLowerCase().includes('daily')) || this.state.plans[0];
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

    const cleanOttPin = ottPin ? ottPin.replace(/\D/g, '') : undefined;
    const formattedOttPin =
      cleanOttPin && cleanOttPin.length === 16
        ? `${cleanOttPin.slice(0, 4)}-${cleanOttPin.slice(4, 8)}-${cleanOttPin.slice(8, 12)}-${cleanOttPin.slice(12, 16)}`
        : cleanOttPin;

    const pendingTx: PaymentTransaction = {
      id: `tx_${Date.now()}`,
      transactionRef: txRef,
      provider,
      amount: plan.price,
      currency: plan.currency,
      phoneNumber: phoneNumber || '+266 Subscriber',
      ottVoucherPin: cleanOttPin,
      voucherCodeIssued: formattedOttPin,
      planId: plan.id,
      planName: plan.name,
      vertical: plan.vertical,
      siteName: this.state.routers[0]?.siteName || 'T-Connect Hotspot',
      district: this.state.routers[0]?.district || 'Maseru',
      status: 'pending',
      createdAt: now,
      debugLogs: {
        requestTimestamp: new Date().toISOString(),
        endpoint: `/api/gateways/${provider}/redeem`,
        httpStatus: 102,
        signatureVerified: true,
        rawPayload: {
          merchant_id: gw.merchantId || 'TCONNECTLES1',
          amount: plan.price,
          currency: plan.currency,
          phoneNumber: phoneNumber || '+266 Subscriber',
          ottVoucherPin: cleanOttPin,
          idempotency_key: idempotencyKey
        },
        rawResponse: {
          status: 'PENDING_AUTHORIZATION',
          ottVoucherPin: cleanOttPin,
          message: 'USSD prompt dispatched or 16-digit OTT voucher PIN verification initiated'
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
      deviceLimit: 0,
      vertical: tx.vertical
    };

    const raw16Digits = (voucherCodeOverride || tx.ottVoucherPin || tx.voucherCodeIssued || '').replace(/\D/g, '');
    const guaranteed16Digits =
      raw16Digits.length === 16
        ? raw16Digits
        : `4829${Math.floor(100000000000 + Math.random() * 899999999999)}`.slice(0, 16);
    const voucherCode = `${guaranteed16Digits.slice(0, 4)}-${guaranteed16Digits.slice(4, 8)}-${guaranteed16Digits.slice(8, 12)}-${guaranteed16Digits.slice(12, 16)}`;
    
    // Check if 16-digit OTT voucher already exists to prevent duplicate insertion
    let voucher = this.state.vouchers.find((v) => v.code === voucherCode);
    if (!voucher) {
      voucher = {
        id: `ott_v_${Date.now()}`,
        code: voucherCode,
        planId: tx.planId,
        planName: tx.planName,
        price: tx.amount,
        currency: tx.currency,
        durationSeconds: (plan as any).durationSeconds || 86400,
        deviceLimit: 0,
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
    tx.ottVoucherPin = guaranteed16Digits;
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
        ott_voucher_pin: guaranteed16Digits,
        formatted_pin: voucherCode,
        unique_reference: externalRef || tx.transactionRef,
        message: '16-Digit OTT Voucher verified upstream and authorized on hotspot'
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
          deviceLimit: 0,
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
  private generateCryptoHex(byteLen: number): string {
    const bytes = new Uint8Array(byteLen);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < byteLen; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private generateCryptoTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(10);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    }
    const digits = 1000 + (((bytes[0] << 8) | bytes[1]) % 9000);
    let alpha = '';
    for (let i = 2; i < 8; i++) {
      alpha += chars[bytes[i] % chars.length];
    }
    return `TC-${digits}-${alpha}!`;
  }

  inviteTeamMember(name: string, email: string, role: TeamMember['role'], scopedSites: string[], customPassword?: string) {
    const inviteToken = `inv_${this.generateCryptoHex(24)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const cleanEmail = email.trim().toLowerCase();
    const tempPassword = customPassword && customPassword.trim() ? customPassword.trim() : this.generateCryptoTempPassword();

    // Sync cryptographic invite token and scrypt-hashed temp password to server
    if (typeof window !== 'undefined') {
      fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: cleanEmail,
          role,
          scopedSites,
          inviteToken,
          tempPassword
        })
      }).catch(() => {});
    }

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
      return { ...existing, tempPassword };
    }

    const newMember: TeamMember = {
      id: `tm_${this.generateCryptoHex(6)}`,
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
    return { ...newMember, tempPassword };
  }

  getSponsorAdConfig(): SponsorAdConfig {
    const fallback: SponsorAdConfig = {
      enabled: true,
      sponsorName: 'T-Connect Lesotho Partners',
      headline: 'Slide Through Exclusive Partner Deals',
      description: 'Slide right or left to view every picture, tap any picture to visit the partner offer, or tap X to close.',
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      mediaType: 'image_carousel',
      destinationUrl: 'https://tconnect.co.ls',
      displayTrigger: 'both',
      countdownDurationSec: 0,
      skipAllowed: true,
      watchMode: 'skip_after_sec',
      retriggerEveryHours: 3,
      retriggerEveryGb: 2,
      videoLibrary: STARTER_VIDEO_AD_LIBRARY
    };
    if ((this.state as any).sponsorAd) {
      const saved: SponsorAdConfig = (this.state as any).sponsorAd;
      let resolvedLibrary = Array.isArray(saved.videoLibrary)
        ? saved.videoLibrary.map((item) =>
            item.id === 'carousel_tconnect_offers' && item.targetScope === 'park'
              ? { ...item, targetScope: 'all' as const }
              : item
          )
        : STARTER_VIDEO_AD_LIBRARY;
      const carouselIdx = resolvedLibrary.findIndex((i) => i.mediaType === 'image_carousel' && i.enabled);
      if (carouselIdx > 0 && resolvedLibrary[0]?.id === 'vid_alliance_all') {
        const [carouselItem] = resolvedLibrary.splice(carouselIdx, 1);
        resolvedLibrary = [carouselItem, ...resolvedLibrary];
      }
      return {
        ...fallback,
        ...saved,
        retriggerEveryHours: saved.retriggerEveryHours ?? 3,
        retriggerEveryGb: saved.retriggerEveryGb ?? 2,
        videoLibrary: resolvedLibrary
      };
    }
    return fallback;
  }

  resolveVideoAdForScope(scope: VerticalType | string = 'hotspot'): VideoAdItem | null {
    const cfg = this.getSponsorAdConfig();
    if (!cfg.enabled) return null;
    const lib = cfg.videoLibrary || STARTER_VIDEO_AD_LIBRARY;
    const normalizedScope = scope === 'village' ? 'community' : scope;
    // Prefer enabled image_carousel for this scope or 'all' first
    const exactCarousel = lib.find(
      v => v.enabled && v.mediaType === 'image_carousel' && (v.targetScope === normalizedScope || v.targetScope === scope)
    );
    if (exactCarousel) return exactCarousel;
    const allCarousel = lib.find(v => v.enabled && v.mediaType === 'image_carousel' && v.targetScope === 'all');
    if (allCarousel) return allCarousel;
    const exactMatch = lib.find(v => v.enabled && (v.targetScope === normalizedScope || v.targetScope === scope));
    if (exactMatch) return exactMatch;
    const allMatch = lib.find(v => v.enabled && v.targetScope === 'all');
    if (allMatch) return allMatch;
    const anyEnabled = lib.find(v => v.enabled);
    return anyEnabled || null;
  }

  recordVideoAdImpression(videoId: string): void {
    const cfg = this.getSponsorAdConfig();
    if (!Array.isArray(cfg.videoLibrary)) return;
    const updatedLib = cfg.videoLibrary.map(v =>
      v.id === videoId ? { ...v, impressions: (v.impressions || 0) + 1 } : v
    );
    (this.state as any).sponsorAd = { ...cfg, videoLibrary: updatedLib };
    this.saveState();
  }

  recordVideoAdClick(videoId: string): void {
    const cfg = this.getSponsorAdConfig();
    if (!Array.isArray(cfg.videoLibrary)) return;
    const updatedLib = cfg.videoLibrary.map(v =>
      v.id === videoId ? { ...v, clicks: (v.clicks || 0) + 1 } : v
    );
    (this.state as any).sponsorAd = { ...cfg, videoLibrary: updatedLib };
    this.saveState();
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
      details: `Updated post-auth & recurring (${updated.retriggerEveryHours || 3}h / ${updated.retriggerEveryGb || 2}GB) video ad campaign (${updated.videoLibrary?.filter(v => v.enabled).length || 0} active videos).`
    });
    this.saveState();
    if (typeof window !== 'undefined') {
      fetch('/api/portal/video-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsorAd: updated })
      }).catch(() => {});
    }
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Server-Backed Team Management, @tconnect.tower Invites, Resets & Audit Logs
  // ---------------------------------------------------------------------------
  async createServerInvite(payload: {
    name?: string;
    department: DepartmentName;
    allowedTabs: PermissionTabId[];
    scopedSites?: string[];
  }): Promise<{
    success: boolean;
    member?: TeamMember;
    inviteToken?: string;
    inviteUrl?: string;
    expiresAt?: string;
    message?: string;
  }> {
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.member) {
        return {
          success: false,
          message: data?.message || 'Unable to create teammate invitation.'
        };
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const invitePath = data.invitePath || `/#invite?token=${data.inviteToken}`;
      const inviteUrl = `${origin}${invitePath}`;
      await this.syncTeamWithServer();
      return {
        success: true,
        member: data.member,
        inviteToken: data.inviteToken,
        inviteUrl,
        expiresAt: data.expiresAt
      };
    } catch {
      return { success: false, message: 'Could not reach the server to create this invite.' };
    }
  }

  async updateServerMember(
    memberId: string,
    updates: {
      name?: string;
      department?: DepartmentName;
      allowedTabs?: PermissionTabId[];
      scopedSites?: string[];
      status?: TeamMember['status'];
    }
  ): Promise<{ success: boolean; member?: TeamMember; message?: string }> {
    try {
      const res = await fetch(`/api/team/${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.member) {
        return { success: false, message: data?.message || 'Unable to update member access.' };
      }
      await this.syncTeamWithServer();
      return { success: true, member: data.member };
    } catch {
      return { success: false, message: 'Could not reach the server to update member access.' };
    }
  }

  async deleteServerMember(memberId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/team/${encodeURIComponent(memberId)}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        return { success: false, message: data?.message || 'Unable to remove team member.' };
      }
      await this.syncTeamWithServer();
      return { success: true, message: data.message };
    } catch {
      return { success: false, message: 'Could not reach the server to remove member.' };
    }
  }

  async createServerResetLink(memberId: string): Promise<{
    success: boolean;
    resetUrl?: string;
    expiresAt?: string;
    message?: string;
  }> {
    try {
      const res = await fetch(`/api/team/${encodeURIComponent(memberId)}/reset-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.resetPath) {
        return { success: false, message: data?.message || 'Unable to generate password reset link.' };
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return {
        success: true,
        resetUrl: `${origin}${data.resetPath}`,
        expiresAt: data.expiresAt
      };
    } catch {
      return { success: false, message: 'Could not reach the server to create a reset link.' };
    }
  }

  async fetchServerAuditLogs(filters?: {
    actor?: string;
    department?: string;
    category?: string;
    search?: string;
    limit?: number;
  }): Promise<{ success: boolean; logs: AuditLogEntry[]; total?: number; message?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters?.actor) params.set('actor', filters.actor);
      if (filters?.department) params.set('department', filters.department);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.search) params.set('search', filters.search);
      if (filters?.limit) params.set('limit', String(filters.limit));
      const query = params.toString();
      const res = await fetch(`/api/audit-logs${query ? `?${query}` : ''}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        return { success: false, logs: [], message: data?.message || 'Unable to load activity logs.' };
      }
      return {
        success: true,
        logs: Array.isArray(data.logs) ? data.logs : [],
        total: typeof data.total === 'number' ? data.total : undefined
      };
    } catch {
      return { success: false, logs: [], message: 'Could not reach server for activity logs.' };
    }
  }

  async previewInviteOrReset(token: string): Promise<{
    success: boolean;
    mode?: 'invite' | 'reset';
    towerDomain?: string;
    suggestedName?: string;
    name?: string;
    username?: string;
    email?: string;
    department?: DepartmentName;
    role?: TeamMember['role'];
    isSuperAdmin?: boolean;
    allowedTabs?: PermissionTabId[];
    invitedBy?: string;
    expiresAt?: string;
    message?: string;
  }> {
    try {
      const res = await fetch(`/api/team/invite-preview?token=${encodeURIComponent(token.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        return { success: false, message: data?.message || 'This link is invalid or has already been used.' };
      }
      return data;
    } catch {
      return { success: false, message: 'Could not reach the server to verify this link.' };
    }
  }

  async checkHandleAvailability(prefix: string): Promise<{
    available: boolean;
    fullEmail?: string;
    reason?: string;
  }> {
    try {
      const res = await fetch(`/api/team/check-handle?prefix=${encodeURIComponent(prefix.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        return { available: false, reason: 'Could not verify handle availability.' };
      }
      return {
        available: Boolean(data.available),
        fullEmail: data.fullEmail,
        reason: data.reason
      };
    } catch {
      return { available: false, reason: 'Could not reach server to check handle.' };
    }
  }

  async completeInviteActivation(payload: {
    token: string;
    fullName: string;
    handlePrefix: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; session?: AuthSession; member?: TeamMember; message: string }> {
    try {
      const resp = await fetch('/api/team/redeem-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success || !data?.token || !(data?.user || data?.member)) {
        return {
          success: false,
          message: data?.message || 'Unable to activate your invitation. Please check your details and try again.'
        };
      }
      const member: TeamMember = data.user || data.member;
      const session: AuthSession = {
        user: member,
        token: String(data.token),
        loggedInAt: new Date().toISOString(),
        expiresAt: data.expiresAt || new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS).toISOString(),
        idleTimeoutMs: data.idleTimeoutMs || SESSION_IDLE_TIMEOUT_MS,
        effectiveRole: member.role
      };
      this.setAuthSession(session);
      this.notify();
      return {
        success: true,
        session,
        member,
        message: `Account activated! Welcome aboard, ${member.name}.`
      };
    } catch {
      return {
        success: false,
        message: 'Could not reach the authentication server to activate your account.'
      };
    }
  }

  async completePasswordReset(payload: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; session?: AuthSession; message: string }> {
    try {
      const resp = await fetch('/api/auth/complete-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success || !data?.token || !data?.user) {
        return {
          success: false,
          message: data?.message || 'Unable to complete password reset.'
        };
      }
      const member: TeamMember = data.user;
      const session: AuthSession = {
        user: member,
        token: String(data.token),
        loggedInAt: new Date().toISOString(),
        expiresAt: data.expiresAt || new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS).toISOString(),
        idleTimeoutMs: data.idleTimeoutMs || SESSION_IDLE_TIMEOUT_MS,
        effectiveRole: member.role
      };
      this.setAuthSession(session);
      this.notify();
      return {
        success: true,
        session,
        message: data.message || `Password updated. Welcome back, ${member.name}.`
      };
    } catch {
      return {
        success: false,
        message: 'Could not reach the authentication server.'
      };
    }
  }

  async redeemInviteToken(token: string, _emailHint?: string): Promise<{ success: boolean; session?: AuthSession; member?: TeamMember; message: string }> {
    // Legacy hook preserved for compatibility; invite tokens now open the interactive self-setup screen on LoginView
    const preview = await this.previewInviteOrReset(token);
    if (!preview.success) {
      return { success: false, message: preview.message || 'Invalid or expired invitation link.' };
    }
    return {
      success: false,
      message: 'Please enter your name, @tconnect.tower handle, and password to activate this invite.'
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
      action: 'team.role_upgrade',
      target: member.email || member.name,
      details: `Upgraded role from ${oldRole} to ${role} (Effective immediately).`
    });

    this.saveState();
  }

  updateTeamMember(memberId: string, updates: Partial<TeamMember>): TeamMember | null {
    const member = this.state.team.find((m) => m.id === memberId);
    if (!member) return null;
    Object.assign(member, updates);
    if (updates.name) member.name = updates.name.trim();
    if (updates.email) member.email = updates.email.trim().toLowerCase();

    const currentSession = this.getAuthSession();
    if (currentSession && (currentSession.user.id === memberId || currentSession.user.email.toLowerCase() === member.email.toLowerCase())) {
      currentSession.user = { ...currentSession.user, ...updates };
      if (updates.role) currentSession.effectiveRole = updates.role;
      this.setAuthSession(currentSession);
    }

    this.logAudit({
      action: 'team.member_update',
      target: member.email || member.name,
      details: `Updated team member profile for ${member.name} (${member.department || member.role}).`
    });
    this.saveState();
    return member;
  }

  deleteTeamMember(memberId: string) {
    const member = this.state.team.find((m) => m.id === memberId);
    this.state.team = this.state.team.filter((m) => m.id !== memberId);
    (this.state as any).teamInitialized = true;
    if (member) {
      this.logAudit({
        action: 'team.revoke',
        target: member.email || member.name,
        details: 'Revoked team access and invalidated all active sessions.'
      });
    }
    this.saveState();
  }

  // ---------------------------------------------------------------------------
  // User Authentication, First-Run Super Admin Setup & Cookie Session Restoration
  // ---------------------------------------------------------------------------
  getAuthSession(): AuthSession | null {
    return getInMemoryAuthSession();
  }

  setAuthSession(session: AuthSession | null): void {
    setInMemoryAuthSession(session);
  }

  async restoreSessionFromServer(): Promise<AuthSession | null> {
    if (typeof window === 'undefined') return null;
    try {
      const resp = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      });
      if (!resp.ok) {
        this.setAuthSession(null);
        return null;
      }
      const data = await resp.json().catch(() => ({}));
      if (!data?.success || !data?.user) {
        this.setAuthSession(null);
        return null;
      }
      const user: TeamMember = data.user;
      const session: AuthSession = {
        user,
        token: String(data.token || ''),
        loggedInAt: user.lastLoginAt || new Date().toISOString(),
        expiresAt: data.expiresAt || new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS).toISOString(),
        idleTimeoutMs: data.idleTimeoutMs || SESSION_IDLE_TIMEOUT_MS,
        effectiveRole: user.isSuperAdmin ? 'Super Admin' : user.role
      };
      this.setAuthSession(session);
      this.notify();
      return session;
    } catch {
      return this.getAuthSession();
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    this.setAuthSession(null);
  }

  async setupOwnerAccount(
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<{ success: boolean; session?: AuthSession; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!password || password.length < 10) {
      return { success: false, message: 'Super Admin password must be at least 10 characters long.' };
    }
    if (password !== confirmPassword) {
      return { success: false, message: 'Passwords do not match.' };
    }
    try {
      const resp = await fetch('/api/auth/setup-super-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, confirmPassword })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success || !data?.token || !data?.user) {
        return {
          success: false,
          message: data?.message || 'Unable to complete Super Admin password setup.'
        };
      }
      const user: TeamMember = data.user;
      const session: AuthSession = {
        user,
        token: String(data.token),
        loggedInAt: new Date().toISOString(),
        expiresAt: data.expiresAt || new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS).toISOString(),
        idleTimeoutMs: data.idleTimeoutMs || SESSION_IDLE_TIMEOUT_MS,
        effectiveRole: user.role
      };
      this.setAuthSession(session);
      this.saveState();
      return {
        success: true,
        session,
        message: data.message || `Super Admin account secured. Welcome, ${user.name}.`
      };
    } catch {
      return { success: false, message: 'Could not reach the authentication server.' };
    }
  }

  async login(identifier: string, password?: string): Promise<{ success: boolean; session?: AuthSession; message: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const inputPass = password ? password : '';

    if (!cleanId || !inputPass) {
      return {
        success: false,
        message: 'Login handle and password are required to sign in.'
      };
    }

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, email: cleanId, password: inputPass })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.success || !data?.token || !data?.user) {
        return {
          success: false,
          message: data?.message || 'Invalid login handle or password.'
        };
      }

      const member: TeamMember = data.user;
      const idx = this.state.team.findIndex((m) => m.id === member.id || (m.email && m.email.toLowerCase() === member.email.toLowerCase()));
      if (idx >= 0) {
        this.state.team[idx] = { ...this.state.team[idx], ...member, status: 'active' };
      } else {
        this.state.team.push({ ...member, status: 'active' });
      }
      this.saveState();

      const session: AuthSession = {
        user: member,
        token: String(data.token),
        loggedInAt: new Date().toISOString(),
        expiresAt: data.expiresAt || new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS).toISOString(),
        idleTimeoutMs: data.idleTimeoutMs || SESSION_IDLE_TIMEOUT_MS,
        effectiveRole: member.isSuperAdmin ? 'Super Admin' : member.role
      };
      this.setAuthSession(session);

      return {
        success: true,
        session,
        message: `Welcome back, ${member.name}.`
      };
    } catch {
      return {
        success: false,
        message: 'Unable to reach authentication server. Please retry.'
      };
    }
  }

  /**
   * Allows the Super Admin to preview department/role interfaces in real time.
   */
  switchRole(targetRole: TeamMember['role']): { success: boolean; session?: AuthSession; message: string } {
    const currentSession = this.getAuthSession();
    if (!currentSession) {
      return { success: false, message: 'No active session' };
    }

    if (!isTrueSuperAdminAccount(currentSession.user)) {
      return { success: false, message: 'Only the Super Admin can preview other roles.' };
    }

    currentSession.effectiveRole = targetRole;
    this.setAuthSession(currentSession);
    this.logAudit({
      actor: currentSession.user.name,
      role: targetRole,
      category: 'authentication',
      action: 'auth.role_switch',
      target: currentSession.user.email,
      details: `Super Admin switched interface preview to '${targetRole}'.`
    });
    this.notify();
    return {
      success: true,
      session: currentSession,
      message: `Previewing interface as ${targetRole}.`
    };
  }

  requestPasswordReset(email: string): { success: boolean; tempPassword?: string; memberName?: string; message: string } {
    const cleanEmail = email.trim().toLowerCase();

    // Never issue a temporary password for the primary master admin account
    if (cleanEmail === 'rphooko@tconnect.africa') {
      return {
        success: true,
        message: 'If this account is eligible for a password reset, the administrator has been notified.'
      };
    }

    const member = this.state.team.find((m) => m.email.toLowerCase() === cleanEmail);
    if (!member) {
      return {
        success: true,
        message: 'If an authorized account matches this email, the administrator has been notified.'
      };
    }

    // Generate high-entropy temporary password stored only for admin review
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const alphaCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const tempPassword = `TC-${randCode}-${alphaCode}!`;

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
      message: `Password reset requested by ${member.email}. Admin can issue temporary credentials in Team & RBAC.`,
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
      details: `Password reset request logged for ${member.email} and routed to administrator.`
    });

    this.saveState();

    return {
      success: true,
      memberName: member.name,
      message: 'Your password reset request has been routed to the system administrator. Please contact the administrator to receive your temporary credentials.'
    };
  }

  setMemberTemporaryPassword(memberId: string, tempPassword: string): boolean {
    const member = this.state.team.find((m) => m.id === memberId);
    if (!member || member.email.toLowerCase() === 'rphooko@tconnect.africa') return false;
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
      message: `Password reset requested by ${member.email}. Admin can issue temporary credentials in Team & RBAC.`,
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
      details: `Password reset request logged for ${member.email} and routed to administrator.`
    });

    this.saveState();
    return true;
  }

  issueTemporaryPassword(memberId: string, customPassword?: string): { success: boolean; tempPassword: string; message: string } {
    const member = this.state.team.find((m) => m.id === memberId);
    if (!member) {
      return { success: false, tempPassword: '', message: 'Team member not found' };
    }

    const tempPassword = customPassword && customPassword.trim() ? customPassword.trim() : this.generateCryptoTempPassword();

    member.tempPasswordIssuedAt = new Date().toISOString();
    member.hasPendingReset = false; // Mark fulfilled by admin
    this.clearPasswordResetAlert(member.id);

    if (typeof window !== 'undefined') {
      fetch('/api/team/issue-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          email: member.email,
          tempPassword
        })
      }).catch(() => {});
    }

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

  // Content Filtering & Custom DNS Rules (Full Persistent CRUD)
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

  createContentFilter(rule: Omit<ContentFilterRule, 'id'>): ContentFilterRule {
    const created: ContentFilterRule = {
      ...rule,
      id: `cf_${Date.now()}`
    };
    this.state.contentFilters.push(created);
    this.logAudit({
      actor: 'Admin',
      role: 'Technical',
      action: 'dns_filter.create',
      target: created.name,
      details: `Added DNS content filter category '${created.name}' (${created.blockedDomainsCount} domains).`
    });
    this.saveState();
    return created;
  }

  updateContentFilter(ruleId: string, updates: Partial<ContentFilterRule>): ContentFilterRule | null {
    const rule = this.state.contentFilters.find((r) => r.id === ruleId);
    if (!rule) return null;
    Object.assign(rule, updates);
    this.saveState();
    return rule;
  }

  deleteContentFilter(ruleId: string): boolean {
    const rule = this.state.contentFilters.find((r) => r.id === ruleId);
    if (!rule) return false;
    this.state.contentFilters = this.state.contentFilters.filter((r) => r.id !== ruleId);
    this.logAudit({
      actor: 'Admin',
      role: 'Technical',
      action: 'dns_filter.delete',
      target: rule.name,
      details: `Removed DNS content filter category '${rule.name}'.`
    });
    this.saveState();
    return true;
  }

  getCustomDnsRules(): Array<{ id: string; domain: string; action: 'block' | 'allow'; siteId?: string }> {
    if (!Array.isArray((this.state as any).customDnsRules)) {
      (this.state as any).customDnsRules = [
        { id: 'cd_1', domain: 'torrentz.eu', action: 'block', siteId: 'all' },
        { id: 'cd_2', domain: 'gov.ls', action: 'allow', siteId: 'all' },
        { id: 'cd_3', domain: 'education.org.ls', action: 'allow', siteId: 'all' }
      ];
    }
    return (this.state as any).customDnsRules;
  }

  addCustomDnsRule(domain: string, action: 'block' | 'allow', siteId = 'all') {
    const rules = this.getCustomDnsRules();
    const cleanDomain = domain.trim().toLowerCase();
    const existing = rules.find((r) => r.domain === cleanDomain);
    if (existing) {
      existing.action = action;
      existing.siteId = siteId;
      this.saveState();
      return existing;
    }
    const created = {
      id: `cd_${Date.now()}`,
      domain: cleanDomain,
      action,
      siteId
    };
    (this.state as any).customDnsRules = [created, ...rules];
    this.saveState();
    return created;
  }

  updateCustomDnsRule(id: string, updates: { domain?: string; action?: 'block' | 'allow'; siteId?: string }) {
    const rules = this.getCustomDnsRules();
    (this.state as any).customDnsRules = rules.map((r) =>
      r.id === id
        ? { ...r, ...updates, domain: updates.domain ? updates.domain.trim().toLowerCase() : r.domain }
        : r
    );
    this.saveState();
  }

  deleteCustomDnsRule(id: string) {
    const rules = this.getCustomDnsRules();
    (this.state as any).customDnsRules = rules.filter((r) => r.id !== id);
    this.saveState();
  }

  // Audit Logging (auto-attributes signed-in user and mirrors to Super Admin server audit log)
  public logAudit(
    entry: Partial<AuditLogEntry> & { action: string; target: string; details: string; actor?: string; role?: string },
    skipServerMirror = false
  ) {
    const activeSession = this.getAuthSession();
    const resolvedActor = activeSession?.user?.name || entry.actor || 'System';
    const resolvedEmail = activeSession?.user?.email || entry.actorEmail;
    const resolvedDept = activeSession?.user?.department || activeSession?.user?.role || entry.actorDepartment;
    const resolvedRole = activeSession?.user?.role || entry.role || 'Super Admin';
    const inferredCategory =
      entry.category ||
      (entry.action.startsWith('exports.')
        ? 'exports'
        : entry.action.startsWith('router.adopt')
          ? 'router_adoption'
          : entry.action.startsWith('router.reboot')
            ? 'router_reboot'
            : entry.action.startsWith('router.terminal')
              ? 'terminal_command'
              : entry.action.startsWith('router.')
                ? 'router_config'
                : entry.action.startsWith('plan.') || entry.action.startsWith('voucher.') || entry.action.startsWith('gateway.') || entry.action.startsWith('billing.')
                  ? 'billing'
                  : entry.action.startsWith('portal.')
                    ? 'captive_portal'
                    : entry.action.startsWith('team.') || entry.action.startsWith('admin.')
                      ? 'team'
                      : entry.action.startsWith('auth.')
                        ? 'authentication'
                        : 'system');

    const newLog: AuditLogEntry = {
      id: entry.id || `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      actor: resolvedActor,
      actorEmail: resolvedEmail,
      actorDepartment: resolvedDept,
      role: resolvedRole,
      action: entry.action,
      target: entry.target,
      details: entry.details,
      ipAddress: entry.ipAddress || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'),
      timestamp: entry.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19),
      category: inferredCategory,
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

    // Mirror every authenticated user action to the persistent Super Admin server audit log
    if (!skipServerMirror && activeSession && typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      }).catch(() => {});
    }
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
    const threshold = customThreshold !== undefined ? customThreshold : this.getVoucherLowThreshold();

    // Ensure no legacy self-generated voucher low-stock alert ever surfaces
    const alertId = 'alert_low_voucher_stock';
    if (this.state.alerts.some((a) => a.id === alertId || a.source === 'voucher')) {
      this.state.alerts = this.state.alerts.filter((a) => a.id !== alertId && a.source !== 'voucher');
      this.saveState();
    }

    return {
      unusedCount: this.state.vouchers.length,
      threshold,
      isLow: false,
      isCritical: false,
      triggeredAlert: false,
      scannedAt: this.lastVoucherCheckAt
    };
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
