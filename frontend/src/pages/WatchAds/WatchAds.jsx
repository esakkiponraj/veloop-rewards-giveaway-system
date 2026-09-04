import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Sparkles,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Zap,
  Play,
  X,
  Volume2,
  ArrowRight,
  ShieldCheck,
  Coins,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAds, completeAd } from '../../services/adApi.js';
import styles from './WatchAds.module.css';

export const WatchAds = () => {
  const { user, updateWallet } = useAuth();

  const [adsList, setAdsList] = useState([]);
  const [userStats, setUserStats] = useState({
    todayEarnings: 0,
    totalEarned: 0,
    completedTodayCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Watching State
  const [watchingAd, setWatchingAd] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isWatchingComplete, setIsWatchingComplete] = useState(false);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [rewardNotice, setRewardNotice] = useState(null);
  const [completionError, setCompletionError] = useState(null);

  const timerRef = useRef(null);
  const closeBtnRef = useRef(null);

  const clearAdTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const fetchAdsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAds();
      if (res.success) {
        setAdsList(res.ads || []);
        if (res.stats) {
          setUserStats(res.stats);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load sponsored advertisements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdsData();
  }, [user]);

  // Clean up timer and unlock scroll on component unmount
  useEffect(() => {
    return () => {
      clearAdTimer();
      document.body.style.overflow = '';
    };
  }, []);

  // Lock background scrolling while modal is open
  useEffect(() => {
    if (watchingAd) {
      document.body.style.overflow = 'hidden';
      // Automatically focus the close button for accessibility
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [watchingAd]);

  // Handle Escape key to cancel/close modal
  useEffect(() => {
    if (!watchingAd) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [watchingAd]);

  // Countdown timer during ad watch
  useEffect(() => {
    if (watchingAd && timeLeft > 0 && !isWatchingComplete) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearAdTimer();
            handleAdFinished(watchingAd);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearAdTimer();
  }, [watchingAd, isWatchingComplete]);

  const handleStartWatching = (ad) => {
    // Prevent starting concurrent sessions
    if (ad.watched || watchingAd) return;
    setWatchingAd(ad);
    setTimeLeft(ad.duration || 15);
    setIsWatchingComplete(false);
    setRewardNotice(null);
    setCompletionError(null);
  };

  const handleAdFinished = async (ad) => {
    setIsWatchingComplete(true);
    setIsSubmittingCompletion(true);

    try {
      const idempotencyKey = `watch-${ad.adId}-${Date.now()}`;
      const res = await completeAd(ad.adId, idempotencyKey);

      if (res.success) {
        // Authoritative server balance update
        if (res.wallet) {
          updateWallet(res.wallet);
        }

        // Trigger confetti
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#7C3AED', '#22C55E', '#FBBF24'],
        });

        setRewardNotice({
          reward: res.reward,
          currency: res.currency || 'VEs',
          brand: ad.brand,
          transactionId: res.transactionId,
        });

        // Update local ad watched status and stats
        setAdsList((prev) =>
          prev.map((item) => (item.adId === ad.adId ? { ...item, watched: true } : item))
        );
        setUserStats((prev) => ({
          todayEarnings: prev.todayEarnings + res.reward,
          totalEarned: prev.totalEarned + res.reward,
          completedTodayCount: prev.completedTodayCount + 1,
        }));
      }
    } catch (err) {
      setCompletionError(err.message || 'Reward processing failed.');
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  // Closing before completion cancels the watch session and grants NO reward
  const handleCloseModal = () => {
    clearAdTimer();
    setWatchingAd(null);
    setTimeLeft(0);
    setIsWatchingComplete(false);
    setRewardNotice(null);
    setCompletionError(null);
  };

  // Compute dynamic daily goal progress
  const totalAdsCount = adsList.length || 6;
  const completedCount = userStats.completedTodayCount || adsList.filter((a) => a.watched).length;
  const progressPercent = Math.min(100, Math.round((completedCount / totalAdsCount) * 100));

  return (
    <div className={styles.pageContainer}>
      {/* 1. HERO SECTION */}
      <section className={styles.heroCard}>
        <div className={styles.heroGlow} />

        <div className={styles.heroGrid}>
          {/* Left Column: Text & CTAs */}
          <div className={styles.heroLeft}>
            <div className={styles.heroBadge}>
              <Sparkles size={14} />
              <span>SPONSORED REWARD NETWORK</span>
            </div>

            <h1 className={styles.heroTitle}>
              Watch Partner Ads, <br />
              <span className={styles.heroTitleGradient}>Earn Real VEs Instantly.</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Stream short 15–30s verified sponsor previews. Every completed stream earns immediate
              virtual currencies credited directly to your authoritative VELOOP wallet.
            </p>

            {/* 4 Mini Stat Badges */}
            <div className={styles.miniStatsGrid}>
              <div className={`${styles.miniStatCard} ${styles.statGreen}`}>
                <span className={styles.miniStatLabel}>Today's Earnings</span>
                <strong className={styles.miniStatVal}>+{userStats.todayEarnings} VEs</strong>
              </div>

              <div className={`${styles.miniStatCard} ${styles.statPurple}`}>
                <span className={styles.miniStatLabel}>Total Ad Rewards</span>
                <strong className={styles.miniStatVal}>{userStats.totalEarned} VEs</strong>
              </div>

              <div className={`${styles.miniStatCard} ${styles.statBlue}`}>
                <span className={styles.miniStatLabel}>Available Ads</span>
                <strong className={styles.miniStatVal}>
                  {adsList.filter((a) => !a.watched).length} Available
                </strong>
              </div>

              <div className={`${styles.miniStatCard} ${styles.statGold}`}>
                <span className={styles.miniStatLabel}>Completed Today</span>
                <strong className={styles.miniStatVal}>
                  {completedCount} / {totalAdsCount}
                </strong>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Visual Play Composition */}
          <div className={styles.heroRight}>
            <div className={styles.playVisualCard}>
              <div className={styles.playAuraGlow} />

              <div className={styles.playCardInner}>
                <div className={styles.playIconLargeWrap}>
                  <Play size={36} className={styles.playIconLarge} />
                </div>
                <span className={styles.playCardLabel}>LIVE PREVIEWS</span>
                <strong className={styles.playCardBonus}>+38 to +50 VEs</strong>
              </div>

              {/* Floating Coins */}
              <div className={`${styles.floatingCoin} ${styles.coin1}`}>
                <Coins size={18} />
                <span>+38 VEs</span>
              </div>
              <div className={`${styles.floatingCoin} ${styles.coin2}`}>
                <Zap size={16} />
                <span>+45 VEs</span>
              </div>
              <div className={`${styles.floatingCoin} ${styles.coin3}`}>
                <Sparkles size={16} />
                <span>+50 VEs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DAILY PROGRESS BAR */}
      <section className={styles.progressSection}>
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div className={styles.progressTitleGroup}>
              <div className={styles.progressIconWrap}>
                <Award size={20} />
              </div>
              <div>
                <h3 className={styles.progressTitle}>Daily Ad Quest Progress</h3>
                <p className={styles.progressSub}>
                  Complete all daily sponsored streams to maximize your rewards potential.
                </p>
              </div>
            </div>

            <div className={styles.progressPercentPill}>
              <span>{completedCount} / {totalAdsCount} Completed</span>
              <strong>{progressPercent}%</strong>
            </div>
          </div>

          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* 3. AVAILABLE ADS GRID */}
      <section className={styles.adsSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Available Partner Advertisements</h2>
            <p className={styles.sectionSub}>
              Select any sponsor below to watch their preview and receive your guaranteed VE payout.
            </p>
          </div>
          <button onClick={fetchAdsData} className={styles.refreshBtn} title="Refresh Ads">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingBox}>
            <RefreshCw size={24} className={styles.spinner} />
            <p>Loading available sponsored ad campaigns...</p>
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : (
          <div className={styles.adsGrid}>
            {adsList.map((ad) => (
              <div
                key={ad.adId}
                className={`${styles.adCard} ${ad.watched ? styles.adCardWatched : ''}`}
              >
                <div className={styles.adCardHeader} style={{ background: ad.gradient }}>
                  <div className={styles.adLogoBadge}>{ad.logo}</div>
                  <div className={styles.adDurationBadge}>
                    <Clock size={12} />
                    <span>{ad.duration}s</span>
                  </div>
                </div>

                <div className={styles.adCardBody}>
                  <div className={styles.adCategory}>{ad.category}</div>
                  <h3 className={styles.adBrandName}>{ad.brand}</h3>
                  <p className={styles.adTagline}>{ad.tagline}</p>

                  <div className={styles.adFooter}>
                    <div className={styles.rewardPill}>
                      <span className={styles.rewardPlus}>+</span>
                      <strong className={styles.rewardNum}>{ad.reward}</strong>
                      <span className={styles.rewardUnit}>{ad.currency}</span>
                    </div>

                    <button
                      className={ad.watched ? styles.watchedBtn : styles.watchBtn}
                      onClick={() => handleStartWatching(ad)}
                      disabled={ad.watched || watchingAd !== null}
                      aria-disabled={ad.watched || watchingAd !== null}
                    >
                      {ad.watched ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Watched</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} />
                          <span>Watch Ad</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. INTERACTIVE 16:9 WATCHING & REWARD MODAL PLAYER */}
      {watchingAd && (() => {
        const activeDuration = watchingAd.duration || 15;
        const elapsedSec = Math.max(0, activeDuration - timeLeft);
        const adProgressPercent = Math.min(100, Math.max(0, Math.round((elapsedSec / activeDuration) * 100)));

        return (
          <div
            className={styles.modalBackdrop}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ad-player-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseModal();
            }}
          >
            <div className={styles.modalCard}>
              {/* Modal Top Bar */}
              <div className={styles.modalTopBar}>
                <div className={styles.modalBrandBadge}>
                  <span className={styles.modalCategoryPill}>{watchingAd.category || 'Sponsor'}</span>
                  <div className={styles.modalTitleWrap}>
                    <span className={styles.modalLogoIcon}>{watchingAd.logo || '📺'}</span>
                    <h2 id="ad-player-title" className={styles.modalAdTitle}>
                      {watchingAd.brand} — {watchingAd.tagline}
                    </h2>
                  </div>
                </div>
                <button
                  ref={closeBtnRef}
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={handleCloseModal}
                  aria-label="Cancel and close advertisement player"
                  title="Close and cancel stream"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Responsive 16:9 Video Player Display Area */}
              <div className={styles.videoPlayerArea}>
                {timeLeft > 0 ? (
                  <div className={styles.playerStreamSimulation}>
                    <div className={styles.streamOverlayGlow} />

                    {/* Top Status Overlay Row */}
                    <div className={styles.playerTopRow}>
                      <div className={styles.playingStatusBadge}>
                        <span className={styles.pulsingDot} />
                        <span>Advertisement Playing</span>
                      </div>
                      <div className={styles.guaranteedRewardBadge}>
                        <Zap size={13} />
                        <span>Guaranteed: +{watchingAd.reward} {watchingAd.currency || 'VEs'}</span>
                      </div>
                    </div>

                    {/* Center Stream Visual & Countdown */}
                    <div className={styles.countdownCenter}>
                      <div className={styles.timerCircle}>
                        <span className={styles.timerNum}>{timeLeft}</span>
                        <span className={styles.timerUnit}>SEC</span>
                      </div>
                      <p className={styles.streamNotice}>
                        Official Sponsor: <strong>{watchingAd.brand}</strong>
                      </p>
                    </div>

                    {/* Bottom Progress Bar & Stream Controls */}
                    <div className={styles.playerBottomOverlay}>
                      <div
                        className={styles.progressBarTrack}
                        role="progressbar"
                        aria-valuenow={adProgressPercent}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-label="Ad watch progress"
                      >
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${adProgressPercent}%` }}
                        />
                      </div>
                      <div className={styles.playerControlsRow}>
                        <span className={styles.remainingSecondsText}>
                          <Clock size={13} />
                          <span>{timeLeft}s remaining</span>
                        </span>
                        <button
                          type="button"
                          className={styles.cancelStreamBtn}
                          onClick={handleCloseModal}
                          title="Closing cancels stream without granting rewards"
                        >
                          Cancel Stream
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isSubmittingCompletion ? (
                  <div className={styles.submittingBox}>
                    <RefreshCw size={36} className={styles.spinner} />
                    <p>Validating ad completion & crediting your {watchingAd.currency || 'VEs'} reward...</p>
                  </div>
                ) : completionError ? (
                  <div className={styles.errorModalBox}>
                    <AlertCircle size={36} />
                    <h3>Reward Verification Failed</h3>
                    <p>{completionError}</p>
                    <button onClick={handleCloseModal} className="btn-veloop-secondary">
                      Close
                    </button>
                  </div>
                ) : rewardNotice ? (
                  <div className={styles.rewardCelebrationBox}>
                    <div className={styles.celebrationCheck}>
                      <CheckCircle2 size={48} />
                    </div>
                    <h3 className={styles.celebrationTitle}>Reward Credited!</h3>
                    <div className={styles.celebrationRewardBig}>
                      <span className={styles.plusChar}>+</span>
                      <strong>{rewardNotice.reward}</strong>
                      <span>{rewardNotice.currency}</span>
                    </div>
                    <p className={styles.celebrationSub}>
                      Authoritative balance updated for viewing {rewardNotice.brand}.
                    </p>
                    {rewardNotice.transactionId && (
                      <div className={styles.txnIdBadge}>
                        Txn ID: <code>{rewardNotice.transactionId}</code>
                      </div>
                    )}
                    <button onClick={handleCloseModal} className="btn-veloop-primary">
                      <span>Collect & Continue</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
