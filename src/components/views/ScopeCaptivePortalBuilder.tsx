import React, { useState, useRef, useEffect } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Wifi, 
  Radio, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  Save, 
  Download, 
  Upload, 
  Image as ImageIcon, 
  Palette, 
  Eye, 
  Tag, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw, 
  Layers, 
  Ticket, 
  DollarSign, 
  Globe, 
  ArrowRight, 
  SlidersHorizontal, 
  HelpCircle,
  Copy
} from 'lucide-react';
import { VerticalType, ScopePortalConfig, ScopePlan, GatewayProvider, RouterDevice } from '../../types';
import { ProviderLogo } from '../common/BrandLogos';

// =============================================================================
// SCOPE DEFINITIONS & METADATA
// =============================================================================
export interface ScopeMeta {
  id: VerticalType;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  accentBg: string;
  badgeClass: string;
  description: string;
}

export const SCOPE_LIST: ScopeMeta[] = [
  {
    id: 'hotspot',
    label: 'Public Hotspots',
    sublabel: 'Cafes, Retail & Co-Working',
    icon: '☕',
    color: '#f05e17',
    accentBg: 'rgba(240, 94, 23, 0.15)',
    badgeClass: 'bg-[#f05e17]/15 text-[#f05e17] border-[#f05e17]/30',
    description: 'Walk-in guest access for cafes, malls, restaurants, and shared spaces.'
  },
  {
    id: 'community',
    label: 'Villages & Mesh',
    sublabel: 'Rural Communities & Solar',
    icon: '🏡',
    color: '#06b6d4',
    accentBg: 'rgba(6, 182, 212, 0.15)',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    description: 'Affordable, shared neighborhood and rural solar mesh village connectivity.'
  },
  {
    id: 'park',
    label: 'Municipal Parks',
    sublabel: 'Public Squares & Smart Poles',
    icon: '🌲',
    color: '#10b981',
    accentBg: 'rgba(16, 185, 129, 0.15)',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    description: 'Civic spaces, botanical gardens, and outdoor smart park lighting.'
  },
  {
    id: 'bus',
    label: 'Buses & Transit',
    sublabel: 'Commuter & Long-Distance',
    icon: '🚌',
    color: '#3b82f6',
    accentBg: 'rgba(59, 130, 246, 0.15)',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    description: 'In-motion Starlink for coaches, intercity minibuses, and passenger transit.'
  },
  {
    id: 'stadium',
    label: 'Stadiums & Arenas',
    sublabel: 'Sports, Festivals & Expos',
    icon: '🏟️',
    color: '#a855f7',
    accentBg: 'rgba(168, 85, 247, 0.15)',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    description: 'Ultra-high-density burst connectivity for thousands of concurrent spectators.'
  }
];

// Curated Wallpaper Presets Per Scope
export const SCOPE_WALLPAPERS: Record<VerticalType, Array<{ name: string; url: string; tag: string }>> = {
  hotspot: [
    {
      name: 'Artisan Cafe Lounge',
      url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
      tag: 'Cafe'
    },
    {
      name: 'Cyber Grid Co-Working',
      url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      tag: 'Office'
    },
    {
      name: 'Urban Retail Galleria',
      url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      tag: 'Retail'
    },
    {
      name: 'Starlink Night Orbit',
      url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
      tag: 'Starlink'
    }
  ],
  community: [
    {
      name: 'Maloti Mountain Village',
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
      tag: 'Highlands'
    },
    {
      name: 'Rural Solar Mesh Sunset',
      url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
      tag: 'Solar'
    },
    {
      name: 'Lesotho Mountain Valley',
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      tag: 'Valley'
    },
    {
      name: 'Sani Pass Rural Highlands',
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
      tag: 'Community'
    }
  ],
  park: [
    {
      name: 'Lush Greenery Canopy',
      url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
      tag: 'Canopy'
    },
    {
      name: 'Sunlit Public Gardens',
      url: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1200&q=80',
      tag: 'Botanical'
    },
    {
      name: 'Maseru Municipal Square',
      url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1200&q=80',
      tag: 'Plaza'
    },
    {
      name: 'Peaceful Forest Meadow',
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
      tag: 'Meadow'
    }
  ],
  bus: [
    {
      name: 'High-Speed Transit Highway',
      url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
      tag: 'Transit'
    },
    {
      name: 'Scenic Mountain Pass Journey',
      url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
      tag: 'Travel'
    },
    {
      name: 'Night Express Coach Starlink',
      url: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80',
      tag: 'Night Route'
    },
    {
      name: 'Cross-Border Commuter Coach',
      url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
      tag: 'Express'
    }
  ],
  stadium: [
    {
      name: 'Illuminated Match Night Crowd',
      url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
      tag: 'Match Day'
    },
    {
      name: 'Packed Arena Bleachers',
      url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
      tag: 'Arena'
    },
    {
      name: 'Festival & Expo Stage',
      url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
      tag: 'Festival'
    },
    {
      name: 'Electric Stadium Floodlights',
      url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
      tag: 'Lights'
    }
  ]
};

