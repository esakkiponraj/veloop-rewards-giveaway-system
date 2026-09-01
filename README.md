# VELOOP Rewards — Full-Stack Giveaway & Rewards System

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19-lightgrey.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-emerald.svg)](https://www.mongodb.com/)
[![Security](https://img.shields.io/badge/Fraud--Engine-Active-gold.svg)]()

A production-grade, full-stack **Giveaway & Hardware Rewards Engine** engineered for **VELOOP Rewards**. Built with strict financial integrity, anti-abuse fraud protection, atomic balance deductions, tamper-proof winner selection, and a bespoke fintech-inspired dark aesthetic.

---

## 🌟 Executive Summary & Evaluation Highlights

This system is built strictly in accordance with the 88-page **VELOOP Rewards Giveaway Task Specification**:

1. **Frontend Presentation vs Backend Authority**:
   - The frontend never dictates virtual currency fees, balances, or giveaway statuses.
   - The backend performs independent server-side time validation (`startAt <= now <= endAt`), authoritative wallet balance checks, and atomic state transitions.
2. **Atomic Integrity & Race Condition Protection**:
   - Single participation per user per giveaway event is guaranteed by database-level compound unique indexes (`userId + giveawayId`).
   - Atomic balance deduction ensures no user is charged without participation, or entered without deduction.
3. **Multi-Signal Anti-Fraud & Abuse Engine**:
   - Evaluates device clustering (`deviceHash`), rapid burst velocity, and historical risk scoring (0–100 scale: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
   - Mitigates multi-accounting without unfairly penalizing shared household IP addresses.
4. **Dual Prize Claim Fulfillment**:
   - Physical prizes (iPhone 15 Pro, Apple Watch, AirPods) require shipping address details (Name, Phone, Address, City, State, PIN).
   - Digital vouchers (₹2,000 / ₹500 Amazon Gift Cards, ₹20 Vouchers) require email addresses only with zero shipping overhead.
5. **Human-Designed VELOOP Aesthetic**:
   - Bespoke midnight black (`#0a0b10`), amethyst purple (`#8b5cf6`), and reward gold (`#fbbf24`) design system.
   - Custom "Reward Vault Unlocking" loader, ticket border highlights, and live countdown blocks.

---

## 🎯 Architecture & Data Flow

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    VELOOP REACT FRONTEND                    │
   │  (Vite + React 18 + CSS Modules + Bootstrap + Framer Motion) │
   └──────────────────────────────┬──────────────────────────────┘
                                  │ JSON API Request (Bearer JWT + DeviceHash)
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  EXPRESS SECURITY MIDDLEWARE                 │
   │   (Helmet Security Headers + CORS Whitelist + Rate Limiting) │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  AUTHENTICATION & RBAC LAYER                 │
   │       (JWT Verification + Role Guard: User / SuperAdmin)     │
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
   │  │ Wallet Balance Deduction  │ Unique Index Constraint   │  │
   │  ├───────────────────────────┼───────────────────────────┤  │
   │  │ Financial Transaction Log │ Immutable Audit Trail     │  │
   │  └───────────────────────────┴───────────────────────────┘  │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                      MONGODB DATABASE                       │
   │   (Giveaways, Prizes, Participations, Transactions, Winners) │
   └─────────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

### Frontend
- **Framework**: React 18 (`src/`)
- **Build Tool**: Vite 5
- **Styling**: CSS Modules (`.module.css`) + Bootstrap Grid & Utility variables
- **Icons**: Lucide React
- **Animations**: Framer Motion & Canvas Confetti (restrained celebration)
- **Routing**: React Router DOM v6

### Backend
- **Runtime**: Node.js v20+
- **Server**: Express.js
- **Database**: MongoDB & Mongoose
- **Security**: Helmet, Express Rate Limit, JWT (`jsonwebtoken`), Bcrypt.js, CORS
- **Logging**: Morgan & Winston

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js v18+ (Tested on v24)
- Local MongoDB daemon or MongoDB Atlas URI (falls back to local instance)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/veloop-rewards-giveaway.git
cd veloop-rewards-giveaway

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Environment Variables Configuration
Create `.env` in both folders:

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/veloop_rewards
JWT_SECRET=veloop_super_secure_jwt_secret_key_2026
CLIENT_URL=http://localhost:5173
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Seed Database & Start Servers
```bash
# In backend directory:
node src/utils/seedData.js
npm run dev

# In frontend directory (in another terminal):
npm run dev
```

Visit **http://localhost:5173** to view the live interface.

---

## 👥 Pre-seeded Evaluation Test Accounts

| Account Name | User ID | Email | Password | Initial Balances | Scenario to Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Alex Vance** | `VE10842` | `alex.vance@example.com` | `password123` | 850 VEs, 1200 SVEs, 5000 Tokens | Standard user with sufficient balance for iPhone / AirPods |
| **Jordan Lee** | `VE10012` | `jordan.lee@example.com` | `password123` | 120 VEs, 150 SVEs, 600 Tokens | Insufficient balance warning & Earn More prompt |
| **Rohan Sharma** | `VE10025` | `rohan.winner@example.com` | `password123` | 450 VEs, 900 SVEs, 3500 Tokens | **Official Winner** of Apple Watch in completed event (Test Claim Form) |
| **VELOOP SuperAdmin** | `VE00001` | `admin@veloop.io` | `admin123` | 99999 VEs | Full Admin Operations Console (Draw winners, set status, inspect fraud) |

> 💡 **Quick Switcher**: Click the user profile badge in the Navbar or visit `/login` to switch between these test accounts in 1 click!

---

## 🎁 Configured Prizes & Entry Fees

Stored authoritatively in MongoDB:

| Prize Name | Position | Entry Requirement | Winner Limit | Claim Fulfillment |
| :--- | :--- | :--- | :--- | :--- |
| **iPhone 15 Pro (128GB)** | 1st Prize | **250 VEs** | 1 Winner | Physical Shipping Address |
| **Apple Watch Series 9** | 2nd Prize | **200 VEs** | 3 Winners | Physical Shipping Address |
| **AirPods Pro 2** | 3rd Prize | **500 SVEs** | 5 Winners | Physical Shipping Address |
| **₹2,000 Amazon Gift Card** | Lucky Draw | **500 VEs** | 10 Winners | Digital Email Code |
| **₹500 Amazon Gift Card** | Special Reward | **300 VEs** | 25 Winners | Digital Email Code |
| **₹20 Shopping Voucher** | Milestone Reward | **2,000 Tokens** | 100 Winners | In-App / Digital Code |

---

## 🛡️ Security & Anti-Malicious Verification

Run the automated test suite in `backend/`:
```bash
npm test
```

### Verified Threat Mitigations:
- **Attack A (Price Spoofing)**: Client sends `amount: 1` -> Backend ignores client payload and deducts configured fee from DB.
- **Attack B (Duplicate Join)**: Client double-clicks or triggers parallel join requests -> Database compound unique index allows exactly 1 entry and 1 deduction.
- **Attack C (Time Expiry)**: Client calls join on an ended giveaway -> Blocked with `GIVEAWAY_ENDED`.
- **Attack D (Identity Spoofing)**: User A sends `userId: UserB` -> Ignored; authenticated identity extracted strictly from signed JWT context.
- **Attack E (Insufficient Balance)**: User with 120 VEs tries 250 VEs join -> Rejected with `INSUFFICIENT_VE_BALANCE`.
- **Attack F (Unauthorized Claim)**: Non-winner attempts prize claim -> Rejected with `CLAIM_NOT_ALLOWED`.

---

## 📂 Repository Structure

```text
veloop-rewards-giveaway/
│
├── frontend/
│   ├── public/
│   │   └── assets/
│   │       ├── prizes/ (iphone15pro, applewatch, airpods, amazon2000, amazon500, amazon20)
│   │       ├── veloop-giftbox.svg
│   │       ├── veloop-ticket.svg
│   │       └── veloop-logo.svg
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── CustomLoader/ (Reward Vault Unlocking themed animation)
│   │   │   ├── Navbar/ (Multi-currency balance chips & account switcher)
│   │   │   ├── Footer/
│   │   │   ├── GiveawayHero/
│   │   │   ├── GiveawayStats/
│   │   │   ├── Countdown/ (Reactive live ticker)
│   │   │   ├── PrizeCard/ (MANDATORY: Leads to /giveaway/:slug)
│   │   │   ├── PersonalizedRewardPass/
│   │   │   ├── HowToParticipate/ (4-step visual roadmap)
│   │   │   ├── WinnerAnnouncementSlider/ (Masked user ticker)
│   │   │   ├── WinnersTabs/ (Live active state vs Previous Winners archive)
│   │   │   ├── JoinConfirmationModal/ (Pre-join balance math)
│   │   │   ├── SuccessfulParticipationModal/
│   │   │   ├── PrizeClaimModal/ (Physical shipping vs Email voucher)
│   │   │   ├── TrustSection/
│   │   │   ├── GiveawayRules/
│   │   │   └── FAQ/
│   │   │
│   │   ├── pages/
│   │   │   ├── GiveawayHome/ (/)
│   │   │   ├── GiveawayDetails/ (/giveaway/:slug)
│   │   │   ├── MyEntries/ (/my-entries)
│   │   │   ├── Login/ (/login)
│   │   │   └── AdminDashboard/ (/admin)
│   │   │
│   │   ├── context/ (AuthContext & Wallet Sync)
│   │   ├── services/ (apiClient, giveawayApi, authApi, adminApi)
│   │   └── styles/ (global.css, variables.css)
│   │
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   │   ├── config/ (db.js)
│   │   ├── controllers/ (giveawayController, authController, adminController)
│   │   ├── middleware/ (auth, rateLimit, error, validation)
│   │   ├── models/ (User, Giveaway, Prize, GiveawayParticipation, GiveawayEntryTransaction, GiveawayWinner, PrizeClaim, FraudEvent, AuditLog)
│   │   ├── routes/ (giveawayRoutes, authRoutes, adminRoutes)
│   │   ├── services/ (participationService, winnerService, claimService, fraudService)
│   │   ├── utils/ (seedData.js)
│   │   └── tests/ (security.test.js)
│   │
│   ├── app.js
│   ├── server.js
│   └── package.json
│
├── API_DOCUMENTATION.md
├── README.md
└── .gitignore
```

---

## 🚢 Deployment Guide

### Deploying Frontend to Vercel
1. Set root directory to `frontend/`.
2. Framework preset: **Vite**.
3. Environment variables: `VITE_API_URL=https://your-backend-api.onrender.com/api`.
4. Deploy!

### Deploying Backend
1. Deploy `backend/` to Render, Railway, or AWS EC2.
2. Set Environment Variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`.
3. Set build command: `npm install`, start command: `npm start`.

---

## 📄 License & Evaluation Note

Created exclusively for the **VELOOP Rewards Internship Evaluation**. All rights reserved.
