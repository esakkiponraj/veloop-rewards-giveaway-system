import { repo } from '../utils/repository.js';

// GET /api/ads
export const getAdsList = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.userId : null;
    const allAds = await repo.getAllAds();

    const adsWithStatus = await Promise.all(
      allAds.map(async (ad) => {
        let watched = false;
        if (userId) {
          watched = await repo.hasUserCompletedAdToday(userId, ad.adId);
        }
        return {
          ...ad,
          watched,
        };
      })
    );

    // Compute user-specific metrics if logged in
    let userStats = {
      todayEarnings: 0,
      totalEarned: 0,
      completedTodayCount: 0,
    };

    if (userId) {
      const completions = await repo.getUserAdCompletions(userId);
      const todayStr = new Date().toDateString();
      const todayCompletions = completions.filter(
        (c) => new Date(c.completedAt).toDateString() === todayStr
      );

      userStats.completedTodayCount = todayCompletions.length;
      userStats.todayEarnings = todayCompletions.reduce((acc, curr) => acc + (curr.reward || 0), 0);
      userStats.totalEarned = completions.reduce((acc, curr) => acc + (curr.reward || 0), 0);
    }

    res.json({
      success: true,
      ads: adsWithStatus,
      stats: userStats,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/ads/:id/complete
export const completeAd = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { idempotencyKey } = req.body;
    const userId = req.user.userId;

    const ad = await repo.getAdById(id);
    if (!ad) {
      return res.status(404).json({
        success: false,
        code: 'AD_NOT_FOUND',
        message: 'Sponsored campaign not found.',
      });
    }

    // Check if user has already watched this ad today
    const alreadyWatched = await repo.hasUserCompletedAdToday(userId, ad.adId);
    if (alreadyWatched) {
      return res.status(400).json({
        success: false,
        code: 'AD_ALREADY_COMPLETED_TODAY',
        message: 'You have already claimed your daily reward for this advertisement.',
      });
    }

    const user = await repo.findUserById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Authentication session invalid.',
      });
    }

    // Server-side Authoritative Reward Value
    const rewardAmount = ad.reward;
    const currency = ad.currency || 'VEs';
    const balanceBefore = user.wallet[currency] || 0;
    const balanceAfter = balanceBefore + rewardAmount;
    const transactionId = `TXN-AD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 1. Atomically update wallet on server
    await repo.updateUserWallet(userId, currency, balanceAfter);

    // 2. Record completion record
    await repo.recordAdCompletion({
      userId,
      adId: ad.adId,
      brand: ad.brand,
      reward: rewardAmount,
      currency,
      transactionId,
      idempotencyKey: idempotencyKey || null,
    });

    // 3. Log financial transaction record
    await repo.createTransaction({
      transactionId,
      userId,
      currency,
      amount: rewardAmount,
      status: 'SUCCESS',
      balanceBefore,
      balanceAfter,
      type: 'AD_REWARD',
      metadata: {
        adId: ad.adId,
        brand: ad.brand,
      },
    });

    // 4. Log audit log
    await repo.createAuditLog({
      logId: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId,
      action: 'AD_REWARD_CLAIMED',
      amount: rewardAmount,
      currency,
      result: 'SUCCESS',
      metadata: { adId: ad.adId, transactionId },
    });

    const updatedUser = await repo.findUserById(userId);

    res.json({
      success: true,
      message: `Reward Earned! +${rewardAmount} ${currency} successfully credited to your wallet.`,
      reward: rewardAmount,
      currency,
      transactionId,
      wallet: updatedUser.wallet,
    });
  } catch (error) {
    next(error);
  }
};
