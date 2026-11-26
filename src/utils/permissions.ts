import type { DepartmentName, PermissionTabId, TeamMember } from '../types';

export const TOWER_DOMAIN = 'tconnect.tower';
export const SUPER_ADMIN_NAME = 'Phelane Phomane';
export const SUPER_ADMIN_USERNAME = 'pphomane';
export const SUPER_ADMIN_EMAIL = `pphomane@${TOWER_DOMAIN}`;
export const SESSION_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours strict inactivity timeout

export interface PermissionTabDefinition {
  id: PermissionTabId;
  label: string;
  shortLabel: string;
  group: 'Core Workspace' | 'Network & Operations';
  sidebarTab: 'dashboard' | 'fleet' | 'billing' | 'network';
  networkSubTab?: 'portal' | 'terminal' | 'roaming' | 'sessions' | 'leads';
  description: string;
}

export const PERMISSION_TABS: PermissionTabDefinition[] = [
  {
    id: 'dashboard',
    label: 'Fleet Overview',
    shortLabel: 'Overview',
    group: 'Core Workspace',
    sidebarTab: 'dashboard',
    description:
      'Live Mobile Revenue totals, daily transaction trends, online router health, Deadman Watchdog status, and active guest counts.'
  },
  {
    id: 'fleet',
    label: 'Routers & Adoption',
    shortLabel: 'Routers',
    group: 'Core Workspace',
    sidebarTab: 'fleet',
    description:
      'Adopt MikroTik routers, generate WireGuard scripts, toggle routers between Paid and Free Mode, and manage venue partner groups.'
  },
  {
    id: 'billing',
    label: 'Billing & Vouchers',
    shortLabel: 'Billing',
    group: 'Core Workspace',
    sidebarTab: 'billing',
    description:
      'Edit plan prices (M10 / M60 / M220), generate and track 16-digit OTT & T-Connect vouchers, view M-Pesa & EcoCash ledgers, and configure payment gateways.'
  },
  {
    id: 'portal',
    label: 'Captive Portal & Ads',
    shortLabel: 'Portal & Ads',
    group: 'Network & Operations',
    sidebarTab: 'network',
    networkSubTab: 'portal',
    description:
      'Customize splash page branding, upload venue images and sponsor videos, edit terms and free-mode copy, and run One-Click Sync Splash.'
  },
  {
    id: 'terminal',
    label: 'Remote Terminal & WireGuard',
    shortLabel: 'Terminal',
    group: 'Network & Operations',
    sidebarTab: 'network',
    networkSubTab: 'terminal',
    description:
      'Run RouterOS CLI commands on single routers or broadcast across the fleet, and inspect live router snapshots.'
  },
  {
    id: 'roaming',
    label: 'Roaming, QoS & Filtering',
    shortLabel: 'QoS & DNS',
    group: 'Network & Operations',
    sidebarTab: 'network',
    networkSubTab: 'roaming',
    description:
      'Configure multi-site roaming profiles, bandwidth speed caps, and DNS content filtering rules.'
  },
  {
    id: 'sessions',
    label: 'Live Session Logs',
    shortLabel: 'Sessions',
    group: 'Network & Operations',
    sidebarTab: 'network',
    networkSubTab: 'sessions',
    description:
      'Inspect active hotspot guest sessions, client MAC/IP addresses, connection attempts, and live data usage.'
  },
  {
    id: 'leads',
    label: 'Guest Leads & Partners',
    shortLabel: 'Leads',
    group: 'Network & Operations',
    sidebarTab: 'network',
    networkSubTab: 'leads',
    description:
      'View captured guest contact lists (names, phone numbers, emails) and export venue lead CSV reports.'
  }
];

export const ALL_PERMISSION_TAB_IDS: PermissionTabId[] = PERMISSION_TABS.map((t) => t.id);

export interface DepartmentPreset {
  department: DepartmentName;
  role: TeamMember['role'];
  summary: string;
  defaultTabs: PermissionTabId[];
}

