import { repo } from '../utils/repository.js';
import { processJoinGiveaway } from '../services/participationService.js';
import { processPrizeClaim, getUserClaimStatus } from '../services/claimService.js';
import { computeDeviceHash } from '../services/fraudService.js';

// GET /api/giveaways/current
export const getCurrentGiveaway = async (req, res, next) => {
  try {
    const giveaway = await repo.getCurrentGiveaway();
    if (!giveaway) {
      return res.status(404).json({
        success: false,
        code: 'GIVEAWAY_NOT_FOUND',
        message: 'No current giveaway found.',
      });
    }

    const previousGiveaways = await repo.getPreviousGiveaways();

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      giveaway,
      stats: {
        activeGiveaways: 1,
        totalGiveaways: 1 + previousGiveaways.length + 1,
        totalParticipants: giveaway.totalParticipants || 8540,
        totalPrizesWon: giveaway.totalPrizesAwarded || 1240,
        endsInMs: Math.max(0, new Date(giveaway.endAt).getTime() - Date.now()),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/giveaways/previous
export const getPreviousGiveaways = async (req, res, next) => {
  try {
    const giveaways = await repo.getPreviousGiveaways();
    res.json({
      success: true,
      giveaways,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/giveaways/slug/:slug
export const getGiveawayBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const giveaway = await repo.getGiveawayById(slug);

    if (!giveaway) {
      return res.status(404).json({
        success: false,
        code: 'GIVEAWAY_NOT_FOUND',
        message: 'Giveaway not found.',
      });
    }

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      giveaway,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/giveaways/:id
export const getGiveawayById = async (req, res, next) => {
  try {
    const { id, giveawayId } = req.params;
    const identifier = id || giveawayId;
    const giveaway = await repo.getGiveawayById(identifier);

    if (!giveaway) {
      return res.status(404).json({
        success: false,
        code: 'GIVEAWAY_NOT_FOUND',
        message: 'Giveaway not found.',
      });
    }

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      giveaway,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/giveaways/:giveawayId/prizes/:prizeId
export const getGiveawayPrizeDetails = async (req, res, next) => {
  try {
    const { giveawayId, prizeId } = req.params;
    const giveaway = await repo.getGiveawayById(giveawayId);

    if (!giveaway) {
      return res.status(404).json({
        success: false,
        code: 'GIVEAWAY_NOT_FOUND',
        message: 'Giveaway not found.',
      });
    }

    const prize = await repo.getPrizeByIdOrSlug(giveaway.giveawayId, prizeId);
    if (!prize) {
      return res.status(404).json({
        success: false,
        code: 'PRIZE_NOT_FOUND',
        message: 'Prize not found in this giveaway.',
      });
    }

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      prize,
      giveaway,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/giveaways/prizes/:slug
export const getPrizeBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { prize, giveaway } = await repo.getPrizeBySlug(slug);

    if (!prize) {
      return res.status(404).json({
        success: false,
        code: 'PRIZE_NOT_FOUND',
        message: 'Prize details not found.',
      });
    }

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      prize,
      giveaway,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/giveaways/:giveawayId/prizes/:prizeId/my-status
// and GET /api/giveaways/:id/my-status
export const getMyGiveawayStatus = async (req, res, next) => {
  try {
    const { id, giveawayId, prizeId } = req.params;
    const effectiveGiveawayId = giveawayId || id;
    const userId = req.user.userId;

    const giveaway = await repo.getGiveawayById(effectiveGiveawayId);
    if (!giveaway) {
      return res.status(404).json({
        success: false,
        code: 'GIVEAWAY_NOT_FOUND',
        message: 'Giveaway not found.',
      });
    }

    const participation = await repo.getUserParticipation(userId, giveaway.giveawayId, prizeId || null);
    const winnerRecord = await repo.getUserWinnerRecord(userId, giveaway.giveawayId, prizeId || null);
    const claimRecord = winnerRecord ? await repo.getUserClaim(userId, giveaway.giveawayId, prizeId || null) : null;
    const user = await repo.findUserById(userId);

    res.json({
      success: true,
      isParticipating: !!participation,
      participation: participation || null,
      isWinner: !!winnerRecord,
      winner: winnerRecord || null,
      claim: claimRecord || null,
      claimStatus: claimRecord ? claimRecord.status : winnerRecord ? 'NOT_SUBMITTED' : null,
      wallet: user ? user.wallet : null,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/giveaways/:giveawayId/prizes/:prizeId/join
// and POST /api/giveaways/:id/join
export const joinGiveaway = async (req, res, next) => {
  try {
    const { id, giveawayId, prizeId: paramPrizeId } = req.params;
    const effectiveGiveawayId = giveawayId || id;
    const effectivePrizeId = paramPrizeId || req.body.prizeId;
    const { idempotencyKey } = req.body;
    const userId = req.user.userId;

    const deviceHash = computeDeviceHash(req);
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = await processJoinGiveaway({
      userId,
      giveawayId: effectiveGiveawayId,
      prizeId: effectivePrizeId,
      deviceHash,
      ipAddress,
      idempotencyKey,
      userAgent,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// GET /api/giveaways/:id/winners
export const getGiveawayWinners = async (req, res, next) => {
  try {
    const { id, giveawayId } = req.params;
    const effectiveGiveawayId = giveawayId || id;
    const giveaway = await repo.getGiveawayById(effectiveGiveawayId);

    if (!giveaway) {
      return res.status(404).json({
        success: false,
        code: 'GIVEAWAY_NOT_FOUND',
        message: 'Giveaway not found.',
      });
    }

    if (giveaway.status === 'ACTIVE') {
      return res.json({
        success: true,
        giveawayStatus: 'ACTIVE',
        isLive: true,
        message: 'Giveaway is still live. Winners will be announced after the giveaway ends.',
        winners: [],
      });
    }

    const rawWinners = await repo.getGiveawayWinners(giveaway.giveawayId);
    // Sanitize winner data to prevent leaking PII
    const sanitizedWinners = rawWinners.map((w) => ({
      winnerId: w._id,
      prizeName: w.prizeName,
      prizeType: w.prizeType,
      maskedUserId: w.maskedUserId,
      selectionMethod: w.selectionMethod,
      selectedAt: w.selectedAt,
      status: w.status,
    }));

    res.json({
      success: true,
      giveawayStatus: giveaway.status,
      isLive: false,
      winners: sanitizedWinners,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/giveaways/previous/winners
export const getAllPreviousWinners = async (req, res, next) => {
  try {
    const rawWinners = await repo.getAllPreviousWinners();
    // Sanitize PII
    const sanitizedWinners = rawWinners.map((w) => ({
      winnerId: w._id,
      giveawayId: w.giveawayId,
      prizeName: w.prizeName,
      prizeType: w.prizeType,
      maskedUserId: w.maskedUserId,
      selectedAt: w.selectedAt,
      status: w.status,
    }));

    res.json({
      success: true,
      winners: sanitizedWinners,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/giveaways/:giveawayId/prizes/:prizeId/claim
// and POST /api/giveaways/:id/claim
export const claimPrize = async (req, res, next) => {
  try {
    const { id, giveawayId, prizeId: paramPrizeId } = req.params;
    const effectiveGiveawayId = giveawayId || id;
    const { prizeId: bodyPrizeId, ...claimData } = req.body;
    const effectivePrizeId = paramPrizeId || bodyPrizeId;
    const userId = req.user.userId;

    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const giveaway = await repo.getGiveawayById(effectiveGiveawayId);
    if (!giveaway) {
      return res.status(404).json({
        success: false,
        code: 'GIVEAWAY_NOT_FOUND',
        message: 'Giveaway not found.',
      });
    }

    const result = await processPrizeClaim({
      userId,
      giveawayId: giveaway.giveawayId,
      prizeId: effectivePrizeId,
      claimData,
      ipAddress,
      userAgent,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// GET /api/giveaways/:giveawayId/prizes/:prizeId/my-claim
// and GET /api/giveaways/:id/my-claim
export const getMyClaim = async (req, res, next) => {
  try {
    const { id, giveawayId } = req.params;
    const effectiveGiveawayId = giveawayId || id;
    const userId = req.user.userId;

    const giveaway = await repo.getGiveawayById(effectiveGiveawayId);
    if (!giveaway) {
      return res.status(404).json({
        success: false,
        code: 'GIVEAWAY_NOT_FOUND',
        message: 'Giveaway not found.',
      });
    }

    const status = await getUserClaimStatus(userId, giveaway.giveawayId);
    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/giveaways/user/my-entries
export const getMyEntries = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const participations = await repo.getUserParticipations(userId);

    const entriesWithDetails = await Promise.all(
      participations.map(async (p) => {
        const giveaway = await repo.getGiveawayById(p.giveawayId);
        const { prize } = await repo.getPrizeBySlug(p.prizeId);
        const winner = await repo.getUserWinnerRecord(userId, p.giveawayId, p.prizeId);
        const claim = winner ? await repo.getUserClaim(userId, p.giveawayId, p.prizeId) : null;

        return {
          participationId: p._id,
          giveawayId: p.giveawayId,
          giveawayTitle: giveaway ? giveaway.title : 'VELOOP Giveaway',
          giveawayStatus: giveaway ? giveaway.status : 'ENDED',
          endAt: giveaway ? giveaway.endAt : null,
          prizeName: prize ? prize.name : 'Exclusive Reward',
          prizeImage: prize ? prize.image : '/assets/prizes/iphone15pro.svg',
          prizeType: prize ? prize.prizeType : 'PHYSICAL',
          entryCount: p.entryCount || 1,
          entryCurrency: p.entryCurrency,
          entryAmount: p.entryAmount,
          joinedAt: p.joinedAt,
          transactionId: p.transactionId,
          isWinner: !!winner,
          winnerRecord: winner,
          claimRecord: claim,
        };
      })
    );

    res.json({
      success: true,
      entries: entriesWithDetails,
    });
  } catch (error) {
    next(error);
  }
};
