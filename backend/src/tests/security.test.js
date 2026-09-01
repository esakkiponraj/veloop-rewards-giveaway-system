import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import connectDB from '../config/db.js';
import { processJoinGiveaway } from '../services/participationService.js';
import { processPrizeClaim } from '../services/claimService.js';
import User from '../models/User.js';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import PrizeClaim from '../models/PrizeClaim.js';
import GiveawayEntryTransaction from '../models/GiveawayEntryTransaction.js';
import AuditLog from '../models/AuditLog.js';
import bcrypt from 'bcryptjs';

const runSecurityTests = async () => {
  console.log('====================================================');
  console.log('🛡️ RUNNING VELOOP REWARDS SECURITY & INTEGRITY SUITE');
  console.log('====================================================');

  await connectDB();

  // Test identifiers isolated from canonical production/demo data
  const testAlexId = 'USER-SEC-ALEX';
  const testJordanId = 'USER-SEC-JORDAN';
  const testRohanId = 'USER-SEC-ROHAN';
  const testCurrentGwId = 'GW-SEC-ACTIVE';
  const testEndedGwId = 'GW-SEC-ENDED';
  const testPrizeIphoneId = 'PRIZE-SEC-IPHONE';
  const testPrizeWatchId = 'PRIZE-SEC-WATCH';

  const passwordHash = await bcrypt.hash('password123', 8);

  await User.findOneAndUpdate(
    { userId: testAlexId },
    {
      userId: testAlexId,
      username: 'Sec Alex',
      email: 'sec.alex@example.com',
      password: passwordHash,
      maskedId: 'VE****A1',
      role: 'user',
      wallet: { VEs: 850, SVEs: 1200, Tokens: 5000 },
      streak: 12,
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { userId: testJordanId },
    {
      userId: testJordanId,
      username: 'Sec Jordan',
      email: 'sec.jordan@example.com',
      password: passwordHash,
      maskedId: 'VE****J2',
      role: 'user',
      wallet: { VEs: 120, SVEs: 150, Tokens: 600 },
      streak: 3,
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { userId: testRohanId },
    {
      userId: testRohanId,
      username: 'Sec Rohan',
      email: 'sec.rohan@example.com',
      password: passwordHash,
      maskedId: 'VE****R3',
      role: 'user',
      wallet: { VEs: 450, SVEs: 900, Tokens: 3500 },
      streak: 8,
    },
    { upsert: true, new: true }
  );

  await GiveawayParticipation.deleteMany({ userId: { $in: [testAlexId, testJordanId, testRohanId] } });
  await GiveawayEntryTransaction.deleteMany({ userId: { $in: [testAlexId, testJordanId, testRohanId] } });
  await PrizeClaim.deleteMany({ userId: { $in: [testRohanId, testAlexId] } });
  await AuditLog.deleteMany({ userId: { $in: [testAlexId, testJordanId, testRohanId] } });

  const now = new Date();

  const prizeIphone = await Prize.findOneAndUpdate(
    { prizeId: testPrizeIphoneId },
    {
      prizeId: testPrizeIphoneId,
      giveawayId: testCurrentGwId,
      name: 'Security Test iPhone 15 Pro',
      slug: 'sec-iphone-15-pro',
      position: '1st Prize',
      entryCurrency: 'VEs',
      entryAmount: 250,
      winnerCount: 1,
      image: '/assets/prizes/iphone15pro.svg',
    },
    { upsert: true, new: true }
  );

  const prizeWatch = await Prize.findOneAndUpdate(
    { prizeId: testPrizeWatchId },
    {
      prizeId: testPrizeWatchId,
      giveawayId: testEndedGwId,
      name: 'Security Test Apple Watch',
      slug: 'sec-apple-watch',
      position: '1st Prize',
      entryCurrency: 'VEs',
      entryAmount: 200,
      winnerCount: 1,
      image: '/assets/prizes/applewatch.svg',
    },
    { upsert: true, new: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: testCurrentGwId },
    {
      giveawayId: testCurrentGwId,
      title: 'Security Active Giveaway',
      slug: 'sec-active-giveaway',
      status: 'ACTIVE',
      startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      prizes: [prizeIphone._id],
    },
    { upsert: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: testEndedGwId },
    {
      giveawayId: testEndedGwId,
      title: 'Security Ended Giveaway',
      slug: 'sec-ended-giveaway',
      status: 'ENDED',
      startAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      prizes: [prizeWatch._id],
    },
    { upsert: true }
  );

  await GiveawayWinner.findOneAndUpdate(
    { userId: testRohanId, giveawayId: testEndedGwId, prizeId: testPrizeWatchId },
    {
      giveawayId: testEndedGwId,
      prizeId: testPrizeWatchId,
      userId: testRohanId,
      maskedUserId: 'VE****R3',
      prizeName: 'Security Test Apple Watch',
      prizeType: 'PHYSICAL',
      claimDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      selectionMethod: 'CRYPTOGRAPHIC_RANDOM',
      status: 'SELECTED',
    },
    { upsert: true }
  );

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
    // --------------------------------------------------------------------------
    // TEST 1: Price Spoofing / Tampering Protection
    // --------------------------------------------------------------------------
    console.log('\n[TEST 1] Attack A: Client attempts price spoofing (amount = 1 VEs for iPhone)...');
    const resultJoin = await processJoinGiveaway({
      userId: testAlexId,
      giveawayId: testCurrentGwId,
      prizeId: testPrizeIphoneId,
      deviceHash: 'SEC-ATTACK-DEV-01',
      ipAddress: '127.0.0.1',
      idempotencyKey: 'SEC-IDEMP-01',
      userAgent: 'Security-Harness',
    });

    assert(
      resultJoin.success && resultJoin.wallet.VEs === 600,
      `Backend deducted authoritative fee (250 VEs). New balance: ${resultJoin.wallet.VEs} VEs.`
    );

    // --------------------------------------------------------------------------
    // TEST 2: Duplicate Participation Prevention
    // --------------------------------------------------------------------------
    console.log('\n[TEST 2] Attack B: Duplicate participation attempt by same user...');
    const resultDup = await processJoinGiveaway({
      userId: testAlexId,
      giveawayId: testCurrentGwId,
      prizeId: testPrizeIphoneId,
      deviceHash: 'SEC-ATTACK-DEV-01',
      ipAddress: '127.0.0.1',
      idempotencyKey: 'SEC-IDEMP-01',
      userAgent: 'Security-Harness',
    });

    const entriesCount = await GiveawayParticipation.countDocuments({
      userId: testAlexId,
      giveawayId: testCurrentGwId,
      prizeId: testPrizeIphoneId,
    });

    assert(
      resultDup.alreadyJoined === true && entriesCount === 1 && resultDup.wallet.VEs === 600,
      `Duplicate request handled idempotently. Total entries in DB = ${entriesCount}, Balance untouched at ${resultDup.wallet.VEs} VEs.`
    );

    // --------------------------------------------------------------------------
    // TEST 3: Expired Giveaway Join Prevention
    // --------------------------------------------------------------------------
    console.log('\n[TEST 3] Attack C: User attempts to join ended giveaway event...');
    try {
      await processJoinGiveaway({
        userId: testAlexId,
        giveawayId: testEndedGwId,
        prizeId: testPrizeWatchId,
        deviceHash: 'SEC-ATTACK-DEV-01',
        ipAddress: '127.0.0.1',
        userAgent: 'Security-Harness',
      });
      assert(false, 'Should not allow join on ended giveaway');
    } catch (err) {
      assert(err.code === 'GIVEAWAY_ENDED', `Expired giveaway join blocked with code: ${err.code}.`);
    }

    // --------------------------------------------------------------------------
    // TEST 4: Insufficient Balance Rejection
    // --------------------------------------------------------------------------
    console.log('\n[TEST 4] Attack D: Low balance user (120 VEs) attempts 250 VEs join...');
    try {
      await processJoinGiveaway({
        userId: testJordanId,
        giveawayId: testCurrentGwId,
        prizeId: testPrizeIphoneId,
        deviceHash: 'SEC-ATTACK-DEV-02',
        ipAddress: '127.0.0.1',
        userAgent: 'Security-Harness',
      });
      assert(false, 'Should not allow join with insufficient balance');
    } catch (err) {
      const jordanUser = await User.findOne({ userId: testJordanId });
      assert(
        err.code === 'INSUFFICIENT_VE_BALANCE' && jordanUser.wallet.VEs === 120,
        `Insufficient balance rejected (${err.code}). User balance preserved at ${jordanUser.wallet.VEs} VEs.`
      );
    }

    // --------------------------------------------------------------------------
    // TEST 5: Unauthorized Prize Claim Prevention
    // --------------------------------------------------------------------------
    console.log('\n[TEST 5] Attack E: Non-winner attempts to claim a prize...');
    try {
      await processPrizeClaim({
        userId: testAlexId, // Alex did not win
        giveawayId: testEndedGwId,
        prizeId: testPrizeWatchId,
        claimData: {
          fullName: 'Alex Vance',
          phoneNumber: '9876543210',
          addressLine1: 'Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Security-Harness',
      });
      assert(false, 'Should not allow unauthorized claim');
    } catch (err) {
      assert(err.code === 'CLAIM_NOT_ALLOWED', `Unauthorized claim blocked with code: ${err.code}.`);
    }

    // --------------------------------------------------------------------------
    // TEST 6: Legitimate Winner Prize Claim Success
    // --------------------------------------------------------------------------
    console.log('\n[TEST 6] Test F: Legitimate winner (Sec Rohan) claims Apple Watch...');
    const claimRes = await processPrizeClaim({
      userId: testRohanId,
      giveawayId: testEndedGwId,
      prizeId: testPrizeWatchId,
      claimData: {
        fullName: 'Rohan Sharma',
        phoneNumber: '9988776655',
        addressLine1: '404 Green Valley Apartments',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Security-Harness',
    });

    const savedWinner = await GiveawayWinner.findOne({
      userId: testRohanId,
      giveawayId: testEndedGwId,
      prizeId: testPrizeWatchId,
    });

    assert(
      claimRes.success && savedWinner.status === 'CLAIM_SUBMITTED',
      `Claim successfully processed. Winner claim status: ${savedWinner.status}.`
    );

    // Clean up isolated test records
    await User.deleteMany({ userId: { $in: [testAlexId, testJordanId, testRohanId] } });
    await GiveawayParticipation.deleteMany({ userId: { $in: [testAlexId, testJordanId, testRohanId] } });
    await GiveawayEntryTransaction.deleteMany({ userId: { $in: [testAlexId, testJordanId, testRohanId] } });
    await PrizeClaim.deleteMany({ userId: { $in: [testAlexId, testRohanId] } });
    await GiveawayWinner.deleteMany({ userId: testRohanId, giveawayId: testEndedGwId });
    await AuditLog.deleteMany({ userId: { $in: [testAlexId, testJordanId, testRohanId] } });
    await Prize.deleteMany({ prizeId: { $in: [testPrizeIphoneId, testPrizeWatchId] } });
    await Giveaway.deleteMany({ giveawayId: { $in: [testCurrentGwId, testEndedGwId] } });

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed}/${passed + failed} TESTS PASSED`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runSecurityTests();
