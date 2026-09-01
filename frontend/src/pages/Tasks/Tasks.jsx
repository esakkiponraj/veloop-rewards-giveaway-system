import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Gift,
  Share2,
  Bell,
  ArrowRight,
  Flame,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext.jsx';
import { getTasks, claimTask } from '../../services/taskApi.js';
import styles from './Tasks.module.css';

const ICON_MAP = {
  't-1': Flame,
  't-2': Zap,
  't-3': Gift,
  't-4': Share2,
  't-5': Bell,
};

const COLOR_MAP = {
  't-1': '#F59E0B',
  't-2': '#8B5CF6',
  't-3': '#10B981',
  't-4': '#3B82F6',
  't-5': '#EC4899',
};

export const Tasks = () => {
  const { user, updateWallet } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claimingId, setClaimingId] = useState(null);

  const fetchTasksData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getTasks();
      if (res.success) {
        setTasks(res.tasks || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load task list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, [user]);

  const handleClaimTask = async (task) => {
    if (task.status === 'CLAIMED') return;
    setClaimingId(task.taskId);

    try {
      const res = await claimTask(task.taskId);
      if (res.success) {
        if (res.wallet) {
          updateWallet(res.wallet);
        }

        setTasks((prev) =>
          prev.map((t) => (t.taskId === task.taskId ? { ...t, status: 'CLAIMED' } : t))
        );

        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#7C3AED', '#22C55E', '#FBBF24'],
        });

        alert(`🎉 ${res.message}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to claim task reward.');
    } finally {
      setClaimingId(null);
    }
  };

  const completedCount = tasks.filter((t) => t.status === 'CLAIMED').length;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>
            <CheckSquare size={14} />
            <span>DAILY & MILESTONE REWARDS</span>
          </div>
          <h1 className={styles.title}>Tasks & Quests</h1>
          <p className={styles.subtitle}>
            Complete quick platform activities and milestones to earn additional VEs, SVEs, and platform Tokens.
          </p>
        </div>
        <div className={styles.statsPill}>
          <span>
            Completed: <strong>{completedCount} / {tasks.length}</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-slow" />
          <p style={{ marginTop: '10px' }}>Loading available tasks...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', borderRadius: '8px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : (
        <div className={styles.tasksList}>
          {tasks.map((task) => {
            const IconComp = ICON_MAP[task.taskId] || Sparkles;
            const taskColor = COLOR_MAP[task.taskId] || '#8B5CF6';
            const isClaimed = task.status === 'CLAIMED';
            const isClaiming = claimingId === task.taskId;

            return (
              <div
                key={task.taskId}
                className={`${styles.taskCard} ${isClaimed ? styles.taskClaimed : ''}`}
              >
                <div
                  className={styles.taskIconWrap}
                  style={{ background: `${taskColor}18`, color: taskColor }}
                >
                  <IconComp size={22} />
                </div>

                <div className={styles.taskInfoCol}>
                  <div className={styles.taskHeaderRow}>
                    <h3 className={styles.taskTitle}>{task.title}</h3>
                    <span className={styles.categoryBadge}>{task.category}</span>
                  </div>
                  <p className={styles.taskDesc}>{task.description}</p>
                </div>

                <div className={styles.taskActionCol}>
                  <div className={styles.rewardTag}>
                    <span className={styles.rewardPlus}>+</span>
                    <span className={styles.rewardVal}>{task.reward}</span>
                    <span className={styles.rewardUnit}>{task.currency}</span>
                  </div>

                  <button
                    className={isClaimed ? styles.claimedBtn : styles.claimBtn}
                    onClick={() => handleClaimTask(task)}
                    disabled={isClaimed || isClaiming}
                  >
                    {isClaimed ? (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Completed</span>
                      </>
                    ) : isClaiming ? (
                      <span>Claiming...</span>
                    ) : (
                      <>
                        <span>Claim Reward</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
