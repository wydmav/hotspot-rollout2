# T-Connect Gateway Notes & Integration Guide: OTT Voucher & Mobile Money

This document provides complete, production-grade instructions for operating and developing payment gateways on the T-Connect WiFi Platform, with a primary focus on **OTT Voucher Lesotho**, as well as reference configurations for **EcoCash Lesotho** and **MyWallet (Vodacom M-Pesa Lesotho)**.

---

## 1. Gateway Overview & Status Matrix

| Gateway | Region / Provider | Current Platform Status | Required Credentials | Walled Garden Exemption Needed |
| :--- | :--- | :--- | :--- | :--- |
| **OTT Voucher** | Lesotho (`portal.ottlesotho.com`) | End-to-end UI & Server API ready; awaiting live API key & password | Partner ID (`TCONNECTLES1`), API Key, API Password | **Yes** (`portal.ottlesotho.com`, `api.ottvoucher.com`, etc.) |
| **EcoCash** | Lesotho (Econet Telecom) | Simulated USSD push + live webhook scaffolded | Merchant Code, API Token, Endpoint URL | **Yes** (`ecocash.co.ls`, `econet.co.ls`) |
| **MyWallet** | Lesotho (Vodacom M-Pesa) | Simulated STK push + live webhook scaffolded | Shortcode, Consumer Key, Secret / Bearer Token | **Yes** (`vodacom.co.ls`, `mpesa.vodacom.co.ls`) |

---

## 2. OTT Voucher Lesotho: Architecture & How It Works

OTT Mobile / OTT Voucher operates an open-loop prepaid digital voucher network widely distributed across physical retailers, spaza shops, kiosks, and online banking apps throughout Southern Africa.

### Transaction Lifecycle:
1. **Purchase**: A user buys an OTT voucher at a retail store, Spaza shop, ATM, or via their banking app (e.g. Nedbank, FNB, Standard Lesotho Bank). The physical or digital slip contains a **12 to 16 digit numeric PIN**.
2. **Hotspot Connect**: The customer connects to the T-Connect SSID. The MikroTik Hotspot intercepts non-authorized traffic and presents the **Captive Portal**.
3. **Redeem**: The user selects their package (e.g., *1 Hour (M5)*, *1 Day (M15)*), chooses **OTT Voucher**, enters the voucher PIN, and submits.
4. **Validation & Liquidation**:
   - The T-Connect backend receives the request.
   - The server contacts the OTT Lesotho upstream API (`portal.ottlesotho.com` or OTT API server) to validate the PIN and liquidate its face value.
   - If valid, OTT confirms the amount and transaction reference.
5. **Session Authorization**:
   - T-Connect matches the voucher value to the selected tier (or stores excess credit).
   - A FreeRADIUS user record or MikroTik active IP-binding/cookie is issued immediately.
   - The customer is automatically authenticated and granted internet access.

---

## 3. Developer Guide (Integration & Technical Architecture)

### 3.1 Required Credentials
OTT Voucher Lesotho does **not** use only a simple API Key. The upstream API enforces three distinct parameters:
1. **Partner ID / Username**: `TCONNECTLES1` (assigned by OTT Lesotho upon onboarding).
2. **API Key**: A high-entropy alphanumeric key generated in the merchant portal.
3. **API Password**: A secret password paired with the API Key for HTTP Basic Authentication or signature generation.

Merchant Portal URL: `https://portal.ottlesotho.com/APISettings`

### 3.2 Backend Endpoints (`server.ts`)

The T-Connect backend exposes the following endpoints for OTT Voucher processing:

#### A. `POST /api/gateways/ott/test`
Validates the merchant credentials against the upstream service.
- **Request Payload:**
  ```json
  {
    "partnerId": "TCONNECTLES1",
    "apiKey": "ott_live_key_****************",
    "apiPassword": "ott_secret_password"
  }
  ```
- **Response (Success - 200 OK):**
  ```json
  {
    "success": true,
    "message": "OTT Lesotho credentials validated successfully.",
    "partnerId": "TCONNECTLES1",
    "timestamp": "2026-10-09T03:30:00.000Z"
  }
  ```

#### B. `POST /api/gateways/ott/redeem`
Liquidates the customer's voucher PIN and credits the captive portal session.
- **Request Payload:**
  ```json
  {
    "voucherPin": "984210485921",
    "expectedAmount": 15.00,
    "currency": "LSL",
    "clientMac": "44:D9:E7:22:11:00",
    "clientIp": "192.168.88.245",
    "packageId": "pkg_1day"
  }
  ```
- **Response (Success - 200 OK):**
  ```json
  {
    "success": true,
    "reference": "OTT-LES-84920193",
    "voucherAmount": 15.00,
    "currency": "LSL",
    "status": "REDEEMED",
    "message": "Voucher successfully redeemed. Session granted."
  }
  ```

#### C. `POST /api/gateways/ott/verify`
Checks the validity, face value, and status of a voucher PIN before triggering redemption.
- **Request Payload:**
  ```json
  {
    "voucherPin": "984210485921"
  }
  ```

