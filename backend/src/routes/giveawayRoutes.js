import express from 'express';
import {
  getCurrentGiveaway,
  getPreviousGiveaways,
  getGiveawayBySlug,
  getGiveawayById,
  getGiveawayPrizeDetails,
  getPrizeBySlug,
  getMyGiveawayStatus,
  joinGiveaway,
  getGiveawayWinners,
  getAllPreviousWinners,
  claimPrize,
  getMyClaim,
  getMyEntries,
} from '../controllers/giveawayController.js';
import { protect } from '../middleware/authMiddleware.js';
import { joinLimiter, claimLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// ============================================================================
// 1. STATIC & GLOBAL ROUTES (Registered first to prevent dynamic param capture)
// ============================================================================
router.get('/current', getCurrentGiveaway);
router.get('/previous', getPreviousGiveaways);
router.get('/previous/winners', getAllPreviousWinners);
router.get('/slug/:slug', getGiveawayBySlug);
router.get('/prizes/:slug', getPrizeBySlug);
router.get('/user/my-entries', protect, getMyEntries);

// ============================================================================
// 2. NESTED PRIZE & CAMPAIGN ROUTES
// ============================================================================
router.get('/:giveawayId/prizes/:prizeId', getGiveawayPrizeDetails);
router.get('/:giveawayId/prizes/:prizeId/my-status', protect, getMyGiveawayStatus);
router.post('/:giveawayId/prizes/:prizeId/join', protect, joinLimiter, joinGiveaway);
router.get('/:giveawayId/winners', getGiveawayWinners);
router.post('/:giveawayId/prizes/:prizeId/claim', protect, claimLimiter, claimPrize);
router.get('/:giveawayId/prizes/:prizeId/my-claim', protect, getMyClaim);

// ============================================================================
// 3. CAMPAIGN-LEVEL ALIASES (Backwards-compatible)
// ============================================================================
router.get('/:id', getGiveawayById);
router.get('/:id/my-status', protect, getMyGiveawayStatus);
router.post('/:id/join', protect, joinLimiter, joinGiveaway);
router.post('/:id/claim', protect, claimLimiter, claimPrize);
router.get('/:id/my-claim', protect, getMyClaim);

export default router;
