import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Gift, ArrowRight, CheckCircle2, Ticket } from 'lucide-react';
import { getMyEntries } from '../../services/giveawayApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { CustomLoader } from '../../components/CustomLoader/CustomLoader.jsx';
import { PrizeClaimModal } from '../../components/PrizeClaimModal/PrizeClaimModal.jsx';
import styles from './MyEntries.module.css';

export const MyEntries = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaimRecord, setSelectedClaimRecord] = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  const fetchEntries = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getMyEntries();
      if (res.success) {
        setEntries(res.entries || []);
      }
    } catch (err) {
      console.error('Failed to load user entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  if (!user) {
    return (
      <div className={`veloop-container ${styles.guestWrapper}`}>
        <div className={styles.guestCard}>
          <Ticket size={48} className={styles.guestIcon} />
          <h2>Login to View Your Entries</h2>
          <p>Please log in to your VELOOP Rewards account to access your giveaway entries and claim prizes.</p>
          <Link to="/login" className="btn-veloop-primary">
            <span>Log In</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <CustomLoader message="Loading your participation history and prize claims..." />;
  }

  return (
    <div className={styles.entriesPage}>
      <div className={`veloop-container ${styles.container}`}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.badge}>
              <Ticket size={14} />
              <span>PARTICIPATION DASHBOARD</span>
            </div>
            <h1 className={styles.title}>My Giveaway Entries</h1>
            <p className={styles.subtitle}>
              Track your confirmed entries, verify transaction IDs, and claim won prizes.
            </p>
          </div>
          <div className={styles.statsChip}>
            <span>Active Entries: <strong>{entries.length}</strong></span>
          </div>
        </div>

        {/* Entries Grid or Empty State */}
        {entries.length === 0 ? (
          <div className={styles.emptyCard}>
            <Gift size={48} className={styles.emptyIcon} />
            <h3>No Active Participations Yet</h3>
            <p>You haven't joined any giveaways yet. Explore our featured prizes and use your VEs/SVEs balance to participate!</p>
            <Link to="/" className="btn-veloop-primary">
              <span>Explore Giveaways</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className={styles.entriesGrid}>
            {entries.map((entry) => (
              <div key={entry.participationId} className={styles.entryCard}>
                {/* Top Status */}
                <div className={styles.cardTop}>
                  <span className={styles.eventTitle}>{entry.giveawayTitle}</span>
                  <span className={`badge-status badge-status-${entry.giveawayStatus.toLowerCase()}`}>
                    ● {entry.giveawayStatus}
                  </span>
                </div>

                {/* Prize Info Row */}
                <div className={styles.prizeRow}>
                  <img src={entry.prizeImage} alt={entry.prizeName} className={styles.prizeImg} />
                  <div className={styles.prizeDetails}>
                    <h3 className={styles.prizeName}>{entry.prizeName}</h3>
                    <span className={styles.entryCostTag}>
                      Fee: -{entry.entryAmount} {entry.entryCurrency}
                    </span>
                  </div>
                </div>

                {/* Meta Details */}
                <div className={styles.metaBox}>
                  <div className={styles.metaRow}>
                    <span>Entries Allocated:</span>
                    <strong style={{ color: 'var(--brand-gold)' }}>{entry.entryCount || 1} Entry</strong>
                  </div>
                  <div className={styles.metaRow}>
                    <span>Transaction ID:</span>
                    <strong className={styles.monoTxn}>{entry.transactionId}</strong>
                  </div>
                  <div className={styles.metaRow}>
                    <span>Joined Date:</span>
                    <span>{new Date(entry.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Winner / Non-Winner Status Block */}
                {entry.isWinner ? (
                  <div className={styles.winnerAlertBox}>
                    <div className={styles.winnerAlertHeader}>
                      <Trophy size={18} className={styles.trophyGold} />
                      <span className={styles.winnerAlertTitle}>Winner Confirmed! 🎉</span>
                    </div>
                    <p className={styles.winnerAlertDesc}>
                      Congratulations! Your entry was officially selected.
                    </p>
                    <button
                      className="btn-veloop-gold"
                      style={{ width: '100%', marginTop: '6px' }}
                      onClick={() => {
                        setSelectedClaimRecord(entry.winnerRecord);
                        setClaimModalOpen(true);
                      }}
                    >
                      {entry.claimRecord ? 'View Claim Status' : 'Claim Your Prize →'}
                    </button>
                  </div>
                ) : entry.giveawayStatus === 'ENDED' ? (
                  <div className={styles.endedNonWinnerBox}>
                    <p>Giveaway ended. Thanks for participating! Look out for our next major draw.</p>
                  </div>
                ) : (
                  <div className={styles.activeDrawBox}>
                    <CheckCircle2 size={16} className={styles.checkIcon} />
                    <span>Sealed in Active Draw Pool</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prize Claim Modal */}
      <PrizeClaimModal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        winnerRecord={selectedClaimRecord}
        onClaimSubmitted={() => fetchEntries()}
      />
    </div>
  );
};