### 3.3 MikroTik Walled Garden Exemption Configuration

Because captive portal users are not authenticated to the Internet prior to redemption, their devices must be permitted to reach OTT validation domains. 

Add the following entries to the MikroTik RouterOS configuration (via WinBox or Terminal):

```routeros
/ip hotspot walled-garden
add dst-host=portal.ottlesotho.com comment="OTT Lesotho Merchant Portal"
add dst-host=ottlesotho.com comment="OTT Lesotho Main Domain"
add dst-host=*.ottlesotho.com comment="OTT Lesotho Wildcard"
add dst-host=api.ottvoucher.com comment="OTT API Gateway"
add dst-host=ottvoucher.com comment="OTT Voucher Global"
add dst-host=*.ott-mobile.com comment="OTT Mobile Backend"
add dst-host=vouchers.ott-mobile.com comment="OTT Vouchers Verification Host"

# Add EcoCash & Vodacom Lesotho domains if mobile money is active
add dst-host=*.econet.co.ls comment="EcoCash Lesotho"
add dst-host=*.vodacom.co.ls comment="Vodacom Lesotho M-Pesa"
```

### 3.4 Upstream API HTTP Implementation (Production Hook)

In `server.ts`, the upstream redemption handler is structured as follows:

```typescript
// Inside server.ts POST /api/gateways/ott/redeem
app.post('/api/gateways/ott/redeem', async (req, res) => {
  const { voucherPin, expectedAmount, clientMac } = req.body;
  const config = getGatewayConfig('ott'); // Reads from persistent storage or .env

  if (!config.apiKey || !config.apiPassword) {
    return res.status(503).json({
      success: false,
      errorCode: 'GATEWAY_NOT_CONFIGURED',
      error: 'OTT Gateway credentials missing. Contact hotspot administrator.'
    });
  }

  try {
    // Upstream call to OTT Lesotho API
    const response = await fetch('https://portal.ottlesotho.com/api/v1/voucher/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.partnerId}:${config.apiPassword}`).toString('base64')}`,
        'X-API-KEY': config.apiKey
      },
      body: JSON.stringify({
        partner_id: config.partnerId,
        voucher_pin: voucherPin.replace(/\s+/g, ''),
        expected_amount: expectedAmount,
        device_mac: clientMac
      })
    });

    const data = await response.json();

    if (!response.ok || data.status !== 'SUCCESS') {
      return res.status(400).json({
        success: false,
        errorCode: data.error_code || 'VOUCHER_REDEEM_FAILED',
        error: data.message || 'Failed to redeem voucher'
      });
    }

    // Voucher verified & liquidated upstream:
    // 1. Log transaction to database
    // 2. Authorize FreeRADIUS or MikroTik IP Binding
    return res.json({
      success: true,
      reference: data.transaction_ref,
      voucherAmount: data.amount,
      status: 'REDEEMED'
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      errorCode: 'OTT_UPSTREAM_TIMEOUT',
      error: 'Failed to communicate with OTT Lesotho upstream servers.'
    });
  }
});
```

---

## 4. Administrator & User Guide

### 4.1 Administrator Setup Steps (In T-Connect Web Portal)

1. **Log in** to T-Connect as an Administrator (`rphooko@tconnect.africa`).
2. Navigate to **Payment Gateways** in the left sidebar menu (or URL `/#gateways`).
3. Locate the **OTT Voucher Lesotho** gateway card:
   - Ensure the **Status Toggle** is set to **Active**.
4. Click **Configure Credentials**:
   - **Partner ID / Username**: Confirm `TCONNECTLES1` (or your custom OTT Assigned Partner ID).
   - **API Key**: Paste the API Key obtained from `portal.ottlesotho.com`.
   - **API Password**: Enter the API Password associated with the key.
5. Choose **Environment Mode**:
   - Select **Sandbox / Test Mode** if testing with demo voucher PINs.
   - Select **Live / Production** for real customer money.
6. Click **Save Settings**.
7. Click **Test Gateway Connection**:
   - A green confirmation badge indicates the server successfully authenticated with OTT Lesotho.

### 4.2 End-User (Customer) Journey on Captive Portal

1. **Connect to WiFi**: The customer turns on WiFi and taps the T-Connect network.
2. **Portal Opens**: The captive portal automatically appears.
3. **Select Package**: The user chooses a plan (e.g. *1 Hour @ M5* or *1 Day @ M15*).
4. **Choose Payment Option**: The user clicks the **OTT Voucher** tab.
5. **Enter PIN**:
   - The user scratches their physical slip or checks their SMS/banking app for their 12 or 16-digit voucher number.
   - They enter the number into the voucher box (spaces and hyphens are automatically ignored).
6. **Submit**: The user clicks **Redeem Voucher & Connect**.
7. **Connection**: Within 2–3 seconds, the voucher is verified, the screen displays a green success confirmation with session duration, and the device is redirected to the web.

---

## 5. Comprehensive Error Codes Reference

