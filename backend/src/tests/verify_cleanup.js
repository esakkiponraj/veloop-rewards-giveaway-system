import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/veloop_db';

async function check() {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  const gw = await db.collection('giveaways').findOne({ giveawayId: 'GW-2026-08' });
  const prizes = await db.collection('prizes').find({ giveawayId: 'GW-2026-08' }).toArray();
  const userIds = ['VE10842', 'VE10012', 'VE10025', 'VE10099', 'VE00001'];
  const users = await db.collection('users').find({ userId: { $in: userIds } }).toArray();

  const qaGw = await db.collection('giveaways').findOne({ giveawayId: 'GW-QA-PHASE3' });
  const qaPrizes = await db.collection('prizes').find({ giveawayId: 'GW-QA-PHASE3' }).toArray();
  const qaUsers = await db.collection('users').find({ userId: { $regex: '^QA-' } }).toArray();
  const qaParticipations = await db.collection('giveawayparticipations').find({ giveawayId: 'GW-QA-PHASE3' }).toArray();

  console.log('--- CANONICAL DATA ---');
  console.log('Canonical Giveaway:', gw?.giveawayId, '| Status:', gw?.status);
  console.log('Canonical Prizes Count:', prizes.length);
  console.log('Canonical Users Count:', users.length);
  for (const u of users) {
    console.log(`  User: ${u.username} (${u.userId}) | VEs: ${u.wallet?.VEs} | SVEs: ${u.wallet?.SVEs} | Tokens: ${u.wallet?.Tokens}`);
  }

  console.log('\n--- QA CLEANUP STATUS ---');
  console.log('QA Campaign Exists:', !!qaGw);
  console.log('QA Prizes Count:', qaPrizes.length);
  console.log('QA Users Count:', qaUsers.length);
  console.log('QA Participations Count:', qaParticipations.length);

  await mongoose.disconnect();
}

check().catch(console.error);
