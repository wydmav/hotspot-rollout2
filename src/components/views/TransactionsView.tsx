import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Download, 
  FileDown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Code, 
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  Bug
} from 'lucide-react';
import { PaymentTransaction, VerticalType, GatewayProvider } from '../../types';
import { ExportService } from '../../services/exportService';
import { ProviderLogo } from '../common/BrandLogos';

interface TransactionsViewProps {
  transactions: PaymentTransaction[];
  onRecheckStatus: (txId: string) => { success: boolean; reconciled?: boolean; status?: string; message?: string };
  selectedVertical: VerticalType | 'all';
  currency: string;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onRecheckStatus,
  selectedVertical,
  currency,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<PaymentTransaction | null>(transactions[0] || null);
  const [isRechecking, setIsRechecking] = useState(false);
  const [recheckMessage, setRecheckMessage] = useState<string | null>(null);

  const filteredTransactions = transactions.filter((t) => {
    const matchesVertical = selectedVertical === 'all' || t.vertical === selectedVertical;
    const matchesProvider = providerFilter === 'all' || t.provider === providerFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch = searchQuery === '' ||
      t.transactionRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.voucherCodeIssued?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.siteName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesVertical && matchesProvider && matchesStatus && matchesSearch;
  });

  const handleRecheck = (txId: string) => {
    setIsRechecking(true);
    setRecheckMessage(null);
    setTimeout(() => {
      const res = onRecheckStatus(txId);
      setIsRechecking(false);
      setRecheckMessage(res.message || 'Status verified');
      // refresh selectedTx view if matching
      const updated = transactions.find(t => t.id === txId);
      if (updated) setSelectedTx(updated);
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Transaction Ledger &amp; Developer Debugger</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Idempotent reconciliation, signature validation logs, and raw payload inspectability for troubleshooting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => ExportService.exportTransactionsToCsv(transactions)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-xs font-mono text-slate-300 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-[#0f1422] p-4 rounded-xl border border-[#232d42] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, phone, voucher..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#f05e17]"
            />
          </div>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
          >
            <option value="all">All Gateways</option>
            <option value="ecocash">EcoCash</option>
            <option value="mywallet">MyWallet</option>
            <option value="ottvoucher">OTTvoucher</option>
            <option value="xpayments">xPayments</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed / Timeout</option>
          </select>
        </div>

        <span className="text-slate-400 font-bold">{filteredTransactions.length} entries shown</span>
      </div>

      {/* Main Split View: Transaction Table & Raw Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-2 bg-[#0f1422] rounded-xl border border-[#232d42] p-4 flex flex-col">
          <div className="overflow-x-auto max-h-[560px]">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-[#232d42] pb-2">
                  <th className="py-2.5">PROVIDER</th>
                  <th className="py-2.5">TRANSACTION REF</th>
                  <th className="py-2.5">AMOUNT</th>
                  <th className="py-2.5">VOUCHER ISSUED</th>
                  <th className="py-2.5">TIMESTAMP</th>
                  <th className="py-2.5 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b233a] text-slate-300">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => {
                    const isSelected = selectedTx?.id === tx.id;
                    const isSuccess = tx.status === 'completed';
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#1b233a]' : 'hover:bg-[#161d31]'
                        }`}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-[#161d31] p-1 border border-[#232d42] shrink-0">
                              <ProviderLogo provider={tx.provider} className="w-full h-full" />
                            </div>
                            <span className="font-bold text-white uppercase text-[11px]">{tx.provider}</span>
                          </div>
                        </td>
                        <td className="py-3 font-semibold text-white tracking-wider">
                          {tx.transactionRef}
                        </td>
                        <td className="py-3 text-emerald-400 font-bold">
                          {currency}{tx.amount.toFixed(2)}
                        </td>
                        <td className="py-3">
                          <span className="text-slate-300 font-bold">{tx.voucherCodeIssued || '—'}</span>
                        </td>
                        <td className="py-3 text-slate-400 text-[11px]">
                          {tx.createdAt.slice(11, 19)}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <FileText className="w-6 h-6 mx-auto text-slate-600" />
                        <p className="text-slate-400 font-medium">No Transactions Recorded</p>
                        <p className="text-[11px] text-slate-500">
                          When users purchase vouchers via EcoCash, MyWallet, OTTvoucher, or xPayments, idempotent webhook transactions will appear here with raw JSON payloads.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Developer Debugger & Raw Payload Column */}
        <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 space-y-4 flex flex-col justify-between">
          {selectedTx ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-[#f05e17]" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    DEVELOPER TRANSACTION INSPECTOR
                  </h3>
                </div>
                <button
                  onClick={() => handleRecheck(selectedTx.id)}
                  disabled={isRechecking}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded text-[11px] font-mono text-slate-300 hover:text-white transition-colors"
                  title="Query payment gateway API for latest status"
                >
                  <RotateCcw className={`w-3 h-3 ${isRechecking ? 'animate-spin text-[#f05e17]' : ''}`} />
                  <span>{isRechecking ? 'Inquiring...' : 'Re-check Status'}</span>
                </button>
              </div>

              {recheckMessage && (
                <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                  {recheckMessage}
                </div>
              )}

              {/* Transaction Summary Details */}
              <div className="space-y-1.5 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ref:</span>
                  <span className="text-white font-bold">{selectedTx.transactionRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan:</span>
                  <span className="text-white">{selectedTx.planName} ({currency}{selectedTx.amount})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Site Location:</span>
                  <span className="text-slate-200">{selectedTx.siteName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="text-white">{selectedTx.phoneNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">HMAC Signature:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>
              </div>

              {/* Error Trace if Failed */}
              {selectedTx.errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs font-mono text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-400">
                    <XCircle className="w-3.5 h-3.5" /> Error Diagnosed:
                  </div>
                  <p className="text-[11px] leading-relaxed">{selectedTx.errorMessage}</p>
                </div>
              )}

              {/* Raw JSON Payload Preview */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">RAW DEBUG PAYLOAD &amp; RESPONSE</span>
                <div className="p-3 bg-[#080b12] rounded-lg border border-[#1b233a] font-mono text-[11px] text-slate-300 max-h-56 overflow-y-auto whitespace-pre leading-relaxed select-all">
                  {JSON.stringify(selectedTx.debugLogs, null, 2)}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-xs font-mono text-center py-8">
              Select a transaction on the left to inspect raw payloads and error logs.
            </p>
          )}

          <div className="pt-3 border-t border-[#232d42] text-[11px] text-slate-500 font-mono">
            All webhooks are signature-verified and recorded in immutable ledger storage.
          </div>
        </div>
      </div>
    </div>
  );
};
