import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gift, Coins, ShieldCheck, User, LogOut, ChevronDown, Sparkles, Trophy, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './Navbar.module.css';

export const Navbar = () => {
  const { user, logout, switchAccount, demoAccounts } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className={styles.header}>
      <div className={`veloop-container ${styles.navContainer}`}>
        {/* Brand Logo */}
        <Link to="/" className={styles.brandLink}>
          <img src="/assets/veloop-logo.svg" alt="VELOOP Rewards" className={styles.brandLogo} />
        </Link>

        {/* Navigation Links */}
        <nav className={styles.navLinks}>
          <Link
            to="/"
            className={`${styles.navItem} ${isActive('/') || isActive('/giveaways') ? styles.active : ''}`}
          >
            <Gift size={16} />
            <span>Giveaways</span>
          </Link>

          {user && (
            <Link
              to="/my-entries"
              className={`${styles.navItem} ${isActive('/my-entries') ? styles.active : ''}`}
            >
              <Trophy size={16} />
              <span>My Entries</span>
            </Link>
          )}

          <Link
            to="/admin"
            className={`${styles.navItem} ${isActive('/admin') ? styles.active : ''}`}
          >
            <LayoutDashboard size={16} />
            <span>Admin Ops</span>
          </Link>
        </nav>

        {/* User Balance & Profile Widget */}
        <div className={styles.actions}>
          {user ? (
            <>
              {/* Currency Balance Chips */}
              <div className={styles.balanceGroup}>
                <div className={`${styles.balanceChip} ${styles.veChip}`} title="Virtual Earnings">
                  <span className={styles.currencyLabel}>VEs</span>
                  <span className={styles.currencyVal}>{user.wallet?.VEs?.toLocaleString() ?? 0}</span>
                </div>
                <div className={`${styles.balanceChip} ${styles.sveChip}`} title="Super Virtual Earnings">
                  <span className={styles.currencyLabel}>SVEs</span>
                  <span className={styles.currencyVal}>{user.wallet?.SVEs?.toLocaleString() ?? 0}</span>
                </div>
                <div className={`${styles.balanceChip} ${styles.tokenChip}`} title="Platform Activity Tokens">
                  <Coins size={12} className={styles.tokenIcon} />
                  <span className={styles.currencyVal}>{user.wallet?.Tokens?.toLocaleString() ?? 0}</span>
                </div>
              </div>

              {/* Profile Dropdown */}
              <div className={styles.userMenuWrapper}>
                <button
                  className={styles.userMenuBtn}
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-expanded={profileOpen}
                  aria-label="User profile and account switcher"
                >
                  <div className={styles.avatarCircle}>
                    {user.username.charAt(0)}
                  </div>
                  <div className={styles.userInfoCol}>
                    <span className={styles.userName}>{user.username}</span>
                    <span className={styles.userMaskedId}>{user.maskedId}</span>
                  </div>
                  <ChevronDown size={14} className={profileOpen ? styles.chevronOpen : styles.chevron} />
                </button>

                {profileOpen && (
                  <div className={styles.dropdownMenu}>
                    <div className={styles.dropdownHeader}>
                      <p className={styles.dropdownTitle}>Authenticated Account</p>
                      <p className={styles.dropdownEmail}>{user.email}</p>
                      <span className={styles.roleBadge}>Role: {user.role.toUpperCase()}</span>
                    </div>

                    <div className={styles.dropdownDivider} />

                    {/* Fast Demo Account Switcher for Reviewers */}
                    <div className={styles.switchSection}>
                      <p className={styles.sectionLabel}>
                        <Sparkles size={12} /> Switch Test Profile
                      </p>
                      {demoAccounts.map((acc) => (
                        <button
                          key={acc.userId}
                          className={`${styles.switchBtn} ${user.userId === acc.userId ? styles.switchBtnActive : ''}`}
                          onClick={() => {
                            switchAccount(acc.email);
                            setProfileOpen(false);
                          }}
                        >
                          <div className={styles.switchBtnRow}>
                            <span className={styles.switchName}>{acc.username}</span>
                            <span className={styles.switchVe}>{acc.wallet?.VEs} VEs</span>
                          </div>
                          <span className={styles.switchNote}>
                            {acc.userId === 'VE10842' && 'Standard User (Ample balance)'}
                            {acc.userId === 'VE10012' && 'Low Balance (120 VEs)'}
                            {acc.userId === 'VE10025' && 'Winner Account (Apple Watch)'}
                            {acc.userId === 'VE00001' && 'Administrator'}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className={styles.dropdownDivider} />

                    <button
                      className={styles.logoutBtn}
                      onClick={() => {
                        logout();
                        setProfileOpen(false);
                      }}
                    >
                      <LogOut size={14} />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="btn-veloop-primary">
              <User size={16} />
              <span>Log In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
