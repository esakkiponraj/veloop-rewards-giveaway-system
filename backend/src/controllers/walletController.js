import { repo } from '../utils/repository.js';

// GET /api/wallet
export const getWalletOverview = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await repo.findUserById(userId);

    const transactions = await repo.getUserTransactions(userId);
    const withdrawals = await repo.getUserWithdrawals(userId);

    // Compute lifetime statistics
    const totalEarnedVEs = transactions
      .filter((t) => t.currency === 'VEs' && t.amount > 0 && t.type !== 'ENTRY_FEE')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      wallet: user.wallet,
      stats: {
        totalEarnedVEs,
        totalWithdrawalsCount: withdrawals.length,
        totalTransactionsCount: transactions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/wallet/daily-bonus
export const claimDailyBonus = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await repo.findUserById(userId);

    const now = new Date();
    if (user.lastDailyBonusAt) {
      const lastClaim = new Date(user.lastDailyBonusAt);
      const isSameDay = lastClaim.toDateString() === now.toDateString();
      if (isSameDay) {
        return res.status(400).json({
          success: false,
          code: 'DAILY_BONUS_ALREADY_CLAIMED',
          message: 'You have already claimed your daily bonus today. Return tomorrow for your next reward!',
        });
      }
    }

    const bonusAmount = 25;
    const balanceBefore = user.wallet.VEs || 0;
    const balanceAfter = balanceBefore + bonusAmount;
    const transactionId = `TXN-BONUS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Update wallet & timestamp
    await repo.updateUserWallet(userId, 'VEs', balanceAfter);
    await repo.updateUserDailyBonus(userId, now);

    // Log transaction
    await repo.createTransaction({
      transactionId,
      userId,
      currency: 'VEs',
      amount: bonusAmount,
      status: 'SUCCESS',
      balanceBefore,
      balanceAfter,
      type: 'DAILY_BONUS',
      metadata: { reason: 'Daily Check-In Reward' },
    });

    const updatedUser = await repo.findUserById(userId);

    res.json({
      success: true,
      message: 'Daily Bonus Claimed! +25 VEs added to your wallet.',
      bonus: bonusAmount,
      wallet: updatedUser.wallet,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/wallet/withdraw
export const requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, payoutMethod, accountDetail } = req.body;
    const userId = req.user.userId;

    const numAmount = parseInt(amount, 10);
    if (!numAmount || isNaN(numAmount) || numAmount < 100) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_WITHDRAWAL_AMOUNT',
        message: 'Minimum withdrawal threshold is 100 VEs.',
      });
    }

    if (!payoutMethod || !['UPI', 'BANK', 'AMAZON'].includes(payoutMethod)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_PAYOUT_METHOD',
        message: 'Please select a valid payout channel (UPI, Bank, Amazon Voucher).',
      });
    }

    if (!accountDetail || typeof accountDetail !== 'string' || accountDetail.trim().length < 4) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ACCOUNT_DETAILS',
        message: 'Please provide valid payout recipient details.',
      });
    }

    const user = await repo.findUserById(userId);
    const currentBalance = user.wallet.VEs || 0;

    if (currentBalance < numAmount) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_VE_BALANCE',
        message: `Insufficient VEs balance. You have ${currentBalance} VEs, but requested ${numAmount} VEs.`,
      });
    }

    // Atomic debit
    const balanceBefore = currentBalance;
    const balanceAfter = currentBalance - numAmount;
    const withdrawalId = `WTH-${Date.now().toString().slice(-6)}`;
    const transactionId = `TXN-WTH-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await repo.updateUserWallet(userId, 'VEs', balanceAfter);

    // Record withdrawal
    const withdrawal = await repo.createWithdrawal({
      withdrawalId,
      userId,
      amount: numAmount,
      currency: 'VEs',
      payoutMethod,
      accountDetail: accountDetail.trim(),
      transactionId,
    });

    // Log transaction
    await repo.createTransaction({
      transactionId,
      userId,
      currency: 'VEs',
      amount: -numAmount,
      status: 'PENDING',
      balanceBefore,
      balanceAfter,
      type: 'WITHDRAWAL',
      metadata: {
        withdrawalId,
        payoutMethod,
      },
    });

    const updatedUser = await repo.findUserById(userId);

    res.json({
      success: true,
      message: `Withdrawal of ${numAmount} VEs scheduled for dispatch via ${payoutMethod}. Ref #${withdrawalId}.`,
      withdrawal,
      wallet: updatedUser.wallet,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/wallet/history
export const getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { filter } = req.query;

    const rawTransactions = await repo.getUserTransactions(userId, filter);

    const formatted = rawTransactions.map((t) => {
      let formattedType = 'EARNING';
      let title = 'Reward Credit';

      if (t.type === 'ENTRY_FEE') {
        formattedType = 'GIVEAWAY';
        title = t.metadata?.prizeName ? `Giveaway Entry (${t.metadata.prizeName})` : 'Giveaway Entry Fee';
      } else if (t.type === 'WITHDRAWAL') {
        formattedType = 'WITHDRAW';
        title = `Payout (${t.metadata?.payoutMethod || 'Bank/UPI'})`;
      } else if (t.type === 'AD_REWARD') {
        formattedType = 'EARNING';
        title = t.metadata?.brand ? `Ad Watch (${t.metadata.brand})` : 'Ad Watch Reward';
      } else if (t.type === 'DAILY_BONUS') {
        formattedType = 'EARNING';
        title = 'Daily Check-In Bonus';
      } else if (t.type === 'TASK_REWARD') {
        formattedType = 'EARNING';
        title = t.metadata?.title ? `Task Reward (${t.metadata.title})` : 'Quest Reward';
      }

      return {
        id: t._id || t.transactionId,
        transactionId: t.transactionId,
        title,
        type: formattedType,
        rawType: t.type,
        amount: t.amount > 0 ? `+${t.amount} ${t.currency}` : `${t.amount} ${t.currency}`,
        currency: t.currency,
        date: new Date(t.createdAt).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: t.status || 'COMPLETED',
        ref: t.transactionId,
      };
    });

    res.json({
      success: true,
      transactions: formatted,
    });
  } catch (error) {
    next(error);
  }
};
