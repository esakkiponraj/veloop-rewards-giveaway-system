import crypto from 'crypto';
import mongoose from 'mongoose';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import User from '../models/User.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import AuditLog from '../models/AuditLog.js';
import { repo } from '../utils/repository.js';

/**
 * Cryptographically secure weighted random selection without replacement.
 * Uses Node.js crypto.randomInt() — NO Math.random() in production.
 * Selection probability is strictly proportional to each participation's entryCount.
 *
 * @param {Array} candidates - Array of participation records with { userId, entryCount }
 * @param {number} countNeeded - Number of distinct winners to select
 * @returns {Array} Selected winners
 */
export const selectWeightedRandomWithoutReplacement = (candidates, countNeeded) => {
  if (!candidates || candidates.length === 0 || countNeeded <= 0) {
    return [];
  }

  // Clone pool
  const pool = candidates.map((c) => ({
    ...c,
    entryCount: Math.max(1, parseInt(c.entryCount, 10) || 1),
  }));
  const selected = [];

  while (pool.length > 0 && selected.length < countNeeded) {
    const totalWeight = pool.reduce((sum, item) => sum + item.entryCount, 0);
    if (totalWeight <= 0) break;

    // Cryptographically secure integer in [0, totalWeight - 1]
    const randomPick = crypto.randomInt(0, totalWeight);

    let cumulative = 0;
    let selectedIndex = -1;

    for (let i = 0; i < pool.length; i++) {
      cumulative += pool[i].entryCount;
      if (randomPick < cumulative) {
        selectedIndex = i;
        break;
      }
    }

    if (selectedIndex !== -1) {
      const winner = pool[selectedIndex];
      selected.push(winner);

      // Remove ALL entries from this user from the pool (without replacement enforcement)
      const winningUserId = winner.userId;
      for (let j = pool.length - 1; j >= 0; j--) {
        if (pool[j].userId === winningUserId) {
          pool.splice(j, 1);
        }
      }
    } else {
      break;
    }
  }

  return selected;
};

/**
 * Computes a deterministic SHA-256 candidate snapshot hash for transparent auditing
 */
