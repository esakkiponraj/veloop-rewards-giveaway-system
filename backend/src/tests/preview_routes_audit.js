
const routes = [
  '/',
  '/giveaways',
  '/giveaway/iphone-15-pro',
  '/my-entries',
  '/admin',
  '/login',
];

async function runPreviewRoutesAudit() {
  console.log('====================================================');
  console.log('🌐 PRODUCTION PREVIEW ROUTING & SPA FALLBACK AUDIT');
  console.log('====================================================');

  let allPassed = true;
  for (const route of routes) {
    try {
      const url = `http://localhost:4173${route}`;
      const res = await fetch(url);
      const text = await res.text();
      const is200 = res.status === 200;
      const deliversSPA = text.includes('id="root"') && text.includes('index-');
      const pass = is200 && deliversSPA;
      if (!pass) allPassed = false;

      console.log(
        `  ${pass ? '✅' : '❌'} Route: ${route.padEnd(25)} HTTP ${res.status} | SPA Root: ${deliversSPA} | Content-Type: ${res.headers.get('content-type')}`
      );
    } catch (err) {
      console.error(`  ❌ Failed to fetch ${route}:`, err.message);
      allPassed = false;
    }
  }

  console.log('====================================================');
  if (allPassed) {
    console.log('🎉 ALL 6 PRODUCTION PREVIEW ROUTES RETURNED HTTP 200 & SPA HTML');
  } else {
    console.error('❌ SOME ROUTES FAILED');
    process.exit(1);
  }
}

runPreviewRoutesAudit();
