# T-Connect Control Tower — External Partner Lead REST API Documentation

- **System Name**: T-Connect Control Tower
- **API Architecture & Protocol**: **REST API** over HTTPS / HTTP (`REST/JSON` & `RFC 4180 CSV`)
- **API Version**: `v1` (`/api/v1/partner/*`)
- **Authentication**: Bearer Token (`Authorization: Bearer tc_live_...`) or Header (`X-API-Key: tc_live_...`)
- **Data Isolation Model**: **Strict Lead-Only & Hotspot Policy Scoped** (Zero access to routers, billing, gateways, or system settings)

---

## 1. Overview & Architecture Format

The **T-Connect Control Tower Partner API** is a **RESTful HTTP/HTTPS API** designed for external advertising companies, brand sponsors, and partner teams running campaigns across T-Connect Starlink-powered Wi-Fi hotspots.

### Format & Standards
| Capability | Protocol / Format | Content-Type |
| :--- | :--- | :--- |
| **Lead Retrieval & Filtering** | REST HTTP `GET` | `application/json; charset=utf-8` |
| **External Lead Capture** | REST HTTP `POST` | `application/json; charset=utf-8` |
| **Partner Reporting Export** | REST HTTP `GET` | `text/csv; charset=utf-8` (RFC 4180) |
| **Real-Time Lead Push** | Outbound REST Webhook `POST` | `application/json` signed with `HMAC-SHA256` |

---

## 2. Security & Strict Lead-Only Isolation Guarantee

Every API key issued by **T-Connect Control Tower** (`tc_live_...`) is governed by a strict **Zero-Trust Lead-Only Isolation Middleware**:

1. **Lead-Only Access**: Partner API keys can **only** access `/api/v1/partner/*` endpoints. Any attempt to use a Partner API key against internal dashboard routes (`/api/devices`, `/api/gateways`, `/api/vouchers`, `/api/portal/config`, etc.) is immediately rejected with `403 Forbidden (FORBIDDEN_PARTNER_KEY_SCOPE)`.
2. **Hotspot Policy & Campaign Scoping**: Each Partner API key is explicitly bound to one or more **Hotspot Policies / Scopes** (`hotspot`, `community`, `park`, `bus`, `stadium`), specific **Site Names**, or a **Sponsor Ad Campaign**. A partner key only sees leads captured on its authorized hotspot policies.
3. **PII & Infrastructure Sanitization**: Responses return verified subscriber lead fields (`firstName`, `lastName`, `fullName`, `countryCode`, `phone`, `fullPhone`, `email`, `hotspotPolicyScope`, `siteName`, `sponsorCampaign`, `capturedAt`) while **strictly stripping** all internal network telemetry (client MAC addresses, internal DHCP IP addresses, MikroTik WireGuard IPs, voucher codes, and payment gateway references).

---

## 3. Authentication

Include your Partner API Key in every request using either the `X-API-Key` header (recommended) or the standard `Authorization: Bearer` header:

```http
X-API-Key: tc_live_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c
Accept: application/json
```

Or via Bearer token:

```http
Authorization: Bearer tc_live_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c
Accept: application/json
```

### Authentication Error Responses
- `401 Unauthorized`: Missing API key header.
- `403 Forbidden`: Invalid, revoked, or out-of-scope Partner API key.

---

## 4. Hotspot Policy Scopes

T-Connect Control Tower categorizes hotspots into five operational policies. Each Partner API key is authorized for one or more of the following policy scopes:

| Policy Scope ID | Policy Label | Typical Deployment & Ad Policy Context |
| :--- | :--- | :--- |
| `hotspot` | **Public Wi-Fi Hotspots** | Retail hubs, commercial centers, cafes, and town squares with high daily footfall. |
| `community` | **Community & Village Mesh** | Residential and peri-urban community Starlink distribution nodes. |
| `park` | **Public Parks & Recreation** | Outdoor leisure zones, tourism sites, and civic plazas. |
| `bus` | **Transit & Fleet Mobility** | Intercity buses, commuter taxis, and transport terminals. |
| `stadium` | **Stadiums & Event Arenas** | High-density sports venues, concerts, and national events with sponsor takeovers. |

---

## 5. REST API Endpoints

### 5.1 Get Authorized Hotspot Policies & Campaign Metadata
Returns the hotspot policy scopes, sites, and active ad policy configuration assigned to your Partner API key.

- **Endpoint**: `GET /api/v1/partner/policies`
- **Authentication**: Required (`X-API-Key` or `Authorization: Bearer`)

