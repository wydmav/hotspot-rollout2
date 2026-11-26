import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Trash2,
  Check,
  Copy,
  Search,
  Download,
  RefreshCw,
  SlidersHorizontal,
  Activity,
  Clock,
  Lock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import {
  TeamMember,
  AuditLogEntry,
  RouterDevice,
  DepartmentName,
  PermissionTabId
} from '../../types';
import { auditService } from '../../services/audit';
import { storage } from '../../services/storage';
import { copyToClipboard } from '../../utils/clipboard';
import {
  DEPARTMENT_PRESETS,
  TOWER_DOMAIN,
  isTrueSuperAdminAccount,
  getTabLabel,
  formatLastLogin,
  PERMISSION_TABS
} from '../../utils/permissions';
import { TabPermissionsSelector } from '../common/TabPermissionsSelector';

interface TeamRbacViewProps {
  team: TeamMember[];
  auditLogs: AuditLogEntry[];
  routers: RouterDevice[];
  onInviteMember?: (name: string, email: string, role: TeamMember['role'], scopedSites: string[]) => void;
  onUpdateRole?: (memberId: string, role: TeamMember['role'], scopedSites?: string[]) => void;
  onDeleteMember?: (memberId: string) => void;
  onIssuePassword?: (memberId: string, customPass?: string) => void;
  currentUser?: TeamMember;
}

const AUDIT_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'authentication', label: 'Authentication' },
  { value: 'router_adoption', label: 'Router Adoptions' },
  { value: 'router_config', label: 'Router Changes' },
  { value: 'router_reboot', label: 'Router Reboots' },
  { value: 'terminal_command', label: 'Terminal Commands' },
  { value: 'billing', label: 'Billing & Vouchers' },
  { value: 'portal', label: 'Portal & Media' },
  { value: 'exports', label: 'CSV Exports' },
  { value: 'team', label: 'Team & Permissions' }
];

