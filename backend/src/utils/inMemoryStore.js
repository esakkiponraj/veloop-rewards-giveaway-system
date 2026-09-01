// Zero-config in-memory fallback store when MongoDB daemon is not running locally
import bcrypt from 'bcryptjs';

class InMemoryStore {
  constructor() {
    this.users = [];
    this.giveaways = [];
    this.prizes = [];
    this.participations = [];
    this.transactions = [];
    this.winners = [];
    this.claims = [];
    this.fraudEvents = [];
    this.auditLogs = [];
    this.ads = [];
    this.adCompletions = [];
    this.tasks = [];
    this.taskClaims = [];
    this.referrals = [];
    this.withdrawals = [];
    this.initSeed();
  }

  initSeed() {
    const passwordHash = bcrypt.hashSync('password123', 8);
    const adminHash = bcrypt.hashSync('admin123', 8);

    this.users = [
      {
        userId: 'VE10842',
        username: 'Alex Vance',
        email: 'alex.vance@example.com',
        password: passwordHash,
        maskedId: 'VE****42',
        role: 'user',
        wallet: { VEs: 850, SVEs: 1200, Tokens: 5000 },
        fraudRiskScore: 5,
        isFraudSuspended: false,
        streak: 12,
        lastDailyBonusAt: null,
        referralCode: 'VELOOP-VE10842',
      },
      {
        userId: 'VE10012',
        username: 'Jordan Lee',
        email: 'jordan.lee@example.com',
        password: passwordHash,
        maskedId: 'VE****12',
        role: 'user',
        wallet: { VEs: 120, SVEs: 150, Tokens: 600 },
        fraudRiskScore: 10,
        isFraudSuspended: false,
        streak: 3,
        lastDailyBonusAt: null,
        referralCode: 'VELOOP-VE10012',
      },
      {
        userId: 'VE10025',
        username: 'Rohan Sharma',
        email: 'rohan.winner@example.com',
        password: passwordHash,
        maskedId: 'VE****25',
        role: 'user',
        wallet: { VEs: 450, SVEs: 900, Tokens: 3500 },
        fraudRiskScore: 0,
        isFraudSuspended: false,
        streak: 8,
        lastDailyBonusAt: null,
        referralCode: 'VELOOP-VE10025',
      },
      {
        userId: 'VE00001',
        username: 'VELOOP SuperAdmin',
        email: 'admin@veloop.io',
        password: adminHash,
        maskedId: 'ADMIN****01',
        role: 'admin',
        wallet: { VEs: 99999, SVEs: 99999, Tokens: 999999 },
        fraudRiskScore: 0,
        isFraudSuspended: false,
        streak: 30,
        lastDailyBonusAt: null,
        referralCode: 'VELOOP-ADMIN',
      },
    ];

    const currentGiveawayId = 'GW-2026-08';
    const now = new Date();
    const futureEnd = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000 + 45 * 60 * 1000);

