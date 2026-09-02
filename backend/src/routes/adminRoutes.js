import express from 'express';
import {
  getAdminOverview,
  triggerWinnerDraw,
  setGiveawayStatus,
  getFraudEvents,
  getAllClaims,
  processClaim,
  getAuditLogs,
} from '../controllers/adminController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all admin endpoints with authentication & authorization
router.use(protect, requireAdmin);

router.get('/overview', getAdminOverview);
router.post('/giveaways/:id/draw-winners', triggerWinnerDraw);
router.post('/giveaways/:id/set-status', setGiveawayStatus);
router.get('/fraud-events', getFraudEvents);
router.get('/claims', getAllClaims);
router.post('/claims/:claimId/process', processClaim);
router.put('/claims/:claimId/process', processClaim);
router.get('/audit-logs', getAuditLogs);

export default router;
