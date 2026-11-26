# Super Admin Permissions, `@tconnect.tower` Onboarding, Activity Audit Log & 2-Hour Session Auth

Establish strict Super Admin governance for Phelane Phoma with department-based invites where the Super Admin ticks exactly which tabs each teammate can access, invitees activate their account by entering their name, custom handle prefix against the locked `@tconnect.tower` suffix, and own password, a dedicated Super Admin–only Team Dashboard & immutable Activity Audit Log tracks every user's changes, router adoptions, and CSV exports, and standard website sessions automatically expire after 2 hours of inactivity.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Your revisions (`@tconnect.tower` handle onboarding and the Super Admin–only Activity Audit Log) have been incorporated alongside your three earlier choices. Live guest Wi-Fi, M-Pesa, EcoCash, OTT vouchers, Free Mode, and MikroTik routers remain 100% untouched.

- **Confirmed Decision 1 — Primary Super Admin (Boss)**: **Phelane Phoma** (`phelane@tconnect.tower`, also accepting `superadmin@tconnect.tower` for safekeeping) holds exclusive rights to open the Team Dashboard, inspect the Activity & Audit Log, invite teammates, tick/untick tab permissions, issue password reset links, and manage system controls.
- **Confirmed Decision 2 — `@tconnect.tower` Identity & Self-Setup Onboarding**: Every platform account uses the standardized **`@tconnect.tower`** suffix. When Phelane sends an invite, he chooses the **Department** (with an optional reference name/label) and **ticks off the exact tabs** the person can access. When the invitee opens their link, they already see their locked **`@tconnect.tower`** suffix and pre-decided tab access — they simply enter their **Full Name**, type the **first part of their handle** (e.g., `thabo.m` → `thabo.m@tconnect.tower`), and set their **own password**.
- **Confirmed Decision 3 — Super Admin–Only Activity & Audit Log**: Every action across the platform — logins, settings changes, router adoptions, Paid/Free toggles, terminal commands, plan/price edits, media uploads, and **every CSV export** — is persisted server-side with the acting user's name, `@tconnect.tower` handle, department, target, and timestamp, visible **exclusively to the Super Admin**.
- **Confirmed Decision 4 — Strict 2-Hour Inactivity Session Timeout**: Authentication works like a standard website — page refreshes keep active users signed in via server-verified sessions, while **2 hours of inactivity** automatically expires the session on both server and browser and requires signing in again with valid credentials.

---

### 1. Overview & Core Concept

- **What It Does**: Turns T-Connect Control Tower into a full management platform with clean organizational identity (`@tconnect.tower`), granular per-person tab permissions controlled solely by the Super Admin, frictionless invitee self-setup, live last-login visibility on the Team Dashboard, and complete accountability through a Super Admin–only Activity & Audit Log.
- **Target Audience / Persona**:
  - **Super Admin (Phelane Phoma)**: Full Control Tower access, exclusive Team Dashboard & Activity Audit Log visibility, custom per-person tab checkboxes, and full team lifecycle management.
  - **Invited Department Staff (Finance, Technical, Marketing & Portal, Management, Operations)**: Focused workspace showing only the exact tabs Phelane ticked for them when creating their invite, signing in with their own `<handle>@tconnect.tower` login and password.
