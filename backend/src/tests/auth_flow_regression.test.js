/**
 * Phase 4: Authentication State, Redirect & Security Regression Suite
 * Covers:
 *   1. Successful login credentials -> HTTP 200, JWT token, user role
 *   2. Target URL resolution:
 *      - Admin defaults to /admin
 *      - User defaults to /giveaways
 *      - Sanitized returnUrl preserved for valid paths
 *      - External/phishing returnUrl sanitized to safe fallback
 *   3. Failed login behavior:
 *      - Invalid credentials returns HTTP 401
 *      - Existing session / token not corrupted on failed attempt
 *   4. Account switching isolation:
 *      - Switching from User A to User B updates identity cleanly
 *      - Zero cross-talk or stale profile data in /api/auth/me
 *   5. Logout cleanup:
 *      - Token removal invalidates subsequent authorized actions
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import { sanitizeReturnUrl } from '../../../frontend/src/utils/urlSanitizer.js';

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

async function runAuthFlowRegression() {
  console.log('\n====================================================');
  console.log('🛡️ VELOOP REWARDS — AUTHENTICATION FLOW REGRESSION');
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
    // -------------------------------------------------------------------------
    // TEST 1: Sanitized Return Path & Role Fallback Routing
    // -------------------------------------------------------------------------
    console.log('[SECTION 1] Testing Return URL Sanitization & Role Redirect Rules...');
    const validInternal = sanitizeReturnUrl('/giveaway/iphone-15-pro', '/giveaways');
    assert(validInternal === '/giveaway/iphone-15-pro', 'Valid internal path preserved: "/giveaway/iphone-15-pro"');

    const phishingAttempt = sanitizeReturnUrl('https://phishing.com/login', '/giveaways');
    assert(phishingAttempt === '/giveaways', 'External phishing URL rejected and sanitized: "https://phishing.com/login" -> "/giveaways"');

    const protocolRelative = sanitizeReturnUrl('//evil.com', '/giveaways');
    assert(protocolRelative === '/giveaways', 'Protocol-relative URL rejected: "//evil.com" -> "/giveaways"');

    const jsPayload = sanitizeReturnUrl('javascript:alert(1)', '/giveaways');
    assert(jsPayload === '/giveaways', 'JavaScript pseudo-protocol rejected: "javascript:alert(1)" -> "/giveaways"');

    // Role-based target URL resolution
    const resolveTargetUrl = (userRole, returnUrl) => {
      const safe = returnUrl ? sanitizeReturnUrl(returnUrl, '') : '';
      if (safe && safe !== '/login') return safe;
      return userRole === 'admin' ? '/admin' : '/giveaways';
    };

    assert(resolveTargetUrl('admin', '') === '/admin', 'Admin user with no returnUrl redirects to "/admin"');
    assert(resolveTargetUrl('user', '') === '/giveaways', 'Standard user with no returnUrl redirects to "/giveaways"');
    assert(resolveTargetUrl('user', '/my-entries') === '/my-entries', 'Standard user with returnUrl="/my-entries" redirects to "/my-entries"');
    assert(resolveTargetUrl('admin', 'https://attacker.com') === '/admin', 'Admin user with malicious returnUrl falls back safely to "/admin"');

    // -------------------------------------------------------------------------
    // TEST 2: Successful Normal User & Admin Logins
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 2] Testing Successful Authentication & Token Issuance...');
    const alexLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'alex.vance@example.com', password: 'password123' },
    });
    assert(alexLogin.status === 200 && !!alexLogin.data?.token, 'Alex Vance login succeeded with HTTP 200 and JWT');
    const alexToken = alexLogin.data?.token;

    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'admin@veloop.io', password: 'admin123' },
    });
    assert(adminLogin.status === 200 && adminLogin.data?.user?.role === 'admin', 'Admin login succeeded with role="admin"');
    const adminToken = adminLogin.data?.token;

    // -------------------------------------------------------------------------
    // TEST 3: Auth Profile Verification via /api/auth/me
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 3] Verifying Authenticated Profile Integrity...');
    const alexMe = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    assert(
      alexMe.status === 200 && alexMe.data?.user?.email === 'alex.vance@example.com' && alexMe.data?.user?.maskedId === 'VE****42',
      'GET /api/auth/me returns authoritative Alex Vance profile (VE****42)'
    );

    const adminMe = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminMe.status === 200 && adminMe.data?.user?.role === 'admin' && adminMe.data?.user?.maskedId === 'ADMIN****01',
      'GET /api/auth/me returns authoritative Admin profile (ADMIN****01)'
    );

    // -------------------------------------------------------------------------
    // TEST 4: Failed Login State & Token Isolation
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 4] Testing Failed Login Behavior & Token Non-Corruption...');
    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'alex.vance@example.com', password: 'WRONG_PASSWORD' },
    });
    assert(badLogin.status === 401 && badLogin.data?.success === false, 'Invalid password correctly rejected with HTTP 401');

    // Prove that prior token remains completely valid and uncorrupted after a failed attempt
    const verifyExisting = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${alexToken}` },
    });
    assert(
      verifyExisting.status === 200 && verifyExisting.data?.user?.userId === 'VE10842',
      'Prior valid user session remains intact after a failed login attempt'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Account Switching Isolation
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 5] Testing Account Switching Isolation...');
    const jordanLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { emailOrUsername: 'jordan.lee@example.com', password: 'password123' },
    });
    assert(jordanLogin.status === 200 && jordanLogin.data?.user?.maskedId === 'VE****12', 'Jordan Lee login succeeded (VE****12)');
    const jordanToken = jordanLogin.data?.token;

    const jordanMe = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${jordanToken}` },
    });
    assert(
      jordanMe.status === 200 && jordanMe.data?.user?.userId === 'VE10012' && jordanMe.data?.user?.wallet?.VEs === 120,
      'Switched account profile reflects isolated Jordan Lee state (120 VEs) without Alex Vance data leakage'
    );

    // -------------------------------------------------------------------------
    // TEST 6: Session Revocation / Unauthenticated Access
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 6] Testing Unauthenticated Rejection on Protected Endpoints...');
    const unauthorizedMe = await request('/api/auth/me'); // No token
    assert(unauthorizedMe.status === 401, 'Request with no token rejected with HTTP 401 Unauthorized');

    const forgedToken = await request('/api/auth/me', {
      headers: { Authorization: 'Bearer forged.jwt.token' },
    });
    assert(forgedToken.status === 401, 'Request with invalid signature rejected with HTTP 401 Unauthorized');

    console.log('\n====================================================');
    console.log(`🎉 AUTH FLOW REGRESSION FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
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

runAuthFlowRegression()
  .then(() => process.exit(failedCount > 0 ? 1 : 0))
  .catch((e) => {
    console.error('Auth flow regression uncaught error:', e);
    process.exit(1);
  });
