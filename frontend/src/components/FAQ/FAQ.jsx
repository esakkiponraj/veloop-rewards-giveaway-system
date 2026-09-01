import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import styles from './FAQ.module.css';

export const FAQ = ({ faqList = [] }) => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const defaultFAQ = [
    {
      question: 'How do I participate in a giveaway?',
      answer:
        'Select any prize card from the giveaway home page to view its full details page. Review the exact entry fee and rules, then click "Join for X VEs". After confirming in the modal, your virtual balance is deducted and your entry is locked in.',
    },
    {
      question: 'How are winners selected?',
      answer:
        'Winners are drawn server-side using cryptographically secure random distribution upon giveaway conclusion. The selection process is audited and immutable.',
    },
    {
      question: 'When are winners announced?',
      answer:
        'Winners are finalized and announced on the Winners tab immediately after the giveaway countdown reaches zero. Winning accounts will also see a claim banner on their dashboard.',
    },
    {
      question: 'How do I claim my prize if I win?',
      answer:
        'When logged into your winning account, click "Claim Your Prize". Physical rewards (iPhone, Watch, AirPods) require shipping address details. Amazon gift cards require only your verified email address.',
    },
    {
      question: 'Can I enter more than once?',
      answer:
        'No, each user account is limited to exactly one participation per giveaway event to ensure fair odds for everyone. Duplicate submissions are automatically prevented.',
    },
    {
      question: 'What happens if I have insufficient balance?',
      answer:
        'The prize details page will display "Insufficient Balance" and show the exact deficit. You can complete more tasks and platform activities on VELOOP to earn the remaining required balance.',
    },
  ];

  const items = faqList.length > 0 ? faqList : defaultFAQ;

  return (
    <section className={styles.faqSection} id="faq-section">
      <div className={`veloop-container ${styles.container}`}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <HelpCircle size={14} />
            <span>GOT QUESTIONS?</span>
          </div>
          <h2 className={styles.title}>Frequently Asked Questions</h2>
          <p className={styles.subtitle}>
            Everything you need to know about VELOOP giveaways, entry fees, winner draws, and fulfillment.
          </p>
        </div>

        <div className={styles.accordionList}>
          {items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className={`${styles.accordionItem} ${isOpen ? styles.itemOpen : ''}`}>
                <button
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion(idx)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.questionText}>{item.question}</span>
                  <ChevronDown
                    size={16}
                    className={`${styles.chevron} ${isOpen ? styles.chevronRotated : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className={styles.accordionBody}>
                    <p className={styles.answerText}>{item.answer}</p>
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
