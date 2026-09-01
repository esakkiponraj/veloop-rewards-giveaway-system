import express from 'express';
import { loginUser, getMe, getDemoAccounts } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/login', authLimiter, loginUser);
router.get('/me', protect, getMe);
router.get('/demo-accounts', getDemoAccounts);

export default router;
