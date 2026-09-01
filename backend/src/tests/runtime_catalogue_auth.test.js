import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { seedDatabase } from '../utils/seedData.js';
import Prize from '../models/Prize.js';
import Giveaway from '../models/Giveaway.js';
import User from '../models/User.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';

async function runRuntimeCatalogueAuthTest() {
  console.log('====================================================');
  console.log('🚀 VELOOP REWARDS — RUNTIME, AUTH & CATALOGUE AUDIT');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  // 1. Run Idempotent Database Seed twice to prove no duplicates are created
  console.log('[STEP 1] Running idempotent seed twice...');
  await seedDatabase();
  await seedDatabase();

  const totalPrizesInDb = await Prize.countDocuments({ giveawayId: 'GW-2026-08' });
  const totalCampaigns = await Giveaway.countDocuments({ giveawayId: 'GW-2026-08' });

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`✅ [PASSED] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAILED] ${message} ${details ? JSON.stringify(details) : ''}`);
      failed++;
    }
  }

  assert(totalCampaigns === 1, `Exactly 1 active campaign document exists in DB (Found: ${totalCampaigns})`);
  assert(totalPrizesInDb === 6, `Exactly 6 active prizes exist in DB with zero duplicates after repeated seeds (Found: ${totalPrizesInDb})`);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 2. Health check repeated resilience
    console.log('\n[STEP 2] Testing server health resilience under repeated requests...');
    for (let i = 1; i <= 5; i++) {
      const healthRes = await fetch(`${baseUrl}/api/health`).then((r) => r.json());
      assert(healthRes.status === 'HEALTHY', `Health check iteration ${i} returned HEALTHY`);
    }

    // 3. Demo Authentications (Alex, Jordan, Rohan, Modal Tester, Admin)
    console.log('\n[STEP 3] Testing authentication for all seed profiles...');

    const alexLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'alex.vance@example.com', password: 'password123' }),
    }).then((r) => r.json());
    assert(alexLogin.success && alexLogin.user.userId === 'VE10842', 'Alex Vance login succeeded');

    const jordanLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'jordan.lee@example.com', password: 'password123' }),
    }).then((r) => r.json());
    assert(jordanLogin.success && jordanLogin.user.userId === 'VE10012', 'Jordan Lee login succeeded');

    const rohanLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'rohan.winner@example.com', password: 'password123' }),
    }).then((r) => r.json());
    assert(rohanLogin.success && rohanLogin.user.userId === 'VE10025', 'Rohan Sharma login succeeded');

    const modalTesterLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'modal.tester@example.com', password: 'password123' }),
    }).then((r) => r.json());
    assert(modalTesterLogin.success && modalTesterLogin.user.userId === 'VE10099', 'Modal Tester login succeeded');
    assert(
      modalTesterLogin.user.wallet.VEs >= 250,
      `Modal Tester has ample balance for testing (${modalTesterLogin.user.wallet.VEs} VEs)`
    );

    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'admin@veloop.io', password: 'admin123' }),
    }).then((r) => r.json());
    assert(adminLogin.success && adminLogin.user.role === 'admin', 'VELOOP SuperAdmin login succeeded');

    // 4. Repeated Account Switching without 401
    console.log('\n[STEP 4] Testing rapid repeated account switching sequence...');
    const switchProfiles = [
      { email: 'alex.vance@example.com', pwd: 'password123' },
      { email: 'modal.tester@example.com', pwd: 'password123' },
      { email: 'admin@veloop.io', pwd: 'admin123' },
      { email: 'rohan.winner@example.com', pwd: 'password123' },
      { email: 'alex.vance@example.com', pwd: 'password123' },
    ];

    let switchSuccess = true;
    for (const p of switchProfiles) {
      const swRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: p.email, password: p.pwd }),
      });
      if (swRes.status !== 200) {
        switchSuccess = false;
      }
    }
    assert(switchSuccess, 'Rapid repeated account switching executed with ZERO 401 errors');

    // 5. Public Current Giveaway API Returns All 6 Prizes
    console.log('\n[STEP 5] Testing complete 6-prize catalogue payload...');
    const currentRes = await fetch(`${baseUrl}/api/giveaways/current`).then((r) => r.json());
    assert(currentRes.success && currentRes.giveaway, 'GET /api/giveaways/current returned successfully');

    const prizes = currentRes.giveaway.prizes || [];
    assert(prizes.length === 6, `Complete catalogue contains exactly 6 prizes (Found: ${prizes.length})`);

    const expectedPrizes = [
      { name: 'iPhone 15 Pro (128GB)', fee: 250, currency: 'VEs' },
      { name: 'Apple Watch Series 9', fee: 200, currency: 'VEs' },
      { name: 'AirPods Pro 2', fee: 500, currency: 'SVEs' },
      { name: '₹2,000 Amazon Gift Card', fee: 500, currency: 'VEs' },
      { name: '₹500 Amazon Gift Card', fee: 300, currency: 'VEs' },
      { name: '₹20 Shopping Voucher', fee: 2000, currency: 'Tokens', isPending: true },
    ];

    expectedPrizes.forEach((exp) => {
      const match = prizes.find((p) => p.name === exp.name);
      assert(
        match && match.entryAmount === exp.fee && match.entryCurrency === exp.currency,
        `Prize "${exp.name}" configured (${exp.fee} ${exp.currency})`
      );
      if (exp.isPending) {
        assert(match && match.isPendingConfirmation === true, `Prize "${exp.name}" has isPendingConfirmation: true`);
      }
    });

    // 6. Modal Tester has ZERO participation records
    console.log('\n[STEP 6] Verifying Modal Tester zero participation state...');
    const modalTesterStatus = await fetch(`${baseUrl}/api/giveaways/GW-2026-08/prizes/PRIZE-IPHONE15/my-status`, {
      headers: { Authorization: `Bearer ${modalTesterLogin.token}` },
    }).then((r) => r.json());
    assert(
      modalTesterStatus.success && modalTesterStatus.isParticipating === false,
      'Modal Tester is clean with isParticipating: false (Ready for manual Join Modal test)'
    );

    // 7. Joining one prize does not hide or mutate the other 5 prizes
    console.log('\n[STEP 7] Verifying that joining one prize preserves full 6-prize catalogue...');
    const joinRes = await fetch(`${baseUrl}/api/giveaways/GW-2026-08/prizes/PRIZE-IPHONE15/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexLogin.token}`,
      },
      body: JSON.stringify({ idempotencyKey: 'TEST-FULL-CATALOGUE-KEY' }),
    }).then((r) => r.json());
    assert(joinRes.success, 'Alex Vance joined iPhone 15 Pro prize');

    const alexViewAfterJoin = await fetch(`${baseUrl}/api/giveaways/current`).then((r) => r.json());
    assert(
      alexViewAfterJoin.giveaway.prizes.length === 6,
      'Public giveaway catalogue still contains all 6 prizes after user participates in 1 prize'
    );

    // 8. Pending Confirmation Prize Direct Join Blocked
    console.log('\n[STEP 8] Verifying backend block on pending voucher join...');
    const pendingJoin = await fetch(`${baseUrl}/api/giveaways/GW-2026-08/prizes/PRIZE-AMAZON20/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alexLogin.token}`,
      },
      body: JSON.stringify({ idempotencyKey: 'BYPASS-PENDING-TEST' }),
    });
    const pendingJson = await pendingJoin.json();
    assert(
      pendingJoin.status === 400 && pendingJson.code === 'PRIZE_PENDING_CONFIRMATION',
      `Pending voucher join blocked with HTTP 400 (Code: ${pendingJson.code})`
    );

    // 9. Previous Winners Archive endpoint
    console.log('\n[STEP 9] Verifying /api/giveaways/previous/winners endpoint...');
    const prevWinners = await fetch(`${baseUrl}/api/giveaways/previous/winners`).then((r) => r.json());
    assert(
      prevWinners.success && Array.isArray(prevWinners.winners) && prevWinners.winners.length > 0,
      `GET /api/giveaways/previous/winners returned ${prevWinners.winners?.length} historical winners without crash`
    );

    console.log('\n====================================================');
    console.log(`🎉 RUNTIME AUDIT: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    server.close();
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal runtime test error:', err);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runRuntimeCatalogueAuthTest();
