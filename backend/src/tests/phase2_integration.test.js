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
import bcrypt from 'bcryptjs';

async function runPhase2IntegrationTests() {
  console.log('====================================================');
  console.log('🚀 VELOOP REWARDS — PHASE 2 INTEGRATION & JOIN TEST');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });

  // Sync database indexes
  await GiveawayParticipation.syncIndexes();

  const passwordHash = await bcrypt.hash('password123', 8);

  // Setup Test Users
  const userAId = 'VE-P2-ALEX';
  const userBId = 'VE-P2-LOWBAL';

  await User.findOneAndUpdate(
    { userId: userAId },
    {
      userId: userAId,
      username: 'Phase2 Alex',
      email: 'p2.alex@example.com',
      password: passwordHash,
      maskedId: 'VE****A2',
      role: 'user',
      wallet: { VEs: 1000, SVEs: 1500, Tokens: 5000 },
      streak: 5,
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { userId: userBId },
    {
      userId: userBId,
      username: 'Phase2 Jordan',
      email: 'p2.jordan@example.com',
      password: passwordHash,
      maskedId: 'VE****B2',
      role: 'user',
      wallet: { VEs: 50, SVEs: 50, Tokens: 100 }, // Low balance
      streak: 1,
    },
    { upsert: true, new: true }
  );

  // Clean test participations
  await GiveawayParticipation.deleteMany({ userId: { $in: [userAId, userBId] } });
  await GiveawayEntryTransaction.deleteMany({ userId: { $in: [userAId, userBId] } });

  // Setup Current Giveaway & Prizes (VEs, SVEs, Tokens, and Pending Confirmation)
  const currentGwId = 'GW-P2-ACTIVE';
  const now = new Date();

  const prizeIphone = await Prize.findOneAndUpdate(
    { prizeId: 'PRIZE-P2-IPHONE' },
    {
      prizeId: 'PRIZE-P2-IPHONE',
      giveawayId: currentGwId,
      name: 'Phase 2 iPhone 15 Pro',
      slug: 'p2-iphone-15-pro',
      position: '1st Prize',
      entryCurrency: 'VEs',
      entryAmount: 250,
      winnerCount: 1,
      image: '/assets/prizes/iphone15pro.svg',
      isPendingConfirmation: false,
    },
    { upsert: true, new: true }
  );

  const prizeAirpods = await Prize.findOneAndUpdate(
    { prizeId: 'PRIZE-P2-AIRPODS' },
    {
      prizeId: 'PRIZE-P2-AIRPODS',
      giveawayId: currentGwId,
      name: 'Phase 2 AirPods Pro',
      slug: 'p2-airpods-pro',
      position: '2nd Prize',
      entryCurrency: 'SVEs',
      entryAmount: 500,
      winnerCount: 2,
      image: '/assets/prizes/airpods.svg',
      isPendingConfirmation: false,
    },
    { upsert: true, new: true }
  );

  const prizeAmazonPending = await Prize.findOneAndUpdate(
    { prizeId: 'PRIZE-P2-AMAZON-PENDING' },
    {
      prizeId: 'PRIZE-P2-AMAZON-PENDING',
      giveawayId: currentGwId,
      name: 'Phase 2 ₹20 Voucher',
      slug: 'p2-amazon-20',
      position: 'Lucky Draw',
      entryCurrency: 'Tokens',
      entryAmount: 2000,
      winnerCount: 10,
      image: '/assets/prizes/amazon20.svg',
      isPendingConfirmation: true,
      pendingConfirmationNote: 'The ₹20 Amazon Voucher value is pending final confirmation.',
    },
    { upsert: true, new: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: currentGwId },
    {
      giveawayId: currentGwId,
      title: 'Phase 2 Test Megadraw',
      slug: 'phase-2-test-megadraw',
      status: 'ACTIVE',
      isFeatured: true,
      startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      prizes: [prizeIphone._id, prizeAirpods._id, prizeAmazonPending._id],
    },
    { upsert: true }
  );

  // Setup Past Giveaway
  await Giveaway.findOneAndUpdate(
    { giveawayId: 'GW-P2-ENDED' },
    {
      giveawayId: 'GW-P2-ENDED',
      title: 'Phase 2 Ended Giveaway',
      slug: 'phase-2-ended-giveaway',
      status: 'ENDED',
      startAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      prizes: [],
    },
    { upsert: true }
  );

  // Setup Upcoming Giveaway
  await Giveaway.findOneAndUpdate(
    { giveawayId: 'GW-P2-UPCOMING' },
    {
      giveawayId: 'GW-P2-UPCOMING',
      title: 'Phase 2 Upcoming Gala',
      slug: 'phase-2-upcoming-gala',
      status: 'UPCOMING',
      startAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
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
    // 1. Authenticate Test Users
    const loginA = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'p2.alex@example.com', password: 'password123' }),
    }).then((r) => r.json());
    const tokenA = loginA.token;

    const loginB = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'p2.jordan@example.com', password: 'password123' }),
    }).then((r) => r.json());
    const tokenB = loginB.token;

    // 2. Fetch Active Giveaway Hub Data
    const currentRes = await fetch(`${baseUrl}/api/giveaways/current`).then((r) => r.json());
    assert(currentRes.success && currentRes.giveaway && currentRes.giveaway.status === 'ACTIVE', 'Fetched active giveaway hub data');

    // 3. Fetch Prize by Slug
    const prizeRes = await fetch(`${baseUrl}/api/giveaways/prizes/p2-iphone-15-pro`).then((r) => r.json());
    assert(prizeRes.success && prizeRes.prize.prizeId === 'PRIZE-P2-IPHONE', 'Fetched prize details by slug (p2-iphone-15-pro)');

    // 4. Check Pending Confirmation flag on ₹20 Voucher
    const voucherRes = await fetch(`${baseUrl}/api/giveaways/prizes/p2-amazon-20`).then((r) => r.json());
    assert(
      voucherRes.success && voucherRes.prize.isPendingConfirmation === true,
      'Verified isPendingConfirmation flag on ₹20 voucher prize'
    );

    // 5. Join Prize 1 with Sufficient VEs (Alex Vance, 1000 - 250 = 750 VEs)
    const joinIphone = await fetch(`${baseUrl}/api/giveaways/${currentGwId}/prizes/PRIZE-P2-IPHONE/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ idempotencyKey: 'P2-KEY-IPHONE-1' }),
    }).then((r) => r.json());
    assert(
      joinIphone.success && joinIphone.wallet.VEs === 750 && joinIphone.participation.entryCount === 1,
      'User joined iPhone giveaway with VEs (Deducted 250 VEs, new balance: 750 VEs, entryCount: 1)'
    );

    // 6. Join Prize 2 with Sufficient SVEs (Alex Vance, 1500 - 500 = 1000 SVEs)
    const joinAirpods = await fetch(`${baseUrl}/api/giveaways/${currentGwId}/prizes/PRIZE-P2-AIRPODS/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ idempotencyKey: 'P2-KEY-AIRPODS-1' }),
    }).then((r) => r.json());
    assert(
      joinAirpods.success && joinAirpods.wallet.SVEs === 1000,
      'User joined AirPods giveaway with SVEs (Deducted 500 SVEs, new balance: 1000 SVEs)'
    );

    // 7. Check User Participation Status
    const statusIphone = await fetch(`${baseUrl}/api/giveaways/${currentGwId}/prizes/PRIZE-P2-IPHONE/my-status`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(
      statusIphone.success && statusIphone.isParticipating === true,
      'my-status route accurately returns isParticipating: true for joined prize'
    );

    // 8. Idempotent Duplicate Join (No second deduction)
    const dupJoin = await fetch(`${baseUrl}/api/giveaways/${currentGwId}/prizes/PRIZE-P2-IPHONE/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ idempotencyKey: 'P2-KEY-IPHONE-1' }),
    }).then((r) => r.json());
    assert(
      dupJoin.success && dupJoin.alreadyJoined === true && dupJoin.wallet.VEs === 750,
      'Duplicate join returns idempotent 200 with alreadyJoined: true and leaves balance at 750 VEs'
    );

    // 9. Insufficient Balance Rejection (Jordan Lee has 50 VEs, needs 250 VEs)
    const lowBalJoin = await fetch(`${baseUrl}/api/giveaways/${currentGwId}/prizes/PRIZE-P2-IPHONE/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ idempotencyKey: 'P2-KEY-LOWBAL' }),
    });
    const lowBalJson = await lowBalJoin.json();
    assert(
      lowBalJoin.status === 400 && lowBalJson.code === 'INSUFFICIENT_VE_BALANCE',
      `Insufficient balance rejected with HTTP 400 (${lowBalJson.code})`
    );

    // 10. Missing / Invalid Slug 404
    const notFoundSlug = await fetch(`${baseUrl}/api/giveaways/prizes/non-existent-prize-slug`);
    assert(notFoundSlug.status === 404, 'Invalid prize slug correctly returns HTTP 404');

    // 11. My Entries List
    const myEntries = await fetch(`${baseUrl}/api/giveaways/user/my-entries`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }).then((r) => r.json());
    assert(
      myEntries.success && Array.isArray(myEntries.entries) && myEntries.entries.length === 2,
      `User My Entries list returns exactly 2 confirmed entries (Found: ${myEntries.entries?.length})`
    );

    // Cleanup test records
    await User.deleteMany({ userId: { $in: [userAId, userBId] } });
    await GiveawayParticipation.deleteMany({ userId: { $in: [userAId, userBId] } });
    await GiveawayEntryTransaction.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Prize.deleteMany({ prizeId: { $in: ['PRIZE-P2-IPHONE', 'PRIZE-P2-AIRPODS', 'PRIZE-P2-AMAZON-PENDING'] } });
    await Giveaway.deleteMany({ giveawayId: { $in: [currentGwId, 'GW-P2-ENDED', 'GW-P2-UPCOMING'] } });

    console.log('\n====================================================');
    console.log(`🎉 PHASE 2 INTEGRATION: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    server.close();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Phase 2 test fatal error:', err);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runPhase2IntegrationTests();
