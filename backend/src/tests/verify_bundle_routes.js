import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../../../frontend/dist');

const htmlPath = path.join(distDir, 'index.html');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(htmlPath)) {
  console.error('❌ dist/index.html does not exist. Run npm run build first.');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));

if (jsFiles.length === 0) {
  console.error('❌ No JS bundle found in dist/assets.');
  process.exit(1);
}

const jsBundlePath = path.join(assetsDir, jsFiles[0]);
const jsContent = fs.readFileSync(jsBundlePath, 'utf8');

const checks = [
  { name: 'Root container <div id="root"> exists in HTML', pass: html.includes('id="root"') },
  { name: 'Compiled JS bundle referenced in HTML script tag', pass: html.includes(jsFiles[0]) },
  { name: 'LandingPage heading compiled in JS bundle', pass: jsContent.includes('Earn Daily Rewards') },
  { name: 'LandingPage active giveaway CTA compiled in JS bundle', pass: jsContent.includes('Explore Live Giveaways') },
  { name: 'DashboardLayout navigation compiled in JS bundle', pass: jsContent.includes('MAIN MENU') },
  { name: 'Giveaways hub compiled in JS bundle', pass: jsContent.includes('giveaways') },
  { name: 'Admin operations console compiled in JS bundle', pass: jsContent.includes('VELOOP OPERATIONS CONSOLE') },
  { name: 'Prize details CTA compiled in JS bundle', pass: jsContent.includes('View Prize & Enter') },
  { name: 'Disabled CTA fallback compiled in JS bundle', pass: jsContent.includes('Details Available in Portal') },
  { name: 'No invented "1 Prize" fallback string in bundle', pass: !jsContent.includes('"1 Prize"') && !jsContent.includes("'1 Prize'") },
  { name: 'No invented "Free Entry" fallback string in bundle', pass: !jsContent.includes('"Free Entry"') && !jsContent.includes("'Free Entry'") },
  { name: 'No invented "VE****00" fallback string in bundle', pass: !jsContent.includes('"VE****00"') && !jsContent.includes("'VE****00'") },
  { name: 'No invented "Verified Reward" fallback string in bundle', pass: !jsContent.includes('"Verified Reward"') && !jsContent.includes("'Verified Reward'") },
  { name: 'No invented "Draw Concluded" fallback string in bundle', pass: !jsContent.includes('"Draw Concluded"') && !jsContent.includes("'Draw Concluded'") },
];

console.log('====================================================');
console.log('🔍 PRODUCTION BUNDLE & CLIENT-SIDE RENDER AUDIT');
console.log('====================================================');

let allPassed = true;
checks.forEach((c) => {
  console.log(`${c.pass ? '  ✅ [PASSED]' : '  ❌ [FAILED]'} ${c.name}`);
  if (!c.pass) allPassed = false;
});

console.log('====================================================');
if (allPassed) {
  console.log('🎉 ALL 14 BUNDLE & CLIENT-SIDE RENDER CHECKS PASSED');
} else {
  console.error('❌ BUNDLE VERIFICATION FAILED');
  process.exit(1);
}
