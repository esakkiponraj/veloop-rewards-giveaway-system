import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Trophy,
  Users,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  FileText,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { getPrizeBySlug, getMyGiveawayStatus, joinGiveaway } from '../../services/giveawayApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Countdown } from '../../components/Countdown/Countdown.jsx';
import { CustomLoader } from '../../components/CustomLoader/CustomLoader.jsx';
import { JoinConfirmationModal } from '../../components/JoinConfirmationModal/JoinConfirmationModal.jsx';
import { SuccessfulParticipationModal } from '../../components/SuccessfulParticipationModal/SuccessfulParticipationModal.jsx';
import styles from './GiveawayDetails.module.css';

export const GiveawayDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, updateWallet } = useAuth();

  const [prizeData, setPrizeData] = useState(null);
  const [giveawayData, setGiveawayData] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

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
          const statusRes = await getMyGiveawayStatus(res.giveaway.giveawayId);
          if (statusRes.success) {
            setUserStatus(statusRes);
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

  const handleConfirmJoin = async () => {
    if (!prizeData || !giveawayData) return;
    setJoinLoading(true);
    try {
      const idempotencyKey = `IDEMP-${user.userId}-${giveawayData.giveawayId}-${Date.now()}`;
      const res = await joinGiveaway(giveawayData.giveawayId, prizeData.prizeId, idempotencyKey);

      if (res.success) {
        // Update user wallet balance instantly in auth context
        if (res.wallet) {
          updateWallet(res.wallet);
        }

        setSuccessDetails({
          prizeName: prizeData.name,
          entryAmount: prizeData.entryAmount,
          entryCurrency: prizeData.entryCurrency,
          transactionId: res.transaction?.transactionId || res.participation?.transactionId,
        });

        setConfirmModalOpen(false);
        setSuccessModalOpen(true);
        // Refresh local status
        setUserStatus((prev) => ({
          ...prev,
          isParticipating: true,
          participation: res.participation,
        }));
      }
    } catch (err) {
      alert(err.message || 'Failed to join giveaway.');
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return <CustomLoader message="Loading prize specifications and giveaway terms..." />;
  }

  if (error || !prizeData) {
    return (
      <div className={`veloop-container ${styles.errorWrapper}`}>
        <div className={styles.errorCard}>
          <AlertCircle size={40} className={styles.errorIcon} />
          <h3>Giveaway Not Found</h3>
          <p>{error || 'The requested giveaway or prize does not exist.'}</p>
          <Link to="/" className="btn-veloop-primary">
            <ArrowLeft size={16} />
            <span>Back to Giveaways</span>
          </Link>
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

  return (
    <div className={styles.detailsPage}>
      {/* Top Breadcrumb / Back Bar */}
      <div className={styles.topBar}>
        <div className={`veloop-container ${styles.topBarContainer}`}>
          <Link to="/" className={styles.backBtn} id="back-to-home-link">
            <ArrowLeft size={16} />
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
                    ? `radial-gradient(circle, ${prizeData.accentColor}45 0%, transparent 70%)`
                    : undefined,
                }}
              />
              <div className={styles.positionFloatBadge}>{prizeData.position}</div>
              <img src={prizeData.image} alt={prizeData.name} className={styles.heroPrizeImg} />
            </div>

            {/* Quick Specs Pill Badges */}
            <div className={styles.specsRow}>
              <div className={styles.specPill}>
                <Trophy size={14} className={styles.pillGold} />
                <span>{prizeData.winnerCount} {prizeData.winnerCount === 1 ? 'Winner' : 'Winners'}</span>
              </div>
              <div className={styles.specPill}>
                <Users size={14} className={styles.pillCyan} />
                <span>2.4K+ Participants</span>
              </div>
              <div className={styles.specPill}>
                <ShieldCheck size={14} className={styles.pillGreen} />
                <span>Verified Fulfillment</span>
              </div>
            </div>
          </div>

          {/* Right Column: Information & Balance Verification */}
          <div className={styles.infoCol}>
            <div className={styles.exclusiveBadge}>
              <Sparkles size={14} />
              <span>EXCLUSIVE VELOOP GIVEAWAY</span>
            </div>

            <h1 className={styles.prizeTitle}>{prizeData.name}</h1>
            <p className={styles.prizeTagline}>{prizeData.tagline || prizeData.description}</p>

            {/* Countdown Box */}
            {giveawayData?.endAt && isGiveawayActive && (
              <div className={styles.countdownCard}>
                <span className={styles.cdLabel}>GIVEAWAY ENDS IN</span>
                <Countdown targetDate={giveawayData.endAt} />
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
                /* Visitor State */
                <div className={styles.visitorState}>
                  <p className={styles.stateNotice}>Please log in to your VELOOP Rewards account to participate.</p>
                  <Link to="/login" className="btn-veloop-primary" style={{ width: '100%' }}>
                    <span>Login / Sign Up to Participate</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : isParticipating ? (
                /* Already Joined State */
                <div className={styles.joinedState}>
                  <div className={styles.joinedBadge}>
                    <CheckCircle2 size={18} />
                    <span>You're Already Participating ✓</span>
                  </div>
                  <p className={styles.joinedNotice}>
                    Your entry for the {prizeData.name} giveaway is cryptographically sealed in the active draw pool.
                  </p>
                  <Link to="/my-entries" className="btn-veloop-secondary" style={{ width: '100%' }}>
                    <span>View Participation Receipt</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : !isGiveawayActive ? (
                /* Ended / Upcoming State */
                <div className={styles.endedState}>
                  <AlertCircle size={18} />
                  <span>This giveaway is currently {giveawayData?.status?.toLowerCase()}. New entries closed.</span>
                </div>
              ) : hasSufficientBalance ? (
                /* Sufficient Balance -> Can Join */
                <div className={styles.eligibleState}>
                  <div className={styles.eligibleRow}>
                    <CheckCircle2 size={16} className={styles.checkGreen} />
                    <span>✓ You have enough {currency}</span>
                  </div>
                  <button
                    className="btn-veloop-primary"
                    style={{ width: '100%', fontSize: '1rem', padding: '14px' }}
                    onClick={() => setConfirmModalOpen(true)}
                    id="join-details-page-cta"
                  >
                    <span>Join for {entryFee.toLocaleString()} {currency}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                /* Insufficient Balance State */
                <div className={styles.insufficientState}>
                  <div className={styles.insufficientRow}>
                    <AlertCircle size={16} className={styles.alertRed} />
                    <span>
                      Insufficient {currency}. You need {(entryFee - userBalance).toLocaleString()} more {currency}.
                    </span>
                  </div>
                  <button
                    className="btn-veloop-gold"
                    style={{ width: '100%', padding: '12px' }}
                    onClick={() => alert('Earn more VEs / SVEs by completing daily VELOOP tasks and milestones!')}
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
          <button className={styles.accordionToggle} onClick={() => setInfoOpen(!infoOpen)}>
            <div className={styles.toggleTitle}>
              <Info size={18} className={styles.infoIcon} />
              <span>Important Information</span>
            </div>
            <ChevronDown size={18} className={infoOpen ? styles.chevronRotated : ''} />
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
          <button className={styles.accordionToggle} onClick={() => setTermsOpen(!termsOpen)}>
            <div className={styles.toggleTitle}>
              <FileText size={18} className={styles.termsIcon} />
              <span>Terms & Conditions</span>
            </div>
            <ChevronDown size={18} className={termsOpen ? styles.chevronRotated : ''} />
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
        onClose={() => setConfirmModalOpen(false)}
        prize={prizeData}
        userWallet={user?.wallet}
        onConfirmJoin={handleConfirmJoin}
        loading={joinLoading}
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
