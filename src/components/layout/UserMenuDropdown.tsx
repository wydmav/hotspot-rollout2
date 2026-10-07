import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  ShieldCheck, 
  LogOut, 
  ChevronDown, 
  Key, 
  Fingerprint, 
  ExternalLink,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  User,
  Eye,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Mail,
  Building,
  Check,
  X
} from 'lucide-react';
import { TeamMember } from '../../types';

interface UserMenuDropdownProps {
  currentUser: TeamMember;
  effectiveRole: TeamMember['role'];
  onRolePreviewChange: (role: TeamMember['role']) => void;
  onNavigateTab: (tab: string) => void;
  onSignOut: () => void;
  teamMembersCount: number;
  pendingResetCount: number;
  biometricActive?: boolean;
  onOpenBiometrics?: () => void;
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({
  currentUser,
  effectiveRole,
  onRolePreviewChange,
  onNavigateTab,
  onSignOut,
  teamMembersCount,
  pendingResetCount,
  biometricActive = true,
  onOpenBiometrics,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Recalculate dropdown position below the avatar trigger
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    }
  }, []);

  // Handle opening and closing with positioning
  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Keep dropdown positioned cleanly on window resize or scroll
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // Click outside and ESC key handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const rolesList: Array<{
    role: TeamMember['role'];
    label: string;
    description: string;
  }> = [
    {
      role: 'Owner',
      label: 'Owner / Super Admin',
      description: 'Unrestricted hardware, billing, keys & team authority'
    },
    {
      role: 'Admin',
      label: 'Site Admin',
      description: 'Fleet and captive portal config, plans & vouchers'
    },
    {
      role: 'Collaborator',
      label: 'Hotspot Collaborator',
      description: 'Vouchers & plans only. Gateway credentials hidden.'
    },
    {
      role: 'Viewer',
      label: 'Read-Only Viewer',
      description: 'Auditor access. All mutations and deletions disabled.'
    }
  ];

  const initials = currentUser.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'RP';

  return (
    <>
      {/* Header Avatar Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#121829] hover:bg-[#1a233a] border border-[#232d42] hover:border-[#384869] text-left transition-all cursor-pointer shadow-sm group select-none"
      >
        {/* User Avatar */}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#f05e17] to-[#d94c0b] text-white font-bold flex items-center justify-center text-xs shadow-sm border border-white/20 shrink-0">
          {initials}
        </div>

        {/* User Info Label */}
        <div className="hidden sm:block min-w-0 pr-1 font-mono">
          <div className="text-xs font-bold text-white truncate leading-tight group-hover:text-[#f05e17] transition-colors">
            {currentUser.name}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <span className="truncate">{effectiveRole}</span>
            {effectiveRole !== currentUser.role && (
              <span className="text-[9px] text-[#f05e17] font-bold px-1 rounded bg-[#f05e17]/10 border border-[#f05e17]/30">
                Preview
              </span>
            )}
          </div>
        </div>

        {/* Pending Password Reset Indicator Badge */}
        {pendingResetCount > 0 && (
          <span className="w-2 h-2 rounded-full bg-[#f05e17] animate-ping absolute top-1 right-2" />
        )}

        <ChevronDown 
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} 
        />
      </button>

      {/* Portal-Based Floating Dropdown Menu */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          role="menu"
          aria-label="User Account Menu"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            zIndex: 9999,
          }}
          className="w-80 max-w-[calc(100vw-32px)] bg-[#0d1220] border border-[#232d42] rounded-2xl shadow-2xl p-3 font-mono text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
        >
          {/* User Profile Header Badge */}
          <div className="p-3 bg-[#151c2e] rounded-xl border border-[#232d42] space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f05e17] to-[#d94c0b] text-white font-black flex items-center justify-center text-sm shadow-md border border-white/20 shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-white text-sm leading-snug truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-slate-300 truncate select-all">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                {currentUser.role}
              </span>
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-[#1f283d]">
              <span className="flex items-center gap-1 text-slate-400 truncate">
                <Building className="w-3 h-3 text-[#f05e17]" />
                <span>Tenant: T-Connect Primary</span>
              </span>
              <span className="text-slate-300 shrink-0">Maseru, LS</span>
            </div>
          </div>

          {/* Menu Actions Section */}
          <div className="space-y-1">
            {/* 1. Profile Settings */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                setShowProfileModal(true);
              }}
              className="w-full px-3 py-2 rounded-lg bg-[#121829] hover:bg-[#1a233a] border border-[#1f283d] text-left flex items-center justify-between text-slate-200 hover:text-white transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-[#f05e17] group-hover:rotate-45 transition-transform" />
                <div>
                  <span className="font-bold block">Profile Settings</span>
                  <span className="text-[10px] text-slate-400 block font-normal">Account identity &amp; preferences</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 -rotate-90 group-hover:text-white transition-colors" />
            </button>

            {/* 2. Team Dashboard (links to Network tab) */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onNavigateTab('network');
              }}
              className="w-full px-3 py-2 rounded-lg bg-[#121829] hover:bg-[#1a233a] border border-[#1f283d] text-left flex items-center justify-between text-slate-200 hover:text-white transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#f05e17]" />
                <div>
                  <span className="font-bold block">Team Dashboard</span>
                  <span className="text-[10px] text-slate-400 block font-normal">Network &amp; RBAC console</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-[#1c2438] text-slate-300">
                  {teamMembersCount}
                </span>
                {pendingResetCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {pendingResetCount} alert
                  </span>
                )}
              </div>
            </button>

            {/* Hardware Biometrics / Passkey Item (if handler provided) */}
            {onOpenBiometrics && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onOpenBiometrics();
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#121829] hover:bg-[#1a233a] border border-[#1f283d] text-left flex items-center justify-between text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-bold block">Passkey Hardware MFA</span>
                    <span className="text-[10px] text-slate-400 block font-normal">FIDO2 / Touch ID session</span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  {biometricActive ? 'Active' : 'Setup'}
                </span>
              </button>
            )}
          </div>

          {/* 3. Role Preview Switcher */}
          <div className="space-y-1.5 pt-2 border-t border-[#1f283d]">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#f05e17]" />
                <span>Role Preview Switcher</span>
              </span>
              {effectiveRole !== currentUser.role && (
                <button
                  type="button"
                  onClick={() => onRolePreviewChange(currentUser.role)}
                  className="text-[10px] text-[#f05e17] hover:text-[#ff7e42] hover:underline cursor-pointer"
                >
                  Reset ({currentUser.role})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {rolesList.map((r) => {
                const isActive = effectiveRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => onRolePreviewChange(r.role)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#f05e17]/15 border-[#f05e17] text-white shadow-sm'
                        : 'bg-[#121829] hover:bg-[#182035] border-[#1f283d] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-[11px] truncate flex items-center gap-1.5">
                      {isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f05e17] shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      )}
                      <span>{r.role}</span>
                    </div>
                    <div className="text-[9px] text-slate-500 truncate mt-0.5">
                      {r.role === 'Owner'
                        ? 'Full Control'
                        : r.role === 'Collaborator'
                        ? 'Vouchers Only'
                        : r.role === 'Viewer'
                        ? 'Read-Only'
                        : 'Fleet Admin'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Sign Out Button */}
          <div className="pt-2 border-t border-[#1f283d]">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold flex items-center justify-center gap-2 transition-colors text-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Profile Settings Modal */}
      {showProfileModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl font-mono text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Settings className="w-4 h-4 text-[#f05e17]" />
                <span>Profile Settings</span>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1a233a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Avatar & Primary Credentials */}
            <div className="p-4 bg-[#141b2d] rounded-xl border border-[#232d42] flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f05e17] to-[#d94c0b] text-white font-black flex items-center justify-center text-lg shadow-md border border-white/20 shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-white text-sm truncate">{currentUser.name}</div>
                <div className="text-slate-300 text-xs truncate">{currentUser.email}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f05e17]/15 text-[#f05e17] border border-[#f05e17]/30">
                    {currentUser.role}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>MFA Active</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Account Details & Infrastructure Metadata */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Primary Tenant Scope</label>
                <input
                  type="text"
                  disabled
                  value="T-Connect Cloud Network · Lesotho (Maseru Hub)"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-300 text-xs disabled:opacity-80"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px]">Administrative Contact Email</label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-300 text-xs disabled:opacity-80"
                />
              </div>

              <div className="p-3 bg-[#111728] rounded-xl border border-[#1f283d] space-y-1.5 text-[11px] text-slate-300">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Last Authenticated:</span>
                  <span className="text-slate-200">{currentUser.lastLoginAt || 'Just now'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Authentication Method:</span>
                  <span className="text-[#f05e17] font-bold">Master Password &amp; Passkey</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Controller Node:</span>
                  <span className="text-slate-200">hub.tconnect.co.ls</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#232d42] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
