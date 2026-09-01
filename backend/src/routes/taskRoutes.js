import express from 'express';
import { getTasksList, claimTaskReward } from '../controllers/taskController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', optionalAuth, getTasksList);
router.post('/:id/claim', protect, claimTaskReward);

export default router;
