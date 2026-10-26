import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Activity, 
  Zap, 
  Ticket, 
  Search, 
  TrendingUp
} from 'lucide-react';
import { Voucher, PaymentTransaction, VerticalType, ActiveSession } from '../../types';
import { storage } from '../../services/storage';

export interface CalculatedSessionLog {
  id: string;
  source: 'voucher' | 'transaction' | 'active_session';
  voucherCode?: string;
  transactionRef?: string;
  clientMac: string;
  hostname: string;
  deviceType: string;
  siteName: string;
  vertical: VerticalType;
  planName: string;
  price: number;
  authMode: 'free' | 'voucher' | 'gateway';
  startedAt: string;
  lastSeenAt: string;
  durationSeconds: number; // calculated connection time
  grantedDurationSeconds: number;
  bytesDown: number;
  bytesUp: number;
  isActive: boolean;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  expiresAt?: string;
  isUnlimitedForever?: boolean;
  roamedSites?: string[];
}

export interface SessionDurationStats {
  averageDurationSeconds: number;
  maximumDurationSeconds: number;
  averageFormatted: string;
  maximumFormatted: string;
  averageShortFormatted: string;
  maximumShortFormatted: string;
  freeAverageSeconds: number;
  paidAverageSeconds: number;
  activeCount: number;
  totalSessions: number;
  maxSession: CalculatedSessionLog | null;
}

