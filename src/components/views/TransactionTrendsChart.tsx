import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  CreditCard,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Sparkles,
  Info,
  Wifi,
  HardDrive
} from 'lucide-react';
import { PaymentTransaction, VerticalType } from '../../types';

export interface UsageTrendEvent {
  id: string;
  startedAt: string;
  authMode: 'paid' | 'free';
  bytesTotal: number;
  bytesDown?: number;
  bytesUp?: number;
  vertical: VerticalType;
  status: 'connected' | 'disconnected';
}

interface TransactionTrendsChartProps {
  transactions: PaymentTransaction[];
  usageEvents?: UsageTrendEvent[];
  currency: string;
  selectedVertical: VerticalType | 'all';
  onNavigateTab?: (tab: string) => void;
}

interface DailyTrendData {
  dateKey: string;
  displayDate: string;
  fullDate: string;
  txCount: number;
  completedCount: number;
  dailyRevenue: number;
  cumulativeRevenue: number;
  projectedRevenue: number;
  sessionsCount: number;
  freeSessionsCount: number;
  paidSessionsCount: number;
  dataConsumedMb: number;
  isProjectedOnly?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  currency: string;
}

function formatDataFromMb(mb: number): string {
  const safe = Math.max(0, Number(mb) || 0);
  if (safe >= 1024) {
    return `${(safe / 1024).toFixed(2)} GB`;
  }
  return `${safe.toFixed(1)} MB`;
}

function toLocalDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) {
    const raw = String(isoOrDate || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, currency }) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload as DailyTrendData | undefined;

  return (
    <div className="bg-[#121829]/95 border border-[#232d42] backdrop-blur-md rounded-xl p-3.5 shadow-2xl min-w-[245px] font-mono text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#232d42] mb-2.5">
        <span className="text-white font-bold">{dataPoint?.fullDate || label}</span>
        <span className="text-[10px] text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
          {dataPoint?.isProjectedOnly ? 'Forecast Point' : 'Live Telemetry'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-emerald-400">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Daily Revenue:
          </span>
          <span className="font-bold tabular-nums">
            {currency}{Number(dataPoint?.dailyRevenue || 0).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[#f05e17]">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#f05e17]"></span>
            Cumulative Growth:
          </span>
          <span className="font-bold tabular-nums">
            {currency}{Number(dataPoint?.cumulativeRevenue || 0).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between text-purple-400 pt-1 border-t border-[#1b233a]">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            Projected Trend (7d):
          </span>
          <span className="font-bold tabular-nums">
            {currency}{Number(dataPoint?.projectedRevenue || 0).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between text-cyan-400 pt-1 border-t border-[#1b233a]">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Paid Checkouts:
          </span>
          <span className="font-bold tabular-nums">
            {dataPoint?.txCount || 0} ({dataPoint?.completedCount || 0} Settled)
          </span>
        </div>

        <div className="flex items-center justify-between text-sky-300 pt-1 border-t border-[#1b233a]">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Guest Sessions:
          </span>
          <span className="font-bold tabular-nums">
            {dataPoint?.sessionsCount || 0}{' '}
            <span className="text-[10px] text-slate-400">
              ({dataPoint?.freeSessionsCount || 0} Free · {dataPoint?.paidSessionsCount || 0} Paid)
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between text-amber-300">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Data Consumed:
          </span>
          <span className="font-bold tabular-nums">
            {formatDataFromMb(dataPoint?.dataConsumedMb || 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const TransactionTrendsChart: React.FC<TransactionTrendsChartProps> = ({
  transactions,
  usageEvents = [],
  currency,
  selectedVertical,
  onNavigateTab
}) => {
  const [timeframeDays, setTimeframeDays] = useState<7 | 14 | 30>(7);
  const [visibleLines, setVisibleLines] = useState({
    cumulative: true,
    projected: true,
    daily: true,
    volume: true,
    sessions: true,
    dataMb: false
  });

  const matchesVertical = (v?: string) => {
    if (selectedVertical === 'all' || !v) return true;
    if (selectedVertical === 'village' || selectedVertical === 'community') {
      return v === 'village' || v === 'community';
    }
    return v === selectedVertical;
  };

  // Filter transactions and usage events by selected vertical
  const scopedTransactions = useMemo(() => {
    return transactions.filter((t) => matchesVertical(t.vertical));
  }, [transactions, selectedVertical]);

  const scopedUsageEvents = useMemo(() => {
    return usageEvents.filter((u) => matchesVertical(u.vertical));
  }, [usageEvents, selectedVertical]);

  // Aggregate daily revenue + usage metrics over the selected timeframe + Linear Regression Forecast
  const {
    chartData,
    totalPeriodRevenue,
    totalPeriodTx,
    totalPeriodSessions,
    totalPeriodFreeSessions,
    totalPeriodPaidSessions,
    totalPeriodDataMb,
    maxDailyRevenue,
    averageDailyRevenue,
    projectedTotalPeriodRevenue,
    hasData
  } = useMemo(() => {
    const days: DailyTrendData[] = [];
    const now = new Date();

    // Map transactions by local YYYY-MM-DD
    const txByDate = new Map<string, PaymentTransaction[]>();
    scopedTransactions.forEach((tx) => {
      const datePart = toLocalDateKey(tx.createdAt || tx.completedAt || '');
      if (datePart) {
        if (!txByDate.has(datePart)) txByDate.set(datePart, []);
        txByDate.get(datePart)!.push(tx);
      }
    });

    // Map live guest usage sessions by local YYYY-MM-DD
    const usageByDate = new Map<string, UsageTrendEvent[]>();
    scopedUsageEvents.forEach((ev) => {
      const datePart = toLocalDateKey(ev.startedAt || '');
      if (datePart) {
        if (!usageByDate.has(datePart)) usageByDate.set(datePart, []);
        usageByDate.get(datePart)!.push(ev);
      }
    });

    let runningCumulativeRevenue = 0;

    for (let i = timeframeDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = toLocalDateKey(d);

      const dayTxList = txByDate.get(dateKey) || [];
      const txCount = dayTxList.length;
      const completedList = dayTxList.filter((t) => t.status === 'completed');
      const completedCount = completedList.length;
      const dailyRevenue = completedList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const dayUsageList = usageByDate.get(dateKey) || [];
      const freeSessionsCount = dayUsageList.filter((u) => u.authMode === 'free').length;
      const paidSessionsCount = Math.max(
        dayUsageList.filter((u) => u.authMode === 'paid').length,
        completedCount
      );
      const sessionsCount = freeSessionsCount + paidSessionsCount;
      const totalBytes = dayUsageList.reduce((sum, u) => sum + Math.max(0, Number(u.bytesTotal) || 0), 0);
      const dataConsumedMb = Number((totalBytes / (1024 * 1024)).toFixed(2));

      runningCumulativeRevenue += dailyRevenue;

      const displayDate = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      const fullDate = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      days.push({
        dateKey,
        displayDate,
        fullDate,
        txCount,
        completedCount,
        dailyRevenue: Number(dailyRevenue.toFixed(2)),
        cumulativeRevenue: Number(runningCumulativeRevenue.toFixed(2)),
        projectedRevenue: Number(runningCumulativeRevenue.toFixed(2)),
        sessionsCount,
        freeSessionsCount,
        paidSessionsCount,
        dataConsumedMb
      });
    }

    // 7-Day Linear Regression on daily revenue
    const n = days.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = days[i].dailyRevenue;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const denominator = n * sumXX - sumX * sumX;
    let slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    let intercept = (sumY - slope * sumX) / n;

    if (sumY === 0) {
      slope = 0;
      intercept = 0;
    }

    let runningProjected = 0;
    for (let i = 0; i < n; i++) {
      const estimatedDaily = Math.max(0, slope * i + intercept);
      runningProjected += estimatedDaily;
      days[i].projectedRevenue = Number(runningProjected.toFixed(2));
    }

    const totalRev = days.reduce((sum, d) => sum + d.dailyRevenue, 0);
    const totalTx = days.reduce((sum, d) => sum + d.txCount, 0);
    const totalSessions = days.reduce((sum, d) => sum + d.sessionsCount, 0);
    const totalFree = days.reduce((sum, d) => sum + d.freeSessionsCount, 0);
    const totalPaid = days.reduce((sum, d) => sum + d.paidSessionsCount, 0);
    const totalMb = days.reduce((sum, d) => sum + d.dataConsumedMb, 0);
    const maxRev = Math.max(...days.map((d) => d.dailyRevenue), 0);
    const avgRev = days.length > 0 ? totalRev / days.length : 0;
    const dataExists = totalTx > 0 || totalSessions > 0 || totalMb > 0;

    return {
      chartData: days,
      totalPeriodRevenue: totalRev,
      totalPeriodTx: totalTx,
      totalPeriodSessions: totalSessions,
      totalPeriodFreeSessions: totalFree,
      totalPeriodPaidSessions: totalPaid,
      totalPeriodDataMb: totalMb,
      maxDailyRevenue: maxRev,
      averageDailyRevenue: avgRev,
      projectedTotalPeriodRevenue: runningProjected,
      hasData: dataExists
    };
  }, [scopedTransactions, scopedUsageEvents, timeframeDays]);

  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 shadow-lg space-y-4">
      {/* Header with Title and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#f05e17]/10 text-[#f05e17]">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-extrabold text-white tracking-tight">
              Daily Transaction Trends, Revenue Growth &amp; Usage Stats
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time mobile revenue (M-Pesa, EcoCash &amp; OTT), daily guest sessions (Free vs Paid), and bandwidth usage
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Series Visibility Toggles */}
          <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1 bg-[#161d31] border border-[#232d42] rounded-lg text-[11px] font-mono text-slate-300">
            <span className="text-slate-500 mr-1 hidden sm:inline">Series:</span>

            <button
              type="button"
              onClick={() => toggleLine('cumulative')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                visibleLines.cumulative
                  ? 'bg-[#f05e17]/20 text-[#f05e17] font-semibold border border-[#f05e17]/40'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#f05e17]"></span>
              <span>Growth</span>
            </button>

            <button
              type="button"
              onClick={() => toggleLine('projected')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                visibleLines.projected
                  ? 'bg-purple-500/20 text-purple-400 font-semibold border border-purple-500/40'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
              title="Projected revenue curve based on 7-day linear regression"
            >
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>Projected</span>
            </button>

            <button
              type="button"
              onClick={() => toggleLine('daily')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                visibleLines.daily
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/40'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Daily Rev</span>
            </button>

            <button
              type="button"
              onClick={() => toggleLine('volume')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                visibleLines.volume
                  ? 'bg-cyan-500/20 text-cyan-400 font-semibold border border-cyan-500/40'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Paid Tx</span>
            </button>

            <button
              type="button"
              onClick={() => toggleLine('sessions')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                visibleLines.sessions
                  ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>Sessions</span>
            </button>

            <button
              type="button"
              onClick={() => toggleLine('dataMb')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                visibleLines.dataMb
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Data (MB)</span>
            </button>
          </div>

          {/* Timeframe Selectors */}
          <div className="flex items-center bg-[#161d31] border border-[#232d42] rounded-lg p-0.5 text-xs font-mono">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTimeframeDays(days)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  timeframeDays === days
                    ? 'bg-[#f05e17] text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Highlights Strip (Revenue + Real-Time Usage Stats) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
        <div className="bg-[#161d31]/70 border border-[#232d42] rounded-lg p-2.5 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Period Revenue</span>
            <DollarSign className="w-3 h-3 text-[#f05e17]" />
          </div>
          <div className="text-base font-bold text-white mt-1 tabular-nums">
            {currency}{totalPeriodRevenue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Past {timeframeDays} days total
          </div>
        </div>

        <div className="bg-[#161d31]/70 border border-[#232d42] rounded-lg p-2.5 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Peak Daily Rev</span>
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-400 mt-1 tabular-nums">
            {currency}{maxDailyRevenue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Avg {currency}{averageDailyRevenue.toFixed(2)}/day
          </div>
        </div>

        <div className="bg-[#161d31]/70 border border-[#232d42] rounded-lg p-2.5 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Projected Run</span>
            <Sparkles className="w-3 h-3 text-purple-400" />
          </div>
          <div className="text-base font-bold text-purple-400 mt-1 tabular-nums">
            {currency}{projectedTotalPeriodRevenue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            7d Linear regression
          </div>
        </div>

        <div className="bg-[#161d31]/70 border border-[#232d42] rounded-lg p-2.5 font-mono">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Paid Checkouts</span>
            <CreditCard className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-cyan-400 mt-1 tabular-nums">
            {totalPeriodTx} Tx
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Settled checkouts
          </div>
        </div>

        <div className="bg-[#161d31]/70 border border-sky-500/30 rounded-lg p-2.5 font-mono">
          <div className="text-[10px] text-sky-300 uppercase tracking-wider flex items-center justify-between">
            <span>Usage Sessions</span>
            <Wifi className="w-3 h-3 text-sky-400" />
          </div>
          <div className="text-base font-bold text-sky-300 mt-1 tabular-nums">
            {totalPeriodSessions}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {totalPeriodFreeSessions} Free · {totalPeriodPaidSessions} Paid
          </div>
        </div>

        <div className="bg-[#161d31]/70 border border-amber-500/30 rounded-lg p-2.5 font-mono">
          <div className="text-[10px] text-amber-300 uppercase tracking-wider flex items-center justify-between">
            <span>Data Consumed</span>
            <HardDrive className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-base font-bold text-amber-300 mt-1 tabular-nums">
            {formatDataFromMb(totalPeriodDataMb)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Past {timeframeDays}d total traffic
          </div>
        </div>
      </div>

      {/* Main Recharts Line Chart Container */}
      <div className="relative w-full bg-[#0a0e17] rounded-xl p-4 border border-[#1b233a]">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1f293d"
                vertical={false}
              />
              <XAxis
                dataKey="displayDate"
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }}
                axisLine={{ stroke: '#232d42' }}
                tickLine={{ stroke: '#232d42' }}
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                axisLine={{ stroke: '#232d42' }}
                tickLine={{ stroke: '#232d42' }}
                tickFormatter={(value: number) => `${currency}${value}`}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }}
                axisLine={{ stroke: '#232d42' }}
                tickLine={{ stroke: '#232d42' }}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip currency={currency} />}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '12px',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}
              />

              {/* Cumulative Revenue Line */}
              {visibleLines.cumulative && (
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="cumulativeRevenue"
                  name="Cumulative Revenue Growth"
                  stroke="#f05e17"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f05e17', stroke: '#0f1422', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#f05e17', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {/* Projected Revenue Line */}
              {visibleLines.projected && (
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="projectedRevenue"
                  name="Projected Revenue (7d Trend)"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 2.5, fill: '#a855f7', stroke: '#0f1422', strokeWidth: 1 }}
                  activeDot={{ r: 6, fill: '#a855f7', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {/* Daily Revenue Line */}
              {visibleLines.daily && (
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="dailyRevenue"
                  name="Daily Mobile Revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2.5, fill: '#10b981', stroke: '#0f1422', strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {/* Paid Transaction Volume Line */}
              {visibleLines.volume && (
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="txCount"
                  name="Paid Checkouts (Tx)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#06b6d4', stroke: '#0f1422', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {/* Live Guest Sessions Line (Free + Paid) */}
              {visibleLines.sessions && (
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="sessionsCount"
                  name="Guest Sessions (Free + Paid)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#38bdf8', stroke: '#0f1422', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}

              {/* Daily Data Consumed Line (MB) */}
              {visibleLines.dataMb && (
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="dataConsumedMb"
                  name="Data Consumed (MB)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 2.5, fill: '#f59e0b', stroke: '#0f1422', strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Empty state informative note when zero sessions and zero transactions recorded yet */}
        {!hasData && (
          <div className="mt-3 p-3 bg-[#161d31]/80 border border-[#232d42] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-400">
              <Info className="w-4 h-4 text-[#f05e17] shrink-0" />
              <span>
                Waiting for live guest sessions or mobile payments. Free Mode logins, M-Pesa, EcoCash, and OTT checkouts plot here automatically every 5 seconds.
              </span>
            </div>
            {onNavigateTab && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateTab('billing')}
                  className="px-2.5 py-1 bg-[#232d42] hover:bg-[#2e3b55] text-white rounded transition-colors text-[11px] flex items-center gap-1 font-bold cursor-pointer"
                >
                  <span>Open Billing Ledger</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
