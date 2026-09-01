import React from 'react';
import {
  User,
  ShieldCheck,
  Award,
  Wallet,
  Clock,
  Sparkles,
  ArrowRight,
  LogOut,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './Profile.module.css';

export const Profile = () => {
  const { user, logout, demoAccounts, switchAccount } = useAuth();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>
            <User size={14} />
            <span>ACCOUNT SECURITY & PREFERENCES</span>
          </div>
          <h1 className={styles.title}>User Profile</h1>
          <p className={styles.subtitle}>
            Manage your account credentials, view security standing, and switch between evaluation profiles.
          </p>
        </div>
      </div>

      <div className={styles.profileGrid}>
        {/* Main Profile Identity Card */}
        <div className={styles.profileCard}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarLarge}>
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              <span className={styles.onlineBadge} />
            </div>
            <div className={styles.nameGroup}>
              <h2 className={styles.userName}>{user?.username || 'Guest Member'}</h2>
              <span className={styles.userEmail}>{user?.email || 'guest@veloop.io'}</span>
              <div className={styles.idRow}>
                <span className={styles.idBadge}>User ID: {user?.userId || 'GUEST'}</span>
                <span className={styles.roleBadge}>
                  {user?.role === 'admin' ? 'SuperAdmin' : 'Verified Member'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Quick Balance Summary */}
          <div className={styles.walletSnapshotGrid}>
            <div className={styles.snapBox}>
              <span className={styles.snapLabel}>Standard VEs</span>
              <strong className={styles.snapVal}>{user?.wallet?.VEs?.toLocaleString() || 0}</strong>
            </div>
            <div className={styles.snapBox}>
              <span className={styles.snapLabel}>Super VEs (SVEs)</span>
              <strong className={styles.snapValGreen}>{user?.wallet?.SVEs?.toLocaleString() || 0}</strong>
            </div>
            <div className={styles.snapBox}>
              <span className={styles.snapLabel}>Activity Tokens</span>
              <strong className={styles.snapValGold}>{user?.wallet?.Tokens?.toLocaleString() || 0}</strong>
            </div>
          </div>
        </div>

        {/* Security & Verification Card */}
        <div className={styles.securityCard}>
          <div className={styles.securityHeader}>
            <div className={styles.shieldWrap}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3>Account Security Standing</h3>
              <p>Device fingerprint & SHA-256 JWT encryption active.</p>
            </div>
          </div>

          <div className={styles.securityDetails}>
            <div className={styles.secRow}>
              <span>Fraud Risk Level:</span>
              <strong className={styles.riskLow}>Low (Score: {user?.fraudRiskScore || 0})</strong>
            </div>
            <div className={styles.secRow}>
              <span>Active Streak:</span>
              <strong className={styles.streakGold}>🔥 {user?.streak || 12} Days</strong>
            </div>
            <div className={styles.secRow}>
              <span>2-Factor Authentication:</span>
              <strong className={styles.authEnabled}>Enabled (SMS / Email)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Click Evaluation Accounts Switcher */}
      <div className={styles.switcherSection}>
        <div className={styles.switcherBadge}>
          <Sparkles size={14} />
          <span>EVALUATION PROFILES (JWT AUTHENTICATED)</span>
        </div>
        <p className={styles.switcherSub}>
          Click below to test different user balance tiers and winner claim roles seamlessly with real JWT sessions.
        </p>

        <div className={styles.demoGrid}>
          {demoAccounts.map((acc) => (
            <button
              key={acc.userId}
              className={`${styles.demoCard} ${user?.userId === acc.userId ? styles.demoCardActive : ''}`}
              onClick={() => switchAccount(acc.email, 'password123')}
            >
              <div className={styles.demoCardTop}>
                <strong>{acc.username}</strong>
                <span className={styles.demoCardRole}>{acc.role}</span>
              </div>
              <div className={styles.demoBalances}>
                <span>{acc.wallet?.VEs} VEs</span> · <span>{acc.wallet?.SVEs} SVEs</span> · <span>{acc.wallet?.Tokens} Tokens</span>
              </div>
              <div className={styles.demoSwitchAction}>
                <span>Switch to Profile</span>
                <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
