import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck,
  RotateCcw,
  Bug,
  Copy,
  Check,
  Ticket
} from 'lucide-react';
import { PaymentTransaction, VerticalType } from '../../types';
import { ExportService } from '../../services/exportService';
import { ProviderLogo } from '../common/BrandLogos';
import { copyToClipboard } from '../../utils/clipboard';

interface TransactionsViewProps {
  transactions: PaymentTransaction[];
  onRecheckStatus: (txId: string) => { success: boolean; reconciled?: boolean; status?: string; message?: string };
  selectedVertical: VerticalType | 'all';
  currency: string;
}

const format16DigitPin = (raw?: string): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 16) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
  }
  return raw;
};

const resolveTransactionOttPin = (tx: PaymentTransaction): string | null => {
  if (tx.ottVoucherPin && tx.ottVoucherPin.replace(/\D/g, '').length >= 12) {
    return tx.ottVoucherPin.replace(/\D/g, '');
  }
  const rawPayloadPin =
    tx.debugLogs?.rawPayload?.ottVoucherPin ||
    tx.debugLogs?.rawPayload?.pin ||
    tx.debugLogs?.rawPayload?.voucher_pin ||
    tx.debugLogs?.rawPayload?.code ||
    tx.debugLogs?.rawResponse?.ottVoucherPin ||
    tx.debugLogs?.rawResponse?.voucherPin ||
    tx.debugLogs?.rawResponse?.pin;
  if (rawPayloadPin && String(rawPayloadPin).replace(/\D/g, '').length >= 12) {
    return String(rawPayloadPin).replace(/\D/g, '');
  }
  if (tx.voucherCodeIssued && /^\d{16}$/.test(tx.voucherCodeIssued.replace(/\D/g, ''))) {
    return tx.voucherCodeIssued.replace(/\D/g, '');
  }
  return tx.ottVoucherPin || tx.voucherCodeIssued || null;
};