export const DEPARTMENT_PRESETS: DepartmentPreset[] = [
  {
    department: 'Finance',
    role: 'Finance',
    summary: 'Revenue overview, M-Pesa/EcoCash ledgers, plan pricing, vouchers & payment gateways',
    defaultTabs: ['dashboard', 'billing']
  },
  {
    department: 'Technical',
    role: 'Tech',
    summary: 'MikroTik adoption, Paid/Free router controls, Remote Terminal, QoS & live sessions',
    defaultTabs: ['fleet', 'terminal', 'roaming', 'sessions']
  },
  {
    department: 'Marketing & Portal',
    role: 'Collaborator',
    summary: 'Captive portal branding, venue photos, sponsor video ads & captured guest leads',
    defaultTabs: ['portal', 'leads']
  },
  {
    department: 'Management',
    role: 'Management',
    summary: 'Executive Fleet Overview metrics, revenue trends & guest lead reporting',
    defaultTabs: ['dashboard', 'leads']
  },
  {
    department: 'Operations',
    role: 'Collaborator',
    summary: 'Day-to-day overview, router status, live session monitoring & captive portal sync',
    defaultTabs: ['dashboard', 'fleet', 'portal', 'sessions']
  },
  {
    department: 'Super Admin',
    role: 'Super Admin',
    summary: 'Full Control Tower access including Team Dashboard, Activity Audit Log & system settings',
    defaultTabs: [...ALL_PERMISSION_TAB_IDS]
  }
];

export function getDepartmentPreset(department?: string): DepartmentPreset {
  const clean = String(department || '').trim().toLowerCase();
  const matched = DEPARTMENT_PRESETS.find((d) => d.department.toLowerCase() === clean);
  if (matched) return matched;
  if (clean.includes('fin')) return DEPARTMENT_PRESETS[0];
  if (clean.includes('tech')) return DEPARTMENT_PRESETS[1];
  if (clean.includes('mark') || clean.includes('collab') || clean.includes('portal')) return DEPARTMENT_PRESETS[2];
  if (clean.includes('manag') || clean.includes('view')) return DEPARTMENT_PRESETS[3];
  if (clean.includes('op')) return DEPARTMENT_PRESETS[4];
  if (clean.includes('super') || clean.includes('owner') || clean.includes('admin')) return DEPARTMENT_PRESETS[5];
  return DEPARTMENT_PRESETS[0];
}

export function isUserSuperAdmin(user?: TeamMember | null, effectiveRole?: TeamMember['role']): boolean {
  if (!user) return false;
  // When Super Admin is actively previewing a non-admin role, respect the preview role in UI
  if (effectiveRole && effectiveRole !== 'Super Admin' && effectiveRole !== 'Owner' && effectiveRole !== 'Admin') {
    return false;
  }
  return Boolean(
    user.isSuperAdmin ||
      user.role === 'Super Admin' ||
      user.role === 'Owner' ||
      user.email?.toLowerCase() === SUPER_ADMIN_EMAIL ||
      user.email?.toLowerCase() === 'superadmin@tconnect.tower'
  );
}

export function isTrueSuperAdminAccount(user?: TeamMember | null): boolean {
  if (!user) return false;
  return Boolean(
    user.isSuperAdmin ||
      user.role === 'Super Admin' ||
      user.role === 'Owner' ||
      user.email?.toLowerCase() === SUPER_ADMIN_EMAIL ||
      user.email?.toLowerCase() === 'superadmin@tconnect.tower'
  );
}

