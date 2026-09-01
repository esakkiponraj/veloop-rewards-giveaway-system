/**
 * Development-Only Phase 3 Demo Setup Script
 *
 * Creates an isolated test ended campaign GW-QA-ENDED with small winner counts
 * and 3 test participants so reviewers can test admin lifecycle controls,
 * winner draws, and claim fulfillment on demand.
 *
 * NOTE: This script is for manual QA only and NEVER runs automatically during normal startup.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import User from '../models/User.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';

export const setupPhase3DemoData = async () => {
  const isMongo = mongoose.connection.readyState === 1;
  console.log('Setting up Phase 3 Isolated QA Demo Campaign (GW-QA-ENDED)...');

  const qaCampaignId = 'GW-QA-ENDED';

  if (!isMongo) {
    console.log('[Notice] MongoDB offline. Skipping QA persistent seed.');
    return;
  }

  // 1. Create or upsert QA Ended Campaign
  await Giveaway.findOneAndUpdate(
    { giveawayId: qaCampaignId },
    {
      $set: {
        giveawayId: qaCampaignId,
        slug: 'qa-ended-test-giveaway',
        title: 'VELOOP QA Ended Test Campaign (Phase 3 Demo)',
        description: 'Dedicated test campaign in ENDED status ready for admin winner selection and claims demonstration.',
        bannerImage: '/assets/giveaways/qa-banner.svg',
        status: 'ENDED',
        totalParticipants: 3,
        startAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true, new: true }
  );

  // 2. Create 2 test prizes
  await Prize.findOneAndUpdate(
    { prizeId: 'PRIZE-QA-WATCH' },
    {
      $set: {
        prizeId: 'PRIZE-QA-WATCH',
        giveawayId: qaCampaignId,
        name: 'Apple Watch Series 9 (QA Demo)',
        slug: 'qa-apple-watch',
        tagline: 'Space Black 45mm GPS · Test Unit',
        description: 'Physical prize demonstration for winner selection and shipping address claim flow.',
        prizeType: 'PHYSICAL',
        entryCurrency: 'VEs',
        entryAmount: 100,
        winnerCount: 1,
        position: '1st Prize',
        positionRank: 1,
        image: '/assets/prizes/applewatch.svg',
        isPendingConfirmation: false,
      },
    },
    { upsert: true, new: true }
  );

  await Prize.findOneAndUpdate(
    { prizeId: 'PRIZE-QA-AMAZON' },
    {
      $set: {
        prizeId: 'PRIZE-QA-AMAZON',
        giveawayId: qaCampaignId,
        name: '₹500 Amazon Gift Voucher (QA Demo)',
        slug: 'qa-amazon-500',
        tagline: 'Instant Digital Voucher · Test Unit',
        description: 'Digital gift card demonstration for winner selection and email fulfillment claim flow.',
        prizeType: 'GIFT_CARD',
        entryCurrency: 'VEs',
        entryAmount: 50,
        winnerCount: 1,
        position: '2nd Prize',
        positionRank: 2,
        image: '/assets/prizes/amazon.svg',
        isPendingConfirmation: false,
      },
    },
    { upsert: true, new: true }
  );

  // 3. Ensure test users participate
  const participants = [
    { userId: 'VE10842', entryCount: 5 }, // Alex Vance (weight: 5)
    { userId: 'VE10012', entryCount: 1 }, // Jordan Lee (weight: 1)
    { userId: 'VE10099', entryCount: 2 }, // Modal Tester (weight: 2)
  ];

  for (const p of participants) {
    await GiveawayParticipation.findOneAndUpdate(
      { giveawayId: qaCampaignId, prizeId: 'PRIZE-QA-WATCH', userId: p.userId },
      {
        $set: {
          giveawayId: qaCampaignId,
          prizeId: 'PRIZE-QA-WATCH',
          userId: p.userId,
          entryCount: p.entryCount,
          entryCurrency: 'VEs',
          entryAmount: 100,
          status: 'ACTIVE',
          joinedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          transactionId: `TXN-QA-${p.userId}-WATCH`,
        },
      },
      { upsert: true, new: true }
    );

    await GiveawayParticipation.findOneAndUpdate(
      { giveawayId: qaCampaignId, prizeId: 'PRIZE-QA-AMAZON', userId: p.userId },
      {
        $set: {
          giveawayId: qaCampaignId,
          prizeId: 'PRIZE-QA-AMAZON',
          userId: p.userId,
          entryCount: p.entryCount,
          entryCurrency: 'VEs',
          entryAmount: 50,
          status: 'ACTIVE',
          joinedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          transactionId: `TXN-QA-${p.userId}-AMZ`,
        },
      },
      { upsert: true, new: true }
    );
  }

  console.log('✅ Phase 3 Isolated QA Demo Campaign successfully seeded with 3 active participants.');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/veloop_db';
  mongoose
    .connect(mongoUri)
    .then(async () => {
      await setupPhase3DemoData();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('QA Seed error:', err);
      process.exit(1);
    });
}
