import React, { useState, useEffect, useRef } from 'react';
import { RouterDevice } from '../../types';
import { auditService } from '../../services/audit';
import { 
  Terminal, 
  X, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  Play
} from 'lucide-react';

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error';
  text: string;
  timestamp: string;
}

export interface RemoteTerminalModalProps {
  router: RouterDevice;
  isOpen: boolean;
  onClose: () => void;
  onRouterRebooted?: () => void;
}

export const RemoteTerminalModal: React.FC<RemoteTerminalModalProps> = ({
  router,
  isOpen,
  onClose,
  onRouterRebooted
}) => {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copied, setCopied] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize terminal banner when opened
  useEffect(() => {
    if (isOpen) {
      const banner: TerminalLine[] = [
        {
          id: 'b-1',
          type: 'system',
          text: `  MMM      MMM       KKK                          TTTTTTTTTTT      KKK`,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: 'b-2',
          type: 'system',
          text: `  MMMM    MMMM       KKK                            TTT           KKK`,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: 'b-3',
          type: 'system',
          text: `  MMM MMMM MMM  III  KKK  KKK  RRRRR   OOOOO        TTT      III  KKK  KKK`,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: 'b-4',
          type: 'system',
          text: `  MMM  MM  MMM  III  KKKKK     RR  RR OO   OO       TTT      III  KKKKK   `,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: 'b-5',
          type: 'system',
          text: `  MMM      MMM  III  KKK  KKK  RRRRR   OOOOO        TTT      III  KKK  KKK`,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: 'b-6',
          type: 'system',
          text: `MikroTik RouterOS 7.15.2 (c) 1999-2026       http://www.mikrotik.com/`,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          id: 'b-7',
          type: 'system',
          text: `[T-Connect Controller Remote SSH Bridge: ${router.wireguardIp || '10.99.1.50'} | Hostname: ${router.name}]`,
          timestamp: new Date().toLocaleTimeString()
        }
      ];
      setTerminalLines(banner);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, router]);

  // Auto-scroll on new output lines
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  if (!isOpen) return null;

  const handleExecuteCommand = async (cmdToRun?: string) => {
    const rawCmd = (cmdToRun !== undefined ? cmdToRun : command).trim();
    if (!rawCmd) return;

    const timeStr = new Date().toLocaleTimeString();
    
    // Add input command line
    setTerminalLines(prev => [
      ...prev,
      {
        id: `in-${Date.now()}`,
        type: 'input',
        text: `[admin@${router.name.replace(/\s+/g, '-')}] > ${rawCmd}`,
        timestamp: timeStr
      }
    ]);

    // Save to command history
    setHistory(prev => [...prev.filter(h => h !== rawCmd), rawCmd]);
    setHistoryIndex(-1);
    setCommand('');
    setLoading(true);

    const startTime = Date.now();

    try {
      const res = await fetch(`/api/devices/${router.id}/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: rawCmd })
      });
      const data = await res.json();
      const elapsedMs = Date.now() - startTime;

      if (res.ok && data.success) {
        setTerminalLines(prev => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            type: 'output',
            text: data.output,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);

        // Record successful CLI command in audit trail
        auditService.logTerminalCommand(router, rawCmd, {
          output: data.output,
          isSuccess: true,
          executionTimeMs: data.durationMs || elapsedMs
        });

        if (rawCmd.includes('reboot')) {
          auditService.logRouterReboot(router, {
            source: 'terminal_modal',
            reason: `Dispatched via terminal CLI command: "${rawCmd}"`
          });
          if (onRouterRebooted) {
            onRouterRebooted();
          }
        }
      } else {
        const errorMsg = data.message || `bad command name ${rawCmd} (line 1 column 1)`;
        setTerminalLines(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            text: errorMsg,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);

        // Record failed CLI command in audit trail
        auditService.logTerminalCommand(router, rawCmd, {
          isSuccess: false,
          executionTimeMs: elapsedMs,
          errorMessage: errorMsg
        });
      }
    } catch (err: any) {
      const elapsedMs = Date.now() - startTime;
      const errorMsg = `Connection failed: ${err.message || 'Remote tunnel timeout'}`;
      setTerminalLines(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'error',
          text: errorMsg,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);

      // Record network failure in audit trail
      auditService.logTerminalCommand(router, rawCmd, {
        isSuccess: false,
        executionTimeMs: elapsedMs,
        errorMessage: err.message
      });
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecuteCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setCommand(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIndex = historyIndex + 1;
        if (nextIndex >= history.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(nextIndex);
          setCommand(history[nextIndex]);
        }
      }
    }
  };

  const copyTerminalOutput = () => {
    const text = terminalLines.map(l => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearScreen = () => {
    setTerminalLines([
      {
        id: `clr-${Date.now()}`,
        type: 'system',
        text: `Terminal cleared. Connected to ${router.name} (${router.wireguardIp || '10.99.1.50'}).`,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const quickPresets = [
    { label: 'Resources', cmd: '/system resource print' },
    { label: 'IP Addresses', cmd: '/ip address print' },
    { label: 'Interfaces', cmd: '/interface print' },
    { label: 'Active Hotspot', cmd: '/ip hotspot active print' },
    { label: 'Ping 1.1.1.1', cmd: '/ping 1.1.1.1 count=4' },
    { label: 'Reboot', cmd: '/system reboot' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#0b0f19] border border-slate-700/80 rounded-2xl w-full max-w-4xl h-[85vh] max-h-[780px] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Terminal Header */}
        <div className="px-5 py-3.5 bg-[#0f1422] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="h-4 w-px bg-slate-700/60 mx-1" />
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white tracking-wide">
                Terminal: {router.name}
              </span>
              <span className="text-xs text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded">
                {router.wireguardIp || '10.99.1.50'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                router.status === 'online' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {router.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyTerminalOutput}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
              title="Copy Terminal Text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px] hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={clearScreen}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
              title="Clear Screen"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] hidden sm:inline">Clear</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white transition-colors"
              title="Close Terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-4 py-2 bg-[#090d15] border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 scrollbar-none">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mr-1 shrink-0">
            Presets:
          </span>
          {quickPresets.map((preset) => (
            <button
              key={preset.cmd}
              onClick={() => handleExecuteCommand(preset.cmd)}
              disabled={loading}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors whitespace-nowrap flex items-center gap-1 border ${
                preset.cmd.includes('reboot')
                  ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/50 text-rose-300'
                  : 'bg-slate-800/60 hover:bg-slate-700/80 border-slate-700/60 text-slate-200'
              }`}
            >
              <Play className="w-2.5 h-2.5 text-orange-400" />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Terminal Screen / Output View */}
        <div 
          onClick={() => inputRef.current?.focus()}
          className="flex-1 p-4 overflow-y-auto space-y-1.5 text-xs text-slate-300 bg-[#070a12] select-text cursor-text"
        >
          {terminalLines.map((line) => {
            if (line.type === 'system') {
              return (
                <div key={line.id} className="text-slate-500 whitespace-pre font-mono text-[11px]">
                  {line.text}
                </div>
              );
            }
            if (line.type === 'input') {
              return (
                <div key={line.id} className="text-cyan-300 font-bold mt-2 font-mono flex items-center gap-2">
                  <span>{line.text}</span>
                </div>
              );
            }
            if (line.type === 'error') {
              return (
                <div key={line.id} className="text-rose-400 font-mono pl-4 whitespace-pre">
                  {line.text}
                </div>
              );
            }
            return (
              <div key={line.id} className="text-emerald-300 font-mono pl-2 whitespace-pre leading-relaxed">
                {line.text}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono py-1 pl-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Executing RouterOS command over WireGuard tunnel...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Command Input Bar */}
        <div className="p-3 bg-[#0f1422] border-t border-slate-800 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs select-none">
            <span>[admin@{router.name.split(' ')[0]}]</span>
            <span className="text-emerald-400">&gt;</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type RouterOS command (e.g. /system resource print, /ping 1.1.1.1)..."
            disabled={loading}
            className="flex-1 bg-transparent border-none text-white text-xs font-mono focus:outline-none placeholder:text-slate-600"
            autoFocus
          />
          <button
            onClick={() => handleExecuteCommand()}
            disabled={loading || !command.trim()}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Run</span>
          </button>
        </div>
      </div>
    </div>
  );
};
