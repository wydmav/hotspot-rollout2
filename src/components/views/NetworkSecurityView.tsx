import React, { useState, useMemo } from 'react';
import { Smartphone, Repeat, Sliders, Users, ShieldCheck, Database, Clock, UserCheck, Terminal } from 'lucide-react';
import { 
  HotspotPlan, 
  RouterDevice, 
  RouterAccessMode,
  Voucher, 
  PaymentTransaction,
  ContentFilterRule, 
  TeamMember, 
  AuditLogEntry, 
  VerticalType, 
  GatewayProvider 
} from '../../types';
import { CaptivePortalView } from './CaptivePortalView';
import { RouterTerminalSubTab } from './RouterTerminalSubTab';
import { RoamingView } from './RoamingView';
import { BandwidthFilterView } from './BandwidthFilterView';
import { TeamRbacView } from './TeamRbacView';
import { SecurityAuthView } from './SecurityAuthView';
import { CaptivePortalLeadsView } from './CaptivePortalLeadsView';
import { SessionDurationTrackingDisplay, computeSessionStats } from '../common/SessionDurationTrackingDisplay';
import { storage } from '../../services/storage';

interface NetworkSecurityViewProps {
  plans: HotspotPlan[];
  routers: RouterDevice[];
  vouchers: Voucher[];
  transactions?: PaymentTransaction[];
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
  onSetRouterAccessPolicy?: (
    routerId: string | 'all',
    policy: {
      accessMode: RouterAccessMode;
      freeDurationMinutes?: number;
      freeRateLimit?: string;
      freeDailyQuotaMb?: number;
    }
  ) => Promise<any>;
  onIssuePassword?: (memberId: string, customPass?: string) => void;
  currentUser?: TeamMember;
  effectiveRole?: TeamMember['role'];
}

export const NetworkSecurityView: React.FC<NetworkSecurityViewProps> = (props) => {
  const isCollaborator = props.effectiveRole === 'Collaborator';
  const [activeSubTab, setActiveSubTab] = useState<'portal' | 'terminal' | 'roaming' | 'bandwidth' | 'sessions' | 'leads' | 'team' | 'security'>('portal');

  // Enforce portal subtab for Collaborator
  React.useEffect(() => {
    if (isCollaborator && activeSubTab !== 'portal') {
      setActiveSubTab('portal');
    }
  }, [isCollaborator, activeSubTab]);

  const sessionStats = useMemo(() => {
    return computeSessionStats(props.vouchers, props.transactions || [], props.selectedVertical);
  }, [props.vouchers, props.transactions, props.selectedVertical]);

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
            <span>{isCollaborator ? 'Captive Portal, Images & Ads' : 'Captive Portal'}</span>
          </button>

          {!isCollaborator && (
            <>

          <button
            onClick={() => setActiveSubTab('terminal')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'terminal' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Router Terminal</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-950/60 text-orange-300 border border-orange-500/30">
              4 Options
            </span>
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
            onClick={() => setActiveSubTab('sessions')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'sessions' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Session Duration</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
              {sessionStats.averageShortFormatted}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('leads')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeSubTab === 'leads' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Guest Leads</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/60 text-amber-300 border border-amber-500/30">
              {storage.getCaptiveLeads().length}
            </span>
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
        </>
      )}
    </div>

    {/* Database Shortcut Button (Super Admin Exclusive) */}
    {!isCollaborator && (
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
    )}
  </div>

    {/* Collaborator Role Context Banner */}
    {isCollaborator && (
      <div className="bg-[#121829] border border-[#1f283d] rounded-xl p-3.5 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <Smartphone className="w-4 h-4 text-[#f05e17]" />
          <div>
            <span className="font-bold text-white block">Collaborator Creative Studio</span>
            <span className="text-[10px] text-slate-400 block font-normal">Design guest captive portal appearance, upload branded backgrounds, and configure connected sponsor ad banners.</span>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f05e17]/15 text-[#f05e17] border border-[#f05e17]/30 shrink-0">
          Collaborator Tier
        </span>
      </div>
    )}

    {/* Session Duration Telemetry Quick-Glance Ribbon (Super Admin Exclusive) */}
    {!isCollaborator && (
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0f1422] border border-[#232d42] text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-bold">SESSION TRACKING:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Avg Duration:</span>
            <span className="text-white font-extrabold text-sm">{sessionStats.averageFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Max Connection:</span>
            <span className="text-purple-300 font-extrabold text-sm">{sessionStats.maximumFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Total Leases:</span>
            <span className="text-cyan-300 font-bold">{sessionStats.totalSessions}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Live Active:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {sessionStats.activeCount}
            </span>
          </div>
        </div>

        <button
          onClick={() => setActiveSubTab('sessions')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'sessions'
              ? 'bg-[#f05e17] text-white shadow-sm'
              : 'bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200'
          }`}
        >
          <span>{activeSubTab === 'sessions' ? 'Viewing Logs Tab' : 'View Full Session Logs →'}</span>
        </button>
      </div>
    )}

      {/* Sub-view Content */}
      {activeSubTab === 'portal' && (
        <CaptivePortalView
          plans={props.plans}
          routers={props.routers}
          onToggleRouterFreeMode={props.onToggleRouterFreeMode}
          onSetRouterAccessPolicy={props.onSetRouterAccessPolicy}
          onProcessPayment={props.onProcessPayment}
          onRedeemVoucher={props.onRedeemVoucher}
          currency={props.currency}
          selectedVertical={props.selectedVertical}
          effectiveRole={props.effectiveRole}
        />
      )}

      {activeSubTab === 'terminal' && (
        <RouterTerminalSubTab
          routers={props.routers}
          selectedVertical={props.selectedVertical}
          currency={props.currency}
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

      {activeSubTab === 'sessions' && (
        <SessionDurationTrackingDisplay
          vouchers={props.vouchers}
          transactions={props.transactions || []}
          selectedVertical={props.selectedVertical}
          currency={props.currency}
          title="Network & Security: Session Duration Tracking"
          description="Calculates average and maximum connection time per user session from voucher devices, mobile money transactions, and live captive portal leases"
        />
      )}

      {activeSubTab === 'leads' && (
        <CaptivePortalLeadsView
          selectedVertical={props.selectedVertical}
          currency={props.currency}
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
          onIssuePassword={props.onIssuePassword}
          currentUser={props.currentUser}
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