// Default Scope Config Initializers with Specific Prices & Wallpapers
// Aligned with standard denominations: M10 (Daily), M60 (Weekly), M280 (Monthly)
export const DEFAULT_SCOPE_CONFIGS: Record<VerticalType, ScopePortalConfig> = {
  hotspot: {
    scope: 'hotspot',
    scopeLabel: 'Public Hotspots',
    scopeIcon: '☕',
    scopeDescription: 'Cafes, retail stores, and co-working spaces',
    bgImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
    bgDarken: 25,
    glassOpacity: 88,
    cardPlacement: 'bottom',
    cardWidth: 'normal',
    accentColor: '#f05e17',
    brandTitle: 'T-CONNECT CAFE & RETAIL',
    tagline: 'STARLINK AUTHORISED RETAIL HOTSPOT',
    welcomeHeadline: 'WHAT DO YOU CONNECT FOR?',
    termsEnabled: true,
    termsText: 'Amohela Liphelo Tsa Tšebetso: Rea u amohela ho khokelo ea rona ea marang-rang a cafe. Latela melao ea khokelo.',
    collectName: true,
    collectPhone: true,
    collectEmail: true,
    collectGender: false,
    collectDob: false,
    defaultCountryCode: '+266',
    allowFreeAccess: false,
    freeAccessDurationMinutes: 15,
    allowVoucherCode: true,
    allowOnlinePayment: true,
    plans: [
      {
        id: 'hs_daily_m10',
        name: 'Daily Hotspot Pass',
        price: 10,
        currency: 'M',
        durationLabel: '24 Hours',
        durationSeconds: 86400,
        downloadSpeedMbps: 5.0,
        uploadSpeedMbps: 2.5,
        burstDownloadMbps: 10.0,
        deviceLimit: 2,
        enabled: true,
        badge: 'Daily Surfer'
      },
      {
        id: 'hs_weekly_m60',
        name: 'Weekly Hotspot Pass',
        price: 60,
        currency: 'M',
        durationLabel: '7 Days',
        durationSeconds: 604800,
        downloadSpeedMbps: 6.0,
        uploadSpeedMbps: 3.0,
        burstDownloadMbps: 12.0,
        deviceLimit: 2,
        enabled: true,
        isPopular: true,
        badge: 'Best Value'
      },
      {
        id: 'hs_monthly_m280',
        name: 'Monthly Hotspot Pass',
        price: 280,
        currency: 'M',
        durationLabel: '30 Days',
        durationSeconds: 2592000,
        downloadSpeedMbps: 8.0,
        uploadSpeedMbps: 4.0,
        burstDownloadMbps: 15.0,
        deviceLimit: 3,
        enabled: true,
        badge: 'Full Month'
      }
    ]
  },
  community: {
    scope: 'community',
    scopeLabel: 'Villages & Mesh',
    scopeIcon: '🏡',
    scopeDescription: 'Rural solar mesh villages and community estates',
    bgImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    bgDarken: 30,
    glassOpacity: 88,
    cardPlacement: 'bottom',
    cardWidth: 'normal',
    accentColor: '#06b6d4',
    brandTitle: 'T-CONNECT COMMUNITY',
    tagline: 'SOLAR MESH & VILLAGE WI-FI',
    welcomeHeadline: 'LUMELANG! KHOKELO EA MOTSE',
    termsEnabled: true,
    termsText: 'Amohela Liphelo: Marang-rang a motse a abelanoa ke bohle. Sebelisa marang-rang ka boikarabelo le toka.',
    collectName: true,
    collectPhone: true,
    collectEmail: false,
    collectGender: false,
    collectDob: false,
    defaultCountryCode: '+266',
    allowFreeAccess: false,
    freeAccessDurationMinutes: 30,
    allowVoucherCode: true,
    allowOnlinePayment: true,
    plans: [
      {
        id: 'cm_daily_m10',
        name: 'Village 24h Daily Pass',
        price: 10,
        currency: 'M',
        durationLabel: '24 Hours',
        durationSeconds: 86400,
        downloadSpeedMbps: 4.0,
        uploadSpeedMbps: 2.0,
        burstDownloadMbps: 8.0,
        deviceLimit: 2,
        enabled: true,
        badge: 'Village 24h'
      },
      {
        id: 'cm_weekly_m60',
        name: 'Village 7-Day Weekly Pass',
        price: 60,
        currency: 'M',
        durationLabel: '7 Days',
        durationSeconds: 604800,
        downloadSpeedMbps: 5.0,
        uploadSpeedMbps: 2.5,
        burstDownloadMbps: 10.0,
        deviceLimit: 2,
        enabled: true,
        isPopular: true,
        badge: 'Popular Weekly'
      },
      {
        id: 'cm_monthly_m280',
        name: 'Village 30-Day Household Pass',
        price: 280,
        currency: 'M',
        durationLabel: '30 Days',
        durationSeconds: 2592000,
        downloadSpeedMbps: 6.0,
        uploadSpeedMbps: 3.0,
        burstDownloadMbps: 12.0,
        deviceLimit: 4,
        enabled: true,
        badge: 'Whole Home'
      }
    ]
  },
  park: {
    scope: 'park',
    scopeLabel: 'Municipal Parks',
    scopeIcon: '🌲',
    scopeDescription: 'Municipal green zones, civic parks, and solar smart poles',
    bgImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    bgDarken: 20,
    glassOpacity: 85,
    cardPlacement: 'bottom',
    cardWidth: 'normal',
    accentColor: '#10b981',
    brandTitle: 'T-CONNECT GREEN PARKS',
    tagline: 'MUNICIPAL SOLAR SMART ZONE',
    welcomeHeadline: 'ENJOY THE PARK & STAY CONNECTED',
    termsEnabled: true,
    termsText: 'Amohela Liphelo: Rea u amohela serapeng sa sechaba. Boloka tikoloho e hloekile ha u ntse u sebelisa marang-rang.',
    collectName: true,
    collectPhone: true,
    collectEmail: false,
    collectGender: false,
    collectDob: false,
    defaultCountryCode: '+266',
    allowFreeAccess: false,
    freeAccessDurationMinutes: 30,
    allowVoucherCode: true,
    allowOnlinePayment: true,
    plans: [
      {
        id: 'pk_daily_m10',
        name: 'Park Civic Daily Pass',
        price: 10,
        currency: 'M',
        durationLabel: '24 Hours',
        durationSeconds: 86400,
        downloadSpeedMbps: 4.5,
        uploadSpeedMbps: 2.0,
        burstDownloadMbps: 8.0,
        deviceLimit: 2,
        enabled: true,
        badge: 'Day in Park'
      },
      {
        id: 'pk_weekly_m60',
        name: 'Park Civic Weekly Pass',
        price: 60,
        currency: 'M',
        durationLabel: '7 Days',
        durationSeconds: 604800,
        downloadSpeedMbps: 5.5,
        uploadSpeedMbps: 2.5,
        burstDownloadMbps: 10.0,
        deviceLimit: 2,
        enabled: true,
        isPopular: true,
        badge: 'Fitness Weekly'
      },
      {
        id: 'pk_monthly_m280',
        name: 'Park Civic Monthly Pass',
        price: 280,
        currency: 'M',
        durationLabel: '30 Days',
        durationSeconds: 2592000,
        downloadSpeedMbps: 7.0,
        uploadSpeedMbps: 3.5,
        burstDownloadMbps: 14.0,
        deviceLimit: 3,
        enabled: true,
        badge: 'Park Regular'
      }
    ]
  },
  bus: {
    scope: 'bus',
    scopeLabel: 'Buses & Transit',
    scopeIcon: '🚌',
    scopeDescription: 'Commuter routes, passenger shuttles, and long-distance coaches',
    bgImage: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    bgDarken: 30,
    glassOpacity: 90,
    cardPlacement: 'bottom',
    cardWidth: 'normal',
    accentColor: '#3b82f6',
    brandTitle: 'T-CONNECT ONBOARD STARLINK',
    tagline: 'HIGH-SPEED WI-FI ONBOARD LESOTHO EXPRESS',
    welcomeHeadline: 'ENJOY YOUR JOURNEY WITH FAST WI-FI',
    termsEnabled: true,
    termsText: 'Amohela Liphelo: Khokelo ena ke ea bapalami bohle ba beseng. Etsa bonnete ba hore u sebelisa li-earphones.',
    collectName: true,
    collectPhone: true,
    collectEmail: false,
    collectGender: false,
    collectDob: false,
    defaultCountryCode: '+266',
    allowFreeAccess: false,
    freeAccessDurationMinutes: 15,
    allowVoucherCode: true,
    allowOnlinePayment: true,
    plans: [
      {
        id: 'bus_daily_m10',
        name: 'Transit Daily Onboard Pass',
        price: 10,
        currency: 'M',
        durationLabel: '24 Hours',
        durationSeconds: 86400,
        downloadSpeedMbps: 5.0,
        uploadSpeedMbps: 2.5,
        burstDownloadMbps: 10.0,
        deviceLimit: 2,
        enabled: true,
        badge: 'Commuter 24h'
      },
      {
        id: 'bus_weekly_m60',
        name: 'Transit Weekly Commuter Pass',
        price: 60,
        currency: 'M',
        durationLabel: '7 Days',
        durationSeconds: 604800,
        downloadSpeedMbps: 6.0,
        uploadSpeedMbps: 3.0,
        burstDownloadMbps: 12.0,
        deviceLimit: 2,
        enabled: true,
        isPopular: true,
        badge: 'Weekly Commute'
      },
      {
        id: 'bus_monthly_m280',
        name: 'Transit Monthly Travel Pass',
        price: 280,
        currency: 'M',
        durationLabel: '30 Days',
        durationSeconds: 2592000,
        downloadSpeedMbps: 8.0,
        uploadSpeedMbps: 4.0,
        burstDownloadMbps: 15.0,
        deviceLimit: 3,
        enabled: true,
        badge: 'Unlimited Travel'
      }
    ]
  },
  stadium: {
    scope: 'stadium',
    scopeLabel: 'Stadiums & Arenas',
    scopeIcon: '🏟️',
    scopeDescription: 'Stadiums, sports arenas, expos, and packed spectator events',
    bgImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    bgDarken: 25,
    glassOpacity: 92,
    cardPlacement: 'bottom',
    cardWidth: 'normal',
    accentColor: '#a855f7',
    brandTitle: 'T-CONNECT STADIUM ARENA',
    tagline: 'HIGH-DENSITY LIVE MATCH STARLINK',
    welcomeHeadline: 'LIVE EVENT TURBO HIGH-SPEED WI-FI',
    termsEnabled: true,
    termsText: 'Amohela Liphelo: Rea u amohela lebaleng la lipapali. Khokelo e matlafatsoa ke Starlink bakeng sa sechaba sohle se tlileng papaling.',
    collectName: true,
    collectPhone: true,
    collectEmail: false,
    collectGender: false,
    collectDob: false,
    defaultCountryCode: '+266',
    allowFreeAccess: false,
    freeAccessDurationMinutes: 10,
    allowVoucherCode: true,
    allowOnlinePayment: true,
    plans: [
      {
        id: 'std_daily_m10',
        name: 'Matchday Daily Turbo Pass',
        price: 10,
        currency: 'M',
        durationLabel: '24 Hours',
        durationSeconds: 86400,
        downloadSpeedMbps: 12.0,
        uploadSpeedMbps: 6.0,
        burstDownloadMbps: 25.0,
        deviceLimit: 2,
        enabled: true,
        badge: 'Matchday Turbo'
      },
      {
        id: 'std_weekly_m60',
        name: 'Tournament Weekly Pass',
        price: 60,
        currency: 'M',
        durationLabel: '7 Days',
        durationSeconds: 604800,
        downloadSpeedMbps: 15.0,
        uploadSpeedMbps: 7.5,
        burstDownloadMbps: 30.0,
        deviceLimit: 2,
        enabled: true,
        isPopular: true,
        badge: 'Tournament Pass'
      },
      {
        id: 'std_monthly_m280',
        name: 'Season Arena Monthly Pass',
        price: 280,
        currency: 'M',
        durationLabel: '30 Days',
        durationSeconds: 2592000,
        downloadSpeedMbps: 20.0,
        uploadSpeedMbps: 10.0,
        burstDownloadMbps: 35.0,
        deviceLimit: 3,
        enabled: true,
        badge: 'VIP Season Pass'
      }
    ]
  }
};

