import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Ticket,
  ArrowRight,
  Zap,
  RefreshCw,
  Globe,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { storage } from '../../services/storage';
import { ScopePortalConfig, VerticalType, GatewayProvider } from '../../types';
import { DEFAULT_SCOPE_CONFIGS, SCOPE_LIST } from '../views/ScopeCaptivePortalBuilder';
import { ProviderLogo } from '../common/BrandLogos';
import { validateEmailAddress } from '../../hooks/useConnectFreeValidation';

interface StandalonePortalViewProps {
  onBackToDashboard?: () => void;
  routerGatewayIp?: string;
  isAdminLoggedIn?: boolean;
}

export const StandalonePortalView: React.FC<StandalonePortalViewProps> = ({
  routerGatewayIp = '10.10.0.1'
}) => {
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
      const origUrl = params.get('user_url') || params.get('link_orig');
      const scopeParam = params.get('scope') as VerticalType | null;
      const stepParam = params.get('step');

      if (mac && !mac.includes('$(')) setClientMac(mac);
      if (ip && !ip.includes('$(')) setClientIp(ip);
      if (loginUrl && !loginUrl.includes('$(')) setLinkLoginOnly(loginUrl);
      if (origUrl && !origUrl.includes('$(')) setUserOrigUrl(origUrl);
      if (scopeParam && DEFAULT_SCOPE_CONFIGS[scopeParam]) {
        setActiveScope(scopeParam);
      }
      if (stepParam === 'plan' || stepParam === 'voucher') {
        setPortalStep(stepParam);
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

  // Guest Registration Fields (100% empty initial state — collected across all modes and synced to Admin)
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestSurname, setGuestSurname] = useState('');
  const [guestCountryCode, setGuestCountryCode] = useState<'+266' | '+27'>('+266');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Plan & Payment State (Strictly EcoCash and OTT Voucher only — M-Pesa removed)
  const enabledPlans = currentConfig.plans.filter((p) => p.enabled);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    () => enabledPlans[0]?.id || currentConfig.plans[0]?.id || 'hs_1d'
  );
  const [selectedGateway, setSelectedGateway] = useState<'ecocash' | 'ottvoucher'>('ottvoucher');
  const [ottPin, setOttPin] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Connected Session State (Consumer-facing only)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1800);
  const [connectedPlanName, setConnectedPlanName] = useState<string>('Wi-Fi Access Pass');
  const [connectedDurationLabel, setConnectedDurationLabel] = useState<string>('30 Minutes');

  const hiddenFormRef = useRef<HTMLFormElement | null>(null);
  const [routerUsername, setRouterUsername] = useState('test');
  const [routerPassword, setRouterPassword] = useState('123');

  // Guest Input Validation
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
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  /**
   * Sends captured guest details, session, and payment telemetry to the Admin Controller & Supabase
   */
  const syncGuestSessionToAdmin = async (payload: {
    mode: 'free' | 'voucher' | 'ecocash' | 'ottvoucher';
    planName: string;
    durationSeconds: number;
    voucherCode: string;
    amount?: number;
    transactionRef?: string;
    speedLimit?: string;
  }) => {
    const fullGuestName = [guestFirstName.trim(), guestSurname.trim()].filter(Boolean).join(' ') || 'Guest User';
    const fullGuestPhone = guestPhone.trim() ? `${guestCountryCode} ${guestPhone.trim()}` : '';
    const sessionId = `sess_${payload.mode}_${Date.now()}`;

    // 1. Update local storage if running on same browser
    try {
      storage.addActiveSession({
        id: sessionId,
        voucherCode: payload.voucherCode,
        clientMac: clientMac || 'Client-Device',
        clientIp: clientIp || '10.10.0.x',
        deviceType: 'Wi-Fi Guest',
        siteName: currentConfig.brandTitle || 'T-Connect Hotspot',
        vertical: activeScope,
        routerName: 'MIKROTIK-TC',
        planName: payload.planName,
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + payload.durationSeconds * 1000).toISOString(),
        remainingSeconds: payload.durationSeconds,
        bytesDown: 0,
        bytesUp: 0,
        speedLimit: payload.speedLimit || '25M/10M',
        guestName: fullGuestName,
        guestPhone: fullGuestPhone,
        guestEmail: guestEmail.trim()
      });
    } catch {}

    // 2. Post to VPS backend so Admin Dashboard across any device receives the lead, session & transaction
    try {
      await fetch('/api/portal/guest-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          firstName: guestFirstName.trim(),
          lastName: guestSurname.trim(),
          guestName: fullGuestName,
          countryCode: guestCountryCode,
          phone: guestPhone.trim(),
          guestPhone: fullGuestPhone,
          email: guestEmail.trim(),
          mac: clientMac,
          ip: clientIp,
          scope: activeScope,
          siteName: currentConfig.brandTitle || 'T-Connect Hotspot',
          routerName: 'MIKROTIK-TC',
          mode: payload.mode,
          planName: payload.planName,
          durationSeconds: payload.durationSeconds,
          voucherCode: payload.voucherCode,
          amount: payload.amount || 0,
          transactionRef: payload.transactionRef,
          speedLimit: payload.speedLimit || '25M/10M'
        })
      });
    } catch {}
  };

  /**
   * Authenticates the client device with the MikroTik Hotspot gateway (10.10.0.1/login)
   * ONLY called after strict backend verification succeeds.
   */
  const authorizeOnMikroTikRouter = (username = 'test', password = '123') => {
    setRouterUsername(username);
    setRouterPassword(password);
    const targetLoginUrl = linkLoginOnly || `http://${routerGatewayIp}/login`;

    try {
      const authUrl = `${targetLoginUrl}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&dst=${encodeURIComponent(userOrigUrl)}`;
      fetch(authUrl, { mode: 'no-cors' }).catch(() => {});
    } catch {}

    setTimeout(() => {
      try {
        if (hiddenFormRef.current) {
          hiddenFormRef.current.submit();
        }
      } catch {}
    }, 100);
  };

  // Connect Free Trial (Only when Free Access is enabled by Admin)
  const handleConnectFree = async () => {
    if (!isGuestFormValid) return;
    setIsConnecting(true);
    setStatusBanner('Activating your free Wi-Fi session...');

    const vCode = `FREE-${cleanPhoneDigits.slice(-4) || Math.floor(1000 + Math.random() * 9000)}`;
    await syncGuestSessionToAdmin({
      mode: 'free',
      planName: 'Free Wi-Fi Trial (30 Mins)',
      durationSeconds: 1800,
      voucherCode: vCode,
      amount: 0,
      speedLimit: '25M/10M'
    });

    authorizeOnMikroTikRouter('T-TRIAL', '123');

    setTimeout(() => {
      setIsConnecting(false);
      setStatusBanner(null);
      setConnectedPlanName('Free Wi-Fi Pass');
      setConnectedDurationLabel('30 Minutes');
      setRemainingSeconds(1800);
      setPortalStep('usage');
    }, 700);
  };

  // Redeem Voucher Code (Strictly verifies against active platform / Supabase vouchers)
  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherError(null);

    if (!isGuestFormValid) {
      setVoucherError('Please complete your name and mobile number above before activating your voucher.');
      return;
    }

    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setVoucherError('Please enter your voucher code.');
      return;
    }

    setIsConnecting(true);
    setStatusBanner('Verifying voucher code...');

    try {
      // 1. Check local storage vouchers
      const localRes = storage.redeemVoucher(
        code,
        clientMac || 'Client-MAC',
        [guestFirstName.trim(), guestSurname.trim()].filter(Boolean).join('-') || 'Guest-Device'
      );

      // 2. Verify with backend server (which checks synced platform vouchers & Supabase)
      const apiRes = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          mac: clientMac,
          ip: clientIp,
          guestName: [guestFirstName.trim(), guestSurname.trim()].filter(Boolean).join(' '),
          guestPhone: `${guestCountryCode} ${guestPhone.trim()}`,
          guestEmail: guestEmail.trim()
        })
      });
      const apiData = await apiRes.json().catch(() => ({ success: false }));

      const isVerified = Boolean(localRes.success || (apiRes.ok && apiData.success));

      if (!isVerified) {
        setIsConnecting(false);
        setStatusBanner(null);
        setVoucherError(
          apiData.message || localRes.message || 'Invalid or expired voucher code. Please check your code and try again.'
        );
        return;
      }

      const planTitle = apiData.planName || localRes.planName || 'Prepaid Wi-Fi Pass';
      const durationSecs = apiData.durationSeconds || localRes.durationSeconds || 86400;

      await syncGuestSessionToAdmin({
        mode: 'voucher',
        planName: planTitle,
        durationSeconds: durationSecs,
        voucherCode: code,
        amount: apiData.price || 0
      });

      authorizeOnMikroTikRouter('test', '123');

      setIsConnecting(false);
      setStatusBanner(null);
      setConnectedPlanName(planTitle);
      setConnectedDurationLabel(durationSecs >= 604800 ? '7 Days' : durationSecs >= 86400 ? '24 Hours' : `${Math.round(durationSecs / 60)} Mins`);
      setRemainingSeconds(durationSecs);
      setPortalStep('usage');
    } catch {
      setIsConnecting(false);
      setStatusBanner(null);
      setVoucherError('Could not verify voucher at this time. Please try again.');
    }
  };

  // Complete EcoCash or 12-Digit OTT Voucher Payment (Strict API + Supabase Validation)
  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!isGuestFormValid) {
      setPaymentError('Please complete your name and mobile number before proceeding with payment.');
      return;
    }

    const selectedPlan = currentConfig.plans.find((p) => p.id === selectedPlanId) || currentConfig.plans[0];
    const cleanPin = ottPin.replace(/\D/g, '');

    if (selectedGateway === 'ottvoucher') {
      if (cleanPin.length !== 12) {
        setPaymentError(`OTT Voucher PIN must be exactly 12 digits (${cleanPin.length}/12 digits entered).`);
        return;
      }
    } else if (selectedGateway === 'ecocash') {
      const normalizedPhone = cleanPhoneDigits.replace(/^0/, '');
      if (normalizedPhone.length < 8) {
        setPaymentError('Please enter a valid 8-digit EcoCash mobile number.');
        return;
      }
    }

    setIsConnecting(true);
    setStatusBanner(
      selectedGateway === 'ottvoucher'
        ? 'Verifying 12-digit OTT Voucher PIN with OTT Lesotho...'
        : `Sending EcoCash (*199#) payment prompt to ${guestCountryCode} ${guestPhone}...`
    );

    try {
      const endpoint =
        selectedGateway === 'ottvoucher'
          ? '/api/gateways/ottvoucher/redeem'
          : '/api/gateways/ecocash/charge';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ottPin: cleanPin,
          phoneNumber: `${guestCountryCode} ${guestPhone.trim()}`,
          amount: selectedPlan?.price || 10,
          planId: selectedPlan?.id || 'hs_1d',
          planName: selectedPlan?.name || 'Daily Pass',
          durationSeconds: selectedPlan?.durationSeconds || 86400,
          currency: currencySymbol,
          mac: clientMac,
          ip: clientIp,
          guestName: [guestFirstName.trim(), guestSurname.trim()].filter(Boolean).join(' '),
          guestEmail: guestEmail.trim()
        })
      });

      const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from payment server.' }));

      if (!response.ok || !data.success) {
        setIsConnecting(false);
        setStatusBanner(null);
        setPaymentError(
          data.message ||
            (selectedGateway === 'ottvoucher'
              ? 'OTT Voucher PIN verification failed. Please enter a valid 12-digit OTT Voucher PIN.'
              : 'EcoCash payment authorization failed. Please check your number and try again.')
        );
        return;
      }

      // Payment / OTT PIN genuinely verified! Record transaction & guest lead in Admin storage
      await syncGuestSessionToAdmin({
        mode: selectedGateway,
        planName: selectedPlan?.name || 'Daily Pass',
        durationSeconds: selectedPlan?.durationSeconds || 86400,
        voucherCode: data.voucherCode || `OTT-${cleanPin.slice(-4)}`,
        amount: selectedPlan?.price || 10,
        transactionRef: data.transactionRef,
        speedLimit: `${selectedPlan?.downloadSpeedMbps || 20}M/${selectedPlan?.uploadSpeedMbps || 10}M`
      });

      authorizeOnMikroTikRouter('test', '123');

      setIsConnecting(false);
      setStatusBanner(null);
      setConnectedPlanName(selectedPlan?.name || 'Daily Pass');
      setConnectedDurationLabel(selectedPlan?.durationLabel || '24 Hours');
      setRemainingSeconds(selectedPlan?.durationSeconds || 86400);
      setPortalStep('usage');
    } catch {
      setIsConnecting(false);
      setStatusBanner(null);
      setPaymentError('Network error communicating with payment gateway. Please try again.');
    }
  };

  const currencySymbol = 'M';

  // Reusable Guest Identification Fields Component (Shown across Free, Voucher, and Buy Pass modes)
  const renderGuestIdentificationInputs = () => {
    if (!currentConfig.collectName && !currentConfig.collectPhone && !currentConfig.collectEmail) {
      return null;
    }

    return (
      <div className="space-y-2.5 pb-2 border-b border-white/10">
        {currentConfig.collectName && (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={guestFirstName}
                onChange={(e) => setGuestFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3 py-2 bg-black/45 border border-white/20 focus:border-[#f05e17] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Surname <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={guestSurname}
                onChange={(e) => setGuestSurname(e.target.value)}
                placeholder="Surname"
                className="w-full px-3 py-2 bg-black/45 border border-white/20 focus:border-[#f05e17] rounded-xl text-white text-xs focus:outline-none"
              />
            </div>
          </div>
        )}

        {currentConfig.collectPhone && (
          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">
              Mobile Number <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                value={guestCountryCode}
                onChange={(e) => setGuestCountryCode(e.target.value as '+266' | '+27')}
                className="px-2.5 py-2 bg-black/50 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none cursor-pointer shrink-0"
              >
                <option value="+266" className="bg-[#0f1422] text-white">+266 (LS)</option>
                <option value="+27" className="bg-[#0f1422] text-white">+27 (ZA)</option>
              </select>
              <input
                type="tel"
                inputMode="numeric"
                required
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                placeholder={guestCountryCode === '+266' ? '5xxxxxxx / 6xxxxxxx' : '07xxxxxxxx'}
                className="w-full px-3 py-2 bg-black/45 border border-white/20 focus:border-[#f05e17] rounded-xl text-white text-xs font-mono focus:outline-none"
              />
            </div>
          </div>
        )}

        {currentConfig.collectEmail && (
          <div>
            <label className="text-[11px] font-medium text-slate-300 block mb-1">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 bg-black/45 border border-white/20 focus:border-[#f05e17] rounded-xl text-white text-xs focus:outline-none"
            />
          </div>
        )}
      </div>
    );
  };

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
        <input type="hidden" name="username" value={routerUsername} />
        <input type="hidden" name="password" value={routerPassword} />
        <input type="hidden" name="dst" value={userOrigUrl} />
      </form>

      {/* Pure Full-Viewport Splash Page Container (No Top Admin Bar, No Scope Selector, No Internal Footers) */}
      <main
        className="flex-1 min-h-screen relative flex flex-col justify-between items-center p-4 sm:p-6 bg-cover bg-center transition-all duration-500"
        style={{
          backgroundImage: `url(${currentConfig.bgImage})`
        }}
      >
        {/* Configured Darken Overlay */}
        <div
          className="absolute inset-0 bg-black pointer-events-none transition-opacity"
          style={{ opacity: (currentConfig.bgDarken ?? 35) / 100 }}
        />

        {/* Top Brand & Welcome Headline (Only rendered if configured in Visual Builder) */}
        <div className="relative z-10 text-center max-w-md w-full pt-6 pb-2">
          {(currentConfig.brandTitle?.trim() || currentConfig.tagline?.trim()) && (
            <div className="text-xs font-semibold text-white/90 tracking-wide mb-1.5 drop-shadow">
              {[currentConfig.brandTitle?.trim(), currentConfig.tagline?.trim()].filter(Boolean).join(' · ')}
            </div>
          )}
          {currentConfig.welcomeHeadline?.trim() && (
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-lg leading-tight">
              {currentConfig.welcomeHeadline}
            </h1>
          )}
        </div>

        {/* Aligned Glassmorphism Captive Portal Card */}
        <div
          className={`relative z-10 w-full max-w-md ${
            currentConfig.cardPlacement === 'top'
              ? 'mb-auto mt-2'
              : currentConfig.cardPlacement === 'bottom'
              ? 'mt-auto mb-4'
              : 'my-auto'
          }`}
        >
          {statusBanner && (
            <div className="mb-3 p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 backdrop-blur-md text-xs text-amber-200 flex items-center gap-2 shadow-lg">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
              <span>{statusBanner}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 1: FREE WI-FI SIGN-UP (Only when Free Access Mode is ON)     */}
          {/* ================================================================= */}
          {portalStep === 'identification' && isFreeAccessAllowed && (
            <div
              className="rounded-3xl p-5 sm:p-6 border border-white/20 shadow-2xl backdrop-blur-xl space-y-3.5 text-left"
              style={{
                backgroundColor: `rgba(15, 20, 34, ${(currentConfig.glassOpacity ?? 88) / 100})`
              }}
            >
              {/* Mode Quick Tabs: Free / Voucher / Buy Pass */}
              <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setPortalStep('identification')}
                  className="py-2 rounded-lg font-bold bg-[#f05e17] text-white shadow flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Free Wi-Fi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalStep('voucher')}
                  className="py-2 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalStep('plan')}
                  className="py-2 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Buy Pass</span>
                </button>
              </div>

              {renderGuestIdentificationInputs()}

              {currentConfig.termsEnabled && (
                <div className="text-[11px] text-slate-300 leading-relaxed bg-black/35 p-2.5 rounded-xl border border-white/10">
                  {currentConfig.termsText}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleConnectFree}
                  disabled={!isGuestFormValid || isConnecting}
                  className="w-full py-3 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isConnecting ? 'Connecting...' : (currentConfig.buttonText || 'Connect Free Wi-Fi \u2192')}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: VOUCHER CODE LOGIN                                        */}
          {/* ================================================================= */}
          {portalStep === 'voucher' && (
            <form
              onSubmit={handleRedeemVoucher}
              className="rounded-3xl p-5 sm:p-6 border border-white/20 shadow-2xl backdrop-blur-xl space-y-3.5 text-left"
              style={{
                backgroundColor: `rgba(15, 20, 34, ${(currentConfig.glassOpacity ?? 88) / 100})`
              }}
            >
              {/* Mode Quick Tabs */}
              <div className={`grid ${isFreeAccessAllowed ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs`}>
                {isFreeAccessAllowed && (
                  <button
                    type="button"
                    onClick={() => setPortalStep('identification')}
                    className="py-2 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Free Wi-Fi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPortalStep('voucher')}
                  className="py-2 rounded-lg font-bold bg-[#f05e17] text-white shadow flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Voucher Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalStep('plan')}
                  className="py-2 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Buy Pass</span>
                </button>
              </div>

              {renderGuestIdentificationInputs()}

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1.5">
                  Voucher Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => {
                    setVoucherCode(e.target.value);
                    setVoucherError(null);
                  }}
                  placeholder="Enter voucher code (e.g. TC-XXXX)"
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/25 focus:border-emerald-400 rounded-xl text-white text-sm font-mono tracking-wider uppercase focus:outline-none"
                />
                {voucherError && (
                  <div className="mt-2 p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{voucherError}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isConnecting || !isGuestFormValid}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isConnecting ? 'Verifying Voucher...' : 'Activate Voucher & Connect \u2192'}</span>
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
              <div className={`grid ${isFreeAccessAllowed ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs`}>
                {isFreeAccessAllowed && (
                  <button
                    type="button"
                    onClick={() => setPortalStep('identification')}
                    className="py-2 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Free Wi-Fi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPortalStep('voucher')}
                  className="py-2 rounded-lg font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Voucher Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPortalStep('plan')}
                  className="py-2 rounded-lg font-bold bg-[#f05e17] text-white shadow flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Buy Pass</span>
                </button>
              </div>

              {renderGuestIdentificationInputs()}

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                              <span className="text-[10px] text-amber-400 font-medium">
                                · Popular
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {plan.durationLabel} · {plan.downloadSpeedMbps} Mbps
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-black font-mono tabular-nums text-amber-400">
                        {currencySymbol}{plan.price}
                      </div>
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={!isGuestFormValid}
                onClick={() => {
                  setPaymentError(null);
                  setPortalStep('payment');
                }}
                className="w-full py-3 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: ECOCASH & 12-DIGIT OTT VOUCHER PAYMENT (M-Pesa Removed)   */}
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
                <span className="text-xs font-bold text-white">
                  Choose Payment Method
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentError(null);
                    setPortalStep('plan');
                  }}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  &larr; Plans
                </button>
              </div>

              {/* 2-Column Payment Selector: EcoCash & OTT Voucher Only */}
              <div className="grid grid-cols-2 gap-2.5">
                {(['ecocash', 'ottvoucher'] as const).map((gw) => (
                  <button
                    key={gw}
                    type="button"
                    onClick={() => {
                      setSelectedGateway(gw);
                      setPaymentError(null);
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      selectedGateway === gw
                        ? 'bg-[#f05e17]/20 border-[#f05e17] text-white'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ProviderLogo provider={gw as GatewayProvider} className="w-8 h-8" />
                    <span className="text-xs font-bold">
                      {gw === 'ecocash' ? 'EcoCash' : 'OTT Voucher'}
                    </span>
                  </button>
                ))}
              </div>

              {selectedGateway === 'ottvoucher' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-300">
                      12-Digit OTT Voucher PIN <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      {ottPin.length}/12 digits
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    required
                    value={ottPin}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setOttPin(onlyDigits);
                      setPaymentError(null);
                    }}
                    placeholder="Enter 12-digit OTT PIN"
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/25 focus:border-[#f05e17] rounded-xl text-white text-sm font-mono tabular-nums tracking-widest focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">
                    EcoCash Mobile Number ({guestCountryCode}) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={guestPhone}
                    onChange={(e) => {
                      setGuestPhone(e.target.value.replace(/[^\d\s-]/g, ''));
                      setPaymentError(null);
                    }}
                    placeholder="5xxxxxxx / 6xxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-white/25 focus:border-[#f05e17] rounded-xl text-white text-sm font-mono tabular-nums focus:outline-none"
                  />
                </div>
              )}

              {paymentError && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{paymentError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isConnecting || (selectedGateway === 'ottvoucher' && ottPin.length !== 12)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isConnecting ? 'Verifying Payment...' : 'Pay & Connect Internet \u2192'}</span>
              </button>
            </form>
          )}

          {/* ================================================================= */}
          {/* STEP 5: CONSUMER-FACING CONNECTED CONFIRMATION                    */}
          {/* ================================================================= */}
          {portalStep === 'usage' && (
            <div
              className="rounded-3xl p-6 border border-emerald-500/40 shadow-2xl backdrop-blur-xl space-y-4 text-center"
              style={{
                backgroundColor: `rgba(10, 18, 30, 0.92)`
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <div className="text-xs font-semibold text-emerald-400 mb-1">
                  You're Connected
                </div>
                <h2 className="text-xl font-black text-white">{connectedPlanName}</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Active Package · {connectedDurationLabel}
                </p>
              </div>

              <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 text-center">
                <span className="text-[11px] text-slate-400 block mb-0.5">Session Time Remaining</span>
                <span className="text-emerald-400 font-bold text-base font-mono tabular-nums">
                  {formatTimer(remainingSeconds)}
                </span>
              </div>

              <form
                method="POST"
                action={linkLoginOnly || `http://${routerGatewayIp}/login`}
                className="space-y-2"
              >
                <input type="hidden" name="username" value={routerUsername} />
                <input type="hidden" name="password" value={routerPassword} />
                <input type="hidden" name="dst" value={userOrigUrl} />
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  <span>Continue to Internet &rarr;</span>
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="h-4" />
      </main>
    </div>
  );
};
