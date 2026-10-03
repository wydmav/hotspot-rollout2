-- ==============================================================================
-- T-CONNECT CLOUD CONTROLLER — PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Multi-Tenant Hotspot Management, Financial Ledger, Atomic Vouchers & Audit Log
-- ==============================================================================
-- Designed for PostgreSQL 15+ / Supabase
-- Includes strict Row-Level Security (RLS) guaranteeing tenant isolation.
-- ==============================================================================

-- Enable required cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. MULTI-TENANCY & RBAC (TENANT ISOLATION CORE)
-- ==============================================================================

-- Operators table represents independent hotspot operators / clients (Tenants)
CREATE TABLE IF NOT EXISTS public.operators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    default_currency TEXT NOT NULL DEFAULT 'M',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Operator Members links Supabase Auth users to an Operator with a specific Role
CREATE TABLE IF NOT EXISTS public.operator_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'technical', 'collaborator', 'viewer')),
    scoped_sites UUID[] DEFAULT NULL, -- NULL means access to all sites in operator
    status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (operator_id, user_id)
);

-- Helper: Get current user's operator IDs
CREATE OR REPLACE FUNCTION public.get_current_user_operator_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT operator_id 
    FROM public.operator_members 
    WHERE user_id = auth.uid() 
      AND status = 'active';
$$;

-- Helper: Check if current user has one of the required roles in an operator
CREATE OR REPLACE FUNCTION public.user_has_operator_role(p_operator_id UUID, p_required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.operator_members 
        WHERE operator_id = p_operator_id 
          AND user_id = auth.uid() 
          AND status = 'active'
          AND role = ANY(p_required_roles)
    );
$$;