#### Example Request
```bash
curl -X GET "https://your-control-tower-domain.com/api/v1/partner/policies" \
  -H "X-API-Key: tc_live_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c"
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "system": "T-Connect Control Tower",
  "apiFormat": "REST/JSON",
  "partner": {
    "id": "pk_alliance_ls",
    "companyName": "Alliance Insurance Lesotho",
    "campaignName": "Hotspot & Stadium Sponsor Campaign",
    "allowedScopes": ["hotspot", "stadium"],
    "allowedSites": ["*"],
    "permissions": ["leads:read", "leads:write", "leads:export"]
  },
  "policies": [
    {
      "scope": "hotspot",
      "brandTitle": "T-CONNECT",
      "tagline": "STARLINK HIGH-SPEED",
      "allowFreeAccess": true,
      "collectName": true,
      "collectPhone": true,
      "collectEmail": true,
      "termsEnabled": true,
      "adPolicy": {
        "postAuthAdEnabled": true,
        "retriggerEveryHours": 3,
        "retriggerEveryGb": 2
      }
    }
  ]
}
```

---

### 5.2 Retrieve Captured Leads (Filtered & Paginated)
Returns verified subscriber leads captured across the hotspot policies authorized for your API key.

- **Endpoint**: `GET /api/v1/partner/leads`
- **Authentication**: Required (`X-API-Key` or `Authorization: Bearer`)

#### Query Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `scope` | `string` | All allowed | Filter by a specific hotspot policy (`hotspot`, `community`, `park`, `bus`, `stadium`). Must be in your key's `allowedScopes`. |
| `site` | `string` | All allowed | Case-insensitive filter by Hotspot Site Name (e.g., `Maseru Central`). |
| `country_code` | `string` | All | Filter by subscriber country dialing code (`+266` for Lesotho, `+27` for South Africa). |
| `search` | `string` | None | Search across subscriber name, phone number, or email address. |
| `since` | `ISO 8601` | None | Return leads captured on or after this timestamp (e.g., `2026-10-01T00:00:00Z`). |
| `until` | `ISO 8601` | None | Return leads captured on or before this timestamp. |
| `page` | `integer` | `1` | Page number for pagination (1-indexed). |
| `limit` | `integer` | `50` | Number of records per page (min `1`, max `500`). |

#### Example Request
```bash
curl -X GET "https://your-control-tower-domain.com/api/v1/partner/leads?scope=hotspot&country_code=%2B266&page=1&limit=25" \
  -H "X-API-Key: tc_live_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c"
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "system": "T-Connect Control Tower",
  "apiFormat": "REST/JSON",
  "scopeIsolation": {
    "companyName": "Alliance Insurance Lesotho",
    "authorizedPolicies": ["hotspot", "stadium"]
  },
  "pagination": {
    "page": 1,
    "limit": 25,
    "totalLeads": 142,
    "totalPages": 6,
    "hasMore": true
  },
  "leads": [
    {
      "leadId": "lead_guest_1761638400123",
      "firstName": "Thabo",
      "lastName": "Moshoeshoe",
      "fullName": "Thabo Moshoeshoe",
      "countryCode": "+266",
      "phone": "58123456",
      "fullPhone": "+266 58123456",
      "email": "thabo.m@example.co.ls",
      "hotspotPolicyScope": "hotspot",
      "siteName": "T-Connect Hotspot",
      "connectionMode": "free",
      "sponsorCampaign": "Alliance Insurance Lesotho",
      "termsAccepted": true,
      "roamedSites": ["T-Connect Hotspot"],
      "capturedAt": "2026-10-28T08:30:12.410Z"
    }
  ]
}
```

---

### 5.3 Capture & Push New Lead from External Partner Portal
Allows external partner landing pages, co-branded microsites, or third-party promotional forms to push a verified subscriber lead directly into **T-Connect Control Tower**.

- **Endpoint**: `POST /api/v1/partner/leads`
- **Authentication**: Required (`X-API-Key` or `Authorization: Bearer`)
- **Content-Type**: `application/json`

