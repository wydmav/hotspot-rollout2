import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Download, 
  ShieldCheck, 
  Smartphone, 
  Zap, 
  Clock, 
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Copy,
  Check,
  Edit3,
  Trash2,
  RotateCcw,
  Printer,
  FileText,
  Wifi
} from 'lucide-react';
import { HotspotPlan, Voucher, VerticalType, PaymentTransaction } from '../../types';
import { ExportService } from '../../services/exportService';
import { storage } from '../../services/storage';
import { copyToClipboard } from '../../utils/clipboard';

interface PlansVouchersViewProps {
  plans: HotspotPlan[];
  vouchers: Voucher[];
  transactions?: PaymentTransaction[];
  onCreatePlan: (plan: Omit<HotspotPlan, 'id'>) => void;
  onGenerateBatch: (planId: string, count: number) => Voucher[];
  onRedeemVoucher: (code: string, mac: string, hostname?: string) => any;
  selectedVertical: VerticalType | 'all';
  currency: string;
  voucherThreshold?: number;
  onUpdateVoucherThreshold?: (threshold: number) => void;
  onTriggerVoucherCheck?: () => void;
}

export const PlansVouchersView: React.FC<PlansVouchersViewProps> = ({
  plans,
  vouchers,
  transactions = [],
  onCreatePlan,
  selectedVertical,
  currency,
}) => {
  const [voucherSearch, setVoucherSearch] = useState('');
  const [ledgerChannelFilter, setLedgerChannelFilter] = useState<'all' | 'mpesa' | 'ecocash' | 'ott'>('all');
  const [liveGuestEvents, setLiveGuestEvents] = useState<any[]>([]);
  const [copiedVoucherId, setCopiedVoucherId] = useState<string | null>(null);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HotspotPlan | null>(null);
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null);
  const [confirmDeleteVoucherId, setConfirmDeleteVoucherId] = useState<string | null>(null);
  const [uniqueRefInput, setUniqueRefInput] = useState('');

  // Plan form state (Unlimited Devices enforced nationwide)
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(10);
  const [planVertical, setPlanVertical] = useState<VerticalType>('hotspot');
  const [planDurationHours, setPlanDurationHours] = useState(24);
  const [planDownMbps, setPlanDownMbps] = useState(4);
  const [planUpMbps, setPlanUpMbps] = useState(2);
  const [planDataCapGb, setPlanDataCapGb] = useState<number | ''>('');
  const [inlinePriceEdits, setInlinePriceEdits] = useState<Record<string, string>>({});
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Sync live M-Pesa, EcoCash & 16-Digit OTT settlements from server
  useEffect(() => {
    let active = true;
    const loadLiveBilling = () => {
      fetch('/api/portal/guest-connect')
        .then((r) => r.json())
        .then((d) => {
          if (active && d && d.success && Array.isArray(d.records)) {
            setLiveGuestEvents(d.records);
          }
        })
        .catch(() => {});
    };
    loadLiveBilling();
    const timer = setInterval(loadLiveBilling, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const filteredPlans = selectedVertical === 'all'
    ? plans
    : plans.filter(p => p.vertical === selectedVertical);

  const filteredVouchers = vouchers.filter(v => {
    const matchesVertical =
      selectedVertical === 'all' ||
      plans.find(p => p.id === v.planId)?.vertical === selectedVertical;
    const matchesSearch = voucherSearch === '' || 
      v.code.toLowerCase().includes(voucherSearch.toLowerCase()) || 
      v.planName.toLowerCase().includes(voucherSearch.toLowerCase());
    return matchesVertical && matchesSearch;
  });

  // Unified real-time M-Pesa, EcoCash & 16-Digit OTT Ledger (mirrors Fleet Overview)
  const unifiedPaymentLedger = React.useMemo(() => {
    type LedgerRow = {
      id: string;
      channel: 'mpesa' | 'ecocash' | 'ott';
      channelLabel: string;
      reference: string;
      customer: string;
      phone: string;
      planName: string;
      amount: number;
      siteName: string;
      vertical: string;
      mac: string;
      timestamp: string;
      status: string;
      durationHours: number;
      voucherId?: string;
    };

    const rows: LedgerRow[] = [];
    const seenKeys = new Set<string>();

    // 1. Live server guest-connect paid records (M-Pesa, EcoCash, OTT Voucher)
    liveGuestEvents.forEach((ev: any) => {
      const isFree = ev.accessType === 'free' || ev.mode === 'free' || ev.paymentMethod === 'free_wifi';
      const amt = Number(ev.amount) || 0;
      if (isFree && amt <= 0) return;

      const rawMethod = String(ev.paymentMethod || ev.mode || '').toLowerCase();
      const channel: 'mpesa' | 'ecocash' | 'ott' = rawMethod.includes('mpesa')
        ? 'mpesa'
        : rawMethod.includes('ecocash')
          ? 'ecocash'
          : 'ott';
      const ref = String(ev.transactionRef || ev.ottVoucherPin || ev.voucherCode || ev.id || 'PAID');
      const dedupeKey = `${channel}_${ref}_${String(ev.mac || ev.clientMac || '').toUpperCase()}`;
      if (seenKeys.has(dedupeKey)) return;
      seenKeys.add(dedupeKey);

      const durSec = Number(ev.durationSeconds) || (amt >= 180 ? 2592000 : amt >= 50 ? 604800 : 86400);
      rows.push({
        id: `ev_${ev.id || dedupeKey}`,
        channel,
        channelLabel: channel === 'mpesa' ? 'M-Pesa' : channel === 'ecocash' ? 'EcoCash' : '16-Digit OTT',
        reference: ref,
        customer: String(ev.guestName || `${ev.firstName || ''} ${ev.lastName || ''}`.trim() || 'Hotspot Subscriber'),
        phone: String(ev.guestPhone || ev.phone || '—'),
        planName: String(ev.planName || (amt >= 180 ? 'Monthly Pass' : amt >= 50 ? 'Weekly Pass' : 'Daily Pass')),
        amount: amt > 0 ? amt : 10,
        siteName: String(ev.siteName || ev.routerName || 'T-Connect Hotspot'),
        vertical: String(ev.scope || ev.vertical || 'hotspot').toLowerCase(),
        mac: String(ev.mac || ev.clientMac || 'AUTO').toUpperCase(),
        timestamp: String(ev.capturedAt || new Date().toISOString()),
        status: 'SETTLED',
        durationHours: Math.max(1, Math.round(durSec / 3600))
      });
    });

    // 2. Completed PayLesotho / M-Pesa / EcoCash / OTT transactions
    transactions.forEach((tx) => {
      if (tx.status !== 'completed') return;
      const rawProv = String(tx.channel || tx.provider || '').toLowerCase();
      const channel: 'mpesa' | 'ecocash' | 'ott' = rawProv.includes('mpesa')
        ? 'mpesa'
        : rawProv.includes('ecocash')
          ? 'ecocash'
          : 'ott';
      const ref = String(tx.transactionRef || tx.ottVoucherPin || tx.voucherCodeIssued || tx.id);
      if (rows.some((r) => r.reference === ref)) return;
      rows.push({
        id: `tx_${tx.id}`,
        channel,
        channelLabel: channel === 'mpesa' ? 'M-Pesa' : channel === 'ecocash' ? 'EcoCash' : '16-Digit OTT',
        reference: ref,
        customer: String(tx.customerName || 'Mobile Subscriber'),
        phone: String(tx.phoneNumber || '—'),
        planName: String(tx.planName || 'Hotspot Pass'),
        amount: Number(tx.amount) || 0,
        siteName: String(tx.siteName || 'T-Connect Hotspot'),
        vertical: String(tx.vertical || 'hotspot').toLowerCase(),
        mac: 'WALLET',
        timestamp: String(tx.completedAt || tx.createdAt || new Date().toISOString()),
        status: 'SETTLED',
        durationHours: 24
      });
    });

    // 3. Redeemed 16-Digit OTT vouchers from storage
    filteredVouchers.forEach((v) => {
      if (rows.some((r) => r.reference.replace(/\D/g, '') === v.code.replace(/\D/g, '') && v.code.replace(/\D/g, '').length >= 8)) {
        return;
      }
      rows.push({
        id: `vch_${v.id}`,
        channel: 'ott',
        channelLabel: '16-Digit OTT',
        reference: v.code,
        customer: v.associatedDevices[0]?.hostname || 'OTT Subscriber',
        phone: '—',
        planName: v.planName,
        amount: Number(v.price) || 0,
        siteName: v.siteName || 'T-Connect Hotspot',
        vertical: String(plans.find((p) => p.id === v.planId)?.vertical || 'hotspot'),
        mac: v.associatedDevices[0]?.mac || 'UNBOUND',
        timestamp: v.firstUsedAt || v.generatedAt,
        status: v.status.toUpperCase(),
        durationHours: Math.max(1, Math.round((v.durationSeconds || 86400) / 3600)),
        voucherId: v.id
      });
    });

    return rows
      .filter((r) => selectedVertical === 'all' || r.vertical === selectedVertical)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [liveGuestEvents, transactions, filteredVouchers, plans, selectedVertical]);

  const billingChannelSummary = React.useMemo(() => {
    const mpesaRows = unifiedPaymentLedger.filter((r) => r.channel === 'mpesa');
    const ecocashRows = unifiedPaymentLedger.filter((r) => r.channel === 'ecocash');
    const ottRows = unifiedPaymentLedger.filter((r) => r.channel === 'ott');
    const mpesaRev = mpesaRows.reduce((s, r) => s + r.amount, 0);
    const ecocashRev = ecocashRows.reduce((s, r) => s + r.amount, 0);
    const ottRev = ottRows.reduce((s, r) => s + r.amount, 0);
    return {
      totalMobileRevenue: mpesaRev + ecocashRev + ottRev,
      totalCount: unifiedPaymentLedger.length,
      mpesaRev,
      mpesaCount: mpesaRows.length,
      ecocashRev,
      ecocashCount: ecocashRows.length,
      ottRev,
      ottCount: ottRows.length
    };
  }, [unifiedPaymentLedger]);

  const displayedLedgerRows = React.useMemo(() => {
    return unifiedPaymentLedger.filter((r) => {
      const matchesChannel = ledgerChannelFilter === 'all' || r.channel === ledgerChannelFilter;
      const q = voucherSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        r.reference.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.planName.toLowerCase().includes(q) ||
        r.siteName.toLowerCase().includes(q);
      return matchesChannel && matchesSearch;
    });
  }, [unifiedPaymentLedger, ledgerChannelFilter, voucherSearch]);

  // 16-Digit OTT Voucher Live Inspector State
  const [ottPin, setOttPin] = useState('');
  const [ottMobile, setOttMobile] = useState('26658000000');
  const [ottResult, setOttResult] = useState<{
    success: boolean;
    message: string;
    receipt?: string;
    planName?: string;
    amount?: number;
    stages?: any[];
  } | null>(null);
  const [isVerifyingOtt, setIsVerifyingOtt] = useState(false);

  const handleVerifyOttPin = async () => {
    const clean = ottPin.replace(/\D/g, '');
    const cleanRef = uniqueRefInput.trim();
    if (clean.length !== 16 && !uniqueRefInput.trim()) {
      setOttResult({
        success: false,
        message: 'Enter a 16-digit OTT Voucher PIN or a PayLesotho unique_reference to verify.'
      });
      return;
    }
    setIsVerifyingOtt(true);
    setOttResult(null);
    const defaultPlan = filteredPlans[0] || plans[0];
    const checkAmount = defaultPlan ? defaultPlan.price : 10;
    try {
      if (cleanRef) {
        const res = await fetch('/api/gateways/paylesotho/ott-voucher/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unique_reference: cleanRef
          })
        });
        const data = await res.json();
        setOttResult({
          success: Boolean(data.success),
          message: data.message || 'Checked via POST https://api.paylesotho.co.ls/ott/voucher/check',
          receipt: cleanRef,
          planName: data.planName || defaultPlan?.name || 'Daily Pass (24 Hours)',
          amount: data.amount || checkAmount,
          stages: data.diagnosticStages
        });
      } else {
        const res = await fetch('/api/gateways/ottvoucher/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pin: clean,
            mobile: ottMobile,
            amount: checkAmount
          })
        });
        const data = await res.json();
        setOttResult({
          success: Boolean(data.success),
          message: data.message || (data.success ? '16-Digit PIN validated with OTT Lesotho API' : 'Verification failed'),
          receipt: `OTT-${clean.slice(-4)}`,
          planName: defaultPlan?.name || 'Daily Pass (24 Hours)',
          amount: checkAmount,
          stages: data.diagnosticStages
        });
      }
    } catch (err: any) {
      setOttResult({
        success: false,
        message: err.message || 'Failed to reach OTT verification gateway'
      });
    } finally {
      setIsVerifyingOtt(false);
    }
  };

  const handleExportOttLedger = () => {
    ExportService.exportVouchersToCsv(filteredVouchers);
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setPlanName('');
    setPlanPrice(10);
    setPlanVertical(selectedVertical === 'all' ? 'hotspot' : selectedVertical);
    setPlanDurationHours(24);
    setPlanDownMbps(10);
    setPlanUpMbps(5);
    setPlanDataCapGb('');
    setShowCreatePlanModal(true);
  };

  const openEditModal = (plan: HotspotPlan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanPrice(plan.price);
    setPlanVertical(plan.vertical);
    setPlanDurationHours(Math.max(1, Math.round(plan.durationSeconds / 3600)));
    setPlanDownMbps(plan.downloadSpeedMbps);
    setPlanUpMbps(plan.uploadSpeedMbps);
    setPlanDataCapGb(plan.dataCapMb ? Math.round(plan.dataCapMb / 1024) : '');
    setShowCreatePlanModal(true);
  };

  const handleInlinePriceCommit = (plan: HotspotPlan, rawVal: string) => {
    const parsed = Number(rawVal);
    if (isNaN(parsed) || parsed < 0) return;
    storage.updatePlan(plan.id, { price: parsed, deviceLimit: 0 });
    setInlinePriceEdits((prev) => {
      const next = { ...prev };
      delete next[plan.id];
      return next;
    });
    setSyncNotice(
      `Synced ${plan.name} (${currency}${parsed.toFixed(2)}) automatically across all 5 hotspot scopes, OTT Denominations, Captive Portal & Live Routers!`
    );
    setTimeout(() => setSyncNotice(null), 5000);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) return;

    const payload = {
      name: planName.trim(),
      vertical: planVertical,
      price: planPrice,
      currency,
      durationSeconds: planDurationHours * 3600,
      durationLabel: planDurationHours >= 24 && planDurationHours % 24 === 0 ? `${planDurationHours / 24} Day(s)` : `${planDurationHours} Hours`,
      dataCapMb: planDataCapGb ? Number(planDataCapGb) * 1024 : null,
      downloadSpeedMbps: planDownMbps,
      uploadSpeedMbps: planUpMbps,
      deviceLimit: 0,
      burstDownloadMbps: planDownMbps * 2,
      burstUploadMbps: planUpMbps * 2,
    };

    if (editingPlan) {
      storage.updatePlan(editingPlan.id, payload);
      setSyncNotice(
        `Updated "${payload.name}" (${currency}${payload.price.toFixed(2)}) & pushed in real time to OTT Denomination Policy, Captive Portal & All Routers!`
      );
    } else {
      onCreatePlan(payload);
      storage.syncAllPlansEverywhere();
      setSyncNotice(
        `Created "${payload.name}" (${currency}${payload.price.toFixed(2)}) & synced across Captive Portal & Routers!`
      );
    }
    setTimeout(() => setSyncNotice(null), 5000);

    setShowCreatePlanModal(false);
    setEditingPlan(null);
    setPlanName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Hotspot Plans, Vouchers &amp; Entitlements</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time synchronized pricing across Billing, OTT Lesotho Denominations, Captive Portal &amp; MikroTik Routers (Zero Device Caps)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              storage.syncAllPlansEverywhere();
              setSyncNotice('All Hotspot Plans & Denominations pushed live to Captive Portal & Routers!');
              setTimeout(() => setSyncNotice(null), 4000);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
            title="Push all current plan prices to Captive Portal and MikroTik Routers immediately"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sync Plans Everywhere</span>
          </button>
          <button
            type="button"
            onClick={() => {
              storage.resetStarterPlans();
              setSyncNotice('Restored default plans and synced across Portal & Routers.');
              setTimeout(() => setSyncNotice(null), 4000);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#161d31] hover:bg-[#1f2942] border border-[#232d42] text-slate-300 hover:text-white text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
            title="Restore default hotspot pricing plans"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Restore Starter Plans</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Plan</span>
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{syncNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-emerald-300 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredPlans.map((plan) => {
          const inlineVal = inlinePriceEdits[plan.id];
          const isInlineEditing = inlineVal !== undefined;
          return (
            <div
              key={plan.id}
              className={`p-5 rounded-xl border relative flex flex-col justify-between ${
                plan.isPopular
                  ? 'bg-[#121929] border-[#f05e17]/50 shadow-md'
                  : 'bg-[#0f1422] border-[#232d42]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                  <span className="uppercase">{plan.vertical}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                      Unlimited Devices
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditModal(plan)}
                      className="p-1 text-cyan-400 hover:text-white hover:bg-cyan-500/20 rounded transition-colors cursor-pointer"
                      title="Edit Plan"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeletePlanId === plan.id ? (
                      <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/50 rounded px-1.5 py-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            storage.deletePlan(plan.id);
                            setConfirmDeletePlanId(null);
                          }}
                          className="text-[10px] font-bold text-rose-300 hover:text-white cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePlanId(null)}
                          className="text-[10px] text-slate-400 hover:text-white ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeletePlanId(plan.id)}
                        className="p-1 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded transition-colors cursor-pointer"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-base font-extrabold text-white">{plan.name}</h3>

                {/* Quick Inline Price Editor */}
                <div className="mt-3 flex items-center justify-between gap-2 font-mono">
                  {isInlineEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-lg font-black text-slate-300">{currency}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={inlineVal}
                        onChange={(e) =>
                          setInlinePriceEdits((prev) => ({ ...prev, [plan.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlinePriceCommit(plan, inlineVal);
                          if (e.key === 'Escape') {
                            setInlinePriceEdits((prev) => {
                              const next = { ...prev };
                              delete next[plan.id];
                              return next;
                            });
                          }
                        }}
                        className="w-28 px-2.5 py-1 bg-[#161d31] border border-[#f05e17] rounded-lg text-white font-black text-base focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleInlinePriceCommit(plan, inlineVal)}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-lg cursor-pointer"
                      >
                        Sync
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-white">
                        {currency}{plan.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400">/ {plan.durationLabel}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setInlinePriceEdits((prev) => ({ ...prev, [plan.id]: String(plan.price) }))
                        }
                        className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-[#161d31] hover:bg-[#1f2942] text-amber-300 border border-amber-500/30 rounded cursor-pointer"
                        title="Click to quickly change price and sync everywhere"
                      >
                        Quick Change Price
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#1f283d] space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Speed Limits:</span>
                    <span className="text-emerald-400 font-bold">{plan.downloadSpeedMbps}M down / {plan.uploadSpeedMbps}M up</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data Volume:</span>
                    <span className="text-slate-200">{plan.dataCapMb ? `${plan.dataCapMb / 1024} GB Cap` : 'Unlimited Quota'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Burst Profile:</span>
                    <span className="text-cyan-400 font-bold">{plan.burstDownloadMbps || plan.downloadSpeedMbps * 2}M Burst</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#1f283d] flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">OTT Denomination:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  Exact {currency}{plan.price.toFixed(2)} Match
                </span>
              </div>
            </div>
          );
        })}
      </div>



      {/* ======================================================= */}
      {/* PAYLESOTHO & 16-DIGIT OTT VOUCHER DENOMINATION POLICY   */}
      {/* ======================================================= */}
      <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white font-mono flex items-center gap-2">
                PAYLESOTHO AGGREGATOR &amp; 16-DIGIT OTT VOUCHER ENFORCEMENT
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  100% Live Synchronized Denominations
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Zero self-generated platform vouchers. Subscribers pay the exact synchronized plan price ({filteredPlans.map((p) => `${currency}${p.price}`).join(' / ')}) via PayLesotho (M-Pesa / EcoCash / XPayments) or redeem an official 16-digit OTT Voucher PIN.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-200">
            <div className="text-[11px] text-slate-400 mb-1">1. PayLesotho (T-Connect)</div>
            <div className="text-sm font-bold text-emerald-400">M-Pesa (62915) &middot; EcoCash (63165430)</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Merchant Name: T-Connect</div>
          </div>
          <div className="p-3 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-200">
            <div className="text-[11px] text-slate-400 mb-1">2. Generate &amp; Check OTT PIN</div>
            <div className="text-sm font-bold text-amber-300">POST /api/ott/voucher/get</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Issued only after verified wallet debit</div>
          </div>
          <div className="p-3 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-200">
            <div className="text-[11px] text-slate-400 mb-1">3. Live Denominations Active</div>
            <div className="text-sm font-bold text-cyan-400">
              {filteredPlans.map((p) => `${currency}${p.price.toFixed(0)}`).join(' · ') || 'None'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{vouchers.length} Verified OTT Redemptions</div>
          </div>
        </div>
      </div>

      {/* 16-Digit OTT Voucher Live Inspector & Official OTT Lesotho Network */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 16-Digit OTT Voucher Inspector */}
        <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#f05e17]" />
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                16-DIGIT OTT VOUCHER &amp; PAYLESOTHO CHECK
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              POST /ott/voucher/check
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Verify an official 16-digit OTT Voucher PIN or check a purchased OTT voucher via <code className="text-emerald-300">POST https://api.paylesotho.co.ls/ott/voucher/check</code> using <code className="text-cyan-300">unique_reference</code>.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-slate-400 block mb-1">16-Digit OTT PIN (Digits only)</label>
              <input
                type="text"
                maxLength={16}
                value={ottPin}
                onChange={(e) => setOttPin(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 5821948201948291"
                className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono tracking-widest text-sm focus:outline-none focus:border-[#f05e17]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-400 block mb-1">unique_reference (PayLesotho Check)</label>
                <input
                  type="text"
                  value={uniqueRefInput}
                  onChange={(e) => setUniqueRefInput(e.target.value)}
                  placeholder="e.g. PayRefMP123456"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-cyan-300 font-mono text-xs focus:outline-none focus:border-[#f05e17]"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Subscriber Mobile Number (MSISDN)</label>
                <input
                  type="text"
                  value={ottMobile}
                  onChange={(e) => setOttMobile(e.target.value)}
                  placeholder="26658000000"
                  className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-[#f05e17]"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleVerifyOttPin}
            disabled={isVerifyingOtt || (ottPin.length !== 16 && !uniqueRefInput.trim())}
            className="w-full py-2 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-50 text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {isVerifyingOtt ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>
              {isVerifyingOtt
                ? 'Verifying OTT Voucher...'
                : uniqueRefInput.trim()
                  ? 'Check OTT Voucher via POST /ott/voucher/check'
                  : 'Verify 16-Digit OTT PIN'}
            </span>
          </button>

          {ottResult && (
            <div className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 ${
              ottResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {ottResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{ottResult.success ? 'Verified Official OTT Voucher' : 'Verification Alert'}</span>
              </div>
              <p className="text-[11px] text-slate-300">{ottResult.message}</p>
              {ottResult.receipt && (
                <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-emerald-500/20">
                  <span>Serial Receipt: {ottResult.receipt}</span>
                  <span>Amount: {currency}{ottResult.amount} ({ottResult.planName})</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Official OTT Lesotho Network Integration Card — Dynamically Synchronized with Active Plans */}
        <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                OFFICIAL OTT LESOTHO NETWORK
              </h2>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">Live Synced Denominations</span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs leading-relaxed">
            <p className="font-bold mb-1">Real-Time Denomination Synchronization Active</p>
            <p className="text-[11px] text-slate-300">
              Any change to Hotspot Plans above immediately updates the Official OTT Lesotho Network denominations, Captive Portal packages, and MikroTik router profiles in real time.
            </p>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {filteredPlans.map((plan) => (
              <div
                key={`ott_denom_${plan.id}`}
                className="p-2.5 bg-[#161d31] rounded-lg border border-[#232d42] flex items-center justify-between"
              >
                <div>
                  <span className="text-white font-bold block">
                    {plan.name} ({plan.durationLabel})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {plan.downloadSpeedMbps}M/{plan.uploadSpeedMbps}M &middot; Unlimited devices &middot; Exact {currency}{plan.price.toFixed(2)} OTT PIN
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-extrabold text-sm">
                    {currency}{plan.price.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#232d42] cursor-pointer"
                    title="Edit plan denomination"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Revenue KPI Strip (Mirrors Fleet Overview: Total Mobile Revenue, M-Pesa, EcoCash, 16-Digit OTT) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f1422] border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-emerald-300 text-[11px] font-mono uppercase">
            <span>Mobile Revenue</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1.5 tabular-nums">
            {currency}{billingChannelSummary.totalMobileRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {billingChannelSummary.totalCount} total paid settlements
          </div>
        </div>

        <div className="bg-[#0f1422] border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-red-300 text-[11px] font-mono uppercase">
            <span>M-Pesa (62915)</span>
            <Smartphone className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400 font-mono mt-1.5 tabular-nums">
            {currency}{billingChannelSummary.mpesaRev.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {billingChannelSummary.mpesaCount} M-Pesa settlements
          </div>
        </div>

        <div className="bg-[#0f1422] border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-blue-300 text-[11px] font-mono uppercase">
            <span>EcoCash (63165430)</span>
            <Smartphone className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono mt-1.5 tabular-nums">
            {currency}{billingChannelSummary.ecocashRev.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {billingChannelSummary.ecocashCount} EcoCash settlements
          </div>
        </div>

        <div className="bg-[#0f1422] border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-amber-300 text-[11px] font-mono uppercase">
            <span>16-Digit OTT Vouchers</span>
            <Ticket className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1.5 tabular-nums">
            {currency}{billingChannelSummary.ottRev.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {billingChannelSummary.ottCount} OTT PIN redemptions
          </div>
        </div>
      </div>

      {/* Unified Mobile Money (M-Pesa & EcoCash) & 16-Digit OTT Voucher Ledger Table */}
      <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-white">M-Pesa, EcoCash &amp; 16-Digit OTT Voucher Ledger</h3>
            <p className="text-xs text-slate-400 font-mono">Live audit trail of M-Pesa, EcoCash, and official 16-digit OTT Voucher settlements across all Lesotho hotspots</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#161d31] border border-[#232d42] rounded-lg p-0.5 text-[11px] font-mono">
              {([
                { id: 'all', label: `All (${billingChannelSummary.totalCount})` },
                { id: 'mpesa', label: `M-Pesa (${billingChannelSummary.mpesaCount})` },
                { id: 'ecocash', label: `EcoCash (${billingChannelSummary.ecocashCount})` },
                { id: 'ott', label: `OTT (${billingChannelSummary.ottCount})` }
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLedgerChannelFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    ledgerChannelFilter === tab.id
                      ? 'bg-[#f05e17] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportOttLedger}
              className="px-3 py-1 bg-[#161d31] hover:bg-[#1e263b] text-slate-200 border border-[#232d42] rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
            <div className="relative w-52">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={voucherSearch}
                onChange={(e) => setVoucherSearch(e.target.value)}
                placeholder="Search phone, PIN, ref..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono focus:outline-none focus:border-[#f05e17]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-[#0f1422] z-10">
              <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-[#232d42] pb-2">
                <th className="py-2.5">CHANNEL</th>
                <th className="py-2.5">REFERENCE / OTT PIN</th>
                <th className="py-2.5">SUBSCRIBER &amp; SITE</th>
                <th className="py-2.5">PLAN ENTITLEMENT</th>
                <th className="py-2.5">AMOUNT</th>
                <th className="py-2.5">STATUS</th>
                <th className="py-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b233a] text-slate-300">
              {displayedLedgerRows.length > 0 ? (
                displayedLedgerRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#121829]/70">
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                          row.channel === 'mpesa'
                            ? 'bg-red-500/15 text-red-300 border-red-500/40'
                            : row.channel === 'ecocash'
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {row.channelLabel}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-white tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[180px]" title={row.reference}>{row.reference}</span>
                        <button
                          type="button"
                          onClick={() => {
                            void copyToClipboard(row.reference);
                            setCopiedVoucherId(row.id);
                            setTimeout(() => setCopiedVoucherId(null), 1800);
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1e263b] transition-colors cursor-pointer"
                          title="Copy Reference / PIN"
                        >
                          {copiedVoucherId === row.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500">{row.timestamp.replace('T', ' ').slice(0, 19)}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-slate-200 font-bold">{row.customer}</div>
                      <div className="text-[10px] text-slate-400">
                        {row.phone} &middot; {row.siteName}
                      </div>
                    </td>
                    <td className="py-3">
                      <div>{row.planName}</div>
                      <div className="text-[10px] text-slate-500">{row.durationHours}h Validity &middot; Unlimited Devices</div>
                    </td>
                    <td className="py-3 text-emerald-400 font-bold tabular-nums">
                      {currency}{row.amount.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.channel === 'ott' && (
                          <button
                            type="button"
                            onClick={() => setOttPin(row.reference.replace(/\D/g, ''))}
                            className="px-2 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded text-[11px] text-emerald-400 hover:text-white cursor-pointer"
                          >
                            Inspect PIN
                          </button>
                        )}
                        {row.voucherId && (
                          confirmDeleteVoucherId === row.voucherId ? (
                            <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/50 rounded px-1.5 py-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  storage.deleteVoucher(row.voucherId!);
                                  setConfirmDeleteVoucherId(null);
                                }}
                                className="text-[10px] font-bold text-rose-300 hover:text-white cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteVoucherId(null)}
                                className="text-[10px] text-slate-400 hover:text-white ml-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteVoucherId(row.voucherId!)}
                              className="p-1 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded transition-colors cursor-pointer"
                              title="Delete Voucher Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Ticket className="w-6 h-6 mx-auto text-slate-600" />
                      <p className="text-slate-400 font-medium">No M-Pesa, EcoCash or OTT Payments Recorded Yet</p>
                      <p className="text-[11px] text-slate-500">
                        Live M-Pesa, EcoCash, and 16-digit OTT Voucher settlements will appear here automatically in real time.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Plan Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <h3 className="text-base font-extrabold text-white">
                {editingPlan ? `Edit Hotspot Plan: ${editingPlan.name}` : 'Create New Hotspot Plan'}
              </h3>
              <button
                onClick={() => {
                  setShowCreatePlanModal(false);
                  setEditingPlan(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Monthly Pass"
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Vertical Scope</label>
                  <select
                    value={planVertical}
                    onChange={(e) => setPlanVertical(e.target.value as VerticalType)}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  >
                    <option value="hotspot">☕ Hotspot</option>
                    <option value="village">🏡 Village / Mesh</option>
                    <option value="bus">🚌 Bus / Transit</option>
                    <option value="stadium">🏟️ Stadium / Arena</option>
                    <option value="park">🌳 Municipal Park</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Price ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={planDurationHours}
                    onChange={(e) => setPlanDurationHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Download Speed (Mbps)</label>
                  <input
                    type="number"
                    min="1"
                    value={planDownMbps}
                    onChange={(e) => setPlanDownMbps(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Upload Speed (Mbps)</label>
                  <input
                    type="number"
                    min="1"
                    value={planUpMbps}
                    onChange={(e) => setPlanUpMbps(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Public Rollout Policy</span>
                  <span className="text-xs font-extrabold text-white mt-0.5">Unlimited Devices (No Limit)</span>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Data Cap (GB, blank = unlimited)</label>
                  <input
                    type="number"
                    min="1"
                    value={planDataCapGb}
                    onChange={(e) => setPlanDataCapGb(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#232d42] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePlanModal(false);
                    setEditingPlan(null);
                  }}
                  className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingPlan ? 'Save & Sync Everywhere' : 'Save & Sync Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};
