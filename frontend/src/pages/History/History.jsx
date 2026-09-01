import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  TrendingUp,
  ArrowUpRight,
  Gift,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getTransactionHistory } from '../../services/walletApi.js';
import styles from './History.module.css';

export const History = () => {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'EARNING' | 'GIVEAWAY' | 'WITHDRAW'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistoryData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getTransactionHistory(filterType);
      if (res.success) {
        setTransactions(res.transactions || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load transaction ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [user, filterType]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>
            <HistoryIcon size={14} />
            <span>FINANCIAL AUDIT TRAIL</span>
          </div>
          <h1 className={styles.title}>Transaction History</h1>
          <p className={styles.subtitle}>
            Review real-time reward credits, giveaway entries, and payout disbursements.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterBtn} ${filterType === 'ALL' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            All Activity
          </button>
          <button
            className={`${styles.filterBtn} ${filterType === 'EARNING' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterType('EARNING')}
          >
            Earnings
          </button>
          <button
            className={`${styles.filterBtn} ${filterType === 'GIVEAWAY' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterType('GIVEAWAY')}
          >
            Giveaways
          </button>
          <button
            className={`${styles.filterBtn} ${filterType === 'WITHDRAW' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterType('WITHDRAW')}
          >
            Withdrawals
          </button>
        </div>
      </div>

      {/* Transaction Table / Card List */}
      <div className={styles.tableCard}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-slow" />
            <p style={{ marginTop: '10px' }}>Loading transaction ledger...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '20px', color: '#F87171' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <HistoryIcon size={36} style={{ opacity: 0.4, marginBottom: '10px' }} />
            <p>No transaction records found under this filter category.</p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Transaction Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Receipt Ref</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div className={styles.txTitleRow}>
                        <div
                          className={`${styles.txIconWrap} ${
                            tx.type === 'EARNING'
                              ? styles.iconGreen
                              : tx.type === 'WITHDRAW'
                              ? styles.iconBlue
                              : styles.iconPurple
                          }`}
                        >
                          {tx.type === 'EARNING' ? (
                            <TrendingUp size={16} />
                          ) : tx.type === 'WITHDRAW' ? (
                            <ArrowUpRight size={16} />
                          ) : (
                            <Gift size={16} />
                          )}
                        </div>
                        <strong>{tx.title}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={styles.categoryTag}>{tx.type}</span>
                    </td>
                    <td>
                      <strong
                        className={
                          tx.amount.startsWith('+') ? styles.amountPositive : styles.amountNegative
                        }
                      >
                        {tx.amount}
                      </strong>
                    </td>
                    <td className={styles.dateCol}>{tx.date}</td>
                    <td>
                      <span className={`badge-status badge-status-active`}>
                        ● {tx.status}
                      </span>
                    </td>
                    <td className={styles.refCol}>{tx.ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
