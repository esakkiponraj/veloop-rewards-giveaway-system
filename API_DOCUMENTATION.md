# VELOOP Rewards — Giveaway & Rewards API Documentation

Complete REST API specification for the **VELOOP Rewards Giveaway & Hardware Rewards System**.

**Base URL**: `http://localhost:5000/api` (Local) / `https://<your-domain>/api` (Production)

---

## 1. System Health & Readiness

### `GET /health`
Returns service status, database connectivity, and server timestamp. In production, returns HTTP 503 if the database is disconnected.

- **Access**: Public
- **Success Response (200 OK)**:
```json
{
  "status": "HEALTHY",
  "service": "VELOOP Rewards Core API",
  "database": "CONNECTED",
  "version": "1.0.0",
  "timestamp": "2026-09-02T16:45:00.000Z"
}
```
- **Service Unavailable Response (503 Service Unavailable)** *(In Production when MongoDB is down)*:
```json
{
  "status": "UNHEALTHY",
  "service": "VELOOP Rewards Core API",
  "database": "DISCONNECTED",
  "version": "1.0.0",
  "timestamp": "2026-09-02T16:45:00.000Z"
}
```

---

## 2. Authentication & Session

### `POST /auth/login`
Authenticates a user and issues a signed JWT bearer token.

- **Access**: Public (Rate-limited: 25 req/15min)
- **Request Body**:
```json
{
  "emailOrUsername": "alex.vance@example.com",
  "password": "password123"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "VE10842",
    "username": "Alex Vance",
    "email": "alex.vance@example.com",
    "maskedId": "VE****42",
    "role": "user",
    "wallet": {
      "VEs": 850,
      "SVEs": 1200,
      "Tokens": 5000
    }
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Invalid credentials (`Invalid email/username or password`).

---

### `GET /auth/me`
Fetches authoritative user profile, masked identity, and current wallet balances.

- **Access**: Protected (`Authorization: Bearer <JWT>`)
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "userId": "VE10842",
    "username": "Alex Vance",
    "email": "alex.vance@example.com",
    "maskedId": "VE****42",
    "role": "user",
    "wallet": {
      "VEs": 850,
      "SVEs": 1200,
      "Tokens": 5000
    }
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Missing, invalid, or expired session token.

---

## 3. Giveaways & Prize Catalogue

### `GET /giveaways/current`
Returns active giveaway campaign, live countdown metadata, and all linked prizes.

- **Access**: Public
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "serverTime": "2026-09-02T16:45:00.000Z",
  "giveaway": {
    "giveawayId": "GW-2026-08",
    "title": "Summer Rewards Megadraw 2026",
    "slug": "summer-rewards-megadraw",
    "status": "ACTIVE",
    "startAt": "2026-08-23T16:30:00.000Z",
    "endAt": "2026-09-07T01:15:00.000Z",
    "totalParticipants": 8540,
    "prizes": [
      {
        "prizeId": "PRIZE-IPHONE15",
        "name": "iPhone 15 Pro (128GB)",
        "slug": "iphone-15-pro",
        "position": "1st Prize",
        "entryCurrency": "VEs",
        "entryAmount": 250,
        "winnerCount": 1,
        "claimType": "SHIPPING_ADDRESS",
        "marketValue": "₹1,34,900"
      }
    ]
  },
  "stats": {
    "activeGiveaways": 1,
    "totalGiveaways": 2,
    "totalParticipants": 8540,
    "totalPrizesWon": 1240,
    "endsInMs": 376200000
  }
}
```

---

### `GET /giveaways/prizes/:slug`
Fetches individual prize details by slug (e.g. `iphone-15-pro`, `apple-watch`, `airpods`).

- **Access**: Public
- **Success Response (200 OK)**: Full prize document, specifications array, and parent giveaway data.

---

### `GET /giveaways/:giveawayId/my-status` (or `/:id/my-status`)
Returns the authenticated user's participation status, entry details, and winner status for a campaign.

