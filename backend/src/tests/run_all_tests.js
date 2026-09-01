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

  // Seed / ensure initial test state exists in MongoDB Atlas
  const passwordHash = await bcrypt.hash('password123', 8);
  const adminHash = await bcrypt.hash('admin123', 8);

  // Upsert Test Users
  await User.findOneAndUpdate(
    { userId: 'VE10842' },
    {
      userId: 'VE10842',
      username: 'Alex Vance',
      email: 'alex.vance@example.com',
      password: passwordHash,
      maskedId: 'VE****42',
      role: 'user',
      wallet: { VEs: 850, SVEs: 1200, Tokens: 5000 },
      streak: 12,
      lastDailyBonusAt: null,
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { userId: 'VE10012' },
    {
      userId: 'VE10012',
      username: 'Jordan Lee',
      email: 'jordan.lee@example.com',
      password: passwordHash,
      maskedId: 'VE****12',
      role: 'user',
      wallet: { VEs: 120, SVEs: 150, Tokens: 600 },
      streak: 3,
      lastDailyBonusAt: null,
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { userId: 'VE10025' },
    {
      userId: 'VE10025',
      username: 'Rohan Sharma',
      email: 'rohan.winner@example.com',
      password: passwordHash,
      maskedId: 'VE****25',
      role: 'user',
      wallet: { VEs: 450, SVEs: 900, Tokens: 3500 },
      streak: 8,
      lastDailyBonusAt: null,
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { userId: 'VE00001' },
    {
      userId: 'VE00001',
      username: 'VELOOP SuperAdmin',
      email: 'admin@veloop.io',
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
  await GiveawayParticipation.deleteMany({ userId: { $in: ['VE10842', 'VE10012'] } });
  await GiveawayEntryTransaction.deleteMany({ userId: { $in: ['VE10842', 'VE10012'] } });
  await PrizeClaim.deleteMany({ userId: { $in: ['VE10025'] } });

  // Ensure current giveaway & prize exist
  const currentGiveawayId = 'GW-2026-08';
  const now = new Date();
  const futureEnd = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);

  const prizeIphone = await Prize.findOneAndUpdate(
    { prizeId: 'PRIZE-IPHONE15' },
    {
      prizeId: 'PRIZE-IPHONE15',
      giveawayId: currentGiveawayId,
      name: 'iPhone 15 Pro (128GB)',
      slug: 'iphone-15-pro',
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
    { giveawayId: currentGiveawayId },
    {
      giveawayId: currentGiveawayId,
      title: 'Summer Rewards Megadraw 2026',
      slug: 'summer-rewards-megadraw',
      description: 'Exclusive summer hardware and voucher rewards.',
      status: 'ACTIVE',
      startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endAt: futureEnd,
      prizes: [prizeIphone._id],
    },
    { upsert: true }
  );

  // Ensure winner record for Rohan Sharma in past giveaway
  await GiveawayWinner.findOneAndUpdate(
    { userId: 'VE10025', giveawayId: 'GW-2026-07' },
    {
      giveawayId: 'GW-2026-07',
      prizeId: 'PRIZE-PAST-WATCH',
      userId: 'VE10025',
      maskedUserId: 'VE****25',
      prizeName: 'Apple Watch Series 9',
      prizeType: 'PHYSICAL',
      claimDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      selectionMethod: 'CRYPTOGRAPHIC_RANDOM',
      status: 'SELECTED',
    },
    { upsert: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: 'GW-2026-07' },
    {
      giveawayId: 'GW-2026-07',
      title: 'Monsoon Kickoff Rewards 2026',
      slug: 'monsoon-kickoff-rewards',
      description: 'Completed giveaway event.',
      status: 'ENDED',
      startAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      prizes: [],
    },
    { upsert: true }
  );

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
    const health = await fetch(`${baseUrl}/api/health`).then((r) => r.json());
    assert(health.status === 'HEALTHY', 'API health status is HEALTHY');

    // 2. Authentication: User A (Alex Vance)
    const loginA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'alex.vance@example.com', password: 'password123' }),
    }).then((r) => r.json());
    assert(loginA.success && loginA.user.userId === 'VE10842', 'User A authentication with JWT');
    const tokenA = loginA.token;

    // 3. Authentication: User B (Jordan Lee)
    const loginB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'jordan.lee@example.com', password: 'password123' }),
    }).then((r) => r.json());
    assert(loginB.success && loginB.user.userId === 'VE10012', 'User B authentication with JWT');
    const tokenB = loginB.token;

    // 4. Invalid Login
    const invalidLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'alex.vance@example.com', password: 'badpassword' }),
    });
    assert(invalidLogin.status === 401, 'Invalid credentials rejected with HTTP 401');

    // 5. Watch Ads List
    const adsRes = await fetch(`${baseUrl}/api/ads`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(adsRes.success && Array.isArray(adsRes.ads) && adsRes.ads.length > 0, 'Fetched active sponsored ads list');

    // 6. Complete Ad (Authoritative Reward: +38 VEs for ad-1 Amazon Prime)
    const adComplete = await fetch(`${baseUrl}/api/ads/ad-1/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ idempotencyKey: 'test-ad-1', clientRewardTamper: 99999 }),
    }).then((r) => r.json());
    assert(adComplete.success && adComplete.reward === 38 && adComplete.wallet.VEs === 888, 'Ad completed with authoritative server reward (+38 VEs) -> Balance 888 VEs', adComplete);

    // 7. Duplicate Ad Completion Rejected
    const dupAd = await fetch(`${baseUrl}/api/ads/ad-1/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ idempotencyKey: 'test-ad-1' }),
    });
    assert(dupAd.status === 400, 'Duplicate ad completion on same day rejected (HTTP 400)');

    // 8. Tasks List & Claim
    const tasksRes = await fetch(`${baseUrl}/api/tasks`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(tasksRes.success && Array.isArray(tasksRes.tasks), 'Fetched task quests inventory');

    const taskClaim = await fetch(`${baseUrl}/api/tasks/t-1/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(taskClaim.success && taskClaim.reward === 20 && taskClaim.wallet.VEs === 908, 'Task t-1 claimed (+20 VEs) -> Balance 908 VEs', taskClaim);

    // 9. Duplicate Task Claim Rejected
    const dupTask = await fetch(`${baseUrl}/api/tasks/t-1/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(dupTask.status === 400, 'Duplicate task claim rejected (HTTP 400)');

    // 10. Daily Bonus Claim (24h calendar safe)
    const bonusRes = await fetch(`${baseUrl}/api/wallet/daily-bonus`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(bonusRes.success && bonusRes.bonus === 25 && bonusRes.wallet.VEs === 933, 'Daily bonus claimed (+25 VEs) -> Balance 933 VEs', bonusRes);

    // 11. Duplicate Daily Bonus on same day rejected
    const dupBonus = await fetch(`${baseUrl}/api/wallet/daily-bonus`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(dupBonus.status === 400, 'Second daily bonus claim on same day rejected (HTTP 400)');

    // 12. Referral Link & Self-Referral Prevention
    const refDetails = await fetch(`${baseUrl}/api/referrals`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(refDetails.success && refDetails.referralCode === 'VELOOP-VE10842', 'User A unique referral code retrieved');

    const selfRef = await fetch(`${baseUrl}/api/referrals/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ code: 'VELOOP-VE10842' }),
    });
    assert(selfRef.status === 400, 'Self-referral blocked (HTTP 400)');

    // 13. User B applies User A referral code (+50 VEs for B, +100 VEs for A)
    const applyRef = await fetch(`${baseUrl}/api/referrals/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ code: 'VELOOP-VE10842' }),
    }).then((r) => r.json());
    assert(applyRef.success && applyRef.wallet.VEs === 170, 'User B earned +50 VEs welcome bonus -> Balance 170 VEs');

    // 14. Withdrawal Validation: Below Minimum (<100 VEs)
    const minWth = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ amount: 50, payoutMethod: 'UPI', accountDetail: 'alex@upi' }),
    });
    assert(minWth.status === 400, 'Withdrawal below minimum threshold rejected (HTTP 400)');

    // 15. Withdrawal Validation: Insufficient Balance
    const excessWth = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ amount: 5000, payoutMethod: 'UPI', accountDetail: 'jordan@upi' }),
    });
    assert(excessWth.status === 400, 'Excessive withdrawal rejected due to insufficient balance (HTTP 400)');

    // 16. Valid Withdrawal (933 + 100 ref = 1033 VEs. Deduct 200 -> 833 VEs)
    const validWth = await fetch(`${baseUrl}/api/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ amount: 200, payoutMethod: 'UPI', accountDetail: 'alex.vance@okhdfcbank' }),
    }).then((r) => r.json());
    assert(validWth.success && validWth.wallet.VEs === 833 && validWth.withdrawal.status === 'PENDING', 'Valid withdrawal (200 VEs debited) -> Balance 833 VEs, status PENDING');

    // 17. User-Isolated Transaction Ledger
    const historyA = await fetch(`${baseUrl}/api/wallet/history`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(historyA.success && Array.isArray(historyA.transactions), 'User A transaction history retrieved');

    const historyB = await fetch(`${baseUrl}/api/wallet/history`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    }).then((r) => r.json());
    assert(historyB.success && historyB.transactions.every((t) => t.userId !== 'VE10842'), 'User B ledger completely isolated from User A transactions');

    // 18. Core Giveaway Participation with Nested Route & Authoritative Fee Deduction (250 VEs. 833 - 250 = 583 VEs)
    const joinGw = await fetch(`${baseUrl}/api/giveaways/GW-2026-08/prizes/PRIZE-IPHONE15/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ amountTamper: 1 }),
    }).then((r) => r.json());
    assert(joinGw.success && joinGw.wallet.VEs === 583, 'Giveaway join deducts authoritative 250 VEs -> Balance 583 VEs', joinGw);

    // 19. Duplicate Giveaway Participation Handled Idempotently Without Extra Charge
    const dupJoinRes = await fetch(`${baseUrl}/api/giveaways/GW-2026-08/prizes/PRIZE-IPHONE15/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({}),
    }).then((r) => r.json());

    const participations = await GiveawayParticipation.find({ userId: 'VE10842', giveawayId: 'GW-2026-08', prizeId: 'PRIZE-IPHONE15' });
    const userAAfterDup = await User.findOne({ userId: 'VE10842' });

    assert(
      dupJoinRes.alreadyJoined === true && participations.length === 1 && userAAfterDup.wallet.VEs === 583,
      'Duplicate giveaway participation returns idempotent status, preserves 1 entry in DB and maintains balance at 583 VEs'
    );

    // 20. Winner Claim for Rohan Sharma (VE10025)
    const loginWinner = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'rohan.winner@example.com', password: 'password123' }),
    }).then((r) => r.json());

    const claimRes = await fetch(`${baseUrl}/api/giveaways/GW-2026-07/prizes/PRIZE-PAST-WATCH/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginWinner.token}`,
      },
      body: JSON.stringify({
        claimType: 'SHIPPING_ADDRESS',
        shippingAddress: {
          fullName: 'Rohan Sharma',
          addressLine1: 'Plot 44, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          phoneNumber: '+91 9876543210',
        },
      }),
    }).then((r) => r.json());
    assert(claimRes.success && claimRes.claim.status === 'SUBMITTED', 'Verified winner physical prize claim processed', claimRes);

    console.log('\n====================================================');
    console.log(`🎉 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    server.close();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Audit execution fatal error:', err);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runAudit();
