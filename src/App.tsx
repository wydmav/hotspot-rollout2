/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { supabaseService } from './services/supabase';
import { VerticalType, GatewayProvider, AuthSession, TeamMember, Voucher, RouterDevice } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { AdoptionView } from './components/views/AdoptionView';
import { BillingView } from './components/views/BillingView';
import { NetworkSecurityView } from './components/views/NetworkSecurityView';
import { DatabaseModal } from './components/common/DatabaseModal';
import { LoginView } from './components/auth/LoginView';
import { Fingerprint, CheckCircle2, ShieldCheck, Database, Eye, UserPlus, Mail, Copy, Check, X, Sparkles, ArrowUpRight } from 'lucide-react';
import { simulateInviteEmail } from './services/auth';

export default function App() {
  const [state, setState] = useState(() => storage.getState());
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => storage.getAuthSession());
  const [effectiveRole, setEffectiveRole] = useState<TeamMember['role']>(() => {
    const s = storage.getAuthSession();
    return s ? s.effectiveRole : 'Owner';
  });
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
  const [voucherThreshold, setVoucherThreshold] = useState<number>(() => storage.getVoucherLowThreshold());

  // Global Invite Modal State (Triggered from User Profile dropdown or Team view)
  const [isGlobalInviteModalOpen, setIsGlobalInviteModalOpen] = useState(false);
  const [globalInviteName, setGlobalInviteName] = useState('');
  const [globalInviteEmail, setGlobalInviteEmail] = useState('');
  const [globalInviteRole, setGlobalInviteRole] = useState<TeamMember['role']>('Collaborator');
  const [globalInviteSites, setGlobalInviteSites] = useState<string[]>([]);
  const [recentlyInvitedTeammate, setRecentlyInvitedTeammate] = useState<{ member: TeamMember; inviteUrl: string } | null>(null);
  const [copiedGlobalInviteUrl, setCopiedGlobalInviteUrl] = useState(false);

  // Subscribe to reactive storage mutations
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setState({ ...storage.getState() });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Background Sentinel Daemon: Continually audits voucher inventory against threshold every 15s
  useEffect(() => {
    // Initial stock verification on mount
    storage.checkVoucherStock();

    const intervalId = setInterval(() => {
      storage.checkVoucherStock();
    }, 15000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Subscribe to Supabase Realtime WebSocket changes across ALL tables
  useEffect(() => {
    if (!isSupabaseConnected) return;

    const unsubscribeRealtime = supabaseService.subscribeToAllRealtime({
      onRouterChange: async () => {
        const data = await supabaseService.pullFromSupabase();
        if (data?.routers) storage.loadFromSupabase({ routers: data.routers });
      },
      onVoucherChange: async () => {
        const data = await supabaseService.pullFromSupabase();
        if (data?.vouchers) storage.loadFromSupabase({ vouchers: data.vouchers });
      },
      onTransactionChange: async () => {
        const data = await supabaseService.pullFromSupabase();
        if (data?.transactions) storage.loadFromSupabase({ transactions: data.transactions });
      },
      onPlanChange: async () => {
        const data = await supabaseService.pullFromSupabase();
        if (data?.plans) storage.loadFromSupabase({ plans: data.plans });
      },
    });

    return () => {
      unsubscribeRealtime();
    };
  }, [isSupabaseConnected]);

  // Instant Link-Based Authentication Listener for Email Invites
  useEffect(() => {
    const handleUrlAuth = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash;
      const search = window.location.search;

      let token = '';
      let emailHint = '';

      if (hash.startsWith('#invite') || hash.includes('token=')) {
        const tokenMatch = hash.match(/token=([^&]+)/);
        const emailMatch = hash.match(/email=([^&]+)/);
        if (tokenMatch) token = decodeURIComponent(tokenMatch[1]);
        if (emailMatch) emailHint = decodeURIComponent(emailMatch[1]);
      } else if (search.includes('token=') || search.includes('invite=')) {
        const params = new URLSearchParams(search);
        token = params.get('token') || params.get('invite') || '';
        emailHint = params.get('email') || '';
      }

      if (token || (emailHint && hash.startsWith('#invite'))) {
        const res = storage.redeemInviteToken(token, emailHint);
        if (res.success && res.session) {
          setAuthSession(res.session);
          setEffectiveRole(res.session.user.role);
          showToast(res.message);
          window.history.replaceState(null, '', window.location.pathname);
        } else if (token) {
          showToast(res.message);
        }
      }
    };

    handleUrlAuth();
    window.addEventListener('hashchange', handleUrlAuth);
    return () => {
      window.removeEventListener('hashchange', handleUrlAuth);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const checkPermission = (action: string, description: string): boolean => {
    if (effectiveRole === 'Viewer') {
      showToast(`Viewer Access: Read-only mode prevents ${description.toLowerCase()}.`);
      return false;
    }
    if (effectiveRole === 'Collaborator') {
      if (['delete_router', 'toggle_gateway', 'update_credentials', 'delete_member', 'toggle_freemode'].includes(action)) {
        showToast(`Collaborator Access: Administrative rights required to ${description.toLowerCase()}.`);
        return false;
      }
    }
    return true;
  };

  // Router Handlers
  const handleAdoptRouter = (routerId: string) => {
    if (!checkPermission('adopt_router', 'Adopting router')) return;
    storage.adoptRouter(routerId);
    showToast('Router adopted successfully! WireGuard tunnel online.');
    if (isSupabaseConnected) {
      supabaseService.syncRoutersToSupabase(storage.getState().routers);
    }
  };

  const handleAddRouter = (routerData: any) => {
    if (!checkPermission('add_router', 'Adding new router node')) return;
    const created = storage.addRouter(routerData);
    showToast(`Added ${created.name}. One-liner script ready for terminal import.`);
    if (isSupabaseConnected) {
      supabaseService.syncRoutersToSupabase(storage.getState().routers);
    }
    return created;
  };

  const handleDeleteRouter = (routerId: string) => {
    if (!checkPermission('delete_router', 'Revoking router and tunnel keys')) return;
    storage.deleteRouter(routerId);
    showToast('Router removed and tunnel keys revoked.');
    if (isSupabaseConnected) {
      supabaseService.deleteRouterFromSupabase(routerId);
      supabaseService.syncRoutersToSupabase(storage.getState().routers);
    }
  };

  const handleToggleRouterFreeMode = (routerId: string | 'all', enabled: boolean) => {
    if (!checkPermission('toggle_freemode', 'Toggling fleet free mode')) return;
    storage.toggleRouterFreeMode(routerId, enabled);
    showToast(
      routerId === 'all'
        ? `Global fleet Free Mode ${enabled ? 'ACTIVATED (All routers free)' : 'DEACTIVATED'}.`
        : `Router Free Mode ${enabled ? 'ACTIVATED' : 'DEACTIVATED'}.`
    );
    if (isSupabaseConnected) {
      supabaseService.syncRoutersToSupabase(storage.getState().routers);
    }
  };

  // Plan & Voucher Handlers
  const handleCreatePlan = (planData: any) => {
    if (!checkPermission('create_plan', 'Saving new pricing plan')) return;
    const created = storage.createPlan(planData);
    showToast('New hotspot plan saved with exact speed & device quotas.');
    if (isSupabaseConnected && created) {
      supabaseService.syncPlanToSupabase(created);
    }
  };

  const handleGenerateBatch = (planId: string, count: number): Voucher[] => {
    if (!checkPermission('generate_vouchers', 'Generating voucher batches')) return [];
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
    if (!checkPermission('toggle_gateway', 'Toggling gateway live production mode')) {
      return { success: false, message: 'Administrative permission required' };
    }
    const res = storage.toggleGatewayLive(provider, setLive);
    if (res.success) {
      showToast(`Gateway status changed to ${setLive ? 'LIVE' : 'SANDBOX'}.`);
    } else {
      showToast(`Error: ${res.message}`);
    }
    return res;
  };

  const handleUpdateGatewayCredentials = (provider: GatewayProvider, updates: any) => {
    if (!checkPermission('update_credentials', 'Modifying merchant gateway credentials')) return;
    storage.updateGatewayCredentials(provider, updates);
    showToast('Gateway merchant credentials updated.');
  };

  const handleProcessLivePayment = (provider: GatewayProvider, planId: string, phone?: string, ottPin?: string, planOverride?: any) => {
    const res = storage.processLivePayment(provider, planId, phone, ottPin, planOverride);
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
    if (!checkPermission('invite_member', 'Inviting team members')) return null;
    const member = storage.inviteTeamMember(name, email, role, scopedSites);
    showToast(`Single-use invitation generated for ${email}. Instant access link active.`);
    return member;
  };

  const handleUpdateMemberRole = (memberId: string, role: any, scopedSites?: string[]) => {
    const isAdminOrOwner = 
      authSession?.user?.email.toLowerCase() === 'rphooko@tconnect.africa' || 
      effectiveRole === 'Owner' || 
      effectiveRole === 'Admin';
    if (!isAdminOrOwner && !checkPermission('update_role', 'Updating member roles')) return;

    storage.updateMemberRole(memberId, role, scopedSites);
    const updated = storage.getState().team.find((m) => m.id === memberId);
    showToast(`Upgraded role to ${role} for ${updated?.name || 'team member'} (Effective immediately).`);

    // Sync active session if the current user was updated
    const currentSession = storage.getAuthSession();
    if (currentSession && (currentSession.user.id === memberId || currentSession.user.email.toLowerCase() === updated?.email.toLowerCase())) {
      setAuthSession({ ...currentSession });
      setEffectiveRole(currentSession.effectiveRole);
    }
  };

  const handleDeleteMember = (memberId: string) => {
    if (!checkPermission('delete_member', 'Revoking member credentials')) return;
    storage.deleteTeamMember(memberId);
    showToast('Team member access revoked.');
  };

  const handleIssuePassword = (memberId: string, customPass?: string) => {
    if (!checkPermission('issue_password', 'Issuing temporary password')) return;
    const res = storage.issueTemporaryPassword(memberId, customPass);
    if (res.success) {
      showToast(res.message);
    }
  };

  const handleToggleFilter = (ruleId: string, enabled: boolean) => {
    storage.toggleContentFilter(ruleId, enabled);
    showToast(`DNS Content filter category updated.`);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    storage.acknowledgeAlert(alertId);
    showToast('Anomaly alert dismissed.');
  };

  // Voucher Stock Sentinel & Background Check Handlers
  const handleUpdateVoucherThreshold = (threshold: number) => {
    storage.setVoucherLowThreshold(threshold);
    setVoucherThreshold(threshold);
    const check = storage.checkVoucherStock(threshold);
    showToast(`Voucher warning threshold updated to ${threshold} vouchers.`);
  };

  const handleTriggerVoucherCheck = () => {
    const res = storage.checkVoucherStock();
    if (res.isLow) {
      showToast(`⚠️ Low Voucher Balance: ${res.unusedCount} unused vouchers left (Threshold: ${res.threshold}).`);
    } else {
      showToast(`✅ Voucher Stock Healthy: ${res.unusedCount} unused vouchers available (Threshold: ${res.threshold}).`);
    }
  };

  const handleQuickRestock = (count = 5) => {
    const defaultPlan = state.plans[0];
    if (!defaultPlan) {
      showToast('Please configure a hotspot plan in Billing first.');
      return;
    }
    const generated = storage.generateVoucherBatch(defaultPlan.id, count);
    showToast(`Replenished voucher pool with ${count} new vouchers for ${defaultPlan.name}.`);
    if (isSupabaseConnected) {
      generated.forEach((v) => supabaseService.syncVoucherToSupabase(v));
    }
  };

  const onlineRouters = state.routers.filter(r => r.status === 'online').length;
  const totalRevenue = state.transactions
    .filter(t => t.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const activeSessions = state.routers.reduce((acc, curr) => acc + curr.activeSessions, 0);
  const unusedVoucherCount = state.vouchers.filter(v => v.status === 'active').length;

  // Enforce full-screen authentication gate before dashboard entry
  if (!authSession) {
    return (
      <LoginView
        onLoginSuccess={(session) => {
          setAuthSession(session);
          setEffectiveRole(session.effectiveRole);
          showToast(`Welcome back, ${session.user.name}! Authenticated as ${session.user.role}.`);
        }}
        teamMembers={state.team}
      />
    );
  }

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
          onNavigateTab={setCurrentTab}
          unusedVoucherCount={unusedVoucherCount}
          voucherThreshold={voucherThreshold}
          onUpdateVoucherThreshold={handleUpdateVoucherThreshold}
          onTriggerBackgroundCheck={handleTriggerVoucherCheck}
          onQuickRestock={handleQuickRestock}
          currentUser={authSession.user}
          effectiveRole={effectiveRole}
          onRolePreviewChange={(role) => {
            setEffectiveRole(role);
            showToast(`Switched active preview role to: ${role}`);
          }}
          onSignOut={() => {
            storage.setAuthSession(null);
            setAuthSession(null);
            showToast('Signed out of session.');
          }}
          teamMembersCount={state.team.length}
          pendingResetCount={state.team.filter((m) => m.hasPendingReset).length}
          onOpenInviteTeammates={() => setIsGlobalInviteModalOpen(true)}
        />

        {/* Role Preview Active Banner */}
        {effectiveRole !== authSession.user.role && (
          <div className="bg-[#f05e17]/10 border-b border-[#f05e17]/30 px-5 py-2 flex items-center justify-between font-mono text-xs text-white">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#f05e17] shrink-0" />
              <span>
                <strong>Role Preview Active:</strong> Inspecting interface as <strong className="text-[#f05e17]">{effectiveRole}</strong>.
              </span>
            </div>
            <button
              onClick={() => {
                setEffectiveRole(authSession.user.role);
                showToast(`Restored role to ${authSession.user.role}.`);
              }}
              className="text-[11px] underline text-[#f05e17] hover:text-white"
            >
              Revert to {authSession.user.role}
            </button>
          </div>
        )}

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
              voucherThreshold={voucherThreshold}
              onUpdateVoucherThreshold={handleUpdateVoucherThreshold}
              onTriggerVoucherCheck={handleTriggerVoucherCheck}
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
              onToggleRouterFreeMode={handleToggleRouterFreeMode}
              onIssuePassword={handleIssuePassword}
              currentUser={authSession.user}
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

      {/* Global Teammate Invitation Modal (Accessible from Header Dropdown) */}
      {isGlobalInviteModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserPlus className="w-4 h-4 text-[#f05e17]" />
                <span>Invite Teammate to T-Connect</span>
              </div>
              <button 
                onClick={() => setIsGlobalInviteModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!globalInviteName.trim() || !globalInviteEmail.trim()) return;

                const name = globalInviteName.trim();
                const email = globalInviteEmail.trim();
                const member = handleInviteMember(name, email, globalInviteRole, globalInviteSites);
                
                if (member) {
                  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.tconnect.co.ls';
                  const inviteUrl = `${origin}/#invite?token=${member.inviteToken || member.id}&email=${encodeURIComponent(member.email)}&role=${encodeURIComponent(member.role)}`;
                  setRecentlyInvitedTeammate({ member, inviteUrl });
                  simulateInviteEmail(member.email, member.name, member.role, inviteUrl).catch(() => {});
                }

                setIsGlobalInviteModalOpen(false);
                setGlobalInviteName('');
                setGlobalInviteEmail('');
                setGlobalInviteSites([]);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-slate-300 font-bold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={globalInviteName}
                  onChange={(e) => setGlobalInviteName(e.target.value)}
                  placeholder="e.g. Lineo Letsie"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Teammate Email Address</label>
                <input
                  type="email"
                  required
                  value={globalInviteEmail}
                  onChange={(e) => setGlobalInviteEmail(e.target.value)}
                  placeholder="colleague@domain.ls"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  A single-use instant authentication token will be linked to this email.
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Role Assignment</label>
                <select
                  value={globalInviteRole}
                  onChange={(e) => setGlobalInviteRole(e.target.value as TeamMember['role'])}
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17] cursor-pointer"
                >
                  <option value="Admin">Admin (Full Site Configuration &amp; Billing)</option>
                  <option value="Technical">Technical (MikroTik Router &amp; WireGuard Only)</option>
                  <option value="Collaborator">Collaborator (Voucher Generation Only)</option>
                  <option value="Viewer">Viewer (Read-Only Dashboard)</option>
                  <option value="Owner">Owner (Super Admin Controller Authority)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Location Scoping (Leave unchecked for All)</label>
                <div className="space-y-1 max-h-28 overflow-y-auto p-2 bg-[#161d31] rounded-lg border border-[#232d42]">
                  {Array.from(new Set(state.routers.map(r => r.siteName))).map((site) => (
                    <label key={site} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={globalInviteSites.includes(site)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGlobalInviteSites([...globalInviteSites, site]);
                          } else {
                            setGlobalInviteSites(globalInviteSites.filter(s => s !== site));
                          }
                        }}
                        className="rounded accent-[#f05e17] w-3 h-3"
                      />
                      <span>{site}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-[#121829] border border-[#1f283d] rounded-lg text-[11px] text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#f05e17] shrink-0" />
                <span>
                  Teammate will be automatically authenticated into the controller upon opening the email link.
                </span>
              </div>

              <div className="pt-3 border-t border-[#232d42] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGlobalInviteModalOpen(false)}
                  className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Generate Instant Access Invite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recently Invited Teammate Success Modal */}
      {recentlyInvitedTeammate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Teammate Invited: Instant Authentication Ready</span>
              </div>
              <button 
                onClick={() => setRecentlyInvitedTeammate(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Member Card */}
            <div className="p-3 bg-[#161d31] rounded-xl border border-[#232d42] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-sm">{recentlyInvitedTeammate.member.name}</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {recentlyInvitedTeammate.member.role}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">{recentlyInvitedTeammate.member.email}</div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-[#1f283d] flex items-center justify-between">
                <span>Scope: {recentlyInvitedTeammate.member.scopedSites.length ? recentlyInvitedTeammate.member.scopedSites.join(', ') : 'All Locations'}</span>
                <span className="text-emerald-400 font-bold">Single-Use Token Active</span>
              </div>
            </div>

            {/* Magic Link Box */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block flex items-center justify-between">
                <span>Instant Authentication Magic Link</span>
                <span className="text-[10px] text-emerald-400 font-normal">No password required</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={recentlyInvitedTeammate.inviteUrl}
                  className="flex-1 px-3 py-2 bg-[#090d16] border border-[#232d42] rounded-lg text-slate-200 font-mono text-xs select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(recentlyInvitedTeammate.inviteUrl);
                    setCopiedGlobalInviteUrl(true);
                    setTimeout(() => setCopiedGlobalInviteUrl(false), 2000);
                  }}
                  className="px-3 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedGlobalInviteUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedGlobalInviteUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Email Dispatch Action */}
            <div className="p-3 bg-[#121829] rounded-xl border border-[#1f283d] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-white text-xs">Dispatch Email to Teammate</div>
                <div className="text-[10px] text-slate-400 truncate">
                  Opens default email client with invitation link from Raphooko Phooko
                </div>
              </div>
              <a
                href={`mailto:${recentlyInvitedTeammate.member.email}?subject=Invitation%20to%20join%20T-Connect%20Controller%20as%20${recentlyInvitedTeammate.member.role}&body=Hi%20${encodeURIComponent(recentlyInvitedTeammate.member.name)},%0A%0AYou%20have%20been%20invited%20by%20Administrator%20Raphooko%20Phooko%20to%20join%20the%20T-Connect%20Cloud%20Controller%20as%20${recentlyInvitedTeammate.member.role}.%0A%0AClick%20this%20instant%20access%20link%20to%20sign%20in%20immediately:%0A${encodeURIComponent(recentlyInvitedTeammate.inviteUrl)}%0A%0AWelcome%20aboard!%0ARaphooko%20Phooko`}
                className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200 hover:text-white rounded-lg font-bold flex items-center gap-1.5 shrink-0"
              >
                <Mail className="w-3.5 h-3.5 text-[#f05e17]" />
                <span>Open Email</span>
              </a>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-[#232d42] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  window.location.hash = recentlyInvitedTeammate.inviteUrl.split('#')[1] || '';
                  setRecentlyInvitedTeammate(null);
                }}
                className="text-[11px] text-[#f05e17] hover:underline flex items-center gap-1"
              >
                <span>Simulate Instant Login as this Teammate &rarr;</span>
              </button>
              <button
                type="button"
                onClick={() => setRecentlyInvitedTeammate(null)}
                className="px-4 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-white font-bold rounded-lg cursor-pointer"
              >
                Done
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
