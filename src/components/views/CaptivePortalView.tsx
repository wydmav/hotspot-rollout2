import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Wifi, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink,
  RefreshCw,
  Ticket,
  Sliders,
  Sparkles,
  ChevronDown,
  Layers,
  Palette,
  Eye,
  Zap,
  Globe,
  Radio,
  Clock,
  HardDrive,
  Info,
  AlertTriangle
} from 'lucide-react';
import { HotspotPlan, GatewayProvider, VerticalType, RouterDevice } from '../../types';
import { ProviderLogo } from '../common/BrandLogos';
import { WALLED_GARDEN_DOMAINS } from '../../services/storage';
import { CaptivePortalEditor } from './CaptivePortalEditor';
import { ScopeCaptivePortalBuilder } from './ScopeCaptivePortalBuilder';

interface CaptivePortalViewProps {
  plans: HotspotPlan[];
  routers?: RouterDevice[];
  onToggleRouterFreeMode?: (routerId: string | 'all', enabled: boolean) => void;
  onProcessPayment: (provider: GatewayProvider, planId: string, phone?: string, ottPin?: string) => any;
  onRedeemVoucher: (code: string, mac: string, hostname?: string) => any;
  currency: string;
  selectedVertical?: VerticalType | 'all';
}

// Preset Background Wallpapers
const BACKGROUND_PRESETS = [
  {
    id: 'maloti_mountains',
    name: 'Lesotho Maloti Range',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    description: 'High-altitude dramatic mountain sky'
  },
  {
    id: 'starlink_sky',
    name: 'Starlink Night Orbit',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
    description: 'Deep cosmic starfield'
  },
  {
    id: 'neon_fiber',
    name: 'High-Speed Cyber Grid',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    description: 'Ultra-fast fiber optic aesthetic'
  },
  {
    id: 'green_park',
    name: 'Lush Greenery Canopy',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    description: 'Vibrant outdoor public park'
  }
];

