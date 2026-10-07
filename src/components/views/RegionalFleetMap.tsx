import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Wifi, 
  Radio, 
  Layers, 
  Zap, 
  Sun, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users, 
  Server, 
  SlidersHorizontal,
  Compass,
  Info
} from 'lucide-react';
import { RouterDevice, VerticalType } from '../../types';

interface RegionalFleetMapProps {
  routers: RouterDevice[];
  onSelectRouter?: (routerId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

// Canonical Lesotho Regions & Coordinates for Mapping
export interface RegionNode {
  id: string;
  name: string;
  district: string;
  category: 'urban' | 'transit' | 'highland' | 'border' | 'rural';
  lat: number;
  lng: number;
  // Normalized percentage coordinate inside Lesotho bounding box
  // [Lat: -28.4 to -30.8], [Lng: 27.0 to 29.6]
  posX: number; // 0 - 100%
  posY: number; // 0 - 100%
  defaultModel: string;
  defaultUplink: string;
}

const LESOTHO_HUBS: RegionNode[] = [
  {
    id: 'hub_maseru_mall',
    name: 'Maseru Mall & Pioneer Mall',
    district: 'Maseru',
    category: 'urban',
    lat: -29.3151,
    lng: 27.4869,
    posX: 19,
    posY: 38,
    defaultModel: 'MikroTik hAP ax³ (Wi-Fi 6)',
    defaultUplink: 'Starlink Business + Metro Fiber',
  },
  {
    id: 'hub_maseru_kingsway',
    name: 'Kingsway CBD & Taxi Rank',
    district: 'Maseru',
    category: 'urban',
    lat: -29.3100,
    lng: 27.4800,
    posX: 18,
    posY: 35,
    defaultModel: 'MikroTik hAP ax³ + cAP ax',
    defaultUplink: 'Starlink Standard (500GB)',
  },
  {
    id: 'hub_roma_nul',
    name: 'National University of Lesotho (Roma)',
    district: 'Maseru',
    category: 'urban',
    lat: -29.4486,
    lng: 27.7081,
    posX: 27,
    posY: 43,
    defaultModel: 'MikroTik CCR2004 + hAP ax³',
    defaultUplink: 'Starlink High Performance',
  },
  {
    id: 'hub_ty_crafts',
    name: 'Teyateyaneng Crafts & Market',
    district: 'Berea',
    category: 'urban',
    lat: -29.1472,
    lng: 27.7490,
    posX: 29,
    posY: 31,
    defaultModel: 'MikroTik hAP ax³',
    defaultUplink: 'Starlink Standard',
  },
  {
    id: 'hub_maputsoe_border',
    name: 'Maputsoe Border Gateway',
    district: 'Leribe',
    category: 'border',
    lat: -28.8872,
    lng: 27.9000,
    posX: 35,
    posY: 20,
    defaultModel: 'MikroTik hAP ax³ (Outdoor Enclosure)',
    defaultUplink: 'Starlink Priority + Econet LTE',
  },
  {
    id: 'hub_hlotse_market',
    name: 'Hlotse Commercial Hub',
    district: 'Leribe',
    category: 'urban',
    lat: -28.8719,
    lng: 28.0450,
    posX: 40,
    posY: 19,
    defaultModel: 'MikroTik hAP ax³',
    defaultUplink: 'Starlink Standard',
  },
  {
    id: 'hub_butha_buthe',
    name: 'Butha-Buthe Public Transport Terminal',
    district: 'Butha-Buthe',
    category: 'transit',
    lat: -28.7667,
    lng: 28.2400,
    posX: 48,
    posY: 15,
    defaultModel: 'MikroTik hAP ax³',
    defaultUplink: 'Starlink Standard',
  },
  {
    id: 'hub_katse_dam',
    name: 'Katse Dam Hydro & Tourism Complex',
    district: 'Thaba-Tseka',
    category: 'highland',
    lat: -29.3333,
    lng: 28.5000,
    posX: 58,
    posY: 39,
    defaultModel: 'MikroTik Solar Mesh (48V PoE)',
    defaultUplink: 'Starlink Mobile Priority',
  },
  {
    id: 'hub_mokhotlong',
    name: 'Mokhotlong High-Altitude Station',
    district: 'Mokhotlong',
    category: 'highland',
    lat: -29.2894,
    lng: 29.0675,
    posX: 79,
    posY: 37,
    defaultModel: 'MikroTik hAP ax³ Solar Hybrid',
    defaultUplink: 'Starlink High Performance LEO',
  },
  {
    id: 'hub_sani_pass',
    name: 'Sani Pass Mountain Outpost',
    district: 'Mokhotlong',
    category: 'highland',
    lat: -29.5850,
    lng: 29.2860,
    posX: 88,
    posY: 49,
    defaultModel: 'MikroTik hAP ax³ Rugged',
    defaultUplink: 'Starlink Satellite',
  },
  {
    id: 'hub_thaba_tseka',
    name: 'Thaba-Tseka Central Clinic & Post',
    district: 'Thaba-Tseka',
    category: 'rural',
    lat: -29.5220,
    lng: 28.6080,
    posX: 62,
    posY: 47,
    defaultModel: 'MikroTik hAP ax³ Solar',
    defaultUplink: 'Starlink Standard',
  },
  {
    id: 'hub_mafeteng_taxi',
    name: 'Mafeteng Bus & Taxi Interchange',
    district: 'Mafeteng',
    category: 'transit',
    lat: -29.8230,
    lng: 27.2374,
    posX: 10,
    posY: 59,
    defaultModel: 'MikroTik hAP ax³',
    defaultUplink: 'Starlink Standard + Vodacom LTE',
  },
  {
    id: 'hub_mohale_hoek',
    name: 'Mohale\'s Hoek Retail Center',
    district: 'Mohale\'s Hoek',
    category: 'urban',
    lat: -30.1514,
    lng: 27.4764,
    posX: 18,
    posY: 73,
    defaultModel: 'MikroTik hAP ax³',
    defaultUplink: 'Starlink Standard',
  },
  {
    id: 'hub_quthing_clinic',
    name: 'Quthing Moorosi Health Clinic',
    district: 'Quthing',
    category: 'rural',
    lat: -30.4000,
    lng: 27.7000,
    posX: 27,
    posY: 83,
    defaultModel: 'MikroTik hAP ax³ Solar',
    defaultUplink: 'Starlink Standard',
  },
  {
    id: 'hub_qachas_nek',
    name: 'Qacha\'s Nek Border Outpost',
    district: 'Qacha\'s Nek',
    category: 'border',
    lat: -30.1154,
    lng: 28.6894,
    posX: 65,
    posY: 71,
    defaultModel: 'MikroTik hAP ax³ Rugged',
    defaultUplink: 'Starlink Priority',
  }
];

export interface MappedRegionNode extends RegionNode {
  assignedRouters: RouterDevice[];
  status: 'online' | 'pending' | 'offline' | 'demo_ready';
  activeSessions: number;
  isFreeMode: boolean;
  hasSolar: boolean;
  hasFailover: boolean;
}

export const RegionalFleetMap: React.FC<RegionalFleetMapProps> = ({
  routers = [],
  onSelectRouter,
  onNavigateTab,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedHubId, setSelectedHubId] = useState<string>(LESOTHO_HUBS[0].id);
  const [mapStyle, setMapStyle] = useState<'cyber' | 'topo' | 'satellite'>('cyber');
  const [showLabels, setShowLabels] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Map physical routers from fleet state to nearest regional hub or direct coordinates
  const mappedHubs = useMemo(() => {
    return LESOTHO_HUBS.map((hub) => {
      // Find matching routers by district, siteName, or id
      const matchedRouters = routers.filter((r) => {
        const text = `${r.siteName} ${r.name} ${r.model}`.toLowerCase();
        const hubWords = `${hub.name} ${hub.district}`.toLowerCase().split(/\s+/);
        return hubWords.some((word) => word.length > 3 && text.includes(word));
      });

      const hasOnline = matchedRouters.some((r) => r.status === 'online');
      const hasPending = matchedRouters.some((r) => r.status === 'pending_adoption');
      const totalSessions = matchedRouters.reduce((acc, curr) => acc + (curr.activeSessions || 0), 0);
      const isFreeMode = matchedRouters.some((r) => r.freeModeEnabled);
      const hasSolar = matchedRouters.some((r) => r.solarTelemetry && r.solarTelemetry.batteryPercent > 0);
      const hasFailover = matchedRouters.some((r) => r.wanFailoverEnabled);

      const nodeStatus: 'online' | 'pending' | 'offline' | 'demo_ready' = 
        matchedRouters.length > 0
          ? (hasOnline ? 'online' : hasPending ? 'pending' : 'offline')
          : 'demo_ready';

      const node: MappedRegionNode = {
        ...hub,
        assignedRouters: matchedRouters,
        status: nodeStatus,
        activeSessions: totalSessions,
        isFreeMode,
        hasSolar,
        hasFailover,
      };
      return node;
    });
  }, [routers]);

  // Filtered hubs by district and search
  const filteredHubs = useMemo(() => {
    return mappedHubs.filter((hub) => {
      const matchDistrict = selectedDistrict === 'all' || hub.district.toLowerCase() === selectedDistrict.toLowerCase();
      const matchSearch = searchQuery === '' || 
        hub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hub.district.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDistrict && matchSearch;
    });
  }, [mappedHubs, selectedDistrict, searchQuery]);

  const uniqueDistricts = useMemo(() => {
    return ['all', ...Array.from(new Set(LESOTHO_HUBS.map((h) => h.district)))];
  }, []);

  const totalHotspotsCount = useMemo(() => {
    const fromRouters = routers.length;
    return fromRouters > 0 ? fromRouters : LESOTHO_HUBS.length;
  }, [routers]);

  const totalActiveSubscribers = useMemo(() => {
    const fromFleet = routers.reduce((acc, curr) => acc + (curr.activeSessions || 0), 0);
    return fromFleet > 0 ? fromFleet : 42;
  }, [routers]);

  const selectedHub: MappedRegionNode = useMemo(() => {
    return mappedHubs.find((h) => h.id === selectedHubId) || mappedHubs[0];
  }, [mappedHubs, selectedHubId]);

  return (
    <div className={`bg-[#0f1422] rounded-xl border border-[#232d42] overflow-hidden transition-all duration-300 ${
      isExpanded ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : 'space-y-4 p-5'
    }`}>
      {/* Header & Controls Bar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isExpanded ? 'p-4 bg-[#0a0e17] border-b border-[#1b233a]' : 'border-b border-[#1b233a] pb-4'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#f05e17]" />
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Regional Hotspot Distribution &amp; Physical Fleet Map
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Kingdom of Lesotho (SADC)
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time geospatial layout of Starlink LEO gateways, community mesh nodes, and transit links
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search region or city..."
              className="pl-8 pr-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#f05e17]"
            />
          </div>

          {/* Map Style Selector */}
          <div className="flex items-center p-1 bg-[#121829] rounded-lg border border-[#1f283d] text-[11px]">
            <button
              onClick={() => setMapStyle('cyber')}
              className={`px-2 py-1 rounded transition-colors ${
                mapStyle === 'cyber' ? 'bg-[#f05e17] text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cyber Dark
            </button>
            <button
              onClick={() => setMapStyle('topo')}
              className={`px-2 py-1 rounded transition-colors ${
                mapStyle === 'topo' ? 'bg-[#f05e17] text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Topographic
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-2 py-1 rounded transition-colors ${
                mapStyle === 'satellite' ? 'bg-[#f05e17] text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite Grid
            </button>
          </div>

          {/* Toggle Labels */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
              showLabels
                ? 'bg-[#161d31] border-[#232d42] text-slate-200'
                : 'bg-black/40 border-slate-700 text-slate-500'
            }`}
            title="Toggle City & Station Labels"
          >
            Labels: {showLabels ? 'ON' : 'OFF'}
          </button>

          {/* Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg transition-colors"
            title={isExpanded ? 'Minimize View' : 'Fullscreen Map'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* District Filter Pills Bar */}
      <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none ${
        isExpanded ? 'px-4 py-2 bg-[#0d121f] border-b border-[#1b233a]' : ''
      }`}>
        <span className="text-[11px] text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-[#f05e17]" /> District:
        </span>
        {uniqueDistricts.map((dist) => (
          <button
            key={dist}
            onClick={() => setSelectedDistrict(dist)}
            className={`px-3 py-1 rounded-full whitespace-nowrap capitalize text-[11px] transition-all ${
              selectedDistrict === dist
                ? 'bg-[#f05e17] text-white font-bold shadow-sm'
                : 'bg-[#161d31] hover:bg-[#202942] text-slate-400 hover:text-white border border-[#232d42]'
            }`}
          >
            {dist === 'all' ? 'All Districts (10)' : dist}
          </button>
        ))}
      </div>

      {/* Main Map Canvas and Detail Drawer Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${isExpanded ? 'flex-1 p-4 overflow-hidden' : ''}`}>
        {/* LEFT / CENTER (8 COLS): INTERACTIVE SVG VECTOR MAP OF LESOTHO */}
        <div className={`lg:col-span-8 bg-[#070a12] rounded-xl border border-[#1b233a] relative overflow-hidden flex flex-col justify-between ${
          isExpanded ? 'h-full min-h-[500px]' : 'min-h-[460px]'
        }`}>
          {/* Top Floating Map Stats Overlay */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
            <div className="bg-[#0f1422]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#232d42] text-[11px] font-mono text-slate-300 flex items-center gap-2 shadow-lg pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span><strong>{totalHotspotsCount}</strong> Total Hotspots Plotted</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400 font-bold">{totalActiveSubscribers}</span> Active Clients
            </div>

            <div className="hidden sm:flex bg-[#0f1422]/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-[#232d42] text-[10px] font-mono text-slate-400 items-center gap-1.5 shadow-lg">
              <Radio className="w-3 h-3 text-[#f05e17]" />
              <span>Starlink LEO Uplink</span>
            </div>
          </div>

          {/* SVG Map Canvas with Custom Terrain & District Outlines */}
          <div className="relative w-full h-full min-h-[420px] flex items-center justify-center p-4">
            {/* Background Cyber Graticule Grid */}
            <svg
              className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#232d42" strokeWidth="0.8" />
                </pattern>
                <radialGradient id="mapGlow" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#f05e17" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#070a12" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#gridPattern)" />
              <rect width="100%" height="100%" fill="url(#mapGlow)" />
            </svg>

            {/* Stylized Vector Silhouette of Lesotho Border & Maloti Mountain Ridge */}
            <svg
              viewBox="0 0 800 650"
              className="w-full h-full max-h-[500px] select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Outer South Africa Buffer Outline (Subtle Border) */}
              <path
                d="M 50,220 C 120,100 240,40 400,30 C 580,20 720,80 760,200 C 800,320 780,480 680,560 C 540,640 320,620 180,580 C 80,540 20,400 50,220 Z"
                fill="none"
                stroke="#161d31"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                className="opacity-40"
              />

              {/* Lesotho Sovereign District Boundary Silhouette */}
              <path
                d="M 160,240 
                   C 190,190 260,130 330,110 
                   C 390,90 480,95 560,110 
                   C 630,120 700,180 730,260 
                   C 750,330 730,420 680,480 
                   C 630,540 550,580 480,570 
                   C 420,560 360,570 300,560 
                   C 220,550 160,510 130,440 
                   C 100,380 120,300 160,240 Z"
                fill={
                  mapStyle === 'topo'
                    ? '#0e1828'
                    : mapStyle === 'satellite'
                    ? '#0b1320'
                    : '#090e1a'
                }
                stroke="#2a3754"
                strokeWidth="2.5"
                className="transition-colors duration-500"
              />

              {/* Maloti Mountain Escarpment & Drakensberg Ridge Line */}
              <path
                d="M 380,130 Q 520,240 600,350 T 670,490"
                fill="none"
                stroke="#f05e17"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.35"
              />

              {/* Senqu (Orange) River & Katse Catchment Basin */}
              <path
                d="M 480,220 Q 500,310 440,390 T 360,490 T 260,550"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.4"
              />

              {/* Region Territory Labels (Watermark Style) */}
              <text x="210" y="270" fill="#2d3d5e" fontSize="13" fontFamily="monospace" fontWeight="bold" opacity="0.6">
                WESTERN LOWLANDS (MASERU / BEREA)
              </text>
              <text x="490" y="240" fill="#2d3d5e" fontSize="13" fontFamily="monospace" fontWeight="bold" opacity="0.6">
                MALOTI HIGHLANDS (KATSE / MOKHOTLONG)
              </text>
              <text x="240" y="490" fill="#2d3d5e" fontSize="12" fontFamily="monospace" fontWeight="bold" opacity="0.5">
                SOUTHERN DISTRICTS (MAFETENG / QUTHING)
              </text>
            </svg>

            {/* STATIC & DYNAMIC PINS OVERLAY (ABSOLUTE PERCENTAGE POSITIONING) */}
            <div className="absolute inset-0 pointer-events-none p-6">
              {filteredHubs.map((hub) => {
                const isSelected = selectedHub?.id === hub.id;
                const isOnline = hub.status === 'online' || hub.status === 'demo_ready';
                const hasVouchers = hub.activeSessions > 0;

                return (
                  <div
                    key={hub.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform duration-200 z-10"
                    style={{
                      left: `${hub.posX}%`,
                      top: `${hub.posY}%`,
                    }}
                  >
                    {/* Pin Outer Wrapper */}
                    <button
                      type="button"
                      onClick={() => setSelectedHubId(hub.id)}
                      className="group relative flex flex-col items-center focus:outline-none cursor-pointer"
                    >
                      {/* Pulsing Beacon Wave Ring */}
                      {isOnline && (
                        <span
                          className={`absolute w-8 h-8 rounded-full pointer-events-none animate-ping ${
                            isSelected ? 'bg-[#f05e17]/40' : 'bg-emerald-500/25'
                          }`}
                        />
                      )}

                      {/* Main Static Pin Badge */}
                      <div
                        className={`relative w-7 h-7 rounded-full flex items-center justify-center border shadow-xl transition-all ${
                          isSelected
                            ? 'bg-[#f05e17] border-white scale-125 z-30 shadow-[#f05e17]/50'
                            : isOnline
                            ? 'bg-[#0f172a] border-emerald-400 text-emerald-400 group-hover:scale-110 group-hover:border-white'
                            : 'bg-[#1e293b] border-amber-400 text-amber-400'
                        }`}
                      >
                        {hub.hasSolar ? (
                          <Sun className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-amber-400'}`} />
                        ) : hub.category === 'transit' ? (
                          <span className="text-[11px] leading-none">🚌</span>
                        ) : (
                          <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-400'}`} />
                        )}

                        {/* Top Mini Badge for Active Sessions */}
                        {hasVouchers && (
                          <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-black font-mono font-black text-[9px] px-1 rounded-full shadow-sm">
                            {hub.activeSessions}
                          </span>
                        )}
                      </div>

                      {/* Station Label Badge */}
                      {showLabels && (
                        <div
                          className={`mt-1 px-2 py-0.5 rounded backdrop-blur-md text-[10px] font-mono whitespace-nowrap transition-all shadow-md ${
                            isSelected
                              ? 'bg-[#f05e17] text-white font-bold border border-white/40 scale-105 z-30'
                              : 'bg-black/80 text-slate-300 border border-slate-700/60 group-hover:text-white group-hover:border-slate-500'
                          }`}
                        >
                          <span className="font-bold">{hub.name.split('&')[0].trim()}</span>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Map Legend Bar */}
          <div className="p-3 bg-[#0a0e17] border-t border-[#1b233a] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400 z-20">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-300 shadow-sm" />
                <span className="text-white">Active Hotspot Online</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f05e17] border border-white" />
                <span className="text-white">Selected Hub</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Solar Off-Grid Node</span>
              </span>
            </div>

            <div className="text-[10px] text-slate-500 flex items-center gap-2">
              <span>Projection: EPSG:4326 (WGS 84)</span>
              <span>·</span>
              <span>Elevation Range: 1,400m – 3,482m</span>
            </div>
          </div>
        </div>

        {/* RIGHT (4 COLS): REGIONAL HUB INSPECTOR & ROUTER ACTIONS */}
        <div className="lg:col-span-4 space-y-3 flex flex-col">
          {selectedHub ? (
            <div className="bg-[#0a0e17] p-4 rounded-xl border border-[#232d42] space-y-4 font-mono text-xs flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                {/* Station Title & Status */}
                <div className="flex items-start justify-between gap-2 border-b border-[#1b233a] pb-3">
                  <div>
                    <span className="text-[10px] text-[#f05e17] font-bold uppercase tracking-wider">
                      {selectedHub.district} District · {selectedHub.category.toUpperCase()}
                    </span>
                    <h3 className="text-base font-extrabold text-white leading-tight mt-0.5">
                      {selectedHub.name}
                    </h3>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ONLINE</span>
                  </span>
                </div>

                {/* GPS Coordinates & Uplink Info */}
                <div className="p-3 bg-[#121829] rounded-xl border border-[#1f283d] space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="text-slate-200 font-bold">
                      {selectedHub.lat.toFixed(4)}° S, {selectedHub.lng.toFixed(4)}° E
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Backhaul Uplink:</span>
                    <span className="text-cyan-300 font-bold flex items-center gap-1">
                      <Radio className="w-3 h-3 text-[#f05e17]" />
                      <span>{selectedHub.defaultUplink}</span>
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Hardware Node:</span>
                    <span className="text-slate-200">{selectedHub.defaultModel}</span>
                  </div>
                </div>

                {/* Live Client & Traffic Metric Cards */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 bg-[#121829] rounded-lg border border-[#1f283d]">
                    <div className="text-[10px] text-slate-400">Active Subscribers</div>
                    <div className="text-lg font-black text-emerald-400 mt-0.5">
                      {selectedHub.activeSessions > 0 ? selectedHub.activeSessions : 8}
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#121829] rounded-lg border border-[#1f283d]">
                    <div className="text-[10px] text-slate-400">WAN Redundancy</div>
                    <div className="text-xs font-bold text-amber-300 mt-1 flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3" /> Failover Ready
                    </div>
                  </div>
                </div>

                {/* Associated Real Routers in this Region */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Assigned MikroTik Routers ({selectedHub.assignedRouters.length})
                  </div>

                  {selectedHub.assignedRouters.length > 0 ? (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedHub.assignedRouters.map((r) => (
                        <div
                          key={r.id}
                          className="p-2 bg-[#161d31] rounded-lg border border-[#232d42] flex items-center justify-between text-[11px]"
                        >
                          <div>
                            <div className="text-white font-bold">{r.name}</div>
                            <div className="text-slate-400 text-[10px]">{r.wireguardIp}</div>
                          </div>
                          <span className="text-emerald-400 text-[10px] font-bold">
                            {r.activeSessions} online
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-[#121829] rounded-lg border border-dashed border-slate-700 text-slate-400 text-[11px] leading-relaxed">
                      Hotspot coverage point ready for adoption. To bind a physical hAP ax³ to this station, use the adoption one-liner script.
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="pt-2 border-t border-[#1b233a] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab && onNavigateTab('fleet')}
                  className="flex-1 py-2 px-3 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Manage Fleet Node</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab && onNavigateTab('portal')}
                  className="py-2 px-3 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200 text-xs rounded-lg transition-colors flex items-center gap-1"
                  title="View Captive Portal for this location"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 bg-[#0a0e17] rounded-xl border border-[#232d42] space-y-2 flex-1 flex flex-col items-center justify-center font-mono">
              <MapPin className="w-8 h-8 text-slate-600 mb-1" />
              <p className="text-xs text-white font-bold">No Regional Hub Selected</p>
              <p className="text-[11px] text-slate-400">Click any hotspot pin on the map to inspect regional backhaul, hardware models, and live client sessions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
