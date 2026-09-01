import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Share2,
  Gift,
  Award,
  Sparkles,
  TrendingUp,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext.jsx';
import { getReferrals } from '../../services/referralApi.js';
import styles from './Referrals.module.css';

export const Referrals = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralData, setReferralData] = useState({
    referralCode: user?.userId ? `VELOOP-${user.userId}` : 'VELOOP-VE10842',
    referralLink: `https://veloop.io/join?ref=VELOOP-${user?.userId || 'VE10842'}`,
    totalReferrals: 0,
    totalBonusEarned: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferralInfo = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const res = await getReferrals();
        if (res.success) {
          setReferralData({
            referralCode: res.referralCode,
            referralLink: res.referralLink,
            totalReferrals: res.totalReferrals || 0,
            totalBonusEarned: res.totalBonusEarned || 0,
          });
        }
      } catch (err) {
        // fallback to local default derived from user
      } finally {
        setLoading(false);
      }
    };
    fetchReferralInfo();
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralData.referralLink);
    setCopied(true);
    confetti({
      particleCount: 30,
      spread: 40,
      origin: { y: 0.6 },
      colors: ['#7C3AED', '#22C55E'],
    });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.badge}>
          <Users size={14} />
          <span>COMMUNITY GROWTH ENGINE</span>
        </div>
        <h1 className={styles.title}>Refer Friends & Earn</h1>
        <p className={styles.subtitle}>
          Invite friends to VELOOP Rewards. Earn +100 VEs for every friend who joins plus 10% bonus points on all their ad rewards!
        </p>
      </div>

      {/* Main Referral Card */}
      <div className={styles.referralHeroCard}>
        <div className={styles.heroGlow} />

        <div className={styles.heroGrid}>
          <div className={styles.heroLeft}>
            <span className={styles.refCardLabel}>YOUR UNIQUE INVITATION LINK</span>
            <div className={styles.copyBox}>
              <span className={styles.linkText}>{referralData.referralLink}</span>
              <button
                className={copied ? styles.copiedBtn : styles.copyBtn}
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            <p className={styles.copyNotice}>
              Your referral code: <strong className={styles.codeText}>{referralData.referralCode}</strong>
            </p>
          </div>

          <div className={styles.heroStatsCol}>
            <div className={styles.refStatCard}>
              <span className={styles.refStatLabel}>Total Referrals</span>
              <strong className={styles.refStatVal}>{referralData.totalReferrals} Friends</strong>
            </div>
            <div className={styles.refStatCard}>
              <span className={styles.refStatLabel}>Bonus Earned</span>
              <strong className={styles.refStatValGold}>+{referralData.totalBonusEarned} VEs</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Tiers & Perks */}
      <div className={styles.perksGrid}>
        <div className={styles.perkCard}>
          <div className={`${styles.perkIcon} ${styles.iconPurple}`}>
            <Gift size={24} />
          </div>
          <h3>1. Instant +100 VEs</h3>
          <p>Credited immediately to your wallet as soon as your invited friend creates an account.</p>
        </div>

        <div className={styles.perkCard}>
          <div className={`${styles.perkIcon} ${styles.iconGreen}`}>
            <TrendingUp size={24} />
          </div>
          <h3>2. 10% Ad Watch Multiplier</h3>
          <p>Earn an extra 10% recurring commission on all advertisements watched by your network.</p>
        </div>

        <div className={styles.perkCard}>
          <div className={`${styles.perkIcon} ${styles.iconGold}`}>
            <Award size={24} />
          </div>
          <h3>3. VIP Tier Status</h3>
          <p>Reach 25 referrals to unlock the exclusive Ambassador badge with 0% withdrawal fees.</p>
        </div>
      </div>
    </div>
  );
};
