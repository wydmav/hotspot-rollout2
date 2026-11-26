import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sun,
  Moon,
  Clock,
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';
import { storage } from '../../services/storage';
import { AuthSession, DepartmentName, PermissionTabId, TeamMember } from '../../types';
import { TConnectLogo } from '../common/TConnectLogo';
import {
  TOWER_DOMAIN,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_NAME,
  PERMISSION_TABS
} from '../../utils/permissions';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  teamMembers?: TeamMember[];
  adminTheme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  sessionExpiredReason?: string | null;
  onClearExpiredReason?: () => void;
}

type AuthScreenMode = 'loading' | 'super_admin_setup' | 'signin' | 'invite_setup' | 'password_reset';

interface InvitePreviewData {
  token: string;
  towerDomain: string;
  suggestedName: string;
  department: DepartmentName;
  role: TeamMember['role'];
  isSuperAdmin: boolean;
  allowedTabs: PermissionTabId[];
  invitedBy: string;
  expiresAt?: string;
}

interface ResetPreviewData {
  token: string;
  name: string;
  username?: string;
  email: string;
  department: string;
  expiresAt?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  adminTheme = 'dark',
  onToggleTheme,
  sessionExpiredReason,
  onClearExpiredReason
}) => {
  const [mode, setMode] = useState<AuthScreenMode>('loading');
  const [towerDomain, setTowerDomain] = useState(TOWER_DOMAIN);
  const [superAdminEmail, setSuperAdminEmail] = useState(SUPER_ADMIN_EMAIL);
  const [superAdminName, setSuperAdminName] = useState(SUPER_ADMIN_NAME);

  // Sign-in & setup form fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Invite activation fields
  const [invitePreview, setInvitePreview] = useState<InvitePreviewData | null>(null);
  const [resetPreview, setResetPreview] = useState<ResetPreviewData | null>(null);
  const [fullName, setFullName] = useState('');
  const [handlePrefix, setHandlePrefix] = useState('');
  const [handleStatus, setHandleStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  const handleCheckTimerRef = useRef<number | null>(null);

  // Inspect URL for #invite?token=... or #reset?token=... AND check first-run Super Admin status
  useEffect(() => {
    let cancelled = false;

    const inspectRouteAndStatus = async () => {
      let token = '';
      if (typeof window !== 'undefined') {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const hashTokenMatch = hash.match(/token=([^&]+)/);
        if (hashTokenMatch) {
          token = decodeURIComponent(hashTokenMatch[1]);
        } else if (search.includes('token=') || search.includes('invite=')) {
          const params = new URLSearchParams(search);
          token = params.get('token') || params.get('invite') || '';
        }
      }

      if (token) {
        const preview = await storage.previewInviteOrReset(token);
        if (cancelled) return;
        if (preview.success && preview.mode === 'invite') {
          setTowerDomain(preview.towerDomain || TOWER_DOMAIN);
          setInvitePreview({
            token,
            towerDomain: preview.towerDomain || TOWER_DOMAIN,
            suggestedName: preview.suggestedName || '',
            department: (preview.department || 'Operations') as DepartmentName,
            role: preview.role || 'Collaborator',
            isSuperAdmin: Boolean(preview.isSuperAdmin),
            allowedTabs: Array.isArray(preview.allowedTabs) ? preview.allowedTabs : [],
            invitedBy: preview.invitedBy || SUPER_ADMIN_NAME,
            expiresAt: preview.expiresAt
          });
          if (preview.suggestedName) {
            setFullName(preview.suggestedName);
            const suggestedPrefix = preview.suggestedName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '.')
              .replace(/^\.+|\.+$/g, '')
              .slice(0, 24);
            if (suggestedPrefix.length >= 3) {
              setHandlePrefix(suggestedPrefix);
            }
          }
          setErrorMsg(null);
          setMode('invite_setup');
          return;
        }
        if (preview.success && preview.mode === 'reset') {
          setTowerDomain(preview.towerDomain || TOWER_DOMAIN);
          setResetPreview({
            token,
            name: preview.name || 'Team Member',
            username: preview.username,
            email: preview.email || '',
            department: preview.department || 'Operations',
            expiresAt: preview.expiresAt
          });
          setErrorMsg(null);
          setMode('password_reset');
          return;
        }
        setErrorMsg(preview.message || 'This link is invalid or has already been used.');
      }

      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data) {
            if (data.towerDomain) setTowerDomain(String(data.towerDomain));
            if (data.superAdminEmail || data.ownerEmail) {
              setSuperAdminEmail(String(data.superAdminEmail || data.ownerEmail));
            }
            if (data.superAdminName) setSuperAdminName(String(data.superAdminName));
            if (data.needsSuperAdminSetup || data.needsOwnerSetup) {
              setMode('super_admin_setup');
              return;
            }
          }
        }
      } catch {
        // default to sign-in
      }
      if (!cancelled) {
        setMode('signin');
      }
    };

    void inspectRouteAndStatus();
    const onHashChange = () => {
      void inspectRouteAndStatus();
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  // Debounced live availability check for @tconnect.tower prefix during invite onboarding
  useEffect(() => {
    if (mode !== 'invite_setup') return;
    if (handleCheckTimerRef.current) {
      window.clearTimeout(handleCheckTimerRef.current);
    }
    const clean = handlePrefix.trim().toLowerCase().replace(/@.*$/, '');
    if (!clean) {
      setHandleStatus({ checking: false });
      return;
    }
    setHandleStatus({ checking: true });
    handleCheckTimerRef.current = window.setTimeout(async () => {
      const result = await storage.checkHandleAvailability(clean);
      setHandleStatus({
        checking: false,
        available: result.available,
        message: result.available
          ? `${result.fullEmail || `${clean}@${towerDomain}`} is available`
          : result.reason || 'Handle unavailable'
      });
    }, 300);

    return () => {
      if (handleCheckTimerRef.current) {
        window.clearTimeout(handleCheckTimerRef.current);
      }
    };
  }, [handlePrefix, mode, towerDomain]);

  const clearUrlToken = () => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleSuperAdminSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 10) {
      setErrorMsg('Please choose a strong password with at least 10 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter to confirm.');
      return;
    }
    setIsSubmitting(true);
    const res = await storage.setupOwnerAccount(superAdminEmail, password, confirmPassword);
    setIsSubmitting(false);
    if (res.success && res.session) {
      onClearExpiredReason?.();
      onLoginSuccess(res.session);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await storage.login(identifier.trim(), password);
    setIsSubmitting(false);
    if (res.success && res.session) {
      onClearExpiredReason?.();
      onLoginSuccess(res.session);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleInviteActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePreview) return;
    setErrorMsg(null);
    const cleanPrefix = handlePrefix.trim().toLowerCase().replace(/@.*$/, '');
    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!cleanPrefix || cleanPrefix.length < 3) {
      setErrorMsg(`Please enter the first part of your @${towerDomain} handle (at least 3 characters).`);
      return;
    }
    if (handleStatus.available === false) {
      setErrorMsg(handleStatus.message || 'Please choose an available handle.');
      return;
    }
    if (password.length < 10) {
      setErrorMsg('Please create a password of at least 10 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter to confirm.');
      return;
    }

    setIsSubmitting(true);
    const res = await storage.completeInviteActivation({
      token: invitePreview.token,
      fullName: fullName.trim(),
      handlePrefix: cleanPrefix,
      password,
      confirmPassword
    });
    setIsSubmitting(false);
    if (res.success && res.session) {
      clearUrlToken();
      onClearExpiredReason?.();
      onLoginSuccess(res.session);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPreview) return;
    setErrorMsg(null);
    if (password.length < 10) {
      setErrorMsg('New password must be at least 10 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    const res = await storage.completePasswordReset({
      token: resetPreview.token,
      password,
      confirmPassword
    });
    setIsSubmitting(false);
    if (res.success && res.session) {
      clearUrlToken();
      onClearExpiredReason?.();
      onLoginSuccess(res.session);
    } else {
      setErrorMsg(res.message);
    }
  };

  const resolvedInviteTabs = invitePreview
    ? PERMISSION_TABS.filter((tab) => invitePreview.isSuperAdmin || invitePreview.allowedTabs.includes(tab.id))
    : [];

  return (
    <div
      data-admin-theme={adminTheme}
      className="min-h-screen bg-[#080b14] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#f05e17] selection:text-white relative overflow-hidden"
    >
      {/* Subtle Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_-15%,rgba(240,94,23,0.14),transparent)] pointer-events-none" />

      {/* Top Brand Header with Official T-Connect SVG Logo */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-[#1b233a]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <TConnectLogo withBackground className="w-9 h-9" />
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              <span>T-CONNECT</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#f05e17]/10 text-[#f05e17] border border-[#f05e17]/30">
                CONTROL TOWER
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Lesotho Hotspot &amp; MikroTik Infrastructure Platform
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141b2e] hover:bg-[#1d2742] border border-[#232d42] text-slate-300 hover:text-white text-xs font-mono font-bold transition-colors cursor-pointer"
              title="Toggle Light / Dark Theme"
            >
              {adminTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dark</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Centered Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className={`w-full ${mode === 'invite_setup' ? 'max-w-lg' : 'max-w-md'} space-y-5`}>
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
            {/* Official T-Connect Logo Centered Above Card Title */}
            <div className="flex flex-col items-center text-center space-y-2.5">
              <TConnectLogo withBackground className="w-12 h-12" />
              {mode === 'loading' && (
                <div className="py-6 flex flex-col items-center gap-3 text-xs font-mono text-slate-400">
                  <span className="w-5 h-5 border-2 border-[#f05e17]/30 border-t-[#f05e17] rounded-full animate-spin" />
                  <span>Checking session status...</span>
                </div>
              )}

              {mode === 'super_admin_setup' && (
                <>
                  <div>
                    <h1 className="text-xl font-extrabold text-white tracking-tight">
                      Set Super Admin Password
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      First-time setup for <strong className="text-slate-200">{superAdminName}</strong>. Choose your private password to secure T-Connect Control Tower.
                    </p>
                  </div>
                </>
              )}

              {mode === 'signin' && (
                <div>
                  <h1 className="text-xl font-extrabold text-white tracking-tight">
                    Sign In to T-Connect
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Use your <span className="font-mono text-slate-300">@{towerDomain}</span> handle and password.
                  </p>
                </div>
              )}

              {mode === 'invite_setup' && invitePreview && (
                <div>
                  <h1 className="text-xl font-extrabold text-white tracking-tight">
                    Complete Your Account Setup
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Invited by <strong className="text-slate-200">{invitePreview.invitedBy}</strong> to join the{' '}
                    <strong className="text-[#f05e17]">{invitePreview.department}</strong> department.
                  </p>
                </div>
              )}

              {mode === 'password_reset' && resetPreview && (
                <div>
                  <h1 className="text-xl font-extrabold text-white tracking-tight">
                    Choose a New Password
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Resetting password for <strong className="text-slate-200">{resetPreview.name}</strong> ({resetPreview.email}).
                  </p>
                </div>
              )}
            </div>

            {/* Session Expired Inactivity Notice */}
            {sessionExpiredReason && mode === 'signin' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{sessionExpiredReason}</div>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Info Banner */}
            {infoMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{infoMsg}</div>
              </div>
            )}

            {/* MODE 1: FIRST-RUN SUPER ADMIN SETUP */}
            {mode === 'super_admin_setup' && (
              <form onSubmit={handleSuperAdminSetupSubmit} className="space-y-4" autoComplete="off">
                <div className="p-3 rounded-xl bg-[#131a2d] border border-[#232d42] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Super Admin</span>
                    <span className="font-bold text-white">{superAdminName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Login Handle</span>
                    <span className="font-mono font-bold text-[#f05e17] select-all">{superAdminEmail}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#f05e17]" />
                    <span>Create Password (10+ characters)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={10}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a strong password"
                      className="w-full px-3.5 py-2.5 pr-10 bg-[#141b2e] border border-[#26324d] rounded-xl text-white text-sm focus:outline-none focus:border-[#f05e17] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#f05e17]" />
                    <span>Confirm Password</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={10}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 bg-[#141b2e] border border-[#26324d] rounded-xl text-white text-sm focus:outline-none focus:border-[#f05e17] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Securing Super Admin Account...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Save Password &amp; Sign In</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* MODE 2: STANDARD SIGN-IN */}
            {mode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4" autoComplete="on">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#f05e17]" />
                    <span>Login Handle or Username</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={`phelane@${towerDomain}`}
                    className="w-full px-3.5 py-2.5 bg-[#141b2e] border border-[#26324d] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#f05e17] transition-colors"
                  />
                  <div className="text-[11px] text-slate-500">
                    Enter your full <span className="font-mono">@{towerDomain}</span> handle or just the prefix before <span className="font-mono">@</span>.
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#f05e17]" />
                      <span>Password</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotHelp((v) => !v)}
                      className="text-[11px] text-[#f05e17] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3.5 py-2.5 pr-10 bg-[#141b2e] border border-[#26324d] rounded-xl text-white text-sm focus:outline-none focus:border-[#f05e17] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {showForgotHelp && (
                  <div className="p-3 rounded-xl bg-[#131a2d] border border-[#232d42] text-xs text-slate-300 leading-relaxed">
                    Ask <strong className="text-white">{superAdminName}</strong> (Super Admin) to generate a single-use <strong className="text-[#f05e17]">Password Reset Link</strong> from the Team Dashboard so you can choose a new password privately.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* MODE 3: INVITEE SELF-SETUP WITH LOCKED @tconnect.tower SUFFIX & READ-ONLY PRE-DECIDED ACCESS */}
            {mode === 'invite_setup' && invitePreview && (
              <form onSubmit={handleInviteActivationSubmit} className="space-y-4" autoComplete="off">
                {/* Pre-Decided Department & Allowed Tabs (Read-Only) */}
                <div className="p-3.5 rounded-xl bg-[#131a2d] border border-[#232d42] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#f05e17]" />
                      <span>Assigned Department</span>
                    </span>
                    <span className="font-bold text-white">{invitePreview.department}</span>
                  </div>
                  <div className="pt-2 border-t border-[#1f283d] space-y-1.5">
                    <div className="text-[11px] font-medium text-slate-400">
                      Your pre-approved tabs ({resolvedInviteTabs.length}):
                    </div>
                    <div className="space-y-1">
                      {resolvedInviteTabs.map((tab) => (
                        <div key={tab.id} className="flex items-start gap-2 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-200">{tab.label}</span>
                            <span className="text-slate-400"> — {tab.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#f05e17]" />
                    <span>Your Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Thabo Mokoena"
                    className="w-full px-3.5 py-2.5 bg-[#141b2e] border border-[#26324d] rounded-xl text-white text-sm focus:outline-none focus:border-[#f05e17] transition-colors"
                  />
                </div>

                {/* Locked @tconnect.tower Handle Prefix Input */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#f05e17]" />
                    <span>Choose Your Login Handle</span>
                  </label>
                  <div className="flex items-stretch rounded-xl border border-[#26324d] focus-within:border-[#f05e17] overflow-hidden bg-[#141b2e] transition-colors">
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={30}
                      value={handlePrefix}
                      onChange={(e) => {
                        const sanitized = e.target.value
                          .toLowerCase()
                          .replace(/@.*$/, '')
                          .replace(/[^a-z0-9._-]/g, '');
                        setHandlePrefix(sanitized);
                      }}
                      placeholder="first.last"
                      className="flex-1 min-w-0 px-3.5 py-2.5 bg-transparent text-white font-mono text-sm focus:outline-none"
                    />
                    <div className="px-3 flex items-center bg-[#0c1120] border-l border-[#26324d] text-[#f05e17] font-mono text-xs font-bold select-none shrink-0">
                      @{towerDomain}
                    </div>
                  </div>
                  <div className="min-h-[18px] text-[11px] font-mono">
                    {handleStatus.checking && (
                      <span className="text-slate-400">Checking availability...</span>
                    )}
                    {!handleStatus.checking && handleStatus.available === true && (
                      <span className="text-emerald-400">{handleStatus.message}</span>
                    )}
                    {!handleStatus.checking && handleStatus.available === false && (
                      <span className="text-rose-400">{handleStatus.message}</span>
                    )}
                  </div>
                </div>

                {/* Create Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Create Password (10+ chars)</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={10}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 10 characters"
                      className="w-full px-3 py-2.5 bg-[#141b2e] border border-[#26324d] rounded-xl text-white text-sm focus:outline-none focus:border-[#f05e17]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Confirm Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={10}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2.5 bg-[#141b2e] border border-[#26324d] rounded-xl text-white text-sm focus:outline-none focus:border-[#f05e17]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded accent-[#f05e17]"
                  />
                  <span>Show password characters</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || handleStatus.available === false}
                  className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Activating Your Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Activate Account &amp; Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* MODE 4: PASSWORD RESET LINK */}
            {mode === 'password_reset' && resetPreview && (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-4" autoComplete="off">
                <div className="p-3 rounded-xl bg-[#131a2d] border border-[#232d42] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Account</span>
                    <span className="font-mono font-bold text-[#f05e17]">{resetPreview.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Department</span>
                    <span className="text-white font-semibold">{resetPreview.department}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">New Password (10+ characters)</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={10}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="w-full px-3.5 py-2.5 bg-[#141b2e] border border-[#26324d] rounded-xl text-white text-sm focus:outline-none focus:border-[#f05e17]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Confirm New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={10}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full px-3.5 py-2.5 bg-[#141b2e] border border-[#26324d] rounded-xl text-white text-sm focus:outline-none focus:border-[#f05e17]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'Updating Password...' : 'Save New Password & Sign In'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearUrlToken();
                    setResetPreview(null);
                    setErrorMsg(null);
                    setInfoMsg(null);
                    setMode('signin');
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Back to Sign In
                </button>
              </form>
            )}

            {/* Quiet Security Footer */}
            <div className="pt-3 text-[11px] font-mono text-slate-500 border-t border-[#1b233a] flex items-center justify-between">
              <span>T-Connect Control Tower</span>
              <span>Auto-signs out after 2h idle</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-4 text-center text-xs font-mono text-slate-500 border-t border-[#1b233a]/60">
        T-Connect Lesotho · Maseru Network Operations
      </footer>
    </div>
  );
};
