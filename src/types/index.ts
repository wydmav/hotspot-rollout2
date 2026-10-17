export type VerticalType = 
  | 'hotspot'       // Cafes, retail, co-working
  | 'village'       // Rural villages, estates & solar mesh
  | 'community'     // Alias for village mesh deployments
  | 'bus'           // Transit & long-distance coaches
  | 'stadium'       // Arenas, expos & high-density events
  | 'park';         // Municipal green zones, solar smart poles

export interface VerticalConfig {
  id: VerticalType;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  accentClass: string;
  typicalBackhaul: string;
  defaultPlanExample: string;
}

export type RouterAccessMode = 'PAID_ONLY' | 'FREE_TRIAL_AND_PAID' | 'COMPLETELY_FREE';

export type LesothoDistrict = 
  | 'Maseru'
  | 'Berea'
  | 'Leribe'
  | 'Butha-Buthe'
  | 'Mokhotlong'
  | 'Thaba-Tseka'
  | "Qacha's Nek"
  | 'Quthing'
  | "Mohale's Hoek"
  | 'Mafeteng';

export const LESOTHO_DISTRICTS: LesothoDistrict[] = [
  'Maseru',
  'Berea',
  'Leribe',
  'Butha-Buthe',
  'Mokhotlong',
  'Thaba-Tseka',
  "Qacha's Nek",
  'Quthing',
  "Mohale's Hoek",
  'Mafeteng'
];

export interface RouterDevice {
  id: string;
  name: string;
  vertical: VerticalType;
  siteName: string;
  district?: LesothoDistrict;
  physicalAddress?: string;
  model: string;
  boardName: string;
  rosVersion: 'v7' | 'v6';
  macAddress: string;
  wireguardIp: string;
  publicWanIp: string;
  status: 'online' | 'offline' | 'pending_adoption';
  uptime: string;
  cpuLoad: number;
  memoryUsage: number;
  lastHeartbeat: string;
  firmware: string;
  activeSessions: number;
  accessMode?: RouterAccessMode;
  freeModeEnabled?: boolean;
  freeDurationMinutes?: number;
  freeRateLimit?: string;
  freeDailyQuotaMb?: number;
  freeCooldownHours?: number;
  policyLastSyncedAt?: string;
  wan1Interface?: string;
  wan1Name?: string;
  wan2Interface?: string;
  wan2Name?: string;
  wanFailoverEnabled?: boolean;
  activeWan?: 'wan1' | 'wan2';
  lastFailoverEvent?: string;
  token?: string;
  tokenExpiresAt?: string;
  adoptedAt?: string;
  lastHeartbeatTimestamp?: number;
  missedHeartbeats?: number;
  offlineSince?: string;
  offlineReason?: string;
  webfigPort?: number;
  winboxPort?: number;
  solarTelemetry?: {
    batteryPercent: number;
    voltage: number;
    solarInputWatts: number;
    temperatureC: number;
  };
  gpsTelemetry?: {
    latitude: number;
    longitude: number;
    speedKmh: number;
    currentZone: string;
  };
  // External Client Tenant Group & Splash Customization
  tenantGroupId?: string;
  tags?: string[];
  customBgUrl?: string;
}

export interface TenantGroup {
  id: string;
  name: string;
  tag: string; // e.g. "client:maluti-resorts"
  customBgUrl: string;
  clientContact?: string;
  accentColor?: string;
  description?: string;
  createdAt: string;
  routerCount?: number;
}

export interface HotspotPlan {
  id: string;
  name: string;
  vertical: VerticalType;
  price: number;
  currency: string;
  durationSeconds: number; // e.g. 86400 for 24h
  durationLabel: string;
  dataCapMb: number | null; // null for unlimited
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  deviceLimit: number;
  burstDownloadMbps?: number;
  burstUploadMbps?: number;
  fairUseThresholdMb?: number;
  fairUseDownloadMbps?: number;
  isPopular?: boolean;
}

export interface Voucher {
  id: string;
  code: string;
  planId: string;
  planName: string;
  price: number;
  currency: string;
  durationSeconds: number;
  deviceLimit: number;
  status: 'active' | 'used' | 'expired' | 'revoked';
  generatedAt: string;
  expiresAt: string;
  firstUsedAt?: string;
  associatedDevices: Array<{
    mac: string;
    hostname: string;
    ip: string;
    firstSeen: string;
    lastSeen: string;
    bytesIn: number;
    bytesOut: number;
  }>;
  batchId?: string;
}

export interface ActiveSession {
  id: string;
  voucherCode: string;
  clientMac: string;
  clientIp: string;
  deviceType: string;
  siteName: string;
  vertical: VerticalType;
  routerName: string;
  planName: string;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  bytesDown: number;
  bytesUp: number;
  speedLimit: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  authMode?: 'free' | 'voucher' | 'gateway';
  connectedDurationSeconds?: number;
}

export interface CaptivePortalLead {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  countryCode: string;
  phone: string;
  fullPhone: string;
  email: string;
  capturedAt: string;
  routerId?: string;
  routerName: string;
  siteName: string;
  vertical: VerticalType;
  clientMac: string;
  clientIp: string;
  deviceType: string;
  durationMinutes: number;
  status: 'active' | 'expired';
}

export type GatewayProvider = 'ottvoucher' | 'ecocash' | 'mywallet' | 'xpayments';

