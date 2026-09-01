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

async function runConcurrencyIdempotencyTest() {
  console.log('====================================================');
  console.log('⚡ CONCURRENCY & IDEMPOTENCY SAFETY VERIFICATION');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

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

  const testUserId = 'VE-CONCURRENCY-USER';
  const testGwId = 'GW-CONCURRENCY-TEST';
  const testPrizeId = 'PRIZE-CONCURRENCY-WATCH';
  const testIdempotencyKey = `IDEMP-${Date.now()}-UNIQUE-KEY`;

  // 1. Setup fresh test user with 1000 VEs
  const passwordHash = await bcrypt.hash('password123', 8);
  await User.findOneAndUpdate(
    { userId: testUserId },
    {
      userId: testUserId,
      username: 'Concurrency Test User',
      email: 'concurrency.test@example.com',
      password: passwordHash,
      maskedId: 'VE****99',
      role: 'user',
      wallet: { VEs: 1000, SVEs: 1000, Tokens: 5000 },
      streak: 5,
    },
    { upsert: true, new: true }
  );

  // Clean prior test artifacts
  await GiveawayParticipation.deleteMany({ userId: testUserId });
  await GiveawayEntryTransaction.deleteMany({ userId: testUserId });
  await AuditLog.deleteMany({ userId: testUserId });

  // 2. Setup Prize (Fee: 200 VEs) & Giveaway
  const now = new Date();
  const prize = await Prize.findOneAndUpdate(
    { prizeId: testPrizeId },
    {
      prizeId: testPrizeId,
      giveawayId: testGwId,
      name: 'Concurrency Test Watch',
      slug: 'concurrency-test-watch',
      position: '2nd Prize',
      entryCurrency: 'VEs',
      entryAmount: 200,
      winnerCount: 1,
      image: '/assets/prizes/applewatch.svg',
    },
    { upsert: true, new: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: testGwId },
    {
      giveawayId: testGwId,
      title: 'Concurrency Safety Giveaway',
      slug: 'concurrency-safety-giveaway',
      status: 'ACTIVE',
      startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      prizes: [prize._id],
    },
    { upsert: true }
  );

  console.log('Sending 5 simultaneous identical join requests concurrently with idempotencyKey...');

  // 3. Fire 5 concurrent join requests with same idempotency key
  const requestPayload = {
    userId: testUserId,
    giveawayId: testGwId,
    prizeId: testPrizeId,
    deviceHash: 'CONCURRENCY-DEV-HASH',
    ipAddress: '127.0.0.1',
    idempotencyKey: testIdempotencyKey,
    userAgent: 'Concurrency-Test-Agent/1.0',
  };

  const results = await Promise.all([
    processJoinGiveaway(requestPayload).catch((e) => ({ error: e.message, code: e.code })),
    processJoinGiveaway(requestPayload).catch((e) => ({ error: e.message, code: e.code })),
    processJoinGiveaway(requestPayload).catch((e) => ({ error: e.message, code: e.code })),
    processJoinGiveaway(requestPayload).catch((e) => ({ error: e.message, code: e.code })),
    processJoinGiveaway(requestPayload).catch((e) => ({ error: e.message, code: e.code })),
  ]);

  // 4. Verify results
  const successfulResponses = results.filter((r) => r.success);
  assert(successfulResponses.length === 5, 'All 5 concurrent requests returned success (idempotent result)');

  // 5. Verify database records
  const participationsInDb = await GiveawayParticipation.find({ userId: testUserId, giveawayId: testGwId, prizeId: testPrizeId });
  assert(participationsInDb.length === 1, `Exactly ONE participation document exists in DB (Found: ${participationsInDb.length})`);

  const transactionsInDb = await GiveawayEntryTransaction.find({ userId: testUserId, giveawayId: testGwId, prizeId: testPrizeId });
  assert(transactionsInDb.length === 1, `Exactly ONE entry transaction exists in DB (Found: ${transactionsInDb.length})`);

  const auditLogsInDb = await AuditLog.find({ userId: testUserId, giveawayId: testGwId, action: 'JOIN_GIVEAWAY' });
  assert(auditLogsInDb.length === 1, `Exactly ONE audit log exists in DB (Found: ${auditLogsInDb.length})`);

  // 6. Verify wallet balance (1000 - 200 = 800 VEs, NOT deducted 5 times)
  const finalUser = await User.findOne({ userId: testUserId });
  assert(
    finalUser.wallet.VEs === 800,
    `Wallet deducted EXACTLY ONCE (200 VEs). Balance: ${finalUser.wallet.VEs} VEs (Expected: 800 VEs)`
  );

  // 7. Cleanup test data
  await User.deleteOne({ userId: testUserId });
  await GiveawayParticipation.deleteMany({ userId: testUserId });
  await GiveawayEntryTransaction.deleteMany({ userId: testUserId });
  await AuditLog.deleteMany({ userId: testUserId });
  await Prize.deleteOne({ prizeId: testPrizeId });
  await Giveaway.deleteOne({ giveawayId: testGwId });

  console.log('\n====================================================');
  console.log(`🎉 CONCURRENCY & IDEMPOTENCY TEST: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runConcurrencyIdempotencyTest();
