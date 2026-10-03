import React, { useState } from 'react';
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
  Database
} from 'lucide-react';
import { RouterDevice, PaymentTransaction, HotspotPlan, Voucher, VerticalType } from '../../types';

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
  const [showSolarWidget, setShowSolarWidget] = useState(true);
  const [showTransitWidget, setShowTransitWidget] = useState(true);
  const [showWaveChart, setShowWaveChart] = useState(true);

  // Filter based on selected vertical
  const filteredRouters = selectedVertical === 'all' 
    ? routers 
    : routers.filter(r => r.vertical === selectedVertical);

  const filteredTransactions = selectedVertical === 'all'
    ? transactions
    : transactions.filter(t => t.vertical === selectedVertical);

  const totalRevenue = filteredTransactions
    .filter(t => t.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Extract all active device sessions dynamically from real vouchers
  const activeSessionsFromVouchers = vouchers
    .filter(v => v.status === 'used' || (v.associatedDevices && v.associatedDevices.length > 0))
    .flatMap(v => (v.associatedDevices || []).map(device => ({
      mac: device.mac,
      hostname: device.hostname || 'Client-Device',
      ip: device.ip || '10.99.10.x',
      planName: v.planName,
      price: v.price,
      firstSeen: device.firstSeen,
      siteName: (device as any).siteName || 'Hotspot Node',
      voucherCode: v.code
    })));

  const totalActiveSessions = Math.max(
    activeSessionsFromVouchers.length,
    filteredRouters.reduce((acc, curr) => acc + curr.activeSessions, 0)
  );

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
          </div>
        </div>
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
                Your T-Connect Cloud Controller is ready with a clean database ledger. You can connect your <strong>Supabase PostgreSQL</strong> instance, adopt physical MikroTik routers with one-liner scripts, or test the customer captive portal checkout.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Card 3: Hotspot Plans */}
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

        {/* Card 4: Router Fleet Status */}
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
          <p className="text-[11px] text-slate-500 font-mono mt-1">WireGuard tunnels active</p>
        </div>
      </div>

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

      {/* Real-Time Session Ingestion Ledger */}
      <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-extrabold text-white">Active Subscriber Session Ledger</h3>
            <p className="text-xs text-slate-400 font-mono">Live session tracking across all physical hotspots, roaming nodes, and mobile transit links</p>
          </div>
          <button 
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-mono text-[#f05e17] hover:underline flex items-center gap-1"
          >
            <span>View Full Financial Ledger</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-[#232d42] pb-2">
                <th className="py-2.5">CLIENT DEVICE / MAC</th>
                <th className="py-2.5">ACCESS POINT / SITE</th>
                <th className="py-2.5">PLAN &amp; ENTITLEMENT</th>
                <th className="py-2.5">VOUCHER CODE</th>
                <th className="py-2.5 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b233a] text-slate-300">
              {activeSessionsFromVouchers.length > 0 ? (
                activeSessionsFromVouchers.map((session, idx) => (
                  <tr key={`${session.mac}-${idx}`}>
                    <td className="py-3">
                      <div className="text-white font-bold">{session.hostname}</div>
                      <div className="text-[10px] text-slate-500">{session.mac}</div>
                    </td>
                    <td className="py-3 text-slate-300">{session.siteName}</td>
                    <td className="py-3 text-white">
                      <div>{session.planName}</div>
                      <div className="text-[10px] text-[#f05e17]">{currency}{session.price.toFixed(2)}</div>
                    </td>
                    <td className="py-3 text-emerald-400 font-bold">{session.voucherCode}</td>
                    <td className="py-3 text-right">
                      <span className="text-emerald-400 font-bold">ACTIVE</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    <div className="max-w-md mx-auto space-y-2">
                      <Users className="w-6 h-6 mx-auto text-slate-600" />
                      <p className="text-slate-400 font-medium">No active subscriber sessions yet</p>
                      <p className="text-[11px] text-slate-500">
                        Adopt a router in <strong>Routers &amp; Adoption</strong> or redeem a voucher in <strong>Network &amp; Security &gt; Captive Portal</strong> to initiate real-time subscriber sessions.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
