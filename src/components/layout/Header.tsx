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
  Database
} from 'lucide-react';
import { SystemAlert, PaymentTransaction } from '../../types';
import { ExportService } from '../../services/exportService';

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
  onOpenDatabaseModal
}) => {
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const unreadAlerts = alerts.filter(a => !a.acknowledged);

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

      {/* Zone 3: Actions (Database, Biometric Security, Export PDF/CSV, Alerts, User Profile) */}
      <div className="flex items-center gap-3">
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

        {/* Alerts Bell Notification */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
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
            <div className="absolute right-0 mt-2 w-80 bg-[#161d31] border border-[#232d42] rounded-xl shadow-2xl p-3 z-50">
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
                      className={`p-2 rounded-lg text-xs border ${
                        alert.severity === 'critical'
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-200'
                          : alert.severity === 'warning'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                          : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{alert.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{alert.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">{alert.message}</p>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => onAcknowledgeAlert(alert.id)}
                          className="mt-1.5 text-[10px] font-mono text-[#f05e17] hover:underline flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Dismiss Alert
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Lockup */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#232d42]">
          <div className="w-8 h-8 rounded-lg bg-[#232d42] flex items-center justify-center text-xs font-bold text-white border border-[#334155]">
            RP
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-white leading-tight">Raphooko Phooko</p>
            <p className="text-[10px] text-slate-400 font-mono">Owner · MFA Verified</p>
          </div>
        </div>
      </div>
    </header>
  );
};