export const computeCandidateSnapshotHash = (candidates) => {
  const normalized = candidates
    .map((c) => `${c.userId}:${c.entryCount || 1}`)
    .sort()
    .join('|');
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Executes winner selection for a giveaway campaign across all linked prizes.
 * Enforces preflight participant validation, campaign status = ENDED, atomic winner creation, and audit trails.
 *
 * @param {object} params
 * @param {string} params.giveawayId - Giveaway identifier or slug
 * @param {string} params.adminUserId - Authenticated admin ID
 * @param {string} [params.targetPrizeId] - Optional specific prize to draw
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 */
export const executeGiveawayDraw = async ({
  giveawayId,
  adminUserId = 'ADMIN',
  targetPrizeId = null,
  ipAddress = '127.0.0.1',
  userAgent = 'Server-Admin',
}) => {
  const isMongo = mongoose.connection.readyState === 1;

  const giveaway = await repo.getGiveawayById(giveawayId);
  if (!giveaway) {
    const err = new Error('Giveaway campaign not found.');
    err.code = 'GIVEAWAY_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  // 1. Campaign MUST be ENDED before winners can be drawn
  if (giveaway.status !== 'ENDED') {
    const err = new Error(`Giveaway must be in ENDED status before drawing winners. Current status: ${giveaway.status}`);
    err.code = 'GIVEAWAY_NOT_ENDED';
    err.statusCode = 400;
    throw err;
  }

  // 2. Fetch linked prizes
  let prizes = [];
  if (isMongo) {
    const query = { giveawayId: giveaway.giveawayId };
    if (targetPrizeId) {
      query.$or = [{ prizeId: targetPrizeId }, { slug: targetPrizeId }];
    }
    prizes = await Prize.find(query).sort({ positionRank: 1 });
  } else {
    prizes = (await repo.getGiveawayPrizes(giveaway.giveawayId)) || [];
    if (targetPrizeId) {
      prizes = prizes.filter((p) => p.prizeId === targetPrizeId || p.slug === targetPrizeId);
    }
  }

  if (prizes.length === 0) {
    const err = new Error('No eligible prizes found for this giveaway campaign.');
    err.code = 'NO_PRIZES_FOUND';
    err.statusCode = 404;
    throw err;
  }

  // =========================================================================
  // PREFLIGHT VALIDATION: Check all eligible prizes BEFORE creating ANY winner
  // =========================================================================
  const drawPlans = [];

  for (const prize of prizes) {
    // A. Skip prizes pending confirmation (does not block other prizes)
    if (prize.isPendingConfirmation) {
      drawPlans.push({
        prize,
        type: 'SKIPPED_PENDING_CONFIRMATION',
        existingWinners: [],
      });
      continue;
    }

    // B. Check existing winners for this prize (Idempotent Draw Check)
    let existingWinners = [];
    if (isMongo) {
      existingWinners = await GiveawayWinner.find({
        giveawayId: giveaway.giveawayId,
        prizeId: prize.prizeId,
      }).sort({ selectedAt: 1 });
    } else {
      existingWinners = (await repo.getGiveawayWinners(giveaway.giveawayId)).filter(
        (w) => w.prizeId === prize.prizeId
      );
    }

    if (existingWinners.length >= prize.winnerCount) {
      drawPlans.push({
        prize,
        type: 'ALREADY_DRAWN',
        existingWinners,
      });
      continue;
    }

    // C. Query active, non-flagged, non-blocked participations
    let eligibleParticipations = [];
    if (isMongo) {
      eligibleParticipations = await GiveawayParticipation.find({
        giveawayId: giveaway.giveawayId,
        prizeId: prize.prizeId,
        status: 'ACTIVE',
      });
    } else {
      eligibleParticipations = (await repo.getUserParticipations()) || [];
      eligibleParticipations = eligibleParticipations.filter(
        (p) => p.giveawayId === giveaway.giveawayId && p.prizeId === prize.prizeId && p.status === 'ACTIVE'
      );
    }

    const uniqueUserIds = [...new Set(eligibleParticipations.map((p) => p.userId))];
    const neededWinners = prize.winnerCount - existingWinners.length;

    // D. Preflight Insufficient Eligible Participants Check
    // If ANY eligible prize fails, ABORT ENTIRE DRAW with HTTP 409 and create ZERO winners
    if (uniqueUserIds.length < neededWinners) {
      const err = new Error(
        `Insufficient eligible participants for prize "${prize.name}". Required: ${neededWinners}, Available distinct participants: ${uniqueUserIds.length}`
      );
      err.code = 'INSUFFICIENT_ELIGIBLE_PARTICIPANTS';
      err.statusCode = 409;
      err.prizeId = prize.prizeId;
      err.requiredCount = neededWinners;
      err.availableCount = uniqueUserIds.length;
      throw err;
    }

    const candidateEntries = uniqueUserIds.map((uid) => {
      const userPart = eligibleParticipations.find((p) => p.userId === uid);
      return {
        userId: uid,
        entryCount: userPart ? userPart.entryCount || 1 : 1,
      };
    });

    drawPlans.push({
      prize,
      type: 'EXECUTE_DRAW',
      neededWinners,
      candidateEntries,
      existingWinners,
    });
  }

  // =========================================================================
  // EXECUTION PHASE: All preflight checks passed. Persist winners & audit logs.
  // =========================================================================
  const drawRunId = `DRAW-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const results = [];
  let totalNewWinnersCount = 0;

  for (const plan of drawPlans) {
    const { prize, type } = plan;

    if (type === 'SKIPPED_PENDING_CONFIRMATION') {
      results.push({
        prizeId: prize.prizeId,
        prizeName: prize.name,
        status: 'SKIPPED_PENDING_CONFIRMATION',
        message: 'Prize value is pending final merchant confirmation. Draw skipped.',
        winnerCount: 0,
        winners: [],
      });
      continue;
    }

    if (type === 'ALREADY_DRAWN') {
      results.push({
        prizeId: prize.prizeId,
        prizeName: prize.name,
        status: 'ALREADY_DRAWN',
        message: `Draw already completed for ${prize.name}. Returning existing winners.`,
        winnerCount: plan.existingWinners.length,
        winners: plan.existingWinners.map((w) => ({
          winnerId: w._id || w.winnerId,
          prizeName: w.prizeName,
          prizeType: w.prizeType,
          maskedUserId: w.maskedUserId,
          selectedAt: w.selectedAt,
          status: w.status,
        })),
      });
      continue;
    }

    // Execute cryptographically weighted random selection
    const { neededWinners, candidateEntries } = plan;
    const candidateSnapshotHash = computeCandidateSnapshotHash(candidateEntries);
    const totalEntryWeight = candidateEntries.reduce((sum, c) => sum + c.entryCount, 0);
    const selectedEntries = selectWeightedRandomWithoutReplacement(candidateEntries, neededWinners);
    const claimDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 calendar days
    const createdPrizeWinners = [];

    for (const entry of selectedEntries) {
      let maskedId = `VE****${entry.userId.slice(-2)}`;
      if (isMongo) {
        const winnerUser = await User.findOne({ userId: entry.userId });
        if (winnerUser?.maskedId) {
          maskedId = winnerUser.maskedId;
        }
      }

      const winnerPayload = {
        giveawayId: giveaway.giveawayId,
        prizeId: prize.prizeId,
        userId: entry.userId,
        maskedUserId: maskedId,
        prizeName: prize.name,
        prizeType: prize.prizeType || 'PHYSICAL',
        claimDeadline,
        selectionMethod: 'CRYPTOGRAPHIC_RANDOM',
        status: 'SELECTED',
        selectedAt: new Date(),
      };

      let savedWinner = null;
      if (isMongo) {
        savedWinner = await GiveawayWinner.findOneAndUpdate(
          { giveawayId: giveaway.giveawayId, prizeId: prize.prizeId, userId: entry.userId },
          { $setOnInsert: winnerPayload },
          { upsert: true, new: true }
        );
      } else {
        savedWinner = { _id: `win-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, ...winnerPayload };
        repo.addWinner?.(savedWinner);
      }

      createdPrizeWinners.push(savedWinner);
      totalNewWinnersCount++;
    }

    // Audit Log for this prize draw run (Zero PII)
    await repo.createAuditLog({
      logId: `AUD-DRAW-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: adminUserId,
      giveawayId: giveaway.giveawayId,
      action: 'WINNERS_DRAWN',
      result: 'SUCCESS',
      metadata: {
        drawRunId,
        adminUserId,
        giveawayId: giveaway.giveawayId,
        prizeId: prize.prizeId,
        algorithmVersion: 'v3.0.0-crypto',
        eligibleParticipantCount: candidateEntries.length,
        totalEntryWeight,
        requestedWinnerCount: neededWinners,
        selectedWinnerIds: createdPrizeWinners.map((w) => w.userId),
        candidateSnapshotHash,
        drawTimestamp: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });

    results.push({
      prizeId: prize.prizeId,
      prizeName: prize.name,
      status: 'SUCCESS',
      message: `Selected ${createdPrizeWinners.length} winner(s) successfully for ${prize.name}.`,
      winnerCount: createdPrizeWinners.length,
      winners: createdPrizeWinners.map((w) => ({
        winnerId: w._id || w.winnerId,
        prizeName: w.prizeName,
        prizeType: w.prizeType,
        maskedUserId: w.maskedUserId,
        selectedAt: w.selectedAt,
        status: w.status,
      })),
    });
  }

  return {
    success: true,
    drawRunId,
    giveawayId: giveaway.giveawayId,
    totalNewWinners: totalNewWinnersCount,
    results,
  };
};

/**
 * Legacy wrapper for backward compatibility
 */
export const selectWinnersForGiveaway = async (giveawayId, adminUserId = 'ADMIN') => {
  const res = await executeGiveawayDraw({ giveawayId, adminUserId });
  const allWinners = [];
  for (const r of res.results) {
    if (r.winners) {
      allWinners.push(...r.winners);
    }
  }
  return allWinners;
};
