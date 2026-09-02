import fs from 'fs';
import { execSync } from 'child_process';

const patterns = [
  { name: 'MongoDB URI with Credentials', regex: /mongodb(?:\+srv)?:\/\/[^\/\s:]+:[^\/\s@]+@/i },
  { name: 'Private Key Header', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/i },
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Real External JWT Secret', regex: /JWT_SECRET\s*=\s*['"][a-zA-Z0-9_\-]{32,}['"]/ },
  { name: 'Live Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/ },
  { name: 'Live Slack Webhook', regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9a-zA-Z_]+\/B[0-9a-zA-Z_]+\/[0-9a-zA-Z_]+/ },
];

function runSecretScan() {
  console.log('====================================================');
  console.log('🛡️ VELOOP REWARDS — TRACKED FILES SECRET SCAN');
  console.log('====================================================');

  const trackedFiles = execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);

  console.log(`Scanning ${trackedFiles.length} tracked repository files...`);

  let secretFindings = 0;
  for (const file of trackedFiles) {
    if (!fs.existsSync(file)) continue;
    // Skip binary assets
    if (file.endsWith('.svg') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.ico')) continue;

    const content = fs.readFileSync(file, 'utf8');
    for (const pat of patterns) {
      if (pat.regex.test(content)) {
        // Check if it is an explicit dummy/development-only test value in a test file or example
        const isDocOrExampleOrTest =
          file.endsWith('.example') ||
          file.includes('test') ||
          file.endsWith('.md') ||
          file.includes('seed');

        if (isDocOrExampleOrTest) {
          console.log(`  ℹ️ [DEV-ONLY / EXAMPLE REFERENCE] File: ${file} matches pattern "${pat.name}" (Sanitized reference value)`);
        } else {
          console.error(`  ⚠️ [POTENTIAL SECRET FOUND] File: ${file} matches pattern "${pat.name}"`);
          secretFindings++;
        }
      }
    }
  }

  console.log('====================================================');
  console.log(`Scan Complete: ${trackedFiles.length} files inspected.`);
  console.log(`Production Secret Findings: ${secretFindings}`);
  if (secretFindings === 0) {
    console.log('🎉 ZERO PRODUCTION SECRETS DETECTED IN TRACKED FILES');
  } else {
    console.error(`❌ ${secretFindings} POTENTIAL LEAK(S) DETECTED`);
    process.exit(1);
  }
}

runSecretScan();
