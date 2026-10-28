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
  AlertCircle,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { storage } from '../../services/storage';
import { ScopePortalConfig, VerticalType, GatewayProvider, SponsorAdConfig, VideoAdItem } from '../../types';
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

  const [activeScope, setActiveScope] = useState<VerticalType>(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search).get('scope') as VerticalType | null;
      if (sp && DEFAULT_SCOPE_CONFIGS[sp]) return sp;
    }
    return 'hotspot';
  });
  const [scopeConfigs, setScopeConfigs] = useState<Record<VerticalType, ScopePortalConfig>>(() => ({
    hotspot: loadLocalScopeConfig('hotspot'),
    village: loadLocalScopeConfig('community'),
    community: loadLocalScopeConfig('community'),
    park: loadLocalScopeConfig('park'),
    bus: loadLocalScopeConfig('bus'),
    stadium: loadLocalScopeConfig('stadium')
  }));

  const currentConfig = scopeConfigs[activeScope] || DEFAULT_SCOPE_CONFIGS.hotspot;
  const activeMeta = SCOPE_LIST.find((s) => s.id === activeScope) || SCOPE_LIST[0];
  const isFreeAccessAllowed = Boolean(currentConfig.allowFreeAccess);
  const isVoucherAllowed = currentConfig.allowVoucherCode !== false;
  const isBuyPassAllowed = currentConfig.allowOnlinePayment !== false;
  const isTermsRequired = currentConfig.termsEnabled !== false;
  const accentColor = currentConfig.accentColor || '#f05e17';

  // MikroTik Hotspot URL Parameters passed from hotspot/login.html redirect
  const [clientMac, setClientMac] = useState('');
  const [clientIp, setClientIp] = useState('');
  const [linkLoginOnly, setLinkLoginOnly] = useState(`http://${routerGatewayIp}/login`);
  const [hasExplicitRouterLogin, setHasExplicitRouterLogin] = useState(false);
  const [userOrigUrl, setUserOrigUrl] = useState('https://www.google.com');

  // Splash Flow Step: 'identification' | 'plan' | 'voucher' | 'payment' | 'video_ad'
  const [portalStep, setPortalStep] = useState<'identification' | 'plan' | 'voucher' | 'payment' | 'video_ad'>(
    isFreeAccessAllowed ? 'identification' : isVoucherAllowed ? 'voucher' : 'plan'
  );

  // Video Ad Interstitial & 3h / 2GB Re-Trigger State
  const [sponsorAdConfig, setSponsorAdConfig] = useState<SponsorAdConfig>(() => storage.getSponsorAdConfig());
  const [adTriggerReason, setAdTriggerReason] = useState<'post_auth' | 'retrigger'>('post_auth');
  const [adElapsedSec, setAdElapsedSec] = useState(0);
  const [adDurationSec, setAdDurationSec] = useState(15);
  const [isAdUnlocked, setIsAdUnlocked] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [carouselSlideIdx, setCarouselSlideIdx] = useState(0);
  const touchStartXRef = useRef<number>(0);
  const touchDraggedRef = useRef<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Mandatory Terms & Conditions Checkbox + Popup Modal State (Enforced when termsEnabled is on)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const isTermsSatisfied = !isTermsRequired || termsAccepted;

  // Guest Registration Fields (100% empty initial state — collected across all modes and synced to Admin)
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestSurname, setGuestSurname] = useState('');
  const [guestCountryCode, setGuestCountryCode] = useState<'+266' | '+27'>('+266');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Plan & Payment State (Strictly EcoCash and OTT Voucher only)
  const enabledPlans = currentConfig.plans.filter((p) => p.enabled !== false);
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

  const hiddenFormRef = useRef<HTMLFormElement | null>(null);
  const [routerUsername, setRouterUsername] = useState('test');
  const [routerPassword, setRouterPassword] = useState('123');
  const routerAuthSentRef = useRef<boolean>(false);

  // Refs for glitch-free digest-based background polling
  const lastConfigDigestRef = useRef<string>('');
  const lastAdDigestRef = useRef<string>('');
  const hasHydratedServerConfigRef = useRef<boolean>(false);
  const hasExplicitStepParamRef = useRef<boolean>(false);
  const isConnectingRef = useRef<boolean>(false);
  const portalStepRef = useRef(portalStep);
  const activeScopeRef = useRef(activeScope);

  useEffect(() => {
    isConnectingRef.current = isConnecting;
  }, [isConnecting]);

  useEffect(() => {
    portalStepRef.current = portalStep;
  }, [portalStep]);

  useEffect(() => {
    activeScopeRef.current = activeScope;
  }, [activeScope]);

  // Ensure selectedPlanId is always valid if Admin toggles plans on the dashboard
  useEffect(() => {
    if (enabledPlans.length > 0 && !enabledPlans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(enabledPlans[0].id);
    }
  }, [enabledPlans, selectedPlanId]);

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
      if (loginUrl && !loginUrl.includes('$(')) {
        setLinkLoginOnly(loginUrl);
        setHasExplicitRouterLogin(true);
      }
      if (origUrl && !origUrl.includes('$(')) setUserOrigUrl(origUrl);
      if (scopeParam && DEFAULT_SCOPE_CONFIGS[scopeParam]) {
        setActiveScope(scopeParam);
      }
      if (stepParam === 'plan' || stepParam === 'voucher' || stepParam === 'video_ad' || stepParam === 'identification') {
        hasExplicitStepParamRef.current = true;
        setPortalStep(stepParam);
      }
      const reasonParam = params.get('reason');
      if (reasonParam === 'retrigger') {
        hasExplicitStepParamRef.current = true;
        setAdTriggerReason('retrigger');
        setPortalStep('video_ad');
      }
    }
  }, [routerGatewayIp]);

  // Poll live splash configuration saved on the VPS server + localStorage events using digest comparison
  // so guest phones receive admin updates in real time WITHOUT layout flashes or state resets during typing/connection
  useEffect(() => {
    let mounted = true;
    const syncLocal = () => {
      if (!mounted || isConnectingRef.current || portalStepRef.current === 'video_ad') return;
      const nextConfigs: Record<VerticalType, ScopePortalConfig> = {
        hotspot: loadLocalScopeConfig('hotspot'),
        village: loadLocalScopeConfig('community'),
        community: loadLocalScopeConfig('community'),
        park: loadLocalScopeConfig('park'),
        bus: loadLocalScopeConfig('bus'),
        stadium: loadLocalScopeConfig('stadium')
      };
      const digest = JSON.stringify(nextConfigs);
      if (digest !== lastConfigDigestRef.current) {
        lastConfigDigestRef.current = digest;
        setScopeConfigs(nextConfigs);
      }
      const localAd = storage.getSponsorAdConfig();
      const adDigest = JSON.stringify(localAd);
      if (adDigest !== lastAdDigestRef.current) {
        lastAdDigestRef.current = adDigest;
        setSponsorAdConfig(localAd);
      }
    };

    const fetchConfig = () => {
      // Never interrupt an active connection handshake or post-auth video ad with background config polls
      if (isConnectingRef.current || portalStepRef.current === 'video_ad') return;

      fetch('/api/portal/config')
        .then((res) => res.json())
        .then((data) => {
          if (!mounted || isConnectingRef.current || portalStepRef.current === 'video_ad') return;
          if (data?.success && data?.configs && typeof data.configs === 'object') {
            const incomingDigest = JSON.stringify(data.configs);
            if (incomingDigest !== lastConfigDigestRef.current) {
              lastConfigDigestRef.current = incomingDigest;
              // Cache server configs to localStorage so subsequent opens have 0ms hydration
              if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
                Object.entries(data.configs).forEach(([k, v]) => {
                  try {
                    window.localStorage.setItem(`tconnect_portal_scope_${k}`, JSON.stringify(v));
                  } catch {}
                });
              }
              setScopeConfigs((prev) => {
                const merged = { ...prev, ...data.configs };
                if (!hasHydratedServerConfigRef.current) {
                  hasHydratedServerConfigRef.current = true;
                  const targetCfg = merged[activeScopeRef.current] || merged.hotspot || DEFAULT_SCOPE_CONFIGS.hotspot;
                  if (!hasExplicitStepParamRef.current) {
                    const preferredStep = targetCfg.allowFreeAccess
                      ? 'identification'
                      : targetCfg.allowVoucherCode !== false
                      ? 'voucher'
                      : 'plan';
                    setPortalStep(preferredStep);
                  }
                }
                return merged;
              });
            }
          }
        })
        .catch(() => {});

      fetch('/api/portal/video-ads')
        .then((res) => res.json())
        .then((data) => {
          if (!mounted || isConnectingRef.current || portalStepRef.current === 'video_ad') return;
          if (data?.success && data?.sponsorAd && typeof data.sponsorAd === 'object') {
            const adDigest = JSON.stringify(data.sponsorAd);
            if (adDigest !== lastAdDigestRef.current) {
              lastAdDigestRef.current = adDigest;
              setSponsorAdConfig((prev) => ({ ...prev, ...data.sponsorAd }));
            }
          }
        })
        .catch(() => {});
    };

    fetchConfig();
    const timer = setInterval(fetchConfig, 3000);
    const unsubStorage = storage.subscribe(syncLocal);
    const handleStorageEvent = () => syncLocal();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent);
    }
    return () => {
      mounted = false;
      clearInterval(timer);
      unsubStorage();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent);
      }
    };
  }, []);

  const activeVideoAd: VideoAdItem | null = React.useMemo(() => {
    if (!sponsorAdConfig.enabled) return null;
    const lib = sponsorAdConfig.videoLibrary || [];
    const normScope = activeScope === 'village' ? 'community' : activeScope;
    return (
      lib.find((v) => v.enabled && v.mediaType === 'image_carousel' && (v.targetScope === normScope || v.targetScope === activeScope)) ||
      lib.find((v) => v.enabled && v.mediaType === 'image_carousel' && v.targetScope === 'all') ||
      lib.find((v) => v.enabled && (v.targetScope === normScope || v.targetScope === activeScope)) ||
      lib.find((v) => v.enabled && v.targetScope === 'all') ||
      lib.find((v) => v.enabled) ||
      null
    );
  }, [sponsorAdConfig, activeScope]);

  // Preload active background wallpaper and sponsor ad slides so transitions have zero flicker
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentConfig.bgImage) {
      const bgImg = new Image();
      bgImg.src = currentConfig.bgImage;
    }
    if (activeVideoAd?.slides && Array.isArray(activeVideoAd.slides)) {
      activeVideoAd.slides.forEach((sl) => {
        if (sl?.imageUrl) {
          const adImg = new Image();
          adImg.src = sl.imageUrl;
        }
      });
    }
  }, [currentConfig.bgImage, activeVideoAd]);

  const releaseAndCloseSplash = () => {
    const dstUrl = userOrigUrl && !userOrigUrl.includes('$(') ? userOrigUrl : 'https://www.google.com';
    // Only submit hidden form if connected through a physical MikroTik router and not yet submitted
    if ((clientMac || hasExplicitRouterLogin) && !routerAuthSentRef.current) {
      routerAuthSentRef.current = true;
      try {
        if (hiddenFormRef.current) {
          hiddenFormRef.current.submit();
        }
      } catch {}
    }
    try {
      window.close();
    } catch {}
    try {
      window.open('', '_self', '');
      window.close();
    } catch {}
    if (typeof window !== 'undefined') {
      if (window.top && window.top !== window.self) {
        try {
          window.top.location.replace(dstUrl);
          return;
        } catch {}
      }
      window.location.replace(dstUrl);
    }
  };

  const startOrEnterConnectedSession = (reason: 'post_auth' | 'retrigger' = 'post_auth') => {
    if (sponsorAdConfig.enabled && activeVideoAd) {
      setAdTriggerReason(reason);
      setAdElapsedSec(0);
      setCarouselSlideIdx(0);
      setIsAdUnlocked(true);
      storage.recordVideoAdImpression(activeVideoAd.id);
      setPortalStep('video_ad');
    } else {
      releaseAndCloseSplash();
    }
  };

  const handleCloseAdAndEnjoyInternet = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    releaseAndCloseSplash();
  };

  // Immediately switch active login mode if Admin turns off Free Wi-Fi, Voucher, or Buy Pass in real time
  useEffect(() => {
    if (portalStep === 'identification' && !isFreeAccessAllowed) {
      if (isVoucherAllowed) setPortalStep('voucher');
      else if (isBuyPassAllowed) setPortalStep('plan');
    } else if (portalStep === 'voucher' && !isVoucherAllowed) {
      if (isFreeAccessAllowed) setPortalStep('identification');
      else if (isBuyPassAllowed) setPortalStep('plan');
    } else if ((portalStep === 'plan' || portalStep === 'payment') && !isBuyPassAllowed) {
      if (isFreeAccessAllowed) setPortalStep('identification');
      else if (isVoucherAllowed) setPortalStep('voucher');
    }
  }, [isFreeAccessAllowed, isVoucherAllowed, isBuyPassAllowed, portalStep]);

  // Guest Input Validation (Strictly enforces currentConfig.collectName, collectPhone, collectEmail)
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

  // Video Ad / Multi-Image Ad countdown & unlock timer when in 'video_ad' step
  useEffect(() => {
    if (portalStep !== 'video_ad' || !activeVideoAd) return;
    const isCarousel = activeVideoAd.mediaType === 'image_carousel' && Array.isArray(activeVideoAd.slides) && activeVideoAd.slides.length > 0;
    const watchMode = activeVideoAd.watchMode || 'full_video';
    const skipTarget = Math.max(1, Number(activeVideoAd.skipAfterSec) || 5);
    const timer = setInterval(() => {
      setAdElapsedSec((prev) => {
        const next = prev + 1;
        if ((watchMode === 'skip_after_sec' || isCarousel) && next >= skipTarget) {
          setIsAdUnlocked(true);
        } else if (watchMode === 'full_video' && !isCarousel && next >= Math.max(adDurationSec, 15)) {
          setIsAdUnlocked(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [portalStep, activeVideoAd, adDurationSec]);

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
        expiresAt: new Date(Date.now() + (payload.durationSeconds || 86400) * 1000).toISOString(),
        remainingSeconds: payload.durationSeconds,
        bytesDown: 0,
        bytesUp: 0,
        speedLimit: payload.speedLimit || '25M/10M',
        guestName: fullGuestName,
        guestPhone: fullGuestPhone,
        guestEmail: guestEmail.trim()
      });
    } catch {}

    // 2. Post to VPS backend so Admin Dashboard & Scoped Partner Webhooks receive the lead immediately
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
          speedLimit: payload.speedLimit || '25M/10M',
          termsAccepted: isTermsSatisfied,
          sponsorCampaign: activeVideoAd?.sponsorName || currentConfig.brandTitle || 'T-Connect Hotspot'
        })
      });
    } catch {}
  };

  /**
   * Authenticates the client device with the MikroTik Hotspot gateway (10.10.0.1/login)
   * Uses a single non-blocking background request when on a physical router to prevent double-submit page glitches.
   */
  const authorizeOnMikroTikRouter = (username = 'test', password = '123') => {
    setRouterUsername(username);
    setRouterPassword(password);
    if (!clientMac && !hasExplicitRouterLogin) {
      return;
    }
    const targetLoginUrl = linkLoginOnly || `http://${routerGatewayIp}/login`;
    routerAuthSentRef.current = true;
    try {
      const authUrl = `${targetLoginUrl}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&dst=${encodeURIComponent(userOrigUrl)}`;
      fetch(authUrl, { mode: 'no-cors', credentials: 'include' }).catch(() => {});
    } catch {}
  };

  // Connect Free Wi-Fi (Unlimited — Only when Free Access is enabled by Admin)
  const handleConnectFree = async () => {
    if (!isTermsSatisfied || !isGuestFormValid || isConnecting) return;
    isConnectingRef.current = true;
    setIsConnecting(true);
    setStatusBanner('Activating your unlimited free Wi-Fi...');

    const vCode = `FREE-${cleanPhoneDigits.slice(-4) || Math.floor(1000 + Math.random() * 9000)}`;
    await syncGuestSessionToAdmin({
      mode: 'free',
      planName: 'Free Wi-Fi (Unlimited)',
      durationSeconds: 0,
      voucherCode: vCode,
      amount: 0,
      speedLimit: '25M/10M'
    });

    authorizeOnMikroTikRouter('T-TRIAL', '123');
    setIsConnecting(false);
    isConnectingRef.current = false;
    setStatusBanner(null);
    startOrEnterConnectedSession('post_auth');
  };

  // Redeem Voucher Code (Strictly verifies against active platform / OTT Lesotho API)
  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherError(null);

    if (!isTermsSatisfied) {
      setVoucherError('Please tick the Terms & Conditions box to proceed.');
      return;
    }

    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setVoucherError('Please enter your voucher code.');
      return;
    }

    isConnectingRef.current = true;
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
          scope: activeScope,
          firstName: guestFirstName.trim(),
          lastName: guestSurname.trim(),
          guestName: [guestFirstName.trim(), guestSurname.trim()].filter(Boolean).join(' '),
          countryCode: guestCountryCode,
          phone: guestPhone.trim(),
          guestPhone: guestPhone.trim() ? `${guestCountryCode} ${guestPhone.trim()}` : '',
          guestEmail: guestEmail.trim()
        })
      });
      const apiData = await apiRes.json().catch(() => ({ success: false }));

      const isVerified = Boolean(localRes.success || (apiRes.ok && apiData.success));

      if (!isVerified) {
        setIsConnecting(false);
        isConnectingRef.current = false;
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
      isConnectingRef.current = false;
      setStatusBanner(null);
      startOrEnterConnectedSession('post_auth');
    } catch {
      setIsConnecting(false);
      isConnectingRef.current = false;
      setStatusBanner(null);
      setVoucherError('Could not verify voucher at this time. Please try again.');
    }
  };

  // Complete EcoCash or 16-Digit OTT Voucher Payment
  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!isTermsSatisfied) {
      setPaymentError('Please tick the Terms & Conditions box to proceed.');
      return;
    }

    const selectedPlan = enabledPlans.find((p) => p.id === selectedPlanId) || currentConfig.plans[0];
    const cleanPin = ottPin.replace(/\D/g, '');

    if (selectedGateway === 'ottvoucher') {
      if (cleanPin.length !== 16) {
        setPaymentError(`OTT Voucher PIN must be exactly 16 digits (${cleanPin.length}/16 digits entered).`);
        return;
      }
    } else if (selectedGateway === 'ecocash') {
      const normalizedPhone = cleanPhoneDigits.replace(/^0/, '');
      if (normalizedPhone.length < 8) {
        setPaymentError('Please enter a valid 8-digit EcoCash mobile number.');
        return;
      }
    }

    isConnectingRef.current = true;
    setIsConnecting(true);
    setStatusBanner(
      selectedGateway === 'ottvoucher'
        ? 'Verifying 16-digit OTT Voucher PIN with OTT Lesotho...'
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
          scope: activeScope,
          firstName: guestFirstName.trim(),
          lastName: guestSurname.trim(),
          guestName: [guestFirstName.trim(), guestSurname.trim()].filter(Boolean).join(' '),
          guestEmail: guestEmail.trim()
        })
      });

      const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from payment server.' }));

      if (!response.ok || !data.success) {
        setIsConnecting(false);
        isConnectingRef.current = false;
        setStatusBanner(null);
        setPaymentError(
          data.message ||
            (selectedGateway === 'ottvoucher'
              ? 'OTT Voucher PIN verification failed. Please enter a valid 16-digit OTT Voucher PIN.'
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
      isConnectingRef.current = false;
      setStatusBanner(null);
      startOrEnterConnectedSession('post_auth');
    } catch {
      setIsConnecting(false);
      isConnectingRef.current = false;
      setStatusBanner(null);
      setPaymentError('Network error communicating with payment gateway. Please try again.');
    }
  };

  const currencySymbol = 'M';

  // Reusable Mandatory Terms & Conditions Checkbox + Hyperlink Row (Enforced when termsEnabled is ON in Dashboard)
  const renderTermsAndConditionsRow = () => {
    if (!isTermsRequired) return null;
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#121829] border border-[#232d42] text-[10px] text-slate-200">
        <input
          type="checkbox"
          id="portal_tc_checkbox"
          checked={termsAccepted}
          onChange={(e) => {
            setTermsAccepted(e.target.checked);
            if (e.target.checked) {
              setVoucherError(null);
              setPaymentError(null);
            }
          }}
          style={{ accentColor }}
          className="w-3.5 h-3.5 rounded cursor-pointer shrink-0"
        />
        <label htmlFor="portal_tc_checkbox" className="cursor-pointer leading-tight select-none">
          I agree to the{' '}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsTermsModalOpen(true);
            }}
            className="text-sky-400 hover:text-sky-300 underline font-bold cursor-pointer"
          >
            Terms &amp; Conditions
          </button>{' '}
          <span className="text-[9px] text-slate-400">(T&apos;s and C&apos;s apply)</span>
        </label>
      </div>
    );
  };

  // Reusable Guest Identification Fields Component (Compact for clear background visibility)
  const renderGuestIdentificationInputs = () => {
    if (!currentConfig.collectName && !currentConfig.collectPhone && !currentConfig.collectEmail) {
      return null;
    }

    return (
      <div className="space-y-1.5 pb-1 border-b border-[#232d42]">
        {currentConfig.collectName && (
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] font-medium text-slate-300 block mb-0.5">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={guestFirstName}
                onChange={(e) => setGuestFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-2.5 py-1 bg-[#121829] border border-[#232d42] focus:border-[#f05e17] rounded-lg text-white text-[11px] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-300 block mb-0.5">
                Surname <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={guestSurname}
                onChange={(e) => setGuestSurname(e.target.value)}
                placeholder="Surname"
                className="w-full px-2.5 py-1 bg-[#121829] border border-[#232d42] focus:border-[#f05e17] rounded-lg text-white text-[11px] focus:outline-none"
              />
            </div>
          </div>
        )}

        {currentConfig.collectPhone && (
          <div>
            <label className="text-[10px] font-medium text-slate-300 block mb-0.5">
              Mobile Number <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={guestCountryCode}
                onChange={(e) => setGuestCountryCode(e.target.value as '+266' | '+27')}
                className="px-2 py-1 bg-[#121829] border border-[#232d42] rounded-lg text-white text-[11px] font-mono focus:outline-none cursor-pointer shrink-0"
              >
                <option value="+266" className="bg-[#0b0f19] text-white">+266 (LS)</option>
                <option value="+27" className="bg-[#0b0f19] text-white">+27 (ZA)</option>
              </select>
              <input
                type="tel"
                inputMode="numeric"
                required
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                placeholder={guestCountryCode === '+266' ? '5xxxxxxx / 6xxxxxxx' : '07xxxxxxxx'}
                className="w-full px-2.5 py-1 bg-[#121829] border border-[#232d42] focus:border-[#f05e17] rounded-lg text-white text-[11px] font-mono focus:outline-none"
              />
            </div>
          </div>
        )}

        {currentConfig.collectEmail && (
          <div>
            <label className="text-[10px] font-medium text-slate-300 block mb-0.5">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-2.5 py-1 bg-[#121829] border border-[#232d42] focus:border-[#f05e17] rounded-lg text-white text-[11px] focus:outline-none"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="portal-isolated-theme min-h-screen bg-[#05070c] text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden">
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

      {/* Terms & Conditions Popup Modal Overlay */}
      {isTermsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsTermsModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#0f1422] border border-white/20 p-4 shadow-2xl space-y-3 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Terms &amp; Conditions (T&apos;s &amp; C&apos;s)
              </h3>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto text-[11px] text-slate-300 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/10 whitespace-pre-wrap">
              {currentConfig.termsText || 'By connecting to T-Connect Wi-Fi, you agree to our acceptable use policy, fair bandwidth allocation, and sponsor media terms.'}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTermsAccepted(true);
                  setVoucherError(null);
                  setPaymentError(null);
                  setIsTermsModalOpen(false);
                }}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Agree &amp; Continue
              </button>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="px-3 py-2 bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* FULL-SCREEN EDGE-TO-EDGE AD (100vw x 100vh) — Sliding Pictures/Video */}
      {/* ================================================================= */}
      {portalStep === 'video_ad' && activeVideoAd && (() => {
        const isCarousel =
          activeVideoAd.mediaType === 'image_carousel' &&
          Array.isArray(activeVideoAd.slides) &&
          activeVideoAd.slides.length > 0;
        const slides = activeVideoAd.slides || [];
        const currentSlide = slides[carouselSlideIdx] || slides[0];

        return (
          <div
            className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden select-none cursor-pointer"
            onClick={() => {
              if (touchDraggedRef.current) {
                touchDraggedRef.current = false;
                return;
              }
              const targetUrl = isCarousel
                ? currentSlide?.redirectUrl || activeVideoAd.destinationUrl
                : activeVideoAd.destinationUrl;
              if (targetUrl) {
                storage.recordVideoAdClick(activeVideoAd.id);
                window.open(targetUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            onTouchStart={(e) => {
              touchDraggedRef.current = false;
              if (e.touches && e.touches[0]) {
                touchStartXRef.current = e.touches[0].clientX;
              }
            }}
            onTouchEnd={(e) => {
              if (!isCarousel || slides.length <= 1) return;
              if (!e.changedTouches || !e.changedTouches[0]) return;
              const diff = e.changedTouches[0].clientX - touchStartXRef.current;
              if (Math.abs(diff) > 35) {
                touchDraggedRef.current = true;
                if (diff < 0) {
                  setCarouselSlideIdx((prev) => (prev + 1) % slides.length);
                } else {
                  setCarouselSlideIdx((prev) => (prev - 1 + slides.length) % slides.length);
                }
              }
            }}
          >
            {/* Horizontal Sliding Picture Track OR Full-Screen Video */}
            {isCarousel ? (
              <div
                className="flex w-full h-full transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(-${carouselSlideIdx * 100}%)`
                }}
              >
                {slides.map((sl, idx) => (
                  <div key={sl.id || idx} className="w-screen h-screen shrink-0 relative bg-black">
                    <img
                      src={sl.imageUrl || activeVideoAd.videoUrl}
                      alt={sl.caption || activeVideoAd.title}
                      className="w-screen h-screen object-cover block bg-black"
                      draggable={false}
                    />
                    {sl.caption && (
                      <div className="absolute bottom-20 inset-x-4 z-30 flex justify-center pointer-events-none">
                        <div className="px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-bold text-center max-w-md shadow-2xl">
                          {sl.caption}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <video
                ref={videoRef}
                src={activeVideoAd.videoUrl}
                playsInline
                autoPlay
                muted={isVideoMuted}
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration;
                  if (dur && !isNaN(dur) && isFinite(dur)) {
                    setAdDurationSec(Math.ceil(dur));
                  }
                }}
                onEnded={() => setIsAdUnlocked(true)}
                onError={() => setIsAdUnlocked(true)}
                className="w-screen h-screen object-cover block bg-black"
              />
            )}

            {/* Top-Left Sponsor Info & Slide Hint */}
            <div
              className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/75 backdrop-blur-md border border-white/25 text-white text-xs font-bold shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-xs">
                {activeVideoAd.sponsorName || 'T-Connect Partner Offer'}
              </span>
              {isCarousel && slides.length > 1 && (
                <span className="text-[10px] text-amber-300 font-mono pl-1 border-l border-white/20">
                  Slide {carouselSlideIdx + 1}/{slides.length}
                </span>
              )}
            </div>

            {/* Top-Right Immediate X Close Button (Releases straight to connectivity) */}
            <div
              className="fixed top-4 right-4 z-50 flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleCloseAdAndEnjoyInternet}
                aria-label="Close ad and enjoy connectivity"
                title="Close ad and use internet"
                className="w-11 h-11 rounded-full bg-black/85 hover:bg-rose-600 text-white border-2 border-white/50 shadow-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <X className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            {/* Left & Right Slide Arrows for Multi-Picture Series */}
            {isCarousel && slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCarouselSlideIdx((prev) => (prev - 1 + slides.length) % slides.length);
                  }}
                  aria-label="Previous picture"
                  className="fixed left-3 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-black/75 hover:bg-black/90 border border-white/35 text-white flex items-center justify-center shadow-2xl cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCarouselSlideIdx((prev) => (prev + 1) % slides.length);
                  }}
                  aria-label="Next picture"
                  className="fixed right-3 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-black/75 hover:bg-black/90 border border-white/35 text-white flex items-center justify-center shadow-2xl cursor-pointer active:scale-95"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Bottom Controls: Pagination Dots + Slide Hint for Pictures OR Audio Mute for Video */}
            {isCarousel && slides.length > 0 ? (
              <div
                className="fixed bottom-5 inset-x-4 z-50 flex flex-col items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-white/25 shadow-2xl">
                  {slides.map((sl, idx) => (
                    <button
                      key={sl.id || idx}
                      type="button"
                      onClick={() => setCarouselSlideIdx(idx)}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        idx === carouselSlideIdx ? 'w-7 bg-[#f05e17]' : 'w-2.5 bg-white/45 hover:bg-white/80'
                      }`}
                      aria-label={`View picture ${idx + 1}`}
                    />
                  ))}
                  <span className="text-[11px] text-slate-200 font-mono font-bold ml-1.5">
                    Swipe or tap arrows &rarr;
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVideoMuted((prev) => {
                    const next = !prev;
                    if (videoRef.current) videoRef.current.muted = next;
                    return next;
                  });
                }}
                className="fixed bottom-4 left-4 z-50 px-3.5 py-2 rounded-full bg-black/75 hover:bg-black/90 border border-white/25 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isVideoMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isVideoMuted ? 'Unmute' : 'Sound On'}</span>
              </button>
            )}
          </div>
        );
      })()}

      {/* Pure Full-Viewport Splash Page Container */}
      <main
        className="flex-1 min-h-screen relative flex flex-col justify-between items-center bg-cover bg-center transition-all duration-500 overflow-hidden"
        style={{
          backgroundImage: `url(${currentConfig.bgImage})`
        }}
      >
        {/* Configured Darken Overlay */}
        <div
          className="absolute inset-0 bg-black pointer-events-none transition-opacity"
          style={{ opacity: (currentConfig.bgDarken ?? 35) / 100 }}
        />

        {/* Top Brand & Welcome Headline (Compact so background wallpaper stays clear) */}
        <div className="relative z-10 text-center max-w-sm w-full pt-4 pb-2 px-4">
          {(currentConfig.brandTitle?.trim() || currentConfig.tagline?.trim()) && (
            <div className="text-[11px] font-semibold text-white/95 tracking-wide mb-0.5 drop-shadow">
              {[currentConfig.brandTitle?.trim(), currentConfig.tagline?.trim()].filter(Boolean).join(' · ')}
            </div>
          )}
          {currentConfig.welcomeHeadline?.trim() && (
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-lg leading-tight">
              {currentConfig.welcomeHeadline}
            </h1>
          )}
        </div>

        {/* Slim Docked Bottom Sheet Captive Portal Box (Docked at base with crisp border & solid dark background) */}
        <div className="relative z-10 w-full max-w-sm sm:max-w-md mt-auto mb-0 px-2 sm:px-3">
          {statusBanner && (
            <div className="mb-2 p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-200 flex items-center gap-2 shadow-lg">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
              <span>{statusBanner}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* DYNAMIC MODE QUICK TABS HELPER                                    */}
          {/* ================================================================= */}
          {(() => {
            const enabledModesCount =
              (isFreeAccessAllowed ? 1 : 0) +
              (isVoucherAllowed ? 1 : 0) +
              (isBuyPassAllowed ? 1 : 0);

            const renderModeQuickTabs = (activeTab: 'identification' | 'voucher' | 'plan') => {
              if (enabledModesCount <= 1) return null;
              const gridCols =
                enabledModesCount === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2';
              return (
                <div className={`grid ${gridCols} gap-1 bg-[#121829] p-0.5 rounded-lg border border-[#232d42] text-[10px]`}>
                  {isFreeAccessAllowed && (
                    <button
                      type="button"
                      onClick={() => setPortalStep('identification')}
                      className={`py-1 rounded-md font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                        activeTab === 'identification'
                          ? 'bg-[#f05e17] text-white shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>Free Wi-Fi</span>
                    </button>
                  )}
                  {isVoucherAllowed && (
                    <button
                      type="button"
                      onClick={() => setPortalStep('voucher')}
                      className={`py-1 rounded-md font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                        activeTab === 'voucher'
                          ? 'bg-[#f05e17] text-white shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Ticket className={`w-3 h-3 ${activeTab === 'voucher' ? 'text-white' : 'text-emerald-400'}`} />
                      <span>Voucher</span>
                    </button>
                  )}
                  {isBuyPassAllowed && (
                    <button
                      type="button"
                      onClick={() => setPortalStep('plan')}
                      className={`py-1 rounded-md font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                        activeTab === 'plan'
                          ? 'bg-[#f05e17] text-white shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Sparkles className={`w-3 h-3 ${activeTab === 'plan' ? 'text-white' : 'text-amber-400'}`} />
                      <span>Buy Pass</span>
                    </button>
                  )}
                </div>
              );
            };

            return (
              <>
                {/* ================================================================= */}
                {/* STEP 1: FREE WI-FI SIGN-UP (Only when Free Access Mode is ON)     */}
                {/* ================================================================= */}
                {portalStep === 'identification' && isFreeAccessAllowed && (
                  <div className="rounded-t-2xl rounded-b-none p-3 sm:p-3.5 bg-[#0b0f19] border-t border-x border-b-0 border-[#232d42] shadow-2xl space-y-2 text-left">
                    <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mb-1 shrink-0" />

                    {renderModeQuickTabs('identification')}

                    {renderGuestIdentificationInputs()}

                    {renderTermsAndConditionsRow()}

                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={handleConnectFree}
                        disabled={!isTermsSatisfied || !isGuestFormValid || isConnecting}
                        className="w-full py-2 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{isConnecting ? 'Connecting...' : 'Connect Free Wi-Fi \u2192'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* STEP 2: VOUCHER CODE LOGIN (Only when Voucher Mode is ON)         */}
                {/* ================================================================= */}
                {portalStep === 'voucher' && isVoucherAllowed && (
                  <form
                    onSubmit={handleRedeemVoucher}
                    className="rounded-t-2xl rounded-b-none p-3 sm:p-3.5 bg-[#0b0f19] border-t border-x border-b-0 border-[#232d42] shadow-2xl space-y-2 text-left"
                  >
                    <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mb-1 shrink-0" />

                    {renderModeQuickTabs('voucher')}

                    <div>
                      <label className="text-[10px] font-medium text-slate-300 block mb-0.5">
                        Voucher Code <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={voucherCode}
                        onChange={(e) => {
                          setVoucherCode(e.target.value);
                          setVoucherError(null);
                        }}
                        placeholder="Enter voucher code (e.g. TC-XXXX or 16-digit OTT PIN)"
                        className="w-full px-2.5 py-1.5 bg-[#121829] border border-[#232d42] focus:border-emerald-400 rounded-lg text-white text-xs font-mono tracking-wider uppercase focus:outline-none"
                      />
                      {voucherError && (
                        <div className="mt-1 p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-[10px] flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <span>{voucherError}</span>
                        </div>
                      )}
                    </div>

                    {renderTermsAndConditionsRow()}

                    <button
                      type="submit"
                      disabled={!isTermsSatisfied || isConnecting || !voucherCode.trim()}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isConnecting ? 'Verifying Voucher...' : 'Activate Voucher & Connect \u2192'}</span>
                    </button>
                  </form>
                )}

                {/* ================================================================= */}
                {/* STEP 3: PLAN SELECTION (Only when Buy Pass Mode is ON)            */}
                {/* ================================================================= */}
                {portalStep === 'plan' && isBuyPassAllowed && (
                  <div className="rounded-t-2xl rounded-b-none p-3 sm:p-3.5 bg-[#0b0f19] border-t border-x border-b-0 border-[#232d42] shadow-2xl space-y-2 text-left">
                    <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mb-1 shrink-0" />

                    {renderModeQuickTabs('plan')}

                    <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                      {enabledPlans.map((plan) => {
                        const isSelected = selectedPlanId === plan.id;
                        return (
                          <label
                            key={plan.id}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#f05e17]/20 border-[#f05e17] text-white'
                                : 'bg-[#121829] border-[#232d42] text-slate-300 hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => setSelectedPlanId(plan.id)}
                                className="accent-[#f05e17]"
                              />
                              <div>
                                <div className="text-[11px] font-bold flex items-center gap-1">
                                  <span>{plan.name}</span>
                                  {plan.isPopular && (
                                    <span className="text-[9px] text-amber-400 font-medium">
                                      · Popular
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                                  {plan.durationLabel}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs font-black font-mono tabular-nums text-amber-400">
                              {currencySymbol}{plan.price}
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {renderTermsAndConditionsRow()}

                    <button
                      type="button"
                      disabled={!isTermsSatisfied}
                      onClick={() => {
                        setPaymentError(null);
                        setPortalStep('payment');
                      }}
                      className="w-full py-2 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Continue to Payment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            );
          })()}

          {/* ================================================================= */}
          {/* STEP 4: ECOCASH & 16-DIGIT OTT VOUCHER PAYMENT                    */}
          {/* ================================================================= */}
          {portalStep === 'payment' && (
            <form
              onSubmit={handleCompletePayment}
              className="rounded-t-2xl rounded-b-none p-3 sm:p-3.5 bg-[#0b0f19] border-t border-x border-b-0 border-[#232d42] shadow-2xl space-y-2 text-left"
            >
              <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mb-1 shrink-0" />

              <div className="flex items-center justify-between border-b border-[#232d42] pb-1">
                <span className="text-[11px] font-bold text-white font-mono uppercase">
                  Payment &amp; Voucher PIN
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentError(null);
                    setPortalStep('plan');
                  }}
                  className="text-[10px] text-slate-400 hover:text-white cursor-pointer font-mono"
                >
                  &larr; Plans
                </button>
              </div>

              {/* 2-Column Payment Selector: EcoCash & OTT Voucher Only */}
              <div className="grid grid-cols-2 gap-1.5">
                {(['ecocash', 'ottvoucher'] as const).map((gw) => (
                  <button
                    key={gw}
                    type="button"
                    onClick={() => {
                      setSelectedGateway(gw);
                      setPaymentError(null);
                    }}
                    className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selectedGateway === gw
                        ? 'bg-[#f05e17]/20 border-[#f05e17] text-white'
                        : 'bg-[#121829] border-[#232d42] text-slate-400 hover:text-white'
                    }`}
                  >
                    <ProviderLogo provider={gw as GatewayProvider} className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] font-bold truncate">
                      {gw === 'ecocash' ? 'EcoCash' : 'OTT Voucher'}
                    </span>
                  </button>
                ))}
              </div>

              {selectedGateway === 'ottvoucher' ? (
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-medium text-slate-300">
                      16-Digit OTT Voucher PIN <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[10px] font-mono tabular-nums text-emerald-400 font-bold">
                      {ottPin.replace(/\D/g, '').length}/16 digits
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={19}
                    required
                    value={ottPin}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const formatted = onlyDigits.match(/.{1,4}/g)?.join(' ') || '';
                      setOttPin(formatted);
                      setPaymentError(null);
                    }}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-2.5 py-1.5 bg-[#121829] border border-[#232d42] focus:border-[#f05e17] rounded-lg text-white text-xs font-mono tabular-nums tracking-widest focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-medium text-slate-300 block mb-0.5">
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
                    className="w-full px-2.5 py-1.5 bg-[#121829] border border-[#232d42] focus:border-[#f05e17] rounded-lg text-white text-xs font-mono tabular-nums focus:outline-none"
                  />
                </div>
              )}

              {renderTermsAndConditionsRow()}

              {paymentError && (
                <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-[10px] flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span>{paymentError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!isTermsSatisfied || isConnecting || (selectedGateway === 'ottvoucher' && ottPin.replace(/\D/g, '').length !== 16)}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isConnecting ? 'Verifying Payment...' : 'Pay & Connect Internet \u2192'}</span>
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
