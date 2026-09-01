import React, { useState } from 'react';
import { ChevronDown, BookOpen, ShieldAlert, FileText, AlertTriangle } from 'lucide-react';
import styles from './GiveawayRules.module.css';

export const GiveawayRules = ({ rules = [], terms = [] }) => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const defaultRules = [
    {
      title: 'Eligibility & Identity Verification',
      description:
        'All participants must maintain a verified VELOOP Rewards account with a confirmed mobile number or email. One participant account is permitted per natural individual.',
    },
    {
      title: 'Single Participation Per Event Rule',
      description:
        'A user is permitted exactly one entry per giveaway event. Multiple join attempts are blocked by database-level compound unique constraints.',
    },
    {
      title: 'Virtual Currency Deductions & Integrity',
      description:
        'Entry requirements (VEs, SVEs, or Tokens) are verified server-side against the authoritative wallet record and deducted atomically before participation confirmation.',
    },
    {
      title: 'Winner Selection & Claim Window',
      description:
        'Winners are drawn after the countdown reaches zero using cryptographic random distribution. Winners must submit their claim fulfillment details within 7 calendar days.',
    },
    {
      title: 'Anti-Abuse & Disqualification Policy',
      description:
        'Accounts exhibiting robotic velocity, multi-account device clustering, or spoofed request payloads are automatically flagged and excluded from winner eligibility.',
    },
  ];

  const ruleItems = rules.length > 0 ? rules : defaultRules;

  return (
    <section className={styles.rulesSection} id="rules-section">
      <div className={`veloop-container ${styles.container}`}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <BookOpen size={14} />
            <span>OFFICIAL GUIDELINES</span>
          </div>
          <h2 className={styles.title}>Giveaway Rules & Guidelines</h2>
          <p className={styles.subtitle}>
            Please review our platform participation policies to ensure a smooth and verified rewards experience.
          </p>
        </div>

        <div className={styles.accordionList}>
          {ruleItems.map((rule, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className={`${styles.accordionItem} ${isOpen ? styles.itemOpen : ''}`}>
                <button
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion(idx)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.ruleTitle}>
                    <FileText size={16} className={styles.ruleIcon} />
                    {rule.title}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isOpen ? styles.chevronRotated : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className={styles.accordionBody}>
                    <p className={styles.ruleDesc}>{rule.description || rule.content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.disclaimerNote}>
          <AlertTriangle size={16} className={styles.alertIcon} />
          <span>
            Notice: All reward balances (VEs / SVEs / Tokens) are internal platform utility units and represent promotional loyalty rewards.
          </span>
        </div>
      </div>
    </section>
  );
};
