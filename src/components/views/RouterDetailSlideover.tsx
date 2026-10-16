import React, { useState, useEffect, useRef } from 'react';
import { RouterDevice, VerticalType, AuditLogEntry } from '../../types';
import { storage } from '../../services/storage';
import { auditService } from '../../services/audit';
import { useRouterActions } from '../../hooks/useRouterActions';
import { RouterActionToolbar } from '../common/RouterActionToolbar';
import { RemoteTerminalModal } from '../common/RemoteTerminalModal';
import { WebFigLauncherModal } from './WebFigLauncherModal';
import { RouterAuditModal } from './RouterAuditModal';
import { 
  X, 
  Terminal, 
  Monitor, 
  Activity, 
  Radio, 
  Sliders, 
  ShieldCheck, 
  Smartphone, 
  Power, 
  RefreshCw, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Clock, 
  Zap,
  Send, 
  Trash2, 
  Download, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Sun,
  Navigation,
  Users,
  Compass,
  Building2,
  Tag,
  Image as ImageIcon
} from 'lucide-react';

interface RouterDetailSlideoverProps {
  isOpen: boolean;
  onClose: () => void;
  router: RouterDevice | null;
  onUpdateVertical?: (routerId: string, vertical: VerticalType) => void;
  onNavigateToBuilder?: (vertical: VerticalType) => void;
}

