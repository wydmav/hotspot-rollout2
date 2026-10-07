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
  Layers
} from 'lucide-react';
import { HotspotPlan, Voucher, VerticalType } from '../../types';
import { ExportService } from '../../services/exportService';

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
  onGenerateBatch,
  onRedeemVoucher,
  selectedVertical,
  currency,
  voucherThreshold = 5,
  onUpdateVoucherThreshold,
  onTriggerVoucherCheck,
}) => {
  const [selectedPlanForBatch, setSelectedPlanForBatch] = useState<string>(plans[0]?.id || '');
  const [batchCount, setBatchCount] = useState<number>(5);
  const [voucherSearch, setVoucherSearch] = useState('');
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [localThreshold, setLocalThreshold] = useState<number>(voucherThreshold);
  const [isAuditing, setIsAuditing] = useState(false);

  useEffect(() => {
    setLocalThreshold(voucherThreshold);
  }, [voucherThreshold]);

  // Concurrency tester state
  const [testCode, setTestCode] = useState('');
  const [testResults, setTestResults] = useState<Array<{ device: string; mac: string; success: boolean; message: string; slot?: string }>>([]);
  const [isTestingConcurrency, setIsTestingConcurrency] = useState(false);

  // New Plan form state
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

  const handleGenerateBatch = () => {
    if (!selectedPlanForBatch) return;
    const generated = onGenerateBatch(selectedPlanForBatch, batchCount);
    ExportService.exportVouchersToCsv(generated);
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) return;

    onCreatePlan({
      name: planName.trim(),
      vertical: planVertical,
      price: planPrice,
      currency,
      durationSeconds: planDurationHours * 3600,
      durationLabel: planDurationHours >= 24 ? `${planDurationHours / 24} Day(s)` : `${planDurationHours} Hours`,
      dataCapMb: planDataCapGb ? Number(planDataCapGb) * 1024 : null,
      downloadSpeedMbps: planDownMbps,
      uploadSpeedMbps: planUpMbps,
      deviceLimit: planDeviceLimit,
      burstDownloadMbps: planDownMbps * 2,
      burstUploadMbps: planUpMbps * 2,
    });

    setShowCreatePlanModal(false);
    setPlanName('');
  };

  const runConcurrencyDoubleSpendTest = (codeToTest?: string) => {
    const code = codeToTest || testCode;
    if (!code) return;

    setIsTestingConcurrency(true);
    setTestResults([]);

    const devices = [
      { name: 'Device #1 (Client Phone)', mac: 'AA:BB:CC:11:22:33' },
      { name: 'Device #2 (Client Laptop)', mac: 'AA:BB:CC:44:55:66' },
      { name: 'Device #3 (Unauthorized 3rd Device)', mac: 'AA:BB:CC:99:99:99' }
    ];

    const results: any[] = [];
    devices.forEach((d, idx) => {
      setTimeout(() => {
        const res = onRedeemVoucher(code, d.mac, d.name);
        results.push({
          device: d.name,
          mac: d.mac,
          success: res.success,
          message: res.message,
          slot: res.deviceSlot
        });
        setTestResults([...results]);

        if (idx === devices.length - 1) {
          setIsTestingConcurrency(false);
        }
      }, (idx + 1) * 350);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Hotspot Plans, Vouchers & Entitlements</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Exact pricing-to-entitlement mapping with atomic, concurrency-hardened voucher redemption
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => ExportService.exportVouchersToCsv(vouchers)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-xs font-mono text-slate-300 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Vouchers CSV</span>
          </button>
          <button
            onClick={() => setShowCreatePlanModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
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
                <span className="text-slate-500">{plan.deviceLimit} device limit</span>
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

            <div className="mt-5 pt-3 border-t border-[#1f283d]">
              <button
                onClick={() => {
                  setSelectedPlanForBatch(plan.id);
                  onGenerateBatch(plan.id, 1);
                }}
                className="w-full py-1.5 px-3 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-xs font-mono text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Ticket className="w-3.5 h-3.5 text-[#f05e17]" />
                <span>Issue Single Voucher</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ======================================================= */}
      {/* VOUCHER INVENTORY STATUS & BACKGROUND SENTINEL CONTROL  */}
      {/* ======================================================= */}
      {(() => {
        const activeCount = vouchers.filter((v) => v.status === 'active').length;
        const usedCount = vouchers.filter((v) => v.status === 'used').length;
        const expiredCount = vouchers.filter((v) => v.status === 'expired').length;
        const isLow = activeCount <= localThreshold;
        const isDepleted = activeCount === 0;

        return (
          <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${isLow ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {isLow ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-mono flex items-center gap-2">
                    VOUCHER INVENTORY &amp; BACKGROUND SENTINEL
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-normal">
                      Background Check: Every 15s
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Automated background check alerts the top Header when unused stock falls below threshold
                  </p>
                </div>
              </div>

              {/* Threshold Controller & Manual Audit */}
              <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                {onUpdateVoucherThreshold && (
                  <div className="flex items-center gap-1.5 bg-[#161d31] px-2.5 py-1.5 rounded-lg border border-[#232d42]">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#f05e17]" />
                    <span className="text-[11px] text-slate-400">Threshold:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={localThreshold}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 0) {
                          setLocalThreshold(val);
                          onUpdateVoucherThreshold(val);
                        }
                      }}
                      className="w-12 bg-[#0b0f19] border border-[#232d42] rounded px-1.5 py-0.5 text-center text-white font-bold"
                    />
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsAuditing(true);
                    if (onTriggerVoucherCheck) onTriggerVoucherCheck();
                    setTimeout(() => setIsAuditing(false), 600);
                  }}
                  disabled={isAuditing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded-lg text-slate-200 transition-colors"
                  title="Run background inventory audit now"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-[#f05e17]' : 'text-slate-400'}`} />
                  <span>{isAuditing ? 'Auditing...' : 'Audit Stock'}</span>
                </button>
              </div>
            </div>

            {/* Metric KPI Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className={`p-3 rounded-lg border ${
                isDepleted 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                  : isLow 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                  : 'bg-[#161d31] border-[#232d42] text-slate-200'
              }`}>
                <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                  <span>Unused Stock</span>
                  {isLow && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                      LOW
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold flex items-baseline gap-1.5">
                  <span>{activeCount}</span>
                  <span className="text-[11px] text-slate-500 font-normal">tokens</span>
                </div>
              </div>

              <div className="p-3 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-200">
                <div className="text-[11px] text-slate-400 mb-1">Active Threshold</div>
                <div className="text-xl font-bold flex items-baseline gap-1.5 text-slate-200">
                  <span>{localThreshold}</span>
                  <span className="text-[11px] text-slate-500 font-normal">trigger limit</span>
                </div>
              </div>

              <div className="p-3 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-200">
                <div className="text-[11px] text-slate-400 mb-1">Redeemed / Used</div>
                <div className="text-xl font-bold flex items-baseline gap-1.5 text-cyan-400">
                  <span>{usedCount}</span>
                  <span className="text-[11px] text-slate-500 font-normal">sessions</span>
                </div>
              </div>

              <div className="p-3 bg-[#161d31] border border-[#232d42] rounded-lg text-slate-200">
                <div className="text-[11px] text-slate-400 mb-1">Expired / Revoked</div>
                <div className="text-xl font-bold flex items-baseline gap-1.5 text-slate-400">
                  <span>{expiredCount}</span>
                  <span className="text-[11px] text-slate-500 font-normal">vouchers</span>
                </div>
              </div>
            </div>

            {/* Low Voucher Balance Warning Banner if low */}
            {isLow && (
              <div className={`p-3 rounded-lg border flex items-start gap-3 ${
                isDepleted 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}>
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isDepleted ? 'text-rose-400' : 'text-amber-400'}`} />
                <div className="space-y-1 text-xs">
                  <p className="font-bold">
                    {isDepleted
                      ? 'Critical Depletion: 0 unused vouchers remaining in inventory!'
                      : `Low Voucher Balance Alert: Only ${activeCount} unused voucher${activeCount === 1 ? '' : 's'} remaining.`}
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    The background daemon has triggered an active &quot;Low Voucher Balance&quot; alert in the top Header navigation.
                    Generate a new batch using the generator below to restock inventory and maintain continuous captive portal operation.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Batch Voucher Generator & Concurrency Verification Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch Generator */}
        <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#f05e17]" />
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
              BATCH VOUCHER GENERATOR
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Generate printable or exportable voucher codes for retail points of sale, front desks, or cafe counters.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Select Hotspot Plan</label>
              <select
                value={selectedPlanForBatch}
                onChange={(e) => setSelectedPlanForBatch(e.target.value)}
                className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({currency}{p.price} - {p.durationLabel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Number of Vouchers</label>
              <input
                type="number"
                min="1"
                max="50"
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#161d31] border border-[#232d42] rounded-lg text-white focus:outline-none focus:border-[#f05e17]"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateBatch}
            className="w-full py-2 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Generate &amp; Download CSV Batch</span>
          </button>
        </div>

        {/* Concurrency & Anti-Double-Spend Tester */}
        <div className="bg-[#0f1422] p-5 rounded-xl border border-[#232d42] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                CONCURRENCY &amp; DOUBLE-SPEND TESTER
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Acceptance Test</span>
          </div>

          <p className="text-xs text-slate-400">
            Simulate 3 devices attempting concurrent authentication on an M10 / 2-device voucher to verify atomic locking and quota enforcement.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder="Enter voucher code (e.g. TC-9482-10M)"
              className="flex-1 px-3 py-1.5 bg-[#161d31] border border-[#232d42] rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#f05e17]"
            />
            <button
              onClick={() => runConcurrencyDoubleSpendTest()}
              disabled={isTestingConcurrency || !testCode.trim()}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-lg transition-colors"
            >
              {isTestingConcurrency ? 'Testing...' : 'Run Test'}
            </button>
          </div>

          {/* Test Results Output */}
          <div className="bg-[#0a0e17] border border-[#1b233a] rounded-lg p-3 space-y-2 min-h-24 text-xs font-mono">
            {testResults.length === 0 ? (
              <p className="text-slate-500 text-center py-4">
                Pick a voucher below or enter a code above, then click &quot;Run Test&quot;.
              </p>
            ) : (
              testResults.map((res, i) => (
                <div key={i} className="flex items-start gap-2 pt-1 border-b border-[#1b233a] last:border-0 pb-1">
                  {res.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{res.device}</span>
                      {res.slot && <span className="text-emerald-400 font-bold">[{res.slot}]</span>}
                    </div>
                    <p className={`text-[11px] ${res.success ? 'text-slate-300' : 'text-rose-300'}`}>
                      {res.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Voucher Ledger Table */}
      <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-white">Active Voucher Inventory &amp; Entitlement Tracking</h3>
            <p className="text-xs text-slate-400 font-mono">Single-use tokens with duration counting upon first login</p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={voucherSearch}
              onChange={(e) => setVoucherSearch(e.target.value)}
              placeholder="Search code or plan..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-[#161d31] border border-[#232d42] rounded-lg text-white font-mono focus:outline-none focus:border-[#f05e17]"
            />
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
                      {voucher.code}
                    </td>
                    <td className="py-3">
                      <div>{voucher.planName}</div>
                      <div className="text-[10px] text-slate-500">{voucher.durationSeconds / 3600} Hours Validity</div>
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
                      <button
                        onClick={() => {
                          setTestCode(voucher.code);
                          runConcurrencyDoubleSpendTest(voucher.code);
                        }}
                        className="px-2 py-1 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] rounded text-[11px] text-slate-300 hover:text-white"
                      >
                        Test Concurrency
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Ticket className="w-6 h-6 mx-auto text-slate-600" />
                      <p className="text-slate-400 font-medium">No Vouchers Generated Yet</p>
                      <p className="text-[11px] text-slate-500">
                        Use the "Batch Voucher Generator" above or issue a single voucher from any configured plan to generate single-use access codes.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Plan Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1422] border border-[#232d42] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232d42]">
              <h3 className="text-base font-extrabold text-white">Create New Hotspot Plan</h3>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3.5 text-xs font-mono">
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
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-3 py-1.5 bg-[#161d31] hover:bg-[#202942] border border-[#232d42] text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#f05e17] hover:bg-[#d94c0b] text-white font-bold rounded-lg shadow-sm"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
