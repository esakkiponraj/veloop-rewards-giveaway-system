import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayEntryTransaction from '../models/GiveawayEntryTransaction.js';
import bcrypt from 'bcryptjs';

// Open Redirect Sanitizer logic (matching frontend Login.jsx)
function sanitizeReturnUrl(url, defaultFallback = '/giveaways') {
  if (!url || typeof url !== 'string') return defaultFallback;
  const trimmed = url.trim();

  // Must begin with single '/' and never '//' (protocol-relative external redirect)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return defaultFallback;
  }

  // Reject URL schemes, backslashes, encoded slashes, or script injections
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:') ||
    lower.includes('vbscript:') ||
    lower.includes('http:') ||
    lower.includes('https:') ||
    lower.includes('%2f%2f') ||
    lower.includes('%5c') ||
    lower.includes('\\')
  ) {
    return defaultFallback;
  }

  return trimmed;
}

async function runSecuritySafeguardsTest() {
  console.log('====================================================');
  console.log('🛡️ VELOOP REWARDS — PHASE 2 SECURITY & SAFEGUARDS TEST');
  console.log('====================================================\n');

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

  // --------------------------------------------------------------------------
  // PART 1: OPEN REDIRECT SECURITY DEFENSE
  // --------------------------------------------------------------------------
  console.log('[SECTION 1] Testing Return URL Open-Redirect Defenses...');

  const validInternalUrls = [
    '/giveaway/iphone-15-pro',
    '/giveaways',
    '/wallet',
    '/my-entries',
    '/tasks',
    '/giveaway/apple-watch?ref=hero',
  ];

  validInternalUrls.forEach((url) => {
    assert(sanitizeReturnUrl(url) === url, `Valid internal URL preserved: "${url}"`);
  });

  const maliciousUrls = [
    'https://external-example.com',
    'http://phishing-site.com/login',
    '//evil-external.com',
    '//evil-external.com/giveaway',
    'javascript:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '\\evil.com',
    'http%3A%2F%2Fexternal.com',
    '%2F%2Fevil.com',
    '   ',
    null,
    undefined,
    12345,
  ];

  maliciousUrls.forEach((attackUrl) => {
    const sanitized = sanitizeReturnUrl(attackUrl);
    assert(sanitized === '/giveaways', `Malicious/External returnUrl rejected: "${attackUrl}" -> "/giveaways"`);
  });

  // --------------------------------------------------------------------------
  // PART 2: BACKEND ENFORCEMENT OF PENDING CONFIRMATION PRIZE
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 2] Testing Backend Enforcement of Pending Merchant Confirmation...');

  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const passwordHash = await bcrypt.hash('password123', 8);
  const testUserId = 'VE-PENDING-TEST-USER';
  const testGwId = 'GW-PENDING-VERIFY';
  const testPrizeId = 'PRIZE-PENDING-VOUCHER-20';

  await User.findOneAndUpdate(
    { userId: testUserId },
    {
      userId: testUserId,
      username: 'Pending Test User',
      email: 'pending.test@example.com',
      password: passwordHash,
      maskedId: 'VE****99',
      role: 'user',
      wallet: { VEs: 1000, SVEs: 1000, Tokens: 5000 },
      streak: 5,
    },
    { upsert: true, new: true }
  );

  const now = new Date();
  const pendingPrize = await Prize.findOneAndUpdate(
    { prizeId: testPrizeId },
    {
      prizeId: testPrizeId,
      giveawayId: testGwId,
      name: 'Pending ₹20 Voucher',
      slug: 'pending-voucher-20',
      position: 'Lucky Draw',
      entryCurrency: 'Tokens',
      entryAmount: 2000,
      winnerCount: 20,
      image: '/assets/prizes/amazon20.svg',
      isPendingConfirmation: true,
      pendingConfirmationNote: 'The ₹20 Amazon Voucher value is pending final confirmation. Participation is temporarily disabled.',
    },
    { upsert: true, new: true }
  );

  await Giveaway.findOneAndUpdate(
    { giveawayId: testGwId },
    {
      giveawayId: testGwId,
      title: 'Pending Verification Event',
      slug: 'pending-verification-event',
      status: 'ACTIVE',
      startAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      prizes: [pendingPrize._id],
    },
    { upsert: true }
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: 'pending.test@example.com', password: 'password123' }),
  }).then((r) => r.json());

  const token = loginRes.token;

  // Direct API join attempt bypassing UI disabled state
  console.log('Sending direct API POST join request for pending-confirmation prize...');
  const directJoinAttempt = await fetch(`${baseUrl}/api/giveaways/${testGwId}/prizes/${testPrizeId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ idempotencyKey: 'BYPASS-ATTEMPT-001' }),
  });

  const responseJson = await directJoinAttempt.json();

  assert(
    directJoinAttempt.status === 400 && responseJson.code === 'PRIZE_PENDING_CONFIRMATION',
    `Direct API join on isPendingConfirmation: true blocked by backend with HTTP 400 (${responseJson.code}: "${responseJson.message}")`
  );

  // Verify wallet balance remained untouched
  const finalUser = await User.findOne({ userId: testUserId });
  assert(
    finalUser.wallet.Tokens === 5000,
    `User Tokens balance preserved at 5,000 (0 deducted for pending prize). Current: ${finalUser.wallet.Tokens}`
  );

  // Clean test artifacts
  await User.deleteOne({ userId: testUserId });
  await GiveawayParticipation.deleteMany({ userId: testUserId });
  await GiveawayEntryTransaction.deleteMany({ userId: testUserId });
  await Prize.deleteOne({ prizeId: testPrizeId });
  await Giveaway.deleteOne({ giveawayId: testGwId });

  console.log('\n====================================================');
  console.log(`🎉 SECURITY & SAFEGUARDS TEST: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  server.close();
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runSecuritySafeguardsTest();
