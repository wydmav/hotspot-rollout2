export type VerticalType = 
  | 'hotspot'       // Cafes, retail, co-working
  | 'community'     // Estates & solar mesh villages
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

export interface RouterDevice {
  id: string;
  name: string;
  vertical: VerticalType;
  siteName: string;
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
  token?: string;
  tokenExpiresAt?: string;
  adoptedAt?: string;
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
  source: 'gateway' | 'router' | 'radius' | 'security' | 'solar';
  timestamp: string;
  acknowledged: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Technical' | 'Collaborator' | 'Viewer' | 'Custom';
  customPermissions?: string[];
  scopedSites: string[]; // empty for all sites
  mfaEnabled: boolean;
  status: 'active' | 'invited' | 'expired';
  invitedAt: string;
  lastLoginAt?: string;
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
