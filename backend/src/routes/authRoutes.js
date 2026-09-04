import express from 'express';
import {
  loginUser,
  registerUser,
  googleAuth,
  getMe,
  getDemoAccounts,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

router.post('/login', authLimiter, loginUser);
router.post('/register', authLimiter, registerUser);
router.post('/google', authLimiter, googleAuth);
router.get('/me', protect, getMe);
router.get('/demo-accounts', getDemoAccounts);

export default router;
