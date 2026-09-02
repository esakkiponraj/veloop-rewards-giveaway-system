# VELOOP Rewards — Full-Stack Giveaway & Rewards System

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.22-lightgrey.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%7C%20Mongoose-emerald.svg)](https://www.mongodb.com/)
[![Security](https://img.shields.io/badge/Fraud--Engine-Active-gold.svg)]()
[![Production Readiness](https://img.shields.io/badge/Phase%204-Production--Ready-success.svg)]()

A production-grade, full-stack **Giveaway & Hardware Rewards Engine** engineered for **VELOOP Rewards**. Built with strict financial integrity, anti-abuse fraud protection, atomic balance deductions, cryptographically weighted winner selection, multi-state prize claim fulfillment, and a bespoke fintech-inspired dark aesthetic.

---

## 🌟 Executive Summary & Phase 4 Highlights

This system is built strictly in accordance with the 88-page **VELOOP Rewards Giveaway Task Specification** and hardened through Phases 1, 2, 3, and 4:

1. **Frontend Presentation vs Backend Authority**:
   - The frontend never dictates virtual currency fees, balances, or giveaway statuses.
   - The backend performs independent server-side time validation (`startAt <= now <= endAt`), authoritative wallet balance checks, and atomic state transitions.
2. **Atomic Integrity & Concurrency Protection**:
   - Single participation per user per prize giveaway event is guaranteed by database-level compound unique indexes (`userId + giveawayId + prizeId`).
   - Atomic wallet deductions use MongoDB multi-document transactions with conditional updates (`$inc: { 'wallet.<currency>': -amount }`), ensuring zero orphaned debits.
   - Idempotency key tracking (`x-idempotency-key`) returns cached responses for network retries without double-charging.
3. **Multi-Signal Anti-Fraud & Abuse Engine**:
   - Evaluates device clustering (`deviceHash`), rapid burst velocity, and historical risk scoring (0–100 scale: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
   - Mitigates multi-accounting without unfairly penalizing shared household IP addresses.
4. **Weighted Winner Selection & 4-Stage Claim Lifecycle**:
   - Selection probability is proportional to user entries using Node.js `crypto.randomInt()` without replacement.
   - Preflight availability validation blocks draws atomically with HTTP 409 `INSUFFICIENT_ELIGIBLE_PARTICIPANTS` if distinct participants < needed winners.
   - Authoritative 4-state lifecycle: `SELECTED → CLAIM_SUBMITTED → VERIFIED → DELIVERED`.
   - Strict 7-calendar-day claim window; late claims are rejected with HTTP 400 `CLAIM_DEADLINE_EXPIRED` and persisted in DB as `EXPIRED`.
5. **Production Hardening & Fail-Closed Reliability**:
   - Strict Helmet security headers, CORS origin verification (`CLIENT_URL`), and rate limiters on sensitive endpoints.
   - Production fails closed when MongoDB is unavailable; `/api/health` returns HTTP 503 `UNHEALTHY` if disconnected in production.
   - SPA route rewrites configured for Vercel (`vercel.json`) and Netlify (`_redirects`).
   - Zero hardcoded secrets in source files; environment variables managed via `.env` with templates in `.env.example`.

---

## 🎯 Architecture & Data Flow

```text
   ┌─────────────────────────────────────────────────────────────┐
   │                    VELOOP REACT FRONTEND                    │
   │  (Vite + React 18 + CSS Modules + Bootstrap + Framer Motion) │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ JSON API Request (Bearer JWT + DeviceHash)
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  EXPRESS SECURITY MIDDLEWARE                 │
   │   (Helmet Headers + Strict CORS + Rate Limiting + Auth Guard)│
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │              FRAUD RISK & ANTI-ABUSE ENGINE                 │
   │ (Device Clustering + Velocity Analysis + Risk Scoring 0-100) │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │               ATOMIC PARTICIPATION TRANSACTION               │
   │  ┌───────────────────────────┬───────────────────────────┐  │
   │  │ Authoritative DB Fee Check│ Server-Time Guard (endAt) │  │
   │  ├───────────────────────────┼───────────────────────────┤  │
   │  │ Wallet Balance Deduction  │ Unique Compound Index     │  │
   │  ├───────────────────────────┼───────────────────────────┤  │
   │  │ Financial Transaction Log │ Immutable Audit Trail     │  │
   │  └───────────────────────────┴───────────────────────────┘  │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  WINNER & CLAIM STATE MACHINE                │
   │   SELECTED ──► CLAIM_SUBMITTED ──► VERIFIED ──► DELIVERED    │
   │   (Draw)       (User Claim)        (Admin Proc) (Admin Ship) │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  MONGODB PERSISTENCE LAYER                  │
   │   (Giveaways, Prizes, Participations, Winners, Claims, Logs) │
   └─────────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Vanilla CSS Modules (`.module.css`) + Design Token Variables
- **Icons**: Lucide React
- **Animations**: Framer Motion & Canvas Confetti (with `prefers-reduced-motion` support)
- **Routing**: React Router DOM v6
- **Deployment**: Vercel SPA (`vercel.json`) & Netlify (`_redirects`)

### Backend
- **Runtime**: Node.js v20+
- **Server**: Express.js
- **Database**: MongoDB (Mongoose ODM) with Atlas SRV support
- **Randomness**: Node.js `crypto.randomInt()` (Cryptographically Secure Pseudo-Random Number Generator)
- **Security**: Helmet, Express Rate Limit, JWT (`jsonwebtoken`), Bcrypt.js, CORS
- **Logging**: Morgan & Winston

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js v18+ (tested on Node.js v20 & v24)
- MongoDB running locally on port 27017 or a MongoDB Atlas SRV URI

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/veloop-rewards-giveaway.git
cd veloop-rewards-giveaway

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration
Copy the provided environment templates:

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/veloop_rewards
JWT_SECRET=veloop_super_secure_jwt_secret_key_2026_production_readiness
CLIENT_URL=http://localhost:5173
ALLOW_IN_MEMORY_FALLBACK=false
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Development Servers
```bash
# Terminal 1 - Backend:
cd backend
npm run dev

# Terminal 2 - Frontend:
cd frontend
npm run dev
```

Visit **http://localhost:5173** to view the application.

---

## 👥 Pre-seeded Evaluation Test Accounts

| Account Name | User ID | Email | Password | Initial Balances | Scenario to Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Modal Tester** | `VE10099` | `modal.tester@example.com` | `password123` | 750 VEs, 1500 SVEs, 5000 Tokens | Fresh QA account: test Join modal, live balance preview, atomic entry |
| **Alex Vance** | `VE10842` | `alex.vance@example.com` | `password123` | 850 VEs, 1200 SVEs, 5000 Tokens | Standard user: participate in iPhone 15 Pro, multi-currency flows |
| **Jordan Lee** | `VE10012` | `jordan.lee@example.com` | `password123` | 120 VEs, 150 SVEs, 600 Tokens | Low balance account: verifies 400 Insufficient Balance & exact shortfall |
| **Rohan Sharma** | `VE10025` | `rohan.winner@example.com` | `password123` | 450 VEs, 900 SVEs, 3500 Tokens | Official Winner of Apple Watch: test Claim modal & status sync |
| **VELOOP SuperAdmin** | `VE00001` | `admin@veloop.io` | `admin123` | 99999 VEs | Full Admin Operations: winner selection, claim processing, fraud logs |

> 💡 **1-Click Test Profile Switcher**: In development mode, click the user badge in the Navbar or visit `/login` to switch profiles with one click. In production builds, this switcher is excluded.

---

## 🎁 Canonical Prize Catalogue (`GW-2026-08`)

Stored authoritatively in MongoDB with zero hardcoded frontend assumptions:

| Prize Name | Position | Entry Requirement | Winner Count | Fulfillment Type |
| :--- | :--- | :--- | :--- | :--- |
| **iPhone 15 Pro (128GB)** | 1st Prize | **250 VEs** | 1 Winner | Physical Shipping Address |
| **Apple Watch Series 9** | 2nd Prize | **200 VEs** | 3 Winners | Physical Shipping Address |
| **AirPods Pro 2** | 3rd Prize | **500 SVEs** | 5 Winners | Physical Shipping Address |
| **₹2,000 Amazon Gift Card** | Lucky Draw | **500 VEs** | 10 Winners | Digital Email Code |
| **₹500 Amazon Gift Card** | Special Reward | **300 VEs** | 25 Winners | Digital Email Code |
| **₹20 Shopping Voucher** | Milestone Reward | **2,000 Tokens** | 100 Winners | Digital Voucher Code |

---

## 🧪 Automated Testing Guide

The codebase includes an extensive suite of automated integration, security, and regression tests.

Run test suites from the `backend/` directory:

```bash
# Phase 4 Production Readiness & E2E Verification Suite (49 assertions)
node src/tests/phase4_production_readiness.test.js

# Authentication Flow, Sanitized Return URLs & Token Isolation (18 assertions)
node src/tests/auth_flow_regression.test.js

# Phase 3 Full Battery: Weighted Draw, Claim State Machine & 7-Day Expiry (28 assertions)
node src/tests/phase3_full_suite.test.js

# Full Master Regression Suite (23 assertions)
node src/tests/run_all_tests.js

# Concurrency & Idempotency Deep Attack Suite
node src/tests/idempotency_deep.test.js
```

### Verified Test Assertions Summary:
- **Canonical Preservation**: Running seeds or test cleanup never resets existing user balances or canonical catalogue.
- **Visitor Isolation**: Unauthenticated users browse prizes with masked winner IDs (`VE****12`); join and claim APIs block with HTTP 401.
- **Balance Guards**: Shortfall calculated server-side; insufficient balances fail with HTTP 400 and zero deductions.
- **Idempotency**: Duplicate joins return cached responses without re-debiting balances.
- **Weighted Fairness**: Proportional probability without replacement; single winner cannot win the same prize twice.
- **Claim Lifecycle**: Forward transitions enforced (`SELECTED → CLAIM_SUBMITTED → VERIFIED → DELIVERED`); backward rollbacks rejected with HTTP 400.
- **PII Privacy**: Public winner endpoints strip all phone numbers, emails, and physical addresses.
- **Health Check**: `/api/health` reports `HEALTHY` and database `CONNECTED`. In production, disconnected database yields HTTP 503 `UNHEALTHY`.

---

## 🚢 Production Deployment Runbook

### Deploying Frontend (Vercel)
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Set Environment Variable:
   - `VITE_API_URL`: URL of your deployed backend (e.g. `https://api.veloop.io/api`).
5. SPA fallback routing is pre-configured via `frontend/vercel.json`.
6. Build command: `npm run build`, Output directory: `dist`.

### Deploying Backend (Render / Railway / AWS)
1. Set **Root Directory** to `backend`.
2. Build Command: `npm install`.
3. Start Command: `npm start`.
4. Configure Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5000` (or provided dynamically by host)
   - `MONGO_URI`: Your MongoDB Atlas production connection string
   - `JWT_SECRET`: High-entropy 256-bit string (min 32 characters)
   - `CLIENT_URL`: URL of your deployed frontend (e.g. `https://rewards.veloop.io`)
   - `ALLOW_IN_MEMORY_FALLBACK=false` (Strict fail-closed mode)
5. Verify health: `GET https://your-backend-api/api/health` returns HTTP 200 with `database: "CONNECTED"`.

---

## 🔍 Security & Abuse Prevention Architecture

1. **Cryptographic Randomness**: Winner draws use `crypto.randomInt()`, preventing PRNG prediction attacks.
2. **Double-Join Defense**: MongoDB compound unique index `{ userId: 1, giveawayId: 1, prizeId: 1 }` prevents concurrent double-entry race conditions.
3. **Fail-Closed Database**: In production (`NODE_ENV === 'production'`), fallback in-memory mode is rejected. The server fails closed with HTTP 503 rather than operating on unpersisted mock data.
4. **URL Sanitization**: Internal redirect paths are sanitized against protocol-relative (`//evil.com`), JavaScript (`javascript:`), and open-redirect phishing attempts.
5. **PII Removal**: Sensitive phone numbers, shipping addresses, and full names are restricted to authenticated admins and the claim owner; public feeds only expose masked identifiers (`VE****42`).

### Known Upstream Advisories Note
Running `npm audit` reveals moderate advisories in upstream libraries:
- `qs` (transitive dependency of `body-parser` in `express@4.x`): addressed upstream in upcoming major express releases; sanitized input validation in place.
- `esbuild` / `react-router-dom`: upstream fixes require breaking major version upgrades (`vite@8.x` / `react-router-dom@7.x`).
No high or critical application-level vulnerabilities exist in VELOOP application code.

---

## 📄 License & Evaluation Note

Created exclusively for the **VELOOP Rewards Evaluation**. All rights reserved.
