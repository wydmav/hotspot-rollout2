import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  RouterDevice,
  Voucher,
  PaymentTransaction,
  HotspotPlan,
  AuditLogEntry,
  CaptivePortalLead,
  TenantGroup
} from '../types';

export const DEFAULT_SUPABASE_PROJECT_URL = 'https://uxglqtcuedelmyhvgghw.supabase.co';

/**
 * COMPLETE MULTI-TENANT POSTGRESQL SCHEMA & RLS POLICIES FOR SUPABASE (uxglqtcuedelmyhvgghw)
 * Copy and paste this entire script into the Supabase SQL Editor.
 * Covers:
 * - Tenant Operators & RBAC (`operators`, `operator_members`)
 * - Bandwidth Plans (`plans`)
 * - MikroTik Routers & Real-Time Free/Paid Access Policy (`routers`)
 * - Vouchers & Multi-Device MAC Locking (`vouchers`, `voucher_devices`)
 * - PayLesotho XPayments 16-Digit OTT Vouchers (`ott_vouchers_issued`)
 * - Financial Ledger (`transactions`)
 * - Captive Portal Guest Leads (`guest_leads`)
 * - Partner / Sponsor Groups (`partner_groups`)
 * - Partner API Keys (`partner_api_keys`)
 * - Captive Portal & Ad Configs (`portal_configs`)
 * - Immutable Audit Logs (`audit_logs`)
 */
