import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
import { seedDatabase } from '../utils/seedData.js';
import { setGoogleTokenVerifierForTesting } from '../services/googleAuthService.js';
import { getNextUserId } from '../services/userIdService.js';
import { sanitizeReturnUrl } from '../../../frontend/src/utils/urlSanitizer.js';
import { getSafeTestDbConfig } from '../config/testDbConfig.js';

async function runUnifiedAuthSuite() {
  console.log('====================================================');
  console.log('🛡️ VELOOP REWARDS — PHASE 5B UNIFIED AUTH TEST SUITE');
  console.log('====================================================\n');

  // Enforce test database isolation and reject NODE_ENV=production
  const { testUri, testDbName, maskedUri } = getSafeTestDbConfig();
  console.log(`[Test DB Isolation] Connecting to: ${maskedUri} (Database: "${testDbName}")`);
  await mongoose.connect(testUri, { serverSelectionTimeoutMS: 15000 });

  // Sync schema indexes and seed canonical test profiles in isolated database
  await User.syncIndexes();
  await seedDatabase();

  let server = null;
  let API_BASE = process.env.TEST_API_URL;
  if (!API_BASE) {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        API_BASE = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  ✅ [PASSED] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAILED] ${message} ${details ? JSON.stringify(details) : ''}`);
      failed++;
    }
  }

  // Scoped test identifiers
  const testEmail1 = 've-p5b-user1@test.veloop.io';
  const testUsername1 = 've_p5b_tester1';
  const testGoogleEmail = 've-p5b-google@test.veloop.io';
  const testGoogleId1 = 'google-sub-1234567890';

  // Clean any leftover test records before starting
  await User.deleteMany({
    $or: [
      { email: { $regex: /ve-p5b/i } },
      { username: { $regex: /ve_p5b/i } },
      { googleId: { $regex: /google-sub-/i } },
    ],
  });

  try {
    // -----------------------------------------------------------------------
    // [SECTION 1] Privileged Fields Rejection (HTTP 400 Defense)
    // -----------------------------------------------------------------------
    console.log('[SECTION 1] Testing Privileged Fields Rejection...');

    const privilegedPayloads = [
      { field: 'role', payload: { role: 'admin' } },
      { field: 'wallet', payload: { wallet: { VEs: 1000, SVEs: 1000, Tokens: 5000 } } },
      { field: 'isEmailVerified', payload: { isEmailVerified: true } },
      { field: 'googleId', payload: { googleId: 'injected-google-id' } },
      { field: 'authProviders', payload: { authProviders: ['ADMIN'] } },
      { field: 'isAdmin', payload: { isAdmin: true } },
      { field: 'fraudRiskScore', payload: { fraudRiskScore: 0 } },
    ];

    for (const testCase of privilegedPayloads) {
      const rejRes = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Injection Tester',
          username: `inj_${testCase.field}`,
          email: `inj_${testCase.field}@test.veloop.io`,
          password: 'ValidPassword123!',
          confirmPassword: 'ValidPassword123!',
          acceptTerms: true,
          ...testCase.payload,
        }),
      });
      const rejData = await rejRes.json();
      assert(
        rejRes.status === 400 && rejData.code === 'PRIVILEGED_FIELD_REJECTED',
        `Payload containing privileged field "${testCase.field}" rejected with HTTP 400 PRIVILEGED_FIELD_REJECTED`
      );
    }

    // -----------------------------------------------------------------------
    // [SECTION 2] Valid Local Registration, Zero Balances & Terms Tracking
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 2] Testing Valid Local Registration & Terms Metadata...');
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase 5B Tester',
        username: testUsername1,
        email: testEmail1,
        password: 'Password123!', // 12 chars >= 10 chars
        confirmPassword: 'Password123!',
        acceptTerms: true,
      }),
    });

    const regData = await regRes.json();
    assert(regRes.status === 201, 'Local registration returns HTTP 201', regData);
    assert(regData.success === true && regData.token, 'Registration returns valid session token');
    assert(regData.user.role === 'user', 'New user role is strictly "user"');
    assert(
      regData.user.wallet.VEs === 0 &&
      regData.user.wallet.SVEs === 0 &&
      regData.user.wallet.Tokens === 0,
      'New registered user starts with exactly 0 VEs, 0 SVEs, 0 Tokens'
    );
    assert(regData.user.authProviders.includes('LOCAL'), 'User authProviders contains LOCAL');
    assert(regData.user.isEmailVerified === false, 'Local signup sets isEmailVerified: false');
    assert(regData.user.termsVersion === '2026.1', 'User document persists termsVersion: "2026.1"');
    assert(!!regData.user.termsAcceptedAt, 'User document persists termsAcceptedAt timestamp');
    assert(regData.redirectUrl === '/giveaways', 'Registration returns redirectUrl: "/giveaways"');

    // Verify read-only in DB that googleId is completely omitted (not saved as null)
    const dbUser = await User.findOne({ email: testEmail1 }).lean();
    assert(dbUser.googleId === undefined, 'Local user document completely omits googleId (not null)');

    // -----------------------------------------------------------------------
    // [SECTION 3] Duplicate Email & Username Defenses
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 3] Testing Duplicate Rejections...');
    const dupEmailRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'different_user',
        email: testEmail1.toUpperCase(), // Test case-insensitive normalization
        password: 'Password123!',
        acceptTerms: true,
      }),
    });
    const dupEmailData = await dupEmailRes.json();
    assert(dupEmailRes.status === 409, 'Duplicate email returns HTTP 409 conflict');
    assert(dupEmailData.code === 'USER_EXISTS', 'Duplicate email returns USER_EXISTS code');

    const dupUserRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername1,
        email: 'different_email@test.veloop.io',
        password: 'Password123!',
        acceptTerms: true,
      }),
    });
    assert(dupUserRes.status === 409, 'Duplicate username returns HTTP 409 conflict');

    // -----------------------------------------------------------------------
    // [SECTION 4] Password Policy: 10 chars min, 72 bytes max, Terms required
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 4] Testing Password Validations & Terms Requirement...');
    // 9 characters (< 10)
    const shortPwRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'user_short_pw',
        email: 'short_pw@test.veloop.io',
        password: 'Short1234', // 9 characters
        acceptTerms: true,
      }),
    });
    assert(shortPwRes.status === 400, 'Password < 10 chars rejected with HTTP 400 WEAK_PASSWORD');

    // Create 75-byte string to test bcrypt safe limit
    const longPassword = 'A'.repeat(75);
    const longPwRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'user_long_pw',
        email: 'long_pw@test.veloop.io',
        password: longPassword,
        acceptTerms: true,
      }),
    });
    const longPwData = await longPwRes.json();
    assert(longPwRes.status === 400 && longPwData.code === 'PASSWORD_TOO_LONG', 'Password > 72 bytes rejected with HTTP 400 PASSWORD_TOO_LONG');

    // Terms not accepted
    const termsRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'user_no_terms',
        email: 'no_terms@test.veloop.io',
        password: 'ValidPassword123!',
        acceptTerms: false,
      }),
    });
    const termsData = await termsRes.json();
    assert(termsRes.status === 400 && termsData.code === 'TERMS_NOT_ACCEPTED', 'Registration without terms rejected with HTTP 400 TERMS_NOT_ACCEPTED');

    // -----------------------------------------------------------------------
    // [SECTION 5] Concurrency-Safe Sequential User IDs
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 5] Testing Concurrent User ID Generation...');
    const concurrentIds = await Promise.all([
      getNextUserId(),
      getNextUserId(),
      getNextUserId(),
      getNextUserId(),
      getNextUserId(),
    ]);
    const uniqueIds = new Set(concurrentIds);
    assert(uniqueIds.size === 5, '5 concurrent getNextUserId calls returned 5 unique IDs', concurrentIds);
    assert(
      concurrentIds.every((id) => /^VE\d+$/.test(id)),
      'All generated user IDs strictly adhere to "VE" + digits format'
    );

    // -----------------------------------------------------------------------
    // [SECTION 6] Google Auth: Signature Verification & Unverified Email
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 6] Testing Google Token Validation...');
    const makeTestGoogleToken = (payload) =>
      `test-google-token:${Buffer.from(JSON.stringify(payload)).toString('base64')}`;

    // Failing Google signature
    const invalidGoogleRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: makeTestGoogleToken({ signatureInvalid: true }) }),
    });
    assert(invalidGoogleRes.status === 401, 'Invalid Google token signature rejected with HTTP 401');

    // Google token with email_verified: false
    const unverifiedEmailRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: makeTestGoogleToken({
          sub: testGoogleId1,
          email: 'unverified@test.veloop.io',
          email_verified: false,
          name: 'Unverified Google User',
        }),
      }),
    });
    const unverifiedData = await unverifiedEmailRes.json();
    assert(
      unverifiedEmailRes.status === 400 && unverifiedData.code === 'GOOGLE_EMAIL_NOT_VERIFIED',
      'Unverified Google email rejected with HTTP 400 GOOGLE_EMAIL_NOT_VERIFIED'
    );

    // -----------------------------------------------------------------------
    // [SECTION 7] Google Auth: New User Registration & Zero Balances
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 7] Testing New Google User Registration...');
    const newGoogleRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: makeTestGoogleToken({
          sub: testGoogleId1,
          email: testGoogleEmail,
          email_verified: true,
          name: 'Google Verified User',
        }),
      }),
    });
    const newGoogleData = await newGoogleRes.json();
    assert(newGoogleRes.status === 201, 'New Google user created with HTTP 201', newGoogleData);
    assert(newGoogleData.user?.role === 'user', 'New Google user strictly given role="user"');
    assert(
      newGoogleData.user?.wallet?.VEs === 0 &&
      newGoogleData.user?.wallet?.SVEs === 0 &&
      newGoogleData.user?.wallet?.Tokens === 0,
      'New Google user starts with 0 balances'
    );
    assert(newGoogleData.user?.authProviders?.includes('GOOGLE'), 'User authProviders contains GOOGLE');
    assert(newGoogleData.user?.isEmailVerified === true, 'Google signup with verified email sets isEmailVerified: true');

    // -----------------------------------------------------------------------
    // [SECTION 8] Safe Existing Account Linking & Conflict Defenses
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 8] Testing Account Linking & Google ID Conflicts...');
    // Existing local user testEmail1 links their verified Google account
    const testGoogleId2 = 'google-sub-link-999';
    const linkRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: makeTestGoogleToken({
          sub: testGoogleId2,
          email: testEmail1, // Matches testEmail1 created in Section 2
          email_verified: true,
          name: 'Phase 5B Linked User',
        }),
      }),
    });
    const linkData = await linkRes.json();
    assert(linkRes.status === 200, 'Existing local account successfully linked Google ID with HTTP 200');
    assert(
      linkData.user?.authProviders?.includes('LOCAL') && linkData.user?.authProviders?.includes('GOOGLE'),
      'Linked user now possesses both LOCAL and GOOGLE in authProviders'
    );

    // Attempt to link a different Google ID to an account that already has a Google ID
    const conflictRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: makeTestGoogleToken({
          sub: 'google-sub-conflicting-888',
          email: testEmail1,
          email_verified: true,
        }),
      }),
    });
    const conflictData = await conflictRes.json();
    assert(
      conflictRes.status === 409 && conflictData.code === 'GOOGLE_ACCOUNT_CONFLICT',
      'Conflicting Google ID attempt rejected with HTTP 409 GOOGLE_ACCOUNT_CONFLICT'
    );

    // Attempt to link an already-linked Google ID (testGoogleId2) to another user
    const secondUserEmail = 've-p5b-second@test.veloop.io';
    await User.create({
      userId: await getNextUserId(),
      username: 've_p5b_second',
      email: secondUserEmail,
      password: 'Password123!',
      maskedId: 'VE****99',
      role: 'user',
      authProviders: ['LOCAL'],
      isEmailVerified: false,
    });

    const duplicateGoogleIdRes = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: makeTestGoogleToken({
          sub: testGoogleId2, // Already bound to testEmail1
          email: secondUserEmail,
          email_verified: true,
        }),
      }),
    });
    const dupGoogleData = await duplicateGoogleIdRes.json();
    assert(
      duplicateGoogleIdRes.status === 409 && dupGoogleData.code === 'GOOGLE_ACCOUNT_CONFLICT',
      'Attempt to link an already-claimed Google ID to a different user returns HTTP 409 GOOGLE_ACCOUNT_CONFLICT'
    );

    // -----------------------------------------------------------------------
    // [SECTION 9] Google-Only Account Password Login Rejection (No Crash)
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 9] Testing Google-Only Account Password Login...');
    const pwAttemptRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: testGoogleEmail,
        password: 'anyPassword123',
      }),
    });
    assert(pwAttemptRes.status === 401, 'Password login on Google-only user safely rejected with HTTP 401 without crash');

    // -----------------------------------------------------------------------
    // [SECTION 10] Protected Routes & Role Redirection
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 10] Testing Protected Routes & Role Redirects...');
    const unauthMeRes = await fetch(`${API_BASE}/auth/me`);
    assert(unauthMeRes.status === 401, 'Unauthenticated /api/auth/me rejected with HTTP 401');

    const authMeRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${regData.token}` },
    });
    assert(authMeRes.status === 200, 'Authenticated user accessing /api/auth/me returns HTTP 200');

    const adminForbiddenRes = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${regData.token}` },
    });
    assert(adminForbiddenRes.status === 403, 'Regular user token attempting /api/admin/overview receives HTTP 403 ADMIN_ACCESS_DENIED');

    // -----------------------------------------------------------------------
    // [SECTION 11] Return URL Sanitization (Open-Redirect Defense)
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 11] Testing Open-Redirect Attack Defenses...');
    assert(sanitizeReturnUrl('/giveaways') === '/giveaways', 'Valid internal path preserved: "/giveaways"');
    assert(sanitizeReturnUrl('/giveaway/iphone-15-pro') === '/giveaway/iphone-15-pro', 'Valid prize detail path preserved');
    assert(sanitizeReturnUrl('https://evil.com') === '/giveaways', 'External URL neutralized to /giveaways');
    assert(sanitizeReturnUrl('//evil.com') === '/giveaways', 'Protocol-relative URL neutralized to /giveaways');
    assert(sanitizeReturnUrl('/\\evil.com') === '/giveaways', 'Backslash path neutralized to /giveaways');
    assert(sanitizeReturnUrl('javascript:alert(1)') === '/giveaways', 'javascript: scheme neutralized to /giveaways');
    assert(sanitizeReturnUrl('data:text/html,<script>alert(1)</script>') === '/giveaways', 'data: scheme neutralized to /giveaways');

    // -----------------------------------------------------------------------
    // [SECTION 12] Canonical Demo Account Regression Check
    // -----------------------------------------------------------------------
    console.log('\n[SECTION 12] Testing Canonical Demo Accounts Login...');
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'admin@veloop.io',
        password: 'admin123',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLoginData.user.role === 'admin', 'Canonical Admin login succeeds with role="admin"');
    assert(adminLoginData.redirectUrl === '/admin', 'Admin login returns redirectUrl: "/admin"');

    const alexLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'alex.vance@example.com',
        password: 'password123',
      }),
    });
    const alexLoginData = await alexLoginRes.json();
    assert(alexLoginRes.status === 200, 'Canonical Alex Vance login succeeds', { status: alexLoginRes.status, data: alexLoginData });
    assert(alexLoginData.redirectUrl === '/giveaways', 'Standard user login returns redirectUrl: "/giveaways"');
  } finally {
    // Clean up all Phase 5B test records
    console.log('\n🧹 Cleaning up Phase 5B test records...');
    await User.deleteMany({
      $or: [
        { email: { $regex: /ve-p5b/i } },
        { username: { $regex: /ve_p5b/i } },
        { googleId: { $regex: /google-sub-/i } },
      ],
    });
    // Reset mock verifier
    setGoogleTokenVerifierForTesting(null);
    if (server) {
      await new Promise((res) => server.close(res));
    }
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`🎉 PHASE 5B UNIFIED AUTH SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUnifiedAuthSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
