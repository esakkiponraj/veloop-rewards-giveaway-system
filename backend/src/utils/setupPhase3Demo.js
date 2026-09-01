/**
 * Development-Only Phase 3 Demo Setup & Cleanup Utility
 *
 * Usage:
 *   Setup QA Campaign:   node backend/src/utils/setupPhase3Demo.js
 *   Cleanup QA Campaign: node backend/src/utils/setupPhase3Demo.js --cleanup
 *
 * NOTE: This script is for manual developer QA only and NEVER runs automatically during normal startup.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import User from '../models/User.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import PrizeClaim from '../models/PrizeClaim.js';
import AuditLog from '../models/AuditLog.js';

export const QA_CAMPAIGN_ID = 'GW-QA-PHASE3';
export const QA_PRIZE_IPHONE = 'PRIZE-QA-IPHONE';
export const QA_PRIZE_AMAZON = 'PRIZE-QA-AMAZON';

export const QA_USERS = [
  {
    userId: 'QA-USR-ALEX',
    username: 'QA Alex Vance',
    email: 'qa.alex@veloop.io',
    password: 'password123',
    maskedId: 'QA****A1',
    wallet: { VEs: 1000, SVEs: 1500, Tokens: 5000 },
  },
  {
    userId: 'QA-USR-BOB',
    username: 'QA Bob Vance',
    email: 'qa.bob@veloop.io',
    password: 'password123',
    maskedId: 'QA****B2',
    wallet: { VEs: 1000, SVEs: 1500, Tokens: 5000 },
  },
  {
    userId: 'QA-USR-CAROL',
    username: 'QA Carol Danvers',
    email: 'qa.carol@veloop.io',
    password: 'password123',
    maskedId: 'QA****C3',
    wallet: { VEs: 1000, SVEs: 1500, Tokens: 5000 },
  },
  {
    userId: 'QA-USR-DAVID',
    username: 'QA David Miller',
    email: 'qa.david@veloop.io',
    password: 'password123',
    maskedId: 'QA****D4',
    wallet: { VEs: 1000, SVEs: 1500, Tokens: 5000 },
  },
];

export const cleanupPhase3DemoData = async () => {
  const isMongo = mongoose.connection.readyState === 1;
  if (!isMongo) {
    console.log('[Notice] MongoDB is not connected.');
    return;
  }

  const qaUserIds = QA_USERS.map((u) => u.userId);
  await User.deleteMany({ userId: { $in: qaUserIds } });
  await Giveaway.deleteMany({ giveawayId: QA_CAMPAIGN_ID });
  await Prize.deleteMany({ giveawayId: QA_CAMPAIGN_ID });
  await GiveawayParticipation.deleteMany({ giveawayId: QA_CAMPAIGN_ID });
  await GiveawayWinner.deleteMany({ giveawayId: QA_CAMPAIGN_ID });
  await PrizeClaim.deleteMany({ giveawayId: QA_CAMPAIGN_ID });
  await AuditLog.deleteMany({ giveawayId: QA_CAMPAIGN_ID });

  console.log('\n🧹 [CLEANUP COMPLETE] Removed all QA Demo records (Campaign GW-QA-PHASE3, test prizes, participations, winners, claims, and QA users).\n');
};

export const setupPhase3DemoData = async () => {
  const isMongo = mongoose.connection.readyState === 1;
  if (!isMongo) {
    console.log('[Notice] MongoDB offline. Cannot seed persistent QA demo.');
    return;
  }

  // 1. Clean previous QA run
  await cleanupPhase3DemoData();

  console.log('\n====================================================');
  console.log('🚀 SEEDING PHASE 3 ISOLATED QA CAMPAIGN (GW-QA-PHASE3)');
  console.log('====================================================\n');

  // 2. Create QA Users (pass plaintext password to let Mongoose pre-save hook hash it exactly once)
  for (const u of QA_USERS) {
    await User.create({
      userId: u.userId,
      username: u.username,
      email: u.email,
      password: u.password, // Standard registration flow: pre-save hook handles hashing
      role: 'user',
      maskedId: u.maskedId,
      wallet: u.wallet,
    });
  }

  // 3. Create QA ACTIVE Campaign
  const now = new Date();
  const futureEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const campaign = await Giveaway.create({
    giveawayId: QA_CAMPAIGN_ID,
    title: 'VELOOP QA Testing Campaign (Phase 3 Demo)',
    slug: 'qa-phase3-demo-campaign',
    description: 'Dedicated QA Campaign created in ACTIVE status for testing Admin Lifecycle Controls, Winner Selection, and Claim Flows.',
    bannerImage: '/assets/giveaways/qa-banner.svg',
    status: 'ACTIVE', // Active by default so admin can test ACTIVE -> ENDED -> Draw
    totalParticipants: 4,
    startAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    endAt: futureEnd,
  });

  // 4. Create QA Physical & Digital Prizes
  const prizePhone = await Prize.create({
    prizeId: QA_PRIZE_IPHONE,
    giveawayId: QA_CAMPAIGN_ID,
    name: 'QA iPhone 15 Pro (Physical Prize)',
    slug: 'qa-iphone-15-pro',
    description: 'Flagship titanium smartphone for QA physical shipping claim testing.',
    position: '1st Prize',
    positionRank: 1,
    image: '/assets/prizes/iphone15pro.svg',
    prizeType: 'PHYSICAL',
    entryCurrency: 'VEs',
    entryAmount: 100,
    winnerCount: 1,
    isPendingConfirmation: false,
  });

  const prizeAmazon = await Prize.create({
    prizeId: QA_PRIZE_AMAZON,
    giveawayId: QA_CAMPAIGN_ID,
    name: 'QA ₹1,000 Amazon Voucher (Digital Prize)',
    slug: 'qa-amazon-1000',
    description: 'Instant digital gift card for QA email voucher claim testing.',
    position: '2nd Prize',
    positionRank: 2,
    image: '/assets/prizes/amazon.svg',
    prizeType: 'GIFT_CARD',
    entryCurrency: 'VEs',
    entryAmount: 50,
    winnerCount: 1,
    isPendingConfirmation: false,
  });

  // 5. Seed Eligible Participations with Varied Weights
  const participations = [
    // Prize 1: Phone (Alex: 5 entries, Bob: 1 entry, Carol: 2 entries)
    { userId: 'QA-USR-ALEX', prizeId: QA_PRIZE_IPHONE, entryCount: 5, amount: 100, currency: 'VEs' },
    { userId: 'QA-USR-BOB', prizeId: QA_PRIZE_IPHONE, entryCount: 1, amount: 100, currency: 'VEs' },
    { userId: 'QA-USR-CAROL', prizeId: QA_PRIZE_IPHONE, entryCount: 2, amount: 100, currency: 'VEs' },

    // Prize 2: Amazon Voucher (Alex: 2 entries, Carol: 3 entries, David: 1 entry)
    { userId: 'QA-USR-ALEX', prizeId: QA_PRIZE_AMAZON, entryCount: 2, amount: 50, currency: 'VEs' },
    { userId: 'QA-USR-CAROL', prizeId: QA_PRIZE_AMAZON, entryCount: 3, amount: 50, currency: 'VEs' },
    { userId: 'QA-USR-DAVID', prizeId: QA_PRIZE_AMAZON, entryCount: 1, amount: 50, currency: 'VEs' },
  ];

  for (const p of participations) {
    await GiveawayParticipation.create({
      giveawayId: QA_CAMPAIGN_ID,
      prizeId: p.prizeId,
      userId: p.userId,
      entryCount: p.entryCount,
      entryCurrency: p.currency,
      entryAmount: p.amount,
      deviceHash: `DEV-HASH-${p.userId}`,
      status: 'ACTIVE',
      joinedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      transactionId: `TXN-QA-${p.userId}-${p.prizeId.slice(-6)}`,
    });
  }

  console.log('✅ QA Campaign Seeded Successfully!\n');
  console.log('----------------------------------------------------');
  console.log('📋 QA DEMO LOGIN CREDENTIALS & MASKED IDs MATRIX');
  console.log('----------------------------------------------------');
  console.table(
    QA_USERS.map((u) => ({
      'Email / Username': u.email,
      Password: u.password,
      'Masked ID (Shown in Draw)': u.maskedId,
      'User ID': u.userId,
    }))
  );
  console.log('\n🎯 TEST INSTRUCTIONS:');
  console.log('  1. Log in as admin (admin@veloop.io / admin123) and go to /admin.');
  console.log('  2. In Campaign Controls, click "End Campaign" on GW-QA-PHASE3.');
  console.log('  3. Click "Draw Winners" to trigger weighted selection.');
  console.log('  4. Identify the winning masked ID from the matrix above.');
  console.log('  5. Log in as that QA user, open /my-entries, and submit the physical/digital claim.');
  console.log('  6. Return to /admin, go to Prize Claims, and process the fulfillment.');
  console.log('\n🧹 TO CLEAN UP AFTER TESTING:');
  console.log('  node backend/src/utils/setupPhase3Demo.js --cleanup\n');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isCleanup = process.argv.includes('--cleanup');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/veloop_db';

  mongoose
    .connect(mongoUri)
    .then(async () => {
      if (isCleanup) {
        await cleanupPhase3DemoData();
      } else {
        await setupPhase3DemoData();
      }
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('QA Script Error:', err);
      process.exit(1);
    });
}
