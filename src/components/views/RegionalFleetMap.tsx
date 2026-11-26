import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  Maximize2,
  Minimize2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Users,
  Crosshair,
  Plus,
  Building2
} from 'lucide-react';
import { RouterDevice, LESOTHO_DISTRICTS, LesothoDistrict } from '../../types';

interface RegionalFleetMapProps {
  routers: RouterDevice[];
  onSelectRouter?: (routerId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

// Real GPS coordinates for each of the 10 Districts of the Kingdom of Lesotho
const LESOTHO_CENTER: [number, number] = [-29.61, 28.2336];
const LESOTHO_DEFAULT_ZOOM = 8;

const DISTRICT_COORDS: Record<LesothoDistrict, { lat: number; lng: number; zoom: number }> = {
  Maseru: { lat: -29.3167, lng: 27.4833, zoom: 12 },
  Berea: { lat: -29.1472, lng: 27.749, zoom: 11 },
  Leribe: { lat: -28.8719, lng: 28.045, zoom: 11 },
  'Butha-Buthe': { lat: -28.7667, lng: 28.24, zoom: 11 },
  Mokhotlong: { lat: -29.2894, lng: 29.0675, zoom: 11 },
  'Thaba-Tseka': { lat: -29.522, lng: 28.608, zoom: 11 },
  "Qacha's Nek": { lat: -30.1154, lng: 28.6894, zoom: 11 },
  Quthing: { lat: -30.4, lng: 27.7, zoom: 11 },
  "Mohale's Hoek": { lat: -30.1514, lng: 27.4764, zoom: 11 },
  Mafeteng: { lat: -29.823, lng: 27.2374, zoom: 11 }
};

type MapLayerMode = 'street' | 'dark' | 'satellite';

const TILE_LAYERS: Record<
  MapLayerMode,
  { url: string; attribution: string; maxZoom: number }
> = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18
  }
};

export interface PlottedHotspotNode {
  id: string;
  router: RouterDevice;
  routerName: string;
  venueName: string;
  physicalAddress: string;
  district: LesothoDistrict;
  lat: number;
  lng: number;
  status: 'online' | 'pending' | 'offline';
  activeSessions: number;
}