- **Access**: Protected (`Authorization: Bearer <JWT>`)
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "isParticipating": true,
  "participation": {
    "userId": "VE10842",
    "giveawayId": "GW-2026-08",
    "prizeId": "PRIZE-IPHONE15",
    "entryCurrency": "VEs",
    "entryAmount": 250,
    "joinedAt": "2026-09-02T16:45:00.000Z",
    "transactionId": "TXN-GW-1788369616634-8F92A"
  },
  "isWinner": false,
  "wallet": {
    "VEs": 600,
    "SVEs": 1200,
    "Tokens": 5000
  }
}
```

---

### `POST /giveaways/:giveawayId/prizes/:prizeId/join` (or `/:id/join`)
Authoritative participation entry. Atomically debits virtual currency, validates server-time deadline, creates an immutable participation entry, and records financial transaction log.

- **Access**: Protected (`Authorization: Bearer <JWT>`, Rate-limited: 10 req/min)
- **Headers**:
  - `x-idempotency-key`: Client-generated unique key (e.g. `KEY-JOIN-<timestamp>`)
  - `x-device-hash`: Anti-abuse client signal
- **Request Body**:
```json
{
  "giveawayId": "GW-2026-08",
  "prizeId": "PRIZE-IPHONE15"
}
```
*(Note: Fees and currency are server-authoritative and determined by the prize configuration in DB).*

- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "You're In! Your entry for the iPhone 15 Pro (128GB) giveaway has been successfully recorded.",
  "participation": {
    "userId": "VE10842",
    "maskedId": "VE****42",
    "giveawayId": "GW-2026-08",
    "prizeId": "PRIZE-IPHONE15",
    "prizeName": "iPhone 15 Pro (128GB)",
    "entryCurrency": "VEs",
    "entryAmount": 250,
    "transactionId": "TXN-GW-1788369616634-8F92A",
    "joinedAt": "2026-09-02T16:45:00.000Z"
  },
  "wallet": {
    "VEs": 600,
    "SVEs": 1200,
    "Tokens": 5000
  }
}
```
- **Error Responses**:
  - `400 INSUFFICIENT_VE_BALANCE`: Balance lower than entry requirement. Returns `shortfall` and `details.deficit`.
  - `400 GIVEAWAY_ENDED`: Server time has passed campaign deadline.
  - `400 ALREADY_PARTICIPATING`: One entry limit per user per prize.
  - `401 LOGIN_REQUIRED`: Unauthenticated join attempt.
  - `403 PARTICIPATION_BLOCKED`: Anti-fraud threshold exceeded.

---

### `GET /giveaways/user/my-entries`
Retrieves all historical participations and winning claims for the authenticated user.

- **Access**: Protected (`Authorization: Bearer <JWT>`)
- **Success Response (200 OK)**: Returns user participations, prize details, and winning status.

---

## 4. Winner Announcements & Prize Claims

### `GET /giveaways/previous/winners`
Returns previous winners across completed campaigns with zero sensitive PII.