export interface GatewayConfig {
  provider: GatewayProvider;
  name: string;
  subtitle: string;
  currency: string;
  isLive: boolean;
  isSandbox: boolean;
  status: 'operational' | 'degraded' | 'not_configured' | 'testing';
  apiKey: string;
  apiSecret: string;
  apiPassword?: string;
  username?: string;
  endpointUrl?: string;
  bearerToken?: string;
  merchantId: string;
  webhookSecret: string;
  webhookUrl: string;
  lastTestAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestMessage?: string;
  successRate24h: number;
  avgLatencyMs: number;
  testPassedOnce: boolean;
}

export interface PaymentTransaction {
  id: string;
  transactionRef: string;
  provider: GatewayProvider;
  amount: number;
  currency: string;
  phoneNumber?: string;
  planId: string;
  planName: string;
  vertical: VerticalType;
  siteName: string;
  voucherCodeIssued?: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  errorMessage?: string;
  debugLogs: {
    requestTimestamp: string;
    endpoint: string;
    httpStatus: number;
    signatureVerified: boolean;
    rawPayload: any;
    rawResponse: any;
    errorTrace?: string;
  };
  createdAt: string;
  completedAt?: string;
}

export interface SystemAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  source: 'gateway' | 'router' | 'radius' | 'security' | 'solar' | 'voucher';
  timestamp: string;
  acknowledged: boolean;
  metadata?: {
    unusedCount?: number;
    threshold?: number;
    planId?: string;
  };
}

export type PlatformRole = 'Super Admin' | 'Collaborator' | 'Management';

export interface SponsorAdConfig {
  enabled: boolean;
  sponsorName: string;
  headline: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  displayTrigger: 'pre_login' | 'post_connect' | 'both';
  countdownDurationSec: number;
  skipAllowed: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Collaborator' | 'Management' | 'Owner' | 'Admin' | 'Technical' | 'Viewer' | 'Custom';
  customPermissions?: string[];
  scopedSites: string[]; // empty for all sites
  mfaEnabled: boolean;
  status: 'active' | 'invited' | 'expired';
  invitedAt: string;
  inviteToken?: string;
  inviteTokenExpiresAt?: string;
  invitedBy?: string;
  lastLoginAt?: string;
  tempPassword?: string;
  tempPasswordIssuedAt?: string;
  password?: string;
  hasPendingReset?: boolean;
  pendingResetRequestedAt?: string;
}

export interface AuthSession {
  user: TeamMember;
  token: string;
  loggedInAt: string;
  effectiveRole: TeamMember['role'];
}

export type AuditLogCategory = 
  | 'router_config' 
  | 'router_reboot' 
  | 'terminal_command' 
  | 'router_adoption'
  | 'router_lifecycle'
  | 'wan_failover'
  | 'security' 
  | 'authentication' 
  | 'captive_portal'
  | 'connection_attempt'
  | 'captive_redirect'
  | 'billing' 
  | 'team'
  | 'system';

export interface ConnectionAttemptLog {
  id: string;
  timestamp: string;
  routerId: string;
  routerName: string;
  clientMac: string;
  clientIp: string;
  deviceType: string;
  clientOs: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'other';
  destinationUrl: string;
  redirectStatus: 'portal_loaded' | 'cna_302_issued' | 'dns_timeout' | 'ssl_blocked' | 'walled_garden_allowed';
  httpCode: number;
  reachedPortal: boolean;
  latencyMs: number;
  debugHint: string;
  assignedSpeedLimit?: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  // Extended audit metadata for router security & accountability
  category?: AuditLogCategory;
  routerId?: string;
  routerName?: string;
  command?: string;
  outputPreview?: string;
  severity?: 'info' | 'warning' | 'critical';
  status?: 'success' | 'failed' | 'pending';
  executionTimeMs?: number;
  metadata?: Record<string, any>;
}

export interface ContentFilterRule {
  id: string;
  siteId: string;
  category: 'adult' | 'malware' | 'gambling' | 'social_media' | 'p2p';
  name: string;
  description: string;
  enabled: boolean;
  blockedDomainsCount: number;
}

export interface CustomDomainOverride {
  id: string;
  siteId: string;
  domain: string;
  action: 'block' | 'allow';
  reason: string;
  createdAt: string;
}

export interface ScopePlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationLabel: string;
  durationSeconds: number;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  burstDownloadMbps?: number;
  deviceLimit: number;
  enabled: boolean;
  isPopular?: boolean;
  badge?: string;
}

export interface ScopePortalConfig {
  scope: VerticalType;
  scopeLabel: string;
  scopeIcon: string;
  scopeDescription: string;
  bgImage: string;
  bgDarken: number; // 0 - 80
  glassOpacity: number; // 20 - 100
  cardPlacement: 'top' | 'center' | 'bottom';
  cardWidth: 'compact' | 'normal' | 'wide' | 'full';
  accentColor: string;
  // Content & Branding
  brandTitle: string;
  tagline: string;
  welcomeHeadline: string;
  termsEnabled: boolean;
  termsText: string;
  // Guest fields
  collectName: boolean;
  collectPhone: boolean;
  collectEmail: boolean;
  collectGender: boolean;
  collectDob: boolean;
  defaultCountryCode: string;
  // Auth & Access
  allowFreeAccess: boolean;
  freeAccessDurationMinutes: number;
  allowVoucherCode: boolean;
  allowOnlinePayment: boolean;
  // Scope-specific plans & pricing
  plans: ScopePlan[];
}
