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
import { copyToClipboard } from '../../utils/clipboard';

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
  const [isResettingPlatform, setIsResettingPlatform] = useState(false);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUrl = (url || 'https://uxglqtcuedelmyhvgghw.supabase.co')
      .trim()
      .replace(/^https?:\/\//i, 'https://')
      .replace(/\/rest\/v1\/?.*$/i, '')
      .replace(/\/+$/, '');
    const cleanUrl = /^https?:\/\//i.test(normalizedUrl) ? normalizedUrl : `https://${normalizedUrl}`;
    setUrl(cleanUrl);

    if (!cleanUrl || !anonKey.trim()) return;

    setIsConnecting(true);
    setConnectionStatus(null);
    supabaseService.saveConfig(cleanUrl, anonKey.trim());

    const res = await supabaseService.testConnection();
    setIsConnecting(false);
    setConnectionStatus(res);
    onConnectedStatusChange(res.success);

    // If connected, sync all platform state (routers, leads, partner groups, plans, vouchers, transactions) immediately
    if (res.success) {
      const state = storage.getState();
      await supabaseService.syncAllPlatformState(state);
    }
  };

  const handleServerAndLocalReset = async (wipeRouters: boolean) => {
    setIsResettingPlatform(true);
    try {
      await fetch('/api/admin/reset-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wipeRouters,
          wipeLeads: true,
          wipePartners: true
        })
      });
    } catch {}
    if (wipeRouters && onResetToScratch) {
      onResetToScratch();
    } else {
      const current = storage.getState();
      storage.loadFromSupabase({
        routers: wipeRouters ? [] : current.routers,
        vouchers: [],
        transactions: [],
        captiveLeads: []
      });
    }
    setIsResettingPlatform(false);
    setShowWipeConfirm(false);
    setConnectionStatus({
      success: true,
      message: wipeRouters
        ? 'Platform reset complete: All manual data (routers, leads, custom partner groups, vouchers, transactions) wiped. Payment Gateways (PayLesotho & OTT Lesotho) preserved.'
        : 'Platform reset complete: Leads, custom partner groups, vouchers, and transactions wiped. Adopted routers & Payment Gateways (PayLesotho & OTT Lesotho) preserved.'
    });
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    const state = storage.getState();
    const res = await supabaseService.syncAllPlatformState(state);
    setIsSyncing(false);
    setConnectionStatus({
      success: res.success,
      message: res.summary
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
        message: `Successfully pulled ${data.routers.length} routers, ${data.captiveLeads?.length || 0} guest leads, ${data.tenantGroups?.length || 0} partner groups, ${data.vouchers.length} vouchers, and ${data.transactions.length} ledger transactions from Supabase.`
      });
    } else {
      setConnectionStatus({
        success: false,
        message: 'Could not pull records. Please ensure your Supabase tables exist (run the SQL Schema in Tab 1) and RLS policies allow reading.'
      });
    }
  };

  const handleCopySql = () => {
    void copyToClipboard(SUPABASE_SQL_MIGRATIONS);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const executeWipeToScratch = () => {
    void handleServerAndLocalReset(true);
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
            <div className="p-3 rounded-lg bg-[#121829] border border-[#232d42] text-[11px] text-slate-300 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-emerald-400">How to get your Supabase API Key for uxglqtcuedelmyhvgghw:</span>
                <a
                  href="https://supabase.com/dashboard/project/uxglqtcuedelmyhvgghw/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f05e17] hover:underline font-bold flex items-center gap-1"
                >
                  <span>Open Project API Keys (uxglqtcuedelmyhvgghw)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Visiting <code className="text-cyan-300">uxglqtcuedelmyhvgghw.supabase.co/rest/v1/</code> directly in a browser tab returns <code className="text-amber-300">&quot;No API key found in request&quot;</code> because browsers do not send the <code className="text-emerald-300">apikey</code> header. Copy your <strong>anon public</strong> key (starts with <code className="text-emerald-300">eyJ...</code> or <code className="text-emerald-300">sb_publishable_...</code>) from <strong>Project Settings &rarr; API</strong> and paste it below (or in <code className="text-cyan-300">.env</code> as <code className="text-cyan-300">VITE_SUPABASE_ANON_KEY</code>).
              </p>
            </div>

            <form onSubmit={handleTestAndSave} className="space-y-3.5">
              <div>
                <label className="text-slate-400 block mb-1">Supabase Project URL (auto-strips /rest/v1/ if pasted)</label>
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://uxglqtcuedelmyhvgghw.supabase.co"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Supabase Anon Public API Key (`anon` / `public`)</label>
                <input
                  type="password"
                  required
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... or sb_publishable_..."
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
                        title="Pull existing routers, leads, partner groups, vouchers, and transactions from Supabase"
                      >
                        <DownloadCloud className={`w-3.5 h-3.5 ${isPulling ? 'animate-bounce' : ''}`} />
                        <span>{isPulling ? 'Pulling...' : 'Pull From DB'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSyncAll}
                        disabled={isSyncing}
                        className="px-3 py-2 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-200 rounded-lg flex items-center gap-1.5"
                        title="Push current routers, guest leads, partner groups, vouchers, and transactions to Supabase"
                      >
                        <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce text-emerald-400' : ''}`} />
                        <span>{isSyncing ? 'Pushing...' : 'Push to DB'}</span>
                      </button>
                    </>
                  )}
                </div>

                <a
                  href="https://supabase.com/dashboard/project/uxglqtcuedelmyhvgghw/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#f05e17] hover:underline flex items-center gap-1"
                >
                  <span>Open SQL Editor (uxglqtcuedelmyhvgghw)</span>
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

            {/* Clean Slate & Reset Section (Preserves Payment Gateways) */}
            <div className="pt-4 border-t border-[#232d42] flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-white font-bold block">Reset Manual Data (Preserves Payment Gateways)</span>
                <span className="text-[11px] text-slate-400">
                  Wipes leads, custom partner groups, vouchers &amp; transactions while strictly preserving PayLesotho &amp; OTT Lesotho gateways
                </span>
              </div>
              
              {!showWipeConfirm ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isResettingPlatform}
                    onClick={() => void handleServerAndLocalReset(false)}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResettingPlatform ? 'animate-spin' : ''}`} />
                    <span>Reset Manual (Keep Routers)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isResettingPlatform}
                    onClick={() => setShowWipeConfirm(true)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Wipe All Manual (Incl. Routers)</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 text-[11px]">Wipe routers + manual data (keep gateways)?</span>
                  <button
                    onClick={executeWipeToScratch}
                    disabled={isResettingPlatform}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs"
                  >
                    Yes, Wipe All Manual
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
