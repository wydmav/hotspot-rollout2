import React, { useState, useEffect, useMemo } from 'react';
import { RouterDevice, AuditLogEntry, AuditLogCategory } from '../../types';
import { auditService, AuditSummaryStats } from '../../services/audit';
import { 
  ShieldCheck, 
  X, 
  Search, 
  Terminal, 
  Power, 
  RefreshCw, 
  Download, 
  FileText, 
  Filter, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle2, 
  Radio, 
  ExternalLink,
  Layers
} from 'lucide-react';

interface RouterAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  router?: RouterDevice | null;
  allRouters?: RouterDevice[];
}

export const RouterAuditModal: React.FC<RouterAuditModalProps> = ({
  isOpen,
  onClose,
  router,
  allRouters = []
}) => {
  const [selectedRouterId, setSelectedRouterId] = useState<string>(router ? router.id : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [stats, setStats] = useState<AuditSummaryStats>({
    totalLogs: 0,
    totalReboots: 0,
    totalCommands: 0,
    totalConfigChanges: 0
  });

  // Keep local filter in sync when modal router changes
  useEffect(() => {
    if (router) {
      setSelectedRouterId(router.id);
    } else {
      setSelectedRouterId('all');
    }
  }, [router]);

  // Load stats and re-calculate on updates
  useEffect(() => {
    const updateStats = () => {
      setStats(auditService.getStats(selectedRouterId === 'all' ? undefined : selectedRouterId));
    };

    updateStats();
    const unsubscribe = auditService.subscribe(updateStats);
    return () => {
      unsubscribe();
    };
  }, [selectedRouterId, isOpen]);

  // Filter logs reactively
  const filteredLogs = useMemo(() => {
    return auditService.getLogs({
      routerId: selectedRouterId === 'all' ? undefined : selectedRouterId,
      category: selectedCategory === 'all' ? undefined : (selectedCategory as AuditLogCategory),
      severity: selectedSeverity === 'all' ? undefined : (selectedSeverity as any),
      search: searchQuery.trim() || undefined,
      limit: 300
    });
  }, [selectedRouterId, selectedCategory, selectedSeverity, searchQuery, stats]);

  if (!isOpen) return null;

  const currentRouter = router || allRouters.find(r => r.id === selectedRouterId);

  const handleExportCsv = () => {
    const targetName = currentRouter ? currentRouter.name.replace(/\s+/g, '_') : 'fleet';
    auditService.exportToCsv(filteredLogs, `tconnect_audit_${targetName}_${Date.now()}.csv`);
  };

  const handleExportJson = () => {
    const targetName = currentRouter ? currentRouter.name.replace(/\s+/g, '_') : 'fleet';
    auditService.exportToJson(filteredLogs, `tconnect_audit_${targetName}_${Date.now()}.json`);
  };

  const getCategoryBadge = (category?: string, action?: string) => {
    if (category === 'router_reboot' || action?.includes('reboot')) {
      return {
        label: 'REBOOT',
        bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        icon: Power
      };
    }
    if (category === 'terminal_command' || action?.includes('terminal')) {
      return {
        label: 'CLI COMMAND',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icon: Terminal
      };
    }
    if (category === 'router_config' || action?.includes('config')) {
      return {
        label: 'CONFIG CHANGE',
        bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        icon: RefreshCw
      };
    }
    if (category === 'router_adoption' || action?.includes('adopt')) {
      return {
        label: 'ADOPTION',
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        icon: ShieldCheck
      };
    }
    return {
      label: 'SYSTEM',
      bg: 'bg-slate-700/50 text-slate-300 border-slate-600',
      icon: FileText
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-slate-700/80 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#070a12] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#f05e17] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight truncate">
                  Router Audit Trail & Historical Accountability
                </h3>
                {currentRouter && selectedRouterId !== 'all' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 border border-orange-500/30 text-orange-400">
                    {currentRouter.name}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    Fleet-Wide Inventory
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Cryptographic immutable log of configuration synchronizations, reboots, and remote terminal commands
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-[#0e1424] border-b border-slate-800/80 font-mono text-xs">
          <div className="bg-[#12192c] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block mb-1">TOTAL LOGGED EVENTS</span>
            <div className="text-lg font-bold text-white">{stats.totalLogs}</div>
            <span className="text-[10px] text-slate-500">Persistent trail</span>
          </div>

          <div className="bg-[#12192c] p-3 rounded-xl border border-rose-500/20">
            <div className="flex items-center justify-between text-rose-400 text-[10px] uppercase mb-1">
              <span>REBOOTS DISPATCHED</span>
              <Power className="w-3.5 h-3.5" />
            </div>
            <div className="text-lg font-bold text-rose-300">{stats.totalReboots}</div>
            <span className="text-[10px] text-slate-500">Controller reboots</span>
          </div>

          <div className="bg-[#12192c] p-3 rounded-xl border border-emerald-500/20">
            <div className="flex items-center justify-between text-emerald-400 text-[10px] uppercase mb-1">
              <span>CLI COMMANDS</span>
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <div className="text-lg font-bold text-emerald-300">{stats.totalCommands}</div>
            <span className="text-[10px] text-slate-500">Terminal executions</span>
          </div>

          <div className="bg-[#12192c] p-3 rounded-xl border border-cyan-500/20">
            <div className="flex items-center justify-between text-cyan-400 text-[10px] uppercase mb-1">
              <span>CONFIG MUTATIONS</span>
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <div className="text-lg font-bold text-cyan-300">{stats.totalConfigChanges}</div>
            <span className="text-[10px] text-slate-500">Re-syncs &amp; WAN rules</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-[#090d16] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands, actor, details, IP..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#141b2d] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#f05e17]"
              />
            </div>

            {/* Router Selector */}
            {allRouters.length > 0 && (
              <select
                value={selectedRouterId}
                onChange={(e) => setSelectedRouterId(e.target.value)}
                className="px-2.5 py-1.5 bg-[#141b2d] border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-[#f05e17]"
              >
                <option value="all">Fleet: All Routers</option>
                {allRouters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.wireguardIp || 'No IP'})
                  </option>
                ))}
              </select>
            )}

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-[#141b2d] border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-[#f05e17]"
            >
              <option value="all">All Categories</option>
              <option value="router_reboot">Reboots</option>
              <option value="terminal_command">CLI Commands</option>
              <option value="router_config">Config Changes</option>
              <option value="router_adoption">Adoptions</option>
            </select>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161f36] hover:bg-[#202c4b] border border-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors font-bold shadow-sm"
              title="Download CSV report for security compliance audits"
            >
              <Download className="w-3.5 h-3.5 text-[#f05e17]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161f36] hover:bg-[#202c4b] border border-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors font-bold shadow-sm"
              title="Download JSON export"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Audit Log Entries List / Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-600" />
              <h4 className="text-sm font-bold text-white">No Audit Events Found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No recorded actions match the active query or filter. Dispatch commands via the Remote Terminal or trigger router actions to build the trail.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getCategoryBadge(log.category, log.action);
              const BadgeIcon = badge.icon;
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className="bg-[#0f1526] border border-slate-800/90 hover:border-slate-700 rounded-xl p-3.5 space-y-2 transition-all shadow-sm"
                >
                  {/* Top Bar: Timestamp, Category, Actor & Role, Target */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        {log.timestamp}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>

                      <span className="text-slate-300 font-bold whitespace-nowrap">
                        {log.actor} <span className="text-slate-500 font-normal">({log.role})</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        Target: <strong className="text-white">{log.target}</strong>
                      </span>
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        IP: {log.ipAddress}
                      </span>
                    </div>
                  </div>

                  {/* Command Box if CLI Command */}
                  {log.command && (
                    <div className="p-2.5 bg-[#060810] border border-slate-800 rounded-lg flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs overflow-x-auto select-all">
                        <Terminal className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <code>[admin@MikroTik] &gt; {log.command}</code>
                      </div>
                      {log.executionTimeMs && (
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {log.executionTimeMs}ms
                        </span>
                      )}
                    </div>
                  )}

                  {/* Details Description */}
                  <div className="flex items-center justify-between text-slate-300 text-xs">
                    <p className="leading-relaxed text-slate-300">
                      {log.details}
                    </p>

                    {log.outputPreview && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-[11px] text-[#f05e17] hover:text-orange-400 flex items-center gap-1 shrink-0 ml-3 underline"
                      >
                        <span>{isExpanded ? 'Hide CLI Output' : 'View CLI Output'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {/* Expandable CLI Output Preview */}
                  {isExpanded && log.outputPreview && (
                    <div className="p-3 bg-black/70 border border-slate-800 rounded-lg mt-2 space-y-1 animate-in fade-in duration-100">
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        RouterOS Output Capture:
                      </div>
                      <pre className="text-slate-300 text-[11px] font-mono whitespace-pre-wrap select-all max-h-48 overflow-y-auto">
                        {log.outputPreview}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#070a12] border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="text-slate-500">
            Showing {filteredLogs.length} historical records • Tamper-resistant log
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#161f36] hover:bg-[#202c4b] border border-slate-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
