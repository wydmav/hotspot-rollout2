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
  RotateCcw
} from 'lucide-react';
import { HotspotPlan, Voucher, VerticalType } from '../../types';
import { ExportService } from '../../services/exportService';
import { storage } from '../../services/storage';
import { copyToClipboard } from '../../utils/clipboard';

interface PlansVouchersViewProps {
  plans: HotspotPlan[];
  vouchers: Voucher[];
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
  onCreatePlan,
  selectedVertical,
  currency,
}) => {
  const [voucherSearch, setVoucherSearch] = useState('');
  const [copiedVoucherId, setCopiedVoucherId] = useState<string | null>(null);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HotspotPlan | null>(null);
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null);
  const [confirmDeleteVoucherId, setConfirmDeleteVoucherId] = useState<string | null>(null);
  const [uniqueRefInput, setUniqueRefInput] = useState('');

  // Plan form state
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(10);
  const [planVertical, setPlanVertical] = useState<VerticalType>('hotspot');
  const [planDurationHours, setPlanDurationHours] = useState(24);
  const [planDownMbps, setPlanDownMbps] = useState(4);
  const [planUpMbps, setPlanUpMbps] = useState(2);
  const [planDeviceLimit, setPlanDeviceLimit] = useState(2);
  const [planDataCapGb, setPlanDataCapGb] = useState<number | ''>('');

  const filteredPlans = selectedVertical === 'all'
    ? plans
    : plans.filter(p => p.vertical === selectedVertical);

  const filteredVouchers = vouchers.filter(v => {
    const matchesVertical = selectedVertical === 'all' || plans.find(p => p.id === v.planId)?.vertical === selectedVertical;
    const matchesSearch = voucherSearch === '' || 
      v.code.toLowerCase().includes(voucherSearch.toLowerCase()) || 
      v.planName.toLowerCase().includes(voucherSearch.toLowerCase());
    return matchesVertical && matchesSearch;
  });

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
    if (clean.length !== 16 && !cleanRef) {
      setOttResult({
        success: false,
        message: 'Enter a 16-digit OTT Voucher PIN or a PayLesotho unique_reference to verify.'
      });
      return;
    }
    setIsVerifyingOtt(true);
    setOttResult(null);
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
          planName: data.planName || 'Daily Pass (24 Hours)',
          amount: data.amount || 10,
          stages: data.diagnosticStages
        });
      } else {
        const res = await fetch('/api/gateways/ottvoucher/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pin: clean,
            mobile: ottMobile,
            amount: 10
          })
        });
        const data = await res.json();
        setOttResult({
          success: Boolean(data.success),
          message: data.message || (data.success ? '16-Digit PIN validated with OTT Lesotho API' : 'Verification failed'),
          receipt: `OTT-${clean.slice(-4)}`,
          planName: 'Daily Pass (24 Hours)',
          amount: 10,
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
    setPlanDeviceLimit(2);
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
    setPlanDeviceLimit(plan.deviceLimit);
    setPlanDataCapGb(plan.dataCapMb ? Math.round(plan.dataCapMb / 1024) : '');
    setShowCreatePlanModal(true);
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
      deviceLimit: planDeviceLimit,
      burstDownloadMbps: planDownMbps * 2,
      burstUploadMbps: planUpMbps * 2,
    };

    if (editingPlan) {
      storage.updatePlan(editingPlan.id, payload);
    } else {
      onCreatePlan(payload);
    }

    setShowCreatePlanModal(false);
    setEditingPlan(null);
    setPlanName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Hotspot Plans, Vouchers & Entitlements</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Exact pricing-to-entitlement mapping with full CRUD management &amp; atomic voucher redemption
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => storage.resetStarterPlans()}
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

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredPlans.map((plan) => (
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
                  <span className="text-slate-500">{plan.deviceLimit} device limit</span>
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

              <div className="mt-3 flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-black text-white">{currency}{plan.price.toFixed(2)}</span>
                <span className="text-xs text-slate-400">/ {plan.durationLabel}</span>
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
        ))}
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
                  100% On-Demand OTT PINs
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Zero self-generated platform vouchers. Subscribers pay via PayLesotho (M-Pesa / EcoCash / XPayments), copy their 16-digit OTT Voucher PIN, and redeem exact package denominations.
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
            <div className="text-[10px] text-slate-400 mt-0.5">Verified via POST /ott/voucher/check</div>
          </div>
          <div className="p-3 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-200">
            <div className="text-[11px] text-slate-400 mb-1">3. Exact Value Redemption</div>
            <div className="text-sm font-bold text-cyan-400">{vouchers.length} OTT Redemptions</div>
            <div className="text-[10px] text-slate-400 mt-0.5">16-digit OTT Voucher only (zero internal vouchers)</div>
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
                  <span>Amount: M{ottResult.amount} ({ottResult.planName})</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Official OTT Lesotho Network Integration Card */}
        <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                OFFICIAL OTT LESOTHO NETWORK
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">Exclusive Provider</span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs leading-relaxed">
            <p className="font-bold mb-1">Internal Custom Voucher Generation Removed</p>
            <p className="text-[11px] text-slate-300">
              Per executive instructions, internally generated custom vouchers have been permanently deleted and purged from the platform. T-Connect Starlink Hotspots exclusively accept official 16-digit OTT Vouchers.
            </p>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-[#161d31] rounded-lg border border-[#232d42] flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Daily Pass (24 Hours)</span>
                <span className="text-[10px] text-slate-400">Available at all retail spazas &amp; vendors</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-sm">M10.00</span>
            </div>
            <div className="p-2.5 bg-[#161d31] rounded-lg border border-[#232d42] flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Weekly Pass (7 Days)</span>
                <span className="text-[10px] text-slate-400">High-speed Starlink Wi-Fi pass</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-sm">M60.00</span>
            </div>
            <div className="p-2.5 bg-[#161d31] rounded-lg border border-[#232d42] flex items-center justify-between">
              <div>
                <span className="text-white font-bold block">Monthly Pass (30 Days)</span>
                <span className="text-[10px] text-slate-400">Unlimited 30-day business pass</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-sm">M280.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* 16-Digit OTT Voucher Ledger Table */}
      <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-white">16-Digit OTT Voucher Redemptions Ledger</h3>
            <p className="text-xs text-slate-400 font-mono">Live audit trail of official OTT Lesotho voucher PINs redeemed on Starlink hotspots</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportOttLedger}
              className="px-3 py-1 bg-[#161d31] hover:bg-[#1e263b] text-slate-200 border border-[#232d42] rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={voucherSearch}
                onChange={(e) => setVoucherSearch(e.target.value)}
                placeholder="Search OTT PIN or plan..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono focus:outline-none focus:border-[#f05e17]"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-500 uppercase tracking-wider text-[10px] border-b border-[#232d42] pb-2">
                <th className="py-2.5">VOUCHER CODE</th>
                <th className="py-2.5">PLAN ENTITLEMENT</th>
                <th className="py-2.5">PRICE</th>
                <th className="py-2.5">REGISTERED DEVICES</th>
                <th className="py-2.5">STATUS</th>
                <th className="py-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b233a] text-slate-300">
              {filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td className="py-3 font-bold text-white tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <span>{voucher.code}</span>
                        <button
                          type="button"
                          onClick={() => {
                            void copyToClipboard(voucher.code);
                            setCopiedVoucherId(voucher.id);
                            setTimeout(() => setCopiedVoucherId(null), 1800);
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1e263b] transition-colors cursor-pointer"
                          title="Copy Voucher Code"
                        >
                          {copiedVoucherId === voucher.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3">
                      <div>{voucher.planName}</div>
                      <div className="text-[10px] text-slate-500">{voucher.durationSeconds / 3600} Hours Validity</div>
                      {voucher.status === 'used' && voucher.expiresAt && (
                        <div className="text-[10px] text-cyan-400 font-bold mt-0.5">
                          {(() => {
                            const sec = Math.max(0, Math.floor((new Date(voucher.expiresAt).getTime() - Date.now()) / 1000));
                            if (sec <= 0) return <span className="text-rose-400 font-bold">Package Expired</span>;
                            const h = Math.floor(sec / 3600);
                            const m = Math.floor((sec % 3600) / 60);
                            return `${h}h ${m}m left on package`;
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-emerald-400 font-bold">
                      {currency}{voucher.price.toFixed(2)}
                    </td>
                    <td className="py-3">
                      {voucher.associatedDevices.length === 0 ? (
                        <span className="text-slate-500">None (0/{voucher.deviceLimit})</span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-slate-200 font-bold">
                            {voucher.associatedDevices.length}/{voucher.deviceLimit} slots used
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {voucher.associatedDevices.map(d => d.mac).join(', ')}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        voucher.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : voucher.status === 'used'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {voucher.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setOttPin(voucher.code.replace(/\D/g, ''));
                          }}
                          className="px-2 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded text-[11px] text-emerald-400 hover:text-white cursor-pointer"
                        >
                          Inspect PIN
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus = voucher.status === 'expired' ? 'active' : 'expired';
                            storage.updateVoucher(voucher.id, { status: nextStatus });
                          }}
                          className="px-2 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded text-[11px] text-amber-300 hover:text-white cursor-pointer"
                          title={voucher.status === 'expired' ? 'Re-activate Voucher' : 'Revoke / Expire Voucher'}
                        >
                          {voucher.status === 'expired' ? 'Activate' : 'Revoke'}
                        </button>
                        {confirmDeleteVoucherId === voucher.id ? (
                          <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/50 rounded px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                storage.deleteVoucher(voucher.id);
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
                            onClick={() => setConfirmDeleteVoucherId(voucher.id)}
                            className="p-1 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded transition-colors cursor-pointer"
                            title="Delete Voucher Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Ticket className="w-6 h-6 mx-auto text-slate-600" />
                      <p className="text-slate-400 font-medium">No 16-Digit OTT Vouchers Redeemed Yet</p>
                      <p className="text-[11px] text-slate-500">
                        Official 16-digit OTT Lesotho Vouchers will appear here automatically as guests redeem them on captive portals across Lesotho.
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
                    placeholder="e.g. Weekend Pass (48h)"
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
                <div>
                  <label className="text-slate-400 block mb-1">Device Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={planDeviceLimit}
                    onChange={(e) => setPlanDeviceLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
                  />
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
                  {editingPlan ? 'Save Plan Changes' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
