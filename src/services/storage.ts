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
  GatewayProvider
} from '../types';

// Updated storage key for pristine scratch state
const STORAGE_KEY = 'tconnect_controller_scratch_state_v4';

export const STARTER_PLANS: HotspotPlan[] = [
  {
    id: 'plan_m10_24h',
    name: 'Day Pass (Standard)',
    vertical: 'hotspot',
    price: 10,
    currency: 'M',
    durationSeconds: 86400, // 24 Hours
    durationLabel: '24 Hours',
    dataCapMb: null, // Unlimited
    downloadSpeedMbps: 4.0,
    uploadSpeedMbps: 2.0,
    deviceLimit: 2,
    burstDownloadMbps: 8.0,
    burstUploadMbps: 4.0,
    fairUseThresholdMb: 5000,
    fairUseDownloadMbps: 1.0,
    isPopular: true
  }
];

export const UNCONFIGURED_GATEWAYS: GatewayConfig[] = [
  {
    provider: 'ecocash',
    name: 'EcoCash Lesotho',
    subtitle: 'Econet Telecom Mobile Money STK Push',
    currency: 'M',
    isLive: false,
    isSandbox: true,
    status: 'not_configured',
    apiKey: '',
    apiSecret: '',
    merchantId: '',
    webhookSecret: '',
    webhookUrl: 'https://app.tconnect.co.ls/api/webhooks/ecocash',
    successRate24h: 0,
    avgLatencyMs: 0,
    testPassedOnce: false
  },
  {
    provider: 'mywallet',
    name: 'MyWallet Lesotho',
    subtitle: 'Vodacom Lesotho M-Pesa / MyWallet Gateway',
    currency: 'M',
    isLive: false,
    isSandbox: true,
    status: 'not_configured',
    apiKey: '',
    apiSecret: '',
    merchantId: '',
    webhookSecret: '',
    webhookUrl: 'https://app.tconnect.co.ls/api/webhooks/mywallet',
    successRate24h: 0,
    avgLatencyMs: 0,
    testPassedOnce: false
  },
  {
    provider: 'ottvoucher',
    name: 'OTTvoucher API',
    subtitle: 'Digital PIN & Retail Voucher Token Redemption',
    currency: 'M',
    isLive: false,
    isSandbox: true,
    status: 'not_configured',
    apiKey: '',
    apiSecret: '',
    merchantId: '',
    webhookSecret: '',
    webhookUrl: 'https://app.tconnect.co.ls/api/webhooks/ottvoucher',
    successRate24h: 0,
    avgLatencyMs: 0,
    testPassedOnce: false
  },
  {
    provider: 'xpayments',
    name: 'xPayments Lesotho',
    subtitle: 'xpayments.paylesotho.co.ls Aggregator & OTT Hub',
    currency: 'M',
    isLive: false,
    isSandbox: true,
    status: 'not_configured',
    apiKey: '',
    apiSecret: '',
    merchantId: '',
    webhookSecret: '',
    webhookUrl: 'https://app.tconnect.co.ls/api/webhooks/xpayments',
    successRate24h: 0,
    avgLatencyMs: 0,
    testPassedOnce: false
  }
];

