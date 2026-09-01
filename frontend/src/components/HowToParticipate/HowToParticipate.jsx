import React from 'react';
import { UserCheck, CheckSquare, Ticket, Trophy, ArrowRight } from 'lucide-react';
import styles from './HowToParticipate.module.css';

const STEPS = [
  {
    stepNum: '01',
    title: 'Sign Up / Login',
    desc: 'Create or sign in to your verified VELOOP account to access the rewards vault.',
    icon: UserCheck,
    color: '#8b5cf6',
  },
  {
    stepNum: '02',
    title: 'Earn & Check Balance',
    desc: 'Complete daily tasks & milestone activities to collect VEs, SVEs, and platform Tokens.',
    icon: CheckSquare,
    color: '#38bdf8',
  },
  {
    stepNum: '03',
    title: 'Confirm Your Entry',
    desc: 'Select your preferred prize, review the transparent rules, and confirm your entry fee.',
    icon: Ticket,
    color: '#fbbf24',
  },
  {
    stepNum: '04',
    title: 'Win & Claim Prize',
    desc: 'Winners are selected server-side and receive instant voucher codes or doorstep delivery.',
    icon: Trophy,
    color: '#10b981',
  },
];

export const HowToParticipate = () => {
  return (
    <section className={styles.section} id="how-it-works">
      <div className={`veloop-container ${styles.container}`}>
        <div className={styles.header}>
          <span className={styles.sectionBadge}>SIMPLE 4-STEP PROCESS</span>
          <h2 className={styles.sectionTitle}>How to Participate & Win</h2>
          <p className={styles.sectionSubtitle}>
            Our transparent reward mechanics ensure fair winner selection with zero hidden participation costs.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          {STEPS.map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <div key={step.stepNum} className={styles.stepCard}>
                <div className={styles.cardHeader}>
                  <div
                    className={styles.iconWrapper}
                    style={{
                      background: `${step.color}20`,
                      borderColor: `${step.color}40`,
                      color: step.color,
                    }}
                  >
                    <IconComponent size={22} />
                  </div>
                  <span className={styles.stepNumber}>{step.stepNum}</span>
                </div>

                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>

                {idx < STEPS.length - 1 && (
                  <div className={styles.connectorArrow}>
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
