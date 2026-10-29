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
  AlertTriangle,
  Building2,
  Unlock,
  Send,
  DollarSign
} from 'lucide-react';
import { HotspotPlan, GatewayProvider, VerticalType, RouterDevice, RouterAccessMode, SponsorAdConfig, TeamMember } from '../../types';
import { ProviderLogo } from '../common/BrandLogos';
import { storage, WALLED_GARDEN_DOMAINS } from '../../services/storage';
import { CaptivePortalEditor } from './CaptivePortalEditor';
import { ScopeCaptivePortalBuilder } from './ScopeCaptivePortalBuilder';
import { TenantGroupsModal } from './TenantGroupsModal';
import { VideoAdManagerPanel } from './VideoAdManagerPanel';
import { useConnectFreeValidation } from '../../hooks/useConnectFreeValidation';

interface CaptivePortalViewProps {
  plans: HotspotPlan[];
  routers?: RouterDevice[];
  onToggleRouterFreeMode?: (routerId: string | 'all', enabled: boolean) => void;
  onSetRouterAccessPolicy?: (
    routerId: string | 'all',
    policy: {
      accessMode: RouterAccessMode;
      freeDurationMinutes?: number;
      freeRateLimit?: string;
      freeDailyQuotaMb?: number;
    }
  ) => Promise<any>;
  onProcessPayment: (provider: GatewayProvider, planId: string, phone?: string, ottPin?: string) => any;
  onRedeemVoucher: (code: string, mac: string, hostname?: string) => any;
  currency: string;
  selectedVertical?: VerticalType | 'all';
  effectiveRole?: TeamMember['role'];
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
  onSetRouterAccessPolicy,
  onProcessPayment,
  onRedeemVoucher,
  currency,
  selectedVertical = 'all',
  effectiveRole = 'Super Admin',
}) => {
  const isCollaborator = effectiveRole === 'Collaborator';
  // Main view navigation tabs (Scope builders is primary)
  const [activeMainTab, setActiveMainTab] = useState<'scopes' | 'builder' | 'ads' | 'free_mode' | 'lockdown' | 'walled_garden'>('scopes');

  // Sponsor Ad Campaign State
  const [sponsorAd, setSponsorAd] = useState<SponsorAdConfig>(() => storage.getSponsorAdConfig());
  const [adSavedMessage, setAdSavedMessage] = useState(false);
  const [testAdActive, setTestAdActive] = useState(false);
  const [testAdTimer, setTestAdTimer] = useState(5);

  // Preview simulator step (matches mkcontroller: Identification -> Authentication -> Payment -> Success -> Session Usage)
  const [previewStep, setPreviewStep] = useState<'identification' | 'authentication' | 'payment' | 'success' | 'usage'>('identification');
  const [deviceFrame, setDeviceFrame] = useState<'iphone' | 'android' | 'desktop'>('iphone');
  const [showTenantModal, setShowTenantModal] = useState(false);

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
  const [freeAccessDurationMinutes, setFreeAccessDurationMinutes] = useState(30);
  const [authOnlinePayment, setAuthOnlinePayment] = useState(true);
  const [authPos, setAuthPos] = useState(true);

  // Content
  const [headerBrand, setHeaderBrand] = useState('T-CONNECT');
  const [headerTagline, setHeaderTagline] = useState('STARLINK AUTHORISED RESELLER');
  const [welcomeHeading, setWelcomeHeading] = useState('WHAT DO YOU CONNECT FOR?');
  const [termsEnabled, setTermsEnabled] = useState(true);
  const [termsText, setTermsText] = useState(
    `Amohela Liphelo Tsa Tšebetso

Rea u amohela ho khokelo ea rona ea marang-rang a mahala. Molemong oa hore sechaba sa bo rona se natefeloe ke khokelo ena, latela melao le lipehelo tse latelang:

1.\tItlhomphe.
Sebelisa marang-rang ka boikarabello. Qoba litlolo tsa molao ka marang-rang.

2. Sireletsa mohala oa hau oa thekeng.
Polokeho ea mohala oa hau ke boikarabello ba hau. Ha se boikarabello ba T - Connect ha mohala oa hau o lahlehile, o senyehile kapa o hlasetsoe ke likokoanahloko tsa marang-rang.

3. Sebetsa ka toka
Khokelo ea marang-rang e ka lekanyetsoa ho latela lebelo la eona kapa nako, molemong oa hore batho bohle ba natefeloe ke tšebeliso ea ona.

4. Lekunutu
Litaba tsa khokelo ea marang-rang li bolokoa e le lekunutu lipakeng tsa moreki le T-Connect.

5. Ipapise le Molao
Mesebetsi eohle ea marang-rang e tlameha ho latela melao ea tsamaiso ea marang-rang ea Lesotho.

6. Ho fumaneha hoa marang-rang ho ka khaoloa
T - Connect e ka khaola kapa ea emisa ho fumaneha hoa marang-rang, ha fela melao le melaoana ea tsamaiso ea marang-rang e sa lateloa.

Rea leboha ka ho ba karolo ea rona, natefeloa ke khokahano ea mahala ea marang-rang.`
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
  // ---------------------------------------------------------------------------
  // GUEST SIMULATOR STATE & FORM VALIDATION HOOK
  // ---------------------------------------------------------------------------
  // Enforces at least 2 chars for name/surname, 8 digits for Lesotho (+266),
  // 10 digits starting with 0 for SA (+27), and email with '@' and '.'
  const validation = useConnectFreeValidation({
    initialFirstName: '',
    initialLastName: '',
    initialPhone: '',
    initialCountryCode: COUNTRY_CODES[0].code,
    initialEmail: '',
    initialTermsAccepted: false,
    isEmailRequired: collectEmail,
    isTermsRequired: termsEnabled
  });

  const guestFirstName = validation.firstName;
  const setGuestFirstName = validation.setFirstName;
  const guestSurname = validation.lastName;
  const setGuestSurname = validation.setLastName;
  const guestPhone = validation.phone;
  const setGuestPhone = validation.setPhone;
  const guestEmail = validation.email;
  const setGuestEmail = validation.setEmail;
  const guestTermsAccepted = validation.termsAccepted;
  const setGuestTermsAccepted = validation.setTermsAccepted;
  const guestCountry = COUNTRY_CODES.find((c) => c.code === validation.countryCode) || COUNTRY_CODES[0];
  const setGuestCountry = (c: { code: string; name: string; flag: string }) => validation.setCountryCode(c.code);

  const isFirstNameValid = validation.isFirstNameValid;
  const isSurnameValid = validation.isLastNameValid;
  const isPhoneValid = validation.isPhoneValid;
  const isEmailValid = validation.isEmailValid;
  const phoneErrorMsg = validation.phoneError;
  const emailErrorMsg = validation.emailError;
  const isFormValid = validation.isFormValid;

  // Payment & Voucher
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [selectedGateway, setSelectedGateway] = useState<GatewayProvider>('ecocash');
  const [ottPin, setOttPin] = useState('');
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Live countdown timer for "Session Usage" view
  const [remainingSeconds, setRemainingSeconds] = useState(306132); // ~3 days, 13 hours, 2 minutes
  const [totalPackageSeconds, setTotalPackageSeconds] = useState(604800); // 7 days (Week pass)
  const [copiedLockdownScript, setCopiedLockdownScript] = useState(false);
  const [lastConnectedAuthMode, setLastConnectedAuthMode] = useState<'free' | 'paid'>('free');

  // Dedicated Hotspot Access Policies & Monetization State (Centralized Platform Control)
  const [fleetScopeVertical, setFleetScopeVertical] = useState<VerticalType | 'all'>(selectedVertical);
  const [fleetAccessMode, setFleetAccessMode] = useState<RouterAccessMode>('PAID_ONLY');
  const [fleetFreeDuration, setFleetFreeDuration] = useState<number>(30);
  const [fleetRateLimit, setFleetRateLimit] = useState<string>('10M/30M');
  const [isFleetPushing, setIsFleetPushing] = useState(false);
  const [fleetPushToast, setFleetPushToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Per-router tuning drafts & loading state
  const [routerPolicyDrafts, setRouterPolicyDrafts] = useState<{
    [routerId: string]: {
      mode: RouterAccessMode;
      duration: number;
      rateLimit: string;
      quotaMb: number;
    };
  }>({});
  const [pushingRouters, setPushingRouters] = useState<{ [routerId: string]: boolean }>({});
  const [routerPolicyFeedback, setRouterPolicyFeedback] = useState<{
    [routerId: string]: { type: 'success' | 'error'; message: string; script?: string };
  }>({});
  const [expandedScriptRouterId, setExpandedScriptRouterId] = useState<string | null>(null);
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  const getRouterDraft = (router: RouterDevice) => {
    return routerPolicyDrafts[router.id] || {
      mode: router.accessMode || (router.freeModeEnabled ? 'FREE_TRIAL_AND_PAID' : 'PAID_ONLY'),
      duration: router.freeDurationMinutes || 30,
      rateLimit: router.freeRateLimit || '10M/30M',
      quotaMb: router.freeDailyQuotaMb || 500
    };
  };

  const updateRouterDraft = (routerId: string, updates: Partial<{ mode: RouterAccessMode; duration: number; rateLimit: string; quotaMb: number }>) => {
    setRouterPolicyDrafts(prev => {
      const current = prev[routerId] || {
        mode: 'PAID_ONLY',
        duration: 30,
        rateLimit: '10M/30M',
        quotaMb: 500
      };
      return {
        ...prev,
        [routerId]: { ...current, ...updates }
      };
    });
  };

  const handlePushRouterPolicy = async (router: RouterDevice, overrideMode?: RouterAccessMode) => {
    const draft = getRouterDraft(router);
    const targetMode = overrideMode || draft.mode;

    setPushingRouters(prev => ({ ...prev, [router.id]: true }));
    setRouterPolicyFeedback(prev => {
      const copy = { ...prev };
      delete copy[router.id];
      return copy;
    });

    try {
      let scriptOutput = '';
      if (onSetRouterAccessPolicy) {
        const result = await onSetRouterAccessPolicy(router.id, {
          accessMode: targetMode,
          freeDurationMinutes: draft.duration,
          freeRateLimit: draft.rateLimit,
          freeDailyQuotaMb: draft.quotaMb
        });
        if (result?.script) scriptOutput = result.script;
      } else {
        const res = await fetch(`/api/devices/${router.id}/access-policy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessMode: targetMode,
            freeDurationMinutes: draft.duration,
            freeRateLimit: draft.rateLimit,
            freeDailyQuotaMb: draft.quotaMb
          })
        });
        const data = await res.json();
        scriptOutput = data.script;
        storage.setRouterAccessPolicy(router.id, {
          accessMode: targetMode,
          freeDurationMinutes: draft.duration,
          freeRateLimit: draft.rateLimit,
          freeDailyQuotaMb: draft.quotaMb
        });
      }

      // Update in-memory reference
      router.accessMode = targetMode;
      router.freeModeEnabled = targetMode !== 'PAID_ONLY';
      router.freeDurationMinutes = draft.duration;
      router.freeRateLimit = draft.rateLimit;
      router.freeDailyQuotaMb = draft.quotaMb;
      router.policyLastSyncedAt = new Date().toISOString();

      setRouterPolicyFeedback(prev => ({
        ...prev,
        [router.id]: {
          type: 'success',
          message: `Policy '${targetMode}' applied and queued for remote sync to ${router.name}.`,
          script: scriptOutput
        }
      }));
    } catch (err: any) {
      setRouterPolicyFeedback(prev => ({
        ...prev,
        [router.id]: {
          type: 'error',
          message: err.message || 'Failed to dispatch policy to router.'
        }
      }));
    } finally {
      setPushingRouters(prev => ({ ...prev, [router.id]: false }));
    }
  };

  const handlePushFleetPolicy = async () => {
    setIsFleetPushing(true);
    setFleetPushToast(null);

    const targetRouters = routers.filter(r => {
      if (fleetScopeVertical === 'all') return true;
      if (fleetScopeVertical === 'community' || fleetScopeVertical === 'village') {
        return r.vertical === 'community' || r.vertical === 'village';
      }
      return r.vertical === fleetScopeVertical;
    });

    try {
      if (onSetRouterAccessPolicy) {
        await onSetRouterAccessPolicy('all', {
          accessMode: fleetAccessMode,
          freeDurationMinutes: fleetFreeDuration,
          freeRateLimit: fleetRateLimit
        });
      } else {
        await fetch('/api/devices/fleet/access-policy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routerIds: targetRouters.map(r => r.id),
            vertical: fleetScopeVertical === 'all' ? undefined : fleetScopeVertical,
            accessMode: fleetAccessMode,
            freeDurationMinutes: fleetFreeDuration,
            freeRateLimit: fleetRateLimit
          })
        });
        storage.setRouterAccessPolicy('all', {
          accessMode: fleetAccessMode,
          freeDurationMinutes: fleetFreeDuration,
          freeRateLimit: fleetRateLimit
        });
      }

      setFleetPushToast({
        type: 'success',
        message: `Policy '${fleetAccessMode}' pushed to ${targetRouters.length} routers across ${fleetScopeVertical === 'all' ? 'the entire fleet' : `${fleetScopeVertical.toUpperCase()} vertical`}.`
      });
      setTimeout(() => setFleetPushToast(null), 5000);
    } catch (err: any) {
      setFleetPushToast({
        type: 'error',
        message: err.message || 'Failed to dispatch fleet policy.'
      });
    } finally {
      setIsFleetPushing(false);
    }
  };

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

  // Quick Action: Fill With Sample Data
  const handleFillSampleData = () => {
    validation.fillSampleData();
  };

  // Free Access Connect Action - Grants Unlimited Free Wi-Fi Session
  const handleConnectFree = () => {
    if (!isFormValid) {
      validation.markAllTouched();
      return;
    }
    setRemainingSeconds(0);
    setTotalPackageSeconds(0);
    setLastConnectedAuthMode('free');

    // Save real active session and captive lead in storage
    storage.addActiveSession({
      id: `sess_free_${Date.now()}`,
      voucherCode: `FREE-${guestPhone.slice(-4)}`,
      clientMac: 'F4:D4:88:51:22:90',
      clientIp: '10.89.1.50',
      deviceType: deviceFrame === 'iphone' ? 'Apple iPhone (iOS 17)' : 'Android Smartphone',
      siteName: 'Hotspot Node (Central)',
      vertical: 'hotspot',
      routerName: 'MikroTik-Node',
      planName: 'Free Wi-Fi (Unlimited)',
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3650 * 86400 * 1000).toISOString(),
      remainingSeconds: 0,
      bytesDown: 14200000,
      bytesUp: 3800000,
      speedLimit: '30M/10M',
      guestName: `${guestFirstName.trim()} ${guestSurname.trim()}`,
      guestPhone: `${guestCountry.code} ${guestPhone}`,
      guestEmail: guestEmail.trim(),
      authMode: 'free'
    });

    setPreviewStep('success');
  };

  // Identification Submit
  const handleIdentificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    if (authFree) {
      handleConnectFree();
      return;
    }
    setPreviewStep('payment');
  };

  // Payment Execution & Strict 16-Digit OTT Voucher Verification
  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    const fullPhone = `${guestCountry.code}${guestPhone.replace(/\s+/g, '')}`;

    if (selectedGateway === 'ottvoucher') {
      const cleanPin = ottPin.replace(/\D/g, '');
      if (cleanPin.length !== 16) {
        setPaymentError(`OTT Voucher PIN must be exactly 16 numeric digits (${cleanPin.length}/16 digits entered).`);
        return;
      }
      setIsProcessing(true);
      try {
        const response = await fetch('/api/gateways/ottvoucher/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ottPin: cleanPin,
            phoneNumber: fullPhone,
            amount: selectedPlan?.price || 10,
            planId: selectedPlan?.id || 'hs_1d',
            planName: selectedPlan?.name || 'Daily Pass',
            durationSeconds: selectedPlan?.durationSeconds || 86400,
            currency,
            guestName: `${guestFirstName.trim()} ${guestSurname.trim()}`.trim(),
            guestEmail: guestEmail.trim(),
            mac: '7A:91:02:11:44:99'
          })
        });
        const data = await response.json().catch(() => ({ success: false }));
        setIsProcessing(false);
        if (!response.ok || !data.success) {
          setPaymentError(data.message || 'Invalid 16-digit OTT Voucher PIN. Please check your voucher slip and try again.');
          return;
        }
        setIssuedCode(data.voucherCode || `OTT-${cleanPin.slice(-4)}`);
        setLastConnectedAuthMode('paid');
        setPreviewStep('success');
        const dur = data.durationSeconds || selectedPlan?.durationSeconds || 86400;
        setRemainingSeconds(dur);
        setTotalPackageSeconds(dur);
      } catch {
        setIsProcessing(false);
        setPaymentError('Unable to reach OTT Voucher verification backend.');
      }
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const res = onProcessPayment(selectedGateway, selectedPlan.id, fullPhone, ottPin);
      setIssuedCode(res.voucher.code);
      setIsProcessing(false);
      setLastConnectedAuthMode('paid');
      setPreviewStep('success');

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
    }, 1000);
  };

  // Direct Voucher Code Redemption
  const handleRedeemDirectCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    if (!voucherCodeInput.trim()) return;

    setIsProcessing(true);
    try {
      const res = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherCodeInput.trim(),
          mac: '7A:91:02:11:44:99',
          guestName: `${guestFirstName.trim()} ${guestSurname.trim()}`.trim()
        })
      });
      const data = await res.json().catch(() => ({ success: false }));
      setIsProcessing(false);
      if (res.ok && data.success) {
        setIssuedCode(voucherCodeInput.trim().toUpperCase());
        setLastConnectedAuthMode('paid');
        setPreviewStep('success');
      } else {
        setPaymentError(data.message || 'Invalid or expired voucher code.');
      }
    } catch {
      setIsProcessing(false);
      setPaymentError('Failed to verify voucher code.');
    }
  };

  // Strict CNA Lockdown & Instant Captive Portal Redirect Script (RouterOS v7.16.2)
  const strictCnaLockdownScript = `# ==============================================================================
# T-Connect Instant Captive Portal Redirect & Zero-Bypass Lockdown (RouterOS v7.16.2)
# Ensures devices connecting to MIKROTIK-TC or APs on ether2-ether5 redirect immediately
# ==============================================================================

# 1. CRITICAL: Remove OS Captive Probe Domains & M-Pesa from Walled Garden
# Whitelisting apple.com / gstatic.com / msftconnecttest.com tricks phones/PCs into thinking
# they already have full internet, suppressing the captive portal popup!
/ip hotspot walled-garden
:do { remove [find dst-host~"apple" or dst-host~"icloud" or dst-host~"gstatic" or dst-host~"google" or dst-host~"msft" or dst-host~"microsoft" or dst-host~"firefox" or dst-host~"cloudflare" or dst-host~"vodacom" or dst-host~"mywallet"] } on-error={}

# 2. Enforce Local Router (10.10.0.1) as Sole DHCP DNS Server
/ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8
/ip dhcp-server network
:do { set [find address="10.10.0.0/22"] gateway=10.10.0.1 dns-server=10.10.0.1 } on-error={
  add address=10.10.0.0/22 gateway=10.10.0.1 dns-server=10.10.0.1 comment="T-Connect Hotspot Network"
}

# 3. Disable MAC/Browser Cookies so Reconnecting Devices Always Redirect Immediately
/ip hotspot profile
:do { set [find name="tc-hotspot-profile"] login-by=http-chap,http-pap,trial http-cookie-lifetime=none split-user-domain=no } on-error={}

# 4. Intercept ALL DNS Port 53 (TCP & UDP) to Local Router
/ip firewall nat
:do { remove [find comment~"T-Connect: Prevent"] } on-error={}
add chain=dstnat in-interface=bridgeLocal protocol=udp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Prevent DNS Leaks"
add chain=dstnat in-interface=bridgeLocal protocol=tcp dst-port=53 action=redirect to-ports=53 comment="T-Connect: Prevent TCP DNS Leaks"

# 5. Clear Cached Sessions, Cookies & Hosts to Trigger Immediate Splash Popup
:do { /ip hotspot cookie remove [find] } on-error={}
:do { /ip hotspot active remove [find] } on-error={}
:do { /ip hotspot host remove [find] } on-error={}
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
            <span>Scope Builders</span>
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
            onClick={() => setActiveMainTab('ads')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
              activeMainTab === 'ads' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Video Ads &amp; Sponsors (Post-Auth / 3h / 2GB)</span>
          </button>

          {!isCollaborator && (
            <>
              <button
                onClick={() => setActiveMainTab('free_mode')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 ${
                  activeMainTab === 'free_mode' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Access Policies &amp; Monetization</span>
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
            </>
          )}

          <button
            onClick={() => setShowTenantModal(true)}
            className="px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1.5 bg-purple-950/70 hover:bg-purple-900 text-purple-300 border border-purple-800/60 cursor-pointer shadow-sm"
            title="External Client Groups (Tenant Brands) Custom Splash Policies"
          >
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Client Groups</span>
            <span className="text-[10px] bg-purple-900/80 text-purple-200 px-1.5 py-0.2 rounded-full font-mono">
              {storage.getTenantGroups().length}
            </span>
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
          onOpenVideoAds={() => setActiveMainTab('ads')}
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

              {/* Free Access Policy: Unlimited Forever */}
              {authFree && (
                <div className="pt-3 border-t border-[#1b233a] flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Free Session Duration:</span>
                  </span>
                  <span className="text-emerald-300 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30 text-[11px]">
                    Unlimited Forever (No Time Limit)
                  </span>
                </div>
              )}
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

                {/* External Client Groups Wallpaper Presets */}
                {storage.getTenantGroups().length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#1c2438]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-purple-400 font-bold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>External Client Wallpapers (Mapped by Router Tag)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTenantModal(true)}
                        className="text-[10px] text-purple-300 hover:text-white underline cursor-pointer"
                      >
                        Manage Groups
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {storage.getTenantGroups().map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setBgImage(group.customBgUrl)}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            bgImage === group.customBgUrl
                              ? 'border-purple-500 bg-purple-950/60 text-purple-200 font-bold'
                              : 'border-purple-900/40 bg-[#121626] text-purple-300/80 hover:text-white'
                          }`}
                        >
                          <div className="truncate font-bold flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-purple-400 shrink-0" />
                            <span className="truncate">{group.name}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">{group.tag}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
              <div className="flex items-center justify-between border-b border-[#1b233a] pb-2">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400" /> Branding &amp; Legal Terms
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderBrand('');
                    setHeaderTagline('');
                    setWelcomeHeading('');
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono flex items-center gap-1 cursor-pointer"
                  title="Clear title and tagline to show clean background wallpaper only"
                >
                  <span>✨ Clear (Clean Background Only)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-400 block mb-1">Brand Header Title</label>
                  <input
                    type="text"
                    value={headerBrand}
                    onChange={(e) => setHeaderBrand(e.target.value)}
                    placeholder="Leave empty for clean background..."
                    className="w-full px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tagline Sub-header</label>
                  <input
                    type="text"
                    value={headerTagline}
                    onChange={(e) => setHeaderTagline(e.target.value)}
                    placeholder="Leave empty for clean background..."
                    className="w-full px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Welcome Headline</label>
                <input
                  type="text"
                  value={welcomeHeading}
                  onChange={(e) => setWelcomeHeading(e.target.value)}
                  placeholder="Leave empty for clean background..."
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
                {(['identification', 'payment', 'success'] as const).map((step) => (
                  <button
                    key={step}
                    onClick={() => setPreviewStep(step)}
                    className={`px-3 py-1 rounded-md capitalize transition-colors ${
                      previewStep === step
                        ? 'bg-[#f05e17] text-white font-bold'
                        : 'text-slate-400 hover:text-white bg-[#121829]'
                    }`}
                  >
                    {step}
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
              className={`portal-isolated-theme w-full ${
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

                {/* Brand Header: Render only when title, tagline, or headline is present, otherwise clean background */}
                {(headerBrand?.trim() || headerTagline?.trim() || welcomeHeading?.trim()) ? (
                  <div className="relative z-10 text-center pt-2">
                    {(headerBrand?.trim() || headerTagline?.trim()) && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 mb-2">
                        <span className="w-2 h-2 rounded-full bg-[#f05e17] animate-pulse" />
                        <span className="text-[11px] font-extrabold tracking-wider text-white font-mono">
                          {[headerBrand?.trim(), headerTagline?.trim()].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                    {welcomeHeading?.trim() && (
                      <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                        {welcomeHeading}
                      </h2>
                    )}
                  </div>
                ) : null}

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
                      {/* First Name & Surname Separation */}
                      {collectName && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-mono text-slate-300 block mb-0.5">
                              First Name <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={guestFirstName}
                              onChange={(e) => setGuestFirstName(e.target.value)}
                              placeholder="First name"
                              className={`w-full px-2.5 py-1.5 bg-black/40 border rounded-xl text-white text-xs font-mono focus:outline-none transition-colors ${
                                guestFirstName && !isFirstNameValid ? 'border-red-400' : 'border-white/20 focus:border-[#f05e17]'
                              }`}
                            />
                            {guestFirstName && !isFirstNameValid && (
                              <span className="text-[9px] text-red-300 font-mono block mt-0.5">
                                Min 2 characters
                              </span>
                            )}
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-slate-300 block mb-0.5">
                              Surname <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={guestSurname}
                              onChange={(e) => setGuestSurname(e.target.value)}
                              placeholder="Surname"
                              className={`w-full px-2.5 py-1.5 bg-black/40 border rounded-xl text-white text-xs font-mono focus:outline-none transition-colors ${
                                guestSurname && !isSurnameValid ? 'border-red-400' : 'border-white/20 focus:border-[#f05e17]'
                              }`}
                            />
                            {guestSurname && !isSurnameValid && (
                              <span className="text-[9px] text-red-300 font-mono block mt-0.5">
                                Min 2 characters
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Phone Input with Country Flag & Code Selector */}
                      {collectPhone && (
                        <div>
                          <label className="text-[10px] font-mono text-slate-300 block mb-0.5">
                            Mobile Number <span className="text-red-400">*</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            {/* Country Dropdown */}
                            <select
                              value={guestCountry.code}
                              onChange={(e) => {
                                const found = COUNTRY_CODES.find((c) => c.code === e.target.value);
                                if (found) setGuestCountry(found);
                              }}
                              className="px-2 py-1.5 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#f05e17] cursor-pointer shrink-0"
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
                              placeholder={guestCountry.code === '+266' ? '5xxxxxxx / 6xxxxxxx' : '07xxxxxxxx'}
                              required
                              className={`w-full px-2.5 py-1.5 bg-black/40 border rounded-xl text-white text-xs font-mono focus:outline-none transition-colors ${
                                guestPhone && !isPhoneValid ? 'border-red-400' : 'border-white/20 focus:border-[#f05e17]'
                              }`}
                            />
                          </div>
                          {guestPhone && !isPhoneValid && (
                            <span className="text-[9px] text-red-300 font-mono block mt-0.5">
                              {phoneErrorMsg}
                            </span>
                          )}
                          {guestPhone && isPhoneValid && (
                            <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                              <Check className="w-3 h-3" />
                              <span>Valid {guestCountry.code === '+266' ? 'Lesotho' : 'South African'} number</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Email Input */}
                      {collectEmail && (
                        <div>
                          <label className="text-[10px] font-mono text-slate-300 block mb-0.5">
                            Email address <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="name@example.com"
                            required
                            className={`w-full px-2.5 py-1.5 bg-black/40 border rounded-xl text-white text-xs font-mono focus:outline-none transition-colors ${
                              guestEmail && !isEmailValid ? 'border-red-400' : 'border-white/20 focus:border-[#f05e17]'
                            }`}
                          />
                          {guestEmail && !isEmailValid && (
                            <span className="text-[9px] text-red-300 font-mono block mt-0.5">
                              {emailErrorMsg || 'Email address must contain "@" and domain with "." (e.g. name@domain.com)'}
                            </span>
                          )}
                          {guestEmail && isEmailValid && (
                            <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                              <Check className="w-3 h-3" />
                              <span>Valid email format</span>
                            </span>
                          )}
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

                      {/* "Fill with sample data" Button */}
                      <button
                        type="button"
                        onClick={handleFillSampleData}
                        className="w-full py-1.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[10px] font-bold text-amber-300 font-mono flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 fill-current" />
                        <span>✨ Fill with sample data</span>
                      </button>

                      {/* FREE ACCESS MODE BUTTON IN TANGERINE */}
                      {authFree ? (
                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={handleConnectFree}
                            disabled={!isFormValid}
                            className="w-full py-3 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs font-mono rounded-xl shadow-lg shadow-orange-950/50 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Zap className="w-4 h-4 fill-current text-white" />
                            <span>Connect Free</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          disabled={!isFormValid}
                          className="w-full py-2.5 px-4 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs font-mono rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                        >
                          Connect &amp; Choose Pass &rarr;
                        </button>
                      )}
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
                              ? 'bg-emerald-600/20 border-emerald-500'
                              : 'bg-black/40 border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="gateway"
                              checked={selectedGateway === 'ottvoucher'}
                              onChange={() => setSelectedGateway('ottvoucher')}
                              className="accent-emerald-500"
                            />
                            <ProviderLogo provider="ottvoucher" className="w-24 h-7" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-emerald-300">Digital PIN</span>
                        </label>

                        {/* EcoCash Lesotho (Econet) */}
                        <label
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            selectedGateway === 'ecocash'
                              ? 'bg-red-600/20 border-red-500'
                              : 'bg-black/40 border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="gateway"
                              checked={selectedGateway === 'ecocash'}
                              onChange={() => setSelectedGateway('ecocash')}
                              className="accent-red-500"
                            />
                            <ProviderLogo provider="ecocash" className="w-24 h-7" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-red-300">Spache-Fono</span>
                        </label>
                      </div>

                      {/* Provider Specific Input */}
                      {selectedGateway === 'ottvoucher' && (
                        <div className="pt-1 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <label className="text-slate-300 font-bold">16-Digit OTT Voucher PIN</label>
                            <span className="text-emerald-400 font-bold">{ottPin.replace(/\D/g, '').length}/16 digits</span>
                          </div>

                          <input
                            type="text"
                            inputMode="numeric"
                            value={ottPin}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                              const formatted = raw.match(/.{1,4}/g)?.join(' ') || '';
                              setOttPin(formatted);
                            }}
                            placeholder="1234 5678 9012 3456"
                            maxLength={19}
                            className="w-full px-3 py-2.5 bg-black/60 border border-blue-400/50 rounded-xl text-emerald-400 font-mono text-sm tracking-widest font-extrabold focus:outline-none focus:border-blue-400 text-center"
                          />

                          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-0.5">
                            <span>Strict 16-digit OTT API &amp; DB check</span>
                            <span className="text-blue-300">TCONNECTLES1 Partner</span>
                          </div>
                        </div>
                      )}

                      {/* EcoCash *199# Push Prompt Notice */}
                      {selectedGateway === 'ecocash' && (
                        <div className="pt-1 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs font-mono space-y-1">
                          <div className="flex justify-between font-bold text-red-200">
                            <span>EcoCash Lesotho STK Push</span>
                            <span className="text-emerald-400">{currency}{selectedPlan.price}</span>
                          </div>
                          <p className="text-slate-300 text-[10px]">
                            An automated prompt for <strong>{currency}{selectedPlan.price}</strong> will be sent to <strong>{guestCountry.code} {guestPhone}</strong>. Approve on your handset via *199# Push to activate internet.
                          </p>
                        </div>
                      )}

                      {paymentError && (
                        <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[11px] font-mono font-bold text-center">
                          {paymentError}
                        </div>
                      )}

                      {/* Pay / Redeem Button */}
                      <button
                        onClick={handleExecutePayment}
                        disabled={isProcessing || (selectedGateway === 'ottvoucher' && ottPin.replace(/\D/g, '').length !== 16)}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs font-mono rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>
                              {selectedGateway === 'ottvoucher'
                                ? 'Redeeming PIN via OTT Lesotho...'
                                : 'Processing EcoCash (*199# Push)...'}
                            </span>
                          </>
                        ) : (
                          <span>
                            {selectedGateway === 'ottvoucher'
                              ? `Redeem OTT Voucher (${currency}${selectedPlan.price}) & Connect →`
                              : `Pay ${currency}${selectedPlan.price} via EcoCash (*199# Push) →`}
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
                        onClick={() => setPreviewStep('identification')}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs font-mono rounded-xl shadow-lg"
                      >
                        Close Splash &amp; Release to Internet &rarr;
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Footer Credits */}
                <div className="relative z-10 text-center text-[10px] font-mono text-slate-400/80 pt-2">
                  T-Connect - Starlink Powered Solutions
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1.5: POST-AUTH & 3-HOUR / 2 GB VIDEO ADVERTISEMENTS MANAGER       */}
      {/* ===================================================================== */}
      {activeMainTab === 'ads' && <VideoAdManagerPanel />}

      {/* ===================================================================== */}
      {/* TAB 2: CENTRALIZED ACCESS POLICIES & MONETIZATION MANAGER             */}
      {/* ===================================================================== */}
      {activeMainTab === 'free_mode' && (
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 sm:p-6 space-y-6">
          {/* Header & Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b233a] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400 fill-current" />
                <h2 className="text-base font-extrabold text-white">Hotspot Access Policies &amp; Monetization Manager</h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1 leading-relaxed">
                Clean device adoption onboards your routers as neutral network nodes (WireGuard + RADIUS AAA + watchdog only). The platform gives you total operational control to dictate monetization and guest access policies across the fleet.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-[#121829] px-3 py-1.5 rounded-lg border border-[#1f283d] text-xs font-mono">
              <span className="text-slate-400">Total Fleet Routers:</span>
              <span className="text-white font-bold">{routers.length}</span>
            </div>
          </div>

          {/* Fleet-Wide Bulk Scope Policy Bar */}
          <div className="bg-[#121829] p-4 rounded-xl border border-amber-500/30 space-y-3 font-mono text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Fleet Scope Bulk Policy Dispatch</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Select a vertical scope and broadcast access policy across all matching routers in real time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Vertical Scope Selector */}
                <select
                  value={fleetScopeVertical}
                  onChange={(e) => setFleetScopeVertical(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-[#161d31] border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="all">🌐 All Fleet Routers</option>
                  <option value="hotspot">☕ Connected Hotspots</option>
                  <option value="community">🏡 Villages / Solar Mesh</option>
                  <option value="bus">🚌 Connected Buses</option>
                  <option value="stadium">🏟️ Connected Stadiums</option>
                  <option value="park">🌳 Connected Parks</option>
                </select>

                {/* Mode Selector */}
                <select
                  value={fleetAccessMode}
                  onChange={(e) => setFleetAccessMode(e.target.value as RouterAccessMode)}
                  className="px-2.5 py-1.5 bg-[#161d31] border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="PAID_ONLY">🔒 Strictly Paid Only</option>
                  <option value="FREE_TRIAL_AND_PAID">⚡ Free Trial + Paid Vouchers</option>
                  <option value="COMPLETELY_FREE">🌐 100% Free Public Wi-Fi</option>
                </select>

                {fleetAccessMode !== 'PAID_ONLY' && (
                  <>
                    <select
                      value={fleetFreeDuration}
                      onChange={(e) => setFleetFreeDuration(Number(e.target.value))}
                      className="px-2 py-1.5 bg-[#161d31] border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value={30}>30 mins</option>
                      <option value={60}>1 hour (60m)</option>
                      <option value={120}>2 hours (120m)</option>
                      <option value={240}>4 hours (240m)</option>
                      <option value={480}>8 hours (480m)</option>
                      <option value={720}>12 hours (720m)</option>
                      <option value={1440}>24 hours (1 Day)</option>
                    </select>

                    <select
                      value={fleetRateLimit}
                      onChange={(e) => setFleetRateLimit(e.target.value)}
                      className="px-2 py-1.5 bg-[#161d31] border border-slate-700 rounded-lg text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="3M/10M">3M/10M</option>
                      <option value="5M/15M">5M/15M</option>
                      <option value="10M/30M">10M/30M</option>
                      <option value="20M/50M">20M/50M</option>
                    </select>
                  </>
                )}

                <button
                  type="button"
                  disabled={isFleetPushing || routers.length === 0}
                  onClick={handlePushFleetPolicy}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isFleetPushing
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/40'
                  }`}
                >
                  {isFleetPushing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                  <span>{isFleetPushing ? 'Broadcasting...' : 'Broadcast to Scope'}</span>
                </button>
              </div>
            </div>

            {fleetPushToast && (
              <div className={`p-2.5 rounded-lg text-xs font-mono flex items-center justify-between animate-in fade-in ${
                fleetPushToast.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
              }`}>
                <span>{fleetPushToast.message}</span>
                <button onClick={() => setFleetPushToast(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
              </div>
            )}
          </div>

          {/* Router Table with Granular Live Policy Controls */}
          <div className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Router Fleet Granular Policy Controls ({routers.length})</span>
              </h3>
              <span className="text-slate-500 text-[11px]">Direct live push via WireGuard management tunnel</span>
            </div>

            {routers.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500 bg-[#080b12] rounded-xl border border-[#1b233a] space-y-2">
                <p className="text-slate-300 font-bold">No Routers Adopted Yet</p>
                <p className="text-[11px] text-slate-500">
                  Onboard a MikroTik router using the one-liner in &quot;Routers &amp; Adoption&quot;. Once adopted, it will appear here for full monetization and access management.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {routers.map((router) => {
                  const draft = getRouterDraft(router);
                  const isPushing = Boolean(pushingRouters[router.id]);
                  const feedback = routerPolicyFeedback[router.id];
                  const isScriptExpanded = expandedScriptRouterId === router.id;

                  return (
                    <div
                      key={router.id}
                      className="p-4 sm:p-5 bg-[#121829] rounded-xl border border-[#1f283d] space-y-4"
                    >
                      {/* Router Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b233a] pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-white text-sm">{router.name}</strong>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              router.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}>
                              {router.status.toUpperCase()}
                            </span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 uppercase">
                              {router.vertical}
                            </span>
                          </div>
                          <div className="text-slate-400 text-[11px] mt-1 flex flex-wrap items-center gap-2">
                            <span>Site: <strong className="text-slate-200">{router.siteName}</strong></span>
                            <span>·</span>
                            <span>Model: <span className="text-cyan-300">{router.model.split('(')[0]}</span></span>
                            <span>·</span>
                            <span>Tunnel IP: <code className="text-emerald-400">{router.wireguardIp || '10.99.1.50'}</code></span>
                          </div>
                        </div>

                        {/* Active Policy Status Badge */}
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Active Policy</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border mt-0.5 ${
                            router.accessMode === 'COMPLETELY_FREE'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : (router.accessMode === 'FREE_TRIAL_AND_PAID' || router.freeModeEnabled)
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          }`}>
                            {router.accessMode === 'COMPLETELY_FREE' ? (
                              <><Unlock className="w-3 h-3" /> 100% Free Wi-Fi</>
                            ) : (router.accessMode === 'FREE_TRIAL_AND_PAID' || router.freeModeEnabled) ? (
                              <><Zap className="w-3 h-3 fill-current" /> Free Trial ({router.freeDurationMinutes || 30}m)</>
                            ) : (
                              <><Lock className="w-3 h-3" /> Paid Vouchers Only</>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* 3-Way Mode Switcher Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Option 1: Paid Only */}
                        <div
                          onClick={() => updateRouterDraft(router.id, { mode: 'PAID_ONLY' })}
                          className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                            draft.mode === 'PAID_ONLY'
                              ? 'bg-rose-950/20 border-rose-500/60 shadow-md ring-1 ring-rose-500/30'
                              : 'bg-[#161d31] border-[#232d42] hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-rose-400" />
                              <span>Paid Only</span>
                            </span>
                            {draft.mode === 'PAID_ONLY' && (
                              <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">SELECTED</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Zero free access. Guests must purchase a voucher or pay via EcoCash or OTT Voucher.
                          </p>
                        </div>

                        {/* Option 2: Free Trial + Paid */}
                        <div
                          onClick={() => updateRouterDraft(router.id, { mode: 'FREE_TRIAL_AND_PAID' })}
                          className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                            draft.mode === 'FREE_TRIAL_AND_PAID'
                              ? 'bg-amber-950/20 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                              : 'bg-[#161d31] border-[#232d42] hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                              <span>Free Trial + Paid</span>
                            </span>
                            {draft.mode === 'FREE_TRIAL_AND_PAID' && (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">SELECTED</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Teaser trial ({draft.duration}m) granted on connect, after which guests purchase vouchers.
                          </p>
                        </div>

                        {/* Option 3: Completely Free */}
                        <div
                          onClick={() => updateRouterDraft(router.id, { mode: 'COMPLETELY_FREE' })}
                          className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                            draft.mode === 'COMPLETELY_FREE'
                              ? 'bg-emerald-950/20 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                              : 'bg-[#161d31] border-[#232d42] hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>100% Free Wi-Fi</span>
                            </span>
                            {draft.mode === 'COMPLETELY_FREE' && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">SELECTED</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Open public access sponsored by municipality, NGO, or donor. Zero paywalls.
                          </p>
                        </div>
                      </div>

                      {/* Tuning strip if Free Trial or Completely Free */}
                      {draft.mode !== 'PAID_ONLY' && (
                        <div className="p-3 bg-[#101626] rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Duration */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-slate-400 font-bold">Duration:</span>
                              {[
                                { label: '30m', mins: 30 },
                                { label: '1h', mins: 60 },
                                { label: '2h', mins: 120 },
                                { label: '4h', mins: 240 },
                                { label: '8h', mins: 480 },
                                { label: '12h', mins: 720 },
                                { label: '24h', mins: 1440 },
                              ].map((item) => (
                                <button
                                  key={item.mins}
                                  type="button"
                                  onClick={() => updateRouterDraft(router.id, { duration: item.mins })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                    draft.duration === item.mins
                                      ? 'bg-[#f05e17] text-white border-[#f05e17]'
                                      : 'bg-[#161d31] text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                              <div className="flex items-center gap-1 bg-[#0b0f19] px-1.5 py-0.5 rounded border border-[#232d42] text-[10px] ml-1">
                                <input
                                  type="number"
                                  min="30"
                                  max="1440"
                                  value={draft.duration || 30}
                                  onChange={(e) => {
                                    const val = Math.max(30, Math.min(1440, parseInt(e.target.value) || 30));
                                    updateRouterDraft(router.id, { duration: val });
                                  }}
                                  className="w-10 bg-transparent text-amber-300 font-bold text-center focus:outline-none"
                                />
                                <span className="text-slate-500">m</span>
                              </div>
                            </div>

                            {/* Rate Limit */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-bold">Bandwidth:</span>
                              {['3M/10M', '5M/15M', '10M/30M', '20M/50M'].map((rate) => (
                                <button
                                  key={rate}
                                  type="button"
                                  onClick={() => updateRouterDraft(router.id, { rateLimit: rate })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                                    draft.rateLimit === rate
                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                      : 'bg-[#161d31] text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                >
                                  {rate}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Push to Router Action Bar */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <div className="text-[11px] text-slate-400">
                          {router.policyLastSyncedAt ? (
                            <span>Last synced: <span className="text-slate-200">{new Date(router.policyLastSyncedAt).toLocaleTimeString()}</span></span>
                          ) : (
                            <span className="text-amber-400">Policy not yet pushed to hardware</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isPushing}
                            onClick={() => handlePushRouterPolicy(router)}
                            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                              isPushing
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#f05e17] to-amber-600 hover:from-[#d94c0b] hover:to-amber-500 text-white shadow-md shadow-orange-950/40'
                            }`}
                          >
                            {isPushing ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Pushing to Router...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                <span>Push Policy to Router</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Feedback Banner */}
                      {feedback && (
                        <div className={`p-3 rounded-lg border text-[11px] flex items-start justify-between gap-2 animate-in fade-in ${
                          feedback.type === 'success'
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        }`}>
                          <div className="space-y-1">
                            <span className="font-bold block">{feedback.message}</span>
                            {feedback.script && (
                              <button
                                type="button"
                                onClick={() => setExpandedScriptRouterId(isScriptExpanded ? null : router.id)}
                                className="text-[10px] underline text-emerald-300 hover:text-white cursor-pointer"
                              >
                                {isScriptExpanded ? 'Hide RouterOS CLI commands' : 'Inspect dispatched RouterOS CLI commands'}
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setRouterPolicyFeedback(prev => {
                              const copy = { ...prev };
                              delete copy[router.id];
                              return copy;
                            })}
                            className="text-slate-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Dispatched Script Preview */}
                      {isScriptExpanded && feedback?.script && (
                        <div className="p-3 bg-black/70 rounded-lg border border-slate-800 space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Dispatched RouterOS Script:</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(feedback.script || '');
                                setCopiedScriptId(router.id);
                                setTimeout(() => setCopiedScriptId(null), 2000);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedScriptId === router.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedScriptId === router.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <pre className="text-[10px] text-emerald-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto p-2 bg-[#050810] rounded border border-slate-900">
                            {feedback.script}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {/* External Client Groups (Tenant Brands) Modal */}
      <TenantGroupsModal
        isOpen={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        routers={routers}
        onGroupsUpdated={() => {
          // updates storage
        }}
      />
    </div>
  );
};
