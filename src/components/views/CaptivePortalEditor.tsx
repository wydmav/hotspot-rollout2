import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Sliders, 
  Smartphone, 
  Monitor, 
  Check, 
  Eye, 
  Sparkles, 
  Lock, 
  Layers, 
  Save, 
  Download, 
  Trash2, 
  Wifi, 
  Globe, 
  CheckCircle2, 
  Info, 
  RefreshCw 
} from 'lucide-react';
import { HotspotPlan, GatewayProvider } from '../../types';
import { ProviderLogo } from '../common/BrandLogos';

export interface PortalEditorConfig {
  bgImage: string;
  bgDarken: number; // 0 - 100
  glassOpacity: number; // 10 - 100
  cardWidthPx: number; // 280 - 480
  cardPaddingPx: number; // 12 - 32
  cardRadiusPx: number; // 8 - 32
  cardPlacement: 'top' | 'center' | 'bottom';
  // Fields toggles
  collectName: boolean;
  nameRequired: boolean;
  collectPhone: boolean;
  phoneRequired: boolean;
  collectEmail: boolean;
  emailRequired: boolean;
  collectGender: boolean;
  collectDob: boolean;
  defaultCountryCode: string;
  // Content
  brandTitle: string;
  tagline: string;
  welcomeHeadline: string;
  termsEnabled: boolean;
  termsText: string;
  accentColor: string;
}

const DEFAULT_CONFIG: PortalEditorConfig = {
  bgImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  bgDarken: 25,
  glassOpacity: 88,
  cardWidthPx: 340,
  cardPaddingPx: 20,
  cardRadiusPx: 20,
  cardPlacement: 'bottom',
  collectName: true,
  nameRequired: true,
  collectPhone: true,
  phoneRequired: true,
  collectEmail: true,
  emailRequired: false,
  collectGender: false,
  collectDob: false,
  defaultCountryCode: '+266',
  brandTitle: 'T-CONNECT',
  tagline: 'STARLINK AUTHORISED RESELLER',
  welcomeHeadline: 'WHAT DO YOU CONNECT FOR?',
  termsEnabled: true,
  termsText: 'Amohela Liphelo Tsa Tšebetso: Rea u amohela ho khokelo ea rona ea marang-rang a mahala. Molemong oa hore sechaba sa bo rona se natefeloe ke khokelo ena, latela melao le lipehelo tsa marang-rang.',
  accentColor: '#f05e17',
};

