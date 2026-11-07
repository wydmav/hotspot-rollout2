# Gate G1 — Pre-Change Codebase & Live System Audit Matrix (`E1`–`E16`)

This audit matrix documents the file-by-file verification and remediation performed across the T-Connect WiFi Monetization Platform in strict compliance with the Final Master Build Specification (`E1`–`E16` and `AT-01`–`AT-25`).

---

## 1. Frozen Payment & Voucher Contract Invariant (`E1`, `AT-24`)

- **Status**: **VERIFIED & FROZEN**
- **SHA-256 Digest**: `6f9a26a474a9515cc2f8b7762a010b5fea7de0a89fea7db48568c55c2e037fba`
- **Secret Storage**: Moved out of source files and documentation into `/app/applet/.env` (file mode `0600`).
- **Compensating Controls Implemented**:
  1. **Gateway Kill Switch**: `POST /api/gateways/:provider/kill-switch` toggles `killSwitch: true/false`, audited with actor, reason, and timestamp, and blocks new checkout initiation (`503 GATEWAY_KILL_SWITCH_ACTIVE`) without altering credentials.
  2. **Daily Gateway & OTT Reconciliation**: `POST /api/gateways/paylesotho/reconcile` compares issued vouchers and settled collections against statement rows and `/ott/voucher/check` and triggers webhook/email alerts on any >0 lisente discrepancy (`AT-25`).
  3. **Strict Outbound Egress Lock**: PayLesotho requests only target `https://api.paylesotho.co.ls` and OTT Lesotho requests only target `https://api.ott.co.ls/ott` with TLS verification enabled.
  4. **Zero-Log / UI Redaction**: `GET /api/gateways` masks secrets to last-4 characters (`••••XXXX`), while `POST /api/gateways/:provider/reveal-secret` requires `super_admin` or `finance_admin` and writes an immutable `GATEWAY_SECRET_REVEALED` audit entry (`AT-17`).

---

## 2. File-by-File Audit & Remediation Matrix

| File / Subsystem | Pre-Audit Finding | Remediation Applied | Acceptance Test |
| :--- | :--- | :--- | :--- |
| `/server.ts` — WG Swarm Online Calculation | Previously could reflect stale router status when no router had sent a live heartbeat within `60s`. | Computed live `isRouterTrulyOnline()` strictly from `last_seen_at` within `60,000ms` (`3 × 15s` beats) and bound `wgSwarm.peersOnline` to real heartbeats. | `AT-10`, `AT-11` |
| `/server.ts` — Voucher Issuance & PIN Redemption | Concurrent poll requests or parallel PIN submissions could race before state persistence. | Added per-transaction mutex (`activeVoucherIssuanceLocks`) and per-PIN atomic lock (`activePinRedemptionLocks`) + integer lisente (`amount_lisente`) verification. | `AT-01`, `AT-02`, `AT-03` |
| `/server.ts` — Media Proxy (`/api/portal/media-proxy`) | Allowed arbitrary `http/https` URLs without RFC1918/loopback/metadata IP filtering. | Added `isForbiddenMediaProxyHost()` + DNS resolution inspection blocking `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `100.64.0.0/10`, `::1`, `fc00::/7`, `fe80::/10`. | `AT-15` |
| `/server.ts` — Auth & Partner Scope Enforcement | Partner API keys needed query-string rejection and strict path allowlisting. | Rejected `?api_key=` in query strings (`401 API_KEY_IN_QUERY_FORBIDDEN`) and restricted `tc_pk_*` keys exclusively to `/api/v1/partner/*` (`403 FORBIDDEN_PARTNER_KEY_SCOPE`). | `AT-18`, `AT-19` |
| `/server.ts` — Ad View Server Token (`E9`) | Ad completion previously relied on client-side timer completion without server timestamp validation. | Added `POST /api/portal/ad/start` and `POST /api/portal/ad/complete` enforcing `completed_at - started_at >= required_seconds - 1s` with single-use HMAC token consumption. | `AT-09` |
| `/server.ts` — Per-Router WireGuard IP Allocator (`E5`) | Provisioning scripts fell back to `10.99.0.2/32` if `wireguard_ip` was unset. | Implemented `allocateRouterWireGuardIp()` assigning unique `/32` addresses (`10.99.0.2` – `10.99.255.254`) persisted per router. | `AT-13` |
| `/src/services/routerosRenderer.ts` — RouterOS v7.15+ Renderer (`E5`, `E15`, `E16`) | Unescaped strings in comments/SSIDs could inject RouterOS commands; flash logs risked NAND wear; single-band WiFi config. | Added `escapeRouterOSString()`, 13-stage idempotent provisioning (`MIKROTIK-TC` on 2.4GHz + 5GHz, `tconnect:revert-timer`, IPv6 disabled on guest bridge, dynamic `backhaulMbps` queue, RAM-only heartbeat), and 2s/10s/60s Dual-WAN failover with conntrack flush. | `AT-12`, `AT-14`, `AT-22`, `AT-23` |
| `/supabase/migrations/001_master_errata_schema.sql` | Needed unified PostgreSQL 16 + FreeRADIUS SQL schema with integer lisente and `TIMESTAMPTZ`. | Created complete migration covering `routers`, `ip_allocations`, `packages`, `transactions`, `vouchers`, `entitlements`, `device_slots`, `sessions`, `radcheck`, `radreply`, `radacct`, `nas`, `ad_view_tokens`, `consents`, and `reconciliation_runs`. | `E2`, `E3`, `E6` |
| `/scripts/migrate-json-to-pg.ts` | Needed dry-run and live migration from `./data/*.json` to PostgreSQL 16 with row-count and sum parity checks. | Implemented idempotent migration tool with `--dry-run`, SHA-256 verification, and lisente sum reconciliation. | `E2` |
| Tracked Code & Docs Secret Scrub (`E1`) | Literal Bearer token / API key appeared in code defaults and markdown docs. | Scrubbed all tracked source files and documentation; verified 0 occurrences across git-tracked files. | `AT-16` |
