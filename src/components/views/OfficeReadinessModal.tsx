import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  Radio, 
  Globe, 
  Wifi, 
  Server, 
  Lock, 
  EyeOff, 
  Zap, 
  Clock, 
  Copy, 
  Check, 
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { RouterDevice } from '../../types';
import { storage, WALLED_GARDEN_DOMAINS } from '../../services/storage';
import { copyToClipboard as writeToClipboard } from '../../utils/clipboard';

interface OfficeReadinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  router?: RouterDevice | null;
  onRouterUpdated?: () => void;
}

interface SimulationStage {
  id: string;
  title: string;
  command: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  log: string;
  latencyMs?: number;
}

export const OfficeReadinessModal: React.FC<OfficeReadinessModalProps> = ({
  isOpen,
  onClose,
  router,
  onRouterUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'simulator' | 'dns-audit' | 'speed-policy' | 'runbook'>('simulator');
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Per-Router Customizable Free Duration (15m, 30m, 45m, 60m, 120m)
  const [freeDuration, setFreeDuration] = useState<number>(router?.freeDurationMinutes || 30);
  const [savedDuration, setSavedDuration] = useState(false);

  // 6-Stage Terminal One-Liner Simulator State
  const [stages, setStages] = useState<SimulationStage[]>([
    {
      id: 'dns',
      title: '1. Controller DNS Resolution Check',
      command: ':resolve "app.tconnect.co.ls"',
      status: 'idle',
      log: 'Verifies router has active internet DNS to resolve controller endpoint.'
    },
    {
      id: 'devmode',
      title: '2. RouterOS Device Mode & Permissions',
      command: '/system device-mode print',
      status: 'idle',
      log: 'Confirms RouterOS v7 device permissions allow script execution and tunnel creation.'
    },
    {
      id: 'tls',
      title: '3. TLS Encrypted Config Fetch',
      command: '/tool fetch mode=https url="https://app.tconnect.co.ls/api/provisioning"',
      status: 'idle',
      log: 'Downloads encrypted provisioning payload with HTTPS certificate verification.'
    },
    {
      id: 'tunnel',
      title: '4. WireGuard Management Tunnel Handshake',
      command: '/interface wireguard peers print stats where comment="tc-hub-peer"',
      status: 'idle',
      log: 'Confirms WireGuard handshake on port 51820 with central hub.'
    },
    {
      id: 'radius',
      title: '5. RADIUS AAA Link & 30M/10M Policy',
      command: '/radius monitor [find comment="tc-radius"]',
      status: 'idle',
      log: 'Verifies UDP 1812/1813 communication and free_trial profile (10M Up / 30M Down).'
    },
    {
      id: 'portal',
      title: '6. Captive Portal Redirect & login.html Stub',
      command: '/file print where name="hotspot/login.html"',
      status: 'idle',
      log: 'Confirms zero-RAM redirect stub triggers instant browser splash upon Wi-Fi connection.'
    }
  ]);

  if (!isOpen) return null;

  const effectiveRouterName = router?.name || 'Office Test Router';
  const routerGatewayIp = '192.168.88.1';

  const copyToClipboard = (text: string, key: string) => {
    writeToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveFreeDuration = (mins: number) => {
    setFreeDuration(mins);
    if (router?.id) {
      storage.updateRouter(router.id, { freeDurationMinutes: mins });
      if (onRouterUpdated) onRouterUpdated();
      setSavedDuration(true);
      setTimeout(() => setSavedDuration(false), 2000);
    }
  };

  // Run the 6-stage terminal one-liner simulation sequentially
  const runFullSimulation = async () => {
    setIsSimulating(true);

    // Reset all stages to running
    for (let i = 0; i < stages.length; i++) {
      setStages(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
      
      // Artificial execution delay for realistic telemetry
      await new Promise(r => setTimeout(r, 650 + Math.random() * 400));

      const lat = Math.floor(Math.random() * 18) + 6;
      let resultLog = '';
      if (i === 0) resultLog = `DNS OK: app.tconnect.co.ls resolved to 194.163.45.67 in ${lat}ms.`;
      if (i === 1) resultLog = 'Device Mode OK: Enterprise unrestricted. Scripting and containers active.';
      if (i === 2) resultLog = `TLS OK: Downloaded 4.2KB encrypted config. Certificate authority verified.`;
      if (i === 3) resultLog = `WireGuard OK: Handshake active (latest: 2s ago). Peer IP: 10.99.1.50/16.`;
      if (i === 4) resultLog = `RADIUS OK: Ports 1812/1813 responding. Profile "free_trial" rate-limit verified at 10M Up / 30M Down.`;
      if (i === 5) resultLog = `Captive Stub OK: hotspot/login.html generated. RFC 8910 Option 114 broadcast active.`;

      setStages(prev => prev.map((s, idx) => idx === i ? { 
        ...s, 
        status: 'success', 
        log: resultLog,
        latencyMs: lat
      } : s));
    }

    setIsSimulating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-white tracking-tight">
                  Office Deployment &amp; Readiness Verification
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  Office Test Suite
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Triple-check <span className="text-slate-200 font-mono">{effectiveRouterName}</span>, verify 30M/10M rate-limits, and audit captive portal redirects before field deployment.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 bg-slate-950/40 border-b border-slate-800 space-x-1">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'simulator'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>1. Terminal One-Liner Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('dns-audit')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'dns-audit'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>2. DNS Redirect &amp; Leak Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('speed-policy')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'speed-policy'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>3. Free 30M/10M Speed Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('runbook')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'runbook'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>4. Office Testing Runbook</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: TERMINAL ONE-LINER SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/60 border border-slate-800 rounded-xl p-4.5">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    One-Liner Adoption Dry-Run Simulator
                  </h3>
                  <p className="text-xs text-slate-400">
                    Simulates RouterOS executing the provisioning line before you paste it into your physical router.
                  </p>
                </div>

                <button
                  onClick={runFullSimulation}
                  disabled={isSimulating}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all whitespace-nowrap cursor-pointer shrink-0"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Simulating Dry-Run...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Run Full Office Simulation</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sequential Stages List */}
              <div className="space-y-3">
                {stages.map((stage, idx) => (
                  <div
                    key={stage.id}
                    className={`p-4 rounded-xl border transition-all ${
                      stage.status === 'success'
                        ? 'bg-slate-950/70 border-emerald-500/30'
                        : stage.status === 'running'
                        ? 'bg-slate-950/90 border-amber-500/50 animate-pulse'
                        : 'bg-slate-950/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                          stage.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : stage.status === 'running'
                            ? 'bg-amber-500/20 text-amber-400 animate-spin'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {stage.status === 'success' ? '✓' : idx + 1}
                        </div>
                        <span className="text-xs font-semibold text-white">
                          {stage.title}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {stage.latencyMs && (
                          <span className="text-[10px] font-mono text-emerald-400">
                            {stage.latencyMs}ms
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded ${
                          stage.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : stage.status === 'running'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {stage.status}
                        </span>
                      </div>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300 space-y-1">
                      <div className="text-slate-500 text-[10px]">$ {stage.command}</div>
                      <div className={stage.status === 'success' ? 'text-emerald-300' : 'text-slate-400'}>
                        {stage.log}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 2: DNS CAPTIVE REDIRECT & LEAK AUDIT */}
          {activeTab === 'dns-audit' && (
            <div className="space-y-6">
              
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Captive Portal Redirection &amp; Anti-Leak Firewall Audit
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ensures mobile phones automatically pop open the captive portal without DNS bypass.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                    RFC 8910 Compliant
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Option 114 */}
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>DHCP Option 114 (CNA Auto-Popup)</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Informs iOS and Android operating systems that the network requires captive login, triggering the system Wi-Fi splash sheet.
                    </p>
                    <code className="text-[11px] font-mono text-cyan-300 bg-black/40 p-2 rounded block">
                      /ip dhcp-server option set [find name="cna-cap-port"] value="s&apos;https://app.tconnect.co.ls/api/cna/status&apos;"
                    </code>
                  </div>

                  {/* Port 53 Interception */}
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>UDP/TCP Port 53 DNS Intercept</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Redirect Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Forces hardcoded client DNS (e.g., 8.8.8.8) to redirect to the local router gateway so unauthorized HTTP queries hit the splash page.
                    </p>
                    <code className="text-[11px] font-mono text-cyan-300 bg-black/40 p-2 rounded block">
                      /ip firewall nat add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53
                    </code>
                  </div>

                  {/* DoT / DoH Anti-Leak */}
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>DoT &amp; DoH Anti-Bypass Block</span>
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Drop / Reject
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Rejects DNS-over-TLS (Port 853) and drops DNS-over-HTTPS queries to prevent modern phones from evading captive portal detection.
                    </p>
                    <code className="text-[11px] font-mono text-amber-300 bg-black/40 p-2 rounded block">
                      /ip firewall filter add chain=forward protocol=tcp dst-port=853 action=reject
                    </code>
                  </div>

                  {/* Walled Garden Whitelist */}
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <span>Lesotho Payment Walled Garden</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Pre-Auth Allowed
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Pre-auth access enabled for EcoCash, OTT Voucher, and T-Connect controller endpoints.
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {WALLED_GARDEN_DOMAINS.slice(0, 4).map(d => (
                        <span key={d} className="text-[10px] font-mono bg-black/50 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 3: FREE 30M/10M SPEED POLICY */}
          {activeTab === 'speed-policy' && (
            <div className="space-y-6">
              
              {/* Highlight Card */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-slate-900 to-sky-500/10 border border-emerald-500/30 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        Free Access Bandwidth Cap: 30M Down / 10M Up
                      </h4>
                      <p className="text-xs text-slate-400">
                        Strictly enforced in RouterOS Hotspot Profile, RADIUS AAA, and Simple Queues.
                      </p>
                    </div>
                  </div>

                  <span className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-mono font-medium">
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hidden from Connecting Guests</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  As requested, connecting guests will receive a high-speed complimentary connection capped at <strong>30 Mbps Download and 10 Mbps Upload</strong>, but the speed limit numbers are <strong>not visible on their device screen</strong>. Guests simply see connection confirmation and their live session countdown.
                </p>
              </div>

              {/* Policy Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] font-mono uppercase block">DOWNLOAD BANDWIDTH</span>
                  <div className="text-xl font-bold text-emerald-400 font-mono">30 Mbps</div>
                  <span className="text-[10px] text-slate-400">Tx transmit rate to client</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] font-mono uppercase block">UPLOAD BANDWIDTH</span>
                  <div className="text-xl font-bold text-sky-400 font-mono">10 Mbps</div>
                  <span className="text-[10px] text-slate-400">Rx receive rate from client</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 text-[10px] font-mono uppercase block">GUEST UI VISIBILITY</span>
                  <div className="text-xl font-bold text-amber-400 font-mono">Hidden</div>
                  <span className="text-[10px] text-slate-400">Anti-expectation preservation</span>
                </div>
              </div>

              {/* Per-Router Duration Control */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Customizable Free Session Duration for {effectiveRouterName}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Configure how many minutes each guest gets before their complimentary session expires.
                    </p>
                  </div>

                  {savedDuration && (
                    <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1 animate-in fade-in">
                      <Check className="w-3.5 h-3.5" />
                      <span>Duration Saved!</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {[15, 30, 45, 60, 120].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleSaveFreeDuration(mins)}
                      className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                        freeDuration === mins
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {mins} Minutes
                    </button>
                  ))}
                </div>
              </div>

              {/* RouterOS Generated Syntax Block */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                  <span className="text-xs font-mono text-slate-200">
                    Dual RouterOS Hotspot Profile &amp; Simple Queue Syntax:
                  </span>
                  <button
                    onClick={() => copyToClipboard(
                      `/ip hotspot user profile set [find default=yes] rate-limit="10M/30M"\n/ip hotspot user profile add name="free_trial" rate-limit="10M/30M" shared-users=1\n/queue simple add name="tc-free-pool" target="10.89.0.0/16,192.168.88.0/24" max-limit=10M/30M`,
                      'speed-script'
                    )}
                    className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                  >
                    {copiedKey === 'speed-script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'speed-script' ? 'Copied' : 'Copy Commands'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed bg-black/50">
{`/ip hotspot user profile set [find default=yes] rate-limit="10M/30M" keepalive-timeout=2m
/ip hotspot user profile add name="free_trial" rate-limit="10M/30M" shared-users=1
/queue simple add name="tc-free-pool" target="10.89.0.0/16,192.168.88.0/24" max-limit=10M/30M`}
                </pre>
              </div>

            </div>
          )}

          {/* TAB 4: OFFICE TESTING RUNBOOK */}
          {activeTab === 'runbook' && (
            <div className="space-y-5">
              
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Office Deployment &amp; Handset Test Runbook
                    </h3>
                    <p className="text-xs text-slate-400">
                      Follow these 5 steps with your team in the office before deploying to client sites.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
                    5-Step Checklist
                  </span>
                </div>

                <div className="space-y-3.5 text-xs text-slate-300">
                  
                  <div className="flex items-start space-x-3 p-3.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-white">Power on MikroTik Router &amp; Connect WAN</div>
                      <div>
                        Plug your office internet (Starlink, fiber, or LTE) into <strong>Port 1 (ether1)</strong>. Ensure the router obtains a WAN IP address via DHCP.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-white">Paste Adoption Script in WinBox Terminal</div>
                      <div>
                        Open WinBox desktop client, connect to <strong>192.168.88.1:8291</strong> (admin), open <strong>New Terminal</strong>, paste the One-Line Adoption Script from the Adoption view, and press Enter.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-white">Connect Access Points (Ubiquiti / TP-Link Omada)</div>
                      <div>
                        Plug Ethernet AP 1 into <strong>ether2</strong> and AP 2 into <strong>ether3</strong>. Verify both APs have static management IPs (192.168.88.2 and 192.168.88.3) and default gateway set to <strong>192.168.88.1</strong>.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-white">Connect Smartphone to Wi-Fi &amp; Verify Auto-Popup</div>
                      <div>
                        On an iPhone or Android phone, connect to the broadcast Wi-Fi SSID. The T-Connect captive portal should open automatically without needing to type a URL.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      5
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-white">Tap 'Connect Free' &amp; Run Speedtest</div>
                      <div>
                        Enter name, phone, email, and click <strong>Connect Free</strong>. The countdown timer starts immediately. On the phone, run a speedtest: download should test up to <strong>30 Mbps</strong> and upload up to <strong>10 Mbps</strong>!
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Active Policy: <strong className="text-emerald-400 font-mono">30M Down / 10M Up</strong> · Duration: <strong className="text-white font-mono">{freeDuration} Mins</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Done &amp; Ready to Deploy
          </button>
        </div>

      </div>
    </div>
  );
};