export const RouterDetailSlideover: React.FC<RouterDetailSlideoverProps> = ({
  isOpen,
  onClose,
  router,
  onUpdateVertical,
  onNavigateToBuilder
}) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'scope' | 'terminal' | 'audit'>('telemetry');
  const [selectedVertical, setSelectedVertical] = useState<VerticalType>(router?.vertical || 'hotspot');
  
  // External Client Tenant Group & Custom Background
  const [selectedTenantGroupId, setSelectedTenantGroupId] = useState<string>(router?.tenantGroupId || '');
  const [customBgInput, setCustomBgInput] = useState<string>(router?.customBgUrl || '');
  const [tagsInput, setTagsInput] = useState<string>((router?.tags || []).join(', '));
  const [isSavingTenantPolicy, setIsSavingTenantPolicy] = useState(false);

  // Per-Hotspot Free Access Mode State
  const [freeModeActive, setFreeModeActive] = useState<boolean>(Boolean(router?.freeModeEnabled));
  const [freeDurationMinutes, setFreeDurationMinutes] = useState<number>(router?.freeDurationMinutes || 30);

  useEffect(() => {
    if (router) {
      setFreeModeActive(Boolean(router.freeModeEnabled));
      setFreeDurationMinutes(router.freeDurationMinutes || 30);
    }
  }, [router]);
  
  // Embedded terminal state
  const [cliCommand, setCliCommand] = useState('');
  const [cliLines, setCliLines] = useState<Array<{ id: string; type: 'input' | 'output' | 'system' | 'error'; text: string }>>([]);
  const [cliLoading, setCliLoading] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Scoped audit trail state
  const [routerAudits, setRouterAudits] = useState<AuditLogEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Use the reusable hook
  const {
    isActionPending,
    activeAction,
    actionToast,
    dismissToast,
    terminalModalRouter,
    webfigModalRouter,
    auditModalRouter,
    openTerminal,
    closeTerminal,
    openWebFig,
    closeWebFig,
    openAudit,
    closeAudit,
    handleReboot,
    handleResync
  } = useRouterActions(router);

  // Synchronize vertical on router change
  useEffect(() => {
    if (router) {
      setSelectedVertical(router.vertical);
      setSelectedTenantGroupId(router.tenantGroupId || '');
      setCustomBgInput(router.customBgUrl || '');
      setTagsInput((router.tags || []).join(', '));
      // Initialize terminal welcome
      setCliLines([
        {
          id: 'init-1',
          type: 'system',
          text: `MikroTik RouterOS 7.15.2 (stable) on ${router.name}`
        },
        {
          id: 'init-2',
          type: 'system',
          text: `Connected via WireGuard Tunnel: ${router.wireguardIp || '10.99.1.50'}`
        }
      ]);
    }
  }, [router]);

  // Load audit logs for this router
  useEffect(() => {
    if (!router || !isOpen) return;

    const loadAudits = () => {
      setRouterAudits(auditService.getRouterLogs(router.id, 100));
    };

    loadAudits();
    const unsub = auditService.subscribe(loadAudits);
    return () => unsub();
  }, [router, isOpen]);

  // Scroll terminal
  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [cliLines, activeTab]);

  if (!isOpen || !router) return null;

  const handleVerticalChange = (newVertical: VerticalType) => {
    setSelectedVertical(newVertical);
    storage.updateRouterVertical(router.id, newVertical);
    if (onUpdateVertical) {
      onUpdateVertical(router.id, newVertical);
    }
  };

  const executeEmbeddedCli = async (cmdToRun?: string) => {
    const rawCmd = (cmdToRun !== undefined ? cmdToRun : cliCommand).trim();
    if (!rawCmd) return;

    setCliLines(prev => [
      ...prev,
      {
        id: `in-${Date.now()}`,
        type: 'input',
        text: `[admin@${router.name.split(' ')[0]}] > ${rawCmd}`
      }
    ]);
    setCliCommand('');
    setCliLoading(true);

    try {
      const res = await fetch(`/api/devices/${router.id}/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: rawCmd })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCliLines(prev => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'output',
            text: data.output
          }
        ]);
        auditService.logTerminalCommand(router, rawCmd, {
          output: data.output,
          isSuccess: true,
          executionTimeMs: data.durationMs || 70
        });

        if (rawCmd.includes('reboot')) {
          auditService.logRouterReboot(router, {
            source: 'terminal_modal',
            reason: `Dispatched via inline terminal: "${rawCmd}"`
          });
        }
      } else {
        const errorMsg = data.message || `bad command name ${rawCmd}`;
        setCliLines(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            text: errorMsg
          }
        ]);
        auditService.logTerminalCommand(router, rawCmd, {
          isSuccess: false,
          errorMessage: errorMsg
        });
      }
    } catch (err: any) {
      setCliLines(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'error',
          text: `Connection failed: ${err.message}`
        }
      ]);
      auditService.logTerminalCommand(router, rawCmd, {
        isSuccess: false,
        errorMessage: err.message
      });
    } finally {
      setCliLoading(false);
    }
  };

  const verticalMeta: Record<VerticalType, { name: string; icon: string; color: string; desc: string; sampleSpeed: string }> = {
    hotspot: {
      name: 'Public Hotspot',
      icon: '☕',
      color: '#f05e17',
      desc: 'Walk-in guest access for cafes, co-working, and retail with voucher & mobile money checkout.',
      sampleSpeed: '5.0 Mbps Down / 2.5 Mbps Up'
    },
    community: {
      name: 'Village & Mesh',
      icon: '🏡',
      color: '#06b6d4',
      desc: 'Rural village community mesh with solar power station telemetry and off-grid resilience.',
      sampleSpeed: '3.0 Mbps Down / 1.5 Mbps Up'
    },
    village: {
      name: 'Village & Mesh',
      icon: '🏡',
      color: '#06b6d4',
      desc: 'Rural village community mesh with solar power station telemetry and off-grid resilience.',
      sampleSpeed: '3.0 Mbps Down / 1.5 Mbps Up'
    },
    bus: {
      name: 'Buses & Transit',
      icon: '🚌',
      color: '#3b82f6',
      desc: 'In-motion Starlink for coaches, transit minibuses, and highway fleets with GPS tracking.',
      sampleSpeed: '4.0 Mbps Down / 2.0 Mbps Up (Streaming QoS)'
    },
    stadium: {
      name: 'Stadiums & Arenas',
      icon: '🏟️',
      color: '#a855f7',
      desc: 'Ultra-high-density burst connectivity for expos, arenas, and live sports events.',
      sampleSpeed: '12.0 Mbps Down / 6.0 Mbps Up (Burst QoS)'
    },
    park: {
      name: 'Municipal Parks',
      icon: '🌲',
      color: '#10b981',
      desc: 'Civic smart poles, public botanical gardens, and solar street plazas.',
      sampleSpeed: '2.0 Mbps Down / 1.0 Mbps Up'
    }
  };

  const currentMeta = verticalMeta[selectedVertical] || verticalMeta.hotspot;

  const filteredAudits = routerAudits.filter(a => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      a.action.toLowerCase().includes(q) ||
      a.details.toLowerCase().includes(q) ||
      (a.command && a.command.toLowerCase().includes(q)) ||
      a.actor.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-[#0b0f19] border-l border-slate-700/80 shadow-2xl flex flex-col font-mono text-xs animate-in slide-in-from-right duration-200">
          
          {/* Slide-over Header */}
          <div className="p-5 bg-[#0f1422] border-b border-slate-800 space-y-3 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">{router.name}</h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    router.status === 'online' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : router.status === 'offline'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}>
                    {router.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-slate-400 text-[11px]">
                  <span>{router.model}</span>
                  <span>·</span>
                  <span>{router.siteName}</span>
                  <span>·</span>
                  <span className="text-cyan-400">{router.rosVersion.toUpperCase()}</span>
                  <span>·</span>
                  <span className="text-emerald-400">{router.wireguardIp || '10.99.1.50'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                title="Close Detailed View"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vertical Scope Note & Selector */}
            <div className="p-3 bg-[#131b2e] rounded-xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base">{currentMeta.icon}</span>
                <div>
                  <span className="text-slate-400 text-[10px] block uppercase font-bold">DEPLOYMENT VERTICAL SCOPE:</span>
                  <span className="text-white font-bold">{currentMeta.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Change Scope:</span>
                <select
                  value={selectedVertical}
                  onChange={(e) => handleVerticalChange(e.target.value as VerticalType)}
                  className="px-2.5 py-1 bg-[#1a233a] border border-slate-600 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#f05e17] cursor-pointer"
                >
                  <option value="hotspot">☕ Hotspot (Cafes &amp; Retail)</option>
                  <option value="village">🏡 Village (Solar Mesh &amp; Rural)</option>
                  <option value="bus">🚌 Bus (Transit &amp; Long-Distance)</option>
                  <option value="stadium">🏟️ Stadium (Arenas &amp; High-Density)</option>
                  <option value="park">🌲 Park (Municipal Green Zones)</option>
                </select>
              </div>
            </div>

            {/* Persistent Reusable Router Action Toolbar */}
            <div className="pt-1">
              <RouterActionToolbar
                router={router}
                variant="header"
                onOpenTerminal={() => setActiveTab('terminal')}
                onOpenWebfig={() => openWebFig(router)}
                onOpenAudit={() => setActiveTab('audit')}
                onReboot={() => handleReboot(router)}
                onResync={() => handleResync(router)}
                isPending={isActionPending}
                activeAction={activeAction}
              />
            </div>

            {/* Toast Notification Banner */}
            {actionToast && (
              <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs animate-in fade-in duration-100 ${
                actionToast.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}>
                <span>{actionToast.message}</span>
                <button onClick={dismissToast} className="text-slate-400 hover:text-white ml-2">✕</button>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-[#090d16] px-5 gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`py-3 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'telemetry'
                  ? 'border-[#f05e17] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#f05e17]" />
              <span>Telemetry &amp; Health</span>
            </button>

            <button
              onClick={() => setActiveTab('scope')}
              className={`py-3 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'scope'
                  ? 'border-[#f05e17] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scope Configuration</span>
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className={`py-3 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'terminal'
                  ? 'border-[#f05e17] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Terminal</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'border-[#f05e17] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Audit Trail ({routerAudits.length})</span>
            </button>
          </div>

          {/* Tab Content Canvas */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* TAB 1: TELEMETRY & HEALTH */}
            {activeTab === 'telemetry' && (
              <div className="space-y-4">
                {/* Core Hardware Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#101626] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase block mb-1">CPU LOAD</span>
                    <div className="text-lg font-bold text-white flex items-center gap-1">
                      <Cpu className="w-4 h-4 text-orange-400" />
                      <span>{router.cpuLoad}%</span>
                    </div>
                    <span className="text-[10px] text-slate-500">ARM64 Quad-Core</span>
                  </div>

                  <div className="bg-[#101626] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase block mb-1">MEMORY USAGE</span>
                    <div className="text-lg font-bold text-white flex items-center gap-1">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      <span>{router.memoryUsage}%</span>
                    </div>
                    <span className="text-[10px] text-slate-500">1024 MB DDR4</span>
                  </div>

                  <div className="bg-[#101626] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase block mb-1">UPTIME</span>
                    <div className="text-lg font-bold text-white flex items-center gap-1">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>{router.uptime}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Continuous runtime</span>
                  </div>

                  <div className="bg-[#101626] p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase block mb-1">ACTIVE SESSIONS</span>
                    <div className="text-lg font-bold text-white flex items-center gap-1">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>{router.activeSessions}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">RADIUS authenticated</span>
                  </div>
                </div>

                {/* Vertical-Specific Telemetry Box */}
                {selectedVertical === 'bus' && (
                  <div className="p-4 bg-blue-950/30 border border-blue-500/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-white uppercase text-xs">Bus GPS &amp; In-Motion Starlink Tracker</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                        ACTIVE ROUTE TRANSIT
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-black/30 p-2.5 rounded-lg border border-blue-800/40">
                        <span className="text-slate-400 text-[10px] block">CURRENT VEHICLE SPEED</span>
                        <div className="text-base font-bold text-blue-300">
                          {router.gpsTelemetry?.speedKmh || 74} km/h
                        </div>
                      </div>

                      <div className="bg-black/30 p-2.5 rounded-lg border border-blue-800/40">
                        <span className="text-slate-400 text-[10px] block">HIGHWAY ZONE</span>
                        <div className="text-xs font-bold text-white truncate">
                          {router.gpsTelemetry?.currentZone || 'A1 Highway (Maseru - Leribe)'}
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Equipped with in-motion Starlink Flat High Performance dish and passenger captive portal. Automatic Wi-Fi roaming enabled across bus terminals.
                    </p>
                  </div>
                )}

                {(selectedVertical === 'community' || selectedVertical === 'village' || selectedVertical === 'park') && (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white uppercase text-xs">Off-Grid Solar Micro-Grid Telemetry</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                        SOLAR HARVESTING NOMINAL
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-black/30 p-2.5 rounded-lg border border-emerald-800/40">
                        <span className="text-slate-400 text-[10px] block">BATTERY STATE</span>
                        <div className="text-base font-bold text-emerald-300">
                          {router.solarTelemetry?.batteryPercent || 92}%
                        </div>
                      </div>

                      <div className="bg-black/30 p-2.5 rounded-lg border border-emerald-800/40">
                        <span className="text-slate-400 text-[10px] block">SOLAR INPUT</span>
                        <div className="text-base font-bold text-emerald-300">
                          {router.solarTelemetry?.solarInputWatts || 385} W
                        </div>
                      </div>

                      <div className="bg-black/30 p-2.5 rounded-lg border border-emerald-800/40">
                        <span className="text-slate-400 text-[10px] block">DC BUS VOLTAGE</span>
                        <div className="text-base font-bold text-white">
                          {router.solarTelemetry?.voltage || 27.6} V
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Network Interface & WireGuard State */}
                <div className="p-4 bg-[#101626] rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-white">WireGuard Controller Tunnel</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>TUNNEL SYNCHRONIZED</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">TUNNEL IP (MANAGEMENT)</span>
                      <code className="text-emerald-400 text-xs">{router.wireguardIp || '10.99.1.50'}/16</code>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">PUBLIC WAN IP</span>
                      <code className="text-slate-200 text-xs">{router.publicWanIp || '196.44.179.82'}</code>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">HARDWARE MAC ADDRESS</span>
                      <code className="text-slate-300 text-xs">{router.macAddress}</code>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">BOARD ARCHITECTURE</span>
                      <span className="text-slate-300 text-xs">{router.boardName || 'hAP ax³'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SCOPE & CAPTIVE PORTAL CONFIG */}
            {activeTab === 'scope' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#101626] rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{currentMeta.icon}</span>
                      <div>
                        <h3 className="font-bold text-white text-sm">{currentMeta.name} Profile</h3>
                        <p className="text-slate-400 text-[11px]">{currentMeta.desc}</p>
                      </div>
                    </div>
                    
                    {onNavigateToBuilder && (
                      <button
                        onClick={() => onNavigateToBuilder(selectedVertical)}
                        className="px-3 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg text-xs transition-colors shrink-0 shadow-sm cursor-pointer"
                      >
                        Edit in Portal Builder &rarr;
                      </button>
                    )}
                  </div>

                  {/* Profile Alignment Details */}
                  <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#080b12] rounded-lg border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">BANDWIDTH QUOTAS</span>
                      <div className="text-emerald-400 font-bold">{currentMeta.sampleSpeed}</div>
                      <p className="text-slate-500 text-[10px]">
                        QoS queues configured at MikroTik Hotspot user profile level
                      </p>
                    </div>

                    <div className="p-3 bg-[#080b12] rounded-lg border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">PAYMENT GATEWAYS</span>
                      <div className="text-cyan-400 font-bold">EcoCash + MyWallet + OTTVoucher</div>
                      <p className="text-slate-500 text-[10px]">
                        Aligned with Lesotho mobile money STK push &amp; physical voucher slips
                      </p>
                    </div>
                  </div>

                  {/* Vertical-Specific Features */}
                  <div className="p-3 bg-[#131b2e] rounded-lg border border-slate-700/60 text-[11px] space-y-2">
                    <span className="text-slate-300 font-bold block">Scope Configuration Summary:</span>
                    <ul className="space-y-1 text-slate-400 list-disc list-inside">
                      <li>Captive portal welcome branding tuned for {currentMeta.name}.</li>
                      <li>Walled garden rules permit payment gateway callbacks without consuming client time.</li>
                      <li>Free trial access toggled: {freeModeActive ? `ENABLED (${freeDurationMinutes} min free session)` : 'DISABLED (Voucher / Payment Required)'}.</li>
                      <li>Hardware isolation: Direct WebFig available on port 80 over WireGuard.</li>
                    </ul>
                  </div>
                </div>

                {/* Per-Hotspot Free Access Mode Controller Card */}
                <div className="p-4 bg-[#101726] rounded-xl border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#f05e17]" />
                      <div>
                        <h4 className="text-white font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
                          <span>Per-Hotspot Free Access Mode</span>
                          <span className="text-[10px] text-amber-300 font-normal">({router.name})</span>
                        </h4>
                        <p className="text-slate-400 text-[10px]">
                          Emergency or promotional bypass: allows guests at this specific location to connect free without compromising other hotspots.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !freeModeActive;
                        setFreeModeActive(next);
                        storage.toggleRouterFreeMode(router.id, next, freeDurationMinutes);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 ${
                        freeModeActive
                          ? 'bg-[#f05e17] text-white shadow-orange-950/40'
                          : 'bg-[#1b233a] text-slate-400 border border-[#232d42] hover:text-white'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>{freeModeActive ? '⚡ Free Mode ACTIVE' : '🔒 Paid / Voucher Mode'}</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono pt-1">
                    <span className="text-slate-300 text-[11px]">Session Duration Granted:</span>
                    <div className="flex items-center gap-2">
                      {[15, 30, 60, 120].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            setFreeDurationMinutes(mins);
                            if (freeModeActive) {
                              storage.toggleRouterFreeMode(router.id, true, mins);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                            freeDurationMinutes === mins
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-[#161d31] text-slate-400 border-[#232d42] hover:text-white'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 pl-1">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={freeDurationMinutes}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFreeDurationMinutes(val);
                            if (freeModeActive) {
                              storage.toggleRouterFreeMode(router.id, true, val);
                            }
                          }}
                          className="w-14 px-1.5 py-0.5 bg-[#0b0f19] border border-[#232d42] rounded text-white text-center font-bold"
                        />
                        <span>mins</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-500/10 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Enforced Bandwidth: <strong className="text-emerald-400 font-mono">30M Down / 10M Up</strong></span>
                    <span className="text-[10px] text-slate-500 font-mono">(Hidden on guest screens)</span>
                  </div>
                </div>

                {/* External Client Tenant Group & Dynamic Splash Policy Card */}
                <div className="p-4 bg-[#101626] rounded-xl border border-purple-900/40 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-purple-900/30 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      <div>
                        <h4 className="text-white font-bold text-xs uppercase tracking-wide">
                          External Client Group &amp; Splash Policy
                        </h4>
                        <p className="text-slate-400 text-[10px]">
                          Dynamic group policy mapped to router tags for multi-tenant portal branding
                        </p>
                      </div>
                    </div>
                    {router.tenantGroupId && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/60 font-mono">
                        TENANT BOUND
                      </span>
                    )}
                  </div>

                  {/* Tenant Group Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <span>Assigned Client Group:</span>
                      <span className="text-[10px] text-slate-500 font-normal">(Determines captive splash wallpaper)</span>
                    </label>
                    <select
                      value={selectedTenantGroupId}
                      onChange={(e) => setSelectedTenantGroupId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                    >
                      <option value="">None — Standard T-Connect Brand Splash</option>
                      {storage.getTenantGroups().map((group) => (
                        <option key={group.id} value={group.id}>
                          🏢 {group.name} ({group.tag})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Router Policy Tags */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-purple-400" />
                        <span>Router Policy Tags:</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">Comma-separated</span>
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g. client:maluti-resorts, vip-lounge, outdoor-patio"
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-700 rounded-lg text-purple-200 text-xs font-mono focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-[10px] text-slate-500">
                      Routers matching a client tag automatically inherit that external group's custom splash wallpaper.
                    </p>
                  </div>

                  {/* Direct Wallpaper Override URL */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Direct Splash Wallpaper Override (Optional):</span>
                      </span>
                      {customBgInput && (
                        <button
                          type="button"
                          onClick={() => setCustomBgInput('')}
                          className="text-[10px] text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <input
                      type="text"
                      value={customBgInput}
                      onChange={(e) => setCustomBgInput(e.target.value)}
                      placeholder="https://images.unsplash.com/... or custom CDN image"
                      className="w-full px-3 py-2 bg-[#090d16] border border-slate-700 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Active Resolved Splash Preview */}
                  <div className="p-3 bg-[#080b12] rounded-lg border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Active Resolved Splash Background:
                    </span>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-20 h-12 rounded-lg bg-cover bg-center border border-slate-700 shrink-0 shadow-inner"
                        style={{
                          backgroundImage: `url(${customBgInput || (selectedTenantGroupId ? storage.getTenantGroups().find(g => g.id === selectedTenantGroupId)?.customBgUrl : '') || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80'})`
                        }}
                      />
                      <div className="text-[10px] text-slate-400 font-mono space-y-0.5 truncate">
                        <div className="text-white font-bold truncate">
                          {customBgInput
                            ? '🎯 Direct Router Override Wallpaper'
                            : selectedTenantGroupId
                            ? `🏢 Inherited from ${storage.getTenantGroups().find(g => g.id === selectedTenantGroupId)?.name}`
                            : '☕ Standard T-Connect Default Wallpaper'}
                        </div>
                        <div className="text-slate-500 truncate text-[9px]">
                          {customBgInput || (selectedTenantGroupId ? storage.getTenantGroups().find(g => g.id === selectedTenantGroupId)?.customBgUrl : 'Standard')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isSavingTenantPolicy}
                      onClick={() => {
                        setIsSavingTenantPolicy(true);
                        const cleanTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
                        storage.assignRouterToTenantGroup(router.id, selectedTenantGroupId || null);
                        storage.updateRouterTags(router.id, cleanTags);
                        storage.updateRouterCustomBg(router.id, customBgInput);
                        setTimeout(() => {
                          setIsSavingTenantPolicy(false);
                        }, 300);
                      }}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {isSavingTenantPolicy ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Policy...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Save Client Group Policy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: EMBEDDED LIVE TERMINAL */}
            {activeTab === 'terminal' && (
              <div className="space-y-3">
                <div className="bg-black/90 border border-slate-800 rounded-xl h-[380px] flex flex-col overflow-hidden">
                  {/* Presets Header */}
                  <div className="p-2 bg-[#0d121f] border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                    <span className="text-slate-500 text-[10px] font-bold mr-1 shrink-0 uppercase">Quick CLI:</span>
                    {[
                      { label: 'Resources', cmd: '/system resource print' },
                      { label: 'IP Addresses', cmd: '/ip address print' },
                      { label: 'Interfaces', cmd: '/interface print' },
                      { label: 'Active Hotspot', cmd: '/ip hotspot active print' },
                      { label: 'Ping Canary', cmd: '/ping 1.1.1.1 count=4' },
                      { label: 'Reboot', cmd: '/system reboot' }
                    ].map((p) => (
                      <button
                        key={p.cmd}
                        onClick={() => executeEmbeddedCli(p.cmd)}
                        disabled={cliLoading}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Terminal Screen */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-1 text-xs select-text">
                    {cliLines.map((line) => {
                      if (line.type === 'system') {
                        return <div key={line.id} className="text-slate-500 text-[11px]">{line.text}</div>;
                      }
                      if (line.type === 'input') {
                        return <div key={line.id} className="text-cyan-300 font-bold mt-1.5">{line.text}</div>;
                      }
                      if (line.type === 'error') {
                        return <div key={line.id} className="text-rose-400 pl-2 whitespace-pre">{line.text}</div>;
                      }
                      return <div key={line.id} className="text-emerald-300 pl-2 whitespace-pre leading-relaxed">{line.text}</div>;
                    })}
                    {cliLoading && (
                      <div className="flex items-center gap-2 text-amber-400 py-1 pl-2">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Executing CLI command over WireGuard tunnel...</span>
                      </div>
                    )}
                    <div ref={terminalBottomRef} />
                  </div>

                  {/* Terminal Input */}
                  <div className="p-2.5 bg-[#0f1422] border-t border-slate-800 flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">[admin@{router.name.split(' ')[0]}] &gt;</span>
                    <input
                      type="text"
                      value={cliCommand}
                      onChange={(e) => setCliCommand(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && executeEmbeddedCli()}
                      placeholder="Type command (e.g. /system resource print)..."
                      className="flex-1 bg-transparent text-white focus:outline-none placeholder-slate-600 font-mono text-xs"
                    />
                    <button
                      onClick={() => executeEmbeddedCli()}
                      disabled={cliLoading || !cliCommand.trim()}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded font-bold"
                    >
                      Run
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AUDIT TRAIL */}
            {activeTab === 'audit' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search actions on this router..."
                    className="flex-1 px-3 py-1.5 bg-[#101626] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={() => auditService.exportToCsv(filteredAudits, `tconnect_audit_${router.name}_${Date.now()}.csv`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161f36] hover:bg-[#202c4b] border border-slate-700 text-slate-200 rounded-lg shrink-0 font-bold"
                  >
                    <Download className="w-3.5 h-3.5 text-[#f05e17]" />
                    <span>Export CSV</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto">
                  {filteredAudits.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl">
                      No audit records found for this router.
                    </div>
                  ) : (
                    filteredAudits.map((log) => (
                      <div key={log.id} className="p-3 bg-[#101626] border border-slate-800/80 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                          <span className="text-[10px] font-bold text-orange-400">{log.action}</span>
                        </div>
                        {log.command && (
                          <div className="p-1.5 bg-black/40 rounded border border-slate-800 font-mono text-emerald-400 text-[11px]">
                            &gt; {log.command}
                          </div>
                        )}
                        <p className="text-slate-300 text-xs">{log.details}</p>
                        <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between border-t border-slate-800/40">
                          <span>Actor: {log.actor} ({log.role})</span>
                          <span>IP: {log.ipAddress}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Nested Modals */}
      {terminalModalRouter && (
        <RemoteTerminalModal
          router={terminalModalRouter}
          isOpen={Boolean(terminalModalRouter)}
          onClose={closeTerminal}
          onRouterRebooted={() => {}}
        />
      )}

      {webfigModalRouter && (
        <WebFigLauncherModal
          router={webfigModalRouter}
          isOpen={Boolean(webfigModalRouter)}
          onClose={closeWebFig}
        />
      )}

      {auditModalRouter && (
        <RouterAuditModal
          router={auditModalRouter}
          isOpen={Boolean(auditModalRouter)}
          onClose={closeAudit}
        />
      )}
    </div>
  );
};
