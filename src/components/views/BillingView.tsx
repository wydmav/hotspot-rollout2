import React, { useState } from 'react';
import { Ticket, CreditCard, FileText, ShieldCheck } from 'lucide-react';
import { HotspotPlan, Voucher, GatewayConfig, PaymentTransaction, VerticalType, GatewayProvider } from '../../types';
import { PlansVouchersView } from './PlansVouchersView';
import { GatewaysView } from './GatewaysView';
import { TransactionsView } from './TransactionsView';
import { ProviderLogo } from '../common/BrandLogos';

interface BillingViewProps {
  plans: HotspotPlan[];
  vouchers: Voucher[];
  gateways: GatewayConfig[];
  transactions: PaymentTransaction[];
  selectedVertical: VerticalType | 'all';
  currency: string;
  onCreatePlan: (plan: Omit<HotspotPlan, 'id'>) => void;
  onGenerateBatch: (planId: string, count: number) => Voucher[];
  onRedeemVoucher: (code: string, mac: string, hostname?: string) => any;
  onTestConnection: (provider: GatewayProvider) => any;
  onRunSandboxPayment: (provider: GatewayProvider, amount?: number) => any;
  onToggleLive: (provider: GatewayProvider, setLive: boolean) => any;
  onUpdateCredentials: (provider: GatewayProvider, updates: Partial<GatewayConfig>) => void;
  onRecheckStatus: (txId: string) => any;
  voucherThreshold?: number;
  onUpdateVoucherThreshold?: (threshold: number) => void;
  onTriggerVoucherCheck?: () => void;
  onRemoveGateway?: (provider: GatewayProvider) => void;
  isSuperAdmin?: boolean;
}

export const BillingView: React.FC<BillingViewProps> = (props) => {
  const [activeSubTab, setActiveSubTab] = useState<'plans_vouchers' | 'gateways' | 'transactions'>('plans_vouchers');

  return (
    <div className="space-y-5">
      {/* Top FinTech Gateway Spotlight Banner with Official Logos */}
      <div className="bg-[#0f1422] p-3.5 rounded-xl border border-[#232d42] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-extrabold text-white">Integrated FinTech Providers (Lesotho &amp; Southern Africa)</h2>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Official EcoCash (*199# Push) &amp; OTT Digital Voucher payment channels for captive portal subscribers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#161d31] border border-[#232d42]">
            <ProviderLogo provider="ecocash" className="w-28 h-8" />
            <span className="text-[10px] font-mono font-bold text-slate-300 bg-red-950/40 border border-red-500/30 px-1.5 py-0.5 rounded">*199# Push</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#161d31] border border-[#232d42]">
            <ProviderLogo provider="ottvoucher" className="w-28 h-8" />
            <span className="text-[10px] font-mono font-bold text-slate-300 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded">Digital PIN</span>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex rounded-xl bg-[#121829] p-1 border border-[#1f283d] text-xs font-mono w-fit">
        <button
          onClick={() => setActiveSubTab('plans_vouchers')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            activeSubTab === 'plans_vouchers' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Plans &amp; Vouchers</span>
        </button>

        <button
          onClick={() => setActiveSubTab('gateways')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            activeSubTab === 'gateways' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payment Gateways (4)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
            activeSubTab === 'transactions' ? 'bg-[#f05e17] text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Transaction Ledger &amp; Debugger</span>
        </button>
      </div>

      {/* Sub-view Content */}
      {activeSubTab === 'plans_vouchers' && (
        <PlansVouchersView
          plans={props.plans}
          vouchers={props.vouchers}
          onCreatePlan={props.onCreatePlan}
          onGenerateBatch={props.onGenerateBatch}
          onRedeemVoucher={props.onRedeemVoucher}
          selectedVertical={props.selectedVertical}
          currency={props.currency}
          voucherThreshold={props.voucherThreshold}
          onUpdateVoucherThreshold={props.onUpdateVoucherThreshold}
          onTriggerVoucherCheck={props.onTriggerVoucherCheck}
        />
      )}

      {activeSubTab === 'gateways' && (
        <GatewaysView
          gateways={props.gateways}
          onTestConnection={props.onTestConnection}
          onRunSandboxPayment={props.onRunSandboxPayment}
          onToggleLive={props.onToggleLive}
          onUpdateCredentials={props.onUpdateCredentials}
          onRemoveGateway={props.onRemoveGateway}
          isSuperAdmin={props.isSuperAdmin}
          currency={props.currency}
        />
      )}

      {activeSubTab === 'transactions' && (
        <TransactionsView
          transactions={props.transactions}
          onRecheckStatus={props.onRecheckStatus}
          selectedVertical={props.selectedVertical}
          currency={props.currency}
        />
      )}
    </div>
  );
};
