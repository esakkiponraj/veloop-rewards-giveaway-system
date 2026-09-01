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
import GiveawayEntryTransaction from '../models/GiveawayEntryTransaction.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import PrizeClaim from '../models/PrizeClaim.js';
import { inMemoryDB } from '../utils/inMemoryStore.js';
import bcrypt from 'bcryptjs';

async function runAudit() {
  console.log('====================================================');
  console.log('🛡️ VELOOP REWARDS — FULL END-TO-END REGRESSION & AUDIT');
  console.log('====================================================\n');

  // Connect to persistent MongoDB Atlas
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing from environment.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`[MongoDB] Connected to database: ${mongoose.connection.host}`);

  // Reset in-memory test records for ad/task/referral/withdrawal test runs
  inMemoryDB.adCompletions = [];
  inMemoryDB.taskClaims = [];
  inMemoryDB.referrals = [];
  inMemoryDB.withdrawals = [];
  inMemoryDB.transactions = [];

  // Dedicated test identifiers
  const userAId = 'USER-AUDIT-ALEX';
  const userBId = 'USER-AUDIT-JORDAN';
  const winnerUserId = 'USER-AUDIT-ROHAN';
  const adminUserId = 'USER-AUDIT-ADMIN';

  const auditGwActiveId = 'GW-AUDIT-ACTIVE';
  const auditGwEndedId = 'GW-AUDIT-ENDED';
  const auditPrizeIphoneId = 'PRIZE-AUDIT-IPHONE';
  const auditPrizeWatchId = 'PRIZE-AUDIT-WATCH';

  const passwordHash = await bcrypt.hash('password123', 8);
  const adminHash = await bcrypt.hash('admin123', 8);

  // Upsert Test Users
  await User.findOneAndUpdate(
    { userId: userAId },
    {
      userId: userAId,
      username: 'Audit Alex',
      email: 'audit.alex@example.com',
      password: passwordHash,
      maskedId: 'VE****A1',
      role: 'user',
      wallet: { VEs: 850, SVEs: 1200, Tokens: 5000 },
      streak: 12,
      lastDailyBonusAt: null,
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { userId: userBId },
    {
      userId: userBId,
      username: 'Audit Jordan',
      email: 'audit.jordan@example.com',
      password: passwordHash,
      maskedId: 'VE****J2',
      role: 'user',
      wallet: { VEs: 120, SVEs: 150, Tokens: 600 },
      streak: 3,
      lastDailyBonusAt: null,
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { userId: winnerUserId },
    {
      userId: winnerUserId,
      username: 'Audit Rohan',
      email: 'audit.rohan@example.com',
      password: passwordHash,
      maskedId: 'VE****R3',
      role: 'user',
      wallet: { VEs: 450, SVEs: 900, Tokens: 3500 },
      streak: 8,
      lastDailyBonusAt: null,
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { userId: adminUserId },
    {
      userId: adminUserId,
      username: 'Audit SuperAdmin',
      email: 'audit.admin@veloop.io',
      password: adminHash,
      maskedId: 'ADMIN****01',
      role: 'admin',
      wallet: { VEs: 99999, SVEs: 99999, Tokens: 999999 },
      streak: 30,
      lastDailyBonusAt: null,
    },
    { upsert: true, new: true }
  );

  // Clean test participations, claims, transactions for idempotent test run
  await GiveawayParticipation.deleteMany({ userId: { $in: [userAId, userBId, winnerUserId] } });
  await GiveawayEntryTransaction.deleteMany({ userId: { $in: [userAId, userBId, winnerUserId] } });
  await PrizeClaim.deleteMany({ userId: { $in: [winnerUserId, userAId] } });

  // Ensure current giveaway & prize exist
  const now = new Date();
  const futureEnd = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);

  const prizeIphone = await Prize.findOneAndUpdate(
    { prizeId: auditPrizeIphoneId },
    {
      prizeId: auditPrizeIphoneId,
      giveawayId: auditGwActiveId,
      name: 'Audit iPhone 15 Pro',
      slug: 'audit-iphone-15-pro',
      position: '1st Prize',
      positionRank: 1,
      image: '/assets/prizes/iphone15pro.svg',
      prizeType: 'PHYSICAL',
      entryCurrency: 'VEs',
      entryAmount: 250,
      winnerCount: 1,
      claimType: 'SHIPPING_ADDRESS',
      marketValue: '₹1,34,900',
    },
    { upsert: true, new: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: auditGwActiveId },
    {
      giveawayId: auditGwActiveId,
      title: 'Audit Active Megadraw',
      slug: 'audit-active-megadraw',
      description: 'Exclusive audit rewards.',
      status: 'ACTIVE',
      startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endAt: futureEnd,
      prizes: [prizeIphone._id],
    },
    { upsert: true }
  );

  // Ensure winner record for Rohan in past giveaway
  const pastPrizeWatch = await Prize.findOneAndUpdate(
    { prizeId: auditPrizeWatchId },
    {
      prizeId: auditPrizeWatchId,
      giveawayId: auditGwEndedId,
      name: 'Audit Apple Watch Series 9',
      slug: 'audit-past-watch',
      position: '1st Prize',
      entryCurrency: 'VEs',
      entryAmount: 200,
      winnerCount: 1,
      image: '/assets/prizes/applewatch.svg',
      prizeType: 'PHYSICAL',
    },
    { upsert: true, new: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: auditGwEndedId },
    {
      giveawayId: auditGwEndedId,
      title: 'Audit Ended Rewards',
      slug: 'audit-ended-rewards',
      status: 'ENDED',
      startAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      prizes: [pastPrizeWatch._id],
    },
    { upsert: true }
  );

  await GiveawayWinner.findOneAndUpdate(
    { userId: winnerUserId, giveawayId: auditGwEndedId },
    {
      giveawayId: auditGwEndedId,
      prizeId: auditPrizeWatchId,
      userId: winnerUserId,
      maskedUserId: 'VE****R3',
      prizeName: 'Audit Apple Watch Series 9',
      prizeType: 'PHYSICAL',
      claimDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      selectionMethod: 'CRYPTOGRAPHIC_RANDOM',
      status: 'SELECTED',
    },
    { upsert: true }
  );

  // Spin up temporary test HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`✅ [PASSED] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAILED] ${message} ${details ? JSON.stringify(details) : ''}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    const healthRes = await fetch(`${baseUrl}/api/health`).then((r) => r.json());
    assert(healthRes.status === 'HEALTHY', 'API health status is HEALTHY');

    // 2. Authentication Flow (User A)
    const loginARes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'audit.alex@example.com', password: 'password123' }),
    }).then((r) => r.json());
    assert(loginARes.success && !!loginARes.token, 'User A authentication with JWT');
    const tokenA = loginARes.token;

    // 3. Authentication Flow (User B)
    const loginBRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'audit.jordan@example.com', password: 'password123' }),
    }).then((r) => r.json());
    assert(loginBRes.success && !!loginBRes.token, 'User B authentication with JWT');
    const tokenB = loginBRes.token;

    // 4. Invalid Login Credentials Block
    const invalidLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'audit.alex@example.com', password: 'wrongPassword' }),
    });
    assert(invalidLogin.status === 401, 'Invalid credentials rejected with HTTP 401');

    // 5. Sponsored Ads Retrieval
    const adsRes = await fetch(`${baseUrl}/api/ads`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(adsRes.success && Array.isArray(adsRes.ads) && adsRes.ads.length > 0, 'Fetched active sponsored ads list');

    // 6. Sponsored Ad Completion & Authoritative Reward Credit (+38 VEs)
    const adId = adsRes.ads[0].adId;
    const adCompleteRes = await fetch(`${baseUrl}/api/ads/${adId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(
      adCompleteRes.success && adCompleteRes.wallet.VEs === 888,
      `Ad completed with authoritative server reward (+38 VEs) -> Balance ${adCompleteRes.wallet?.VEs} VEs`
    );

    // 7. Duplicate Ad Completion Prevention on Same Day
    const dupAdRes = await fetch(`${baseUrl}/api/ads/${adId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(dupAdRes.status === 400, 'Duplicate ad completion on same day rejected (HTTP 400)');

    // 8. Task Quests Retrieval
    const tasksRes = await fetch(`${baseUrl}/api/tasks`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(tasksRes.success && Array.isArray(tasksRes.tasks), 'Fetched task quests inventory');

    // 9. Task Claim & Authoritative Reward Credit (+20 VEs)
    const taskId = tasksRes.tasks[0].taskId;
    const taskClaimRes = await fetch(`${baseUrl}/api/tasks/${taskId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(
      taskClaimRes.success && taskClaimRes.wallet.VEs === 908,
      `Task ${taskId} claimed (+20 VEs) -> Balance ${taskClaimRes.wallet?.VEs} VEs`
    );

    // 10. Duplicate Task Claim Prevention
    const dupTaskRes = await fetch(`${baseUrl}/api/tasks/${taskId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(dupTaskRes.status === 400, 'Duplicate task claim rejected (HTTP 400)');

    // 11. Daily Streak Bonus Claim (+25 VEs)
    const dailyBonusRes = await fetch(`${baseUrl}/api/wallet/daily-bonus`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(
      dailyBonusRes.success && dailyBonusRes.wallet.VEs === 933,
      `Daily bonus claimed (+25 VEs) -> Balance ${dailyBonusRes.wallet?.VEs} VEs`
    );

    // 12. Duplicate Daily Bonus Prevention on Same Day
    const dupDailyRes = await fetch(`${baseUrl}/api/wallet/daily-bonus`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(dupDailyRes.status === 400, 'Second daily bonus claim on same day rejected (HTTP 400)');

    // 13. Referral System - Get Referral Code
    const refRes = await fetch(`${baseUrl}/api/referrals`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(refRes.success && !!refRes.referralCode, 'User A unique referral code retrieved');
    const referralCodeA = refRes.referralCode;

    // 14. Referral System - Self-Referral Prevention
    const selfRefRes = await fetch(`${baseUrl}/api/referrals/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ code: referralCodeA }),
    });
    assert(selfRefRes.status === 400, 'Self-referral blocked (HTTP 400)');

    // 15. Referral System - Legitimate Referral Application (User B uses User A's Code: +50 VEs)
    const applyRefRes = await fetch(`${baseUrl}/api/referrals/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ code: referralCodeA }),
    }).then((r) => r.json());
    assert(
      applyRefRes.success && applyRefRes.wallet.VEs === 170,
      `User B earned +50 VEs welcome bonus -> Balance ${applyRefRes.wallet?.VEs} VEs`
    );

    // 16. Withdrawal - Below Minimum Threshold Prevention
    const lowWithdraw = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ amount: 50, method: 'UPI', address: 'alex@upi' }),
    });
    assert(lowWithdraw.status === 400, 'Withdrawal below minimum threshold rejected (HTTP 400)');

    // 17. Withdrawal - Insufficient Balance Prevention
    const excessWithdraw = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ amount: 5000, method: 'UPI', address: 'alex@upi' }),
    });
    assert(excessWithdraw.status === 400, 'Excessive withdrawal rejected due to insufficient balance (HTTP 400)');

    // 18. Withdrawal - Legitimate Execution & Authoritative Debit (200 VEs debited)
    const validWithdraw = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ amount: 200, method: 'UPI', address: 'alex@upi' }),
    }).then((r) => r.json());
    assert(
      validWithdraw.success && validWithdraw.wallet.VEs === 733 && validWithdraw.withdrawal.status === 'PENDING',
      `Valid withdrawal (200 VEs debited) -> Balance ${validWithdraw.wallet?.VEs} VEs, status PENDING`
    );

    // 19. Transaction Ledger Verification
    const historyARes = await fetch(`${baseUrl}/api/wallet/history`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(
      historyARes.success && Array.isArray(historyARes.transactions) && historyARes.transactions.length > 0,
      'User A transaction history retrieved'
    );

    // 20. Multi-Tenant Ledger Isolation
    const historyBRes = await fetch(`${baseUrl}/api/wallet/history`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    }).then((r) => r.json());
    const userBTransactionsForA = historyBRes.transactions?.filter((t) => t.userId === userAId) || [];
    assert(userBTransactionsForA.length === 0, 'User B ledger completely isolated from User A transactions');

    // 21. Giveaway Participation - Authoritative Fee Deduction (733 - 250 = 483 VEs)
    const joinGiveawayRes = await fetch(`${baseUrl}/api/giveaways/${auditGwActiveId}/prizes/${auditPrizeIphoneId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ idempotencyKey: 'AUDIT-JOIN-KEY-001' }),
    }).then((r) => r.json());
    assert(
      joinGiveawayRes.success && joinGiveawayRes.wallet.VEs === 483,
      `Giveaway join deducts authoritative 250 VEs -> Balance ${joinGiveawayRes.wallet?.VEs} VEs`
    );

    // 22. Giveaway Participation - Duplicate Entry Block with Idempotent Status
    const dupJoinRes = await fetch(`${baseUrl}/api/giveaways/${auditGwActiveId}/prizes/${auditPrizeIphoneId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ idempotencyKey: 'AUDIT-JOIN-KEY-001' }),
    }).then((r) => r.json());
    assert(
      dupJoinRes.success && dupJoinRes.alreadyJoined === true && dupJoinRes.wallet.VEs === 483,
      'Duplicate giveaway participation returns idempotent status, preserves 1 entry in DB and maintains balance at 483 VEs'
    );

    // 23. Winner Claim Flow (Rohan Sharma)
    const winnerLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'audit.rohan@example.com', password: 'password123' }),
    }).then((r) => r.json());
    const winnerToken = winnerLogin.token;

    const claimRes = await fetch(`${baseUrl}/api/giveaways/${auditGwEndedId}/prizes/${auditPrizeWatchId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${winnerToken}`,
      },
      body: JSON.stringify({
        fullName: 'Audit Rohan',
        phoneNumber: '9876543210',
        addressLine1: 'Flat 101, Audit Residency',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      }),
    }).then((r) => r.json());
    assert(claimRes.success && claimRes.claim.status === 'SUBMITTED', 'Verified winner physical prize claim processed');

    // Clean up isolated test records
    await User.deleteMany({ userId: { $in: [userAId, userBId, winnerUserId, adminUserId] } });
    await GiveawayParticipation.deleteMany({ userId: { $in: [userAId, userBId, winnerUserId] } });
    await GiveawayEntryTransaction.deleteMany({ userId: { $in: [userAId, userBId, winnerUserId] } });
    await PrizeClaim.deleteMany({ userId: { $in: [winnerUserId, userAId] } });
    await GiveawayWinner.deleteMany({ userId: winnerUserId, giveawayId: auditGwEndedId });
    await Prize.deleteMany({ prizeId: { $in: [auditPrizeIphoneId, auditPrizeWatchId] } });
    await Giveaway.deleteMany({ giveawayId: { $in: [auditGwActiveId, auditGwEndedId] } });

    console.log('\n====================================================');
    console.log(`🎉 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    server.close();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal audit error:', err);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runAudit();