export function getUserAllowedTabs(
  user?: TeamMember | null,
  effectiveRole?: TeamMember['role']
): PermissionTabId[] {
  if (!user) return [];
  if (isUserSuperAdmin(user, effectiveRole)) {
    return [...ALL_PERMISSION_TAB_IDS];
  }

  // If Super Admin is previewing a department role, show that department's preset tabs
  if (isTrueSuperAdminAccount(user) && effectiveRole && effectiveRole !== 'Super Admin' && effectiveRole !== 'Owner') {
    return getDepartmentPreset(effectiveRole).defaultTabs;
  }

  if (Array.isArray(user.allowedTabs) && user.allowedTabs.length > 0) {
    return user.allowedTabs.filter((t): t is PermissionTabId =>
      ALL_PERMISSION_TAB_IDS.includes(t as PermissionTabId)
    );
  }

  // Fallback for legacy records without explicit allowedTabs
  return getDepartmentPreset(user.department || user.role).defaultTabs;
}

export function canAccessSidebarTab(
  user: TeamMember | null | undefined,
  sidebarTab: 'dashboard' | 'fleet' | 'billing' | 'network' | 'team',
  effectiveRole?: TeamMember['role']
): boolean {
  if (sidebarTab === 'team') {
    return isUserSuperAdmin(user, effectiveRole);
  }
  if (isUserSuperAdmin(user, effectiveRole)) return true;
  const allowed = getUserAllowedTabs(user, effectiveRole);
  if (sidebarTab === 'network') {
    return allowed.some((t) => ['portal', 'terminal', 'roaming', 'sessions', 'leads'].includes(t));
  }
  return allowed.includes(sidebarTab);
}

export function canAccessNetworkSubTab(
  user: TeamMember | null | undefined,
  subTab: 'portal' | 'terminal' | 'roaming' | 'bandwidth' | 'sessions' | 'leads' | 'team' | 'security',
  effectiveRole?: TeamMember['role']
): boolean {
  if (subTab === 'team' || subTab === 'security') {
    return isUserSuperAdmin(user, effectiveRole);
  }
  if (isUserSuperAdmin(user, effectiveRole)) return true;
  const allowed = getUserAllowedTabs(user, effectiveRole);
  if (subTab === 'bandwidth') {
    return allowed.includes('roaming');
  }
  return allowed.includes(subTab);
}

export function getFirstAllowedSidebarTab(
  user: TeamMember | null | undefined,
  effectiveRole?: TeamMember['role']
): 'dashboard' | 'fleet' | 'billing' | 'network' {
  if (isUserSuperAdmin(user, effectiveRole)) return 'dashboard';
  const order: Array<'dashboard' | 'fleet' | 'billing' | 'network'> = ['dashboard', 'fleet', 'billing', 'network'];
  for (const tab of order) {
    if (canAccessSidebarTab(user, tab, effectiveRole)) {
      return tab;
    }
  }
  return 'dashboard';
}

export function getFirstAllowedNetworkSubTab(
  user: TeamMember | null | undefined,
  effectiveRole?: TeamMember['role']
): 'portal' | 'terminal' | 'roaming' | 'sessions' | 'leads' {
  const order: Array<'portal' | 'terminal' | 'roaming' | 'sessions' | 'leads'> = [
    'portal',
    'terminal',
    'roaming',
    'sessions',
    'leads'
  ];
  for (const sub of order) {
    if (canAccessNetworkSubTab(user, sub, effectiveRole)) {
      return sub;
    }
  }
  return 'portal';
}

export function getTabLabel(tabId: PermissionTabId): string {
  return PERMISSION_TABS.find((t) => t.id === tabId)?.shortLabel || tabId;
}

export function formatLastLogin(value?: string): { primary: string; relative: string } {
  if (!value || value === 'Never') {
    return { primary: 'Never logged in', relative: 'Awaiting first sign-in' };
  }
  if (value === 'Just now') {
    return { primary: 'Just now', relative: 'Active session' };
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return { primary: value, relative: '' };
  }
  const diffMs = Math.max(0, Date.now() - parsed);
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  let relative = 'Just now';
  if (diffDays >= 1) relative = `${diffDays}d ago`;
  else if (diffHrs >= 1) relative = `${diffHrs}h ${diffMin % 60}m ago`;
  else if (diffMin >= 1) relative = `${diffMin}m ago`;

  const d = new Date(parsed);
  const primary = d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return { primary, relative };
}