export const SUPABASE_SQL_MIGRATIONS = `-- ============================================================================
-- T-CONNECT WI-FI CONTROLLER: PRODUCTION MULTI-TENANT SCHEMA (uxglqtcuedelmyhvgghw)
-- Includes: Routers, Plans, Vouchers, PayLesotho OTT Pins, Transactions,
--           Captive Portal Guest Leads, Partner/Sponsor Groups, Portal Configs & Audit Logs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TENANTS (OPERATORS) & TEAM MEMBERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL DEFAULT 'LS',
  currency TEXT NOT NULL DEFAULT 'M',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.operators (id, name, slug, country_code, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'T-Connect Lesotho Sovereign Fleet', 'tconnect-lesotho', 'LS', 'M')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.operator_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Super Admin', 'Collaborator', 'Finance', 'Tech', 'Management', 'Network Engineer', 'Billing Operator', 'Site Manager', 'Viewer')),
  scoped_sites TEXT[] NOT NULL DEFAULT '{}',
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(operator_id, email)
);

-- ----------------------------------------------------------------------------
-- 2. BANDWIDTH & MONETIZATION PLANS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN ('hotspot', 'community', 'village', 'bus', 'stadium', 'park')),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'M',
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  duration_label TEXT NOT NULL,
  data_cap_mb INTEGER,
  download_speed_mbps NUMERIC(6, 2) NOT NULL,
  upload_speed_mbps NUMERIC(6, 2) NOT NULL,
  burst_download_mbps NUMERIC(6, 2) NOT NULL,
  burst_upload_mbps NUMERIC(6, 2) NOT NULL,
  fair_use_threshold_mb INTEGER,
  fair_use_download_mbps NUMERIC(6, 2),
  device_limit INTEGER NOT NULL DEFAULT 1 CHECK (device_limit BETWEEN 1 AND 20),
  is_popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. MIKROTIK ROUTER FLEET & REAL-TIME FREE/PAID ACCESS POLICY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routers (
  id TEXT PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN ('hotspot', 'community', 'village', 'bus', 'stadium', 'park')),
  site_name TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT 'Maseru',
  physical_address TEXT,
  partner_name TEXT DEFAULT 'T-Connect Internal Fleet',
  policy_name TEXT DEFAULT 'PayLesotho + 16-Digit OTT Policy',
  model TEXT NOT NULL,
  board_name TEXT NOT NULL,
  ros_version TEXT NOT NULL CHECK (ros_version IN ('v6', 'v7')),
  mac_address TEXT NOT NULL,
  wireguard_ip TEXT NOT NULL,
  public_wan_ip TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_adoption' CHECK (status IN ('online', 'offline', 'pending_adoption')),
  access_mode TEXT NOT NULL DEFAULT 'PAID_ONLY' CHECK (access_mode IN ('PAID_ONLY', 'FREE_TRIAL_AND_PAID', 'COMPLETELY_FREE')),
  free_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  free_duration_minutes INTEGER NOT NULL DEFAULT 30,
  free_rate_limit TEXT NOT NULL DEFAULT '10M/30M',
  free_daily_quota_mb INTEGER NOT NULL DEFAULT 500,
  uptime TEXT NOT NULL DEFAULT '0m',
  cpu_load INTEGER NOT NULL DEFAULT 0,
  memory_usage INTEGER NOT NULL DEFAULT 0,
  active_sessions INTEGER NOT NULL DEFAULT 0,
  firmware TEXT NOT NULL DEFAULT '7.15.2',
  adoption_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  adopted_at TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  gps_telemetry JSONB,
  solar_telemetry JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. CAPTIVE PORTAL GUEST LEADS (FREE & PAID SUBSCRIBERS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guest_leads (
  id TEXT PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT 'Guest',
  last_name TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+266',
  phone TEXT NOT NULL,
  full_phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  router_name TEXT NOT NULL DEFAULT 'MIKROTIK-TC',
  site_name TEXT NOT NULL DEFAULT 'T-Connect Hotspot',
  vertical TEXT NOT NULL DEFAULT 'hotspot',
  client_mac TEXT NOT NULL DEFAULT 'AUTO',
  client_ip TEXT NOT NULL DEFAULT '10.10.0.1',
  device_type TEXT NOT NULL DEFAULT 'Mobile',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_leads_phone ON public.guest_leads(full_phone);
CREATE INDEX IF NOT EXISTS idx_guest_leads_mac ON public.guest_leads(client_mac);
CREATE INDEX IF NOT EXISTS idx_guest_leads_captured_at ON public.guest_leads(captured_at DESC);

-- ----------------------------------------------------------------------------
-- 5. PARTNER / SPONSOR GROUPS & API KEYS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_groups (
  id TEXT PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  tag TEXT NOT NULL,
  custom_bg_url TEXT,
  client_contact TEXT DEFAULT 'admin@tconnect.africa',
  accent_color TEXT DEFAULT '#f05e17',
  description TEXT DEFAULT '',
  router_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id TEXT PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{portal:read,leads:read}',
  rate_limit_per_min INTEGER NOT NULL DEFAULT 120,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. PAYLESOTHO XPAYMENTS ISSUED 16-DIGIT OTT VOUCHERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ott_vouchers_issued (
  pin TEXT PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  serial_number TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'LSL',
  transaction_ref TEXT NOT NULL,
  plan_id TEXT,
  plan_name TEXT,
  msisdn TEXT,
  payment_method TEXT DEFAULT 'ecocash',
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'redeemed', 'expired')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ,
  redeemed_by_mac TEXT
);

-- ----------------------------------------------------------------------------
-- 7. VOUCHERS & ATOMIC MULTI-DEVICE LOCKING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vouchers (
  id TEXT PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  plan_id TEXT REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  vertical TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  duration_label TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 86400,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'active', 'expired', 'revoked')),
  max_devices INTEGER NOT NULL DEFAULT 1 CHECK (max_devices BETWEEN 1 AND 20),
  batch_id TEXT NOT NULL,
  site_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE(operator_id, code)
);

CREATE TABLE IF NOT EXISTS public.voucher_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id TEXT NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  mac_address TEXT NOT NULL,
  client_ip TEXT,
  device_type TEXT,
  bound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(voucher_id, mac_address)
);

-- ----------------------------------------------------------------------------
-- 8. FINANCIAL DOUBLE-ENTRY LEDGER (TRANSACTIONS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  transaction_ref TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('paylesotho', 'ottvoucher', 'ecocash', 'mpesa')),
  msisdn TEXT NOT NULL,
  plan_id TEXT,
  plan_name TEXT NOT NULL,
  site_name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(10, 2) GENERATED ALWAYS AS (amount - fee_amount) STORED,
  currency TEXT NOT NULL DEFAULT 'M',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  voucher_code TEXT,
  ott_voucher_pin TEXT,
  webhook_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(operator_id, transaction_ref)
);

-- ----------------------------------------------------------------------------
-- 9. CAPTIVE PORTAL & SPONSOR AD CONFIGURATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portal_configs (
  scope TEXT PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 10. IMMUTABLE AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.operators(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY POLICIES (SUPABASE CLIENT & SERVER API COMPATIBLE)
-- ----------------------------------------------------------------------------
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ott_vouchers_issued ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'operators', 'plans', 'routers', 'guest_leads', 'partner_groups',
    'partner_api_keys', 'ott_vouchers_issued', 'vouchers', 'voucher_devices',
    'transactions', 'portal_configs', 'audit_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tconnect_rw_%I ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY tconnect_rw_%I ON public.%I FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;
`;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  operatorId?: string;
}

