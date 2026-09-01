import React, { useState } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import styles from './WinnerAnnouncementSlider.module.css';

const DEFAULT_WINNERS = [
  { id: '1', maskedUserId: 'VE****21', prize: 'iPhone 15 Pro (128GB)', color: '#8b5cf6' },
  { id: '2', maskedUserId: 'VE****83', prize: 'Apple Watch Series 9', color: '#3b82f6' },
  { id: '3', maskedUserId: 'VE****54', prize: 'AirPods Pro 2', color: '#10b981' },
  { id: '4', maskedUserId: 'VE****92', prize: '₹2,000 Amazon Gift Card', color: '#f59e0b' },
  { id: '5', maskedUserId: 'VE****42', prize: '₹500 Amazon Gift Card', color: '#ec4899' },
  { id: '6', maskedUserId: 'VE****19', prize: '₹20 Shopping Voucher', color: '#6366f1' },
];

export const WinnerAnnouncementSlider = ({ announcements = [] }) => {
  const [isPaused, setIsPaused] = useState(false);
  const items = announcements.length > 0 ? announcements : DEFAULT_WINNERS;

  // Duplicate items array for seamless infinite marquee loop
  const marqueeList = [...items, ...items, ...items];

  return (
    <div
      className={styles.sliderContainer}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Recent Verified Winners Ticker"
    >
      <div className={styles.labelBadge}>
        <Trophy size={14} className={styles.trophyIcon} />
        <span>VERIFIED WINNERS</span>
      </div>

      <div className={styles.trackWrapper}>
        <div className={`${styles.track} ${isPaused ? styles.paused : ''}`}>
          {marqueeList.map((winner, index) => (
            <div key={`${winner.id || winner.maskedUserId}-${index}`} className={styles.winnerPill}>
              <span className={styles.maskedUser}>{winner.maskedUserId}</span>
              <span className={styles.wonText}>won</span>
              <span className={styles.prizeName} style={{ color: winner.color || '#fbbf24' }}>
                {winner.prize || winner.prizeName}
              </span>
              <Sparkles size={12} className={styles.sparkle} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
