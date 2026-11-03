import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapPin, 
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
  Server, 
  Compass,
  Plus,
  ShieldCheck,
  Building2,
  RotateCcw
} from 'lucide-react';
import { RouterDevice, LESOTHO_DISTRICTS, LesothoDistrict } from '../../types';
import { storage } from '../../services/storage';

interface RegionalFleetMapProps {
  routers: RouterDevice[];
  onSelectRouter?: (routerId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

// Canonical base coordinates for each of the 10 Lesotho Districts
// Used strictly to position real added hotspots inside their assigned district
const DISTRICT_ANCHORS: Record<LesothoDistrict, { lat: number; lng: number; posX: number; posY: number; category: 'urban' | 'transit' | 'highland' | 'border' | 'rural' }> = {
  'Maseru': { lat: -29.3151, lng: 27.4869, posX: 22, posY: 38, category: 'urban' },
  'Berea': { lat: -29.1472, lng: 27.7490, posX: 30, posY: 30, category: 'urban' },
  'Leribe': { lat: -28.8719, lng: 28.0450, posX: 39, posY: 19, category: 'border' },
  'Butha-Buthe': { lat: -28.7667, lng: 28.2400, posX: 49, posY: 14, category: 'transit' },
  'Mokhotlong': { lat: -29.2894, lng: 29.0675, posX: 78, posY: 36, category: 'highland' },
  'Thaba-Tseka': { lat: -29.5220, lng: 28.6080, posX: 59, posY: 45, category: 'highland' },
  "Qacha's Nek": { lat: -30.1154, lng: 28.6894, posX: 65, posY: 71, category: 'border' },
  'Quthing': { lat: -30.4000, lng: 27.7000, posX: 28, posY: 83, category: 'rural' },
  "Mohale's Hoek": { lat: -30.1514, lng: 27.4764, posX: 19, posY: 73, category: 'urban' },
  'Mafeteng': { lat: -29.8230, lng: 27.2374, posX: 12, posY: 58, category: 'transit' },
};

export interface PlottedHotspotNode {
  id: string;
  router: RouterDevice;
  venueName: string;
  physicalAddress: string;
  district: LesothoDistrict;
  scope: string;
  partnerName: string;
  policyName: string;
  category: 'urban' | 'transit' | 'highland' | 'border' | 'rural';
  lat: number;
  lng: number;
  posX: number;
  posY: number;
  status: 'online' | 'pending' | 'offline';
  activeSessions: number;
  hasSolar: boolean;
}

export const RegionalFleetMap: React.FC<RegionalFleetMapProps> = ({
  routers = [],
  onSelectRouter,
  onNavigateTab,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'cyber' | 'topo' | 'satellite'>('cyber');
  const [showLabels, setShowLabels] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isResettingProd, setIsResettingProd] = useState(false);

  const tenantGroups = useMemo(() => storage.getTenantGroups(), [routers]);

  // Strictly plot ONLY added routers/hotspots that have Scope, Partner/Group, Policy, District, and Venue
  const plottedNodes: PlottedHotspotNode[] = useMemo(() => {
    const validRouters = routers.filter((r) => {
      const hasScope = Boolean(r.vertical);
      const hasDistrict = Boolean(r.district && LESOTHO_DISTRICTS.includes(r.district));
      const hasVenue = Boolean(r.siteName && r.siteName.trim().length > 0);
      return hasScope && hasDistrict && hasVenue;
    });

    // Track per-district index so multiple hotspots in the same district spread cleanly without overlapping
    const districtIndexCounter: Record<string, number> = {};

    return validRouters.map((r) => {
      const dist: LesothoDistrict = (r.district && DISTRICT_ANCHORS[r.district]) ? r.district : 'Maseru';
      const anchor = DISTRICT_ANCHORS[dist];
      const idx = districtIndexCounter[dist] || 0;
      districtIndexCounter[dist] = idx + 1;

      // Deterministic spiral offset for multiple hotspots in the same district
      const angle = idx * 2.1;
      const radiusX = idx === 0 ? 0 : Math.min(8, 2.8 + idx * 1.3);
      const radiusY = idx === 0 ? 0 : Math.min(8, 2.8 + idx * 1.3);

      const posX = Math.max(8, Math.min(92, anchor.posX + Math.cos(angle) * radiusX));
      const posY = Math.max(10, Math.min(90, anchor.posY + Math.sin(angle) * radiusY));

      const matchedGroup = tenantGroups.find((g) => g.id === r.tenantGroupId || (r.tags && r.tags.includes(g.tag)));
      const resolvedPartner =
        r.partnerName ||
        matchedGroup?.name ||
        (r.tags?.find((t) => t.startsWith('client:'))?.replace('client:', '') || 'T-Connect Internal Fleet');

      const resolvedPolicy =
        r.policyName ||
        (r.accessMode === 'COMPLETELY_FREE'
          ? 'Sponsored Free Opt-In + Ad Carousel Policy'
          : r.accessMode === 'FREE_TRIAL_AND_PAID'
            ? 'Hybrid Trial + PayLesotho OTT Policy'
            : 'PayLesotho (M-Pesa/EcoCash/Card) + 16-Digit OTT Policy');

      return {
        id: r.id,
        router: r,
        venueName: r.siteName,
        physicalAddress: r.physicalAddress || r.siteName,
        district: dist,
        scope: r.vertical.toUpperCase(),
        partnerName: resolvedPartner,
        policyName: resolvedPolicy,
        category: r.vertical === 'bus' ? 'transit' : anchor.category,
        lat: r.gpsTelemetry?.latitude || (anchor.lat + idx * 0.008),
        lng: r.gpsTelemetry?.longitude || (anchor.lng + idx * 0.008),
        posX,
        posY,
        status: r.status === 'online' ? 'online' : r.status === 'pending_adoption' ? 'pending' : 'offline',
        activeSessions: r.activeSessions || 0,
        hasSolar: Boolean(r.solarTelemetry && r.solarTelemetry.batteryPercent > 0),
      };
    });
  }, [routers, tenantGroups]);

  // Keep selectedNodeId synced with plottedNodes
  useEffect(() => {
    if (plottedNodes.length === 0) {
      setSelectedNodeId(null);
      return;
    }
    if (!selectedNodeId || !plottedNodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(plottedNodes[0].id);
    }
  }, [plottedNodes, selectedNodeId]);

  const filteredNodes = useMemo(() => {
    return plottedNodes.filter((node) => {
      const matchDistrict =
        selectedDistrict === 'all' || node.district.toLowerCase() === selectedDistrict.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        node.venueName.toLowerCase().includes(q) ||
        node.physicalAddress.toLowerCase().includes(q) ||
        node.district.toLowerCase().includes(q) ||
        node.partnerName.toLowerCase().includes(q) ||
        node.policyName.toLowerCase().includes(q) ||
        node.router.name.toLowerCase().includes(q);
      return matchDistrict && matchSearch;
    });
  }, [plottedNodes, selectedDistrict, searchQuery]);

  const uniqueDistricts = useMemo(() => ['all', ...LESOTHO_DISTRICTS], []);

  const adoptedRoutersCount = plottedNodes.length;
  const onlineRoutersCount = plottedNodes.filter((n) => n.status === 'online').length;
  const totalActiveSubscribers = plottedNodes.reduce((acc, curr) => acc + curr.activeSessions, 0);

  // Exact 10-district distribution calculation strictly from added hotspots
  const districtDistribution = useMemo(() => {
    const map = new Map<string, { count: number; online: number; sessions: number }>();
    LESOTHO_DISTRICTS.forEach((d) => map.set(d, { count: 0, online: 0, sessions: 0 }));

    plottedNodes.forEach((n) => {
      const prev = map.get(n.district) || { count: 0, online: 0, sessions: 0 };
      map.set(n.district, {
        count: prev.count + 1,
        online: prev.online + (n.status === 'online' ? 1 : 0),
        sessions: prev.sessions + n.activeSessions,
      });
    });

    return Array.from(map.entries()).map(([district, data]) => ({
      district,
      ...data,
      percentOfFleet: plottedNodes.length > 0 ? Math.round((data.count / plottedNodes.length) * 100) : 0,
    }));
  }, [plottedNodes]);

  const selectedNode: PlottedHotspotNode | null = useMemo(() => {
    if (filteredNodes.length === 0) return null;
    return filteredNodes.find((n) => n.id === selectedNodeId) || filteredNodes[0];
  }, [filteredNodes, selectedNodeId]);

  const handleProductionReset = async () => {
    setIsResettingProd(true);
    try {
      await fetch('/api/admin/reset-production', { method: 'POST' });
    } catch {}
    storage.clearAllToScratch();
    setSelectedNodeId(null);
    setTimeout(() => setIsResettingProd(false), 500);
  };

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
            Strict zero-preset map: Locations appear only after adding a hotspot bound to Scope, Partner/Group, Policy, District &amp; Venue
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
              placeholder="Search venue, partner, district..."
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
            title="Toggle Venue Labels"
          >
            Labels: {showLabels ? 'ON' : 'OFF'}
          </button>

          {/* Production Zero-State Reset Button */}
          <button
            type="button"
            onClick={handleProductionReset}
            disabled={isResettingProd}
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset all hotspots, sessions, and test transactions for production rollout"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResettingProd ? 'animate-spin' : ''}`} />
            <span>{isResettingProd ? 'Resetting...' : 'Production Reset'}</span>
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
          <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
            <div className="bg-[#0f1422]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#232d42] text-[11px] font-mono text-slate-300 flex items-center gap-2 shadow-lg pointer-events-auto">
              <span className={`w-2 h-2 rounded-full ${onlineRoutersCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>
                <strong>{adoptedRoutersCount}</strong> {adoptedRoutersCount === 1 ? 'Hotspot' : 'Hotspots'} Plotted
                {adoptedRoutersCount > 0 ? ` (${onlineRoutersCount} Online)` : ' (0 Online)'}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400 font-bold">{totalActiveSubscribers}</span> Active Clients
            </div>

            <div className="hidden sm:flex bg-[#0f1422]/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-[#232d42] text-[10px] font-mono text-slate-400 items-center gap-1.5 shadow-lg">
              <Radio className="w-3 h-3 text-[#f05e17]" />
              <span>Starlink LEO + Fiber Lowlands</span>
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

            {/* DYNAMIC PINS OVERLAY — ONLY ADDED HOTSPOTS */}
            {filteredNodes.length > 0 ? (
              <div className="absolute inset-0 pointer-events-none p-6">
                {filteredNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isOnline = node.status === 'online';
                  const hasVouchers = node.activeSessions > 0;

                  return (
                    <div
                      key={node.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform duration-200 z-10"
                      style={{
                        left: `${node.posX}%`,
                        top: `${node.posY}%`,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedNodeId(node.id)}
                        className="group relative flex flex-col items-center focus:outline-none cursor-pointer"
                      >
                        {isOnline && (
                          <span
                            className={`absolute w-8 h-8 rounded-full pointer-events-none animate-ping ${
                              isSelected ? 'bg-[#f05e17]/40' : 'bg-emerald-500/25'
                            }`}
                          />
                        )}

                        <div
                          className={`relative w-7 h-7 rounded-full flex items-center justify-center border shadow-xl transition-all ${
                            isSelected
                              ? 'bg-[#f05e17] border-white scale-125 z-30 shadow-[#f05e17]/50'
                              : isOnline
                              ? 'bg-[#0f172a] border-emerald-400 text-emerald-400 group-hover:scale-110 group-hover:border-white'
                              : 'bg-[#1e293b] border-amber-400 text-amber-400'
                          }`}
                        >
                          {node.hasSolar ? (
                            <Sun className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-amber-400'}`} />
                          ) : node.category === 'transit' ? (
                            <span className="text-[11px] leading-none">🚌</span>
                          ) : (
                            <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : isOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
                          )}

