import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Ticket, ArrowRight, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import styles from './SuccessfulParticipationModal.module.css';

export const SuccessfulParticipationModal = ({ isOpen, onClose, details }) => {
  const modalRef = useRef(null);
  const triggerElementRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // Check if user prefers reduced motion
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!prefersReducedMotion) {
        try {
          confetti({
            particleCount: 40,
            spread: 50,
            origin: { y: 0.65 },
            colors: ['#8b5cf6', '#fbbf24', '#38bdf8'],
            disableForReducedMotion: true,
          });
        } catch (e) {
          // ignore
        }
      }
    } else {
      document.body.style.overflow = '';
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        triggerElementRef.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap & Escape handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
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
          ref={modalRef}
          className={styles.modalCard}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-modal-title"
        >
          {/* Success Icon */}
          <div className={styles.iconCircle}>
            <CheckCircle2 size={42} className={styles.checkIcon} aria-hidden="true" />
          </div>

          <h3 className={styles.successTitle} id="success-modal-title">You're In!</h3>
          <p className={styles.successMessage}>
            Your entry for the <strong>{details.prizeName}</strong> giveaway has been officially verified and recorded.
          </p>

          {/* Ticket Record Card */}
          <div className={styles.ticketCard}>
            <div className={styles.ticketHeader}>
              <Ticket size={16} className={styles.ticketIcon} aria-hidden="true" />
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
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Cryptographically sealed on the audit ledger. Good luck!</span>
          </div>

          <button
            className="btn-veloop-primary"
            onClick={onClose}
            style={{ width: '100%', marginTop: '8px' }}
            type="button"
            autoFocus
          >
            <span>View Giveaway Status</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
