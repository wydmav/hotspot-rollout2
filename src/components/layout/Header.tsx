import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  FileDown, 
  Fingerprint, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck,
  Download,
  Database,
  Ticket,
  RefreshCw,
  ArrowRight,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { SystemAlert, PaymentTransaction, TeamMember } from '../../types';
import { ExportService } from '../../services/exportService';
import { UserMenuDropdown } from './UserMenuDropdown';

interface HeaderProps {
  currentTab: string;
  alerts: SystemAlert[];
  onAcknowledgeAlert: (id: string) => void;
  transactions: PaymentTransaction[];
  routerCount: number;
  totalRevenue: number;
  activeSessions: number;
  currency: string;
  onOpenBiometrics: () => void;
  biometricActive: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSupabaseConnected: boolean;
  onOpenDatabaseModal: () => void;
  onNavigateTab?: (tab: string) => void;
  unusedVoucherCount?: number;
  voucherThreshold?: number;
  onUpdateVoucherThreshold?: (threshold: number) => void;
  onTriggerBackgroundCheck?: () => void;
  onQuickRestock?: (count?: number) => void;
  currentUser?: TeamMember;
  effectiveRole?: TeamMember['role'];
  onRolePreviewChange?: (role: TeamMember['role']) => void;
  onSignOut?: () => void;
  teamMembersCount?: number;
  pendingResetCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  alerts,
  onAcknowledgeAlert,
  transactions,
  routerCount,
  totalRevenue,
  activeSessions,
  currency,
  onOpenBiometrics,
  biometricActive,
  searchQuery,
  onSearchChange,
  isSupabaseConnected,
  onOpenDatabaseModal,
  onNavigateTab,
  unusedVoucherCount,
  voucherThreshold = 5,
  onUpdateVoucherThreshold,
  onTriggerBackgroundCheck,
  onQuickRestock,
  currentUser = {
    id: 'tm_owner',
    name: 'Raphooko Phooko',
    email: 'rphooko@tconnect.africa',
    role: 'Owner',
    scopedSites: [],
    mfaEnabled: true,
    status: 'active',
    invitedAt: '2026-10-02',
    lastLoginAt: 'Just now'
  },
  effectiveRole = 'Owner',
  onRolePreviewChange = () => {},
  onSignOut = () => {},
  teamMembersCount = 1,
  pendingResetCount = 0,
}) => {
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showVoucherPopover, setShowVoucherPopover] = useState(false);
  const [thresholdInput, setThresholdInput] = useState<number>(voucherThreshold);
  const [isAuditing, setIsAuditing] = useState(false);

  // Keep local threshold input synced with prop
  React.useEffect(() => {
    setThresholdInput(voucherThreshold);
  }, [voucherThreshold]);

  const lowVoucherAlert = alerts.find(
    (a) => a.id === 'alert_low_voucher_stock' || (a.source === 'voucher' && a.title.toLowerCase().includes('voucher'))
  );
  const unreadAlerts = alerts.filter(a => !a.acknowledged);

  const effectiveUnused = unusedVoucherCount !== undefined
    ? unusedVoucherCount
    : (lowVoucherAlert?.metadata?.unusedCount ?? 0);
  const effectiveThreshold = voucherThreshold !== undefined
    ? voucherThreshold
    : (lowVoucherAlert?.metadata?.threshold ?? 5);

  const isLowStock = !!lowVoucherAlert || (unusedVoucherCount !== undefined && unusedVoucherCount <= effectiveThreshold);
  const isDepleted = effectiveUnused === 0;

  const handleExportPdf = () => {
    ExportService.printExecutivePdfReport({
      totalRevenue,
      activeSessions,
      routerCount,
      currency,
      transactions
    });
  };

  const handleExportCsv = () => {
    ExportService.exportTransactionsToCsv(transactions);
  };

  const handleTriggerAudit = () => {
    setIsAuditing(true);
    if (onTriggerBackgroundCheck) {
      onTriggerBackgroundCheck();
    }
    setTimeout(() => setIsAuditing(false), 700);
  };

  const formatTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Fleet Overview & Analytics';
      case 'fleet': return 'Routers & Adoption (MKController-Style)';
      case 'billing': return 'Billing, Vouchers & Gateways';
      case 'network': return 'Network, Security & Database';
      default: return tab;
    }
  };

  return (
    <header className="h-16 bg-[#0f1422] border-b border-[#232d42] px-6 flex items-center justify-between shrink-0 select-none z-30">
      {/* Zone 1: Current Section Context & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-slate-200 font-bold">T-Connect</span>
          <span>/</span>
          <span className="text-[#f05e17] font-semibold">{formatTabTitle(currentTab)}</span>
        </div>
      </div>

      {/* Zone 2: Unified Search Filter Input */}
      <div className="relative w-80 hidden md:block">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search voucher, router MAC, bus plate, tx ref..."
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#161d31] border border-[#232d42] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#f05e17] font-mono transition-colors"
        />
      </div>

      {/* Zone 3: Actions (Database, Biometric Security, Low Voucher Alert, Export PDF/CSV, Alerts, User Profile) */}
      <div className="flex items-center gap-2.5">
        {/* Supabase Connection Status */}
        <button
          onClick={onOpenDatabaseModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
            isSupabaseConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-[#161d31] border-[#232d42] text-slate-300 hover:border-slate-500'
          }`}
          title="Supabase PostgreSQL Integration"
        >
          <Database className="w-3.5 h-3.5 text-current" />
          <span className="hidden md:inline">{isSupabaseConnected ? 'Supabase Connected' : 'Connect Supabase'}</span>
        </button>

        {/* Biometrics Authenticator Status */}
        <button
          onClick={onOpenBiometrics}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
            biometricActive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-[#161d31] border-[#232d42] text-slate-400 hover:text-slate-200'
          }`}
          title="Biometric Authentication (WebAuthn / Passkey)"
        >
          <Fingerprint className="w-3.5 h-3.5 text-current" />
          <span className="hidden lg:inline">{biometricActive ? 'Biometrics Locked' : 'Touch ID / Passkey'}</span>
        </button>

        {/* Quick Export Dropdown */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded-lg text-xs font-mono text-slate-300 transition-colors"
            title="Export CSV Data"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded-lg text-xs font-mono text-slate-300 transition-colors"
            title="Generate Printable PDF Executive Report"
          >
            <FileDown className="w-3.5 h-3.5 text-[#f05e17]" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>

        {/* ======================================================= */}
        {/* LOW VOUCHER BALANCE NOTIFICATION BADGE & POPOVER (SENTINEL) */}
        {/* ======================================================= */}
        {isLowStock && (
          <div className="relative">
            <button
              onClick={() => {
                setShowVoucherPopover(!showVoucherPopover);
                setShowAlertsDropdown(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm ${
                isDepleted
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30 animate-pulse shadow-rose-950/50'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 animate-pulse shadow-amber-950/50'
              }`}
              title={lowVoucherAlert?.message || `Low Voucher Balance: ${effectiveUnused} remaining (Threshold: ${effectiveThreshold}). Click to manage.`}
              aria-label="Low Voucher Balance Notification"
            >
              <div className="relative flex items-center justify-center">
                <Ticket className={`w-3.5 h-3.5 ${isDepleted ? 'text-rose-400' : 'text-amber-400'} shrink-0`} />
                <span className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${isDepleted ? 'bg-rose-400' : 'bg-amber-400'} animate-ping`} />
              </div>
              <span className="font-bold hidden md:inline">
                {isDepleted ? 'Voucher Stock Empty' : 'Low Voucher Balance'}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isDepleted
                  ? 'bg-rose-950/90 text-rose-200 border border-rose-700/60'
                  : 'bg-amber-950/90 text-amber-200 border border-amber-700/60'
              }`}>
                {effectiveUnused} left
              </span>
            </button>

            {/* Low Voucher Balance Management Popover */}
            {showVoucherPopover && (
              <div className="absolute right-0 mt-2 w-84 bg-[#141b2d] border border-[#232d42] rounded-xl shadow-2xl p-4 z-50 text-xs font-mono space-y-3.5">
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-[#232d42]">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isDepleted ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white leading-tight">
                        {isDepleted ? 'Critical: Voucher Stock Depleted' : 'Low Voucher Balance'}
                      </h4>
                      <p className="text-[10px] text-slate-400">Background Sentinel Active</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isDepleted ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {isDepleted ? 'DEPLETED' : 'WARNING'}
                  </span>
                </div>

                {/* Stock Stats & Meter */}
                <div className="bg-[#0b0f19] p-3 rounded-lg border border-[#1b233a] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Unused Voucher Stock:</span>
                    <span className={`font-bold ${isDepleted ? 'text-rose-400' : 'text-amber-400'}`}>
                      {effectiveUnused} Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Trigger Threshold:</span>
                    <span className="text-slate-200 font-bold">≤ {effectiveThreshold} Vouchers</span>
                  </div>

                  {/* Stock Bar Meter */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        isDepleted ? 'w-0' : effectiveUnused <= effectiveThreshold ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(8, (effectiveUnused / (effectiveThreshold * 2 || 10)) * 100))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Auto-checks every 15s
                    </span>
                    <button
                      onClick={handleTriggerAudit}
                      disabled={isAuditing}
                      className="text-slate-400 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isAuditing ? 'animate-spin text-[#f05e17]' : ''}`} />
                      <span>{isAuditing ? 'Auditing...' : 'Audit Now'}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="space-y-2">
                  {onNavigateTab && (
                    <button
                      onClick={() => {
                        setShowVoucherPopover(false);
                        onNavigateTab('billing');
                      }}
                      className="w-full py-2 px-3 bg-[#f05e17] hover:bg-[#d94c0b] text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Go to Plans &amp; Vouchers (Restock)</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                    </button>
                  )}

                  {onQuickRestock && (
                    <button
                      onClick={() => {
                        onQuickRestock(5);
                        setShowVoucherPopover(false);
                      }}
                      className="w-full py-2 px-3 bg-[#1e273f] hover:bg-[#293556] border border-[#2d3a5a] text-slate-200 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Quick Replenish (+5 Vouchers)</span>
                    </button>
                  )}
                </div>

                {/* Threshold Configuration Controller */}
                {onUpdateVoucherThreshold && (
                  <div className="pt-2 border-t border-[#232d42]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3 text-[#f05e17]" />
                        Alert Threshold:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const next = Math.max(0, thresholdInput - 1);
                            setThresholdInput(next);
                            onUpdateVoucherThreshold(next);
                          }}
                          className="w-6 h-6 rounded bg-[#1e273f] hover:bg-[#2a3759] border border-[#2e3b5e] text-slate-200 flex items-center justify-center font-bold"
                          title="Decrease threshold"
                        >
                          -
                        </button>
                        <span className="px-2 py-0.5 bg-[#0b0f19] border border-[#1b233a] rounded text-slate-200 font-bold text-center min-w-8">
                          {thresholdInput}
                        </span>
                        <button
                          onClick={() => {
                            const next = thresholdInput + 1;
                            setThresholdInput(next);
                            onUpdateVoucherThreshold(next);
                          }}
                          className="w-6 h-6 rounded bg-[#1e273f] hover:bg-[#2a3759] border border-[#2e3b5e] text-slate-200 flex items-center justify-center font-bold"
                          title="Increase threshold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Acknowledge / Dismiss Alert */}
                {lowVoucherAlert && !lowVoucherAlert.acknowledged && (
                  <div className="pt-2 border-t border-[#232d42] flex justify-end">
                    <button
                      onClick={() => {
                        onAcknowledgeAlert(lowVoucherAlert.id);
                        setShowVoucherPopover(false);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 hover:underline"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#f05e17]" />
                      <span>Acknowledge Alert</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Alerts Bell Notification */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAlertsDropdown(!showAlertsDropdown);
              setShowVoucherPopover(false);
            }}
            className="relative p-2 rounded-lg bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 transition-colors"
            aria-label="System Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#f05e17] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-84 bg-[#161d31] border border-[#232d42] rounded-xl shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#232d42] mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#f05e17]" /> System Anomaly Alerts
                </span>
                <span className="text-[10px] font-mono text-slate-400">{unreadAlerts.length} Active</span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No anomalies reported.</p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-2.5 rounded-lg text-xs border ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                          : alert.severity === 'warning'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                          : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          {alert.source === 'voucher' ? (
                            <Ticket className="w-3.5 h-3.5 shrink-0 text-[#f05e17]" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{alert.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{alert.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">{alert.message}</p>
                      
                      {/* Action buttons inside alert item */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-700/30">
                        {alert.source === 'voucher' && onNavigateTab && (
                          <button
                            onClick={() => {
                              onNavigateTab('billing');
                              setShowAlertsDropdown(false);
                            }}
                            className="text-[10px] font-mono font-bold text-[#f05e17] hover:underline flex items-center gap-1"
                          >
                            <Ticket className="w-3 h-3" /> Restock Vouchers &rarr;
                          </button>
                        )}
                        {!alert.acknowledged && (
                          <button
                            onClick={() => onAcknowledgeAlert(alert.id)}
                            className="text-[10px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 ml-auto"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account & Role Dropdown Menu */}
        <div className="pl-2 border-l border-[#232d42]">
          <UserMenuDropdown
            currentUser={currentUser}
            effectiveRole={effectiveRole}
            onRolePreviewChange={onRolePreviewChange}
            onNavigateTab={onNavigateTab || (() => {})}
            onSignOut={onSignOut}
            teamMembersCount={teamMembersCount}
            pendingResetCount={pendingResetCount}
            biometricActive={biometricActive}
            onOpenBiometrics={onOpenBiometrics}
          />
        </div>
      </div>
    </header>
  );
};