When a voucher redemption fails, either the captive portal or the developer log will surface one of the standardized error codes below:

| Error Code | HTTP Code | Root Cause | End-User Message | Resolution / Action Required |
| :--- | :--- | :--- | :--- | :--- |
| `INVALID_PIN_FORMAT` | 400 | Voucher PIN entered is less than 12 digits or contains non-numeric characters. | "Please enter a valid 12 to 16 digit voucher PIN." | Customer must re-check their slip. |
| `VOUCHER_NOT_FOUND` | 404 | The voucher PIN does not exist in the OTT database. | "Voucher PIN not found. Please verify the digits on your slip." | Ensure user did not mistype digits (e.g. 0 vs O, 1 vs I). |
| `VOUCHER_ALREADY_USED` | 409 | The voucher was already redeemed either on T-Connect or another merchant. | "This voucher has already been redeemed." | Customer must supply a fresh, unredeemed voucher. |
| `VOUCHER_EXPIRED` | 410 | The voucher exceeded its validity window (usually 3 years or merchant cutoff). | "This voucher has expired." | Customer must contact the retailer where purchased. |
| `INSUFFICIENT_VOUCHER_VALUE` | 422 | The voucher face value (e.g. M5) is less than the selected package (e.g. M15). | "Voucher value (M5.00) is less than the selected package (M15.00)." | User should select a package matching their voucher value or combine vouchers. |
| `VOUCHER_LOCKED` | 423 | Too many invalid redemption attempts triggered temporary fraud lockout. | "Voucher is temporarily locked due to repeated attempts." | Wait 15 minutes or contact support. |
| `GATEWAY_NOT_CONFIGURED` | 503 | Admin has not saved API Key and API Password in T-Connect settings. | "Payment gateway is currently undergoing maintenance." | Platform Admin must enter credentials in **Gateways > OTT Voucher**. |
| `AUTH_FAILED_UPSTREAM` | 401 | Partner ID, API Key, or API Password rejected by `portal.ottlesotho.com`. | "Unable to authenticate with payment processor." | Administrator must verify and re-enter API credentials in GatewaysView. |
| `OTT_UPSTREAM_TIMEOUT` | 504 | Upstream OTT servers failed to respond within 10 seconds. | "Connection to voucher verification server timed out. Please retry." | Check router internet connectivity and OTT upstream server health. |
| `WALLED_GARDEN_BLOCK` | N/A (Client) | Device cannot reach `portal.ottlesotho.com` or T-Connect API due to DNS block. | Device displays "No Internet" or browser connection error. | Verify MikroTik `/ip hotspot walled-garden` entries are applied. |
| `RATE_LIMIT_EXCEEDED` | 429 | Excessive requests from client IP or MAC address within 60 seconds. | "Too many attempts. Please wait 1 minute before trying again." | Wait for cooldown timer to expire. |

---

## 6. EcoCash Lesotho & MyWallet (Vodacom M-Pesa) Notes

For completeness, here is how the mobile money gateways integrate alongside OTT Voucher:

### EcoCash Lesotho:
- **Provider**: Econet Telecom Lesotho (`+266` mobile numbers starting with `6`, e.g. `+266 6200 0000`).
- **Required Admin Settings**:
  - Merchant Code: `ECO-LES-001`
  - API Token / Secret
  - Webhook Callback: `https://<YOUR_DOMAIN>/api/webhooks/ecocash`
- **Customer Flow**: Customer enters their EcoCash number &rarr; T-Connect sends USSD Push &rarr; Customer enters EcoCash PIN on their handset &rarr; Webhook confirms payment &rarr; WiFi unlocked.

### MyWallet (Vodacom M-Pesa Lesotho):
- **Provider**: Vodacom Lesotho (`+266` mobile numbers starting with `5`, e.g. `+266 5800 0000`).
- **Required Admin Settings**:
  - Shortcode: `58012`
  - Consumer Key & Secret: Generated in Vodacom Developer Portal.
  - Webhook Callback: `https://<YOUR_DOMAIN>/api/webhooks/mywallet`
- **Customer Flow**: Customer enters their Vodacom number &rarr; STK Prompt pops up on their screen &rarr; Customer approves with M-Pesa PIN &rarr; Instant authorization.

---

## 7. Deployment & Testing Checklist

When deploying to a live production MikroTik and VPS:

- [ ] **1. Credentials Saved**: Partner ID (`TCONNECTLES1`), API Key, and API Password entered in T-Connect Gateways View.
- [ ] **2. Test Connection**: Green checkmark received from `POST /api/gateways/ott/test`.
- [ ] **3. Walled Garden**: MikroTik Hotspot walled garden rules imported (`/ip hotspot walled-garden`).
- [ ] **4. Test Voucher**: Redeem a known test voucher PIN on the captive portal page.
- [ ] **5. RADIUS Authentication**: Verify user MAC is added to `/ip hotspot active` on the MikroTik router.
- [ ] **6. Audit Log**: Confirm the redeemed voucher reference appears in **T-Connect Dashboard > Payments**.
