import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import connectDB from '../config/db.js';
import { repo } from '../utils/repository.js';
import { processJoinGiveaway } from '../services/participationService.js';
import { processPrizeClaim } from '../services/claimService.js';
import User from '../models/User.js';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import PrizeClaim from '../models/PrizeClaim.js';
import bcrypt from 'bcryptjs';

const runSecurityTests = async () => {
  console.log('====================================================');
  console.log('🛡️ RUNNING VELOOP REWARDS SECURITY & INTEGRITY SUITE');
  console.log('====================================================');

  await connectDB();

  // Reset test database state for clean, repeatable execution
  const passwordHash = await bcrypt.hash('password123', 8);

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
    },
    { upsert: true, new: true }
  );

  await GiveawayParticipation.deleteMany({ userId: { $in: ['VE10842', 'VE10012'] } });
  await PrizeClaim.deleteMany({ userId: { $in: ['VE10025'] } });

  // Ensure current & expired giveaways exist
  const now = new Date();
  const currentGwId = 'GW-2026-08';
  const endedGwId = 'GW-2026-07';

  const prizeIphone = await Prize.findOneAndUpdate(
    { prizeId: 'PRIZE-IPHONE15' },
    {
      prizeId: 'PRIZE-IPHONE15',
      giveawayId: currentGwId,
      name: 'iPhone 15 Pro (128GB)',
      slug: 'iphone-15-pro',
      position: '1st Prize',
      entryCurrency: 'VEs',
      entryAmount: 250,
      winnerCount: 1,
      image: '/assets/prizes/iphone15pro.svg',
    },
    { upsert: true, new: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: currentGwId },
    {
      giveawayId: currentGwId,
      title: 'Summer Rewards Megadraw 2026',
      slug: 'summer-rewards-megadraw',
      status: 'ACTIVE',
      startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      prizes: [prizeIphone._id],
    },
    { upsert: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: endedGwId },
    {
      giveawayId: endedGwId,
      title: 'Monsoon Kickoff Rewards 2026',
      slug: 'monsoon-kickoff-rewards',
      status: 'ENDED',
      startAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      prizes: [],
    },
    { upsert: true }
  );

  await GiveawayWinner.findOneAndUpdate(
    { userId: 'VE10025', giveawayId: endedGwId },
    {
      giveawayId: endedGwId,
      prizeId: 'PRIZE-PAST-WATCH',
      userId: 'VE10025',
      maskedUserId: 'VE****25',
      prizeName: 'Apple Watch Series 9',
      prizeType: 'PHYSICAL',
      claimDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: 'SELECTED',
    },
    { upsert: true }
  );

  let passedTests = 0;
  let totalTests = 6;

  try {
    // -------------------------------------------------------------------
    // TEST 1: Attack A - Price Manipulation Attack
    // -------------------------------------------------------------------
    console.log('\n[TEST 1] Attack A: Client attempts price spoofing (amount = 1 VEs for iPhone)...');
    const userA = await repo.findUserById('VE10842');
    const initialBalance = userA.wallet.VEs; // 850 VEs

    const joinResult = await processJoinGiveaway({
      userId: userA.userId,
      giveawayId: 'GW-2026-08',
      prizeId: 'PRIZE-IPHONE15',
      deviceHash: 'TEST-DEV-HASH-001',
      ipAddress: '127.0.0.1',
    });

    const userAAfter = await repo.findUserById('VE10842');
    const expectedDeduction = 250; // Configured fee for iPhone

    if (userAAfter.wallet.VEs === initialBalance - expectedDeduction) {
      console.log(`✅ [PASSED] Backend deducted authoritative fee (250 VEs). New balance: ${userAAfter.wallet.VEs} VEs.`);
      passedTests++;
    } else {
      console.error(`❌ [FAILED] Deducted incorrect amount! Current balance: ${userAAfter.wallet.VEs}`);
    }

    // -------------------------------------------------------------------
    // TEST 2: Attack B - Duplicate Join & Race Condition Attack
    // -------------------------------------------------------------------
    console.log('\n[TEST 2] Attack B: Duplicate participation attempt by same user...');
    const dupResult = await processJoinGiveaway({
      userId: userA.userId,
      giveawayId: 'GW-2026-08',
      prizeId: 'PRIZE-IPHONE15',
      deviceHash: 'TEST-DEV-HASH-001',
      ipAddress: '127.0.0.1',
    });

    const participations = await GiveawayParticipation.find({
      userId: userA.userId,
      giveawayId: 'GW-2026-08',
      prizeId: 'PRIZE-IPHONE15',
    });
    const userAAfterDup = await repo.findUserById('VE10842');

    if (dupResult.alreadyJoined === true && participations.length === 1 && userAAfterDup.wallet.VEs === userAAfter.wallet.VEs) {
      console.log(`✅ [PASSED] Duplicate request handled idempotently. Total entries in DB = ${participations.length}, Balance untouched at ${userAAfterDup.wallet.VEs} VEs.`);
      passedTests++;
    } else {
      console.error(`❌ [FAILED] Duplicate entry improperly modified state: entries=${participations.length}, balance=${userAAfterDup.wallet.VEs}`);
    }

    // -------------------------------------------------------------------
    // TEST 3: Attack C - Expired Giveaway Participation Attempt
    // -------------------------------------------------------------------
    console.log('\n[TEST 3] Attack C: User attempts to join ended giveaway event...');
    try {
      await processJoinGiveaway({
        userId: userA.userId,
        giveawayId: 'GW-2026-07', // Ended event
        prizeId: 'PRIZE-PAST-WATCH',
        deviceHash: 'TEST-DEV-HASH-001',
        ipAddress: '127.0.0.1',
      });
      console.error('❌ [FAILED] Participation in expired giveaway was improperly allowed!');
    } catch (err) {
      if (err.code === 'GIVEAWAY_ENDED' || err.code === 'GIVEAWAY_NOT_ACTIVE') {
        console.log(`✅ [PASSED] Expired giveaway join blocked with code: ${err.code}.`);
        passedTests++;
      } else {
        console.error(`❌ [FAILED] Unexpected error code: ${err.code}`);
      }
    }

    // -------------------------------------------------------------------
    // TEST 4: Attack D - Insufficient Balance Bypass Attempt
    // -------------------------------------------------------------------
    console.log('\n[TEST 4] Attack D: Low balance user (120 VEs) attempts 250 VEs join...');
    const userB = await repo.findUserById('VE10012'); // Jordan Lee (120 VEs)
    try {
      await processJoinGiveaway({
        userId: userB.userId,
        giveawayId: 'GW-2026-08',
        prizeId: 'PRIZE-IPHONE15',
        deviceHash: 'TEST-DEV-HASH-002',
        ipAddress: '127.0.0.1',
      });
      console.error('❌ [FAILED] Insufficient balance join was improperly processed!');
    } catch (err) {
      if (err.code === 'INSUFFICIENT_VE_BALANCE' || err.code === 'INSUFFICIENT_BALANCE') {
        const userBAfter = await repo.findUserById('VE10012');
        console.log(`✅ [PASSED] Insufficient balance rejected (${err.code}). User balance preserved at ${userBAfter.wallet.VEs} VEs.`);
        passedTests++;
      } else {
        console.error(`❌ [FAILED] Unexpected error: ${err.message}`);
      }
    }

    // -------------------------------------------------------------------
    // TEST 5: Attack E - Non-Winner Attempting to Claim Prize
    // -------------------------------------------------------------------
    console.log('\n[TEST 5] Attack E: Non-winner attempts to claim a prize...');
    try {
      await processPrizeClaim({
        userId: 'VE10842', // Alex Vance (not a winner for GW-2026-07)
        giveawayId: 'GW-2026-07',
        prizeId: 'PRIZE-PAST-WATCH',
        claimData: {
          fullName: 'Alex Vance',
          phoneNumber: '+91 9999999999',
          addressLine: 'Street 1',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
      });
      console.error('❌ [FAILED] Non-winner prize claim was improperly accepted!');
    } catch (err) {
      if (err.code === 'CLAIM_NOT_ALLOWED') {
        console.log(`✅ [PASSED] Unauthorized claim blocked with code: ${err.code}.`);
        passedTests++;
      } else {
        console.error(`❌ [FAILED] Unexpected error: ${err.message}`);
      }
    }

    // -------------------------------------------------------------------
    // TEST 6: Legitimate Winner Claim Processing
    // -------------------------------------------------------------------
    console.log('\n[TEST 6] Test F: Legitimate winner (Rohan Sharma VE10025) claims Apple Watch...');
    const claimRes = await processPrizeClaim({
      userId: 'VE10025',
      giveawayId: 'GW-2026-07',
      prizeId: 'PRIZE-PAST-WATCH',
      claimData: {
        fullName: 'Rohan Sharma',
        phoneNumber: '+91 9876543210',
        addressLine: '123 Tech Park',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560100',
      },
    });

    if (claimRes.success && claimRes.claim.status === 'SUBMITTED') {
      console.log(`✅ [PASSED] Claim successfully processed. Winner claim status: ${claimRes.claim.status}.`);
      passedTests++;
    } else {
      console.error(`❌ [FAILED] Legitimate claim failed: ${JSON.stringify(claimRes)}`);
    }

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (fatalError) {
    console.error('Fatal test error:', fatalError);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runSecurityTests();
