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
  Ticket,
  Trash2
} from 'lucide-react';
import { GatewayConfig, GatewayProvider } from '../../types';
import { ProviderLogo } from '../common/BrandLogos';
import { copyToClipboard } from '../../utils/clipboard';

interface GatewaysViewProps {
  gateways: GatewayConfig[];
  onTestConnection: (provider: GatewayProvider) => { success: boolean; latency?: number; message?: string };
  onRunSandboxPayment: (provider: GatewayProvider, amount?: number) => { success: boolean; message?: string; transactionRef?: string };
  onToggleLive: (provider: GatewayProvider, setLive: boolean) => { success: boolean; isLive?: boolean; message?: string };
  onUpdateCredentials: (provider: GatewayProvider, updates: Partial<GatewayConfig>) => void;
  onRemoveGateway?: (provider: GatewayProvider) => void;
  isSuperAdmin?: boolean;
  currency: string;
}

export const GatewaysView: React.FC<GatewaysViewProps> = ({
  gateways,
  onTestConnection,
  onRunSandboxPayment,
  onToggleLive,
  onUpdateCredentials,
  onRemoveGateway,
  isSuperAdmin = true,
  currency,
}) => {
  const [selectedGateway, setSelectedGateway] = useState<GatewayConfig | undefined>(gateways[0]);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    outboundIp?: string;
    diagnosticStages?: Array<{ stage: string; endpoint: string; status: number; detail: string; passed: boolean }>;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Keep selectedGateway in sync when gateways array updates
  React.useEffect(() => {
    if (gateways.length > 0) {
      if (!selectedGateway || !gateways.some(g => g.provider === selectedGateway.provider)) {
        handleSelectGateway(gateways[0]);
      }
    } else {
      setSelectedGateway(undefined);
    }
  }, [gateways]);

  // Edit fields for selected gateway
  const [apiKey, setApiKey] = useState(selectedGateway?.apiKey || '');
  const [apiSecret, setApiSecret] = useState(selectedGateway?.apiSecret || '');
  const [apiPassword, setApiPassword] = useState(selectedGateway?.apiPassword || '');
  const [showPassword, setShowPassword] = useState(false);
  const [bearerToken, setBearerToken] = useState(selectedGateway?.bearerToken || '');
  const [merchantId, setMerchantId] = useState(selectedGateway?.merchantId || (selectedGateway?.provider === 'ottvoucher' ? 'TCONNECTLES1' : ''));
  const [vendorId, setVendorId] = useState(selectedGateway?.vendorId || '11, 1, TCONNECTLES1');
  const [endpointUrl, setEndpointUrl] = useState(
    selectedGateway?.endpointUrl && !selectedGateway.endpointUrl.includes('portal.ottlesotho.com')
      ? selectedGateway.endpointUrl
      : 'https://api.ottlesotho.com'
  );
  const [webhookSecret, setWebhookSecret] = useState(selectedGateway?.webhookSecret || '');

  // OTT Voucher Quick Redemption Tester (16-Digit PINs + Mobile for OTT Vault SMS)
  const [generatedTestPin, setGeneratedTestPin] = useState('');
  const [testMobile, setTestMobile] = useState('26658000000');
  const [redeemTestResult, setRedeemTestResult] = useState<any>(null);
  const [isRedeemingTest, setIsRedeemingTest] = useState(false);

  // Pull authoritative gateway credentials from server on mount
  React.useEffect(() => {
    fetch('/api/gateways')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.gateways)) {
          const srvOtt = data.gateways.find((g: any) => g.provider === 'ottvoucher');
          if (srvOtt) {
            onUpdateCredentials('ottvoucher', {
              apiKey: srvOtt.apiKey,
              apiPassword: srvOtt.apiPassword,
              username: srvOtt.username || srvOtt.merchantId || 'TCONNECTLES1',
              merchantId: srvOtt.merchantId || srvOtt.username || 'TCONNECTLES1',
              vendorId: srvOtt.vendorId || '1, 11',
              endpointUrl: srvOtt.endpointUrl || 'https://api.ottlesotho.com',
              status: 'operational',
              isLive: true
            });
            if (selectedGateway?.provider === 'ottvoucher') {
              if (srvOtt.apiKey) setApiKey(srvOtt.apiKey);
              if (srvOtt.apiPassword) setApiPassword(srvOtt.apiPassword);
              if (srvOtt.merchantId || srvOtt.username) setMerchantId(srvOtt.merchantId || srvOtt.username);
              if (srvOtt.vendorId) setVendorId(srvOtt.vendorId);
              if (srvOtt.endpointUrl) setEndpointUrl(srvOtt.endpointUrl);
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectGateway = (gw: GatewayConfig) => {
    setSelectedGateway(gw);
    setApiKey(gw.apiKey || '');
    setApiSecret(gw.apiSecret || '');
    setApiPassword(gw.apiPassword || '');
    setBearerToken(gw.bearerToken || '');
    setMerchantId(gw.merchantId || (gw.provider === 'ottvoucher' ? 'TCONNECTLES1' : ''));
    setVendorId(gw.vendorId || '1, 11');
    setEndpointUrl(
      gw.endpointUrl && !gw.endpointUrl.includes('portal.ottlesotho.com')
        ? gw.endpointUrl
        : 'https://api.ottlesotho.com'
    );
    setWebhookSecret(gw.webhookSecret || '');
    setTestResult(null);
    setRedeemTestResult(null);
    setActiveStep(1);
  };

  const handleConfirmRemoveGateway = () => {
    if (!selectedGateway || !onRemoveGateway) return;
    const providerToRemove = selectedGateway.provider;
    setShowRemoveConfirm(false);
    onRemoveGateway(providerToRemove);
  };

  const handleSaveCredentials = async () => {
    if (!selectedGateway) return;
    const cleanKey = apiKey.trim();
    const cleanPass = apiPassword.trim();
    const cleanUser = (merchantId || 'TCONNECTLES1').trim();
    const cleanVendor = (vendorId || '1, 11').trim();
    const cleanEndpoint = (endpointUrl || 'https://api.ottlesotho.com').trim();

    onUpdateCredentials(selectedGateway.provider, {
      apiKey: cleanKey,
      apiSecret: apiSecret.trim(),
      apiPassword: cleanPass,
      username: cleanUser,
      vendorId: cleanVendor,
      endpointUrl: cleanEndpoint,
      bearerToken: bearerToken.trim(),
      merchantId: cleanUser,
      webhookSecret: webhookSecret.trim(),
      isLive: true,
      status: 'operational'
    });

    if (selectedGateway.provider === 'ottvoucher') {
      setIsProcessing(true);
      try {
        await fetch('/api/gateways/ottvoucher/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: cleanKey,
            apiPassword: cleanPass,
            username: cleanUser,
            merchantId: cleanUser,
            vendorId: cleanVendor,
            endpointUrl: cleanEndpoint,
            isLive: true
          })
        });
        const testRes = await fetch('/api/gateways/ottvoucher/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: cleanKey,
            apiPassword: cleanPass,
            username: cleanUser,
            merchantId: cleanUser,
            vendorId: cleanVendor,
            endpointUrl: cleanEndpoint,
            isLive: true
          })
        });
        const testData = await testRes.json();
        setIsProcessing(false);
        setTestResult({
          success: Boolean(testData.success),
          message: testData.message || 'Credentials saved to persistent storage.',
          outboundIp: testData.outboundIp,
          diagnosticStages: testData.diagnosticStages
        });
        if (testData.success) {
          setActiveStep(4);
        }
        return;
      } catch {
        setIsProcessing(false);
      }
    }

    setTestResult({
      success: true,
      message: 'Credentials saved! Please run Step 2 (Test Connection) to verify API access.'
    });
    setActiveStep(2);
  };

  const handleRunPing = async () => {
    if (!selectedGateway) return;
    setIsProcessing(true);
    setTestResult(null);
    try {
      const response = await fetch(`/api/gateways/${selectedGateway.provider}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          apiPassword: apiPassword.trim(),
          username: (merchantId || 'TCONNECTLES1').trim(),
          vendorId: (vendorId || '11, 1, TCONNECTLES1').trim(),
          endpointUrl: (endpointUrl || 'https://api.ottlesotho.com').trim(),
          bearerToken: bearerToken.trim(),
          merchantId: (merchantId || 'TCONNECTLES1').trim(),
          isLive: selectedGateway.isLive
        })
      });
      const data = await response.json();
      setIsProcessing(false);
      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: `${data.message} (${data.latencyMs}ms latency)`,
          outboundIp: data.outboundIp,
          diagnosticStages: data.diagnosticStages
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
          message: data.message || 'Gateway rejected authentication.',
          outboundIp: data.outboundIp,
          diagnosticStages: data.diagnosticStages
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

  const handleTestRedeemPin = async () => {
    const cleanPin = generatedTestPin.replace(/\D/g, '');
    if (cleanPin.length !== 16) {
      setRedeemTestResult({
        success: false,
        message: `OTT Voucher PIN must be exactly 16 numeric digits (${cleanPin.length}/16 digits entered).`
      });
      return;
    }

    setIsRedeemingTest(true);
    setRedeemTestResult(null);
    try {
      const res = await fetch('/api/gateways/ottvoucher/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ottPin: cleanPin,
          amount: 10,
          planName: 'Daily Pass',
          currency: 'M',
          mac: 'D4:01:C3:88:99:AA',
          apiKey: apiKey.trim(),
          apiPassword: apiPassword.trim(),
          username: (merchantId || 'TCONNECTLES1').trim(),
          vendorId: (vendorId || '11, 1, TCONNECTLES1').trim(),
          endpointUrl: (endpointUrl || 'https://api.ottlesotho.com').trim()
        })
      });
      const data = await res.json();
      setRedeemTestResult(data);
    } catch (err: any) {
      setRedeemTestResult({ success: false, message: err?.message || 'Failed to verify 16-digit OTT Voucher redemption.' });
    } finally {
      setIsRedeemingTest(false);
    }
  };

  const handleCopyWebhook = () => {
    if (!selectedGateway) return;
    void copyToClipboard(selectedGateway.webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleRunSandboxPayment = () => {
    if (!selectedGateway) return;
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
    if (!selectedGateway) return;
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

  const [isSyncingFleet, setIsSyncingFleet] = useState(false);

  const handleSyncAllRoutersFromGateway = async () => {
    setIsSyncingFleet(true);
    try {
      const res = await fetch('/api/devices/fleet/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Real-time fleet sync dispatched to ${data.syncedCount} adopted router(s)! All 5 downstream ports bridged to bridgeLocal, OTT Lesotho 16-digit voucher redemption enabled, and splash/ad pages pushed.`
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Failed to sync adopted routers.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Network error syncing adopted routers.'
      });
    } finally {
      setIsSyncingFleet(false);
    }
  };

  const supportedGateways = gateways.filter((g) => g.provider === 'ecocash' || g.provider === 'ottvoucher');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Payment Gateway Hub (EcoCash &amp; OTT Voucher)</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Direct OTT Lesotho API (api.ottlesotho.com) 16-Digit Redemption &amp; EcoCash Lesotho USSD Push
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-400">
          <button
            type="button"
            onClick={handleSyncAllRoutersFromGateway}
            disabled={isSyncingFleet}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Push OTT Lesotho (HTTP 201 verified), 5-port bridgeLocal, compact T&Cs splash page, and full-screen ads to ALL adopted routers in real time"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingFleet ? 'animate-spin' : ''}`} />
            <span>{isSyncingFleet ? 'Syncing Routers...' : 'Sync OTT & 5-Port Bridge to All Routers'}</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{supportedGateways.length} Active Gateways</span>
          </div>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {supportedGateways.map((gw) => {
          const isSelected = selectedGateway?.provider === gw.provider;
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
                  <div className="w-28 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
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
      {selectedGateway ? (
      <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#232d42] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-28 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
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
            {isSuperAdmin && onRemoveGateway && (
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Remove Gateway</span>
              </button>
            )}
            <button
              onClick={() => handleToggleLiveStatus(!selectedGateway.isLive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
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
                /* Specialized 5-Field OTT Voucher Lesotho Credentials Form (api.ottlesotho.com) */
                <div className="space-y-4 bg-[#121829] p-4 rounded-xl border border-[#1f283d]">
                  {/* Verified Partner Header Banner */}
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-300 font-bold">OTT LESOTHO API:</span>
                      <code className="bg-black/60 px-2.5 py-0.5 rounded text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                        {endpointUrl || 'https://api.ottlesotho.com'}
                      </code>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Basic Auth + SHA-256 Hash + Vendor ID ({vendorId || '1, 11'})
                      </span>
                    </div>

                    <a
                      href="https://portal.ottlesotho.com/APISettings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-mono font-bold shrink-0"
                    >
                      <span>Open OTT Portal (API Settings)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {(apiKey.trim() === '4323e6fa-09b2-4eaa-9b73-f275dad58787' || apiPassword.trim() === '3*68pF&24*') && (
                    <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong className="text-amber-300">Action Required Once:</strong> You generated a new API Key or Password in <code className="text-white">portal.ottlesotho.com/APISettings</code> today. Paste your new <strong>4. API KEY</strong> and <strong>5. API PASSWORD</strong> below and click <strong>Save Credentials</strong>. Your credentials and redeemed PINs are now stored in a persistent volume and protected from browser/Docker overwrites forever.
                      </div>
                    </div>
                  )}

                  {/* Row 1: API Base URL, API Username, and Vendor ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-300 font-bold">1. API BASE URL</label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setEndpointUrl('https://api.ottlesotho.com')}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                          >
                            Prod
                          </button>
                          <button
                            type="button"
                            onClick={() => setEndpointUrl('https://test-api.ottlesotho.com')}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                          >
                            Test
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={endpointUrl}
                        onChange={(e) => setEndpointUrl(e.target.value)}
                        placeholder="https://api.ottlesotho.com"
                        className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#f05e17]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-300 font-bold">2. API USERNAME</label>
                        <span className="text-[10px] text-slate-400">Basic Auth User</span>
                      </div>
                      <input
                        type="text"
                        value={merchantId}
                        onChange={(e) => setMerchantId(e.target.value)}
                        placeholder="TCONNECTLES1"
                        className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-emerald-300 font-mono font-bold text-xs focus:outline-none focus:border-[#f05e17]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-slate-300 font-bold">3. VENDOR ID</label>
                        <span className="text-[10px] text-emerald-400">Auto-tries 11, 1 &amp; TCONNECTLES1</span>
                      </div>
                      <input
                        type="text"
                        value={vendorId}
                        onChange={(e) => setVendorId(e.target.value)}
                        placeholder="11, 1, TCONNECTLES1"
                        className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#f05e17]"
                      />
                    </div>
                  </div>

                  {/* Field 4: API KEY Input Field */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-[#f05e17]" />
                        <span>4. API KEY (Request Signing Key)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Click &quot;New APIKey&quot; in OTT API Settings &amp; paste here
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

                  {/* Field 5: API PASSWORD Input Field with Visibility Toggle & Paste */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-300 font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#f05e17]" />
                        <span>5. API PASSWORD (Basic Auth Password)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Click &quot;Get a Password&quot; in OTT API Settings &amp; paste here
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={apiPassword}
                          onChange={(e) => setApiPassword(e.target.value)}
                          placeholder="e.g. G6vLr=0c9- or IjL3w0q7K0"
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
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) setApiPassword(text.trim());
                          } catch {}
                        }}
                        className="px-3 py-2 bg-[#1b233a] hover:bg-[#25304e] border border-[#232d42] text-slate-300 hover:text-white rounded-lg text-xs"
                      >
                        Paste
                      </button>
                    </div>
                  </div>

                  {/* Save Credentials Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleSaveCredentials}
                      className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
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
                /* Strict 16-Digit OTT Voucher Redemption Tester (Redemption-Only Platform) */
                <div className="space-y-4">
                  <p className="text-slate-300">
                    This platform strictly <strong>redeems</strong> 16-digit OTT Vouchers generated by an official OTT Voucher platform or retail terminal. Enter a 16-digit OTT Voucher PIN below to test live redemption and verification:
                  </p>

                  <div className="p-4 bg-[#121829] rounded-xl border border-blue-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Ticket className="w-4 h-4 text-blue-400" />
                        <span>16-Digit (4x4) OTT Voucher Redemption Verifier</span>
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold tabular-nums">
                        {generatedTestPin.replace(/\D/g, '').length} / 16 digits
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">16-Digit OTT Voucher PIN (No SMS / Mobile Required)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={19}
                        value={generatedTestPin}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = digits.match(/.{1,4}/g)?.join(' ') || '';
                          setGeneratedTestPin(formatted);
                        }}
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-3 py-2.5 bg-black/60 border border-blue-400/40 rounded-lg text-emerald-400 font-mono text-base tracking-widest font-extrabold text-center sm:text-left tabular-nums"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleTestRedeemPin}
                      disabled={isRedeemingTest || generatedTestPin.replace(/\D/g, '').length !== 16}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs font-mono rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      {isRedeemingTest ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Redeeming with OTT Lesotho API (Vendor ID {vendorId || '11, 1, TCONNECTLES1'})...</span>
                        </>
                      ) : (
                        <span>Verify &amp; Redeem 16-Digit PIN via OTT Lesotho API &rarr;</span>
                      )}
                    </button>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Verifies and redeems the 16-digit PIN directly against <code className="text-cyan-300">{endpointUrl || 'https://api.ottlesotho.com'}/api/v1/RemitVoucher</code> using Basic Auth (<code className="text-emerald-300">{merchantId || 'TCONNECTLES1'}</code>), SHA-256 request signing (<code className="text-emerald-300">API Key</code>), and Vendor ID (<code className="text-emerald-300">{vendorId || '11, 1, TCONNECTLES1'}</code>) with no SMS or mobile number required.
                    </p>
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

                      {Array.isArray(redeemTestResult.diagnosticStages) && redeemTestResult.diagnosticStages.length > 0 && (
                        <div className="pt-2 border-t border-white/10 space-y-1.5 text-[11px] font-mono">
                          <div className="text-slate-300 font-bold flex items-center justify-between">
                            <span>3-Stage OTT Lesotho Upstream Auth Breakdown</span>
                            {redeemTestResult.outboundIp && (
                              <span className="text-cyan-300">Server Outbound IP: {redeemTestResult.outboundIp}</span>
                            )}
                          </div>
                          {redeemTestResult.diagnosticStages.map((st: any, idx: number) => (
                            <div key={idx} className="p-2 rounded bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="text-white font-bold">{st.stage}</span>
                              <span className={st.passed ? 'text-emerald-400' : 'text-amber-300'}>{st.detail}</span>
                            </div>
                          ))}
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
                /* Telecom Sandbox Payment Simulation or Production Bypass */
                <div className="space-y-3">
                  <p className="text-slate-400">
                    If your provider issued production merchant credentials directly (no sandbox required, e.g. OTTvoucher), you can proceed directly to Live Production.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={handleRunSandboxPayment}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                      <span>{isProcessing ? 'Executing Test Transaction...' : `Simulate ${currency}10.00 Test Payment`}</span>
                    </button>
                    <button
                      onClick={() => {
                        onUpdateCredentials(selectedGateway.provider, { testPassedOnce: true });
                        setActiveStep(5);
                      }}
                      className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <span>Bypass Sandbox &amp; Mark Production Ready &rarr;</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeStep === 5 && (
            <div className="space-y-4 text-xs font-mono">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Step 5: Gateway Certified &amp; Ready for Production
              </h3>
              <p className="text-slate-300">
                You can now toggle <strong>{selectedGateway.name}</strong> to <strong>LIVE PRODUCTION</strong> to accept real money from subscribers across all hotspot locations.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleToggleLiveStatus(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Activate Live Production Mode</span>
                </button>
                <button
                  onClick={() => handleToggleLiveStatus(false)}
                  className="px-4 py-2.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg cursor-pointer"
                >
                  Keep in Sandbox / Test Mode
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
              <div className="leading-relaxed flex-1 space-y-2">
                <div>{testResult.message}</div>
                {Array.isArray(testResult.diagnosticStages) && testResult.diagnosticStages.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1 text-[11px]">
                    <div className="text-slate-300 font-bold flex items-center justify-between">
                      <span>OTT Lesotho 3-Stage Upstream Verification</span>
                      {testResult.outboundIp && (
                        <span className="text-cyan-300">Server Outbound IP: {testResult.outboundIp}</span>
                      )}
                    </div>
                    {testResult.diagnosticStages.map((st, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-white font-bold">{st.stage}</span>
                        <span className={st.passed ? 'text-emerald-400' : 'text-amber-300'}>{st.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      ) : (
        <div className="p-8 text-center bg-[#0f1422] rounded-xl border border-[#232d42] text-slate-400 font-mono text-xs">
          No payment gateways available.
        </div>
      )}

      {/* Remove Gateway Confirmation Modal */}
      {showRemoveConfirm && selectedGateway && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />
              <span>Remove Payment Gateway</span>
            </div>

            <p className="text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{selectedGateway.name}</strong> from active gateway configurations?
            </p>
            <div className="p-3 rounded-xl bg-[#161d31] border border-[#232d42] text-slate-400 text-[11px] space-y-1">
              <div>• Non-super admin roles (Collaborators, Management) will not see this gateway.</div>
              <div>• Captive portal checkouts will no longer offer {selectedGateway.name}.</div>
              <div>• All credentials and webhook signing keys for this adapter will be cleared.</div>
            </div>

            <div className="pt-3 border-t border-[#232d42] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveGateway}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm &amp; Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
