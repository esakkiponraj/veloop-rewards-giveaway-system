import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Gift, Award } from 'lucide-react';
import { Countdown } from '../Countdown/Countdown.jsx';
import styles from './GiveawayHero.module.css';

export const GiveawayHero = ({ giveaway, onExploreClick }) => {
  return (
    <section className={styles.heroSection}>
      {/* Background Ambience / Glow Blobs */}
      <div className={styles.blobPurple} />
      <div className={styles.blobGold} />

      <div className={`veloop-container ${styles.heroContainer}`}>
        {/* Left Column: Content */}
        <motion.div
          className={styles.leftCol}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Badge */}
          <div className={styles.badgeRow}>
            <div className={styles.exclusiveBadge}>
              <Sparkles size={14} className={styles.sparkleIcon} />
              <span>EXCLUSIVE GIVEAWAY</span>
            </div>
            {giveaway?.status && (
              <span className={`badge-status badge-status-${giveaway.status.toLowerCase()}`}>
                ● {giveaway.status === 'ACTIVE' ? 'LIVE NOW' : giveaway.status}
              </span>
            )}
          </div>

          {/* Heading */}
          <h1 className={styles.heroTitle}>
            Rewards Worth <br />
            <span className={styles.gradientTitle}>Showing Up For.</span>
          </h1>

          {/* Subtitle */}
          <p className={styles.heroSubtitle}>
            Complete daily activities, use your accumulated reward balances (VEs, SVEs, or Tokens), and win authentic Apple hardware and verified shopping vouchers.
          </p>

          {/* Countdown Preview Bar */}
          {giveaway?.endAt && giveaway.status === 'ACTIVE' && (
            <div className={styles.countdownBox}>
              <span className={styles.countdownTitle}>GIVEAWAY ENDS IN</span>
              <Countdown targetDate={giveaway.endAt} />
            </div>
          )}

          {/* CTAs */}
          <div className={styles.ctaRow}>
            <button
              onClick={onExploreClick}
              className="btn-veloop-primary"
              id="hero-explore-cta"
            >
              <span>Explore Giveaways</span>
              <ArrowRight size={16} />
            </button>
            <a href="#how-it-works" className="btn-veloop-secondary">
              <span>How It Works</span>
            </a>
          </div>

          {/* Micro Trust Indicators */}
          <div className={styles.trustRow}>
            <div className={styles.trustItem}>
              <ShieldCheck size={16} className={styles.trustIcon} />
              <span>100% Fair & Transparent</span>
            </div>
            <div className={styles.trustItem}>
              <Zap size={16} className={styles.trustIconGold} />
              <span>Instant Digital Dispatch</span>
            </div>
            <div className={styles.trustItem}>
              <Award size={16} className={styles.trustIconPurple} />
              <span>1-Yr Brand Warranty</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Visual Composition */}
        <motion.div
          className={styles.rightCol}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className={styles.visualCard}>
            {/* Ambient Platform */}
            <div className={styles.cardPlatformGlow} />

            {/* 3D Gift Box Asset */}
            <motion.div
              className={styles.giftBoxWrapper}
              animate={{
                y: [-6, 6, -6],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <img
                src="/assets/veloop-giftbox.svg"
                alt="VELOOP Rewards Vault"
                className={styles.giftBoxImg}
              />
            </motion.div>

            {/* Floating Star Ticket Asset */}
            <motion.div
              className={styles.ticketWrapper}
              animate={{
                y: [6, -6, 6],
                rotateZ: [-12, -8, -12],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <img
                src="/assets/veloop-ticket.svg"
                alt="Giveaway Ticket"
                className={styles.ticketImg}
              />
            </motion.div>

            {/* Floating Stat Pill Overlay */}
            <div className={styles.statFloatPill}>
              <Gift size={16} className={styles.pillIcon} />
              <div>
                <p className={styles.pillLabel}>Total Prize Pool</p>
                <p className={styles.pillValue}>₹2,50,000+ Value</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
