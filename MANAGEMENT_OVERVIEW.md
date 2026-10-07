# T-Connect Lesotho: Management & Commercial Executive Overview

**Document Audience:** Executive Leadership, Business Development, Commercial Operations, Billing Managers  
**Platform Version:** 3.4.0 (Production Release)  
**Territory:** Kingdom of Lesotho & Southern African Development Community (SADC)  
**Infrastructure Partner:** Starlink LEO Authorised Reseller / Metro Fiber Backhaul  

---

## 1. Executive Summary

T-Connect is a cloud-native Wi-Fi monetization, guest analytics, and fleet management platform engineered specifically for emerging African telecom environments. It transforms physical MikroTik router deployments (specifically the Wi-Fi 6 **MikroTik hAP ax³** and outdoor cAP devices) into automated revenue engines.

By combining low-latency **Starlink satellite backhaul** and local fiber with automated carrier billing across **EcoCash (Econet Telecom Lesotho)**, **MyWallet (Vodacom Lesotho M-Pesa)**, **OTTvoucher**, and **xPayments**, T-Connect eliminates physical token logistics and provides instant, friction-free internet access to thousands of daily users across malls, public transit coaches, rural community clinics, and municipal zones.

---

## 2. Business Model & Revenue Architecture

T-Connect operates on a hybrid monetization framework:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MONETIZATION STREAMS                           │
├─────────────────────────┬───────────────────────┬──────────────────────┤
│ 1. Digital Passes       │ 2. Retail POS Vouchers│ 3. Sponsored Free    │
│ Direct mobile money     │ Printed barcode cards │ Advertising / venue  │
│ (EcoCash / MyWallet)    │ sold at spaza shops & │ sponsored sessions   │
│ with zero merchant risk │ supermarket kiosks    │ during off-peak hours│
└─────────────────────────┴───────────────────────┴──────────────────────┘
```

### Core Hotspot Pricing Tiers (Lesotho Loti - M / ZAR)

| Plan Code | Consumer Label | Duration | Price (M) | Bandwidth Profile | Target Demographic |
|:---|:---|:---|:---|:---|:---|
| `plan_1h` | Quick Connect | 1 Hour | **M 5.00** | 5 Mbps Down / 2 Mbps Up | Transit stops, taxi ranks, coffee shops |
| `plan_24h` | Day Pass | 24 Hours | **M 20.00** | 10 Mbps Down / 4 Mbps Up | Day shoppers, students, remote workers |
| `plan_7d` | Weekly Pass | 7 Days | **M 75.00** | 15 Mbps Down / 5 Mbps Up | Residential tenants, short-stay visitors |
| `plan_30d` | Monthly Unlimited | 30 Days | **M 250.00** | 20 Mbps Down / 10 Mbps Up | Community households, SMEs, boutique retail |

*All plans feature Fair-Use-Policy (FUP) rate limiting to preserve satellite quota and ensure equitable bandwidth across all concurrent subscribers.*

---

## 3. Lesotho Telecom & Payment Gateway Ecosystem

T-Connect integrates directly with all dominant electronic money instruments in Lesotho:

1. **EcoCash (Econet Telecom Lesotho)**:
   * Direct USSD Push (`*151#`) sent straight to the subscriber's phone.
   * Customer enters their EcoCash secret PIN on their handset; transaction reconciles in under 2 seconds.
   * Supports Cassava Smartech REST API with automated bearer token refresh.
2. **MyWallet (Vodacom Lesotho / M-Pesa OpenAPI)**:
   * High-trust mobile wallet processing via OpenAPI STK Push.
   * Auto-debit with zero chargeback risk.
3. **OTTvoucher (Digital PINs & Callpay)**:
   * Allows unbanked citizens to purchase OTT Vouchers at Shoprite, Pick n Pay, or local spaza stores and type in a 12-digit PIN to immediately activate their connection.
4. **xPayments (PayLesotho Aggregator)**:
   * Supports VISA/Mastercard debit cards and cross-border South African travelers.

---

## 4. Key Management Features & Control Knobs

### A. Real-Time "Free Mode" Switcher
* **What it does**: Allows managers to temporarily or permanently disable payment requirements and offer open, sponsored internet.
* **Granular Scope**:
  * **Global Fleet Free Mode**: Switch all 50+ deployed routers to free internet during national holidays, election days, or disaster relief efforts.
  * **Venue-Specific Free Mode**: Make a specific router free during a 2-hour corporate event at Pioneer Mall while keeping all transit coach routers on paid billing.
* **Immediate Sync**: Changes take effect in **real time** without rebooting the physical router.

### B. Captive Portal Visual Editor
* Commercial managers can change background imagery (e.g., promotional campaigns for event sponsors), adjust glass card opacity, and enforce mandatory data capture fields (**Full Name, Mobile Number with Country Code, and Email Address**) to build clean marketing CRM databases.
* Built-in multi-lingual legal compliance including **Sesotho** and English Terms of Service.

### C. Live Session Tracking & Customer Transparency
* Customers can check their status at any time, viewing an exact breakdown: **"3 Days, 14 Hours, 22 Minutes remaining"** and consumed data, drastically reducing customer support tickets and payment disputes.

---

## 5. Security, Fraud Prevention & Role-Based Access Control (RBAC)

T-Connect enforces a strict division of administrative responsibilities:

* **Owner / Executive**: Full financial visibility, payout approvals, Supabase database configuration, payment gateway key rotation.
* **Network Operations Center (NOC)**: Router adoption, bandwidth QoS policies, firmware updates, WireGuard tunnel monitoring.
* **Billing Operations**: Voucher batch creation, reconciliation reporting, CSV voucher export, merchant ledger audits.
* **Venue Manager**: Scoped to view only their assigned physical location (e.g. Maseru Mall), view foot traffic, and monitor active sessions.

---

## 6. Commercial Summary & Next Steps

1. **Hardware Capital Expenditure**: Low-cost, industrial-grade **MikroTik hAP ax³** hardware (~$130/unit) with 5-year hardware lifespan.
2. **Cloud Operating Cost**: Single Contabo VPS ($6 - $12/month) capable of supporting up to 500 simultaneous routers and 25,000 daily active sessions due to the zero-router-RAM offloaded architecture.
3. **Breakeven Timeline**: At 30 daily vouchers (M150/day = M4,500/month), each router pays for its complete hardware cost within 20 days of activation.
