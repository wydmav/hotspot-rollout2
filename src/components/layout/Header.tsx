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
  Sparkles,
  PanelLeft,
  PanelLeftClose,
  Wifi,
  Sun,
  Moon
} from 'lucide-react';
import { SystemAlert, PaymentTransaction, TeamMember } from '../../types';
import { ExportService } from '../../services/exportService';
import { UserMenuDropdown } from './UserMenuDropdown';

interface HeaderProps {
  currentTab: string;
  onOpenUserPortal?: () => void;
  alerts: SystemAlert[];
  onAcknowledgeAlert: (id: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
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
  onOpenInviteTeammates?: () => void;
  adminTheme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenUserPortal,
  alerts,
  onAcknowledgeAlert,
  onToggleSidebar,
  isSidebarOpen = true,
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
    role: 'Super Admin',
    scopedSites: [],
    mfaEnabled: true,
    status: 'active',
    invitedAt: '2026-10-02',
    lastLoginAt: 'Just now'
  },
  effectiveRole = 'Super Admin',
  onRolePreviewChange = () => {},
  onSignOut = () => {},
  teamMembersCount = 1,
  pendingResetCount = 0,
  onOpenInviteTeammates,
  adminTheme = 'dark',
  onToggleTheme,
}) => {
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showVoucherPopover, setShowVoucherPopover] = useState(false);
  const [thresholdInput, setThresholdInput] = useState<number>(voucherThreshold);
  const [isAuditing, setIsAuditing] = useState(false);

  // Keep local threshold input synced with prop
  React.useEffect(() => {
    setThresholdInput(voucherThreshold);
  }, [voucherThreshold]);

  const filteredAlerts = alerts.filter(
    (a) => a.id !== 'alert_low_voucher_stock' && a.source !== 'voucher'
  );
  const unreadAlerts = filteredAlerts.filter(a => !a.acknowledged);

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
    <header className="h-16 bg-[#0f1422] border-b border-[#232d42] px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-30">
      {/* Zone 1: Current Section Context & Side Panel Toggle */}
      <div className="flex items-center gap-2.5">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-mono"
            title={isSidebarOpen ? "Hide side panel (Full page view)" : "Open side panel"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 text-[#f05e17]" />
            ) : (
              <>
                <PanelLeft className="w-4 h-4 text-[#f05e17]" />
                <span className="text-[11px] font-bold text-white hidden sm:inline">Side Panel</span>
              </>
            )}
          </button>
        )}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-slate-200 font-bold hidden sm:inline">T-Connect</span>
          <span className="hidden sm:inline">/</span>
          <span className="text-[#f05e17] font-semibold truncate max-w-[150px] sm:max-w-none">{formatTabTitle(currentTab)}</span>
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

      {/* Zone 3: Actions (Theme Toggle, Database, Biometric Security, Low Voucher Alert, Export PDF/CSV, Alerts, User Profile) */}
      <div className="flex items-center gap-2.5">
        {/* Admin Light / Dark Theme Toggle (Excludes Subscriber Captive Portal) */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 hover:text-white text-xs font-mono font-bold transition-colors cursor-pointer"
            title={
              adminTheme === 'dark'
                ? 'Switch Admin Control Tower to Light Theme (Subscriber Captive Portal stays unchanged)'
                : 'Switch Admin Control Tower to Dark Theme (Subscriber Captive Portal stays unchanged)'
            }
          >
            {adminTheme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        )}

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

        {/* Official 16-Digit OTT Voucher & PayLesotho Status Badge */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs font-mono"
          title="16-Digit OTT Voucher & PayLesotho Aggregator Active"
        >
          <Ticket className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-bold">16-Digit OTT Live</span>
        </div>

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
                {filteredAlerts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No anomalies reported.</p>
                ) : (
                  filteredAlerts.map((alert) => (
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

        {/* Test as Wi-Fi User Captive Portal Quick Launch */}
        {onOpenUserPortal && (
          <button
            type="button"
            onClick={onOpenUserPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f05e17] to-amber-500 hover:from-[#d94c0b] hover:to-amber-600 text-white rounded-xl text-xs font-mono font-bold shadow-md shadow-orange-500/20 cursor-pointer transition-all border border-orange-400/40"
            title="Open and test the live end-user Captive Portal (Free Trial, Voucher Login, Mobile Money)"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test as User</span>
            <span className="sm:hidden">Test</span>
          </button>
        )}

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
            onOpenInviteTeammates={onOpenInviteTeammates}
          />
        </div>
      </div>
    </header>
  );
};