- **Access**: Public
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "winners": [
    {
      "winnerId": "66ce335a720911001",
      "giveawayId": "GW-2026-07",
      "prizeName": "Apple Watch Series 9",
      "prizeType": "PHYSICAL",
      "maskedUserId": "VE****25",
      "status": "DELIVERED"
    }
  ]
}
```

---

### `POST /giveaways/:giveawayId/claim` (or `/:id/claim`)
Submits prize fulfillment details for an authenticated winner. Transitions winner status from `SELECTED` to `CLAIM_SUBMITTED`.

- **Access**: Protected (Authenticated user must own the winner record)
- **Physical Prize Request Body (iPhone / Watch / AirPods)**:
```json
{
  "giveawayId": "GW-2026-08",
  "prizeId": "PRIZE-IPHONE15",
  "claimDetails": {
    "fullName": "Alex Vance",
    "phoneNumber": "+919876543210",
    "addressLine": "402 Skyline Towers, MG Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pinCode": "560001"
  }
}
```
- **Digital Gift Card Request Body (Amazon / Vouchers)**:
```json
{
  "giveawayId": "GW-2026-08",
  "prizeId": "PRIZE-AMAZON2000",
  "claimDetails": {
    "emailAddress": "alex.vance@example.com"
  }
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Claim details submitted successfully!",
  "claim": {
    "claimId": "CLM-1788369677738-M1O06",
    "giveawayId": "GW-2026-08",
    "prizeId": "PRIZE-IPHONE15",
    "status": "SUBMITTED",
    "submittedAt": "2026-09-02T16:50:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 CLAIM_DEADLINE_EXPIRED`: Submitted after the 7-calendar-day deadline. Winner status persisted as `EXPIRED`.
  - `400 MISSING_SHIPPING_FIELDS`: Incomplete shipping details for physical prize.
  - `400 INVALID_EMAIL_ADDRESS`: Invalid email for digital voucher.
  - `403 CLAIM_NOT_ALLOWED`: Requesting user is not the winner.

---

### `GET /giveaways/:giveawayId/my-claim` (or `/:id/my-claim`)
Retrieves existing claim record for the authenticated user on a giveaway.

- **Access**: Protected
- **Success Response (200 OK)**: Returns claim record with current fulfillment status.

---

## 5. Admin Control Portal (`/api/admin/*`)

All admin endpoints require `role: 'admin'`. Non-admin requests are rejected with HTTP 403 Forbidden.

### `GET /admin/overview`
Dashboard metrics: total participants, total prizes awarded, pending claims, and active giveaways.

- **Access**: Admin only

---

### `POST /admin/giveaways/:id/draw-winners`
Triggers weighted random winner selection without replacement using Node.js `crypto.randomInt()`.

- **Access**: Admin only
- **Preflight Requirement**: Campaign must be in `ENDED` status. Each eligible prize must have at least as many distinct participants as `winnerCount`.
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Winner selection completed. 6 new winner(s) assigned.",
  "drawRunId": "DRAW-1788369616634-921",
  "totalNewWinners": 6,
  "results": [...]
}
```
- **Error Responses**:
  - `400 GIVEAWAY_NOT_ENDED`: Attempting to draw on an ACTIVE or UPCOMING campaign.
  - `409 INSUFFICIENT_ELIGIBLE_PARTICIPANTS`: Distinct participants < needed winners. Atomic safety: 0 winners created.

---

### `PUT /admin/claims/:claimId/process` (and `POST`)
Transitions claim status through the 4-stage fulfillment lifecycle.

- **Access**: Admin only
- **Allowed Transitions**:
  - `SUBMITTED → PROCESSING` (Winner status transitions to `VERIFIED`)
  - `PROCESSING → COMPLETED` (Winner status transitions to `DELIVERED`)
  - Backward transitions rejected with HTTP 400 `INVALID_CLAIM_TRANSITION`
- **Request Body (Fulfillment Dispatch)**:
```json
{
  "action": "COMPLETED",
  "courierPartner": "BlueDart Express",
  "trackingNumber": "BD-992817462",
  "adminNotes": "Hardware dispatched with signature verification."
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Claim CLM-1788369677738-M1O06 successfully updated to status COMPLETED.",
  "claim": {
    "claimId": "CLM-1788369677738-M1O06",
    "status": "COMPLETED",
    "trackingInformation": {
      "courierPartner": "BlueDart Express",
      "trackingNumber": "BD-992817462"
    }
  }
}
```

---

### `GET /admin/claims`
Lists all submitted winner claims with status filters and fulfillment details.

- **Access**: Admin only

---

### `GET /admin/audit-logs`
Immutable system audit ledger for draws, status transitions, and claims. Contains zero sensitive PII.

- **Access**: Admin only
