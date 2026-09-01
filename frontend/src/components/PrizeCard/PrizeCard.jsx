import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Trophy, ArrowRight, Sparkles, Clock, Coins } from 'lucide-react';
import styles from './PrizeCard.module.css';

export const PrizeCard = ({ prize, giveawayStatus, endAt }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/giveaway/${prize.slug || prize.prizeId}`);
  };

  const getPositionBadgeStyle = (pos) => {
    if (pos?.includes('1st')) return styles.badgeFirst;
    if (pos?.includes('2nd')) return styles.badgeSecond;
    if (pos?.includes('3rd')) return styles.badgeThird;
    if (pos?.includes('Lucky')) return styles.badgeLucky;
    return styles.badgeSpecial;
  };

  return (
    <motion.div
      className={styles.prizeCard}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
      aria-label={`View giveaway details for ${prize.name}`}
    >
      {/* Top Header Row */}
      <div className={styles.cardHeader}>
        <span className={`${styles.positionBadge} ${getPositionBadgeStyle(prize.position)}`}>
          {prize.position}
        </span>
        <div className={styles.winnerCountBadge}>
          <Trophy size={12} />
          <span>{prize.winnerCount} {prize.winnerCount === 1 ? 'Winner' : 'Winners'}</span>
        </div>
      </div>

      {/* Prize Image Container */}
      <div className={styles.imageContainer}>
        <div
          className={styles.ambientBackdropGlow}
          style={{ background: prize.accentColor ? `radial-gradient(circle, ${prize.accentColor}40 0%, transparent 70%)` : undefined }}
        />
        <img
          src={prize.image}
          alt={prize.name}
          className={styles.prizeImg}
          loading="lazy"
        />
      </div>

      {/* Prize Information */}
      <div className={styles.cardBody}>
        <h3 className={styles.prizeTitle}>{prize.name}</h3>
        <p className={styles.prizeTagline}>{prize.tagline || prize.description}</p>

        {/* Meta Stats Row */}
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <Users size={13} className={styles.metaIcon} />
            <span>2.4K+ Participants</span>
          </div>
          <div className={styles.metaItem}>
            <Clock size={13} className={styles.metaIconGold} />
            <span>12d Left</span>
          </div>
        </div>

        {/* Entry Fee Highlight Box */}
        <div className={styles.feeHighlight}>
          <span className={styles.feeLabel}>Entry Fee</span>
          <div className={styles.feeValWrap}>
            {prize.entryCurrency === 'Tokens' ? (
              <Coins size={14} className={styles.tokenCoin} />
            ) : (
              <span className={styles.currencyName}>{prize.entryCurrency}</span>
            )}
            <span className={styles.feeAmount}>{prize.entryAmount?.toLocaleString()}</span>
          </div>
        </div>

        {/* CTA Button: Navigates to individual details page */}
        <button
          className={`${styles.joinBtn} btn-veloop-primary`}
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
        >
          <span>Join for {prize.entryAmount?.toLocaleString()} {prize.entryCurrency}</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </motion.div>
  );
};