// Format seconds into human readable duration
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0s';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatShortDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0m';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function extractSessionLogsFromData(
  vouchers: Voucher[],
  transactions: PaymentTransaction[]
): CalculatedSessionLog[] {
  const list: CalculatedSessionLog[] = [];
  const now = Date.now();

  // 1. Live sessions from storage (including free access sessions)
  const storedSessions: ActiveSession[] = storage.getActiveSessions() || [];
  storedSessions.forEach((s) => {
    const startMs = s.startedAt ? new Date(s.startedAt).getTime() : now - 15 * 60 * 1000;
    const expireMs = s.expiresAt ? new Date(s.expiresAt).getTime() : startMs + 30 * 60 * 1000;
    const elapsedSec = Math.max(1, Math.floor((now - startMs) / 1000));
    const grantedSec = Math.max(elapsedSec, Math.floor((expireMs - startMs) / 1000));

    list.push({
      id: s.id || `sess_active_${s.clientMac}`,
      source: 'active_session',
      voucherCode: s.voucherCode,
      clientMac: s.clientMac || '00:00:00:00:00:00',
      hostname: s.deviceType || 'Mobile Device',
      deviceType: s.deviceType || 'Subscriber Device',
      siteName: s.siteName || 'Hotspot Gateway',
      vertical: s.vertical || 'hotspot',
      planName: s.planName || (s.authMode === 'free' ? 'Free Hotspot Pass' : 'Standard Pass'),
      price: s.authMode === 'free' ? 0 : 10,
      authMode: s.authMode || 'free',
      startedAt: s.startedAt || new Date(startMs).toISOString(),
      lastSeenAt: new Date(now).toISOString(),
      expiresAt: s.expiresAt,
      isUnlimitedForever: s.isUnlimitedForever,
      roamedSites: s.roamedSites,
      durationSeconds: s.connectedDurationSeconds || elapsedSec,
      grantedDurationSeconds: grantedSec,
      bytesDown: s.bytesDown || 14200000,
      bytesUp: s.bytesUp || 3800000,
      isActive: true,
      guestName: s.guestName,
      guestPhone: s.guestPhone,
      guestEmail: s.guestEmail
    });
  });

  // 2. Sessions derived from vouchers and associated devices
  vouchers.forEach((v) => {
    const voucherDuration = v.durationSeconds || 86400;
    const vStartMs = v.firstUsedAt ? new Date(v.firstUsedAt).getTime() : new Date(v.generatedAt).getTime();

    if (v.associatedDevices && v.associatedDevices.length > 0) {
      v.associatedDevices.forEach((device, idx) => {
        // Avoid duplicate MAC if already logged from stored active sessions
        if (list.some((existing) => existing.clientMac === device.mac && existing.voucherCode === v.code)) {
          return;
        }

        const devFirstMs = device.firstSeen ? new Date(device.firstSeen).getTime() : vStartMs;
        const devLastMs = device.lastSeen ? new Date(device.lastSeen).getTime() : now;
        
        let connectionSec = Math.floor((devLastMs - devFirstMs) / 1000);
        // If firstSeen equals lastSeen or session is live, compute elapsed from firstSeen to now
        if (connectionSec <= 0 || devFirstMs === devLastMs) {
          connectionSec = Math.min(voucherDuration, Math.max(60, Math.floor((now - devFirstMs) / 1000)));
        }

        const isLive = v.status === 'used' || (now - devLastMs < 10 * 60 * 1000);

        list.push({
          id: `vch_${v.code}_dev_${idx}`,
          source: 'voucher',
          voucherCode: v.code,
          clientMac: device.mac,
          hostname: device.hostname || 'Subscriber Device',
          deviceType: device.hostname?.includes('iPhone') ? 'Apple iPhone' : device.hostname?.includes('Galaxy') ? 'Samsung Galaxy' : 'Client Device',
          siteName: (v as any).siteName || 'Hotspot Node',
          vertical: (v as any).vertical || 'hotspot',
          planName: v.planName,
          price: v.price,
          authMode: 'voucher',
          startedAt: new Date(devFirstMs).toISOString(),
          lastSeenAt: new Date(devLastMs).toISOString(),
          expiresAt: v.expiresAt,
          durationSeconds: Math.min(connectionSec, voucherDuration),
          grantedDurationSeconds: voucherDuration,
          bytesDown: device.bytesIn || 24000000,
          bytesUp: device.bytesOut || 5400000,
          isActive: isLive
        });
      });
    } else if (v.status === 'used' && v.firstUsedAt) {
      // Voucher activated without granular associated devices
      const connectionSec = Math.min(
        voucherDuration,
        Math.max(120, Math.floor((now - vStartMs) / 1000))
      );

      list.push({
        id: `vch_used_${v.code}`,
        source: 'voucher',
        voucherCode: v.code,
        clientMac: `VCH-${v.code.slice(-6)}`,
        hostname: `Subscriber (${v.planName})`,
        deviceType: 'Hotspot Client',
        siteName: 'Hotspot Site',
        vertical: 'hotspot',
        planName: v.planName,
        price: v.price,
        authMode: 'voucher',
        startedAt: v.firstUsedAt,
        lastSeenAt: v.expiresAt || new Date(now).toISOString(),
        expiresAt: v.expiresAt,
        durationSeconds: connectionSec,
        grantedDurationSeconds: voucherDuration,
        bytesDown: 18000000,
        bytesUp: 4200000,
        isActive: now < new Date(v.expiresAt).getTime()
      });
    }
  });

  // 3. Transactions with session connection correlation
  transactions.forEach((tx) => {
    if (tx.status === 'completed' && tx.voucherCodeIssued) {
      const alreadyIncluded = list.some((s) => s.voucherCode === tx.voucherCodeIssued);
      if (!alreadyIncluded) {
        const completedMs = tx.completedAt ? new Date(tx.completedAt).getTime() : new Date(tx.createdAt).getTime();
        const approxDurationSec = Math.min(86400, Math.max(300, Math.floor((now - completedMs) / 1000)));

        list.push({
          id: `tx_${tx.id}`,
          source: 'transaction',
          transactionRef: tx.transactionRef,
          voucherCode: tx.voucherCodeIssued,
          clientMac: tx.phoneNumber ? `Phone: ${tx.phoneNumber}` : `TX-${tx.transactionRef.slice(-6)}`,
          hostname: tx.phoneNumber || 'Mobile Money User',
          deviceType: `${tx.provider.toUpperCase()} Mobile Money`,
          siteName: tx.siteName || 'Digital Payment Gateway',
          vertical: tx.vertical || 'hotspot',
          planName: tx.planName,
          price: tx.amount,
          authMode: 'gateway',
          startedAt: tx.completedAt || tx.createdAt,
          lastSeenAt: new Date(now).toISOString(),
          durationSeconds: approxDurationSec,
          grantedDurationSeconds: 86400,
          bytesDown: 32000000,
          bytesUp: 6800000,
          isActive: false,
          guestPhone: tx.phoneNumber
        });
      }
    }
  });

  return list;
}