    this.prizes = [
      {
        _id: 'pz-1',
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
        entryAmount: 250,
        winnerCount: 1,
        claimType: 'SHIPPING_ADDRESS',
        marketValue: '₹1,34,900',
      },
      {
        _id: 'pz-2',
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
        entryAmount: 200,
        winnerCount: 3,
        claimType: 'SHIPPING_ADDRESS',
        marketValue: '₹44,900',
      },
      {
        _id: 'pz-3',
        prizeId: 'PRIZE-AIRPODSPRO2',
        giveawayId: currentGiveawayId,
        name: 'AirPods Pro 2',
        slug: 'airpods',
        tagline: 'USB-C MagSafe Case · 2x Noise Cancellation · Spatial Audio',
        description:
          'Next-level acoustic performance powered by the H2 chip, adaptive audio, intelligent noise reduction, and precision MagSafe case tracking.',
        specifications: [
          { label: 'Chip', value: 'Apple H2 Headphone Processor' },
          { label: 'Audio', value: 'Lossless Audio & Personalized Spatial Audio' },
          { label: 'Charging Case', value: 'MagSafe Case (USB-C) with Speaker' },
        ],
        position: '3rd Prize',
        positionRank: 3,
        image: '/assets/prizes/airpods.svg',
        accentColor: '#10b981',
        prizeType: 'PHYSICAL',
        entryCurrency: 'SVEs',
        entryAmount: 500,
        winnerCount: 5,
        claimType: 'SHIPPING_ADDRESS',
        marketValue: '₹24,900',
      },
      {
        _id: 'pz-4',
        prizeId: 'PRIZE-AMAZON2000',
        giveawayId: currentGiveawayId,
        name: '₹2,000 Amazon Gift Card',
        slug: 'amazon-2000',
        tagline: 'Instant Digital Voucher · 1 Year Validity · Zero Convenience Fee',
        description:
          'Shop millions of products on Amazon.in. Instant digital voucher delivered directly to the winner’s verified email address.',
        specifications: [
          { label: 'Denomination', value: '₹2,000 INR Digital Code' },
          { label: 'Delivery', value: 'Instant Email Dispatch after Claim' },
          { label: 'Validity', value: '365 Days' },
        ],
        position: 'Lucky Draw',
        positionRank: 4,
        image: '/assets/prizes/amazon2000.svg',
        accentColor: '#f59e0b',
        prizeType: 'GIFT_CARD',
        entryCurrency: 'VEs',
        entryAmount: 500,
        winnerCount: 10,
        claimType: 'EMAIL_DELIVERY',
        marketValue: '₹2,000',
      },
      {
        _id: 'pz-5',
        prizeId: 'PRIZE-AMAZON500',
        giveawayId: currentGiveawayId,
        name: '₹500 Amazon Gift Card',
        slug: 'amazon-500',
        tagline: 'Fast Digital E-Gift Card · Direct Email Fulfillment',
        description:
          'Quick ₹500 Amazon Pay gift voucher ideal for books, tech accessories, and essentials.',
        specifications: [
          { label: 'Denomination', value: '₹500 INR Digital Card' },
          { label: 'Delivery', value: 'Email Code' },
        ],
        position: 'Special Reward',
        positionRank: 5,
        image: '/assets/prizes/amazon500.svg',
        accentColor: '#ec4899',
        prizeType: 'GIFT_CARD',
        entryCurrency: 'VEs',
        entryAmount: 300,
        winnerCount: 25,
        claimType: 'EMAIL_DELIVERY',
        marketValue: '₹500',
      },
      {
        _id: 'pz-6',
        prizeId: 'PRIZE-AMAZON20',
        giveawayId: currentGiveawayId,
        name: '₹20 Shopping Voucher',
        slug: 'amazon-20',
        tagline: 'Micro Reward · Token Conversion Giveaway',
        description:
          'Convert your active platform activity Tokens into real shopping credits. Hundreds of winners selected automatically.',
        specifications: [
          { label: 'Denomination', value: '₹20 INR Instant Code' },
          { label: 'Entry Currency', value: '2,000 Platform Tokens' },
        ],
        position: 'Milestone Reward',
        positionRank: 6,
        image: '/assets/prizes/amazon20.svg',
        accentColor: '#6366f1',
        prizeType: 'DIGITAL',
        entryCurrency: 'Tokens',
        entryAmount: 2000,
        winnerCount: 100,
        claimType: 'EMAIL_DELIVERY',
        marketValue: '₹20',
      },
    ];

    this.giveaways = [
      {
        _id: 'gw-1',
        giveawayId: currentGiveawayId,
        title: 'Summer Rewards Megadraw 2026',
        slug: 'summer-rewards-megadraw',
        subtitle: 'Complete eligible activities, use your reward balance, and win exclusive Apple hardware & Amazon vouchers.',
        description:
          'Welcome to the premier VELOOP Rewards Giveaway of the season! Redeem your accumulated VEs, SVEs, and platform Tokens to secure entry for official Apple gear and high-value shopping gift cards.',
        status: 'ACTIVE',
        isFeatured: true,
        startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endAt: futureEnd,
        totalParticipants: 8540,
        totalPrizesAwarded: 1240,
        prizes: this.prizes,
        winnerAnnouncements: [
          { id: '1', maskedUserId: 'VE****21', prize: 'iPhone 15 Pro', color: '#8b5cf6' },
          { id: '2', maskedUserId: 'VE****83', prize: 'Apple Watch Series 9', color: '#3b82f6' },
          { id: '3', maskedUserId: 'VE****54', prize: 'AirPods Pro 2', color: '#10b981' },
          { id: '4', maskedUserId: 'VE****92', prize: '₹2,000 Amazon Gift Card', color: '#f59e0b' },
        ],
      },
      {
        _id: 'gw-2',
        giveawayId: 'GW-2026-07',
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
        prizes: [],
      },
      {
        _id: 'gw-3',
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
      },
    ];

