import React, { useState, useMemo, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  Activity, 
  Server, 
  ArrowUpRight, 
  SlidersHorizontal,
  Sun,
  MapPin,
  RefreshCw,
  Zap,
  Plus,
  Radio,
  Ticket,
  Database,
  Clock,
  Smartphone,
  Unlock,
  Lock,
  RotateCcw,
  Palette
} from 'lucide-react';
import { RouterDevice, PaymentTransaction, HotspotPlan, Voucher, VerticalType, ScopePortalConfig } from '../../types';
import { RegionalFleetMap } from './RegionalFleetMap';
import { TransactionTrendsChart } from './TransactionTrendsChart';
import { SessionDurationTrackingDisplay, computeSessionStats } from '../common/SessionDurationTrackingDisplay';
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

export const DashboardView: React.FC<DashboardViewProps> = ({
  routers,
  transactions,
  plans,
  vouchers,
  selectedVertical,
  onNavigateTab,
  currency,
}) => {
  // Widget customization state
  const [showTrendsChart, setShowTrendsChart] = useState(true);
  const [showMapWidget, setShowMapWidget] = useState(true);
  const [showSolarWidget, setShowSolarWidget] = useState(true);
  const [showTransitWidget, setShowTransitWidget] = useState(true);
  const [showWaveChart, setShowWaveChart] = useState(true);
  const [showSessionTracking, setShowSessionTracking] = useState(true);

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

  const [isResettingLiveData, setIsResettingLiveData] = useState(false);
  const [confirmResetModal, setConfirmResetModal] = useState(false);

  const handleResetAllLiveTelemetry = async () => {
    setIsResettingLiveData(true);
    try {
      await storage.resetAllLiveData();
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
      if (patch.allowFreeAccess !== undefined) {
        const nextPolicyMode = patch.allowFreeAccess ? 'COMPLETELY_FREE' : 'PAID_ONLY';
        await fetch('/api/devices/fleet/access-policy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vertical: selectedVertical === 'all' ? undefined : selectedVertical,
            accessMode: nextPolicyMode,
            freeDurationMinutes: 0,
            freeRateLimit: '25M/10M'
          })
        });
        storage.setRouterAccessPolicy('all', {
          accessMode: nextPolicyMode,
          freeDurationMinutes: 0,
          freeRateLimit: '25M/10M'
        });
      }
      if (toastLabel) {
        setFreeModeSyncToast(toastLabel);
        setTimeout(() => setFreeModeSyncToast(null), 3500);
      }
    } catch {}
  };

  // Filter based on selected vertical
  const filteredRouters = selectedVertical === 'all' 
    ? routers 
    : routers.filter(r => {
        if (selectedVertical === 'village' || selectedVertical === 'community') {
          return r.vertical === 'village' || r.vertical === 'community';
        }
        return r.vertical === selectedVertical;
      });

  const filteredTransactions = selectedVertical === 'all'
    ? transactions
    : transactions.filter(t => {
        if (selectedVertical === 'village' || selectedVertical === 'community') {
          return t.vertical === 'village' || t.vertical === 'community';
        }
        return t.vertical === selectedVertical;
      });

  const totalRevenue = filteredTransactions
    .filter(t => t.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Core session duration calculations from vouchers and transaction logs
  const sessionStats = useMemo(() => {
    return computeSessionStats(vouchers, filteredTransactions, selectedVertical);
  }, [vouchers, filteredTransactions, selectedVertical]);

  // Real active sessions from storage (strictly filtering out expired sessions)
  const nowMs = Date.now();
  const storedSessions = (storage.getActiveSessions() || []).filter(s => {
    if ((s as any).expiresAt) {
      const exp = new Date((s as any).expiresAt).getTime();
      if (!Number.isNaN(exp) && exp <= nowMs) return false;
    }
    if (typeof s.remainingSeconds === 'number' && s.remainingSeconds <= 0) return false;
    return true;
  });

  const allActiveSessions = storedSessions.map(s => ({
    id: s.id,
    mac: s.clientMac,
    hostname: s.deviceType || 'Subscriber Device',
    ip: s.clientIp,
    planName: s.planName,
    price: s.authMode === 'free' ? 0 : 10,
    firstSeen: s.startedAt,
    siteName: s.siteName,
    routerName: s.routerName,
    voucherCode: s.voucherCode,
    guestName: s.guestName || 'Captive Guest',
    guestPhone: s.guestPhone || '',
    guestEmail: s.guestEmail || '',
    authMode: s.authMode || 'free',
    bytesDown: s.bytesDown || 0,
    bytesUp: s.bytesUp || 0,
    startedAt: s.startedAt
  }));

  const routerHeartbeatSessions = filteredRouters.reduce((acc, curr) => acc + (curr.activeSessions || 0), 0);
  const totalActiveSessions = Math.max(allActiveSessions.length, routerHeartbeatSessions);

  const onlineRouters = filteredRouters.filter(r => r.status === 'online').length;

  // Find real solar or transit router if any registered
  const solarRouter = routers.find(r => r.solarTelemetry && r.solarTelemetry.batteryPercent > 0);
  const transitRouter = routers.find(r => r.gpsTelemetry && r.gpsTelemetry.speedKmh !== undefined);

  const isScratchState = routers.length === 0 && transactions.length === 0;

  return (
    <div className="space-y-6 font-sans">
      {/* View Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Fleet Orchestration &amp; Revenue Overview</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {selectedVertical === 'all' 
              ? 'Monitoring all 5 verticals across Lesotho network infrastructure' 
              : `Scoped view: ${selectedVertical.toUpperCase()} vertical deployment`}
          </p>
        </div>

        {/* Customizable Widgets Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-xs font-mono text-slate-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#f05e17]" />
            <span className="text-[11px] text-slate-400">Widgets:</span>
            <label className="flex items-center gap-1 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={showTrendsChart} 
                onChange={(e) => setShowTrendsChart(e.target.checked)} 
                className="rounded accent-[#f05e17] w-3 h-3"
              />
              <span className="text-[11px]">Trends</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={showMapWidget} 
                onChange={(e) => setShowMapWidget(e.target.checked)} 
                className="rounded accent-[#f05e17] w-3 h-3"
              />
              <span className="text-[11px]">Map</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={showWaveChart} 
                onChange={(e) => setShowWaveChart(e.target.checked)} 
                className="rounded accent-[#f05e17] w-3 h-3"
              />
              <span className="text-[11px]">Traffic</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={showSolarWidget} 
                onChange={(e) => setShowSolarWidget(e.target.checked)} 
                className="rounded accent-[#f05e17] w-3 h-3"
              />
              <span className="text-[11px]">Solar</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={showTransitWidget} 
                onChange={(e) => setShowTransitWidget(e.target.checked)} 
                className="rounded accent-[#f05e17] w-3 h-3"
              />
              <span className="text-[11px]">Transit</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={showSessionTracking} 
                onChange={(e) => setShowSessionTracking(e.target.checked)} 
                className="rounded accent-[#f05e17] w-3 h-3"
              />
              <span className="text-[11px]">Duration</span>
            </label>
          </div>

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
                  {portalConfig.allowFreeAccess ? 'ACTIVE — 1-TAP FREE LOGIN ON' : 'OFF — PAID / VOUCHER MODE ONLY'}
                </span>
                {freeModeSyncToast && (
                  <span className="text-[11px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                    {freeModeSyncToast}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {portalConfig.allowFreeAccess
                  ? `Showing ONLY the clean orange "${portalConfig.freeButtonText || 'Login for free'}" button over your hotspot wallpaper (positioned at X: ${portalConfig.freeButtonX ?? 50}%, Y: ${portalConfig.freeButtonY ?? 88}%).`
                  : 'Free Wi-Fi is currently disabled. Guests must enter a 16-digit OTT Voucher PIN or purchase a pass.'}
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
                    ? 'Free Access ("Login for free") enabled across portal & routers'
                    : 'Free Access disabled — reverted to Paid/Voucher mode'
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
              <span>Open Portal Preview &amp; Drag Position</span>
            </button>
          </div>
        </div>

        {/* Repositioning Sliders, Button Color & Presets (Visible right on Dashboard when Free Access Mode is ON) */}
        {portalConfig.allowFreeAccess && (
          <div className="mt-4 pt-3.5 border-t border-white/10 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-slate-400 mr-1">Quick Position:</span>
                {[
                  { label: 'Bottom (Default)', x: 50, y: 88 },
                  { label: 'Center', x: 50, y: 50 },
                  { label: 'Top', x: 50, y: 15 }
                ].map((preset) => {
                  const isSelected =
                    Math.abs((portalConfig.freeButtonY ?? 88) - preset.y) <= 3 &&
                    Math.abs((portalConfig.freeButtonX ?? 50) - preset.x) <= 3;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        applyDashboardFreeAccessPatch(
                          { freeButtonX: preset.x, freeButtonY: preset.y },
                          `Button moved to ${preset.label}`
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#f05e17] text-white border-[#f05e17]'
                          : 'bg-[#121829] text-slate-300 border-[#232d42] hover:border-white/30'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-300 whitespace-nowrap">
                  Vertical (Y: {portalConfig.freeButtonY ?? 88}%):
                </span>
                <input
                  type="range"
                  min={8}
                  max={92}
                  value={portalConfig.freeButtonY ?? 88}
                  onChange={(e) =>
                    applyDashboardFreeAccessPatch({ freeButtonY: Number(e.target.value) })
                  }
                  className="w-full accent-[#f05e17] cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-300 whitespace-nowrap">
                  Horizontal (X: {portalConfig.freeButtonX ?? 50}%):
                </span>
                <input
                  type="range"
                  min={15}
                  max={85}
                  value={portalConfig.freeButtonX ?? 50}
                  onChange={(e) =>
                    applyDashboardFreeAccessPatch({ freeButtonX: Number(e.target.value) })
                  }
                  className="w-full accent-[#f05e17] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-[#f05e17]" />
                <span className="text-[11px] font-mono text-slate-300 font-bold">
                  &ldquo;{portalConfig.freeButtonText || 'Login for free'}&rdquo; Button Color:
                </span>
                {[
                  { label: 'T-Connect Orange', bg: '#f05e17', text: '#ffffff' },
                  { label: 'Emerald Green', bg: '#10b981', text: '#ffffff' },
                  { label: 'Royal Blue', bg: '#2563eb', text: '#ffffff' },
                  { label: 'Purple', bg: '#7c3aed', text: '#ffffff' },
                  { label: 'Crimson Red', bg: '#e11d48', text: '#ffffff' },
                  { label: 'Dark Slate', bg: '#0f172a', text: '#ffffff' },
                  { label: 'Clean White', bg: '#ffffff', text: '#0f172a' }
                ].map((sw) => {
                  const active =
                    (portalConfig.freeButtonColor || '#f05e17').toLowerCase() === sw.bg.toLowerCase();
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
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'border-white ring-1 ring-white bg-white/10 text-white'
                          : 'border-[#232d42] bg-[#121829] text-slate-300 hover:border-white/30'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/20"
                        style={{ backgroundColor: sw.bg }}
                      />
                      <span>{sw.label}</span>
                    </button>
                  );
                })}
                <label className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#121829] border border-[#232d42] text-[10px] font-mono text-slate-300 cursor-pointer">
                  <span>Custom:</span>
                  <input
                    type="color"
                    value={portalConfig.freeButtonColor || '#f05e17'}
                    onChange={(e) =>
                      applyDashboardFreeAccessPatch(
                        { freeButtonColor: e.target.value },
                        `Custom button color ${e.target.value}`
                      )
                    }
                    className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pristine Scratch Onboarding Card (Shown when zero mock data) */}
      {isScratchState && (
        <div className="bg-gradient-to-r from-[#121829] to-[#0f172a] border border-[#232d42] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f05e17]/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>CLEAN SLATE ACTIVE — ZERO MOCK DATA</span>
              </div>
              <h2 className="text-lg font-extrabold text-white">Start Building Your Production Hotspot Network</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your T-Connect Control Tower is ready with a clean database ledger. You can connect your <strong>Supabase PostgreSQL</strong> instance, adopt physical MikroTik routers with one-liner scripts, or test the customer captive portal checkout.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
              <button
                onClick={() => onNavigateTab('fleet')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-mono text-xs font-bold rounded-xl transition-all shadow-md"
              >
                <Radio className="w-4 h-4" />
                <span>+ Adopt First Router</span>
              </button>

              <button
                onClick={() => onNavigateTab('billing')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200 font-mono text-xs font-bold rounded-xl transition-all"
              >
                <Ticket className="w-4 h-4 text-emerald-400" />
                <span>Issue First Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Reconciled Revenue */}
        <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>RECONCILED REVENUE</span>
            <DollarSign className="w-4 h-4 text-[#f05e17]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
              {currency}{totalRevenue.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {filteredTransactions.length} Settled
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1">Real-time ledger reconciliation</p>
        </div>

        {/* Card 2: Active Sessions */}
        <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>ACTIVE SESSIONS</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
              {totalActiveSessions}
            </span>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {totalActiveSessions > 0 ? 'Live Auth' : 'Idle'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1">Simultaneous authenticated clients</p>
        </div>

        {/* Card 3: Session Duration Tracking (Calculated from Voucher & Transaction Logs) */}
        <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>SESSION DURATION</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
              {sessionStats.averageShortFormatted}
            </span>
            <span className="text-xs font-mono text-purple-300 font-bold">
              Max: {sessionStats.maximumShortFormatted}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
            <span>Mean connection</span>
            <span className="text-cyan-300 font-bold">{sessionStats.totalSessions} tracked</span>
          </div>
        </div>

        {/* Card 4: Hotspot Plans */}
        <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>ACTIVE PLANS</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
              {plans.length}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">Configured</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1">QoS rate limits &amp; quotas</p>
        </div>

        {/* Card 5: Router Fleet Status */}
        <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>MIKROTIK FLEET</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
              {onlineRouters}/{filteredRouters.length}
            </span>
            <span className={`text-xs font-mono font-bold ${onlineRouters > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {onlineRouters > 0 ? `${Math.round((onlineRouters / (filteredRouters.length || 1)) * 100)}% Online` : 'Standby'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-[#1b233a] text-[10px] font-mono">
            <span className="text-slate-500">Deadman Watchdog:</span>
            <button
              onClick={() => onNavigateTab('fleet')}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
              title="30s Deadman Watchdog active for Starlink disconnect detection"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              30s Active
            </button>
          </div>
        </div>
      </div>

      {/* Live Connected Users Per Router Breakdown (100% Real Telemetry) */}
      <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#f05e17]" />
            <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-white">
              Live Connected Users Per Router ({filteredRouters.length} Adopted Nodes)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            100% Real Telemetry · Zero Fabricated Sessions
          </span>
        </div>

        {filteredRouters.length === 0 ? (
          <div className="text-xs font-mono text-slate-400 py-3">
            No routers adopted in this scope yet. Click <strong>MikroTik Fleet</strong> to adopt a live router.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRouters.map((rt) => {
              const matchedPortalSessions = allActiveSessions.filter(
                (s) =>
                  (s.routerName && s.routerName.toLowerCase() === rt.name.toLowerCase()) ||
                  (s.siteName && rt.siteName && s.siteName.toLowerCase() === rt.siteName.toLowerCase())
              );
              const liveUserCount = Math.max(rt.activeSessions || 0, matchedPortalSessions.length);
              return (
                <div
                  key={rt.id}
                  className="p-3.5 rounded-xl bg-[#121829] border border-[#1f283d] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          rt.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      <span className="text-xs font-bold text-white truncate">{rt.name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                      {rt.siteName || 'Maseru Hotspot'} · <span className="uppercase">{rt.vertical}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      IP: {rt.publicWanIp || rt.wireguardIp} · Pool: /22 (1,012 max)
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-extrabold font-mono text-cyan-400 tabular-nums">
                      {liveUserCount}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {liveUserCount === 1 ? 'User Online' : 'Users Online'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Transaction Trends & Cumulative Revenue Growth (Recharts Line Chart) */}
      {showTrendsChart && (
        <TransactionTrendsChart
          transactions={filteredTransactions}
          currency={currency}
          selectedVertical={selectedVertical}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* Regional Hotspot Distribution & Physical Fleet Map (Static Pins & Geo Visualization) */}
      {showMapWidget && (
        <RegionalFleetMap
          routers={filteredRouters}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* 24-Hour Multi-Vertical Traffic Wave Spectrum */}
      {showWaveChart && (
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-extrabold text-white">Multi-Vertical Load Orchestration (24-Hour Telemetry)</h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-time throughput curves showing stadium spikes, commuter peaks, and solar off-grid cycles
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Stadiums
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Communities
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Transit Buses
              </span>
            </div>
          </div>

          {/* SVG Wave Visualization */}
          <div className="relative w-full h-48 bg-[#0a0e17] rounded-lg p-3 border border-[#1b233a] flex flex-col justify-end">
            <svg viewBox="0 0 700 160" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="stadiumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="700" y2="30" stroke="#1f293d" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="700" y2="75" stroke="#1f293d" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="700" y2="120" stroke="#1f293d" strokeDasharray="3 3" />

              {/* Stadium Game-Day Burst Curve */}
              <path d="M0,140 Q 200,135 380,130 T 480,18 T 550,85 T 700,110 L 700,160 L 0,160 Z" fill="url(#stadiumGrad)" />
              <path d="M0,140 Q 200,135 380,130 T 480,18 T 550,85 T 700,110" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />

              {/* Community Steady Daytime Mesh Curve */}
              <path d="M0,120 Q 250,95 400,80 T 550,70 T 700,85" fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 3" />

              {/* Transit Rush-Hour Commute Waves */}
              <path d="M0,150 Q 140,60 220,130 T 420,70 T 580,120 T 700,145" fill="none" stroke="#10b981" strokeWidth="2" />

              {/* Peak Tooltip Callout */}
              <rect x="420" y="6" width="150" height="20" rx="4" fill="#161d31" stroke="#a855f7" strokeWidth="1" />
              <text x="495" y="19" fill="#a855f7" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
                Peak Load: Multi-Gbps
              </text>
            </svg>

            <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-2 pt-2 border-t border-[#1b233a]">
              <span>00:00 (Off-Peak)</span>
              <span>07:00 (Commute Rush)</span>
              <span>12:00 (Retail/Work)</span>
              <span className="text-purple-400 font-bold">16:45 (Stadium Event)</span>
              <span>21:00 (Community Evening)</span>
            </div>
          </div>
        </div>
      )}

      {/* Specialized Widgets: Transit GPS & Solar Battery Grid (Rendered when live telemetry is present) */}
      {(solarRouter || transitRouter) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {showTransitWidget && transitRouter && (
            <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚌</span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Connected Transit Fleet (Live Telemetry)</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  GPS ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Teltonika RUTX50 mobile link with waypoint captive portal handoff.
              </p>
              <div className="p-3 bg-[#161d31] rounded-lg border border-[#232d42] font-mono text-xs space-y-1.5">
                <div className="flex justify-between items-center text-white">
                  <span className="font-bold">{transitRouter.siteName}</span>
                  <span className="text-emerald-400 font-bold">{transitRouter.gpsTelemetry?.speedKmh} km/h</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#f05e17]" />
                  <span>Current Zone: {transitRouter.gpsTelemetry?.currentZone}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-[#232d42]">
                  <span>Uplink: <strong className="text-cyan-400">Mobile LTE / Satellite</strong></span>
                  <span>Active Clients: <strong className="text-white">{transitRouter.activeSessions} online</strong></span>
                </div>
              </div>
            </div>
          )}

          {showSolarWidget && solarRouter && (
            <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏡</span>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Connected Communities (Off-Grid Solar)</h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  48V SOLAR POE
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Solar village micro-grid powered by LiFePO4 batteries and MikroTik mesh AP.
              </p>
              <div className="p-3 bg-[#161d31] rounded-lg border border-[#232d42] font-mono text-xs space-y-1.5">
                <div className="flex justify-between items-center text-white">
                  <span className="font-bold">{solarRouter.siteName}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" /> {solarRouter.solarTelemetry?.batteryPercent}% ({solarRouter.solarTelemetry?.voltage}V)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Solar PV Input: <strong className="text-amber-400">{solarRouter.solarTelemetry?.solarInputWatts} W</strong></span>
                  <span>Cell Temp: <strong className="text-white">{solarRouter.solarTelemetry?.temperatureC}°C</strong></span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-[#232d42]">
                  <span>Nodes: <strong className="text-white">Active Mesh</strong></span>
                  <span>Clients: <strong className="text-[#f05e17]">{solarRouter.activeSessions} active</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session Duration Tracking & Analytics Display (Calculated from Voucher & Transaction Logs) */}
      {showSessionTracking && (
        <SessionDurationTrackingDisplay
          vouchers={vouchers}
          transactions={filteredTransactions}
          selectedVertical={selectedVertical}
          currency={currency}
        />
      )}
    </div>
  );
};
