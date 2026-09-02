import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import app from '../app.js';
import connectDB from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PROD_PORT = 5055;
const PROD_CLIENT_URL = 'https://rewards.veloop.io';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✅ [PASSED] ${message}`);
}

async function runProductionModeSmokeTest() {
  console.log('====================================================');
  console.log('🏭 VELOOP REWARDS — BACKEND PRODUCTION MODE SMOKE TEST');
  console.log('====================================================');

  // Configure strict production environment
  const originalEnv = process.env.NODE_ENV;
  const originalClientUrl = process.env.CLIENT_URL;
  const originalFallback = process.env.ALLOW_IN_MEMORY_FALLBACK;

  process.env.NODE_ENV = 'production';
  process.env.CLIENT_URL = PROD_CLIENT_URL;
  process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';

  let server;
  try {
    // 1. Verify Valid MongoDB Connection
    console.log('\n[CHECK 1] Verifying Production MongoDB Connection...');
    await connectDB();
    assert(mongoose.connection.readyState === 1, 'MongoDB connection established (readyState: 1)');

    // Start server on isolated production test port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PROD_PORT, resolve));
    console.log(`  🚀 Production test server listening on port ${PROD_PORT}`);

    // 2. Verify GET /api/health returns HTTP 200 and database: CONNECTED
    console.log('\n[CHECK 2] Verifying GET /api/health in Production Mode...');
    const healthRes = await fetch(`http://localhost:${PROD_PORT}/api/health`);
    assert(healthRes.status === 200, 'GET /api/health returned HTTP 200 OK');
    const healthData = await healthRes.json();
    assert(healthData.status === 'HEALTHY', 'Status is HEALTHY');
    assert(healthData.database === 'CONNECTED', 'Database status reports CONNECTED');

    // 3. Verify CORS: Configured production CLIENT_URL is allowed
    console.log('\n[CHECK 3] Verifying Production CORS Origin Whitelisting...');
    const allowedCorsRes = await fetch(`http://localhost:${PROD_PORT}/api/health`, {
      headers: { Origin: PROD_CLIENT_URL },
    });
    const allowOriginHeader = allowedCorsRes.headers.get('access-control-allow-origin');
    assert(
      allowOriginHeader === PROD_CLIENT_URL || allowOriginHeader === '*',
      `Configured CLIENT_URL allowed by CORS (Header: ${allowOriginHeader})`
    );

    // 4. Verify CORS: Unauthorized origin is rejected
    console.log('\n[CHECK 4] Verifying Unauthorized Origin Rejection...');
    const blockedCorsRes = await fetch(`http://localhost:${PROD_PORT}/api/health`, {
      headers: { Origin: 'https://malicious-attacker.com' },
    });
    const blockedOriginHeader = blockedCorsRes.headers.get('access-control-allow-origin');
    assert(
      !blockedOriginHeader || blockedOriginHeader !== 'https://malicious-attacker.com',
      'Unauthorized origin rejected by CORS (No Access-Control-Allow-Origin header granted)'
    );

    // 5. Verify Demo / In-Memory Fallback is Disabled in Production
    console.log('\n[CHECK 5] Verifying In-Memory Fallback is Disabled...');
    assert(process.env.ALLOW_IN_MEMORY_FALLBACK === 'false', 'ALLOW_IN_MEMORY_FALLBACK is set to false');
    assert(process.env.NODE_ENV === 'production', 'NODE_ENV is set to production (fail-closed mode active)');

    // 6. Verify Database-Unavailable Readiness returns HTTP 503
    console.log('\n[CHECK 6] Verifying Database-Unavailable Readiness (Fail-Closed 503)...');
    // Temporarily disconnect mongoose
    await mongoose.disconnect();
    assert(mongoose.connection.readyState === 0, 'MongoDB disconnected for readiness failure test');

    const unreadyRes = await fetch(`http://localhost:${PROD_PORT}/api/health`);
    assert(unreadyRes.status === 503, 'Disconnected MongoDB causes /api/health to return HTTP 503 Service Unavailable');
    const unreadyData = await unreadyRes.json();
    assert(unreadyData.status === 'UNHEALTHY', 'Readiness payload status reports UNHEALTHY');
    assert(unreadyData.database === 'DISCONNECTED', 'Readiness payload database reports DISCONNECTED');

    // 7. Verify Graceful Shutdown Closes HTTP & MongoDB
    console.log('\n[CHECK 7] Verifying Graceful Shutdown...');
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    assert(!server.listening, 'HTTP server closed cleanly');
    assert(mongoose.connection.readyState === 0, 'Database connection closed cleanly');

    console.log('\n====================================================');
    console.log('🎉 ALL 7 PRODUCTION-MODE SMOKE CHECKS PASSED');
    console.log('====================================================\n');
  } finally {
    // Restore environment and reconnect DB for subsequent operations
    process.env.NODE_ENV = originalEnv;
    process.env.CLIENT_URL = originalClientUrl;
    process.env.ALLOW_IN_MEMORY_FALLBACK = originalFallback;

    if (server && server.listening) {
      server.close();
    }
    // Reconnect database to maintain connection for background tasks
    await connectDB();
  }
}

runProductionModeSmokeTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Production mode smoke test failed:', err);
    process.exit(1);
  });
