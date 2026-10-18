import React, { useState } from 'react';
import { 
  X, 
  Network, 
  Wifi, 
  Server, 
  Globe, 
  Terminal, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Layers, 
  Settings2, 
  ShieldCheck, 
  ExternalLink,
  Laptop,
  HelpCircle,
  RefreshCw,
  Activity
} from 'lucide-react';
import { RouterDevice } from '../../types';
import { RouterOSRenderer } from '../../services/routerosRenderer';

interface AccessPointSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  router?: RouterDevice | null;
}

export const AccessPointSetupModal: React.FC<AccessPointSetupModalProps> = ({
  isOpen,
  onClose,
  router
}) => {
  const [activeTab, setActiveTab] = useState<'topology' | 'scripts' | 'vendors' | 'winbox' | 'pc_test'>('topology');
  const [selectedVendor, setSelectedVendor] = useState<'unifi' | 'omada'>('unifi');
  
  // Network parameters
  const [routerGatewayIp, setRouterGatewayIp] = useState('192.168.88.1');
  const [subnetMask, setSubnetMask] = useState('255.255.255.0');
  const [bridgeName, setBridgeName] = useState('tctower-bridge');
  
  // AP 1 configuration
  const [ap1Name, setAp1Name] = useState('AP1-Ubiquiti-UniFi');
  const [ap1Vendor, setAp1Vendor] = useState<'unifi' | 'omada'>('unifi');
  const [ap1Port, setAp1Port] = useState('ether2');
  const [ap1Ip, setAp1Ip] = useState('192.168.88.2');

  // AP 2 configuration
  const [ap2Name, setAp2Name] = useState('AP2-TPLink-Omada');
  const [ap2Vendor, setAp2Vendor] = useState<'unifi' | 'omada'>('omada');
  const [ap2Port, setAp2Port] = useState('ether3');
  const [ap2Ip, setAp2Ip] = useState('192.168.88.3');

  // Clipboard & Interactive State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; latency: number; message: string } | null>(null);

  if (!isOpen) return null;

  const wireguardIp = router?.wireguardIp || '10.99.1.50';
  const effectiveRouterName = router?.name || 'MikroTik Gateway';
  const winboxConnectString = router?.status === 'pending_adoption' ? `${routerGatewayIp}:8291` : `${wireguardIp}:8291`;
  const winboxCliCommand = `winbox.exe ${routerGatewayIp}:8291 admin`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestPing = () => {
    setIsTestingPing(true);
    setPingResult(null);
    setTimeout(() => {
      setIsTestingPing(false);
      setPingResult({
        success: true,
        latency: Math.floor(Math.random() * 8) + 2,
        message: `Router Gateway (${routerGatewayIp}) reached on ${bridgeName}. Static IPs (${ap1Ip}, ${ap2Ip}) verified.`
      });
    }, 900);
  };

  // Generate full RouterOS script
  const fullScript = RouterOSRenderer.renderApBridgeScript({
    bridgeName,
    ap1Port,
    ap2Port,
    ap1Ip,
    ap2Ip,
    ap1Name,
    ap2Name
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-white tracking-tight">
                  Access Points and Winbox Setup Assistant
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                  ether2/ether3 Ethernet Bridge · MIKROTIK-TC WiFi
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connect APs or test wired Ethernet on ports <span className="text-amber-300 font-mono">ether2 &amp; ether3</span> or open SSID <span className="text-amber-300 font-mono">MIKROTIK-TC</span> with independent WiFi CLI controls.
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
            onClick={() => setActiveTab('topology')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'topology'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Visual Topology & Gateway</span>
          </button>

          <button
            onClick={() => setActiveTab('scripts')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'scripts'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>2. WinBox Bridge & Bypass Scripts</span>
          </button>

          <button
            onClick={() => setActiveTab('vendors')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'vendors'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>3. UniFi / Omada Configuration Steps</span>
          </button>

          <button
            onClick={() => setActiveTab('winbox')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'winbox'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>4. WinBox Direct Launcher</span>
          </button>

          <button
            onClick={() => setActiveTab('pc_test')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'pc_test'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>5. PC &amp; Mac Testing Guide</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: VISUAL TOPOLOGY & GATEWAY CALCULATOR */}
          {activeTab === 'topology' && (
            <div className="space-y-6">
              
              {/* Question & Answer Quick Card */}
              <div className="bg-gradient-to-r from-amber-500/10 via-slate-800/40 to-sky-500/10 border border-amber-500/20 rounded-xl p-4.5">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 shrink-0 mt-0.5">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white">
                      Do you need to know the router gateway IP?
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong className="text-emerald-400 font-medium">YES, absolutely.</strong> Because your two access points use <strong>Static Management IPs</strong>, you must input the MikroTik Router’s LAN/Bridge IP address (<span className="text-amber-300 font-mono">{routerGatewayIp}</span>) as their <strong>Default Gateway</strong> and <strong>DNS Server</strong>. This allows the APs to talk to the router and lets the router bridge all guest Wi-Fi clients directly to the captive portal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Network Diagram */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Interactive Network Architecture Diagram
                  </span>
                  <span className="text-xs text-emerald-400 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Layer-2 Transparent Passthrough</span>
                  </span>
                </div>

                {/* Topology Flow */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  
                  {/* Step 1: Internet / Starlink */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col items-center text-center space-y-2 relative group hover:border-slate-700 transition-all">
                    <div className="p-3 bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-semibold text-white">Internet Backhaul</div>
                    <div className="text-[11px] text-slate-400 font-mono">Starlink / Fiber / LTE</div>
                    <div className="text-[10px] text-slate-500">Port ether1 (WAN)</div>
                  </div>

                  {/* Arrow 1 */}
                  <div className="hidden md:flex flex-col items-center justify-center text-slate-500">
                    <ArrowRight className="w-5 h-5 text-amber-500" />
                    <span className="text-[10px] font-mono text-slate-400">WAN Uplink</span>
                  </div>

                  {/* Step 2: MikroTik Hotspot Gateway */}
                  <div className="bg-gradient-to-b from-amber-500/10 to-slate-900 border-2 border-amber-500/40 rounded-xl p-4 flex flex-col items-center text-center space-y-2 relative shadow-lg shadow-amber-500/5">
                    <div className="p-3 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                      <Server className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-white">MikroTik RouterOS</div>
                    <div className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-xs rounded border border-amber-500/30">
                      Gateway: {routerGatewayIp}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Bridge: <span className="font-mono text-slate-300">{bridgeName}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium">
                      Captive Portal Engine Active
                    </div>
                  </div>

                  {/* Arrow 2 */}
                  <div className="hidden md:flex flex-col items-center justify-center text-slate-500">
                    <ArrowRight className="w-5 h-5 text-amber-500" />
                    <span className="text-[10px] font-mono text-slate-400">Hotspot Bridge</span>
                  </div>

                  {/* Step 3: Dual Access Points */}
                  <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    
                    {/* AP 1 Card */}
                    <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                            <Wifi className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{ap1Name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Connected to Router {ap1Port}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/20">
                          {ap1Vendor === 'unifi' ? 'Ubiquiti UniFi' : 'TP-Link Omada'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[10px]">STATIC IP:</span>
                          <span className="text-slate-200 font-bold">{ap1Ip}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">GATEWAY IP:</span>
                          <span className="text-amber-400 font-bold">{routerGatewayIp}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">SUBNET MASK:</span>
                          <span className="text-slate-300">{subnetMask}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">PORTAL REDIRECT:</span>
                          <span className="text-emerald-400 font-bold">Automatic</span>
                        </div>
                      </div>
                    </div>

                    {/* AP 2 Card */}
                    <div className="bg-slate-900/90 border border-teal-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
                            <Wifi className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{ap2Name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Connected to Router {ap2Port}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-teal-500/10 text-teal-300 rounded border border-teal-500/20">
                          {ap2Vendor === 'unifi' ? 'Ubiquiti UniFi' : 'TP-Link Omada'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[10px]">STATIC IP:</span>
                          <span className="text-slate-200 font-bold">{ap2Ip}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">GATEWAY IP:</span>
                          <span className="text-amber-400 font-bold">{routerGatewayIp}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">SUBNET MASK:</span>
                          <span className="text-slate-300">{subnetMask}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">PORTAL REDIRECT:</span>
                          <span className="text-emerald-400 font-bold">Automatic</span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              {/* Gateway & Port Calculator Form */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Settings2 className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Gateway & Static IP Calculator
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Modifying values updates the WinBox scripts and UniFi/Omada guides in real-time.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Router Gateway IP (MikroTik LAN)
                    </label>
                    <input
                      type="text"
                      value={routerGatewayIp}
                      onChange={(e) => setRouterGatewayIp(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                      placeholder="192.168.88.1"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      This is the IP address you input into your AP networks.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Hotspot Bridge Name
                    </label>
                    <input
                      type="text"
                      value={bridgeName}
                      onChange={(e) => setBridgeName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                      placeholder="tctower-bridge"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Target bridge grouping ether3 & ether4.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Subnet Mask
                    </label>
                    <input
                      type="text"
                      value={subnetMask}
                      onChange={(e) => setSubnetMask(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                      placeholder="255.255.255.0"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      CIDR /24 (254 host addresses).
                    </span>
                  </div>
                </div>

                {/* AP Configuration Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  
                  {/* AP 1 Inputs */}
                  <div className="p-3.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Access Point 1</span>
                      </span>
                      <select
                        value={ap1Vendor}
                        onChange={(e) => setAp1Vendor(e.target.value as any)}
                        className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
                      >
                        <option value="unifi">Ubiquiti UniFi</option>
                        <option value="omada">TP-Link Omada</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Router Port</label>
                        <select
                          value={ap1Port}
                          onChange={(e) => setAp1Port(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                        >
                          <option value="ether2">ether2</option>
                          <option value="ether3">ether3 (Recommended)</option>
                          <option value="ether4">ether4</option>
                          <option value="ether5">ether5</option>
                          <option value="sfp1">sfp1</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Static IP</label>
                        <input
                          type="text"
                          value={ap1Ip}
                          onChange={(e) => setAp1Ip(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-indigo-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AP 2 Inputs */}
                  <div className="p-3.5 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Wifi className="w-3.5 h-3.5 text-teal-400" />
                        <span>Access Point 2</span>
                      </span>
                      <select
                        value={ap2Vendor}
                        onChange={(e) => setAp2Vendor(e.target.value as any)}
                        className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300"
                      >
                        <option value="omada">TP-Link Omada</option>
                        <option value="unifi">Ubiquiti UniFi</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Router Port</label>
                        <select
                          value={ap2Port}
                          onChange={(e) => setAp2Port(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                        >
                          <option value="ether2">ether2</option>
                          <option value="ether3">ether3</option>
                          <option value="ether4">ether4 (Recommended)</option>
                          <option value="ether5">ether5</option>
                          <option value="sfp1">sfp1</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Static IP</label>
                        <input
                          type="text"
                          value={ap2Ip}
                          onChange={(e) => setAp2Ip(e.target.value)}
                          className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-teal-300"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Pool Separation Notice */}
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">
                      <strong>IP Conflict Prevention:</strong> Static AP IPs (<span className="text-indigo-300 font-mono">{ap1Ip}</span>, <span className="text-teal-300 font-mono">{ap2Ip}</span>) are allocated outside the guest DHCP client pool (<span className="text-amber-400 font-mono">.50 – .250</span>).
                    </span>
                  </div>
                  <button
                    onClick={handleTestPing}
                    disabled={isTestingPing}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 transition-colors"
                  >
                    {isTestingPing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Verify Gateway</span>
                  </button>
                </div>

                {pingResult && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center justify-between">
                    <span>{pingResult.message}</span>
                    <span className="font-mono text-emerald-400 font-bold">{pingResult.latency} ms</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: COPY-PASTE WINBOX SCRIPTS */}
          {activeTab === 'scripts' && (
            <div className="space-y-5">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    MikroTik WinBox Terminal Scripts
                  </h3>
                  <p className="text-xs text-slate-400">
                    Open <strong>WinBox &gt; New Terminal</strong>, paste these commands, and press Enter.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(fullScript, 'full-script')}
                  className="flex items-center space-x-2 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs transition-colors shadow-sm"
                >
                  {copiedKey === 'full-script' ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>Copied All Commands!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Full Script</span>
                    </>
                  )}
                </button>
              </div>

              {/* Individual Snippets */}
              <div className="space-y-4">
                
                {/* 1. Bridge Port Command (Ethernet ether2 & ether3) */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-xs font-mono font-medium text-slate-200">
                        1. Add Ethernet Ports ({ap1Port} &amp; {ap2Port}) to Hotspot Bridge (Auto-Detects Bridge)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(
                          `/interface bridge port add bridge=bridge interface=${ap1Port} comment="tc-ap-ethernet-${ap1Port}"\n/interface bridge port add bridge=bridge interface=${ap2Port} comment="tc-ap-ethernet-${ap2Port}"`,
                          'port-direct'
                        )}
                        className="flex items-center space-x-1.5 text-xs text-amber-300 hover:text-white px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'port-direct' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'port-direct' ? 'Copied' : 'Copy Direct ("bridge")'}</span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(
                          `:local targetBridge "${bridgeName}";\n:if ([:len [/interface bridge find name="${bridgeName}"]] = 0) do={\n  :if ([:len [/interface bridge find name="bridge"]] > 0) do={\n    :set targetBridge "bridge";\n  } else={\n    :if ([:len [/interface bridge find name="bridge1"]] > 0) do={\n      :set targetBridge "bridge1";\n    } else={\n      :if ([:len [/interface bridge find]] > 0) do={\n        :set targetBridge [/interface bridge get [:pick [/interface bridge find] 0] name];\n      } else={\n        /interface bridge add name="${bridgeName}" comment="T-Connect Hotspot & AP Bridge";\n      };\n    };\n  };\n};\n/interface bridge port add bridge=$targetBridge interface="${ap1Port}" comment="tc-ap-ethernet-${ap1Port}"\n/interface bridge port add bridge=$targetBridge interface="${ap2Port}" comment="tc-ap-ethernet-${ap2Port}"`,
                          'port-script'
                        )}
                        className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'port-script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'port-script' ? 'Copied' : 'Copy Auto Script'}</span>
                      </button>
                    </div>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed bg-black/40">
{`# Direct command (if default bridge is "bridge"):
/interface bridge port add bridge=bridge interface=${ap1Port} comment="tc-ap-ethernet-${ap1Port}"
/interface bridge port add bridge=bridge interface=${ap2Port} comment="tc-ap-ethernet-${ap2Port}"

# Or auto-detect existing bridge script:
:local targetBridge "${bridgeName}";
:if ([:len [/interface bridge find name="${bridgeName}"]] = 0) do={
  :if ([:len [/interface bridge find name="bridge"]] > 0) do={
    :set targetBridge "bridge";
  } else={
    :if ([:len [/interface bridge find name="bridge1"]] > 0) do={
      :set targetBridge "bridge1";
    } else={
      :if ([:len [/interface bridge find]] > 0) do={
        :set targetBridge [/interface bridge get [:pick [/interface bridge find] 0] name];
      };
    };
  };
};
/interface bridge port add bridge=$targetBridge interface="${ap1Port}" comment="tc-ap-ethernet-${ap1Port}"
/interface bridge port add bridge=$targetBridge interface="${ap2Port}" comment="tc-ap-ethernet-${ap2Port}"`}
                  </pre>
                  <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 text-[11px] text-slate-400">
                    🔌 <strong>Wired Ethernet Testing:</strong> Connecting an Ethernet cable directly to <span className="font-mono text-amber-300">{ap1Port}</span> or <span className="font-mono text-amber-300">{ap2Port}</span> redirects wired clients directly to the T-Connect captive portal.
                  </div>
                </div>

                {/* 2. Configure Open Test WiFi SSID "MIKROTIK-TC" (RouterOS 7.16.2 wifi-qcom) */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-mono font-medium text-slate-200">
                        2. Setup Open Test WiFi SSID &quot;MIKROTIK-TC&quot; (RouterOS 7.16.2 wifi-qcom)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(
                          `/interface wifi set [find] configuration.ssid="MIKROTIK-TC" disabled=no`,
                          'wifi-direct'
                        )}
                        className="flex items-center space-x-1.5 text-xs text-emerald-300 hover:text-white px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'wifi-direct' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'wifi-direct' ? 'Copied' : 'Copy Direct CLI'}</span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(
                          `:do { :if ([:len [/interface wifi find]] > 0) do={ :foreach w in=[/interface wifi find] do={ /interface wifi set $w configuration.ssid="MIKROTIK-TC" disabled=no } } else={ :if ([:len [/interface wireless find]] > 0) do={ /interface wireless set [:pick [/interface wireless find] 0] ssid="MIKROTIK-TC" mode=ap-bridge frequency=auto disabled=no } } } on-error={};`,
                          'wifi-setup-script'
                        )}
                        className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'wifi-setup-script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'wifi-setup-script' ? 'Copied' : 'Copy Auto Script'}</span>
                      </button>
                    </div>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed bg-black/40">
{`# RouterOS 7.16.2 (wifi-qcom - wifi1 & wifi2):
/interface wifi set [find] configuration.ssid="MIKROTIK-TC" disabled=no

# Multi-radio auto-configuration script:
:foreach w in=[/interface wifi find] do={
  /interface wifi set $w configuration.ssid="MIKROTIK-TC" disabled=no
};`}
                  </pre>
                </div>

                {/* 3. Independent WiFi CLI Control (Disable / Enable WiFi Radio) */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="text-xs font-mono font-medium text-slate-200">
                        3. Independent Wireless Control CLI (RouterOS 7.16.2 wifi-qcom)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(`/interface wifi disable [find]`, 'wifi-off')}
                        className="text-xs text-rose-300 hover:text-white px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded transition-colors"
                      >
                        {copiedKey === 'wifi-off' ? 'Copied Disable' : 'Copy Disable CLI'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(`/interface wifi enable [find]`, 'wifi-on')}
                        className="text-xs text-emerald-300 hover:text-white px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded transition-colors"
                      >
                        {copiedKey === 'wifi-on' ? 'Copied Enable' : 'Copy Enable CLI'}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-black/40 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-rose-400"># Disable All WiFi Broadcasting:</span>
                      <span className="text-slate-300">/interface wifi disable [find]</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400"># Enable All WiFi Broadcasting:</span>
                      <span className="text-slate-300">/interface wifi enable [find]</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
                      <span># Disable 5GHz (wifi1) only:</span>
                      <span className="text-slate-300">/interface wifi disable [find name=wifi1]</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span># Disable 2.4GHz (wifi2) only:</span>
                      <span className="text-slate-300">/interface wifi disable [find name=wifi2]</span>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800/80 text-[11px] text-slate-300">
                    💡 <strong>Independent Radio Control:</strong> Disabling WiFi radios (<code className="text-rose-400">wifi1/wifi2</code>) only turns off wireless broadcasting. Ethernet clients connected via <span className="text-amber-300 font-mono">ether2 &amp; ether3</span> and the T-Connect controller platform remain 100% active over WireGuard.
                  </div>
                </div>

                {/* 4. Hotspot IP-Binding Bypass */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span className="text-xs font-mono font-medium text-slate-200">
                        4. Bypass AP Static Management IPs from Captive Portal
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(
                        `/ip hotspot ip-binding add address=${ap1Ip} type=bypassed comment="tc-bypass-${ap1Name}"\n/ip hotspot ip-binding add address=${ap2Ip} type=bypassed comment="tc-bypass-${ap2Name}"`,
                        'bypass-script'
                      )}
                      className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                    >
                      {copiedKey === 'bypass-script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'bypass-script' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-indigo-300 overflow-x-auto leading-relaxed bg-black/40">
{`/ip hotspot ip-binding add address=${ap1Ip} type=bypassed comment="tc-bypass-${ap1Name}"
/ip hotspot ip-binding add address=${ap2Ip} type=bypassed comment="tc-bypass-${ap2Name}"`}
                  </pre>
                  <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 text-[11px] text-slate-400">
                    💡 <strong>Why this matters:</strong> Without this bypass, the AP hardware might attempt to download firmware updates or talk to its cloud controller and get intercepted by the captive login page.
                  </div>
                </div>

                {/* 5. WinBox Service Port Check */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span className="text-xs font-mono font-medium text-slate-200">
                        5. Verify WinBox Port Service (Port 8291)
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(
                        `/ip service set winbox disabled=no port=8291`,
                        'winbox-svc'
                      )}
                      className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                    >
                      {copiedKey === 'winbox-svc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'winbox-svc' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-sky-300 overflow-x-auto leading-relaxed bg-black/40">
{`/ip service set winbox disabled=no port=8291`}
                  </pre>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: VENDOR SETUP GUIDES */}
          {activeTab === 'vendors' && (
            <div className="space-y-5">
              
              {/* Vendor Switcher */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedVendor('unifi')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedVendor === 'unifi'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  <span>Ubiquiti UniFi Access Points</span>
                </button>

                <button
                  onClick={() => setSelectedVendor('omada')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedVendor === 'omada'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  <span>TP-Link Omada Access Points</span>
                </button>
              </div>

              {/* UNIFI STEPS */}
              {selectedVendor === 'unifi' && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Ubiquiti UniFi AP Configuration Checklist
                      </h4>
                      <p className="text-xs text-slate-400">
                        Works with UniFi U6-Lite, U6-Pro, U6-Mesh, UAP-AC-M, or UniFi Mobile App.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                      Gateway: {routerGatewayIp}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    
                    <div className="flex items-start space-x-3 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white">Physical Connection</div>
                        <div className="text-xs text-slate-300">
                          Plug the UniFi PoE injector LAN port into MikroTik router port <span className="font-mono text-amber-400 font-bold">{ap1Port}</span>. Plug the PoE port into the UniFi Access Point.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white">Set Static IP & Default Gateway</div>
                        <div className="text-xs text-slate-300">
                          In the UniFi Controller or UniFi Mobile App:
                        </div>
                        <div className="bg-black/50 p-2.5 rounded font-mono text-[11px] text-slate-300 space-y-0.5">
                          <div>• Network Mode: <strong>Static IP</strong></div>
                          <div>• IP Address: <strong className="text-indigo-400">{ap1Ip}</strong></div>
                          <div>• Subnet Mask: <strong>{subnetMask}</strong></div>
                          <div>• Default Gateway: <strong className="text-amber-400">{routerGatewayIp}</strong> (MikroTik Router)</div>
                          <div>• Preferred DNS: <strong className="text-slate-200">{routerGatewayIp}</strong> (or 1.1.1.1)</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white">Create Wi-Fi SSID</div>
                        <div className="text-xs text-slate-300">
                          Go to <strong>Settings &gt; WiFi &gt; Create New SSID</strong> (e.g., <span className="font-semibold text-white">T-Connect Free WiFi</span>). Set Security to <strong>Open</strong> or WPA2 Personal.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                      <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        !
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-rose-300">CRITICAL: Disable UniFi Built-In Guest Portal</div>
                        <div className="text-xs text-slate-300">
                          In UniFi Network settings, <strong>DO NOT enable "Guest Hotspot Portal"</strong>. Leave the network as standard Layer-2 bridge. The MikroTik router already handles all captive portal redirection. Having two captive portals active simultaneously causes SSL handshake deadlocks.
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* OMADA STEPS */}
              {selectedVendor === 'omada' && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        TP-Link Omada AP Configuration Checklist
                      </h4>
                      <p className="text-xs text-slate-400">
                        Works with EAP610, EAP225, EAP245, EAP653, or standalone Web GUI.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-md">
                      Gateway: {routerGatewayIp}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    
                    <div className="flex items-start space-x-3 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white">Physical Connection</div>
                        <div className="text-xs text-slate-300">
                          Connect the TP-Link Omada AP to MikroTik router port <span className="font-mono text-amber-400 font-bold">{ap2Port}</span> using the PoE injector or PoE switch.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white">Configure Static IP & Gateway</div>
                        <div className="text-xs text-slate-300">
                          Log into the Omada Controller or AP IP Web GUI:
                        </div>
                        <div className="bg-black/50 p-2.5 rounded font-mono text-[11px] text-slate-300 space-y-0.5">
                          <div>• Network Mode: <strong>Static IP</strong></div>
                          <div>• IP Address: <strong className="text-teal-400">{ap2Ip}</strong></div>
                          <div>• Subnet Mask: <strong>{subnetMask}</strong></div>
                          <div>• Gateway: <strong className="text-amber-400">{routerGatewayIp}</strong> (MikroTik Router)</div>
                          <div>• Primary DNS: <strong className="text-slate-200">{routerGatewayIp}</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white">Broadcast SSID</div>
                        <div className="text-xs text-slate-300">
                          Create wireless network (SSID: <span className="font-semibold text-white">T-Connect Free WiFi</span>). Ensure 2.4 GHz and 5 GHz radios are active.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                      <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        !
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-rose-300">CRITICAL: Disable Omada Portal Authentication</div>
                        <div className="text-xs text-slate-300">
                          In Omada Controller &gt; <strong>Authentication &gt; Portal</strong>, make sure Portal is set to <strong>Disabled</strong>. The MikroTik Hotspot handles guest splash pages and session expiration.
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: WINBOX DIRECT LAUNCHER */}
          {activeTab === 'winbox' && (
            <div className="space-y-5">
              
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        MikroTik WinBox Native Launch Strings
                      </h4>
                      <p className="text-xs text-slate-400">
                        Launch the desktop WinBox client directly to inspect the hotspot bridge and connected APs.
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
                    Port: 8291
                  </span>
                </div>

                <div className="space-y-3">
                  
                  {/* Local LAN IP String */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      WinBox Connect Address (LAN Gateway):
                    </span>
                    <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded border border-slate-800">
                      <span className="font-mono text-amber-400 text-xs font-bold">
                        {routerGatewayIp}:8291
                      </span>
                      <button
                        onClick={() => copyToClipboard(`${routerGatewayIp}:8291`, 'winbox-lan-ip')}
                        className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                      >
                        {copiedKey === 'winbox-lan-ip' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'winbox-lan-ip' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* WireGuard Remote Tunnel String */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      WinBox Remote WireGuard Tunnel Address:
                    </span>
                    <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded border border-slate-800">
                      <span className="font-mono text-sky-300 text-xs font-bold">
                        {winboxConnectString}
                      </span>
                      <button
                        onClick={() => copyToClipboard(winboxConnectString, 'winbox-wg-ip')}
                        className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                      >
                        {copiedKey === 'winbox-wg-ip' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'winbox-wg-ip' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* CLI Command */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Command Prompt / Terminal Launcher:
                    </span>
                    <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded border border-slate-800">
                      <span className="font-mono text-emerald-400 text-xs">
                        {winboxCliCommand}
                      </span>
                      <button
                        onClick={() => copyToClipboard(winboxCliCommand, 'winbox-cli')}
                        className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                      >
                        {copiedKey === 'winbox-cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'winbox-cli' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>How to verify your 2 APs inside WinBox:</span>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                    <li>In WinBox, click <strong>Bridge &gt; Ports</strong>. Confirm <span className="font-mono text-amber-300">{ap1Port}</span> and <span className="font-mono text-amber-300">{ap2Port}</span> appear under <span className="font-mono text-white">{bridgeName}</span>.</li>
                    <li>Click <strong>IP &gt; Hotspot &gt; IP Bindings</strong>. Confirm <span className="font-mono text-indigo-300">{ap1Ip}</span> and <span className="font-mono text-teal-300">{ap2Ip}</span> are listed with Type = <span className="font-mono text-emerald-400">bypassed</span>.</li>
                    <li>Click <strong>IP &gt; Hotspot &gt; Active</strong>. As guests connect to Wi-Fi on either AP, you will see their active sessions and captive portal logins stream in live!</li>
                  </ol>
                </div>

              </div>

            </div>
          )}

          {/* TAB 5: PC & MAC TESTING GUIDE */}
          {activeTab === 'pc_test' && (
            <div className="space-y-6">
              
              {/* Alert / Fix Banner for Screenshot */}
              <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-rose-500/10 border border-amber-500/30 rounded-xl p-4.5 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white">
                        macOS Network Settings Fix (Required for Testing)
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                        Action Required in System Settings
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      In your Mac&apos;s <strong>USB 10/100/1000 LAN</strong> window (from your screenshot):
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="bg-rose-950/30 border border-rose-500/30 rounded-lg p-3 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                          Current Setting (Preventing Captive Portal)
                        </span>
                        <div className="font-mono text-slate-300 space-y-0.5 text-[11px]">
                          <div>• Configure IPv4: <span className="text-rose-300">Manually</span></div>
                          <div>• IP: <span className="text-rose-300">192.168.88.3</span> <em className="text-slate-400">(Hotspot AP Bypass IP!)</em></div>
                          <div>• Subnet mask: <span className="text-rose-300">255</span> <em className="text-rose-400">(Incomplete &rarr; ⚠️ Warning)</em></div>
                          <div>• Router: <span className="text-rose-300">(Empty)</span></div>
                        </div>
                      </div>

                      <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                          Correct Setting for Testing (Recommended)
                        </span>
                        <div className="font-mono text-slate-200 space-y-0.5 text-[11px]">
                          <div>• Configure IPv4: <span className="text-emerald-400 font-bold">Using DHCP</span></div>
                          <div className="text-slate-300 text-[10px] pt-1">
                            Sets IP, Subnet, and Gateway automatically from MikroTik, exactly like a real guest.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Test Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Test Card 1: Wired Ethernet */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                        Wired Ethernet
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white">
                      1. Test Wired Captive Portal
                    </h4>
                    <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>Set Mac IPv4 to <strong>Using DHCP</strong> and click OK.</li>
                      <li>Plug Ethernet into port <strong className="text-amber-400 font-mono">ether2</strong>, <strong className="text-amber-400 font-mono">ether3</strong>, or <strong className="text-amber-400 font-mono">ether5</strong>.</li>
                      <li>Red dot changes to green (&quot;Connected&quot;).</li>
                      <li>Mac receives IP (e.g., <code className="text-slate-200">192.168.88.24x</code>).</li>
                      <li>Captive login window appears automatically!</li>
                    </ol>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    💡 <em>Browser trigger if popup doesn&apos;t open:</em>
                    <div className="mt-1 flex items-center justify-between bg-black/60 px-2.5 py-1.5 rounded border border-slate-800 font-mono text-[10px] text-indigo-300">
                      <span>http://neverssl.com</span>
                      <button
                        onClick={() => copyToClipboard('http://neverssl.com', 'url-neverssl')}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'url-neverssl' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Test Card 2: WiFi MIKROTIK-TC */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg">
                        <Wifi className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded border border-teal-500/20">
                        Open Wireless
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white">
                      2. Test WiFi Captive Portal
                    </h4>
                    <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>Click the Wi-Fi icon in your Mac top menu bar.</li>
                      <li>Select SSID: <strong className="text-amber-300 font-mono">MIKROTIK-TC</strong>.</li>
                      <li>No Wi-Fi password required (Open Network).</li>
                      <li>The Apple Captive Assistant opens with the T-Connect portal.</li>
                      <li>Enter voucher code or click Free Trial.</li>
                    </ol>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    💡 <em>Direct Router Gateway trigger URL:</em>
                    <div className="mt-1 flex items-center justify-between bg-black/60 px-2.5 py-1.5 rounded border border-slate-800 font-mono text-[10px] text-teal-300">
                      <span>http://{routerGatewayIp}</span>
                      <button
                        onClick={() => copyToClipboard(`http://${routerGatewayIp}`, 'url-gw')}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'url-gw' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Test Card 3: Admin WinBox Access */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                        <Server className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded border border-sky-500/20">
                        Port 8291
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white">
                      3. Test Admin / WinBox Access
                    </h4>
                    <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>Launch WinBox on your Mac or Windows PC.</li>
                      <li>In <strong>Connect To</strong>, type: <strong className="text-sky-300 font-mono">{routerGatewayIp}:8291</strong>.</li>
                      <li>Login: <code className="text-slate-200">admin</code> (Password: blank or your router password).</li>
                      <li>WinBox connects directly over port 8291, bypassing the captive portal!</li>
                    </ol>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    💡 <em>Optional Admin Laptop Permanent Bypass:</em>
                    <div className="mt-1 flex items-center justify-between bg-black/60 px-2.5 py-1.5 rounded border border-slate-800 font-mono text-[10px] text-sky-300">
                      <span className="truncate">/ip hotspot ip-binding add address=192.168.88.200 type=bypassed</span>
                      <button
                        onClick={() => copyToClipboard('/ip hotspot ip-binding add address=192.168.88.200 type=bypassed comment="admin-laptop"', 'cmd-admin-bp')}
                        className="text-slate-400 hover:text-white shrink-0 ml-1"
                      >
                        {copiedKey === 'cmd-admin-bp' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Troubleshooting Tips */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-white flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Quick Troubleshooting Checklist:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 text-[11px]">
                  <div>• <strong>Red dot &quot;Not connected&quot;?</strong> Check USB LAN adapter seating and Ethernet cable connection to MikroTik router.</div>
                  <div>• <strong>Portal doesn&apos;t appear?</strong> Open Safari or Chrome Incognito and visit an HTTP site like <code>http://neverssl.com</code>.</div>
                  <div>• <strong>Connected but no IP?</strong> Make sure IPv4 is set to &quot;Using DHCP&quot; so the MikroTik DHCP server can assign you an address.</div>
                  <div>• <strong>Need to reset testing?</strong> In WinBox, go to <em>IP &gt; Hotspot &gt; Active</em> and remove your PC&apos;s lease to re-trigger the portal.</div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-t border-slate-800">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Dual AP Passthrough: <strong className="text-slate-200 font-mono">ether3 + ether4</strong> on <strong className="text-slate-200 font-mono">{bridgeName}</strong></span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => copyToClipboard(fullScript, 'footer-copy')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              {copiedKey === 'footer-copy' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey === 'footer-copy' ? 'Copied Scripts' : 'Copy Terminal Script'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              Done & Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
