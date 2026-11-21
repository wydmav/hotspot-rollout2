#!/usr/bin/env node
/**
 * T-Connect Control Tower — Root Clean-Slate Production Reset Script
 *
 * Usage:
 *   node reset-clean-slate.mjs
 *   -- or --
 *   ./reset-clean-slate.sh
 *
 * What this script does:
 *   1. Resets all captured guest leads, paid transactions, issued OTT voucher records,
 *      and active session counters to 0 across:
 *      - Live running Control Tower server (POST /api/admin/reset-live-data)
 *      - Persistent disk store (data/server-portal-store.json, /app/data/server-portal-store.json, public/server-portal-store.json)
 *      - Connected Supabase PostgreSQL tables (public.guest_leads, public.transactions, public.ott_vouchers_issued)
 *   2. Stamps a persistent `cleanSlateAt` ISO timestamp so historical records never re-populate.
 *   3. Keeps all Partner & Finance API Keys (tc_live_...) active while resetting their lead counters to 0.
 *   4. Preserves 100% of adopted MikroTik routers, WireGuard keys, Captive Portal designs, and Gateway Bearer tokens.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nowIso = new Date().toISOString();

const candidateStorePaths = [
  path.resolve('/app/data', 'server-portal-store.json'),
  path.resolve(__dirname, 'data', 'server-portal-store.json'),
  path.resolve(__dirname, 'public', 'server-portal-store.json'),
  path.resolve(__dirname, '.portal-store.json')
];

let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://uxglqtcuedelmyhvgghw.supabase.co';
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Load .env if present
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) {
        const k = m[1];
        const v = m[2].replace(/^['"]|['"]$/g, '').trim();
        if ((k === 'VITE_SUPABASE_URL' || k === 'SUPABASE_URL') && v) supabaseUrl = v;
        if ((k === 'VITE_SUPABASE_ANON_KEY' || k === 'SUPABASE_ANON_KEY') && v) supabaseKey = v;
      }
    }
  } catch {}
}

let updatedFiles = 0;
let preservedRoutersCount = 0;
let preservedPartnerKeysCount = 0;

for (const filePath of candidateStorePaths) {
  if (!fs.existsSync(filePath)) continue;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (raw.supabaseConfig?.url) supabaseUrl = raw.supabaseConfig.url;
    if (raw.supabaseConfig?.anonKey) supabaseKey = raw.supabaseConfig.anonKey;

    raw.cleanSlateAt = nowIso;
    raw.guestEvents = [];
    raw.transactions = [];
    raw.issuedPayLesothoOttVouchers = [];
    raw.redeemedOttPins = [];

    if (Array.isArray(raw.routers)) {
      raw.routers = raw.routers.map((r) => ({
        ...r,
        activeSessions: 0
      }));
      preservedRoutersCount = Math.max(preservedRoutersCount, raw.routers.length);
    }

    if (Array.isArray(raw.partnerApiKeys)) {
      raw.partnerApiKeys = raw.partnerApiKeys.map((k) => ({
        ...k,
        leadsResetAt: nowIso,
        totalRequests: 0
      }));
      preservedPartnerKeysCount = Math.max(preservedPartnerKeysCount, raw.partnerApiKeys.length);
    }

    fs.writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf-8');
    updatedFiles++;
    console.log(`[CLEAN-SLATE] Reset persistent store: ${filePath}`);
  } catch (err) {
    console.warn(`[CLEAN-SLATE] Warning updating ${filePath}:`, err.message);
  }
}

// Notify running server on port 3000 so in-memory store & live routers reset immediately
try {
  const res = await fetch('http://127.0.0.1:3000/api/admin/reset-live-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(4000)
  });
  if (res.ok) {
    console.log('[CLEAN-SLATE] Live running Control Tower server reset via POST /api/admin/reset-live-data');
  }
} catch {
  console.log('[CLEAN-SLATE] Note: Local port 3000 server was not reachable directly (disk store updated).');
}

// Wipe Supabase live tables if anonKey is configured
if (supabaseUrl && supabaseKey) {
  const cleanUrl = supabaseUrl.replace(/\/+$/, '');
  const tables = [
    { table: 'guest_leads', filter: 'id=neq.__never__' },
    { table: 'transactions', filter: 'id=neq.__never__' },
    { table: 'ott_vouchers_issued', filter: 'pin=neq.__never__' }
  ];
  for (const { table, filter } of tables) {
    try {
      const delRes = await fetch(`${cleanUrl}/rest/v1/${table}?${filter}`, {
        method: 'DELETE',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      });
      console.log(`[CLEAN-SLATE] Supabase table public.${table} wiped (HTTP ${delRes.status})`);
    } catch (err) {
      console.warn(`[CLEAN-SLATE] Could not wipe Supabase table ${table}:`, err.message);
    }
  }
}

console.log('----------------------------------------------------------------------');
console.log('T-CONNECT CONTROL TOWER — CLEAN SLATE RESET COMPLETE');
console.log(`Timestamp (cleanSlateAt) : ${nowIso}`);
console.log(`Store Files Updated      : ${updatedFiles}`);
console.log(`Adopted Routers Preserved: ${preservedRoutersCount}`);
console.log(`Partner API Keys Active  : ${preservedPartnerKeysCount} (lead counters reset to 0)`);
console.log('The platform is now recording ONLY real live customer authentications.');
console.log('----------------------------------------------------------------------');