const COUNTRY_OPTIONS = [
  { code: '+266', flag: '🇱🇸', name: 'Lesotho' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+267', flag: '🇧🇼', name: 'Botswana' },
  { code: '+268', flag: '🇸🇿', name: 'Eswatini' },
  { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+1', flag: '🇺🇸', name: 'United States' }
];

interface ScopeCaptivePortalBuilderProps {
  initialScope?: VerticalType;
  routers?: RouterDevice[];
  onProcessPayment?: (provider: GatewayProvider, planId: string, phone?: string, ottPin?: string, planOverride?: any) => any;
  onRedeemVoucher?: (code: string, mac: string, hostname?: string) => any;
  currency?: string;
}

export const ScopeCaptivePortalBuilder: React.FC<ScopeCaptivePortalBuilderProps> = ({
  initialScope = 'hotspot',
  routers = [],
  onProcessPayment,
  onRedeemVoucher,
  currency = 'M',
}) => {
  // Currently selected scope / builder tab
  const [selectedScope, setSelectedScope] = useState<VerticalType>(initialScope);

  // Storage helper: Load config for a scope (ensuring M10, M60, M280 baseline denominations)
  const loadScopeConfig = (scope: VerticalType): ScopePortalConfig => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(`tconnect_portal_scope_${scope}`);
        if (stored) {
          const parsed: ScopePortalConfig = JSON.parse(stored);
          // Ensure baseline denominations M10 (Daily), M60 (Weekly), M280 (Monthly) are seeded
          const has10 = parsed.plans?.some((p) => p.price === 10);
          const has60 = parsed.plans?.some((p) => p.price === 60);
          const has280 = parsed.plans?.some((p) => p.price === 280);
          if (!has10 || !has60 || !has280) {
            parsed.plans = DEFAULT_SCOPE_CONFIGS[scope].plans;
            try {
              window.localStorage.setItem(`tconnect_portal_scope_${scope}`, JSON.stringify(parsed));
            } catch {}
          }
          return parsed;
        }
      } catch {}
    }
    return DEFAULT_SCOPE_CONFIGS[scope];
  };

  // Scope configs dictionary
  const [scopeConfigs, setScopeConfigs] = useState<Record<VerticalType, ScopePortalConfig>>(() => ({
    hotspot: loadScopeConfig('hotspot'),
    community: loadScopeConfig('community'),
    park: loadScopeConfig('park'),
    bus: loadScopeConfig('bus'),
    stadium: loadScopeConfig('stadium'),
  }));

  // Active builder configuration (derives from selected scope)
  const currentConfig = scopeConfigs[selectedScope];

  // Builder sub-tabs: 'builder' | 'pricing' | 'appearance' | 'code'
  const [activeBuilderTab, setActiveBuilderTab] = useState<'builder' | 'pricing' | 'appearance' | 'code'>('builder');

  // Preview Simulator State
  const [previewStep, setPreviewStep] = useState<'identification' | 'plan' | 'payment' | 'usage'>('identification');
  const [deviceFrame, setDeviceFrame] = useState<'iphone' | 'android' | 'desktop'>('iphone');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedGateway, setSelectedGateway] = useState<GatewayProvider>('ottvoucher');
  const [guestName, setGuestName] = useState('Katleho Molapo');
  const [guestPhone, setGuestPhone] = useState('5800 1234');
  const [guestEmail, setGuestEmail] = useState('katleho@tconnect.ls');
  const [ottPin, setOttPin] = useState('8921 3482 9011');
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [sessionRemaining, setSessionRemaining] = useState(3600);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update selected plan default whenever scope changes
  useEffect(() => {
    const firstEnabled = currentConfig.plans.find((p) => p.enabled) || currentConfig.plans[0];
    if (firstEnabled) {
      setSelectedPlanId(firstEnabled.id);
    }
  }, [selectedScope, currentConfig.plans]);

  // Save current scope configuration
  const saveScopeConfig = (updated: ScopePortalConfig) => {
    setScopeConfigs((prev) => ({
      ...prev,
      [updated.scope]: updated,
    }));
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(`tconnect_portal_scope_${updated.scope}`, JSON.stringify(updated));
      } catch {}
    }
    setSavedToast(`Saved ${updated.scopeLabel} portal profile!`);
    setTimeout(() => setSavedToast(null), 2500);
  };

  const handleUpdateCurrent = (updates: Partial<ScopePortalConfig>) => {
    const updated = { ...currentConfig, ...updates };
    saveScopeConfig(updated);
  };

  const handleResetScopeDefaults = () => {
    const defaultConf = DEFAULT_SCOPE_CONFIGS[selectedScope];
    saveScopeConfig(defaultConf);
  };

  // Image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please upload an optimized image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        handleUpdateCurrent({ bgImage: result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Pricing & Plans modifications for current scope
  const handleUpdatePlanPrice = (planId: string, newPrice: number) => {
    const updatedPlans = currentConfig.plans.map((p) => {
      if (p.id === planId) {
        return { ...p, price: Math.max(0, newPrice) };
      }
      return p;
    });
    handleUpdateCurrent({ plans: updatedPlans });
  };

  const handleTogglePlanEnabled = (planId: string) => {
    const updatedPlans = currentConfig.plans.map((p) => {
      if (p.id === planId) {
        return { ...p, enabled: !p.enabled };
      }
      return p;
    });
    handleUpdateCurrent({ plans: updatedPlans });
  };

  const handleAddPlanToScope = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem('planName') as HTMLInputElement).value;
    const price = Number((form.elements.namedItem('planPrice') as HTMLInputElement).value);
    const durationHours = Number((form.elements.namedItem('planHours') as HTMLInputElement).value);
    const speed = Number((form.elements.namedItem('planSpeed') as HTMLInputElement).value);

    if (!name.trim()) return;

    const newPlan: ScopePlan = {
      id: `${selectedScope}_${Date.now()}`,
      name: name.trim(),
      price,
      currency,
      durationLabel: durationHours >= 24 ? `${durationHours / 24} Day(s)` : `${durationHours} Hour(s)`,
      durationSeconds: durationHours * 3600,
      downloadSpeedMbps: speed,
      uploadSpeedMbps: Math.max(1, Math.round(speed / 2)),
      burstDownloadMbps: speed * 2,
      deviceLimit: 2,
      enabled: true,
      badge: 'Custom Scope Plan'
    };

    handleUpdateCurrent({ plans: [...currentConfig.plans, newPlan] });
    form.reset();
  };

  const handleDeleteScopePlan = (planId: string) => {
    if (currentConfig.plans.length <= 1) {
      alert('Scope must retain at least one configured plan.');
      return;
    }
    const filtered = currentConfig.plans.filter((p) => p.id !== planId);
    handleUpdateCurrent({ plans: filtered });
  };

  // Simulating Guest Payment Flow
  const handleSimulatePayment = () => {
    const chosenPlan = currentConfig.plans.find((p) => p.id === selectedPlanId) || currentConfig.plans[0];
    if (onProcessPayment) {
      try {
        onProcessPayment(
          selectedGateway, 
          chosenPlan.id, 
          guestPhone, 
          selectedGateway === 'ottvoucher' ? ottPin : undefined,
          chosenPlan
        );
      } catch {}
    }
    setSessionRemaining(chosenPlan.durationSeconds);
    setPreviewStep('usage');
  };

  // Router count for this scope
  const scopeRouters = routers.filter((r) => r.vertical === selectedScope);

  const activeMeta = SCOPE_LIST.find((s) => s.id === selectedScope)!;
  const currentWallpapers = SCOPE_WALLPAPERS[selectedScope];

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* 1. SCOPE SWITCHER BAR: HOTSPOTS, VILLAGES, PARKS, BUSES, STADIUMS     */}
      {/* ===================================================================== */}
      <div className="bg-[#0f1422] p-4 rounded-2xl border border-[#232d42] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#f05e17]" />
              SEPARATE CAPTIVE PORTAL BUILDERS BY SCOPE
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Each scope (Hotspots, Villages, Parks, Buses, Stadiums) features its own independent wallpaper, pricing, and guest capture logic.
            </p>
          </div>

          {savedToast && (
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono rounded-lg flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{savedToast}</span>
            </div>
          )}
        </div>

        {/* 5-Scope Tab Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-mono text-xs">
          {SCOPE_LIST.map((scope) => {
            const isSelected = selectedScope === scope.id;
            const rCount = routers.filter((r) => r.vertical === scope.id).length;
            const scopeConf = scopeConfigs[scope.id];
            const activePlansCount = scopeConf.plans.filter((p) => p.enabled).length;

            return (
              <button
                key={scope.id}
                onClick={() => setSelectedScope(scope.id)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-2 text-white shadow-lg bg-[#141b2d]'
                    : 'bg-[#101626] border-[#232d42] text-slate-400 hover:text-slate-200 hover:border-slate-500'
                }`}
                style={{
                  borderColor: isSelected ? scope.color : undefined,
                  boxShadow: isSelected ? `0 0 15px ${scope.color}20` : undefined,
                }}
              >
                {/* Active Indicator Top Bar */}
                {isSelected && (
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: scope.color }}
                  />
                )}

                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xl">{scope.icon}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${scope.badgeClass}`}
                    >
                      {activePlansCount} Plans
                    </span>
                  </div>
                  <div className="font-extrabold text-white text-xs truncate">{scope.label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{scope.sublabel}</div>
                </div>

                <div className="mt-2 pt-2 border-t border-[#1e263c] flex items-center justify-between text-[10px] text-slate-500">
                  <span>{rCount} Routers Assigned</span>
                  <span style={{ color: isSelected ? scope.color : '#64748b' }}>
                    {isSelected ? 'Active Profile' : 'Select'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. ACTIVE SCOPE CONTROLS & SUB-TABS                                   */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0e17] p-3 rounded-xl border border-[#1b233a] font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="text-lg">{activeMeta.icon}</span>
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>{activeMeta.label} Portal Builder</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
                style={{ backgroundColor: `${activeMeta.color}20`, color: activeMeta.color }}
              >
                {activeMeta.sublabel}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">{activeMeta.description}</p>
          </div>
        </div>

        {/* Sub-Tabs: Builder & Preview, Pricing & Plans, Appearance, RouterOS Code */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveBuilderTab('builder')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
              activeBuilderTab === 'builder'
                ? 'bg-[#f05e17] text-white shadow-sm'
                : 'text-slate-400 hover:text-white bg-[#121829]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Visual Builder</span>
          </button>

          <button
            onClick={() => setActiveBuilderTab('pricing')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
              activeBuilderTab === 'pricing'
                ? 'bg-[#f05e17] text-white shadow-sm'
                : 'text-slate-400 hover:text-white bg-[#121829]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Scope Pricing ({currentConfig.plans.length})</span>
          </button>

          <button
            onClick={() => setActiveBuilderTab('appearance')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
              activeBuilderTab === 'appearance'
                ? 'bg-[#f05e17] text-white shadow-sm'
                : 'text-slate-400 hover:text-white bg-[#121829]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Wallpapers &amp; Style</span>
          </button>

          <button
            onClick={handleResetScopeDefaults}
            className="px-2.5 py-1.5 text-slate-400 hover:text-rose-300 bg-[#121829] rounded-lg transition-colors text-[11px]"
            title="Reset this scope to original defaults"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. MAIN WORKSPACE GRID: BUILDER CONTROLS (LEFT) + DEVICE EMULATOR (RIGHT) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =================================================================== */}
        {/* LEFT COLUMN: ACTIVE SCOPE SETTINGS (7 COLS)                         */}
        {/* =================================================================== */}
        <div className="lg:col-span-7 space-y-5">
          {/* TAB: VISUAL BUILDER */}
          {activeBuilderTab === 'builder' && (
            <div className="space-y-4">
              {/* Wallpaper Picker Quick Selector for This Scope */}
              <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1b233a] pb-2">
                  <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    {activeMeta.label} Wallpaper Selection
                  </span>
                  <span className="text-[10px] text-slate-400">Curated for this scope</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {currentWallpapers.map((wp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleUpdateCurrent({ bgImage: wp.url })}
                      className={`group relative h-20 rounded-lg overflow-hidden border text-left transition-all ${
                        currentConfig.bgImage === wp.url
                          ? 'border-2 border-[#f05e17] ring-2 ring-[#f05e17]/30'
                          : 'border-[#232d42] hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={wp.url}
                        alt={wp.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-1.5 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-white truncate leading-tight">
                          {wp.name}
                        </span>
                        <span className="text-[9px] text-[#f05e17] font-bold">{wp.tag}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Image Upload / URL Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-3 bg-[#161d31] hover:bg-[#232d42] border border-dashed border-slate-600 rounded-lg text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#f05e17]" />
                    <span>Upload Custom Image</span>
                  </button>

                  <input
                    type="text"
                    value={currentConfig.bgImage}
                    onChange={(e) => handleUpdateCurrent({ bgImage: e.target.value })}
                    placeholder="Or paste external image URL..."
                    className="flex-1 px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-200 text-xs focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>

              {/* Scope-Specific Pricing Quick Bar */}
              <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#1b233a] pb-2">
                  <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    {activeMeta.label} Live Plans &amp; Prices
                  </span>
                  <button
                    onClick={() => setActiveBuilderTab('pricing')}
                    className="text-[10px] text-[#f05e17] hover:underline flex items-center gap-1"
                  >
                    <span>Full Plan Manager &rarr;</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {currentConfig.plans.map((p) => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-xl border flex flex-col justify-between ${
                        p.enabled ? 'bg-[#141b2d] border-[#2b3754]' : 'bg-[#0c101a] border-[#1a2233] opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-white text-xs truncate">{p.name}</span>
                          {p.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{p.durationLabel} · {p.downloadSpeedMbps}Mbps</div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#1e263c] flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">{currency}</span>
                          <input
                            type="number"
                            min="0"
                            value={p.price}
                            onChange={(e) => handleUpdatePlanPrice(p.id, Number(e.target.value))}
                            className="w-14 px-1.5 py-0.5 bg-[#0b0f19] border border-[#232d42] rounded text-emerald-400 font-bold text-xs"
                          />
                        </div>
                        <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={p.enabled}
                            onChange={() => handleTogglePlanEnabled(p.id)}
                            className="accent-[#f05e17] rounded"
                          />
                          <span>Show</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scope Content & Brand Titles */}
              <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-3 font-mono text-xs">
                <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1b233a] pb-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  {activeMeta.label} Branding &amp; Guest Prompts
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Brand Header Title</label>
                    <input
                      type="text"
                      value={currentConfig.brandTitle}
                      onChange={(e) => handleUpdateCurrent({ brandTitle: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Tagline Sub-header</label>
                    <input
                      type="text"
                      value={currentConfig.tagline}
                      onChange={(e) => handleUpdateCurrent({ tagline: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Welcome Headline</label>
                  <input
                    type="text"
                    value={currentConfig.welcomeHeadline}
                    onChange={(e) => handleUpdateCurrent({ welcomeHeadline: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Sesotho / English Terms of Service</label>
                  <textarea
                    rows={2}
                    value={currentConfig.termsText}
                    onChange={(e) => handleUpdateCurrent({ termsText: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-300 text-xs font-sans"
                  />
                </div>
              </div>

              {/* Guest Field Toggles */}
              <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] space-y-3 font-mono text-xs">
                <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1b233a] pb-2">
                  <Layers className="w-4 h-4 text-[#f05e17]" />
                  Guest Data Capture Fields ({activeMeta.label})
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentConfig.collectName}
                      onChange={(e) => handleUpdateCurrent({ collectName: e.target.checked })}
                      className="accent-[#f05e17]"
                    />
                    <span>Full Name</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentConfig.collectPhone}
                      onChange={(e) => handleUpdateCurrent({ collectPhone: e.target.checked })}
                      className="accent-[#f05e17]"
                    />
                    <span>Phone (+ Flag)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentConfig.collectEmail}
                      onChange={(e) => handleUpdateCurrent({ collectEmail: e.target.checked })}
                      className="accent-[#f05e17]"
                    />
                    <span>Email Address</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentConfig.allowFreeAccess}
                      onChange={(e) => handleUpdateCurrent({ allowFreeAccess: e.target.checked })}
                      className="accent-emerald-500"
                    />
                    <span>Free Access Mode</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentConfig.allowVoucherCode}
                      onChange={(e) => handleUpdateCurrent({ allowVoucherCode: e.target.checked })}
                      className="accent-blue-500"
                    />
                    <span>OTT / Token PIN</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-[#161d31] rounded-lg border border-[#232d42] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentConfig.allowOnlinePayment}
                      onChange={(e) => handleUpdateCurrent({ allowOnlinePayment: e.target.checked })}
                      className="accent-amber-500"
                    />
                    <span>EcoCash / STK</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DEDICATED SCOPE PRICING MANAGER */}
          {activeBuilderTab === 'pricing' && (
            <div className="space-y-4 font-mono text-xs">
              {/* Standard Denominations Callout Banner */}
              <div className="bg-[#12192c] p-3.5 rounded-xl border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="space-y-0.5">
                  <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Denomination Standard: M10 (Daily) · M60 (Weekly) · M280 (Monthly)</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Aligned with Econet EcoCash and OTT Voucher digital PINs. Each venue manages its prices independently, but defaults to this baseline.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateCurrent({ plans: DEFAULT_SCOPE_CONFIGS[selectedScope].plans });
                    setSavedToast(`Reset ${activeMeta.label} to standard M10, M60, M280 denominations!`);
                    setTimeout(() => setSavedToast(null), 2500);
                  }}
                  className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                >
                  Apply M10 / M60 / M280 Baseline
                </button>
              </div>

              <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4">
                <div className="flex items-center justify-between border-b border-[#1b233a] pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      {activeMeta.label} Pricing Matrix &amp; Plan Quotas
                    </h3>
                    <p className="text-xs text-slate-400">
                      Prices and bandwidth speed throttles configured here only appear when customers connect to {activeMeta.label} hotspots.
                    </p>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
                    style={{ backgroundColor: `${activeMeta.color}20`, color: activeMeta.color }}
                  >
                    {currentConfig.plans.length} Configured Tiers
                  </span>
                </div>

                {/* Plans Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 text-[10px] uppercase border-b border-[#232d42] pb-2">
                        <th className="py-2">PLAN NAME</th>
                        <th className="py-2">DURATION</th>
                        <th className="py-2">SPEED (DOWN / UP)</th>
                        <th className="py-2">PRICE ({currency})</th>
                        <th className="py-2">STATUS</th>
                        <th className="py-2 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b233a] text-slate-300">
                      {currentConfig.plans.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 font-bold text-white">
                            <div>{p.name}</div>
                            {p.badge && <div className="text-[10px] text-amber-300 font-normal">{p.badge}</div>}
                          </td>
                          <td className="py-3 text-slate-400">{p.durationLabel}</td>
                          <td className="py-3 text-cyan-400">{p.downloadSpeedMbps}M / {p.uploadSpeedMbps}M</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">{currency}</span>
                              <input
                                type="number"
                                min="0"
                                value={p.price}
                                onChange={(e) => handleUpdatePlanPrice(p.id, Number(e.target.value))}
                                className="w-16 px-2 py-1 bg-[#0b0f19] border border-[#232d42] rounded text-emerald-400 font-bold"
                              />
                            </div>
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => handleTogglePlanEnabled(p.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.enabled
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              {p.enabled ? 'ACTIVE ON PORTAL' : 'HIDDEN'}
                            </button>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteScopePlan(p.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Delete Plan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add New Scope Plan Form */}
                <form
                  onSubmit={handleAddPlanToScope}
                  className="bg-[#0a0e17] p-4 rounded-xl border border-[#1b233a] space-y-3 pt-3"
                >
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#f05e17]" /> Add New Tier for {activeMeta.label}
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">Plan Name</label>
                      <input
                        name="planName"
                        required
                        placeholder="e.g. VIP Matchday Pass"
                        className="w-full px-2.5 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">Price ({currency})</label>
                      <input
                        name="planPrice"
                        type="number"
                        min="0"
                        required
                        defaultValue="10"
                        className="w-full px-2.5 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-emerald-400 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">Duration (Hours)</label>
                      <input
                        name="planHours"
                        type="number"
                        min="1"
                        required
                        defaultValue="24"
                        className="w-full px-2.5 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 text-[11px]">Download Speed (Mbps)</label>
                      <input
                        name="planSpeed"
                        type="number"
                        min="1"
                        required
                        defaultValue="5"
                        className="w-full px-2.5 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="py-1.5 px-3 bg-[#f05e17] hover:bg-[#d94c0b] text-white rounded-lg font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save New {activeMeta.label} Plan</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: WALLPAPERS & APPEARANCE */}
          {activeBuilderTab === 'appearance' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1b233a] pb-2">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  Glassmorphism &amp; Layout Controls ({activeMeta.label})
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Glass Opacity */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-400">Card Glass Opacity</label>
                      <span className="text-white font-bold">{currentConfig.glassOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={currentConfig.glassOpacity}
                      onChange={(e) => handleUpdateCurrent({ glassOpacity: Number(e.target.value) })}
                      className="w-full accent-[#f05e17]"
                    />
                  </div>

                  {/* Darken Percent */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-slate-400">Background Darken Filter</label>
                      <span className="text-white font-bold">{currentConfig.bgDarken}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={currentConfig.bgDarken}
                      onChange={(e) => handleUpdateCurrent({ bgDarken: Number(e.target.value) })}
                      className="w-full accent-[#f05e17]"
                    />
                  </div>
                </div>

                {/* Card Placement */}
                <div>
                  <label className="text-slate-400 block mb-1.5 font-bold">Card Placement</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['top', 'center', 'bottom'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => handleUpdateCurrent({ cardPlacement: pos })}
                        className={`py-2 px-3 rounded-lg border text-center uppercase font-bold transition-colors ${
                          currentConfig.cardPlacement === pos
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
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: LIVE INTERACTIVE PHONE & DESKTOP EMULATOR (5 COLS)   */}
        {/* =================================================================== */}
        <div className="lg:col-span-5 flex flex-col items-center">
          {/* Emulator Top Controls */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 bg-[#0a0e17] p-2.5 rounded-xl border border-[#1b233a] font-mono text-xs">
            {/* Step Selector */}
            <div className="flex items-center gap-1">
              {(['identification', 'plan', 'payment', 'usage'] as const).map((step) => (
                <button
                  key={step}
                  onClick={() => setPreviewStep(step)}
                  className={`px-2.5 py-1 rounded capitalize text-[11px] font-bold transition-colors ${
                    previewStep === step
                      ? 'bg-[#f05e17] text-white'
                      : 'text-slate-400 hover:text-white bg-[#121829]'
                  }`}
                >
                  {step === 'identification' ? '1. Sign-Up' : step === 'plan' ? '2. Plans' : step === 'payment' ? '3. Pay' : '4. Usage'}
                </button>
              ))}
            </div>

            {/* Frame Selector */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDeviceFrame('iphone')}
                className={`p-1.5 rounded ${deviceFrame === 'iphone' ? 'bg-[#232d42] text-white' : 'text-slate-400'}`}
                title="Apple iPhone CNA"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeviceFrame('android')}
                className={`p-1.5 rounded ${deviceFrame === 'android' ? 'bg-[#232d42] text-white' : 'text-slate-400'}`}
                title="Android CNA"
              >
                <Radio className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeviceFrame('desktop')}
                className={`p-1.5 rounded ${deviceFrame === 'desktop' ? 'bg-[#232d42] text-white' : 'text-slate-400'}`}
                title="Desktop Browser"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Device Frame */}
          <div
            className={`w-full ${
              deviceFrame === 'desktop' ? 'max-w-md' : 'max-w-[360px]'
            } bg-[#05070c] rounded-[38px] border-8 border-[#1f283d] shadow-2xl overflow-hidden relative transition-all duration-300`}
          >
            {/* CNA Browser Bar */}
            <div className="bg-black/85 backdrop-blur-md px-4 py-2 flex items-center justify-between text-[10px] font-mono text-slate-300 border-b border-white/10 z-20 relative">
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-[#f05e17]" />
                <span className="font-bold">{currentConfig.brandTitle}</span>
              </div>
              <span className="text-slate-400">
                {deviceFrame === 'iphone' ? 'captive.apple.com' : 'connectivitycheck.gstatic.com'}
              </span>
            </div>

            {/* Background Image Container */}
            <div
              className="relative min-h-[560px] p-4 flex flex-col justify-between bg-cover bg-center transition-all duration-300"
              style={{
                backgroundImage: `url(${currentConfig.bgImage})`,
              }}
            >
              {/* Darken Overlay */}
              <div
                className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                style={{ opacity: currentConfig.bgDarken / 100 }}
              />

              {/* Scope Header */}
              <div className="relative z-10 text-center pt-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20 mb-1.5">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeMeta.color }} />
                  <span className="text-[10px] font-bold text-white font-mono">
                    {currentConfig.brandTitle} · {currentConfig.tagline}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight drop-shadow-md leading-tight">
                  {currentConfig.welcomeHeadline}
                </h3>
              </div>

              {/* Dynamic Glassmorphism Card */}
              <div
                className={`relative z-10 w-full ${
                  currentConfig.cardPlacement === 'top'
                    ? 'mt-3'
                    : currentConfig.cardPlacement === 'bottom'
                    ? 'mt-auto'
                    : 'my-auto'
                }`}
              >
                {/* STEP 1: GUEST SIGN-UP */}
                {previewStep === 'identification' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setPreviewStep('plan');
                    }}
                    className="rounded-2xl p-4 border border-white/20 shadow-2xl backdrop-blur-xl space-y-2.5"
                    style={{
                      backgroundColor: `rgba(15, 20, 34, ${currentConfig.glassOpacity / 100})`,
                    }}
                  >
                    {currentConfig.collectName && (
                      <div>
                        <label className="text-[10px] font-mono text-slate-300 block mb-0.5">Full name</label>
                        <input
                          type="text"
                          required
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="e.g. Katleho Molapo"
                          className="w-full px-2.5 py-1.5 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                    )}

                    {currentConfig.collectPhone && (
                      <div>
                        <label className="text-[10px] font-mono text-slate-300 block mb-0.5">Phone number</label>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-1.5 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono">
                            🇱🇸 +266
                          </span>
                          <input
                            type="tel"
                            required
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {currentConfig.collectEmail && (
                      <div>
                        <label className="text-[10px] font-mono text-slate-300 block mb-0.5">Email (Optional)</label>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="guest@mail.ls"
                          className="w-full px-2.5 py-1.5 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                    )}

                    {currentConfig.termsEnabled && (
                      <div className="text-[9px] text-slate-300 leading-tight bg-black/30 p-2 rounded-lg border border-white/10">
                        {currentConfig.termsText}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-extrabold text-xs font-mono rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                    >
                      Continue to Pass &rarr;
                    </button>
                  </form>
                )}

                {/* STEP 2: SCOPE-SPECIFIC PLAN & PRICE SELECTION */}
                {previewStep === 'plan' && (
                  <div
                    className="rounded-2xl p-4 border border-white/20 shadow-2xl backdrop-blur-xl space-y-2.5"
                    style={{
                      backgroundColor: `rgba(15, 20, 34, ${currentConfig.glassOpacity / 100})`,
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="text-xs font-bold text-white font-mono uppercase">
                        Select {activeMeta.label} Pass
                      </span>
                      <button
                        onClick={() => setPreviewStep('identification')}
                        className="text-[10px] text-slate-400 hover:text-white font-mono"
                      >
                        &larr; Back
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {currentConfig.plans.filter((p) => p.enabled).map((plan) => {
                        const isSelected = selectedPlanId === plan.id;
                        return (
                          <label
                            key={plan.id}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#f05e17]/20 border-[#f05e17] text-white'
                                : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="selected_plan"
                                checked={isSelected}
                                onChange={() => setSelectedPlanId(plan.id)}
                                className="accent-[#f05e17]"
                              />
                              <div>
                                <div className="font-bold text-xs flex items-center gap-1.5">
                                  <span>{plan.name}</span>
                                  {plan.isPopular && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                      POPULAR
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {plan.durationLabel} · {plan.downloadSpeedMbps}Mbps
                                </div>
                              </div>
                            </div>
                            <span className="text-sm font-extrabold text-emerald-400 font-mono">
                              {currency}{plan.price}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewStep('payment')}
                      className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold text-xs font-mono rounded-xl shadow-lg"
                    >
                      Proceed to Payment &rarr;
                    </button>
                  </div>
                )}

                {/* STEP 3: PAYMENT & PIN REDEMPTION */}
                {previewStep === 'payment' && (() => {
                  const chosenPlan = currentConfig.plans.find((p) => p.id === selectedPlanId) || currentConfig.plans[0];
                  return (
                    <div
                      className="rounded-2xl p-4 border border-white/20 shadow-2xl backdrop-blur-xl space-y-2.5"
                      style={{
                        backgroundColor: `rgba(15, 20, 34, ${currentConfig.glassOpacity / 100})`,
                      }}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                        <span className="text-xs font-bold text-white font-mono uppercase">
                          Payment &amp; Voucher PIN
                        </span>
                        <button
                          onClick={() => setPreviewStep('plan')}
                          className="text-[10px] text-slate-400 hover:text-white font-mono"
                        >
                          &larr; Back
                        </button>
                      </div>

                      {/* Selected Plan & Amount Summary */}
                      <div className="bg-black/50 p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-white font-bold text-xs">{chosenPlan.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {chosenPlan.durationLabel} · {chosenPlan.downloadSpeedMbps}Mbps
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] text-slate-400 uppercase font-mono">Amount Due</div>
                          <div className="text-sm font-extrabold text-emerald-400 font-mono">
                            {currency}{chosenPlan.price}
                          </div>
                        </div>
                      </div>

                      {/* Payment Method Selector */}
                      <div className="space-y-1.5">
                        <label
                          className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer ${
                            selectedGateway === 'ottvoucher' ? 'bg-blue-600/20 border-blue-500' : 'bg-black/40 border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="gw"
                              checked={selectedGateway === 'ottvoucher'}
                              onChange={() => setSelectedGateway('ottvoucher')}
                              className="accent-blue-500"
                            />
                            <ProviderLogo provider="ottvoucher" className="w-20 h-5" />
                          </div>
                          <span className="text-[10px] font-mono text-blue-300">Digital PIN</span>
                        </label>

                        <label
                          className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer ${
                            selectedGateway === 'ecocash' ? 'bg-amber-600/20 border-amber-500' : 'bg-black/40 border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="gw"
                              checked={selectedGateway === 'ecocash'}
                              onChange={() => setSelectedGateway('ecocash')}
                              className="accent-[#f05e17]"
                            />
                            <ProviderLogo provider="ecocash" className="w-20 h-5" />
                          </div>
                          <span className="text-[10px] font-mono text-amber-300">*151# Push</span>
                        </label>
                      </div>

                      {/* Denomination Alignment Notes & PIN Input */}
                      {selectedGateway === 'ottvoucher' ? (
                        <div className="space-y-1.5 bg-blue-950/30 p-2.5 rounded-xl border border-blue-500/30">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-300">
                            <span>12-Digit OTT Voucher PIN</span>
                            <span className="text-emerald-400 font-bold">{currency}{chosenPlan.price} Denomination</span>
                          </div>
                          <input
                            type="text"
                            value={ottPin}
                            onChange={(e) => setOttPin(e.target.value)}
                            placeholder="e.g. 8921 3482 9011"
                            className="w-full px-2 py-1.5 bg-black/60 border border-blue-400/50 rounded-lg text-emerald-400 font-mono text-xs text-center font-bold tracking-wider"
                          />
                          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                            <span>Quick PINs:</span>
                            <button
                              type="button"
                              onClick={() => setOttPin('8921 3482 9011')}
                              className="px-1.5 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-400/30"
                            >
                              M10 PIN
                            </button>
                            <button
                              type="button"
                              onClick={() => setOttPin('7412 5896 3320')}
                              className="px-1.5 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-400/30"
                            >
                              M60 PIN
                            </button>
                            <button
                              type="button"
                              onClick={() => setOttPin('6301 9428 1154')}
                              className="px-1.5 py-0.5 rounded bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-400/30"
                            >
                              M280 PIN
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[10px] font-mono text-amber-200 space-y-1">
                          <div className="flex justify-between font-bold">
                            <span>EcoCash Lesotho STK Push</span>
                            <span className="text-emerald-400">{currency}{chosenPlan.price}</span>
                          </div>
                          <p className="text-slate-300 text-[10px]">
                            An automated prompt for <strong>{currency}{chosenPlan.price}</strong> will be sent to <strong>+266 {guestPhone}</strong>. Approve on your handset via *151# to activate internet.
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSimulatePayment}
                        className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold text-xs font-mono rounded-xl shadow-lg transition-colors"
                      >
                        Authorize &amp; Connect ({currency}{chosenPlan.price}) &rarr;
                      </button>
                    </div>
                  );
                })()}

                {/* STEP 4: SESSION USAGE & SUCCESS */}
                {previewStep === 'usage' && (
                  <div
                    className="rounded-2xl p-4 border border-white/20 shadow-2xl backdrop-blur-xl space-y-3 text-center"
                    style={{
                      backgroundColor: `rgba(15, 20, 34, ${currentConfig.glassOpacity / 100})`,
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>

                    <div>
                      <h4 className="font-extrabold text-white text-sm">Online &amp; Connected!</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Active on {currentConfig.brandTitle}
                      </p>
                    </div>

                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/10 space-y-1 text-xs font-mono">
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Remaining Time:</span>
                        <span className="text-emerald-400 font-bold">
                          {Math.floor(sessionRemaining / 3600)}h {Math.floor((sessionRemaining % 3600) / 60)}m
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Scope Profile:</span>
                        <span className="text-white font-bold">{activeMeta.label}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewStep('identification')}
                      className="w-full py-2 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono rounded-xl transition-colors"
                    >
                      Reset Simulator
                    </button>
                  </div>
                )}
              </div>

              {/* Footer Powered By Lockup */}
              <div className="relative z-10 text-center text-[10px] font-mono text-slate-400 pb-1">
                Powered by T-Connect · High-Speed Starlink Backbone
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
