import { repo } from '../utils/repository.js';

// GET /api/referrals
export const getReferralDetails = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await repo.findUserById(userId);
    const referrals = await repo.getUserReferrals(userId);

    const totalReferrals = referrals.length;
    const totalBonusEarned = referrals.reduce((acc, r) => acc + (r.rewardEarned || 100), 0);

    const referralCode = user.referralCode || `VELOOP-${userId}`;
    const referralLink = `https://veloop.io/join?ref=${referralCode}`;

    res.json({
      success: true,
      referralCode,
      referralLink,
      totalReferrals,
      totalBonusEarned,
      referrals,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/referrals/apply
export const applyReferralCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    const userId = req.user.userId;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'INVALID_CODE',
        message: 'Please provide a valid referral code.',
      });
    }

    const cleanCode = code.trim().toUpperCase();

    // Prevent self-referral
    if (cleanCode.includes(userId)) {
      return res.status(400).json({
        success: false,
        code: 'SELF_REFERRAL_NOT_ALLOWED',
        message: 'You cannot use your own referral code.',
      });
    }

    const referrer = await repo.findUserByEmailOrUsername(cleanCode.replace('VELOOP-', ''));
    if (!referrer) {
      return res.status(404).json({
        success: false,
        code: 'REFERRER_NOT_FOUND',
        message: 'Referral code not recognized.',
      });
    }

    // Record referral
    await repo.recordReferral({
      referrerUserId: referrer.userId,
      refereeUserId: userId,
      rewardEarned: 100,
    });

    // Credit referrer +100 VEs
    const refBalBefore = referrer.wallet.VEs || 0;
    await repo.updateUserWallet(referrer.userId, 'VEs', refBalBefore + 100);

    // Credit user +50 VEs welcome bonus
    const user = await repo.findUserById(userId);
    const userBalBefore = user.wallet.VEs || 0;
    await repo.updateUserWallet(userId, 'VEs', userBalBefore + 50);

    const updatedUser = await repo.findUserById(userId);

    res.json({
      success: true,
      message: 'Referral code applied! You earned +50 VEs welcome bonus.',
      wallet: updatedUser.wallet,
    });
  } catch (error) {
    next(error);
  }
};
