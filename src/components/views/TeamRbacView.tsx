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
  CheckCircle2
} from 'lucide-react';
import { TeamMember, AuditLogEntry, RouterDevice } from '../../types';

interface TeamRbacViewProps {
  team: TeamMember[];
  auditLogs: AuditLogEntry[];
  routers: RouterDevice[];
  onInviteMember: (name: string, email: string, role: TeamMember['role'], scopedSites: string[]) => void;
  onUpdateRole: (memberId: string, role: TeamMember['role'], scopedSites?: string[]) => void;
  onDeleteMember: (memberId: string) => void;
}

export const TeamRbacView: React.FC<TeamRbacViewProps> = ({
  team,
  auditLogs,
  routers,
  onInviteMember,
  onUpdateRole,
  onDeleteMember,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'matrix' | 'audit'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedInviteUrl, setCopiedInviteUrl] = useState<string | null>(null);

  // Invite Form
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('Technical');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  const uniqueSites = Array.from(new Set(routers.map(r => r.siteName)));

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    onInviteMember(inviteName.trim(), inviteEmail.trim(), inviteRole, selectedSites);
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setSelectedSites([]);
  };

  const handleCopyInviteLink = (email: string, role?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.tconnect.co.ls';
    const inviteUrl = `${origin}/#invite?token=inv_tok_${Math.random().toString(36).substring(2, 10)}&email=${encodeURIComponent(email)}&role=${encodeURIComponent(role || 'Collaborator')}`;
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
                        disabled={member.role === 'Owner'}
                        onChange={(e) => onUpdateRole(member.id, e.target.value as TeamMember['role'])}
                        className="px-2 py-1 bg-[#161d31] border border-[#232d42] rounded text-white font-mono text-xs focus:outline-none focus:border-[#f05e17] disabled:opacity-60"
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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        member.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {member.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {member.status === 'invited' && (
                          <button
                            onClick={() => handleCopyInviteLink(member.email, member.role)}
                            className="px-2 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded text-[11px] text-slate-300"
                          >
                            {copiedInviteUrl === member.email ? 'Link Copied!' : 'Copy Invite Link'}
                          </button>
                        )}
                        {member.role !== 'Owner' && (
                          <button
                            onClick={() => onDeleteMember(member.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
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
    </div>
  );
};
