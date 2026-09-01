import React, { useState, useEffect } from 'react';
import styles from './Countdown.module.css';

export const Countdown = ({ targetDate, onExpire, compact = false, showLabels = true }) => {
  const calculateTimeRemaining = () => {
    const total = Math.max(0, new Date(targetDate).getTime() - new Date().getTime());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    return { total, days, hours, minutes, seconds };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeRemaining());

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeLeft(remaining);

      if (remaining.total <= 0) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.total <= 0) {
    return (
      <div className={styles.endedBadge}>
        <span className={styles.endedDot} />
        <span>GIVEAWAY ENDED</span>
      </div>
    );
  }

  const format2 = (val) => String(val).padStart(2, '0');

  if (compact) {
    return (
      <div className={styles.compactTimer}>
        <span className={styles.compactVal}>{timeLeft.days}d</span> :{' '}
        <span className={styles.compactVal}>{format2(timeLeft.hours)}h</span> :{' '}
        <span className={styles.compactVal}>{format2(timeLeft.minutes)}m</span> :{' '}
        <span className={styles.compactValSec}>{format2(timeLeft.seconds)}s</span>
      </div>
    );
  }

  return (
    <div className={styles.countdownContainer}>
      <div className={styles.timeBlock}>
        <span className={styles.timeVal}>{format2(timeLeft.days)}</span>
        {showLabels && <span className={styles.timeLabel}>DAYS</span>}
      </div>
      <span className={styles.separator}>:</span>

      <div className={styles.timeBlock}>
        <span className={styles.timeVal}>{format2(timeLeft.hours)}</span>
        {showLabels && <span className={styles.timeLabel}>HOURS</span>}
      </div>
      <span className={styles.separator}>:</span>

      <div className={styles.timeBlock}>
        <span className={styles.timeVal}>{format2(timeLeft.minutes)}</span>
        {showLabels && <span className={styles.timeLabel}>MINS</span>}
      </div>
      <span className={styles.separator}>:</span>

      <div className={styles.timeBlock}>
        <span className={`${styles.timeVal} ${styles.secondsVal}`}>{format2(timeLeft.seconds)}</span>
        {showLabels && <span className={styles.timeLabel}>SECS</span>}
      </div>
    </div>
  );
};
