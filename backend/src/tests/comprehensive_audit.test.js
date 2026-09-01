import request from 'supertest';
import app from '../app.js';

describe('VELOOP REWARDS — COMPREHENSIVE FUNCTIONAL & SECURITY AUDIT SUITE', () => {
  let userAToken;
  let userBToken;
  let adminToken;

  beforeAll(async () => {
    // 1. Authenticate User A (Alex Vance VE10842)
    const resA = await request(app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'alex.vance@example.com', password: 'password123' });
    expect(resA.status).toBe(200);
    userAToken = resA.body.token;

    // 2. Authenticate User B (Jordan Lee VE10012)
    const resB = await request(app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'jordan.lee@example.com', password: 'password123' });
    expect(resB.status).toBe(200);
    userBToken = resB.body.token;

    // 3. Authenticate Admin (SuperAdmin VE00001)
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'admin@veloop.io', password: 'admin123' });
    expect(resAdmin.status).toBe(200);
    adminToken = resAdmin.body.token;
  });

  // =========================================================================
  // 1. AUTHENTICATION & USER DATA ISOLATION
  // =========================================================================
  describe('1. Authentication & Security Isolation', () => {
    test('Rejects invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ emailOrUsername: 'alex.vance@example.com', password: 'WRONGPASSWORD' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('User A cannot access protected routes without Bearer Token', async () => {
      const res = await request(app).get('/api/wallet');
      expect(res.status).toBe(401);
    });

    test('User A profile returns only User A data', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.userId).toBe('VE10842');
      expect(res.body.user.username).toBe('Alex Vance');
    });

    test('User B profile returns only User B data (Isolated State)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userBToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.userId).toBe('VE10012');
      expect(res.body.user.username).toBe('Jordan Lee');
    });
  });

  // =========================================================================
  // 2. WATCH ADS & AUTHORITATIVE REWARDS
  // =========================================================================
  describe('2. Watch Ads & Authoritative Reward Calculation', () => {
    test('Get available ads list', async () => {
      const res = await request(app)
        .get('/api/ads')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.ads)).toBe(true);
      expect(res.body.ads.length).toBeGreaterThan(0);
    });

    test('Completing an ad awards authoritative reward and updates wallet', async () => {
      // User A starts with 850 VEs
      const res = await request(app)
        .post('/api/ads/ad-1/complete')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ idempotencyKey: 'test-ad-1-key', clientRewardTamper: 99999 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reward).toBe(38); // Authoritative server reward (+38 VEs for Amazon Prime ad)
      expect(res.body.wallet.VEs).toBe(888); // 850 + 38 = 888 VEs
    });

    test('Duplicate ad completion on the same day is rejected', async () => {
      const res = await request(app)
        .post('/api/ads/ad-1/complete')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ idempotencyKey: 'test-ad-1-key' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('AD_ALREADY_COMPLETED_TODAY');
    });
  });

  // =========================================================================
  // 3. TASKS & QUESTS
  // =========================================================================
  describe('3. Tasks & Quests Claiming', () => {
    test('Get tasks list with statuses', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });

    test('Claiming a task credits reward to wallet and creates transaction', async () => {
      const res = await request(app)
        .post('/api/tasks/t-1/claim')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reward).toBe(20); // +20 VEs
      expect(res.body.wallet.VEs).toBe(908); // 888 + 20 = 908 VEs
    });

    test('Claiming the same task again is rejected', async () => {
      const res = await request(app)
        .post('/api/tasks/t-1/claim')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('TASK_ALREADY_CLAIMED');
    });
  });

  // =========================================================================
  // 4. DAILY BONUS (24H TIMEZONE / CALENDAR VALIDATION)
  // =========================================================================
  describe('4. Daily Bonus Server-Side Validation', () => {
    test('Claiming daily bonus credits +25 VEs', async () => {
      const res = await request(app)
        .post('/api/wallet/daily-bonus')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bonus).toBe(25);
      expect(res.body.wallet.VEs).toBe(933); // 908 + 25 = 933 VEs
    });

    test('Claiming daily bonus a second time on the same day is rejected', async () => {
      const res = await request(app)
        .post('/api/wallet/daily-bonus')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('DAILY_BONUS_ALREADY_CLAIMED');
    });
  });

  // =========================================================================
  // 5. REFERRALS SYSTEM
  // =========================================================================
  describe('5. Referral Engine & Self-Referral Prevention', () => {
    test('Get referral stats for User A', async () => {
      const res = await request(app)
        .get('/api/referrals')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.referralCode).toBe('VELOOP-VE10842');
    });

    test('Self-referral is blocked', async () => {
      const res = await request(app)
        .post('/api/referrals/apply')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ code: 'VELOOP-VE10842' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('SELF_REFERRAL_NOT_ALLOWED');
    });

    test('User B applying User A referral code awards welcome bonus', async () => {
      const res = await request(app)
        .post('/api/referrals/apply')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ code: 'VELOOP-VE10842' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wallet.VEs).toBe(170); // 120 + 50 = 170 VEs
    });
  });

  // =========================================================================
  // 6. WALLET, WITHDRAWALS & TRANSACTION HISTORY
  // =========================================================================
  describe('6. Wallet & Financial Withdrawal Integrity', () => {
    test('Withdrawal below minimum threshold (100 VEs) is rejected', async () => {
      const res = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ amount: 50, payoutMethod: 'UPI', accountDetail: 'alex@upi' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_WITHDRAWAL_AMOUNT');
    });

    test('Withdrawal exceeding balance is rejected', async () => {
      const res = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ amount: 5000, payoutMethod: 'UPI', accountDetail: 'jordan@upi' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INSUFFICIENT_VE_BALANCE');
    });

    test('Valid withdrawal debits balance atomically and generates transaction', async () => {
      // User A balance is 933 VEs. Withdraw 200 VEs.
      const res = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ amount: 200, payoutMethod: 'UPI', accountDetail: 'alex.vance@okhdfcbank' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wallet.VEs).toBe(733); // 933 - 200 = 733 VEs
      expect(res.body.withdrawal.status).toBe('PENDING');
    });

    test('Transaction ledger returns isolated user history', async () => {
      const res = await request(app)
        .get('/api/wallet/history')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.transactions)).toBe(true);
      expect(res.body.transactions.length).toBeGreaterThan(0);

      // Verify User A transactions contain AD_REWARD, TASK_REWARD, DAILY_BONUS, WITHDRAWAL
      const types = res.body.transactions.map((t) => t.type);
      expect(types).toContain('EARNING');
      expect(types).toContain('WITHDRAW');
    });
  });

  // =========================================================================
  // 7. CORE GIVEAWAYS & WINNER CLAIMS (ORIGINAL REQUIREMENTS)
  // =========================================================================
  describe('7. Core Giveaways & Winner Claims Verification', () => {
    test('Joining giveaway deducts authoritative fee (250 VEs for iPhone 15 Pro)', async () => {
      // User A balance is 733 VEs. Join iPhone 15 Pro (250 VEs).
      const res = await request(app)
        .post('/api/giveaways/GW-2026-08/join')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ prizeId: 'PRIZE-IPHONE15', amountTampered: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wallet.VEs).toBe(483); // 733 - 250 = 483 VEs
    });

    test('Duplicate participation in the same giveaway is blocked', async () => {
      const res = await request(app)
        .post('/api/giveaways/GW-2026-08/join')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ prizeId: 'PRIZE-IPHONE15' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ALREADY_PARTICIPATING');
    });

    test('Winner claim for verified winner (Rohan Sharma VE10025)', async () => {
      const resWinner = await request(app)
        .post('/api/auth/login')
        .send({ emailOrUsername: 'rohan.winner@example.com', password: 'password123' });
      const winnerToken = resWinner.body.token;

      const resClaim = await request(app)
        .post('/api/giveaways/GW-2026-07/claim')
        .set('Authorization', `Bearer ${winnerToken}`)
        .send({
          claimType: 'SHIPPING_ADDRESS',
          shippingAddress: {
            fullName: 'Rohan Sharma',
            addressLine1: 'Plot 44, Indiranagar',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560038',
            phoneNumber: '+91 9876543210',
          },
        });

      expect(resClaim.status).toBe(200);
      expect(resClaim.body.success).toBe(true);
      expect(resClaim.body.claim.claimStatus).toBe('SUBMITTED');
    });
  });
});
