import React, { useState } from 'react';
import { RouterDevice } from '../../types';
import { auditService } from '../../services/audit';
import { 
  ExternalLink, 
  Terminal, 
  Server, 
  RefreshCw, 
  Power, 
  WifiOff, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Copy, 
  Check, 
  ShieldCheck, 
  Monitor, 
  X,
  Activity,
  Zap,
  Network,
  Wifi,
  HelpCircle
} from 'lucide-react';
import { AccessPointSetupModal } from './AccessPointSetupModal';
import { copyToClipboard as copyText } from '../../utils/clipboard';

interface WebFigLauncherModalProps {
  router: RouterDevice;
  isOpen: boolean;
  onClose: () => void;
  onRouterUpdated?: () => void;
}

export const WebFigLauncherModal: React.FC<WebFigLauncherModalProps> = ({
  router,
  isOpen,
  onClose,
  onRouterUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'launcher' | 'tools' | 'embed' | 'ap-wiring'>('launcher');
  const [showApModal, setShowApModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  if (!isOpen) return null;

  const wireguardIp = router.wireguardIp || '10.99.1.50';
  const isPending = router.status === 'pending_adoption';
  const webfigUrl = isPending ? 'http://192.168.88.1:80' : `http://${wireguardIp}:80`;
  const winboxConnectString = isPending ? '192.168.88.1:8291' : `${wireguardIp}:8291`;
  const winboxCommand = isPending ? 'winbox.exe 192.168.88.1:8291 admin' : `winbox.exe ${wireguardIp}:8291 admin`;

  const copyToClipboard = (text: string, label: string) => {
    void copyText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleRemoteAction = async (action: 'reboot' | 'flush-sessions' | 'ping-gateway' | 'test-alert' | 'resync-config') => {
    setActionLoading(action);
    setActionResult(null);

    try {
      const response = await fetch(`/api/devices/${router.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setActionResult({
          success: true,
          message: data.message || `Action ${action} completed successfully.`,
          details: data
        });

        // Record in historical audit log
        if (action === 'reboot') {
          auditService.logRouterReboot(router, {
            source: 'webfig_launcher',
            reason: 'Triggered from WebFig Quick Tools dashboard'
          });
        } else if (action === 'resync-config') {
          auditService.logConfigChange(router, 'resync', 'Configuration re-sync dispatched from WebFig Quick Tools');
        } else if (action === 'flush-sessions') {
          auditService.logConfigChange(router, 'flush_sessions', 'Active hotspot sessions cleared from WebFig Quick Tools');
        } else {
          auditService.log({
            category: 'router_config',
            action: `router.${action}`,
            target: router.name,
            routerId: router.id,
            routerName: router.name,
            details: `Executed ${action} from WebFig Quick Tools: ${data.message || 'success'}`
          });
        }

        if (onRouterUpdated) onRouterUpdated();
      } else {
        setActionResult({
          success: false,
          message: data.message || `Failed to execute ${action}.`
        });

        auditService.log({
          category: 'router_config',
          action: `router.${action}`,
          target: router.name,
          routerId: router.id,
          routerName: router.name,
          status: 'failed',
          severity: 'warning',
          details: `Failed to execute ${action}: ${data.message || 'unknown error'}`
        });
      }
    } catch (err: any) {
      setActionResult({
        success: false,
        message: err.message || 'Network error executing remote action.'
      });

      auditService.log({
        category: 'router_config',
        action: `router.${action}`,
        target: router.name,
        routerId: router.id,
        routerName: router.name,
        status: 'failed',
        severity: 'warning',
        details: `Network error executing ${action}: ${err.message}`
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">{router.name}</h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  router.status === 'online' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${router.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {router.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Model: {router.model} • WireGuard Tunnel: <span className="text-sky-400 font-bold">{wireguardIp}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('launcher')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'launcher'
                ? 'border-orange-500 text-orange-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            WebFig & WinBox Access
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'tools'
                ? 'border-orange-500 text-orange-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Remote Quick Tools
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'embed'
                ? 'border-orange-500 text-orange-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            Embedded Console
          </button>
          <button
            onClick={() => setActiveTab('ap-wiring')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'ap-wiring'
                ? 'border-orange-500 text-orange-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-4 h-4" />
            2 APs & WinBox Topology
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900">
          {actionResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in duration-150 ${
              actionResult.success 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}>
              {actionResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              <div className="flex-1 text-sm">
                <p className="font-semibold">{actionResult.message}</p>
                {actionResult.details && actionResult.details.avgRtt && (
                  <p className="text-xs text-emerald-300 font-mono mt-1">
                    Target: {actionResult.details.target} • Latency: {actionResult.details.avgRtt} • Loss: {actionResult.details.packetLoss}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'launcher' && (
            <div className="space-y-6">
              {/* Pending Adoption Notice & Guided Setup Hints */}
              {isPending && (
                <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-200">Pending Adoption: Default Factory LAN Mode</h4>
                      <p className="text-xs text-amber-300/80">
                        This router has not yet executed the adoption script. Launch WebFig on default LAN IP <code className="text-white font-mono bg-amber-900/40 px-1 rounded">192.168.88.1</code>:
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 rounded-lg p-3 border border-amber-500/20 text-xs space-y-2 text-slate-300">
                    <p className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">Guided Setup Steps:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                        <span>Plug Ethernet cable into MikroTik <strong>port 2, 3, 4, or 5</strong> (or connect to default Wi-Fi).</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                        <span>Click <strong>Open WebFig (192.168.88.1)</strong> below or use WinBox MAC search.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                        <span>Login as <code className="text-emerald-400 font-mono">admin</code> (leave password blank on factory units).</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                        <span>Open <strong>Terminal</strong> in WebFig, paste adoption one-liner, and press Enter.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary WebFig Launcher Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700/80 rounded-xl p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isPending ? 'bg-amber-400' : 'bg-orange-500'}`}></span>
                      <h4 className="font-bold text-white text-base">MikroTik WebFig (HTTP Management)</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
                      {isPending
                        ? 'Connect directly over local factory subnet (192.168.88.1) to configure or paste adoption script.'
                        : `Accessible securely via WireGuard tunnel management network (${wireguardIp}) or fallback LAN (192.168.88.1).`
                      }
                    </p>
                  </div>
                  <a
                    href={webfigUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open WebFig ({isPending ? '192.168.88.1' : wireguardIp})
                  </a>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono">
                    <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">
                      {isPending ? 'Primary Setup LAN' : 'Tunnel Address'}
                    </div>
                    <div className="text-sky-300 font-semibold">{isPending ? '192.168.88.1:80' : `${wireguardIp}:80`}</div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono">
                    <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">Secondary Fallback</div>
                    <div className="text-emerald-300 font-semibold">{isPending ? `${wireguardIp}:80` : '192.168.88.1:80'}</div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 font-mono">
                    <div className="text-slate-500 text-[11px] uppercase tracking-wider mb-1">WebFig Security</div>
                    <div className="text-amber-300 font-semibold">{isPending ? 'Direct Factory LAN' : 'Encrypted WireGuard'}</div>
                  </div>
                </div>
              </div>

              {/* WinBox Helper Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">WinBox Native Desktop Client</h4>
                      <p className="text-xs text-slate-400">Connect using MikroTik WinBox v3 or v4</p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(winboxConnectString, 'winbox-ip')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                  >
                    {copiedText === 'winbox-ip' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy IP:Port
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Connect To:</span>
                    <span className="text-sky-300 font-bold">{winboxConnectString}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Default Login:</span>
                    <span className="text-emerald-300 font-bold">admin (or tc_controller)</span>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>CLI One-Click Launch Command:</span>
                    <button
                      onClick={() => copyToClipboard(winboxCommand, 'winbox-cmd')}
                      className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedText === 'winbox-cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy Command
                    </button>
                  </div>
                  <code className="text-slate-300 font-mono text-[11px] block overflow-x-auto p-1.5 bg-black/40 rounded border border-slate-800">
                    {winboxCommand}
                  </code>
                </div>
              </div>

              {/* Dual Access Point (UniFi / Omada) Quick Setup Card */}
              <div className="bg-gradient-to-r from-amber-500/10 via-slate-950 to-sky-500/10 border border-amber-500/30 rounded-xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">Connecting 2 Access Points to this Router?</h4>
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-400 rounded">
                        Captive Portal Bridged
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Router LAN IP (<span className="text-amber-400 font-mono font-bold">192.168.88.1</span>) is your Default Gateway for Ubiquiti UniFi and TP-Link Omada APs. Add ports to <span className="font-mono text-slate-200">tctower-bridge</span> and bypass AP management IPs.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApModal(true)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-sm shrink-0 cursor-pointer"
                >
                  Open Access Points and Winbox Assistant
                </button>
              </div>

            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Execute instant diagnostics and operations directly against this router through the T-Connect Control Tower.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Ping Gateway */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Ping Uplink Gateway (Starlink)
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Tests internet reachability to Cloudflare DNS (1.1.1.1) and measures Starlink LEO satellite latency.
                    </p>
                  </div>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleRemoteAction('ping-gateway')}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'ping-gateway' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Activity className="w-3.5 h-3.5 text-emerald-400" />}
                    Run Uplink Ping Diagnostic
                  </button>
                </div>

                {/* Flush Sessions */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <RefreshCw className="w-4 h-4 text-sky-400" />
                      Flush Active Hotspot Sessions
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Removes stale user sessions in RouterOS and forces fresh RADIUS authentication for connected devices.
                    </p>
                  </div>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleRemoteAction('flush-sessions')}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'flush-sessions' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <RefreshCw className="w-3.5 h-3.5 text-sky-400" />}
                    Flush All Hotspot Sessions
                  </button>
                </div>

                {/* Test Starlink Disconnect Alert */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <WifiOff className="w-4 h-4 text-amber-400" />
                      Test Starlink Offline Alert
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Simulates disconnected Starlink cable to test the 30-second watchdog and dispatches test alert email.
                    </p>
                  </div>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleRemoteAction('test-alert')}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'test-alert' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                    Simulate Disconnect & Dispatch Alert
                  </button>
                </div>

                {/* Force Re-sync Config */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <RefreshCw className="w-4 h-4 text-cyan-400" />
                      Force Re-sync Config
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Pushes latest WireGuard keys, RADIUS attributes, and Hotspot Walled Garden rules from Control Tower.
                    </p>
                  </div>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleRemoteAction('resync-config')}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'resync-config' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />}
                    Re-sync WireGuard & Hotspot Rules
                  </button>
                </div>

                {/* Reboot Router */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Power className="w-4 h-4 text-rose-400" />
                      Reboot MikroTik Router
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Issues controlled <code className="text-rose-300 font-mono">/system reboot</code> over WireGuard tunnel. Takes ~35s.
                    </p>
                  </div>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleRemoteAction('reboot')}
                    className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'reboot' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-400" /> : <Power className="w-3.5 h-3.5 text-rose-400" />}
                    Reboot RouterOS Device
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Target: <strong className="text-white">{webfigUrl}</strong>
                </span>
                <a
                  href={webfigUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab
                </a>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-96 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Server className="w-12 h-12 text-slate-600 animate-pulse" />
                <h5 className="font-bold text-white text-sm">Direct WebFig Management Tunnel</h5>
                <p className="text-xs text-slate-400 max-w-md">
                  Because WebFig runs directly on the MikroTik router's local WireGuard address (<code className="text-sky-400 font-mono">{wireguardIp}</code>), modern browsers restrict embedding private IP addresses inside cloud iframe frames.
                </p>
                <a
                  href={webfigUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Launch WebFig in Dedicated Window
                </a>
              </div>
            </div>
          )}

          {activeTab === 'ap-wiring' && (
            <div className="space-y-5">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                      <Network className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Access Points and Winbox Setup Assistant</h4>
                      <p className="text-xs text-slate-400">Connect Ubiquiti UniFi or TP-Link Omada APs to this router</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApModal(true)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
                  >
                    Open Interactive Assistant
                  </button>
                </div>

                {/* Gateway Explanation */}
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>Router Gateway IP Requirement:</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>YES:</strong> Because your access points use <strong>Static Management IPs</strong>, configure their network default gateway and DNS to this router’s LAN IP: <span className="text-amber-400 font-mono font-bold">192.168.88.1</span>.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-mono">
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">ROUTER GATEWAY IP</span>
                      <span className="text-amber-400 font-bold">192.168.88.1</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">AP 1 STATIC IP (ether3)</span>
                      <span className="text-indigo-400 font-bold">192.168.88.2</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">AP 2 STATIC IP (ether4)</span>
                      <span className="text-teal-400 font-bold">192.168.88.3</span>
                    </div>
                  </div>
                </div>

                {/* Bridge Port Script Requested by User */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300 font-medium">WinBox Terminal Bridge Script:</span>
                    <button
                      onClick={() => copyToClipboard(
                        `/interface bridge port add bridge=tctower-bridge interface="ether3" comment="tc-tower-bridge-port-ap1"\n/interface bridge port add bridge=tctower-bridge interface="ether4" comment="tc-tower-bridge-port-ap2"\n/ip hotspot ip-binding add address=192.168.88.2 type=bypassed comment="tc-bypass-AP1"\n/ip hotspot ip-binding add address=192.168.88.3 type=bypassed comment="tc-bypass-AP2"`,
                        'ap-quick-script'
                      )}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                    >
                      {copiedText === 'ap-quick-script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === 'ap-quick-script' ? 'Copied' : 'Copy Commands'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-black/60 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`/interface bridge port add bridge=tctower-bridge interface="ether3" comment="tc-tower-bridge-port-ap1"
/interface bridge port add bridge=tctower-bridge interface="ether4" comment="tc-tower-bridge-port-ap2"
/ip hotspot ip-binding add address=192.168.88.2 type=bypassed comment="tc-bypass-AP1"
/ip hotspot ip-binding add address=192.168.88.3 type=bypassed comment="tc-bypass-AP2"`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Deadman Watchdog Active (15s Heartbeat / 30s Deadman)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Full 2 AP & WinBox Assistant Modal */}
      <AccessPointSetupModal
        isOpen={showApModal}
        onClose={() => setShowApModal(false)}
        router={router}
      />
    </div>
  );
};