- **Key Value**: Eliminates guesswork over who can view or modify revenue, routers, terminals, or guest data, enforces clean `@tconnect.tower` staff logins without admin-known passwords, gives Phelane a real-time audit trail of every change, router adoption, and CSV export, and protects sessions with automatic 2-hour idle sign-out.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Super Admin Login & First-Run Safekeeping**:
     - On a fresh deployment (when no environment password override is set), the sign-in screen opens cleanly into **Super Admin First-Run Setup** for **Phelane Phoma** (`phelane@tconnect.tower`), letting you set and lock his password safely on the server (`scrypt` hash) and noting his default Super Admin login handle for safekeeping.
     - On subsequent visits, anyone signs in using their **`<handle>@tconnect.tower`** address (or just typing the handle prefix before `@tconnect.tower`) and their password.
  2. **Super Admin Invites a Teammate (Department + Tab Checkboxes)**:
     - Clicking **Invite Teammates** from the top-right account menu or **Team Dashboard** opens a focused invitation dialog:
       - **Department Selector** (`Finance`, `Technical`, `Marketing & Portal`, `Management`, `Operations`, `Super Admin`) — automatically pre-ticks recommended tabs for that department.
       - **Invitee Reference Label / Name** (optional pre-fill, editable by the invitee when accepting if desired).
       - **Clear Tab Access Checklist** where every selectable tab shows its exact title and a plain-English description of what lives inside it:
         - **Fleet Overview** — Live Mobile Revenue totals, daily transaction trends, online router health, Deadman Watchdog, and active guest counts.
         - **Routers & Adoption** — Adopt MikroTik routers, generate WireGuard scripts, switch routers between Paid and Free Mode, and manage venue groups.
         - **Billing & Vouchers** — Edit plan prices (M10/M60/M220), generate and track 16-digit OTT and T-Connect vouchers, view M-Pesa & EcoCash ledgers, and manage payment gateways.
         - **Captive Portal & Ads** — Edit splash branding, upload venue images and sponsor videos, update terms, and run One-Click Sync Splash.
         - **Remote Terminal & WireGuard** — Run RouterOS CLI commands on single routers or across the fleet and inspect live router snapshots.
         - **Roaming, QoS & Content Filtering** — Manage roaming profiles, bandwidth caps, and DNS content filters.
         - **Live Session Logs** — Inspect active guest hotspot sessions, MAC/IP details, and live usage.
         - **Guest Leads & Partners** — View captured guest contact lists and export venue lead reports.
       - A quiet note confirms **Team Dashboard, Activity Audit Log & System Administration** stay exclusive to Super Admin.
     - Submitting generates a single-use **7-day onboarding link** with a 1-click Copy button.
  3. **Invitee Self-Setup (`@tconnect.tower` Prefix + Full Name + Own Password)**:
     - Opening the invite link shows a clean **Activate Your T-Connect Tower Account** screen displaying:
       - Assigned **Department** and a clear read-only summary of the **pre-decided tabs** Phelane granted.
       - **Full Name** input (e.g., *Thabo Mokoena*).
       - **Tower Login Handle** input with a **locked `@tconnect.tower` suffix** glued to the right side of the field — the user only enters the first part (e.g., `thabo.m`), with real-time format validation (lowercase letters, numbers, dots, hyphens, underscores) and uniqueness checking against existing accounts.
       - **Create Password & Confirm Password** inputs (minimum 10 characters with strength guidance).
     - Upon activation, the invite link is consumed immediately, the server hashes their password, logs an `auth.invite_activated` entry in the Super Admin Activity Log, records their `lastLoginAt`, starts their authenticated session, and opens directly to their first permitted tab.
  4. **Super Admin Team Dashboard & Activity Audit Log**:
     - Clicking **Team Dashboard** from the user dropdown jumps directly to the Super Admin management hub (completely hidden from non-Super Admins), featuring two clean workspace views:
       - **Team Members Directory**: Compact summary strip (Total Staff, Active Accounts, Pending Invites, Signed In Last 24h), search bar, segmented department filters, and a high-density tabular grid showing **Full Name**, **Login (`@tconnect.tower`)**, **Department**, **Allowed Tabs** (clean inline summary), **Last Login** (formatted date/time + relative time like `22 Nov 2026, 16:40 · 12m ago`, or `Never`), **Status** (*Active*, *Pending Setup*, *Suspended*), and **Actions** (*Edit Tabs & Department*, *Copy Invite Link*, *Send Password Reset Link*, *Remove*).
       - **Activity & Audit Log (Super Admin Only)**: Real-time, server-persisted chronological ledger of every action across the entire platform, filterable by **User**, **Department**, **Category** (*Auth*, *Routers & Adoption*, *Billing & Vouchers*, *Portal & Media*, *CSV Exports*, *Team & Permissions*), and text search. Each row records **Timestamp** (`tabular-nums`), **User & `@tconnect.tower` Handle**, **Department**, **Action**, **Target**, and **Details**, plus a Super Admin–only **Export Audit CSV** button.
  5. **Standard Website Session Persistence & 2-Hour Auto-Expiry**:
     - Refreshing the browser keeps active users logged in seamlessly via server-verified session checks (`GET /api/auth/me`).
     - Any active interaction or API request refreshes the sliding **2-hour inactivity window**. After 2 hours idle (whether the tab stays open or the browser was closed and reopened later), the server expires the session and the UI cleanly returns the user to the Sign-In screen with an inactivity notice.
     - Replaces the fragile global `window.fetch` override with a clean safe API fetch client so preview and production browsers never hit read-only property errors.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-precision enterprise network operations console matching the existing T-Connect Control Tower dark slate palette, with full Light/Dark theme parity.
  - *Color Palette & Mood*: 60% deep neutral slate canvas (`#080b14` dark / `#f8fafc` light), 30% flat structural surfaces (`#0f1422` dark / `#ffffff` light) separated by crisp 1px hairline borders (`#232d42` / `#e2e8f0`), and 10% high-intent T-Connect orange (`#f05e17`) concentrated strictly at primary action buttons, active navigation tabs, and checked permission boxes. Semantic green (`#16A34A`), amber (`#D97706`), and crimson (`#DC2626`) always pair with explicit status text.
  - *Typography & Hierarchy*: Preserves the app's clean sans display/body hierarchy for titles, tab descriptions, and dialogs, paired with monospace tabular figures (`tabular-nums`) for `@tconnect.tower` handles, timestamps, counts, and audit log columns.
  - *Component Styling & Layout*: Single-elevation flat containers with 1px hairline dividers, no nested card sandwiches, no thick left accent borders, and zero static pill clutter — metadata such as department, status, and allowed tabs render as clean unboxed text with `·` separators, while interactive filters use crisp segmented buttons.