function resolveRouterDistrict(r: RouterDevice): LesothoDistrict {
  if (r.district && LESOTHO_DISTRICTS.includes(r.district)) {
    return r.district;
  }
  const haystack = `${r.siteName || ''} ${r.physicalAddress || ''} ${r.name || ''}`
    .toLowerCase()
    .replace(/[-']/g, ' ')
    .replace(/\s+/g, ' ');
  for (const dist of LESOTHO_DISTRICTS) {
    const normDist = dist.toLowerCase().replace(/[-']/g, ' ').replace(/\s+/g, ' ');
    if (haystack.includes(normDist)) {
      return dist;
    }
  }
  if (haystack.includes('teyateyaneng')) return 'Berea';
  if (haystack.includes('hlotse') || haystack.includes('maputsoe')) return 'Leribe';
  if (haystack.includes('moyeni')) return 'Quthing';
  return 'Maseru';
}

function resolveVenueCoordinates(
  r: RouterDevice,
  district: LesothoDistrict,
  districtIdx: number
): { lat: number; lng: number } {
  const gpsLat = Number(r.gpsTelemetry?.latitude);
  const gpsLng = Number(r.gpsTelemetry?.longitude);
  const isDefaultMaseruSeed =
    Math.abs(gpsLat - -29.3151) < 0.0005 && Math.abs(gpsLng - 27.4869) < 0.0005;
  const isValidLesothoGps =
    Number.isFinite(gpsLat) &&
    Number.isFinite(gpsLng) &&
    gpsLat <= -28.4 &&
    gpsLat >= -30.8 &&
    gpsLng >= 26.8 &&
    gpsLng <= 29.7 &&
    !(isDefaultMaseruSeed && district !== 'Maseru');

  if (isValidLesothoGps) {
    return { lat: gpsLat, lng: gpsLng };
  }

  const haystack = `${r.siteName || ''} ${r.physicalAddress || ''} ${r.name || ''}`.toLowerCase();

  // Start at the router's actual Lesotho district center
  let baseLat = DISTRICT_COORDS[district].lat;
  let baseLng = DISTRICT_COORDS[district].lng;

  // Apply Maseru-specific landmark anchors ONLY when the router is actually in Maseru
  if (district === 'Maseru') {
    if (haystack.includes('golf') || haystack.includes('maseru gc') || haystack.includes('clubhouse')) {
      baseLat = -29.3182;
      baseLng = 27.4786;
    } else if (haystack.includes('setsoto') || haystack.includes('stadium')) {
      baseLat = -29.3195;
      baseLng = 27.4981;
    } else if (haystack.includes('pionier') || haystack.includes('pioneer')) {
      baseLat = -29.3147;
      baseLng = 27.4754;
    } else if (haystack.includes('mall')) {
      baseLat = -29.314;
      baseLng = 27.4865;
    } else if (haystack.includes('bus') || haystack.includes('terminal')) {
      baseLat = -29.3133;
      baseLng = 27.4938;
    }
  } else if (district === 'Butha-Buthe') {
    if (haystack.includes('bus') || haystack.includes('stop') || haystack.includes('sss')) {
      // Butha-Buthe Town / Bus Stop area
      baseLat = -28.7666;
      baseLng = 28.2494;
    }
  } else if (district === 'Leribe' && haystack.includes('maputsoe')) {
    baseLat = -28.8866;
    baseLng = 27.8992;
  }

  // Gentle spread when multiple routers share the same anchor so each pin is easily clickable
  if (districtIdx === 0) {
    return { lat: baseLat, lng: baseLng };
  }
  const angle = districtIdx * 1.9;
  const spread = 0.0055 * Math.ceil(districtIdx / 2);
  return {
    lat: baseLat + Math.cos(angle) * spread,
    lng: baseLng + Math.sin(angle) * spread
  };
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const RegionalFleetMap: React.FC<RegionalFleetMapProps> = ({
  routers = [],
  onSelectRouter,
  onNavigateTab
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapLayerMode>('street');
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());
  const hasAutoFittedRef = useRef(false);

  const plottedNodes: PlottedHotspotNode[] = useMemo(() => {
    const anchorCount: Record<string, number> = {};

    return routers.map((r) => {
      const district = resolveRouterDistrict(r);
      const venueName = (r.siteName || r.physicalAddress || r.name || 'Hotspot Location').trim();
      const groupKey = `${district}_${venueName.toLowerCase().includes('golf') || venueName.toLowerCase().includes('maseru gc') ? 'golf' : 'base'}`;
      const idx = anchorCount[groupKey] || 0;
      anchorCount[groupKey] = idx + 1;

      const { lat, lng } = resolveVenueCoordinates(r, district, idx);

      return {
        id: r.id,
        router: r,
        routerName: r.name || venueName,
        venueName,
        physicalAddress: (r.physicalAddress || venueName).trim(),
        district,
        lat,
        lng,
        status:
          r.status === 'online'
            ? 'online'
            : r.status === 'pending_adoption'
            ? 'pending'
            : 'offline',
        activeSessions: r.activeSessions || 0
      };
    });
  }, [routers]);

  const filteredNodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return plottedNodes.filter((node) => {
      const matchDistrict =
        selectedDistrict === 'all' ||
        node.district.toLowerCase() === selectedDistrict.toLowerCase();
      const matchSearch =
        q === '' ||
        node.routerName.toLowerCase().includes(q) ||
        node.venueName.toLowerCase().includes(q) ||
        node.physicalAddress.toLowerCase().includes(q) ||
        node.district.toLowerCase().includes(q);
      return matchDistrict && matchSearch;
    });
  }, [plottedNodes, selectedDistrict, searchQuery]);

  // Keep selected node synced
  useEffect(() => {
    if (filteredNodes.length === 0) {
      setSelectedNodeId(null);
      return;
    }
    if (!selectedNodeId || !filteredNodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(filteredNodes[0].id);
    }
  }, [filteredNodes, selectedNodeId]);

  const selectedNode = useMemo(
    () => filteredNodes.find((n) => n.id === selectedNodeId) || filteredNodes[0] || null,
    [filteredNodes, selectedNodeId]
  );

  const onlineRoutersCount = plottedNodes.filter((n) => n.status === 'online').length;
  const totalActiveClients = plottedNodes.reduce((acc, n) => acc + n.activeSessions, 0);

  const districtCounts = useMemo(() => {
    const map = new Map<LesothoDistrict, { total: number; online: number }>();
    LESOTHO_DISTRICTS.forEach((d) => map.set(d, { total: 0, online: 0 }));
    plottedNodes.forEach((n) => {
      const prev = map.get(n.district) || { total: 0, online: 0 };
      map.set(n.district, {
        total: prev.total + 1,
        online: prev.online + (n.status === 'online' ? 1 : 0)
      });
    });
    return LESOTHO_DISTRICTS.map((district) => ({
      district,
      ...(map.get(district) || { total: 0, online: 0 })
    }));
  }, [plottedNodes]);

  // 1. Initialize Leaflet Map of Lesotho
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: LESOTHO_CENTER,
      zoom: LESOTHO_DEFAULT_ZOOM,
      minZoom: 7,
      maxZoom: 18,
      zoomControl: true,
      scrollWheelZoom: true
    });

    const layerCfg = TILE_LAYERS[mapStyle];
    const tileLayer = L.tileLayer(layerCfg.url, {
      attribution: layerCfg.attribution,
      maxZoom: layerCfg.maxZoom
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    markersLayerRef.current = markersGroup;

    // Ensure tiles render crisply after container layout settles
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      markerByIdRef.current.clear();
    };
  }, []);

  // 2. Switch map tile style smoothly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const cfg = TILE_LAYERS[mapStyle];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom
    }).addTo(map);
  }, [mapStyle]);

  // 3. Re-measure Leaflet map when toggling fullscreen expand
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const t = setTimeout(() => {
      map.invalidateSize();
    }, 220);
    return () => clearTimeout(t);
  }, [isExpanded]);

  // 4. Plot real router pins & easy-to-read handover popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();
    markerByIdRef.current.clear();

    filteredNodes.forEach((node) => {
      const isSelected = selectedNode?.id === node.id;
      const isOnline = node.status === 'online';
      const pinBg = isSelected ? '#f05e17' : isOnline ? '#10b981' : '#f59e0b';
      const ringColor = isSelected
        ? 'rgba(240, 94, 23, 0.35)'
        : isOnline
        ? 'rgba(16, 185, 129, 0.32)'
        : 'rgba(245, 158, 11, 0.3)';

      const icon = L.divIcon({
        className: 'tconnect-leaflet-pin-wrapper',
        html: `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:auto;">
            <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${isSelected ? 34 : 28}px;height:${isSelected ? 34 : 28}px;border-radius:9999px;background:${pinBg};border:2.5px solid #ffffff;box-shadow:0 0 0 6px ${ringColor}, 0 6px 14px rgba(0,0,0,0.45);transition:transform 0.15s ease;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div style="margin-top:4px;padding:2px 8px;border-radius:6px;background:rgba(11,17,30,0.92);color:#ffffff;font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid ${isSelected ? '#f05e17' : 'rgba(255,255,255,0.22)'};box-shadow:0 4px 10px rgba(0,0,0,0.35);">
              ${escapeHtml(node.routerName)}
            </div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -34]
      });

      const statusBadgeHtml = isOnline
        ? '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-size:11px;font-weight:700;">&#9679; ONLINE</span>'
        : '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;background:#fffbeb;color:#b45309;border:1px solid #fde68a;font-size:11px;font-weight:700;">&#9679; OFFLINE</span>';

      const popupHtml = `
        <div style="min-width:210px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0f172a;padding:2px 0;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">
            <strong style="font-size:14px;color:#0f172a;line-height:1.2;">${escapeHtml(node.routerName)}</strong>
            ${statusBadgeHtml}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;">
            <div>
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;">Deployed Location</div>
              <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:1px;">${escapeHtml(node.venueName)}</div>
            </div>
            <div>
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:700;">District</div>
              <div style="font-size:13px;font-weight:700;color:#ea580c;margin-top:1px;">${escapeHtml(node.district)} District, Lesotho</div>
            </div>
          </div>
        </div>
      `;

      const marker = L.marker([node.lat, node.lng], { icon })
        .bindPopup(popupHtml, {
          closeButton: true,
          className: 'tconnect-handover-popup'
        })
        .on('click', () => {
          setSelectedNodeId(node.id);
        });

      marker.addTo(group);
      markerByIdRef.current.set(node.id, marker);
    });

    // Fit map neatly on first load if routers exist
    if (!hasAutoFittedRef.current && filteredNodes.length > 0) {
      hasAutoFittedRef.current = true;
      if (filteredNodes.length === 1) {
        map.setView([filteredNodes[0].lat, filteredNodes[0].lng], 12);
      } else {
        const bounds = L.latLngBounds(filteredNodes.map((n) => [n.lat, n.lng] as [number, number]));
        map.fitBounds(bounds.pad(0.35), { maxZoom: 12 });
      }
    }
  }, [filteredNodes, selectedNode?.id]);

  const handleFocusNode = (node: PlottedHotspotNode) => {
    setSelectedNodeId(node.id);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([node.lat, node.lng], 13, { duration: 0.7 });
      setTimeout(() => {
        const marker = markerByIdRef.current.get(node.id);
        if (marker) marker.openPopup();
      }, 350);
    }
  };

  const handleSelectDistrict = (dist: string) => {
    setSelectedDistrict(dist);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (dist === 'all') {
      map.flyTo(LESOTHO_CENTER, LESOTHO_DEFAULT_ZOOM, { duration: 0.7 });
      return;
    }

    const districtKey = dist as LesothoDistrict;
    const anchor = DISTRICT_COORDS[districtKey];
    if (anchor) {
      map.flyTo([anchor.lat, anchor.lng], anchor.zoom, { duration: 0.7 });
    }
  };

  const handleResetLesothoView = () => {
    setSelectedDistrict('all');
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo(LESOTHO_CENTER, LESOTHO_DEFAULT_ZOOM, { duration: 0.7 });
    }
  };

  return (
    <div
      className={`bg-[#0f1422] rounded-2xl border border-[#232d42] overflow-hidden transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : 'space-y-4 p-4 sm:p-5'
      }`}
    >
      {/* Header & Controls Bar */}
      <div
        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
          isExpanded ? 'p-4 bg-[#0a0e17] border-b border-[#1b233a]' : 'border-b border-[#1b233a] pb-4'
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Compass className="w-5 h-5 text-[#f05e17]" />
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Lesotho Fleet Deployment Map
            </h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
              {onlineRoutersCount} of {plottedNodes.length} Online
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Click any router pin on the Lesotho map to view where it is deployed and which district it serves.
          </p>
        </div>

        {/* Map Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search router, location, district..."
              className="pl-8 pr-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[#f05e17] w-56"
            />
          </div>

          {/* Map Layer Switcher */}
          <div className="flex items-center p-1 bg-[#121829] rounded-lg border border-[#1f283d] text-[11px] font-semibold">
            {(
              [
                { id: 'street', label: 'Lesotho Map' },
                { id: 'dark', label: 'Dark' },
                { id: 'satellite', label: 'Satellite' }
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMapStyle(opt.id)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  mapStyle === opt.id
                    ? 'bg-[#f05e17] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Reset to Full Lesotho View */}
          <button
            type="button"
            onClick={handleResetLesothoView}
            className="px-2.5 py-1.5 rounded-lg bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Show full Kingdom of Lesotho"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#f05e17]" />
            <span>All Lesotho</span>
          </button>

          {/* Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg transition-colors cursor-pointer"
            title={isExpanded ? 'Exit fullscreen map' : 'Expand map'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* District Quick Filter Bar */}
      <div
        className={`flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none ${
          isExpanded ? 'px-4 py-2 bg-[#0d121f] border-b border-[#1b233a]' : ''
        }`}
      >
        <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-[#f05e17]" /> Districts:
        </span>
        <button
          type="button"
          onClick={() => handleSelectDistrict('all')}
          className={`px-3 py-1 rounded-lg whitespace-nowrap text-[11px] font-semibold transition-all cursor-pointer ${
            selectedDistrict === 'all'
              ? 'bg-[#f05e17] text-white shadow-sm'
              : 'bg-[#161d31] hover:bg-[#202942] text-slate-300 border border-[#232d42]'
          }`}
        >
          All Lesotho ({plottedNodes.length})
        </button>
        {districtCounts.map((item) => (
          <button
            key={item.district}
            type="button"
            onClick={() => handleSelectDistrict(item.district)}
            className={`px-3 py-1 rounded-lg whitespace-nowrap text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedDistrict === item.district
                ? 'bg-[#f05e17] text-white shadow-sm'
                : item.total > 0
                ? 'bg-[#161d31] hover:bg-[#202942] text-white border border-emerald-500/40'
                : 'bg-[#121829] hover:bg-[#1a2238] text-slate-400 border border-[#232d42]'
            }`}
          >
            <span>{item.district}</span>
            {item.total > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  selectedDistrict === item.district
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {item.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Map Canvas + Clean Handover Location Card */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${isExpanded ? 'flex-1 p-4 overflow-hidden' : ''}`}>
        {/* LEFT (8 COLS): REAL INTERACTIVE LESOTHO LEAFLET MAP */}
        <div
          className={`lg:col-span-8 bg-[#070a12] rounded-xl border border-[#1b233a] relative overflow-hidden flex flex-col ${
            isExpanded ? 'h-full min-h-[480px]' : 'h-[470px]'
          }`}
        >
          {/* Floating Live Summary Pill */}
          <div className="absolute top-3 right-3 z-[400] pointer-events-none">
            <div className="bg-[#0f1422]/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#232d42] text-xs text-slate-200 flex items-center gap-2.5 shadow-lg pointer-events-auto">
              <span className="flex items-center gap-1.5 font-semibold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    onlineRoutersCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {plottedNodes.length} {plottedNodes.length === 1 ? 'Router' : 'Routers'}
                </span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-300 font-bold">
                {totalActiveClients} Connected {totalActiveClients === 1 ? 'Device' : 'Devices'}
              </span>
            </div>
          </div>

          {/* Interactive Leaflet Map Container */}
          <div ref={mapContainerRef} className="w-full h-full z-10 tconnect-lesotho-map" />

          {/* Clean Legend Bar */}
          <div className="px-3.5 py-2.5 bg-[#0a0e17] border-t border-[#1b233a] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 z-20">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                <span>Online Router</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f05e17] border border-white" />
                <span>Selected Router</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
                <span>Offline / Pending</span>
              </span>
            </div>
            <span className="text-slate-400 font-medium">Kingdom of Lesotho &middot; 10 Districts</span>
          </div>
        </div>

        {/* RIGHT (4 COLS): CLEAN HANDOVER ROUTER LOCATION & DISTRICT PANEL */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-[470px]">
          {selectedNode ? (
            <div className="bg-[#0a0e17] p-5 rounded-xl border border-[#232d42] space-y-4">
              {/* Router Name + Online/Offline Status */}
              <div className="flex items-start justify-between gap-3 border-b border-[#1b233a] pb-3.5">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Selected Router
                  </div>
                  <h3 className="text-lg font-extrabold text-white leading-snug mt-0.5 break-words">
                    {selectedNode.routerName}
                  </h3>
                </div>

                {selectedNode.status === 'online' ? (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ONLINE</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{selectedNode.status.toUpperCase()}</span>
                  </span>
                )}
              </div>

              {/* Clean, Easy-to-Read Handover Fields: Deployed Location & District */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#121829] border border-[#1f283d]">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-[#f05e17]" />
                    <span>Deployed Location</span>
                  </div>
                  <div className="text-base font-bold text-white mt-1 leading-snug">
                    {selectedNode.venueName}
                  </div>
                  {selectedNode.physicalAddress &&
                    selectedNode.physicalAddress.toLowerCase() !== selectedNode.venueName.toLowerCase() && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {selectedNode.physicalAddress}
                      </div>
                    )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#121829] border border-[#1f283d]">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-[#f05e17]" />
                    <span>District</span>
                  </div>
                  <div className="text-base font-bold text-amber-300 mt-1">
                    {selectedNode.district} District
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121829] border border-[#1f283d] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Connected Devices</span>
                  </div>
                  <span className="text-lg font-extrabold text-cyan-300 tabular-nums">
                    {selectedNode.activeSessions}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 bg-[#0a0e17] rounded-xl border border-[#232d42] space-y-3 flex flex-col items-center justify-center">
              <MapPin className="w-8 h-8 text-slate-500" />
              <div className="space-y-1">
                <p className="text-sm text-white font-bold">No Deployed Routers Found</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Adopt a router with its location and Lesotho district to see it pinned on the map.
                </p>
              </div>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('fleet')}
                  className="px-3.5 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Router</span>
                </button>
              )}
            </div>
          )}

          {/* Quick-Click Deployed Routers Directory for Handover */}
          <div className="bg-[#0a0e17] p-4 rounded-xl border border-[#232d42] flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Deployed Routers ({filteredNodes.length})
              </h4>
              <span className="text-[11px] text-slate-400">Click to locate</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[210px] pr-1">
              {filteredNodes.length > 0 ? (
                filteredNodes.map((node) => {
                  const isActive = selectedNode?.id === node.id;
                  const isOnline = node.status === 'online';
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        handleFocusNode(node);
                        if (onSelectRouter) onSelectRouter(node.id);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isActive
                          ? 'bg-[#f05e17]/15 border-[#f05e17] text-white'
                          : 'bg-[#121829] hover:bg-[#1a2238] border-[#1f283d] text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                          <span className="text-xs font-bold truncate text-white">
                            {node.routerName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5 pl-4">
                          {node.venueName} &middot; {node.district}
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-cyan-300 shrink-0 tabular-nums">
                        {node.activeSessions}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-xs text-slate-500 text-center py-4">
                  No routers in this district filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
