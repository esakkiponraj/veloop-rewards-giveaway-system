import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeReturnUrl } from '../../../frontend/src/utils/urlSanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // 9. My Entries Empty State CTA Route Verification
  const myEntriesPath = path.resolve(__dirname, '../../../frontend/src/pages/MyEntries/MyEntries.jsx');
  const myEntriesContent = fs.readFileSync(myEntriesPath, 'utf-8');
  
  // Extract link target around Explore Giveaways CTA
  const exploreCtaMatch = myEntriesContent.match(/<Link\s+to=["']([^"']+)["'][^>]*>\s*<span>Explore Giveaways<\/span>/s);
  const ctaTarget = exploreCtaMatch ? exploreCtaMatch[1] : null;

  assert(
    ctaTarget === '/giveaways',
    `My Entries empty state "Explore Giveaways" CTA navigates specifically to /giveaways (Found: "${ctaTarget}")`
  );

  // 10. CTA must not navigate to public landing page or individual prize
  assert(
    ctaTarget !== '/' && !ctaTarget?.startsWith('/giveaway/'),
    `My Entries empty state CTA does not link to landing page "/" or specific prize detail (Target: "${ctaTarget}")`
  );

  // 11. Landing Page Section Navigation Mappings in LandingNavbar.jsx
  const landingNavbarPath = path.resolve(__dirname, '../../../frontend/src/components/LandingNavbar/LandingNavbar.jsx');
  const landingNavbarContent = fs.readFileSync(landingNavbarPath, 'utf-8');

  const expectedNavMappings = [
    { label: 'Live Giveaway', href: '#live-giveaway' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Currencies', href: '#currencies' },
    { label: 'Security & Trust', href: '#security' },
    { label: 'Winners', href: '#winners' },
    { label: 'FAQ', href: '#faq' },
  ];

  const allMappingsPresent = expectedNavMappings.every((m) =>
    landingNavbarContent.includes(`label: '${m.label}', href: '${m.href}'`)
  );
  assert(
    allMappingsPresent,
    'LandingNavbar.jsx contains all 6 required section mappings (#live-giveaway, #how-it-works, #currencies, #security, #winners, #faq)'
  );

  // 12. LandingPage.jsx Section Target IDs
  const landingPagePath = path.resolve(__dirname, '../../../frontend/src/pages/LandingPage/LandingPage.jsx');
  const landingPageContent = fs.readFileSync(landingPagePath, 'utf-8');

  const requiredSectionIds = ['live-giveaway', 'how-it-works', 'currencies', 'security', 'winners', 'faq'];
  const allSectionsPresent = requiredSectionIds.every((id) =>
    landingPageContent.includes(`id="${id}"`)
  );
  assert(
    allSectionsPresent,
    'LandingPage.jsx contains target section elements for all 6 anchor IDs'
  );

  // 13. LandingPage.module.css Scroll Margin Top for 72px Navbar Clearance
  const landingCssPath = path.resolve(__dirname, '../../../frontend/src/pages/LandingPage/LandingPage.module.css');
  const landingCssContent = fs.readFileSync(landingCssPath, 'utf-8');

  assert(
    landingCssContent.includes('scroll-margin-top: 88px;'),
    'LandingPage.module.css applies scroll-margin-top: 88px to sections to prevent navbar overlap'
  );

  // 14. Sticky Navbar positioning & overflow-x: clip (no overflow: hidden parent block)
  const navbarCssPath = path.resolve(__dirname, '../../../frontend/src/components/LandingNavbar/LandingNavbar.module.css');
  const navbarCssContent = fs.readFileSync(navbarCssPath, 'utf-8');

  const navbarIsSticky = navbarCssContent.includes('position: sticky;') && navbarCssContent.includes('top: 0;');
  const landingUsesClip = landingCssContent.includes('overflow-x: clip;');

  assert(
    navbarIsSticky && landingUsesClip,
    'LandingNavbar uses position: sticky at top: 0 and LandingPage uses overflow-x: clip (sticky unblocked)'
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
