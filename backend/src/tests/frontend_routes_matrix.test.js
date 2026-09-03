import { sanitizeReturnUrl } from '../../../frontend/src/utils/urlSanitizer.js';

/**
 * Simulates Route Guard decision functions based on exact implementation in:
 * - frontend/src/components/RouteGuards/ProtectedRoute.jsx
 * - frontend/src/components/RouteGuards/AdminRoute.jsx
 * - frontend/src/components/RouteGuards/PublicOnlyRoute.jsx
 */
function evaluateProtectedRoute({ isAuthenticated, pathname, search }) {
  if (!isAuthenticated) {
    const returnUrl = encodeURIComponent(pathname + search);
    return { action: 'REDIRECT', target: `/login?returnUrl=${returnUrl}` };
  }
  return { action: 'RENDER', target: pathname };
}

function evaluateAdminRoute({ isAuthenticated, isAdmin, pathname }) {
  if (!isAuthenticated) {
    return { action: 'REDIRECT', target: '/login?returnUrl=/admin' };
  }
  if (!isAdmin) {
    return { action: 'ACCESS_DENIED', target: '/giveaways', message: 'Access Denied: Administrative clearance required' };
  }
  return { action: 'RENDER', target: pathname };
}

function evaluatePublicOnlyRoute({ isAuthenticated, isAdmin, returnUrlParam }) {
  if (isAuthenticated) {
    if (isAdmin) {
      const destination = returnUrlParam && returnUrlParam.startsWith('/admin') ? returnUrlParam : '/admin';
      return { action: 'REDIRECT', target: destination };
    }
    const destination = sanitizeReturnUrl(returnUrlParam, '/giveaways');
    return { action: 'REDIRECT', target: destination };
  }
  return { action: 'RENDER', target: '/login' };
}

async function runRouteMatrixSuite() {
  console.log('====================================================');
  console.log('🧭 VELOOP REWARDS — FRONTEND ROUTE GUARD MATRIX TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASSED] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAILED] ${message}`);
      failed++;
    }
  }

  // 1. Guest -> /wallet
  const guestWallet = evaluateProtectedRoute({ isAuthenticated: false, pathname: '/wallet', search: '' });
  assert(
    guestWallet.action === 'REDIRECT' && guestWallet.target === '/login?returnUrl=%2Fwallet',
    'Guest visiting /wallet redirects to /login?returnUrl=%2Fwallet'
  );

  // 2. Guest -> /admin
  const guestAdmin = evaluateAdminRoute({ isAuthenticated: false, isAdmin: false, pathname: '/admin' });
  assert(
    guestAdmin.action === 'REDIRECT' && guestAdmin.target === '/login?returnUrl=/admin',
    'Guest visiting /admin redirects to /login?returnUrl=/admin'
  );

  // 3. Authenticated User -> /admin
  const userAdmin = evaluateAdminRoute({ isAuthenticated: true, isAdmin: false, pathname: '/admin' });
  assert(
    userAdmin.action === 'ACCESS_DENIED' && userAdmin.target === '/giveaways',
    'Regular authenticated user visiting /admin receives Access Denied with fallback link to /giveaways'
  );

  // 4. Authenticated User -> /login (no returnUrl)
  const userLogin = evaluatePublicOnlyRoute({ isAuthenticated: true, isAdmin: false, returnUrlParam: null });
  assert(
    userLogin.action === 'REDIRECT' && userLogin.target === '/giveaways',
    'Regular authenticated user visiting /login redirects to /giveaways'
  );

  // 5. Authenticated Admin -> /login
  const adminLogin = evaluatePublicOnlyRoute({ isAuthenticated: true, isAdmin: true, returnUrlParam: null });
  assert(
    adminLogin.action === 'REDIRECT' && adminLogin.target === '/admin',
    'Authenticated admin visiting /login redirects to /admin'
  );

  // 6. Authenticated User -> /login?returnUrl=/my-entries (valid internal returnUrl)
  const userValidReturn = evaluatePublicOnlyRoute({
    isAuthenticated: true,
    isAdmin: false,
    returnUrlParam: '/my-entries',
  });
  assert(
    userValidReturn.action === 'REDIRECT' && userValidReturn.target === '/my-entries',
    'Authenticated user with returnUrl=/my-entries redirects to valid internal /my-entries'
  );

  // 7. Authenticated User -> /login?returnUrl=https://evil.com (external malicious returnUrl)
  const userEvilReturn = evaluatePublicOnlyRoute({
    isAuthenticated: true,
    isAdmin: false,
    returnUrlParam: 'https://evil.com',
  });
  assert(
    userEvilReturn.action === 'REDIRECT' && userEvilReturn.target === '/giveaways',
    'Authenticated user with malicious returnUrl=https://evil.com safely neutralizes to /giveaways'
  );

  // 8. Protocol-relative and script attack neutralization
  const userProtocolRelative = evaluatePublicOnlyRoute({
    isAuthenticated: true,
    isAdmin: false,
    returnUrlParam: '//evil.com',
  });
  assert(
    userProtocolRelative.action === 'REDIRECT' && userProtocolRelative.target === '/giveaways',
    'Authenticated user with protocol-relative returnUrl=//evil.com safely neutralizes to /giveaways'
  );

  console.log('\n====================================================');
  console.log(`🎉 ROUTE GUARD MATRIX: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runRouteMatrixSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
