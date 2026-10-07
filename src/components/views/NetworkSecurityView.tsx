import React, { useState } from 'react';
import { Smartphone, Repeat, Sliders, Users, ShieldCheck, Database } from 'lucide-react';
import { 
  HotspotPlan, 
  RouterDevice, 
  Voucher, 
  ContentFilterRule, 
  TeamMember, 
  AuditLogEntry, 
  VerticalType, 
  GatewayProvider 
} from '../../types';
import { CaptivePortalView } from './CaptivePortalView';
import { RoamingView } from './RoamingView';
import { BandwidthFilterView } from './BandwidthFilterView';
import { TeamRbacView } from './TeamRbacView';
import { SecurityAuthView } from './SecurityAuthView';

interface NetworkSecurityViewProps {
  plans: HotspotPlan[];
  routers: RouterDevice[];
  vouchers: Voucher[];
  contentFilters: ContentFilterRule[];
  team: TeamMember[];
  auditLogs: AuditLogEntry[];
  selectedVertical: VerticalType | 'all';
  currency: string;
  biometricActive: boolean;
  onToggleBiometric: () => void;
  onProcessPayment: (provider: GatewayProvider, planId: string, phone?: string, ottPin?: string) => any;
  onRedeemVoucher: (code: string, mac: string, hostname?: string, siteName?: string) => any;
  onToggleFilter: (ruleId: string, enabled: boolean) => void;
  onInviteMember: (name: string, email: string, role: TeamMember['role'], scopedSites: string[]) => void;
  onUpdateRole: (memberId: string, role: TeamMember['role'], scopedSites?: string[]) => void;
  onDeleteMember: (memberId: string) => void;
  onOpenDatabaseModal: () => void;
  isSupabaseConnected: boolean;
  onToggleRouterFreeMode?: (routerId: string | 'all', enabled: boolean) => void;
}

export const NetworkSecurityView: React.FC<NetworkSecurityViewProps> = (props) => {
  const [activeSubTab, setActiveSubTab] = useState<'portal' | 'roaming' | 'bandwidth' | 'team' | 'security'>('portal');

  return (
    <div className="space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap rounded-xl bg-[#121829] p-1 border border-[#1f283d] text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('portal')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'portal' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Captive Portal</span>
          </button>

          <button
            onClick={() => setActiveSubTab('roaming')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'roaming' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Roaming Engine</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bandwidth')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'bandwidth' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Bandwidth &amp; DNS</span>
          </button>

          <button
            onClick={() => setActiveSubTab('team')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'team' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team &amp; RBAC</span>
          </button>

          <button
            onClick={() => setActiveSubTab('security')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'security' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security &amp; Passkeys</span>
          </button>
        </div>

        {/* Database Shortcut Button */}
        <button
          onClick={props.onOpenDatabaseModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
            props.isSupabaseConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-[#121829] border-[#1f283d] text-slate-300 hover:border-slate-500'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{props.isSupabaseConnected ? 'Supabase Active' : 'Configure Supabase DB'}</span>
        </button>
      </div>

      {/* Sub-view Content */}
      {activeSubTab === 'portal' && (
        <CaptivePortalView
          plans={props.plans}
          routers={props.routers}
          onToggleRouterFreeMode={props.onToggleRouterFreeMode}
          onProcessPayment={props.onProcessPayment}
          onRedeemVoucher={props.onRedeemVoucher}
          currency={props.currency}
          selectedVertical={props.selectedVertical}
        />
      )}

      {activeSubTab === 'roaming' && (
        <RoamingView
          routers={props.routers}
          vouchers={props.vouchers}
          onRedeemVoucher={props.onRedeemVoucher}
          currency={props.currency}
        />
      )}

      {activeSubTab === 'bandwidth' && (
        <BandwidthFilterView
          contentFilters={props.contentFilters}
          onToggleFilter={props.onToggleFilter}
          routers={props.routers}
          selectedVertical={props.selectedVertical}
        />
      )}

      {activeSubTab === 'team' && (
        <TeamRbacView
          team={props.team}
          auditLogs={props.auditLogs}
          routers={props.routers}
          onInviteMember={props.onInviteMember}
          onUpdateRole={props.onUpdateRole}
          onDeleteMember={props.onDeleteMember}
        />
      )}

      {activeSubTab === 'security' && (
        <SecurityAuthView
          biometricActive={props.biometricActive}
          onToggleBiometric={props.onToggleBiometric}
        />
      )}
    </div>
  );
};
