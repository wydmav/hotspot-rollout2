-- =============================================================================
-- T-CONNECT MULTI-ROUTER WIFI MONETIZATION PLATFORM
-- Master PostgreSQL 16 Schema (Section 3 & Errata E3, E8, E9, E11, E14)
-- Money stored in integer lisente (100 lisente = M1.00); timestamps TIMESTAMPTZ
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Admins, Roles, Scopes, Sessions & Partner API Keys
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Super Admin', 'Collaborator', 'Finance', 'Tech', 'Management')),
  password_hash TEXT NOT NULL,
  totp_secret_encrypted TEXT,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'revoked')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'group', 'vertical', 'router')),
  scope_target_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_id, scope_type, scope_target_id)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_api_keys (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY['hotspot'],
  allowed_router_ids TEXT[] NOT NULL DEFAULT ARRAY['*'],
  allowed_sites TEXT[] NOT NULL DEFAULT ARRAY['*'],
  webhook_url TEXT,
  webhook_secret_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  leads_reset_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  total_requests BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Groups, Policies, Routers, IP Allocations, Router Secrets & Health
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tag TEXT NOT NULL UNIQUE,
  vertical TEXT NOT NULL DEFAULT 'hotspot',
  custom_bg_url TEXT,
  accent_color TEXT DEFAULT '#f05e17',
  description TEXT,
  is_quarantine BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  group_id TEXT UNIQUE REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  access_mode TEXT NOT NULL DEFAULT 'FREE_TRIAL_AND_PAID' CHECK (access_mode IN ('PAID_ONLY', 'FREE_TRIAL_AND_PAID', 'COMPLETELY_FREE')),
  free_duration_minutes INTEGER NOT NULL DEFAULT 30,
  free_rate_limit TEXT NOT NULL DEFAULT '10M/30M',
  free_daily_quota_mb INTEGER NOT NULL DEFAULT 500,
  ad_gated BOOLEAN NOT NULL DEFAULT TRUE,
  auto_redeem_after_payment BOOLEAN NOT NULL DEFAULT FALSE,
  walled_garden_domains TEXT[] NOT NULL DEFAULT ARRAY['api.paylesotho.co.ls', 'xpayments.paylesotho.co.ls', 'api.ottlesotho.com'],
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  vertical TEXT NOT NULL DEFAULT 'hotspot' CHECK (vertical IN ('hotspot', 'village', 'community', 'bus', 'stadium', 'park')),
  site_name TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT 'Maseru',
  physical_address TEXT,
  partner_name TEXT DEFAULT 'T-Connect Internal Fleet',
  model TEXT NOT NULL DEFAULT 'MikroTik hAP ax3 (v7)',
  board_name TEXT NOT NULL DEFAULT 'hAP ax3',
  ros_version TEXT NOT NULL DEFAULT 'v7' CHECK (ros_version = 'v7'),
  firmware TEXT NOT NULL DEFAULT '7.15.2',
  mac_address TEXT,
  wireguard_ip INET NOT NULL UNIQUE,
  public_wan_ip INET,
  status TEXT NOT NULL DEFAULT 'pending_adoption' CHECK (status IN ('online', 'offline', 'pending_adoption')),
  last_real_heartbeat_at TIMESTAMPTZ,
  adopted_at TIMESTAMPTZ,
  offline_since TIMESTAMPTZ,
  offline_reason TEXT,
  backhaul_mbps INTEGER NOT NULL DEFAULT 100,
  wan1_interface TEXT NOT NULL DEFAULT 'ether1',
  wan2_interface TEXT,
  active_wan TEXT NOT NULL DEFAULT 'wan1' CHECK (active_wan IN ('wan1', 'wan2')),
  policy_overrides_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ip_allocations (
  wireguard_ip INET PRIMARY KEY,
  router_id TEXT NOT NULL UNIQUE REFERENCES routers(id) ON DELETE CASCADE,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS router_secrets (
  router_id TEXT PRIMARY KEY REFERENCES routers(id) ON DELETE CASCADE,
  adopt_token_hash TEXT UNIQUE,
  adopt_token_expires_at TIMESTAMPTZ,
  adopt_token_used_at TIMESTAMPTZ,
  wg_public_key TEXT,
  wg_private_key_encrypted TEXT,
  radius_secret_encrypted TEXT NOT NULL,
  api_password_encrypted TEXT NOT NULL,
  heartbeat_token_hash TEXT NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS router_health (
  id BIGSERIAL PRIMARY KEY,
  router_id TEXT NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uptime_text TEXT,
  cpu_load INTEGER NOT NULL DEFAULT 0,
  memory_usage INTEGER NOT NULL DEFAULT 0,
  active_sessions INTEGER NOT NULL DEFAULT 0,
  active_wan TEXT NOT NULL DEFAULT 'wan1',
  wan1_rtt_ms INTEGER,
  wan2_rtt_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_router_health_router_recorded ON router_health (router_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS config_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  router_id TEXT NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  script_sha256 TEXT NOT NULL,
  script_body TEXT NOT NULL,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Packages, Gateways, Transactions, Payment Events, Vouchers & Entitlements
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vertical TEXT NOT NULL DEFAULT 'hotspot',
  price_lisente INTEGER NOT NULL CHECK (price_lisente > 0),
  currency TEXT NOT NULL DEFAULT 'M',
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  data_cap_mb INTEGER,
  download_speed_mbps NUMERIC(6,2) NOT NULL,
  upload_speed_mbps NUMERIC(6,2) NOT NULL,
  device_limit INTEGER NOT NULL DEFAULT 1 CHECK (device_limit >= 1),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gateways (
  provider TEXT PRIMARY KEY CHECK (provider IN ('paylesotho', 'ottvoucher')),
  name TEXT NOT NULL,
  merchant_name TEXT NOT NULL DEFAULT 'T-Connect',
  mpesa_merchant_id TEXT DEFAULT '62915',
  ecocash_merchant_id TEXT DEFAULT '63165430',
  endpoint_url TEXT NOT NULL,
  is_live BOOLEAN NOT NULL DEFAULT TRUE,
  kill_switch_active BOOLEAN NOT NULL DEFAULT FALSE,
  kill_switch_reason TEXT,
  credentials_encrypted BYTEA,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  transaction_ref TEXT NOT NULL UNIQUE,
  upstream_reference TEXT UNIQUE,
  provider TEXT NOT NULL REFERENCES gateways(provider),
  channel TEXT NOT NULL CHECK (channel IN ('mpesa', 'ecocash', 'card', 'ott_pin')),
  amount_lisente INTEGER NOT NULL CHECK (amount_lisente > 0),
  currency TEXT NOT NULL DEFAULT 'M',
  msisdn TEXT,
  customer_name TEXT,
  customer_email TEXT,
  package_id TEXT REFERENCES packages(id),
  router_id TEXT REFERENCES routers(id),
  client_mac TEXT,
  client_ip INET,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'fulfilment_failed', 'refunded')),
  ott_voucher_pin TEXT,
  ott_voucher_source TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_status_created ON transactions (status, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_ip INET,
  http_status INTEGER,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_hash TEXT NOT NULL UNIQUE,
  pin_last4 TEXT NOT NULL,
  amount_lisente INTEGER NOT NULL CHECK (amount_lisente > 0),
  currency TEXT NOT NULL DEFAULT 'M',
  payment_ref TEXT UNIQUE,
  transaction_id TEXT REFERENCES transactions(id),
  package_id TEXT REFERENCES packages(id),
  duration_seconds INTEGER NOT NULL DEFAULT 86400,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'copied', 'redeemed', 'expired', 'revoked')),
  source TEXT NOT NULL DEFAULT 'paylesotho_ott_api',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  copied_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  redeemed_by_mac TEXT
);

CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES vouchers(id),
  transaction_id TEXT REFERENCES transactions(id),
  package_id TEXT REFERENCES packages(id),
  router_id TEXT REFERENCES routers(id),
  max_devices INTEGER NOT NULL DEFAULT 1,
  rate_limit TEXT NOT NULL DEFAULT '5M/2M',
  quota_bytes BIGINT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'expired', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  client_mac TEXT NOT NULL,
  client_ip INET,
  bound_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entitlement_id, client_mac)
);

