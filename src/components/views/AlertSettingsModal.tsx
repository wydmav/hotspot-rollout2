import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Send, 
  Radio, 
  X,
  Server,
  Volume2,
  VolumeX,
  Laptop
} from 'lucide-react';
import { browserNotificationService } from '../../services/browserNotifications';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'browser' | 'status' | 'logs'>('browser');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [watchdogData, setWatchdogData] = useState<any>(null);
  const [alertLogs, setAlertLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundTested, setSoundTested] = useState(false);

  const syncPermissionState = () => {
    setPermission(browserNotificationService.getPermission());
  };

  const fetchWatchdog = async () => {
    setLoading(true);
    try {
      const wdRes = await fetch('/api/devices/watchdog/status');
      if (wdRes.ok) {
        const wdJson = await wdRes.json();
        setWatchdogData(wdJson);
        if (wdJson.recentAlerts) {
          setAlertLogs(wdJson.recentAlerts);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch watchdog status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      syncPermissionState();
      fetchWatchdog();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await browserNotificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      setTestResult({
        success: true,
        message: 'Browser notification permission granted! Instant offline popups are now active.'
      });
      browserNotificationService.sendTestNotification();
    } else if (res === 'denied') {
      setTestResult({
        success: false,
        message: 'Permission was blocked in browser settings. Please enable notifications in your browser address bar.'
      });
    }
  };

  const handleDispatchBrowserTest = () => {
    if (permission !== 'granted') {
      handleRequestPermission();
      return;
    }
    const sent = browserNotificationService.sendTestNotification();
    if (sent) {
      setTestResult({
        success: true,
        message: 'Native browser test alert and audible chime dispatched!'
      });
    } else {
      setTestResult({
        success: false,
        message: 'Could not display notification. Check if Do Not Disturb is enabled on your OS.'
      });
    }
  };

  const handleTestSound = (type: 'offline' | 'online') => {
    browserNotificationService.playAlertSound(type);
    setSoundTested(true);
    setTimeout(() => setSoundTested(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Deadman Watchdog & Browser Alerts</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  30s SENTINEL ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time native browser notifications when Starlink or MikroTik disconnects
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('browser')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'browser'
                ? 'border-rose-500 text-rose-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            Browser Notification Permission
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'status'
                ? 'border-rose-500 text-rose-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            Sentinel Status
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'logs'
                ? 'border-rose-500 text-rose-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Alert History
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900">
          {testResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in duration-150 ${
              testResult.success 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              <div className="flex-1 text-sm font-semibold">{testResult.message}</div>
            </div>
          )}

          {activeTab === 'browser' && (
            <div className="space-y-5">
              {/* Browser Permission Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                      permission === 'granted'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : permission === 'denied'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      <Bell className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Desktop & Browser Push Permissions</h4>
                      <p className="text-xs text-slate-400">
                        Current Permission Status:{' '}
                        <span className={`font-mono font-bold uppercase ${
                          permission === 'granted' ? 'text-emerald-400' : permission === 'denied' ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {permission}
                        </span>
                      </p>
                    </div>
                  </div>

                  {permission !== 'granted' ? (
                    <button
                      onClick={handleRequestPermission}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                      Enable Browser Notifications
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                      <CheckCircle2 className="w-4 h-4" />
                      ENABLED
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 text-xs text-slate-300 space-y-2">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    How Browser Alerts Work:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                    <li>Triggers as soon as a router misses 2 consecutive heartbeats (30 seconds of silence).</li>
                    <li>Fires even when this browser tab is running in the background or minimized.</li>
                    <li>Accompanied by an instant audio alert chime so you notice even if looking at another screen.</li>
                    <li>No third-party email service or external SMTP server required.</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-900">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestSound('offline')}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                      Test Offline Sound
                    </button>
                    <button
                      onClick={() => handleTestSound('online')}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      Test Recovery Sound
                    </button>
                  </div>

                  <button
                    onClick={handleDispatchBrowserTest}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-transform hover:scale-105 active:scale-95 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Test Notification
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-5">
              {/* Sentinel Status Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Deadman Watchdog Sentinel</h4>
                      <p className="text-xs text-slate-400">Continuous 5s audit cycle • 30s threshold (2 missed 15s heartbeats)</p>
                    </div>
                  </div>
                  <button
                    onClick={fetchWatchdog}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Refresh status"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Heartbeat Cadence</div>
                    <div className="text-emerald-400 font-bold">15 Seconds</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Max Silence Before Offline</div>
                    <div className="text-rose-400 font-bold">30 Seconds (2 beats)</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Notification Channel</div>
                    <div className="text-amber-400 font-bold">Browser Push + Audio Chime</div>
                  </div>
                </div>
              </div>

              {/* Monitored Routers Table */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Currently Monitored Routers ({watchdogData?.routers?.length || 0})</h5>
                {watchdogData?.routers && watchdogData.routers.length > 0 ? (
                  <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden text-xs">
                    {watchdogData.routers.map((r: any) => (
                      <div key={r.id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Server className="w-4 h-4 text-slate-500" />
                          <div>
                            <div className="font-bold text-white">{r.name}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{r.wireguardIp} • {r.siteName}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-400 text-[11px]">
                            {r.secondsSinceHeartbeat !== undefined ? `${r.secondsSinceHeartbeat}s ago` : 'Never'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse'
                          }`}>
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                    No routers adopted yet. Adopt a router using the terminal script to begin tracking.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recent Sentinel Status Checks</span>
                <button
                  onClick={fetchWatchdog}
                  className="hover:text-white flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {watchdogData?.routers && watchdogData.routers.length > 0 ? (
                <div className="space-y-2">
                  {watchdogData.routers.map((r: any) => (
                    <div
                      key={r.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{r.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'online'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {r.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Last Heartbeat: {r.lastHeartbeat} ({r.secondsSinceHeartbeat || 0}s ago) • Uplink WAN: {r.publicWanIp}
                      </div>
                      {r.offlineReason && (
                        <div className="text-rose-400 text-[11px] pt-1 border-t border-slate-900">
                          Offline Alert Reason: {r.offlineReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                  No alerts logged yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="font-mono">
            Notification Mode: <span className="text-white">Native Browser Push (Permission: {permission})</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