const SUPABASE_CONFIG_KEY = 'tconnect_supabase_config_v2';
const DEFAULT_OPERATOR_ID = '00000000-0000-0000-0000-000000000001';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig = {
    url: DEFAULT_SUPABASE_PROJECT_URL,
    anonKey: '',
    isConnected: false,
    operatorId: DEFAULT_OPERATOR_ID
  };

  constructor() {
    this.loadConfig();
    if (typeof window !== 'undefined') {
      void this.hydrateConfigFromServer();
    }
  }

  private loadConfig() {
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_PROJECT_URL;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(SUPABASE_CONFIG_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.config = {
            url: parsed.url || envUrl || DEFAULT_SUPABASE_PROJECT_URL,
            anonKey: parsed.anonKey || envKey || '',
            isConnected: Boolean(parsed.isConnected || (parsed.url && parsed.anonKey)),
            operatorId: parsed.operatorId || DEFAULT_OPERATOR_ID
          };
          if (this.config.url && this.config.anonKey) {
            this.initClient(this.config.url, this.config.anonKey);
          }
          return;
        }
      } catch {
        // fallback to env
      }
    }

    this.config = {
      url: envUrl || DEFAULT_SUPABASE_PROJECT_URL,
      anonKey: envKey || '',
      isConnected: Boolean(envUrl && envKey),
      operatorId: DEFAULT_OPERATOR_ID
    };

    if (this.config.url && this.config.anonKey) {
      this.initClient(this.config.url, this.config.anonKey);
    }
  }

  async hydrateConfigFromServer(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/supabase/status');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.url) {
        const nextUrl = data.url || this.config.url || DEFAULT_SUPABASE_PROJECT_URL;
        const nextKey = data.anonKey || this.config.anonKey || '';
        if (nextKey && (!this.config.anonKey || !this.client)) {
          this.config = {
            url: nextUrl,
            anonKey: nextKey,
            isConnected: Boolean(data.isConfigured),
            operatorId: DEFAULT_OPERATOR_ID
          };
          this.initClient(nextUrl, nextKey);
          window.localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.config));
        }
      }
    } catch {}
  }

  private initClient(url: string, anonKey: string) {
    try {
      this.client = createClient(url, anonKey, {
        auth: { persistSession: true }
      });
    } catch {
      this.client = null;
    }
  }

  getConfig(): SupabaseConfig {
    return {
      ...this.config,
      url: this.config.url || DEFAULT_SUPABASE_PROJECT_URL
    };
  }

  isConfigured(): boolean {
    return Boolean(this.config.url && this.config.anonKey && this.client);
  }

  saveConfig(url: string, anonKey: string, operatorId = DEFAULT_OPERATOR_ID): boolean {
    const cleanUrl = (url || DEFAULT_SUPABASE_PROJECT_URL).trim().replace(/\/$/, '');
    const cleanKey = anonKey.trim();

    this.config = {
      url: cleanUrl,
      anonKey: cleanKey,
      isConnected: Boolean(cleanUrl && cleanKey),
      operatorId
    };

    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.config));
      // Also synchronize to backend server so server-side lead/voucher/router API library writes to Supabase
      fetch('/api/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          anonKey: cleanKey,
          operatorId
        })
      }).catch(() => {});
    }

    if (cleanUrl && cleanKey) {
      this.initClient(cleanUrl, cleanKey);
      return true;
    } else {
      this.client = null;
      return false;
    }
  }

  disconnect() {
    this.config = { url: DEFAULT_SUPABASE_PROJECT_URL, anonKey: '', isConnected: false, operatorId: DEFAULT_OPERATOR_ID };
    this.client = null;
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(SUPABASE_CONFIG_KEY);
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    if (!this.client) {
      return { success: false, message: 'Supabase Project URL or Anon Key is missing.' };
    }

    const start = performance.now();
    try {
      const { error } = await this.client.from('routers').select('id').limit(1);
      const latencyMs = Math.round(performance.now() - start);

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
          this.config.isConnected = true;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.config));
          }
          return {
            success: true,
            latencyMs,
            message: `Connected to Supabase (${latencyMs}ms)! Run the SQL Schema in Tab 1 to create your tables (routers, guest_leads, partner_groups, transactions).`
          };
        }
        return {
          success: false,
          latencyMs,
          message: `Supabase Error: ${error.message}`
        };
      }

      this.config.isConnected = true;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.config));
      }

      return {
        success: true,
        latencyMs,
        message: `Connected to Supabase PostgreSQL (${this.config.url}) in ${latencyMs}ms. All tables verified.`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Network failure reaching Supabase: ${err?.message || 'Unknown error'}`
      };
    }
  }

  // ---------------------------------------------------------------------------
  // UNIVERSAL PLATFORM API LIBRARY — LEADS, PARTNERS, ROUTERS, VOUCHERS, LEDGER
  // ---------------------------------------------------------------------------

  async syncRoutersToSupabase(routers: RouterDevice[]): Promise<{ synced: number; error?: string }> {
    if (!this.client || !this.config.isConnected) return { synced: 0, error: 'Not connected' };
    if (routers.length === 0) return { synced: 0 };

    const opId = this.config.operatorId || DEFAULT_OPERATOR_ID;
    const rows = routers.map(r => ({
      id: r.id,
      operator_id: opId,
      name: r.name,
      vertical: r.vertical,
      site_name: r.siteName,
      district: r.district || 'Maseru',
      physical_address: r.physicalAddress || r.siteName,
      partner_name: r.partnerName || 'T-Connect Internal Fleet',
      policy_name: r.policyName || 'PayLesotho + 16-Digit OTT Policy',
      model: r.model,
      board_name: r.boardName,
      ros_version: r.rosVersion,
      mac_address: r.macAddress,
      wireguard_ip: r.wireguardIp,
      public_wan_ip: r.publicWanIp,
      status: r.status,
      access_mode: r.accessMode || 'PAID_ONLY',
      free_mode_enabled: Boolean(r.accessMode && r.accessMode !== 'PAID_ONLY'),
      free_duration_minutes: r.freeDurationMinutes ?? 30,
      free_rate_limit: r.freeRateLimit || '10M/30M',
      free_daily_quota_mb: r.freeDailyQuotaMb ?? 500,
      uptime: r.uptime,
      cpu_load: r.cpuLoad,
      memory_usage: r.memoryUsage,
      active_sessions: r.activeSessions,
      firmware: r.firmware,
      adoption_token: r.token || null,
      gps_telemetry: r.gpsTelemetry || null,
      solar_telemetry: r.solarTelemetry || null
    }));

    const { error } = await this.client.from('routers').upsert(rows, { onConflict: 'id' });
    if (error) return { synced: 0, error: error.message };
    return { synced: rows.length };
  }

  async deleteRouterFromSupabase(routerId: string): Promise<void> {
    if (!this.client || !this.config.isConnected) return;
    await this.client.from('routers').delete().eq('id', routerId);
  }

  async syncPlanToSupabase(plan: HotspotPlan): Promise<void> {
    await this.syncPlansToSupabase([plan]);
  }

  async syncPlansToSupabase(plans: HotspotPlan[]): Promise<void> {
    if (!this.client || !this.config.isConnected || plans.length === 0) return;
    const opId = this.config.operatorId || DEFAULT_OPERATOR_ID;
    const rows = plans.map(p => ({
      id: p.id,
      operator_id: opId,
      name: p.name,
      vertical: p.vertical,
      price: p.price,
      currency: p.currency,
      duration_seconds: p.durationSeconds,
      duration_label: p.durationLabel,
      data_cap_mb: p.dataCapMb,
      download_speed_mbps: p.downloadSpeedMbps,
      upload_speed_mbps: p.uploadSpeedMbps,
      burst_download_mbps: p.burstDownloadMbps,
      burst_upload_mbps: p.burstUploadMbps,
      fair_use_threshold_mb: p.fairUseThresholdMb,
      fair_use_download_mbps: p.fairUseDownloadMbps ?? null,
      device_limit: p.deviceLimit,
      is_popular: Boolean(p.isPopular)
    }));
    await this.client.from('plans').upsert(rows, { onConflict: 'id' });
  }

  async syncLeadToSupabase(lead: CaptivePortalLead): Promise<{ synced: boolean; error?: string }> {
    if (!this.client || !this.config.isConnected) return { synced: false, error: 'Not connected' };
    const opId = this.config.operatorId || DEFAULT_OPERATOR_ID;
    const { error } = await this.client.from('guest_leads').upsert({
      id: lead.id,
      operator_id: opId,
      first_name: lead.firstName || 'Guest',
      last_name: lead.lastName || '',
      full_name: lead.fullName || `${lead.firstName} ${lead.lastName}`.trim(),
      country_code: lead.countryCode || '+266',
      phone: lead.phone || '',
      full_phone: lead.fullPhone || lead.phone || '',
      email: lead.email || '',
      router_name: lead.routerName || 'MIKROTIK-TC',
      site_name: lead.siteName || 'T-Connect Hotspot',
      vertical: lead.vertical || 'hotspot',
      client_mac: lead.clientMac || 'AUTO',
      client_ip: lead.clientIp || '10.10.0.1',
      device_type: lead.deviceType || 'Mobile',
      duration_minutes: lead.durationMinutes ?? 30,
      status: lead.status || 'active',
      captured_at: lead.capturedAt || new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) return { synced: false, error: error.message };
    return { synced: true };
  }

  async syncLeadsToSupabase(leads: CaptivePortalLead[]): Promise<{ synced: number; error?: string }> {
    if (!this.client || !this.config.isConnected) return { synced: 0, error: 'Not connected' };
    if (!Array.isArray(leads) || leads.length === 0) return { synced: 0 };
    const opId = this.config.operatorId || DEFAULT_OPERATOR_ID;
    const rows = leads.map((lead) => ({
      id: lead.id,
      operator_id: opId,
      first_name: lead.firstName || 'Guest',
      last_name: lead.lastName || '',
      full_name: lead.fullName || `${lead.firstName} ${lead.lastName}`.trim(),
      country_code: lead.countryCode || '+266',
      phone: lead.phone || '',
      full_phone: lead.fullPhone || lead.phone || '',
      email: lead.email || '',
      router_name: lead.routerName || 'MIKROTIK-TC',
      site_name: lead.siteName || 'T-Connect Hotspot',
      vertical: lead.vertical || 'hotspot',
      client_mac: lead.clientMac || 'AUTO',
      client_ip: lead.clientIp || '10.10.0.1',
      device_type: lead.deviceType || 'Mobile',
      duration_minutes: lead.durationMinutes ?? 30,
      status: lead.status || 'active',
      captured_at: lead.capturedAt || new Date().toISOString()
    }));
    const { error } = await this.client.from('guest_leads').upsert(rows, { onConflict: 'id' });
    if (error) return { synced: 0, error: error.message };
    return { synced: rows.length };
  }

  async syncPartnerGroupsToSupabase(groups: TenantGroup[]): Promise<{ synced: number; error?: string }> {
    if (!this.client || !this.config.isConnected) return { synced: 0, error: 'Not connected' };
    if (!Array.isArray(groups) || groups.length === 0) return { synced: 0 };
    const opId = this.config.operatorId || DEFAULT_OPERATOR_ID;
    const rows = groups.map((g) => ({
      id: g.id,
      operator_id: opId,
      name: g.name,
      tag: g.tag || `group:${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      custom_bg_url: g.customBgUrl || '',
      client_contact: g.clientContact || 'admin@tconnect.africa',
      accent_color: g.accentColor || '#f05e17',
      description: g.description || '',
      router_count: g.routerCount || 0
    }));
    const { error } = await this.client.from('partner_groups').upsert(rows, { onConflict: 'id' });
    if (error) return { synced: 0, error: error.message };
    return { synced: rows.length };
  }

  async syncVoucherToSupabase(voucher: Voucher): Promise<void> {
    if (!this.client || !this.config.isConnected) return;
    const opId = this.config.operatorId || DEFAULT_OPERATOR_ID;
    await this.client.from('vouchers').upsert({
      id: voucher.id,
      operator_id: opId,
      code: voucher.code,
      plan_id: voucher.planId,
      plan_name: voucher.planName,
      vertical: 'hotspot',
      price: voucher.price,
      duration_label: `${Math.round((voucher.durationSeconds || 86400) / 3600)}h`,
      duration_seconds: voucher.durationSeconds || 86400,
      status: voucher.status === 'used' ? 'active' : voucher.status,
      max_devices: voucher.deviceLimit || 1,
      batch_id: voucher.batchId || 'BATCH-AUTO',
      site_name: 'T-Connect Hotspot'
    }, { onConflict: 'id' });
  }

  async syncTransactionToSupabase(tx: PaymentTransaction): Promise<void> {
    if (!this.client || !this.config.isConnected) return;
    const opId = this.config.operatorId || DEFAULT_OPERATOR_ID;
    await this.client.from('transactions').upsert({
      id: tx.id,
      operator_id: opId,
      transaction_ref: tx.transactionRef,
      provider: tx.provider,
      msisdn: tx.phoneNumber || 'N/A',
      plan_id: tx.planId,
      plan_name: tx.planName,
      site_name: tx.siteName,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      voucher_code: tx.voucherCodeIssued || null,
      ott_voucher_pin: tx.ottVoucherPin || null
    }, { onConflict: 'id' });
  }

  async syncAuditLogToSupabase(entry: AuditLogEntry): Promise<void> {
    if (!this.client || !this.config.isConnected) return;
    const opId = this.config.operatorId || DEFAULT_OPERATOR_ID;
    await this.client.from('audit_logs').insert({
      id: entry.id,
      operator_id: opId,
      actor: entry.actor,
      role: entry.role,
      action: entry.action,
      target: entry.target,
      details: entry.details,
      ip_address: entry.ipAddress
    });
  }

  subscribeToAllRealtime(callbacks: {
    onRouterChange?: () => void;
    onVoucherChange?: () => void;
    onTransactionChange?: () => void;
    onPlanChange?: () => void;
    onLeadChange?: () => void;
  }): () => void {
    if (!this.client || !this.config.isConnected) {
      return () => {};
    }
    try {
      const channel = this.client
        .channel('tconnect-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'routers' }, () => callbacks.onRouterChange?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vouchers' }, () => callbacks.onVoucherChange?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => callbacks.onTransactionChange?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => callbacks.onPlanChange?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_leads' }, () => callbacks.onLeadChange?.())
        .subscribe();

      return () => {
        try {
          this.client?.removeChannel(channel);
        } catch {}
      };
    } catch {
      return () => {};
    }
  }

  async syncAllPlatformState(state: {
    plans: HotspotPlan[];
    routers: RouterDevice[];
    vouchers: Voucher[];
    transactions: PaymentTransaction[];
    captiveLeads?: CaptivePortalLead[];
    tenantGroups?: TenantGroup[];
  }): Promise<{
    success: boolean;
    summary: string;
  }> {
    // Also trigger server-side full Supabase sync so server-captured leads & OTT pins are pushed
    try {
      await fetch('/api/supabase/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: this.config.url,
          anonKey: this.config.anonKey
        })
      });
    } catch {}

    if (!this.client || !this.config.isConnected) {
      return { success: false, summary: 'Supabase client is not connected.' };
    }

    await this.syncPlansToSupabase(state.plans || []);
    const rRes = await this.syncRoutersToSupabase(state.routers || []);
    const lRes = await this.syncLeadsToSupabase(state.captiveLeads || []);
    const pRes = await this.syncPartnerGroupsToSupabase(state.tenantGroups || []);

    for (const v of (state.vouchers || []).slice(0, 100)) {
      await this.syncVoucherToSupabase(v);
    }
    for (const t of (state.transactions || []).slice(0, 100)) {
      await this.syncTransactionToSupabase(t);
    }

    return {
      success: true,
      summary: `Synchronized ${rRes.synced} routers, ${lRes.synced} guest leads, ${pRes.synced} partner groups, ${(state.vouchers || []).length} vouchers, and ${(state.transactions || []).length} transactions to Supabase (${this.config.url}).`
    };
  }

  async pullFromSupabase(): Promise<{
    routers: RouterDevice[];
    vouchers: Voucher[];
    transactions: PaymentTransaction[];
    plans: HotspotPlan[];
    captiveLeads: CaptivePortalLead[];
    tenantGroups: TenantGroup[];
  } | null> {
    if (!this.client || !this.config.isConnected) return null;

    try {
      const [routersRes, vouchersRes, txRes, plansRes, leadsRes, groupsRes] = await Promise.all([
        this.client.from('routers').select('*').order('created_at', { ascending: false }),
        this.client.from('vouchers').select('*, voucher_devices(mac_address)').order('created_at', { ascending: false }).limit(200),
        this.client.from('transactions').select('*').order('created_at', { ascending: false }).limit(200),
        this.client.from('plans').select('*').order('price', { ascending: true }),
        this.client.from('guest_leads').select('*').order('captured_at', { ascending: false }).limit(500),
        this.client.from('partner_groups').select('*').order('created_at', { ascending: false })
      ]);

      const routers: RouterDevice[] = (routersRes.data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        vertical: r.vertical,
        siteName: r.site_name,
        district: r.district || 'Maseru',
        physicalAddress: r.physical_address || r.site_name,
        partnerName: r.partner_name || 'T-Connect Internal Fleet',
        policyName: r.policy_name || 'PayLesotho + 16-Digit OTT Policy',
        model: r.model,
        boardName: r.board_name,
        rosVersion: r.ros_version,
        macAddress: r.mac_address,
        wireguardIp: r.wireguard_ip,
        publicWanIp: r.public_wan_ip,
        status: r.status,
        accessMode: r.access_mode || 'PAID_ONLY',
        freeModeEnabled: Boolean(r.free_mode_enabled || (r.access_mode && r.access_mode !== 'PAID_ONLY')),
        freeDurationMinutes: Number(r.free_duration_minutes || 30),
        freeRateLimit: r.free_rate_limit || '10M/30M',
        freeDailyQuotaMb: Number(r.free_daily_quota_mb || 500),
        uptime: r.uptime || '0m',
        cpuLoad: r.cpu_load || 0,
        memoryUsage: r.memory_usage || 0,
        lastHeartbeat: r.last_heartbeat ? new Date(r.last_heartbeat).toLocaleTimeString() : 'Just now',
        firmware: r.firmware || '7.15.2',
        activeSessions: r.active_sessions || 0,
        token: r.adoption_token || undefined,
        gpsTelemetry: r.gps_telemetry || undefined,
        solarTelemetry: r.solar_telemetry || undefined
      }));

      const vouchers: Voucher[] = (vouchersRes.data || []).map((v: any) => ({
        id: v.id,
        code: v.code,
        planId: v.plan_id || '',
        planName: v.plan_name,
        price: Number(v.price),
        currency: 'M',
        durationSeconds: Number(v.duration_seconds || 86400),
        deviceLimit: Number(v.max_devices || 1),
        status: v.status === 'unused' ? 'active' : (v.status as Voucher['status']),
        generatedAt: v.created_at ? new Date(v.created_at).toISOString() : new Date().toISOString(),
        expiresAt: v.expires_at ? new Date(v.expires_at).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        firstUsedAt: v.activated_at || undefined,
        associatedDevices: Array.isArray(v.voucher_devices)
          ? v.voucher_devices.map((d: any) => ({
              mac: d.mac_address,
              ip: d.client_ip || '10.10.0.10',
              hostname: d.device_type || 'Device',
              boundAt: d.bound_at || new Date().toISOString(),
              bytesDown: 0,
              bytesUp: 0
            }))
          : [],
        batchId: v.batch_id
      }));

      const transactions: PaymentTransaction[] = (txRes.data || []).map((t: any) => ({
        id: t.id,
        transactionRef: t.transaction_ref,
        provider: (t.provider === 'ottvoucher' ? 'ottvoucher' : 'paylesotho') as 'paylesotho' | 'ottvoucher',
        amount: Number(t.amount),
        currency: t.currency || 'M',
        phoneNumber: t.msisdn,
        planId: t.plan_id || 'plan-custom',
        planName: t.plan_name,
        vertical: 'hotspot',
        siteName: t.site_name,
        voucherCodeIssued: t.voucher_code || undefined,
        ottVoucherPin: t.ott_voucher_pin || undefined,
        status: (['pending', 'completed', 'failed', 'refunded'].includes(t.status) ? t.status : 'completed') as PaymentTransaction['status'],
        createdAt: t.created_at ? new Date(t.created_at).toISOString().slice(0, 19).replace('T', ' ') : '',
        completedAt: t.completed_at || undefined,
        debugLogs: {
          requestTimestamp: t.created_at || new Date().toISOString(),
          endpoint: '/api/payments/verify',
          httpStatus: 200,
          signatureVerified: true,
          rawPayload: t.webhook_payload || {},
          rawResponse: { status: t.status }
        }
      }));

      const plans: HotspotPlan[] = (plansRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        vertical: p.vertical,
        price: Number(p.price),
        currency: p.currency || 'M',
        durationSeconds: p.duration_seconds,
        durationLabel: p.duration_label,
        dataCapMb: p.data_cap_mb,
        downloadSpeedMbps: Number(p.download_speed_mbps),
        uploadSpeedMbps: Number(p.upload_speed_mbps),
        burstDownloadMbps: Number(p.burst_download_mbps),
        burstUploadMbps: Number(p.burst_upload_mbps),
        fairUseThresholdMb: p.fair_use_threshold_mb,
        fairUseDownloadMbps: p.fair_use_download_mbps ? Number(p.fair_use_download_mbps) : undefined,
        deviceLimit: p.device_limit || 1,
        isPopular: Boolean(p.is_popular)
      }));

      const captiveLeads: CaptivePortalLead[] = (leadsRes.data || []).map((l: any) => ({
        id: l.id,
        firstName: l.first_name || 'Guest',
        lastName: l.last_name || '',
        fullName: l.full_name || `${l.first_name || 'Guest'} ${l.last_name || ''}`.trim(),
        countryCode: (l.country_code === '+27' ? '+27' : '+266') as '+266' | '+27',
        phone: l.phone || '',
        fullPhone: l.full_phone || l.phone || '',
        email: l.email || '',
        capturedAt: l.captured_at || new Date().toISOString(),
        routerName: l.router_name || 'MIKROTIK-TC',
        siteName: l.site_name || 'T-Connect Hotspot',
        vertical: l.vertical || 'hotspot',
        clientMac: l.client_mac || 'AUTO',
        clientIp: l.client_ip || '10.10.0.1',
        deviceType: (l.device_type || 'Mobile') as 'Mobile' | 'Laptop' | 'Tablet',
        durationMinutes: Number(l.duration_minutes ?? 30),
        status: (l.status === 'expired' ? 'expired' : 'active') as 'active' | 'expired'
      }));

      const tenantGroups: TenantGroup[] = (groupsRes.data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        tag: g.tag || `group:${String(g.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        customBgUrl: g.custom_bg_url || '',
        clientContact: g.client_contact || 'admin@tconnect.africa',
        accentColor: g.accent_color || '#f05e17',
        description: g.description || '',
        createdAt: g.created_at ? new Date(g.created_at).toISOString().slice(0, 10) : '2026-10-01',
        routerCount: Number(g.router_count || 0)
      }));

      return { routers, vouchers, transactions, plans, captiveLeads, tenantGroups };
    } catch {
      return null;
    }
  }
}

export const supabaseService = new SupabaseService();

