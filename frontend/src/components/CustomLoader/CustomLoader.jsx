import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './CustomLoader.module.css';

const LOADING_MESSAGES = [
  "Unlocking VELOOP Reward Vault...",
  "Checking active giveaways & prizes...",
  "Verifying reward balances...",
  "Loading exclusive prize inventory...",
  "Securing reward gateway...",
];

export const CustomLoader = ({ fullScreen = true, message }) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={fullScreen ? styles.fullScreenContainer : styles.inlineContainer}>
      <div className={styles.vaultWrapper}>
        {/* Glowing Platform Rings */}
        <div className={styles.glowRing}></div>
        <div className={styles.pulseRing}></div>

        {/* 3D Animated Gift / Vault Icon */}
        <motion.div
          className={styles.vaultIcon}
          animate={{
            y: [-6, 6, -6],
            rotateZ: [-2, 2, -2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <img src="/assets/veloop-giftbox.svg" alt="Reward Vault" className={styles.giftImg} />
        </motion.div>

        {/* Orbiting Sparkle particle */}
        <div className={styles.orbitParticle}></div>
      </div>

      {/* Rotating Status Message */}
      <div className={styles.messageBox}>
        <AnimatePresence mode="wait">
          <motion.p
            key={message || msgIndex}
            className={styles.statusText}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {message || LOADING_MESSAGES[msgIndex]}
          </motion.p>
        </AnimatePresence>

        {/* Pulsing Dots indicator */}
        <div className={styles.dotsRow}>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
      </div>
    </div>
  );
};
