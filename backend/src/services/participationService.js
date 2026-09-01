import mongoose from 'mongoose';
import { repo } from '../utils/repository.js';
import { evaluateFraudRisk } from './fraudService.js';
import User from '../models/User.js';

// Strict server-side allowlist mapping for currency fields to prevent prototype or field path injection
const ALLOWED_CURRENCY_MAP = Object.freeze({
  VEs: 'wallet.VEs',
  SVEs: 'wallet.SVEs',
  Tokens: 'wallet.Tokens',
});

export const processJoinGiveaway = async ({
  userId,
  giveawayId,
  prizeId,
  deviceHash,
  ipAddress,
  idempotencyKey,
  userAgent,
}) => {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('Database service is temporarily unavailable. Please try again shortly.');
    error.code = 'SERVICE_UNAVAILABLE';
    error.statusCode = 503;
    throw error;
  }

  // 1. Load User (Identity is strictly resolved from verified auth token, never client body)
  const user = await repo.findUserById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.code = 'LOGIN_REQUIRED';
    error.statusCode = 401;
    throw error;
  }

  // 2. Load Giveaway
  const giveaway = await repo.getGiveawayById(giveawayId);
  if (!giveaway) {
    const error = new Error('Giveaway event not found.');
    error.code = 'GIVEAWAY_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  // 3. Server-time & status validation
  const now = new Date();
  if (giveaway.status !== 'ACTIVE') {
    const error = new Error(`Giveaway is currently ${giveaway.status.toLowerCase()}.`);
    error.code = giveaway.status === 'ENDED' ? 'GIVEAWAY_ENDED' : 'GIVEAWAY_NOT_ACTIVE';
    error.statusCode = 400;
    throw error;
  }

  if (now > new Date(giveaway.endAt)) {
    giveaway.status = 'ENDED';
    await giveaway.save();
    const error = new Error('This giveaway has reached its deadline and is now ended.');
    error.code = 'GIVEAWAY_ENDED';
    error.statusCode = 400;
    throw error;
  }

  if (now < new Date(giveaway.startAt)) {
    const error = new Error('This giveaway has not started yet.');
    error.code = 'GIVEAWAY_NOT_ACTIVE';
    error.statusCode = 400;
    throw error;
  }

  // 4. Verify Prize
  let prize = null;
  if (prizeId) {
    prize = await repo.getPrizeByIdOrSlug(giveaway.giveawayId, prizeId);
  }
  if (!prize && giveaway.prizes && giveaway.prizes.length > 0) {
    prize = giveaway.prizes[0];
  }

  if (!prize) {
    const error = new Error('Prize configuration not found for this giveaway.');
    error.code = 'PRIZE_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  // 5. Strict Currency Allowlist Validation
  const requiredCurrency = prize.entryCurrency;
  const walletFieldPath = ALLOWED_CURRENCY_MAP[requiredCurrency];
  if (!walletFieldPath) {
    const error = new Error(`Unrecognized currency configuration: ${requiredCurrency}`);
    error.code = 'INVALID_CURRENCY_CONFIG';
    error.statusCode = 500;
    throw error;
  }

  // 6. Check if user already participated in this specific Prize Giveaway (Idempotency pre-check)
  const existingParticipation = await repo.getUserParticipation(user.userId, giveaway.giveawayId, prize.prizeId);
  if (existingParticipation) {
    const currentUser = await repo.findUserById(user.userId);
    return {
      success: true,
      alreadyJoined: true,
      giveawayId: giveaway.giveawayId,
      prize: { prizeId: prize.prizeId, name: prize.name, image: prize.image },
      participation: {
        userId: user.userId,
        maskedId: user.maskedId,
        giveawayId: giveaway.giveawayId,
        prizeId: prize.prizeId,
        prizeName: prize.name,
        prizeImage: prize.image,
        entryCount: existingParticipation.entryCount || 1,
        entryCurrency: existingParticipation.entryCurrency,
        entryAmount: existingParticipation.entryAmount,
        joinedAt: existingParticipation.joinedAt,
        transactionId: existingParticipation.transactionId,
      },
      transactionId: existingParticipation.transactionId,
      joinedAt: existingParticipation.joinedAt,
      wallet: currentUser.wallet,
      message: "You're already participating in this prize giveaway.",
    };
  }

  // 7. Fraud & Abuse Check (Multi-signal telemetry)
  const fraudCheck = await evaluateFraudRisk({
    userId: user.userId,
    giveawayId: giveaway.giveawayId,
    deviceHash,
    ipAddress,
  });

  if (!fraudCheck.isAllowed) {
    await repo.createAuditLog({
      logId: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: user.userId,
      giveawayId: giveaway.giveawayId,
      action: 'JOIN_REJECTED',
      amount: prize.entryAmount,
      currency: requiredCurrency,
      result: 'BLOCKED',
      metadata: { reason: 'Fraud risk threshold exceeded', signals: fraudCheck.signals },
      ipAddress,
      userAgent,
    });

    const error = new Error("Participation couldn't be completed. Suspicious activity detected.");
    error.code = 'PARTICIPATION_BLOCKED';
    error.statusCode = 403;
    throw error;
  }

  // 8. Authoritative Fee & Balance Check
  const requiredAmount = prize.entryAmount;
  const currentBalance = user.wallet[requiredCurrency] || 0;

  if (currentBalance < requiredAmount) {
    const deficit = requiredAmount - currentBalance;
    const errorCodes = {
      VEs: 'INSUFFICIENT_VE_BALANCE',
      SVEs: 'INSUFFICIENT_SVE_BALANCE',
      Tokens: 'INSUFFICIENT_TOKEN_BALANCE',
    };
    const error = new Error(
      `Insufficient ${requiredCurrency} balance. You have ${currentBalance.toLocaleString()} ${requiredCurrency}, but ${requiredAmount.toLocaleString()} ${requiredCurrency} is required (need ${deficit.toLocaleString()} more).`
    );
    error.code = errorCodes[requiredCurrency] || 'INSUFFICIENT_BALANCE';
    error.statusCode = 400;
    error.details = { requiredCurrency, requiredAmount, currentBalance, deficit };
    throw error;
  }

  // 9. Atomic Session & Transaction Execution
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transactionId = `TXN-GW-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 9a. Atomic conditional balance deduction using strict allowlist path
    const updatedUser = await User.findOneAndUpdate(
      {
        userId: user.userId,
        [walletFieldPath]: { $gte: requiredAmount },
      },
      {
        $inc: { [walletFieldPath]: -requiredAmount },
      },
      { session, new: true }
    );

    if (!updatedUser) {
      const error = new Error(`Insufficient ${requiredCurrency} balance at execution time.`);
      error.code = 'INSUFFICIENT_BALANCE';
      error.statusCode = 400;
      throw error;
    }

    const balanceBefore = currentBalance;
    const balanceAfter = updatedUser.wallet[requiredCurrency];

    // 9b. Create Participation record with entryCount = 1
    const participation = await repo.createParticipation(
      {
        userId: user.userId,
        giveawayId: giveaway.giveawayId,
        prizeId: prize.prizeId,
        entryCount: 1,
        entryCurrency: requiredCurrency,
        entryAmount: requiredAmount,
        deviceHash,
        ipAddress,
        status: fraudCheck.action === 'FLAGGED' ? 'FLAGGED' : 'ACTIVE',
        transactionId,
        idempotencyKey: idempotencyKey || null,
        joinedAt: new Date(),
      },
      session
    );

    // 9c. Create Transaction Record
    const transaction = await repo.createTransaction(
      {
        transactionId,
        userId: user.userId,
        giveawayId: giveaway.giveawayId,
        prizeId: prize.prizeId,
        currency: requiredCurrency,
        amount: requiredAmount,
        status: 'SUCCESS',
        balanceBefore,
        balanceAfter,
        type: 'ENTRY_FEE',
        metadata: {
          giveawayTitle: giveaway.title,
          prizeName: prize.name,
          deviceHash: deviceHash.substring(0, 10),
        },
      },
      session
    );

    // 9d. Create Audit Log
    await repo.createAuditLog(
      {
        logId: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: user.userId,
        giveawayId: giveaway.giveawayId,
        action: 'JOIN_GIVEAWAY',
        amount: requiredAmount,
        currency: requiredCurrency,
        result: 'SUCCESS',
        metadata: {
          prizeId: prize.prizeId,
          prizeName: prize.name,
          transactionId,
          riskScore: fraudCheck.riskScore,
        },
        ipAddress,
        userAgent,
      },
      session
    );

    // Commit MongoDB transaction
    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: `You're In! Your entry for the ${prize.name} giveaway has been successfully recorded.`,
      participation: {
        userId: user.userId,
        maskedId: user.maskedId,
        giveawayId: giveaway.giveawayId,
        prizeId: prize.prizeId,
        prizeName: prize.name,
        prizeImage: prize.image,
        entryCount: participation.entryCount || 1,
        entryCurrency: requiredCurrency,
        entryAmount: requiredAmount,
        joinedAt: participation.joinedAt,
        transactionId,
      },
      transaction: {
        transactionId: transaction.transactionId,
        amount: requiredAmount,
        currency: requiredCurrency,
        balanceBefore,
        balanceAfter,
        createdAt: transaction.createdAt,
      },
      wallet: updatedUser.wallet,
    };
  } catch (txError) {
    await session.abortTransaction();
    session.endSession();

    // Idempotent recovery: if a concurrent request already committed the participation
    for (let retry = 0; retry < 3; retry++) {
      await new Promise((r) => setTimeout(r, 100 * (retry + 1)));
      const existing = await repo.getUserParticipation(user.userId, giveaway.giveawayId, prize.prizeId);
      if (existing) {
        const currentUser = await repo.findUserById(user.userId);
        return {
          success: true,
          alreadyJoined: true,
          giveawayId: giveaway.giveawayId,
          prize: { prizeId: prize.prizeId, name: prize.name, image: prize.image },
          participation: {
            userId: user.userId,
            maskedId: user.maskedId,
            giveawayId: giveaway.giveawayId,
            prizeId: prize.prizeId,
            prizeName: prize.name,
            prizeImage: prize.image,
            entryCount: existing.entryCount || 1,
            entryCurrency: existing.entryCurrency,
            entryAmount: existing.entryAmount,
            joinedAt: existing.joinedAt,
            transactionId: existing.transactionId,
          },
          wallet: currentUser ? currentUser.wallet : user.wallet,
          message: "You're already participating in this prize giveaway.",
        };
      }
    }

    throw txError;
  }
};
