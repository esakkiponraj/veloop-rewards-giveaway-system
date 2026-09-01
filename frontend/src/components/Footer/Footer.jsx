import React from 'react';
import { ShieldCheck, Lock, Award, Headphones, Heart } from 'lucide-react';
import styles from './Footer.module.css';

export const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={`veloop-container ${styles.footerContent}`}>
        <div className={styles.topRow}>
          <div className={styles.brandCol}>
            <img src="/assets/veloop-logo.svg" alt="VELOOP Rewards" className={styles.footerLogo} />
            <p className={styles.tagline}>
              Exclusive, transparent giveaways and hardware reward distribution engine for verified VELOOP platform members.
            </p>
            <div className={styles.trustBadges}>
              <span className={styles.trustPill}><ShieldCheck size={14} /> 100% Verified Draws</span>
              <span className={styles.trustPill}><Lock size={14} /> Anti-Abuse Protected</span>
              <span className={styles.trustPill}><Award size={14} /> Official Brand Warranty</span>
            </div>
          </div>

          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Giveaway Links</h4>
            <ul className={styles.linksList}>
              <li><a href="#prizes">Featured Prizes</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#winners-section">Recent Winners</a></li>
              <li><a href="#rules-section">Official Rules & T&C</a></li>
              <li><a href="#faq-section">Frequently Asked Questions</a></li>
            </ul>
          </div>

          <div className={styles.supportCol}>
            <h4 className={styles.colTitle}>Rewards Concierge</h4>
            <p className={styles.supportText}>
              Need assistance with your entry, balance verification, or prize claim dispatch?
            </p>
            <a href="mailto:support@veloop.io" className="btn-veloop-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <Headphones size={15} />
              <span>support@veloop.io</span>
            </a>
          </div>
        </div>

        <div className={styles.bottomDivider} />

        <div className={styles.bottomRow}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} VELOOP Rewards. Built for VELOOP Internship Evaluation. All rights reserved.
          </p>
          <p className={styles.disclaimer}>
            Apple, Amazon, and respective brand logos are trademarks of their respective owners. No endorsement implied.
          </p>
        </div>
      </div>
    </footer>
  );
};
