import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { storage } from '../../services/storage';
import { ScopePortalConfig, VerticalType, SponsorAdConfig, VideoAdItem } from '../../types';
import {
  DEFAULT_SCOPE_CONFIGS,
  OFFICIAL_SESOTHO_TERMS_TEXT,
  normalizeScopeTermsText,
  resolveWalledGardenImageUrl,
  buildInlineFallbackSlideDataUri
} from '../views/ScopeCaptivePortalBuilder';
import { MPesaLogo, EcoCashLogo, OttVoucherLogo } from '../common/BrandLogos';
import { validateEmailAddress } from '../../hooks/useConnectFreeValidation';
import { copyToClipboard } from '../../utils/clipboard';

interface StandalonePortalViewProps {
  onBackToDashboard?: () => void;
  routerGatewayIp?: string;
  isAdminLoggedIn?: boolean;
}

const sanitizeDestinationUrl = (rawUrl?: string): string => {
  const u = String(rawUrl || '').trim();
  if (
    !u ||
    u.includes('$(') ||
    u.includes('/portal') ||
    u.includes('/api/portal') ||
    u.includes('169.58.98.92') ||
    u.includes('10.10.') ||
    u.includes('192.168.') ||
    u.includes('/login') ||
    u.includes('captive.apple.com') ||
    u.includes('connectivitycheck.') ||
    u.includes('msftconnecttest.')
  ) {
    return 'https://www.google.com';
  }
  return /^https?:\/\//i.test(u) ? u : 'https://www.google.com';
};

const sanitizePortalErrorMessage = (raw: unknown, fallback: string): string => {
  const str = typeof raw === 'string' ? raw.trim() : '';
  if (!str) return fallback;
  if (/<html|<head|<body|<title|403 Forbidden|Microsoft-Azure-Application-Gateway/i.test(str)) {
    return 'Unable to verify 16-digit OTT Voucher PIN (upstream gateway returned 403 Forbidden or invalid PIN). Please check your 16-digit PIN and try again.';
  }
  return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || fallback;
};

const formatFreeDurationBadge = (minutes?: number): string => {
  const mins = Math.max(60, Number(minutes) || 1440);
  if (mins === 720) return '12 Hours';
  if (mins === 1440) return '24 Hours';
  if (mins % 1440 === 0) {
    const days = mins / 1440;
    return `${days} ${days === 1 ? 'Day' : 'Days'}`;
  }
  return `${Math.round(mins / 60)} Hours`;
};

