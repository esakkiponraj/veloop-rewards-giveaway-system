import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import styles from './JoinConfirmationModal.module.css';

export const JoinConfirmationModal = ({
  isOpen,
  onClose,
  prize,
  userWallet,
  onConfirmJoin,
  loading = false,
  errorMessage = null,
}) => {
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const modalRef = useRef(null);
  const triggerElementRef = useRef(null);

  // Store trigger element to restore focus when closed
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
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

  // Focus trap & Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
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
  }, [isOpen, loading, onClose]);

  if (!isOpen || !prize) return null;

  const currency = prize.entryCurrency || 'VEs';
  const entryFee = prize.entryAmount || 0;
  const currentBalance = userWallet ? userWallet[currency] || 0 : 0;
  const balanceAfter = currentBalance - entryFee;
  const hasSufficientBalance = currentBalance >= entryFee;

  return (
    <AnimatePresence>
      <div className={styles.modalBackdrop} onClick={loading ? undefined : onClose}>
        <motion.div
          ref={modalRef}
          className={styles.modalCard}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-desc"
        >
          {/* Close Button */}
          <button className={styles.closeBtn} onClick={onClose} disabled={loading} aria-label="Close confirmation modal">
            <X size={18} aria-hidden="true" />
          </button>

          {/* Modal Header */}
          <div className={styles.modalHeader}>
            <div className={styles.headerBadge}>
              <ShieldCheck size={14} aria-hidden="true" />
              <span>CONFIRM PARTICIPATION</span>
            </div>
            <h3 className={styles.modalTitle} id="modal-title">
              {prize.name}
            </h3>
            <p className={styles.modalSubtitle} id="modal-desc">
              Please review the currency deduction details before confirming your entry.
            </p>
          </div>

          {/* Error Message Display if API rejected */}
          {errorMessage && (
            <div className={styles.insufficientAlert} style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }} role="alert">
              <AlertCircle size={18} className={styles.alertIcon} aria-hidden="true" />
              <p className={styles.alertText}>{errorMessage}</p>
            </div>
          )}

          {/* Balance Calculation Box */}
          <div className={styles.calcBox}>
            <div className={styles.calcRow}>
              <span className={styles.calcLabel}>Entry Requirement</span>
              <div className={styles.calcValGroup}>
                <span className={styles.currencyPill}>{currency}</span>
                <span className={styles.calcVal}>-{entryFee.toLocaleString()}</span>
              </div>
            </div>

            <div className={styles.calcRow}>
              <span className={styles.calcLabel}>Your Current Balance</span>
              <span className={styles.calcVal}>{currentBalance.toLocaleString()} {currency}</span>
            </div>

            <div className={styles.calcDivider} />

            <div className={styles.calcRow}>
              <span className={styles.calcLabelBold}>Balance After Joining</span>
              <span
                className={`${styles.calcValBold} ${hasSufficientBalance ? styles.positiveBal : styles.negativeBal}`}
              >
                {hasSufficientBalance ? `${balanceAfter.toLocaleString()} ${currency}` : 'Insufficient Balance'}
              </span>
            </div>
          </div>

          {/* Insufficient Balance Notice */}
          {!hasSufficientBalance && (
            <div className={styles.insufficientAlert} role="alert">
              <AlertCircle size={18} className={styles.alertIcon} aria-hidden="true" />
              <p className={styles.alertText}>
                You need {(entryFee - currentBalance).toLocaleString()} more {currency} to join this giveaway.
              </p>
            </div>
          )}

          {/* Terms Agreement Checkbox */}
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className={styles.checkboxInput}
              disabled={loading}
              aria-label="Acknowledge giveaway rules and terms"
            />
            <span className={styles.checkboxText}>
              I confirm that I have reviewed the official giveaway rules, eligibility criteria, and participation terms.
            </span>
          </label>

          {/* Action Buttons */}
          <div className={styles.actionRow}>
            <button className="btn-veloop-secondary" onClick={onClose} disabled={loading} type="button">
              Cancel
            </button>
            <button
              className="btn-veloop-primary"
              onClick={onConfirmJoin}
              disabled={!hasSufficientBalance || !agreedToTerms || loading}
              id="confirm-join-modal-btn"
              type="button"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
                  <span>Joining Giveaway...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Join</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
