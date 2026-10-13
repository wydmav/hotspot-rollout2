import { AuditLogEntry, AuditLogCategory, RouterDevice } from '../types';
import { storage } from './storage';

export interface AuditFilterOptions {
  category?: AuditLogCategory;
  routerId?: string;
  search?: string;
  severity?: 'info' | 'warning' | 'critical';
  status?: 'success' | 'failed' | 'pending';
  limit?: number;
}

export interface AuditSummaryStats {
  totalLogs: number;
  totalReboots: number;
  totalCommands: number;
  totalConfigChanges: number;
  lastActivity?: string;
}

class AuditService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Synchronize with reactive storage updates
    if (typeof window !== 'undefined') {
      storage.subscribe(() => {
        this.notify();
      });
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('AuditService listener error:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Retrieves the current authenticated user context from storage
   */
  private getAuthContext(): { actor: string; role: string } {
    try {
      const session = storage.getAuthSession();
      if (session && session.user) {
        return {
          actor: session.user.name || 'Admin',
          role: session.effectiveRole || session.user.role || 'Owner'
        };
      }
    } catch {}
    return {
      actor: 'Admin',
      role: 'Owner'
    };
  }

  /**
   * Primary audit logging entry point
   */
  public log(entry: Partial<AuditLogEntry> & { action: string; target: string; details: string }): AuditLogEntry {
    const defaultAuth = this.getAuthContext();
    const actor = entry.actor || defaultAuth.actor;
    const role = entry.role || defaultAuth.role;

    const recorded = storage.logAudit({
      ...entry,
      actor,
      role,
      ipAddress: entry.ipAddress || (typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1')
    });

    // Mirror to backend API if reachable (fire and forget)
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recorded)
      }).catch(() => {
        // quiet catch - offline/standalone safety
      });
    }

    this.notify();
    return recorded;
  }

  /**
   * Captures router reboot dispatches
   */
  public logRouterReboot(
    router: { id: string; name: string; wireguardIp?: string },
    options?: {
      actor?: string;
      role?: string;
      reason?: string;
      clientIp?: string;
      source?: 'context_menu' | 'terminal_modal' | 'webfig_launcher' | 'api';
    }
  ): AuditLogEntry {
    const details = options?.reason 
      ? `Reboot dispatched: ${options.reason}` 
      : `Reboot command dispatched to MikroTik RouterOS (${router.wireguardIp || 'WireGuard Tunnel'}). Hardware resetting.`;

    return this.log({
      category: 'router_reboot',
      action: 'router.reboot',
      target: router.name,
      routerId: router.id,
      routerName: router.name,
      details,
      severity: 'warning',
      status: 'success',
      actor: options?.actor,
      role: options?.role,
      ipAddress: options?.clientIp,
      metadata: {
        source: options?.source || 'controller_ui',
        wireguardIp: router.wireguardIp
      }
    });
  }

  /**
   * Captures RouterOS CLI command executions in Remote Terminal
   */
  public logTerminalCommand(
    router: { id: string; name: string; wireguardIp?: string },
    command: string,
    options?: {
      output?: string;
      isSuccess?: boolean;
      actor?: string;
      role?: string;
      executionTimeMs?: number;
      errorMessage?: string;
    }
  ): AuditLogEntry {
    const isSuccess = options?.isSuccess !== false;
    const cleanOutput = options?.output ? options.output.trim().slice(0, 350) : undefined;

    return this.log({
      category: 'terminal_command',
      action: 'router.terminal_command',
      target: router.name,
      routerId: router.id,
      routerName: router.name,
      command,
      outputPreview: cleanOutput,
      status: isSuccess ? 'success' : 'failed',
      severity: isSuccess ? 'info' : 'warning',
      executionTimeMs: options?.executionTimeMs,
      details: isSuccess
        ? `Executed RouterOS CLI command: "${command}"`
        : `Command execution failed: "${command}"${options?.errorMessage ? ` - ${options.errorMessage}` : ''}`,
      actor: options?.actor,
      role: options?.role,
      metadata: {
        wireguardIp: router.wireguardIp,
        hasOutput: Boolean(options?.output)
      }
    });
  }

  /**
   * Captures router configuration updates (re-sync, WAN failover, port bridge, free mode, etc.)
   */
  public logConfigChange(
    router: { id: string; name: string; wireguardIp?: string },
    changeType: string,
    details: string,
    options?: {
      actor?: string;
      role?: string;
      severity?: 'info' | 'warning' | 'critical';
      previousValue?: any;
      newValue?: any;
      metadata?: Record<string, any>;
    }
  ): AuditLogEntry {
    return this.log({
      category: 'router_config',
      action: `router.config_${changeType.replace(/\s+/g, '_').toLowerCase()}`,
      target: router.name,
      routerId: router.id,
      routerName: router.name,
      details,
      severity: options?.severity || 'info',
      status: 'success',
      actor: options?.actor,
      role: options?.role,
      metadata: {
        changeType,
        previousValue: options?.previousValue,
        newValue: options?.newValue,
        ...options?.metadata
      }
    });
  }

  /**
   * Captures router onboarding / adoption
   */
  public logRouterAdoption(
    router: { id: string; name: string; model?: string },
    actor?: string
  ): AuditLogEntry {
    return this.log({
      category: 'router_adoption',
      action: 'router.adopt',
      target: router.name,
      routerId: router.id,
      routerName: router.name,
      details: `Router "${router.name}" (${router.model || 'MikroTik'}) successfully completed adoption and connected to WireGuard mesh.`,
      severity: 'info',
      status: 'success',
      actor
    });
  }

  /**
   * Captures router decommissioning / deletion
   */
  public logRouterDeletion(
    router: { id: string; name: string; model?: string },
    actor?: string
  ): AuditLogEntry {
    return this.log({
      category: 'router_lifecycle',
      action: 'router.delete',
      target: router.name,
      routerId: router.id,
      routerName: router.name,
      details: `Router "${router.name}" revoked, tunnel keys deleted, and removed from fleet controller.`,
      severity: 'critical',
      status: 'success',
      actor
    });
  }

  /**
   * Returns filtered audit entries
   */
  public getLogs(filter?: AuditFilterOptions): AuditLogEntry[] {
    const all = storage.getState().auditLogs || [];

    if (!filter) return all;

    return all.filter((log) => {
      if (filter.category && log.category !== filter.category) {
        return false;
      }
      if (filter.routerId && log.routerId !== filter.routerId && log.target !== filter.routerId) {
        return false;
      }
      if (filter.severity && log.severity !== filter.severity) {
        return false;
      }
      if (filter.status && log.status !== filter.status) {
        return false;
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const matches = 
          log.actor.toLowerCase().includes(q) ||
          log.role.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.target.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          (log.command && log.command.toLowerCase().includes(q)) ||
          (log.ipAddress && log.ipAddress.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    }).slice(0, filter.limit || 500);
  }

  /**
   * Returns historical audit trail for a specific router
   */
  public getRouterLogs(routerId: string, limit = 100): AuditLogEntry[] {
    return this.getLogs({ routerId, limit });
  }

  /**
   * Aggregates stats for summary dashboards
   */
  public getStats(routerId?: string): AuditSummaryStats {
    const logs = routerId ? this.getRouterLogs(routerId, 1000) : (storage.getState().auditLogs || []);

    let totalReboots = 0;
    let totalCommands = 0;
    let totalConfigChanges = 0;

    for (const log of logs) {
      if (log.category === 'router_reboot' || log.action.includes('reboot')) {
        totalReboots++;
      } else if (log.category === 'terminal_command' || log.command) {
        totalCommands++;
      } else if (log.category === 'router_config' || log.action.includes('config')) {
        totalConfigChanges++;
      }
    }

    return {
      totalLogs: logs.length,
      totalReboots,
      totalCommands,
      totalConfigChanges,
      lastActivity: logs[0]?.timestamp
    };
  }

  /**
   * Exports audit log entries as standard CSV for compliance and security reviews
   */
  public exportToCsv(logs?: AuditLogEntry[], filename?: string): void {
    const targetLogs = logs || storage.getState().auditLogs || [];
    const headers = [
      'Timestamp',
      'Actor',
      'Role',
      'Category',
      'Action',
      'Target Router',
      'Router ID',
      'Command Executed',
      'Details',
      'Status',
      'Severity',
      'IP Address'
    ];

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = targetLogs.map((log) => [
      escapeCsv(log.timestamp),
      escapeCsv(log.actor),
      escapeCsv(log.role),
      escapeCsv(log.category || 'general'),
      escapeCsv(log.action),
      escapeCsv(log.target),
      escapeCsv(log.routerId || 'N/A'),
      escapeCsv(log.command || ''),
      escapeCsv(log.details),
      escapeCsv(log.status || 'success'),
      escapeCsv(log.severity || 'info'),
      escapeCsv(log.ipAddress)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `tconnect_audit_trail_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports audit log entries as formatted JSON
   */
  public exportToJson(logs?: AuditLogEntry[], filename?: string): void {
    const targetLogs = logs || storage.getState().auditLogs || [];
    const jsonStr = JSON.stringify(targetLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `tconnect_audit_trail_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const auditService = new AuditService();
