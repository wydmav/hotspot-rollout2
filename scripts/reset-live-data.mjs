#!/usr/bin/env node
/**
 * T-Connect Live Data Reset Script
 * Resets captured guest leads, reconciled revenue transactions, session durations,
 * and live auth counts to a 100% clean, tangible production baseline without
 * disrupting adopted routers or gateway credentials.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const storePath = path.resolve(rootDir, 'data/server-portal-store.json');

function resetDiskStore() {
  if (!fs.existsSync(storePath)) {
    console.log('[reset-live-data] No server-portal-store.json found at', storePath);
    return;
  }
  const raw = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
  raw.guestEvents = [];
  raw.transactions = [];
  raw.issuedPayLesothoOttVouchers = [];
  raw.redeemedOttPins = [];
  if (Array.isArray(raw.routers)) {
    raw.routers = raw.routers.map((r) => ({
      ...r,
      activeSessions: 0
    }));
  }
  const nowIso = new Date().toISOString();
  if (Array.isArray(raw.partnerApiKeys)) {
    raw.partnerApiKeys = raw.partnerApiKeys.map((k) => ({
      ...k,
      leadsResetAt: nowIso
    }));
  }
  fs.writeFileSync(storePath, JSON.stringify(raw, null, 2), 'utf-8');
  console.log('[reset-live-data] Reset disk store:', storePath);
}

async function notifyRunningServer() {
  try {
    const res = await fetch('http://localhost:3000/api/admin/reset-live-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'cli-script' })
    });
    if (res.ok) {
      const data = await res.json();
      console.log('[reset-live-data] Live server state reset successfully:', data.message || 'OK');
    }
  } catch {
    console.log('[reset-live-data] Server not reachable on localhost:3000 (disk store already reset).');
  }
}

resetDiskStore();
await notifyRunningServer();
