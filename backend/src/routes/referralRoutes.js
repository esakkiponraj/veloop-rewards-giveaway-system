import express from 'express';
import { getReferralDetails, applyReferralCode } from '../controllers/referralController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getReferralDetails);
router.post('/apply', protect, applyReferralCode);

export default router;
