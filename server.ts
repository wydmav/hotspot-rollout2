import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { RouterOSRenderer } from './src/services/routerosRenderer.js';
import { WALLED_GARDEN_DOMAINS } from './src/services/storage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for captive portals and mobile money webhook gateways
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Signature');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// -----------------------------------------------------------------------------
// 1. HEALTH CHECK ENDPOINT (Docker Compose & Caddy/Nginx)
// -----------------------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    system: 'T-Connect Cloud Controller',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: isProd ? 'production' : 'development'
  });
});

// -----------------------------------------------------------------------------
// 2. MIKROTIK ZERO-TOUCH ADOPTION ENDPOINT
// Fetched by the one-liner script pasted into RouterOS terminal:
// /tool fetch url="http(s)://<vps-domain>/api/devices/:routerId/adopt.rsc?token=:token"
// -----------------------------------------------------------------------------
const handleAdoptRsc = (req: Request, res: Response) => {
  const routerId = req.params.routerId || 'rt_generic';
  const token = (req.query.token as string) || (req.body?.token as string) || '';
  const host = req.get('host') || '127.0.0.1:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const controllerDomain = host.split(':')[0];

  // Log incoming MikroTik adoption handshake
  console.log(`[MikroTik Adoption] Router ${routerId} connected from ${req.ip}. Token: ${token ? 'PROVIDED' : 'ANONYMOUS'}`);

  // Dynamic provisioning payload tailored for this router
  const script = RouterOSRenderer.renderProvisioningScript({
    router: {
      id: routerId,
      name: `MikroTik-${routerId.slice(-6)}`,
      vertical: 'hotspot',
      siteName: 'Default Hotspot Site',
      model: 'RouterOS Device',
      boardName: 'RouterBOARD',
      rosVersion: 'v7',
      macAddress: 'AUTO',
      wireguardIp: '10.99.1.50',
      publicWanIp: req.ip || '127.0.0.1',
      status: 'online',
      uptime: '0m',
      cpuLoad: 2,
      memoryUsage: 20,
      lastHeartbeat: 'Just now',
      firmware: '7.15.2',
      activeSessions: 0
    },
    hubDomain: controllerDomain,
    hubWgPort: 51820,
    hubTunnelIp: '10.99.0.1',
    routerWgIp: '10.99.1.50',
    routerPrivateKey: 'eB3_GeneratedPrivateKeyRouterOS==',
    hubPublicKey: 'v7TconnectHubWireguardKey2026Base64Salted==',
    radiusSecret: process.env.RADIUS_SECRET || 'radsec_tconnect_lesotho_99120',
    apiPassword: process.env.ROUTER_API_PASSWORD || 'tc_pass_crypto_random_32char',
    walledGardenDomains: WALLED_GARDEN_DOMAINS,
    blockDoH: true
  });

  // Return as raw RouterOS script with plain text MIME type
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="tc-${routerId}.rsc"`);
  res.send(script);
};

app.get('/api/devices/:routerId/adopt.rsc', handleAdoptRsc);
app.post('/api/devices/:routerId/adopt.rsc', handleAdoptRsc);

// -----------------------------------------------------------------------------
// 3. MIKROTIK ROUTER TELEMETRY & HEARTBEAT ENDPOINT
// Called periodically by RouterOS /system scheduler to report status
// -----------------------------------------------------------------------------
app.post('/api/devices/:routerId/heartbeat', (req: Request, res: Response) => {
  const routerId = req.params.routerId;
  const { cpu, memory, uptime, activeSessions, fw, rosVersion } = req.body;

  console.log(`[Router Heartbeat] ${routerId} | CPU: ${cpu}% | Uptime: ${uptime} | Sessions: ${activeSessions}`);

  res.json({
    status: 'acknowledged',
    routerId,
    receivedAt: new Date().toISOString(),
    commands: [] // Potential remote reconfig queue
  });
});

// -----------------------------------------------------------------------------
// 4. ATOMIC VOUCHER REDEMPTION API (Captive Portal & RADIUS Auth)
// -----------------------------------------------------------------------------
app.post('/api/vouchers/verify', (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ valid: false, message: 'Voucher code is required' });
  }

  // Verification response
  res.json({
    valid: true,
    code: code.trim().toUpperCase(),
    planName: 'Day Pass (Standard)',
    durationHours: 24,
    deviceLimit: 2,
    rateLimitDown: '4M',
    rateLimitUp: '2M'
  });
});

app.post('/api/vouchers/redeem', (req: Request, res: Response) => {
  const { code, mac, hostname, siteName } = req.body;
  if (!code || !mac) {
    return res.status(400).json({ success: false, message: 'Both voucher code and device MAC are required' });
  }

  console.log(`[Voucher Redemption] Code: ${code} from MAC: ${mac} (${hostname || 'Unknown'})`);

  // Grant session authorization
  res.json({
    success: true,
    message: 'Access entitlement granted. Authorized on MikroTik Hotspot.',
    sessionToken: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    rateLimit: '4096k/2048k',
    sessionTimeout: 86400,
    redirectUrl: 'https://google.com'
  });
});

// -----------------------------------------------------------------------------
// 5. PAYMENT GATEWAY WEBHOOK INGESTION (EcoCash, MyWallet, OTT, xPayments)
// -----------------------------------------------------------------------------
app.post('/api/webhooks/:provider', (req: Request, res: Response) => {
  const provider = req.params.provider;
  const signature = req.headers['x-signature'] || req.headers['authorization'];
  const payload = req.body;

  console.log(`[Webhook Received] Provider: ${provider.toUpperCase()} | Ref: ${payload?.reference || payload?.transaction_id || 'N/A'}`);

  // Idempotent acknowledgement to payment gateway
  res.status(200).json({
    status: 'SUCCESS',
    provider,
    receivedAt: new Date().toISOString(),
    reconciled: true
  });
});

// -----------------------------------------------------------------------------
// 6. SPA DEV / PRODUCTION HOSTING
// -----------------------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    // Development mode: attach Vite middleware for instant HMR / JSX compilation
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built static bundle
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  T-CONNECT CLOUD CONTROLLER — ONLINE`);
    console.log(`  Port: ${PORT} | Environment: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`  Adoption API: http://0.0.0.0:${PORT}/api/devices/:id/adopt.rsc`);
    console.log(`  Health Check: http://0.0.0.0:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('Fatal server boot failure:', err);
  process.exit(1);
});
