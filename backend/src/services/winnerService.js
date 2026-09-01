import crypto from 'crypto';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import User from '../models/User.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Cryptographically secure weighted random selection without replacement
 * @param {Array} candidates - Array of participation records with entryCount
 * @param {number} countNeeded - Number of winners to pick
 * @returns {Array} Selected winners
 */
export const selectWeightedRandomWithoutReplacement = (candidates, countNeeded) => {
  const pool = [...candidates];
  const selected = [];

  while (pool.length > 0 && selected.length < countNeeded) {
    const totalWeight = pool.reduce((sum, item) => sum + (item.entryCount || 1), 0);
    if (totalWeight <= 0) break;

    // Cryptographically secure random integer in [0, totalWeight - 1]
    const randomPick = crypto.randomInt(0, totalWeight);

    let cumulative = 0;
    let selectedIndex = -1;

    for (let i = 0; i < pool.length; i++) {
      cumulative += pool[i].entryCount || 1;
      if (randomPick < cumulative) {
        selectedIndex = i;
        break;
      }
    }

    if (selectedIndex !== -1) {
      const winner = pool[selectedIndex];
      selected.push(winner);
      // Remove all entries from this user to enforce no duplicate wins per prize
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
 * Select winners for a giveaway campaign enforcing prize limits and campaign win policies
 * @param {string} giveawayId 
 * @param {string} adminUserId 
 * @param {object} options - { maxWinsPerUserPerCampaign = 1 }
 */
export const selectWinnersForGiveaway = async (
  giveawayId,
  adminUserId = 'SYSTEM',
  options = { maxWinsPerUserPerCampaign: 1 }
) => {
  const giveaway = await Giveaway.findOne({
    $or: [{ giveawayId }, { slug: giveawayId }],
  });

  if (!giveaway) {
    const err = new Error('Giveaway not found');
    err.code = 'GIVEAWAY_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const maxWins = options.maxWinsPerUserPerCampaign || 1;

  // Retrieve prizes ordered by positionRank
  const prizes = await Prize.find({ giveawayId: giveaway.giveawayId }).sort({ positionRank: 1 });
  const allWinners = [];

  for (const prize of prizes) {
    // Check existing winners for this prize
    const existingPrizeWinners = await GiveawayWinner.find({
      giveawayId: giveaway.giveawayId,
      prizeId: prize.prizeId,
    });

    if (existingPrizeWinners.length >= prize.winnerCount) {
      allWinners.push(...existingPrizeWinners);
      continue;
    }

    const neededWinners = prize.winnerCount - existingPrizeWinners.length;

    // Check user win counts across the entire campaign to enforce maxWinsPerUserPerCampaign
    const campaignWinners = await GiveawayWinner.find({ giveawayId: giveaway.giveawayId });
    const userWinCounts = {};
    for (const w of campaignWinners) {
      userWinCounts[w.userId] = (userWinCounts[w.userId] || 0) + 1;
    }

    // Ineligible users who exceeded maxWins
    const ineligibleUserIds = Object.keys(userWinCounts).filter((uid) => userWinCounts[uid] >= maxWins);

    // Query active, non-blocked participations for this specific prize
    const eligibleParticipations = await GiveawayParticipation.find({
      giveawayId: giveaway.giveawayId,
      prizeId: prize.prizeId,
      status: 'ACTIVE',
      userId: { $nin: ineligibleUserIds },
    });

    if (eligibleParticipations.length === 0) {
      continue;
    }

    // Perform weighted random selection without replacement
    const selectedEntries = selectWeightedRandomWithoutReplacement(eligibleParticipations, neededWinners);
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day default claim deadline

    for (const entry of selectedEntries) {
      const winnerUser = await User.findOne({ userId: entry.userId });
      const maskedId = winnerUser ? winnerUser.maskedId : `VE****${entry.userId.slice(-2)}`;

      const winnerRecord = await GiveawayWinner.create({
        giveawayId: giveaway.giveawayId,
        prizeId: prize.prizeId,
        userId: entry.userId,
        maskedUserId: maskedId,
        prizeName: prize.name,
        prizeType: prize.prizeType,
        claimDeadline: deadline,
        selectionMethod: adminUserId === 'SYSTEM' ? 'CRYPTOGRAPHIC_RANDOM' : 'ADMIN_FINALIZED',
        status: 'SELECTED',
        selectedAt: new Date(),
      });

      allWinners.push(winnerRecord);

      await AuditLog.create({
        logId: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: entry.userId,
        giveawayId: giveaway.giveawayId,
        action: 'WINNER_SELECTED',
        result: 'SUCCESS',
        metadata: {
          prizeId: prize.prizeId,
          prizeName: prize.name,
          adminUserId,
          selectionMethod: 'CRYPTOGRAPHIC_WEIGHTED_RANDOM',
          entryWeight: entry.entryCount || 1,
        },
      });
    }
  }

  // Update giveaway status to ENDED if not already
  if (giveaway.status !== 'ENDED' && giveaway.status !== 'ARCHIVED') {
    giveaway.status = 'ENDED';
    await giveaway.save();
  }

  return allWinners;
};
