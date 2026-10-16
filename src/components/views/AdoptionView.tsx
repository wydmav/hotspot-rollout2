import React, { useState } from 'react';
import { 
  Radio, 
  Copy, 
  Check, 
  Terminal, 
  ShieldCheck, 
  Server, 
  RefreshCw, 
  Play, 
  Plus, 
  Trash2,
  Cpu,
  Layers,
  Clock,
  Wifi,
  Monitor,
  Bell,
  Activity,
  Zap,
  ExternalLink,
  MoreVertical,
  Power,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  AlertTriangle,
  Tag,
  Building2,
  Network,
  Lock,
  Unlock,
  Sliders
} from 'lucide-react';
import { RouterDevice, RouterAccessMode, VerticalType } from '../../types';
import { RouterOSRenderer } from '../../services/routerosRenderer';
import { storage, WALLED_GARDEN_DOMAINS } from '../../services/storage';
import { WebFigLauncherModal } from './WebFigLauncherModal';
import { AccessPointSetupModal } from './AccessPointSetupModal';
import { OfficeReadinessModal } from './OfficeReadinessModal';
import { AlertSettingsModal } from './AlertSettingsModal';
import { RemoteTerminalModal } from '../common/RemoteTerminalModal';
import { TenantGroupsModal } from './TenantGroupsModal';
import { RouterContextMenu } from './RouterContextMenu';
import { RouterAuditModal } from './RouterAuditModal';
import { RouterActionToolbar } from '../common/RouterActionToolbar';
import { RouterDetailSlideover } from './RouterDetailSlideover';
import { auditService } from '../../services/audit';

interface AdoptionViewProps {
  routers: RouterDevice[];
  onAdoptRouter: (routerId: string) => void;
  onAddRouter: (router: any) => RouterDevice | undefined;
  onDeleteRouter: (routerId: string) => void;
  selectedVertical: VerticalType | 'all';
}

