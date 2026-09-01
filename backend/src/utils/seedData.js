import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayEntryTransaction from '../models/GiveawayEntryTransaction.js';
import PrizeClaim from '../models/PrizeClaim.js';
import AuditLog from '../models/AuditLog.js';

dotenv.config();

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Cleaning old database collections...');
    await User.deleteMany({});
    await Giveaway.deleteMany({});
    await Prize.deleteMany({});
    await GiveawayWinner.deleteMany({});
    await GiveawayParticipation.deleteMany({});
    await GiveawayEntryTransaction.deleteMany({});
    await PrizeClaim.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('[Seed] Seeding test users...');
    const users = await User.create([
      {
        userId: 'VE10842',
        username: 'Alex Vance',
        email: 'alex.vance@example.com',
        password: 'password123',
        maskedId: 'VE****42',
        role: 'user',
        wallet: {
          VEs: 850,
          SVEs: 1200,
          Tokens: 5000,
        },
        fraudRiskScore: 5,
      },
      {
        userId: 'VE10012',
        username: 'Jordan Lee',
        email: 'jordan.lee@example.com',
        password: 'password123',
        maskedId: 'VE****12',
        role: 'user',
        wallet: {
          VEs: 120, // Low balance for insufficient balance test
          SVEs: 150,
          Tokens: 600,
        },
        fraudRiskScore: 10,
      },
      {
        userId: 'VE10025',
        username: 'Rohan Sharma',
        email: 'rohan.winner@example.com',
        password: 'password123',
        maskedId: 'VE****25',
        role: 'user',
        wallet: {
          VEs: 450,
          SVEs: 900,
          Tokens: 3500,
        },
        fraudRiskScore: 0,
      },
      {
        userId: 'VE00001',
        username: 'VELOOP SuperAdmin',
        email: 'admin@veloop.io',
        password: 'admin123',
        maskedId: 'ADMIN****01',
        role: 'admin',
        wallet: {
          VEs: 99999,
          SVEs: 99999,
          Tokens: 999999,
        },
        fraudRiskScore: 0,
      },
    ]);

    console.log('[Seed] Seeding Active Giveaway: VELOOP Summer Megadraw 2026...');
    const currentGiveawayId = 'GW-2026-08';
    const now = new Date();
    const futureEnd = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000 + 45 * 60 * 1000); // 12d 8h 45m

    const currentPrizes = await Prize.create([
      {
        prizeId: 'PRIZE-IPHONE15',
        giveawayId: currentGiveawayId,
        name: 'iPhone 15 Pro (128GB)',
        slug: 'iphone-15-pro',
        tagline: 'Deep Midnight Titanium · A17 Pro Chip · Super Retina XDR',
        description:
          'Experience the breakthrough aerospace-grade titanium design, A17 Pro gaming chip, customized Action button, and versatile 48MP Pro camera system.',
        specifications: [
          { label: 'Color', value: 'Deep Midnight Titanium' },
          { label: 'Storage', value: '128GB' },
          { label: 'Display', value: '6.1-inch OLED Super Retina XDR ProMotion' },
          { label: 'Processor', value: 'A17 Pro (3nm architecture)' },
          { label: 'Warranty', value: '1-Year Official Apple Warranty' },
        ],
        position: '1st Prize',
        positionRank: 1,
        image: '/assets/prizes/iphone15pro.svg',
        accentColor: '#8b5cf6',
        prizeType: 'PHYSICAL',
        entryCurrency: 'VEs',
        entryAmount: 250, // 250 VEs
        winnerCount: 1,
        claimType: 'SHIPPING_ADDRESS',
        marketValue: '₹1,34,900',
        eligibilityNotes: 'All verified VELOOP tier members with at least 250 VEs balance.',
      },
      {
        prizeId: 'PRIZE-APPLEWATCH9',
        giveawayId: currentGiveawayId,
        name: 'Apple Watch Series 9',
        slug: 'apple-watch',
        tagline: 'Space Black 45mm GPS · S9 SiP · Double Tap Gesture',
        description:
          'Brighter always-on display, ultra-fast S9 dual-core processor, advanced ECG/Blood Oxygen health tracking, and magical Double Tap gesture control.',
        specifications: [
          { label: 'Case Size', value: '45mm Space Black Aluminum' },
          { label: 'Connectivity', value: 'GPS + Wi-Fi & Bluetooth 5.3' },
          { label: 'Battery Life', value: 'Up to 36 hours in Low Power Mode' },
          { label: 'Sensors', value: 'Electrical Heart Sensor (ECG), Temperature, SpO2' },
        ],
        position: '2nd Prize',
        positionRank: 2,
        image: '/assets/prizes/applewatch.svg',
        accentColor: '#3b82f6',
        prizeType: 'PHYSICAL',
        entryCurrency: 'VEs',
        entryAmount: 200, // 200 VEs
        winnerCount: 3,
        claimType: 'SHIPPING_ADDRESS',
        marketValue: '₹44,900',
        eligibilityNotes: 'Requires active VELOOP account with minimum 200 VEs balance.',
      },
      {
        prizeId: 'PRIZE-AIRPODSPRO2',
        giveawayId: currentGiveawayId,
        name: 'AirPods Pro 2',
        slug: 'airpods',
        tagline: 'USB-C MagSafe Case · 2x Noise Cancellation · Personalized Spatial Audio',
        description:
          'Next-level acoustic performance powered by the H2 chip, adaptive audio, intelligent noise reduction, and precision MagSafe case tracking.',
        specifications: [
          { label: 'Chip', value: 'Apple H2 Headphone Processor' },
          { label: 'Audio', value: 'Lossless Audio & Personalized Spatial Audio' },
          { label: 'Charging Case', value: 'MagSafe Case (USB-C) with Speaker & Lanyard Loop' },
          { label: 'Sweat & Water', value: 'IP54 rated dust, sweat and water resistant' },
        ],
        position: '3rd Prize',
        positionRank: 3,
        image: '/assets/prizes/airpods.svg',
        accentColor: '#10b981',
        prizeType: 'PHYSICAL',
        entryCurrency: 'SVEs', // 500 SVEs
        entryAmount: 500,
        winnerCount: 5,
        claimType: 'SHIPPING_ADDRESS',
        marketValue: '₹24,900',
        eligibilityNotes: 'Requires SVEs (Super VELOOP Earnings) earned via platform milestones.',
      },
      {
        prizeId: 'PRIZE-AMAZON2000',
        giveawayId: currentGiveawayId,
        name: '₹2,000 Amazon Gift Card',
        slug: 'amazon-2000',
        tagline: 'Instant Digital Voucher · 1 Year Validity · Zero Convenience Fee',
        description:
          'Shop millions of products on Amazon.in. Instant digital voucher delivered directly to the winner’s verified email address with zero deductions.',
        specifications: [
          { label: 'Denomination', value: '₹2,000 INR Digital Code' },
          { label: 'Delivery', value: 'Instant Email Dispatch after Claim Verification' },
          { label: 'Validity', value: '365 Days from date of issue' },
          { label: 'Redemption', value: 'Amazon Pay Balance on Amazon.in' },
        ],
        position: 'Lucky Draw',
        positionRank: 4,
        image: '/assets/prizes/amazon2000.svg',
        accentColor: '#f59e0b',
        prizeType: 'GIFT_CARD',
        entryCurrency: 'VEs',
        entryAmount: 500, // 500 VEs
        winnerCount: 10,
        claimType: 'EMAIL_DELIVERY',
        marketValue: '₹2,000',
        eligibilityNotes: 'Open to all Indian residents with verified Amazon.in accounts.',
      },
      {
        prizeId: 'PRIZE-AMAZON500',
        giveawayId: currentGiveawayId,
        name: '₹500 Amazon Gift Card',
        slug: 'amazon-500',
        tagline: 'Fast Digital E-Gift Card · Direct Email Fulfillment',
        description:
          'Quick ₹500 Amazon Pay gift voucher ideal for books, tech accessories, essentials, and digital content with instantaneous fulfillment.',
        specifications: [
          { label: 'Denomination', value: '₹500 INR Digital Card' },
          { label: 'Delivery', value: 'Email Code' },
          { label: 'Validity', value: '1 Year' },
        ],
        position: 'Special Reward',
        positionRank: 5,
        image: '/assets/prizes/amazon500.svg',
        accentColor: '#ec4899',
        prizeType: 'GIFT_CARD',
        entryCurrency: 'VEs',
        entryAmount: 300, // 300 VEs
        winnerCount: 25,
        claimType: 'EMAIL_DELIVERY',
        marketValue: '₹500',
        eligibilityNotes: 'Requires 300 VEs balance.',
      },
      {
        prizeId: 'PRIZE-AMAZON20',
        giveawayId: currentGiveawayId,
        name: '₹20 Shopping Voucher',
        slug: 'amazon-20',
        tagline: 'Micro Reward · Token Conversion Giveaway',
        description:
          'Convert your active platform activity Tokens into real shopping credits. Hundreds of winners selected automatically at event conclusion.',
        specifications: [
          { label: 'Denomination', value: '₹20 INR Instant Code' },
          { label: 'Entry Currency', value: '2,000 Platform Tokens' },
        ],
        position: 'Milestone Reward',
        positionRank: 6,
        image: '/assets/prizes/amazon20.svg',
        accentColor: '#6366f1',
        prizeType: 'DIGITAL',
        entryCurrency: 'Tokens', // 2,000 Tokens
        entryAmount: 2000,
        winnerCount: 100,
        claimType: 'EMAIL_DELIVERY',
        marketValue: '₹20',
        eligibilityNotes: 'Redeemable with platform activity Tokens.',
      },
    ]);

    await Giveaway.create({
      giveawayId: currentGiveawayId,
      title: 'Summer Rewards Megadraw 2026',
      slug: 'summer-rewards-megadraw',
      subtitle: 'Complete eligible activities, use your reward balance, and win exclusive Apple hardware & Amazon vouchers.',
      description:
        'Welcome to the premier VELOOP Rewards Giveaway of the season! Redeem your accumulated VEs, SVEs, and platform Tokens to secure entry for official Apple gear and high-value shopping gift cards. All entries are cryptographically hashed and verified against anti-fraud security filters.',
      status: 'ACTIVE',
      isFeatured: true,
      startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Started 2 days ago
      endAt: futureEnd,
      totalParticipants: 8540,
      totalPrizesAwarded: 1240,
      prizes: currentPrizes.map((p) => p._id),
      rules: [
        {
          title: 'One Entry Per Giveaway Event',
          description:
            'Each verified VELOOP member is permitted exactly one entry per giveaway event. Duplicate submissions from the same account are automatically rejected by our database integrity engine.',
        },
        {
          title: 'Authoritative Balance Verification',
          description:
            'Your virtual currency balance (VEs, SVEs, or Tokens) is securely verified and atomically deducted upon entry confirmation. Insufficient balance prevents participation.',
        },
        {
          title: 'Anti-Abuse & Multi-Account Signal Analysis',
          description:
            'Automated device hash evaluation detects multi-account clustering and robotic velocity. Suspicious entries are flagged or blocked without granting winner eligibility.',
        },
        {
          title: 'Fair Random Selection',
          description:
            'Winners are selected server-side using cryptographically secure random distribution upon giveaway conclusion. Results are permanently auditable.',
        },
        {
          title: '7-Day Prize Claim Window',
          description:
            'Selected winners must submit their fulfillment information (shipping details for physical items, verified email for digital gift cards) within 7 calendar days of announcement.',
        },
      ],
      termsAndConditions: [
        {
          section: '1. Eligibility & Identity',
          content:
            'Participation is open to registered VELOOP Rewards members aged 18 and older. Employees and direct affiliates of VELOOP Rewards are ineligible to participate in grand tier prizes.',
        },
        {
          section: '2. Entry Fees & Currency Deduction',
          content:
            'Entry fees (e.g., 250 VEs for iPhone 15 Pro, 500 SVEs for AirPods Pro 2) represent platform reward redemption. In the event of system-level giveaway cancellation, entry amounts are subject to administrative balance reversal.',
        },
        {
          section: '3. Winner Selection & Tamper-Proof Audit',
          content:
            'Draws occur strictly after the countdown timer reaches zero and are finalized via backend cryptographic seeds. Client-side scripts cannot influence or observe draw results beforehand.',
        },
        {
          section: '4. Fulfillment & Shipping',
          content:
            'Physical rewards are dispatched via insured courier partners across eligible PIN codes. Digital Amazon gift card codes are issued to the email address provided in the winner claim form.',
        },
        {
          section: '5. Disqualification Policy',
          content:
            'Any attempt to exploit latency, reverse engineer API payloads, tamper with request parameters, or manipulate virtual balance results in immediate account suspension and prize forfeiture.',
        },
      ],
      importantInformation: [
        {
          title: 'Transparent Winner Masking',
          content:
            'To protect privacy while maintaining transparency, winner announcements display masked user identifiers (e.g., VE****42) across public leaderboards.',
        },
        {
          title: 'Zero Hidden Fees',
          content:
            'VELOOP Rewards covers 100% of shipping, insurance, and courier handling fees for all physical rewards. You will never be asked for additional payment to receive your prize.',
        },
        {
          title: 'Customer Support Escalation',
          content:
            'Have questions about your participation or claim verification? Reach our dedicated 24/7 Rewards Concierge at support@veloop.io.',
        },
      ],
      faq: [
        {
          question: 'How do I participate in a giveaway?',
          answer:
            'Log into your VELOOP account, select your preferred prize card to navigate to its individual details page, review the exact entry cost and rules, and click "Join Giveaway". Once confirmed, your balance is deducted and your entry is recorded.',
        },
        {
          question: 'Can I join multiple different prizes in the same giveaway?',
          answer:
            'Yes! You can participate in different prize categories (e.g., iPhone 15 Pro and AirPods Pro 2) provided you have the required VEs/SVEs balance for each, but you can only submit one entry per prize.',
        },
        {
          question: 'How are winners announced and notified?',
          answer:
            'Winners are finalized on the backend immediately after the countdown ends. The Winners tab displays the masked winner list, and winning accounts see a personalized "Congratulations! Claim Your Prize" banner on their dashboard.',
        },
        {
          question: 'What information do I need to submit to claim a prize?',
          answer:
            'Physical prizes (iPhone, Watch, AirPods) require full shipping details (name, phone, address, city, state, PIN code). Amazon Gift Cards require only your verified email address.',
        },
        {
          question: 'What happens if I do not have enough VEs or SVEs?',
          answer:
            'The individual giveaway page will indicate "Insufficient Balance" and show the exact deficit. You can complete more VELOOP platform activities and tasks to earn the remaining balance.',
        },
      ],
      winnerAnnouncements: [
        {
          id: 'ANN-1',
          maskedUserId: 'VE****21',
          prizeName: 'iPhone 15 Pro',
          avatarColor: '#8b5cf6',
        },
        {
          id: 'ANN-2',
          maskedUserId: 'VE****83',
          prizeName: 'Apple Watch Series 9',
          avatarColor: '#3b82f6',
        },
        {
          id: 'ANN-3',
          maskedUserId: 'VE****54',
          prizeName: 'AirPods Pro 2',
          avatarColor: '#10b981',
        },
        {
          id: 'ANN-4',
          maskedUserId: 'VE****92',
          prizeName: '₹2,000 Amazon Gift Card',
          avatarColor: '#f59e0b',
        },
      ],
    });

    console.log('[Seed] Seeding Historical Giveaway: VELOOP Monsoon Kickoff 2026...');
    const pastGiveawayId = 'GW-2026-07';
    const pastPrizes = await Prize.create([
      {
        prizeId: 'PRIZE-PAST-WATCH',
        giveawayId: pastGiveawayId,
        name: 'Apple Watch Series 9',
        slug: 'past-apple-watch',
        description: 'Apple Watch Series 9 Space Black GPS 45mm',
        position: '1st Prize',
        positionRank: 1,
        image: '/assets/prizes/applewatch.svg',
        accentColor: '#3b82f6',
        prizeType: 'PHYSICAL',
        entryCurrency: 'VEs',
        entryAmount: 200,
        winnerCount: 1,
        claimType: 'SHIPPING_ADDRESS',
        marketValue: '₹44,900',
      },
      {
        prizeId: 'PRIZE-PAST-AMAZON',
        giveawayId: pastGiveawayId,
        name: '₹2,000 Amazon Gift Card',
        slug: 'past-amazon-2000',
        description: '₹2,000 INR Amazon Digital Voucher',
        position: '2nd Prize',
        positionRank: 2,
        image: '/assets/prizes/amazon2000.svg',
        accentColor: '#f59e0b',
        prizeType: 'GIFT_CARD',
        entryCurrency: 'VEs',
        entryAmount: 500,
        winnerCount: 3,
        claimType: 'EMAIL_DELIVERY',
        marketValue: '₹2,000',
      },
    ]);

    await Giveaway.create({
      giveawayId: pastGiveawayId,
      title: 'Monsoon Kickoff Rewards 2026',
      slug: 'monsoon-kickoff-rewards',
      subtitle: 'Exclusive kickoff giveaway event featuring premium smart wearables and Amazon shopping vouchers.',
      description: 'Completed giveaway event from earlier this month. All prizes finalized and claimed.',
      status: 'ENDED',
      isFeatured: false,
      startAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      totalParticipants: 6420,
      totalPrizesAwarded: 450,
      prizes: pastPrizes.map((p) => p._id),
      rules: [],
      termsAndConditions: [],
    });

    console.log('[Seed] Seeding Winners for Past Giveaway (including VE10025)...');
    await GiveawayWinner.create([
      {
        giveawayId: pastGiveawayId,
        prizeId: 'PRIZE-PAST-WATCH',
        userId: 'VE10025', // Rohan Sharma (winner_user)
        maskedUserId: 'VE****25',
        prizeName: 'Apple Watch Series 9',
        prizeType: 'PHYSICAL',
        claimDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days remaining to claim
        selectionMethod: 'CRYPTOGRAPHIC_RANDOM',
        status: 'SELECTED',
        selectedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        giveawayId: pastGiveawayId,
        prizeId: 'PRIZE-PAST-AMAZON',
        userId: 'VE10991',
        maskedUserId: 'VE****91',
        prizeName: '₹2,000 Amazon Gift Card',
        prizeType: 'GIFT_CARD',
        claimDeadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        selectionMethod: 'CRYPTOGRAPHIC_RANDOM',
        status: 'CLAIMED',
        selectedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        giveawayId: pastGiveawayId,
        prizeId: 'PRIZE-PAST-AMAZON',
        userId: 'VE10482',
        maskedUserId: 'VE****82',
        prizeName: 'iPhone 15 Pro',
        prizeType: 'PHYSICAL',
        claimDeadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        selectionMethod: 'CRYPTOGRAPHIC_RANDOM',
        status: 'DELIVERED',
        selectedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
    ]);

    console.log('[Seed] Seeding Upcoming Giveaway...');
    await Giveaway.create({
      giveawayId: 'GW-2026-09',
      title: 'Festive Tech Gala 2026',
      slug: 'festive-tech-gala-2026',
      subtitle: 'Next month’s blockbuster giveaway with MacBook Pro, Sony PS5, and ₹10,000 Gift Cards.',
      description: 'Prepare your VEs balance for our largest rewards gala yet. Unlocking in 3 days!',
      status: 'UPCOMING',
      isFeatured: false,
      startAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      totalParticipants: 0,
      totalPrizesAwarded: 0,
      prizes: [],
      rules: [],
    });

    console.log('✅ [Seed] Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ [Seed Error]:', error);
  }
};

if (process.argv[1] && process.argv[1].endsWith('seedData.js')) {
  mongoose
    .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veloop_rewards')
    .then(async () => {
      await seedDatabase();
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to connect to Mongo for seeding:', err);
      process.exit(1);
    });
}
