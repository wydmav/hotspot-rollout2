import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import { storage } from '../../services/storage';
import { authService, ForgotPasswordResponse } from '../../services/auth';
import { AuthSession, TeamMember } from '../../types';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  teamMembers: TeamMember[];
  adminTheme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  teamMembers,
  adminTheme = 'dark',
  onToggleTheme
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<ForgotPasswordResponse | null>(null);

  // Parse invite URL hash params on mount & trigger authentication if valid invite token present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    const search = window.location.search;

    let token = '';
    let emailHint = '';
    let roleHint = '';
    let nameHint = '';

    if (hash.startsWith('#invite') || hash.includes('token=')) {
      const tokenMatch = hash.match(/token=([^&]+)/);
      const emailMatch = hash.match(/email=([^&]+)/);
      const roleMatch = hash.match(/role=([^&]+)/);
      const nameMatch = hash.match(/name=([^&]+)/);
      if (tokenMatch) token = decodeURIComponent(tokenMatch[1]);
      if (emailMatch) emailHint = decodeURIComponent(emailMatch[1]);
      if (roleMatch) roleHint = decodeURIComponent(roleMatch[1]);
      if (nameMatch) nameHint = decodeURIComponent(nameMatch[1]);
    } else if (search.includes('token=') || search.includes('invite=')) {
      const params = new URLSearchParams(search);
      token = params.get('token') || params.get('invite') || '';
      emailHint = params.get('email') || '';
      roleHint = params.get('role') || '';
      nameHint = params.get('name') || '';
    }

    if (emailHint) {
      setEmail(emailHint);
      setForgotEmail(emailHint);
    }

    if (token || (emailHint && (hash.startsWith('#invite') || search.includes('invite')))) {
      setIsLoading(true);
      setTimeout(async () => {
        await storage.syncTeamWithServer();
        const res = storage.redeemInviteToken(token, emailHint, roleHint, nameHint);
        if (res.success && res.session) {
          window.history.replaceState(null, '', window.location.pathname);
          onLoginSuccess(res.session);
        } else {
          setIsLoading(false);
          setErrorMsg(res.message);
        }
      }, 200);
    }
  }, [onLoginSuccess]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    await storage.syncTeamWithServer();

    const res = storage.login(email.trim(), password);
    setIsLoading(false);
    if (res.success && res.session) {
      onLoginSuccess(res.session);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setIsForgotLoading(true);
    try {
      const res = await authService.handleForgotPassword(forgotEmail.trim());
      setForgotStatus(res);
    } catch {
      const fallback = authService.handleForgotPasswordSync(forgotEmail.trim());
      setForgotStatus(fallback);
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div
      data-admin-theme={adminTheme}
      className="min-h-screen bg-[#080b14] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#f05e17] selection:text-white relative overflow-hidden"
    >
      {/* Background Ambience & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(240,94,23,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#f05e17 1px, transparent 1px), linear-gradient(90deg, #f05e17 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Top Brand Bar */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between border-b border-[#1b233a]/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f05e17] to-[#d94c0b] flex items-center justify-center text-white font-black text-base shadow-lg shadow-[#f05e17]/20 border border-white/20">
            T
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              <span>T-CONNECT</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#f05e17]/10 text-[#f05e17] border border-[#f05e17]/30">
                CONTROL TOWER
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Lesotho Hotspot &amp; MikroTik Network Infrastructure
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 hover:text-white text-xs font-mono font-bold transition-colors cursor-pointer"
              title="Toggle Admin Control Tower Light / Dark Theme"
            >
              {adminTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Dark</span>
                </>
              )}
            </button>
          )}
          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Core WireGuard Online</span>
          </span>
        </div>
      </header>

      {/* Main Login Card Viewport */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md space-y-5">
          {/* Main Card */}
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6">
            
            {/* Title & Description */}
            <div className="space-y-1.5 text-center">
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Sign In to T-Connect
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Enter your authorized operator credentials to continue.
              </p>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Standard Credentials Form (No password reveal or quick-fill buttons) */}
            <form onSubmit={handleCredentialsSubmit} className="space-y-4" autoComplete="off">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-[#f05e17]" />
                  <span>Corporate Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@tconnect.africa"
                  className="w-full px-3.5 py-2.5 bg-[#161d31] border border-[#232d42] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#f05e17] transition-colors"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-[#f05e17]" />
                    <span>Account Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email.trim());
                      setShowForgotModal(true);
                      setForgotStatus(null);
                    }}
                    className="text-[11px] font-mono text-[#f05e17] hover:text-[#ff7e42] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-[#161d31] border border-[#232d42] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#f05e17] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white text-xs font-bold font-mono rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#f05e17]/20 cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  <>
                    <span>Authenticate Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Meta */}
            <div className="pt-2 text-[11px] font-mono text-slate-500 border-t border-[#1b233a] flex items-center justify-between">
              <span>Tenant: T-Connect Maseru</span>
              <span>Authorized Access Only</span>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal (Never reveals or displays passwords) */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <div className="flex items-center gap-2 text-white font-bold">
                <KeyRound className="w-4 h-4 text-[#f05e17]" />
                <span>Request Password Reset</span>
              </div>
              <button 
                onClick={() => { setShowForgotModal(false); setForgotStatus(null); }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!forgotStatus ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Enter your registered corporate email address. Your reset request will be logged for the system administrator, who will verify your identity and issue credentials directly to you.
                </p>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Your Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@tconnect.africa"
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white text-xs focus:outline-none focus:border-[#f05e17]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotLoading}
                    className="px-4 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {isForgotLoading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Reset Request</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-emerald-300">
                  <div className="flex items-center gap-2 font-bold text-white text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Password Reset Request Submitted</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {forgotStatus.message}
                  </p>
                </div>

                <div className="pt-2 flex justify-end border-t border-[#232d42]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotStatus(null);
                    }}
                    className="px-4 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs font-mono text-slate-500 border-t border-[#1b233a]/60">
        <div>T-Connect Lesotho · WireGuard Autonomous Mesh · PostgreSQL Double-Entry Ledger</div>
      </footer>
    </div>
  );
};
