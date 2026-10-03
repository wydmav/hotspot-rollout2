import React, { useState } from 'react';
import { Ticket, CreditCard, FileText } from 'lucide-react';
import { HotspotPlan, Voucher, GatewayConfig, PaymentTransaction, VerticalType, GatewayProvider } from '../../types';
import { PlansVouchersView } from './PlansVouchersView';
import { GatewaysView } from './GatewaysView';
import { TransactionsView } from './TransactionsView';

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
}

export const BillingView: React.FC<BillingViewProps> = (props) => {
  const [activeSubTab, setActiveSubTab] = useState<'plans_vouchers' | 'gateways' | 'transactions'>('plans_vouchers');

  return (
    <div className="space-y-5">
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
        />
      )}

      {activeSubTab === 'gateways' && (
        <GatewaysView
          gateways={props.gateways}
          onTestConnection={props.onTestConnection}
          onRunSandboxPayment={props.onRunSandboxPayment}
          onToggleLive={props.onToggleLive}
          onUpdateCredentials={props.onUpdateCredentials}
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
