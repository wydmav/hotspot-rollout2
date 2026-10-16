import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Play, RefreshCw, Copy, Check, ShieldCheck, Sparkles, CornerDownLeft, Trash2 } from 'lucide-react';
import { RouterDevice } from '../../types';

interface InteractiveTerminalModalProps {
  router: RouterDevice;
  onClose: () => void;
  onExecuteCommand?: (routerId: string, command: string) => Promise<{ output: string; status: 'success' | 'error' }>;
}

interface TerminalLogLine {
  id: string;
  timestamp: string;
  type: 'command' | 'output' | 'error' | 'system';
  text: string;
}

export const InteractiveTerminalModal: React.FC<InteractiveTerminalModalProps> = ({
  router,
  onClose,
  onExecuteCommand,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copiedBuffer, setCopiedBuffer] = useState(false);

  const initialBanner: TerminalLogLine[] = [
    {
      id: 'init_1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      text: `  MMMM  MMMM  IIII  KK  KK  RRRRRR    OOOOOO   TTTTTTTT  IIII  KK  KK`
    },
    {
      id: 'init_2',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      text: `  MM MM  MM MM   II   KK KK   RR   RR  OO    OO     TT      II   KK KK`
    },
    {
      id: 'init_3',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      text: `  MM  MMMM  MM   II   KKKK    RRRRRR   OO    OO     TT      II   KKKK`
    },
    {
      id: 'init_4',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      text: `  MM   TM   MM  IIII  KK  KK  RR  RR    OOOOOO      TT     IIII  KK  KK`
    },
    {
      id: 'init_5',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      text: `  MikroTik RouterOS 7.14.2 (c) 1999-2026 RouterBOARD · Node: ${router.name} (${router.wireguardIp || router.publicWanIp || '10.89.1.1'})`
    },
    {
      id: 'init_6',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      text: `  Authenticated session active for T-Connect Cloud Controller · WireGuard Tunnel: WG-SWARM-01`
    },
    {
      id: 'init_7',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      text: `  Type 'help' or click preset shortcuts below to run CLI commands.`
    }
  ];

  const [lines, setLines] = useState<TerminalLogLine[]>(initialBanner);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when terminal output grows
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  // Auto focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const executeCommand = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear') {
      setLines([]);
      setCommandInput('');
      return;
    }

    if (trimmed.toLowerCase() === 'help') {
      const now = new Date().toLocaleTimeString();
      setLines(prev => [
        ...prev,
        { id: `cmd_${Date.now()}`, timestamp: now, type: 'command', text: trimmed },
        { id: `out_${Date.now()}_1`, timestamp: now, type: 'output', text: 'Available MikroTik Terminal Commands:' },
        { id: `out_${Date.now()}_2`, timestamp: now, type: 'output', text: '  /ip address print           - Show IP interface addresses' },
        { id: `out_${Date.now()}_3`, timestamp: now, type: 'output', text: '  /interface wireguard print  - Show active WireGuard tunnel peers' },
        { id: `out_${Date.now()}_4`, timestamp: now, type: 'output', text: '  /system resource print      - Display CPU, memory & uptime telemetry' },
        { id: `out_${Date.now()}_5`, timestamp: now, type: 'output', text: '  /ip hotspot user print      - List captive portal active guest users' },
        { id: `out_${Date.now()}_6`, timestamp: now, type: 'output', text: '  /log print                  - Inspect real-time router event logs' },
        { id: `out_${Date.now()}_7`, timestamp: now, type: 'output', text: '  clear                       - Clear terminal screen' }
      ]);
      setHistory(prev => [trimmed, ...prev]);
      setHistoryIndex(-1);
      setCommandInput('');
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    setLines(prev => [
      ...prev,
      { id: `cmd_${Date.now()}`, timestamp, type: 'command', text: trimmed }
    ]);
    setHistory(prev => [trimmed, ...prev]);
    setHistoryIndex(-1);
    setCommandInput('');
    setIsExecuting(true);

    try {
      let outputText = '';
      let isError = false;

      if (onExecuteCommand) {
        const res = await onExecuteCommand(router.id, trimmed);
        outputText = res.output;
        isError = res.status === 'error';
      } else {
        const res = await fetch(`/api/devices/${router.id}/terminal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: trimmed })
        });
        const data = await res.json();
        if (res.ok && data.output) {
          outputText = data.output;
        } else {
          outputText = data.message || data.error || 'Command execution error.';
          isError = true;
        }
      }

      const outputLines = outputText.split('\n');
      setLines(prev => [
        ...prev,
        ...outputLines.map((line, idx) => ({
          id: `out_${Date.now()}_${idx}`,
          timestamp: new Date().toLocaleTimeString(),
          type: isError ? ('error' as const) : ('output' as const),
          text: line
        }))
      ]);
    } catch (err: any) {
      setLines(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          text: `Terminal Error: ${err.message || 'Failed to communicate with router gateway.'}`
        }
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(commandInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setCommandInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommandInput(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    }
  };

  const handleCopyBuffer = () => {
    const textToCopy = lines.map(l => l.text).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedBuffer(true);
    setTimeout(() => setCopiedBuffer(false), 2000);
  };

  const presets = [
    { label: '/ip address print', cmd: '/ip address print' },
    { label: '/interface wireguard print', cmd: '/interface wireguard print' },
    { label: '/system resource print', cmd: '/system resource print' },
    { label: '/ip hotspot user print', cmd: '/ip hotspot user print' },
    { label: '/log print', cmd: '/log print' },
    { label: 'Clear', cmd: 'clear' },
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-[10000] font-mono">
      <div className="bg-[#0a0e17] border border-[#232d42] rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Terminal Header Bar */}
        <div className="bg-[#121829] px-4 py-3 border-b border-[#232d42] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            <div className="flex items-center gap-2 text-white font-bold text-xs pl-2 border-l border-[#232d42]">
              <Terminal className="w-4 h-4 text-[#f05e17]" />
              <span>{router.name} (Interactive CLI Terminal)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hidden sm:inline-block">
              {router.wireguardIp || router.publicWanIp || '10.89.1.1'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyBuffer}
              className="px-2.5 py-1 rounded-lg bg-[#1a233a] hover:bg-[#253252] border border-[#2b3859] text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Copy entire terminal output buffer"
            >
              {copiedBuffer ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedBuffer ? 'Copied' : 'Copy Logs'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1f283d] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Command Shortcuts Strip */}
        <div className="bg-[#0f1422] px-4 py-2 border-b border-[#1f283d] flex items-center gap-2 overflow-x-auto text-[11px] shrink-0">
          <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#f05e17]" />
            <span>Shortcuts:</span>
          </span>
          {presets.map((p) => (
            <button
              key={p.cmd}
              type="button"
              onClick={() => executeCommand(p.cmd)}
              disabled={isExecuting}
              className="px-2.5 py-1 rounded bg-[#161d31] hover:bg-[#202a45] border border-[#232d42] text-slate-300 hover:text-white transition-colors shrink-0 text-[10px] font-bold cursor-pointer disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Scrollable Terminal Output Screen */}
        <div className="flex-1 bg-[#060911] p-4 overflow-y-auto space-y-1 text-xs select-text font-mono leading-relaxed">
          {lines.map((l) => {
            if (l.type === 'command') {
              return (
                <div key={l.id} className="flex items-center gap-2 text-emerald-400 font-bold pt-1.5">
                  <span className="text-slate-500 text-[10px] select-none">[{l.timestamp}]</span>
                  <span className="text-[#f05e17]">admin@{router.name} &gt;</span>
                  <span className="text-white">{l.text}</span>
                </div>
              );
            }
            if (l.type === 'error') {
              return (
                <div key={l.id} className="text-rose-400 pl-4 font-semibold">
                  {l.text}
                </div>
              );
            }
            if (l.type === 'system') {
              return (
                <div key={l.id} className="text-cyan-400/90 whitespace-pre">
                  {l.text}
                </div>
              );
            }
            return (
              <div key={l.id} className="text-slate-300 pl-2 whitespace-pre-wrap font-mono text-[11px]">
                {l.text}
              </div>
            );
          })}

          {isExecuting && (
            <div className="flex items-center gap-2 text-amber-400 font-bold pt-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#f05e17]" />
              <span>Dispatching CLI packet over WireGuard tunnel...</span>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* Command Input Prompt Bar */}
        <div className="bg-[#0e1322] p-3 border-t border-[#232d42] flex items-center gap-2 shrink-0">
          <span className="text-[#f05e17] font-bold text-xs shrink-0 hidden sm:inline">
            admin@{router.name} &gt;
          </span>
          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              placeholder="Type MikroTik CLI command (e.g. /ip address print)..."
              className="w-full bg-[#060911] border border-[#232d42] focus:border-[#f05e17] rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#f05e17]"
            />
          </div>
          <button
            type="button"
            onClick={() => executeCommand(commandInput)}
            disabled={isExecuting || !commandInput.trim()}
            className="px-4 py-2 bg-[#f05e17] hover:bg-[#d94c0b] disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-colors shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Execute</span>
          </button>
        </div>
      </div>
    </div>
  );
};