const COUNTRY_OPTIONS = [
  { code: '+266', flag: '🇱🇸', name: 'Lesotho' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+267', flag: '🇧🇼', name: 'Botswana' },
  { code: '+268', flag: '🇸🇿', name: 'Eswatini' },
  { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+1', flag: '🇺🇸', name: 'United States' },
];

const PRESET_WALLPAPERS = [
  {
    name: 'Lesotho Maloti Range',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Starlink Night Orbit',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'High-Speed Cyber Grid',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Lush Green Canopy',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
  },
];

interface CaptivePortalEditorProps {
  initialConfig?: Partial<PortalEditorConfig>;
  onSaveConfig?: (config: PortalEditorConfig) => void;
  plans?: HotspotPlan[];
  currency?: string;
}

export const CaptivePortalEditor: React.FC<CaptivePortalEditorProps> = ({
  initialConfig,
  onSaveConfig,
  plans = [],
  currency = 'M',
}) => {
  const [config, setConfig] = useState<PortalEditorConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [activeStep, setActiveStep] = useState<'identification' | 'payment' | 'usage'>('identification');
  const [deviceFrame, setDeviceFrame] = useState<'iphone' | 'android' | 'desktop'>('iphone');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guest simulation test inputs
  const [testName, setTestName] = useState('');
  const [testPhone, setTestPhone] = useState('5800 1234');
  const [testEmail, setTestEmail] = useState('');
  const [testCountry, setTestCountry] = useState(
    COUNTRY_OPTIONS.find((c) => c.code === config.defaultCountryCode) || COUNTRY_OPTIONS[0]
  );
  const [testTermsAccepted, setTestTermsAccepted] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState<GatewayProvider>('ecocash');

  // Handle local image upload via FileReader
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
        setConfig((prev) => ({ ...prev, bgImage: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFillSample = () => {
    setTestName('Katleho Molapo');
    setTestPhone('5912 3456');
    setTestEmail('katleho.molapo@gmail.com');
    setTestTermsAccepted(true);
  };

  const handleSave = () => {
    if (onSaveConfig) {
      onSaveConfig(config);
    }
    // Also persist to localStorage for instant reload permanence
    try {
      localStorage.setItem('tconnect_portal_editor_config', JSON.stringify(config));
    } catch {
      // ignore storage errors
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `portal-config-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Editor Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0e17] p-4 rounded-xl border border-[#1b233a]">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#f05e17]" />
            <h2 className="text-base font-extrabold text-white tracking-tight">Captive Portal Live Visual Editor</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f05e17]/10 text-[#f05e17] border border-[#f05e17]/30">
              Admin Suite
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Configure custom wallpapers, box dimensions, opacity, and guest capture fields with real-time feedback
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161d31] hover:bg-[#232d42] border border-[#232d42] text-slate-300 text-xs font-mono rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white text-xs font-bold font-mono rounded-lg shadow-sm transition-all"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Config Saved!' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Controls (Left 6 Cols) and Device Preview (Right 6 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =================================================================== */}
        {/* LEFT COLUMN: ADMIN SETTINGS ACCORDION & SLIDERS                     */}
        {/* =================================================================== */}
        <div className="lg:col-span-6 space-y-4">
          {/* Card 1: Background Wallpaper & Upload */}
          <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#1b233a] pb-2">
              <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" /> Background Wallpaper
              </span>
              <span className="text-[10px] text-slate-500">JPG, PNG, WebP up to 5MB</span>
            </div>

            {/* Custom File Upload Button */}
            <div className="flex items-center gap-3">
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
                className="flex-1 py-2.5 px-3 bg-[#161d31] hover:bg-[#232d42] border border-dashed border-slate-500/50 hover:border-[#f05e17] rounded-xl text-slate-200 text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#f05e17]" />
                <span>Upload Custom Image From Disk</span>
              </button>

              {config.bgImage && (
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, bgImage: DEFAULT_CONFIG.bgImage }))}
                  className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl"
                  title="Reset to default"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Wallpapers Presets */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-bold">Or Select From Curated Wallpapers</label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_WALLPAPERS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, bgImage: preset.url }))}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      config.bgImage === preset.url
                        ? 'border-[#f05e17] bg-[#f05e17]/10 text-white font-bold'
                        : 'border-[#232d42] bg-[#161d31] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="truncate">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Background Darken Overlay Slider */}
            <div className="pt-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">Background Darken Overlay</span>
                <span className="text-white font-bold">{config.bgDarken}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="85"
                value={config.bgDarken}
                onChange={(e) => setConfig((prev) => ({ ...prev, bgDarken: Number(e.target.value) }))}
                className="w-full accent-[#f05e17]"
              />
            </div>
          </div>

          {/* Card 2: Signup Box Dimensions & Opacity */}
          <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-4 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#1b233a] pb-2">
              <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#f05e17]" /> Box Dimensions &amp; Opacity
              </span>
              <span className="text-[10px] text-slate-500">Pixel Geometry</span>
            </div>

            {/* Glass Opacity Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400 font-bold">Signup Box Glass Opacity</span>
                <span className="text-white font-bold">{config.glassOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={config.glassOpacity}
                onChange={(e) => setConfig((prev) => ({ ...prev, glassOpacity: Number(e.target.value) }))}
                className="w-full accent-[#f05e17]"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>10% (Ultra Sheer Glass)</span>
                <span>85% (Balanced)</span>
                <span>100% (Solid)</span>
              </div>
            </div>

            {/* Box Width (Dimensions) Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400 font-bold">Box Width (Pixel Dimensions)</span>
                <span className="text-white font-bold">{config.cardWidthPx}px</span>
              </div>
              <input
                type="range"
                min="260"
                max="460"
                step="10"
                value={config.cardWidthPx}
                onChange={(e) => setConfig((prev) => ({ ...prev, cardWidthPx: Number(e.target.value) }))}
                className="w-full accent-[#f05e17]"
              />
              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 mt-2">
                {[
                  { label: 'Compact (280px)', val: 280 },
                  { label: 'Standard (340px)', val: 340 },
                  { label: 'Comfort (380px)', val: 380 },
                  { label: 'Wide (440px)', val: 440 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, cardWidthPx: p.val }))}
                    className={`flex-1 py-1 px-1 rounded text-[10px] font-bold border transition-colors ${
                      config.cardWidthPx === p.val
                        ? 'bg-[#f05e17] border-[#f05e17] text-white'
                        : 'bg-[#161d31] border-[#232d42] text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Inner Padding & Border Radius */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400">Inner Padding</span>
                  <span className="text-white font-bold">{config.cardPaddingPx}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="32"
                  value={config.cardPaddingPx}
                  onChange={(e) => setConfig((prev) => ({ ...prev, cardPaddingPx: Number(e.target.value) }))}
                  className="w-full accent-[#f05e17]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400">Corner Radius</span>
                  <span className="text-white font-bold">{config.cardRadiusPx}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="36"
                  value={config.cardRadiusPx}
                  onChange={(e) => setConfig((prev) => ({ ...prev, cardRadiusPx: Number(e.target.value) }))}
                  className="w-full accent-[#f05e17]"
                />
              </div>
            </div>

            {/* Card Placement (Top, Center, Bottom) */}
            <div>
              <label className="text-slate-400 block mb-1 font-bold">Box Placement</label>
              <div className="grid grid-cols-3 gap-2">
                {(['top', 'center', 'bottom'] as const).map((placement) => (
                  <button
                    key={placement}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, cardPlacement: placement }))}
                    className={`py-1.5 rounded-lg border uppercase text-[10px] font-bold transition-colors ${
                      config.cardPlacement === placement
                        ? 'bg-[#f05e17] border-[#f05e17] text-white'
                        : 'bg-[#161d31] border-[#232d42] text-slate-400 hover:text-white'
                    }`}
                  >
                    {placement}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Form Fields Configuration (Required Toggles) */}
          <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#1b233a] pb-2">
              <span className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" /> Guest Capture Form Fields
              </span>
              <span className="text-[10px] text-slate-500">Toggle &amp; Validation</span>
            </div>

            {/* Field: Full Name */}
            <div className="p-2.5 bg-[#161d31] rounded-xl border border-[#232d42] flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.collectName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, collectName: e.target.checked }))}
                  className="accent-[#f05e17] rounded"
                />
                <span className="text-white font-bold">Full Name</span>
              </label>

              {config.collectName && (
                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.nameRequired}
                    onChange={(e) => setConfig((prev) => ({ ...prev, nameRequired: e.target.checked }))}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Mandatory / Required</span>
                </label>
              )}
            </div>

            {/* Field: Phone Number with Country Flag */}
            <div className="p-2.5 bg-[#161d31] rounded-xl border border-[#232d42] space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.collectPhone}
                    onChange={(e) => setConfig((prev) => ({ ...prev, collectPhone: e.target.checked }))}
                    className="accent-[#f05e17] rounded"
                  />
                  <span className="text-white font-bold">Phone Number (with Flag &amp; Country Code)</span>
                </label>

                {config.collectPhone && (
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.phoneRequired}
                      onChange={(e) => setConfig((prev) => ({ ...prev, phoneRequired: e.target.checked }))}
                      className="accent-emerald-500 rounded"
                    />
                    <span>Mandatory</span>
                  </label>
                )}
              </div>

              {config.collectPhone && (
                <div className="flex items-center gap-2 pt-1 border-t border-[#232d42] text-[11px]">
                  <span className="text-slate-400">Default Dial Code:</span>
                  <select
                    value={config.defaultCountryCode}
                    onChange={(e) => setConfig((prev) => ({ ...prev, defaultCountryCode: e.target.value }))}
                    className="px-2 py-1 bg-black/50 border border-slate-700 rounded text-white"
                  >
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Field: Email Address */}
            <div className="p-2.5 bg-[#161d31] rounded-xl border border-[#232d42] flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.collectEmail}
                  onChange={(e) => setConfig((prev) => ({ ...prev, collectEmail: e.target.checked }))}
                  className="accent-[#f05e17] rounded"
                />
                <span className="text-white font-bold">Email Address</span>
              </label>

              {config.collectEmail && (
                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.emailRequired}
                    onChange={(e) => setConfig((prev) => ({ ...prev, emailRequired: e.target.checked }))}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Mandatory</span>
                </label>
              )}
            </div>

            {/* Secondary Demographic Toggles */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="p-2 bg-[#161d31] rounded-lg border border-[#232d42] flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.collectGender}
                  onChange={(e) => setConfig((prev) => ({ ...prev, collectGender: e.target.checked }))}
                  className="accent-[#f05e17]"
                />
                <span>Gender</span>
              </label>

              <label className="p-2 bg-[#161d31] rounded-lg border border-[#232d42] flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.collectDob}
                  onChange={(e) => setConfig((prev) => ({ ...prev, collectDob: e.target.checked }))}
                  className="accent-[#f05e17]"
                />
                <span>Date of Birth</span>
              </label>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: LIVE SIMULATOR DEVICE PREVIEW                         */}
        {/* =================================================================== */}
        <div className="lg:col-span-6 flex flex-col items-center">
          {/* Preview Navigation & Device Switcher */}
          <div className="w-full flex items-center justify-between gap-3 mb-4 bg-[#0a0e17] p-2.5 rounded-xl border border-[#1b233a]">
            {/* Step Selector */}
            <div className="flex items-center gap-1 text-[11px] font-mono">
              {(['identification', 'payment', 'usage'] as const).map((step) => (
                <button
                  key={step}
                  onClick={() => setActiveStep(step)}
                  className={`px-3 py-1 rounded-md capitalize transition-colors ${
                    activeStep === step
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
                onClick={() => setDeviceFrame('desktop')}
                className={`p-1.5 rounded-md ${deviceFrame === 'desktop' ? 'bg-[#232d42] text-white' : 'text-slate-400'}`}
                title="Desktop Browser"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Device Frame */}
          <div
            className={`w-full ${
              deviceFrame === 'desktop' ? 'max-w-xl' : 'max-w-[390px]'
            } bg-[#05070c] rounded-[36px] border-8 border-[#1f283d] shadow-2xl overflow-hidden relative transition-all`}
          >
            {/* Phone Status Bar */}
            <div className="bg-black/80 backdrop-blur-md px-5 py-2.5 flex items-center justify-between text-[11px] font-mono text-slate-300 border-b border-white/10 z-20 relative">
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-[#f05e17]" />
                <span className="font-bold">T-Connect Wi-Fi</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {deviceFrame === 'iphone' ? 'captive.apple.com' : 'connectivitycheck.gstatic.com'}
              </div>
            </div>

            {/* Viewport with Background Image & Darken */}
            <div
              className="relative min-h-[580px] p-4 flex flex-col justify-between bg-cover bg-center transition-all duration-300"
              style={{
                backgroundImage: `url(${config.bgImage})`,
              }}
            >
              {/* Darken Layer */}
              <div
                className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                style={{ opacity: config.bgDarken / 100 }}
              />

              {/* Brand Header */}
              <div className="relative z-10 text-center pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#f05e17] animate-pulse" />
                  <span className="text-[11px] font-extrabold tracking-wider text-white font-mono">
                    {config.brandTitle} <span className="text-slate-400">·</span> {config.tagline}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
                  {config.welcomeHeadline}
                </h2>
              </div>

              {/* DYNAMIC SIGNUP BOX WITH ADMIN-CONFIGURED WIDTH, OPACITY, PADDING & RADIUS */}
              <div
                className={`relative z-10 mx-auto w-full transition-all ${
                  config.cardPlacement === 'top' ? 'mt-4' : config.cardPlacement === 'bottom' ? 'mt-auto' : 'my-auto'
                }`}
                style={{
                  maxWidth: `${config.cardWidthPx}px`,
                }}
              >
                {/* STEP 1: IDENTIFICATION FORM */}
                {activeStep === 'identification' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setActiveStep('payment');
                    }}
                    className="border border-white/20 shadow-2xl backdrop-blur-xl space-y-3"
                    style={{
                      backgroundColor: `rgba(15, 20, 34, ${config.glassOpacity / 100})`,
                      padding: `${config.cardPaddingPx}px`,
                      borderRadius: `${config.cardRadiusPx}px`,
                    }}
                  >
                    {/* Full Name */}
                    {config.collectName && (
                      <div>
                        <label className="text-[11px] font-mono text-slate-300 block mb-1">
                          Full name {config.nameRequired && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="text"
                          value={testName}
                          onChange={(e) => setTestName(e.target.value)}
                          placeholder="e.g. Katleho Molapo"
                          required={config.nameRequired}
                          className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#f05e17]"
                        />
                      </div>
                    )}

                    {/* Phone with Country Flag & Selector */}
                    {config.collectPhone && (
                      <div>
                        <label className="text-[11px] font-mono text-slate-300 block mb-1">
                          Phone number {config.phoneRequired && <span className="text-red-400">*</span>}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={testCountry.code}
                            onChange={(e) => {
                              const found = COUNTRY_OPTIONS.find((c) => c.code === e.target.value);
                              if (found) setTestCountry(found);
                            }}
                            className="px-2 py-2 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#f05e17] cursor-pointer"
                          >
                            {COUNTRY_OPTIONS.map((c) => (
                              <option key={c.code} value={c.code} className="bg-[#0f1422] text-white">
                                {c.flag} {c.code}
                              </option>
                            ))}
                          </select>

                          <input
                            type="tel"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="5800 1234"
                            required={config.phoneRequired}
                            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#f05e17]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    {config.collectEmail && (
                      <div>
                        <label className="text-[11px] font-mono text-slate-300 block mb-1">
                          Email address {config.emailRequired && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="katleho@example.com"
                          required={config.emailRequired}
                          className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#f05e17]"
                        />
                      </div>
                    )}

                    {/* Terms of Use */}
                    {config.termsEnabled && (
                      <label className="flex items-start gap-2 text-[10px] text-slate-300 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={testTermsAccepted}
                          onChange={(e) => setTestTermsAccepted(e.target.checked)}
                          required
                          className="accent-[#f05e17] mt-0.5 rounded"
                        />
                        <span>
                          I have read and accept the <strong>Terms of Use</strong>
                        </span>
                      </label>
                    )}

                    {/* Sample Fill Button */}
                    <button
                      type="button"
                      onClick={handleFillSample}
                      className="w-full py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[11px] font-bold text-amber-300 font-mono flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>✨ Fill with sample data</span>
                    </button>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-extrabold text-xs font-mono rounded-xl shadow-lg transition-transform active:scale-95"
                    >
                      Connect &rarr;
                    </button>
                  </form>
                )}

                {/* STEP 2: PAYMENT GATEWAY CARDS */}
                {activeStep === 'payment' && (
                  <div
                    className="border border-white/20 shadow-2xl backdrop-blur-xl space-y-3"
                    style={{
                      backgroundColor: `rgba(15, 20, 34, ${config.glassOpacity / 100})`,
                      padding: `${config.cardPaddingPx}px`,
                      borderRadius: `${config.cardRadiusPx}px`,
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-xs font-extrabold text-white font-mono uppercase">
                        Select Payment Method
                      </span>
                      <button
                        onClick={() => setActiveStep('identification')}
                        className="text-[10px] text-slate-400 hover:text-white font-mono"
                      >
                        &larr; Back
                      </button>
                    </div>

                    <div className="space-y-2">
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
                          <ProviderLogo provider="ottvoucher" className="w-24 h-6" />
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
                          <ProviderLogo provider="ecocash" className="w-24 h-6" />
                        </div>
                        <span className="text-[10px] font-mono text-amber-300">*151# Push</span>
                      </label>
                    </div>

                    {selectedGateway === 'ottvoucher' && (
                      <div className="pt-1 space-y-1">
                        <label className="text-[10px] font-mono text-slate-300 block">12-Digit OTT Voucher PIN</label>
                        <input
                          type="text"
                          defaultValue="8921 3482 9011"
                          placeholder="8921 3482 9011"
                          className="w-full px-2.5 py-1.5 bg-black/50 border border-blue-400/50 rounded-lg text-emerald-400 font-mono text-xs text-center font-bold"
                        />
                      </div>
                    )}

                    <button
                      onClick={() => setActiveStep('usage')}
                      className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold text-xs font-mono rounded-xl shadow-lg"
                    >
                      Authorize &amp; Connect &rarr;
                    </button>
                  </div>
                )}

                {/* STEP 3: SESSION USAGE (SCREENSHOT 3) */}
                {activeStep === 'usage' && (
                  <div
                    className="border border-white/20 shadow-2xl backdrop-blur-xl space-y-3 text-center"
                    style={{
                      backgroundColor: `rgba(15, 20, 34, ${config.glassOpacity / 100})`,
                      padding: `${config.cardPaddingPx}px`,
                      borderRadius: `${config.cardRadiusPx}px`,
                    }}
                  >
                    <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-[10px] font-mono text-blue-300 flex items-center gap-1.5 text-left">
                      <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>The link on this screen will be sent by email / SMS</span>
                    </div>

                    <div className="p-3 bg-black/50 rounded-xl border border-white/10 space-y-1">
                      <div className="text-[10px] font-mono text-slate-400">Time usage</div>
                      <div className="text-xl font-black text-white font-mono">41.17% Used</div>
                      <div className="text-xs font-bold text-emerald-400 font-mono">
                        3 Days, 14 Hours, 22 Minutes remaining
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                        <div className="bg-emerald-500 h-full rounded-full w-2/5" />
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveStep('identification')}
                      className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-mono"
                    >
                      Back to Start
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="relative z-10 text-center text-[10px] font-mono text-slate-400/80 pt-2">
                Powered by T-Connect Cloud Controller
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
