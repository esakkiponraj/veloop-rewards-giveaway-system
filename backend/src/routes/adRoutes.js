import express from 'express';
import { getAdsList, completeAd } from '../controllers/adController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { joinLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.get('/', optionalAuth, getAdsList);
router.post('/:id/complete', protect, joinLimiter, completeAd);

export default router;