export function computeSessionStats(
  vouchers: Voucher[],
  transactions: PaymentTransaction[],
  selectedVertical: VerticalType | 'all' = 'all'
): SessionDurationStats {
  const allLogs = extractSessionLogsFromData(vouchers, transactions);
  const filtered = allLogs.filter((s) => {
    if (selectedVertical === 'all') return true;
    if (selectedVertical === 'village' || selectedVertical === 'community') {
      return s.vertical === 'village' || s.vertical === 'community';
    }
    return s.vertical === selectedVertical;
  });

  const count = filtered.length;
  if (count === 0) {
    return {
      averageDurationSeconds: 0,
      maximumDurationSeconds: 0,
      averageFormatted: '0s',
      maximumFormatted: '0s',
      averageShortFormatted: '0m',
      maximumShortFormatted: '0m',
      freeAverageSeconds: 0,
      paidAverageSeconds: 0,
      activeCount: 0,
      totalSessions: 0,
      maxSession: null
    };
  }

  const totalSec = filtered.reduce((acc, curr) => acc + curr.durationSeconds, 0);
  const avgSec = Math.round(totalSec / count);

  let maxSec = 0;
  let maxRec: CalculatedSessionLog | null = null;
  filtered.forEach((s) => {
    if (s.durationSeconds > maxSec) {
      maxSec = s.durationSeconds;
      maxRec = s;
    }
  });

  const freeList = filtered.filter((s) => s.authMode === 'free');
  const freeAvg = freeList.length > 0 
    ? Math.round(freeList.reduce((acc, curr) => acc + curr.durationSeconds, 0) / freeList.length)
    : 0;

  const paidList = filtered.filter((s) => s.authMode !== 'free');
  const paidAvg = paidList.length > 0
    ? Math.round(paidList.reduce((acc, curr) => acc + curr.durationSeconds, 0) / paidList.length)
    : 0;

  const active = filtered.filter((s) => s.isActive).length;

  return {
    averageDurationSeconds: avgSec,
    maximumDurationSeconds: maxSec,
    averageFormatted: formatDuration(avgSec),
    maximumFormatted: formatDuration(maxSec),
    averageShortFormatted: formatShortDuration(avgSec),
    maximumShortFormatted: formatShortDuration(maxSec),
    freeAverageSeconds: freeAvg,
    paidAverageSeconds: paidAvg,
    activeCount: active,
    totalSessions: count,
    maxSession: maxRec
  };
}

interface SessionDurationTrackingDisplayProps {
  vouchers: Voucher[];
  transactions: PaymentTransaction[];
  selectedVertical?: VerticalType | 'all';
  currency?: string;
  compact?: boolean;
  title?: string;
  description?: string;
}

