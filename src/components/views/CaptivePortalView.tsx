import React, { useState } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Wifi, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  CreditCard, 
  ExternalLink,
  RefreshCw,
  Ticket
} from 'lucide-react';
import { HotspotPlan, GatewayProvider, VerticalType } from '../../types';
import { ProviderLogo } from '../common/BrandLogos';
import { WALLED_GARDEN_DOMAINS } from '../../services/storage';

interface CaptivePortalViewProps {
  plans: HotspotPlan[];
  onProcessPayment: (provider: GatewayProvider, planId: string, phone?: string, ottPin?: string) => any;
  onRedeemVoucher: (code: string, mac: string, hostname?: string) => any;
  currency: string;
}

export const CaptivePortalView: React.FC<CaptivePortalViewProps> = ({
  plans,
  onProcessPayment,
  onRedeemVoucher,
  currency,
}) => {
  const [deviceFrame, setDeviceFrame] = useState<'iphone' | 'android' | 'desktop'>('iphone');
  const [activeTab, setActiveTab] = useState<'buy' | 'login'>('buy');

  // Checkout flow state in simulation
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [selectedGateway, setSelectedGateway] = useState<GatewayProvider>('ecocash');
  const [phoneNumber, setPhoneNumber] = useState('+266 5800 1234');
  const [ottPin, setOttPin] = useState('');
  const [voucherCodeInput, setVoucherCodeInput] = useState('');

  // Payment process simulation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'idle' | 'push_sent' | 'approved' | 'connected'>('idle');
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleSimulateCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setPaymentStep('push_sent');

    // Simulate STK push approve step
    setTimeout(() => {
      setPaymentStep('approved');
      const res = onProcessPayment(selectedGateway, selectedPlan.id, phoneNumber, ottPin);
      setIssuedCode(res.voucher.code);

      // Auto login client device
      setTimeout(() => {
        onRedeemVoucher(res.voucher.code, '7A:91:02:11:44:99', 'iPhone-15-Customer');
        setPaymentStep('connected');
        setIsProcessing(false);
      }, 1000);
    }, 2000);
  };

  const handleSimulateVoucherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCodeInput.trim()) return;

    setIsProcessing(true);
    setTimeout(() => {
      const res = onRedeemVoucher(voucherCodeInput, '7A:91:02:11:44:99', 'Guest-Device');
      setIsProcessing(false);
      if (res.success) {
        setPaymentStep('connected');
        setIssuedCode(voucherCodeInput.toUpperCase());
      } else {
        alert(res.message);
      }
    }, 700);
  };

  const walledGardenScript = `# ============================================================
# T-Connect Walled Garden Rules (Pre-Auth Allowed Domains)
# Push this to /ip hotspot walled-garden ip
# ============================================================
/ip hotspot walled-garden ip
${WALLED_GARDEN_DOMAINS.map(d => `add dst-host="*${d}" action=accept comment="T-Connect Pre-Auth"`).join('\n')}
`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Captive Portal &amp; Walled Garden Studio</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Test OS login detection popups (Apple CNA, Android, Windows) and generate pre-auth walled garden rules
          </p>
        </div>

        {/* Device Frame Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#161d31] border border-[#232d42] rounded-lg text-xs font-mono">
          <button
            onClick={() => setDeviceFrame('iphone')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              deviceFrame === 'iphone' ? 'bg-[#f05e17] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Apple CNA</span>
          </button>
          <button
            onClick={() => setDeviceFrame('android')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              deviceFrame === 'android' ? 'bg-[#f05e17] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            onClick={() => setDeviceFrame('desktop')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
              deviceFrame === 'desktop' ? 'bg-[#f05e17] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Live Interactive Simulator & Walled Garden Script */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Device Frame & Portal Experience (Left 7 Cols) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className={`w-full ${deviceFrame === 'desktop' ? 'max-w-2xl' : 'max-w-sm'} transition-all duration-300`}>
            {/* Phone/Window Enclosure */}
            <div className="bg-[#05070c] rounded-3xl border-4 border-[#232d42] shadow-2xl overflow-hidden flex flex-col">
              {/* Simulated Device Status Bar */}
              <div className="bg-[#0c101c] px-4 py-2 border-b border-[#1f283d] flex items-center justify-between text-[11px] font-mono text-slate-400 select-none">
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-[#f05e17]" />
                  <span className="font-bold text-white">T-Connect Wi-Fi</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {deviceFrame === 'iphone' ? 'captive.apple.com' : 'connectivitycheck.gstatic.com'}
                </div>
              </div>

              {/* Portal Content Viewport */}
              <div className="p-5 bg-gradient-to-b from-[#0e1424] to-[#080c16] text-white min-h-[460px] flex flex-col justify-between">
                <div>
                  {/* Brand Header */}
                  <div className="text-center py-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#0a0e18] mx-auto flex items-center justify-center p-2 border border-[#232d42] mb-2 shadow-lg">
                      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                        <circle cx="50" cy="50" r="32" stroke="#F05E17" strokeWidth="6" strokeDasharray="8 6" opacity="0.4"/>
                        <circle cx="50" cy="50" r="22" stroke="#F05E17" strokeWidth="5" strokeLinecap="round"/>
                        <circle cx="50" cy="50" r="8" fill="#10B981"/>
                      </svg>
                    </div>
                    <h2 className="text-base font-extrabold tracking-tight text-white">T-CONNECT HOTSPOTS</h2>
                    <p className="text-[11px] text-slate-400">High-Speed Fiber &amp; Starlink LEO Hotspot</p>
                  </div>

                  {/* Mode Tabs: Buy Plan / Redeem Voucher */}
                  {paymentStep !== 'connected' && (
                    <div className="flex rounded-lg bg-[#161d31] p-1 border border-[#232d42] my-3 text-xs font-mono">
                      <button
                        onClick={() => setActiveTab('buy')}
                        className={`flex-1 py-1.5 rounded-md font-bold transition-colors ${
                          activeTab === 'buy' ? 'bg-[#f05e17] text-white' : 'text-slate-400'
                        }`}
                      >
                        Buy Hotspot Pass
                      </button>
                      <button
                        onClick={() => setActiveTab('login')}
                        className={`flex-1 py-1.5 rounded-md font-bold transition-colors ${
                          activeTab === 'login' ? 'bg-[#f05e17] text-white' : 'text-slate-400'
                        }`}
                      >
                        Redeem Voucher
                      </button>
                    </div>
                  )}

                  {/* Connected State */}
                  {paymentStep === 'connected' ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-extrabold text-white">Internet Connected!</h3>
                      <p className="text-xs text-slate-300 font-mono">
                        Your device is authenticated on the network. Session token active.
                      </p>
                      {issuedCode && (
                        <div className="p-3 bg-[#161d31] rounded-xl border border-[#232d42] font-mono text-xs">
                          <span className="text-slate-400 block text-[10px]">YOUR VOUCHER TOKEN</span>
                          <span className="text-[#f05e17] font-black text-sm">{issuedCode}</span>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 font-mono">
                        Valid for {selectedPlan?.durationLabel}. You can roam across all T-Connect locations on this SSID!
                      </p>
                      <button
                        onClick={() => {
                          setPaymentStep('idle');
                          setActiveTab('buy');
                        }}
                        className="mt-4 px-4 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-xs font-mono text-slate-300 rounded-lg"
                      >
                        Reset Simulator
                      </button>
                    </div>
                  ) : activeTab === 'buy' ? (
                    /* Buy Plan Form */
                    <form onSubmit={handleSimulateCheckout} className="space-y-3 text-xs">
                      {/* Plan Selection */}
                      <div>
                        <label className="text-[11px] text-slate-400 font-mono block mb-1">Choose Access Tier</label>
                        <select
                          value={selectedPlanId}
                          onChange={(e) => setSelectedPlanId(e.target.value)}
                          className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono focus:outline-none focus:border-[#f05e17]"
                        >
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {currency}{p.price} ({p.durationLabel}, {p.downloadSpeedMbps}Mbps)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Payment Method Selector */}
                      <div>
                        <label className="text-[11px] text-slate-400 font-mono block mb-1">Payment Method</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'ecocash', label: 'EcoCash' },
                            { id: 'mywallet', label: 'MyWallet' },
                            { id: 'ottvoucher', label: 'OTTvoucher' },
                            { id: 'xpayments', label: 'xPayments' },
                          ].map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setSelectedGateway(g.id as GatewayProvider)}
                              className={`p-2 rounded-lg border flex items-center gap-2 text-left font-mono transition-colors ${
                                selectedGateway === g.id
                                  ? 'bg-[#1b233a] border-[#f05e17] text-white font-bold'
                                  : 'bg-[#161d31] border-[#232d42] text-slate-400'
                              }`}
                            >
                              <div className="w-5 h-5 rounded bg-[#0b0f19] p-0.5 shrink-0">
                                <ProviderLogo provider={g.id as GatewayProvider} className="w-full h-full" />
                              </div>
                              <span className="text-[11px] truncate">{g.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Input Phone or OTT PIN */}
                      {selectedGateway === 'ottvoucher' ? (
                        <div>
                          <label className="text-[11px] text-slate-400 font-mono block mb-1">12-Digit OTT Voucher PIN</label>
                          <input
                            type="text"
                            required
                            value={ottPin}
                            onChange={(e) => setOttPin(e.target.value)}
                            placeholder="XXXX - XXXX - XXXX"
                            className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono focus:outline-none focus:border-[#f05e17]"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="text-[11px] text-slate-400 font-mono block mb-1">Mobile Money Number</label>
                          <input
                            type="text"
                            required
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+266 5800 0000"
                            className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono focus:outline-none focus:border-[#f05e17]"
                          />
                        </div>
                      )}

                      {/* STK Push Status Message */}
                      {isProcessing && (
                        <div className="p-3 bg-[#1b233a] rounded-lg border border-[#f05e17]/40 text-xs font-mono text-slate-300 space-y-1 animate-pulse">
                          <div className="flex items-center gap-2 font-bold text-white">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#f05e17]" />
                            <span>
                              {paymentStep === 'push_sent' ? 'USSD Prompt Sent to Mobile Phone...' : 'Payment Approved! Connecting...'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Check your handset and enter your mobile money PIN to confirm {currency}{selectedPlan.price}.
                          </p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white font-mono font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#f05e17]/20"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Pay {currency}{selectedPlan.price.toFixed(2)} &amp; Connect</span>
                      </button>
                    </form>
                  ) : (
                    /* Redeem Voucher Form */
                    <form onSubmit={handleSimulateVoucherLogin} className="space-y-4 text-xs font-mono">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Enter Voucher Code</label>
                        <input
                          type="text"
                          required
                          value={voucherCodeInput}
                          onChange={(e) => setVoucherCodeInput(e.target.value)}
                          placeholder="TC-XXXX-XXM"
                          className="w-full px-3 py-2.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white uppercase text-center font-bold tracking-widest text-sm focus:outline-none focus:border-[#f05e17]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
                      >
                        <Ticket className="w-4 h-4" />
                        <span>{isProcessing ? 'Validating Token...' : 'Redeem &amp; Connect'}</span>
                      </button>
                    </form>
                  )}
                </div>

                {/* Footer security note */}
                <div className="pt-3 border-t border-[#1a233a] text-center text-[10px] text-slate-500 font-mono">
                  Protected by T-Connect Central FreeRADIUS · AES-256 TLS
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Walled Garden Rules & Technical Reference (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  WALLED GARDEN ROUTEROS SCRIPT
                </h3>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(walledGardenScript);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 2000);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded text-[11px] font-mono text-slate-300"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript ? 'Copied' : 'Copy Rules'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              These rules allow pre-authenticated devices to resolve DNS and interact with payment provider endpoints (EcoCash, MyWallet, OTTvoucher, xPayments) and trigger the native login popups on Apple, Android, Windows, and Chrome OS without requiring an internet grant first.
            </p>

            <div className="p-3 bg-[#080b12] rounded-lg border border-[#1b233a] font-mono text-[11px] text-slate-400 max-h-56 overflow-y-auto whitespace-pre leading-relaxed select-all">
              {walledGardenScript}
            </div>
          </div>

          <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-2 text-xs font-mono text-slate-300">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#f05e17]" /> Randomized MAC Address Architecture
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Modern iOS and Android devices randomize their MAC addresses per connection. T-Connect does not rely on MAC binding alone: each authorization produces an encrypted session token stored in browser session storage and verified centrally in PostgreSQL + FreeRADIUS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