export const AdoptionView: React.FC<AdoptionViewProps> = ({
  routers,
  onAdoptRouter,
  onAddRouter,
  onDeleteRouter,
  selectedVertical,
}) => {
  const [selectedRouter, setSelectedRouter] = useState<RouterDevice>(routers[0]);
  const [copiedOneLiner, setCopiedOneLiner] = useState(false);
  const [copiedFullScript, setCopiedFullScript] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSimulatingAdoption, setIsSimulatingAdoption] = useState(false);
  const [simulationStep, setSimulationStep] = useState<string>('');
  const [webfigModalRouter, setWebfigModalRouter] = useState<RouterDevice | null>(null);
  const [terminalModalRouter, setTerminalModalRouter] = useState<RouterDevice | null>(null);
  const [contextMenu, setContextMenu] = useState<{ router: RouterDevice; position: { x: number; y: number } } | null>(null);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditModalRouter, setAuditModalRouter] = useState<RouterDevice | null>(null);

  // Detailed Router View Slide-Over State
  const [slideoverRouter, setSlideoverRouter] = useState<RouterDevice | null>(null);
  const [isSlideoverOpen, setIsSlideoverOpen] = useState(false);

  // De-adopt / Unbind confirmation modal state
  const [deadoptModalRouter, setDeadoptModalRouter] = useState<RouterDevice | null>(null);
  const [copiedDeadoptScript, setCopiedDeadoptScript] = useState(false);

  // External Client Groups (Tenant Brands) Modal State
  const [showTenantModal, setShowTenantModal] = useState(false);

  // Local Vertical Filter (Allows instant switching to bus, hotspot, village/community, stadium, park)
  const [localVerticalFilter, setLocalVerticalFilter] = useState<VerticalType | 'all'>(selectedVertical);

  // Keep local filter synced if prop changes
  React.useEffect(() => {
    if (selectedVertical !== 'all') {
      setLocalVerticalFilter(selectedVertical);
    }
  }, [selectedVertical]);

  // Port & Bridge Management State
  const [showApAssistantModal, setShowApAssistantModal] = useState(false);
  const [showOfficeReadinessModal, setShowOfficeReadinessModal] = useState(false);
  const [selectedExtraPort, setSelectedExtraPort] = useState('ether3');
  const [selectedBridgeName, setSelectedBridgeName] = useState('tctower-bridge');
  const [copiedBridgeCmd, setCopiedBridgeCmd] = useState(false);

  // Automated WAN Failover State (MKController Feature)
  const [wan1Port, setWan1Port] = useState('ether1');
  const [wan2Port, setWan2Port] = useState('ether2');
  const [canaryCheckHost, setCanaryCheckHost] = useState('1.1.1.1');
  const [copiedFailoverScript, setCopiedFailoverScript] = useState(false);
  const [simulatedFailoverActive, setSimulatedFailoverActive] = useState(false);

  // Add Router Form State
  const [newName, setNewName] = useState('');
  const [newVertical, setNewVertical] = useState<VerticalType>('hotspot');
  const [newSiteName, setNewSiteName] = useState('');
  const [newModel, setNewModel] = useState('MikroTik hAP ax³ (v7)');
  const [newRosVersion, setNewRosVersion] = useState<'v7' | 'v6'>('v7');
  const [newMacAddress, setNewMacAddress] = useState('D4:01:C3:AA:BB:CC');

  // Fleet Bulk Access Policy Control State
  const [bulkAccessMode, setBulkAccessMode] = useState<RouterAccessMode>('PAID_ONLY');
  const [bulkFreeMinutes, setBulkFreeMinutes] = useState<number>(30);
  const [bulkRateLimit, setBulkRateLimit] = useState<string>('10M/30M');
  const [isBulkPushing, setIsBulkPushing] = useState(false);
  const [bulkPushToast, setBulkPushToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleBulkPolicyPush = async () => {
    setIsBulkPushing(true);
    setBulkPushToast(null);

    try {
      const targetRouterIds = filteredRouters.map(r => r.id);
      const res = await fetch('/api/devices/fleet/access-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routerIds: targetRouterIds,
          vertical: localVerticalFilter === 'all' ? undefined : localVerticalFilter,
          accessMode: bulkAccessMode,
          freeDurationMinutes: bulkFreeMinutes,
          freeRateLimit: bulkRateLimit
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        storage.setRouterAccessPolicy('all', {
          accessMode: bulkAccessMode,
          freeDurationMinutes: bulkFreeMinutes,
          freeRateLimit: bulkRateLimit
        });
        setBulkPushToast({
          type: 'success',
          message: `Policy '${bulkAccessMode}' pushed to ${data.updatedCount} routers across the fleet!`
        });
        setTimeout(() => setBulkPushToast(null), 5000);
      } else {
        setBulkPushToast({
          type: 'error',
          message: data.message || 'Failed to dispatch bulk policy.'
        });
      }
    } catch (err: any) {
      setBulkPushToast({
        type: 'error',
        message: err.message || 'Network error'
      });
    } finally {
      setIsBulkPushing(false);
    }
  };

  const effectiveFilter = localVerticalFilter;
  const filteredRouters = effectiveFilter === 'all'
    ? routers
    : routers.filter(r => {
        if (effectiveFilter === 'village' || effectiveFilter === 'community') {
          return r.vertical === 'village' || r.vertical === 'community';
        }
        return r.vertical === effectiveFilter;
      });

  // Controller VPS Host Endpoint (Defaults to current browser host or custom VPS IP)
  const [controllerHost, setControllerHost] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.host) {
      return window.location.host;
    }
    return 'app.tconnect.co.ls';
  });
  const [endpointProtocol, setEndpointProtocol] = useState<'https' | 'http'>(() => {
    if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
      return 'http';
    }
    return 'https';
  });

  // Generate real one-liner for selected router
  const oneLiner = RouterOSRenderer.renderOneLiner({
    controllerDomain: controllerHost.trim() || 'app.tconnect.co.ls',
    endpointProtocol,
    routerId: selectedRouter?.id || 'rt_demo',
    token: selectedRouter?.token || 'tok_live_session',
    rosVersion: selectedRouter?.rosVersion || 'v7'
  });

  // Generate full provisioning script preview
  const provisioningScript = selectedRouter ? RouterOSRenderer.renderProvisioningScript({
    router: selectedRouter,
    hubDomain: controllerHost.trim() || 'app.tconnect.co.ls',
    controllerHost: controllerHost.trim() || 'app.tconnect.co.ls',
    endpointProtocol,
    hubWgPort: 51820,
    hubTunnelIp: '10.99.0.1',
    routerWgIp: selectedRouter.wireguardIp || '10.99.1.50',
    routerPrivateKey: 'eB3xK92ZlP4qN7mW1v8Y0sR5tU6iO2aL3cE5jH7kM9g=',
    hubPublicKey: 'v7Tc0nnectHubWireguardKey2026Base64Salted99=',
    radiusSecret: 'radsec_tconnect_lesotho_99120',
    apiPassword: 'tc_pass_crypto_random_32char',
    walledGardenDomains: WALLED_GARDEN_DOMAINS,
    blockDoH: true
  }) : '';

  const handleCopyOneLiner = () => {
    navigator.clipboard.writeText(oneLiner);
    setCopiedOneLiner(true);
    setTimeout(() => setCopiedOneLiner(false), 2000);
  };

  const handleCopyFullScript = () => {
    navigator.clipboard.writeText(provisioningScript);
    setCopiedFullScript(true);
    setTimeout(() => setCopiedFullScript(false), 2000);
  };

  const handleCreateRouter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSiteName.trim()) return;

    const created = onAddRouter({
      name: newName.trim(),
      vertical: newVertical,
      siteName: newSiteName.trim(),
      model: newModel,
      boardName: newModel.includes('ax3') ? 'hAP ax3' : 'RouterBOARD',
      rosVersion: newRosVersion,
      macAddress: newMacAddress.trim().toUpperCase(),
      wireguardIp: `10.99.${Math.floor(1 + Math.random() * 5)}.${Math.floor(20 + Math.random() * 200)}`,
      publicWanIp: '197.234.12.89',
      firmware: newRosVersion === 'v7' ? '7.15.2' : '6.49.10'
    });

    if (created) {
      setSelectedRouter(created);
      setShowAddModal(false);
      setNewName('');
      setNewSiteName('');
    }
  };

  const runTerminalAdoptionSimulation = () => {
    if (!selectedRouter) return;
    setIsSimulatingAdoption(true);
    setSimulationStep('1/5: Testing DNS resolution for app.tconnect.co.ls...');

    setTimeout(() => {
      setSimulationStep('2/5: Verifying RouterOS Device Mode (/system/device-mode fetch=true)...');
      setTimeout(() => {
        setSimulationStep('3/5: Fetching provisioning payload over HTTPS with single-use token...');
        setTimeout(() => {
          setSimulationStep('4/5: Importing configuration & setting up WireGuard tunnel 10.99.0.0/16...');
          setTimeout(() => {
            setSimulationStep('5/5: Enabling RADIUS auth (port 1812/1813) & removing temporary .rsc file...');
            setTimeout(() => {
              onAdoptRouter(selectedRouter.id);
              setIsSimulatingAdoption(false);
              setSimulationStep('');
            }, 600);
          }, 600);
        }, 600);
      }, 600);
    }, 600);
  };

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setActionToast({ message, type });
    setTimeout(() => {
      setActionToast(null);
    }, 4500);
  };

  const handleContextMenu = (e: React.MouseEvent, router: RouterDevice) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRouter(router);
    setContextMenu({
      router,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleThreeDotsClick = (e: React.MouseEvent, router: RouterDevice) => {
    e.stopPropagation();
    setSelectedRouter(router);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      router,
      position: { x: Math.max(16, rect.right - 240), y: rect.bottom + 6 }
    });
  };

  const handleRebootRouter = async (router: RouterDevice) => {
    if (!confirm(`Are you sure you want to reboot "${router.name}"? Active hotspot sessions will temporarily disconnect.`)) {
      return;
    }
    setIsActionPending(true);
    setActiveAction('reboot');
    try {
      const res = await fetch(`/api/devices/${router.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reboot' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        auditService.logRouterReboot(router, {
          source: 'context_menu',
          reason: 'Manual reboot initiated from fleet management view'
        });
        triggerToast(`Reboot dispatched to ${router.name}. Device restarting...`, 'success');
      } else {
        triggerToast(data.message || `Failed to reboot ${router.name}`, 'error');
      }
    } catch (err: any) {
      triggerToast(`Network error: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
      setActiveAction(null);
    }
  };

  const handleResyncConfig = async (router: RouterDevice) => {
    setIsActionPending(true);
    setActiveAction('resync');
    try {
      const res = await fetch(`/api/devices/${router.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resync-config' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        auditService.logConfigChange(
          router,
          'resync',
          `WireGuard tunnel keys, RADIUS attributes, and Hotspot Walled Garden rules verified for ${router.name}`
        );
        triggerToast(`Config re-sync complete for ${router.name}. WireGuard & Hotspot rules verified.`, 'success');
      } else {
        triggerToast(data.message || `Failed to re-sync ${router.name}`, 'error');
      }
    } catch (err: any) {
      triggerToast(`Network error: ${err.message}`, 'error');
    } finally {
      setIsActionPending(false);
      setActiveAction(null);
    }
  };

  const handleCopyRouterScript = (router: RouterDevice) => {
    const script = RouterOSRenderer.renderOneLiner({
      controllerDomain: controllerHost.trim() || 'app.tconnect.co.ls',
      endpointProtocol,
      routerId: router.id,
      token: router.token || 'tok_live_session',
      rosVersion: router.rosVersion || 'v7'
    });
    navigator.clipboard.writeText(script);
    triggerToast(`Adoption script copied for ${router.name}!`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification for Remote Actions */}
      {actionToast && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono animate-in fade-in duration-150 ${
          actionToast.type === 'success'
            ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
            : actionToast.type === 'error'
            ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
            : 'bg-sky-950/70 border-sky-500/50 text-sky-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              actionToast.type === 'success' ? 'bg-emerald-400 animate-pulse' : actionToast.type === 'error' ? 'bg-rose-400' : 'bg-sky-400'
            }`} />
            <span className="font-bold">{actionToast.message}</span>
          </div>
          <button
            onClick={() => setActionToast(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">MikroTik Router Adoption Hub</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Zero-touch MKController-style one-liner adoption over encrypted WireGuard tunnel (v6 & v7)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setShowAlertModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-lg transition-colors shadow-sm"
            title="Configure 30-second Deadman Watchdog & Browser Push Notifications"
          >
            <Bell className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Watchdog & Browser Alerts</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" />
          </button>

          <button
            onClick={() => {
              setAuditModalRouter(null);
              setShowAuditModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-lg transition-colors shadow-sm"
            title="Inspect Historical Audit Trail & Command Logs for All Routers"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => setShowTenantModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
            title="Manage External Client Groups (Tenant Brands) and Dynamic Splash Background Policies"
          >
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>Client Groups</span>
            <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/60 px-1.5 py-0.5 rounded-full font-mono">
              {storage.getTenantGroups().length}
            </span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Router to Fleet</span>
          </button>
        </div>
      </div>

      {/* Vertical Scope Switcher Toolbar */}
      <div className="bg-[#0f1422] p-3 sm:p-4 rounded-xl border border-[#232d42] space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Vertical Scope Filter
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({filteredRouters.length} of {routers.length} routers)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Select a vertical to inspect routers configured with tailored branding and bandwidth policies:
          </span>
        </div>

        {/* Vertical Scope Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#1c2438]">
          {[
            { id: 'all', label: 'All Verticals', icon: '🌐', color: 'border-slate-600' },
            { id: 'hotspot', label: 'Connected Hotspots', icon: '☕', sub: 'Cafes & Retail', color: 'border-amber-500/40 text-amber-300' },
            { id: 'community', label: 'Villages / Communities', icon: '🏡', sub: 'Solar Mesh', color: 'border-emerald-500/40 text-emerald-300' },
            { id: 'bus', label: 'Connected Buses', icon: '🚌', sub: 'Transit Wi-Fi', color: 'border-cyan-500/40 text-cyan-300' },
            { id: 'stadium', label: 'Connected Stadiums', icon: '🏟️', sub: 'Event Core', color: 'border-purple-500/40 text-purple-300' },
            { id: 'park', label: 'Connected Parks', icon: '🌳', sub: 'Smart Poles', color: 'border-teal-500/40 text-teal-300' },
          ].map((scope) => {
            const isActive = localVerticalFilter === scope.id;
            const count = scope.id === 'all' 
              ? routers.length 
              : scope.id === 'community' || scope.id === 'village'
              ? routers.filter(r => r.vertical === 'community' || r.vertical === 'village').length
              : routers.filter(r => r.vertical === scope.id).length;

            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => {
                  setLocalVerticalFilter(scope.id as any);
                  const match = routers.find(r => {
                    if (scope.id === 'all') return true;
                    if (scope.id === 'community' || scope.id === 'village') return r.vertical === 'community' || r.vertical === 'village';
                    return r.vertical === scope.id;
                  });
                  if (match) setSelectedRouter(match);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#f05e17] text-white shadow-md shadow-[#f05e17]/20 border border-[#f05e17]'
                    : 'bg-[#161d31] text-slate-300 hover:text-white hover:bg-[#1f2942] border border-[#232d42]'
                }`}
              >
                <span>{scope.icon}</span>
                <span>{scope.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-black/30 text-white font-bold' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fleet Access Policy Control Toolbar */}
      <div className="bg-[#0f1422] p-3 sm:p-4 rounded-xl border border-amber-500/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <span>Fleet Access Policy &amp; Monetization Control</span>
                <span className="text-[10px] text-amber-300 font-normal">
                  ({localVerticalFilter === 'all' ? 'All Fleet Routers' : `${localVerticalFilter.toUpperCase()} Scope`})
                </span>
              </span>
              <p className="text-[11px] text-slate-400 font-mono">
                Dictate whether routers enforce paid vouchers, offer promotional free trials, or run 100% open Wi-Fi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={bulkAccessMode}
              onChange={(e) => setBulkAccessMode(e.target.value as RouterAccessMode)}
              className="px-2.5 py-1.5 bg-[#161d31] border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="PAID_ONLY">🔒 Strictly Paid / Vouchers Only</option>
              <option value="FREE_TRIAL_AND_PAID">⚡ Free Trial + Paid Vouchers</option>
              <option value="COMPLETELY_FREE">🌐 100% Free Public Wi-Fi</option>
            </select>

            {bulkAccessMode !== 'PAID_ONLY' && (
              <select
                value={bulkFreeMinutes}
                onChange={(e) => setBulkFreeMinutes(Number(e.target.value))}
                className="px-2 py-1.5 bg-[#161d31] border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
                <option value={120}>120 mins</option>
              </select>
            )}

            <button
              type="button"
              disabled={isBulkPushing || filteredRouters.length === 0}
              onClick={handleBulkPolicyPush}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                isBulkPushing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/40'
              }`}
            >
              {isBulkPushing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 fill-current" />}
              <span>{isBulkPushing ? 'Pushing...' : 'Push to Scope'}</span>
            </button>
          </div>
        </div>

        {bulkPushToast && (
          <div className={`p-2 rounded-lg text-xs font-mono flex items-center justify-between animate-in fade-in ${
            bulkPushToast.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
          }`}>
            <span>{bulkPushToast.message}</span>
            <button onClick={() => setBulkPushToast(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
          </div>
        )}
      </div>

      {/* Main Split Grid: Router Selector & One-Liner Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Router Fleet List */}
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#232d42] mb-3">
            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">ROUTER INVENTORY</span>
            <span className="text-[11px] font-mono text-slate-400">{filteredRouters.length} Devices</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
            {filteredRouters.length > 0 ? (
              filteredRouters.map((router) => {
                const isSelected = selectedRouter?.id === router.id;
                const isOnline = router.status === 'online';
                const isOffline = router.status === 'offline';

                return (
                  <div
                    key={router.id}
                    onClick={() => setSelectedRouter(router)}
                    onContextMenu={(e) => handleContextMenu(e, router)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors text-left relative ${
                      isSelected
                        ? 'bg-[#1b233a] border-[#f05e17]/60 shadow-sm'
                        : 'bg-[#161d31] border-[#232d42] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate flex-1">{router.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isOnline 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : isOffline
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {isOnline ? 'ONLINE' : isOffline ? 'OFFLINE' : 'PENDING'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleThreeDotsClick(e, router)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                          title="Open Router Actions Menu"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 font-mono mt-1 truncate">{router.siteName}</p>

                    {/* Access Policy Badge */}
                    <div className="mt-1 flex items-center gap-1.5">
                      {router.accessMode === 'COMPLETELY_FREE' ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Unlock className="w-2.5 h-2.5" /> 100% FREE ACCESS
                        </span>
                      ) : (router.accessMode === 'FREE_TRIAL_AND_PAID' || router.freeModeEnabled) ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 fill-current" /> FREE TRIAL ({router.freeDurationMinutes || 30}m)
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> PAID ONLY
                        </span>
                      )}
                    </div>

                    {/* External Client Group Badge if assigned */}
                    {(() => {
                      const group = router.tenantGroupId 
                        ? storage.getTenantGroups().find(g => g.id === router.tenantGroupId)
                        : (router.tags ? storage.getTenantGroups().find(g => router.tags?.includes(g.tag)) : null);
                      if (!group) return null;
                      return (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50 truncate">
                          <Building2 className="w-3 h-3 text-purple-400 shrink-0" />
                          <span className="truncate">{group.name}</span>
                          <span className="text-[9px] text-purple-400/80 ml-auto font-sans">{group.tag}</span>
                        </div>
                      );
                    })()}

                    {isOffline && (
                      <p className="text-[10px] text-rose-400 font-mono mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Starlink / WAN Cable Disconnected
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2 pt-2 border-t border-[#232d42]">
                      <div className="flex items-center gap-1.5">
                        <span>{router.model.split('(')[0]}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold uppercase text-[9px] border border-slate-700">
                          {router.vertical === 'bus' ? '🚌 BUS' : router.vertical === 'village' || router.vertical === 'community' ? '🏡 VILLAGE' : router.vertical === 'stadium' ? '🏟️ STADIUM' : router.vertical === 'park' ? '🌳 PARK' : '☕ HOTSPOT'}
                        </span>
                      </div>
                      <span className="text-cyan-400 font-bold">{router.rosVersion.toUpperCase()}</span>
                    </div>

                    {/* Reusable Action Toolbar (Reboot, Sync, Terminal, WebFig, Audit) & Detailed View */}
                    <div className="mt-2.5 pt-2 border-t border-[#1f273d] flex items-center justify-between gap-1.5">
                      <RouterActionToolbar
                        router={router}
                        variant="minimal"
                        onOpenTerminal={(r) => setTerminalModalRouter(r)}
                        onOpenWebfig={(r) => setWebfigModalRouter(r)}
                        onOpenAudit={(r) => {
                          setAuditModalRouter(r);
                          setShowAuditModal(true);
                        }}
                        onReboot={(r) => handleRebootRouter(r)}
                        onResync={(r) => handleResyncConfig(r)}
                        isPending={isActionPending}
                        activeAction={activeAction}
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSlideoverRouter(router);
                          setIsSlideoverOpen(true);
                        }}
                        className="py-1 px-2 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Open Detailed Inspection Slide-over"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3 text-indigo-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-slate-500 space-y-3 font-mono">
                <Radio className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs text-slate-300 font-bold">No Routers in Fleet</p>
                <p className="text-[11px] text-slate-500">
                  Click "+ Add Router to Fleet" above to register your first MikroTik hardware unit.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Router</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: One-Liner Script Generator & Live Terminal Preview */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRouter ? (
            <>
              {/* Selected Router Overview Bar */}
              <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white">{selectedRouter.name}</h2>
                    <span className="text-xs font-mono text-slate-400">· {selectedRouter.siteName}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      selectedRouter.status === 'online' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : selectedRouter.status === 'offline'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {selectedRouter.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-1">
                    <span>MAC: <strong className="text-slate-200">{selectedRouter.macAddress}</strong></span>
                    <span>·</span>
                    <span>WireGuard IP: <strong className="text-emerald-400">{selectedRouter.wireguardIp}</strong></span>
                    <span>·</span>
                    <span>OS: <strong className="text-cyan-400">{selectedRouter.rosVersion.toUpperCase()}</strong></span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5 bg-[#161d31] px-2 py-0.5 rounded border border-[#232d42]">
                      <Tag className="w-3 h-3 text-[#f05e17]" />
                      <span className="text-slate-400">Vertical:</span>
                      <select
                        value={selectedRouter.vertical}
                        onChange={(e) => {
                          const newVert = e.target.value as VerticalType;
                          storage.updateRouterVertical(selectedRouter.id, newVert);
                          triggerToast(`Tagged ${selectedRouter.name} as ${newVert.toUpperCase()} vertical.`, 'success');
                        }}
                        className="bg-transparent text-white font-bold cursor-pointer focus:outline-none"
                      >
                        <option value="hotspot" className="bg-[#0f1422]">☕ Hotspot</option>
                        <option value="village" className="bg-[#0f1422]">🏡 Village</option>
                        <option value="bus" className="bg-[#0f1422]">🚌 Bus</option>
                        <option value="stadium" className="bg-[#0f1422]">🏟️ Stadium</option>
                        <option value="park" className="bg-[#0f1422]">🌳 Park</option>
                      </select>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1.5 bg-[#161d31] px-2 py-0.5 rounded border border-purple-800/50 text-purple-300">
                      <Building2 className="w-3 h-3 text-purple-400" />
                      <span className="text-slate-400">Client Group:</span>
                      <select
                        value={selectedRouter.tenantGroupId || ''}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          storage.assignRouterToTenantGroup(selectedRouter.id, val);
                          const gName = val ? storage.getTenantGroups().find(g => g.id === val)?.name : 'Standard T-Connect';
                          triggerToast(`Router assigned to ${gName}`, 'success');
                        }}
                        className="bg-transparent text-purple-200 font-bold cursor-pointer focus:outline-none text-xs"
                      >
                        <option value="" className="bg-[#0f1422] text-slate-300">Standard (T-Connect)</option>
                        {storage.getTenantGroups().map(g => (
                          <option key={g.id} value={g.id} className="bg-[#0f1422] text-white">
                            🏢 {g.name} ({g.tag})
                          </option>
                        ))}
                      </select>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Reusable Action Toolbar (Header Variant) */}
                  <RouterActionToolbar
                    router={selectedRouter}
                    variant="header"
                    onOpenTerminal={(r) => setTerminalModalRouter(r)}
                    onOpenWebfig={(r) => setWebfigModalRouter(r)}
                    onOpenAudit={(r) => {
                      setAuditModalRouter(r);
                      setShowAuditModal(true);
                    }}
                    onReboot={(r) => handleRebootRouter(r)}
                    onResync={(r) => handleResyncConfig(r)}
                    isPending={isActionPending}
                    activeAction={activeAction}
                  />

                  {/* Detailed Router View Button */}
                  <button
                    onClick={() => {
                      setSlideoverRouter(selectedRouter);
                      setIsSlideoverOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors font-mono shadow-sm cursor-pointer whitespace-nowrap"
                    title="Open Comprehensive Router Inspection Slide-over"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Detailed View</span>
                  </button>

                  {/* 2 Access Points & WinBox Bridge Button */}
                  <button
                    onClick={() => setShowApAssistantModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold font-mono transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                    title="Connect 2 Access Points (Ubiquiti UniFi / TP-Link Omada) & Generate WinBox Bridge Scripts"
                  >
                    <Network className="w-3.5 h-3.5 text-amber-400" />
                    <span>2 APs & WinBox</span>
                  </button>

                  {/* Office Readiness & 30M/10M Speed Test Button */}
                  <button
                    onClick={() => setShowOfficeReadinessModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold font-mono transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                    title="Open Office Deployment Test Suite & 30M/10M Policy Validator"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Office Test &amp; 30M/10M</span>
                  </button>

                  {selectedRouter.status === 'pending_adoption' && (
                    <button
                      onClick={runTerminalAdoptionSimulation}
                      disabled={isSimulatingAdoption}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors font-mono shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isSimulatingAdoption ? 'Adopting...' : 'Simulate Run'}</span>
                    </button>
                  )}

                  {/* Complete Platform De-Adoption / Unbind Button */}
                  <button
                    onClick={() => setDeadoptModalRouter(selectedRouter)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer"
                    title="Completely remove & unbind router from platform (Generates clean RouterOS purge script, ready for future re-adoption)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Remove / De-Adopt</span>
                  </button>
                </div>
              </div>

              {/* Simulation Progress Alert */}
              {isSimulatingAdoption && (
                <div className="bg-[#1b233a] border border-emerald-500/40 p-3 rounded-xl flex items-center gap-3 text-xs font-mono text-emerald-300 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
                  <span>{simulationStep}</span>
                </div>
              )}

              {/* One-Liner Box (Paste into MikroTik Terminal) */}
              <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#f05e17]" />
                    <span className="text-xs font-extrabold text-white tracking-wide uppercase font-mono">
                      ONE-LINE ROUTEROS ADOPTION SCRIPT
                    </span>
                  </div>
                  <button
                    onClick={handleCopyOneLiner}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-xs font-mono text-white rounded-lg transition-colors"
                  >
                    {copiedOneLiner ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedOneLiner ? 'Copied!' : 'Copy Script'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Open <strong>Winbox &gt; New Terminal</strong> on your MikroTik router (or SSH) and paste this single line. It verifies DNS, confirms Device Mode permissions, downloads the encrypted config over TLS, establishes the WireGuard tunnel, and self-cleans.
                </p>

                {/* Controller Endpoint Configuration for real VPS / router testing */}
                <div className="p-2.5 bg-[#121829] rounded-lg border border-[#1f283d] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <span className="text-slate-400 font-bold shrink-0">VPS Host / IP:</span>
                    <input
                      type="text"
                      value={controllerHost}
                      onChange={(e) => setControllerHost(e.target.value)}
                      placeholder="e.g. 194.163.45.67 or app.tconnect.co.ls"
                      className="w-full px-2.5 py-1 bg-[#1a233a] border border-[#232d42] rounded text-white text-xs focus:outline-none focus:border-[#f05e17]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-slate-400 font-bold">Protocol:</span>
                    <button
                      type="button"
                      onClick={() => setEndpointProtocol(endpointProtocol === 'https' ? 'http' : 'https')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        endpointProtocol === 'https'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                      title="Toggle between HTTPS (domain with SSL) and HTTP (raw IP / dev test)"
                    >
                      {endpointProtocol.toUpperCase()}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#080b12] rounded-lg border border-[#1b233a] font-mono text-xs text-slate-300 break-all select-all leading-relaxed max-h-32 overflow-y-auto">
                  {oneLiner}
                </div>
              </div>

              {/* Full Hardened Provisioning Preview */}
              <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-extrabold text-white tracking-wide uppercase font-mono">
                      GENERATED PROVISIONING CODE (INSPECTABLE)
                    </span>
                  </div>
                  <button
                    onClick={handleCopyFullScript}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-xs font-mono text-slate-300 rounded-lg transition-colors"
                  >
                    {copiedFullScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedFullScript ? 'Copied' : 'Copy RSC'}</span>
                  </button>
                </div>

                <div className="p-3 bg-[#080b12] rounded-lg border border-[#1b233a] font-mono text-[11px] text-slate-400 max-h-60 overflow-y-auto whitespace-pre leading-relaxed">
                  {provisioningScript}
                </div>
              </div>

              {/* ======================================================= */}
              {/* SECTION: PORT 1 WAN (STARLINK) & BRIDGE PORTS MANAGER    */}
              {/* ======================================================= */}
              <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1b233a] pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span className="font-extrabold text-white uppercase tracking-wider">
                      Port 1 WAN (Starlink) &amp; Hotspot Bridge Ports
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    hAP ax³ Ready
                  </span>
                </div>

                <div className="p-3 bg-[#121829] rounded-xl border border-[#1f283d] space-y-2 text-[11px]">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Port 1 (<code className="text-cyan-300">ether1</code>) is Primary WAN</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Connect your <strong>Starlink Dishy / Ethernet Adapter</strong> into <strong>Port 1</strong>. It automatically runs a DHCP client, captures your Starlink public/CGNAT IP, and acts as the default gateway.
                  </p>
                </div>

                {/* Bridge Extra Ports Generator */}
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-slate-300 font-bold">Bridge Extra Ports for Hotspot Clients / Access Points:</label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">Bridge Name:</span>
                      <select
                        value={selectedBridgeName}
                        onChange={(e) => setSelectedBridgeName(e.target.value)}
                        className="px-2 py-1 bg-[#161d31] border border-[#232d42] rounded text-white text-xs"
                      >
                        <option value="tctower-bridge">tctower-bridge (Tower AP Bridge)</option>
                        <option value="mkcontroller-bridge">mkcontroller-bridge (Standard)</option>
                        <option value="tconnect-bridge">tconnect-bridge</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Select Extra Port:</span>
                    {(['ether2', 'ether3', 'ether4', 'ether5', 'wifi1', 'wifi2', 'sfp-sfpplus1'] as const).map((port) => (
                      <button
                        key={port}
                        type="button"
                        onClick={() => setSelectedExtraPort(port)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                          selectedExtraPort === port
                            ? 'bg-[#f05e17] border-[#f05e17] text-white'
                            : 'bg-[#161d31] border-[#232d42] text-slate-400 hover:text-white'
                        }`}
                      >
                        {port}
                      </button>
                    ))}
                  </div>

                  {/* Generated Bridge Port Command */}
                  <div className="p-3 bg-[#080b12] rounded-xl border border-[#1b233a] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">RouterOS Terminal Command to Bridge {selectedExtraPort}:</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            RouterOSRenderer.renderBridgePortCommand(selectedBridgeName, selectedExtraPort)
                          );
                          setCopiedBridgeCmd(true);
                          setTimeout(() => setCopiedBridgeCmd(false), 2000);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#161d31] hover:bg-[#232d42] border border-[#232d42] text-[11px] text-white rounded transition-colors"
                      >
                        {copiedBridgeCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedBridgeCmd ? 'Copied!' : 'Copy Bridge Command'}</span>
                      </button>
                    </div>
                    <pre className="text-emerald-400 font-mono text-xs select-all whitespace-pre-wrap">
                      {RouterOSRenderer.renderBridgePortCommand(selectedBridgeName, selectedExtraPort)}
                    </pre>
                  </div>

                  {/* Dual AP Fast Launcher Banner */}
                  <div className="p-3 bg-gradient-to-r from-amber-500/10 via-[#161d31] to-sky-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                        <Network className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Setting up 2 Access Points (Ubiquiti UniFi · TP-Link Omada)?</span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            Gateway: 192.168.88.1
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Configure AP static management IPs, bridge ports ether3/ether4 to <span className="font-mono text-amber-300">tctower-bridge</span>, and bypass AP management from captive splash.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowApAssistantModal(true)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm shrink-0 whitespace-nowrap"
                    >
                      Open 2 AP Assistant
                    </button>
                  </div>
                </div>
              </div>

              {/* ======================================================= */}
              {/* SECTION: AUTOMATED WAN FAILOVER (MKCONTROLLER FEATURE)  */}
              {/* ======================================================= */}
              <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b233a] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-amber-400" />
                      <span className="font-extrabold text-white uppercase tracking-wider">
                        MikroTik Automated WAN Failover
                      </span>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                        MKController Spec
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Recursive routing with canary host ping checking for Starlink + LTE / Fiber multi-WAN redundancy
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSimulatedFailoverActive(!simulatedFailoverActive)}
                      className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                        simulatedFailoverActive
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-[#161d31] border-[#232d42] text-slate-300 hover:text-white'
                      }`}
                      title="Test how failover event reflects in controller"
                    >
                      {simulatedFailoverActive ? 'Simulated: WAN2 Active' : 'Simulate Starlink Drop'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const script = RouterOSRenderer.renderWanFailoverScript({
                          wan1: wan1Port,
                          wan2: wan2Port,
                          checkHost: canaryCheckHost,
                          hubDomain: controllerHost,
                          routerId: selectedRouter.id,
                        });
                        navigator.clipboard.writeText(script);
                        setCopiedFailoverScript(true);
                        setTimeout(() => setCopiedFailoverScript(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg transition-colors shadow-sm"
                    >
                      {copiedFailoverScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedFailoverScript ? 'Copied Failover!' : 'Copy Failover Script'}</span>
                    </button>
                  </div>
                </div>

                {/* Visual Failover Route Architecture */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 bg-[#121829] rounded-xl border border-[#1f283d] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-bold">WAN1 (Primary): Starlink LEO</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        !simulatedFailoverActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {!simulatedFailoverActive ? 'ROUTE ACTIVE (Dist 1)' : 'STANDBY / DOWN'}
                      </span>
                    </div>
                    <div className="text-slate-300">Port: <code className="text-white bg-black/40 px-1 rounded">{wan1Port}</code></div>
                    <div className="text-slate-400">Canary Target: <code className="text-cyan-300">{canaryCheckHost}</code> (Cloudflare DNS)</div>
                    <p className="text-slate-400 text-[10px] leading-relaxed pt-1 border-t border-slate-700/50">
                      Even if Starlink Ethernet cable is UP, if satellite signal drops, recursive route detects packet loss in &lt; 3s.
                    </p>
                  </div>

                  <div className="p-3 bg-[#121829] rounded-xl border border-[#1f283d] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold">WAN2 (Backup): LTE / Fiber</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        simulatedFailoverActive ? 'bg-amber-500/20 text-amber-300 animate-pulse' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {simulatedFailoverActive ? 'FAILOVER ENGAGED (Dist 2)' : 'STANDBY READY'}
                      </span>
                    </div>
                    <div className="text-slate-300">Port: <code className="text-white bg-black/40 px-1 rounded">{wan2Port}</code></div>
                    <div className="text-slate-400">Failover Mode: Instant Automatic Hot-Swap</div>
                    <p className="text-slate-400 text-[10px] leading-relaxed pt-1 border-t border-slate-700/50">
                      Takes over hotspot clients immediately. As soon as Starlink recovers, traffic gracefully fails back to Starlink!
                    </p>
                  </div>
                </div>

                {/* Inspectable Failover Script Box */}
                <div className="p-3 bg-[#080b12] rounded-xl border border-[#1b233a] space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span>RouterOS v7 Recursive Routing &amp; Netwatch Sentinel Script:</span>
                    <a
                      href="https://mkcontroller.com/docs/management/features/mikrotik-wan-failover-with-mkcontroller/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>MKController Doc Spec &rarr;</span>
                    </a>
                  </div>
                  <pre className="text-cyan-300 font-mono text-[11px] select-all whitespace-pre leading-relaxed max-h-48 overflow-y-auto">
                    {RouterOSRenderer.renderWanFailoverScript({
                      wan1: wan1Port,
                      wan2: wan2Port,
                      checkHost: canaryCheckHost,
                      hubDomain: controllerHost,
                      routerId: selectedRouter.id,
                    })}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-[#0f1422] rounded-xl border border-[#232d42] space-y-3">
              <Terminal className="w-10 h-10 mx-auto text-[#f05e17]/70" />
              <h3 className="text-sm font-bold text-white">MKController-Style One-Liner Provisioning</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Add a new MikroTik hardware unit to generate an encrypted, single-use one-line terminal adoption script for RouterOS v6 or v7.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-mono text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add MikroTik Router</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Router Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <h3 className="text-base font-extrabold text-white">Add New MikroTik Router</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRouter} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Router Name / Identifier</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. hAP-ax3-Roma-Campus"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Vertical Target</label>
                <select
                  value={newVertical}
                  onChange={(e) => setNewVertical(e.target.value as VerticalType)}
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                >
                  <option value="hotspot">☕ Connected Hotspots (Cafes &amp; Retail)</option>
                  <option value="village">🏡 Connected Villages / Mesh (Rural Solar)</option>
                  <option value="bus">🚌 Connected Buses (Transit Wi-Fi)</option>
                  <option value="stadium">🏟️ Connected Stadiums (Events/VIP)</option>
                  <option value="park">🌳 Connected Parks (Municipal Green Zones)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Physical Site Location</label>
                <input
                  type="text"
                  required
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="e.g. Roma Campus Student Center"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Hardware Model</label>
                  <select
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  >
                    <option value="MikroTik hAP ax³ (v7)">hAP ax³ (Wi-Fi 6)</option>
                    <option value="MikroTik cAP ax (v7)">cAP ax (Ceiling AP)</option>
                    <option value="MikroTik BaseBox 5 (v7)">BaseBox 5 (Outdoor Mesh)</option>
                    <option value="Teltonika RUTX50 (5G+Sat)">Teltonika RUTX50 (Bus)</option>
                    <option value="MikroTik CCR2216 (10G SFP+)">CCR2216 (Stadium Core)</option>
                    <option value="MikroTik RB4011 (v6 Legacy)">RB4011 (RouterOS v6)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">RouterOS Version</label>
                  <select
                    value={newRosVersion}
                    onChange={(e) => setNewRosVersion(e.target.value as 'v7' | 'v6')}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  >
                    <option value="v7">RouterOS v7 (WireGuard Native)</option>
                    <option value="v6">RouterOS v6 (SSTP/OVPN Tunnel)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Ethernet MAC Address</label>
                <input
                  type="text"
                  required
                  value={newMacAddress}
                  onChange={(e) => setNewMacAddress(e.target.value)}
                  placeholder="XX:XX:XX:XX:XX:XX"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div className="pt-3 border-t border-[#232d42] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm"
                >
                  Generate One-Liner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App WebFig Launcher & Remote Tools Modal */}
      {webfigModalRouter && (
        <WebFigLauncherModal
          router={webfigModalRouter}
          isOpen={Boolean(webfigModalRouter)}
          onClose={() => setWebfigModalRouter(null)}
          onRouterUpdated={() => {}}
        />
      )}

      {/* Access Points & WinBox Topology Assistant Modal */}
      <AccessPointSetupModal
        isOpen={showApAssistantModal}
        onClose={() => setShowApAssistantModal(false)}
        router={selectedRouter}
      />

      {/* Office Deployment & Readiness Verification Modal */}
      <OfficeReadinessModal
        isOpen={showOfficeReadinessModal}
        onClose={() => setShowOfficeReadinessModal(false)}
        router={selectedRouter}
        onRouterUpdated={() => {}}
      />

      {/* Deadman Watchdog & Email Notification Settings Modal */}
      <AlertSettingsModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
      />

      {/* In-App Remote Terminal Modal */}
      {terminalModalRouter && (
        <RemoteTerminalModal
          router={terminalModalRouter}
          isOpen={Boolean(terminalModalRouter)}
          onClose={() => setTerminalModalRouter(null)}
          onRouterRebooted={() => {
            triggerToast(`${terminalModalRouter.name} is rebooting...`, 'info');
          }}
        />
      )}

      {/* Floating Router Context Menu (Right-Click & Three-Dots) */}
      {contextMenu && (
        <RouterContextMenu
          router={contextMenu.router}
          position={contextMenu.position}
          isOpen={Boolean(contextMenu)}
          onClose={() => setContextMenu(null)}
          onOpenTerminal={(r) => setTerminalModalRouter(r)}
          onOpenWebfig={(r) => setWebfigModalRouter(r)}
          onRebootRouter={(r) => handleRebootRouter(r)}
          onResyncConfig={(r) => handleResyncConfig(r)}
          onCopyOneLiner={(r) => handleCopyRouterScript(r)}
          onDeleteRouter={(id) => {
            const r = routers.find(item => item.id === id);
            if (r) {
              setDeadoptModalRouter(r);
            } else {
              onDeleteRouter(id);
            }
          }}
          onOpenAuditModal={(r) => {
            setAuditModalRouter(r);
            setShowAuditModal(true);
          }}
        />
      )}

      {/* Historical Router Audit Trail Modal */}
      <RouterAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        router={auditModalRouter}
        allRouters={routers}
      />

      {/* Detailed Router View Slide-Over Panel */}
      <RouterDetailSlideover
        isOpen={isSlideoverOpen}
        onClose={() => setIsSlideoverOpen(false)}
        router={slideoverRouter || selectedRouter}
        onUpdateVertical={(routerId, vert) => {
          storage.updateRouterVertical(routerId, vert);
          triggerToast(`Updated vertical scope to ${vert}.`, 'success');
        }}
      />
      {/* Complete Platform De-Adoption & Unbinding Modal */}
      {deadoptModalRouter && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#0f1422] border border-rose-500/40 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-extrabold text-white">
                  Remove &amp; De-Adopt Router: {deadoptModalRouter.name}
                </h3>
              </div>
              <button 
                onClick={() => setDeadoptModalRouter(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-1.5 text-rose-200">
                <p className="font-bold flex items-center gap-1.5">
                  <span>⚠️ Unlinking from Platform:</span>
                </p>
                <p className="leading-relaxed text-[11px] text-rose-300">
                  This will completely remove <strong>{deadoptModalRouter.name}</strong> from the T-Connect cloud platform, revoking its WireGuard tunnel keys, disabling deadman watchdog monitoring, and clearing all server registrations.
                </p>
                <p className="leading-relaxed text-[11px] text-slate-300">
                  <strong>Re-adoption Guaranteed:</strong> The physical MikroTik hardware will remain fully functional and can be re-adopted at any point in the future with a fresh one-liner script.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300 font-bold text-[11px]">
                    RouterOS Factory Cleanup Script (Optional — Run on MikroTik):
                  </span>
                  <button
                    onClick={() => {
                      const cleanScript = RouterOSRenderer.renderDeadoptionScript(deadoptModalRouter);
                      navigator.clipboard.writeText(cleanScript);
                      setCopiedDeadoptScript(true);
                      setTimeout(() => setCopiedDeadoptScript(false), 2500);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#1b233a] hover:bg-[#253050] text-cyan-300 border border-cyan-500/40 rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    {copiedDeadoptScript ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copied Script!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Cleanup Script</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-[#080b12] border border-[#232d42] rounded-xl text-[10px] text-cyan-300 max-h-40 overflow-y-auto whitespace-pre leading-relaxed font-mono select-all">
                  {RouterOSRenderer.renderDeadoptionScript(deadoptModalRouter)}
                </pre>
                <p className="text-[10px] text-slate-400 mt-1">
                  Pasting this into RouterOS terminal completely purges WireGuard interfaces, RADIUS AAA, netwatch sentinels, and walled garden rules.
                </p>
              </div>

              <div className="pt-3 border-t border-[#232d42] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeadoptModalRouter(null)}
                  className="px-3.5 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const r = deadoptModalRouter;
                    setDeadoptModalRouter(null);
                    await onDeleteRouter(r.id);
                    triggerToast(`Router "${r.name}" unlinked from platform. Device ready for fresh re-adoption.`, 'success');
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Complete De-Adoption</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* External Client Groups (Tenant Brands) Modal */}
      <TenantGroupsModal
        isOpen={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        routers={routers}
        onGroupsUpdated={() => {
          triggerToast('External client tenant groups and splash policies updated.', 'success');
        }}
      />
    </div>
  );
};

