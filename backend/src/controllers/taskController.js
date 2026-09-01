import { repo } from '../utils/repository.js';

// GET /api/tasks
export const getTasksList = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.userId : null;
    const allTasks = await repo.getAllTasks();

    let claimedTaskIds = new Set();
    if (userId) {
      const claims = await repo.getUserTaskClaims(userId);
      claimedTaskIds = new Set(claims.map((c) => c.taskId));
    }

    const tasksWithStatus = allTasks.map((t) => ({
      ...t,
      status: claimedTaskIds.has(t.taskId) ? 'CLAIMED' : 'AVAILABLE',
    }));

    res.json({
      success: true,
      tasks: tasksWithStatus,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks/:id/claim
export const claimTaskReward = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await repo.getTaskById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        code: 'TASK_NOT_FOUND',
        message: 'Task quest not found.',
      });
    }

    const existingClaims = await repo.getUserTaskClaims(userId);
    if (existingClaims.some((c) => c.taskId === task.taskId)) {
      return res.status(400).json({
        success: false,
        code: 'TASK_ALREADY_CLAIMED',
        message: 'You have already claimed this task reward.',
      });
    }

    const user = await repo.findUserById(userId);
    const rewardAmount = task.reward;
    const currency = task.currency || 'VEs';
    const balanceBefore = user.wallet[currency] || 0;
    const balanceAfter = balanceBefore + rewardAmount;
    const transactionId = `TXN-TASK-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 1. Update wallet
    await repo.updateUserWallet(userId, currency, balanceAfter);

    // 2. Record task claim
    await repo.recordTaskClaim({
      userId,
      taskId: task.taskId,
      reward: rewardAmount,
      currency,
      transactionId,
    });

    // 3. Log transaction
    await repo.createTransaction({
      transactionId,
      userId,
      currency,
      amount: rewardAmount,
      status: 'SUCCESS',
      balanceBefore,
      balanceAfter,
      type: 'TASK_REWARD',
      metadata: { taskId: task.taskId, title: task.title },
    });

    const updatedUser = await repo.findUserById(userId);

    res.json({
      success: true,
      message: `Task Completed! +${rewardAmount} ${currency} added to your wallet.`,
      reward: rewardAmount,
      currency,
      wallet: updatedUser.wallet,
    });
  } catch (error) {
    next(error);
  }
};
