# VELOOP Rewards — Giveaway & Rewards API Documentation

This document outlines the complete REST API specification for the **VELOOP Rewards Giveaway & Rewards System**.

Base URL: `http://localhost:5000/api`

---

## 1. Authentication & User Profile

### `POST /auth/login`
Authenticates a user and issues a JWT bearer token.

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
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
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
  - `400 VALIDATION_ERROR`: Missing email or password.
  - `401 INVALID_CREDENTIALS`: Incorrect username or password.
  - `403 ACCOUNT_SUSPENDED`: Account flagged for fraud violations.

---

### `GET /auth/me`
Retrieves authenticated user profile and live wallet balance.

- **Access**: Protected (`Bearer <JWT>`)
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
    },
    "fraudRiskScore": 5
  }
}
```

---

## 2. Giveaways & Prizes

### `GET /giveaways/current`
Fetches the active featured giveaway event, server timestamp, dynamic participant metrics, and recent winner announcements.

- **Access**: Public
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "serverTime": "2026-08-25T16:30:00.000Z",
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
    "totalGiveaways": 3,
    "totalParticipants": 8540,
    "totalPrizesWon": 1240,
    "endsInMs": 1068300000
  }
}
```

---

### `GET /giveaways/prizes/:slug`
Fetches individual prize specifications, associated giveaway rules, eligibility terms, and entry fee.

- **Access**: Public
- **Parameters**: `slug` (e.g. `iphone-15-pro`, `apple-watch`, `airpods`, `amazon-2000`)
- **Success Response (200 OK)**: Returns full prize object, specifications array, and parent giveaway data.

---

### `GET /giveaways/:id/my-status`
Returns the authenticated user's participation status, entry timestamp, and winning status.

- **Access**: Protected (`Bearer <JWT>`)
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
    "joinedAt": "2026-08-25T16:32:00.000Z",
    "transactionId": "TXN-GW-1724603520000-8F92A"
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

### `POST /giveaways/:id/join`
**Authoritative join operation.** Deducts virtual currency atomically, creates an immutable participation entry, writes a financial transaction log, and evaluates anti-abuse risk scores.

- **Access**: Protected (`Bearer <JWT>`, Rate-limited: 10 req/min)
- **Headers**: `x-device-hash` (Anti-abuse signal)
- **Request Body**:
```json
{
  "prizeId": "PRIZE-IPHONE15",
  "idempotencyKey": "IDEMP-VE10842-GW202608-01"
}
```
*(Note: Client does NOT send amount or currency; backend determines authoritative fees from database).*

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
    "transactionId": "TXN-GW-1724603520000-8F92A",
    "joinedAt": "2026-08-25T16:32:00.000Z"
  },
  "transaction": {
    "transactionId": "TXN-GW-1724603520000-8F92A",
    "amount": 250,
    "currency": "VEs",
    "balanceBefore": 850,
    "balanceAfter": 600,
    "createdAt": "2026-08-25T16:32:00.000Z"
  },
  "wallet": {
    "VEs": 600,
    "SVEs": 1200,
    "Tokens": 5000
  }
}
```
- **Error Responses**:
  - `400 INSUFFICIENT_VE_BALANCE`: User does not possess enough VEs.
  - `400 GIVEAWAY_ENDED`: Server time has passed giveaway deadline.
  - `409 ALREADY_PARTICIPATING`: One entry limit per user per event.
  - `403 PARTICIPATION_BLOCKED`: Anti-abuse threshold exceeded.

---

## 3. Winner Draws & Prize Claims

### `GET /giveaways/:id/winners`
Returns the verified winner list for a completed giveaway.
*(If giveaway is ACTIVE, returns an empty array with `isLive: true` to prevent false winner leaks).*

---

### `POST /giveaways/:id/claim`
Submits prize fulfillment information for a verified winner.

- **Access**: Protected (`Bearer <JWT>`, Authenticated User must match winner record)
- **Physical Prize Request Body (iPhone / Watch / AirPods)**:
```json
{
  "prizeId": "PRIZE-APPLEWATCH9",
  "fullName": "Rohan Sharma",
  "phoneNumber": "9876543210",
  "addressLine": "Flat 402, Lotus Towers, Andheri West",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pinCode": "400053"
}
```
- **Amazon Gift Card Request Body**:
```json
{
  "prizeId": "PRIZE-AMAZON2000",
  "emailAddress": "rohan.winner@example.com"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Prize claim successfully submitted! Our reward fulfillment team will process your dispatch.",
  "claim": {
    "claimId": "CLM-1724603900-X7Q2",
    "status": "SUBMITTED",
    "submittedAt": "2026-08-25T16:35:00.000Z"
  }
}
```

---

## 4. Admin Operations (`/api/admin/*`)
Requires `role: 'admin'`.

- `GET /admin/overview`: Summary metrics (Total users, entries, fraud alerts, pending claims).
- `POST /admin/giveaways/:id/draw-winners`: Triggers cryptographic random winner draw.
- `POST /admin/giveaways/:id/set-status`: Changes event lifecycle (`UPCOMING`, `ACTIVE`, `ENDED`, `ARCHIVED`).
- `GET /admin/fraud-events`: Telemetry log of detected abuse signals and risk scores.
- `GET /admin/claims`: List of submitted prize claims with shipping/email details.
- `POST /admin/claims/:claimId/process`: Updates claim status to `PROCESSING` or `COMPLETED` and attaches tracking numbers.
- `GET /admin/audit-logs`: Immutable system audit ledger.
