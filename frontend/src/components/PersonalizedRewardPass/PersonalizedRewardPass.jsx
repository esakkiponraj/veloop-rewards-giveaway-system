import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles, CheckCircle2, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './PersonalizedRewardPass.module.css';

export const PersonalizedRewardPass = ({ totalEntries = 0, isUserParticipating = false }) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className={styles.passCardGuest}>
        <div className={styles.guestIconWrap}>
          <Sparkles size={24} className={styles.sparkle} />
        </div>
        <div className={styles.guestText}>
          <h3 className={styles.guestTitle}>Join with your VELOOP Account</h3>
          <p className={styles.guestSubtitle}>
            Log in to verify your virtual balance (VEs / SVEs), unlock exclusive giveaway entries, and track your rewards.
          </p>
        </div>
        <Link to="/login" className="btn-veloop-primary" style={{ whiteSpace: 'nowrap' }}>
          <span>Login to Participate</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.passCard}>
      {/* Decorative Gold Header Bar */}
      <div className={styles.goldHeaderBar}>
        <div className={styles.headerTitleRow}>
          <span className={styles.passLabel}>VELOOP REWARDS PASS</span>
          <span className={styles.passStatusActive}>● VERIFIED MEMBER</span>
        </div>
      </div>

      <div className={styles.passBody}>
        {/* User Identity Col */}
        <div className={styles.userProfileCol}>
          <div className={styles.avatar}>
            {user.username.charAt(0)}
          </div>
          <div>
            <h4 className={styles.memberName}>{user.username}</h4>
            <span className={styles.memberId}>{user.maskedId}</span>
          </div>
        </div>

        {/* Participation Status */}
        <div className={styles.statusCol}>
          <span className={styles.colHeader}>GIVEAWAY STATUS</span>
          {isUserParticipating ? (
            <div className={styles.participatingBadge}>
              <CheckCircle2 size={16} />
              <span>You're Participating ✓</span>
            </div>
          ) : (
            <div className={styles.notJoinedBadge}>
              <AlertCircle size={15} />
              <span>Ready to Join · Choose a Prize</span>
            </div>
          )}
        </div>

        {/* Live Wallet Balances */}
        <div className={styles.balancesCol}>
          <span className={styles.colHeader}>AVAILABLE BALANCE</span>
          <div className={styles.balancesRow}>
            <div className={styles.balanceTag}>
              <span className={styles.bLabel}>VEs</span>
              <span className={styles.bVal}>{user.wallet?.VEs?.toLocaleString()}</span>
            </div>
            <div className={styles.balanceTag}>
              <span className={styles.bLabel}>SVEs</span>
              <span className={styles.bVal}>{user.wallet?.SVEs?.toLocaleString()}</span>
            </div>
            <div className={styles.balanceTag}>
              <span className={styles.bLabel}>Tokens</span>
              <span className={styles.bVal}>{user.wallet?.Tokens?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action Link */}
        <div className={styles.actionCol}>
          <Link to="/my-entries" className={styles.entriesLink}>
            <span>View My Entries ({totalEntries})</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};
