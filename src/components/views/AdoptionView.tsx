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
  Wifi
} from 'lucide-react';
import { RouterDevice, VerticalType } from '../../types';
import { RouterOSRenderer } from '../../services/routerosRenderer';
import { WALLED_GARDEN_DOMAINS } from '../../services/storage';

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

  // Port & Bridge Management State
  const [selectedExtraPort, setSelectedExtraPort] = useState('ether3');
  const [selectedBridgeName, setSelectedBridgeName] = useState('mkcontroller-bridge');
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

  const filteredRouters = selectedVertical === 'all'
    ? routers
    : routers.filter(r => r.vertical === selectedVertical);

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
    hubDomain: 'hub.tconnect.co.ls',
    hubWgPort: 51820,
    hubTunnelIp: '10.99.0.1',
    routerWgIp: selectedRouter.wireguardIp || '10.99.1.50',
    routerPrivateKey: 'eB3...[GENERATED_ON_DEVICE_OR_PROVISIONED]...',
    hubPublicKey: 'v7TconnectHubWireguardKey2026Base64Salted==',
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

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">MikroTik Router Adoption Hub</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Zero-touch MKController-style one-liner adoption over encrypted WireGuard tunnel (v6 & v7)
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white text-xs font-bold rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Router to Fleet</span>
        </button>
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

                return (
                  <div
                    key={router.id}
                    onClick={() => setSelectedRouter(router)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                      isSelected
                        ? 'bg-[#1b233a] border-[#f05e17]/60 shadow-sm'
                        : 'bg-[#161d31] border-[#232d42] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{router.name}</span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                      }`}>
                        {isOnline ? 'ONLINE' : 'ADOPT PENDING'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 font-mono mt-1 truncate">{router.siteName}</p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2 pt-2 border-t border-[#232d42]">
                      <span>{router.model.split('(')[0]}</span>
                      <span className="text-cyan-400 font-bold">{router.rosVersion.toUpperCase()}</span>
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
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-1">
                    <span>MAC: <strong className="text-slate-200">{selectedRouter.macAddress}</strong></span>
                    <span>·</span>
                    <span>WireGuard IP: <strong className="text-emerald-400">{selectedRouter.wireguardIp}</strong></span>
                    <span>·</span>
                    <span>OS: <strong className="text-cyan-400">{selectedRouter.rosVersion.toUpperCase()}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedRouter.status === 'pending_adoption' && (
                    <button
                      onClick={runTerminalAdoptionSimulation}
                      disabled={isSimulatingAdoption}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors font-mono shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isSimulatingAdoption ? 'Adopting...' : 'Simulate Terminal Run'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteRouter(selectedRouter.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Router"
                  >
                    <Trash2 className="w-4 h-4" />
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
                  <option value="hotspot">☕ Connected Hotspots (Cafes & Retail)</option>
                  <option value="community">🏡 Connected Communities (Solar Mesh)</option>
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
    </div>
  );
};