// Country codes with flags for mobile number input
const COUNTRY_CODES = [
  { code: '+266', flag: '🇱🇸', name: 'Lesotho' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+267', flag: '🇧🇼', name: 'Botswana' },
  { code: '+268', flag: '🇸🇿', name: 'Eswatini' },
  { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+1', flag: '🇺🇸', name: 'United States' }
];

export const CaptivePortalView: React.FC<CaptivePortalViewProps> = ({
  plans,
  routers = [],
  onToggleRouterFreeMode,
  onProcessPayment,
  onRedeemVoucher,
  currency,
  selectedVertical = 'all',
}) => {
  // Main view navigation tabs (Scope builders is primary)
  const [activeMainTab, setActiveMainTab] = useState<'scopes' | 'free_mode' | 'lockdown' | 'walled_garden' | 'builder'>('scopes');

  // Preview simulator step (matches mkcontroller: Identification -> Authentication -> Payment -> Success -> Session Usage)
  const [previewStep, setPreviewStep] = useState<'identification' | 'authentication' | 'payment' | 'success' | 'usage'>('identification');
  const [deviceFrame, setDeviceFrame] = useState<'iphone' | 'android' | 'desktop'>('iphone');

  // ---------------------------------------------------------------------------
  // BUILDER SETTINGS (User Collect Data, Authentication, Appearance)
  // ---------------------------------------------------------------------------
  // User Collect Data checkboxes
  const [collectName, setCollectName] = useState(true);
  const [collectPhone, setCollectPhone] = useState(true);
  const [collectEmail, setCollectEmail] = useState(true);
  const [collectGender, setCollectGender] = useState(false);
  const [collectDob, setCollectDob] = useState(false);

  // Authentication toggles
  const [authCode, setAuthCode] = useState(true);
  const [authFree, setAuthFree] = useState(false);
  const [authOnlinePayment, setAuthOnlinePayment] = useState(true);
  const [authPos, setAuthPos] = useState(true);

  // Content
  const [headerBrand, setHeaderBrand] = useState('T-CONNECT');
  const [headerTagline, setHeaderTagline] = useState('STARLINK AUTHORISED RESELLER');
  const [welcomeHeading, setWelcomeHeading] = useState('WHAT DO YOU CONNECT FOR?');
  const [termsEnabled, setTermsEnabled] = useState(true);
  const [termsText, setTermsText] = useState(
    'Amohela Liphelo Tsa Tšebetso: Rea u amohela ho khokelo ea rona ea marang-rang a mahala. Molemong oa hore sechaba sa bo rona se natefeloe ke khokelo ena, latela melao le lipehelo tse latelang: Ha ho lumelloe ho khoasolla litaba tse seng molaong, ho hlasela marang-rang kapa ho sebelisa data ka mokhoa o sa lokang.'
  );

  // Appearance Customizer (Background, Glass Opacity, Box Sizing, Orientation)
  const [bgImage, setBgImage] = useState(BACKGROUND_PRESETS[0].url);
  const [imageUse, setImageUse] = useState<'full' | 'top_band'>('full');
  const [darkenPercent, setDarkenPercent] = useState(25); // 0 - 100
  const [glassOpacity, setGlassOpacity] = useState(88); // 0 - 100 opacity of signup card
  const [cardWidth, setCardWidth] = useState<'compact' | 'normal' | 'wide' | 'full'>('normal');
  const [cardOrientation, setCardOrientation] = useState<'top' | 'center' | 'bottom'>('bottom');
  const [panelStyle, setPanelStyle] = useState<'card' | 'none'>('card');
  const [accentColor, setAccentColor] = useState('#f05e17');

  // ---------------------------------------------------------------------------
  // GUEST SIMULATOR STATE
  // ---------------------------------------------------------------------------
  const [guestName, setGuestName] = useState('');
  const [guestCountry, setGuestCountry] = useState(COUNTRY_CODES[0]);
  const [guestPhone, setGuestPhone] = useState('5800 1234');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestTermsAccepted, setGuestTermsAccepted] = useState(true);

  // Payment & Voucher
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [selectedGateway, setSelectedGateway] = useState<GatewayProvider>('ecocash');
  const [ottPin, setOttPin] = useState('');
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);

  // Live countdown timer for "Session Usage" view
  const [remainingSeconds, setRemainingSeconds] = useState(306132); // ~3 days, 13 hours, 2 minutes
  const [totalPackageSeconds, setTotalPackageSeconds] = useState(604800); // 7 days (Week pass)
  const [copiedLockdownScript, setCopiedLockdownScript] = useState(false);

  // Ticking countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format seconds into exact Days, Hours, Minutes, Seconds
  const formatDetailedTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return '0 minutes remaining (Expired)';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
    if (hours > 0 || days > 0) parts.push(`${hours} ${hours === 1 ? 'Hour' : 'Hours'}`);
    parts.push(`${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`);

    return `${parts.join(', ')} remaining (${secs}s)`;
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  // Quick Action: Fill With Sample Data (as shown in Screenshots 1 & 2)
  const handleFillSampleData = () => {
    setGuestName('Katleho Molapo');
    setGuestCountry(COUNTRY_CODES[0]); // 🇱🇸 +266
    setGuestPhone('5912 3456');
    setGuestEmail('katleho.molapo@gmail.com');
    setGuestTermsAccepted(true);
  };

  // Identification Submit
  const handleIdentificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authFree) {
      // Direct free connection
      setPreviewStep('success');
      return;
    }
    // Proceed to payment gateway selection
    setPreviewStep('payment');
  };

  // Payment Execution Simulation
  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      const fullPhone = `${guestCountry.code}${guestPhone.replace(/\s+/g, '')}`;
      const res = onProcessPayment(selectedGateway, selectedPlan.id, fullPhone, ottPin);
      setIssuedCode(res.voucher.code);
      setIsProcessing(false);
      setPreviewStep('success');

      // Set package duration based on chosen plan
      if (selectedPlan.name.toLowerCase().includes('month')) {
        setRemainingSeconds(2592000);
        setTotalPackageSeconds(2592000);
      } else if (selectedPlan.name.toLowerCase().includes('week')) {
        setRemainingSeconds(604800);
        setTotalPackageSeconds(604800);
      } else if (selectedPlan.name.toLowerCase().includes('day')) {
        setRemainingSeconds(86400);
        setTotalPackageSeconds(86400);
      } else {
        setRemainingSeconds(7200);
        setTotalPackageSeconds(7200);
      }
    }, 1200);
  };

  // Direct Voucher Code Redemption
  const handleRedeemDirectCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCodeInput.trim()) return;

    setIsProcessing(true);
    setTimeout(() => {
      const res = onRedeemVoucher(voucherCodeInput, '7A:91:02:11:44:99', 'Customer-Device');
      setIsProcessing(false);
      if (res.success) {
        setIssuedCode(voucherCodeInput.toUpperCase());
        setPreviewStep('success');
      } else {
        alert(res.message);
      }
    }, 800);
  };

  // Strict CNA Lockdown Script (Anti-Bypass)
  const strictCnaLockdownScript = `# ==============================================================================
# T-Connect Strict Captive Network Assistant (CNA) Lockdown
# Prevents Android & iOS "Use network as is" or "Connect anyway" bypass options
# ==============================================================================

# 1. Provide RFC 8910 / RFC 8908 Captive Portal API via DHCP Option 114
# Modern iOS 14+ and Android 11+ query this URL and lock directly into CNA modal
/ip dhcp-server option
:do { remove [find name="cna-cap-port"] } on-error={}
add name="cna-cap-port" code=114 value="s'https://app.tconnect.co.ls/api/cna/status'"

# 2. Assign Option 114 to your Hotspot DHCP Server
/ip dhcp-server
set [find name="default"] dhcp-option="cna-cap-port"

# 3. Intercept ALL DNS Port 53 (TCP & UDP) to Local Router
/ip firewall nat
add chain=dstnat protocol=udp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Prevent DNS Leaks"
add chain=dstnat protocol=tcp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Prevent TCP DNS Leaks"

# 4. Block DNS-over-TLS (Port 853) & Drop DoH Bypass Queries
/ip firewall filter
add chain=forward protocol=tcp dst-port=853 action=reject reject-with=tcp-reset comment="T-Connect: Block DoT Port 853"
add chain=forward protocol=udp dst-port=853 action=drop comment="T-Connect: Block DoT UDP Port 853"
/ip firewall raw
add chain=prerouting protocol=tcp dst-port=443 content="dns-query" action=drop comment="T-Connect: Block DoH Queries"

# 5. Fast-Fail Unauthenticated WAN Forwarding with TCP-RESET
# When unauthenticated traffic fails with immediate TCP-RESET rather than timing out,
# Android and iOS do NOT show "Use network as is" — they immediately display the captive portal!
/ip firewall filter
add chain=forward action=reject reject-with=tcp-reset protocol=tcp connection-state=new \\
  hotspot=!auth in-interface-list=LAN out-interface-list=WAN comment="T-Connect: Fast-Fail Unauth TCP"
`;

  const handleCopyLockdownScript = () => {
    navigator.clipboard.writeText(strictCnaLockdownScript);
    setCopiedLockdownScript(true);
    setTimeout(() => setCopiedLockdownScript(false), 2000);
  };

  // Card Width calculation based on builder setting
  const getCardWidthClass = () => {
    switch (cardWidth) {
      case 'compact': return 'max-w-[280px]';
      case 'normal': return 'max-w-[340px]';
      case 'wide': return 'max-w-[380px]';
      case 'full': return 'w-full';
      default: return 'max-w-[340px]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0e17] p-4 rounded-xl border border-[#1b233a]">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#f05e17]" />
            <h1 className="text-lg font-extrabold text-white tracking-tight">Captive Portal &amp; Guest Experience Studio</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              MKController-Compatible
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Full-featured visual portal builder, real-time fleet Free Mode switcher, and strict zero-bypass CNA enforcement
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121829] rounded-lg border border-[#1f283d] text-xs font-mono">
          <button
            onClick={() => setActiveMainTab('scopes')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
              activeMainTab === 'scopes' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Scope Builders (5 Verticals)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('builder')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
              activeMainTab === 'builder' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Classic Studio</span>
          </button>

          <button
            onClick={() => setActiveMainTab('free_mode')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
              activeMainTab === 'free_mode' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Free Mode Switch</span>
          </button>

          <button
            onClick={() => setActiveMainTab('lockdown')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
              activeMainTab === 'lockdown' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Strict CNA Lockdown</span>
          </button>

          <button
            onClick={() => setActiveMainTab('walled_garden')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
              activeMainTab === 'walled_garden' ? 'bg-[#161d31] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Walled Garden</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 0: SEPARATE CAPTIVE PORTAL BUILDER BY SCOPE (HOTSPOTS, VILLAGES..)*/}
      {/* ===================================================================== */}
      {activeMainTab === 'scopes' && (
        <ScopeCaptivePortalBuilder
          initialScope={selectedVertical !== 'all' ? selectedVertical : 'hotspot'}
          routers={routers}
          onProcessPayment={onProcessPayment}
          onRedeemVoucher={onRedeemVoucher}
          currency={currency}
        />
      )}

      {/* ===================================================================== */}
      {/* TAB 1: VISUAL PORTAL BUILDER & LIVE PHONE EMULATOR (SCREENSHOTS 1, 2, 3) */}
      {/* ===================================================================== */}
      {activeMainTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 5 COLS: BUILDER CONTROLS */}
          <div className="lg:col-span-5 space-y-4">
            {/* Section: User Collect Data (Screenshot 1) */}
            <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#f05e17]" /> User Collect Data
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Sign-up Fields</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer hover:border-slate-500">
                  <input
                    type="checkbox"
                    checked={collectName}
                    onChange={(e) => setCollectName(e.target.checked)}
                    className="accent-[#f05e17] rounded"
                  />
                  <span>Full name</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer hover:border-slate-500">
                  <input
                    type="checkbox"
                    checked={collectPhone}
                    onChange={(e) => setCollectPhone(e.target.checked)}
                    className="accent-[#f05e17] rounded"
                  />
                  <span>Phone (+ flag)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer hover:border-slate-500">
                  <input
                    type="checkbox"
                    checked={collectEmail}
                    onChange={(e) => setCollectEmail(e.target.checked)}
                    className="accent-[#f05e17] rounded"
                  />
                  <span>Email address</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer hover:border-slate-500">
                  <input
                    type="checkbox"
                    checked={collectGender}
                    onChange={(e) => setCollectGender(e.target.checked)}
                    className="accent-[#f05e17] rounded"
                  />
                  <span>Gender</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer hover:border-slate-500">
                  <input
                    type="checkbox"
                    checked={collectDob}
                    onChange={(e) => setCollectDob(e.target.checked)}
                    className="accent-[#f05e17] rounded"
                  />
                  <span>Date of birth</span>
                </label>
              </div>
            </div>

            {/* Section: Authentication Modes */}
            <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-4 space-y-3">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" /> Authentication Modes
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setAuthOnlinePayment(!authOnlinePayment)}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between ${
                    authOnlinePayment ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-[#161d31] border-[#232d42] text-slate-400'
                  }`}
                >
                  <span>Online Payment</span>
                  <span className="text-[10px] font-bold">{authOnlinePayment ? 'ACTIVE' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthFree(!authFree)}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between ${
                    authFree ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-[#161d31] border-[#232d42] text-slate-400'
                  }`}
                >
                  <span>Free Access</span>
                  <span className="text-[10px] font-bold">{authFree ? 'ACTIVE' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthCode(!authCode)}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between ${
                    authCode ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-[#161d31] border-[#232d42] text-slate-400'
                  }`}
                >
                  <span>Access with Code</span>
                  <span className="text-[10px] font-bold">{authCode ? 'ACTIVE' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthPos(!authPos)}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between ${
                    authPos ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-[#161d31] border-[#232d42] text-slate-400'
                  }`}
                >
                  <span>Point of Sale</span>
                  <span className="text-[10px] font-bold">{authPos ? 'ACTIVE' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* Section: Customize Appearance (Screenshot 2) */}
            <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-4 space-y-4 text-xs font-mono">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-400" /> Customize Appearance
              </span>

              {/* Background Preset Selector */}
              <div>
                <label className="text-slate-400 block mb-1.5 font-bold">Background Wallpaper</label>
                <div className="grid grid-cols-2 gap-2">
                  {BACKGROUND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setBgImage(preset.url)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        bgImage === preset.url
                          ? 'border-[#f05e17] bg-[#f05e17]/10 text-white font-bold'
                          : 'border-[#232d42] bg-[#161d31] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="truncate">{preset.name}</div>
                      <div className="text-[9px] text-slate-500 truncate">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizing: Card Width (Compact, Normal, Wide, Full) */}
              <div>
                <label className="text-slate-400 block mb-1.5 font-bold">
                  Card Width / Sizing <span className="text-slate-500 font-normal">(User-defined sizing)</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['compact', 'normal', 'wide', 'full'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setCardWidth(w)}
                      className={`py-1.5 px-2 rounded-lg border text-center uppercase text-[10px] font-bold transition-colors ${
                        cardWidth === w
                          ? 'bg-[#f05e17] border-[#f05e17] text-white'
                          : 'bg-[#161d31] border-[#232d42] text-slate-400 hover:text-white'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity & Glass Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 font-bold">Signup Box Glass Opacity</label>
                  <span className="text-white font-bold">{glassOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={glassOpacity}
                  onChange={(e) => setGlassOpacity(Number(e.target.value))}
                  className="w-full accent-[#f05e17]"
                />
              </div>

              {/* Background Darken Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 font-bold">Background Darken Filter</label>
                  <span className="text-white font-bold">{darkenPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={darkenPercent}
                  onChange={(e) => setDarkenPercent(Number(e.target.value))}
                  className="w-full accent-[#f05e17]"
                />
              </div>

              {/* Card Orientation (Top, Center, Bottom) */}
              <div>
                <label className="text-slate-400 block mb-1.5 font-bold">Card Placement</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['top', 'center', 'bottom'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setCardOrientation(pos)}
                      className={`py-1.5 px-2 rounded-lg border text-center uppercase text-[10px] font-bold transition-colors ${
                        cardOrientation === pos
                          ? 'bg-[#f05e17] border-[#f05e17] text-white'
                          : 'bg-[#161d31] border-[#232d42] text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section: Content & Legal (Sesotho terms as in Screenshot 1) */}
            <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-4 space-y-3 text-xs font-mono">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-400" /> Branding &amp; Legal Terms
              </span>

              <div>
                <label className="text-slate-400 block mb-1">Welcome Headline</label>
                <input
                  type="text"
                  value={welcomeHeading}
                  onChange={(e) => setWelcomeHeading(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Terms of Use (Sesotho / English)</label>
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsEnabled}
                      onChange={(e) => setTermsEnabled(e.target.checked)}
                      className="accent-[#f05e17]"
                    />
                    <span>Enforce</span>
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  className="w-full p-2 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-300 text-[11px] leading-relaxed resize-none"
                />
              </div>
            </div>
          </div>

          {/* RIGHT 7 COLS: INTERACTIVE PHONE PREVIEW EMULATOR */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Top Toolbar: Guest Journey Steps & Device Frame Selector */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 bg-[#0a0e17] p-2.5 rounded-xl border border-[#1b233a]">
              {/* Step Navigation Tabs (Screenshot 1: Identification, Authentication, Payment, Success, Session Usage) */}
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
                {(['identification', 'payment', 'success', 'usage'] as const).map((step) => (
                  <button
                    key={step}
                    onClick={() => setPreviewStep(step)}
                    className={`px-3 py-1 rounded-md capitalize transition-colors ${
                      previewStep === step
                        ? 'bg-[#f05e17] text-white font-bold'
                        : 'text-slate-400 hover:text-white bg-[#121829]'
                    }`}
                  >
                    {step === 'usage' ? 'Session Usage' : step}
                  </button>
                ))}
              </div>

              {/* Device Frame Switcher */}
              <div className="flex items-center gap-1 text-xs font-mono">
                <button
                  onClick={() => setDeviceFrame('iphone')}
                  className={`p-1.5 rounded-md ${deviceFrame === 'iphone' ? 'bg-[#232d42] text-white' : 'text-slate-400'}`}
                  title="Apple CNA iPhone"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeviceFrame('android')}
                  className={`p-1.5 rounded-md ${deviceFrame === 'android' ? 'bg-[#232d42] text-white' : 'text-slate-400'}`}
                  title="Android CNA"
                >
                  <Radio className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeviceFrame('desktop')}
                  className={`p-1.5 rounded-md ${deviceFrame === 'desktop' ? 'bg-[#232d42] text-white' : 'text-slate-400'}`}
                  title="Desktop Browser"
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Simulated Device Frame */}
            <div
              className={`w-full ${
                deviceFrame === 'desktop' ? 'max-w-xl' : 'max-w-[390px]'
              } bg-[#05070c] rounded-[36px] border-8 border-[#1f283d] shadow-2xl overflow-hidden transition-all duration-300 relative`}
            >
              {/* Phone Status Bar (Time, Wi-Fi icon, CNA address) */}
              <div className="bg-black/80 backdrop-blur-md px-5 py-2.5 flex items-center justify-between text-[11px] font-mono text-slate-300 border-b border-white/10 z-20 relative">
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-[#f05e17]" />
                  <span className="font-bold">T-Connect Wi-Fi</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {deviceFrame === 'iphone' ? 'captive.apple.com' : 'connectivitycheck.gstatic.com'}
                </div>
              </div>

              {/* Viewport with User-Selected Background Image */}
              <div
                className="relative min-h-[580px] p-5 flex flex-col justify-between bg-cover bg-center transition-all duration-300"
                style={{
                  backgroundImage: `url(${bgImage})`,
                }}
              >
                {/* Background Darken Overlay */}
                <div
                  className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                  style={{ opacity: darkenPercent / 100 }}
                />

                {/* Brand Header: T-CONNECT | STARLINK AUTHORISED RESELLER */}
                <div className="relative z-10 text-center pt-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 mb-2">
                    <span className="w-2 h-2 rounded-full bg-[#f05e17] animate-pulse" />
                    <span className="text-[11px] font-extrabold tracking-wider text-white font-mono">
                      {headerBrand} <span className="text-slate-400">·</span> {headerTagline}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                    {welcomeHeading}
                  </h2>
                </div>

                {/* CARD BODY WITH DYNAMIC OPACITY & SIZING */}
                <div
                  className={`relative z-10 mx-auto w-full ${getCardWidthClass()} ${
                    cardOrientation === 'top' ? 'mt-4' : cardOrientation === 'bottom' ? 'mt-auto' : 'my-auto'
                  }`}
                >
                  {/* STEP 1: IDENTIFICATION FORM (Collect Name, Phone + Flag, Email, Sample Data) */}
                  {previewStep === 'identification' && (
                    <form
                      onSubmit={handleIdentificationSubmit}
                      className="rounded-2xl p-5 border border-white/20 shadow-2xl backdrop-blur-xl space-y-3.5"
                      style={{
                        backgroundColor: `rgba(15, 20, 34, ${glassOpacity / 100})`,
                      }}
                    >
                      {/* Name Input */}
                      {collectName && (
                        <div>
                          <label className="text-[11px] font-mono text-slate-300 block mb-1">Full name</label>
                          <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="e.g. Katleho Molapo"
                            required
                            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#f05e17]"
                          />
                        </div>
                      )}

                      {/* Phone Input with Country Flag & Code Selector */}
                      {collectPhone && (
                        <div>
                          <label className="text-[11px] font-mono text-slate-300 block mb-1">
                            Phone number <span className="text-slate-400">(with country flag)</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            {/* Country Dropdown */}
                            <select
                              value={guestCountry.code}
                              onChange={(e) => {
                                const found = COUNTRY_CODES.find((c) => c.code === e.target.value);
                                if (found) setGuestCountry(found);
                              }}
                              className="px-2 py-2 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#f05e17] cursor-pointer"
                            >
                              {COUNTRY_CODES.map((c) => (
                                <option key={c.code} value={c.code} className="bg-[#0f1422] text-white">
                                  {c.flag} {c.code}
                                </option>
                              ))}
                            </select>

                            <input
                              type="tel"
                              value={guestPhone}
                              onChange={(e) => setGuestPhone(e.target.value)}
                              placeholder="5800 1234"
                              required
                              className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#f05e17]"
                            />
                          </div>
                        </div>
                      )}

                      {/* Email Input */}
                      {collectEmail && (
                        <div>
                          <label className="text-[11px] font-mono text-slate-300 block mb-1">Email address</label>
                          <input
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="katleho@example.com"
                            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#f05e17]"
                          />
                        </div>
                      )}

                      {/* Terms Acceptance */}
                      {termsEnabled && (
                        <label className="flex items-start gap-2 text-[10px] text-slate-300 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={guestTermsAccepted}
                            onChange={(e) => setGuestTermsAccepted(e.target.checked)}
                            required
                            className="accent-[#f05e17] mt-0.5 rounded"
                          />
                          <span>
                            I have read and accept the <strong>Terms of Use</strong> of the services
                          </span>
                        </label>
                      )}

                      {/* "Fill with sample data" Button (Matches Screenshot 1 & 2!) */}
                      <button
                        type="button"
                        onClick={handleFillSampleData}
                        className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[11px] font-bold text-amber-300 font-mono flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>✨ Fill with sample data</span>
                      </button>

                      {/* Connect / Proceed Button */}
                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-extrabold text-xs font-mono rounded-xl shadow-lg transition-transform active:scale-95"
                      >
                        {authFree ? 'Connect Free to Internet' : 'Connect & Choose Pass'} &rarr;
                      </button>
                    </form>
                  )}

                  {/* STEP 2: PAYMENT GATEWAY SELECTION WITH OFFICIAL LOGOS */}
                  {previewStep === 'payment' && (
                    <div
                      className="rounded-2xl p-5 border border-white/20 shadow-2xl backdrop-blur-xl space-y-3"
                      style={{
                        backgroundColor: `rgba(15, 20, 34, ${glassOpacity / 100})`,
                      }}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-extrabold text-white font-mono uppercase">
                          Select Payment Method
                        </span>
                        <button
                          onClick={() => setPreviewStep('identification')}
                          className="text-[10px] text-slate-400 hover:text-white font-mono"
                        >
                          &larr; Back
                        </button>
                      </div>

                      {/* Plan Duration Selector */}
                      <div>
                        <label className="text-[10px] font-mono text-slate-300 block mb-1">Choose Hotspot Plan</label>
                        <select
                          value={selectedPlanId}
                          onChange={(e) => setSelectedPlanId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-black/50 border border-white/20 rounded-lg text-xs font-mono text-white focus:outline-none"
                        >
                          {plans.map((p) => (
                            <option key={p.id} value={p.id} className="bg-[#0f1422] text-white">
                              {p.name} — {currency}{p.price} ({p.durationLabel})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* GATEWAYS LIST WITH AUTHENTIC LOGOS */}
                      <div className="space-y-2 pt-1">
                        {/* OTTvoucher */}
                        <label
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            selectedGateway === 'ottvoucher'
                              ? 'bg-blue-600/20 border-blue-500'
                              : 'bg-black/40 border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="gateway"
                              checked={selectedGateway === 'ottvoucher'}
                              onChange={() => setSelectedGateway('ottvoucher')}
                              className="accent-blue-500"
                            />
                            <ProviderLogo provider="ottvoucher" className="w-24 h-7" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-blue-300">Digital PIN</span>
                        </label>

                        {/* EcoCash Lesotho (Econet) */}
                        <label
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            selectedGateway === 'ecocash'
                              ? 'bg-amber-600/20 border-amber-500'
                              : 'bg-black/40 border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="gateway"
                              checked={selectedGateway === 'ecocash'}
                              onChange={() => setSelectedGateway('ecocash')}
                              className="accent-[#f05e17]"
                            />
                            <ProviderLogo provider="ecocash" className="w-24 h-7" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-amber-300">USSD *151#</span>
                        </label>

                        {/* Vodacom MyWallet (M-Pesa) */}
                        <label
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            selectedGateway === 'mywallet'
                              ? 'bg-red-600/20 border-red-500'
                              : 'bg-black/40 border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="gateway"
                              checked={selectedGateway === 'mywallet'}
                              onChange={() => setSelectedGateway('mywallet')}
                              className="accent-red-500"
                            />
                            <ProviderLogo provider="mywallet" className="w-24 h-7" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-red-300">M-Pesa STK</span>
                        </label>

                        {/* xPayments */}
                        <label
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            selectedGateway === 'xpayments'
                              ? 'bg-emerald-600/20 border-emerald-500'
                              : 'bg-black/40 border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="gateway"
                              checked={selectedGateway === 'xpayments'}
                              onChange={() => setSelectedGateway('xpayments')}
                              className="accent-emerald-500"
                            />
                            <ProviderLogo provider="xpayments" className="w-24 h-7" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-emerald-300">Card &amp; OTT</span>
                        </label>
                      </div>

                      {/* Provider Specific Input */}
                      {selectedGateway === 'ottvoucher' && (
                        <div className="pt-1 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <label className="text-slate-300 font-bold">12-Digit OTT Voucher PIN</label>
                            <button
                              type="button"
                              onClick={() => setOttPin('8921 3482 9011')}
                              className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>✨ Use Sample PIN</span>
                            </button>
                          </div>

                          <input
                            type="text"
                            value={ottPin}
                            onChange={(e) => {
                              // Auto-format into 4-4-4 blocks
                              const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 12);
                              const parts = raw.match(/.{1,4}/g);
                              setOttPin(parts ? parts.join(' ') : raw);
                            }}
                            placeholder="e.g. 8921 3482 9011"
                            maxLength={14}
                            className="w-full px-3 py-2.5 bg-black/60 border border-blue-400/50 rounded-xl text-emerald-400 font-mono text-sm tracking-widest font-extrabold focus:outline-none focus:border-blue-400 text-center"
                          />

                          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-0.5">
                            <span>Kenya linomoro tse 12 tsa slip ea hao</span>
                            <span className="text-blue-300">TCONNECTLES1 Partner</span>
                          </div>
                        </div>
                      )}

                      {/* Pay / Redeem Button */}
                      <button
                        onClick={handleExecutePayment}
                        disabled={isProcessing}
                        className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white font-bold text-xs font-mono rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>
                              {selectedGateway === 'ottvoucher'
                                ? 'Redeeming PIN via OTT Lesotho...'
                                : 'Processing Telecom STK Push...'}
                            </span>
                          </>
                        ) : (
                          <span>
                            {selectedGateway === 'ottvoucher'
                              ? `Redeem OTT Voucher (${currency}${selectedPlan.price}) & Connect →`
                              : `Pay ${currency}${selectedPlan.price} & Connect →`}
                          </span>
                        )}
                      </button>

                      {/* Alternative: Voucher Code Redemption */}
                      <div className="pt-2 border-t border-white/10">
                        <span className="text-[10px] text-slate-400 font-mono block mb-1.5">Have a physical paper voucher?</span>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={voucherCodeInput}
                            onChange={(e) => setVoucherCodeInput(e.target.value)}
                            placeholder="Enter Voucher Code"
                            className="flex-1 px-3 py-1.5 bg-black/40 border border-white/20 rounded-lg text-white font-mono text-xs uppercase"
                          />
                          <button
                            onClick={handleRedeemDirectCode}
                            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs font-mono rounded-lg"
                          >
                            Redeem
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SUCCESS STATE */}
                  {previewStep === 'success' && (
                    <div
                      className="rounded-2xl p-6 border border-emerald-500/30 shadow-2xl backdrop-blur-xl text-center space-y-4"
                      style={{
                        backgroundColor: `rgba(15, 20, 34, ${glassOpacity / 100})`,
                      }}
                    >
                      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-white">You Are Connected!</h3>
                        <p className="text-xs text-slate-300 font-mono mt-1">
                          High-speed Starlink Wi-Fi access authorized on MikroTik hAP ax³.
                        </p>
                      </div>

                      {issuedCode && (
                        <div className="p-3 bg-black/60 rounded-xl border border-white/10 font-mono">
                          <div className="text-[10px] text-slate-400">Your Active Pass Code:</div>
                          <div className="text-base font-bold text-emerald-400 tracking-wider select-all">{issuedCode}</div>
                        </div>
                      )}

                      <button
                        onClick={() => setPreviewStep('usage')}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs font-mono rounded-xl shadow-lg"
                      >
                        View Session Usage &amp; Time Left &rarr;
                      </button>
                    </div>
                  )}

                  {/* STEP 4: SESSION USAGE & TIME REMAINING (MATCHING SCREENSHOT 3) */}
                  {previewStep === 'usage' && (
                    <div
                      className="rounded-2xl p-5 border border-white/20 shadow-2xl backdrop-blur-xl space-y-4 text-center"
                      style={{
                        backgroundColor: `rgba(15, 20, 34, ${glassOpacity / 100})`,
                      }}
                    >
                      {/* Notice banner from Screenshot 3 */}
                      <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-[10px] font-mono text-blue-300 flex items-center gap-2 text-left">
                        <Info className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>The link on this screen will be sent by email / SMS</span>
                      </div>

                      {/* Brand Icon */}
                      <div className="w-12 h-12 rounded-xl bg-[#0f1422] border border-[#232d42] mx-auto flex items-center justify-center p-2 shadow-inner">
                        <Wifi className="w-6 h-6 text-[#f05e17]" />
                      </div>

                      {/* TIME USAGE METRIC (41.17% Used · Days, Hours, Minutes remaining) */}
                      <div className="p-3 bg-black/50 rounded-xl border border-white/10 space-y-1">
                        <div className="text-[11px] font-mono text-slate-400">Time usage</div>
                        <div className="text-2xl font-black text-white font-mono">
                          {((1 - remainingSeconds / totalPackageSeconds) * 100).toFixed(2)}% Used
                        </div>

                        {/* Days, Hours, Minutes, Seconds display */}
                        <div className="text-xs font-extrabold text-emerald-400 font-mono pt-1">
                          {formatDetailedTimeRemaining(remainingSeconds)}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${Math.max(5, (1 - remainingSeconds / totalPackageSeconds) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* DATA USAGE METRIC */}
                      <div className="p-3 bg-black/50 rounded-xl border border-white/10 text-left space-y-1 font-mono text-xs">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>Data usage</span>
                          <span className="text-emerald-400 font-bold">Unlimited data</span>
                        </div>
                        <div className="text-slate-200 text-[11px]">17 MB consumed</div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full rounded-full w-1/4" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 font-mono">
                        <button
                          onClick={() => setPreviewStep('identification')}
                          className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs"
                        >
                          Reconnect
                        </button>
                        <button
                          onClick={() => setPreviewStep('payment')}
                          className="flex-1 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg text-xs"
                        >
                          Extend Pass
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Footer Credits */}
                <div className="relative z-10 text-center text-[10px] font-mono text-slate-400/80 pt-2">
                  Powered by T-Connect Cloud Controller · Lesotho
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: REAL-TIME FREE MODE SWITCHER (PER-ROUTER & FLEET-WIDE) */}
      {/* ===================================================================== */}
      {activeMainTab === 'free_mode' && (
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b233a] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-extrabold text-white">Hotspot Free Mode Manager</h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Instantly switch all routers or select individual routers into Free Access Mode in real time.
              </p>
            </div>

            {/* Global Fleet Free Mode Toggle */}
            <div className="flex items-center gap-3 bg-[#161d31] p-2.5 rounded-xl border border-[#232d42]">
              <span className="text-xs font-mono text-slate-300 font-bold">Global Fleet Free Mode:</span>
              <button
                type="button"
                onClick={() => onToggleRouterFreeMode && onToggleRouterFreeMode('all', true)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono rounded-lg transition-colors"
              >
                Set All Free
              </button>
              <button
                type="button"
                onClick={() => onToggleRouterFreeMode && onToggleRouterFreeMode('all', false)}
                className="px-3 py-1 bg-[#232d42] hover:bg-[#303d59] text-slate-300 text-xs font-mono rounded-lg transition-colors"
              >
                Disable Free
              </button>
            </div>
          </div>

          {/* Router Table with Real-Time Free Mode Toggles */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Fleet Routers Status &amp; Free Mode Assignment
            </h3>

            {routers.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500 bg-[#080b12] rounded-xl border border-[#1b233a]">
                No routers currently adopted. Add a router in &quot;Routers &amp; Adoption&quot; to manage its Free Mode status.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {routers.map((router) => (
                  <div
                    key={router.id}
                    className="p-4 bg-[#121829] rounded-xl border border-[#1f283d] flex items-center justify-between gap-4 font-mono text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-sm">{router.name}</strong>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          router.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {router.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Site: <span className="text-slate-200">{router.siteName}</span> · WireGuard IP: {router.wireguardIp}
                      </div>
                    </div>

                    {/* Per-Router Switch */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onToggleRouterFreeMode &&
                          onToggleRouterFreeMode(router.id, !router.freeModeEnabled)
                        }
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                          router.freeModeEnabled
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                            : 'bg-[#1b233a] text-slate-400 border border-[#232d42] hover:text-white'
                        }`}
                      >
                        {router.freeModeEnabled ? '⚡ Free Mode Active' : 'Paid / Voucher Mode'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: STRICT CNA LOCKDOWN (ZERO-BYPASS EXPLANATION & SCRIPT) */}
      {/* ===================================================================== */}
      {activeMainTab === 'lockdown' && (
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b233a] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-extrabold text-white">Strict CNA Lockdown (Zero-Bypass Architecture)</h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                How T-Connect forces Android and iOS to open the captive portal immediately and disables &quot;Use network as is&quot;
              </p>
            </div>

            <button
              onClick={handleCopyLockdownScript}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold rounded-lg shadow-sm"
            >
              {copiedLockdownScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLockdownScript ? 'Copied Script!' : 'Copy RouterOS Script'}</span>
            </button>
          </div>

          {/* Technical Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 bg-[#121829] rounded-xl border border-[#1f283d] space-y-2">
              <span className="text-cyan-400 font-bold block">1. RFC 8910 DHCP Option 114</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Modern iOS 14+ and Android 11+ look for DHCP Option 114 containing the URL to the Captive Portal API. When supplied, the operating system locks the modal and does NOT provide an option to browse without signing in.
              </p>
            </div>

            <div className="p-4 bg-[#121829] rounded-xl border border-[#1f283d] space-y-2">
              <span className="text-emerald-400 font-bold block">2. TCP Reset Fast-Fail</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                When unauthorized packets hang and timeout on port 443, phones prompt &quot;Use network as is&quot;. By dropping packets with an immediate <code className="text-slate-200">reject-with=tcp-reset</code>, mobile devices instantly launch the WebSheet browser.
              </p>
            </div>

            <div className="p-4 bg-[#121829] rounded-xl border border-[#1f283d] space-y-2">
              <span className="text-amber-400 font-bold block">3. DNS Leak &amp; DoH Interception</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Blocks DNS-over-TLS (Port 853) and drops DNS-over-HTTPS (DoH) queries while redirecting all UDP/TCP Port 53 queries back to the router, preventing devices from resolving bypass endpoints.
              </p>
            </div>
          </div>

          {/* Script Box */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-300 font-bold">RouterOS v7 Anti-Bypass Script:</span>
            <pre className="p-4 bg-[#080b12] rounded-xl border border-[#1b233a] font-mono text-xs text-cyan-300 overflow-x-auto select-all leading-relaxed max-h-72">
              {strictCnaLockdownScript}
            </pre>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: WALLED GARDEN RULES */}
      {/* ===================================================================== */}
      {activeMainTab === 'walled_garden' && (
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1b233a] pb-3">
            <div>
              <h2 className="text-base font-extrabold text-white">Walled Garden Pre-Auth Domains</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Allowed domains accessible before guest authentication for payment checkout &amp; captive detection
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">{WALLED_GARDEN_DOMAINS.length} Domains Active</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
            {WALLED_GARDEN_DOMAINS.map((domain) => (
              <div key={domain} className="p-2.5 bg-[#121829] rounded-lg border border-[#1f283d] flex items-center justify-between">
                <span className="text-slate-200">{domain}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">ALLOWED</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