    this.winners = [
      {
        _id: 'win-1',
        giveawayId: 'GW-2026-07',
        prizeId: 'PRIZE-PAST-WATCH',
        userId: 'VE10025', // Rohan Sharma (winner_user)
        maskedUserId: 'VE****25',
        prizeName: 'Apple Watch Series 9',
        prizeType: 'PHYSICAL',
        claimDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        selectionMethod: 'CRYPTOGRAPHIC_RANDOM',
        status: 'SELECTED',
        selectedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        _id: 'win-2',
        giveawayId: 'GW-2026-07',
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
        _id: 'win-3',
        giveawayId: 'GW-2026-07',
        prizeId: 'PRIZE-PAST-IPHONE',
        userId: 'VE10482',
        maskedUserId: 'VE****82',
        prizeName: 'iPhone 15 Pro',
        prizeType: 'PHYSICAL',
        claimDeadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        selectionMethod: 'CRYPTOGRAPHIC_RANDOM',
        status: 'DELIVERED',
        selectedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
    ];

    // Seed Initial Ads
    this.ads = [
      {
        adId: 'ad-1',
        brand: 'Amazon Prime Video',
        logo: '📺',
        tagline: 'Stream Award-Winning Originals & Blockbuster Movies',
        reward: 38,
        currency: 'VEs',
        duration: 15,
        category: 'Streaming',
        gradient: 'linear-gradient(135deg, #1E3A8A 0%, #172554 100%)',
        active: true,
      },
      {
        adId: 'ad-2',
        brand: 'Apple Music',
        logo: '🎵',
        tagline: '100 Million Songs in Lossless Spatial Audio',
        reward: 45,
        currency: 'VEs',
        duration: 20,
        category: 'Music',
        gradient: 'linear-gradient(135deg, #701A75 0%, #4A044E 100%)',
        active: true,
      },
      {
        adId: 'ad-3',
        brand: 'Nike Running Club',
        logo: '👟',
        tagline: 'Guided Runs, Audio Coaching & Milestone Tracking',
        reward: 30,
        currency: 'VEs',
        duration: 10,
        category: 'Fitness',
        gradient: 'linear-gradient(135deg, #14532D 0%, #052E16 100%)',
        active: true,
      },
      {
        adId: 'ad-4',
        brand: 'Spotify Premium',
        logo: '🎧',
        tagline: 'Ad-Free Listening with Unlimited Skips & Offline Play',
        reward: 50,
        currency: 'VEs',
        duration: 25,
        category: 'Entertainment',
        gradient: 'linear-gradient(135deg, #065F46 0%, #022C22 100%)',
        active: true,
      },
      {
        adId: 'ad-5',
        brand: 'Samsung Galaxy AI',
        logo: '📱',
        tagline: 'Circle to Search, Live Translate & Photo Assist',
        reward: 40,
        currency: 'VEs',
        duration: 15,
        category: 'Technology',
        gradient: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
        active: true,
      },
      {
        adId: 'ad-6',
        brand: 'PlayStation Plus',
        logo: '🎮',
        tagline: 'Monthly Games, Cloud Storage & Online Multiplayer',
        reward: 35,
        currency: 'VEs',
        duration: 15,
        category: 'Gaming',
        gradient: 'linear-gradient(135deg, #312E81 0%, #1E1B4B 100%)',
        active: true,
      },
    ];

    // Seed Initial Tasks
    this.tasks = [
      {
        taskId: 't-1',
        title: 'Daily Check-In Streak',
        description: 'Log into VELOOP Rewards daily to maintain your active streak multiplier.',
        reward: 20,
        currency: 'VEs',
        category: 'Daily',
        active: true,
      },
      {
        taskId: 't-2',
        title: 'Watch 5 Sponsored Ads',
        description: 'Watch any 5 partner advertisements in the Watch Ads section.',
        reward: 50,
        currency: 'VEs',
        category: 'Daily',
        active: true,
      },
      {
        taskId: 't-3',
        title: 'Join an Active Hardware Giveaway',
        description: 'Participate in any ongoing giveaway event with your VEs or SVEs balance.',
        reward: 100,
        currency: 'Tokens',
        category: 'Weekly',
        active: true,
      },
      {
        taskId: 't-4',
        title: 'Share Your Referral Link',
        description: 'Share your personal VELOOP invite code on WhatsApp, Telegram, or Twitter.',
        reward: 40,
        currency: 'VEs',
        category: 'Special',
        active: true,
      },
      {
        taskId: 't-5',
        title: 'Enable Push Notifications',
        description: 'Get instant countdown alerts when lucky draw winners are finalized.',
        reward: 25,
        currency: 'VEs',
        category: 'Special',
        active: true,
      },
    ];

    // Seed Initial Transactions
    this.transactions = [
      {
        _id: 'txn-seed-1',
        transactionId: 'TXN-AD-1787801001',
        userId: 'VE10842',
        giveawayId: null,
        prizeId: null,
        currency: 'VEs',
        amount: 38,
        status: 'SUCCESS',
        balanceBefore: 812,
        balanceAfter: 850,
        type: 'AD_REWARD',
        metadata: { brand: 'Amazon Prime Video' },
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        _id: 'txn-seed-2',
        transactionId: 'TXN-BONUS-1787801002',
        userId: 'VE10842',
        giveawayId: null,
        prizeId: null,
        currency: 'VEs',
        amount: 25,
        status: 'SUCCESS',
        balanceBefore: 787,
        balanceAfter: 812,
        type: 'DAILY_BONUS',
        metadata: { reason: 'Daily Check-In' },
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
    ];
  }
}

export const inMemoryDB = new InMemoryStore();
