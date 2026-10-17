import React from 'react';
import { 
  LayoutDashboard, 
  Radio, 
  CreditCard, 
  Sliders, 
  Database,
  Globe,
  Zap,
  CheckCircle2,
  PanelLeftClose,
  X
} from 'lucide-react';
import { VerticalType, TeamMember } from '../../types';
import { TConnectLogo } from '../common/TConnectLogo';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  selectedVertical: VerticalType | 'all';
  onVerticalChange: (v: VerticalType | 'all') => void;
  onlineRouterCount: number;
  totalRouterCount: number;
  isSupabaseConnected: boolean;
  onOpenDatabaseModal: () => void;
  effectiveRole?: TeamMember['role'];
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  selectedVertical,
  onVerticalChange,
  onlineRouterCount,
  totalRouterCount,
  isSupabaseConnected,
  onOpenDatabaseModal,
  effectiveRole = 'Super Admin',
  isOpen = true,
  onClose
}) => {
  // Streamlined 4 Core Navigation Items
  const allNavItems = [
    { 
      id: 'dashboard', 
      label: 'Fleet Overview', 
      description: 'Analytics & Live Traffic',
      icon: LayoutDashboard 
    },
    { 
      id: 'fleet', 
      label: 'Routers & Adoption', 
      description: 'MKController One-Liners',
      icon: Radio 
    },
    { 
      id: 'billing', 
      label: 'Billing & Vouchers', 
      description: 'Plans, Vouchers & Gateways',
      icon: CreditCard 
    },
    { 
      id: 'network', 
      label: 'Network & Security', 
      description: 'Captive Portal, QoS & DB',
      icon: Sliders 
    },
  ];

  const isSuperAdmin = !effectiveRole || effectiveRole === 'Super Admin' || effectiveRole === 'Owner' || effectiveRole === 'Admin';
  const isCollaborator = effectiveRole === 'Collaborator';
  const isManagement = effectiveRole === 'Management' || effectiveRole === 'Viewer';

  // Strict role-based navigation filtering:
  // - Super Admins: all 4 items
  // - Collaborators: just captive portal (network tab)
  // - Management: just fleet overview (dashboard tab)
  const navItems = allNavItems.filter((item) => {
    if (isSuperAdmin) return true;
    if (isCollaborator) return item.id === 'network';
    if (isManagement) return item.id === 'dashboard';
    return item.id === 'dashboard';
  }).map((item) => {
    if (isCollaborator && item.id === 'network') {
      return {
        ...item,
        label: 'Captive Portal & Ads',
        description: 'Design, Uploads & Ads'
      };
    }
    return item;
  });

  const verticals: Array<{ id: VerticalType | 'all'; label: string; icon: string }> = [
    { id: 'all', label: 'All 5', icon: '🌐' },
    { id: 'hotspot', label: 'Hotspots', icon: '☕' },
    { id: 'community', label: 'Villages', icon: '🏡' },
    { id: 'bus', label: 'Buses', icon: '🚌' },
    { id: 'stadium', label: 'Stadiums', icon: '🏟️' },
    { id: 'park', label: 'Parks', icon: '🌳' },
  ];

  const handleNavClick = (tabId: string) => {
    onTabChange(tabId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  const handleVerticalClick = (vId: VerticalType | 'all') => {
    onVerticalChange(vId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Sidebar Element (Drawer on mobile, docked on desktop) */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:static lg:w-60 bg-[#0c101c] border-r border-[#1f283d] flex flex-col justify-between shrink-0 p-4 select-none shadow-2xl lg:shadow-none animate-in slide-in-from-left duration-200">
        <div className="space-y-5">
          {/* Official T-Connect Brand Identity & Hide Panel Button */}
          <div className="flex items-center justify-between px-1.5 py-1">
            <div className="flex items-center gap-2.5">
              <TConnectLogo withBackground />
              <div>
                <span className="text-sm font-extrabold tracking-tight text-white block leading-none">T-CONNECT</span>
                <span className="text-[9px] tracking-wider font-mono text-[#ff5500] font-semibold">CONTROL TOWER</span>
              </div>
            </div>

            {/* Hide Panel Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[#161d31] hover:bg-[#202942] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Hide side panel (Full screen view)"
              >
                <PanelLeftClose className="w-4 h-4 text-slate-300" />
              </button>
            )}
          </div>

          {/* Compact Vertical Selector Strip */}
          <div className="bg-[#121829] p-1.5 rounded-xl border border-[#1f283d]">
            <div className="text-[9px] font-mono uppercase text-slate-400 font-bold mb-1 px-1 flex items-center justify-between">
              <span>Vertical Scope</span>
              <Globe className="w-3 h-3 text-slate-500" />
            </div>
            <div className="grid grid-cols-3 gap-1 text-[11px] font-medium font-mono">
              {verticals.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleVerticalClick(v.id)}
                  className={`flex items-center justify-center gap-1 py-1 rounded-md transition-colors truncate cursor-pointer ${
                    selectedVertical === v.id
                      ? 'bg-[#f05e17] text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a233a]'
                  }`}
                >
                  <span>{v.icon}</span>
                  <span className="text-[10px]">{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Streamlined Navigation: Just 4 Core Sections */}
          <nav className="space-y-1 text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#182138] text-white font-bold border border-[#2b3859] shadow-sm'
                      : 'text-slate-400 hover:bg-[#121829] hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#f05e17]' : 'text-slate-500'}`} />
                  <div className="min-w-0">
                    <div className="text-xs truncate">{item.label}</div>
                    <div className="text-[10px] font-mono text-slate-500 truncate font-normal">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

      {/* Database Connection & Tunnel Status Widget */}
      <div className="space-y-2 mt-4 font-mono text-xs">
        {/* Supabase Status Button (Super Admin Exclusive) */}
        {isSuperAdmin ? (
          <button
            onClick={onOpenDatabaseModal}
            className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-colors ${
              isSupabaseConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-[#121829] border-[#1f283d] text-slate-300 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className={`w-3.5 h-3.5 ${isSupabaseConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
              <div>
                <div className="text-[11px] font-bold text-white leading-tight">
                  {isSupabaseConnected ? 'Supabase Connected' : 'Connect Supabase'}
                </div>
                <div className="text-[9px] text-slate-400">
                  {isSupabaseConnected ? 'PostgreSQL Active' : 'Configure Remote DB'}
                </div>
              </div>
            </div>
            {isSupabaseConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="text-[10px] text-[#f05e17] font-bold">SETUP</span>
            )}
          </button>
        ) : (
          <div className="p-2 rounded-xl border border-[#1f283d] bg-[#121829] flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Access Tier</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f05e17]/15 text-[#f05e17] border border-[#f05e17]/30">
              {effectiveRole}
            </span>
          </div>
        )}

        {/* WireGuard Fleet Pulse */}
        <div className="bg-[#121829] border border-[#1f283d] rounded-xl p-2.5 text-[10px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#f05e17]" />
            <span>WG Swarm</span>
          </div>
          <span className="text-emerald-400 font-bold">{onlineRouterCount}/{totalRouterCount} UP</span>
        </div>
      </div>
    </aside>
  </>
  );
};
