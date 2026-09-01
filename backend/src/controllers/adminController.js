import mongoose from 'mongoose';
import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import PrizeClaim from '../models/PrizeClaim.js';
import FraudEvent from '../models/FraudEvent.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { executeGiveawayDraw } from '../services/winnerService.js';
import { repo } from '../utils/repository.js';

// Valid Lifecycle Transitions State Machine:
// UPCOMING -> ACTIVE -> ENDED -> ARCHIVED
const VALID_LIFECYCLE_TRANSITIONS = {
  UPCOMING: ['ACTIVE'],
  ACTIVE: ['ENDED'],
  ENDED: ['ARCHIVED'],
  ARCHIVED: [],
};

// Valid Claim State Transitions:
// SUBMITTED -> PROCESSING -> COMPLETED (or SUBMITTED -> COMPLETED)
const VALID_CLAIM_TRANSITIONS = {
  SUBMITTED: ['PROCESSING', 'COMPLETED'],
  PROCESSING: ['COMPLETED'],
  COMPLETED: [],
  EXPIRED: [],
};

export const getAdminOverview = async (req, res, next) => {
  try {
    const isMongo = mongoose.connection.readyState === 1;

    let totalUsers = 0;
    let totalGiveaways = 0;
    let activeGiveaways = 0;
    let totalParticipants = 0;
    let totalEntries = 0;
    let totalWinners = 0;
    let pendingClaims = 0;
    let fraudAlerts = 0;
    let recentGiveaways = [];
    let prizeBreakdown = [];

    if (isMongo) {
      totalUsers = await User.countDocuments();
      totalGiveaways = await Giveaway.countDocuments();
      activeGiveaways = await Giveaway.countDocuments({ status: 'ACTIVE' });
      totalParticipants = await GiveawayParticipation.distinct('userId').then((u) => u.length);

      const entryAggregation = await GiveawayParticipation.aggregate([
        { $group: { _id: null, total: { $sum: '$entryCount' } } },
      ]);
      totalEntries = entryAggregation[0]?.total || 0;

      totalWinners = await GiveawayWinner.countDocuments();
      pendingClaims = await PrizeClaim.countDocuments({ status: { $in: ['SUBMITTED', 'PROCESSING'] } });
      fraudAlerts = await FraudEvent.countDocuments({ riskScore: { $gte: 60 } });

      recentGiveaways = await Giveaway.find().sort({ createdAt: -1 }).limit(5).populate('prizes');

      // Prize-wise breakdown for active campaign
      const activeCampaign = await Giveaway.findOne({ status: { $in: ['ACTIVE', 'ENDED'] } }).sort({ createdAt: -1 });
      if (activeCampaign) {
        const prizes = await Prize.find({ giveawayId: activeCampaign.giveawayId }).sort({ positionRank: 1 });
        for (const p of prizes) {
          const partCount = await GiveawayParticipation.countDocuments({
            giveawayId: activeCampaign.giveawayId,
            prizeId: p.prizeId,
          });
          const entryAgg = await GiveawayParticipation.aggregate([
            { $match: { giveawayId: activeCampaign.giveawayId, prizeId: p.prizeId } },
            { $group: { _id: null, total: { $sum: '$entryCount' } } },
          ]);
          const winnerCount = await GiveawayWinner.countDocuments({
            giveawayId: activeCampaign.giveawayId,
            prizeId: p.prizeId,
          });
          prizeBreakdown.push({
            prizeId: p.prizeId,
            name: p.name,
            entryCurrency: p.entryCurrency,
            entryAmount: p.entryAmount,
            targetWinners: p.winnerCount,
            currentWinners: winnerCount,
            participants: partCount,
            totalEntries: entryAgg[0]?.total || 0,
            isPendingConfirmation: p.isPendingConfirmation || false,
          });
        }
      }
    } else {
      const gws = await repo.getAllGiveaways();
      totalGiveaways = gws.length;
      activeGiveaways = gws.filter((g) => g.status === 'ACTIVE').length;
      recentGiveaways = gws.slice(0, 5);
    }

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalGiveaways,
        activeGiveaways,
        totalParticipants,
        totalEntries,
        totalWinners,
        pendingClaims,
        fraudAlerts,
      },
      prizeBreakdown,
      recentGiveaways,
    });
  } catch (error) {
    next(error);
  }
};

export const setGiveawayStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['UPCOMING', 'ACTIVE', 'ENDED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_STATUS',
        message: 'Valid status values are UPCOMING, ACTIVE, ENDED, ARCHIVED.',
      });
    }

    const giveaway = await repo.getGiveawayById(id);
    if (!giveaway) {
      return res.status(404).json({
        success: false,
        code: 'GIVEAWAY_NOT_FOUND',
        message: 'Giveaway not found.',
      });
    }

    const currentStatus = giveaway.status;
    if (currentStatus !== status) {
      const allowedNext = VALID_LIFECYCLE_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(status)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition giveaway status from ${currentStatus} to ${status}. Valid transitions from ${currentStatus} are: [${allowedNext.join(', ')}]`,
          currentStatus,
          requestedStatus: status,
          allowedTransitions: allowedNext,
        });
      }
    }

    giveaway.status = status;
    if (mongoose.connection.readyState === 1 && typeof giveaway.save === 'function') {
      await giveaway.save();
    }

    await repo.createAuditLog({
      logId: `AUD-STATUS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: req.user.userId,
      giveawayId: giveaway.giveawayId,
      action: 'ADMIN_GIVEAWAY_STATUS_CHANGED',
      result: 'SUCCESS',
      metadata: { previousStatus: currentStatus, newStatus: status },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Admin-Panel',
    });

    res.json({
      success: true,
      message: `Giveaway status successfully updated to ${status}.`,
      giveaway,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerWinnerDraw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { prizeId } = req.body || {};
    const adminUserId = req.user.userId;

    const drawResult = await executeGiveawayDraw({
      giveawayId: id,
      adminUserId,
      targetPrizeId: prizeId || null,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Admin-Panel',
    });

    res.json({
      success: true,
      message: `Winner selection completed. ${drawResult.totalNewWinners} new winner(s) assigned.`,
      drawRunId: drawResult.drawRunId,
      giveawayId: drawResult.giveawayId,
      results: drawResult.results,
    });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_ELIGIBLE_PARTICIPANTS') {
      return res.status(409).json({
        success: false,
        code: error.code,
        message: error.message,
        required: error.required,
        available: error.available,
      });
    }
    if (error.code === 'GIVEAWAY_NOT_ENDED') {
      return res.status(400).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }
    next(error);
  }
};