- **Interactive Feedback & Motion**:
  - Fast 150ms hover/focus transitions, visible keyboard focus rings, skeleton loading rows while loading the team directory and audit trail, clean empty states for unmatched filters, inline validation for duplicate `@tconnect.tower` prefixes or weak passwords, and clear toast feedback on invite creation, permission updates, and CSV exports.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Locked `@tconnect.tower` Login Suffix with Self-Chosen Handle & Password**
  - *Chosen Approach*: Super Admin creates an invite tied to a department and pre-selected `allowedTabs[]` (without needing to invent usernames or passwords). The invitee enters their Full Name, types only the prefix before `@tconnect.tower`, and creates their own password (hashed server-side with `scrypt`).
  - *Why*: Standardizes every staff identity under one clean internal domain (`@tconnect.tower`), lets employees pick memorable handles and private passwords, and prevents plaintext passwords from ever being shared or exposed on the Team Dashboard.
  - *Alternatives Considered*: Having the Super Admin pre-type email addresses and temporary passwords — rejected because it creates extra friction for the boss and puts plaintext credentials in chat/email.

- **Decision 2 — Server-Side Immutable Activity & Audit Log for All User Actions**
  - *Chosen Approach*: Instrument both backend mutation routes (auth, router adoption, terminal commands, plan/price edits, gateway changes, uploads, team edits) and frontend export triggers (Leads CSV, Transactions CSV, Vouchers CSV, Audit CSV) to write structured events to a private server-persisted audit store, strictly gated behind Super Admin authentication (`GET /api/audit-logs`).
  - *Why*: Ensures Phelane has an accurate, tamper-resistant record of *who* changed a price, *who* adopted or toggled a router, and *who* exported customer/revenue CSVs — even if an employee clears their own browser storage.
  - *Alternatives Considered*: Browser `localStorage`-only audit logs — rejected because they only live on one computer and are invisible to the Super Admin on another device.

- **Decision 3 — Server-Verified HttpOnly Cookie Sessions with Safe API Client & 2-Hour Sliding Timeout**
  - *Chosen Approach*: Issue server-tracked sessions via `HttpOnly; Secure; SameSite=None; Partitioned` cookies (plus safe in-memory Bearer fallback through a dedicated API fetch wrapper, eliminating the `window.fetch` assignment crash). Every session records `lastActivityAt` on the server and automatically expires after **2 hours (7,200 seconds)** of inactivity.
  - *Why*: Works like a real production web application across page reloads, operates seamlessly inside both standalone VPS browsers and preview iframes, and enforces strict 2-hour idle timeouts regardless of client clock tampering.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                T-CONNECT MANAGEMENT, AUTH & AUDIT ARCHITECTURE               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Sign-In / First-Run / @tconnect.tower Onboarding]                          │
