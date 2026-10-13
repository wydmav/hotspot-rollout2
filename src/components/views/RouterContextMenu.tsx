import React, { useEffect, useRef } from 'react';
import { RouterDevice } from '../../types';
import { 
  Terminal, 
  Monitor, 
  RefreshCw, 
  Power, 
  Copy, 
  Trash2, 
  ShieldCheck, 
  ExternalLink,
  Zap,
  Activity
} from 'lucide-react';

interface RouterContextMenuProps {
  router: RouterDevice;
  position: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
  onOpenTerminal: (router: RouterDevice) => void;
  onOpenWebfig: (router: RouterDevice) => void;
  onRebootRouter: (router: RouterDevice) => void;
  onResyncConfig: (router: RouterDevice) => void;
  onCopyOneLiner: (router: RouterDevice) => void;
  onDeleteRouter?: (routerId: string) => void;
  onOpenAuditModal?: (router: RouterDevice) => void;
  onOpenDetailedView?: (router: RouterDevice) => void;
}

export const RouterContextMenu: React.FC<RouterContextMenuProps> = ({
  router,
  position,
  isOpen,
  onClose,
  onOpenTerminal,
  onOpenWebfig,
  onRebootRouter,
  onResyncConfig,
  onCopyOneLiner,
  onDeleteRouter,
  onOpenAuditModal,
  onOpenDetailedView
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Viewport bounds calculation to prevent overflowing the screen
  const menuWidth = 240;
  const menuHeight = 310;
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

  let left = position.x;
  let top = position.y;

  if (left + menuWidth > screenW - 16) {
    left = Math.max(16, screenW - menuWidth - 16);
  }
  if (top + menuHeight > screenH - 16) {
    top = Math.max(16, screenH - menuHeight - 16);
  }

  return (
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-60 rounded-xl bg-[#0f1422] border border-slate-700/80 shadow-2xl shadow-black/80 py-1.5 text-xs font-mono animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header Info */}
      <div className="px-3.5 py-2 border-b border-[#232d42] mb-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white truncate max-w-[140px]">{router.name}</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
            router.status === 'online' 
              ? 'text-emerald-400 bg-emerald-500/10' 
              : router.status === 'offline'
              ? 'text-rose-400 bg-rose-500/10'
              : 'text-amber-400 bg-amber-500/10'
          }`}>
            {router.status.toUpperCase()}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 truncate mt-0.5">
          {router.wireguardIp || '10.99.1.50'} • {router.model.split(' ')[0]}
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-0.5 px-1">
        {onOpenDetailedView && (
          <button
            onClick={() => {
              onClose();
              onOpenDetailedView(router);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-white hover:bg-[#1b233a] rounded-lg transition-colors text-left font-bold"
          >
            <Activity className="w-3.5 h-3.5 text-orange-400" />
            <span>Open Detailed Router View</span>
          </button>
        )}

        <button
          onClick={() => {
            onClose();
            onOpenTerminal(router);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-[#1b233a] rounded-lg transition-colors text-left"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">Open Remote Terminal</span>
        </button>

        <button
          onClick={() => {
            onClose();
            onOpenWebfig(router);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-[#1b233a] rounded-lg transition-colors text-left"
        >
          <Monitor className="w-3.5 h-3.5 text-orange-400" />
          <span className="font-semibold">Launch WebFig / WinBox</span>
        </button>

        <button
          onClick={() => {
            onClose();
            onResyncConfig(router);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-[#1b233a] rounded-lg transition-colors text-left"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold">Force Re-sync Config</span>
        </button>

        <button
          onClick={() => {
            onClose();
            onRebootRouter(router);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg transition-colors text-left"
        >
          <Power className="w-3.5 h-3.5 text-rose-400" />
          <span className="font-semibold">Reboot Router</span>
        </button>

        {onOpenAuditModal && (
          <button
            onClick={() => {
              onClose();
              onOpenAuditModal(router);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-200 hover:text-white hover:bg-[#1b233a] rounded-lg transition-colors text-left"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">View Audit Trail</span>
          </button>
        )}

        <div className="my-1 border-t border-[#232d42]" />

        <button
          onClick={() => {
            onClose();
            onCopyOneLiner(router);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-[#1b233a] rounded-lg transition-colors text-left"
        >
          <Copy className="w-3.5 h-3.5 text-slate-400" />
          <span>Copy Adoption Script</span>
        </button>

        {onDeleteRouter && (
          <button
            onClick={() => {
              onClose();
              if (confirm(`Remove router "${router.name}" from fleet inventory?`)) {
                onDeleteRouter(router.id);
              }
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Delete from Fleet</span>
          </button>
        )}
      </div>
    </div>
  );
};
