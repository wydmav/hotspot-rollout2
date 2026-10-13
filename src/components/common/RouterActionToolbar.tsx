import React from 'react';
import { RouterDevice } from '../../types';
import { 
  Terminal, 
  Monitor, 
  RefreshCw, 
  Power, 
  ShieldCheck
} from 'lucide-react';

export interface RouterActionToolbarProps {
  router: RouterDevice;
  variant?: 'compact' | 'expanded' | 'header' | 'minimal';
  onOpenTerminal: (router: RouterDevice) => void;
  onOpenWebfig: (router: RouterDevice) => void;
  onOpenAudit?: (router: RouterDevice) => void;
  onReboot: (router: RouterDevice) => void;
  onResync: (router: RouterDevice) => void;
  isPending?: boolean;
  activeAction?: string | null;
  className?: string;
}

export const RouterActionToolbar: React.FC<RouterActionToolbarProps> = ({
  router,
  variant = 'compact',
  onOpenTerminal,
  onOpenWebfig,
  onOpenAudit,
  onReboot,
  onResync,
  isPending = false,
  activeAction = null,
  className = ''
}) => {
  const isSyncing = isPending && activeAction === 'resync';
  const isRebooting = isPending && activeAction === 'reboot';

  // Minimal variant: Icon-only buttons for high-density cards
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTerminal(router);
          }}
          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
          title="Open Remote Terminal Console"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenWebfig(router);
          }}
          className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition-colors cursor-pointer"
          title="Launch WebFig & Quick Tools"
        >
          <Monitor className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onResync(router);
          }}
          disabled={isPending}
          className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors cursor-pointer disabled:opacity-50"
          title="Force Re-sync Config"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReboot(router);
          }}
          disabled={isPending}
          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
          title="Reboot Router"
        >
          <Power className="w-3.5 h-3.5" />
        </button>

        {onOpenAudit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAudit(router);
            }}
            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
            title="View Audit Trail"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // Compact variant: Small text + icon badges for list cards
  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTerminal(router);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Open Remote Terminal"
        >
          <Terminal className="w-3 h-3 text-emerald-400" />
          <span>CLI</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenWebfig(router);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded bg-orange-950/50 hover:bg-orange-900/60 text-orange-300 border border-orange-500/40 text-[11px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Launch WebFig"
        >
          <Monitor className="w-3 h-3 text-orange-400" />
          <span>WebFig</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onResync(router);
          }}
          disabled={isPending}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[#161d31] hover:bg-[#202942] text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          title="Force Re-sync Config"
        >
          <RefreshCw className={`w-3 h-3 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReboot(router);
          }}
          disabled={isPending}
          className="flex items-center gap-1 px-2 py-1 rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-bold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          title="Reboot Router"
        >
          <Power className="w-3 h-3 text-rose-400" />
          <span>Reboot</span>
        </button>

        {onOpenAudit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAudit(router);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="View Audit Trail"
          >
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>Audit</span>
          </button>
        )}
      </div>
    );
  }

  // Header / Expanded variant: Full-sized styled action bar with complete labels
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* WebFig & WinBox Launcher button */}
      <button
        type="button"
        onClick={() => onOpenWebfig(router)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors font-mono shadow-sm cursor-pointer whitespace-nowrap shrink-0"
        title={router.status === 'pending_adoption' ? 'Launch Factory WebFig (192.168.88.1)' : 'Launch WebFig & Quick Tools'}
      >
        <Monitor className="w-3.5 h-3.5" />
        <span>WebFig</span>
      </button>

      {/* Remote Terminal button */}
      <button
        type="button"
        onClick={() => onOpenTerminal(router)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors font-mono shadow-sm cursor-pointer whitespace-nowrap shrink-0"
        title="Open Remote Terminal Console"
      >
        <Terminal className="w-3.5 h-3.5" />
        <span>Terminal</span>
      </button>

      {/* Force Re-sync Config button */}
      <button
        type="button"
        onClick={() => onResync(router)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b233a] hover:bg-[#253050] text-cyan-300 border border-cyan-500/40 text-xs font-bold rounded-lg transition-colors font-mono shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
        title="Force Re-sync WireGuard & RADIUS Configuration"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{isSyncing ? 'Syncing...' : 'Re-sync'}</span>
      </button>

      {/* Reboot Router button */}
      <button
        type="button"
        onClick={() => onReboot(router)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-lg transition-colors font-mono shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
        title="Reboot MikroTik RouterOS"
      >
        <Power className={`w-3.5 h-3.5 text-rose-400 ${isRebooting ? 'animate-pulse' : ''}`} />
        <span>{isRebooting ? 'Rebooting...' : 'Reboot'}</span>
      </button>

      {/* Historical Audit Trail button */}
      {onOpenAudit && (
        <button
          type="button"
          onClick={() => onOpenAudit(router)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#172036] hover:bg-[#202b48] text-amber-300 border border-amber-500/40 text-xs font-bold rounded-lg transition-colors font-mono shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          title="Inspect Historical Audit Trail & Command Logs"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Audit Trail</span>
        </button>
      )}
    </div>
  );
};
