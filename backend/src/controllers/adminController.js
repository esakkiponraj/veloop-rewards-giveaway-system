import Giveaway from '../models/Giveaway.js';
import Prize from '../models/Prize.js';
import GiveawayParticipation from '../models/GiveawayParticipation.js';
import GiveawayWinner from '../models/GiveawayWinner.js';
import PrizeClaim from '../models/PrizeClaim.js';
import FraudEvent from '../models/FraudEvent.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { selectWinnersForGiveaway } from '../services/winnerService.js';

export const getAdminOverview = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalGiveaways = await Giveaway.countDocuments();
    const activeGiveaways = await Giveaway.countDocuments({ status: 'ACTIVE' });
    const totalParticipations = await GiveawayParticipation.countDocuments();
    const totalWinners = await GiveawayWinner.countDocuments();
    const pendingClaims = await PrizeClaim.countDocuments({ status: { $in: ['SUBMITTED', 'PROCESSING'] } });
    const fraudAlerts = await FraudEvent.countDocuments({ riskScore: { $gte: 60 } });

    const recentGiveaways = await Giveaway.find().sort({ createdAt: -1 }).limit(5).populate('prizes');

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalGiveaways,
        activeGiveaways,
        totalParticipations,
        totalWinners,
        pendingClaims,
        fraudAlerts,
      },
      recentGiveaways,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerWinnerDraw = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.userId;

    const winners = await selectWinnersForGiveaway(id, adminUserId);

    res.json({
      success: true,
      message: `Winner selection completed successfully. ${winners.length} winner(s) assigned.`,
      winners,
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

    const giveaway = await Giveaway.findOne({
      $or: [{ giveawayId: id }, { slug: id }],
    });

    if (!giveaway) {
      return res.status(404).json({
        success: false,
        code: 'GIVEAWAY_NOT_FOUND',
        message: 'Giveaway not found.',
      });
    }

    giveaway.status = status;
    await giveaway.save();

    await AuditLog.create({
      logId: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: req.user.userId,
      giveawayId: giveaway.giveawayId,
      action: 'ADMIN_EVENT_UPDATED',
      result: 'SUCCESS',
      metadata: { newStatus: status },
    });

    res.json({
      success: true,
      message: `Giveaway status updated to ${status}.`,
      giveaway,
    });
  } catch (error) {
    next(error);
  }
};

export const getFraudEvents = async (req, res, next) => {
  try {
    const events = await FraudEvent.find().sort({ createdAt: -1 }).limit(100);
    res.json({
      success: true,
      events,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllClaims = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const claims = await PrizeClaim.find(filter).sort({ submittedAt: -1 });

    const enrichedClaims = await Promise.all(
      claims.map(async (claim) => {
        const prize = await Prize.findOne({ prizeId: claim.prizeId });
        const user = await User.findOne({ userId: claim.userId }).select('username maskedId email');
        return {
          ...claim.toObject(),
          prizeName: prize ? prize.name : 'Exclusive Reward',
          prizeType: prize ? prize.prizeType : claim.claimType,
          user,
        };
      })
    );

    res.json({
      success: true,
      claims: enrichedClaims,
    });
  } catch (error) {
    next(error);
  }
};

export const processClaim = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const { status, courierPartner, trackingNumber, voucherCode, notes } = req.body;

    const claim = await PrizeClaim.findOne({ claimId });
    if (!claim) {
      return res.status(404).json({
        success: false,
        code: 'CLAIM_NOT_FOUND',
        message: 'Claim record not found.',
      });
    }

    if (status) claim.status = status;
    if (notes) claim.notes = notes;
    if (status === 'COMPLETED') claim.processedAt = new Date();

    if (courierPartner || trackingNumber || voucherCode) {
      claim.trackingInformation = {
        ...claim.trackingInformation,
        courierPartner: courierPartner || claim.trackingInformation?.courierPartner,
        trackingNumber: trackingNumber || claim.trackingInformation?.trackingNumber,
        voucherCode: voucherCode || claim.trackingInformation?.voucherCode,
      };
    }

    await claim.save();

    await AuditLog.create({
      logId: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: req.user.userId,
      giveawayId: claim.giveawayId,
      action: 'ADMIN_CLAIM_PROCESSED',
      result: 'SUCCESS',
      metadata: { claimId, newStatus: status },
    });

    res.json({
      success: true,
      message: `Claim status updated to ${claim.status}.`,
      claim,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.json({
      success: true,
      logs,
    });
  } catch (error) {
    next(error);
  }
};
