import React from 'react';
import { 
  LayoutDashboard, 
  Radio, 
  CreditCard, 
  Sliders, 
  Database,
  Globe,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { VerticalType } from '../../types';
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
}) => {
  // Streamlined 4 Core Navigation Items
  const navItems = [
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

  const verticals: Array<{ id: VerticalType | 'all'; label: string; icon: string }> = [
    { id: 'all', label: 'All 5', icon: '🌐' },
    { id: 'hotspot', label: 'Hotspots', icon: '☕' },
    { id: 'community', label: 'Villages', icon: '🏡' },
    { id: 'bus', label: 'Buses', icon: '🚌' },
    { id: 'stadium', label: 'Stadiums', icon: '🏟️' },
    { id: 'park', label: 'Parks', icon: '🌳' },
  ];

  return (
    <aside className="w-60 bg-[#0c101c] border-r border-[#1f283d] flex flex-col justify-between shrink-0 p-4 select-none z-20">
      <div className="space-y-5">
        {/* Official T-Connect Brand Identity */}
        <div className="flex items-center gap-3 px-1.5 py-1">
          <TConnectLogo withBackground />
          <div>
            <span className="text-sm font-extrabold tracking-tight text-white block leading-none">T-CONNECT</span>
            <span className="text-[9px] tracking-wider font-mono text-[#ff5500] font-semibold">CLOUD CONTROLLER</span>
          </div>
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
                onClick={() => onVerticalChange(v.id)}
                className={`flex items-center justify-center gap-1 py-1 rounded-md transition-colors truncate ${
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
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
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
        {/* Supabase Status Button */}
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
  );
};
