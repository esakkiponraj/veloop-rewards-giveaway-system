import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import GiveawayParticipation from '../models/GiveawayParticipation.js';

async function inspectIndexes() {
  console.log('====================================================');
  console.log('📊 MONGODB INDEX INSPECTION & MIGRATION REPORT');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const db = mongoose.connection.db;
  const dbName = mongoose.connection.name;
  console.log(`Database Name: ${dbName}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Force index creation based on schema
  await GiveawayParticipation.syncIndexes();

  const collection = db.collection('giveawayparticipations');
  const indexes = await collection.indexes();

  console.log('Active Indexes on "giveawayparticipations":');
  console.log('----------------------------------------------------');
  indexes.forEach((idx) => {
    console.log(`- Name: "${idx.name}" | Keys: ${JSON.stringify(idx.key)} | Unique: ${!!idx.unique}`);
  });

  const hasOldIndex = indexes.some((idx) => idx.name === 'userId_1_giveawayId_1' || (idx.key.userId === 1 && idx.key.giveawayId === 1 && !idx.key.prizeId));
  const hasNewCompoundIndex = indexes.some((idx) => idx.key.userId === 1 && idx.key.giveawayId === 1 && idx.key.prizeId === 1 && idx.unique);

  console.log('\nAudit Check:');
  console.log(`- Old Index { userId: 1, giveawayId: 1 } exists: ${hasOldIndex}`);
  console.log(`- Required Unique Index { userId: 1, giveawayId: 1, prizeId: 1 } exists: ${hasNewCompoundIndex}`);

  if (hasOldIndex) {
    console.log('\n[MIGRATION REQUIRED] Found legacy index "userId_1_giveawayId_1". Dropping obsolete index...');
    try {
      await collection.dropIndex('userId_1_giveawayId_1');
      console.log('✅ Successfully dropped legacy index "userId_1_giveawayId_1".');
    } catch (e) {
      console.warn('Note on index drop:', e.message);
    }
  }

  // Re-verify after sync
  const postIndexes = await collection.indexes();
  console.log('\nFinal Active Indexes:');
  postIndexes.forEach((idx) => {
    console.log(`- Name: "${idx.name}" | Keys: ${JSON.stringify(idx.key)} | Unique: ${!!idx.unique}`);
  });

  await mongoose.disconnect();
  console.log('\n====================================================');
  console.log('🎉 INDEX INSPECTION & SYNC COMPLETE');
  console.log('====================================================');
  process.exit(0);
}

inspectIndexes();
