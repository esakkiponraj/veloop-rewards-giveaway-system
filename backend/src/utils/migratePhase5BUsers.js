/**
 * VELOOP Rewards — Phase 5B Identity Migration Utility (Idempotent)
 *
 * NOTE: Per safety guidelines, this migration must NOT be executed against
 * canonical evaluation data or production environments during Phase 5B release gate.
 *
 * Usage in staging / future release:
 *   node backend/src/utils/migratePhase5BUsers.js --run
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Counter from '../models/Counter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function runPhase5BMigration(isDryRun = true) {
  console.log('====================================================');
  console.log(`🛡️ VELOOP PHASE 5B USER IDENTITY MIGRATION (${isDryRun ? 'DRY-RUN' : 'LIVE'})`);
  console.log('====================================================\n');

  if (isDryRun) {
    console.log('ℹ️ Running in DRY-RUN mode. No database modifications will be committed.');
    console.log('   Pass --run flag to execute live schema migrations.\n');
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set in environment.');
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  try {
    // 1. Sync User Indexes (unique sparse googleId, unique username, unique userId)
    console.log('1. Syncing User indexes in MongoDB...');
    if (!isDryRun) {
      await User.syncIndexes();
      console.log('   ✅ Indexes synchronized successfully.');
    } else {
      console.log('   [Dry-run] Would synchronize User indexes (googleId sparse, username unique).');
    }

    // 2. Identify users missing authProviders or isEmailVerified
    const usersToUpdate = await User.find({
      $or: [
        { authProviders: { $exists: false } },
        { authProviders: { $size: 0 } },
        { isEmailVerified: { $exists: false } },
      ],
    });

    console.log(`2. Found ${usersToUpdate.length} user records requiring Phase 5B identity fields.`);

    if (!isDryRun && usersToUpdate.length > 0) {
      for (const u of usersToUpdate) {
        if (!u.authProviders || u.authProviders.length === 0) {
          u.authProviders = ['LOCAL'];
        }
        if (u.isEmailVerified === undefined) {
          // Grandfather canonical evaluation users as verified
          u.isEmailVerified = true;
        }
        await u.save();
      }
      console.log(`   ✅ Migrated ${usersToUpdate.length} users with authProviders: ['LOCAL'] and isEmailVerified.`);
    }

    // 3. Check and initialize sequential Counter
    const existingCounter = await Counter.findById('userId');
    if (!existingCounter) {
      const users = await User.find({ userId: /^VE\d+$/ }, { userId: 1 }).lean();
      let maxNumericId = 10842;
      for (const u of users) {
        const num = parseInt(u.userId.replace(/^VE/, ''), 10);
        if (!isNaN(num) && num > maxNumericId) {
          maxNumericId = num;
        }
      }

      console.log(`3. User ID sequence counter is not yet initialized. Found max ID: VE${maxNumericId}.`);
      if (!isDryRun) {
        await Counter.create({ _id: 'userId', seq: maxNumericId });
        console.log(`   ✅ Initialized Counter('userId') with seq: ${maxNumericId}.`);
      } else {
        console.log(`   [Dry-run] Would initialize Counter('userId') with seq: ${maxNumericId}.`);
      }
    } else {
      console.log(`3. User ID sequence counter is already active at seq: ${existingCounter.seq}.`);
    }

    console.log('\n====================================================');
    console.log('🎉 PHASE 5B IDENTITY MIGRATION AUDIT COMPLETE');
    console.log('====================================================');
  } finally {
    await mongoose.disconnect();
  }
}

// Execute only if invoked directly via CLI
if (process.argv[1] && process.argv[1].endsWith('migratePhase5BUsers.js')) {
  const isLive = process.argv.includes('--run');
  runPhase5BMigration(!isLive)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}
