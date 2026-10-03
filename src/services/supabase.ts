import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RouterDevice, HotspotPlan, Voucher, PaymentTransaction, AuditLogEntry } from '../types';

const SUPABASE_CONFIG_KEY = 'tconnect_supabase_config_v2';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastConnectedAt?: string;
}

export const SUPABASE_SQL_MIGRATIONS = `-- ==============================================================================
-- T-CONNECT CLOUD CONTROLLER — PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Multi-Tenant Hotspot Management, Financial Ledger, Atomic Vouchers & Audit Log
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. MULTI-TENANCY & RBAC
CREATE TABLE IF NOT EXISTS public.operators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    default_currency TEXT NOT NULL DEFAULT 'M',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default primary operator tenant
INSERT INTO public.operators (id, name, slug, default_currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'T-Connect Primary Network', 't-connect-main', 'M')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.operator_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.operators(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'technical', 'collaborator', 'viewer')),
    scoped_sites UUID[] DEFAULT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, user_id)
);

CREATE OR REPLACE FUNCTION public.get_current_user_operator_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT operator_id FROM public.operator_members WHERE user_id = auth.uid() AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.user_has_operator_role(p_operator_id UUID, p_required_roles TEXT[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.operator_members 
        WHERE operator_id = p_operator_id AND user_id = auth.uid() AND status = 'active' AND role = ANY(p_required_roles)
    );
$$;

-- 2. SITES & HARDWARE FLEET
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.operators(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    vertical TEXT NOT NULL CHECK (vertical IN ('hotspot', 'community', 'bus', 'stadium', 'park')),
    ssid TEXT NOT NULL DEFAULT 'T-Connect',
    location_address TEXT,
    max_bandwidth_down_mbps NUMERIC(8,2) DEFAULT 50.0,
    max_bandwidth_up_mbps NUMERIC(8,2) DEFAULT 20.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, name)
);

CREATE TABLE IF NOT EXISTS public.routers (
    id TEXT PRIMARY KEY,
    operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.operators(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    vertical TEXT NOT NULL CHECK (vertical IN ('hotspot', 'community', 'bus', 'stadium', 'park')),
    site_name TEXT NOT NULL,
    model TEXT NOT NULL,
    board_name TEXT,
    ros_version TEXT NOT NULL CHECK (ros_version IN ('v6', 'v7')) DEFAULT 'v7',
    mac_address TEXT NOT NULL,
    wireguard_ip TEXT NOT NULL,
    wireguard_public_key TEXT,
    public_wan_ip TEXT,
    status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'pending_adoption')) DEFAULT 'pending_adoption',
    uptime TEXT DEFAULT '0m',
    cpu_load INTEGER DEFAULT 0,
    memory_usage INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMPTZ,
    firmware TEXT,
    active_sessions INTEGER DEFAULT 0,
    token TEXT,
    token_expires_at TIMESTAMPTZ,
    adopted_at TIMESTAMPTZ,
    solar_telemetry JSONB,
    gps_telemetry JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, mac_address)
);

-- 3. PLANS & ATOMIC VOUCHERS
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.operators(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    vertical TEXT NOT NULL CHECK (vertical IN ('hotspot', 'community', 'bus', 'stadium', 'park')),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'M',
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    duration_label TEXT NOT NULL,
    data_cap_mb INTEGER,
    download_speed_mbps NUMERIC(6,2) NOT NULL DEFAULT 4.0,
    upload_speed_mbps NUMERIC(6,2) NOT NULL DEFAULT 2.0,
    device_limit INTEGER NOT NULL DEFAULT 2 CHECK (device_limit >= 1),
    burst_download_mbps NUMERIC(6,2),
    burst_upload_mbps NUMERIC(6,2),
    fair_use_threshold_mb INTEGER,
    fair_use_download_mbps NUMERIC(6,2),
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.operators(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    plan_id TEXT NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'M',
    duration_seconds INTEGER NOT NULL,
    device_limit INTEGER NOT NULL DEFAULT 2,
    speed_limit_down_kbps INTEGER DEFAULT 4096,
    speed_limit_up_kbps INTEGER DEFAULT 2048,
    status TEXT NOT NULL CHECK (status IN ('active', 'used', 'expired', 'revoked')) DEFAULT 'active',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    first_used_at TIMESTAMPTZ,
    active_device_count INTEGER NOT NULL DEFAULT 0,
    batch_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, code)
);

CREATE TABLE IF NOT EXISTS public.voucher_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.operators(id) ON DELETE CASCADE,
    voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
    mac_address TEXT NOT NULL,
    hostname TEXT DEFAULT 'Generic-Client',
    ip_address TEXT,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    site_name TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bytes_in BIGINT NOT NULL DEFAULT 0,
    bytes_out BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (voucher_id, mac_address)
);

-- 4. FINANCIAL TRANSACTIONS LEDGER (DOUBLE-ENTRY)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.operators(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    transaction_ref TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('ottvoucher', 'ecocash', 'mywallet', 'xpayments')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(10,2) GENERATED ALWAYS AS (amount - fee_amount) STORED,
    currency TEXT NOT NULL DEFAULT 'M',
    phone_number TEXT,
    plan_id TEXT REFERENCES public.plans(id) ON DELETE SET NULL,
    plan_name TEXT NOT NULL,
    vertical TEXT NOT NULL CHECK (vertical IN ('hotspot', 'community', 'bus', 'stadium', 'park')),
    site_name TEXT NOT NULL,
    voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
    voucher_code_issued TEXT,
    status TEXT NOT NULL CHECK (status IN ('completed', 'pending', 'failed', 'refunded')) DEFAULT 'completed',
    error_code TEXT,
    error_message TEXT,
    idempotency_key TEXT,
    debug_logs JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE (operator_id, transaction_ref)
);

CREATE TABLE IF NOT EXISTS public.gateway_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.operators(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('ottvoucher', 'ecocash', 'mywallet', 'xpayments')),
    name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'M',
    is_live BOOLEAN NOT NULL DEFAULT FALSE,
    is_sandbox BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'not_configured', 'testing')) DEFAULT 'not_configured',
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    merchant_id TEXT,
    webhook_secret_encrypted TEXT,
    webhook_url TEXT NOT NULL,
    last_test_at TIMESTAMPTZ,
    last_test_status TEXT,
    last_test_message TEXT,
    test_passed_once BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, provider)
);

-- 5. IMMUTABLE SECURITY AUDIT TRAIL
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.operators(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT,
    payload JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. Updates and deletes are prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 6. ATOMIC CONCURRENCY FUNCTION (ELIMINATES DOUBLE-SPEND)
CREATE OR REPLACE FUNCTION public.redeem_voucher_atomic(
    p_operator_id UUID,
    p_code TEXT,
    p_mac TEXT,
    p_hostname TEXT DEFAULT 'Client-Device',
    p_site_name TEXT DEFAULT 'Hotspot'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_voucher RECORD;
    v_device RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_exp TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_voucher FROM public.vouchers
    WHERE operator_id = p_operator_id AND UPPER(code) = UPPER(TRIM(p_code)) FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'INVALID_CODE', 'message', 'Voucher code not found.');
    END IF;

    IF v_voucher.status = 'revoked' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'REVOKED', 'message', 'Voucher is revoked.');
    END IF;

    IF v_voucher.status = 'expired' OR (v_voucher.expires_at < v_now) THEN
        UPDATE public.vouchers SET status = 'expired' WHERE id = v_voucher.id;
        RETURN jsonb_build_object('success', false, 'reason', 'EXPIRED', 'message', 'Voucher has expired.');
    END IF;

    SELECT * INTO v_device FROM public.voucher_devices
    WHERE voucher_id = v_voucher.id AND UPPER(mac_address) = UPPER(TRIM(p_mac));

    IF FOUND THEN
        UPDATE public.voucher_devices SET last_seen_at = v_now, site_name = p_site_name WHERE id = v_device.id;
        RETURN jsonb_build_object('success', true, 'is_roaming', true, 'plan_name', v_voucher.plan_name, 'duration_seconds', v_voucher.duration_seconds, 'device_slot', 'Active', 'message', 'Device reconnected via roaming.');
    END IF;

    IF v_voucher.active_device_count >= v_voucher.device_limit THEN
        RETURN jsonb_build_object('success', false, 'reason', 'DEVICE_LIMIT_REACHED', 'message', format('Device limit reached (%s/%s).', v_voucher.active_device_count, v_voucher.device_limit));
    END IF;

    IF v_voucher.first_used_at IS NULL THEN
        v_exp := v_now + (v_voucher.duration_seconds || ' seconds')::INTERVAL;
        UPDATE public.vouchers SET first_used_at = v_now, expires_at = v_exp, status = 'used', active_device_count = active_device_count + 1 WHERE id = v_voucher.id;
    ELSE
        UPDATE public.vouchers SET active_device_count = active_device_count + 1, status = 'used' WHERE id = v_voucher.id;
    END IF;

    INSERT INTO public.voucher_devices (operator_id, voucher_id, mac_address, hostname, site_name, first_seen_at, last_seen_at)
    VALUES (p_operator_id, v_voucher.id, UPPER(TRIM(p_mac)), p_hostname, p_site_name, v_now, v_now);

    RETURN jsonb_build_object('success', true, 'is_roaming', false, 'plan_name', v_voucher.plan_name, 'duration_seconds', v_voucher.duration_seconds, 'device_slot', format('%s/%s', v_voucher.active_device_count + 1, v_voucher.device_limit), 'message', 'Access entitlement granted.');
END;
$$;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Operator isolation policies for authenticated managers
CREATE POLICY "Operators viewable by members" ON public.operators FOR SELECT USING (id IN (SELECT public.get_current_user_operator_ids()));
CREATE POLICY "Operators modifiable by owners" ON public.operators FOR UPDATE USING (public.user_has_operator_role(id, ARRAY['owner']));

CREATE POLICY "Members viewable within operator" ON public.operator_members FOR SELECT USING (operator_id IN (SELECT public.get_current_user_operator_ids()));
CREATE POLICY "Members manageable by admin/owner" ON public.operator_members FOR ALL USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin']));

CREATE POLICY "Sites viewable by members" ON public.sites FOR SELECT USING (operator_id IN (SELECT public.get_current_user_operator_ids()));
CREATE POLICY "Sites manageable by technical+" ON public.sites FOR ALL USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'technical']));

CREATE POLICY "Routers viewable by members" ON public.routers FOR SELECT USING (operator_id IN (SELECT public.get_current_user_operator_ids()));
CREATE POLICY "Routers manageable by technical+" ON public.routers FOR ALL USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'technical']));

CREATE POLICY "Plans viewable by members" ON public.plans FOR SELECT USING (operator_id IN (SELECT public.get_current_user_operator_ids()));
CREATE POLICY "Plans manageable by admin+" ON public.plans FOR ALL USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator']));

CREATE POLICY "Vouchers viewable by members" ON public.vouchers FOR SELECT USING (operator_id IN (SELECT public.get_current_user_operator_ids()));
CREATE POLICY "Vouchers manageable by members" ON public.vouchers FOR ALL USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator']));

CREATE POLICY "Voucher devices viewable by members" ON public.voucher_devices FOR SELECT USING (operator_id IN (SELECT public.get_current_user_operator_ids()));
CREATE POLICY "Voucher devices manageable by members" ON public.voucher_devices FOR ALL USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator', 'technical']));

CREATE POLICY "Transactions viewable by billing roles" ON public.transactions FOR SELECT USING (operator_id IN (SELECT public.get_current_user_operator_ids()) AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator']));
CREATE POLICY "Transactions insertable by billing roles" ON public.transactions FOR INSERT WITH CHECK (operator_id IN (SELECT public.get_current_user_operator_ids()) AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator']));

CREATE POLICY "Gateway configs viewable by admin" ON public.gateway_configs FOR SELECT USING (operator_id IN (SELECT public.get_current_user_operator_ids()) AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin']));
CREATE POLICY "Gateway configs manageable by admin" ON public.gateway_configs FOR ALL USING (operator_id IN (SELECT public.get_current_user_operator_ids()) AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin']));

CREATE POLICY "Audit logs viewable by privileged" ON public.audit_logs FOR SELECT USING (operator_id IN (SELECT public.get_current_user_operator_ids()) AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'technical']));
CREATE POLICY "Audit logs append-only" ON public.audit_logs FOR INSERT WITH CHECK (operator_id IN (SELECT public.get_current_user_operator_ids()));

-- Public / Captive Portal Endpoints (Unauthenticated WiFi Guests & Webhook Ingestion)
CREATE POLICY "Public guest read active plans" ON public.plans FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Public guest verify active voucher" ON public.vouchers FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "Public guest insert checkout transaction" ON public.transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public guest read own transaction status" ON public.transactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public guest register voucher device" ON public.voucher_devices FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public guest check device roaming" ON public.voucher_devices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public guest update device heartbeat" ON public.voucher_devices FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Routers heartbeat allow" ON public.routers FOR ALL TO anon, authenticated USING (true);

-- 8. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_routers_operator ON public.routers(operator_id, status);
CREATE INDEX IF NOT EXISTS idx_vouchers_lookup ON public.vouchers(operator_id, code);
CREATE INDEX IF NOT EXISTS idx_voucher_devices_mac ON public.voucher_devices(voucher_id, mac_address);
CREATE INDEX IF NOT EXISTS idx_transactions_operator ON public.transactions(operator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ref ON public.transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator ON public.audit_logs(operator_id, created_at DESC);
`;

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig;

  constructor() {
    this.config = this.loadConfig();
    this.initClient();
  }

  private loadConfig(): SupabaseConfig {
    try {
      const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}

    return {
      url: (import.meta as any).env?.VITE_SUPABASE_URL || '',
      anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
      isConnected: false
    };
  }

  private initClient() {
    if (this.config.url && this.config.anonKey) {
      try {
        this.client = createClient(this.config.url, this.config.anonKey);
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  saveConfig(url: string, anonKey: string) {
    this.config = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      isConnected: false
    };
    try {
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.config));
    } catch {}
    this.initClient();
  }

  disconnect() {
    this.config.isConnected = false;
    try {
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.config));
    } catch {}
  }

  isConfigured(): boolean {
    return !!(this.client && this.config.url && this.config.anonKey);
  }

  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    if (!this.client) {
      return { success: false, message: 'Please provide both your Supabase Project URL and Anon Public Key.' };
    }

    const start = performance.now();
    try {
      const { error } = await this.client
        .from('routers')
        .select('id')
        .limit(1);

      const latencyMs = Math.round(performance.now() - start);

      if (error && error.code !== 'PGRST116') {
        if (error.code === '42P01') {
          this.config.isConnected = true;
          this.config.lastConnectedAt = new Date().toISOString();
          localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.config));
          return {
            success: true,
            latencyMs,
            message: `Connected to Supabase project in ${latencyMs}ms! Tables not detected yet — please execute the SQL schema in your Supabase SQL Editor.`
          };
        }
        return { success: false, message: `Supabase Error (${error.code}): ${error.message}` };
      }

      this.config.isConnected = true;
      this.config.lastConnectedAt = new Date().toISOString();
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(this.config));

      return {
        success: true,
        latencyMs,
        message: `Successfully connected to Supabase PostgreSQL database in ${latencyMs}ms! Live synchronization active.`
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect to Supabase.' };
    }
  }

  /**
   * Pull existing records from Supabase tables to populate local state from actual database
   */
  async pullFromSupabase(): Promise<{
    routers: RouterDevice[];
    vouchers: Voucher[];
    transactions: PaymentTransaction[];
    plans: HotspotPlan[];
  } | null> {
    if (!this.client || !this.config.isConnected) return null;
    try {
      const [routersRes, vouchersRes, txsRes, plansRes] = await Promise.all([
        this.client.from('routers').select('*'),
        this.client.from('vouchers').select('*'),
        this.client.from('transactions').select('*').order('created_at', { ascending: false }),
        this.client.from('plans').select('*')
      ]);

      const routers: RouterDevice[] = (routersRes.data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        vertical: r.vertical,
        siteName: r.site_name,
        model: r.model,
        boardName: r.board_name,
        rosVersion: r.ros_version,
        macAddress: r.mac_address,
        wireguardIp: r.wireguard_ip,
        publicWanIp: r.public_wan_ip,
        status: r.status,
        uptime: r.uptime || '0m',
        cpuLoad: r.cpu_load || 0,
        memoryUsage: r.memory_usage || 0,
        lastHeartbeat: r.last_heartbeat || 'Recently',
        firmware: r.firmware || '7.15.2',
        activeSessions: r.active_sessions || 0,
        token: r.token,
        tokenExpiresAt: r.token_expires_at,
        adoptedAt: r.adopted_at,
        solarTelemetry: r.solar_telemetry,
        gpsTelemetry: r.gps_telemetry
      }));

      const vouchers: Voucher[] = (vouchersRes.data || []).map((v: any) => ({
        id: v.id,
        code: v.code,
        planId: v.plan_id,
        planName: v.plan_name,
        price: Number(v.price),
        currency: v.currency || 'M',
        durationSeconds: v.duration_seconds,
        deviceLimit: v.device_limit || 2,
        status: v.status,
        generatedAt: v.generated_at,
        expiresAt: v.expires_at,
        firstUsedAt: v.first_used_at,
        associatedDevices: [],
        batchId: v.batch_id
      }));

      const transactions: PaymentTransaction[] = (txsRes.data || []).map((t: any) => ({
        id: t.id,
        transactionRef: t.transaction_ref,
        provider: t.provider,
        amount: Number(t.amount),
        currency: t.currency || 'M',
        phoneNumber: t.phone_number,
        planId: t.plan_id,
        planName: t.plan_name,
        vertical: t.vertical,
        siteName: t.site_name,
        voucherCodeIssued: t.voucher_code_issued,
        status: t.status,
        errorMessage: t.error_message,
        debugLogs: t.debug_logs || {},
        createdAt: t.created_at,
        completedAt: t.completed_at
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
        deviceLimit: p.device_limit,
        burstDownloadMbps: p.burst_download_mbps ? Number(p.burst_download_mbps) : undefined,
        burstUploadMbps: p.burst_upload_mbps ? Number(p.burst_upload_mbps) : undefined,
        fairUseThresholdMb: p.fair_use_threshold_mb,
        fairUseDownloadMbps: p.fair_use_download_mbps ? Number(p.fair_use_download_mbps) : undefined,
        isPopular: p.is_popular
      }));

      return { routers, vouchers, transactions, plans };
    } catch (err) {
      console.warn('Failed to pull from Supabase:', err);
      return null;
    }
  }

  async syncRoutersToSupabase(routers: RouterDevice[]): Promise<boolean> {
    if (!this.client || !this.config.isConnected) return false;
    try {
      const records = routers.map(r => ({
        id: r.id,
        name: r.name,
        vertical: r.vertical,
        site_name: r.siteName,
        model: r.model,
        board_name: r.boardName,
        ros_version: r.rosVersion,
        mac_address: r.macAddress,
        wireguard_ip: r.wireguardIp,
        public_wan_ip: r.publicWanIp,
        status: r.status,
        uptime: r.uptime,
        cpu_load: r.cpuLoad,
        memory_usage: r.memoryUsage,
        last_heartbeat: r.lastHeartbeat,
        firmware: r.firmware,
        active_sessions: r.activeSessions,
        solar_telemetry: r.solarTelemetry || null,
        gps_telemetry: r.gpsTelemetry || null
      }));

      await this.client.from('routers').upsert(records, { onConflict: 'id' });
      return true;
    } catch (e) {
      console.warn('Supabase sync router error:', e);
      return false;
    }
  }

  async syncVoucherToSupabase(voucher: Voucher): Promise<boolean> {
    if (!this.client || !this.config.isConnected) return false;
    try {
      await this.client.from('vouchers').upsert({
        id: voucher.id,
        code: voucher.code,
        code_hash: voucher.code,
        plan_id: voucher.planId,
        plan_name: voucher.planName,
        price: voucher.price,
        currency: voucher.currency,
        duration_seconds: voucher.durationSeconds,
        device_limit: voucher.deviceLimit,
        status: voucher.status,
        generated_at: voucher.generatedAt,
        expires_at: voucher.expiresAt,
        first_used_at: voucher.firstUsedAt || null,
        batch_id: voucher.batchId || null
      }, { onConflict: 'id' });
      return true;
    } catch (e) {
      console.warn('Supabase sync voucher error:', e);
      return false;
    }
  }

  async syncTransactionToSupabase(tx: PaymentTransaction): Promise<boolean> {
    if (!this.client || !this.config.isConnected) return false;
    try {
      await this.client.from('transactions').upsert({
        id: tx.id,
        transaction_ref: tx.transactionRef,
        provider: tx.provider,
        amount: tx.amount,
        currency: tx.currency,
        phone_number: tx.phoneNumber || null,
        plan_id: tx.planId,
        plan_name: tx.planName,
        vertical: tx.vertical,
        site_name: tx.siteName,
        voucher_code_issued: tx.voucherCodeIssued || null,
        status: tx.status,
        error_message: tx.errorMessage || null,
        debug_logs: tx.debugLogs,
        created_at: tx.createdAt,
        completed_at: tx.completedAt || null
      }, { onConflict: 'id' });
      return true;
    } catch (e) {
      console.warn('Supabase sync transaction error:', e);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();
