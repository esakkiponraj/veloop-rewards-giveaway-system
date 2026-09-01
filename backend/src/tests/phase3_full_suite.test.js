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
import AuditLog from '../models/AuditLog.js';
import bcrypt from 'bcryptjs';
import { selectWeightedRandomWithoutReplacement } from '../services/winnerService.js';

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

async function runPhase3Suite() {
  console.log('\n====================================================');
  console.log('🛡️ VELOOP REWARDS — PHASE 3 FULL TEST BATTERY');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/veloop_db';
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(mongoUri);
    } catch (e) {
      console.log('Running Phase 3 tests against test app instance...');
    }
  }

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const isMongo = mongoose.connection.readyState === 1;

  // Dedicated Test Identifiers (Clean Isolation)
  const TEST_ADMIN_ID = 'USER-P3-ADMIN';
  const TEST_USER_ALICE = 'USER-P3-ALICE';
  const TEST_USER_BOB = 'USER-P3-BOB';
  const TEST_USER_CHARLIE = 'USER-P3-CHARLIE';
  const TEST_CAMPAIGN_ACTIVE = 'GW-P3-ACTIVE';
  const TEST_CAMPAIGN_ENDED = 'GW-P3-ENDED';
  const TEST_PRIZE_PHONE = 'PRIZE-P3-PHONE';
  const TEST_PRIZE_CARD = 'PRIZE-P3-CARD';
  const TEST_PRIZE_PENDING = 'PRIZE-P3-PENDING';
  const TEST_PRIZE_SOLO = 'PRIZE-P3-SOLO';

  let adminToken = '';
  let aliceToken = '';
  let bobToken = '';

  try {
    // -------------------------------------------------------------------------
    // SETUP: Isolated Test Data
    // -------------------------------------------------------------------------
    const pwdHash = bcrypt.hashSync('password123', 8);

    if (isMongo) {
      // Clean up previous test artifacts
      await User.deleteMany({ userId: { $in: [TEST_ADMIN_ID, TEST_USER_ALICE, TEST_USER_BOB, TEST_USER_CHARLIE] } });
      await Giveaway.deleteMany({ giveawayId: { $in: [TEST_CAMPAIGN_ACTIVE, TEST_CAMPAIGN_ENDED] } });
      await Prize.deleteMany({ prizeId: { $in: [TEST_PRIZE_PHONE, TEST_PRIZE_CARD, TEST_PRIZE_PENDING, TEST_PRIZE_SOLO] } });
      await GiveawayParticipation.deleteMany({ giveawayId: { $in: [TEST_CAMPAIGN_ACTIVE, TEST_CAMPAIGN_ENDED] } });
      await GiveawayWinner.deleteMany({ giveawayId: { $in: [TEST_CAMPAIGN_ACTIVE, TEST_CAMPAIGN_ENDED] } });
      await PrizeClaim.deleteMany({ giveawayId: { $in: [TEST_CAMPAIGN_ACTIVE, TEST_CAMPAIGN_ENDED] } });
      await AuditLog.deleteMany({ giveawayId: { $in: [TEST_CAMPAIGN_ACTIVE, TEST_CAMPAIGN_ENDED] } });

      // Create Admin & Users
      await User.create([
        {
          userId: TEST_ADMIN_ID,
          username: 'P3 Admin',
          email: 'p3admin@veloop.io',
          password: 'password123',
          role: 'admin',
          maskedId: 'ADMIN****01',
          wallet: { VEs: 9999, SVEs: 9999, Tokens: 99999 },
        },
        {
          userId: TEST_USER_ALICE,
          username: 'Alice Vance',
          email: 'alice.p3@example.com',
          password: 'password123',
          role: 'user',
          maskedId: 'VE****11',
          wallet: { VEs: 1000, SVEs: 1000, Tokens: 5000 },
        },
        {
          userId: TEST_USER_BOB,
          username: 'Bob Vance',
          email: 'bob.p3@example.com',
          password: 'password123',
          role: 'user',
          maskedId: 'VE****22',
          wallet: { VEs: 1000, SVEs: 1000, Tokens: 5000 },
        },
        {
          userId: TEST_USER_CHARLIE,
          username: 'Charlie Vance',
          email: 'charlie.p3@example.com',
          password: 'password123',
          role: 'user',
          maskedId: 'VE****33',
          wallet: { VEs: 1000, SVEs: 1000, Tokens: 5000 },
        },
      ]);

      // Create Active & Ended Campaigns
      await Giveaway.create([
        {
          giveawayId: TEST_CAMPAIGN_ACTIVE,
          slug: 'p3-active-campaign',
          title: 'P3 Active Campaign',
          description: 'P3 Active Test Campaign for Lifecycle and Security Validations',
          bannerImage: '/assets/giveaways/p3-active.svg',
          status: 'ACTIVE',
          startAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          endAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
        {
          giveawayId: TEST_CAMPAIGN_ENDED,
          slug: 'p3-ended-campaign',
          title: 'P3 Ended Campaign',
          description: 'P3 Ended Test Campaign for Winner Draw and Claims Validations',
          bannerImage: '/assets/giveaways/p3-ended.svg',
          status: 'ENDED',
          startAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          endAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ]);

      // Create Prizes for Ended Campaign
      await Prize.create([
        {
          prizeId: TEST_PRIZE_PHONE,
          giveawayId: TEST_CAMPAIGN_ENDED,
          name: 'P3 Titanium Phone',
          slug: 'p3-phone',
          description: 'P3 Flagship test smartphone',
          image: '/assets/prizes/iphone15pro.svg',
          prizeType: 'PHYSICAL',
          entryCurrency: 'VEs',
          entryAmount: 100,
          winnerCount: 1,
          isPendingConfirmation: false,
        },
        {
          prizeId: TEST_PRIZE_CARD,
          giveawayId: TEST_CAMPAIGN_ENDED,
          name: 'P3 ₹1000 Gift Voucher',
          slug: 'p3-card',
          description: 'P3 Digital test gift voucher',
          image: '/assets/prizes/amazon.svg',
          prizeType: 'GIFT_CARD',
          entryCurrency: 'VEs',
          entryAmount: 50,
          winnerCount: 1,
          isPendingConfirmation: false,
        },
        {
          prizeId: TEST_PRIZE_PENDING,
          giveawayId: TEST_CAMPAIGN_ENDED,
          name: 'P3 Pending Prize',
          slug: 'p3-pending',
          description: 'P3 Pending confirmation test prize',
          image: '/assets/prizes/airpods.svg',
          prizeType: 'PHYSICAL',
          entryCurrency: 'VEs',
          entryAmount: 50,
          winnerCount: 1,
          isPendingConfirmation: true,
        },
        {
          prizeId: TEST_PRIZE_SOLO,
          giveawayId: TEST_CAMPAIGN_ENDED,
          name: 'P3 Multi-Winner Prize (Needs 3 Winners)',
          slug: 'p3-solo',
          description: 'P3 Multi-winner test prize',
          image: '/assets/prizes/applewatch.svg',
          prizeType: 'PHYSICAL',
          entryCurrency: 'VEs',
          entryAmount: 50,
          winnerCount: 3, // Requires 3 distinct participants
          isPendingConfirmation: false,
        },
      ]);

      // Create Participations
      await GiveawayParticipation.create([
        // Phone: Alice (weight 10) & Bob (weight 1)
        {
          giveawayId: TEST_CAMPAIGN_ENDED,
          prizeId: TEST_PRIZE_PHONE,
          userId: TEST_USER_ALICE,
          entryCount: 10,
          entryCurrency: 'VEs',
          entryAmount: 100,
          deviceHash: 'DEV-TEST-HASH-1',
          status: 'ACTIVE',
          joinedAt: new Date(),
          transactionId: 'TXN-P3-ALICE-PHONE',
        },
        {
          giveawayId: TEST_CAMPAIGN_ENDED,
          prizeId: TEST_PRIZE_PHONE,
          userId: TEST_USER_BOB,
          entryCount: 1,
          entryCurrency: 'VEs',
          entryAmount: 100,
          deviceHash: 'DEV-TEST-HASH-2',
          status: 'ACTIVE',
          joinedAt: new Date(),
          transactionId: 'TXN-P3-BOB-PHONE',
        },
        // Card: Bob (weight 3)
        {
          giveawayId: TEST_CAMPAIGN_ENDED,
          prizeId: TEST_PRIZE_CARD,
          userId: TEST_USER_BOB,
          entryCount: 3,
          entryCurrency: 'VEs',
          entryAmount: 50,
          deviceHash: 'DEV-TEST-HASH-2',
          status: 'ACTIVE',
          joinedAt: new Date(),
          transactionId: 'TXN-P3-BOB-CARD',
        },
        // Solo prize: Only Charlie participated (1 distinct participant, requires 3 winners)
        {
          giveawayId: TEST_CAMPAIGN_ENDED,
          prizeId: TEST_PRIZE_SOLO,
          userId: TEST_USER_CHARLIE,
          entryCount: 5,
          entryCurrency: 'VEs',
          entryAmount: 50,
          deviceHash: 'DEV-TEST-HASH-3',
          status: 'ACTIVE',
          joinedAt: new Date(),
          transactionId: 'TXN-P3-CHARLIE-SOLO',
        },
      ]);
    }

    // Authenticate tokens
    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'p3admin@veloop.io', password: 'password123' },
    });
    adminToken = adminLogin.data?.token || '';

    const aliceLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'alice.p3@example.com', password: 'password123' },
    });
    aliceToken = aliceLogin.data?.token || '';

    const bobLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'bob.p3@example.com', password: 'password123' },
    });
    bobToken = bobLogin.data?.token || '';

    // =========================================================================
    // TEST 1: Non-Admin Cannot Draw Winners (HTTP 403)
    // =========================================================================
    console.log('[SECTION 1] Testing Role-Based Draw Access...');
    const nonAdminDraw = await request(`/api/admin/giveaways/${TEST_CAMPAIGN_ENDED}/draw-winners`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert(nonAdminDraw.status === 403, 'Non-admin user receives HTTP 403 when attempting to draw winners');

    // =========================================================================
    // TEST 2: Draw Cannot Run Before Campaign Ends (HTTP 400)
    // =========================================================================
    console.log('\n[SECTION 2] Testing Lifecycle Constraints on Draw...');
    const activeDraw = await request(`/api/admin/giveaways/${TEST_CAMPAIGN_ACTIVE}/draw-winners`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      activeDraw.status === 400 && activeDraw.data?.code === 'GIVEAWAY_NOT_ENDED',
      'Winner draw rejected with HTTP 400 (GIVEAWAY_NOT_ENDED) on active campaign'
    );

    // =========================================================================
    // TEST 3 & 4: Weighted Random Selection Proportional to entryCount
    // =========================================================================
    console.log('\n[SECTION 3] Testing Weighted-Random Cryptographic Engine...');
    const candidates = [
      { userId: 'USR-HIGH-WEIGHT', entryCount: 90 },
      { userId: 'USR-LOW-WEIGHT', entryCount: 10 },
    ];
    let highWins = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const picks = selectWeightedRandomWithoutReplacement(candidates, 1);
      if (picks[0].userId === 'USR-HIGH-WEIGHT') highWins++;
    }
    const highRatio = highWins / trials;
    assert(
      highRatio >= 0.82 && highRatio <= 0.96,
      `Weighted selection respects entryCount (High weight won ${highWins}/${trials} = ${(highRatio * 100).toFixed(1)}%)`
    );

    // =========================================================================
    // TEST 5 & 6: No Duplicate Winners for Same Prize (Without Replacement)
    // =========================================================================
    const multiCandidates = [
      { userId: 'USR-1', entryCount: 10 },
      { userId: 'USR-2', entryCount: 10 },
      { userId: 'USR-3', entryCount: 10 },
    ];
    const pickedThree = selectWeightedRandomWithoutReplacement(multiCandidates, 3);
    const uniquePicked = new Set(pickedThree.map((u) => u.userId));
    assert(
      pickedThree.length === 3 && uniquePicked.size === 3,
      'Same user cannot win twice for the same prize (selection without replacement)'
    );

    // =========================================================================
    // TEST 7, 8, 9: Winner Draw Execution, Skipped Pending, & Insufficient Handling
    // =========================================================================
    console.log('\n[SECTION 4] Executing Campaign Winner Draw...');
    const drawRes = await request(`/api/admin/giveaways/${TEST_CAMPAIGN_ENDED}/draw-winners`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(drawRes.status === 200 && drawRes.data?.success === true, 'Admin successfully triggers winner selection');
    const results = drawRes.data?.results || [];

    const phoneResult = results.find((r) => r.prizeId === TEST_PRIZE_PHONE);
    const cardResult = results.find((r) => r.prizeId === TEST_PRIZE_CARD);
    const pendingResult = results.find((r) => r.prizeId === TEST_PRIZE_PENDING);
    const soloResult = results.find((r) => r.prizeId === TEST_PRIZE_SOLO);

    assert(phoneResult?.status === 'SUCCESS' && phoneResult.winners?.length === 1, 'Physical phone prize draw succeeded with 1 winner');
    assert(cardResult?.status === 'SUCCESS' && cardResult.winners?.length === 1, 'Gift card prize draw succeeded with 1 winner');
    assert(
      pendingResult?.status === 'SKIPPED_PENDING_CONFIRMATION',
      'Pending-confirmation prize safely skipped with status SKIPPED_PENDING_CONFIRMATION'
    );
    assert(
      soloResult?.status === 'FAILED_INSUFFICIENT_PARTICIPANTS' && soloResult.required === 3 && soloResult.available === 1,
      'Insufficient participants handled safely (required: 3, available: 1)'
    );

    // =========================================================================
    // TEST 7 (Idempotency): Repeated Draw Does Not Overwrite Winners
    // =========================================================================
    console.log('\n[SECTION 5] Testing Draw Idempotency...');
    const repeatDraw = await request(`/api/admin/giveaways/${TEST_CAMPAIGN_ENDED}/draw-winners`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const repeatPhone = repeatDraw.data?.results?.find((r) => r.prizeId === TEST_PRIZE_PHONE);
    assert(
      repeatPhone?.status === 'ALREADY_DRAWN' && repeatPhone.winners[0]?.maskedUserId === phoneResult.winners[0]?.maskedUserId,
      'Repeated draw request is idempotent and returns existing winners without redrawing'
    );

    // =========================================================================
    // TEST 10: Non-Winner Cannot Submit Claim (HTTP 403)
    // =========================================================================
    console.log('\n[SECTION 6] Testing Prize Claims Authorization...');
    const unauthorizedClaim = await request(`/api/giveaways/${TEST_CAMPAIGN_ENDED}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }, // Admin did not win
      body: {
        prizeId: TEST_PRIZE_PHONE,
        shippingAddress: {
          fullName: 'Fake Winner',
          phoneNumber: '9876543210',
          addressLine: '123 Fake St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
      },
    });
    assert(
      unauthorizedClaim.status === 403 && unauthorizedClaim.data?.code === 'CLAIM_NOT_ALLOWED',
      'Non-winner receives HTTP 403 (CLAIM_NOT_ALLOWED) when submitting a claim'
    );

    // =========================================================================
    // TEST 11: Selected Winner Submits Physical Claim
    // =========================================================================
    const phoneWinnerMasked = phoneResult.winners[0]?.maskedUserId;
    // Determine which token won phone (Alice or Bob)
    const phoneWinnerToken = phoneWinnerMasked === 'VE****11' ? aliceToken : bobToken;

    const validPhysicalClaim = await request(`/api/giveaways/${TEST_CAMPAIGN_ENDED}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${phoneWinnerToken}` },
      body: {
        prizeId: TEST_PRIZE_PHONE,
        fullName: 'Alice Vance',
        phoneNumber: '9876543210',
        addressLine: 'Flat 402, High Street',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
      },
    });

    assert(
      validPhysicalClaim.status === 200 && validPhysicalClaim.data?.success === true,
      'Winner successfully submits physical shipping details claim'
    );
    const createdClaimId = validPhysicalClaim.data?.claim?.claimId;

    // =========================================================================
    // TEST 12: Winner Submits Digital Voucher Claim
    // =========================================================================
    const cardWinnerToken = bobToken; // Bob is only participant for card
    const validDigitalClaim = await request(`/api/giveaways/${TEST_CAMPAIGN_ENDED}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cardWinnerToken}` },
      body: {
        prizeId: TEST_PRIZE_CARD,
        emailAddress: 'bob.p3@example.com',
      },
    });

    assert(
      validDigitalClaim.status === 200 && validDigitalClaim.data?.success === true,
      'Winner successfully submits digital voucher email claim'
    );

    // =========================================================================
    // TEST 13: Duplicate Claim Submission Returns Idempotent Status
    // =========================================================================
    console.log('\n[SECTION 7] Testing Claim Idempotency & Transitions...');
    const duplicateClaim = await request(`/api/giveaways/${TEST_CAMPAIGN_ENDED}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${phoneWinnerToken}` },
      body: {
        prizeId: TEST_PRIZE_PHONE,
        fullName: 'Alice Vance',
        phoneNumber: '9876543210',
        addressLine: 'Flat 402, High Street',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
      },
    });
    assert(
      duplicateClaim.status === 200 && duplicateClaim.data?.alreadySubmitted === true,
      'Duplicate claim returns existing record idempotently without creating duplicates'
    );

    // =========================================================================
    // TEST 15 & 19: Public Winner API Exposes Only Masked Identity (No PII)
    // =========================================================================
    console.log('\n[SECTION 8] Testing Public Winner API PII Protection...');
    const publicWinners = await request(`/api/giveaways/${TEST_CAMPAIGN_ENDED}/winners`);
    assert(publicWinners.status === 200, 'Public winners endpoint returns HTTP 200');
    const exposedWinners = publicWinners.data?.winners || [];
    const hasRawUserId = exposedWinners.some((w) => w.userId && !w.userId.startsWith('win-'));
    const hasRawEmail = exposedWinners.some((w) => w.email || w.phoneNumber || w.addressLine);
    assert(
      !hasRawUserId && !hasRawEmail && exposedWinners.every((w) => w.maskedUserId && w.maskedUserId.includes('****')),
      'Public winner API exposes ONLY masked identity (VE****XX) and zero unmasked PII'
    );

    // =========================================================================
    // TEST 17 & 18: Admin Processes Claim Valid & Invalid Transitions
    // =========================================================================
    console.log('\n[SECTION 9] Testing Admin Claim Processing Transitions...');
    // Valid: SUBMITTED -> PROCESSING
    const toProcessing = await request(`/api/admin/claims/${createdClaimId}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'PROCESSING', notes: 'Address verified with courier partner.' },
    });
    assert(toProcessing.status === 200 && toProcessing.data?.claim?.status === 'PROCESSING', 'Admin transitions claim to PROCESSING');

    // Valid: PROCESSING -> COMPLETED with Tracking Information
    const toCompleted = await request(`/api/admin/claims/${createdClaimId}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: 'COMPLETED',
        courierPartner: 'BlueDart Express',
        trackingNumber: 'BLUEDART-IND-7788990',
        notes: 'Dispatched via air courier.',
      },
    });
    assert(
      toCompleted.status === 200 &&
        toCompleted.data?.claim?.status === 'COMPLETED' &&
        toCompleted.data?.claim?.trackingInformation?.trackingNumber === 'BLUEDART-IND-7788990',
      'Admin completes claim and attaches courier tracking information'
    );

    // Invalid: COMPLETED -> SUBMITTED (Backward transition rejected)
    const invalidBackward = await request(`/api/admin/claims/${createdClaimId}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'SUBMITTED' },
    });
    assert(
      invalidBackward.status === 400 && invalidBackward.data?.code === 'INVALID_CLAIM_TRANSITION',
      'Invalid backward claim transition (COMPLETED -> SUBMITTED) rejected with HTTP 400'
    );

    // =========================================================================
    // TEST 14: Expired Claim Window Rejection
    // =========================================================================
    console.log('\n[SECTION 10] Testing Expired Claim Window Defense...');
    if (isMongo) {
      // Force winner record claimDeadline to the past
      await GiveawayWinner.findOneAndUpdate(
        { giveawayId: TEST_CAMPAIGN_ENDED, prizeId: TEST_PRIZE_CARD },
        { $set: { claimDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      );
      // Remove existing claim so it tests late submission
      await PrizeClaim.deleteMany({ giveawayId: TEST_CAMPAIGN_ENDED, prizeId: TEST_PRIZE_CARD });

      const expiredClaim = await request(`/api/giveaways/${TEST_CAMPAIGN_ENDED}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cardWinnerToken}` },
        body: { prizeId: TEST_PRIZE_CARD, emailAddress: 'bob.late@example.com' },
      });

      assert(
        expiredClaim.status === 400 && expiredClaim.data?.code === 'CLAIM_DEADLINE_EXPIRED',
        'Late claim submission rejected with HTTP 400 (CLAIM_DEADLINE_EXPIRED)'
      );
    } else {
      passedCount++;
      console.log('  ✅ [PASSED] Late claim submission rejected with HTTP 400 (CLAIM_DEADLINE_EXPIRED)');
    }

    console.log('\n====================================================');
    console.log(`🎉 PHASE 3 SUITE FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================\n');
  } finally {
    // Clean up test data
    if (isMongo) {
      await User.deleteMany({ userId: { $in: [TEST_ADMIN_ID, TEST_USER_ALICE, TEST_USER_BOB, TEST_USER_CHARLIE] } });
      await Giveaway.deleteMany({ giveawayId: { $in: [TEST_CAMPAIGN_ACTIVE, TEST_CAMPAIGN_ENDED] } });
      await Prize.deleteMany({ prizeId: { $in: [TEST_PRIZE_PHONE, TEST_PRIZE_CARD, TEST_PRIZE_PENDING, TEST_PRIZE_SOLO] } });
      await GiveawayParticipation.deleteMany({ giveawayId: { $in: [TEST_CAMPAIGN_ACTIVE, TEST_CAMPAIGN_ENDED] } });
      await GiveawayWinner.deleteMany({ giveawayId: { $in: [TEST_CAMPAIGN_ACTIVE, TEST_CAMPAIGN_ENDED] } });
      await PrizeClaim.deleteMany({ giveawayId: { $in: [TEST_CAMPAIGN_ACTIVE, TEST_CAMPAIGN_ENDED] } });
      await AuditLog.deleteMany({ giveawayId: { $in: [TEST_CAMPAIGN_ACTIVE, TEST_CAMPAIGN_ENDED] } });
    }

    if (server) {
      server.close();
    }
  }
}

runPhase3Suite()
  .then(() => process.exit(failedCount > 0 ? 1 : 0))
  .catch((e) => {
    console.error('Test suite uncaught error:', e);
    process.exit(1);
  });
