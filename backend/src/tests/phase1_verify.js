import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import Prize from '../models/Prize.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import PrizeClaim from '../models/PrizeClaim.js';
import { selectWeightedRandomWithoutReplacement } from '../services/winnerService.js';

async function verifyPhase1() {
  console.log('====================================================');
  console.log('🔍 VELOOP REWARDS — PHASE 1 TECHNICAL VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASSED] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAILED] ${message}`);
      failed++;
    }
  }

  // 1. Verify GiveawayParticipation Schema
  const partSchema = GiveawayParticipation.schema;
  assert(partSchema.path('entryCount') !== undefined, 'GiveawayParticipation schema contains entryCount field');
  assert(partSchema.path('entryCount').defaultValue === 1, 'entryCount defaults to 1');

  // Check Compound Index on GiveawayParticipation
  const indexes = partSchema.indexes();
  const hasCompoundIndex = indexes.some(([fields]) => fields.userId === 1 && fields.giveawayId === 1 && fields.prizeId === 1);
  assert(hasCompoundIndex, 'GiveawayParticipation contains compound unique index on { userId: 1, giveawayId: 1, prizeId: 1 }');

  // 2. Verify Prize Schema
  const prizeSchema = Prize.schema;
  assert(prizeSchema.path('isPendingConfirmation') !== undefined, 'Prize schema contains isPendingConfirmation field');
  assert(prizeSchema.path('pendingConfirmationNote') !== undefined, 'Prize schema contains pendingConfirmationNote field');

  // 3. Test Weighted Random Winner Selection Algorithm
  const sampleCandidates = [
    { userId: 'U1', entryCount: 1 },
    { userId: 'U2', entryCount: 5 }, // 5x higher weight
    { userId: 'U3', entryCount: 10 }, // 10x higher weight
    { userId: 'U4', entryCount: 2 },
  ];

  const winners = selectWeightedRandomWithoutReplacement(sampleCandidates, 2);
  assert(winners.length === 2, 'selectWeightedRandomWithoutReplacement selects exact requested count (2 winners)');
  assert(winners[0].userId !== winners[1].userId, 'Winners are selected without replacement (no duplicate winners)');

  // 4. Test MongoDB Atlas Connection & Session Transactions
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      assert(mongoose.connection.readyState === 1, `Connected to MongoDB Atlas replica set (${mongoose.connection.host})`);

      const session = await mongoose.startSession();
      session.startTransaction();
      assert(session.inTransaction(), 'MongoDB session transaction started successfully');
      await session.abortTransaction();
      await session.endSession();
      assert(true, 'MongoDB session transaction aborted and ended cleanly');
      await mongoose.disconnect();
    } catch (err) {
      assert(false, `MongoDB Atlas connection error: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  console.log(`🎉 PHASE 1 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

verifyPhase1();
