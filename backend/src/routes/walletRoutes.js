import express from 'express';
import {
  getWalletOverview,
  claimDailyBonus,
  requestWithdrawal,
  getTransactionHistory,
} from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';
import { joinLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.get('/', protect, getWalletOverview);
router.post('/daily-bonus', protect, claimDailyBonus);
router.post('/withdraw', protect, joinLimiter, requestWithdrawal);
router.get('/history', protect, getTransactionHistory);

export default router;
