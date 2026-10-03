import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Fingerprint, 
  Key, 
  Lock, 
  Check, 
  Copy, 
  RefreshCw, 
  Smartphone, 
  AlertTriangle,
  Server,
  Database
} from 'lucide-react';

interface SecurityAuthViewProps {
  biometricActive: boolean;
  onToggleBiometric: () => void;
}

export const SecurityAuthView: React.FC<SecurityAuthViewProps> = ({
  biometricActive,
  onToggleBiometric,
}) => {
  const [totpCode, setTotpCode] = useState('');
  const [totpVerified, setTotpVerified] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [encryptionKey] = useState('tC_aesGcm_K991_48f9e021a834c90e21b8f83726a1094d=');
  const [tokenPepper] = useState('c9a8f23018247df8392019483710294817263548910293847561029384756102');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Security Hardening, Biometrics &amp; Cryptography</h1>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Enterprise zero-trust architecture: WebAuthn biometric passkeys, mandatory TOTP MFA, AES-256-GCM at rest
        </p>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="bg-[#0f1422] p-4 rounded-xl border border-emerald-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span>MFA ENFORCEMENT</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white">MANDATORY</div>
          <p className="text-[11px] text-emerald-400 mt-1">Enforced for Owner, Admin &amp; Technical roles</p>
        </div>

        <div className="bg-[#0f1422] p-4 rounded-xl border border-cyan-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span>DATA ENCRYPTION</span>
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white">AES-256-GCM</div>
          <p className="text-[11px] text-cyan-400 mt-1">Provider secrets &amp; router keys encrypted</p>
        </div>

        <div className="bg-[#0f1422] p-4 rounded-xl border border-purple-500/30">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span>ROUTER ISOLATION</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white">WIREGUARD ONLY</div>
          <p className="text-[11px] text-purple-400 mt-1">API ports never exposed to public internet</p>
        </div>
      </div>

      {/* Biometric Passkey & WebAuthn Integration */}
      <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-[#f05e17]" />
            <div>
              <h2 className="text-sm font-extrabold text-white uppercase font-mono tracking-wider">
                WEBAUTHN BIOMETRIC AUTHENTICATION (TOUCH ID / FACE ID)
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Hardware-backed FIDO2 / WebAuthn passkey authentication for administrative login sessions
              </p>
            </div>
          </div>

          <button
            onClick={onToggleBiometric}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors flex items-center gap-2 ${
              biometricActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                : 'bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            <span>{biometricActive ? 'Biometric Passkey Active' : 'Enable Touch ID / Passkey'}</span>
          </button>
        </div>

        <div className="p-4 bg-[#161d31] rounded-lg border border-[#232d42] text-xs font-mono text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Registered Authenticator:</span>
            <span className="text-white font-bold">MacBook Touch ID / Secure Enclave (FIDO2)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Credential ID:</span>
            <span className="text-emerald-400 font-mono">pk_fido2_9981240a1b9c201</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Status:</span>
            <span className="text-slate-200">
              {biometricActive ? 'Session verified with hardware authenticator' : 'Fallback to standard MFA password'}
            </span>
          </div>
        </div>
      </div>

      {/* TOTP 2FA Authenticator Setup Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              TIME-BASED ONE-TIME PASSWORD (TOTP MFA)
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">
            Scan with Google Authenticator, Authy, or 1Password. Mandatory for Owner and Technical users before issuing router commands.
          </p>

          {/* Simulated QR Code Box */}
          <div className="flex items-center gap-4 p-3 bg-[#161d31] rounded-lg border border-[#232d42]">
            <div className="w-24 h-24 bg-white p-2 rounded-lg flex items-center justify-center shrink-0">
              {/* Minimal SVG Matrix simulating QR */}
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                <rect width="100" height="100" fill="#FFFFFF"/>
                <rect x="10" y="10" width="30" height="30" fill="#000000"/>
                <rect x="15" y="15" width="20" height="20" fill="#FFFFFF"/>
                <rect x="20" y="20" width="10" height="10" fill="#000000"/>
                <rect x="60" y="10" width="30" height="30" fill="#000000"/>
                <rect x="65" y="15" width="20" height="20" fill="#FFFFFF"/>
                <rect x="70" y="20" width="10" height="10" fill="#000000"/>
                <rect x="10" y="60" width="30" height="30" fill="#000000"/>
                <rect x="15" y="65" width="20" height="20" fill="#FFFFFF"/>
                <rect x="20" y="70" width="10" height="10" fill="#000000"/>
                <rect x="50" y="50" width="15" height="15" fill="#000000"/>
                <rect x="70" y="50" width="20" height="10" fill="#000000"/>
                <rect x="50" y="70" width="10" height="20" fill="#000000"/>
                <rect x="70" y="75" width="15" height="15" fill="#000000"/>
              </svg>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <span className="text-slate-400 block text-[10px]">MANUAL ENROLLMENT SECRET</span>
              <span className="text-[#f05e17] font-bold block select-all">JBSW Y3DP EHPK 3PXP</span>
              <span className="text-[10px] text-slate-500 block">Issuer: T-Connect Maseru</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Account Protected with TOTP
            </span>
          </div>
        </div>

        {/* Cryptographic Secrets at Rest */}
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#f05e17]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              CRYPTOGRAPHIC KEY VAULT (SECRETS AT REST)
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>APP_ENCRYPTION_KEY (AES-256-GCM)</span>
                <button
                  onClick={() => handleCopy(encryptionKey, 'enc')}
                  className="text-slate-400 hover:text-white"
                >
                  {copiedKey === 'enc' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <input
                type="password"
                readOnly
                value={encryptionKey}
                className="w-full px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded text-slate-300 select-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>TOKEN_PEPPER (HMAC Voucher Hashes)</span>
                <button
                  onClick={() => handleCopy(tokenPepper, 'pep')}
                  className="text-slate-400 hover:text-white"
                >
                  {copiedKey === 'pep' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <input
                type="password"
                readOnly
                value={tokenPepper}
                className="w-full px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded text-slate-300 select-all"
              />
            </div>
          </div>

          <div className="p-3 bg-[#121929] rounded-lg border border-[#1e273d] flex items-start gap-2.5 text-slate-400 text-[11px] leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong>Secret Backup Rule:</strong> Never lose these master keys. Losing `APP_ENCRYPTION_KEY` renders router WireGuard private keys unrecoverable and requires full re-adoption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
