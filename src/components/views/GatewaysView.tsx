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
  AlertTriangle 
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
  const [apiKey, setApiKey] = useState(selectedGateway.apiKey);
  const [merchantId, setMerchantId] = useState(selectedGateway.merchantId);
  const [webhookSecret, setWebhookSecret] = useState(selectedGateway.webhookSecret);

  const handleSelectGateway = (gw: GatewayConfig) => {
    setSelectedGateway(gw);
    setApiKey(gw.apiKey);
    setMerchantId(gw.merchantId);
    setWebhookSecret(gw.webhookSecret);
    setTestResult(null);
    setActiveStep(1);
  };

  const handleSaveCredentials = () => {
    onUpdateCredentials(selectedGateway.provider, {
      apiKey,
      merchantId,
      webhookSecret
    });
    setTestResult({
      success: true,
      message: 'Credentials saved! Please run Step 2 (Test Connection) to verify API access.'
    });
    setActiveStep(2);
  };

  const handleRunPing = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const res = onTestConnection(selectedGateway.provider);
      setIsProcessing(false);
      setTestResult({
        success: res.success,
        message: res.message || 'Connection verified successfully.'
      });
      if (res.success) {
        setActiveStep(3);
      }
    }, 600);
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">API Key / Client ID</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Merchant Shortcode / ID</label>
                  <input
                    type="text"
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Webhook HMAC Signing Secret</label>
                <input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>
              <button
                onClick={handleSaveCredentials}
                className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm"
              >
                Save &amp; Continue to Connection Test &rarr;
              </button>
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
                <CreditCard className="w-4 h-4 text-purple-400" /> Step 4: Sandbox Test Payment (Simulate M10 Transaction)
              </h3>
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
