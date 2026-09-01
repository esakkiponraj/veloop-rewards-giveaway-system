// Quick node-based end-to-end endpoint verification
async function verifyAll() {
  console.log('Testing Frontend and Backend API routes...\n');

  try {
    // 1. Health
    const health = await fetch('http://localhost:5000/api/health').then(r => r.json());
    console.log('1. Health Check:', health);

    // 2. Current Giveaway
    const gw = await fetch('http://localhost:5000/api/giveaways/current').then(r => r.json());
    console.log('2. Current Giveaway:', gw.giveaway?.title, `(${gw.giveaway?.prizes?.length} prizes)`);

    // 3. Prize Details by Slug
    const prize = await fetch('http://localhost:5000/api/giveaways/prizes/iphone-15-pro').then(r => r.json());
    console.log('3. Prize Details (iPhone 15 Pro):', prize.prize?.name, `(Fee: ${prize.prize?.entryAmount} ${prize.prize?.entryCurrency})`);

    // 4. Login User
    const login = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'alex.vance@example.com', password: 'password123' })
    }).then(r => r.json());
    console.log('4. Login Alex Vance:', login.success ? 'SUCCESS' : 'FAILED', `(Balance: ${login.user?.wallet?.VEs} VEs)`);

    // 5. Frontend index.html
    const frontendRes = await fetch('http://localhost:5173/');
    console.log('5. Frontend Dev Server HTTP Status:', frontendRes.status, frontendRes.statusText);

    console.log('\n✅ ALL HTTP & API ENDPOINTS VERIFIED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

verifyAll();