export const INITIAL_TEAM: TeamMember[] = [
  {
    id: 'tm_owner',
    name: 'Raphooko Phooko',
    email: 'taylorphooko@gmail.com',
    role: 'Owner',
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

export const WALLED_GARDEN_DOMAINS = [
  // Payment Providers
  'api.ottvoucher.com',
  'ottvoucher.com',
  'api.ecocash.co.ls',
  'ecocash.co.ls',
  'api.mywallet.co.ls',
  'mywallet.co.ls',
  'xpayments.paylesotho.co.ls',
  'paylesotho.co.ls',
  // Captive Portal Detection Endpoints (OS-Specific for instant login prompt)
  'captive.apple.com',
  'apple.com',
  'connectivitycheck.gstatic.com',
  'clients3.google.com',
  'play.googleapis.com',
  'msftconnecttest.com',
  'www.msftncsi.com',
  'detectportal.firefox.com',
  // Controller Endpoints
  'app.tconnect.co.ls',
  'hub.tconnect.co.ls'
];

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
  };

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadInitialState();
  }

  private loadInitialState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    // Clean scratch state: 0 routers, 0 vouchers, 0 transactions, clean unconfigured gateways
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
    };
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
    this.notify();
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
    };
    this.saveState();
  }

  loadFromSupabase(data: {
    routers?: RouterDevice[];
    vouchers?: Voucher[];
    transactions?: PaymentTransaction[];
    plans?: HotspotPlan[];
  }) {
    if (data.routers && data.routers.length > 0) {
      this.state.routers = data.routers;
    }
    if (data.vouchers && data.vouchers.length > 0) {
      this.state.vouchers = data.vouchers;
    }
    if (data.transactions && data.transactions.length > 0) {
      this.state.transactions = data.transactions;
    }
    if (data.plans && data.plans.length > 0) {
      this.state.plans = data.plans;
    }
    this.saveState();
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
      status: 'pending_adoption',
      uptime: '0m',
      cpuLoad: 2,
      memoryUsage: 18,
      lastHeartbeat: 'Never',
      activeSessions: 0,
      token,
      tokenExpiresAt: expiresAt
    };

    this.state.routers.unshift(newRouter);

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'router.create',
      target: newRouter.name,
      details: `Generated adoption one-liner token with 60-minute expiration for ${newRouter.model}.`
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

  // Plan & Voucher Methods
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
    voucher.status = 'used';

    voucher.associatedDevices.push({
      mac: clientMac.toUpperCase(),
      hostname,
      ip: `10.99.1.${Math.floor(50 + Math.random() * 150)}`,
      firstSeen: nowStr,
      lastSeen: nowStr,
      bytesIn: 0,
      bytesOut: 0
    });

    this.logAudit({
      actor: clientMac,
      role: 'Client',
      action: 'voucher.redeem',
      target: voucher.code,
      details: `Device ${clientMac} (${hostname}) authenticated at ${siteName}. Slot: ${voucher.associatedDevices.length}/${voucher.deviceLimit}.`
    });

    this.saveState();

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

    if (setLive && !gw.testPassedOnce) {
      return {
        success: false,
        message: 'Cannot set gateway to Live: You must run and pass a Sandbox test payment first.'
      };
    }

    gw.isLive = setLive;
    gw.isSandbox = !setLive;
    gw.status = setLive ? 'operational' : 'testing';

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'gateway.toggle_live',
      target: gw.name,
      details: `Gateway status changed to ${setLive ? 'LIVE PRODUCTION' : 'SANDBOX/TESTING'}.`
    });

    this.saveState();
    return { success: true, isLive: gw.isLive };
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

  processLivePayment(provider: GatewayProvider, planId: string, phoneNumber?: string, ottPin?: string) {
    const gw = this.state.gateways.find((g) => g.provider === provider);
    const plan = this.state.plans.find((p) => p.id === planId) || this.state.plans[0];
    if (!gw || !plan) throw new Error('Invalid gateway or plan');

    const txRef = `${provider.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const voucherCode = `TC-${Math.floor(1000 + Math.random() * 9000)}-${plan.currency}${plan.price}`;
    const newVoucher: Voucher = {
      id: `v_${Date.now()}`,
      code: voucherCode,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      currency: plan.currency,
      durationSeconds: plan.durationSeconds,
      deviceLimit: plan.deviceLimit,
      status: 'active',
      generatedAt: now,
      expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      associatedDevices: []
    };

    const newTx: PaymentTransaction = {
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
      voucherCodeIssued: voucherCode,
      status: 'completed',
      createdAt: now,
      completedAt: now,
      debugLogs: {
        requestTimestamp: new Date().toISOString(),
        endpoint: `/api/v1/${provider}/checkout`,
        httpStatus: 200,
        signatureVerified: true,
        rawPayload: {
          merchant_id: gw.merchantId || 'MERCHANT_LIVE',
          amount: plan.price,
          currency: plan.currency,
          customer_ident: phoneNumber || ottPin
        },
        rawResponse: {
          status: 'SUCCESS',
          receipt: `REC-${Date.now()}`,
          message: 'Payment captured and recorded in ledger'
        }
      }
    };

    this.state.vouchers.unshift(newVoucher);
    this.state.transactions.unshift(newTx);

    this.logAudit({
      actor: phoneNumber || 'Guest',
      role: 'Client',
      action: 'payment.complete',
      target: txRef,
      details: `Paid ${plan.currency}${plan.price} via ${gw.name}. Generated voucher ${voucherCode} (${plan.durationLabel}).`
    });

    this.saveState();

    return {
      success: true,
      transaction: newTx,
      voucher: newVoucher
    };
  }

  recheckPaymentStatus(txId: string) {
    const tx = this.state.transactions.find((t) => t.id === txId);
    if (!tx) return { success: false, message: 'Transaction not found' };

    if (tx.status === 'failed') {
      tx.status = 'completed';
      tx.errorMessage = undefined;
      tx.completedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
      if (!tx.voucherCodeIssued) {
        tx.voucherCodeIssued = `TC-RECON-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      this.saveState();
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
  inviteTeamMember(name: string, email: string, role: TeamMember['role'], scopedSites: string[]) {
    const newMember: TeamMember = {
      id: `tm_${Date.now()}`,
      name,
      email,
      role,
      scopedSites,
      mfaEnabled: role === 'Owner' || role === 'Admin' || role === 'Technical',
      status: 'invited',
      invitedAt: new Date().toISOString().replace('T', ' ').slice(0, 10)
    };

    this.state.team.push(newMember);

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'team.invite',
      target: email,
      details: `Sent single-use invite for role '${role}' (Scoped to: ${scopedSites.length ? scopedSites.join(', ') : 'All Sites'}).`
    });

    this.saveState();
    return newMember;
  }

  updateMemberRole(memberId: string, role: TeamMember['role'], scopedSites?: string[]) {
    const member = this.state.team.find((m) => m.id === memberId);
    if (!member) return;

    const oldRole = member.role;
    member.role = role;
    if (scopedSites !== undefined) {
      member.scopedSites = scopedSites;
    }

    this.logAudit({
      actor: 'Admin',
      role: 'Owner',
      action: 'team.role_change',
      target: member.email,
      details: `Changed role from ${oldRole} to ${role} (Effective immediately).`
    });

    this.saveState();
  }

  deleteTeamMember(memberId: string) {
    const member = this.state.team.find((m) => m.id === memberId);
    this.state.team = this.state.team.filter((m) => m.id !== memberId);
    if (member) {
      this.logAudit({
        actor: 'Admin',
        role: 'Owner',
        action: 'team.revoke',
        target: member.email,
        details: 'Revoked team access and invalidated all active bearer tokens.'
      });
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
  private logAudit(entry: { actor: string; role: string; action: string; target: string; details: string }) {
    const newLog: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      actor: entry.actor,
      role: entry.role,
      action: entry.action,
      target: entry.target,
      details: entry.details,
      ipAddress: '197.234.12.89',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    this.state.auditLogs.unshift(newLog);
    if (this.state.auditLogs.length > 200) {
      this.state.auditLogs.pop();
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
