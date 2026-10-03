/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { supabaseService } from './services/supabase';
import { VerticalType, GatewayProvider } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { AdoptionView } from './components/views/AdoptionView';
import { BillingView } from './components/views/BillingView';
import { NetworkSecurityView } from './components/views/NetworkSecurityView';
import { DatabaseModal } from './components/common/DatabaseModal';
import { Fingerprint, CheckCircle2, ShieldCheck, Database } from 'lucide-react';

export default function App() {
  const [state, setState] = useState(() => storage.getState());
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedVertical, setSelectedVertical] = useState<VerticalType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [biometricActive, setBiometricActive] = useState(true);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => {
    return supabaseService.getConfig().isConnected;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to reactive storage mutations
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setState({ ...storage.getState() });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Router Handlers
  const handleAdoptRouter = (routerId: string) => {
    storage.adoptRouter(routerId);
    showToast('Router adopted successfully! WireGuard tunnel online.');
    if (isSupabaseConnected) {
      supabaseService.syncRoutersToSupabase(storage.getState().routers);
    }
  };

  const handleAddRouter = (routerData: any) => {
    const created = storage.addRouter(routerData);
    showToast(`Added ${created.name}. One-liner script ready for terminal import.`);
    if (isSupabaseConnected) {
      supabaseService.syncRoutersToSupabase(storage.getState().routers);
    }
    return created;
  };

  const handleDeleteRouter = (routerId: string) => {
    storage.deleteRouter(routerId);
    showToast('Router removed and tunnel keys revoked.');
    if (isSupabaseConnected) {
      supabaseService.syncRoutersToSupabase(storage.getState().routers);
    }
  };

  // Plan & Voucher Handlers
  const handleCreatePlan = (planData: any) => {
    storage.createPlan(planData);
    showToast('New hotspot plan saved with exact speed & device quotas.');
  };

  const handleGenerateBatch = (planId: string, count: number) => {
    const generated = storage.generateVoucherBatch(planId, count);
    showToast(`Generated batch of ${count} single-use vouchers. CSV downloaded.`);
    if (isSupabaseConnected) {
      generated.forEach(v => supabaseService.syncVoucherToSupabase(v));
    }
    return generated;
  };

  const handleRedeemVoucher = (code: string, mac: string, hostname?: string, siteName?: string) => {
    const res = storage.redeemVoucher(code, mac, hostname, siteName);
    if (res.success) {
      showToast(res.message);
      if (isSupabaseConnected) {
        const v = storage.getState().vouchers.find(item => item.code.toUpperCase() === code.trim().toUpperCase());
        if (v) supabaseService.syncVoucherToSupabase(v);
      }
    }
    return res;
  };

  // Gateway Handlers
  const handleTestGatewayConnection = (provider: GatewayProvider) => {
    const res = storage.testGatewayConnection(provider);
    showToast(res.message || 'API connection test executed');
    return res;
  };

  const handleRunSandboxPayment = (provider: GatewayProvider, amount = 10) => {
    const res = storage.runSandboxTestPayment(provider, amount);
    showToast(`Sandbox test payment completed. Ref: ${res.transactionRef}`);
    return res;
  };

  const handleToggleGatewayLive = (provider: GatewayProvider, setLive: boolean) => {
    const res = storage.toggleGatewayLive(provider, setLive);
    if (res.success) {
      showToast(`Gateway status changed to ${setLive ? 'LIVE' : 'SANDBOX'}.`);
    } else {
      showToast(`Error: ${res.message}`);
    }
    return res;
  };

  const handleUpdateGatewayCredentials = (provider: GatewayProvider, updates: any) => {
    storage.updateGatewayCredentials(provider, updates);
    showToast('Gateway merchant credentials updated.');
  };

  const handleProcessLivePayment = (provider: GatewayProvider, planId: string, phone?: string, ottPin?: string) => {
    const res = storage.processLivePayment(provider, planId, phone, ottPin);
    showToast(`Payment successful! Issued voucher ${res.voucher.code}`);
    if (isSupabaseConnected) {
      supabaseService.syncTransactionToSupabase(res.transaction);
      supabaseService.syncVoucherToSupabase(res.voucher);
    }
    return res;
  };

  const handleRecheckPaymentStatus = (txId: string) => {
    const res = storage.recheckPaymentStatus(txId);
    showToast(res.message || 'Payment status updated');
    return res;
  };

  // Team & Content Filters
  const handleInviteMember = (name: string, email: string, role: any, scopedSites: string[]) => {
    storage.inviteTeamMember(name, email, role, scopedSites);
    showToast(`Single-use invitation generated for ${email}.`);
  };

  const handleUpdateMemberRole = (memberId: string, role: any, scopedSites?: string[]) => {
    storage.updateMemberRole(memberId, role, scopedSites);
    showToast('Member permissions updated and effective immediately.');
  };

  const handleDeleteMember = (memberId: string) => {
    storage.deleteTeamMember(memberId);
    showToast('Team member access revoked.');
  };

  const handleToggleFilter = (ruleId: string, enabled: boolean) => {
    storage.toggleContentFilter(ruleId, enabled);
    showToast(`DNS Content filter category updated.`);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    storage.acknowledgeAlert(alertId);
    showToast('Anomaly alert dismissed.');
  };

  const onlineRouters = state.routers.filter(r => r.status === 'online').length;
  const totalRevenue = state.transactions
    .filter(t => t.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const activeSessions = state.routers.reduce((acc, curr) => acc + curr.activeSessions, 0);

  return (
    <div className="flex h-screen bg-[#080b14] text-slate-100 overflow-hidden font-sans">
      {/* Streamlined 4-Section Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        selectedVertical={selectedVertical}
        onVerticalChange={setSelectedVertical}
        onlineRouterCount={onlineRouters}
        totalRouterCount={state.routers.length}
        isSupabaseConnected={isSupabaseConnected}
        onOpenDatabaseModal={() => setShowDatabaseModal(true)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#080b14] overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          alerts={state.alerts}
          onAcknowledgeAlert={handleAcknowledgeAlert}
          transactions={state.transactions}
          routerCount={state.routers.length}
          totalRevenue={totalRevenue}
          activeSessions={activeSessions}
          currency="M"
          onOpenBiometrics={() => setShowBiometricModal(true)}
          biometricActive={biometricActive}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSupabaseConnected={isSupabaseConnected}
          onOpenDatabaseModal={() => setShowDatabaseModal(true)}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7 space-y-6">
          {/* Section 1: Fleet Overview & Analytics */}
          {currentTab === 'dashboard' && (
            <DashboardView
              routers={state.routers}
              transactions={state.transactions}
              plans={state.plans}
              vouchers={state.vouchers}
              selectedVertical={selectedVertical}
              onNavigateTab={(tab) => {
                // map legacy deep navigation to the 4 streamlined tabs
                if (tab === 'adoption') setCurrentTab('fleet');
                else if (tab === 'plans_vouchers' || tab === 'gateways' || tab === 'transactions') setCurrentTab('billing');
                else if (tab === 'captive_portal' || tab === 'roaming' || tab === 'bandwidth_filter' || tab === 'team_rbac' || tab === 'security') setCurrentTab('network');
                else setCurrentTab(tab);
              }}
              currency="M"
            />
          )}

          {/* Section 2: Routers & Adoption (MKController-Style) */}
          {currentTab === 'fleet' && (
            <AdoptionView
              routers={state.routers}
              onAdoptRouter={handleAdoptRouter}
              onAddRouter={handleAddRouter}
              onDeleteRouter={handleDeleteRouter}
              selectedVertical={selectedVertical}
            />
          )}

          {/* Section 3: Billing & Vouchers (Plans, Vouchers, Gateways, Ledger) */}
          {currentTab === 'billing' && (
            <BillingView
              plans={state.plans}
              vouchers={state.vouchers}
              gateways={state.gateways}
              transactions={state.transactions}
              selectedVertical={selectedVertical}
              currency="M"
              onCreatePlan={handleCreatePlan}
              onGenerateBatch={handleGenerateBatch}
              onRedeemVoucher={handleRedeemVoucher}
              onTestConnection={handleTestGatewayConnection}
              onRunSandboxPayment={handleRunSandboxPayment}
              onToggleLive={handleToggleGatewayLive}
              onUpdateCredentials={handleUpdateGatewayCredentials}
              onRecheckStatus={handleRecheckPaymentStatus}
            />
          )}

          {/* Section 4: Network & Security (Captive Portal, Roaming, Bandwidth, Team, Security) */}
          {currentTab === 'network' && (
            <NetworkSecurityView
              plans={state.plans}
              routers={state.routers}
              vouchers={state.vouchers}
              contentFilters={state.contentFilters}
              team={state.team}
              auditLogs={state.auditLogs}
              selectedVertical={selectedVertical}
              currency="M"
              biometricActive={biometricActive}
              onToggleBiometric={() => setBiometricActive(!biometricActive)}
              onProcessPayment={handleProcessLivePayment}
              onRedeemVoucher={handleRedeemVoucher}
              onToggleFilter={handleToggleFilter}
              onInviteMember={handleInviteMember}
              onUpdateRole={handleUpdateMemberRole}
              onDeleteMember={handleDeleteMember}
              onOpenDatabaseModal={() => setShowDatabaseModal(true)}
              isSupabaseConnected={isSupabaseConnected}
            />
          )}
        </main>
      </div>

      {/* Supabase PostgreSQL Integration Modal */}
      <DatabaseModal
        isOpen={showDatabaseModal}
        onClose={() => setShowDatabaseModal(false)}
        onConnectedStatusChange={(connected) => {
          setIsSupabaseConnected(connected);
          showToast(connected ? 'Supabase PostgreSQL connected successfully!' : 'Supabase connection updated.');
        }}
        onResetToScratch={() => {
          storage.clearAllToScratch();
          showToast('State wiped to clean scratch! Zero mock data.');
        }}
        onDataPulled={(data) => {
          storage.loadFromSupabase(data);
          showToast(`Loaded ${data.routers?.length || 0} routers and ${data.vouchers?.length || 0} vouchers from Supabase!`);
        }}
      />

      {/* Biometric Verification Modal */}
      {showBiometricModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0c101c] border border-[#232d42] rounded-2xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <Fingerprint className="w-9 h-9 animate-pulse" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">Touch ID / Passkey Authentication</h3>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Touch your fingerprint sensor or verify with Face ID to confirm administrative session identity.
              </p>
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => {
                  setBiometricActive(true);
                  setShowBiometricModal(false);
                  showToast('Biometric session authenticated via Secure Enclave.');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg shadow-sm"
              >
                Simulate Passkey Match
              </button>
              <button
                onClick={() => setShowBiometricModal(false)}
                className="px-3 py-2 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 font-mono text-xs rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#161d31] border border-[#f05e17]/50 text-white px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2.5 font-mono text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#f05e17] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