#### Request Body Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `firstName` | `string` | Yes | Subscriber's first name (min 2 characters). |
| `lastName` | `string` | Yes | Subscriber's surname / last name (min 2 characters). |
| `countryCode` | `string` | No | Dialing prefix (`+266` default, or `+27`). |
| `phone` | `string` | Yes | Mobile number digits (8 digits for `+266`, 9–10 digits for `+27`). |
| `email` | `string` | Yes | Validated subscriber email address. |
| `scope` | `string` | No | Target hotspot policy scope (defaults to your key's primary allowed scope). |
| `siteName` | `string` | No | Hotspot site or campaign landing page name. |
| `campaignRef` | `string` | No | Optional external ad campaign or creative identifier. |
| `termsAccepted` | `boolean` | Yes | Must be `true` to confirm subscriber consent to T&Cs. |

#### Example Request
```bash
curl -X POST "https://your-control-tower-domain.com/api/v1/partner/leads" \
  -H "X-API-Key: tc_live_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Palesa",
    "lastName": "Lekhanya",
    "countryCode": "+266",
    "phone": "58901234",
    "email": "palesa.lekhanya@gmail.com",
    "scope": "stadium",
    "siteName": "Setsoto Stadium Fan Zone",
    "campaignRef": "ALLIANCE-MOTOR-2026",
    "termsAccepted": true
  }'
```

#### Example Response (`201 Created`)
```json
{
  "success": true,
  "system": "T-Connect Control Tower",
  "message": "Lead captured and synchronized with T-Connect Control Tower.",
  "lead": {
    "leadId": "lead_ext_1761639100999",
    "firstName": "Palesa",
    "lastName": "Lekhanya",
    "fullName": "Palesa Lekhanya",
    "countryCode": "+266",
    "phone": "58901234",
    "fullPhone": "+266 58901234",
    "email": "palesa.lekhanya@gmail.com",
    "hotspotPolicyScope": "stadium",
    "siteName": "Setsoto Stadium Fan Zone",
    "connectionMode": "partner_api",
    "sponsorCampaign": "ALLIANCE-MOTOR-2026",
    "termsAccepted": true,
    "roamedSites": ["Setsoto Stadium Fan Zone"],
    "capturedAt": "2026-10-28T08:45:00.999Z"
  }
}
```

---

### 5.4 Export Scoped Leads as CSV
Streams a standards-compliant RFC 4180 CSV file containing all leads matching your Partner API key's policy scopes and optional filter parameters (`scope`, `site`, `country_code`, `since`, `until`).

- **Endpoint**: `GET /api/v1/partner/leads/export.csv`
- **Authentication**: Required (`X-API-Key` or `Authorization: Bearer`)

#### Example Request
```bash
curl -X GET "https://your-control-tower-domain.com/api/v1/partner/leads/export.csv?scope=hotspot" \
  -H "X-API-Key: tc_live_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c" \
  -o tconnect_partner_leads.csv
```

#### CSV Columns Returned
```csv
Lead ID,First Name,Last Name,Full Name,Country Code,Phone Number,Full Phone,Email Address,Hotspot Policy Scope,Site Name,Sponsor Campaign,Connection Mode,Terms Accepted,Captured At
```

---

## 6. Real-Time Webhook Push Specification

When a Partner API key is configured with a **Webhook URL** in T-Connect Control Tower, the server automatically dispatches an HTTP `POST` webhook in real time whenever a subscriber authenticates on a matching hotspot policy (`hotspot`, `community`, `park`, `bus`, `stadium`).

### Webhook Headers
| Header | Description |
| :--- | :--- |
| `Content-Type` | `application/json` |
| `User-Agent` | `T-Connect-Control-Tower-Webhook/1.0` |
| `X-TConnect-Event` | `lead.captured` or `lead.test` |
| `X-TConnect-Delivery` | Unique delivery ID (`whd_...`) |
| `X-TConnect-Signature` | `sha256=<hex_hmac_digest>` computed over the raw JSON body using your key's `webhookSecret`. |

### Webhook Payload Example
```json
{
  "event": "lead.captured",
  "system": "T-Connect Control Tower",
  "apiFormat": "REST/JSON",
  "deliveryId": "whd_1761639500112",
  "timestamp": "2026-10-28T08:51:40.112Z",
  "partner": {
    "id": "pk_alliance_ls",
    "companyName": "Alliance Insurance Lesotho"
  },
  "policy": {
    "scope": "hotspot",
    "siteName": "T-Connect Hotspot"
  },
  "lead": {
    "leadId": "lead_guest_1761639500110",
    "firstName": "Kekeletso",
    "lastName": "Majoro",
    "fullName": "Kekeletso Majoro",
    "countryCode": "+266",
    "phone": "62112233",
    "fullPhone": "+266 62112233",
    "email": "kekeletso@tconnect.co.ls",
    "hotspotPolicyScope": "hotspot",
    "siteName": "T-Connect Hotspot",
    "connectionMode": "free",
    "sponsorCampaign": "Alliance Insurance Lesotho",
    "termsAccepted": true,
    "capturedAt": "2026-10-28T08:51:40.110Z"
  }
}
```

### Verifying the Webhook Signature (Node.js / TypeScript Example)
```typescript
import crypto from 'crypto';

export function verifyTConnectWebhook(rawBody: string, signatureHeader: string, webhookSecret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawBody, 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader || ''));
}
```