│    ├── Super Admin First-Run Setup (Phelane Phoma · phelane@tconnect.tower)  │
│    ├── Standard Sign-In (<handle>@tconnect.tower + Password)                 │
│    └── Single-Use Invite Link -> Enter Full Name + [prefix]@tconnect.tower   │
│        + Own Password (Pre-decided Department & Tabs shown read-only)        │
│                          │                                                   │
│                          ▼                                                   │
│  [Session & Safe API Client Layer]                                           │
│    ├── Server-Tracked Session (HttpOnly Cookie + Safe API Fetch Wrapper)     │
│    ├── Sliding 2-Hour Inactivity Watchdog (Server TTL + Client Idle Guard)   │
│    └── Seamless Session Restore on Refresh (GET /api/auth/me)                │
│                          │                                                   │
│                          ▼                                                   │
│  [Role & Per-Tab Enforcement + Automatic Audit Hooks]                        │
│    ├── Super Admin Only ──► Team Dashboard + Invite Builder (Tab Checkboxes) │
│    │                        + Immutable Activity & Audit Log + All 8 Tabs    │
│    └── Department Staff ──► Sidebar & Sub-Tabs filtered strictly by          │
│                             member.allowedTabs[] + Server Tab Guard          │
│    └── Every Mutation & CSV Export ──► POST / Server Audit Hook              │
│        (actorName, @tconnect.tower, department, category, target, details)   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  [Backend Persistence (Private Data Store, Mode 0600)]                       │
│    ├── Auth Users & Invites: id, name, handle (@tconnect.tower, unique),     │
│    │   department, isSuperAdmin, allowedTabs[], passwordHash (scrypt),       │
│    │   status, lastLoginAt, inviteTokenHash, resetTokenHash                  │
│    ├── Active Sessions: sessionId, userId, createdAt, lastActivityAt (2h)    │
│    └── Audit Events Store: id, timestamp, actorId, actorName, actorHandle,   │
│        actorDepartment, category, action, target, details, ipAddress         │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Team Member & Pending Invite Record**: Stores `id`, `name`, `username` (prefix), `email` (`<prefix>@tconnect.tower`, case-insensitive unique), `department`, `role` (`Super Admin` or department role), `allowedTabs` (explicit array of ticked tab keys), `status` (`invited`, `active`, `suspended`), `lastLoginAt` (ISO timestamp updated on every verified login), `invitedAt`, `invitedBy`, and server-only salted `passwordHash` plus single-use hashed invite/reset tokens.
  - **Active Session Record**: Tracks every signed session ID server-side with `userId`, `createdAt`, and `lastActivityAt`, rejecting and pruning any session idle for more than `7,200,000 ms` (2 hours).
  - **Immutable Activity Audit Event**: Persisted to private disk (`/data/audit-logs.json`, mode `0600`) with `id`, `timestamp`, `actorName`, `actorEmail` (`@tconnect.tower`), `actorDepartment`, `category` (`auth`, `routers`, `billing`, `portal`, `exports`, `team`, `terminal`), `action`, `target`, `details`, and `ipAddress`.
- **Interactive Component & State Mapping**:
  - **Safe API Client**: Replaces the broken global `window.fetch` patch with a safe authenticated fetch utility (`credentials: 'include'` + in-memory token header + automatic `401` idle-expiry redirect).
  - **Invite & Edit Permissions Dialog (Super Admin Only)**: Department picker auto-selects default tab checkboxes; every tab option includes its title and plain-English description of contents; validates at least one tab is selected before creating a single-use onboarding link or saving permission changes.
  - **Invitee Activation Screen**: Validates the single-use token via server lookup (`GET /api/team/invite-preview`), displays the locked department & pre-decided tabs, renders the locked `@tconnect.tower` prefix input with live availability feedback, and activates the account on submit.
  - **Team Dashboard & Activity Audit Log (Super Admin Only)**: Two-tab Super Admin console with live search, department/category filters, member directory with `@tconnect.tower` handle and formatted `lastLoginAt`, inline Edit Permissions, single-use Password Reset Link generator, Member Removal, and filterable Activity Log with CSV export.
  - **CSV Export Audit Instrumentation**: Wraps all platform CSV downloads (Leads, Transactions, Vouchers, Audit Logs) so every export records a server-side `exports.csv_download` event attributed to the authenticated user.
- **Built-In Security Safeguards**:
  - Passwords are always salted and hashed server-side with `scrypt` (never stored or displayed in plaintext); invite and password-reset links are single-use cryptographic tokens with automatic expiration.
  - Every protected API route validates the active session (enforcing the 2-hour sliding inactivity timeout), checks Super Admin status or the user's `allowedTabs` allowlist, and verifies same-origin headers on cookie-authenticated mutations; audit log reads (`GET /api/audit-logs`) are restricted strictly to Super Admin.
  - Wildcard CORS remains excluded from all authenticated admin routes, while public captive portal, payment webhook, and MikroTik router endpoints remain completely isolated and unaffected.
