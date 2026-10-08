import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Trash2, 
  Check, 
  Copy, 
  Search, 
  Lock, 
  FileText, 
  Sliders, 
  CheckCircle2,
  ArrowUpRight,
  Mail,
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { TeamMember, AuditLogEntry, RouterDevice } from '../../types';

interface TeamRbacViewProps {
  team: TeamMember[];
  auditLogs: AuditLogEntry[];
  routers: RouterDevice[];
  onInviteMember: (name: string, email: string, role: TeamMember['role'], scopedSites: string[]) => void;
  onUpdateRole: (memberId: string, role: TeamMember['role'], scopedSites?: string[]) => void;
  onDeleteMember: (memberId: string) => void;
  onIssuePassword?: (memberId: string, customPass?: string) => void;
  currentUser?: TeamMember;
}

export const TeamRbacView: React.FC<TeamRbacViewProps> = ({
  team,
  auditLogs,
  routers,
  onInviteMember,
  onUpdateRole,
  onDeleteMember,
  onIssuePassword,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'matrix' | 'audit'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedInviteUrl, setCopiedInviteUrl] = useState<string | null>(null);

  // Upgrade Role Modal State
  const [upgradeRoleModalMember, setUpgradeRoleModalMember] = useState<TeamMember | null>(null);
  const [targetUpgradeRole, setTargetUpgradeRole] = useState<TeamMember['role']>('Admin');
  const [targetUpgradeSites, setTargetUpgradeSites] = useState<string[]>([]);

  // Recently Invited Teammate Modal State
  const [recentlyInvited, setRecentlyInvited] = useState<{ member: TeamMember; inviteUrl: string } | null>(null);
  const [copiedRecentlyInvitedUrl, setCopiedRecentlyInvitedUrl] = useState(false);

  // Password Issuance Modal State
  const [passwordModalMember, setPasswordModalMember] = useState<TeamMember | null>(null);
  const [issuedTempPass, setIssuedTempPass] = useState<string>('');
  const [copiedTempPass, setCopiedTempPass] = useState<boolean>(false);

  // Invite Form
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('Technical');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  const uniqueSites = Array.from(new Set(routers.map(r => r.siteName)));

  const isAdminOrOwner = 
    !currentUser || 
    currentUser.role === 'Owner' || 
    currentUser.role === 'Admin' || 
    currentUser.email.toLowerCase() === 'rphooko@tconnect.africa';

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    const trimmedName = inviteName.trim();
    const trimmedEmail = inviteEmail.trim();
    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.tconnect.co.ls';
    const inviteUrl = `${origin}/#invite?token=${token}&email=${encodeURIComponent(trimmedEmail)}&role=${encodeURIComponent(inviteRole)}`;

    onInviteMember(trimmedName, trimmedEmail, inviteRole, selectedSites);
    
    setRecentlyInvited({
      member: {
        id: `tm_${Date.now()}`,
        name: trimmedName,
        email: trimmedEmail,
        role: inviteRole,
        scopedSites: selectedSites,
        mfaEnabled: inviteRole === 'Owner' || inviteRole === 'Admin' || inviteRole === 'Technical',
        status: 'invited',
        invitedAt: new Date().toISOString().slice(0, 10),
        inviteToken: token,
      },
      inviteUrl
    });

    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setSelectedSites([]);
  };

  const handleCopyInviteLink = (email: string, role?: string, token?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.tconnect.co.ls';
    const resolvedToken = token || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const inviteUrl = `${origin}/#invite?token=${resolvedToken}&email=${encodeURIComponent(email)}&role=${encodeURIComponent(role || 'Collaborator')}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInviteUrl(email);
    setTimeout(() => setCopiedInviteUrl(null), 2500);
  };

  const filteredAuditLogs = auditLogs.filter(log => {
    return auditSearch === '' ||
      log.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.target.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase());
  });

  const permissionsMatrix = [
    { module: 'Routers & WireGuard', permission: 'routers:adopt', owner: true, admin: true, technical: true, collaborator: false, viewer: false },
    { module: 'Routers & WireGuard', permission: 'routers:reboot', owner: true, admin: true, technical: true, collaborator: false, viewer: false },
    { module: 'Hotspot Plans', permission: 'plans:create_edit', owner: true, admin: true, technical: false, collaborator: true, viewer: false },
    { module: 'Vouchers', permission: 'vouchers:generate', owner: true, admin: true, technical: false, collaborator: true, viewer: false },
    { module: 'Payment Gateways', permission: 'gateways:edit_keys', owner: true, admin: true, technical: false, collaborator: false, viewer: false },
    { module: 'Financial Ledger', permission: 'billing:view_revenue', owner: true, admin: true, technical: false, collaborator: false, viewer: false },
    { module: 'Content Filtering', permission: 'dns:manage_rules', owner: true, admin: true, technical: true, collaborator: false, viewer: false },
    { module: 'Team & RBAC', permission: 'team:invite_members', owner: true, admin: false, technical: false, collaborator: false, viewer: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Team Management &amp; Role-Based Access Control</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Strict tenant isolation, least-privilege scoping, and immutable audit logs
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white text-xs font-bold rounded-lg transition-colors shadow-sm self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Invite Member</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-[#161d31] p-1 border border-[#232d42] text-xs font-mono w-fit">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
            activeTab === 'members' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Active Members ({team.length})
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
            activeTab === 'matrix' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
            activeTab === 'audit' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Members Table */}
      {activeTab === 'members' && (
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-[#232d42] pb-2">
                  <th className="py-2.5">NAME &amp; EMAIL</th>
                  <th className="py-2.5">ASSIGNED ROLE</th>
                  <th className="py-2.5">LOCATION SCOPE</th>
                  <th className="py-2.5">MFA ENFORCED</th>
                  <th className="py-2.5">STATUS</th>
                  <th className="py-2.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b233a] text-slate-300">
                {team.map((member) => (
                  <tr key={member.id}>
                    <td className="py-3">
                      <div className="font-bold text-white">{member.name}</div>
                      <div className="text-[11px] text-slate-400">{member.email}</div>
                    </td>
                    <td className="py-3">
                      <select
                        value={member.role}
                        disabled={!isAdminOrOwner && member.role === 'Owner'}
                        onChange={(e) => onUpdateRole(member.id, e.target.value as TeamMember['role'])}
                        className="px-2 py-1 bg-[#161d31] border border-[#232d42] rounded text-white font-mono text-xs focus:outline-none focus:border-[#f05e17] disabled:opacity-60 cursor-pointer"
                      >
                        <option value="Owner">Owner</option>
                        <option value="Admin">Admin</option>
                        <option value="Technical">Technical (No Billing)</option>
                        <option value="Collaborator">Collaborator</option>
                        <option value="Viewer">Viewer (Read-Only)</option>
                      </select>
                    </td>
                    <td className="py-3">
                      {member.scopedSites.length === 0 ? (
                        <span className="text-slate-400">All Locations</span>
                      ) : (
                        <div className="text-[11px] text-slate-300">
                          {member.scopedSites.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        member.mfaEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {member.mfaEnabled ? 'TOTP ACTIVE' : 'OPTIONAL'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          member.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {member.status.toUpperCase()}
                        </span>
                        {member.hasPendingReset && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            RESET REQUESTED
                          </span>
                        )}
                        {member.tempPassword && !member.hasPendingReset && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Key className="w-2.5 h-2.5" />
                            TEMP PASS ACTIVE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Upgrade Role Button (Admin Action) */}
                        {isAdminOrOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              setUpgradeRoleModalMember(member);
                              setTargetUpgradeRole(
                                member.role === 'Viewer' 
                                  ? 'Collaborator' 
                                  : member.role === 'Collaborator' 
                                  ? 'Technical' 
                                  : member.role === 'Technical' 
                                  ? 'Admin' 
                                  : 'Owner'
                              );
                              setTargetUpgradeSites([...member.scopedSites]);
                            }}
                            className="px-2 py-1 rounded text-[11px] font-bold bg-[#161d31] hover:bg-[#202942] border border-[#232d42] hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            title={`Upgrade role & privileges for ${member.name}`}
                          >
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                            <span>Upgrade</span>
                          </button>
                        )}

                        {/* Issue Temporary Password Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const rand = `TC-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}!`;
                            setIssuedTempPass(member.tempPassword || rand);
                            setPasswordModalMember(member);
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                            member.hasPendingReset
                              ? 'bg-[#f05e17] hover:bg-[#d94c0b] text-white border-transparent shadow-sm'
                              : 'bg-[#161d31] hover:bg-[#202942] border-[#232d42] text-slate-300 hover:text-white'
                          }`}
                          title="Issue or Re-issue Temporary Password"
                        >
                          <Key className="w-3 h-3 text-[#f05e17] group-hover:text-white" />
                          <span>{member.hasPendingReset ? 'Resolve Reset' : 'Issue Password'}</span>
                        </button>

                        {member.status === 'invited' && (
                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(member.email, member.role, member.inviteToken)}
                            className="px-2 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded text-[11px] text-slate-300 hover:text-white cursor-pointer"
                            title="Copy Instant Magic Login Link"
                          >
                            {copiedInviteUrl === member.email ? 'Copied!' : 'Copy Link'}
                          </button>
                        )}
                        {member.role !== 'Owner' && (
                          <button
                            type="button"
                            onClick={() => onDeleteMember(member.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Revoke Member Access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Permissions Matrix */}
      {activeTab === 'matrix' && (
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-white">System RBAC Permissions Matrix</h3>
            <p className="text-xs text-slate-400 font-mono">
              Server-enforced authorization rules. Technical roles cannot inspect financial ledger or gateway secrets.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-[#232d42] pb-2">
                  <th className="py-2">MODULE</th>
                  <th className="py-2">PERMISSION KEY</th>
                  <th className="py-2 text-center">OWNER</th>
                  <th className="py-2 text-center">ADMIN</th>
                  <th className="py-2 text-center">TECHNICAL</th>
                  <th className="py-2 text-center">COLLABORATOR</th>
                  <th className="py-2 text-center">VIEWER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b233a] text-slate-300">
                {permissionsMatrix.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-bold text-white">{row.module}</td>
                    <td className="py-2.5 text-slate-400">{row.permission}</td>
                    <td className="py-2.5 text-center">{row.owner ? '✅' : '—'}</td>
                    <td className="py-2.5 text-center">{row.admin ? '✅' : '—'}</td>
                    <td className="py-2.5 text-center">{row.technical ? '✅' : '—'}</td>
                    <td className="py-2.5 text-center">{row.collaborator ? '✅' : '—'}</td>
                    <td className="py-2.5 text-center">{row.viewer ? '✅' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Immutable Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-white">Immutable Security Audit Trail</h3>
              <p className="text-xs text-slate-400 font-mono">Records all administrative mutations, token generations, and router configurations</p>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono focus:outline-none focus:border-[#f05e17]"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-[#232d42] pb-2">
                  <th className="py-2">TIMESTAMP</th>
                  <th className="py-2">ACTOR</th>
                  <th className="py-2">ACTION</th>
                  <th className="py-2">TARGET</th>
                  <th className="py-2">DETAILS</th>
                  <th className="py-2 text-right">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b233a] text-slate-300">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 text-slate-400 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-2.5 font-bold text-white whitespace-nowrap">{log.actor} ({log.role})</td>
                    <td className="py-2.5 text-[#f05e17] font-semibold whitespace-nowrap">{log.action}</td>
                    <td className="py-2.5 text-slate-200 whitespace-nowrap">{log.target}</td>
                    <td className="py-2.5 text-slate-400 max-w-xs truncate">{log.details}</td>
                    <td className="py-2.5 text-right text-slate-500">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <h3 className="text-base font-extrabold text-white">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Lineo Letsie"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@domain.ls"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Role Assignment</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                >
                  <option value="Admin">Admin (Full Site Configuration &amp; Billing)</option>
                  <option value="Technical">Technical (Router &amp; WireGuard Only, No Financial Access)</option>
                  <option value="Collaborator">Collaborator (Voucher Generation Only)</option>
                  <option value="Viewer">Viewer (Read-Only Dashboard)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Site Scoping (Leave unselected for All)</label>
                <div className="space-y-1 max-h-32 overflow-y-auto p-2 bg-[#161d31] rounded-lg border border-[#232d42]">
                  {uniqueSites.map((site) => (
                    <label key={site} className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedSites.includes(site)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSites([...selectedSites, site]);
                          } else {
                            setSelectedSites(selectedSites.filter(s => s !== site));
                          }
                        }}
                        className="rounded accent-[#f05e17] w-3 h-3"
                      />
                      <span>{site}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#232d42] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm"
                >
                  Send Single-Use Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Issue Temporary Password Modal */}
      {passwordModalMember && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <div className="flex items-center gap-2 text-white font-bold">
                <Key className="w-4 h-4 text-[#f05e17]" />
                <span>Issue Temporary Password</span>
              </div>
              <button 
                onClick={() => setPasswordModalMember(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Target Member Info */}
            <div className="p-3 bg-[#161d31] rounded-xl border border-[#232d42] flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-sm">{passwordModalMember.name}</div>
                <div className="text-[11px] text-slate-400">{passwordModalMember.email}</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f05e17]/10 text-[#f05e17] border border-[#f05e17]/30">
                {passwordModalMember.role}
              </span>
            </div>

            {passwordModalMember.hasPendingReset && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-[11px]">
                This user requested a password reset on the login screen. Issuing a new password fulfills this request.
              </div>
            )}

            {/* Temporary Password Field & Copy */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">Temporary Authentication Password</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={issuedTempPass}
                  onChange={(e) => setIssuedTempPass(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#090d16] border border-[#232d42] rounded-lg text-[#f05e17] font-bold tracking-wider text-sm focus:outline-none focus:border-[#f05e17]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = `TC-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}!`;
                    setIssuedTempPass(next);
                  }}
                  className="px-2.5 py-2 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg text-xs"
                  title="Generate another password"
                >
                  Regen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(issuedTempPass);
                    setCopiedTempPass(true);
                    setTimeout(() => setCopiedTempPass(false), 2000);
                  }}
                  className="px-3 py-2 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200 rounded-lg text-xs flex items-center gap-1"
                >
                  {copiedTempPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTempPass ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Direct Email Link */}
            <div className="pt-1">
              <a
                href={`mailto:${passwordModalMember.email}?subject=Your%20T-Connect%20Controller%20Temporary%20Password&body=Hi%20${encodeURIComponent(passwordModalMember.name)},%0A%0AYour%20temporary%20password%20for%20the%20T-Connect%20Cloud%20Controller%20is:%0A%0A${encodeURIComponent(issuedTempPass)}%0A%0APlease%20sign%20in%20with%20your%20email%20and%20this%20temporary%20password.%0A%0ARegards,%0ARaphooko%20Phooko`}
                className="text-[11px] text-[#f05e17] hover:underline flex items-center gap-1.5"
              >
                <span>Compose Email Dispatch to User</span>
                <span className="text-slate-500">({passwordModalMember.email})</span>
              </a>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#232d42] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordModalMember(null)}
                className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onIssuePassword) {
                    onIssuePassword(passwordModalMember.id, issuedTempPass);
                  }
                  setPasswordModalMember(null);
                }}
                className="px-4 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save &amp; Activate Password</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Admin Upgrade Role & Scopes Modal */}
      {upgradeRoleModalMember && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Upgrade Teammate Role &amp; Scopes</span>
              </div>
              <button 
                onClick={() => setUpgradeRoleModalMember(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Target Member Header */}
            <div className="p-3 bg-[#161d31] rounded-xl border border-[#232d42] flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-sm">{upgradeRoleModalMember.name}</div>
                <div className="text-[11px] text-slate-400">{upgradeRoleModalMember.email}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block mb-0.5">Current Role</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {upgradeRoleModalMember.role}
                </span>
              </div>
            </div>

            {/* Select Target Role */}
            <div className="space-y-2">
              <label className="text-slate-300 font-bold block">
                Select Elevated Target Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    role: 'Owner' as const,
                    title: 'Owner',
                    desc: 'Full root authority. Hardware, billing, keys & team admin.',
                    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  },
                  {
                    role: 'Admin' as const,
                    title: 'Site Admin',
                    desc: 'Fleet configs, captive portals, plans, vouchers & gateways.',
                    badge: 'bg-[#f05e17]/10 text-[#f05e17] border-[#f05e17]/30'
                  },
                  {
                    role: 'Technical' as const,
                    title: 'Technical Engineer',
                    desc: 'MikroTik WireGuard, DNS content filters. No billing access.',
                    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  },
                  {
                    role: 'Collaborator' as const,
                    title: 'Collaborator',
                    desc: 'Vouchers & plans only. Router credentials hidden.',
                    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  },
                  {
                    role: 'Viewer' as const,
                    title: 'Read-Only Viewer',
                    desc: 'Auditor inspection mode. All mutations & deletes blocked.',
                    badge: 'bg-slate-700/50 text-slate-300 border-slate-600'
                  }
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setTargetUpgradeRole(item.role)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      targetUpgradeRole === item.role
                        ? 'bg-[#182138] border-[#f05e17] ring-1 ring-[#f05e17] shadow-sm'
                        : 'bg-[#121829] border-[#1f283d] hover:bg-[#161d31]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-xs">{item.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${item.badge}`}>
                        {item.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Site Scoping */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">
                Location Scoping (Leave unchecked for All Locations)
              </label>
              <div className="space-y-1 max-h-28 overflow-y-auto p-2 bg-[#161d31] rounded-lg border border-[#232d42]">
                {uniqueSites.map((site) => (
                  <label key={site} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={targetUpgradeSites.includes(site)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetUpgradeSites([...targetUpgradeSites, site]);
                        } else {
                          setTargetUpgradeSites(targetUpgradeSites.filter(s => s !== site));
                        }
                      }}
                      className="rounded accent-[#f05e17] w-3 h-3"
                    />
                    <span>{site}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Immediate Effect Notice */}
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-start gap-2 text-emerald-300 text-[11px]">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Upgrading <strong>{upgradeRoleModalMember.name}</strong> from <strong>{upgradeRoleModalMember.role}</strong> to <strong className="text-white">{targetUpgradeRole}</strong> takes effect immediately across all active controller sessions without requiring re-invitation.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#232d42] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUpgradeRoleModalMember(null)}
                className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateRole(upgradeRoleModalMember.id, targetUpgradeRole, targetUpgradeSites);
                  setUpgradeRoleModalMember(null);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Role Upgrade &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recently Invited Teammate Modal */}
      {recentlyInvited && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Teammate Invitation Generated &amp; Active!</span>
              </div>
              <button 
                onClick={() => setRecentlyInvited(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Invitee Summary */}
            <div className="p-3 bg-[#161d31] rounded-xl border border-[#232d42] space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-sm">{recentlyInvited.member.name}</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {recentlyInvited.member.role}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">{recentlyInvited.member.email}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-[#1f283d] flex items-center justify-between">
                <span>Scope: {recentlyInvited.member.scopedSites.length ? recentlyInvited.member.scopedSites.join(', ') : 'All Sites'}</span>
                <span className="text-emerald-400 font-bold">Instant Email Authentication Ready</span>
              </div>
            </div>

            {/* Magic Link */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block flex items-center justify-between">
                <span>Instant Authentication Magic Link</span>
                <span className="text-[10px] text-emerald-400 font-normal">Single-click sign in (No password needed)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={recentlyInvited.inviteUrl}
                  className="flex-1 px-3 py-2 bg-[#090d16] border border-[#232d42] rounded-lg text-slate-300 font-mono text-xs select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(recentlyInvited.inviteUrl);
                    setCopiedRecentlyInvitedUrl(true);
                    setTimeout(() => setCopiedRecentlyInvitedUrl(false), 2000);
                  }}
                  className="px-3 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedRecentlyInvitedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRecentlyInvitedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Email Dispatch Action */}
            <div className="p-3 bg-[#121829] rounded-xl border border-[#1f283d] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-white text-xs">Dispatch Welcome Email to Teammate</div>
                <div className="text-[10px] text-slate-400 truncate">
                  Sends invite magic link directly from Raphooko Phooko (rphooko@tconnect.africa)
                </div>
              </div>
              <a
                href={`mailto:${recentlyInvited.member.email}?subject=Invitation%20to%20join%20T-Connect%20Controller%20as%20${recentlyInvited.member.role}&body=Hi%20${encodeURIComponent(recentlyInvited.member.name)},%0A%0AYou've%20been%20invited%20by%20Administrator%20Raphooko%20Phooko%20to%20join%20the%20T-Connect%20Cloud%20Controller%20team%20as%20${recentlyInvited.member.role}.%0A%0AClick%20this%20instant%20access%20link%20to%20sign%20in%20immediately:%0A${encodeURIComponent(recentlyInvited.inviteUrl)}%0A%0AWelcome%20aboard!%0ARaphooko%20Phooko`}
                className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200 hover:text-white rounded-lg font-bold flex items-center gap-1.5 shrink-0"
              >
                <Mail className="w-3.5 h-3.5 text-[#f05e17]" />
                <span>Open Email</span>
              </a>
            </div>

            {/* Close */}
            <div className="pt-2 border-t border-[#232d42] flex justify-end">
              <button
                type="button"
                onClick={() => setRecentlyInvited(null)}
                className="px-4 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-white font-bold rounded-lg cursor-pointer"
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
