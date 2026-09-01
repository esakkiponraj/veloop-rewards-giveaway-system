import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import User from '../models/User.js';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayEntryTransaction from '../models/GiveawayEntryTransaction.js';
import AuditLog from '../models/AuditLog.js';
import { processJoinGiveaway } from '../services/participationService.js';
import bcrypt from 'bcryptjs';

async function runIdempotencyDeepSuite() {
  console.log('====================================================');
  console.log('🛡️ VELOOP REWARDS — DEEP DATABASE IDEMPOTENCY SUITE');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  // Sync schema indexes (including partial unique on userId + idempotencyKey)
  await GiveawayParticipation.syncIndexes();

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

  const passwordHash = await bcrypt.hash('password123', 8);

  // Setup Test Users: User A and User B
  const userAId = 'VE-IDEMP-USER-A';
  const userBId = 'VE-IDEMP-USER-B';
  const testGwId = 'GW-IDEMP-SUITE';
  const testPrize1Id = 'PRIZE-IDEMP-IPHONE';
  const testPrize2Id = 'PRIZE-IDEMP-AIRPODS';

  await User.findOneAndUpdate(
    { userId: userAId },
    {
      userId: userAId,
      username: 'Idemp User A',
      email: 'idemp.a@example.com',
      password: passwordHash,
      maskedId: 'VE****A1',
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
      username: 'Idemp User B',
      email: 'idemp.b@example.com',
      password: passwordHash,
      maskedId: 'VE****B2',
      role: 'user',
      wallet: { VEs: 1000, SVEs: 1500, Tokens: 5000 },
      streak: 2,
    },
    { upsert: true, new: true }
  );

  // Clean test documents
  await GiveawayParticipation.deleteMany({ userId: { $in: [userAId, userBId] } });
  await GiveawayEntryTransaction.deleteMany({ userId: { $in: [userAId, userBId] } });
  await AuditLog.deleteMany({ userId: { $in: [userAId, userBId] } });

  // Setup 2 Prizes under the same Giveaway
  const now = new Date();
  const prize1 = await Prize.findOneAndUpdate(
    { prizeId: testPrize1Id },
    {
      prizeId: testPrize1Id,
      giveawayId: testGwId,
      name: 'Idempotency iPhone 15',
      slug: 'idemp-iphone-15',
      position: '1st Prize',
      entryCurrency: 'VEs',
      entryAmount: 250,
      winnerCount: 1,
      image: '/assets/prizes/iphone15pro.svg',
    },
    { upsert: true, new: true }
  );

  const prize2 = await Prize.findOneAndUpdate(
    { prizeId: testPrize2Id },
    {
      prizeId: testPrize2Id,
      giveawayId: testGwId,
      name: 'Idempotency AirPods Pro',
      slug: 'idemp-airpods-pro',
      position: '2nd Prize',
      entryCurrency: 'SVEs',
      entryAmount: 500,
      winnerCount: 1,
      image: '/assets/prizes/airpods.svg',
    },
    { upsert: true, new: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: testGwId },
    {
      giveawayId: testGwId,
      title: 'Idempotency Deep Test Giveaway',
      slug: 'idemp-deep-giveaway',
      status: 'ACTIVE',
      startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      prizes: [prize1._id, prize2._id],
    },
    { upsert: true }
  );

  const sharedKeyUserA = `KEY-ALPHA-${Date.now()}`;

  // --------------------------------------------------------------------------
  // TEST 1: Initial Join with idempotency key (Success)
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Initial join with unique idempotencyKey...');
  const res1 = await processJoinGiveaway({
    userId: userAId,
    giveawayId: testGwId,
    prizeId: testPrize1Id,
    deviceHash: 'DEV-A',
    ipAddress: '127.0.0.1',
    idempotencyKey: sharedKeyUserA,
  });

  const userAAfter1 = await User.findOne({ userId: userAId });
  assert(res1.success && userAAfter1.wallet.VEs === 750, 'Initial join succeeded (1000 - 250 = 750 VEs)');

  // --------------------------------------------------------------------------
  // TEST 2: Same User + Same Key + Same Payload (Idempotent replay)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Replay with SAME user + SAME key + SAME payload...');
  const res2 = await processJoinGiveaway({
    userId: userAId,
    giveawayId: testGwId,
    prizeId: testPrize1Id,
    deviceHash: 'DEV-A',
    ipAddress: '127.0.0.1',
    idempotencyKey: sharedKeyUserA,
  });

  const userAAfter2 = await User.findOne({ userId: userAId });
  assert(
    res2.success && res2.alreadyJoined && userAAfter2.wallet.VEs === 750,
    'Replay returned idempotent success without second deduction (balance preserved at 750 VEs)'
  );

  // --------------------------------------------------------------------------
  // TEST 3: Same User + Same Key + DIFFERENT Payload (Should throw 409 IDEMPOTENCY_KEY_REUSED)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Replay with SAME user + SAME key + DIFFERENT payload (Prize 2)...');
  try {
    await processJoinGiveaway({
      userId: userAId,
      giveawayId: testGwId,
      prizeId: testPrize2Id, // Different prize!
      deviceHash: 'DEV-A',
      ipAddress: '127.0.0.1',
      idempotencyKey: sharedKeyUserA, // Reusing same key
    });
    assert(false, 'Key reuse on different payload was improperly allowed');
  } catch (err) {
    assert(
      err.code === 'IDEMPOTENCY_KEY_REUSED' && err.statusCode === 409,
      `Key reuse on different payload rejected with 409 IDEMPOTENCY_KEY_REUSED (${err.message})`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: Different User (User B) using the SAME idempotency key (Must succeed independently)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] DIFFERENT User B using the SAME idempotency key string...');
  const res4 = await processJoinGiveaway({
    userId: userBId,
    giveawayId: testGwId,
    prizeId: testPrize1Id,
    deviceHash: 'DEV-B',
    ipAddress: '127.0.0.1',
    idempotencyKey: sharedKeyUserA, // Same key string, different user
  });

  const userBAfter = await User.findOne({ userId: userBId });
  assert(
    res4.success && userBAfter.wallet.VEs === 750,
    'User B successfully joined using same key string (Scoped per-user compound unique index)'
  );

  // --------------------------------------------------------------------------
  // TEST 5: Concurrency Safety (5 concurrent identical requests for User B on Prize 2)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] 5 simultaneous identical concurrent join requests for User B on Prize 2...');
  const concurrentKey = `CONC-KEY-${Date.now()}`;
  const concurrentPayload = {
    userId: userBId,
    giveawayId: testGwId,
    prizeId: testPrize2Id,
    deviceHash: 'DEV-B',
    ipAddress: '127.0.0.1',
    idempotencyKey: concurrentKey,
  };

  const concurrentResults = await Promise.all([
    processJoinGiveaway(concurrentPayload).catch((e) => ({ error: e.message, code: e.code })),
    processJoinGiveaway(concurrentPayload).catch((e) => ({ error: e.message, code: e.code })),
    processJoinGiveaway(concurrentPayload).catch((e) => ({ error: e.message, code: e.code })),
    processJoinGiveaway(concurrentPayload).catch((e) => ({ error: e.message, code: e.code })),
    processJoinGiveaway(concurrentPayload).catch((e) => ({ error: e.message, code: e.code })),
  ]);

  const allSuccess = concurrentResults.every((r) => r.success);
  assert(allSuccess, 'All 5 concurrent requests returned success (idempotent result)');

  // Verify database count for User B on Prize 2
  const partCount = await GiveawayParticipation.countDocuments({
    userId: userBId,
    giveawayId: testGwId,
    prizeId: testPrize2Id,
  });
  assert(partCount === 1, `Exactly ONE participation document created in DB (Count = ${partCount})`);

  const txnCount = await GiveawayEntryTransaction.countDocuments({
    userId: userBId,
    giveawayId: testGwId,
    prizeId: testPrize2Id,
  });
  assert(txnCount === 1, `Exactly ONE entry transaction created in DB (Count = ${txnCount})`);

  const auditCount = await AuditLog.countDocuments({
    userId: userBId,
    giveawayId: testGwId,
    action: 'JOIN_GIVEAWAY',
    'metadata.prizeId': testPrize2Id,
  });
  assert(auditCount === 1, `Exactly ONE audit log created in DB (Count = ${auditCount})`);

  // Verify wallet balance: User B SVEs was 1500, deducted 500 once -> 1000 SVEs
  const finalUserB = await User.findOne({ userId: userBId });
  assert(
    finalUserB.wallet.SVEs === 1000,
    `Wallet deducted exactly once (500 SVEs). Final balance: ${finalUserB.wallet.SVEs} SVEs (Expected: 1000 SVEs)`
  );

  // --------------------------------------------------------------------------
  // Cleanup Test Data
  // --------------------------------------------------------------------------
  await User.deleteMany({ userId: { $in: [userAId, userBId] } });
  await GiveawayParticipation.deleteMany({ userId: { $in: [userAId, userBId] } });
  await GiveawayEntryTransaction.deleteMany({ userId: { $in: [userAId, userBId] } });
  await AuditLog.deleteMany({ userId: { $in: [userAId, userBId] } });
  await Prize.deleteMany({ prizeId: { $in: [testPrize1Id, testPrize2Id] } });
  await Giveaway.deleteOne({ giveawayId: testGwId });

  console.log('\n====================================================');
  console.log(`🎉 DEEP IDEMPOTENCY SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runIdempotencyDeepSuite();
