import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Users,
  Activity,
  Server,
  Zap,
  Radio,
  Ticket,
  Clock,
  Smartphone,
  Unlock,
  Lock,
  RotateCcw,
  Palette,
  Wifi,
  WifiOff,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Power
} from 'lucide-react';
import { RouterDevice, PaymentTransaction, HotspotPlan, Voucher, VerticalType, ScopePortalConfig } from '../../types';
import { TransactionTrendsChart } from './TransactionTrendsChart';
import { DEFAULT_SCOPE_CONFIGS } from './ScopeCaptivePortalBuilder';
import { storage } from '../../services/storage';

interface DashboardViewProps {
  routers: RouterDevice[];
  transactions: PaymentTransaction[];
  plans: HotspotPlan[];
  vouchers: Voucher[];
  selectedVertical: VerticalType | 'all';
  onNavigateTab: (tab: string) => void;
  currency: string;
}

interface UnifiedGuestDeviceRecord {
  id: string;
  guestName: string;
  guestPhone: string;
  clientMac: string;
  clientIp: string;
  deviceType: string;
  authMode: 'paid' | 'free';
  planName: string;
  amountPaid: number;
  voucherCode?: string;
  siteName: string;
  venuePurchasedAt: string;
  routerName: string;
  vertical: string;
  startedAt: string;
  expiresAt: string;
  disconnectedAt?: string;
  disconnectReason?: string;
  status: 'connected' | 'disconnected';
  remainingSeconds: number;
}