export const getAllClaims = async (req, res, next) => {
  try {
    const { status, giveawayId } = req.query;
    const isMongo = mongoose.connection.readyState === 1;

    let claims = [];
    if (isMongo) {
      const filter = {};
      if (status) filter.status = status;
      if (giveawayId) filter.giveawayId = giveawayId;

      const rawClaims = await PrizeClaim.find(filter).sort({ submittedAt: -1 });
      claims = await Promise.all(
        rawClaims.map(async (claim) => {
          const prize = await Prize.findOne({ prizeId: claim.prizeId });
          const user = await User.findOne({ userId: claim.userId }).select('username maskedId email');
          const winnerRecord = await GiveawayWinner.findOne({
            giveawayId: claim.giveawayId,
            prizeId: claim.prizeId,
            userId: claim.userId,
          });

          return {
            ...claim.toObject(),
            prizeName: prize?.name || claim.prizeId,
            prizeType: prize?.prizeType || claim.claimType,
            user,
            winnerStatus: winnerRecord?.status || 'SUBMITTED',
          };
        })
      );
    } else {
      claims = repo.getAllClaims ? await repo.getAllClaims(status) : [];
    }

    res.json({
      success: true,
      claims,
    });
  } catch (error) {
    next(error);
  }
};

export const processClaim = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const { status, courierPartner, trackingNumber, voucherCode, notes } = req.body;
    const adminUserId = req.user.userId;
    const isMongo = mongoose.connection.readyState === 1;

    if (!claimId) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_CLAIM_ID',
        message: 'Claim ID is required.',
      });
    }

    let claim = null;
    if (isMongo) {
      claim = await PrizeClaim.findOne({ claimId });
    }

    if (!claim) {
      return res.status(404).json({
        success: false,
        code: 'CLAIM_NOT_FOUND',
        message: 'Claim record not found.',
      });
    }

    // Validate state transitions
    if (status && status !== claim.status) {
      const allowedNext = VALID_CLAIM_TRANSITIONS[claim.status] || [];
      if (!allowedNext.includes(status)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_CLAIM_TRANSITION',
          message: `Cannot transition claim status from ${claim.status} to ${status}. Allowed next states: [${allowedNext.join(', ')}]`,
          currentStatus: claim.status,
          requestedStatus: status,
          allowedTransitions: allowedNext,
        });
      }
      claim.status = status;
    }

    if (notes) claim.notes = notes.trim();
    if (claim.status === 'COMPLETED') claim.processedAt = new Date();

    if (courierPartner || trackingNumber || voucherCode) {
      claim.trackingInformation = {
        ...claim.trackingInformation,
        courierPartner: courierPartner ? courierPartner.trim() : claim.trackingInformation?.courierPartner,
        trackingNumber: trackingNumber ? trackingNumber.trim() : claim.trackingInformation?.trackingNumber,
        voucherCode: voucherCode ? voucherCode.trim() : claim.trackingInformation?.voucherCode,
      };
    }

    await claim.save();

    // Synchronize GiveawayWinner record status
    if (isMongo) {
      let nextWinnerStatus = 'CLAIM_SUBMITTED';
      if (claim.status === 'PROCESSING') nextWinnerStatus = 'VERIFIED';
      if (claim.status === 'COMPLETED') nextWinnerStatus = 'DELIVERED';

      await GiveawayWinner.findOneAndUpdate(
        { giveawayId: claim.giveawayId, prizeId: claim.prizeId, userId: claim.userId },
        { $set: { status: nextWinnerStatus } }
      );
    }

    // Record audit log
    await repo.createAuditLog({
      logId: `AUD-CLAIM-PROC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: adminUserId,
      giveawayId: claim.giveawayId,
      action: 'ADMIN_CLAIM_PROCESSED',
      result: 'SUCCESS',
      metadata: {
        claimId,
        newStatus: claim.status,
        hasTracking: !!(courierPartner || trackingNumber),
        hasVoucher: !!voucherCode,
      },
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Admin-Panel',
    });

    res.json({
      success: true,
      message: `Claim ${claimId} successfully updated to status ${claim.status}.`,
      claim,
    });
  } catch (error) {
    next(error);
  }
};

export const getFraudEvents = async (req, res, next) => {
  try {
    const isMongo = mongoose.connection.readyState === 1;
    let events = [];
    if (isMongo) {
      events = await FraudEvent.find().sort({ createdAt: -1 }).limit(100);
    }
    res.json({
      success: true,
      events,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const isMongo = mongoose.connection.readyState === 1;
    let logs = [];
    if (isMongo) {
      logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    }
    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    next(error);
  }
};