export const SessionDurationTrackingDisplay: React.FC<SessionDurationTrackingDisplayProps> = ({
  vouchers,
  transactions,
  selectedVertical = 'all',
  currency = 'M',
  compact = false,
  title = 'Session Duration Tracking & Connection Analytics',
  description = 'Real-time telemetry calculating average and maximum connection time per user session from voucher devices and transaction logs'
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'free' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Compile and calculate user sessions across Vouchers, Transactions, and Live Sessions
  const sessionLogs = useMemo<CalculatedSessionLog[]>(() => {
    return extractSessionLogsFromData(vouchers, transactions);
  }, [vouchers, transactions]);

  // Scoped sessions
  const filteredSessions = useMemo(() => {
    return sessionLogs.filter((s) => {
      // Vertical filter
      if (selectedVertical !== 'all') {
        if (selectedVertical === 'village' || selectedVertical === 'community') {
          if (s.vertical !== 'village' && s.vertical !== 'community') return false;
        } else if (s.vertical !== selectedVertical) {
          return false;
        }
      }

      // Mode filter
      if (filterMode === 'free' && s.authMode !== 'free') return false;
      if (filterMode === 'paid' && s.authMode === 'free') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMac = s.clientMac.toLowerCase().includes(query);
        const matchesHost = s.hostname.toLowerCase().includes(query);
        const matchesPlan = s.planName.toLowerCase().includes(query);
        const matchesSite = s.siteName.toLowerCase().includes(query);
        const matchesPhone = s.guestPhone?.toLowerCase().includes(query);
        const matchesEmail = s.guestEmail?.toLowerCase().includes(query);
        const matchesVoucher = s.voucherCode?.toLowerCase().includes(query);
        if (!matchesMac && !matchesHost && !matchesPlan && !matchesSite && !matchesPhone && !matchesEmail && !matchesVoucher) {
          return false;
        }
      }

      return true;
    });
  }, [sessionLogs, selectedVertical, filterMode, searchQuery]);

  // Core Math: Average and Maximum connection time per user session
  const {
    averageDurationSeconds,
    maximumDurationSeconds,
    maxSessionRecord,
    freeAverageSeconds,
    paidAverageSeconds,
    activeCount,
    totalSessionsCount
  } = useMemo<{
    averageDurationSeconds: number;
    maximumDurationSeconds: number;
    maxSessionRecord: CalculatedSessionLog | null;
    freeAverageSeconds: number;
    paidAverageSeconds: number;
    activeCount: number;
    totalSessionsCount: number;
  }>(() => {
    const durations = filteredSessions.map((s) => s.durationSeconds);
    const count = durations.length;

    if (count === 0) {
      return {
        averageDurationSeconds: 0,
        maximumDurationSeconds: 0,
        maxSessionRecord: null,
        freeAverageSeconds: 0,
        paidAverageSeconds: 0,
        activeCount: 0,
        totalSessionsCount: 0
      };
    }

    const totalSec = durations.reduce((acc, curr) => acc + curr, 0);
    const avgSec = Math.round(totalSec / count);

    let maxSec = 0;
    let maxRec: CalculatedSessionLog | null = null;
    filteredSessions.forEach((s) => {
      if (s.durationSeconds > maxSec) {
        maxSec = s.durationSeconds;
        maxRec = s;
      }
    });

    const freeList = filteredSessions.filter((s) => s.authMode === 'free');
    const freeAvg = freeList.length > 0 
      ? Math.round(freeList.reduce((acc, curr) => acc + curr.durationSeconds, 0) / freeList.length)
      : 0;

    const paidList = filteredSessions.filter((s) => s.authMode !== 'free');
    const paidAvg = paidList.length > 0
      ? Math.round(paidList.reduce((acc, curr) => acc + curr.durationSeconds, 0) / paidList.length)
      : 0;

    const active = filteredSessions.filter((s) => s.isActive).length;

    return {
      averageDurationSeconds: avgSec,
      maximumDurationSeconds: maxSec,
      maxSessionRecord: maxRec,
      freeAverageSeconds: freeAvg,
      paidAverageSeconds: paidAvg,
      activeCount: active,
      totalSessionsCount: count
    };
  }, [filteredSessions]);

  return (
    <div className="bg-[#0f1422] rounded-xl border border-[#232d42] p-5 space-y-4 font-sans">
      {/* Header Lockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b233a] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold text-white tracking-tight">{title}</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/40 text-cyan-400 border border-cyan-500/30">
              LOG DERIVED
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {description}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex bg-[#121829] p-0.5 rounded-lg border border-[#1f283d]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                filterMode === 'all' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({sessionLogs.length})
            </button>
            <button
              onClick={() => setFilterMode('free')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                filterMode === 'free' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Free Access
            </button>
            <button
              onClick={() => setFilterMode('paid')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                filterMode === 'paid' ? 'bg-[#f05e17] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Paid Vouchers
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Calculation Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* Card 1: Average Connection Time */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Average Connection Time</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-white tracking-tight">
            {formatDuration(averageDurationSeconds)}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
            <span>Calculated mean per user</span>
            <span className="text-cyan-300 font-bold">{totalSessionsCount} sessions</span>
          </div>
        </div>

        {/* Card 2: Maximum Connection Time */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Maximum Connection Time</span>
            <Activity className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold text-purple-300 tracking-tight">
            {formatDuration(maximumDurationSeconds)}
          </div>
          <div className="text-[10px] text-slate-400 truncate pt-0.5">
            {maxSessionRecord ? (
              <span>Peak: <strong>{maxSessionRecord.hostname}</strong> ({maxSessionRecord.siteName})</span>
            ) : (
              <span>Longest continuous lease</span>
            )}
          </div>
        </div>

        {/* Card 3: Free vs Paid Duration Breakdown */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Free vs Paid Averages</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#f05e17]" />
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <div>
              <span className="text-[10px] text-amber-400 font-bold">Free Mode:</span>
              <div className="text-sm font-extrabold text-white">{formatShortDuration(freeAverageSeconds)}</div>
            </div>
            <div className="w-px h-6 bg-slate-700/60 mx-1"></div>
            <div>
              <span className="text-[10px] text-emerald-400 font-bold">Vouchers:</span>
              <div className="text-sm font-extrabold text-white">{formatShortDuration(paidAverageSeconds)}</div>
            </div>
          </div>
          <p className="text-[9px] text-slate-500">Duration split by authentication tier</p>
        </div>

        {/* Card 4: Active Subscriber Leases */}
        <div className="bg-[#121829] p-3.5 rounded-xl border border-[#1f283d] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Active Connected Clients</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-emerald-400">{activeCount}</span>
            <span className="text-xs text-slate-400">of {totalSessionsCount} logged</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live sessions
            </span>
            <span className="text-slate-400">{currency} revenue aligned</span>
          </div>
        </div>
      </div>

      {/* Search and Table Breakdown */}
      {!compact && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user session by MAC, phone, plan or site..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#121829] border border-[#232d42] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#f05e17]"
              />
            </div>
            <div className="text-xs font-mono text-slate-400 text-right">
              Showing <strong>{filteredSessions.length}</strong> logged user connection leases
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1b233a]">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#0a0e17] text-slate-500 uppercase tracking-wider text-[10px] border-b border-[#1b233a]">
                  <th className="py-2.5 px-3">USER / SUBSCRIBER</th>
                  <th className="py-2.5 px-3">HOTSPOT NODE / ROAMING</th>
                  <th className="py-2.5 px-3">ACCESS TIER</th>
                  <th className="py-2.5 px-3">PACKAGE TIME REMAINING / ELAPSED</th>
                  <th className="py-2.5 px-3">STARTED</th>
                  <th className="py-2.5 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b233a] text-slate-300">
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((session) => {
                    const isFree = session.authMode === 'free' || session.isUnlimitedForever;
                    const nowMs = Date.now();
                    const expMs = session.expiresAt
                      ? new Date(session.expiresAt).getTime()
                      : new Date(session.startedAt).getTime() + (session.grantedDurationSeconds * 1000);
                    const secLeft = Math.max(0, Math.floor((expMs - nowMs) / 1000));
                    const isExpired = !isFree && secLeft <= 0;

                    return (
                      <tr key={session.id} className="hover:bg-[#121829]/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="text-white font-bold flex items-center gap-1.5">
                            {isFree ? (
                              <Zap className="w-3 h-3 text-[#f05e17]" />
                            ) : (
                              <Ticket className="w-3 h-3 text-emerald-400" />
                            )}
                            <span>{session.guestName || session.hostname}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            {session.guestPhone && <span className="text-cyan-300">{session.guestPhone}</span>}
                            {session.guestEmail && <span className="text-amber-300/90">{session.guestEmail}</span>}
                            <span className="text-slate-500">{session.clientMac}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-slate-300">
                          <div className="font-medium text-white">{session.siteName}</div>
                          {session.roamedSites && session.roamedSites.length > 0 ? (
                            <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold mt-0.5">
                              <span>🔄 Roamed: {session.roamedSites[0]} → {session.siteName}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 capitalize">{session.vertical} node</div>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="text-white font-medium">{session.planName}</div>
                          <div className="text-[10px]">
                            {isFree ? (
                              <span className="text-[#f05e17] font-bold">Free Access Tier</span>
                            ) : (
                              <span className="text-emerald-400 font-bold">{currency}{session.price} Paid</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          {isFree ? (
                            <div>
                              <div className="flex items-center justify-between text-xs font-bold text-[#f05e17] mb-1">
                                <span>Elapsed: {formatDuration(session.durationSeconds)}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                                  Unlimited Forever
                                </span>
                              </div>
                              <div className="w-full bg-[#1b233a] rounded-full h-1.5 overflow-hidden">
                                <div className="h-full rounded-full bg-[#f05e17] w-full" />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between text-xs font-bold mb-1">
                                <span className={isExpired ? 'text-rose-400 font-extrabold' : 'text-cyan-300'}>
                                  {isExpired ? 'Package Expired' : `${formatDuration(secLeft)} left`}
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  of {formatShortDuration(session.grantedDurationSeconds)} pkg
                                </span>
                              </div>
                              <div className="w-full bg-[#1b233a] rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isExpired ? 'bg-rose-500' : 'bg-cyan-400'}`}
                                  style={{ 
                                    width: `${Math.min(100, Math.max(6, Math.round((secLeft / Math.max(1, session.grantedDurationSeconds)) * 100)))}%` 
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          <div>{new Date(session.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                          <div className="text-slate-500 text-[10px]">
                            {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          {session.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              CONNECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              COMPLETED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                      No user sessions found matching query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
