import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import styles from './AuthLayout.module.css';

export const AuthLayout = ({ children }) => {
  return (
    <div className={styles.authContainer}>
      {/* Background ambient glow */}
      <div className={styles.bgGlowTop} aria-hidden="true" />
      <div className={styles.bgGlowBottom} aria-hidden="true" />

      {/* Header with Brand Logo & Back to Home */}
      <header className={styles.authHeader}>
        <Link to="/" className={styles.brandLink} aria-label="VELOOP Rewards Home">
          <img
            src="/assets/veloop-logo.svg"
            alt="VELOOP Logo"
            className={styles.brandLogo}
            width="36"
            height="36"
          />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>VELOOP</span>
            <span className={styles.brandTagline}>REWARDS PLATFORM</span>
          </div>
        </Link>

        <Link to="/giveaways" className={styles.backLink}>
          <Sparkles size={16} />
          <span>Explore Giveaways</span>
        </Link>
      </header>

      {/* Main Content Card (Login or Signup rendered here) */}
      <main className={styles.authMain}>
        <div className={styles.authCard}>
          {children || <Outlet />}
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.authFooter}>
        <div className={styles.footerNotice}>
          <span>Weighted Random Selection</span>
          <span>•</span>
          <span>Privacy Preserved</span>
          <span>•</span>
          <span>Zero Real-Money Gambling</span>
        </div>
        <p className={styles.copyright}>
          &copy; {new Date().getFullYear()} VELOOP Rewards. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