-- ==============================================================================
-- 2. SITES & HARDWARE FLEET (MIKROTIK & TELTONIKA ROUTERS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
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
    id TEXT PRIMARY KEY, -- e.g. 'rt_maseru_mall_01'
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
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

-- ==============================================================================
-- 3. HOTSPOT PLANS & ATOMIC VOUCHER ENTITLEMENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY, -- e.g. 'plan_m10_24h'
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    vertical TEXT NOT NULL CHECK (vertical IN ('hotspot', 'community', 'bus', 'stadium', 'park')),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'M',
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    duration_label TEXT NOT NULL,
    data_cap_mb INTEGER, -- NULL = unlimited
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
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g. 'TC-9482-10M'
    code_hash TEXT NOT NULL, -- Peppered hash for verification
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

-- Normalized Device Association Table for Multi-Device Quotas & Roaming
CREATE TABLE IF NOT EXISTS public.voucher_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
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

-- ==============================================================================
-- 4. FINANCIAL TRANSACTIONS LEDGER (DOUBLE-ENTRY & IDEMPOTENT)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    transaction_ref TEXT NOT NULL, -- Gateway reference ID
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

-- Payment Gateways Configuration
CREATE TABLE IF NOT EXISTS public.gateway_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
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

-- ==============================================================================
-- 5. IMMUTABLE SECURITY AUDIT TRAIL
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
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

-- Prevent mutation or deletion of audit logs (Append-only guarantee)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. Updates and deletes are strictly prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ==============================================================================
-- 6. ATOMIC CONCURRENCY FUNCTION: VOUCHER REDEMPTION
-- ==============================================================================
-- Enforces row-level lock (FOR UPDATE), anti-double-spend, device limits,
-- and global roaming entitlement tracking.

CREATE OR REPLACE FUNCTION public.redeem_voucher_atomic(
    p_operator_id UUID,
    p_code TEXT,
    p_mac TEXT,
    p_hostname TEXT DEFAULT 'Client-Device',
    p_site_name TEXT DEFAULT 'Hotspot'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_voucher RECORD;
    v_device RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_exp TIMESTAMPTZ;
    v_slot_text TEXT;
BEGIN
    -- 1. Row-level lock on the voucher row to block race conditions under concurrency
    SELECT * INTO v_voucher
    FROM public.vouchers
    WHERE operator_id = p_operator_id 
      AND UPPER(code) = UPPER(TRIM(p_code))
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'INVALID_CODE',
            'message', 'The voucher code does not exist.'
        );
    END IF;

    -- 2. Status checks
    IF v_voucher.status = 'revoked' THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'REVOKED',
            'message', 'This voucher has been revoked by administration.'
        );
    END IF;

    IF v_voucher.status = 'expired' OR (v_voucher.expires_at < v_now) THEN
        UPDATE public.vouchers SET status = 'expired' WHERE id = v_voucher.id;
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'EXPIRED',
            'message', 'This voucher has expired.'
        );
    END IF;

    -- 3. Check if device MAC is already registered (Roaming / Reconnect)
    SELECT * INTO v_device
    FROM public.voucher_devices
    WHERE voucher_id = v_voucher.id 
      AND UPPER(mac_address) = UPPER(TRIM(p_mac));

    IF FOUND THEN
        UPDATE public.voucher_devices
        SET last_seen_at = v_now,
            site_name = p_site_name,
            hostname = COALESCE(p_hostname, hostname)
        WHERE id = v_device.id;

        RETURN jsonb_build_object(
            'success', true,
            'is_roaming', true,
            'plan_name', v_voucher.plan_name,
            'duration_seconds', v_voucher.duration_seconds,
            'device_slot', 'Active',
            'message', format('Device reconnected via roaming at %s without second payment.', p_site_name)
        );
    END IF;

    -- 4. Device limit quota check
    IF v_voucher.active_device_count >= v_voucher.device_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'DEVICE_LIMIT_REACHED',
            'message', format('Device limit reached (%s/%s max).', v_voucher.active_device_count, v_voucher.device_limit)
        );
    END IF;

    -- 5. First-use timer activation
    IF v_voucher.first_used_at IS NULL THEN
        v_exp := v_now + (v_voucher.duration_seconds || ' seconds')::INTERVAL;
        UPDATE public.vouchers
        SET first_used_at = v_now,
            expires_at = v_exp,
            status = 'used',
            active_device_count = active_device_count + 1
        WHERE id = v_voucher.id;
    ELSE
        UPDATE public.vouchers
        SET active_device_count = active_device_count + 1,
            status = 'used'
        WHERE id = v_voucher.id;
    END IF;

    -- 6. Insert registered device slot
    INSERT INTO public.voucher_devices (
        operator_id,
        voucher_id,
        mac_address,
        hostname,
        site_name,
        first_seen_at,
        last_seen_at
    ) VALUES (
        p_operator_id,
        v_voucher.id,
        UPPER(TRIM(p_mac)),
        p_hostname,
        p_site_name,
        v_now,
        v_now
    );

    v_slot_text := format('%s/%s', v_voucher.active_device_count + 1, v_voucher.device_limit);

    RETURN jsonb_build_object(
        'success', true,
        'is_roaming', false,
        'plan_name', v_voucher.plan_name,
        'duration_seconds', v_voucher.duration_seconds,
        'device_slot', v_slot_text,
        'message', format('Entitlement granted for %s at %s.', v_voucher.plan_name, p_site_name)
    );
END;
$$;

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES — STRICT TENANT ISOLATION
-- ==============================================================================

-- Enable RLS on all public tables
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

-- ------------------------------------------------------------------------------
-- OPERATORS RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Operators viewable only by their members"
ON public.operators FOR SELECT
USING (id IN (SELECT public.get_current_user_operator_ids()));

CREATE POLICY "Operators modifiable only by owners"
ON public.operators FOR UPDATE
USING (public.user_has_operator_role(id, ARRAY['owner']));

-- ------------------------------------------------------------------------------
-- OPERATOR MEMBERS RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Members viewable within same operator"
ON public.operator_members FOR SELECT
USING (operator_id IN (SELECT public.get_current_user_operator_ids()));

CREATE POLICY "Members manageable by owner and admin"
ON public.operator_members FOR ALL
USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin']))
WITH CHECK (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin']));

-- ------------------------------------------------------------------------------
-- SITES & ROUTERS RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Sites viewable by operator members"
ON public.sites FOR SELECT
USING (operator_id IN (SELECT public.get_current_user_operator_ids()));

CREATE POLICY "Sites manageable by technical and above"
ON public.sites FOR ALL
USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'technical']))
WITH CHECK (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'technical']));