                          {hasVouchers && (
                            <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-black font-mono font-black text-[9px] px-1 rounded-full shadow-sm">
                              {node.activeSessions}
                            </span>
                          )}
                        </div>

                        {showLabels && (
                          <div
                            className={`mt-1 px-2 py-0.5 rounded backdrop-blur-md text-[10px] font-mono whitespace-nowrap transition-all shadow-md ${
                              isSelected
                                ? 'bg-[#f05e17] text-white font-bold border border-white/40 scale-105 z-30'
                                : 'bg-black/80 text-slate-300 border border-slate-700/60 group-hover:text-white group-hover:border-slate-500'
                            }`}
                          >
                            <span className="font-bold">{node.venueName}</span>
                            <span className="text-[9px] opacity-80 ml-1">({node.district})</span>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Clean Zero-State Overlay when 0 Hotspots are Added */
              <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
                <div className="bg-[#0b101d]/90 backdrop-blur-md border border-[#232d42] rounded-2xl p-5 max-w-md text-center space-y-3 shadow-2xl pointer-events-auto font-mono">
                  <div className="w-10 h-10 rounded-xl bg-[#f05e17]/15 border border-[#f05e17]/40 flex items-center justify-center mx-auto text-[#f05e17]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-white">0 Hotspots Plotted on Map</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Map pins appear strictly after you add a hotspot with its <strong className="text-slate-200">Vertical Scope</strong>, <strong className="text-slate-200">Partner / Group</strong>, <strong className="text-slate-200">Policy</strong>, <strong className="text-slate-200">District</strong>, and <strong className="text-slate-200">Venue</strong>.
                    </p>
                  </div>
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('fleet')}
                      className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Hotspot / Router</span>
                    </button>
                  )}
                </div>
              </div>
            )}
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
                <span className="text-white">Selected Venue</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Pending Adoption / Solar Node</span>
              </span>
            </div>

            <div className="text-[10px] text-slate-500 flex items-center gap-2">
              <span>Projection: EPSG:4326 (WGS 84)</span>
              <span>·</span>
              <span>Elevation Range: 1,400m – 3,482m</span>
            </div>
          </div>
        </div>

        {/* RIGHT (4 COLS): HOTSPOT VENUE, PARTNER, SCOPE & POLICY INSPECTOR */}
        <div className="lg:col-span-4 space-y-3 flex flex-col">
          {selectedNode ? (
            <div className="bg-[#0a0e17] p-4 rounded-xl border border-[#232d42] space-y-4 font-mono text-xs flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                {/* Venue Title & Status */}
                <div className="flex items-start justify-between gap-2 border-b border-[#1b233a] pb-3">
                  <div>
                    <span className="text-[10px] text-[#f05e17] font-bold uppercase tracking-wider">
                      {selectedNode.district} District · {selectedNode.scope} SCOPE
                    </span>
                    <h3 className="text-base font-extrabold text-white leading-tight mt-0.5">
                      {selectedNode.venueName}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedNode.physicalAddress}</p>
                  </div>

                  {selectedNode.status === 'online' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ONLINE</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{selectedNode.status.toUpperCase()}</span>
                    </span>
                  )}
                </div>

                {/* Mandatory 5-Attribute Binding Card: Scope, Partner/Group, Policy, District, Venue */}
                <div className="p-3 bg-[#121829] rounded-xl border border-[#1f283d] space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Vertical Scope:</span>
                    <span className="text-cyan-300 font-bold uppercase">{selectedNode.scope}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Partner / Group:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>{selectedNode.partnerName}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Bound Policy:</span>
                    <span className="text-amber-300 font-bold flex items-center gap-1 text-right">
                      <ShieldCheck className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[175px]" title={selectedNode.policyName}>{selectedNode.policyName}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">District &amp; Venue:</span>
                    <span className="text-white font-bold">{selectedNode.district} · {selectedNode.venueName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Router / Hardware:</span>
                    <span className="text-slate-200">{selectedNode.router.name} ({selectedNode.router.model})</span>
                  </div>
                </div>

                {/* Live Client & Traffic Metric Cards */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 bg-[#121829] rounded-lg border border-[#1f283d]">
                    <div className="text-[10px] text-slate-400">Active Subscribers</div>
                    <div className="text-lg font-black text-emerald-400 mt-0.5">
                      {selectedNode.activeSessions}
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#121829] rounded-lg border border-[#1f283d]">
                    <div className="text-[10px] text-slate-400">WireGuard Tunnel</div>
                    <div className="text-xs font-bold text-cyan-300 mt-1 flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3" /> {selectedNode.router.wireguardIp}
                    </div>
                  </div>
                </div>

                {/* Internal MAC & Telemetry */}
                <div className="p-2.5 bg-[#161d31] rounded-lg border border-[#232d42] text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Internal MAC:</span>
                    <span className="text-white font-bold">{selectedNode.router.macAddress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="text-slate-300">{selectedNode.lat.toFixed(4)}° S, {selectedNode.lng.toFixed(4)}° E</span>
                  </div>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="pt-2 border-t border-[#1b233a] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectRouter) onSelectRouter(selectedNode.router.id);
                    if (onNavigateTab) onNavigateTab('fleet');
                  }}
                  className="flex-1 py-2 px-3 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Manage Hotspot Node</span>
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
            <div className="p-6 text-center text-slate-500 bg-[#0a0e17] rounded-xl border border-[#232d42] space-y-3 flex-1 flex flex-col items-center justify-center font-mono">
              <MapPin className="w-8 h-8 text-slate-600" />
              <div className="space-y-1">
                <p className="text-xs text-white font-bold">No Active Hotspots Added Yet</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Add a hotspot in Routers &amp; Adoption with its Scope, Partner/Group, Policy, District, and Venue to plot it on the map.
                </p>
              </div>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('fleet')}
                  className="px-3.5 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Hotspot</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ACCURATE REGIONAL HOTSPOT DISTRIBUTION: 10-DISTRICT FLEET BREAKDOWN */}
      <div className="bg-[#0a0e17] p-4 rounded-xl border border-[#1b233a] font-mono text-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b233a] pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#f05e17]" />
            <h3 className="font-extrabold text-white text-xs uppercase tracking-wider">
              Lesotho 10-District Hotspot Distribution
            </h3>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded font-bold">
              {adoptedRoutersCount} Plotted {adoptedRoutersCount === 1 ? 'Hotspot' : 'Hotspots'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Strictly reflects added hotspots bound to Scope, Partner/Group, Policy, District &amp; Venue
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {districtDistribution.map((item) => {
            const hasNodes = item.count > 0;
            const isSelected = selectedDistrict === item.district;

            return (
              <button
                type="button"
                key={item.district}
                onClick={() => setSelectedDistrict(isSelected ? 'all' : item.district)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  hasNodes
                    ? isSelected
                      ? 'bg-[#1b2438] border-[#f05e17] ring-1 ring-[#f05e17]/50 shadow-md'
                      : 'bg-[#121829] border-emerald-500/40 hover:border-emerald-400'
                    : isSelected
                    ? 'bg-[#121624] border-slate-600 text-white'
                    : 'bg-[#080c14] border-slate-800/80 hover:border-slate-700 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-[11px] ${hasNodes ? 'text-white' : 'text-slate-400'}`}>
                    {item.district}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    hasNodes 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {item.count}
                  </span>
                </div>
                <div className="mt-1 text-[10px] flex items-center justify-between text-slate-400">
                  <span className={hasNodes ? 'text-emerald-300' : 'text-slate-500'}>
                    {hasNodes ? `${item.online} Online` : '0 Hotspots'}
                  </span>
                  {hasNodes && (
                    <span className="text-cyan-400 font-bold">{item.percentOfFleet}%</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