-- 4. FreeRADIUS Standard SQL Tables (radcheck, radreply, radacct, radpostauth, nas)
CREATE TABLE IF NOT EXISTS radcheck (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL DEFAULT '',
  attribute TEXT NOT NULL DEFAULT '',
  op VARCHAR(2) NOT NULL DEFAULT '==',
  value TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_radcheck_username ON radcheck (username, attribute);

CREATE TABLE IF NOT EXISTS radreply (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL DEFAULT '',
  attribute TEXT NOT NULL DEFAULT '',
  op VARCHAR(2) NOT NULL DEFAULT '=',
  value TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_radreply_username ON radreply (username, attribute);

CREATE TABLE IF NOT EXISTS radacct (
  radacctid BIGSERIAL PRIMARY KEY,
  acctsessionid TEXT NOT NULL,
  acctuniqueid TEXT NOT NULL UNIQUE,
  username TEXT,
  nasipaddress INET NOT NULL,
  nasportid TEXT,
  acctstarttime TIMESTAMPTZ,
  acctupdatetime TIMESTAMPTZ,
  acctstoptime TIMESTAMPTZ,
  acctsessiontime INTEGER,
  acctinputoctets BIGINT DEFAULT 0,
  acctoutputoctets BIGINT DEFAULT 0,
  calledstationid TEXT,
  callingstationid TEXT,
  acctterminatecause TEXT,
  framedipaddress INET
);
CREATE INDEX IF NOT EXISTS idx_radacct_active ON radacct (username, acctstoptime) WHERE acctstoptime IS NULL;

CREATE TABLE IF NOT EXISTS radpostauth (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  pass TEXT,
  reply TEXT,
  authdate TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nas (
  id SERIAL PRIMARY KEY,
  nasname TEXT NOT NULL UNIQUE,
  shortname TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  ports INTEGER,
  secret TEXT NOT NULL,
  server TEXT,
  community TEXT,
  description TEXT
);

-- 5. Ads, View Tokens, Guest Leads, Consents, Webhooks, Reconciliation & Audit Logs
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  headline TEXT,
  media_type TEXT NOT NULL DEFAULT 'image_carousel' CHECK (media_type IN ('image_carousel', 'video')),
  video_url TEXT,
  slides_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  destination_url TEXT NOT NULL,
  target_scope TEXT NOT NULL DEFAULT 'all',
  watch_mode TEXT NOT NULL DEFAULT 'skip_after_sec',
  skip_after_sec INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 10,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_view_tokens (
  token TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  client_mac TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  required_duration_sec INTEGER NOT NULL DEFAULT 10,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS guest_leads (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  router_id TEXT REFERENCES routers(id),
  site_name TEXT NOT NULL,
  vertical TEXT NOT NULL DEFAULT 'hotspot',
  client_mac TEXT,
  client_ip INET,
  mode TEXT NOT NULL DEFAULT 'free',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES guest_leads(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL DEFAULT 'sesotho-v1-2026',
  marketing_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  ip_address INET,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL,
  checked_count INTEGER NOT NULL DEFAULT 0,
  mismatch_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('CLEAN', 'MISMATCH_DETECTED')),
  mismatches_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address INET,
  details TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed E10 Default Groups: Lab / Test (MIKROTIK-TC) & Quarantine
INSERT INTO groups (id, name, tag, vertical, description, is_quarantine)
VALUES
  ('grp_lab_test', 'Lab / Test (MIKROTIK-TC)', 'group:lab-test', 'hotspot', 'Pre-configured Lab & Test group: SSID MIKROTIK-TC, FREE + PAID enabled, M10/M60/M280 packages, 3-slide sponsor carousel, PayLesotho + OTT gateways enabled.', FALSE),
  ('grp_quarantine', 'Quarantine (Holding Group)', 'group:quarantine', 'hotspot', 'Safe holding group for newly adopted or unassigned routers: FREE OFF, PAID OFF, splash page displays Hotspot being configured.', TRUE)
ON CONFLICT (id) DO NOTHING;
