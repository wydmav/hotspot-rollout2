import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Radio, 
  UserCheck, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Eye,
  EyeOff
} from 'lucide-react';
import { storage } from '../../services/storage';
import { authService, ADMIN_EMAIL, ForgotPasswordResponse } from '../../services/auth';
import { AuthSession, TeamMember } from '../../types';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  teamMembers: TeamMember[];
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, teamMembers }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<ForgotPasswordResponse | null>(null);
  const [copiedTempPass, setCopiedTempPass] = useState(false);

  // Parse invite/reset URL hash params on mount & trigger instant authentication if invite token present
  useEffect(() => {
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

    if (emailHint) {
      setEmail(emailHint);
      setForgotEmail(emailHint);
    }

    if (token) {
      setIsLoading(true);
      setTimeout(() => {
        const res = storage.redeemInviteToken(token, emailHint);
        if (res.success && res.session) {
          window.history.replaceState(null, '', window.location.pathname);
          onLoginSuccess(res.session);
        } else {
          setIsLoading(false);
          setErrorMsg(res.message);
        }
      }, 300);
    }
  }, [onLoginSuccess]);

  const [showPassword, setShowPassword] = useState(false);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      const res = storage.login(email.trim(), password);
      setIsLoading(false);
      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        setErrorMsg(res.message);
      }
    }, 400);
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

  const handleCopyTempPassword = (pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedTempPass(true);
    setTimeout(() => setCopiedTempPass(false), 2000);
  };

  const handleUseTempPassword = (tempPass: string) => {
    setEmail(forgotEmail.trim());
    setPassword(tempPass);
    setShowForgotModal(false);
    setForgotStatus(null);
  };

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#f05e17] selection:text-white relative overflow-hidden">
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
                CLOUD CONTROLLER
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Lesotho Hotspot &amp; MikroTik Network Infrastructure
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
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
                Enter your authorized credentials or authenticate via admin profile.
              </p>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Administrator Email Quick-Fill Chip */}
            <div className="flex items-center justify-between p-2.5 bg-[#141a29] rounded-xl border border-[#1f283d] text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-[#f05e17] to-[#d94c0b] text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  RP
                </div>
                <div className="min-w-0">
                  <div className="text-white font-bold text-[11px] truncate">Raphooko Phooko</div>
                  <div className="text-[10px] text-slate-400 truncate">rphooko@tconnect.africa</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('rphooko@tconnect.africa');
                  setErrorMsg(null);
                }}
                className="px-2.5 py-1 bg-[#1a233a] hover:bg-[#253252] border border-[#2b3752] text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-colors shrink-0"
              >
                Use Admin Email
              </button>
            </div>

            {/* Standard Credentials Form */}
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
                  placeholder="rphooko@tconnect.africa"
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
                      setForgotEmail(email || 'rphooko@tconnect.africa');
                      setShowForgotModal(true);
                      setForgotStatus(null);
                    }}
                    className="text-[11px] font-mono text-[#f05e17] hover:text-[#ff7e42] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[#161d31] border border-[#232d42] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#f05e17] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
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
                    <ArrowRight className="w-3.5 h-3.5 text-[#f05e17]" />
                  </>
                )}
              </button>
            </form>

            {/* Active Team Roster Preview */}
            <div className="pt-2 text-[11px] font-mono text-slate-500 border-t border-[#1b233a] flex items-center justify-between">
              <span>Tenant: T-Connect Maseru</span>
              <span>{teamMembers.length} Authorized Operator{teamMembers.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1322] border border-[#232d42] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <div className="flex items-center gap-2 text-white font-bold">
                <KeyRound className="w-4 h-4 text-[#f05e17]" />
                <span>Reset Account Password</span>
              </div>
              <button 
                onClick={() => { setShowForgotModal(false); setForgotStatus(null); }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {!forgotStatus ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Enter your registered team email address. Your request will route directly to network administrator 
                  <strong className="text-white"> Raphooko Phooko</strong> (<span className="text-[#f05e17]">rphooko@tconnect.africa</span>) 
                  who will issue a temporary password for you to authenticate.
                </p>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Your Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="colleague@tconnect.africa"
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white text-xs focus:outline-none focus:border-[#f05e17]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg text-xs"
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
                        <span>Sending to Raphooko...</span>
                      </>
                    ) : (
                      <>
                        <span>Route Request to Raphooko</span>
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
                    <span>Reset Request Routed to Raphooko Phooko</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    An administrative alert was dispatched to <strong className="text-white">rphooko@tconnect.africa</strong>. 
                    A secure temporary password was auto-generated and saved to your member profile.
                  </p>
                </div>

                {/* Simulated Email Dispatch Receipt */}
                {forgotStatus.simulatedEmail && (
                  <div className="p-3 bg-[#111728] rounded-xl border border-[#1f283d] space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#f05e17]" />
                        <span>Simulated Dispatch Target:</span>
                      </span>
                      <span className="text-emerald-400 font-bold font-mono">rphooko@tconnect.africa</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Delivery Status:</span>
                      <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        Delivered
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate font-mono">
                      Ref: {forgotStatus.simulatedEmail.messageId}
                    </div>
                  </div>
                )}

                {/* Generated Temporary Password Disclosure for Testing */}
                {forgotStatus.tempPassword && (
                  <div className="p-3 bg-[#161d31] rounded-xl border border-[#232d42] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Generated Temporary Password:</span>
                      <span className="text-emerald-400 font-bold">Ready to Authenticate</span>
                    </div>

                    <div className="flex items-center justify-between bg-[#080b14] px-3 py-2 rounded-lg border border-[#1b233a]">
                      <span className="font-mono font-black text-sm text-[#f05e17] tracking-wider">
                        {forgotStatus.tempPassword}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTempPassword(forgotStatus.tempPassword!)}
                        className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-[#161d31] px-2 py-1 rounded"
                      >
                        {copiedTempPass ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedTempPass ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400">
                      Use this temporary password in the login form to immediately authenticate into your dashboard.
                    </p>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#232d42]">
                  <a
                    href={`mailto:rphooko@tconnect.africa?subject=Password%20Reset%20Request%20for%20${encodeURIComponent(forgotEmail)}&body=Hi%20Raphooko,%0A%0APlease%20confirm%20my%20temporary%20password%20for%20T-Connect%20login:%20${encodeURIComponent(forgotStatus.tempPassword || '')}%0A%0AThanks!`}
                    className="text-[11px] text-[#f05e17] hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Email Raphooko Directly</span>
                  </a>

                  {forgotStatus.tempPassword && (
                    <button
                      type="button"
                      onClick={() => handleUseTempPassword(forgotStatus.tempPassword!)}
                      className="px-3.5 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Fill Password &amp; Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
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
