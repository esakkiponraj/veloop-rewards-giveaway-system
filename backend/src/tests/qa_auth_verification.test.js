/**
 * Automated QA Account Authentication & Verification Suite
 * Tests isolated creation, idempotent seeding, and live HTTP JWT logins for:
 *   - qa.alex@veloop.io  (QA-USR-ALEX, QA****A1)
 *   - qa.bob@veloop.io   (QA-USR-BOB, QA****B2)
 *   - qa.carol@veloop.io (QA-USR-CAROL, QA****C3)
 *   - qa.david@veloop.io (QA-USR-DAVID, QA****D4)
 *
 * Password for all QA users: password123
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { setupPhase3DemoData, cleanupPhase3DemoData, QA_USERS } from '../utils/setupPhase3Demo.js';
import User from '../models/User.js';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';

let server;
let baseUrl;
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASSED] ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAILED] ${message}`);
    failedCount++;
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runQAAuthVerification() {
  console.log('\n====================================================');
  console.log('🧪 QA ACCOUNT AUTHENTICATION & IDEMPOTENCY TEST');
  console.log('====================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/veloop_db';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
  }

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  try {
    // 1. Run Setup Idempotently Twice
    console.log('[STEP 1] Running QA Demo Setup (Iteration 1)...');
    await setupPhase3DemoData();

    console.log('[STEP 2] Running QA Demo Setup (Iteration 2 - Idempotency Check)...');
    await setupPhase3DemoData();

    // 2. Verify all 4 QA accounts can authenticate over HTTP
    console.log('\n[STEP 3] Performing HTTP Login & Token Verification for all 4 QA Users...');
    for (const qaUser of QA_USERS) {
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        body: {
          emailOrUsername: qaUser.email,
          password: qaUser.password,
        },
      });

      assert(
        loginRes.status === 200 && !!loginRes.data?.token,
        `Login succeeded for ${qaUser.username} (${qaUser.email}) -> HTTP 200 with JWT`
      );

      const token = loginRes.data?.token;

      // 3. Verify GET /api/auth/me returns matching profile
      const meRes = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      assert(
        meRes.status === 200 &&
          meRes.data?.user?.userId === qaUser.userId &&
          meRes.data?.user?.maskedId === qaUser.maskedId,
        `GET /api/auth/me returned authenticated user: userId=${meRes.data?.user?.userId}, maskedId=${meRes.data?.user?.maskedId}`
      );
    }

    // 4. Verify Canonical Demo Data is completely preserved
    console.log('\n[STEP 4] Verifying Canonical Demo Data Preservation...');
    const canonicalGw = await Giveaway.findOne({ giveawayId: 'GW-2026-08' });
    assert(canonicalGw && canonicalGw.status === 'ACTIVE', 'Canonical campaign GW-2026-08 is intact and ACTIVE');

    const canonicalPrizes = await Prize.find({ giveawayId: 'GW-2026-08' });
    assert(canonicalPrizes.length === 6, `Canonical prize catalogue has exactly 6 prizes (Found: ${canonicalPrizes.length})`);

    const canonicalUsers = await User.find({
      userId: { $in: ['VE10842', 'VE10012', 'VE10025', 'VE10099', 'VE00001'] },
    });
    assert(canonicalUsers.length === 5, `All 5 canonical demo users are intact (Found: ${canonicalUsers.length})`);

    console.log('\n====================================================');
    console.log(`🎉 QA AUTH TEST FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================\n');
  } finally {
    if (server) {
      server.close();
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

runQAAuthVerification()
  .then(() => process.exit(failedCount > 0 ? 1 : 0))
  .catch((e) => {
    console.error('QA Auth Verification uncaught error:', e);
    process.exit(1);
  });
