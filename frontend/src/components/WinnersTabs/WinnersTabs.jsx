import React, { useState } from 'react';
import { Trophy, History, Clock, Gift, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './WinnersTabs.module.css';

export const WinnersTabs = ({
  currentGiveaway,
  currentWinners = [],
  previousGiveaways = [],
  previousWinners = [],
  onOpenClaimModal,
}) => {
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'previous'
  const { user } = useAuth();

  // Check if current authenticated user is a winner in the previous or current giveaway
  const userWinningRecord =
    currentWinners.find((w) => w.userId === user?.userId) ||
    previousWinners.find((w) => w.userId === user?.userId);

  return (
    <section className={styles.winnersSection} id="winners-section">
      <div className={`veloop-container ${styles.container}`}>
        {/* Personal Winner Spotlight Banner (If logged in user won!) */}
        {userWinningRecord && (
          <div className={styles.winnerSpotlightBanner}>
            <div className={styles.spotlightIconWrap}>
              <Sparkles size={28} className={styles.spotlightIcon} />
            </div>
            <div className={styles.spotlightText}>
              <div className={styles.spotlightBadge}>🎉 CONGRATULATIONS WINNER!</div>
              <h3 className={styles.spotlightTitle}>
                You won the <span className={styles.goldText}>{userWinningRecord.prizeName}</span>!
              </h3>
              <p className={styles.spotlightSubtitle}>
                Your entry was officially verified and selected. Please submit your fulfillment details before the claim deadline.
              </p>
            </div>
            <button
              className="btn-veloop-gold"
              onClick={() => onOpenClaimModal(userWinningRecord)}
              id="claim-prize-spotlight-btn"
            >
              <Gift size={16} />
              <span>Claim Your Prize</span>
            </button>
          </div>
        )}

        {/* Section Header */}
        <div className={styles.header}>
          <div className={styles.badgeWrap}>
            <Trophy size={14} className={styles.goldTrophy} />
            <span>TRANSPARENT REWARDS LEADERBOARD</span>
          </div>
          <h2 className={styles.sectionTitle}>Winners & Hall of Fame</h2>
          <p className={styles.sectionSubtitle}>
            Every draw is executed with tamper-proof cryptographic seeds and published permanently on our audit ledger.
          </p>

          {/* Tab Switcher */}
          <div className={styles.tabSwitcher}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'current' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('current')}
            >
              <Trophy size={16} />
              <span>Current Giveaway Winners</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'previous' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('previous')}
            >
              <History size={16} />
              <span>Previous Winners Archive</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Current Giveaway Winners */}
        {activeTab === 'current' && (
          <div className={styles.tabContent}>
            {currentGiveaway?.status === 'ACTIVE' ? (
              <div className={styles.activeGiveawayPlaceholder}>
                <div className={styles.livePulseIconWrap}>
                  <Clock size={32} className={styles.liveClockIcon} />
                </div>
                <h3 className={styles.liveTitle}>Giveaway is Currently Live</h3>
                <p className={styles.liveDesc}>
                  Winners will be cryptographically drawn and announced immediately after the countdown ends on{' '}
                  <strong>
                    {new Date(currentGiveaway.endAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>.
                </p>
                <div className={styles.liveTrustPill}>
                  <ShieldCheck size={16} />
                  <span>Fair randomized selection powered by backend cryptographic verification</span>
                </div>
              </div>
            ) : currentWinners.length > 0 ? (
              <div className={styles.winnersGrid}>
                {currentWinners.map((winner, idx) => (
                  <div key={winner._id || idx} className={styles.winnerCard}>
                    <div className={styles.winnerCardHeader}>
                      <span className={styles.winnerMaskedId}>{winner.maskedUserId}</span>
                      <span className={styles.winBadge}>● Verified Winner</span>
                    </div>
                    <h4 className={styles.prizeWonName}>{winner.prizeName}</h4>
                    <p className={styles.winDate}>
                      Selected on {new Date(winner.selectedAt).toLocaleDateString('en-IN')}
                    </p>
                    {user?.userId === winner.userId && (
                      <button
                        className="btn-veloop-gold"
                        style={{ marginTop: '12px', width: '100%', fontSize: '0.85rem' }}
                        onClick={() => onOpenClaimModal(winner)}
                      >
                        Claim Prize →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyWinners}>
                <p>Winners are currently being compiled by the backend verification engine.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Previous Winners Archive */}
        {activeTab === 'previous' && (
          <div className={styles.tabContent}>
            <div className={styles.archiveHeader}>
              <h3 className={styles.archiveTitle}>Completed Giveaway Events</h3>
              <span className={styles.archiveCount}>{previousWinners.length} Verified Prizes Awarded</span>
            </div>

            <div className={styles.winnersGrid}>
              {previousWinners.map((pw, idx) => (
                <div key={pw._id || idx} className={styles.winnerCard}>
                  <div className={styles.winnerCardHeader}>
                    <span className={styles.winnerMaskedId}>{pw.maskedUserId}</span>
                    <span className={styles.deliveredBadge}>
                      {pw.status === 'DELIVERED' || pw.status === 'CLAIMED' ? (
                        <>
                          <CheckCircle2 size={12} /> Claimed / Dispatched
                        </>
                      ) : (
                        'Claim Pending'
                      )}
                    </span>
                  </div>
                  <h4 className={styles.prizeWonName}>{pw.prizeName}</h4>
                  <div className={styles.archiveMeta}>
                    <span>Event: Monsoon Kickoff Rewards</span>
                    <span>Date: {new Date(pw.selectedAt || Date.now()).toLocaleDateString('en-IN')}</span>
                  </div>

                  {user?.userId === pw.userId && (
                    <button
                      className="btn-veloop-gold"
                      style={{ marginTop: '12px', width: '100%', fontSize: '0.85rem' }}
                      onClick={() => onOpenClaimModal(pw)}
                    >
                      {pw.status === 'SELECTED' ? 'Claim Your Prize →' : 'View Claim Status →'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