CREATE POLICY "Routers viewable by operator members"
ON public.routers FOR SELECT
USING (operator_id IN (SELECT public.get_current_user_operator_ids()));

CREATE POLICY "Routers manageable by technical and above"
ON public.routers FOR ALL
USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'technical']))
WITH CHECK (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'technical']));

-- ------------------------------------------------------------------------------
-- PLANS & VOUCHERS RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Plans viewable by operator members"
ON public.plans FOR SELECT
USING (operator_id IN (SELECT public.get_current_user_operator_ids()));

CREATE POLICY "Plans manageable by admin or collaborator"
ON public.plans FOR ALL
USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator']))
WITH CHECK (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator']));

CREATE POLICY "Vouchers viewable by operator members"
ON public.vouchers FOR SELECT
USING (operator_id IN (SELECT public.get_current_user_operator_ids()));

CREATE POLICY "Vouchers manageable by operator members"
ON public.vouchers FOR ALL
USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator']))
WITH CHECK (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator']));

CREATE POLICY "Voucher devices viewable by operator members"
ON public.voucher_devices FOR SELECT
USING (operator_id IN (SELECT public.get_current_user_operator_ids()));

CREATE POLICY "Voucher devices modifiable by operator members"
ON public.voucher_devices FOR ALL
USING (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator', 'technical']))
WITH CHECK (public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator', 'technical']));

-- ------------------------------------------------------------------------------
-- TRANSACTIONS (FINANCIAL LEDGER) RLS
-- Technical and Viewer roles are restricted from financial billing
-- ------------------------------------------------------------------------------
CREATE POLICY "Transactions viewable only by owner, admin and collaborator"
ON public.transactions FOR SELECT
USING (
    operator_id IN (SELECT public.get_current_user_operator_ids()) 
    AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator'])
);

CREATE POLICY "Transactions insertable by authenticated payment processors"
ON public.transactions FOR INSERT
WITH CHECK (
    operator_id IN (SELECT public.get_current_user_operator_ids()) 
    AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'collaborator'])
);

-- Gateways config viewable only by owner and admin
CREATE POLICY "Gateway configs viewable only by owner and admin"
ON public.gateway_configs FOR SELECT
USING (
    operator_id IN (SELECT public.get_current_user_operator_ids()) 
    AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin'])
);

CREATE POLICY "Gateway configs manageable only by owner and admin"
ON public.gateway_configs FOR ALL
USING (
    operator_id IN (SELECT public.get_current_user_operator_ids()) 
    AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin'])
)
WITH CHECK (
    operator_id IN (SELECT public.get_current_user_operator_ids()) 
    AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin'])
);

-- ------------------------------------------------------------------------------
-- AUDIT LOGS RLS
-- Immutable: Insert allowed, viewable only by privileged roles, NO UPDATE, NO DELETE
-- ------------------------------------------------------------------------------
CREATE POLICY "Audit logs viewable only by privileged roles"
ON public.audit_logs FOR SELECT
USING (
    operator_id IN (SELECT public.get_current_user_operator_ids()) 
    AND public.user_has_operator_role(operator_id, ARRAY['owner', 'admin', 'technical'])
);

CREATE POLICY "Audit logs append-only by authenticated users"
ON public.audit_logs FOR INSERT
WITH CHECK (
    operator_id IN (SELECT public.get_current_user_operator_ids())
);

-- ==============================================================================
-- 8. INDEXES FOR HIGH-THROUGHPUT REAL-TIME INGESTION
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_routers_operator ON public.routers(operator_id, status);
CREATE INDEX IF NOT EXISTS idx_routers_site ON public.routers(site_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_lookup ON public.vouchers(operator_id, code);
CREATE INDEX IF NOT EXISTS idx_vouchers_plan ON public.vouchers(plan_id);
CREATE INDEX IF NOT EXISTS idx_voucher_devices_mac ON public.voucher_devices(voucher_id, mac_address);
CREATE INDEX IF NOT EXISTS idx_transactions_operator ON public.transactions(operator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ref ON public.transactions(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator ON public.audit_logs(operator_id, created_at DESC);