export const StandalonePortalView: React.FC<StandalonePortalViewProps> = ({
  routerGatewayIp = '10.10.0.1'
}) => {
  const loadLocalScopeConfig = (scope: VerticalType): ScopePortalConfig => {
    const fallback = DEFAULT_SCOPE_CONFIGS[scope] || DEFAULT_SCOPE_CONFIGS.hotspot;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(`tconnect_portal_scope_${scope}`);
        if (stored) {
          const parsed: ScopePortalConfig = JSON.parse(stored);
          return {
            ...fallback,
            ...parsed,
            freeButtonX: typeof parsed.freeButtonX === 'number' ? parsed.freeButtonX : 50,
            freeButtonY: typeof parsed.freeButtonY === 'number' ? parsed.freeButtonY : 88,
            freeButtonText: parsed.freeButtonText || 'Login for free',
            freeAccessDurationMinutes: Number(parsed.freeAccessDurationMinutes) || 1440,
            termsText: normalizeScopeTermsText(parsed.termsText)
          };
        }
      } catch {}
    }
    return fallback;
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
  const isFreeAccessAllowed = Boolean(currentConfig.allowFreeAccess);
  const isTermsRequired = currentConfig.termsEnabled !== false;
  const accentColor = currentConfig.accentColor || '#f05e17';

  // MikroTik Hotspot URL Parameters passed from hotspot/login.html redirect
  const [clientMac, setClientMac] = useState('');
  const [clientIp, setClientIp] = useState('');
  const [linkLoginOnly, setLinkLoginOnly] = useState(`http://${routerGatewayIp}/login`);
  const [hasExplicitRouterLogin, setHasExplicitRouterLogin] = useState(false);
  const [userOrigUrl, setUserOrigUrl] = useState('https://www.google.com');

  // Splash Flow Step: 'identification' | 'plan' | 'voucher' | 'payment' | 'video_ad' | 'connected'
  const [portalStep, setPortalStep] = useState<
    'identification' | 'plan' | 'voucher' | 'payment' | 'video_ad' | 'connected'
  >(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const stepParam = params.get('step');
        const reasonParam = params.get('reason');
        if (reasonParam === 'retrigger' || stepParam === 'video_ad') return 'video_ad';
      } catch {}
    }
    return isFreeAccessAllowed ? 'identification' : 'plan';
  });

  // Compact 2-Step Paid Mode state: 'details' (Step 1) -> 'package' (Step 2)
  const [paidSubStep, setPaidSubStep] = useState<'details' | 'package'>('details');

  // Video Ad / Picture Ad Interstitial State
  const [sponsorAdConfig, setSponsorAdConfig] = useState<SponsorAdConfig>(() => storage.getSponsorAdConfig());
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [carouselSlideIdx, setCarouselSlideIdx] = useState(0);
  const touchStartXRef = useRef<number>(0);
  const touchDraggedRef = useRef<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Mandatory Terms & Conditions Checkbox + Popup Modal State
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const isTermsSatisfied = !isTermsRequired || termsAccepted;

  // Guest Registration Fields
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestSurname, setGuestSurname] = useState('');
  const [guestCountryCode, setGuestCountryCode] = useState<'+266' | '+27'>('+266');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Plan & Payment State (M-Pesa, EcoCash, and 16-Digit OTT Voucher)
  const enabledPlans = currentConfig.plans.filter((p) => p.enabled !== false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    () => enabledPlans[0]?.id || currentConfig.plans[0]?.id || 'hs_1d'
  );
  const [selectedGateway, setSelectedGateway] = useState<'paylesotho' | 'ottvoucher'>('paylesotho');
  const [payLesothoChannel, setPayLesothoChannel] = useState<'mpesa' | 'ecocash'>('mpesa');
  const [ottPin, setOttPin] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [phoneFormatError, setPhoneFormatError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Post-Payment Issued OTT Voucher Copy -> Redeem State (M-Pesa / EcoCash USSD Push)
  const [issuedOttVoucherPin, setIssuedOttVoucherPin] = useState<string | null>(null);
  const [issuedOttVoucherAmount, setIssuedOttVoucherAmount] = useState<number | null>(null);
  const [issuedOttVoucherRef, setIssuedOttVoucherRef] = useState<string | null>(null);
  const [hasCopiedIssuedOttVoucher, setHasCopiedIssuedOttVoucher] = useState(false);
  const [redeemIssuedPinInput, setRedeemIssuedPinInput] = useState('');

  const hiddenFormRef = useRef<HTMLFormElement | null>(null);
  const [routerUsername, setRouterUsername] = useState('test');
  const [routerPassword, setRouterPassword] = useState('123');
  const routerUsernameRef = useRef<string>('test');
  const routerPasswordRef = useRef<string>('123');
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

  // Real-time sync when Admin toggles Free Access Mode ON or OFF on the Dashboard
  useEffect(() => {
    if (portalStep === 'video_ad' || portalStep === 'connected') return;
    if (isFreeAccessAllowed && portalStep !== 'identification') {
      setPortalStep('identification');
    } else if (!isFreeAccessAllowed && portalStep === 'identification') {
      setPortalStep('plan');
    }
  }, [isFreeAccessAllowed, portalStep]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mac = params.get('mac');
      const ip = params.get('ip');
      const loginUrl = params.get('link_login_only');
      const origUrl = params.get('user_url') || params.get('link_orig');
      const scopeParam = params.get('scope') as VerticalType | null;
      const stepParam = params.get('step');
      const reasonParam = params.get('reason');

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
      if (stepParam === 'video_ad' || reasonParam === 'retrigger') {
        hasExplicitStepParamRef.current = true;
        setPortalStep('video_ad');
      } else if (stepParam === 'plan' || stepParam === 'voucher' || stepParam === 'identification') {
        hasExplicitStepParamRef.current = true;
        setPortalStep(stepParam === 'identification' ? 'identification' : 'plan');
      }
    }
  }, [routerGatewayIp]);

  // Poll live splash configuration saved on the VPS server + localStorage events
  useEffect(() => {
    let mounted = true;
    const syncLocal = () => {
      if (!mounted || isConnectingRef.current || portalStepRef.current === 'video_ad' || portalStepRef.current === 'connected') return;
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
      if (
        isConnectingRef.current ||
        portalStepRef.current === 'video_ad' ||
        portalStepRef.current === 'connected'
      ) {
        return;
      }

      fetch('/api/portal/config')
        .then((res) => res.json())
        .then((data) => {
          if (
            !mounted ||
            isConnectingRef.current ||
            portalStepRef.current === 'video_ad' ||
            portalStepRef.current === 'connected'
          ) {
            return;
          }
          if (data?.success && data?.configs && typeof data.configs === 'object') {
            const normalizedConfigs: Record<string, ScopePortalConfig> = {};
            Object.entries(data.configs).forEach(([k, v]) => {
              if (v && typeof v === 'object') {
                normalizedConfigs[k] = {
                  ...(v as ScopePortalConfig),
                  freeAccessDurationMinutes: Number((v as ScopePortalConfig).freeAccessDurationMinutes) || 1440,
                  termsText: normalizeScopeTermsText((v as ScopePortalConfig).termsText)
                };
              }
            });
            const incomingDigest = JSON.stringify(normalizedConfigs);
            if (incomingDigest !== lastConfigDigestRef.current) {
              lastConfigDigestRef.current = incomingDigest;
              if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
                Object.entries(normalizedConfigs).forEach(([k, v]) => {
                  try {
                    window.localStorage.setItem(`tconnect_portal_scope_${k}`, JSON.stringify(v));
                  } catch {}
                });
              }
              setScopeConfigs((prev) => {
                const merged = { ...prev, ...normalizedConfigs };
                if (!hasHydratedServerConfigRef.current) {
                  hasHydratedServerConfigRef.current = true;
                  const targetCfg = merged[activeScopeRef.current] || merged.hotspot || DEFAULT_SCOPE_CONFIGS.hotspot;
                  if (!hasExplicitStepParamRef.current && portalStepRef.current !== 'connected' && portalStepRef.current !== 'video_ad') {
                    setPortalStep(targetCfg.allowFreeAccess ? 'identification' : 'plan');
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
          if (!mounted || isConnectingRef.current || portalStepRef.current === 'video_ad' || portalStepRef.current === 'connected') return;
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

  // Resolve the active Picture / Video Ad campaign from Picture & Video Ads library
  // Always resolves an ad campaign with slides if any exists so the post-auth screen can showcase a random Ad Slide picture
  const activeVideoAd: VideoAdItem | null = React.useMemo(() => {
    const lib = sponsorAdConfig.videoLibrary || [];
    const normScope = activeScope === 'village' ? 'community' : activeScope;
    return (
      lib.find((v) => v.enabled && v.mediaType === 'image_carousel' && (v.targetScope === normScope || v.targetScope === activeScope)) ||
      lib.find((v) => v.enabled && v.mediaType === 'image_carousel' && v.targetScope === 'all') ||
      lib.find((v) => v.mediaType === 'image_carousel' && Array.isArray(v.slides) && v.slides.length > 0) ||
      lib.find((v) => v.enabled && (v.targetScope === normScope || v.targetScope === activeScope)) ||
      lib.find((v) => v.enabled && v.targetScope === 'all') ||
      lib.find((v) => v.enabled) ||
      lib[0] ||
      null
    );
  }, [sponsorAdConfig, activeScope]);

  // Preload active background wallpaper and sponsor ad slides via Walled-Garden proxy
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentConfig.bgImage) {
      const bgImg = new Image();
      bgImg.src = resolveWalledGardenImageUrl(
        currentConfig.bgImage,
        currentConfig.brandTitle,
        currentConfig.welcomeHeadline
      );
    }
    if (activeVideoAd?.slides && Array.isArray(activeVideoAd.slides)) {
      activeVideoAd.slides.forEach((sl) => {
        if (sl?.imageUrl) {
          const adImg = new Image();
          adImg.src = resolveWalledGardenImageUrl(
            sl.imageUrl,
            sl.caption || activeVideoAd.title,
            activeVideoAd.sponsorName
          );
        }
      });
    }
  }, [currentConfig.bgImage, currentConfig.brandTitle, currentConfig.welcomeHeadline, activeVideoAd]);

  // Authorize physical MikroTik router in background via hidden iframe + beacon while user views the Ad Slide
  const triggerBackgroundRouterAuth = () => {
    if (routerAuthSentRef.current) return;
    routerAuthSentRef.current = true;
    const safeDstUrl = sanitizeDestinationUrl(userOrigUrl);
    const targetLoginUrl = linkLoginOnly || `http://${routerGatewayIp}/login`;
    const authRedirectUrl = `${targetLoginUrl}?username=${encodeURIComponent(
      routerUsernameRef.current || routerUsername || 'test'
    )}&password=${encodeURIComponent(
      routerPasswordRef.current || routerPassword || '123'
    )}&dst=${encodeURIComponent(safeDstUrl)}`;

    try {
      let authIframe = document.getElementById('tc_router_auth_frame') as HTMLIFrameElement | null;
      if (!authIframe) {
        authIframe = document.createElement('iframe');
        authIframe.id = 'tc_router_auth_frame';
        authIframe.style.display = 'none';
        authIframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(authIframe);
      }
      authIframe.src = authRedirectUrl;
    } catch {}

    try {
      fetch(authRedirectUrl, { mode: 'no-cors' }).catch(() => {});
    } catch {}

    if (hasExplicitRouterLogin && hiddenFormRef.current) {
      try {
        hiddenFormRef.current.submit();
      } catch {}
    }
  };

  const releaseAndCloseSplash = (overrideUrl?: string) => {
    const safeDstUrl = overrideUrl && /^https?:\/\//i.test(overrideUrl)
      ? overrideUrl
      : sanitizeDestinationUrl(userOrigUrl);

    const sessionRecord = {
      connectedAt: new Date().toISOString(),
      username: routerUsernameRef.current || routerUsername || 'test',
      scope: activeScope,
      gatewayIp: routerGatewayIp
    };

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('tconnect_active_connected_session', JSON.stringify(sessionRecord));
        window.sessionStorage.setItem('tconnect_guest_connected_session', JSON.stringify(sessionRecord));
      } catch {}
    }

    triggerBackgroundRouterAuth();

    // If Admin chose "Close captive portal / release to internet immediately" and no campaign override URL was requested
    if (!overrideUrl) {
      try {
        window.close();
      } catch {}
      try {
        window.open('', '_self', '');
        window.close();
      } catch {}
    }

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        if (window.top && window.top !== window.self) {
          try {
            window.top.location.replace(safeDstUrl);
            return;
          } catch {}
        }
        window.location.replace(safeDstUrl);
      }
    }, 250);
  };

  // Start authenticating session on router in background and immediately show a Random Ad Slide Picture
  // (Replaces the old black "Connected — Resuming to Device" screen)
  const startOrEnterConnectedSession = () => {
    triggerBackgroundRouterAuth();

    const slides = activeVideoAd?.slides || [];
    if (slides.length > 0) {
      const randomIdx =
        sponsorAdConfig.randomizeSlides !== false
          ? Math.floor(Math.random() * slides.length)
          : 0;
      setCarouselSlideIdx(randomIdx);
    } else {
      setCarouselSlideIdx(0);
    }

    if (activeVideoAd) {
      storage.recordVideoAdImpression(activeVideoAd.id);
    }

    portalStepRef.current = 'video_ad';
    setPortalStep('video_ad');
  };

  // Handler when the guest taps the small static "Proceed to internet →" link on the Ad Slide screen
  const handleProceedToInternetClick = (e?: React.MouseEvent, slideRedirectUrl?: string) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const mode = sponsorAdConfig.proceedActionMode || 'close_portal';
    const campaignUrl = (slideRedirectUrl || activeVideoAd?.destinationUrl || sponsorAdConfig.destinationUrl || '').trim();

    if (mode === 'open_campaign_url' && campaignUrl && /^https?:\/\//i.test(campaignUrl)) {
      if (activeVideoAd) {
        storage.recordVideoAdClick(activeVideoAd.id);
      }
      releaseAndCloseSplash(campaignUrl);
      return;
    }

    releaseAndCloseSplash();
  };

  // Guest Input Validation
  const isFirstNameValid = !currentConfig.collectName || guestFirstName.trim().length >= 2;
  const isSurnameValid = !currentConfig.collectName || guestSurname.trim().length >= 2;
  const cleanPhoneDigits = guestPhone.replace(/\D/g, '');
  const isPhoneValid = !currentConfig.collectPhone || (
    guestCountryCode === '+266'
      ? /^[56]\d{7}$/.test(cleanPhoneDigits)
      : (cleanPhoneDigits.startsWith('0') ? cleanPhoneDigits.length === 10 : cleanPhoneDigits.length === 9)
  );
  const emailValidation = validateEmailAddress(guestEmail, Boolean(currentConfig.collectEmail));
  const isEmailValid = !currentConfig.collectEmail || emailValidation.isValid;
  const isGuestFormValid = isFirstNameValid && isSurnameValid && isPhoneValid && isEmailValid;

  const handleGuestPhoneChange = (rawVal: string, cc: '+266' | '+27' = guestCountryCode) => {
    const digits = rawVal.replace(/\D/g, '');
    if (cc === '+266') {
      if (digits.length > 0 && digits[0] !== '5' && digits[0] !== '6') {
        setPhoneFormatError('Lesotho (+266) numbers must start with 5 (M-Pesa) or 6 (EcoCash)');
        return;
      }
      setPhoneFormatError(null);
      const sliced = digits.slice(0, 8);
      setGuestPhone(sliced);
      // Auto-select M-Pesa for 5xxxxxxx or EcoCash for 6xxxxxxx
      if (sliced.startsWith('5')) setPayLesothoChannel('mpesa');
      else if (sliced.startsWith('6')) setPayLesothoChannel('ecocash');
    } else {
      setPhoneFormatError(null);
      setGuestPhone(digits.slice(0, 10));
    }
  };

  const syncGuestSessionToAdmin = async (payload: {
    mode: 'free' | 'voucher' | 'ecocash' | 'ottvoucher' | 'paylesotho';
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

  const authorizeOnMikroTikRouter = (username = 'test', password = '123') => {
    routerUsernameRef.current = username;
    routerPasswordRef.current = password;
    setRouterUsername(username);
    setRouterPassword(password);
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      try {
        window.sessionStorage.setItem(
          'tconnect_guest_connected_session',
          JSON.stringify({
            connectedAt: new Date().toISOString(),
            username,
            scope: activeScope
          })
        );
      } catch {}
    }
  };

  // Connect Free Wi-Fi (Enforces configured 12h, 24h, or X days Free Mode session duration)
  const handleConnectFree = async () => {
    if (!isFreeAccessAllowed || isConnecting) return;
    isConnectingRef.current = true;
    setIsConnecting(true);
    setStatusBanner('Connecting to free Wi-Fi...');

    const freeDurationMins = Math.max(60, Number(currentConfig.freeAccessDurationMinutes) || 1440);
    const freeDurationSecs = freeDurationMins * 60;
    const freeBadge = formatFreeDurationBadge(freeDurationMins);

    await syncGuestSessionToAdmin({
      mode: 'free',
      planName: `Free Wi-Fi (${freeBadge})`,
      durationSeconds: freeDurationSecs,
      voucherCode: '',
      amount: 0,
      speedLimit: '25M/10M'
    });

    authorizeOnMikroTikRouter('T-TRIAL', '123');
    setIsConnecting(false);
    isConnectingRef.current = false;
    setStatusBanner(null);
    startOrEnterConnectedSession();
  };

  // Step 1 -> Step 2 transition in Paid Mode
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    if (!isGuestFormValid) {
      setPaymentError('Please enter your First name, Surname, and valid 8-digit Lesotho mobile number (starts with 5 or 6).');
      return;
    }
    if (!isTermsSatisfied) {
      setPaymentError('Please agree to the Terms and Conditions to continue.');
      return;
    }
    setPaidSubStep('package');
  };

  // Copy Issued OTT Voucher PIN after M-Pesa / EcoCash USSD PIN approval
  const handleCopyIssuedOttVoucher = async () => {
    if (!issuedOttVoucherPin) return;
    await copyToClipboard(issuedOttVoucherPin);
    setHasCopiedIssuedOttVoucher(true);
    const formatted = issuedOttVoucherPin.replace(/\D/g, '').slice(0, 16).match(/.{1,4}/g)?.join(' ') || issuedOttVoucherPin;
    setRedeemIssuedPinInput(formatted);
    setPaymentError(null);
    try {
      await fetch('/api/gateways/paylesotho/ott-voucher/mark-copied', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: issuedOttVoucherPin })
      });
    } catch {}
  };

  // Redeem Copied OTT Voucher PIN after M-Pesa / EcoCash purchase
  const handleRedeemIssuedOttVoucher = async () => {
    setPaymentError(null);
    if (!issuedOttVoucherPin) return;
    if (!hasCopiedIssuedOttVoucher) {
      setPaymentError('Please tap "1. Copy OTT Voucher PIN" first before redeeming.');
      return;
    }

    const cleanPinToRedeem = (redeemIssuedPinInput || issuedOttVoucherPin).replace(/\D/g, '');
    if (cleanPinToRedeem.length !== 16) {
      setPaymentError(`Please paste your 16-digit OTT Voucher PIN (${cleanPinToRedeem.length}/16 digits).`);
      return;
    }

    const selectedPlan = enabledPlans.find((p) => p.id === selectedPlanId) || currentConfig.plans[0];
    const expectedPrice = issuedOttVoucherAmount || selectedPlan?.price || 10;
    const resolvedDurationSec = selectedPlan?.durationSeconds || 86400;
    const resolvedPlanTitle = selectedPlan?.name || `OTT Voucher Pass (M${expectedPrice})`;

    isConnectingRef.current = true;
    setIsConnecting(true);
    setStatusBanner(`Redeeming 16-digit OTT Voucher & activating internet...`);

    try {
      const response = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanPinToRedeem,
          expectedAmount: expectedPrice,
          flexibleAmount: true,
          requireCopiedFirst: true,
          planId: selectedPlan?.id || 'hs_1d',
          planName: resolvedPlanTitle,
          durationSeconds: resolvedDurationSec,
          mac: clientMac,
          ip: clientIp,
          scope: activeScope,
          firstName: guestFirstName.trim(),
          lastName: guestSurname.trim(),
          guestName: [guestFirstName.trim(), guestSurname.trim()].filter(Boolean).join(' ') || 'T-Connect Guest',
          countryCode: guestCountryCode,
          phone: guestPhone.trim(),
          guestPhone: guestPhone.trim() ? `${guestCountryCode} ${guestPhone.trim()}` : '',
          guestEmail: guestEmail.trim()
        })
      });

      const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from OTT server.' }));
      if (!response.ok || !data.success) {
        setIsConnecting(false);
        isConnectingRef.current = false;
        setStatusBanner(null);
        setPaymentError(sanitizePortalErrorMessage(data.message || data.error, '16-Digit OTT Voucher redemption failed.'));
        return;
      }

      const formattedIssuedPin = `${cleanPinToRedeem.slice(0, 4)}-${cleanPinToRedeem.slice(4, 8)}-${cleanPinToRedeem.slice(8, 12)}-${cleanPinToRedeem.slice(12, 16)}`;

      await syncGuestSessionToAdmin({
        mode: 'paylesotho',
        planName: resolvedPlanTitle,
        durationSeconds: resolvedDurationSec,
        voucherCode: formattedIssuedPin,
        amount: expectedPrice,
        transactionRef: data.transactionRef || issuedOttVoucherRef || undefined,
        speedLimit: `${selectedPlan?.downloadSpeedMbps || 20}M/${selectedPlan?.uploadSpeedMbps || 10}M`
      });

      authorizeOnMikroTikRouter('test', '123');
      setIssuedOttVoucherPin(null);
      setHasCopiedIssuedOttVoucher(false);
      setRedeemIssuedPinInput('');
      setIsConnecting(false);
      isConnectingRef.current = false;
      setStatusBanner(null);
      startOrEnterConnectedSession();
    } catch {
      setIsConnecting(false);
      isConnectingRef.current = false;
      setStatusBanner(null);
      setPaymentError('Network error redeeming OTT Voucher.');
    }
  };

  // Step 2 Submit: M-Pesa / EcoCash USSD PIN push OR Inline 16-Digit OTT Voucher Redemption
  const handleCompletePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!isGuestFormValid) {
      setPaidSubStep('details');
      setPaymentError('Please complete your details first.');
      return;
    }

    if (!isTermsSatisfied) {
      setPaidSubStep('details');
      setPaymentError('Please tick the Terms and Conditions box first.');
      return;
    }

    const selectedPlan = enabledPlans.find((p) => p.id === selectedPlanId) || currentConfig.plans[0];
    const cleanPin = ottPin.replace(/\D/g, '');

    if (selectedGateway === 'ottvoucher') {
      if (cleanPin.length !== 16) {
        setPaymentError(`Please enter a valid 16-digit OTT Voucher PIN (${cleanPin.length}/16 digits entered).`);
        return;
      }

      isConnectingRef.current = true;
      setIsConnecting(true);
      setStatusBanner(`Verifying 16-digit OTT Voucher PIN...`);

      try {
        const response = await fetch('/api/vouchers/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: cleanPin,
            expectedAmount: selectedPlan?.price || 10,
            flexibleAmount: true,
            mac: clientMac,
            ip: clientIp,
            scope: activeScope,
            firstName: guestFirstName.trim(),
            lastName: guestSurname.trim(),
            guestName: [guestFirstName.trim(), guestSurname.trim()].filter(Boolean).join(' ') || 'OTT Customer',
            countryCode: guestCountryCode,
            phone: guestPhone.trim(),
            guestPhone: guestPhone.trim() ? `${guestCountryCode} ${guestPhone.trim()}` : '',
            guestEmail: guestEmail.trim()
          })
        });

        const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from OTT server.' }));
        if (!response.ok || !data.success) {
          setIsConnecting(false);
          isConnectingRef.current = false;
          setStatusBanner(null);
          setPaymentError(
            sanitizePortalErrorMessage(
              data.message || data.error,
              'Invalid, expired, or already used 16-digit OTT Voucher PIN.'
            )
          );
          return;
        }

        const formatted16Pin = `${cleanPin.slice(0, 4)}-${cleanPin.slice(4, 8)}-${cleanPin.slice(8, 12)}-${cleanPin.slice(12, 16)}`;

        await syncGuestSessionToAdmin({
          mode: 'ottvoucher',
          planName: data.planName || selectedPlan?.name || 'Daily Unlimited',
          durationSeconds: data.durationSeconds || selectedPlan?.durationSeconds || 86400,
          voucherCode: formatted16Pin,
          amount: data.price || selectedPlan?.price || 10,
          transactionRef: data.transactionRef,
          speedLimit: `${selectedPlan?.downloadSpeedMbps || 20}M/${selectedPlan?.uploadSpeedMbps || 10}M`
        });

        authorizeOnMikroTikRouter('test', '123');
        setIsConnecting(false);
        isConnectingRef.current = false;
        setStatusBanner(null);
        startOrEnterConnectedSession();
      } catch {
        setIsConnecting(false);
        isConnectingRef.current = false;
        setStatusBanner(null);
        setPaymentError('Network error connecting to OTT Voucher verification service.');
      }
      return;
    }

    // M-Pesa / EcoCash USSD PIN Push via PayLesotho
    if (!/^[56]\d{7}$/.test(cleanPhoneDigits)) {
      setPaymentError('Please enter a valid 8-digit Lesotho mobile number starting with 5 (M-Pesa) or 6 (EcoCash).');
      return;
    }

    isConnectingRef.current = true;
    setIsConnecting(true);

    const purchaseAmount = Math.max(1, Number(selectedPlan?.price || 10));
    const purchasePlanName = selectedPlan?.name || `Daily Unlimited (M${purchaseAmount})`;

    setStatusBanner(
      payLesothoChannel === 'mpesa'
        ? `USSD PIN prompt sent to ${guestCountryCode} ${guestPhone} — Enter your M-Pesa PIN on your phone...`
        : `USSD PIN prompt sent to ${guestCountryCode} ${guestPhone} — Enter your EcoCash PIN on your phone...`
    );

    try {
      const response = await fetch('/api/gateways/paylesotho/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: purchaseAmount,
          channel: payLesothoChannel,
          phoneNumber: `${guestCountryCode} ${guestPhone.trim()}`,
          customerName: [guestFirstName.trim(), guestSurname.trim()].filter(Boolean).join(' ') || 'T-Connect Guest',
          customerEmail: guestEmail.trim() || 'guest@tconnect.co.ls',
          planId: selectedPlan?.id || 'hs_1d',
          planName: purchasePlanName,
          clientMac,
          clientIp,
          vertical: activeScope,
          siteName: currentConfig.brandTitle || 'T-Connect Hotspot'
        })
      });

      const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from PayLesotho.' }));
      if (!response.ok || !data.success) {
        setIsConnecting(false);
        isConnectingRef.current = false;
        setStatusBanner(null);
        setPaymentError(sanitizePortalErrorMessage(data.error || data.message, 'Payment initiation failed via PayLesotho.'));
        return;
      }

      if (data.status === 'completed' && data.ottVoucherPin) {
        const generatedPin = String(data.ottVoucherPin || '').replace(/\D/g, '');
        const voucherAmt = Number(data.amount) || purchaseAmount;
        setIssuedOttVoucherPin(generatedPin);
        setIssuedOttVoucherAmount(voucherAmt);
        setIssuedOttVoucherRef(data.reference || data.transactionId);
        setHasCopiedIssuedOttVoucher(false);
        setRedeemIssuedPinInput('');
        setIsConnecting(false);
        isConnectingRef.current = false;
        setStatusBanner(null);
        return;
      }

      setStatusBanner(data.message || 'USSD PIN prompt sent to your phone. Approve with your PIN to receive your 16-digit OTT Voucher...');

      const txId = data.transactionId;
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const pollRes = await fetch(`/api/gateways/paylesotho/status/${encodeURIComponent(txId)}`);
          const pollData = await pollRes.json();
          if (pollData.success && pollData.status === 'completed') {
            clearInterval(pollInterval);

            const generatedPin = String(pollData.ottVoucherPin || '').replace(/\D/g, '');
            const voucherAmt = Number(pollData.ottVoucherAmount) || selectedPlan?.price || 10;

            setIssuedOttVoucherPin(generatedPin);
            setIssuedOttVoucherAmount(voucherAmt);
            setIssuedOttVoucherRef(pollData.ottVoucherRef || data.reference || txId);
            setHasCopiedIssuedOttVoucher(false);
            setRedeemIssuedPinInput('');
            setIsConnecting(false);
            isConnectingRef.current = false;
            setStatusBanner(null);
          } else if (pollData.status === 'failed' || attempts > 25) {
            clearInterval(pollInterval);
            setIsConnecting(false);
            isConnectingRef.current = false;
            setStatusBanner(null);
            setPaymentError(sanitizePortalErrorMessage(pollData.errorMessage, 'Transaction was not approved within the allotted time.'));
          }
        } catch {
          if (attempts > 25) {
            clearInterval(pollInterval);
            setIsConnecting(false);
            isConnectingRef.current = false;
            setStatusBanner(null);
          }
        }
      }, 1500);
    } catch {
      setIsConnecting(false);
      isConnectingRef.current = false;
      setStatusBanner(null);
      setPaymentError('Network error communicating with PayLesotho gateway.');
    }
  };

  const selectedPlanObj = enabledPlans.find((p) => p.id === selectedPlanId) || enabledPlans[0] || currentConfig.plans[0];

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
            className="w-full max-w-sm rounded-2xl bg-white text-slate-900 border border-slate-200 p-4 shadow-2xl space-y-3 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Terms &amp; Conditions (T&apos;s &amp; C&apos;s)
              </h3>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto text-[11px] text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">
              {normalizeScopeTermsText(currentConfig.termsText) || OFFICIAL_SESOTHO_TERMS_TEXT}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTermsAccepted(true);
                  setPaymentError(null);
                  setIsTermsModalOpen(false);
                }}
                style={{ backgroundColor: accentColor }}
                className="flex-1 py-2 text-white font-bold text-xs rounded-xl cursor-pointer transition-opacity hover:opacity-95"
              >
                Agree &amp; Continue
              </button>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* POST-AUTH / AUTHENTICATING AD SLIDE ARTWORK SHOWCASE              */}
      {/* Replaces "Connected — Resuming to Device" with a random picture   */}
      {/* from Picture & Video Ads + small static "Proceed to internet →"   */}
      {/* ================================================================= */}
      {(portalStep === 'video_ad' || portalStep === 'connected') && (() => {
        const slides = activeVideoAd?.slides && activeVideoAd.slides.length > 0
          ? activeVideoAd.slides
          : [
              {
                id: 'fallback_1',
                imageUrl: currentConfig.bgImage || '/wallpapers/tconnect-summer.svg',
                caption: currentConfig.welcomeHeadline || 'T-Connect High-Speed Wi-Fi',
                redirectUrl: sponsorAdConfig.destinationUrl || ''
              }
            ];
        const isCarousel = !activeVideoAd || activeVideoAd.mediaType === 'image_carousel' || slides.length > 0;
        const safeIdx = carouselSlideIdx % slides.length;
        const currentSlide = slides[safeIdx] || slides[0];

        return (
          <div
            className="fixed inset-0 z-50 w-screen h-[100dvh] max-h-[100dvh] bg-[#050811] flex flex-col justify-between overflow-hidden select-none"
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
            {/* iOS-Safe Top Header Bar with Instant "Proceed to internet →" Pill Button */}
            <div
              style={{ paddingTop: 'max(10px, env(safe-area-inset-top, 10px))' }}
              className="w-full bg-[#050811]/95 border-b border-white/15 px-3.5 pb-2.5 flex items-center justify-between gap-2 shrink-0 z-50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-slate-100 truncate">
                  {currentSlide?.caption || activeVideoAd?.sponsorName || 'Wi-Fi Connected'}
                </span>
              </div>
              <a
                href={sanitizeDestinationUrl(userOrigUrl)}
                onClick={(e) => handleProceedToInternetClick(e, currentSlide?.redirectUrl)}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="min-h-[38px] px-3.5 py-2 rounded-full bg-[#f05e17] hover:bg-[#d94e0f] active:scale-95 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-lg border border-white/20 no-underline"
              >
                <span>Proceed to internet</span>
                <span>&rarr;</span>
              </a>
            </div>

            {/* Fitted Center Artwork Viewport (100% of picture fits cleanly inside screen without cropping) */}
            <div className="relative flex-1 min-h-0 w-full bg-[#050811] flex items-center justify-center p-2 overflow-hidden">
              {activeVideoAd && activeVideoAd.mediaType === 'video' && activeVideoAd.videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={activeVideoAd.videoUrl}
                    playsInline
                    autoPlay
                    muted={isVideoMuted}
                    className="max-w-full max-h-full w-auto h-auto object-contain block rounded-lg bg-black"
                  />
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
                    className="absolute top-3 right-3 z-50 px-2.5 py-1 rounded-full bg-black/70 border border-white/20 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {isVideoMuted ? <VolumeX className="w-3 h-3 text-amber-400" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
                    <span>{isVideoMuted ? 'Unmute' : 'Sound'}</span>
                  </button>
                </>
              ) : (
                <img
                  src={resolveWalledGardenImageUrl(
                    currentSlide?.imageUrl || activeVideoAd?.videoUrl || currentConfig.bgImage,
                    currentSlide?.caption || activeVideoAd?.title || currentConfig.brandTitle,
                    activeVideoAd?.sponsorName || 'T-Connect'
                  )}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = buildInlineFallbackSlideDataUri(
                      currentSlide?.caption || activeVideoAd?.title || 'T-Connect Hotspot',
                      activeVideoAd?.sponsorName || 'Starlink Powered Wi-Fi'
                    );
                  }}
                  alt={currentSlide?.caption || 'Sponsor Ad'}
                  className="max-w-full max-h-full w-auto h-auto object-contain block rounded-lg bg-[#050811] m-auto"
                  draggable={false}
                />
              )}

              {/* Subtle Left/Right arrows only if multiple slides exist */}
              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarouselSlideIdx((prev) => (prev - 1 + slides.length) % slides.length);
                    }}
                    aria-label="Previous picture"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 rounded-full bg-black/65 hover:bg-black/85 border border-white/25 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCarouselSlideIdx((prev) => (prev + 1) % slides.length);
                    }}
                    aria-label="Next picture"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 rounded-full bg-black/65 hover:bg-black/85 border border-white/25 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Raised iOS-Safe Bottom Bar with Large 46px Touch Target "Proceed to internet →" Button */}
            <div
              style={{ paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom, 14px) + 10px))' }}
              className="w-full bg-[#050811]/95 border-t border-white/15 px-4 pt-2.5 flex items-center justify-center shrink-0 z-50"
            >
              <a
                href={sanitizeDestinationUrl(userOrigUrl)}
                onClick={(e) => handleProceedToInternetClick(e, currentSlide?.redirectUrl)}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                className="w-full max-w-[360px] min-h-[46px] px-5 py-2.5 rounded-xl bg-[#f05e17] hover:bg-[#d94e0f] active:scale-[0.98] text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-lg border border-white/20 no-underline"
              >
                <span>Proceed to internet</span>
                <span>&rarr;</span>
              </a>
            </div>
          </div>
        );
      })()}

      {/* ================================================================= */}
      {/* FULL-VIEWPORT SPLASH PAGE CONTAINER                               */}
      {/* ================================================================= */}
      {portalStep !== 'video_ad' && portalStep !== 'connected' && (
        <main
          className="flex-1 min-h-screen relative flex flex-col justify-end items-center bg-cover bg-center transition-all duration-500 overflow-hidden"
          style={{
            backgroundImage: `url(${resolveWalledGardenImageUrl(
              currentConfig.bgImage,
              currentConfig.brandTitle,
              currentConfig.welcomeHeadline
            )})`
          }}
        >
          {/* Minimal or Zero Darken Overlay so Background Wallpaper is maximally visible */}
          <div
            className="absolute inset-0 bg-black pointer-events-none transition-opacity"
            style={{ opacity: isFreeAccessAllowed ? 0 : Math.min(12, currentConfig.bgDarken ?? 0) / 100 }}
          />

          {/* ================================================================= */}
          {/* PURE FREE ACCESS MODE: Single Repositionable "Login for free"     */}
          {/* Button Floating Over Wallpaper                                    */}
          {/* ================================================================= */}
          {isFreeAccessAllowed ? (
            <div
              className="absolute z-20 w-[86%] max-w-[360px]"
              style={{
                left: `${currentConfig.freeButtonX ?? 50}%`,
                top: `${currentConfig.freeButtonY ?? 88}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {statusBanner && (
                <div className="mb-2.5 p-2 rounded-lg bg-black/80 backdrop-blur-md border border-white/25 text-xs text-white flex items-center justify-center gap-2 shadow-xl">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#f05e17] shrink-0" />
                  <span>{statusBanner}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleConnectFree}
                disabled={isConnecting}
                style={{ backgroundColor: accentColor || '#f05e17' }}
                className="w-full py-3.5 px-6 text-white font-normal text-lg sm:text-xl tracking-wide rounded-[4px] shadow-[0_10px_28px_rgba(0,0,0,0.45)] transition-transform active:scale-[0.98] disabled:opacity-60 cursor-pointer flex items-center justify-center text-center"
              >
                {isConnecting ? 'Connecting...' : (currentConfig.freeButtonText?.trim() || 'Login for free')}
              </button>
            </div>
          ) : (
            /* ================================================================= */
            /* COMPACT LIGHT-THEMED 2-STEP PAID CARD DOCKED AT THE BOTTOM        */
            /* Top 58%-62% of screen is 100% open to showcase the wallpaper      */
            /* No "Voucher | Buy Pass" tabs — Paid Mode is the default           */
            /* ================================================================= */
            <div className="relative z-10 w-full max-w-[400px] mt-auto mb-0 px-2.5 pb-2.5 pt-2">
              <div className="bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl p-3.5 shadow-[0_16px_42px_rgba(0,0,0,0.38)] border border-white/90">
                {statusBanner && (
                  <div className="mb-2.5 p-2 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900 font-semibold flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#f05e17] shrink-0" />
                    <span>{statusBanner}</span>
                  </div>
                )}

                {paidSubStep === 'details' ? (
                  /* ========================================================= */
                  /* STEP 1: ENTER YOUR DETAILS                                */
                  /* ========================================================= */
                  <form onSubmit={handleProceedToStep2} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[15px] font-extrabold text-slate-900 tracking-tight">
                        Enter your details
                      </h2>
                      <span className="text-[10px] font-semibold text-slate-400">
                        Step 1 of 2
                      </span>
                    </div>

                    {currentConfig.collectName && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            First name <span className="text-[#f05e17]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={guestFirstName}
                            onChange={(e) => {
                              setGuestFirstName(e.target.value);
                              setPaymentError(null);
                            }}
                            placeholder="First name"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-[#f05e17] rounded-lg text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Surname <span className="text-[#f05e17]">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={guestSurname}
                            onChange={(e) => {
                              setGuestSurname(e.target.value);
                              setPaymentError(null);
                            }}
                            placeholder="Surname"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-[#f05e17] rounded-lg text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {currentConfig.collectPhone && (
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-600">
                            Mobile number <span className="text-[#f05e17]">*</span>
                          </label>
                          <span className="text-[9px] font-mono text-slate-400">
                            {cleanPhoneDigits.length}/8 digits (5 = M-Pesa, 6 = EcoCash)
                          </span>
                        </div>
                        <div className="flex items-center rounded-lg border border-slate-300 focus-within:border-[#f05e17] bg-white overflow-hidden">
                          <select
                            value={guestCountryCode}
                            onChange={(e) => {
                              const nextCc = e.target.value as '+266' | '+27';
                              setGuestCountryCode(nextCc);
                              setPhoneFormatError(null);
                            }}
                            className="px-2 py-1.5 bg-slate-100 border-r border-slate-300 text-slate-800 text-xs font-bold focus:outline-none cursor-pointer shrink-0"
                          >
                            <option value="+266">+266</option>
                            <option value="+27">+27</option>
                          </select>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={guestCountryCode === '+266' ? 8 : 10}
                            required
                            value={guestPhone}
                            onChange={(e) => {
                              handleGuestPhoneChange(e.target.value, guestCountryCode);
                              setPaymentError(null);
                            }}
                            placeholder="5xxxxxxx or 6xxxxxxx"
                            className="w-full px-2.5 py-1.5 bg-white text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                        {phoneFormatError && (
                          <p className="text-[9px] text-amber-700 font-semibold mt-0.5">{phoneFormatError}</p>
                        )}
                      </div>
                    )}

                    {currentConfig.collectEmail && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          Email address
                        </label>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => {
                            setGuestEmail(e.target.value);
                            setPaymentError(null);
                          }}
                          placeholder="name@example.com"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-[#f05e17] rounded-lg text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    )}

                    {isTermsRequired && (
                      <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-600">
                        <input
                          type="checkbox"
                          id="portal_tc_step1"
                          checked={termsAccepted}
                          onChange={(e) => {
                            setTermsAccepted(e.target.checked);
                            if (e.target.checked) setPaymentError(null);
                          }}
                          style={{ accentColor }}
                          className="w-3.5 h-3.5 rounded cursor-pointer shrink-0"
                        />
                        <label htmlFor="portal_tc_step1" className="cursor-pointer leading-tight select-none">
                          I agree to the{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsTermsModalOpen(true);
                            }}
                            className="text-slate-900 underline font-bold cursor-pointer"
                          >
                            Terms and Conditions
                          </button>
                        </label>
                      </div>
                    )}

                    {paymentError && (
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-medium flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      style={{ backgroundColor: accentColor }}
                      className="w-full py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  /* ========================================================= */
                  /* STEP 2: CHOOSE A PACKAGE & PAY WITH                       */
                  /* ========================================================= */
                  <form onSubmit={handleCompletePayment} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[15px] font-extrabold text-slate-900 tracking-tight">
                        Choose a package
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setPaidSubStep('details');
                          setPaymentError(null);
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold text-slate-600 cursor-pointer"
                      >
                        &larr; Details
                      </button>
                    </div>

                    {/* 3 Side-by-Side Package Cards */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {enabledPlans.slice(0, 3).map((plan) => {
                        const isSelected = plan.id === selectedPlanObj?.id;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => {
                              setSelectedPlanId(plan.id);
                              setPaymentError(null);
                            }}
                            className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                              isSelected
                                ? 'border-2 border-[#f05e17] bg-[#fffaf5] shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="text-sm font-black text-slate-900 leading-tight">
                              M{plan.price}
                            </div>
                            <div className="text-[9.5px] font-semibold text-slate-500 leading-tight mt-0.5 line-clamp-2">
                              {plan.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Pay with: M-Pesa, EcoCash, and 16-Digit OTT Voucher with Authentic Brand Logos */}
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 mb-1.5">
                        Pay with
                      </div>
                      <div className="space-y-1.5">
                        {/* M-Pesa Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGateway('paylesotho');
                            setPayLesothoChannel('mpesa');
                            setPaymentError(null);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            selectedGateway === 'paylesotho' && payLesothoChannel === 'mpesa'
                              ? 'border-2 border-[#f05e17] bg-[#fffaf5]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <MPesaLogo className="h-5" />
                            <span className="text-xs font-bold text-slate-900">M-Pesa</span>
                          </div>
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedGateway === 'paylesotho' && payLesothoChannel === 'mpesa'
                                ? 'border-[#f05e17]'
                                : 'border-slate-300'
                            }`}
                          >
                            {selectedGateway === 'paylesotho' && payLesothoChannel === 'mpesa' && (
                              <span className="w-2 h-2 rounded-full bg-[#f05e17]" />
                            )}
                          </span>
                        </button>

                        {/* EcoCash Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGateway('paylesotho');
                            setPayLesothoChannel('ecocash');
                            setPaymentError(null);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            selectedGateway === 'paylesotho' && payLesothoChannel === 'ecocash'
                              ? 'border-2 border-[#f05e17] bg-[#fffaf5]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <EcoCashLogo className="h-5" />
                            <span className="text-xs font-bold text-slate-900">EcoCash</span>
                          </div>
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedGateway === 'paylesotho' && payLesothoChannel === 'ecocash'
                                ? 'border-[#f05e17]'
                                : 'border-slate-300'
                            }`}
                          >
                            {selectedGateway === 'paylesotho' && payLesothoChannel === 'ecocash' && (
                              <span className="w-2 h-2 rounded-full bg-[#f05e17]" />
                            )}
                          </span>
                        </button>

                        {/* 16-Digit OTT Voucher Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGateway('ottvoucher');
                            setPaymentError(null);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            selectedGateway === 'ottvoucher'
                              ? 'border-2 border-[#f05e17] bg-[#fffaf5]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <OttVoucherLogo className="h-5" />
                            <span className="text-xs font-bold text-slate-900">16-Digit OTT Voucher</span>
                          </div>
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedGateway === 'ottvoucher'
                                ? 'border-[#f05e17]'
                                : 'border-slate-300'
                            }`}
                          >
                            {selectedGateway === 'ottvoucher' && (
                              <span className="w-2 h-2 rounded-full bg-[#f05e17]" />
                            )}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Inline 16-Digit OTT Voucher PIN Input when 16-Digit OTT Voucher is chosen */}
                    {selectedGateway === 'ottvoucher' && (
                      <div className="pt-0.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-600">
                            16-Digit OTT Voucher PIN <span className="text-[#f05e17]">*</span>
                          </label>
                          <span className="text-[10px] font-mono font-bold text-emerald-600">
                            {ottPin.replace(/\D/g, '').length}/16 digits
                          </span>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={19}
                          value={ottPin}
                          onChange={(e) => {
                            const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 16);
                            const formatted = onlyDigits.match(/.{1,4}/g)?.join(' ') || '';
                            setOttPin(formatted);
                            setPaymentError(null);
                          }}
                          placeholder="1234 5678 9012 3456"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 focus:border-[#f05e17] rounded-xl text-slate-900 text-xs font-mono font-bold tracking-widest text-center focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Issued 16-Digit OTT Voucher Box after M-Pesa / EcoCash USSD PIN Approval */}
                    {issuedOttVoucherPin && selectedGateway === 'paylesotho' && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            OTT Voucher Issued (M{issuedOttVoucherAmount || selectedPlanObj?.price || 10})
                          </span>
                          <span className="text-[9px] font-mono text-emerald-700">
                            {hasCopiedIssuedOttVoucher ? 'Copied ✓' : 'Step 1: Copy PIN'}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-emerald-300 text-center font-mono text-xs font-black tracking-widest text-slate-900 select-all">
                          {issuedOttVoucherPin.replace(/\D/g, '').slice(0, 16).match(/.{1,4}/g)?.join(' - ')}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={handleCopyIssuedOttVoucher}
                            className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {hasCopiedIssuedOttVoucher ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{hasCopiedIssuedOttVoucher ? 'PIN Copied' : '1. Copy PIN'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRedeemIssuedOttVoucher}
                            disabled={!hasCopiedIssuedOttVoucher || isConnecting}
                            style={{ backgroundColor: accentColor }}
                            className="py-1.5 px-2 rounded-lg text-white font-bold text-[10px] disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>2. Connect &rarr;</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {paymentError && (
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] font-medium flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    {!issuedOttVoucherPin && (
                      <button
                        type="submit"
                        disabled={isConnecting}
                        style={{ backgroundColor: accentColor }}
                        className="w-full py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>
                          {isConnecting
                            ? selectedGateway === 'ottvoucher'
                              ? 'Verifying OTT Voucher...'
                              : 'Waiting for USSD PIN on phone...'
                            : selectedGateway === 'ottvoucher'
                            ? 'Redeem OTT Voucher & Connect \u2192'
                            : `Proceed with ${selectedPlanObj?.name || 'Daily Unlimited'} \u2192`}
                        </span>
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
};