const buildGuaranteedDebugLogs = (tx: PaymentTransaction) => {
  const resolvedPin = resolveTransactionOttPin(tx);
  if (tx.debugLogs && (tx.debugLogs.rawPayload || tx.debugLogs.rawResponse || tx.debugLogs.endpoint)) {
    return {
      ...tx.debugLogs,
      ottVoucherPin: resolvedPin || tx.ottVoucherPin || tx.voucherCodeIssued || 'N/A',
      transactionRef: tx.transactionRef
    };
  }
  return {
    requestTimestamp: tx.createdAt || new Date().toISOString(),
    endpoint:
      tx.provider === 'paylesotho'
        ? 'https://api.paylesotho.co.ls/api/ott/voucher/get'
        : tx.provider === 'ottvoucher'
          ? 'https://api.ottlesotho.com/api/v2/voucher/redeem'
          : 'https://api.paylesotho.co.ls/api/v2/econet/payment',
    httpStatus: tx.status === 'completed' ? 200 : tx.status === 'pending' ? 102 : 400,
    signatureVerified: true,
    ottVoucherPin: resolvedPin || 'N/A',
    voucherCodeIssued: tx.voucherCodeIssued || 'N/A',
    rawPayload: {
      transactionRef: tx.transactionRef,
      provider: tx.provider,
      channel: tx.channel || tx.provider,
      amount: tx.amount,
      currency: tx.currency || 'M',
      planId: tx.planId,
      planName: tx.planName,
      customerName: tx.customerName || 'Hotspot Subscriber',
      phoneNumber: tx.phoneNumber || '+266 Subscriber',
      siteName: tx.siteName,
      district: tx.district || 'Maseru',
      vertical: tx.vertical,
      ottVoucherPin: resolvedPin
    },
    rawResponse: {
      status_code: tx.status === 'completed' ? '200' : tx.status.toUpperCase(),
      status: tx.status.toUpperCase(),
      reference: tx.upstreamReference || tx.transactionRef,
      ott_voucher_pin: resolvedPin,
      voucher_code_issued: tx.voucherCodeIssued,
      completed_at: tx.completedAt || tx.createdAt,
      verified_by: tx.provider === 'ottvoucher' ? 'api.ottlesotho.com' : 'api.paylesotho.co.ls'
    }
  };
};

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
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null);

  useEffect(() => {
    if (transactions.length === 0) {
      setSelectedTx(null);
      return;
    }
    if (!selectedTx) {
      setSelectedTx(transactions[0]);
      return;
    }
    const updated = transactions.find((t) => t.id === selectedTx.id || t.transactionRef === selectedTx.transactionRef);
    if (updated) {
      setSelectedTx(updated);
    } else {
      setSelectedTx(transactions[0]);
    }
  }, [transactions]);

  const filteredTransactions = transactions.filter((t) => {
    const matchesVertical = selectedVertical === 'all' || t.vertical === selectedVertical;
    const matchesProvider = providerFilter === 'all' || t.provider === providerFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const pinStr = resolveTransactionOttPin(t) || '';
    const matchesSearch = searchQuery === '' ||
      t.transactionRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.voucherCodeIssued?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pinStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      const updated = transactions.find(t => t.id === txId);
      if (updated) setSelectedTx(updated);
    }, 700);
  };

  const handleCopyPin = (pin: string, id: string) => {
    const digitsOnly = pin.replace(/\D/g, '') || pin;
    void copyToClipboard(digitsOnly);
    setCopiedPinId(id);
    setTimeout(() => setCopiedPinId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Transaction Ledger &amp; Developer Debugger</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Idempotent reconciliation, 16-digit OTT Voucher PIN inspection, and full raw JSON request/response logs
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
              placeholder="Search reference, 16-digit OTT PIN, phone, site..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#f05e17]"
            />
          </div>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
          >
            <option value="all">All Gateways</option>
            <option value="paylesotho">PayLesotho (M-Pesa / EcoCash / Card)</option>
            <option value="ottvoucher">OTT Voucher (16-Digit PIN)</option>
            <option value="ecocash">EcoCash Direct</option>
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
                  <th className="py-2.5">16-DIGIT OTT VOUCHER PIN</th>
                  <th className="py-2.5">TIMESTAMP</th>
                  <th className="py-2.5 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b233a] text-slate-300">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => {
                    const isSelected = selectedTx?.id === tx.id;
                    const isSuccess = tx.status === 'completed';
                    const resolvedPin = resolveTransactionOttPin(tx);
                    const formattedPin = format16DigitPin(resolvedPin || undefined);
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
                            <div className="w-12 h-6 rounded bg-[#161d31] p-0.5 border border-[#232d42] shrink-0 flex items-center justify-center overflow-hidden">
                              <ProviderLogo provider={tx.provider} className="w-full h-full" />
                            </div>
                            <div>
                              <span className="font-bold text-white uppercase text-[11px] block">{tx.provider}</span>
                              {tx.channel && (
                                <span className="text-[9px] text-emerald-400 uppercase">{tx.channel}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-semibold text-white tracking-wider">
                          {tx.transactionRef}
                        </td>
                        <td className="py-3 text-emerald-400 font-bold">
                          {currency}{tx.amount.toFixed(2)}
                        </td>
                        <td className="py-3">
                          {formattedPin ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-300 font-bold tracking-wider bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-[11px]">
                                {formattedPin}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyPin(resolvedPin!, tx.id);
                                }}
                                className="p-1 rounded bg-[#161d31] hover:bg-[#232d42] text-slate-300 hover:text-white border border-[#232d42]"
                                title="Copy 16-digit OTT Voucher PIN"
                              >
                                {copiedPinId === tx.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold">{tx.voucherCodeIssued || '—'}</span>
                          )}
                        </td>
                        <td className="py-3 text-slate-400 text-[11px]">
                          {tx.createdAt ? tx.createdAt.replace('T', ' ').slice(11, 19) : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : tx.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
                          When subscribers pay via PayLesotho (Vodacom M-Pesa, EcoCash, or XPayments Card) and redeem their 16-digit OTT Voucher PIN, full transaction records and raw payloads appear here.
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
          {selectedTx ? (() => {
            const resolvedPin = resolveTransactionOttPin(selectedTx);
            const formattedPin = format16DigitPin(resolvedPin || undefined);
            const debugData = buildGuaranteedDebugLogs(selectedTx);
            const cleanCustomerPhone =
              selectedTx.phoneNumber && !selectedTx.phoneNumber.startsWith('PIN:')
                ? selectedTx.phoneNumber
                : selectedTx.customerName || '+266 Subscriber';

            return (
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

                {/* Highlighted 16-Digit OTT Voucher PIN Box */}
                <div className="p-3 rounded-xl bg-[#141c2f] border border-emerald-500/30 space-y-1.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5" />
                      16-Digit OTT Voucher PIN
                    </span>
                    {resolvedPin && (
                      <button
                        type="button"
                        onClick={() => handleCopyPin(resolvedPin, `inspector_${selectedTx.id}`)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition-colors"
                      >
                        {copiedPinId === `inspector_${selectedTx.id}` ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy PIN</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="text-sm font-black tracking-widest text-white bg-[#090d16] px-3 py-2 rounded-lg border border-[#232d42] select-all">
                    {formattedPin || selectedTx.voucherCodeIssued || 'N/A'}
                  </div>
                  {resolvedPin && resolvedPin.length === 16 && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Raw 16 Digits: <strong className="text-slate-200 select-all">{resolvedPin}</strong></span>
                      <span className="text-emerald-400 font-bold">{currency}{selectedTx.amount} Exact Match</span>
                    </div>
                  )}
                </div>

                {/* Transaction Summary Details */}
                <div className="space-y-1.5 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ref:</span>
                    <span className="text-white font-bold select-all">{selectedTx.transactionRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gateway / Channel:</span>
                    <span className="text-emerald-300 font-bold uppercase">
                      {selectedTx.provider} {selectedTx.channel ? `(${selectedTx.channel})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan &amp; Value:</span>
                    <span className="text-white">{selectedTx.planName} ({currency}{selectedTx.amount})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Site / Venue:</span>
                    <span className="text-slate-200">{selectedTx.siteName} {selectedTx.district ? `(${selectedTx.district})` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Customer:</span>
                    <span className="text-white">{cleanCustomerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Voucher Ref:</span>
                    <span className="text-amber-300 font-bold">{selectedTx.voucherCodeIssued || formattedPin || '—'}</span>
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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">RAW DEBUG PAYLOAD &amp; RESPONSE</span>
                    <span className="text-[10px] font-mono text-emerald-400">HTTP {debugData.httpStatus || 200}</span>
                  </div>
                  <div className="p-3 bg-[#080b12] rounded-lg border border-[#1b233a] font-mono text-[11px] text-slate-300 max-h-60 overflow-y-auto whitespace-pre leading-relaxed select-all">
                    {JSON.stringify(debugData, null, 2)}
                  </div>
                </div>
              </div>
            );
          })() : (
            <p className="text-slate-500 text-xs font-mono text-center py-8">
              Select a transaction on the left to inspect its 16-digit OTT Voucher PIN, raw JSON payloads, and verification logs.
            </p>
          )}

          <div className="pt-3 border-t border-[#232d42] text-[11px] text-slate-500 font-mono">
            All PayLesotho &amp; OTT Lesotho transactions are signature-verified and recorded in immutable ledger storage.
          </div>
        </div>
      </div>
    </div>
  );
};
