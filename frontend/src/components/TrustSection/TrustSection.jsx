import React from 'react';
import { ShieldCheck, Lock, Award, Headphones, CheckCircle2 } from 'lucide-react';
import styles from './TrustSection.module.css';

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    title: '100% Fair & Transparent',
    description:
      'All giveaway entries are auditable, and winner selections are generated using cryptographically verified randomness with public masked IDs.',
    color: '#34d399',
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    icon: Lock,
    title: 'Anti-Abuse & Wallet Security',
    description:
      'Our dedicated fraud prevention engine detects robotic burst velocity and multi-account device clustering, preserving fair odds for genuine users.',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.15)',
  },
  {
    icon: Award,
    title: 'Authentic Official Rewards',
    description:
      'All hardware rewards (iPhone 15 Pro, Apple Watch, AirPods) include full 1-year brand warranty. Zero hidden shipping or handling fees.',
    color: '#fbbf24',
    bgColor: 'rgba(245, 158, 11, 0.15)',
  },
  {
    icon: Headphones,
    title: '24/7 Rewards Concierge',
    description:
      'Our dedicated platform support team assists with balance inquiries, entry verification, and expedited door-to-door reward fulfillment.',
    color: '#c084fc',
    bgColor: 'rgba(139, 92, 246, 0.15)',
  },
];

export const TrustSection = () => {
  return (
    <section className={styles.section} id="trust-section">
      <div className={`veloop-container ${styles.container}`}>
        <div className={styles.header}>
          <span className={styles.badge}>TRANSPARENCY & INTEGRITY</span>
          <h2 className={styles.title}>Engineered for Trust & Fair Play</h2>
          <p className={styles.subtitle}>
            VELOOP Rewards operates under strict financial integrity guidelines. Every entry is atomically logged to your wallet history.
          </p>
        </div>

        <div className={styles.grid}>
          {TRUST_PILLARS.map((pillar, idx) => {
            const IconComp = pillar.icon;
            return (
              <div key={idx} className={styles.card}>
                <div
                  className={styles.iconWrap}
                  style={{ background: pillar.bgColor, color: pillar.color }}
                >
                  <IconComp size={24} />
                </div>
                <h3 className={styles.cardTitle}>{pillar.title}</h3>
                <p className={styles.cardDesc}>{pillar.description}</p>
                <div className={styles.verifiedRow}>
                  <CheckCircle2 size={13} style={{ color: pillar.color }} />
                  <span>Platform Standard</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
