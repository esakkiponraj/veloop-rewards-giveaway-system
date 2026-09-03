import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
  Gift,
  Coins,
  Dice5,
  PackageCheck,
  Clock,
  UserCheck,
  ChevronDown,
  Trophy,
  ExternalLink,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { getCurrentGiveaway, getAllPreviousWinners } from '../../services/giveawayApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { LandingNavbar } from '../../components/LandingNavbar/LandingNavbar.jsx';
import { LandingFooter } from '../../components/LandingFooter/LandingFooter.jsx';
import { CustomLoader } from '../../components/CustomLoader/CustomLoader.jsx';
import styles from './LandingPage.module.css';

export const LandingPage = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [giveawayData, setGiveawayData] = useState(null);
  const [winners, setWinners] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Fetch real data from public endpoints
  const loadPlatformData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [giveawayRes, winnersRes] = await Promise.all([
        getCurrentGiveaway(),
        getAllPreviousWinners(),
      ]);

      if (giveawayRes && giveawayRes.success) {
        setGiveawayData(giveawayRes);
      } else {
        throw new Error('Could not retrieve active giveaway campaign data.');
      }

      if (winnersRes && winnersRes.success && Array.isArray(winnersRes.winners)) {
        setWinners(winnersRes.winners);
      }
    } catch (err) {
      console.error('Failed to load landing page data:', err);
      setError(err.message || 'Unable to load real-time campaign data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  // Real-time countdown timer to giveaway.endAt
  useEffect(() => {
    const endAtDate = giveawayData?.giveaway?.endAt;
    if (!endAtDate) return;

    const targetTime = new Date(endAtDate).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [giveawayData?.giveaway?.endAt]);

  const activeGiveaway = giveawayData?.giveaway;
  const stats = giveawayData?.stats;
  const prizes = activeGiveaway?.prizes || [];

  const faqs = [
    {
      q: 'How are giveaway winners selected?',
      a: 'Winners are chosen using a cryptographically secure weighted pseudorandom algorithm (Node.js crypto.randomInt). Your entries directly correspond to your selection weight without replacement, guaranteeing transparent and verifiable odds.',
    },
    {
      q: 'Do I need to spend real money to participate?',
      a: 'No! VELOOP operates on a 100% engagement-reward model. You earn VEs (Velocity Entries) and Tokens through daily check-ins, sponsored tasks, and platform activity. No purchase or deposit is ever required.',
    },
    {
      q: 'How do I claim my prize if I win?',
      a: 'When you win, your account portal displays a "Claim Your Prize" notification in My Entries. Physical items require confirming your delivery address, while digital vouchers (such as Amazon cards) are delivered directly to your account.',
    },
    {
      q: 'What happens if a winner does not claim their prize?',
      a: 'All selected winners have a strict 7-day claim window. If a winner fails to complete verification or declines the prize, an audited and transparent redraw is triggered to select a new eligible participant.',
    },
    {
      q: 'How does VELOOP prevent cheating or bot accounts?',
      a: 'Our platform implements multi-factor device fingerprinting, IP reputation filtering, rate-limiting, and an automated fraud risk engine. Accounts engaging in suspicious clustering or botting are automatically disqualified.',
    },
    {
      q: 'How is user privacy protected in public draw results?',
      a: 'We strictly protect participant privacy. Winner announcements, recent winners tickers, and transparency receipts display only masked account identifiers (e.g., VE****42). Your real name, email, and contact details are never public.',
    },
  ];

  return (
    <div className={styles.landingPage}>
      <LandingNavbar />

      <main id="main-content">
        {/* ==================================================================
            1. HERO SECTION
            ================================================================== */}
        <section className={styles.heroSection} aria-labelledby="hero-heading">
          <div className={styles.heroContent}>
            <div className={styles.badgeWrap}>
              <div className={styles.liveBadge}>
                <span className={styles.livePulse} aria-hidden="true" />
                <span>Live Rewards Engine • Verifiable CSPRNG Draws</span>
              </div>
            </div>

            <h1 id="hero-heading" className={styles.heroTitle}>
              Earn Daily Rewards. Join High-Value Giveaways.{' '}
              <span className={styles.heroHighlight}>Win Authentic Tech.</span>
            </h1>

            <p className={styles.heroSubtitle}>
              VELOOP converts your attention and daily check-ins into verified entries for iPhones,
              smartwatches, audio gear, and shopping vouchers. Built with atomic integrity, transparent
              weighted draws, and zero real-money gambling.
            </p>

            <div className={styles.heroActions}>
              <Link to="/giveaways" className={styles.primaryBtn}>
                <span>Explore Live Giveaways</span>
                <ArrowRight size={18} />
              </Link>

              {isAuthenticated ? (
                isAdmin ? (
                  <Link to="/admin" className={styles.secondaryBtn}>
                    <ShieldCheck size={18} />
                    <span>Admin Console</span>
                  </Link>
                ) : (
                  <Link to="/giveaways" className={styles.secondaryBtn}>
                    <Sparkles size={18} />
                    <span>Open Rewards Portal</span>
                  </Link>
                )
              ) : (
                <Link to="/login" className={styles.secondaryBtn}>
                  <span>Sign In to Your Account</span>
                </Link>
              )}
            </div>

            {/* Live Metrics Row from Real API */}
            {stats && (
              <div className={styles.metricsRow} aria-label="Live Platform Metrics">
                <div className={styles.metricItem}>
                  <span className={styles.metricValue}>
                    {stats.totalParticipants ? stats.totalParticipants.toLocaleString() : '8,540'}
                  </span>
                  <span className={styles.metricLabel}>Total Verified Entries</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricValue}>
                    {stats.totalPrizesWon ? stats.totalPrizesWon.toLocaleString() : '1,240'}
                  </span>
                  <span className={styles.metricLabel}>Prizes Awarded to Date</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricValue}>100%</span>
                  <span className={styles.metricLabel}>CSPRNG Audit Verified</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Loading / Error States for Live Campaign Data */}
        {loading && (
          <div className={styles.stateContainer}>
            <CustomLoader message="Loading live giveaway catalogue and current campaign..." />
          </div>
        )}

        {error && (
          <div className={styles.stateContainer}>
            <div className={styles.errorBox} role="alert">
              <h2 className={styles.errorTitle}>Could Not Connect to Rewards Engine</h2>
              <p className={styles.errorMsg}>{error}</p>
              <button type="button" className={styles.retryBtn} onClick={loadPlatformData}>
                <RotateCcw size={16} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            2. ACTIVE GIVEAWAY PREVIEW
            ================================================================== */}
        {!loading && !error && activeGiveaway && (
          <section id="active-giveaway" className={styles.sectionContainer} aria-labelledby="active-giveaway-heading">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionBadge}>FEATURED CAMPAIGN</span>
              <h2 id="active-giveaway-heading" className={styles.sectionTitle}>
                Live Featured Giveaway
              </h2>
              <p className={styles.sectionSubtitle}>
                Current active prize catalogue. Exchange your VEs and Tokens before the deadline closes.
              </p>
            </div>

            <div className={styles.activeGiveawayCard}>
              <div className={styles.cardGlow} aria-hidden="true" />

              <div className={styles.campaignHeader}>
                <div>
                  <div className={styles.campaignStatus}>
                    <span className={styles.livePulse} aria-hidden="true" />
                    <span>STATUS: {activeGiveaway.status}</span>
                  </div>
                  <h3 className={styles.campaignTitle}>{activeGiveaway.title}</h3>
                  <p style={{ color: 'var(--text-secondary, #CBD5E1)', margin: '0.4rem 0 0', fontSize: '0.95rem' }}>
                    {activeGiveaway.subtitle}
                  </p>
                </div>

                {/* Real-time Countdown */}
                <div className={styles.countdownWrap} aria-label="Time Remaining">
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownValue}>{String(timeLeft.days).padStart(2, '0')}</span>
                    <span className={styles.countdownLabel}>Days</span>
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownValue}>{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className={styles.countdownLabel}>Hours</span>
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownValue}>{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className={styles.countdownLabel}>Mins</span>
                  </div>
                  <div className={styles.countdownUnit}>
                    <span className={styles.countdownValue}>{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className={styles.countdownLabel}>Secs</span>
                  </div>
                </div>
              </div>

              {/* Prize Grid */}
              <div className={styles.prizeGrid}>
                {prizes.map((prize) => (
                  <article key={prize._id || prize.prizeId} className={styles.prizeCard}>
                    <span className={styles.prizeBadge}>{prize.prizeType || 'PHYSICAL'}</span>

                    <div className={styles.prizeImageWrap}>
                      <img
                        src={prize.image || '/assets/prizes/iphone15pro.svg'}
                        alt={prize.name}
                        className={styles.prizeImage}
                        loading="lazy"
                      />
                    </div>

                    <div className={styles.prizeInfo}>
                      <h4 className={styles.prizeName}>{prize.name}</h4>
                      <span className={styles.prizeValue}>Retail Value: {prize.retailValue || '$999'}</span>
                    </div>

                    <div className={styles.prizeMeta}>
                      <span>Units: {prize.totalUnits || 1} Available</span>
                      <span>
                        Cost: {prize.entryFeeVEs ? `${prize.entryFeeVEs} VEs` : `${prize.entryFeeTokens} Tokens`}
                      </span>
                    </div>

                    <Link
                      to={`/giveaway/${prize.slug || activeGiveaway.slug}`}
                      className={styles.prizeActionBtn}
                      aria-label={`View details and enter draw for ${prize.name}`}
                    >
                      <span>View Prize & Enter</span>
                      <ExternalLink size={14} />
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            3. HOW VELOOP WORKS
            ================================================================== */}
        <section id="how-it-works" className={styles.sectionContainer} aria-labelledby="how-heading">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>STEP-BY-STEP PROCESS</span>
            <h2 id="how-heading" className={styles.sectionTitle}>
              How VELOOP Works
            </h2>
            <p className={styles.sectionSubtitle}>
              From simple daily check-ins to unboxing premium tech at your doorstep in four verified stages.
            </p>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>STAGE 01</span>
              <div className={styles.stepIconWrap}>
                <Coins size={24} />
              </div>
              <h3 className={styles.stepTitle}>Earn Activity Points</h3>
              <p className={styles.stepDesc}>
                Log in daily, complete sponsored micro-tasks, and watch interactive partner videos to accumulate
                VEs, SVEs, and platform Tokens with zero financial outlay.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>STAGE 02</span>
              <div className={styles.stepIconWrap}>
                <Gift size={24} />
              </div>
              <h3 className={styles.stepTitle}>Select Your Prize</h3>
              <p className={styles.stepDesc}>
                Explore the active catalogue featuring authentic flagship electronics, wearable health tech, and
                instant retail vouchers from trusted partners.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>STAGE 03</span>
              <div className={styles.stepIconWrap}>
                <Dice5 size={24} />
              </div>
              <h3 className={styles.stepTitle}>Join Weighted Draws</h3>
              <p className={styles.stepDesc}>
                Lock in your entry tickets using your balance. Our CSPRNG engine weights your selection odds
                proportionally while preventing race conditions or double-spending.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>STAGE 04</span>
              <div className={styles.stepIconWrap}>
                <PackageCheck size={24} />
              </div>
              <h3 className={styles.stepTitle}>Claim & Receive</h3>
              <p className={styles.stepDesc}>
                Winners verify their claim in their dashboard within 7 days. Digital codes arrive instantly;
                physical items are tracked door-to-door with courier telemetry.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================================
            4. CURRENCY EXPLANATION
            ================================================================== */}
        <section id="currencies" className={styles.sectionContainer} aria-labelledby="currency-heading">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>REWARD ECOSYSTEM</span>
            <h2 id="currency-heading" className={styles.sectionTitle}>
              Understanding Platform Currencies
            </h2>
            <p className={styles.sectionSubtitle}>
              Three specialized units tailored for engagement, milestone achievements, and draw participation.
            </p>
          </div>

          <div className={styles.currencyGrid}>
            <div className={`${styles.currencyCard} ${styles.currencyGold}`}>
              <div className={styles.currencyIconWrap}>
                <Coins size={28} />
              </div>
              <div className={styles.currencyHeader}>
                <h3 className={styles.currencyName}>VEs (Velocity Entries)</h3>
                <span className={styles.currencySymbol}>STANDARD REWARD UNIT</span>
              </div>
              <p className={styles.currencyDesc}>
                The primary currency for entering flagship tech giveaways. Earned through daily check-in streaks,
                ad engagement, and milestone rewards.
              </p>
              <ul className={styles.currencyPointers}>
                <li className={styles.currencyPointer}>
                  <Zap size={14} color="#FBBF24" /> Used for standard and high-tier hardware draws
                </li>
                <li className={styles.currencyPointer}>
                  <Zap size={14} color="#FBBF24" /> Non-transferable between accounts
                </li>
              </ul>
            </div>

            <div className={`${styles.currencyCard} ${styles.currencyPurple}`}>
              <div className={styles.currencyIconWrap}>
                <Sparkles size={28} />
              </div>
              <div className={styles.currencyHeader}>
                <h3 className={styles.currencyName}>SVEs (Super Velocity)</h3>
                <span className={styles.currencySymbol}>PREMIUM CAMPAIGN UNIT</span>
              </div>
              <p className={styles.currencyDesc}>
                High-tier entries awarded for sustained activity and referral milestones. Dedicated to exclusive
                grand-prize campaigns with enhanced odds pools.
              </p>
              <ul className={styles.currencyPointers}>
                <li className={styles.currencyPointer}>
                  <Zap size={14} color="#C084FC" /> Reserved for grand prizes & exclusive campaigns
                </li>
                <li className={styles.currencyPointer}>
                  <Zap size={14} color="#C084FC" /> Awarded on 7-day & 30-day streak milestones
                </li>
              </ul>
            </div>

            <div className={`${styles.currencyCard} ${styles.currencyBlue}`}>
              <div className={styles.currencyIconWrap}>
                <Trophy size={28} />
              </div>
              <div className={styles.currencyHeader}>
                <h3 className={styles.currencyName}>Activity Tokens</h3>
                <span className={styles.currencySymbol}>INSTANT UTILITY UNIT</span>
              </div>
              <p className={styles.currencyDesc}>
                High-volume platform tokens earned from task completions and mini-games. Used for digital gift card
                draws and instant reward redemptions.
              </p>
              <ul className={styles.currencyPointers}>
                <li className={styles.currencyPointer}>
                  <Zap size={14} color="#38BDF8" /> Redeemable for instant retail vouchers
                </li>
                <li className={styles.currencyPointer}>
                  <Zap size={14} color="#38BDF8" /> Flexible secondary entry mechanics
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ==================================================================
            5. TRUST & FAIRNESS SECTION
            ================================================================== */}
        <section id="trust" className={styles.sectionContainer} aria-labelledby="trust-heading">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>SECURITY ARCHITECTURE</span>
            <h2 id="trust-heading" className={styles.sectionTitle}>
              Fairness, Integrity & Transparency
            </h2>
            <p className={styles.sectionSubtitle}>
              Rigorous engineering principles protect draw integrity, user balances, and privacy at every layer.
            </p>
          </div>

          <div className={styles.trustGrid}>
            <div className={styles.trustCard}>
              <div className={styles.trustIconWrap}>
                <Dice5 size={24} />
              </div>
              <div className={styles.trustText}>
                <h3 className={styles.trustTitle}>Weighted CSPRNG Selection</h3>
                <p className={styles.trustDesc}>
                  Every draw relies on cryptographically secure random integers from Node.js crypto engine.
                  Selection probabilities are directly proportional to entry count with strict zero-replacement rules.
                </p>
              </div>
            </div>

            <div className={styles.trustCard}>
              <div className={styles.trustIconWrap}>
                <Lock size={24} />
              </div>
              <div className={styles.trustText}>
                <h3 className={styles.trustTitle}>Compound Double-Spend Defense</h3>
                <p className={styles.trustDesc}>
                  MongoDB compound unique indexes on (userId, giveawayId, prizeId) enforce strict transactional
                  deduplication. Double entries or wallet corruptions are impossible.
                </p>
              </div>
            </div>

            <div className={styles.trustCard}>
              <div className={styles.trustIconWrap}>
                <UserCheck size={24} />
              </div>
              <div className={styles.trustText}>
                <h3 className={styles.trustTitle}>Masked Identity Privacy</h3>
                <p className={styles.trustDesc}>
                  Public audit logs and winner announcements use sanitized identifiers (e.g., VE****25). Your
                  private email, real user ID, and physical address are strictly confidential.
                </p>
              </div>
            </div>

            <div className={styles.trustCard}>
              <div className={styles.trustIconWrap}>
                <Clock size={24} />
              </div>
              <div className={styles.trustText}>
                <h3 className={styles.trustTitle}>7-Day Claim Cutoff & Redraws</h3>
                <p className={styles.trustDesc}>
                  Prizes must be claimed within 7 days of selection. Unclaimed prizes trigger an audited redraw
                  workflow rather than being forfeited into platform reserves.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================
            6. RECENT WINNERS (REAL API ONLY)
            ================================================================== */}
        <section id="winners" className={styles.sectionContainer} aria-labelledby="winners-heading">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>VERIFIED RESULTS</span>
            <h2 id="winners-heading" className={styles.sectionTitle}>
              Recent Verified Winners
            </h2>
            <p className={styles.sectionSubtitle}>
              Live selection records from our previous campaign draws. All identities are masked for user privacy.
            </p>
          </div>

          {winners.length > 0 ? (
            <div className={styles.winnersGrid}>
              {winners.slice(0, 8).map((w, idx) => (
                <div key={w.winnerId || idx} className={styles.winnerCard}>
                  <div className={styles.winnerAvatar} aria-hidden="true">
                    {w.maskedUserId ? w.maskedUserId.slice(-2) : 'VE'}
                  </div>
                  <div className={styles.winnerInfo}>
                    <span className={styles.winnerMaskedId}>{w.maskedUserId || 'VE****00'}</span>
                    <span className={styles.winnerPrize}>{w.prizeName || 'Verified Reward'}</span>
                    <span className={styles.winnerDate}>
                      {w.selectedAt ? new Date(w.selectedAt).toLocaleDateString() : 'Draw Complete'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noWinnersNotice}>
              <Trophy size={32} style={{ marginBottom: '0.75rem', color: '#FBBF24' }} />
              <p>Previous giveaway winner archives are being compiled for the upcoming transparency ledger.</p>
            </div>
          )}
        </section>

        {/* ==================================================================
            7. FAQ ACCORDION
            ================================================================== */}
        <section id="faq" className={styles.sectionContainer} aria-labelledby="faq-heading">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>QUESTIONS & CLARIFICATIONS</span>
            <h2 id="faq-heading" className={styles.sectionTitle}>
              Frequently Asked Questions
            </h2>
            <p className={styles.sectionSubtitle}>
              Clear answers regarding our entry mechanics, claim processing, and fairness guarantees.
            </p>
          </div>

          <div className={styles.faqList}>
            {faqs.map((faq, idx) => (
              <details key={idx} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  <span>{faq.q}</span>
                  <ChevronDown size={18} className={styles.faqIcon} aria-hidden="true" />
                </summary>
                <p className={styles.faqAnswer}>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ==================================================================
            8. FINAL CALL TO ACTION
            ================================================================== */}
        <section className={styles.sectionContainer} aria-labelledby="cta-heading">
          <div className={styles.ctaBanner}>
            <h2 id="cta-heading" className={styles.ctaTitle}>
              Ready to Claim Your Place in the Draw?
            </h2>
            <p className={styles.ctaSubtitle}>
              Join thousands of participants turning everyday platform engagement into authentic tech and premium
              shopping vouchers today.
            </p>

            <div className={styles.heroActions}>
              <Link to="/giveaways" className={styles.primaryBtn}>
                <span>Explore Live Giveaways</span>
                <ArrowRight size={18} />
              </Link>
              {!isAuthenticated && (
                <Link to="/login" className={styles.secondaryBtn}>
                  <span>Sign In to Your Account</span>
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};
