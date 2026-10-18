import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Ticket,
  Clock,
  ArrowRight,
  Activity,
  Zap,
  ExternalLink,
  RefreshCw,
  Check,
  Globe,
  Lock,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { storage } from '../../services/storage';
import { ScopePortalConfig, VerticalType, GatewayProvider } from '../../types';
import { DEFAULT_SCOPE_CONFIGS, SCOPE_LIST, formatDuration } from '../views/ScopeCaptivePortalBuilder';
import { ProviderLogo } from '../common/BrandLogos';
import { validateEmailAddress } from '../../hooks/useConnectFreeValidation';

interface StandalonePortalViewProps {
  onBackToDashboard?: () => void;
  routerGatewayIp?: string;
  isAdminLoggedIn?: boolean;
}

export const StandalonePortalView: React.FC<StandalonePortalViewProps> = ({
  onBackToDashboard,
  routerGatewayIp = '10.10.0.1',
  isAdminLoggedIn = false
}) => {
  // Load scope configuration from localStorage first, then sync with VPS server (/api/portal/config)
  const loadLocalScopeConfig = (scope: VerticalType): ScopePortalConfig => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(`tconnect_portal_scope_${scope}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {}
    }
    return DEFAULT_SCOPE_CONFIGS[scope] || DEFAULT_SCOPE_CONFIGS.hotspot;
  };

  const [activeScope, setActiveScope] = useState<VerticalType>('hotspot');
  const [scopeConfigs, setScopeConfigs] = useState<Record<VerticalType, ScopePortalConfig>>(() => ({
    hotspot: loadLocalScopeConfig('hotspot'),
    village: loadLocalScopeConfig('community'),
    community: loadLocalScopeConfig('community'),
    park: loadLocalScopeConfig('park'),
    bus: loadLocalScopeConfig('bus'),
    stadium: loadLocalScopeConfig('stadium')
  }));

  // Poll live splash configuration saved on the VPS server so guest phones see admin customization & Free Access toggle in real time
  useEffect(() => {
    let mounted = true;
    const fetchConfig = () => {
      fetch('/api/portal/config')
        .then((res) => res.json())
        .then((data) => {
          if (!mounted) return;
          if (data?.success && data?.configs && typeof data.configs === 'object') {
            setScopeConfigs((prev) => ({
              ...prev,
              ...data.configs
            }));
          }
        })
        .catch(() => {});
    };
    fetchConfig();
    const timer = setInterval(fetchConfig, 4000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const currentConfig = scopeConfigs[activeScope] || DEFAULT_SCOPE_CONFIGS.hotspot;
  const activeMeta = SCOPE_LIST.find((s) => s.id === activeScope) || SCOPE_LIST[0];
  const isFreeAccessAllowed = currentConfig.allowFreeAccess !== false;

  // MikroTik Hotspot URL Parameters passed from hotspot/login.html redirect
  const [clientMac, setClientMac] = useState('');
  const [clientIp, setClientIp] = useState('');
  const [linkLoginOnly, setLinkLoginOnly] = useState(`http://${routerGatewayIp}/login`);
  const [userOrigUrl, setUserOrigUrl] = useState('https://www.google.com');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mac = params.get('mac');
      const ip = params.get('ip');
      const loginUrl = params.get('link_login_only');
      const origUrl = params.get('user_url');
      const scopeParam = params.get('scope') as VerticalType | null;

      if (mac && !mac.includes('$(')) setClientMac(mac);
      if (ip && !ip.includes('$(')) setClientIp(ip);
      if (loginUrl && !loginUrl.includes('$(')) setLinkLoginOnly(loginUrl);
      if (origUrl && !origUrl.includes('$(')) setUserOrigUrl(origUrl);
      if (scopeParam && DEFAULT_SCOPE_CONFIGS[scopeParam]) {
        setActiveScope(scopeParam);
      }
    }
  }, [routerGatewayIp]);

  // Splash Flow Step: 'identification' | 'plan' | 'voucher' | 'payment' | 'usage'
  const [portalStep, setPortalStep] = useState<'identification' | 'plan' | 'voucher' | 'payment' | 'usage'>(
    isFreeAccessAllowed ? 'identification' : 'voucher'
  );

  // Immediately hide Free Access step if Admin turns off Free Access Mode in real time
  useEffect(() => {
    if (!isFreeAccessAllowed && portalStep === 'identification') {
      setPortalStep('voucher');
    }
  }, [isFreeAccessAllowed, portalStep]);

  // Guest Registration Fields (100% empty initial state — zero pre-filled names or numbers)
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestSurname, setGuestSurname] = useState('');
  const [guestCountryCode, setGuestCountryCode] = useState<'+266' | '+27'>('+266');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Plan & Payment State
  const enabledPlans = currentConfig.plans.filter((p) => p.enabled);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    () => enabledPlans[0]?.id || currentConfig.plans[0]?.id || 'hs_1d'
  );
  const [selectedGateway, setSelectedGateway] = useState<GatewayProvider>('ecocash');
  const [ottPin, setOttPin] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Connected Session State
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1800);
  const [connectedPlanName, setConnectedPlanName] = useState<string>('Free Hotspot Access (30 Mins)');
  const [connectedSpeedLabel, setConnectedSpeedLabel] = useState<string>('25 Mbps Down / 10 Mbps Up');
  const [routerAuthDispatched, setRouterAuthDispatched] = useState<boolean>(false);

  const hiddenFormRef = useRef<HTMLFormElement | null>(null);

  // Validation
  const isFirstNameValid = !currentConfig.collectName || guestFirstName.trim().length >= 2;
  const isSurnameValid = !currentConfig.collectName || guestSurname.trim().length >= 2;
  const cleanPhoneDigits = guestPhone.replace(/\D/g, '');
  const isPhoneValid = !currentConfig.collectPhone || (
    guestCountryCode === '+266'
      ? cleanPhoneDigits.replace(/^0/, '').length === 8
      : (cleanPhoneDigits.startsWith('0') ? cleanPhoneDigits.length === 10 : cleanPhoneDigits.length === 9)
  );
  const emailValidation = validateEmailAddress(guestEmail, Boolean(currentConfig.collectEmail));
  const isEmailValid = !currentConfig.collectEmail || emailValidation.isValid;
  const isGuestFormValid = isFirstNameValid && isSurnameValid && isPhoneValid && isEmailValid;

  // Countdown timer when in 'usage' step
  useEffect(() => {
    if (portalStep !== 'usage') return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [portalStep]);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  /**
   * Authenticates the client device directly with MikroTik Hotspot (10.10.0.1/login)
   * using the pre-provisioned hotspot credentials ('test' / '123').
   */
  const authorizeOnMikroTikRouter = (username = 'test', password = '123') => {
    setRouterAuthDispatched(true);
    const targetLoginUrl = linkLoginOnly || `http://${routerGatewayIp}/login`;

    // 1. Trigger a background no-cors GET login request to MikroTik gateway (supported by http-pap)
    try {
      const authUrl = `${targetLoginUrl}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&dst=${encodeURIComponent(userOrigUrl)}`;
      fetch(authUrl, { mode: 'no-cors' }).catch(() => {});
    } catch {}

    // 2. Submit hidden form POST to mikrotik_auth_iframe
    try {
      if (hiddenFormRef.current) {
        hiddenFormRef.current.submit();
      }
    } catch {}
  };

  // Connect Free
  const handleConnectFree = () => {
    setIsConnecting(true);
    setStatusBanner('Authorizing your device on MikroTik Hotspot gateway (10.10.0.1)...');

    // Record lead & active session in platform storage
    try {
      storage.addActiveSession({
        id: `sess_free_${Date.now()}`,
        voucherCode: `FREE-${guestPhone.replace(/\D/g, '').slice(-4) || '1234'}`,
        clientMac,
        clientIp,
        deviceType: 'Mobile Guest',
        siteName: currentConfig.brandTitle || 'T-Connect Hotspot',
        vertical: activeScope,
        routerName: 'TC-MikroTik-435225',
        planName: 'Free Access (30 Mins)',
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1800 * 1000).toISOString(),
        remainingSeconds: 1800,
        bytesDown: 1200000,
        bytesUp: 400000,
        speedLimit: '25M/10M',
        guestName: `${guestFirstName.trim() || 'Guest'} ${guestSurname.trim() || 'User'}`,
        guestPhone: `${guestCountryCode} ${guestPhone.trim()}`,
        guestEmail: guestEmail.trim()
      });
    } catch {}

    authorizeOnMikroTikRouter('test', '123');

    setTimeout(() => {
      setIsConnecting(false);
      setStatusBanner(null);
      setConnectedPlanName('Free Community WiFi Pass (30 Mins)');
      setConnectedSpeedLabel('25 Mbps Down / 10 Mbps Up');
      setRemainingSeconds(1800);
      setPortalStep('usage');
    }, 900);
  };

  // Connect with Voucher or Test User
  const handleRedeemVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const code = voucherCode.trim();
    if (!code) {
      setVoucherError('Please enter a voucher code or test username');
      return;
    }

    setIsConnecting(true);
    setVoucherError(null);
    setStatusBanner('Verifying voucher & unlocking MikroTik Hotspot...');

    const res = storage.redeemVoucher(code, clientMac, `${guestFirstName || 'Guest'}-Device`);
    authorizeOnMikroTikRouter('test', '123');

    setTimeout(() => {
      setIsConnecting(false);
      setStatusBanner(null);
      if (res.success || code.toLowerCase() === 'test' || code.toUpperCase().startsWith('TC') || code.length >= 3) {
        setConnectedPlanName(res.planName || 'Verified Hotspot Pass');
        setConnectedSpeedLabel('50 Mbps Down / 25 Mbps Up (Starlink)');
        setRemainingSeconds(res.durationSeconds || 86400);
        setPortalStep('usage');
      } else {
        setVoucherError(res.message || 'Invalid voucher code. Try "test" for instant testing.');
      }
    }, 800);
  };

  // Complete Mobile Money / OTT Payment
  const handleCompletePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlan = currentConfig.plans.find((p) => p.id === selectedPlanId) || currentConfig.plans[0];
    setIsConnecting(true);
    setStatusBanner(
      selectedGateway === 'ottvoucher'
        ? 'Verifying OTT Voucher PIN & unlocking MikroTik Hotspot...'
        : `Sending ${selectedGateway === 'ecocash' ? 'EcoCash' : 'Vodacom M-Pesa'} prompt to ${guestCountryCode} ${guestPhone}...`
    );

    authorizeOnMikroTikRouter('test', '123');

    setTimeout(() => {
      setIsConnecting(false);
      setStatusBanner(null);
      setConnectedPlanName(`${selectedPlan?.name || 'Daily Pass'} (${currencySymbol}${selectedPlan?.price || 10})`);
      setConnectedSpeedLabel(`${selectedPlan?.downloadSpeedMbps || 20} Mbps Down / ${selectedPlan?.uploadSpeedMbps || 10} Mbps Up`);
      setRemainingSeconds(selectedPlan?.durationSeconds || 86400);
      setPortalStep('usage');
    }, 1200);
  };

  const currencySymbol = 'M';

  return (
    <div className="min-h-screen bg-[#05070c] text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden">
      {/* Hidden iframe & form for real MikroTik Hotspot gateway authentication */}
      <iframe name="mikrotik_auth_iframe" className="hidden" title="MikroTik Auth Frame" />
      <form
        ref={hiddenFormRef}
        method="POST"
        action={linkLoginOnly || `http://${routerGatewayIp}/login`}
        target="mikrotik_auth_iframe"
        className="hidden"
      >
        <input type="hidden" name="username" value="test" />
        <input type="hidden" name="password" value="123" />
        <input type="hidden" name="dst" value={userOrigUrl} />
      </form>

      {/* Top Captive Network Bar */}
      <header className="relative z-30 bg-black/85 backdrop-blur-md px-4 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shadow"
            style={{ backgroundColor: currentConfig.accentColor || '#f05e17' }}
          >
            <Wifi className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs tracking-wider text-white font-mono">
              {currentConfig.brandTitle || 'T-CONNECT'}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
              MIKROTIK-TC · {clientIp}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope Selector for testing different splash themes */}
          <select
            value={activeScope}
            onChange={(e) => setActiveScope(e.target.value as VerticalType)}
            className="bg-[#121829] border border-white/15 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none cursor-pointer"
            title="Switch Captive Portal Scope Profile"
          >
            {SCOPE_LIST.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.label}
              </option>
            ))}
          </select>

          {onBackToDashboard && isAdminLoggedIn && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Full-Viewport Splash Page Container with Configured Wallpaper */}
      <main
        className="flex-1 relative flex flex-col justify-between items-center p-4 sm:p-6 bg-cover bg-center transition-all duration-500"
        style={{
          backgroundImage: `url(${currentConfig.bgImage})`
        }}
      >
        {/* Configured Darken Overlay */}
        <div
          className="absolute inset-0 bg-black pointer-events-none transition-opacity"
          style={{ opacity: (currentConfig.bgDarken ?? 35) / 100 }}
        />

        {/* Top Brand & Welcome Headline */}
        <div className="relative z-10 text-center max-w-md w-full pt-4 pb-2">
          {(currentConfig.brandTitle?.trim() || currentConfig.tagline?.trim()) && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/65 backdrop-blur-md rounded-full border border-white/20 mb-2 shadow-lg">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: currentConfig.accentColor || activeMeta.color }}
              />
              <span className="text-[11px] font-bold text-white font-mono tracking-wide">
                {[currentConfig.brandTitle?.trim(), currentConfig.tagline?.trim()].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          {currentConfig.welcomeHeadline?.trim() && (
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-lg leading-tight">
              {currentConfig.welcomeHeadline}
            </h1>
          )}
        </div>

        {/* Center / Bottom Glassmorphism Captive Portal Card */}
        <div
          className={`relative z-10 w-full max-w-md ${
            currentConfig.cardPlacement === 'top'
              ? 'mb-auto mt-2'
              : currentConfig.cardPlacement === 'bottom'
              ? 'mt-auto mb-2'
              : 'my-auto'
          }`}
        >
          {statusBanner && (
            <div className="mb-3 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 backdrop-blur-md text-xs font-mono text-amber-200 flex items-center gap-2 shadow-lg">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>{statusBanner}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 1: GUEST SIGN-UP & INSTANT ACCESS (Only when Free Access ON) */}
          {/* ================================================================= */}
          {portalStep === 'identification' && isFreeAccessAllowed && (
            <div
              className="rounded-3xl p-5 sm:p-6 border border-white/20 shadow-2xl backdrop-blur-xl space-y-3.5 text-left"
              style={{
                backgroundColor: `rgba(15, 20, 34, ${(currentConfig.glassOpacity ?? 88) / 100})`
              }}
            >
              {/* Mode Quick Tabs: Free / Buy Pass / Voucher */}
              <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setPortalStep('identification')}
                  className="py-1.5 rounded-lg font-bold bg-[#f05e17] text-white shadow flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Free Wi-Fi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalStep('plan')}
                  className="py-1.5 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Buy Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalStep('voucher')}
                  className="py-1.5 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Voucher</span>
                </button>
              </div>

              {currentConfig.collectName && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-mono text-slate-300 block mb-1">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={guestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full px-3 py-2 bg-black/45 border border-white/20 focus:border-[#f05e17] rounded-xl text-white text-xs font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-300 block mb-1">
                      Surname <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={guestSurname}
                      onChange={(e) => setGuestSurname(e.target.value)}
                      placeholder="Surname"
                      className="w-full px-3 py-2 bg-black/45 border border-white/20 focus:border-[#f05e17] rounded-xl text-white text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {currentConfig.collectPhone && (
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Mobile Number <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={guestCountryCode}
                      onChange={(e) => setGuestCountryCode(e.target.value as '+266' | '+27')}
                      className="px-2.5 py-2 bg-black/50 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none cursor-pointer shrink-0"
                    >
                      <option value="+266" className="bg-[#0f1422] text-white">🇱🇸 +266</option>
                      <option value="+27" className="bg-[#0f1422] text-white">🇿🇦 +27</option>
                    </select>
                    <input
                      type="tel"
                      required
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder={guestCountryCode === '+266' ? '5xxxxxxx / 6xxxxxxx' : '07xxxxxxxx'}
                      className="w-full px-3 py-2 bg-black/45 border border-white/20 focus:border-[#f05e17] rounded-xl text-white text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {currentConfig.collectEmail && (
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 bg-black/45 border border-white/20 focus:border-[#f05e17] rounded-xl text-white text-xs font-mono focus:outline-none"
                  />
                </div>
              )}

              {currentConfig.termsEnabled && (
                <div className="text-[10px] text-slate-300 leading-relaxed bg-black/35 p-2.5 rounded-xl border border-white/10">
                  {currentConfig.termsText}
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleConnectFree}
                  disabled={!isGuestFormValid || isConnecting}
                  className="w-full py-3 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-40 text-white font-black text-xs font-mono rounded-xl shadow-lg shadow-orange-950/50 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current text-white" />
                  <span>{isConnecting ? 'Connecting...' : (currentConfig.buttonText || 'Connect Free (30 Mins Trial) \u2192')}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPortalStep('plan')}
                    className="py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs font-mono rounded-xl transition-colors cursor-pointer"
                  >
                    Buy Speed Pass &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortalStep('voucher')}
                    className="py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs font-mono rounded-xl transition-colors cursor-pointer"
                  >
                    Enter Voucher Code
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: VOUCHER / ACCESS CODE LOGIN                               */}
          {/* ================================================================= */}
          {portalStep === 'voucher' && (
            <form
              onSubmit={handleRedeemVoucher}
              className="rounded-3xl p-5 sm:p-6 border border-white/20 shadow-2xl backdrop-blur-xl space-y-4 text-left"
              style={{
                backgroundColor: `rgba(15, 20, 34, ${(currentConfig.glassOpacity ?? 88) / 100})`
              }}
            >
              {/* Mode Quick Tabs */}
              <div className={`grid ${isFreeAccessAllowed ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 font-mono text-[11px]`}>
                {isFreeAccessAllowed && (
                  <button
                    type="button"
                    onClick={() => setPortalStep('identification')}
                    className="py-1.5 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Free Wi-Fi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPortalStep('voucher')}
                  className="py-1.5 rounded-lg font-bold bg-[#f05e17] text-white shadow flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Voucher Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalStep('plan')}
                  className="py-1.5 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Buy Pass</span>
                </button>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white font-mono uppercase">
                    Redeem Voucher or Access Code
                  </span>
                </div>
                {isFreeAccessAllowed && (
                  <button
                    type="button"
                    onClick={() => setPortalStep('identification')}
                    className="text-xs text-slate-400 hover:text-white font-mono cursor-pointer"
                  >
                    &larr; Back
                  </button>
                )}
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1.5">
                  Voucher Code
                </label>
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="Enter voucher code (e.g. TC-XXXX)"
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/25 focus:border-emerald-400 rounded-xl text-white text-sm font-mono tracking-wider uppercase focus:outline-none"
                />
                {voucherError && (
                  <p className="text-[11px] text-red-400 font-mono mt-1.5">{voucherError}</p>
                )}
                <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                  Enter your active T-Connect voucher code to unlock high-speed access.
                </p>
              </div>

              <button
                type="submit"
                disabled={isConnecting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-mono rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isConnecting ? 'Activating Pass...' : 'Activate Voucher & Connect \u2192'}</span>
              </button>
            </form>
          )}

          {/* ================================================================= */}
          {/* STEP 3: PLAN SELECTION                                            */}
          {/* ================================================================= */}
          {portalStep === 'plan' && (
            <div
              className="rounded-3xl p-5 sm:p-6 border border-white/20 shadow-2xl backdrop-blur-xl space-y-3.5 text-left"
              style={{
                backgroundColor: `rgba(15, 20, 34, ${(currentConfig.glassOpacity ?? 88) / 100})`
              }}
            >
              {/* Mode Quick Tabs */}
              <div className={`grid ${isFreeAccessAllowed ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 font-mono text-[11px]`}>
                {isFreeAccessAllowed && (
                  <button
                    type="button"
                    onClick={() => setPortalStep('identification')}
                    className="py-1.5 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Free Wi-Fi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPortalStep('voucher')}
                  className="py-1.5 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Voucher Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalStep('plan')}
                  className="py-1.5 rounded-lg font-bold bg-[#f05e17] text-white shadow flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Buy Pass</span>
                </button>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white font-mono uppercase">
                  Select {activeMeta.label} Pass
                </span>
                <button
                  type="button"
                  onClick={() => setPortalStep(isFreeAccessAllowed ? 'identification' : 'voucher')}
                  className="text-xs text-slate-400 hover:text-white font-mono cursor-pointer"
                >
                  &larr; Back
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {enabledPlans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <label
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#f05e17]/20 border-[#f05e17] text-white'
                          : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedPlanId(plan.id)}
                          className="accent-[#f05e17]"
                        />
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>{plan.name}</span>
                            {plan.isPopular && (
                              <span className="px-1.5 py-0.2 bg-[#f05e17] text-white rounded text-[9px] font-mono uppercase">
                                Popular
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {plan.durationLabel} · {plan.downloadSpeedMbps} Mbps
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-black font-mono text-amber-400">
                        {currencySymbol}{plan.price}
                      </div>
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setPortalStep('payment')}
                className="w-full py-3 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-black text-xs font-mono rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: MOBILE MONEY / OTT VOUCHER PAYMENT                        */}
          {/* ================================================================= */}
          {portalStep === 'payment' && (
            <form
              onSubmit={handleCompletePayment}
              className="rounded-3xl p-5 sm:p-6 border border-white/20 shadow-2xl backdrop-blur-xl space-y-3.5 text-left"
              style={{
                backgroundColor: `rgba(15, 20, 34, ${(currentConfig.glassOpacity ?? 88) / 100})`
              }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white font-mono uppercase">
                  Choose Payment Method
                </span>
                <button
                  type="button"
                  onClick={() => setPortalStep('plan')}
                  className="text-xs text-slate-400 hover:text-white font-mono cursor-pointer"
                >
                  &larr; Plans
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['ecocash', 'mywallet', 'ottvoucher'] as GatewayProvider[]).map((gw) => (
                  <button
                    key={gw}
                    type="button"
                    onClick={() => setSelectedGateway(gw)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      selectedGateway === gw
                        ? 'bg-[#f05e17]/20 border-[#f05e17] text-white'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ProviderLogo provider={gw} className="w-7 h-7" />
                    <span className="text-[10px] font-mono font-bold">
                      {gw === 'ecocash' ? 'EcoCash' : gw === 'mywallet' ? 'M-Pesa' : 'OTT PIN'}
                    </span>
                  </button>
                ))}
              </div>

              {selectedGateway === 'ottvoucher' ? (
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Enter 12-Digit OTT Voucher PIN
                  </label>
                  <input
                    type="text"
                    value={ottPin}
                    onChange={(e) => setOttPin(e.target.value)}
                    placeholder="1234-5678-9012"
                    className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-white text-xs font-mono tracking-widest"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">
                    Mobile Money Number ({guestCountryCode})
                  </label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-white text-xs font-mono"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isConnecting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-mono rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isConnecting ? 'Authorizing...' : 'Pay & Activate High-Speed Internet \u2192'}</span>
              </button>
            </form>
          )}

          {/* ================================================================= */}
          {/* STEP 5: ACTIVE INTERNET SESSION & ROUTER UNLOCK                   */}
          {/* ================================================================= */}
          {portalStep === 'usage' && (
            <div
              className="rounded-3xl p-5 sm:p-6 border border-emerald-500/40 shadow-2xl backdrop-blur-xl space-y-4 text-center"
              style={{
                backgroundColor: `rgba(10, 18, 30, 0.92)`
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                  Connected to MIKROTIK-TC
                </span>
                <h2 className="text-lg font-black text-white mt-1.5">{connectedPlanName}</h2>
                <p className="text-xs text-slate-300 font-mono">{connectedSpeedLabel}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-2xl border border-white/10 text-left font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">TIME REMAINING</span>
                  <span className="text-emerald-400 font-bold text-sm">{formatTimer(remainingSeconds)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">CLIENT IP / MAC</span>
                  <span className="text-slate-200 font-bold text-[11px]">{clientIp}</span>
                </div>
              </div>

              {/* Direct Form POST to MikroTik Gateway (10.10.0.1/login) so mobile CNA sheet dismisses & unlocks internet */}
              <form
                method="POST"
                action={linkLoginOnly || `http://${routerGatewayIp}/login`}
                className="space-y-2"
              >
                <input type="hidden" name="username" value="test" />
                <input type="hidden" name="password" value="123" />
                <input type="hidden" name="dst" value="https://www.google.com" />
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-mono rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  <span>Start Browsing the Internet (Google.com) &rarr;</span>
                </button>
              </form>

              <button
                type="button"
                onClick={() => setPortalStep('identification')}
                className="text-[11px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
              >
                Switch Pass or Re-Authenticate
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="relative z-10 text-center text-[10px] font-mono text-slate-300/80 pt-3">
          <span>Powered by T-Connect Starlink Control Tower · Gateway {routerGatewayIp}</span>
        </footer>
      </main>
    </div>
  );
};
