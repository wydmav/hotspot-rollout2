import { useState, useCallback } from 'react';
import { RouterDevice } from '../types';
import { auditService } from '../services/audit';

export interface UseRouterActionsOptions {
  onSuccess?: (action: string, router: RouterDevice) => void;
  onError?: (action: string, error: string, router: RouterDevice) => void;
}

export function useRouterActions(defaultRouter?: RouterDevice | null, options?: UseRouterActionsOptions) {
  const [isActionPending, setIsActionPending] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [terminalModalRouter, setTerminalModalRouter] = useState<RouterDevice | null>(null);
  const [webfigModalRouter, setWebfigModalRouter] = useState<RouterDevice | null>(null);
  const [auditModalRouter, setAuditModalRouter] = useState<RouterDevice | null>(null);

  const triggerToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setActionToast({ message, type });
    setTimeout(() => {
      setActionToast(null);
    }, 4500);
  }, []);

  const dismissToast = useCallback(() => {
    setActionToast(null);
  }, []);

  const openTerminal = useCallback((targetRouter?: RouterDevice) => {
    const r = targetRouter || defaultRouter;
    if (r) setTerminalModalRouter(r);
  }, [defaultRouter]);

  const closeTerminal = useCallback(() => {
    setTerminalModalRouter(null);
  }, []);

  const openWebFig = useCallback((targetRouter?: RouterDevice) => {
    const r = targetRouter || defaultRouter;
    if (r) setWebfigModalRouter(r);
  }, [defaultRouter]);

  const closeWebFig = useCallback(() => {
    setWebfigModalRouter(null);
  }, []);

  const openAudit = useCallback((targetRouter?: RouterDevice) => {
    const r = targetRouter || defaultRouter;
    if (r) setAuditModalRouter(r);
  }, [defaultRouter]);

  const closeAudit = useCallback(() => {
    setAuditModalRouter(null);
  }, []);

  const handleReboot = useCallback(async (
    targetRouter?: RouterDevice,
    opts?: { skipConfirm?: boolean; reason?: string }
  ): Promise<boolean> => {
    const r = targetRouter || defaultRouter;
    if (!r) return false;

    if (!opts?.skipConfirm && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Are you sure you want to reboot "${r.name}"? Active hotspot sessions will temporarily disconnect.`
      );
      if (!confirmed) return false;
    }

    setIsActionPending(true);
    setActiveAction('reboot');

    try {
      const res = await fetch(`/api/devices/${r.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reboot' })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        auditService.logRouterReboot(r, {
          source: 'context_menu',
          reason: opts?.reason || 'Reboot dispatched via Router Action Controller'
        });
        triggerToast(`Reboot dispatched to ${r.name}. Device restarting...`, 'success');
        options?.onSuccess?.('reboot', r);
        return true;
      } else {
        const errMsg = data.message || `Failed to reboot ${r.name}`;
        triggerToast(errMsg, 'error');
        options?.onError?.('reboot', errMsg, r);
        return false;
      }
    } catch (err: any) {
      const errMsg = `Network error: ${err.message}`;
      triggerToast(errMsg, 'error');
      options?.onError?.('reboot', errMsg, r);
      return false;
    } finally {
      setIsActionPending(false);
      setActiveAction(null);
    }
  }, [defaultRouter, triggerToast, options]);

  const handleResync = useCallback(async (
    targetRouter?: RouterDevice
  ): Promise<boolean> => {
    const r = targetRouter || defaultRouter;
    if (!r) return false;

    setIsActionPending(true);
    setActiveAction('resync');

    try {
      const res = await fetch(`/api/devices/${r.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resync-config' })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        auditService.logConfigChange(
          r,
          'resync',
          `WireGuard tunnel keys, RADIUS attributes, and Hotspot Walled Garden rules verified for ${r.name}`
        );
        triggerToast(`Config re-sync complete for ${r.name}. WireGuard & Hotspot rules verified.`, 'success');
        options?.onSuccess?.('resync', r);
        return true;
      } else {
        const errMsg = data.message || `Failed to re-sync ${r.name}`;
        triggerToast(errMsg, 'error');
        options?.onError?.('resync', errMsg, r);
        return false;
      }
    } catch (err: any) {
      const errMsg = `Network error: ${err.message}`;
      triggerToast(errMsg, 'error');
      options?.onError?.('resync', errMsg, r);
      return false;
    } finally {
      setIsActionPending(false);
      setActiveAction(null);
    }
  }, [defaultRouter, triggerToast, options]);

  const handleFlushSessions = useCallback(async (
    targetRouter?: RouterDevice
  ): Promise<boolean> => {
    const r = targetRouter || defaultRouter;
    if (!r) return false;

    setIsActionPending(true);
    setActiveAction('flush-sessions');

    try {
      const res = await fetch(`/api/devices/${r.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flush-sessions' })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        auditService.logConfigChange(
          r,
          'flush_sessions',
          `Active hotspot sessions cleared and RADIUS accounting counters reset for ${r.name}`
        );
        triggerToast(`Active sessions cleared for ${r.name}. RADIUS accounting counters reset.`, 'success');
        options?.onSuccess?.('flush-sessions', r);
        return true;
      } else {
        const errMsg = data.message || `Failed to flush sessions for ${r.name}`;
        triggerToast(errMsg, 'error');
        options?.onError?.('flush-sessions', errMsg, r);
        return false;
      }
    } catch (err: any) {
      const errMsg = `Network error: ${err.message}`;
      triggerToast(errMsg, 'error');
      options?.onError?.('flush-sessions', errMsg, r);
      return false;
    } finally {
      setIsActionPending(false);
      setActiveAction(null);
    }
  }, [defaultRouter, triggerToast, options]);

  return {
    isActionPending,
    activeAction,
    actionToast,
    dismissToast,
    triggerToast,
    terminalModalRouter,
    webfigModalRouter,
    auditModalRouter,
    openTerminal,
    closeTerminal,
    openWebFig,
    closeWebFig,
    openAudit,
    closeAudit,
    handleReboot,
    handleResync,
    handleFlushSessions
  };
}
