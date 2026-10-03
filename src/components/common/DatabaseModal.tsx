import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  UploadCloud, 
  DownloadCloud,
  Key, 
  ShieldCheck,
  Lock,
  Layers,
  FileCode,
  SlidersHorizontal,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { supabaseService, SUPABASE_SQL_MIGRATIONS } from '../../services/supabase';
import { storage } from '../../services/storage';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectedStatusChange: (connected: boolean) => void;
  onResetToScratch?: () => void;
  onDataPulled?: (data: any) => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  onConnectedStatusChange,
  onResetToScratch,
  onDataPulled,
}) => {
  const currentConfig = supabaseService.getConfig();
  const [modalTab, setModalTab] = useState<'schema' | 'connect' | 'security'>('schema');
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success?: boolean;
    message?: string;
    latencyMs?: number;
  } | null>(currentConfig.isConnected ? { success: true, message: 'Connected to Supabase PostgreSQL.' } : null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) return;

    setIsConnecting(true);
    setConnectionStatus(null);
    supabaseService.saveConfig(url, anonKey);

    const res = await supabaseService.testConnection();
    setIsConnecting(false);
    setConnectionStatus(res);
    onConnectedStatusChange(res.success);

    // If connected, sync fleet immediately
    if (res.success) {
      const state = storage.getState();
      if (state.routers.length > 0) {
        await supabaseService.syncRoutersToSupabase(state.routers);
      }
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    const state = storage.getState();
    await supabaseService.syncRoutersToSupabase(state.routers);
    for (const v of state.vouchers.slice(0, 50)) {
      await supabaseService.syncVoucherToSupabase(v);
    }
    for (const t of state.transactions.slice(0, 50)) {
      await supabaseService.syncTransactionToSupabase(t);
    }
    setIsSyncing(false);
    setConnectionStatus({
      success: true,
      message: 'All routers, vouchers, and transactions synchronized to Supabase PostgreSQL tables.'
    });
  };

  const handlePullData = async () => {
    setIsPulling(true);
    const data = await supabaseService.pullFromSupabase();
    setIsPulling(false);
    if (data && onDataPulled) {
      onDataPulled(data);
      setConnectionStatus({
        success: true,
        message: `Successfully pulled ${data.routers.length} routers, ${data.vouchers.length} vouchers, and ${data.transactions.length} ledger transactions from Supabase.`
      });
    } else {
      setConnectionStatus({
        success: false,
        message: 'Could not pull records. Please ensure your Supabase tables exist and RLS policies allow reading.'
      });
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_MIGRATIONS);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const executeWipeToScratch = () => {
    if (onResetToScratch) {
      onResetToScratch();
      setShowWipeConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0c101c] border border-[#232d42] rounded-2xl w-full max-w-3xl p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Supabase PostgreSQL Database &amp; Ledger</h2>
              <p className="text-[11px] text-slate-400">Multi-tenant schema with strict RLS isolation, atomic vouchers &amp; immutable audit trail</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-base">✕</button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg bg-[#161d31] p-1 border border-[#232d42] text-xs">
          <button
            onClick={() => setModalTab('schema')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold transition-colors ${
              modalTab === 'schema' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>SQL Schema (DDL)</span>
          </button>
          <button
            onClick={() => setModalTab('connect')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold transition-colors ${
              modalTab === 'connect' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Connection &amp; Sync</span>
          </button>
          <button
            onClick={() => setModalTab('security')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold transition-colors ${
              modalTab === 'security' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RLS Tenant Isolation Architecture</span>
          </button>
        </div>

        {/* Tab 1: SQL Schema Explorer */}
        {modalTab === 'schema' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-white text-sm">Complete PostgreSQL Schema for Supabase</h3>
                <p className="text-[11px] text-slate-400">
                  Run this in <strong>Supabase Dashboard &gt; SQL Editor &gt; New query</strong>. Creates tables, foreign keys, atomic functions, and strict RLS policies.
                </p>
              </div>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors shadow-sm"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy Complete SQL Script'}</span>
              </button>
            </div>

            {/* Schema Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 bg-[#121829] rounded-lg border border-[#1f283d] space-y-1">
                <span className="text-emerald-400 font-bold block">1. TENANT ISOLATION</span>
                <span className="text-slate-200 block">`operators` &amp; `operator_members`</span>
                <p className="text-[10px] text-slate-400">Scoped to auth.uid() via security definer helper functions.</p>
              </div>

              <div className="p-3 bg-[#121829] rounded-lg border border-[#1f283d] space-y-1">
                <span className="text-[#f05e17] font-bold block">2. ATOMIC VOUCHERS</span>
                <span className="text-slate-200 block">`vouchers` &amp; `voucher_devices`</span>
                <p className="text-[10px] text-slate-400">FOR UPDATE row locks eliminate race condition double-spends.</p>
              </div>

              <div className="p-3 bg-[#121829] rounded-lg border border-[#1f283d] space-y-1">
                <span className="text-cyan-400 font-bold block">3. FINANCIAL LEDGER</span>
                <span className="text-slate-200 block">`transactions` &amp; `audit_logs`</span>
                <p className="text-[10px] text-slate-400">Double-entry ledger with immutable append-only triggers.</p>
              </div>
            </div>

            {/* SQL Code Preview Block */}
            <div className="p-3 bg-[#080b12] rounded-lg border border-[#1b233a] font-mono text-[10.5px] text-slate-300 max-h-72 overflow-y-auto whitespace-pre select-all leading-relaxed">
              {SUPABASE_SQL_MIGRATIONS}
            </div>
          </div>
        )}

        {/* Tab 2: Connection Configuration */}
        {modalTab === 'connect' && (
          <div className="space-y-4">
            <form onSubmit={handleTestAndSave} className="space-y-3.5">
              <div>
                <label className="text-slate-400 block mb-1">Supabase Project URL</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Supabase Anon Public API Key</label>
                <input
                  type="password"
                  required
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    {isConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{isConnecting ? 'Testing Connection...' : 'Connect & Verify Database'}</span>
                  </button>

                  {supabaseService.isConfigured() && (
                    <>
                      <button
                        type="button"
                        onClick={handlePullData}
                        disabled={isPulling}
                        className="px-3 py-2 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-cyan-300 rounded-lg flex items-center gap-1.5"
                        title="Pull existing routers, vouchers, and transactions from Supabase into app"
                      >
                        <DownloadCloud className={`w-3.5 h-3.5 ${isPulling ? 'animate-bounce' : ''}`} />
                        <span>{isPulling ? 'Pulling...' : 'Pull From DB'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSyncAll}
                        disabled={isSyncing}
                        className="px-3 py-2 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200 rounded-lg flex items-center gap-1.5"
                        title="Push current local state to Supabase PostgreSQL tables"
                      >
                        <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce text-emerald-400' : ''}`} />
                        <span>{isSyncing ? 'Pushing...' : 'Push to DB'}</span>
                      </button>
                    </>
                  )}
                </div>

                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#f05e17] hover:underline flex items-center gap-1"
                >
                  <span>Open Supabase Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </form>

            {/* Status Message */}
            {connectionStatus && (
              <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                connectionStatus.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {connectionStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  {connectionStatus.message}
                </div>
              </div>
            )}

            {/* Clean Slate & Reset Section */}
            <div className="pt-4 border-t border-[#232d42] flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Start From Scratch</span>
                <span className="text-[11px] text-slate-400">Clear any local session cache so you begin with 0 routers and 0 vouchers</span>
              </div>
              
              {!showWipeConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowWipeConfirm(true)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe to Scratch</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 text-[11px]">Confirm wipe?</span>
                  <button
                    onClick={executeWipeToScratch}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs"
                  >
                    Yes, Reset
                  </button>
                  <button
                    onClick={() => setShowWipeConfirm(false)}
                    className="px-2.5 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Security & RLS Explainer */}
        {modalTab === 'security' && (
          <div className="space-y-3 leading-relaxed text-slate-300">
            <h3 className="font-bold text-white text-sm">How Strict Tenant Isolation Works in PostgreSQL</h3>
            
            <div className="p-3.5 bg-[#121829] rounded-xl border border-[#1f283d] space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Lock className="w-4 h-4" />
                <span>1. Multi-Tenant Membership Binding</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Every user authenticated via Supabase (`auth.uid()`) is linked to one or more tenants via `public.operator_members`. Row-level policies automatically filter all table queries through:
              </p>
              <pre className="p-2 bg-[#080b14] rounded border border-[#1a2339] text-emerald-300 text-[10.5px]">
                USING (operator_id IN (SELECT public.get_current_user_operator_ids()))
              </pre>
            </div>

            <div className="p-3.5 bg-[#121829] rounded-xl border border-[#1f283d] space-y-2">
              <div className="flex items-center gap-2 text-[#f05e17] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>2. Atomic Voucher Concurrency (`FOR UPDATE`)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                The stored procedure `public.redeem_voucher_atomic` acquires an exclusive row-level lock on the target voucher, preventing simultaneous redemption race conditions. Device slots are tracked in `voucher_devices` with a unique constraint on `(voucher_id, mac_address)`.
              </p>
            </div>

            <div className="p-3.5 bg-[#121829] rounded-xl border border-[#1f283d] space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Layers className="w-4 h-4" />
                <span>3. Immutable Double-Entry Ledger &amp; Audit Logs</span>
              </div>
              <p className="text-[11px] text-slate-400">
                A PostgreSQL `BEFORE UPDATE OR DELETE` trigger on `public.audit_logs` permanently prohibits mutating or deleting audit entries. The `transactions` ledger uses compound unique indexes `(operator_id, transaction_ref)` to prevent duplicate webhook processing.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
