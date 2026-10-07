import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Key, 
  Globe, 
  ShieldCheck, 
  Play, 
  Copy, 
  Check, 
  Lock, 
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Ticket
} from 'lucide-react';
import { GatewayConfig, GatewayProvider } from '../../types';
import { ProviderLogo } from '../common/BrandLogos';

interface GatewaysViewProps {
  gateways: GatewayConfig[];
  onTestConnection: (provider: GatewayProvider) => { success: boolean; latency?: number; message?: string };
  onRunSandboxPayment: (provider: GatewayProvider, amount?: number) => { success: boolean; message?: string; transactionRef?: string };
  onToggleLive: (provider: GatewayProvider, setLive: boolean) => { success: boolean; isLive?: boolean; message?: string };
  onUpdateCredentials: (provider: GatewayProvider, updates: Partial<GatewayConfig>) => void;
  currency: string;
}

export const GatewaysView: React.FC<GatewaysViewProps> = ({
  gateways,
  onTestConnection,
  onRunSandboxPayment,
  onToggleLive,
  onUpdateCredentials,
  currency,
}) => {
  const [selectedGateway, setSelectedGateway] = useState<GatewayConfig>(gateways[0]);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit fields for selected gateway
  const [apiKey, setApiKey] = useState(selectedGateway.apiKey || '');
  const [apiSecret, setApiSecret] = useState(selectedGateway.apiSecret || '');
  const [apiPassword, setApiPassword] = useState(selectedGateway.apiPassword || '');
  const [showPassword, setShowPassword] = useState(false);
  const [bearerToken, setBearerToken] = useState(selectedGateway.bearerToken || '');
  const [merchantId, setMerchantId] = useState(selectedGateway.merchantId || (selectedGateway.provider === 'ottvoucher' ? 'TCONNECTLES1' : ''));
  const [webhookSecret, setWebhookSecret] = useState(selectedGateway.webhookSecret || '');

  // OTT Voucher Generation & Quick Redemption Tester
  const [generatedTestPin, setGeneratedTestPin] = useState('8921-3482-9011');
  const [redeemTestResult, setRedeemTestResult] = useState<any>(null);
  const [isRedeemingTest, setIsRedeemingTest] = useState(false);

  const handleSelectGateway = (gw: GatewayConfig) => {
    setSelectedGateway(gw);
    setApiKey(gw.apiKey || '');
    setApiSecret(gw.apiSecret || '');
    setApiPassword(gw.apiPassword || '');
    setBearerToken(gw.bearerToken || '');
    setMerchantId(gw.merchantId || (gw.provider === 'ottvoucher' ? 'TCONNECTLES1' : ''));
    setWebhookSecret(gw.webhookSecret || '');
    setTestResult(null);
    setRedeemTestResult(null);
    setActiveStep(1);
  };

  const handleSaveCredentials = () => {
    onUpdateCredentials(selectedGateway.provider, {
      apiKey,
      apiSecret,
      apiPassword,
      username: merchantId,
      bearerToken,
      merchantId,
      webhookSecret
    });
    setTestResult({
      success: true,
      message: 'Credentials saved! Please run Step 2 (Test Connection) to verify API access.'
    });
    setActiveStep(2);
  };

  const handleRunPing = async () => {
    setIsProcessing(true);
    setTestResult(null);
    try {
      const response = await fetch(`/api/gateways/${selectedGateway.provider}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          apiPassword,
          username: merchantId,
          bearerToken,
          merchantId,
          isLive: selectedGateway.isLive
        })
      });
      const data = await response.json();
      setIsProcessing(false);
      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: `${data.message} (${data.latencyMs}ms latency)`
        });
        onUpdateCredentials(selectedGateway.provider, {
          status: 'operational',
          testPassedOnce: true,
          avgLatencyMs: data.latencyMs,
          lastTestAt: 'Just now',
          lastTestStatus: 'success',
          lastTestMessage: data.message
        });
        setActiveStep(3);
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Gateway rejected authentication.'
        });
        onUpdateCredentials(selectedGateway.provider, {
          status: 'degraded',
          lastTestAt: 'Just now',
          lastTestStatus: 'failed',
          lastTestMessage: data.message || 'Authentication error'
        });
      }
    } catch {
      setIsProcessing(false);
      setTestResult({
        success: false,
        message: 'Network communication failure connecting to gateway backend.'
      });
    }
  };

  const handleGenerateTestPin = () => {
    const p1 = Math.floor(Math.random() * 9000 + 1000);
    const p2 = Math.floor(Math.random() * 9000 + 1000);
    const p3 = Math.floor(Math.random() * 9000 + 1000);
    const newPin = `${p1}-${p2}-${p3}`;
    setGeneratedTestPin(newPin);
    setRedeemTestResult(null);
  };

  const handleTestRedeemPin = async () => {
    setIsRedeemingTest(true);
    setRedeemTestResult(null);
    try {
      const res = await fetch('/api/gateways/ottvoucher/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ottPin: generatedTestPin,
          amount: 10,
          planName: 'Day Pass (Standard)',
          currency: 'M',
          mac: 'D4:01:C3:88:99:AA'
        })
      });
      const data = await res.json();
      setRedeemTestResult(data);
    } catch (err: any) {
      setRedeemTestResult({ success: false, message: err?.message || 'Failed to test redemption' });
    } finally {
      setIsRedeemingTest(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(selectedGateway.webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleRunSandboxPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const res = onRunSandboxPayment(selectedGateway.provider, 10);
      setIsProcessing(false);
      setTestResult({
        success: res.success,
        message: res.message || 'Sandbox test payment completed and verified.'
      });
      if (res.success) {
        setActiveStep(5);
      }
    }, 800);
  };

  const handleToggleLiveStatus = (setLive: boolean) => {
    const res = onToggleLive(selectedGateway.provider, setLive);
    if (!res.success) {
      setTestResult({
        success: false,
        message: res.message || 'Failed to toggle live status.'
      });
    } else {
      setTestResult({
        success: true,
        message: `Gateway is now ${setLive ? 'LIVE' : 'in SANDBOX mode'}!`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Payment Gateway Hub (Lesotho FinTech)</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Pluggable provider architecture with self-verifying setup wizards, test pings, and sandbox certification
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>4 Adapter Plugins Active</span>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {gateways.map((gw) => {
          const isSelected = selectedGateway.provider === gw.provider;
          return (
            <div
              key={gw.provider}
              onClick={() => handleSelectGateway(gw)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors text-left flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#1b233a] border-[#f05e17] shadow-md'
                  : 'bg-[#0f1422] border-[#232d42] hover:border-slate-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#161d31] p-1.5 border border-[#232d42] flex items-center justify-center">
                    <ProviderLogo provider={gw.provider} className="w-full h-full" />
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    gw.isLive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {gw.isLive ? 'LIVE' : 'SANDBOX'}
                  </span>
                </div>

                <h3 className="text-sm font-extrabold text-white">{gw.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{gw.subtitle}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1f283d] flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Success: <strong className="text-emerald-400">{gw.successRate24h}%</strong></span>
                <span>Latency: <strong className="text-slate-200">{gw.avgLatencyMs}ms</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guided 5-Step Gateway Setup Wizard */}
      <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#232d42] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#161d31] p-1.5 border border-[#232d42] flex items-center justify-center">
              <ProviderLogo provider={selectedGateway.provider} className="w-full h-full" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {selectedGateway.name} Guided Setup Wizard
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Operator credentials, webhook signing, and sandbox qualification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleLiveStatus(!selectedGateway.isLive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                selectedGateway.isLive
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              {selectedGateway.isLive ? 'Switch to Sandbox' : 'Mark Live Production'}
            </button>
          </div>
        </div>

        {/* Wizard Steps Indicator */}
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
          {[
            { num: 1, title: 'Credentials' },
            { num: 2, title: 'Test Ping' },
            { num: 3, title: 'Webhook URL' },
            { num: 4, title: 'Sandbox Payment' },
            { num: 5, title: 'Live Verification' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(s.num)}
              className={`p-2 rounded-lg border transition-colors ${
                activeStep === s.num
                  ? 'bg-[#1b233a] border-[#f05e17] text-white font-bold'
                  : s.num < activeStep
                  ? 'bg-[#161d31] border-emerald-500/30 text-emerald-400'
                  : 'bg-[#161d31] border-[#232d42] text-slate-500'
              }`}
            >
              <div className="text-[10px] text-slate-400">Step {s.num}</div>
              <div className="truncate">{s.title}</div>
            </button>
          ))}
        </div>

        {/* Wizard Step Content */}
        <div className="bg-[#0a0e17] rounded-xl border border-[#1b233a] p-5 space-y-4">
          {activeStep === 1 && (
            <div className="space-y-4 text-xs font-mono">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-[#f05e17]" /> Step 1: Merchant Credentials
              </h3>
              <p className="text-slate-400">
                Enter your merchant credentials provided by {selectedGateway.name}. Secrets are stored with AES-256-GCM encryption at rest.
              </p>

              {selectedGateway.provider === 'ottvoucher' ? (
                /* Specialized OTT Voucher Lesotho Credentials Form */
                <div className="space-y-4 bg-[#121829] p-4 rounded-xl border border-[#1f283d]">
                  {/* Verified Partner Username Banner */}
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-300 font-bold">API USERNAME:</span>
                      <code className="bg-black/60 px-2.5 py-0.5 rounded text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                        {merchantId || 'TCONNECTLES1'}
                      </code>
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">portal.ottlesotho.com</span>
                    </div>

                    <a
                      href="https://portal.ottlesotho.com/APISettings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-mono font-bold"
                    >
                      <span>Open OTT Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* API KEY Input Field */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-[#f05e17]" />
                        <span>API KEY</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Click &quot;Get New Key&quot; in OTT portal &amp; paste here
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="e.g. 90e12465-9fb3-46dc-8496-232f17b11140"
                        className="flex-1 px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#f05e17]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) setApiKey(text.trim());
                          } catch {}
                        }}
                        className="px-3 py-2 bg-[#1b233a] hover:bg-[#25304e] border border-[#232d42] text-slate-300 hover:text-white rounded-lg text-xs"
                      >
                        Paste
                      </button>
                    </div>
                  </div>

                  {/* API PASSWORD Input Field with Visibility Toggle */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#f05e17]" />
                        <span>API PASSWORD</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Click &quot;Get New Password&quot; in OTT portal &amp; paste here
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={apiPassword}
                        onChange={(e) => setApiPassword(e.target.value)}
                        placeholder="e.g. G6vLr=0c9="
                        className="w-full px-3 py-2 pr-10 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#f05e17]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Save Credentials Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleSaveCredentials}
                      className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Credentials &amp; Continue to Connection Test &rarr;</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Credentials Fields for other gateways */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 block mb-1">API Key / Client ID</label>
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="e.g. eco_live_key_9941..."
                        className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Merchant Shortcode / ID</label>
                      <input
                        type="text"
                        value={merchantId}
                        onChange={(e) => setMerchantId(e.target.value)}
                        placeholder="e.g. 10492 or TEL-ECO-01"
                        className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">
                      Bearer Token <span className="text-slate-500 font-normal">(Cassava / EcoCash / Vodacom OAuth Access Token)</span>
                    </label>
                    <input
                      type="password"
                      value={bearerToken}
                      onChange={(e) => setBearerToken(e.target.value)}
                      placeholder="Paste your live bearer token here (e.g. eyJhbGciOi...)"
                      className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono text-[11px] focus:outline-none focus:border-[#f05e17]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 block mb-1">API Secret Key (Optional)</label>
                      <input
                        type="password"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="e.g. sec_90x21..."
                        className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Webhook HMAC Signing Secret</label>
                      <input
                        type="text"
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder="e.g. whsec_tconnect_..."
                        className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveCredentials}
                    className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm"
                  >
                    Save &amp; Continue to Connection Test &rarr;
                  </button>
                </>
              )}
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4 text-xs font-mono">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" /> Step 2: Test API Connection
              </h3>
              <p className="text-slate-400">
                Sends an authenticated ping request to {selectedGateway.name}&apos;s gateway endpoint to verify your API credentials and measure round-trip latency.
              </p>
              <button
                onClick={handleRunPing}
                disabled={isProcessing}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm flex items-center gap-2"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isProcessing ? 'Pinging Gateway...' : 'Test Connection Now'}</span>
              </button>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4 text-xs font-mono">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Step 3: Webhook Endpoint Configuration
              </h3>
              <p className="text-slate-400">
                Copy this URL and paste it into your {selectedGateway.name} Merchant Portal dashboard under <strong>Instant Payment Notifications (IPN)</strong> or <strong>Webhooks</strong>. Incoming webhooks are verified with HMAC-SHA256 signatures and processed idempotently.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={selectedGateway.webhookUrl}
                  className="flex-1 px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-emerald-400 select-all font-mono"
                />
                <button
                  onClick={handleCopyWebhook}
                  className="px-3 py-2 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-white rounded-lg flex items-center gap-1.5"
                >
                  {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWebhook ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
              <button
                onClick={() => setActiveStep(4)}
                className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm"
              >
                Continue to Sandbox Test Payment &rarr;
              </button>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-4 text-xs font-mono">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" /> Step 4: Sandbox Test Payment &amp; Voucher Redemption
              </h3>

              {selectedGateway.provider === 'ottvoucher' ? (
                /* Specialized Voucher PIN Generator & Live Redemption Engine */
                <div className="space-y-4">
                  <p className="text-slate-300">
                    Hotspot guests purchase 12-digit OTT Voucher PINs at retail stores (Shoprite, Pick n Pay, spaza shops) or online, and enter them on your captive portal. You can generate and test redeem PINs directly below:
                  </p>

                  <div className="p-4 bg-[#121829] rounded-xl border border-blue-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Ticket className="w-4 h-4 text-blue-400" />
                        <span>12-Digit Voucher PIN Generator</span>
                      </span>

                      <button
                        type="button"
                        onClick={handleGenerateTestPin}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate New PIN</span>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={generatedTestPin}
                          onChange={(e) => setGeneratedTestPin(e.target.value)}
                          className="w-full px-3 py-2 bg-black/60 border border-blue-400/40 rounded-lg text-emerald-400 font-mono text-base tracking-widest font-extrabold text-center sm:text-left"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleTestRedeemPin}
                        disabled={isRedeemingTest}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs font-mono rounded-lg shadow-sm flex items-center justify-center gap-2"
                      >
                        {isRedeemingTest ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Redeeming PIN...</span>
                          </>
                        ) : (
                          <span>Test Redeem on Platform &rarr;</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Test Redemption Feedback Box */}
                  {redeemTestResult && (
                    <div className={`p-4 rounded-xl border space-y-2 ${
                      redeemTestResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    }`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {redeemTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                        <span>{redeemTestResult.message}</span>
                      </div>

                      {redeemTestResult.transactionRef && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-2 border-t border-white/10 text-slate-300">
                          <div>Ref: <strong className="text-white">{redeemTestResult.transactionRef}</strong></div>
                          <div>Voucher Issued: <strong className="text-emerald-400">{redeemTestResult.voucherCode}</strong></div>
                          <div>Merchant: <strong className="text-cyan-400">{redeemTestResult.merchant}</strong></div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => setActiveStep(5)}
                      className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm"
                    >
                      Proceed to Final Live Certification &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Telecom Sandbox Payment Simulation */
                <>
                  <p className="text-slate-400">
                    Before marking the gateway &quot;Live&quot;, our system requires a successful sandbox test payment to ensure STK push, callback signature validation, and voucher issuance function properly.
                  </p>
                  <button
                    onClick={handleRunSandboxPayment}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm flex items-center gap-2"
                  >
                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isProcessing ? 'Executing Test Transaction...' : `Simulate ${currency}10.00 Test Payment`}</span>
                  </button>
                </>
              )}
            </div>
          )}

          {activeStep === 5 && (
            <div className="space-y-4 text-xs font-mono">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Step 5: Gateway Certified &amp; Ready for Production
              </h3>
              <p className="text-slate-300">
                All verification steps have passed. You can now toggle this payment provider to <strong>LIVE PRODUCTION</strong> to accept real money from subscribers across all hotspot locations.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleToggleLiveStatus(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Activate Live Production Mode</span>
                </button>
                <button
                  onClick={() => handleToggleLiveStatus(false)}
                  className="px-4 py-2.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg"
                >
                  Keep in Sandbox
                </button>
              </div>
            </div>
          )}

          {/* Test Status Banner */}
          {testResult && (
            <div className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs font-mono ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">
                {testResult.message}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
