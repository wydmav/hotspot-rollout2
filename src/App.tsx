/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { storage } from './services/storage';
import { supabaseService } from './services/supabase';
import { VerticalType, GatewayProvider, AuthSession, TeamMember, Voucher, RouterDevice, RouterAccessMode, DepartmentName, PermissionTabId } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { AdoptionView } from './components/views/AdoptionView';
import { BillingView } from './components/views/BillingView';
import { NetworkSecurityView } from './components/views/NetworkSecurityView';
import { DatabaseModal } from './components/common/DatabaseModal';
import { LoginView } from './components/auth/LoginView';
import { StandalonePortalView } from './components/portal/StandalonePortalView';
import { TabPermissionsSelector } from './components/common/TabPermissionsSelector';
import { TConnectLogo } from './components/common/TConnectLogo';
import { Fingerprint, CheckCircle2, Eye, UserPlus, Copy, Check, PanelLeftOpen } from 'lucide-react';
import { browserNotificationService } from './services/browserNotifications';
import { copyToClipboard } from './utils/clipboard';
import { onSessionExpired } from './services/authToken';
import {
  canAccessSidebarTab,
  getFirstAllowedSidebarTab,
  isTrueSuperAdminAccount,
  SESSION_IDLE_TIMEOUT_MS,
  TOWER_DOMAIN,
  PERMISSION_TABS,
  getTabLabel
} from './utils/permissions';