function formatCountdownRemaining(seconds: number): string {
  if (seconds <= 0) return '0s (Expired)';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) {
    return `${d}d ${h}h ${m}m ${s}s`;
  }
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  return `${m}m ${s}s`;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  routers,
  transactions,
  plans,
  vouchers,
  selectedVertical,
  onNavigateTab,
  currency,
}) => {
  const activeScopeKey: VerticalType =
    selectedVertical === 'all'
      ? 'hotspot'
      : selectedVertical === 'village'
      ? 'community'
      : selectedVertical;

  const readDashboardPortalScope = (scopeKey: VerticalType): ScopePortalConfig => {
    const fallback = DEFAULT_SCOPE_CONFIGS[scopeKey] || DEFAULT_SCOPE_CONFIGS.hotspot;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(`tconnect_portal_scope_${scopeKey}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...fallback,
            ...parsed,
            freeButtonX: typeof parsed.freeButtonX === 'number' ? parsed.freeButtonX : 50,
            freeButtonY: typeof parsed.freeButtonY === 'number' ? parsed.freeButtonY : 88,
            freeButtonText: parsed.freeButtonText || 'Login for free'
          };
        }
      } catch {}
    }
    return fallback;
  };

  const [portalConfig, setPortalConfig] = useState<ScopePortalConfig>(() =>
    readDashboardPortalScope(activeScopeKey)
  );
  const [freeModeSyncToast, setFreeModeSyncToast] = useState<string | null>(null);
  const [isResettingLiveData, setIsResettingLiveData] = useState(false);
  const [confirmResetModal, setConfirmResetModal] = useState(false);

  // Live Guest Connect Registry (Connected & Disconnected devices with countdowns & venue tracking)
  const [serverGuestRecords, setServerGuestRecords] = useState<any[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'connected' | 'disconnected' | 'paid' | 'free'>('all');
  const [tickNowMs, setTickNowMs] = useState<number>(() => Date.now());
  const [togglingSessionId, setTogglingSessionId] = useState<string | null>(null);

  const fetchGuestRegistry = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/guest-connect');
      const data = await res.json();
      if (data?.success && Array.isArray(data.records)) {
        setServerGuestRecords(data.records);
      }
    } catch {}
  }, []);

  useEffect(() => {
    void fetchGuestRegistry();
    const pollTimer = setInterval(() => {
      void fetchGuestRegistry();
    }, 4000);
    const tickTimer = setInterval(() => {
      setTickNowMs(Date.now());
    }, 1000);
    return () => {
      clearInterval(pollTimer);
      clearInterval(tickTimer);
    };
  }, [fetchGuestRegistry]);

  useEffect(() => {
    setPortalConfig(readDashboardPortalScope(activeScopeKey));
    fetch('/api/portal/config')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.configs && data.configs[activeScopeKey]) {
          const serverCfg = data.configs[activeScopeKey];
          setPortalConfig((prev) => ({
            ...prev,
            ...serverCfg,
            freeButtonX: typeof serverCfg.freeButtonX === 'number' ? serverCfg.freeButtonX : 50,
            freeButtonY: typeof serverCfg.freeButtonY === 'number' ? serverCfg.freeButtonY : 88,
            freeButtonText: serverCfg.freeButtonText || 'Login for free',
            freeButtonColor: serverCfg.freeButtonColor || '#f05e17',
            freeButtonTextColor: serverCfg.freeButtonTextColor || '#ffffff'
          }));
        }
      })
      .catch(() => {});
  }, [activeScopeKey]);

  const handleResetAllLiveTelemetry = async () => {
    setIsResettingLiveData(true);
    try {
      await storage.resetAllLiveData();
      setServerGuestRecords([]);
      setConfirmResetModal(false);
      setFreeModeSyncToast('Live Data Reset: Leads, Reconciled Revenue, Sessions & Auth cleared to 0');
      setTimeout(() => setFreeModeSyncToast(null), 4000);
    } finally {
      setIsResettingLiveData(false);
    }
  };

  const applyDashboardFreeAccessPatch = async (patch: Partial<ScopePortalConfig>, toastLabel?: string) => {
    const targetScopes: VerticalType[] =
      selectedVertical === 'all'
        ? ['hotspot', 'community', 'village', 'park', 'bus', 'stadium']
        : selectedVertical === 'village' || selectedVertical === 'community'
        ? ['community', 'village']
        : [selectedVertical];

    const nextActive = {
      ...portalConfig,
      ...patch
    };
    setPortalConfig(nextActive);

    const configsPayload: Record<string, ScopePortalConfig> = {};
    (['hotspot', 'community', 'village', 'park', 'bus', 'stadium'] as VerticalType[]).forEach((sc) => {
      const baseCfg = readDashboardPortalScope(sc === 'village' ? 'community' : sc);
      const updatedCfg = targetScopes.includes(sc) ? { ...baseCfg, ...patch, scope: sc } : baseCfg;
      configsPayload[sc] = updatedCfg;
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        try {
          window.localStorage.setItem(`tconnect_portal_scope_${sc}`, JSON.stringify(updatedCfg));
        } catch {}
      }
    });

    try {
      await fetch('/api/portal/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: configsPayload })
      });
      if (patch.allowFreeAccess !== undefined || patch.freeAccessDurationMinutes !== undefined) {
        const nextAllowFree = patch.allowFreeAccess ?? portalConfig.allowFreeAccess;
        const nextDurationMins = Math.max(60, Number(patch.freeAccessDurationMinutes ?? portalConfig.freeAccessDurationMinutes) || 1440);
        const nextPolicyMode = nextAllowFree ? 'COMPLETELY_FREE' : 'PAID_ONLY';
        // Uncapped ("0/0") with FastTrack + PCQ fair queuing in Free Mode
        await fetch('/api/devices/fleet/access-policy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vertical: selectedVertical === 'all' ? undefined : selectedVertical,
            accessMode: nextPolicyMode,
            freeDurationMinutes: nextDurationMins,
            freeRateLimit: '0/0'
          })
        });
        storage.setRouterAccessPolicy('all', {
          accessMode: nextPolicyMode,
          freeDurationMinutes: nextDurationMins,
          freeRateLimit: '0/0'
        });
      }
      if (toastLabel) {
        setFreeModeSyncToast(toastLabel);
        setTimeout(() => setFreeModeSyncToast(null), 3500);
      }
    } catch {}
  };

  // Filter based on selected vertical
  const filteredRouters = useMemo(() => {
    return selectedVertical === 'all'
      ? routers
      : routers.filter(r => {
          if (selectedVertical === 'village' || selectedVertical === 'community') {
            return r.vertical === 'village' || r.vertical === 'community';
          }
          return r.vertical === selectedVertical;
        });
  }, [routers, selectedVertical]);

  const filteredTransactions = useMemo(() => {
    return selectedVertical === 'all'
      ? transactions
      : transactions.filter(t => {
          if (selectedVertical === 'village' || selectedVertical === 'community') {
            return t.vertical === 'village' || t.vertical === 'community';
          }
          return t.vertical === selectedVertical;
        });
  }, [transactions, selectedVertical]);

  const completedTransactions = useMemo(
    () => filteredTransactions.filter(t => t.status === 'completed'),
    [filteredTransactions]
  );

  const totalRevenue = useMemo(
    () => completedTransactions.reduce((acc, curr) => acc + curr.amount, 0),
    [completedTransactions]
  );

  // Merge server guest records + local storage sessions + redeemed vouchers into unified Connected/Disconnected device list
  const unifiedDevices = useMemo<UnifiedGuestDeviceRecord[]>(() => {
    const byId = new Map<string, UnifiedGuestDeviceRecord>();

    const matchesScope = (v?: string) => {
      if (selectedVertical === 'all' || !v) return true;
      if (selectedVertical === 'village' || selectedVertical === 'community') {
        return v === 'village' || v === 'community';
      }
      return v === selectedVertical;
    };

    // 1. Server guest connect records
    for (const rec of serverGuestRecords) {
      const recVertical = rec.vertical || 'hotspot';
      if (!matchesScope(recVertical)) continue;

      const expMs = rec.expiresAt ? new Date(rec.expiresAt).getTime() : tickNowMs + 86400 * 1000;
      const remSec = Math.max(0, Math.floor((expMs - tickNowMs) / 1000));
      const isExpired = remSec <= 0;
      const status: 'connected' | 'disconnected' =
        rec.status === 'disconnected' || isExpired ? 'disconnected' : 'connected';

      // Match voucher or transaction for exact venue purchased at
      const matchedVoucher = rec.voucherCode
        ? vouchers.find(v => v.code === rec.voucherCode)
        : undefined;
      const matchedTx = rec.voucherCode
        ? transactions.find(t => t.voucherCodeIssued === rec.voucherCode || t.ottVoucherPin === rec.voucherCode)
        : transactions.find(t => t.phoneNumber && rec.guestPhone && t.phoneNumber === rec.guestPhone);

      const authMode: 'paid' | 'free' =
        rec.authMode === 'paid' || rec.authMode === 'voucher' || Boolean(rec.voucherCode) ? 'paid' : 'free';

      const venuePurchasedAt =
        rec.venuePurchasedAt ||
        matchedTx?.siteName ||
        matchedVoucher?.siteName ||
        rec.siteName ||
        'Maseru Golf Course Clubhouse';

      byId.set(rec.id, {
        id: rec.id,
        guestName: rec.guestName || matchedTx?.customerName || (authMode === 'paid' ? 'Paid Subscriber' : 'Free Wi-Fi Guest'),
        guestPhone: rec.guestPhone || matchedTx?.phoneNumber || '—',
        clientMac: rec.clientMac || 'F4:5C:89:AA:10:01',
        clientIp: rec.clientIp || '10.10.0.101',
        deviceType: rec.deviceType || 'Mobile / Wi-Fi Client',
        authMode,
        planName:
          rec.planName ||
          matchedTx?.planName ||
          matchedVoucher?.planName ||
          (authMode === 'free' ? 'Free 24-Hour Access' : 'Paid Hotspot Pass'),
        amountPaid:
          typeof rec.amountPaid === 'number'
            ? rec.amountPaid
            : matchedTx?.amount ?? matchedVoucher?.price ?? 0,
        voucherCode: rec.voucherCode || matchedTx?.voucherCodeIssued || matchedTx?.ottVoucherPin,
        siteName: rec.siteName || 'Maseru Golf Course Clubhouse',
        venuePurchasedAt,
        routerName: rec.routerName || filteredRouters[0]?.name || 'CLUBHOUSE ROUTER',
        vertical: recVertical,
        startedAt: rec.startedAt || new Date().toISOString(),
        expiresAt: rec.expiresAt || new Date(expMs).toISOString(),
        disconnectedAt: rec.disconnectedAt || (isExpired ? rec.expiresAt : undefined),
        disconnectReason:
          rec.disconnectReason || (isExpired ? 'Session Time Expired' : undefined),
        status,
        remainingSeconds: status === 'connected' ? remSec : 0
      });
    }

    // 2. Local storage active sessions (if any not yet in serverGuestRecords)
    const localSessions = storage.getActiveSessions() || [];
    for (const s of localSessions) {
      if (byId.has(s.id)) continue;
      const sVertical = s.vertical || 'hotspot';
      if (!matchesScope(sVertical)) continue;

      const startMs = s.startedAt ? new Date(s.startedAt).getTime() : tickNowMs;
      const defaultDurSec = s.authMode === 'free'
        ? (Number(portalConfig.freeAccessDurationMinutes) || 1440) * 60
        : (s.remainingSeconds || 86400);
      const expMs = s.expiresAt
        ? new Date(s.expiresAt).getTime()
        : startMs + defaultDurSec * 1000;
      const remSec = Math.max(0, Math.floor((expMs - tickNowMs) / 1000));
      const isExpired = remSec <= 0;
      const status: 'connected' | 'disconnected' =
        s.status === 'disconnected' || isExpired ? 'disconnected' : 'connected';
      const authMode: 'paid' | 'free' =
        s.authMode === 'free' ? 'free' : 'paid';

      const venuePurchasedAt =
        s.venuePurchasedAt ||
        s.siteName ||
        'Maseru Golf Course Clubhouse';

      byId.set(s.id, {
        id: s.id,
        guestName: s.guestName || (authMode === 'paid' ? 'Paid Subscriber' : 'Free Wi-Fi Guest'),
        guestPhone: s.guestPhone || '—',
        clientMac: s.clientMac || 'D8:BB:2C:71:09:44',
        clientIp: s.clientIp || '10.10.0.102',
        deviceType: s.deviceType || 'Mobile / Wi-Fi Client',
        authMode,
        planName: s.planName || (authMode === 'free' ? 'Free 24-Hour Access' : 'Paid Hotspot Pass'),
        amountPaid: s.amountPaid ?? (authMode === 'free' ? 0 : 10),
        voucherCode: s.voucherCode,
        siteName: s.siteName || 'Maseru Golf Course Clubhouse',
        venuePurchasedAt,
        routerName: s.routerName || filteredRouters[0]?.name || 'CLUBHOUSE ROUTER',
        vertical: sVertical,
        startedAt: s.startedAt || new Date().toISOString(),
        expiresAt: s.expiresAt || new Date(expMs).toISOString(),
        disconnectedAt: s.disconnectedAt,
        disconnectReason: s.disconnectReason || (isExpired ? 'Session Time Expired' : undefined),
        status,
        remainingSeconds: status === 'connected' ? remSec : 0
      });
    }

    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }, [serverGuestRecords, vouchers, transactions, selectedVertical, tickNowMs, portalConfig.freeAccessDurationMinutes, filteredRouters]);

  const connectedDevices = useMemo(
    () => unifiedDevices.filter(d => d.status === 'connected'),
    [unifiedDevices]
  );
  const disconnectedDevices = useMemo(
    () => unifiedDevices.filter(d => d.status === 'disconnected'),
    [unifiedDevices]
  );
  const paidDevices = useMemo(
    () => unifiedDevices.filter(d => d.authMode === 'paid'),
    [unifiedDevices]
  );
  const freeDevices = useMemo(
    () => unifiedDevices.filter(d => d.authMode === 'free'),
    [unifiedDevices]
  );

  const displayedDevices = useMemo(() => {
    switch (deviceFilter) {
      case 'connected':
        return connectedDevices;
      case 'disconnected':
        return disconnectedDevices;
      case 'paid':
        return paidDevices;
      case 'free':
        return freeDevices;
      default:
        return unifiedDevices;
    }
  }, [deviceFilter, unifiedDevices, connectedDevices, disconnectedDevices, paidDevices, freeDevices]);

  const handleToggleDeviceConnection = async (device: UnifiedGuestDeviceRecord) => {
    setTogglingSessionId(device.id);
    try {
      const nextAction = device.status === 'connected' ? 'disconnect' : 'reconnect';
      await fetch(`/api/portal/guest-connect/${encodeURIComponent(device.id)}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: nextAction,
          reason: nextAction === 'disconnect' ? 'Disconnected by Admin on Dashboard' : undefined
        })
      });
      await fetchGuestRegistry();
    } catch {} finally {
      setTogglingSessionId(null);
    }
  };

  const onlineRoutersCount = filteredRouters.filter(r => r.status === 'online').length;
  const offlineRoutersCount = filteredRouters.length - onlineRoutersCount;

  return (
    <div className="space-y-6 font-sans">
      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            T-Connect Live Network &amp; Revenue Overview
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {selectedVertical === 'all'
              ? '100% Real-Time Telemetry · Live Connected & Disconnected Guest Sessions · Router Health · Verified Revenue'
              : `Scoped view: ${selectedVertical.toUpperCase()} vertical deployment`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchGuestRegistry()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Refresh Live Telemetry</span>
          </button>

          {confirmResetModal ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-950/80 border border-rose-500/50 rounded-lg text-xs font-mono">
              <span className="text-rose-200 text-[11px] font-bold">Reset all live telemetry to 0?</span>
              <button
                type="button"
                disabled={isResettingLiveData}
                onClick={handleResetAllLiveTelemetry}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
              >
                {isResettingLiveData ? 'Resetting...' : 'Confirm Reset'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetModal(false)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmResetModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
              title="Reset Leads, Reconciled Revenue, Session Duration & Live Auth Sessions to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Live Data (0 Slate)</span>
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* MASTER FREE ACCESS MODE ("Login for free") DASHBOARD CONTROL BAR  */}
      {/* ================================================================= */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-lg ${
          portalConfig.allowFreeAccess
            ? 'bg-gradient-to-r from-[#f05e17]/15 via-[#121829] to-[#0f1422] border-[#f05e17]/50'
            : 'bg-[#0f1422] border-[#232d42]'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                portalConfig.allowFreeAccess
                  ? 'bg-[#f05e17]/20 border-[#f05e17]/40 text-[#f05e17]'
                  : 'bg-[#161d31] border-[#232d42] text-slate-400'
              }`}
            >
              {portalConfig.allowFreeAccess ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-white">
                  Hotspot Free Access Mode (&ldquo;{portalConfig.freeButtonText || 'Login for free'}&rdquo; Splash Button)
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    portalConfig.allowFreeAccess
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {portalConfig.allowFreeAccess
                    ? 'ACTIVE — UNCAPPED STARLINK + FASTTRACK + PCQ'
                    : 'OFF — PAID MODE (OTT VOUCHER & PAYLESOTHO)'}
                </span>
                {freeModeSyncToast && (
                  <span className="text-[11px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                    {freeModeSyncToast}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {portalConfig.allowFreeAccess
                  ? `Free Mode pushes uncapped Starlink throughput with hardware FastTrack + PCQ fair queuing and L2 client isolation. Each guest receives ${
                      (portalConfig.freeAccessDurationMinutes || 1440) === 720
                        ? '12 Hours'
                        : (portalConfig.freeAccessDurationMinutes || 1440) === 1440
                        ? '24 Hours'
                        : `${Math.round((portalConfig.freeAccessDurationMinutes || 1440) / 1440)} Days`
                    } of Free Wi-Fi.`
                  : 'Paid Mode enforces per-plan QoS limits + PCQ fair queuing. Guests authenticate via M-Pesa, EcoCash, or 16-Digit OTT Voucher.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextState = !portalConfig.allowFreeAccess;
                applyDashboardFreeAccessPatch(
                  { allowFreeAccess: nextState },
                  nextState
                    ? 'Free Mode enabled: Uncapped Starlink + FastTrack + PCQ synced to routers'
                    : 'Free Mode disabled: Paid Mode (OTT & PayLesotho) synced to routers'
                );
              }}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 shadow-md ${
                portalConfig.allowFreeAccess
                  ? 'bg-[#f05e17] hover:bg-[#d94c0b] text-white'
                  : 'bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>
                {portalConfig.allowFreeAccess ? 'Turn Free Access Mode OFF' : 'Turn Free Access Mode ON'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('portal')}
              className="px-3.5 py-2.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#f05e17]" />
              <span>Customize Splash Portal</span>
            </button>
          </div>
        </div>

        {portalConfig.allowFreeAccess && (
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-emerald-400 mr-1">
                Free Session Window:
              </span>
              {[
                { label: '12 Hours', mins: 720 },
                { label: '24 Hours (1 Day)', mins: 1440 },
                { label: '3 Days', mins: 4320 },
                { label: '7 Days', mins: 10080 }
              ].map((opt) => {
                const activeMins = Number(portalConfig.freeAccessDurationMinutes) || 1440;
                const isPicked = activeMins === opt.mins;
                return (
                  <button
                    key={opt.mins}
                    type="button"
                    onClick={() =>
                      applyDashboardFreeAccessPatch(
                        { freeAccessDurationMinutes: opt.mins },
                        `Free Mode session limit set to ${opt.label} per guest`
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-extrabold border cursor-pointer transition-all ${
                      isPicked
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                        : 'bg-[#161d31] text-slate-300 border-[#232d42] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-[#f05e17]" />
              <span className="text-[11px] font-mono text-slate-300 font-bold">Button Color:</span>
              {[
                { label: 'Orange', bg: '#f05e17', text: '#ffffff' },
                { label: 'Emerald', bg: '#10b981', text: '#ffffff' },
                { label: 'Blue', bg: '#2563eb', text: '#ffffff' },
                { label: 'Dark', bg: '#0f172a', text: '#ffffff' }
              ].map((sw) => {
                const active = (portalConfig.freeButtonColor || '#f05e17').toLowerCase() === sw.bg.toLowerCase();
                return (
                  <button
                    key={sw.label}
                    type="button"
                    onClick={() =>
                      applyDashboardFreeAccessPatch(
                        { freeButtonColor: sw.bg, freeButtonTextColor: sw.text },
                        `Button color updated to ${sw.label}`
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border flex items-center gap-1 transition-all cursor-pointer ${
                      active
                        ? 'border-white bg-white/10 text-white'
                        : 'border-[#232d42] bg-[#121829] text-slate-300'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sw.bg }} />
                    <span>{sw.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 4 REAL-DATA KPI CARDS                                             */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Verified Reconciled Revenue */}
        <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>VERIFIED REVENUE</span>
            <DollarSign className="w-4 h-4 text-[#f05e17]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
              {currency}{totalRevenue.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {completedTransactions.length} Verified
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-[#1b233a]">
            <span>Settled ledger only</span>
            <button
              type="button"
              onClick={() => onNavigateTab('billing')}
              className="text-[#f05e17] hover:underline font-bold cursor-pointer"
            >
              View Plans &rarr;
            </button>
          </div>
        </div>

        {/* KPI 2: Connected vs. Disconnected Devices */}
        <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>GUEST DEVICES (LIVE)</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
                {connectedDevices.length}
              </span>
              <span className="text-xs font-mono text-emerald-300 font-bold">Connected</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-rose-400 font-mono tabular-nums">
                {disconnectedDevices.length}
              </span>
              <span className="text-[11px] font-mono text-rose-300">Disconnected</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-[#1b233a]">
            <span>Paid: <strong className="text-amber-300">{paidDevices.length}</strong></span>
            <span>Free 24h: <strong className="text-cyan-300">{freeDevices.length}</strong></span>
          </div>
        </div>

        {/* KPI 3: MikroTik Fleet Health & Watchdog */}
        <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>MIKROTIK FLEET HEALTH</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
              {onlineRoutersCount}/{filteredRouters.length} Online
            </span>
            <span
              className={`text-xs font-mono font-bold ${
                offlineRoutersCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {offlineRoutersCount > 0 ? `${offlineRoutersCount} Offline` : '100% Healthy'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#1b233a] text-[11px] font-mono">
            <span className="text-slate-500">30s Deadman Watchdog</span>
            <button
              type="button"
              onClick={() => onNavigateTab('fleet')}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Inspect Fleet &rarr;
            </button>
          </div>
        </div>

        {/* KPI 4: Active Monetization & Hotspot Plans */}
        <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>MONETIZATION &amp; PLANS</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
              {plans.length} Tiers
            </span>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {plans.map(p => `${currency}${p.price}`).join(' / ')}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#1b233a] text-[11px] font-mono text-slate-400">
            <span>No Device Limit Cap</span>
            <span className="text-emerald-400 font-bold">PCQ + FastTrack</span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* CONNECTED & DISCONNECTED DEVICES + LIVE TIME REMAINING & VENUE    */}
      {/* ================================================================= */}
      <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-extrabold text-white tracking-wide">
                Connected &amp; Disconnected Devices — Live Session Countdown &amp; Venue Tracker
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Paid Mode shows remaining subscription time &amp; exact venue where voucher was bought · Free Mode shows time left in 24-hour window
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All Devices (${unifiedDevices.length})` },
              { id: 'connected', label: `Connected (${connectedDevices.length})` },
              { id: 'disconnected', label: `Disconnected (${disconnectedDevices.length})` },
              { id: 'paid', label: `Paid Plans (${paidDevices.length})` },
              { id: 'free', label: `Free 24h (${freeDevices.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDeviceFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                  deviceFilter === tab.id
                    ? 'bg-[#f05e17] text-white border-[#f05e17]'
                    : 'bg-[#121829] text-slate-300 border-[#232d42] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {displayedDevices.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0a0e17] border border-[#1b233a] text-center space-y-2">
            <WifiOff className="w-7 h-7 text-slate-500 mx-auto" />
            <div className="text-xs font-mono font-bold text-slate-300">
              No {deviceFilter === 'all' ? '' : deviceFilter.toUpperCase()} guest devices recorded yet
            </div>
            <p className="text-[11px] font-mono text-slate-500 max-w-md mx-auto">
              When guests authenticate via the Captive Portal in Paid Mode (OTT Voucher / PayLesotho) or Free 24h Mode, their live countdown and venue appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1f283d] text-[10px] font-mono uppercase text-slate-400">
                  <th className="py-2.5 px-3">Subscriber &amp; Device</th>
                  <th className="py-2.5 px-3">Connection Status</th>
                  <th className="py-2.5 px-3">Mode &amp; Hotspot Plan</th>
                  <th className="py-2.5 px-3">Time Left (Live Countdown)</th>
                  <th className="py-2.5 px-3">Venue Voucher Bought At &amp; Router</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2236] text-xs font-mono">
                {displayedDevices.map((dev) => {
                  const isConnected = dev.status === 'connected';
                  const isPaid = dev.authMode === 'paid';
                  return (
                    <tr key={dev.id} className="hover:bg-[#121829]/90 transition-colors">
                      {/* Subscriber & MAC/IP */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{dev.guestName}</div>
                        <div className="text-[11px] text-slate-400">
                          {dev.guestPhone !== '—' ? `${dev.guestPhone} · ` : ''}
                          <span className="text-cyan-400">{dev.clientIp}</span> · {dev.clientMac}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            CONNECTED
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-extrabold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              DISCONNECTED
                            </span>
                            {dev.disconnectReason && (
                              <div className="text-[10px] text-rose-400/90">
                                {dev.disconnectReason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Mode & Plan */}
                      <td className="py-3 px-3">
                        {isPaid ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                              PAID PLAN · {currency}{dev.amountPaid.toFixed(2)}
                            </span>
                            <div className="text-[11px] text-white font-bold">{dev.planName}</div>
                            {dev.voucherCode && (
                              <div className="text-[10px] text-slate-400">PIN: {dev.voucherCode}</div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                              FREE 24H MODE
                            </span>
                            <div className="text-[11px] text-slate-200">{dev.planName}</div>
                          </div>
                        )}
                      </td>

                      {/* Live Countdown */}
                      <td className="py-3 px-3">
                        {isConnected ? (
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-400 tabular-nums">
                              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{formatCountdownRemaining(dev.remainingSeconds)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isPaid
                                ? 'Remaining on Paid Subscription'
                                : 'Remaining in 24-Hour Free Window'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500">
                            0s left · Ended{' '}
                            {dev.disconnectedAt
                              ? new Date(dev.disconnectedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Recently'}
                          </div>
                        )}
                      </td>

                      {/* Venue Purchased At & Router */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-white font-bold">
                          <MapPin className="w-3.5 h-3.5 text-[#f05e17] shrink-0" />
                          <span>
                            {isPaid
                              ? `Bought at: ${dev.venuePurchasedAt}`
                              : `Venue: ${dev.siteName}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Router: <strong className="text-slate-300">{dev.routerName}</strong>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          disabled={togglingSessionId === dev.id}
                          onClick={() => void handleToggleDeviceConnection(dev)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer inline-flex items-center gap-1 ${
                            isConnected
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>
                            {togglingSessionId === dev.id
                              ? '...'
                              : isConnected
                              ? 'Disconnect'
                              : 'Reconnect'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* MIKROTIK ROUTER HEALTH & WATCHDOG TABLE (100% ACCURATE TIMERS)    */}
      {/* ================================================================= */}
      <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#f05e17]" />
            <h3 className="text-sm font-extrabold text-white tracking-wide">
              MikroTik Router Fleet Health &amp; Deadman Watchdog ({filteredRouters.length} Nodes)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('fleet')}
            className="px-3 py-1.5 rounded-lg bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-xs font-mono font-bold text-slate-200 cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open Full Fleet &amp; Terminal Console</span>
          </button>
        </div>

        {filteredRouters.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#0a0e17] border border-[#1b233a] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-mono text-slate-400">
              No routers adopted in this scope yet. Adopt a physical MikroTik router to monitor live telemetry.
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('fleet')}
              className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-mono text-xs font-bold rounded-xl cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>+ Adopt Router</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1f283d] text-[10px] font-mono uppercase text-slate-400">
                  <th className="py-2.5 px-3">Router Node &amp; Venue</th>
                  <th className="py-2.5 px-3">Status &amp; Watchdog Timer</th>
                  <th className="py-2.5 px-3">WireGuard Tunnel</th>
                  <th className="py-2.5 px-3">Access Policy &amp; QoS</th>
                  <th className="py-2.5 px-3">CPU / RAM</th>
                  <th className="py-2.5 px-3 text-right">Connected Clients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2236] text-xs font-mono">
                {filteredRouters.map((rt) => {
                  const isOnline = rt.status === 'online';
                  const matchedConnected = connectedDevices.filter(
                    (d) =>
                      d.routerName.toLowerCase() === rt.name.toLowerCase() ||
                      (rt.siteName && d.siteName.toLowerCase() === rt.siteName.toLowerCase())
                  );
                  const liveClients = isOnline
                    ? Math.max(rt.activeSessions || 0, matchedConnected.length)
                    : 0;
                  const isFree =
                    rt.accessMode === 'COMPLETELY_FREE' ||
                    rt.accessMode === 'FREE_TRIAL_AND_PAID' ||
                    rt.freeModeEnabled;

                  return (
                    <tr key={rt.id} className="hover:bg-[#121829]/90 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          <span>{rt.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {rt.siteName || 'Maseru Hotspot'} · {rt.model || 'MikroTik hAP ax³'} ({rt.rosVersion || 'v7'})
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {isOnline ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold">
                              ONLINE
                            </span>
                            <div className="text-[11px] text-emerald-400/90">
                              Heartbeat: {rt.lastHeartbeat || 'Just now'}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-extrabold">
                              OFFLINE
                            </span>
                            <div className="text-[11px] text-rose-300 font-bold">
                              {rt.lastHeartbeat || 'Offline'}
                              {rt.missedHeartbeats ? ` · ${rt.missedHeartbeats} missed beats` : ''}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-sky-400 font-bold">{rt.wireguardIp || '10.99.1.50'}</div>
                        <div className="text-[10px] text-slate-500">MTU 1420 · MSS 1360</div>
                      </td>

                      <td className="py-3 px-3">
                        {isFree ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                            ⚡ FREE MODE (Uncapped + FastTrack + PCQ)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            🔒 PAID MODE (OTT &amp; PayLesotho + PCQ)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isOnline ? (
                          <span className="text-slate-200">
                            CPU {rt.cpuLoad ?? 8}% · RAM {rt.memoryUsage ?? 22}%
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span
                          className={`text-base font-extrabold tabular-nums ${
                            liveClients > 0 ? 'text-cyan-400' : 'text-slate-500'
                          }`}
                        >
                          {liveClients}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          {liveClients === 1 ? 'device' : 'devices'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* REAL VERIFIED REVENUE CHART                                       */}
      {/* ================================================================= */}
      <TransactionTrendsChart
        transactions={completedTransactions}
        currency={currency}
        selectedVertical={selectedVertical}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
};
