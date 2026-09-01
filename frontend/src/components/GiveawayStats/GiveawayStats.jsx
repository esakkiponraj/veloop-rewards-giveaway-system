import React from 'react';
import { Gift, Users, Trophy, Clock } from 'lucide-react';
import { Countdown } from '../Countdown/Countdown.jsx';
import styles from './GiveawayStats.module.css';

export const GiveawayStats = ({ stats, endAt }) => {
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.0', '') + 'K+';
    }
    return num.toLocaleString();
  };

  return (
    <section className={styles.statsSection}>
      <div className={`veloop-container ${styles.statsContainer}`}>
        {/* Card 1: Total Giveaways */}
        <div className={styles.statCard}>
          <div className={`${styles.iconWrap} ${styles.purpleIcon}`}>
            <Gift size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Giveaways</span>
            <div className={styles.valRow}>
              <span className={styles.statVal}>{stats?.activeGiveaways ?? 24}</span>
              <span className={styles.statSub}>Active</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Participants */}
        <div className={styles.statCard}>
          <div className={`${styles.iconWrap} ${styles.blueIcon}`}>
            <Users size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Participants</span>
            <div className={styles.valRow}>
              <span className={styles.statVal}>{formatNumber(stats?.totalParticipants ?? 8500)}</span>
              <span className={styles.statSub}>Users</span>
            </div>
          </div>
        </div>

        {/* Card 3: Prizes Won */}
        <div className={styles.statCard}>
          <div className={`${styles.iconWrap} ${styles.greenIcon}`}>
            <Trophy size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Prizes Won</span>
            <div className={styles.valRow}>
              <span className={styles.statVal}>{formatNumber(stats?.totalPrizesWon ?? 1200)}</span>
              <span className={styles.statSub}>Rewards</span>
            </div>
          </div>
        </div>

        {/* Card 4: Ends In */}
        <div className={styles.statCard}>
          <div className={`${styles.iconWrap} ${styles.goldIcon}`}>
            <Clock size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Giveaway Ends In</span>
            <div className={styles.countdownWrap}>
              {endAt ? (
                <Countdown targetDate={endAt} compact={true} />
              ) : (
                <span className={styles.statVal}>12d : 08h : 45m</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