export default function App() {
  const [state, setState] = useState(() => storage.getState());
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => storage.getAuthSession());
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);
  const [sessionExpiredReason, setSessionExpiredReason] = useState<string | null>(null);
  const [requestedNetworkSubTab, setRequestedNetworkSubTab] = useState<'portal' | 'terminal' | 'roaming' | 'bandwidth' | 'sessions' | 'leads' | 'team' | 'security' | null>(null);
  const [isUserTestingPortal, setIsUserTestingPortal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname.startsWith('/portal') ||
             window.location.hash === '#portal' ||
             new URLSearchParams(window.location.search).get('view') === 'portal' ||
             new URLSearchParams(window.location.search).get('mode') === 'portal';
    }
    return false;
  });
  const [effectiveRole, setEffectiveRole] = useState<TeamMember['role']>(() => {
    const s = storage.getAuthSession();
    if (!s) return 'Super Admin';
    if (s.effectiveRole === 'Viewer') return 'Management';
    return s.effectiveRole || s.user?.role || 'Super Admin';
  });
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedVertical, setSelectedVertical] = useState<VerticalType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [biometricActive, setBiometricActive] = useState(true);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => {
    return supabaseService.getConfig().isConnected;
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [voucherThreshold, setVoucherThreshold] = useState<number>(() => storage.getVoucherLowThreshold());
  const [adminTheme, setAdminTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const saved = window.localStorage.getItem('tc_admin_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const handleToggleTheme = () => {
    setAdminTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        try {
          window.localStorage.setItem('tc_admin_theme', next);
        } catch {}
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Never apply admin light theme when rendering the subscriber captive portal
      document.body.setAttribute('data-admin-theme', isUserTestingPortal ? 'dark' : adminTheme);
    }
  }, [adminTheme, isUserTestingPortal]);

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Invite Modal State (Super Admin Exclusive — Department + Custom Tab Checkboxes)
  const [isGlobalInviteModalOpen, setIsGlobalInviteModalOpen] = useState(false);
  const [globalInviteName, setGlobalInviteName] = useState('');
  const [globalInviteDepartment, setGlobalInviteDepartment] = useState<DepartmentName>('Finance');
  const [globalInviteAllowedTabs, setGlobalInviteAllowedTabs] = useState<PermissionTabId[]>(['dashboard', 'billing']);
  const [isCreatingGlobalInvite, setIsCreatingGlobalInvite] = useState(false);
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

  // Restore active 2-hour server session cookie on browser reload (standard website auth behavior)
  useEffect(() => {
    let cancelled = false;
    const hasInviteOrResetHash =
      typeof window !== 'undefined' &&
      (window.location.hash.startsWith('#invite') ||
        window.location.hash.startsWith('#reset') ||
        window.location.hash.includes('token='));

    if (hasInviteOrResetHash) {
      // Allow invite / password reset links to open the interactive self-setup screen directly
      setAuthSession(null);
      setIsRestoringSession(false);
      return;
    }

    (async () => {
      const restored = await storage.restoreSessionFromServer();
      if (cancelled) return;
      if (restored) {
        setAuthSession(restored);
        setEffectiveRole(restored.effectiveRole);
        if (isTrueSuperAdminAccount(restored.user)) {
          void storage.syncTeamWithServer();
        }
        void supabaseService.hydrateConfigFromServer();
      } else {
        setAuthSession(null);
      }
      setIsRestoringSession(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for server 401 session expiration events (e.g., after 2h inactivity or Super Admin revoke)
  useEffect(() => {
    const unsub = onSessionExpired((reason) => {
      storage.setAuthSession(null);
      setAuthSession(null);
      setSessionExpiredReason(
        reason || 'Your session expired after 2 hours of inactivity. Please sign in again.'
      );
    });
    return unsub;
  }, []);

  // Client-side 2-hour sliding inactivity auto-logout watchdog
  useEffect(() => {
    if (!authSession) return;
    let lastActivity = Date.now();
    const idleLimitMs = authSession.idleTimeoutMs || SESSION_IDLE_TIMEOUT_MS;

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 5000) {
        lastActivity = now;
      }
    };

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'mousemove'];
    events.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));

    const timer = window.setInterval(() => {
      if (Date.now() - lastActivity >= idleLimitMs) {
        void storage.logout();
        setAuthSession(null);
        setSessionExpiredReason(
          'You were automatically signed out after 2 hours of inactivity. Please sign in again.'
        );
      }
    }, 30000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, recordActivity));
      window.clearInterval(timer);
    };
  }, [authSession]);

  // If user opens an #invite or #reset link while signed in, hand off cleanly to LoginView
  useEffect(() => {
    const handleInviteHash = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash || '';
      if (hash.startsWith('#invite') || hash.startsWith('#reset')) {
        setAuthSession(null);
      }
    };
    window.addEventListener('hashchange', handleInviteHash);
    return () => window.removeEventListener('hashchange', handleInviteHash);
  }, []);

  // Listen for portal mode URL transitions (#portal or ?view=portal)
  useEffect(() => {
    const handleLocationChange = () => {
      if (typeof window !== 'undefined') {
        if (
          window.location.pathname.startsWith('/portal') ||
          window.location.hash === '#portal' ||
          new URLSearchParams(window.location.search).get('view') === 'portal' ||
          new URLSearchParams(window.location.search).get('mode') === 'portal'
        ) {
          setIsUserTestingPortal(true);
        }
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Per-Member Tab Permission Navigation Guard
  useEffect(() => {
    if (!authSession) return;
    const validTab = currentTab as 'dashboard' | 'fleet' | 'billing' | 'network';
    if (!canAccessSidebarTab(authSession.user, validTab, effectiveRole)) {
      const firstAllowed = getFirstAllowedSidebarTab(authSession.user, effectiveRole);
      if (firstAllowed !== currentTab) {
        setCurrentTab(firstAllowed);
      }
    }
  }, [authSession, effectiveRole, currentTab]);

  // -----------------------------------------------------------------------------
  // DEADMAN WATCHDOG SENTINEL (Jitter-Resilient Status Verification)
  // -----------------------------------------------------------------------------
  // MikroTik routers transmit heartbeats every 15 seconds.
  // A router is marked as 'offline' after detecting > 30 seconds of
  // missed heartbeats (2 consecutive missed 15s cycles).
  const DEADMAN_OFFLINE_THRESHOLD_SECONDS = 30;
  const HEARTBEAT_CYCLE_SECONDS = 15;

  // Track verified status & alert debouncing across poll cycles to prevent flapping
  const watchdogTrackerRef = useRef<Map<string, {
    consecutiveMisses: number;
    lastVerifiedOnlineTimestamp: number;
    lastNotifiedStatus: 'online' | 'offline' | 'pending_adoption';
    firstMissDetectedAt: number | null;
  }>>(new Map());

  useEffect(() => {
    // Sync current router inventory with server-side sentinel map (including when 0 routers remain)
    fetch('/api/devices/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routers: state.routers || [], replaceAll: true })
    }).catch(() => {});

    const pollWatchdog = async () => {
      try {
        const res = await fetch('/api/devices/watchdog/status');
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (!data.routers || !Array.isArray(data.routers)) return;

        // Ensure any routers persisted on the server are hydrated into client storage
        storage.mergeRoutersFromServer(data.routers);

        const currentRouters = storage.getState().routers;
        const now = Date.now();
        const verifiedStatuses: Array<{
          id: string;
          status: 'online' | 'offline' | 'pending_adoption';
          lastHeartbeat?: string;
          lastHeartbeatTimestamp?: number;
          missedHeartbeats?: number;
          offlineSince?: string;
          offlineReason?: string;
        }> = [];

        data.routers.forEach((incoming: any) => {
          const prev = currentRouters.find(r => r.id === incoming.id);
          if (!prev && !incoming.id) return;

          // Auto-promote router from pending_adoption to online when incoming status is confirmed online
          if (prev?.status === 'pending_adoption' && incoming.status === 'online') {
            storage.adoptRouter(incoming.id);
            showToast(`Router "${prev.name}" adopted successfully! Live handshake acknowledged.`);
            return;
          }

          // Preserve unadopted nodes without tripping deadman alarms
          if (incoming.status === 'pending_adoption') {
            verifiedStatuses.push({
              id: incoming.id,
              status: 'pending_adoption',
              lastHeartbeat: incoming.lastHeartbeat || prev?.lastHeartbeat || 'Pending Adoption',
              missedHeartbeats: 0
            });
            return;
          }

          // Retrieve or initialize tracking state for this router
          let tracker = watchdogTrackerRef.current.get(incoming.id);
          if (!tracker) {
            tracker = {
              consecutiveMisses: 0,
              lastVerifiedOnlineTimestamp: now,
              lastNotifiedStatus: incoming.status === 'online' ? 'online' : 'offline',
              firstMissDetectedAt: null
            };
            watchdogTrackerRef.current.set(incoming.id, tracker);
          }

          const secondsSilent = typeof incoming.elapsedSecondsWithoutHeartbeat === 'number'
            ? incoming.elapsedSecondsWithoutHeartbeat
            : typeof incoming.secondsSinceHeartbeat === 'number'
              ? incoming.secondsSinceHeartbeat
              : incoming.status === 'online'
                ? 0
                : -1;

          const isConfirmedOffline =
            incoming.status === 'offline' ||
            (incoming.status !== 'pending_adoption' && secondsSilent > DEADMAN_OFFLINE_THRESHOLD_SECONDS);

          if (isConfirmedOffline) {
            // Heartbeat threshold breached (> 30 seconds of silence / 2 missed 15s beats)
            tracker.consecutiveMisses += 1;
            if (!tracker.firstMissDetectedAt) {
              tracker.firstMissDetectedAt = now - (Math.min(Math.max(30, secondsSilent), 35) * 1000);
            }

            const missedBeats = Math.max(
              incoming.missedBeats || 0,
              secondsSilent > 0 ? Math.floor(secondsSilent / HEARTBEAT_CYCLE_SECONDS) : 0,
              2
            );
            const formatDurationAgo = (secs: number): string => {
              if (!Number.isFinite(secs) || secs <= 0) return incoming.lastHeartbeat || 'Offline (unplugged / no heartbeat)';
              if (secs < 60) return `Offline (${secs}s ago)`;
              if (secs < 3600) return `Offline (${Math.floor(secs / 60)}m ${secs % 60}s ago)`;
              if (secs < 86400) {
                const h = Math.floor(secs / 3600);
                const m = Math.floor((secs % 3600) / 60);
                return `Offline (${h}h ${m}m ago)`;
              }
              const d = Math.floor(secs / 86400);
              const h = Math.floor((secs % 86400) / 3600);
              return `Offline (${d}d ${h}h ago)`;
            };
            const elapsedOfflineLabel =
              secondsSilent > 0 && secondsSilent !== 999
                ? formatDurationAgo(secondsSilent)
                : (incoming.lastHeartbeat && !String(incoming.lastHeartbeat).includes('16m 39s')
                    ? incoming.lastHeartbeat
                    : 'Offline (unplugged / awaiting heartbeat)');
            const offlineReason = incoming.offlineReason || 
              (secondsSilent > 0
                ? `Deadman Watchdog: Unplugged / No heartbeat for ${secondsSilent}s (> 30s threshold, ${missedBeats} missed beats)`
                : `Deadman Watchdog: Unplugged / No heartbeat received`);

            // Trigger notification ONLY upon confirmed transition to avoid duplicate alerts
            if (tracker.lastNotifiedStatus !== 'offline') {
              tracker.lastNotifiedStatus = 'offline';
              browserNotificationService.notifyRouterOffline({
                id: incoming.id,
                name: incoming.name || prev?.name || 'MikroTik Router',
                siteName: incoming.siteName || prev?.siteName || 'Hotspot Site',
                secondsWithoutHeartbeat: Math.max(30, secondsSilent)
              });
            }

            verifiedStatuses.push({
              id: incoming.id,
              status: 'offline',
              lastHeartbeat: elapsedOfflineLabel,
              lastHeartbeatTimestamp: incoming.lastHeartbeatTimestamp || prev?.lastHeartbeatTimestamp || 0,
              missedHeartbeats: missedBeats,
              offlineSince: incoming.offlineSince || prev?.offlineSince || new Date(tracker.firstMissDetectedAt || (now - 30000)).toISOString(),
              offlineReason
            });
          } else {
            // Router has sent a real heartbeat within the last 30 seconds
            const wasPreviouslyOffline = tracker.lastNotifiedStatus === 'offline' || prev?.status === 'offline';

            tracker.lastVerifiedOnlineTimestamp = incoming.lastHeartbeatTimestamp || now;
            tracker.consecutiveMisses = 0;
            tracker.firstMissDetectedAt = null;

            // Trigger recovery notification if restoring from a confirmed offline state
            if (wasPreviouslyOffline) {
              tracker.lastNotifiedStatus = 'online';
              browserNotificationService.notifyRouterOnline({
                id: incoming.id,
                name: incoming.name || prev?.name || 'MikroTik Router',
                siteName: incoming.siteName || prev?.siteName || 'Hotspot Site'
              });
            } else {
              tracker.lastNotifiedStatus = 'online';
            }

            verifiedStatuses.push({
              id: incoming.id,
              status: 'online',
              lastHeartbeat: incoming.lastHeartbeat && !String(incoming.lastHeartbeat).startsWith('Offline') ? incoming.lastHeartbeat : 'Just now',
              lastHeartbeatTimestamp: incoming.lastHeartbeatTimestamp || now,
              missedHeartbeats: incoming.missedBeats || 0,
              offlineSince: undefined,
              offlineReason: undefined
            });
          }
        });

        // Atomically sync the verified, jitter-filtered statuses to reactive storage
        if (verifiedStatuses.length > 0) {
          storage.syncRoutersWithWatchdog(verifiedStatuses);
        }
      } catch (err) {
        // Network fetch exception in browser (e.g. temporary WiFi hiccup on admin dashboard).
        // Gracefully ignore single failed fetch to prevent false-alarm state churn.
      }
    };

    pollWatchdog();
    const interval = setInterval(pollWatchdog, 5000);
    return () => clearInterval(interval);
  }, [state.routers.length]);

  // Live Captive Portal Guest & Payment Synchronization (Syncs leads, active sessions, and OTT/EcoCash transactions from any Wi-Fi client device to Admin Dashboard)
  useEffect(() => {
    storage.syncGatewaysAndVouchersWithServer();

    const pollGuestPortalEvents = async () => {
      try {
        const res = await fetch('/api/portal/guest-connect');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success) {
          storage.ingestServerGuestEvents(data.events || [], data.transactions || [], data.cleanSlateAt || null);
        }
      } catch {}
    };

    pollGuestPortalEvents();
    const guestInterval = setInterval(pollGuestPortalEvents, 4000);
    return () => clearInterval(guestInterval);
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
    void fetch(`/api/devices/${routerId}/force-adopt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {});
    void fetch('/api/devices/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routers: storage.getState().routers })
    }).catch(() => {});
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

  const handleDeleteRouter = async (routerId: string) => {
    if (!checkPermission('delete_router', 'Revoking router and tunnel keys')) return;
    storage.deleteRouter(routerId);
    try {
      await fetch(`/api/devices/${routerId}`, { method: 'DELETE' });
      await fetch('/api/devices/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routers: storage.getState().routers, replaceAll: true })
      });
    } catch {}
    showToast('Router unlinked from platform and tunnel keys revoked. Device can now be re-adopted freely.');
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

  const handleSetRouterAccessPolicy = async (
    routerId: string | 'all',
    policy: {
      accessMode: RouterAccessMode;
      freeDurationMinutes?: number;
      freeRateLimit?: string;
      freeDailyQuotaMb?: number;
    }
  ) => {
    if (!checkPermission('toggle_freemode', 'Configuring router access policy')) return;
    storage.setRouterAccessPolicy(routerId, policy);

    try {
      if (routerId === 'all') {
        const res = await fetch('/api/devices/fleet/access-policy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policy)
        });
        const data = await res.json();
        showToast(`Fleet policy '${policy.accessMode}' pushed to ${data.updatedCount || 'all'} routers over WireGuard.`);
      } else {
        const res = await fetch(`/api/devices/${routerId}/access-policy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policy)
        });
        const data = await res.json();
        showToast(`Policy '${policy.accessMode}' dispatched to router. ${data.commandCount || 0} CLI commands queued.`);
      }
    } catch (err: any) {
      console.warn('[Policy Push] Controller API communication:', err.message);
      showToast(`Policy saved locally as '${policy.accessMode}'.`);
    }

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

  // Render full-screen Guest Captive Portal Splash Page when visiting /portal, #portal, or ?view=portal
  if (isUserTestingPortal) {
    return (
      <StandalonePortalView
        routerGatewayIp="10.10.0.1"
        isAdminLoggedIn={Boolean(authSession)}
        onBackToDashboard={() => {
          setIsUserTestingPortal(false);
          if (typeof window !== 'undefined') {
            window.history.pushState(null, '', '/');
          }
        }}
      />
    );
  }

  // Brief loading veil while checking HttpOnly session cookie on browser refresh
  if (isRestoringSession) {
    return (
      <div
        data-admin-theme={adminTheme}
        className="min-h-screen bg-[#080b14] text-slate-100 flex flex-col items-center justify-center gap-3 font-mono text-xs"
      >
        <TConnectLogo withBackground className="w-12 h-12" />
        <span className="text-slate-400">Restoring T-Connect session...</span>
      </div>
    );
  }

  // Enforce full-screen authentication gate before dashboard entry
  if (!authSession) {
    return (
      <LoginView
        onLoginSuccess={(session) => {
          setAuthSession(session);
          setEffectiveRole(session.effectiveRole);
          setSessionExpiredReason(null);
          const firstTab = getFirstAllowedSidebarTab(session.user, session.effectiveRole);
          setCurrentTab(firstTab);
          if (isTrueSuperAdminAccount(session.user)) {
            void storage.syncTeamWithServer();
          }
          void supabaseService.hydrateConfigFromServer();
          showToast(`Welcome, ${session.user.name}. Signed in to ${session.user.department || session.user.role}.`);
        }}
        teamMembers={state.team}
        adminTheme={adminTheme}
        onToggleTheme={handleToggleTheme}
        sessionExpiredReason={sessionExpiredReason}
        onClearExpiredReason={() => setSessionExpiredReason(null)}
      />
    );
  }

  return (
    <div
      data-admin-theme={adminTheme}
      className="flex h-screen bg-[#080b14] text-slate-100 overflow-hidden font-sans relative"
    >
      {/* Streamlined 4-Section Sidebar Navigation (Filtered by Member Permissions) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        selectedVertical={selectedVertical}
        onVerticalChange={setSelectedVertical}
        onlineRouterCount={onlineRouters}
        totalRouterCount={state.routers.length}
        isSupabaseConnected={isSupabaseConnected}
        onOpenDatabaseModal={() => setShowDatabaseModal(true)}
        currentUser={authSession.user}
        effectiveRole={effectiveRole}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Floating Re-open Navigation Button (Icon-only when sidebar is closed) */}
      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="fixed bottom-5 left-5 z-40 p-2.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white rounded-xl shadow-2xl flex items-center justify-center border border-white/20 transition-all cursor-pointer animate-in fade-in duration-150"
          title="Open navigation"
          aria-label="Open navigation"
        >
          <PanelLeftOpen className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#080b14] overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          alerts={state.alerts}
          onAcknowledgeAlert={handleAcknowledgeAlert}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
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
          onOpenTeamDashboard={() => {
            if (isTrueSuperAdminAccount(authSession.user)) {
              setRequestedNetworkSubTab('team');
              setCurrentTab('network');
            }
          }}
          unusedVoucherCount={unusedVoucherCount}
          voucherThreshold={voucherThreshold}
          onUpdateVoucherThreshold={handleUpdateVoucherThreshold}
          onTriggerBackgroundCheck={handleTriggerVoucherCheck}
          onQuickRestock={handleQuickRestock}
          currentUser={authSession.user}
          effectiveRole={effectiveRole}
          onRolePreviewChange={(role) => {
            storage.switchRole(role);
            setEffectiveRole(role);
            if (role === 'Collaborator') {
              setCurrentTab('network');
            } else if (role === 'Finance') {
              setCurrentTab('billing');
            } else if (role === 'Tech') {
              setCurrentTab('fleet');
            } else if (role === 'Management') {
              setCurrentTab('dashboard');
            }
            showToast(`Previewing interface as: ${role}`);
          }}
          onSignOut={() => {
            void storage.logout();
            setAuthSession(null);
            setSessionExpiredReason(null);
            showToast('Signed out of session.');
          }}
          teamMembersCount={state.team.length}
          pendingResetCount={state.team.filter((m) => m.hasPendingReset).length}
          onOpenInviteTeammates={() => {
            if (isTrueSuperAdminAccount(authSession.user)) {
              setGlobalInviteName('');
              setGlobalInviteDepartment('Finance');
              setGlobalInviteAllowedTabs(['dashboard', 'billing']);
              setIsGlobalInviteModalOpen(true);
            }
          }}
          adminTheme={adminTheme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Role Preview Active Banner / Owner Impersonator */}
        {effectiveRole !== authSession.user.role && (
          <div className="bg-[#f05e17]/15 border-b border-[#f05e17]/40 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-white shadow-md">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-[#f05e17] shrink-0" />
              <span>
                <strong>Owner Role Impersonator:</strong> Viewing interface as{' '}
                <strong className="text-[#f05e17] px-1.5 py-0.5 rounded bg-[#f05e17]/20 border border-[#f05e17]/30">
                  {effectiveRole}
                </strong>
                {authSession.user.role === 'Owner' && (
                  <span className="text-slate-400 ml-2 hidden sm:inline">
                    (Owner can switch into any role at will)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  storage.switchRole(authSession.user.role);
                  setEffectiveRole(authSession.user.role);
                  showToast(`Restored role to ${authSession.user.role}.`);
                }}
                className="text-xs px-2.5 py-1 rounded-md bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold transition-colors cursor-pointer"
              >
                Revert to {authSession.user.role}
              </button>
            </div>
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
              transactions={state.transactions}
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
              onSetRouterAccessPolicy={handleSetRouterAccessPolicy}
              onIssuePassword={handleIssuePassword}
              currentUser={authSession.user}
              effectiveRole={effectiveRole}
              requestedSubTab={requestedNetworkSubTab}
              onConsumeRequestedSubTab={() => setRequestedNetworkSubTab(null)}
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

      {/* Global Teammate Invitation Modal (Super Admin Exclusive — Department + Custom Tab Checkboxes) */}
      {isGlobalInviteModalOpen && isTrueSuperAdminAccount(authSession.user) && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f283d]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserPlus className="w-4 h-4 text-[#f05e17]" />
                <span>Invite Teammate (@{TOWER_DOMAIN})</span>
              </div>
              <button
                type="button"
                onClick={() => setIsGlobalInviteModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!globalInviteName.trim()) return;
                if (globalInviteDepartment !== 'Super Admin' && globalInviteAllowedTabs.length === 0) {
                  showToast('Tick at least one tab for this teammate.');
                  return;
                }
                setIsCreatingGlobalInvite(true);
                const res = await storage.createServerInvite({
                  name: globalInviteName.trim(),
                  department: globalInviteDepartment,
                  allowedTabs:
                    globalInviteDepartment === 'Super Admin'
                      ? PERMISSION_TABS.map((t) => t.id)
                      : globalInviteAllowedTabs
                });
                setIsCreatingGlobalInvite(false);
                if (res.success && res.member && res.inviteUrl) {
                  setRecentlyInvitedTeammate({ member: res.member, inviteUrl: res.inviteUrl });
                  setIsGlobalInviteModalOpen(false);
                  setGlobalInviteName('');
                  showToast(`Single-use @${TOWER_DOMAIN} invite created for ${res.member.name}.`);
                } else {
                  showToast(res.message || 'Unable to generate invite link.');
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 block">Teammate Name</label>
                <input
                  type="text"
                  required
                  value={globalInviteName}
                  onChange={(e) => setGlobalInviteName(e.target.value)}
                  placeholder="e.g. Thabo Mokoena"
                  className="w-full px-3 py-2 bg-[#141b2e] border border-[#26324d] rounded-lg text-white text-xs focus:outline-none focus:border-[#f05e17]"
                />
                <p className="text-[11px] text-slate-400">
                  When they open this link, they will see <span className="font-mono text-[#f05e17]">@{TOWER_DOMAIN}</span> locked in, pick their own handle prefix and private password, and receive only the tabs you tick below.
                </p>
              </div>

              <TabPermissionsSelector
                department={globalInviteDepartment}
                onDepartmentChange={setGlobalInviteDepartment}
                allowedTabs={globalInviteAllowedTabs}
                onAllowedTabsChange={setGlobalInviteAllowedTabs}
              />

              <div className="pt-3 border-t border-[#1f283d] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGlobalInviteModalOpen(false)}
                  className="px-3.5 py-2 bg-[#141b2e] hover:bg-[#1e2944] border border-[#26324d] text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGlobalInvite}
                  className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isCreatingGlobalInvite ? 'Generating Invite...' : 'Generate Single-Use Invite Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recently Invited Teammate Success Modal */}
      {recentlyInvitedTeammate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f283d]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Single-Use Invite Link Ready</span>
              </div>
              <button
                type="button"
                onClick={() => setRecentlyInvitedTeammate(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-[#131a2d] rounded-xl border border-[#232d42] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{recentlyInvitedTeammate.member.name}</span>
                <span className="text-[11px] font-semibold text-[#f05e17]">
                  {recentlyInvitedTeammate.member.department || recentlyInvitedTeammate.member.role}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 pt-1.5 border-t border-[#1f283d]">
                <span className="text-slate-400">Allowed Tabs: </span>
                {(recentlyInvitedTeammate.member.allowedTabs || []).map((t) => getTabLabel(t)).join(' · ')}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-200 font-semibold block">
                Share This Onboarding Link (Valid 7 Days)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={recentlyInvitedTeammate.inviteUrl}
                  className="flex-1 px-3 py-2 bg-[#090d16] border border-[#26324d] rounded-lg text-slate-200 font-mono text-xs select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    void copyToClipboard(recentlyInvitedTeammate.inviteUrl);
                    setCopiedGlobalInviteUrl(true);
                    setTimeout(() => setCopiedGlobalInviteUrl(false), 2000);
                  }}
                  className="px-3 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedGlobalInviteUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedGlobalInviteUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                They will enter their name, choose their <span className="font-mono">@{TOWER_DOMAIN}</span> handle prefix, and set their own private password.
              </p>
            </div>

            <div className="pt-2 border-t border-[#1f283d] flex justify-end">
              <button
                type="button"
                onClick={() => setRecentlyInvitedTeammate(null)}
                className="px-4 py-2 bg-[#141b2e] hover:bg-[#1e2944] border border-[#26324d] text-white font-semibold rounded-lg cursor-pointer"
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
