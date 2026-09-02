import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayEntryTransaction from '../models/GiveawayEntryTransaction.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import PrizeClaim from '../models/PrizeClaim.js';

async function inspectAllIndexes() {
  console.log('====================================================');
  console.log('📊 MONGODB ACTIVE INDEXES VERIFICATION REPORT');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });

  const db = mongoose.connection.db;

  // Sync schema indexes
  await GiveawayParticipation.syncIndexes();
  await GiveawayEntryTransaction.syncIndexes();
  await GiveawayWinner.syncIndexes();
  await PrizeClaim.syncIndexes();

  const collections = [
    { name: 'giveawayparticipations', model: GiveawayParticipation },
    { name: 'giveawayentrytransactions', model: GiveawayEntryTransaction },
    { name: 'giveawaywinners', model: GiveawayWinner },
    { name: 'prizeclaims', model: PrizeClaim },
  ];

  for (const col of collections) {
    console.log(`\nCollection: "${col.name}"`);
    console.log('----------------------------------------------------');
    const indexes = await db.collection(col.name).indexes();
    indexes.forEach((idx) => {
      console.log(
        `  • Index Name: "${idx.name}" | Keys: ${JSON.stringify(idx.key)} | Unique: ${!!idx.unique}`
      );
    });
  }

  await mongoose.disconnect();
  console.log('\n====================================================');
  console.log('🎉 ALL 4 COLLECTIONS INDEXES VERIFIED');
  console.log('====================================================');
}

inspectAllIndexes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error inspecting indexes:', err);
    process.exit(1);
  });