export const TeamRbacView: React.FC<TeamRbacViewProps> = ({
  team: propTeam,
  auditLogs: propAuditLogs,
  currentUser
}) => {
  const isBoss = isTrueSuperAdminAccount(currentUser);

  const [activeTab, setActiveTab] = useState<'members' | 'audit'>('members');
  const [serverTeam, setServerTeam] = useState<TeamMember[]>(propTeam);
  const [serverLogs, setServerLogs] = useState<AuditLogEntry[]>(propAuditLogs);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Member filters
  const [memberSearch, setMemberSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState<DepartmentName>('Finance');
  const [inviteAllowedTabs, setInviteAllowedTabs] = useState<PermissionTabId[]>(['dashboard', 'billing']);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{
    member: TeamMember;
    inviteUrl: string;
    expiresAt?: string;
  } | null>(null);

  // Edit Permissions Modal State
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState<DepartmentName>('Finance');
  const [editAllowedTabs, setEditAllowedTabs] = useState<PermissionTabId[]>([]);
  const [isSavingMember, setIsSavingMember] = useState(false);

  // Reset Link Modal State
  const [resetLinkModal, setResetLinkModal] = useState<{
    member: TeamMember;
    resetUrl: string;
    expiresAt?: string;
  } | null>(null);

  // Audit Filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('all');
  const [auditDepartmentFilter, setAuditDepartmentFilter] = useState('all');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('all');

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 4000);
  };

  const loadTeamFromServer = useCallback(async () => {
    if (!isBoss) return;
    setIsLoadingTeam(true);
    const updated = await storage.syncTeamWithServer();
    setServerTeam(updated);
    setIsLoadingTeam(false);
  }, [isBoss]);

  const loadAuditLogsFromServer = useCallback(async () => {
    if (!isBoss) return;
    setIsLoadingLogs(true);
    const res = await storage.fetchServerAuditLogs({ limit: 500 });
    if (res.success) {
      setServerLogs(res.logs);
    }
    setIsLoadingLogs(false);
  }, [isBoss]);

  useEffect(() => {
    void loadTeamFromServer();
    void loadAuditLogsFromServer();
  }, [loadTeamFromServer, loadAuditLogsFromServer]);

  useEffect(() => {
    if (propTeam.length > 0 && serverTeam.length === 0) {
      setServerTeam(propTeam);
    }
  }, [propTeam, serverTeam.length]);

  const openInviteModal = () => {
    const financePreset = DEPARTMENT_PRESETS.find((d) => d.department === 'Finance');
    setInviteName('');
    setInviteDepartment('Finance');
    setInviteAllowedTabs(financePreset ? [...financePreset.defaultTabs] : ['dashboard', 'billing']);
    setShowInviteModal(true);
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteDepartment !== 'Super Admin' && inviteAllowedTabs.length === 0) {
      showFeedback('error', 'Tick at least one tab for this team member before creating the invite.');
      return;
    }
    setIsCreatingInvite(true);
    const res = await storage.createServerInvite({
      name: inviteName.trim() || undefined,
      department: inviteDepartment,
      allowedTabs: inviteDepartment === 'Super Admin' ? PERMISSION_TABS.map((t) => t.id) : inviteAllowedTabs
    });
    setIsCreatingInvite(false);
    if (res.success && res.member && res.inviteUrl) {
      setShowInviteModal(false);
      setCreatedInvite({
        member: res.member,
        inviteUrl: res.inviteUrl,
        expiresAt: res.expiresAt
      });
      await loadTeamFromServer();
      await loadAuditLogsFromServer();
    } else {
      showFeedback('error', res.message || 'Unable to generate invite link.');
    }
  };

  const openEditMember = (member: TeamMember) => {
    const dept = (member.department || (member.isSuperAdmin ? 'Super Admin' : 'Operations')) as DepartmentName;
    setEditingMember(member);
    setEditName(member.name);
    setEditDepartment(dept);
    setEditAllowedTabs(
      member.isSuperAdmin
        ? PERMISSION_TABS.map((t) => t.id)
        : Array.isArray(member.allowedTabs)
          ? [...member.allowedTabs]
          : []
    );
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (editDepartment !== 'Super Admin' && editAllowedTabs.length === 0) {
      showFeedback('error', 'Select at least one allowed tab.');
      return;
    }
    setIsSavingMember(true);
    const res = await storage.updateServerMember(editingMember.id, {
      name: editName.trim() || editingMember.name,
      department: editDepartment,
      allowedTabs: editDepartment === 'Super Admin' ? PERMISSION_TABS.map((t) => t.id) : editAllowedTabs
    });
    setIsSavingMember(false);
    if (res.success) {
      setEditingMember(null);
      showFeedback('success', `Updated access permissions for ${editName.trim() || editingMember.name}.`);
      await loadTeamFromServer();
      await loadAuditLogsFromServer();
    } else {
      showFeedback('error', res.message || 'Unable to save member changes.');
    }
  };

  const handleToggleSuspend = async (member: TeamMember) => {
    const nextStatus = member.status === 'suspended' ? 'active' : 'suspended';
    const res = await storage.updateServerMember(member.id, { status: nextStatus });
    if (res.success) {
      showFeedback(
        'success',
        nextStatus === 'suspended'
          ? `Suspended ${member.name} and ended their active sessions.`
          : `Reactivated ${member.name}.`
      );
      await loadTeamFromServer();
      await loadAuditLogsFromServer();
    } else {
      showFeedback('error', res.message || 'Could not update member status.');
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    const res = await storage.deleteServerMember(member.id);
    setConfirmDeleteId(null);
    if (res.success) {
      showFeedback('success', `Removed ${member.name} and invalidated all sessions.`);
      await loadTeamFromServer();
      await loadAuditLogsFromServer();
    } else {
      showFeedback('error', res.message || 'Could not remove team member.');
    }
  };

  const handleGenerateResetLink = async (member: TeamMember) => {
    const res = await storage.createServerResetLink(member.id);
    if (res.success && res.resetUrl) {
      setResetLinkModal({
        member,
        resetUrl: res.resetUrl,
        expiresAt: res.expiresAt
      });
      await loadAuditLogsFromServer();
    } else {
      showFeedback('error', res.message || 'Unable to create reset link.');
    }
  };

  const handleCopyText = (id: string, text: string) => {
    void copyToClipboard(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2200);
  };

  // Summary metrics
  const teamStats = useMemo(() => {
    const now = Date.now();
    const activeCount = serverTeam.filter((m) => m.status === 'active').length;
    const pendingCount = serverTeam.filter((m) => m.status === 'invited').length;
    const signedIn24h = serverTeam.filter((m) => {
      if (!m.lastLoginAt || m.lastLoginAt === 'Never') return false;
      const ts = Date.parse(m.lastLoginAt);
      return !Number.isNaN(ts) && now - ts <= 24 * 3600 * 1000;
    }).length;
    return {
      total: serverTeam.length,
      active: activeCount,
      pending: pendingCount,
      signedIn24h
    };
  }, [serverTeam]);

  const filteredTeam = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return serverTeam.filter((m) => {
      if (departmentFilter !== 'All' && (m.department || m.role) !== departmentFilter) {
        return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.username || '').toLowerCase().includes(q) ||
        (m.department || m.role || '').toLowerCase().includes(q)
      );
    });
  }, [serverTeam, memberSearch, departmentFilter]);

  const distinctAuditActors = useMemo(() => {
    const map = new Map<string, string>();
    serverLogs.forEach((log) => {
      const key = log.actorEmail || log.actor;
      if (key && !map.has(key)) {
        map.set(key, log.actorEmail ? `${log.actor} (${log.actorEmail})` : log.actor);
      }
    });
    return Array.from(map.entries());
  }, [serverLogs]);

  const distinctAuditDepartments = useMemo(() => {
    const set = new Set<string>();
    serverLogs.forEach((log) => {
      const d = log.actorDepartment || log.role;
      if (d) set.add(d);
    });
    return Array.from(set);
  }, [serverLogs]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return serverLogs.filter((log) => {
      if (auditActorFilter !== 'all') {
        const key = log.actorEmail || log.actor;
        if (key !== auditActorFilter) return false;
      }
      if (auditDepartmentFilter !== 'all') {
        if ((log.actorDepartment || log.role) !== auditDepartmentFilter) return false;
      }
      if (auditCategoryFilter !== 'all') {
        if ((log.category || 'general') !== auditCategoryFilter) return false;
      }
      if (!q) return true;
      return (
        log.actor.toLowerCase().includes(q) ||
        (log.actorEmail || '').toLowerCase().includes(q) ||
        (log.actorDepartment || '').toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    });
  }, [serverLogs, auditSearch, auditActorFilter, auditDepartmentFilter, auditCategoryFilter]);

  if (!isBoss) {
    return (
      <div className="bg-[#0f1422] border border-[#232d42] rounded-xl p-8 text-center space-y-3">
        <Lock className="w-8 h-8 text-[#f05e17] mx-auto" />
        <h2 className="text-base font-bold text-white">Super Admin Access Required</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Team management, tab permissions, and the full Activity &amp; Audit Log are exclusively reserved for the Super Admin account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Team Dashboard &amp; Activity Log
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Invite staff by department, tick exact tab access, track last login times, and inspect every user action.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              void loadTeamFromServer();
              void loadAuditLogsFromServer();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#141b2e] hover:bg-[#1c2540] border border-[#232d42] text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTeam || isLoadingLogs ? 'animate-spin text-[#f05e17]' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={openInviteModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Teammate</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Summary KPI Strip (4 Flat Single-Elevation Hairline Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0f1422] border border-[#232d42] rounded-xl p-4">
          <div className="text-[11px] font-medium text-slate-400">Total Staff</div>
          <div className="text-2xl font-extrabold text-white tabular-nums mt-1">{teamStats.total}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">@{TOWER_DOMAIN} directory</div>
        </div>
        <div className="bg-[#0f1422] border border-[#232d42] rounded-xl p-4">
          <div className="text-[11px] font-medium text-slate-400">Active Accounts</div>
          <div className="text-2xl font-extrabold text-emerald-400 tabular-nums mt-1">{teamStats.active}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">Own passwords set</div>
        </div>
        <div className="bg-[#0f1422] border border-[#232d42] rounded-xl p-4">
          <div className="text-[11px] font-medium text-slate-400">Pending Invites</div>
          <div className="text-2xl font-extrabold text-amber-400 tabular-nums mt-1">{teamStats.pending}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">Awaiting self-setup</div>
        </div>
        <div className="bg-[#0f1422] border border-[#232d42] rounded-xl p-4">
          <div className="text-[11px] font-medium text-slate-400">Signed In (Last 24h)</div>
          <div className="text-2xl font-extrabold text-white tabular-nums mt-1">{teamStats.signedIn24h}</div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">2h idle auto-logout</div>
        </div>
      </div>

      {/* Primary View Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#1f283d] pb-3">
        <div className="flex rounded-lg bg-[#121829] p-1 border border-[#232d42] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'members'
                ? 'bg-[#f05e17] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Members ({serverTeam.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('audit');
              void loadAuditLogsFromServer();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#f05e17] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity &amp; Audit Log ({serverLogs.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TEAM MEMBERS */}
      {activeTab === 'members' && (
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] overflow-hidden">
          {/* Search & Department Filter Bar */}
          <div className="p-4 border-b border-[#1f283d] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search name, handle, or department..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#141b2e] border border-[#26324d] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#f05e17]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {['All', ...DEPARTMENT_PRESETS.map((d) => d.department)].map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setDepartmentFilter(dept)}
                  className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                    departmentFilter === dept
                      ? 'bg-[#f05e17]/15 border-[#f05e17]/60 text-white font-semibold'
                      : 'bg-[#121829] border-[#1f283d] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 uppercase tracking-wider text-[10px] font-mono border-b border-[#1f283d] bg-[#0c111e]">
                  <th className="px-4 py-3">Member &amp; @{TOWER_DOMAIN} Handle</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Allowed Tabs</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3">Status &amp; Password</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b233a] text-slate-300">
                {filteredTeam.map((member) => {
                  const lastLogin = formatLastLogin(member.lastLoginAt);
                  const isPrimaryBoss = member.id === 'tm_super_admin_boss';
                  const allowedList = member.isSuperAdmin
                    ? ['All Tabs', 'Team Dashboard', 'Audit Log']
                    : (member.allowedTabs || []).map((t) => getTabLabel(t));
                  const pendingInviteUrl =
                    member.status === 'invited' && member.inviteToken && typeof window !== 'undefined'
                      ? `${window.location.origin}/#invite?token=${member.inviteToken}`
                      : '';

                  return (
                    <tr key={member.id} className="hover:bg-[#131a2c]/60 transition-colors">
                      {/* Name & Handle */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{member.name}</span>
                          {isPrimaryBoss && (
                            <span className="text-[10px] font-mono text-[#f05e17] font-semibold">
                              (Primary)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {member.email ? member.email : <span className="italic text-amber-400/90">Awaiting handle choice (@{TOWER_DOMAIN})</span>}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="font-semibold text-slate-200">{member.department || member.role}</div>
                        {member.invitedBy && !isPrimaryBoss && (
                          <div className="text-[10px] text-slate-500 mt-0.5">Invited by {member.invitedBy}</div>
                        )}
                      </td>

                      {/* Allowed Tabs (Clean inline dot-separated text, no pill clutter) */}
                      <td className="px-4 py-3.5 align-top max-w-xs">
                        <div className="text-[11px] text-slate-300 leading-relaxed">
                          {allowedList.length > 0 ? allowedList.join(' · ') : 'No tabs assigned'}
                        </div>
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap tabular-nums">
                        <div className="text-xs text-slate-200 font-medium">
                          {lastLogin.relative || lastLogin.primary}
                        </div>
                        {lastLogin.primary && lastLogin.primary !== lastLogin.relative && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">{lastLogin.primary}</div>
                        )}
                      </td>

                      {/* Status & Password State (Never shows plaintext password) */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              member.status === 'active'
                                ? 'bg-emerald-400'
                                : member.status === 'invited'
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                            }`}
                          />
                          <span className="font-semibold text-white capitalize">{member.status}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {member.hasPasswordConfigured ? 'Password Set' : 'Awaiting Self-Setup'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {pendingInviteUrl && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(`inv_${member.id}`, pendingInviteUrl)}
                              className="px-2.5 py-1 rounded-md bg-[#f05e17]/15 hover:bg-[#f05e17]/25 border border-[#f05e17]/40 text-[#f05e17] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="Copy single-use invite link"
                            >
                              {copiedId === `inv_${member.id}` ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Invite</span>
                                </>
                              )}
                            </button>
                          )}

                          {!isPrimaryBoss && (
                            <button
                              type="button"
                              onClick={() => openEditMember(member)}
                              className="px-2.5 py-1 rounded-md bg-[#141b2e] hover:bg-[#1e2944] border border-[#26324d] text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="Edit department and allowed tabs"
                            >
                              <SlidersHorizontal className="w-3 h-3 text-[#f05e17]" />
                              <span>Edit Tabs</span>
                            </button>
                          )}

                          {member.status === 'active' && !isPrimaryBoss && (
                            <button
                              type="button"
                              onClick={() => void handleGenerateResetLink(member)}
                              className="px-2.5 py-1 rounded-md bg-[#141b2e] hover:bg-[#1e2944] border border-[#26324d] text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                              title="Generate a single-use password reset link"
                            >
                              <KeyRound className="w-3 h-3 text-slate-400" />
                              <span>Reset Link</span>
                            </button>
                          )}

                          {!isPrimaryBoss && member.status !== 'invited' && (
                            <button
                              type="button"
                              onClick={() => void handleToggleSuspend(member)}
                              className="p-1.5 rounded-md bg-[#141b2e] hover:bg-[#1e2944] border border-[#26324d] text-slate-400 hover:text-amber-300 cursor-pointer"
                              title={member.status === 'suspended' ? 'Reactivate account' : 'Suspend account'}
                            >
                              {member.status === 'suspended' ? (
                                <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <PauseCircle className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {!isPrimaryBoss && (
                            confirmDeleteId === member.id ? (
                              <div className="inline-flex items-center gap-1 bg-rose-950/60 border border-rose-500/40 rounded-md px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteMember(member)}
                                  className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Remove
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(member.id)}
                                className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                title="Remove member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredTeam.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-xs">
                      No team members match your current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUPER ADMIN ACTIVITY & AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] overflow-hidden">
          {/* Filter Controls */}
          <div className="p-4 border-b border-[#1f283d] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">Super Admin Activity &amp; Audit Log</h2>
                <p className="text-xs text-slate-400">
                  Tracks sign-ins, config changes, router adoptions, terminal commands, team edits, and every CSV export.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  auditService.exportToCsv(
                    filteredAuditLogs,
                    `tconnect_activity_log_${new Date().toISOString().slice(0, 10)}.csv`
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141b2e] hover:bg-[#1d2742] border border-[#26324d] text-slate-200 hover:text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5 text-[#f05e17]" />
                <span>Export CSV ({filteredAuditLogs.length})</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search action, target, details..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#141b2e] border border-[#26324d] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <select
                value={auditActorFilter}
                onChange={(e) => setAuditActorFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#141b2e] border border-[#26324d] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
              >
                <option value="all">All Users</option>
                {distinctAuditActors.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={auditDepartmentFilter}
                onChange={(e) => setAuditDepartmentFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#141b2e] border border-[#26324d] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
              >
                <option value="all">All Departments</option>
                {distinctAuditDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select
                value={auditCategoryFilter}
                onChange={(e) => setAuditCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#141b2e] border border-[#26324d] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
              >
                {AUDIT_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto max-h-[540px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0c111e] z-10">
                <tr className="text-slate-400 uppercase tracking-wider text-[10px] font-mono border-b border-[#1f283d]">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User &amp; Department</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b233a] text-slate-300">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#131a2c]/60 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-mono text-slate-400 whitespace-nowrap tabular-nums">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-white">{log.actor}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {log.actorEmail ? `${log.actorEmail} · ` : ''}
                        {log.actorDepartment || log.role}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                      <span
                        className={`font-semibold ${
                          log.category === 'exports'
                            ? 'text-amber-300'
                            : log.category === 'router_adoption' || log.category === 'router_config'
                              ? 'text-cyan-300'
                              : log.category === 'router_reboot' || log.severity === 'critical'
                                ? 'text-rose-400'
                                : log.category === 'team'
                                  ? 'text-emerald-300'
                                  : 'text-[#f05e17]'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-200 whitespace-nowrap font-mono text-[11px]">
                      {log.target}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-md">
                      {log.command && (
                        <code className="text-emerald-300 font-mono text-[11px] bg-[#0a0f1d] px-1.5 py-0.5 rounded mr-1.5">
                          {log.command}
                        </code>
                      )}
                      <span>{log.details}</span>
                    </td>
                  </tr>
                ))}

                {filteredAuditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-xs">
                      No activity records match your filters yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVITE TEAMMATE MODAL (Department + Custom Tab Checkboxes) */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f283d]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#f05e17]" />
                <h3 className="text-base font-extrabold text-white">
                  Invite Teammate (@{TOWER_DOMAIN})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 block">
                  Teammate Name (Reference)
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Thabo Mokoena"
                  className="w-full px-3 py-2 bg-[#141b2e] border border-[#26324d] rounded-lg text-white text-xs focus:outline-none focus:border-[#f05e17]"
                />
                <p className="text-[11px] text-slate-400">
                  When they open your invite link, they will see <span className="font-mono text-[#f05e17]">@{TOWER_DOMAIN}</span> pre-filled, choose their own handle prefix and password, and receive the exact tabs you tick below.
                </p>
              </div>

              <TabPermissionsSelector
                department={inviteDepartment}
                onDepartmentChange={setInviteDepartment}
                allowedTabs={inviteAllowedTabs}
                onAllowedTabsChange={setInviteAllowedTabs}
              />

              <div className="pt-3 border-t border-[#1f283d] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-2 bg-[#141b2e] hover:bg-[#1e2944] border border-[#26324d] text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingInvite}
                  className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isCreatingInvite ? 'Generating Invite...' : 'Generate Single-Use Invite Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE GENERATED SUCCESS MODAL */}
      {createdInvite && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f283d]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Single-Use Invite Link Ready</span>
              </div>
              <button
                type="button"
                onClick={() => setCreatedInvite(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131a2d] border border-[#232d42] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Invited For</span>
                <span className="font-bold text-white">{createdInvite.member.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Department</span>
                <span className="font-semibold text-[#f05e17]">{createdInvite.member.department}</span>
              </div>
              <div className="pt-1.5 border-t border-[#1f283d] text-[11px] text-slate-300">
                <span className="text-slate-400">Allowed Tabs: </span>
                {(createdInvite.member.allowedTabs || []).map((t) => getTabLabel(t)).join(' · ')}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 block">
                Share This Link With Your Teammate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdInvite.inviteUrl}
                  className="flex-1 px-3 py-2 bg-[#090d16] border border-[#26324d] rounded-lg text-slate-200 font-mono text-xs select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopyText('modal_invite', createdInvite.inviteUrl)}
                  className="px-3 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === 'modal_invite' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'modal_invite' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Single-use link valid for 7 days. They will pick their own <span className="font-mono">@{TOWER_DOMAIN}</span> handle and private password when opening it.
              </p>
            </div>

            <div className="pt-2 border-t border-[#1f283d] flex justify-end">
              <button
                type="button"
                onClick={() => setCreatedInvite(null)}
                className="px-4 py-2 bg-[#141b2e] hover:bg-[#1e2944] border border-[#26324d] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MEMBER PERMISSIONS MODAL */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f283d]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#f05e17]" />
                <h3 className="text-base font-extrabold text-white">
                  Edit Member Department &amp; Tab Access
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-200 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141b2e] border border-[#26324d] rounded-lg text-white text-xs focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-200 block">Login Handle</label>
                  <input
                    type="text"
                    disabled
                    value={editingMember.email || `Pending @${TOWER_DOMAIN}`}
                    className="w-full px-3 py-2 bg-[#0b101d] border border-[#1f283d] rounded-lg text-slate-400 font-mono text-xs"
                  />
                </div>
              </div>

              <TabPermissionsSelector
                department={editDepartment}
                onDepartmentChange={setEditDepartment}
                allowedTabs={editAllowedTabs}
                onAllowedTabsChange={setEditAllowedTabs}
              />

              <div className="pt-3 border-t border-[#1f283d] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-3.5 py-2 bg-[#141b2e] hover:bg-[#1e2944] border border-[#26324d] text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMember}
                  className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingMember ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET LINK MODAL (Never exposes plaintext passwords) */}
      {resetLinkModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f283d]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <KeyRound className="w-4 h-4 text-[#f05e17]" />
                <span>Single-Use Password Reset Link</span>
              </div>
              <button
                type="button"
                onClick={() => setResetLinkModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#131a2d] border border-[#232d42] text-xs space-y-1">
              <div className="font-bold text-white">{resetLinkModal.member.name}</div>
              <div className="font-mono text-slate-400">{resetLinkModal.member.email}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 block">
                Send This One-Time Reset Link (Valid 24 Hours)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={resetLinkModal.resetUrl}
                  className="flex-1 px-3 py-2 bg-[#090d16] border border-[#26324d] rounded-lg text-slate-200 font-mono text-xs select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopyText('modal_reset', resetLinkModal.resetUrl)}
                  className="px-3 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === 'modal_reset' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'modal_reset' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>They will set their own new password privately; passwords are never stored in plain text.</span>
              </p>
            </div>

            <div className="pt-2 border-t border-[#1f283d] flex justify-end">
              <button
                type="button"
                onClick={() => setResetLinkModal(null)}
                className="px-4 py-2 bg-[#141b2e] hover:bg-[#1e2944] border border-[#26324d] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
