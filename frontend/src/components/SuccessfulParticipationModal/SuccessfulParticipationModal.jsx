import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Ticket, ArrowRight, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import styles from './SuccessfulParticipationModal.module.css';

export const SuccessfulParticipationModal = ({ isOpen, onClose, details }) => {
  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#8b5cf6', '#fbbf24', '#38bdf8'],
        });
      } catch (e) {
        // ignore
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !details) return null;

  return (
    <AnimatePresence>
      <div className={styles.modalBackdrop} onClick={onClose}>
        <motion.div
          className={styles.modalCard}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Success Icon */}
          <div className={styles.iconCircle}>
            <CheckCircle2 size={42} className={styles.checkIcon} />
          </div>

          <h3 className={styles.successTitle}>You're In!</h3>
          <p className={styles.successMessage}>
            Your entry for the <strong>{details.prizeName}</strong> giveaway has been officially verified and recorded.
          </p>

          {/* Ticket Record Card */}
          <div className={styles.ticketCard}>
            <div className={styles.ticketHeader}>
              <Ticket size={16} className={styles.ticketIcon} />
              <span className={styles.ticketTitle}>PARTICIPATION RECORD</span>
            </div>

            <div className={styles.ticketRow}>
              <span className={styles.tLabel}>Prize</span>
              <span className={styles.tVal}>{details.prizeName}</span>
            </div>

            <div className={styles.ticketRow}>
              <span className={styles.tLabel}>Entries Allocated</span>
              <span className={styles.tValGold}>{details.entryCount || 1} Entry</span>
            </div>

            <div className={styles.ticketRow}>
              <span className={styles.tLabel}>Entry Fee Deducted</span>
              <span className={styles.tValGold}>
                -{details.entryAmount} {details.entryCurrency}
              </span>
            </div>

            <div className={styles.ticketRow}>
              <span className={styles.tLabel}>Transaction ID</span>
              <span className={styles.tValMono}>{details.transactionId}</span>
            </div>

            <div className={styles.ticketRow}>
              <span className={styles.tLabel}>Verified Status</span>
              <span className={styles.tValGreen}>● Active Draw Entry</span>
            </div>
          </div>

          <div className={styles.trustFooter}>
            <ShieldCheck size={14} />
            <span>Cryptographically sealed on the audit ledger. Good luck!</span>
          </div>

          <button className="btn-veloop-primary" onClick={onClose} style={{ width: '100%', marginTop: '8px' }}>
            <span>View Giveaway Status</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
