import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, MapPin, Mail, Phone, User, CheckCircle2, Clock, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { claimPrize, getMyClaim } from '../../services/giveawayApi.js';
import styles from './PrizeClaimModal.module.css';

export const PrizeClaimModal = ({ isOpen, onClose, winnerRecord, onClaimSubmitted }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    addressLine: '',
    city: '',
    state: '',
    pinCode: '',
    emailAddress: '',
  });

  const [claimStatus, setClaimStatus] = useState('NOT_SUBMITTED');
  const [existingClaim, setExistingClaim] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const modalRef = useRef(null);
  const triggerElementRef = useRef(null);

  const isPhysical = winnerRecord?.prizeType === 'PHYSICAL';

  // Manage body scroll and focus restoration
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

  // Load existing claim status if already submitted
  useEffect(() => {
    if (isOpen && winnerRecord) {
      const fetchClaimData = async () => {
        setFetchingStatus(true);
        setErrorMsg('');
        try {
          const res = await getMyClaim(winnerRecord.giveawayId);
          if (res.success && res.claim) {
            setExistingClaim(res.claim);
            setClaimStatus(res.claim.status || 'SUBMITTED');
          } else {
            setClaimStatus(winnerRecord.status === 'CLAIM_SUBMITTED' ? 'SUBMITTED' : 'NOT_SUBMITTED');
          }
        } catch (e) {
          // New claim
          setClaimStatus('NOT_SUBMITTED');
        } finally {
          setFetchingStatus(false);
        }
      };

      fetchClaimData();
    }
  }, [isOpen, winnerRecord]);

  if (!isOpen || !winnerRecord) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await claimPrize(
        winnerRecord.giveawayId,
        winnerRecord.prizeId,
        isPhysical
          ? {
              fullName: formData.fullName,
              phoneNumber: formData.phoneNumber,
              addressLine: formData.addressLine,
              city: formData.city,
              state: formData.state,
              pinCode: formData.pinCode,
            }
          : {
              emailAddress: formData.emailAddress,
            }
      );

      if (res.success) {
        setClaimStatus('SUBMITTED');
        setExistingClaim(res.claim);
        setSuccessMsg(res.message || 'Claim details submitted successfully!');
        if (onClaimSubmitted) onClaimSubmitted(res.claim);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit prize claim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className={styles.modalBackdrop} onClick={onClose}>
        <motion.div
          ref={modalRef}
          className={styles.modalCard}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-modal-title"
        >
          {/* Close button */}
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} aria-hidden="true" />
          </button>

          {/* Header */}
          <div className={styles.modalHeader}>
            <div className={styles.claimBadge}>
              <Gift size={14} aria-hidden="true" />
              <span>OFFICIAL PRIZE CLAIM PORTAL</span>
            </div>
            <h3 className={styles.modalTitle} id="claim-modal-title">Claim Your {winnerRecord.prizeName}</h3>
            <p className={styles.modalSubtitle}>
              Winner Verification ID: <strong className={styles.maskedId}>{winnerRecord.maskedUserId}</strong> · Verified Draw
            </p>
          </div>

          {/* Winner Verification Summary Bar */}
          <div className={styles.summaryBar}>
            <div className={styles.summaryCol}>
              <span className={styles.sLabel}>PRIZE</span>
              <span className={styles.sVal}>{winnerRecord.prizeName}</span>
            </div>
            <div className={styles.summaryCol}>
              <span className={styles.sLabel}>STATUS</span>
              <span className={styles.sValGreen}>Winner ✓</span>
            </div>
            <div className={styles.summaryCol}>
              <span className={styles.sLabel}>CLAIM DEADLINE</span>
              <span className={styles.sValGold}>7 Days from Draw</span>
            </div>
          </div>

          {/* Form or Status View */}
          {fetchingStatus ? (
            <div className={styles.loadingBox}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Verifying winner credentials...</span>
            </div>
          ) : claimStatus !== 'NOT_SUBMITTED' ? (
            /* Already Submitted / Processing / Delivered State */
            <div className={styles.submittedView}>
              <div className={styles.statusStepWrapper}>
                <div
                  className={`${styles.statusStep} ${
                    ['SUBMITTED', 'PROCESSING', 'COMPLETED'].includes(claimStatus) ? styles.stepActive : ''
                  }`}
                >
                  <CheckCircle2 size={20} />
                  <span>Claim Submitted ✓</span>
                </div>
                <div
                  className={`${styles.statusStep} ${
                    ['PROCESSING', 'COMPLETED'].includes(claimStatus) ? styles.stepActive : ''
                  }`}
                >
                  <Clock size={20} />
                  <span>Verification in Progress</span>
                </div>
                <div className={`${styles.statusStep} ${claimStatus === 'COMPLETED' ? styles.stepActive : ''}`}>
                  <ShieldCheck size={20} />
                  <span>Prize Delivered / Dispatched ✓</span>
                </div>
              </div>

              <div className={styles.submittedDetailsBox}>
                <h4 className={styles.detailsHeader}>Claim Confirmation</h4>
                <p className={styles.detailsText}>
                  Our rewards fulfillment team is actively processing your reward. You will receive real-time courier tracking / gift voucher updates at your registered contact details.
                </p>
                {existingClaim?.claimId && (
                  <div className={styles.claimRefRow}>
                    <span>Claim Reference ID:</span>
                    <strong>{existingClaim.claimId}</strong>
                  </div>
                )}
                {existingClaim?.trackingInformation?.trackingNumber && (
                  <div className={styles.claimRefRow}>
                    <span>Tracking Number:</span>
                    <strong>{existingClaim.trackingInformation.trackingNumber}</strong>
                  </div>
                )}
                {existingClaim?.trackingInformation?.voucherCode && (
                  <div className={styles.claimRefRow}>
                    <span>Voucher Code:</span>
                    <strong className={styles.goldCode}>{existingClaim.trackingInformation.voucherCode}</strong>
                  </div>
                )}
              </div>

              <button className="btn-veloop-secondary" onClick={onClose} style={{ width: '100%' }}>
                Close Portal
              </button>
            </div>
          ) : (
            /* New Claim Form */
            <form onSubmit={handleSubmit} className={styles.form}>
              {errorMsg && (
                <div className={styles.errorAlert}>
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {isPhysical ? (
                /* PHYSICAL PRIZE FORM (iPhone / Watch / AirPods) */
                <div className={styles.formFieldsGrid}>
                  <div className={styles.fullWidth}>
                    <label className={styles.label}>
                      Full Name <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <User size={16} className={styles.inputIcon} />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Recipient legal full name"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.fullWidth}>
                    <label className={styles.label}>
                      Phone Number <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <Phone size={16} className={styles.inputIcon} />
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="10-digit mobile number for courier delivery"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.fullWidth}>
                    <label className={styles.label}>
                      Complete Shipping Address <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <MapPin size={16} className={styles.inputIcon} />
                      <input
                        type="text"
                        name="addressLine"
                        value={formData.addressLine}
                        onChange={handleChange}
                        placeholder="House / Flat No., Street, Landmark"
                        className={styles.input}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={styles.label}>
                      City <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Mumbai"
                      className={styles.inputSimple}
                      required
                    />
                  </div>

                  <div>
                    <label className={styles.label}>
                      State <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. Maharashtra"
                      className={styles.inputSimple}
                      required
                    />
                  </div>

                  <div className={styles.fullWidth}>
                    <label className={styles.label}>
                      PIN Code <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="pinCode"
                      value={formData.pinCode}
                      onChange={handleChange}
                      placeholder="6-digit postal PIN code"
                      className={styles.inputSimple}
                      maxLength={6}
                      required
                    />
                  </div>
                </div>
              ) : (
                /* AMAZON GIFT CARD FORM (Email Address only) */
                <div className={styles.formFieldsGrid}>
                  <div className={styles.fullWidth}>
                    <label className={styles.label}>
                      Recipient Email Address <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.inputWrap}>
                      <Mail size={16} className={styles.inputIcon} />
                      <input
                        type="email"
                        name="emailAddress"
                        value={formData.emailAddress}
                        onChange={handleChange}
                        placeholder="Enter email where you want to receive your gift voucher"
                        className={styles.input}
                        required
                      />
                    </div>
                    <span className={styles.fieldHelp}>
                      Note: Amazon gift card voucher codes will be dispatched digitally with zero shipping fees.
                    </span>
                  </div>
                </div>
              )}

              <div className={styles.formFooter}>
                <button type="button" className="btn-veloop-secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn-veloop-gold" disabled={loading} id="submit-claim-btn">
                  {loading ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>Submitting Claim...</span>
                    </>
                  ) : (
                    <span>Submit Claim Details</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
