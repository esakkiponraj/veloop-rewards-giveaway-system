import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Award, CheckCircle2 } from 'lucide-react';
import styles from './LandingFooter.module.css';

export const LandingFooter = () => {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Brand Col */}
          <div className={styles.brandCol}>
            <Link to="/" className={styles.brandLink} aria-label="VELOOP Rewards Home">
              <img
                src="/assets/veloop-logo.svg"
                alt="VELOOP Logo"
                className={styles.brandLogo}
                width="36"
                height="36"
              />
              <div>
                <div className={styles.brandTitle}>VELOOP</div>
                <div className={styles.brandSubtitle}>REWARDS & GIVEAWAYS</div>
              </div>
            </Link>
            <p className={styles.brandDesc}>
              Digital rewards and giveaway platform. Turn daily platform activity into
              entries for authentic tech, gadgets, and digital vouchers with no cash entry fee.
            </p>
            <div className={styles.statusIndicator}>
              <span>Weighted CSPRNG Engine • Transparent Prize Rules</span>
            </div>
          </div>

          {/* Platform Col */}
          <div className={styles.linkCol}>
            <h2 className={styles.colTitle}>Platform</h2>
            <ul className={styles.linkList}>
              <li>
                <Link to="/giveaways" className={styles.link}>
                  Active Giveaways
                </Link>
              </li>
              <li>
                <a href="#live-giveaway" className={styles.link}>
                  Featured Prize
                </a>
              </li>
              <li>
                <a href="#how-it-works" className={styles.link}>
                  How It Works
                </a>
              </li>
              <li>
                <a href="#currencies" className={styles.link}>
                  VEs & Tokens Guide
                </a>
              </li>
              <li>
                <Link to="/login" className={styles.link}>
                  Member Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Integrity Col */}
          <div className={styles.linkCol}>
            <h2 className={styles.colTitle}>Trust & Integrity</h2>
            <ul className={styles.linkList}>
              <li className={styles.securityItem}>
                <ShieldCheck size={16} color="#22C55E" />
                <span>Weighted CSPRNG Selection</span>
              </li>
              <li className={styles.securityItem}>
                <Lock size={16} color="#38BDF8" />
                <span>Compound Double-Spend Defense</span>
              </li>
              <li className={styles.securityItem}>
                <Award size={16} color="#FBBF24" />
                <span>Masked Identity Privacy</span>
              </li>
              <li className={styles.securityItem}>
                <CheckCircle2 size={16} color="#A855F7" />
                <span>Strict 7-Day Claim Cutoff</span>
              </li>
            </ul>
          </div>

          {/* Rules & Compliance Col */}
          <div className={styles.linkCol}>
            <h2 className={styles.colTitle}>Compliance</h2>
            <ul className={styles.linkList}>
              <li>
                <a href="#faq" className={styles.link}>
                  Frequently Asked Questions
                </a>
              </li>
              <li>
                <a href="#security" className={styles.link}>
                  Platform Integrity Policy
                </a>
              </li>
              <li>
                <a href="#live-giveaway" className={styles.link}>
                  Campaign Rules & Deadlines
                </a>
              </li>
              <li className={styles.securityItem}>
                <span>No Purchase Necessary</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} VELOOP Rewards. All rights reserved. No cash entry fee.
          </p>
          <div className={styles.bottomLegal}>
            <span>Engagement-Based Rewards</span>
            <span>•</span>
            <span>Privacy Preserved</span>
            <span>•</span>
            <span>Auditable State Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
