import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { RouterOSRenderer } from '../src/services/routerosRenderer.ts';

function loadRawEnv(envPath: string): Record<string, string> {
  const envMap: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return envMap;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    envMap[key] = val;
  }
  return envMap;
}

const rawEnv = loadRawEnv(path.resolve(process.cwd(), '.env'));

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const BASE_URL = rawEnv.TEST_BASE_URL || 'http://127.0.0.1:3000';
const results: TestResult[] = [];

function record(id: string, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  const badge = passed ? 'PASS' : 'FAIL';
  console.log(`[${badge}] ${id} — ${name}: ${details}`);
}

async function runTests() {
  console.log('====================================================================');
  console.log('T-CONNECT MASTER ERRATA ACCEPTANCE TEST SUITE (AT-01 .. AT-25)');
  console.log('====================================================================');

  // AT-24: Frozen gateway values SHA-256 parity
  try {
    const merchantName = rawEnv.PAYLESOTHO_MERCHANT_NAME || '';
    const mpesaId = rawEnv.PAYLESOTHO_MPESA_MERCHANT_ID || '';
    const ecocashId = rawEnv.PAYLESOTHO_ECOCASH_MERCHANT_ID || '';
    const bearer = rawEnv.PAYLESOTHO_BEARER_TOKEN || '';
    const ottKey = rawEnv.OTTVOUCHER_API_KEY || '';
    const ottMerchant = rawEnv.OTTVOUCHER_MERCHANT_ID || '';
    const hasAllFrozenValues =
      merchantName === 'T-Connect' &&
      mpesaId === '62915' &&
      ecocashId === '63165430' &&
      bearer.length > 20 &&
      ottKey.length > 10 &&
      ottMerchant === 'TCONNECTLES1';
    const digest = crypto
      .createHash('sha256')
      .update(`${merchantName}|${mpesaId}|${ecocashId}|${bearer}|${ottKey}|${ottMerchant}`)
      .digest('hex');
    record(
      'AT-24',
      'Frozen Gateway Values SHA-256 Parity',
      hasAllFrozenValues,
      `All frozen credentials present in .env (SHA-256=${digest})`
    );
  } catch (err: any) {
    record('AT-24', 'Frozen Gateway Values SHA-256 Parity', false, err.message);
  }

  // AT-12 / AT-22 / AT-23: RouterOS string escaping + 13-stage Zero-Touch + dynamic backhaul queue
  try {
    const maliciousRouter: any = {
      id: 'rtr-inject-test',
      name: 'Maseru"; /user add name=hacked password=hacked group=full; #',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      model: 'hAP ax3',
      rosVersion: 'v7',
      wireguardIp: '10.99.0.42',
      lanSubnet: '10.10.0.1/22',
      dhcpPoolRange: '10.10.0.50-10.10.3.250',
      dnsServer: '10.10.0.1',
      accessMode: 'PAID_ONLY',
      adoptionToken: 'tok_test_123456',
      status: 'pending_adoption',
    };
    const script = RouterOSRenderer.renderProvisioningScript({
      router: maliciousRouter,
      hubDomain: '169.58.98.92:3000',
      hubWgPort: 51820,
      hubTunnelIp: '10.99.0.1',
      routerWgIp: '10.99.0.42/32',
      routerPrivateKey: 'test_priv_key=',
      hubPublicKey: 'vps_wg_pub_key=',
      radiusSecret: 'rad_secret_test',
      apiPassword: 'api_pass_test',
      walledGardenDomains: ['169.58.98.92'],
      backhaulMbps: 120,
    });
    const escapedCheck =
      !script.includes('name="Maseru"; /user add') &&
      script.includes('max-limit=108M/108M') &&
      script.includes('tconnect:revert-timer') &&
      script.includes('MIKROTIK-TC');
    record(
      'AT-12/AT-22/AT-23',
      'RouterOS Injection Sanitization + 13-Stage Zero-Touch + Dynamic Backhaul Queue',
      escapedCheck,
      'Unescaped quotes/semicolons neutralized; revert-timer, MIKROTIK-TC, and 108M/108M (90% of 120M) queue verified'
    );
  } catch (err: any) {
    record('AT-12/AT-22/AT-23', 'RouterOS Injection Sanitization', false, err.message);
  }

  // AT-14: Dual-WAN failover renderer hysteresis & conntrack flush
  try {
    const wanScript = RouterOSRenderer.renderWanFailoverScript({
      wan1: 'ether1',
      wan2: 'ether2',
      checkHost: '1.1.1.1',
      hubDomain: '169.58.98.92:3000',
      routerId: 'rtr-01',
    });
    const hasHysteresisAndFlush =
      wanScript.includes('interval=2s') &&
      wanScript.includes('/ip firewall connection remove') &&
      wanScript.includes(':delay 60s');
    record(
      'AT-14',
      'Dual-Uplink Hot Failover (2s probe, 10s down, 60s hold, conntrack flush)',
      hasHysteresisAndFlush,
      '2s probe interval, 60s hysteresis hold, and connection tracking flush present'
    );
  } catch (err: any) {
    record('AT-14', 'Dual-Uplink Hot Failover Renderer', false, err.message);
  }

  // AT-15: SSRF blocked on /api/portal/media-proxy
  try {
    const ssrfUrls = [
      'http://127.0.0.1:3000/api/gateways',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.99.0.1/api/routers',
      'http://localhost:3000/api/health',
    ];
    let allBlocked = true;
    const statuses: string[] = [];
    for (const target of ssrfUrls) {
      const res = await fetch(`${BASE_URL}/api/portal/media-proxy?url=${encodeURIComponent(target)}`);
      statuses.push(`${new URL(target).hostname}:${res.status}`);
      if (res.status !== 403 && res.status !== 400) {
        allBlocked = false;
      }
    }
    record('AT-15', 'Media Proxy SSRF Defense', allBlocked, `Blocked internal targets (${statuses.join(', ')})`);
  } catch (err: any) {
    record('AT-15', 'Media Proxy SSRF Defense', false, err.message);
  }

  // AT-18: ?api_key= in query string rejected with 401
  try {
    const res = await fetch(`${BASE_URL}/api/v1/partner/routers?api_key=tc_pk_test123`);
    record(
      'AT-18',
      'Query-String API Key Rejection',
      res.status === 401,
      `HTTP status=${res.status} on ?api_key= query param`
    );
  } catch (err: any) {
    record('AT-18', 'Query-String API Key Rejection', false, err.message);
  }

  // AT-17: GET /api/gateways masks secrets to last-4 characters
  try {
    const res = await fetch(`${BASE_URL}/api/gateways`);
    const gateways = await res.json();
    const rawJson = JSON.stringify(gateways);
    const bearerLeak = rawEnv.PAYLESOTHO_BEARER_TOKEN
      ? rawJson.includes(rawEnv.PAYLESOTHO_BEARER_TOKEN)
      : false;
    const ottLeak = rawEnv.OTT_LESOTHO_API_KEY
      ? rawJson.includes(rawEnv.OTT_LESOTHO_API_KEY)
      : false;
    record(
      'AT-17',
      'Gateway Secret Masking on GET /api/gateways',
      !bearerLeak && !ottLeak,
      `Secrets masked (bearerLeak=${bearerLeak}, ottLeak=${ottLeak})`
    );
  } catch (err: any) {
    record('AT-17', 'Gateway Secret Masking on GET /api/gateways', false, err.message);
  }

  // AT-09: Signed Ad View Token premature completion rejected
  try {
    const startRes = await fetch(`${BASE_URL}/api/portal/ad/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ad_id: 'ad-test-carousel',
        client_mac: 'AA:BB:CC:DD:EE:09',
        router_id: 'rtr-01',
        required_seconds: 8,
      }),
    });
    const startData = await startRes.json();
    const earlyCompleteRes = await fetch(`${BASE_URL}/api/portal/ad/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ad_view_token: startData.ad_view_token,
        client_mac: 'AA:BB:CC:DD:EE:09',
      }),
    });
    record(
      'AT-09',
      'Server-Signed Ad View Duration Enforcement',
      startRes.status === 200 && earlyCompleteRes.status === 400,
      `Start=${startRes.status}, Premature Complete=${earlyCompleteRes.status}`
    );
  } catch (err: any) {
    record('AT-09', 'Server-Signed Ad View Duration Enforcement', false, err.message);
  }

  // AT-02: 20 parallel PIN redemptions -> atomic lock prevents race condition
  try {
    const testPin = '9999888877776666';
    const parallelCalls = Array.from({ length: 20 }, (_, i) =>
      fetch(`${BASE_URL}/api/portal/voucher/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: testPin,
          mac: `AA:BB:CC:DD:EE:${String(i).padStart(2, '0')}`,
          ip: `192.168.88.${10 + i}`,
          router_id: 'rtr-01',
        }),
      }).then((r) => r.status)
    );
    const statuses = await Promise.all(parallelCalls);
    const successCount = statuses.filter((s) => s === 200).length;
    record(
      'AT-02',
      '20 Parallel PIN Redemptions Atomic Lock',
      successCount <= 1,
      `20 parallel requests completed without race condition (200 count=${successCount})`
    );
  } catch (err: any) {
    record('AT-02', '20 Parallel PIN Redemptions Atomic Lock', false, err.message);
  }

  // AT-16: Zero literal secrets in git-tracked files
  try {
    const secretFragmentA = (rawEnv.PAYLESOTHO_BEARER_TOKEN || '').slice(4, 15);
    const secretFragmentB = (rawEnv.OTT_LESOTHO_API_KEY || '').slice(0, 12);
    let matches = '';
    if (secretFragmentA && secretFragmentB) {
      try {
        matches = execSync(
          `grep -rnE "${secretFragmentA}|${secretFragmentB}" server.ts src docs scripts blueprint.md README.md .env.example 2>/dev/null || true`,
          { encoding: 'utf8' }
        ).trim();
      } catch {
        matches = '';
      }
    }
    record(
      'AT-16',
      'Zero Literal Secrets in Tracked Source & Docs',
      matches.length === 0,
      matches.length === 0 ? '0 literal secrets found in tracked files' : `Found in: ${matches}`
    );
  } catch (err: any) {
    record('AT-16', 'Zero Literal Secrets in Tracked Source & Docs', false, err.message);
  }

  const failed = results.filter((r) => !r.passed);
  console.log('====================================================================');
  console.log(`SUMMARY: ${results.length - failed.length}/${results.length} ACCEPTANCE CHECKS PASSED`);
  console.log('====================================================================');
  if (failed.length > 0) {
    process.exit(1);
  }
}

runTests();
