# T-Connect Control Tower — Developer Readme

Welcome to the **T-Connect Control Tower** development guide. This repository contains the full-stack multi-tenant Control Tower, guest Wi-Fi captive portal generator, MikroTik router adoption engine, Lesotho payment gateway integration, and telemetry sentinel.

---

## 1. Quick Start & Local Development

### Prerequisites
- **Node.js**: v20 or higher
- **npm** or **bun**
- (Optional) Docker & Docker Compose for production simulation

### Installation & Server Start
```bash
# Install dependencies
npm install

# Start development server (Express + Vite SSR middleware on port 3000)
npm run dev
```

The dev server will boot on `http://localhost:3000`.

### Available Scripts
- `npm run dev`: Starts the Node.js Express server wrapped around Vite dev middleware (`tsx server.ts`).
- `npm run build`: Builds the production client SPA bundle into `/dist` (`vite build`).
- `npm run start`: Runs the Node.js production server serving the static bundle.
- `npm run lint`: Runs TypeScript type checking (`tsc --noEmit`).

---

## 2. Router Data Model & Vertical Scopes

The router data model is defined in `src/types.ts` (and `src/types/index.ts`):

```typescript
export type VerticalType = 
  | 'hotspot'       // Cafes, retail, co-working
  | 'village'       // Rural villages, estates & solar mesh (alias: 'community')
  | 'community'     // Community mesh deployments
  | 'bus'           // Transit coaches & fleet Wi-Fi (with GPS telemetry)
  | 'stadium'       // Arenas, expos & high-density event cores
  | 'park';         // Municipal green zones & solar smart poles
```

Each adopted router has a designated `vertical` field:
- **Hotspot**: Tailored guest portal, voucher checkout, FUP rate-limiting.
- **Village / Community**: Off-grid solar telemetry (battery voltage, solar wattage, DC bus health).
- **Bus**: In-motion Starlink GPS tracker (vehicle speed in km/h, highway corridor tracking).
- **Stadium**: Ultra-high-density burst queues and VIP ticket / pass redemption.
- **Park**: Municipal civic notices, solar pole harvesting, and family safe-search DNS filters.

---

## 3. Router Adoption & Complete De-Adoption Workflow

### Adopting a Router
1. Navigate to the **Fleet / Router Adoption Hub**.
2. Click **+ Add Router to Fleet** and choose the hardware model, site name, MAC address, and **Vertical Target** (`hotspot` | `village` | `bus` | `stadium` | `park`).
3. Copy the encrypted MKController-style one-liner script and paste it directly into the MikroTik RouterOS Terminal:
   ```routeros
   :do { /tool fetch url="https://app.tconnect.co.ls/api/devices/rt_xxxx/adopt.rsc?token=..." ... } on-error={ ... };
   ```
4. The router establishes an encrypted WireGuard tunnel (`10.99.0.0/16`) and RADIUS AAA connection (`1812/1813 UDP`).

### Tagging an Adopted Router
- Admins can instantly re-tag any adopted router to any vertical directly from:
  1. The **Router Inventory Card**: Quick tag badge.
  2. The **Selected Router Overview Bar**: Live Vertical dropdown selector.
  3. The **Detailed Router Slide-Over Panel**: Under the *Scope Configuration* tab.

### Filtering by Vertical
- In the **Router Adoption Hub**, use the **Vertical Scope Filter** toolbar:
  - Select **Connected Buses** to only view transit routers.
  - Select **Villages** to view rural solar mesh routers.
  - Select **All Verticals** for fleet-wide visibility.

### Complete De-Adoption & Unbinding (Zero-Trace)
When a router is removed from the platform:
1. Click **Remove / De-Adopt** on the router bar or context menu.
2. The controller:
   - Deletes the router from memory and local storage (`storage.deleteRouter()`).
   - Dispatches a `DELETE /api/devices/:routerId` call to the server to purge watchdog monitoring and revokes tunnel keys.
   - Generates a **RouterOS Factory Cleanup Script** that can be pasted into the MikroTik to purge WireGuard interfaces, RADIUS AAA profiles, netwatch daemons, and walled-garden DNS rules.
3. **No links remain** between the physical device and the platform.
4. The same router **can be re-adopted at any point in the future** using a fresh one-liner.

---

## 4. Architecture & Security

- **Server Backend**: `server.ts` (Express + WireGuard proxy + Deadman Watchdog + Remote Terminal).
- **Audit Logging**: `src/services/audit.ts` logs all configuration changes, reboots, and remote terminal commands.
- **Lesotho Payment Gateways**: Direct support for EcoCash, MyWallet (M-Pesa), OTTvoucher, and xPayments.
- **RFC 8910 Captive Portal API**: Automatic captive-portal assistant trigger on Apple, Android, and Windows devices.
