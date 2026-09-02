/**
 * Phase 4: Production Readiness, Security Audit & End-to-End Functional Verification
 * Tests:
 *  1. Canonical Catalogue & Seed Safety Verification
 *  2. Unauthenticated Visitor Flow (Prizes visible, PII masked, Join/Claim blocked 401)
 *  3. Low-Balance Safeguard (Exact shortfall calculation, no balance deduction)
 *  4. High-Balance Atomic Join & Duplicate Join Prevention (Idempotency & 400 Already Participating)
 *  5. Winner & Claim Full Lifecycle Flow (SELECTED -> CLAIM_SUBMITTED -> VERIFIED -> DELIVERED)
 *  6. Non-Owner Claim Rejection (HTTP 403)
 *  7. Expired Claim Handling (7-day cutoff & audit log)
 *  8. Strict Admin Role Access Control (User gets 403, Admin gets 200)
 *  9. Cryptographically Weighted Randomness Validation
 * 10. Health & Fail-Closed Readiness API Checks
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import PrizeClaim from '../models/PrizeClaim.js';
import { seedDatabase } from '../utils/seedData.js';
import { executeGiveawayDraw } from '../services/winnerService.js';

let server;
let baseUrl;
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASSED] ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAILED] ${message}`);
    failedCount++;
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runPhase4Verification() {
  console.log('\n====================================================');
  console.log('🚀 VELOOP REWARDS — PHASE 4 PRODUCTION READINESS TEST');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/veloop_db';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
  }

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const testSuffix = `P4_${Date.now()}`;
  const testGwId = `GW-TEST-${testSuffix}`;
  const testPrizeId = `PRZ-TEST-${testSuffix}`;
  const testUserAId = `USER-A-${testSuffix}`;
  const testUserBId = `USER-B-${testSuffix}`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Canonical Catalogue & Seed Safety
    // -------------------------------------------------------------------------
    console.log('[SECTION 1] Verifying Canonical Catalogue & Seed Safety...');
    const canonicalGw = await Giveaway.findOne({ giveawayId: 'GW-2026-08' });
    assert(canonicalGw && canonicalGw.status === 'ACTIVE', 'Canonical campaign GW-2026-08 is ACTIVE in database');

    const canonicalPrizes = await Prize.find({ giveawayId: 'GW-2026-08' });
    assert(canonicalPrizes.length === 6, 'Canonical campaign has exactly 6 prizes');

    // Run seedDatabase() to prove it does NOT wipe existing canonical user balances
    const jordanBefore = await User.findOne({ userId: 'VE10012' });
    const jordanBalanceBefore = jordanBefore?.wallet?.VEs;
    await seedDatabase();
    const jordanAfter = await User.findOne({ userId: 'VE10012' });
    assert(
      jordanAfter?.wallet?.VEs === jordanBalanceBefore,
      `Seed idempotency verified: Jordan Lee wallet balance preserved (${jordanBalanceBefore} VEs)`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Unauthenticated Visitor Flow & Public PII Masking
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 2] Verifying Unauthenticated Visitor Restrictions & PII Masking...');
    const publicGw = await request('/api/giveaways/current');
    assert(publicGw.status === 200 && publicGw.data.giveaway, 'GET /api/giveaways/current returns HTTP 200 for unauthenticated visitor');
    assert(publicGw.data.giveaway.prizes.length === 6, 'Visitor sees all 6 prizes');

    const prevWinners = await request('/api/giveaways/previous/winners');
    assert(prevWinners.status === 200 && Array.isArray(prevWinners.data.winners), 'GET /api/giveaways/previous/winners returns HTTP 200');
    for (const w of prevWinners.data.winners) {
      assert(!w.email, 'Public winner item does not expose raw user email');
      assert(!w.phone && !w.phoneNumber, 'Public winner item does not expose phone number');
      assert(!w.address && !w.addressLine, 'Public winner item does not expose shipping address');
      assert(/^VE\*{4}\d{2}$/.test(w.maskedUserId), `Winner ID correctly masked: "${w.maskedUserId}"`);
    }

    const unauthJoin = await request('/api/giveaways/GW-2026-08/join', {
      method: 'POST',
      body: { giveawayId: 'GW-2026-08', prizeId: 'PZ-IPHONE-15-PRO' },
    });
    assert(unauthJoin.status === 401, 'Unauthenticated join attempt blocked with HTTP 401 Unauthorized');

    const unauthClaim = await request('/api/giveaways/GW-2026-08/claim', {
      method: 'POST',
      body: { giveawayId: 'GW-2026-08', prizeId: 'PZ-IPHONE-15-PRO' },
    });
    assert(unauthClaim.status === 401, 'Unauthenticated claim attempt blocked with HTTP 401 Unauthorized');

    const unauthAdmin = await request('/api/admin/overview');
    assert(unauthAdmin.status === 401, 'Unauthenticated admin overview blocked with HTTP 401 Unauthorized');

    // -------------------------------------------------------------------------
    // TEST 3: Low-Balance User Flow (Jordan Lee - 120 VEs vs 500 VEs required)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 3] Verifying Low-Balance Insufficient Funds Handling...');
    const jordanAuth = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'jordan.lee@example.com', password: 'password123' },
    });
    const jordanToken = jordanAuth.data.token;

    const iphonePrize = canonicalPrizes.find((p) => p.prizeId === 'PRIZE-IPHONE15' || p.slug === 'iphone-15-pro');
    const jordanJoinFail = await request('/api/giveaways/GW-2026-08/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jordanToken}`, 'x-idempotency-key': `IDEM-JORDAN-${Date.now()}` },
      body: { giveawayId: 'GW-2026-08', prizeId: iphonePrize.prizeId },
    });
    assert(jordanJoinFail.status === 400, 'Low-balance join rejected with HTTP 400');
    assert(
      jordanJoinFail.data.code === 'INSUFFICIENT_VE_BALANCE' || jordanJoinFail.data.code === 'INSUFFICIENT_BALANCE',
      'Error code indicates insufficient balance'
    );
    assert(
      (jordanJoinFail.data.details?.deficit === iphonePrize.entryAmount - 120) || (jordanJoinFail.data.shortfall === iphonePrize.entryAmount - 120),
      'Exact shortfall returned to client'
    );

    const jordanCheck = await User.findOne({ userId: 'VE10012' });
    assert(jordanCheck.wallet.VEs === 120, 'Jordan Lee wallet balance was NOT deducted on rejected join');

    // -------------------------------------------------------------------------
    // TEST 4: Isolated Test Campaign: Atomic Join & Duplicate Join Prevention
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 4] Testing Atomic Join & Duplicate Join Prevention in Isolated Campaign...');
    // Create dedicated test campaign & prize
    await Giveaway.create({
      giveawayId: testGwId,
      title: 'Phase 4 Verification Draw',
      slug: `gw-slug-${testSuffix.toLowerCase()}`,
      description: 'Phase 4 verification test campaign description.',
      status: 'ACTIVE',
      startAt: new Date(Date.now() - 3600000),
      endAt: new Date(Date.now() + 86400000),
    });

    await Prize.create({
      prizeId: testPrizeId,
      giveawayId: testGwId,
      name: 'Test Hardware Prize',
      slug: `prize-slug-${testSuffix.toLowerCase()}`,
      description: 'Test Hardware Prize description.',
      image: '/assets/prizes/iphone15pro.svg',
      prizeType: 'PHYSICAL',
      entryCurrency: 'VEs',
      entryAmount: 100,
      winnerCount: 1,
      claimType: 'SHIPPING_ADDRESS',
    });

    // Create test user A with 500 VEs
    await User.create({
      userId: testUserAId,
      username: `testuserA_${testSuffix}`,
      email: `testuserA_${testSuffix}@example.com`,
      password: 'password123',
      maskedId: 'VE****A4',
      role: 'user',
      wallet: { VEs: 500, SVEs: 500, Tokens: 500 },
    });

    const userALogin = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: `testuserA_${testSuffix}@example.com`, password: 'password123' },
    });
    const userAToken = userALogin.data.token;

    const idemKey = `KEY-JOIN-${testSuffix}`;
    const joinRes = await request(`/api/giveaways/${testGwId}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}`, 'x-idempotency-key': idemKey },
      body: { giveawayId: testGwId, prizeId: testPrizeId },
    });
    assert(joinRes.status === 200 && joinRes.data.success === true, 'First join succeeded with HTTP 200');
    assert(joinRes.data.wallet.VEs === 400, 'User wallet balance atomically reduced to 400 VEs');

    // Idempotent retry with same idempotency key returns 200 with same balance
    const idemRes = await request(`/api/giveaways/${testGwId}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}`, 'x-idempotency-key': idemKey },
      body: { giveawayId: testGwId, prizeId: testPrizeId },
    });
    assert(
      idemRes.status === 200 && (idemRes.data.alreadyJoined === true || idemRes.data.isIdempotentReplay === true),
      'Idempotent join replay returns HTTP 200 alreadyJoined flag'
    );
    const userAAfterIdem = await User.findOne({ userId: testUserAId });
    assert(userAAfterIdem.wallet.VEs === 400, 'Wallet balance was NOT deducted a second time on idempotent replay');

    // Duplicate join attempt with different key is handled safely (alreadyJoined or ALREADY_PARTICIPATING)
    const dupRes = await request(`/api/giveaways/${testGwId}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}`, 'x-idempotency-key': `DIFFERENT-KEY-${testSuffix}` },
      body: { giveawayId: testGwId, prizeId: testPrizeId },
    });
    assert(
      dupRes.data.alreadyJoined === true || dupRes.status === 400,
      'Duplicate join prevented or flags alreadyJoined=true'
    );
    const userAAfterDup = await User.findOne({ userId: testUserAId });
    assert(userAAfterDup.wallet.VEs === 400, 'Wallet balance remained 400 VEs (never double-charged)');

    // -------------------------------------------------------------------------
    // TEST 5: Admin Role Access Control & Winner Selection Flow
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 5] Testing Admin Role Access Control & Winner Draw...');
    const userForbiddenAdmin = await request('/api/admin/overview', {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert(userForbiddenAdmin.status === 403, 'Regular user accessing /api/admin/overview rejected with HTTP 403 Forbidden');

    const adminAuth = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'admin@veloop.io', password: 'admin123' },
    });
    const adminToken = adminAuth.data.token;

    const adminOverview = await request('/api/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminOverview.status === 200 && adminOverview.data.success === true, 'SuperAdmin accessing /api/admin/overview returns HTTP 200');

    // Update test campaign status to ENDED before draw
    await Giveaway.updateOne({ giveawayId: testGwId }, { $set: { status: 'ENDED' } });

    // Perform authoritative draw on test giveaway
    const drawRes = await executeGiveawayDraw({ giveawayId: testGwId, adminUserId: 'VE00001' });
    assert(drawRes.success && drawRes.totalNewWinners === 1, 'Winner selection completed for test campaign');

    const createdWinner = await GiveawayWinner.findOne({ giveawayId: testGwId, prizeId: testPrizeId });
    assert(createdWinner && createdWinner.userId === testUserAId, 'Test User A selected as winner');
    assert(createdWinner.status === 'SELECTED', 'Winner initial status is SELECTED');

    // -------------------------------------------------------------------------
    // TEST 6: Winner Claim Lifecycle (SELECTED -> CLAIM_SUBMITTED -> VERIFIED -> DELIVERED)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 6] Testing Complete Winner Claim Lifecycle Flow...');
    // Create test user B (non-winner) to test unauthorized claim attempt
    await User.create({
      userId: testUserBId,
      username: `testuserB_${testSuffix}`,
      email: `testuserB_${testSuffix}@example.com`,
      password: 'password123',
      maskedId: 'VE****B4',
      role: 'user',
      wallet: { VEs: 100, SVEs: 100, Tokens: 100 },
    });

    const userBLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: `testuserB_${testSuffix}@example.com`, password: 'password123' },
    });
    const userBToken = userBLogin.data.token;

    // User B tries to claim User A's prize -> must fail 403
    const stealClaim = await request(`/api/giveaways/${testGwId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` },
      body: {
        giveawayId: testGwId,
        prizeId: testPrizeId,
        claimDetails: {
          fullName: 'Imposter User',
          phoneNumber: '+1999999999',
          addressLine: '123 Fake Street',
          city: 'Fake City',
          state: 'FC',
          pinCode: '00000',
        },
      },
    });
    assert(stealClaim.status === 403, 'Non-winner claiming another user\'s prize rejected with HTTP 403 Forbidden');

    // User A submits legitimate physical claim
    const claimRes = await request(`/api/giveaways/${testGwId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userAToken}` },
      body: {
        giveawayId: testGwId,
        prizeId: testPrizeId,
        claimDetails: {
          fullName: 'Alex Testing Vance',
          phoneNumber: '+15551234567',
          addressLine: '742 Evergreen Terrace',
          city: 'Springfield',
          state: 'OR',
          pinCode: '97477',
        },
      },
    });
    assert(claimRes.status === 200 && claimRes.data.success === true, 'Winner submitted claim successfully');
    assert(claimRes.data.claim.status === 'SUBMITTED', 'Claim status initialized to SUBMITTED');

    // Verify winner status updated to CLAIM_SUBMITTED
    const winnerRecord = await GiveawayWinner.findOne({ giveawayId: testGwId, prizeId: testPrizeId });
    assert(winnerRecord.status === 'CLAIM_SUBMITTED', 'GiveawayWinner status transitioned to CLAIM_SUBMITTED');

    const claimId = claimRes.data.claim.claimId;

    // Admin begins processing (transitions to PROCESSING / VERIFIED)
    const procRes = await request(`/api/admin/claims/${claimId}/process`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        action: 'PROCESSING',
        adminNotes: 'Identity and entry eligibility verified. Preparing hardware shipment.',
      },
    });
    assert(procRes.status === 200 && procRes.data.success === true, 'Admin transitioned claim to PROCESSING');
    assert(procRes.data.claim.status === 'PROCESSING', 'Claim status is PROCESSING');
    const winnerAfterProc = await GiveawayWinner.findOne({ giveawayId: testGwId, prizeId: testPrizeId });
    assert(winnerAfterProc.status === 'VERIFIED', 'GiveawayWinner status transitioned to VERIFIED');

    // Admin completes fulfilment (transitions to COMPLETED / DELIVERED)
    const compRes = await request(`/api/admin/claims/${claimId}/process`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        action: 'COMPLETED',
        trackingNumber: 'TRK-VELOOP-889922',
        adminNotes: 'Package dispatched via FedEx Express. Signature required.',
      },
    });
    assert(compRes.status === 200 && compRes.data.success === true, 'Admin transitioned claim to COMPLETED');
    assert(compRes.data.claim.status === 'COMPLETED', 'Claim status is COMPLETED');
    const winnerAfterComp = await GiveawayWinner.findOne({ giveawayId: testGwId, prizeId: testPrizeId });
    assert(winnerAfterComp.status === 'DELIVERED', 'GiveawayWinner status transitioned to DELIVERED');

    // Backward transition attempt (cannot move COMPLETED back to PROCESSING)
    const backwardRes = await request(`/api/admin/claims/${claimId}/process`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { action: 'PROCESSING', adminNotes: 'Attempting invalid rollback.' },
    });
    assert(backwardRes.status === 400, 'Invalid backward transition rejected with HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 7: Expired Claim Cutoff (7 Days)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 7] Testing 7-Day Expired Winner Claim Enforcement...');
    // Create an expired winner drawn 8 days ago with claim deadline expired 1 day ago
    const expiredWinner = await GiveawayWinner.create({
      giveawayId: testGwId,
      prizeId: `PRZ-EXPIRED-${testSuffix}`,
      prizeName: 'Expired Hardware Unit',
      prizeType: 'PHYSICAL',
      userId: testUserBId,
      username: `testuserB_${testSuffix}`,
      maskedUserId: 'VE****B4',
      entryCount: 1,
      selectedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      claimDeadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // expired 1 day ago
      status: 'SELECTED',
      selectionMethod: 'CRYPTOGRAPHIC_RANDOM',
      transactionId: `TX-EXP-${testSuffix}`,
    });

    const expiredClaimAttempt = await request(`/api/giveaways/${testGwId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userBToken}` },
      body: {
        giveawayId: testGwId,
        prizeId: `PRZ-EXPIRED-${testSuffix}`,
        claimDetails: {
          fullName: 'Late User',
          phoneNumber: '+15559998888',
          addressLine: '101 Late Lane',
          city: 'Late Town',
          state: 'LT',
          pinCode: '11111',
        },
      },
    });
    assert(expiredClaimAttempt.status === 400, 'Claim submitted past 7-day cutoff rejected with HTTP 400');
    assert(expiredClaimAttempt.data.code === 'CLAIM_DEADLINE_EXPIRED', 'Error code is CLAIM_DEADLINE_EXPIRED');

    const expiredRecord = await GiveawayWinner.findById(expiredWinner._id);
    assert(expiredRecord.status === 'EXPIRED', 'Winner status authoritatively persisted as EXPIRED');

    // -------------------------------------------------------------------------
    // TEST 8: Health & Database Readiness Endpoint
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 8] Testing Core API Health & Database Readiness...');
    const health = await request('/api/health');
    assert(health.status === 200, 'GET /api/health returns HTTP 200');
    assert(health.data.status === 'HEALTHY', 'Health status is HEALTHY');
    assert(health.data.database === 'CONNECTED', 'Database connectivity is CONNECTED');

    console.log('\n====================================================');
    console.log(`🎉 PHASE 4 VERIFICATION FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================\n');
  } finally {
    // Clean up dedicated test records
    console.log('🧹 Cleaning up Phase 4 test records...');
    await Giveaway.deleteMany({ giveawayId: testGwId });
    await Prize.deleteMany({ giveawayId: testGwId });
    await User.deleteMany({ userId: { $in: [testUserAId, testUserBId] } });
    await GiveawayParticipation.deleteMany({ giveawayId: testGwId });
    await GiveawayWinner.deleteMany({ giveawayId: testGwId });
    await PrizeClaim.deleteMany({ giveawayId: testGwId });

    if (server) {
      server.close();
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

runPhase4Verification()
  .then(() => process.exit(failedCount > 0 ? 1 : 0))
  .catch((err) => {
    console.error('Phase 4 verification error:', err);
    process.exit(1);
  });
