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

  // Fetch real data from public endpoints; fail cleanly with zero fallback mock data
  const loadPlatformData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [giveawayRes, winnersRes] = await Promise.all([
        getCurrentGiveaway(),
        getAllPreviousWinners(),
      ]);

      if (giveawayRes && giveawayRes.success && giveawayRes.giveaway) {
        setGiveawayData(giveawayRes);
      } else {
        throw new Error('Could not retrieve active giveaway campaign data.');
      }

      if (winnersRes && winnersRes.success && Array.isArray(winnersRes.winners)) {
        setWinners(winnersRes.winners);
      } else {
        setWinners([]);
      }
    } catch (err) {
      console.error('Failed to load landing page data:', err);
      setError(err.message || 'Unable to connect to the rewards backend. Please check network status and retry.');
      setGiveawayData(null);
      setWinners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  // Real-time countdown timer directly to giveaway.endAt from API
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
  const prizes = activeGiveaway?.prizes || [];
  const validWinners = winners.filter(
    (w) => w && w.maskedUserId && w.prizeName && w.selectedAt
  );

  const faqs = [
    {
      q: 'How are giveaway winners selected?',
      a: 'Winners are chosen using a cryptographically secure pseudorandom algorithm (Node.js crypto.randomInt). Your entries directly correspond to your selection weight without replacement, ensuring proportional odds.',
    },
    {
      q: 'Do I need to spend real money to participate?',
      a: 'No. VELOOP operates on a 100% engagement-based rewards model. You earn VEs (Velocity Entries) and Tokens through platform daily check-ins, sponsored tasks, and activity with zero monetary deposits.',
    },
    {
      q: 'How do I claim my prize if I win?',
      a: 'Selected winners can review their claim notification in My Entries. Physical items require confirming your delivery address, while digital vouchers are delivered directly to your account portal.',
    },
    {
      q: 'What happens if a winner does not claim their prize within 7 days?',
      a: 'All selected winners have a strict 7-day claim window to submit required claim details and confirm receipt. Unclaimed prizes expire strictly after this 7-day period.',
    },
    {
      q: 'How does VELOOP prevent cheating or bot accounts?',
      a: 'Our platform implements multi-factor device hashing, IP reputation filtering, rate-limiting, and an automated fraud risk engine. Accounts engaging in suspicious clustering or automation are flagged and restricted.',
    },
    {
      q: 'How is user privacy protected in public draw results?',
      a: 'Winner announcements and public lists display only masked account identifiers (e.g., VE****42). Your real name, email, and private contact information are never displayed publicly.',
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
                <span>Live Rewards Platform • Weighted CSPRNG Draws</span>
              </div>
            </div>

            <h1 id="hero-heading" className={styles.heroTitle}>
              Earn Daily Rewards. Join High-Value Giveaways.{' '}
              <span className={styles.heroHighlight}>Win Authentic Tech.</span>
            </h1>

            <p className={styles.heroSubtitle}>
              VELOOP converts your attention and daily check-ins into verified entries for electronics,
              wearables, and shopping vouchers. Built with atomic balance integrity, transparent
              weighted draws, and no cash entry fee.
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
                <>
                  <Link to="/signup" className={styles.secondaryBtn}>
                    <span>Create Free Account</span>
                  </Link>
                  <Link to="/login" className={styles.secondaryBtn}>
                    <span>Sign In</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Loading / Error States for Live Campaign Data */}
        {loading && (
          <div className={styles.stateContainer}>
            <CustomLoader message="Loading active giveaway catalogue and current campaign..." />
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
            2. ACTIVE GIVEAWAY PREVIEW (DIRECT API DATA ONLY)
            ================================================================== */}
        {!loading && !error && activeGiveaway && (
          <section id="active-giveaway" className={styles.sectionContainer} aria-labelledby="active-giveaway-heading">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionBadge}>ACTIVE CAMPAIGN</span>
              <h2 id="active-giveaway-heading" className={styles.sectionTitle}>
                {activeGiveaway.title}
              </h2>
              {activeGiveaway.subtitle && (
                <p className={styles.sectionSubtitle}>{activeGiveaway.subtitle}</p>
              )}
            </div>

            <div className={styles.activeGiveawayCard}>
              <div className={styles.cardGlow} aria-hidden="true" />

              <div className={styles.campaignHeader}>
                <div>
                  <div className={styles.campaignStatus}>
                    <span className={styles.livePulse} aria-hidden="true" />
                    <span>CAMPAIGN STATUS: {activeGiveaway.status}</span>
                  </div>
                  <h3 className={styles.campaignTitle}>{activeGiveaway.title}</h3>
                  {activeGiveaway.description && (
                    <p style={{ color: 'var(--text-secondary, #CBD5E1)', margin: '0.4rem 0 0', fontSize: '0.95rem' }}>
                      {activeGiveaway.description}
                    </p>
                  )}
                </div>

                {/* Real-time Countdown from activeGiveaway.endAt */}
                <div className={styles.countdownWrap} aria-label="Time Remaining in Campaign">
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

              {/* Prize Grid (Directly from activeGiveaway.prizes) */}
              <div className={styles.prizeGrid}>
                {prizes.map((prize) => (
                  <article key={prize._id || prize.prizeId} className={styles.prizeCard}>
                    {prize.prizeType && (
                      <span className={styles.prizeBadge}>{prize.prizeType}</span>
                    )}

                    <div className={styles.prizeImageWrap}>
                      <img
                        src={prize.image || '/assets/veloop-giftbox.svg'}
                        alt={prize.name}
                        className={styles.prizeImage}
                        loading="lazy"
                      />
                    </div>

                    <div className={styles.prizeInfo}>
                      <h4 className={styles.prizeName}>{prize.name}</h4>
                      {prize.marketValue && (
                        <span className={styles.prizeValue}>Market Value: {prize.marketValue}</span>
                      )}
                    </div>

                    {(prize.winnerCount != null || (prize.entryAmount != null && prize.entryCurrency)) && (
                      <div className={styles.prizeMeta}>
                        {prize.winnerCount != null && (
                          <span>
                            {prize.winnerCount} {prize.winnerCount === 1 ? 'Prize' : 'Prizes'}
                          </span>
                        )}
                        {prize.entryAmount != null && prize.entryCurrency && (
                          <span>
                            {prize.entryAmount} {prize.entryCurrency}
                          </span>
                        )}
                      </div>
                    )}

                    {prize.slug ? (
                      <Link
                        to={`/giveaway/${prize.slug}`}
                        className={styles.prizeActionBtn}
                        aria-label={`View prize details and enter for ${prize.name}`}
                      >
                        <span>View Prize & Enter</span>
                        <ExternalLink size={14} />
                      </Link>
                    ) : (
                      <span className={styles.prizeActionDisabled} aria-disabled="true">
                        <span>Details Available in Portal</span>
                      </span>
                    )}
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
            <span className={styles.sectionBadge}>REWARDS WORKFLOW</span>
            <h2 id="how-heading" className={styles.sectionTitle}>
              How VELOOP Works
            </h2>
            <p className={styles.sectionSubtitle}>
              From simple daily check-ins to receiving verified rewards at your doorstep in four stages.
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
                Log in daily, complete sponsored tasks, and engage with platform features to accumulate
                VEs, SVEs, and platform Tokens without monetary deposits.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>STAGE 02</span>
              <div className={styles.stepIconWrap}>
                <Gift size={24} />
              </div>
              <h3 className={styles.stepTitle}>Select Your Prize</h3>
              <p className={styles.stepDesc}>
                Explore the active catalogue featuring electronics, wearable fitness tech, and
                instant retail vouchers from trusted merchants.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>STAGE 03</span>
              <div className={styles.stepIconWrap}>
                <Dice5 size={24} />
              </div>
              <h3 className={styles.stepTitle}>Join Weighted Draws</h3>
              <p className={styles.stepDesc}>
                Lock in your entry tickets using your balance. Our CSPRNG engine weights selection odds
                proportionally to verified entry counts without replacement.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>STAGE 04</span>
              <div className={styles.stepIconWrap}>
                <PackageCheck size={24} />
              </div>
              <h3 className={styles.stepTitle}>Claim & Receive</h3>
              <p className={styles.stepDesc}>
                Winners verify their claim in their dashboard within 7 days. Digital codes arrive directly;
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
            <span className={styles.sectionBadge}>CURRENCY ECOSYSTEM</span>
            <h2 id="currency-heading" className={styles.sectionTitle}>
              Understanding Platform Currencies
            </h2>
            <p className={styles.sectionSubtitle}>
              Three specialized units tailored for engagement, streak milestones, and draw participation.
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
                The primary currency for entering tech giveaways. Earned through daily check-in streaks,
                ad engagement, and milestone rewards.
              </p>
              <ul className={styles.currencyPointers}>
                <li className={styles.currencyPointer}>
                  <Zap size={14} color="#FBBF24" /> Used for standard and featured hardware draws
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
                  <Zap size={14} color="#C084FC" /> Reserved for grand prizes & special campaigns
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
                <span className={styles.currencySymbol}>UTILITY REWARD UNIT</span>
              </div>
              <p className={styles.currencyDesc}>
                Platform tokens earned from task completions and mini-games. Used for digital gift card
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
            5. TRUST & INTEGRITY ARCHITECTURE
            ================================================================== */}
        <section id="trust" className={styles.sectionContainer} aria-labelledby="trust-heading">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>SYSTEM INTEGRITY</span>
            <h2 id="trust-heading" className={styles.sectionTitle}>
              Fairness, Integrity & Transparency
            </h2>
            <p className={styles.sectionSubtitle}>
              Rigorous engineering principles protect draw mechanics, user balances, and privacy at every layer.
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
                  deduplication. Double entries or balance corruptions are blocked at the database layer.
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
                  Public winner announcements use sanitized identifiers (e.g., VE****25). Your
                  private email, real user ID, and physical address are strictly confidential.
                </p>
              </div>
            </div>

            <div className={styles.trustCard}>
              <div className={styles.trustIconWrap}>
                <Clock size={24} />
              </div>
              <div className={styles.trustText}>
                <h3 className={styles.trustTitle}>7-Day Claim Window</h3>
                <p className={styles.trustDesc}>
                  Selected winners are granted 7 days to complete delivery or voucher verification in their member portal.
                  Claims expire strictly upon reaching the 7-day cutoff.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================
            6. RECENT WINNERS (DIRECT API DATA ONLY)
            ================================================================== */}
        <section id="winners" className={styles.sectionContainer} aria-labelledby="winners-heading">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>PREVIOUS CAMPAIGNS</span>
            <h2 id="winners-heading" className={styles.sectionTitle}>
              Recent Verified Winners
            </h2>
            <p className={styles.sectionSubtitle}>
              Selection records from our previous campaign draws. All identifiers are masked for user privacy.
            </p>
          </div>

          {validWinners.length > 0 ? (
            <div className={styles.winnersGrid}>
              {validWinners.slice(0, 8).map((w, idx) => (
                <div key={w.winnerId || idx} className={styles.winnerCard}>
                  <div className={styles.winnerAvatar} aria-hidden="true">
                    {w.maskedUserId.slice(-2)}
                  </div>
                  <div className={styles.winnerInfo}>
                    <span className={styles.winnerMaskedId}>{w.maskedUserId}</span>
                    <span className={styles.winnerPrize}>{w.prizeName}</span>
                    <span className={styles.winnerDate}>
                      {new Date(w.selectedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noWinnersNotice}>
              <Trophy size={32} style={{ marginBottom: '0.75rem', color: '#FBBF24' }} />
              <p>No previous giveaway winners to display at this time.</p>
            </div>
          )}
        </section>

        {/* ==================================================================
            7. FAQ ACCORDION
            ================================================================== */}
        <section id="faq" className={styles.sectionContainer} aria-labelledby="faq-heading">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionBadge}>CLARIFICATIONS</span>
            <h2 id="faq-heading" className={styles.sectionTitle}>
              Frequently Asked Questions
            </h2>
            <p className={styles.sectionSubtitle}>
              Answers regarding our entry mechanics, claim processing, and fairness guarantees.
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
              Ready to Explore Active Giveaways?
            </h2>
            <p className={styles.ctaSubtitle}>
              Turn everyday platform engagement into tech and shopping vouchers today.
            </p>

            <div className={styles.heroActions}>
              <Link to="/giveaways" className={styles.primaryBtn}>
                <span>Explore Live Giveaways</span>
                <ArrowRight size={18} />
              </Link>
              {!isAuthenticated && (
                <>
                  <Link to="/signup" className={styles.secondaryBtn}>
                    <span>Create Account</span>
                  </Link>
                  <Link to="/login" className={styles.secondaryBtn}>
                    <span>Sign In to VELOOP</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};
