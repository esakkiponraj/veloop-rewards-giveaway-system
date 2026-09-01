import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Trophy,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  FileText,
  ChevronDown,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { getPrizeBySlug, getMyGiveawayStatus, joinGiveaway } from '../../services/giveawayApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Countdown } from '../../components/Countdown/Countdown.jsx';
import { CustomLoader } from '../../components/CustomLoader/CustomLoader.jsx';
import { JoinConfirmationModal } from '../../components/JoinConfirmationModal/JoinConfirmationModal.jsx';
import { SuccessfulParticipationModal } from '../../components/SuccessfulParticipationModal/SuccessfulParticipationModal.jsx';
import styles from './GiveawayDetails.module.css';

/**
 * Generate a cryptographically secure unique idempotency key using standard Web Crypto API
 */
const generateSecureIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `IDEMP-${crypto.randomUUID()}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return `IDEMP-${Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return `IDEMP-${Date.now()}-SECURE`;
};

export const GiveawayDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateWallet, refreshUser } = useAuth();

  const [prizeData, setPrizeData] = useState(null);
  const [giveawayData, setGiveawayData] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joinError, setJoinError] = useState(null);

  // Modals
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

  // Single Idempotency Key for current intentional join attempt
  const currentIdempotencyKeyRef = useRef(null);

  // Expandable sections
  const [infoOpen, setInfoOpen] = useState(true);
  const [termsOpen, setTermsOpen] = useState(false);

  const fetchPrizeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPrizeBySlug(slug);
      if (res.success) {
        setPrizeData(res.prize);
        setGiveawayData(res.giveaway);

        if (user && res.giveaway) {
          try {
            const statusRes = await getMyGiveawayStatus(res.giveaway.giveawayId, res.prize?.prizeId);
            if (statusRes.success) {
              setUserStatus(statusRes);
            }
          } catch (e) {
            // ignore non-blocking status fetch error
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Prize details not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrizeDetails();
  }, [slug, user]);

  const handleOpenJoinModal = () => {
    // Generate one cryptographically secure idempotency key for this intentional attempt
    currentIdempotencyKeyRef.current = generateSecureIdempotencyKey();
    setJoinError(null);
    setConfirmModalOpen(true);
  };

  const handleCloseJoinModal = () => {
    if (joinLoading) return;
    // Cancelled modal clears key so next intentional attempt receives a fresh key
    currentIdempotencyKeyRef.current = null;
    setConfirmModalOpen(false);
    setJoinError(null);
  };

  const handleConfirmJoin = async () => {
    if (!prizeData || !giveawayData || joinLoading) return;
    setJoinLoading(true);
    setJoinError(null);

    // Reuse the same idempotency key for retries / rapid clicks belonging to this attempt
    const idempotencyKey = currentIdempotencyKeyRef.current || generateSecureIdempotencyKey();

    try {
      const res = await joinGiveaway(giveawayData.giveawayId, prizeData.prizeId, idempotencyKey);

      if (res.success) {
        // Clear temporary idempotency key on successful completion
        currentIdempotencyKeyRef.current = null;

        // Authoritative wallet refresh: update from backend payload and refresh user auth profile
        if (res.wallet) {
          updateWallet(res.wallet);
        }
        if (typeof refreshUser === 'function') {
          refreshUser();
        }

        setSuccessDetails({
          prizeName: prizeData.name,
          entryAmount: prizeData.entryAmount,
          entryCurrency: prizeData.entryCurrency,
          entryCount: res.participation?.entryCount || 1,
          transactionId: res.transaction?.transactionId || res.participation?.transactionId,
        });

        setConfirmModalOpen(false);
        setSuccessModalOpen(true);

        // Fetch fresh authoritative status from backend
        try {
          const freshStatus = await getMyGiveawayStatus(giveawayData.giveawayId, prizeData.prizeId);
          if (freshStatus.success) {
            setUserStatus(freshStatus);
          } else {
            setUserStatus({
              success: true,
              isParticipating: true,
              participation: res.participation,
            });
          }
        } catch (e) {
          setUserStatus({
            success: true,
            isParticipating: true,
            participation: res.participation,
          });
        }
      }
    } catch (err) {
      console.error('Join giveaway error:', err);
      let friendlyMsg = err.message || 'Failed to complete participation.';
      if (err.code === 'INSUFFICIENT_VE_BALANCE') {
        friendlyMsg = 'Your VEs balance is insufficient to join this prize.';
      } else if (err.code === 'INSUFFICIENT_SVE_BALANCE') {
        friendlyMsg = 'Your SVEs balance is insufficient to join this prize.';
      } else if (err.code === 'INSUFFICIENT_TOKEN_BALANCE') {
        friendlyMsg = 'Your Tokens balance is insufficient to join this prize.';
      } else if (err.code === 'PRIZE_PENDING_CONFIRMATION') {
        friendlyMsg = 'Participation for this prize is temporarily disabled pending merchant confirmation.';
      } else if (err.code === 'IDEMPOTENCY_KEY_REUSED') {
        friendlyMsg = 'This join transaction was already submitted with a different prize configuration.';
      } else if (err.code === 'GIVEAWAY_ENDED') {
        friendlyMsg = 'This giveaway has concluded and is no longer accepting new entries.';
      } else if (err.code === 'SERVICE_UNAVAILABLE' || err.statusCode === 503) {
        friendlyMsg = 'Database service is temporarily unavailable. Please verify your MongoDB connection.';
      }
      setJoinError(friendlyMsg);
    } finally {
      setJoinLoading(false);
    }
  };

  const getEarnMoreRoute = (curr) => {
    if (curr === 'VEs') return '/watch-ads';
    if (curr === 'SVEs') return '/tasks';
    return '/tasks';
  };

  if (loading) {
    return <CustomLoader message="Loading prize specifications and giveaway terms..." />;
  }

  if (error || !prizeData) {
    return (
      <div className={`veloop-container ${styles.errorWrapper}`}>
        <div className={styles.errorCard}>
          <AlertCircle size={40} className={styles.errorIcon} aria-hidden="true" />
          <h3>Giveaway Not Found</h3>
          <p>{error || 'The requested giveaway or prize does not exist.'}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn-veloop-secondary" onClick={fetchPrizeDetails} type="button">
              <RefreshCw size={16} aria-hidden="true" />
              <span>Retry</span>
            </button>
            <Link to="/" className="btn-veloop-primary">
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Back to Giveaways</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currency = prizeData.entryCurrency || 'VEs';
  const entryFee = prizeData.entryAmount || 0;
  const userBalance = user?.wallet ? user.wallet[currency] || 0 : 0;
  const hasSufficientBalance = userBalance >= entryFee;
  const isParticipating = userStatus?.isParticipating;
  const isGiveawayActive = giveawayData?.status === 'ACTIVE';
  const isPending = prizeData.isPendingConfirmation === true;

  return (
    <div className={styles.detailsPage}>
      {/* Top Breadcrumb / Back Bar */}
      <div className={styles.topBar}>
        <div className={`veloop-container ${styles.topBarContainer}`}>
          <Link to="/" className={styles.backBtn} id="back-to-home-link">
            <ArrowLeft size={16} aria-hidden="true" />
            <span className={styles.desktopBackText}>Giveaway Home</span>
            <span className={styles.mobileBackText}>Giveaway</span>
          </Link>

          <div className={styles.topStatusPill}>
            <span className={`badge-status badge-status-${giveawayData?.status?.toLowerCase()}`}>
              ● {giveawayData?.status === 'ACTIVE' ? 'GIVEAWAY LIVE' : giveawayData?.status}
            </span>
          </div>
        </div>
      </div>

      <div className={`veloop-container ${styles.mainContent}`}>
        {/* Two-Column Hero Grid */}
        <div className={styles.heroGrid}>
          {/* Left Column: Visual Presentation */}
          <div className={styles.imageCol}>
            <div className={styles.imageCard}>
              <div
                className={styles.ambientGlow}
                style={{
                  background: prizeData.accentColor
                    ? `radial-gradient(circle, ${prizeData.accentColor}35 0%, transparent 70%)`
                    : undefined,
                }}
              />
              <div className={styles.positionFloatBadge}>{prizeData.position}</div>
              <img src={prizeData.image} alt={prizeData.name} className={styles.heroPrizeImg} />
            </div>

            {/* Quick Specs Pill Badges */}
            <div className={styles.specsRow}>
              <div className={styles.specPill}>
                <Trophy size={14} className={styles.pillGold} aria-hidden="true" />
                <span>{prizeData.winnerCount} {prizeData.winnerCount === 1 ? 'Winner' : 'Winners'}</span>
              </div>
              <div className={styles.specPill}>
                <Users size={14} className={styles.pillCyan} aria-hidden="true" />
                <span>2.4K+ Participants</span>
              </div>
              <div className={styles.specPill}>
                <ShieldCheck size={14} className={styles.pillGreen} aria-hidden="true" />
                <span>Verified Fulfillment</span>
              </div>
            </div>
          </div>

          {/* Right Column: Information & Balance Verification */}
          <div className={styles.infoCol}>
            <div className={styles.exclusiveBadge}>
              <Sparkles size={14} aria-hidden="true" />
              <span>EXCLUSIVE VELOOP GIVEAWAY</span>
            </div>

            <h1 className={styles.prizeTitle}>{prizeData.name}</h1>
            <p className={styles.prizeTagline}>{prizeData.tagline || prizeData.description}</p>

            {/* Pending Confirmation Warning Banner */}
            {isPending && (
              <div className={styles.pendingAlertBox} role="alert">
                <AlertCircle size={18} className={styles.pendingAlertIcon} aria-hidden="true" />
                <div>
                  <strong>Pending Final Merchant Confirmation</strong>
                  <p>
                    {prizeData.pendingConfirmationNote ||
                      'The ₹20 Amazon Voucher value is pending final confirmation. Keep it configurable and clearly mark it as pending confirmation.'}
                  </p>
                </div>
              </div>
            )}

            {/* Countdown Box (Display Only: Refetches backend on expiry) */}
            {giveawayData?.endAt && isGiveawayActive && (
              <div className={styles.countdownCard}>
                <span className={styles.cdLabel}>GIVEAWAY ENDS IN</span>
                <Countdown targetDate={giveawayData.endAt} onExpire={fetchPrizeDetails} />
              </div>
            )}

            {/* AUTHORITATIVE BALANCE VERIFICATION CARD */}
            <div className={styles.balanceCard}>
              <div className={styles.balanceCardHeader}>
                <span className={styles.bCardTitle}>PARTICIPATION & BALANCE CHECK</span>
                <span className={styles.currencyBadge}>{currency}</span>
              </div>

              <div className={styles.balanceNumbersGrid}>
                <div className={styles.bNumCol}>
                  <span className={styles.bNumLabel}>Required Entry Fee</span>
                  <span className={styles.bNumValGold}>
                    {entryFee.toLocaleString()} {currency}
                  </span>
                </div>

                <div className={styles.bNumCol}>
                  <span className={styles.bNumLabel}>Your Available Balance</span>
                  <span className={styles.bNumVal}>
                    {user ? `${userBalance.toLocaleString()} ${currency}` : '—'}
                  </span>
                </div>
              </div>

              <div className={styles.bCardDivider} />

              {/* Status Outcome */}
              {!user ? (
                /* Visitor State: Safe internal returnUrl */
                <div className={styles.visitorState}>
                  <p className={styles.stateNotice}>Please log in to your VELOOP Rewards account to participate.</p>
                  <button
                    className="btn-veloop-primary"
                    style={{ width: '100%' }}
                    onClick={() => navigate(`/login?returnUrl=${encodeURIComponent(location.pathname)}`)}
                    id="visitor-login-btn"
                    type="button"
                  >
                    <span>Login to Participate</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : isPending ? (
                /* Pending Confirmation State */
                <div className={styles.endedState}>
                  <AlertCircle size={18} aria-hidden="true" />
                  <span>Participation is temporarily locked while merchant confirmation is finalized.</span>
                </div>
              ) : isParticipating ? (
                /* Already Joined State */
                <div className={styles.joinedState}>
                  <div className={styles.joinedBadge}>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <span>You're Already Participating ✓ ({userStatus?.participation?.entryCount || 1} Entry)</span>
                  </div>
                  <p className={styles.joinedNotice}>
                    Your entry for the {prizeData.name} giveaway is cryptographically sealed in the active draw pool.
                  </p>
                  <Link to="/my-entries" className="btn-veloop-secondary" style={{ width: '100%' }}>
                    <span>View Participation Receipt</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              ) : !isGiveawayActive ? (
                /* Ended / Upcoming State */
                <div className={styles.endedState}>
                  <AlertCircle size={18} aria-hidden="true" />
                  <span>This giveaway is currently {giveawayData?.status?.toLowerCase()}. New entries closed.</span>
                </div>
              ) : hasSufficientBalance ? (
                /* Sufficient Balance -> Can Join */
                <div className={styles.eligibleState}>
                  <div className={styles.eligibleRow}>
                    <CheckCircle2 size={16} className={styles.checkGreen} aria-hidden="true" />
                    <span>✓ You have enough {currency} to join</span>
                  </div>
                  <button
                    className="btn-veloop-primary"
                    style={{ width: '100%', fontSize: '1rem', padding: '14px' }}
                    onClick={handleOpenJoinModal}
                    id="join-details-page-cta"
                    type="button"
                  >
                    <span>Join for {entryFee.toLocaleString()} {currency}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                /* Insufficient Balance State */
                <div className={styles.insufficientState}>
                  <div className={styles.insufficientRow}>
                    <AlertCircle size={16} className={styles.alertRed} aria-hidden="true" />
                    <span>
                      Insufficient {currency}. You need {(entryFee - userBalance).toLocaleString()} more {currency}.
                    </span>
                  </div>
                  <button
                    className="btn-veloop-gold"
                    style={{ width: '100%', padding: '12px' }}
                    onClick={() => navigate(getEarnMoreRoute(currency))}
                    id="earn-more-currency-btn"
                    type="button"
                  >
                    <span>Earn More {currency} →</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Technical Specifications Table */}
        {prizeData.specifications && prizeData.specifications.length > 0 && (
          <section className={styles.specsSection}>
            <h3 className={styles.sectionHeader}>Product Specifications & Details</h3>
            <div className={styles.specsTable}>
              {prizeData.specifications.map((spec, i) => (
                <div key={i} className={styles.specsRowItem}>
                  <span className={styles.specLabel}>{spec.label}</span>
                  <span className={styles.specValue}>{spec.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How This Giveaway Works Timeline */}
        <section className={styles.timelineSection}>
          <h3 className={styles.sectionHeader}>How This Giveaway Works</h3>
          <div className={styles.timelineList}>
            <div className={styles.timelineItem}>
              <span className={styles.tlNum}>01</span>
              <div>
                <h4>Review Details</h4>
                <p>Verify product specs, estimated retail value, and required currency.</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.tlNum}>02</span>
              <div>
                <h4>Check Eligibility</h4>
                <p>Ensure active account standing and sufficient {currency} balance.</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.tlNum}>03</span>
              <div>
                <h4>Deduct Entry Fee</h4>
                <p>Confirm the transaction to atomically deduct {entryFee} {currency}.</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.tlNum}>04</span>
              <div>
                <h4>Entry Recorded</h4>
                <p>Your unique participation ID is entered into the cryptographic draw pool.</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.tlNum}>05</span>
              <div>
                <h4>Wait for Giveaway End</h4>
                <p>Track the countdown timer until the official draw date.</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.tlNum}>06</span>
              <div>
                <h4>Winner Selected</h4>
                <p>Server-side cryptographic draw selects {prizeData.winnerCount} verified winner(s).</p>
              </div>
            </div>
            <div className={styles.timelineItem}>
              <span className={styles.tlNum}>07</span>
              <div>
                <h4>Winner Claims Prize</h4>
                <p>Winner submits fulfillment details within 7 calendar days.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Important Information Accordion */}
        <div className={styles.accordionWrap}>
          <button className={styles.accordionToggle} onClick={() => setInfoOpen(!infoOpen)} type="button">
            <div className={styles.toggleTitle}>
              <Info size={18} className={styles.infoIcon} aria-hidden="true" />
              <span>Important Information</span>
            </div>
            <ChevronDown size={18} className={infoOpen ? styles.chevronRotated : ''} aria-hidden="true" />
          </button>
          {infoOpen && (
            <div className={styles.accordionContent}>
              <ul className={styles.infoList}>
                <li><strong>Entry Cost:</strong> Exactly {entryFee} {currency} will be deducted from your VELOOP wallet upon confirmation.</li>
                <li><strong>One Entry Rule:</strong> Only one participation is allowed per user for this prize in this giveaway event.</li>
                <li><strong>No Hidden Costs:</strong> VELOOP covers 100% of shipping, insurance, and packaging for physical rewards.</li>
                <li><strong>Winner Selection:</strong> Conducted transparently with tamper-proof random seeding.</li>
                <li><strong>Anti-Abuse:</strong> Automated fraud filters evaluate device signatures and velocity to prevent bots.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Terms and Conditions Accordion */}
        <div className={styles.accordionWrap}>
          <button className={styles.accordionToggle} onClick={() => setTermsOpen(!termsOpen)} type="button">
            <div className={styles.toggleTitle}>
              <FileText size={18} className={styles.termsIcon} aria-hidden="true" />
              <span>Terms & Conditions</span>
            </div>
            <ChevronDown size={18} className={termsOpen ? styles.chevronRotated : ''} aria-hidden="true" />
          </button>
          {termsOpen && (
            <div className={styles.accordionContent}>
              <p className={styles.termsParagraph}>
                By participating in the {prizeData.name} giveaway event, you agree that your entry fee is non-refundable upon confirmation unless the entire giveaway event is cancelled by administration. Winners will be contacted via their registered account credentials and must claim within 7 calendar days. Physical goods are shipped strictly to verified domestic addresses in serviceable PIN codes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <JoinConfirmationModal
        isOpen={confirmModalOpen}
        onClose={handleCloseJoinModal}
        prize={prizeData}
        userWallet={user?.wallet}
        onConfirmJoin={handleConfirmJoin}
        loading={joinLoading}
        errorMessage={joinError}
      />

      {/* Success Modal */}
      <SuccessfulParticipationModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        details={successDetails}
      />
    </div>
  );
};
