import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  Zap,
  Coins,
  History,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getWalletOverview } from '../../services/walletApi.js';
import styles from './Wallet.module.css';

export const Wallet = () => {
  const { user, updateWallet } = useAuth();
  const [stats, setStats] = useState({
    totalEarnedVEs: 0,
    totalWithdrawalsCount: 0,
    totalTransactionsCount: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWalletInfo = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const res = await getWalletOverview();
        if (res.success) {
          if (res.wallet) {
            updateWallet(res.wallet);
          }
          if (res.stats) {
            setStats(res.stats);
          }
        }
      } catch (err) {
        // fallback
      } finally {
        setLoading(false);
      }
    };
    fetchWalletInfo();
  }, []);

  const wallet = user?.wallet || { VEs: 0, SVEs: 0, Tokens: 0 };

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>
            <WalletIcon size={14} />
            <span>CENTRAL REWARDS WALLET</span>
          </div>
          <h1 className={styles.title}>Wallet & Balances</h1>
          <p className={styles.subtitle}>
            Manage your accumulated virtual currencies, review real-time transaction receipts, and initiate withdrawals.
          </p>
        </div>

        <Link to="/withdraw" className="btn-veloop-primary">
          <ArrowUpRight size={16} />
          <span>Withdraw Earnings</span>
        </Link>
      </div>

      {/* 3 Main Currency Cards Grid */}
      <div className={styles.currenciesGrid}>
        {/* Card 1: VEs (Primary Reward Currency) */}
        <div className={`${styles.currCard} ${styles.cardVE}`}>
          <div className={styles.currGlowVE} />
          <div className={styles.currTop}>
            <div className={styles.currIconWrapVE}>
              <WalletIcon size={20} />
            </div>
            <span className={styles.currTypeTag}>PRIMARY CURRENCY</span>
          </div>

          <div className={styles.currBalanceCol}>
            <span className={styles.currLabel}>Standard VEs</span>
            <strong className={styles.currVal}>
              {wallet.VEs?.toLocaleString()} <span className={styles.currUnit}>VEs</span>
            </strong>
          </div>

          <p className={styles.currNote}>
            Earned from watching ads, daily quests, and partner activities. Used for high-tier giveaways.
          </p>
        </div>

        {/* Card 2: SVEs (Super Virtual Currency) */}
        <div className={`${styles.currCard} ${styles.cardSVE}`}>
          <div className={styles.currGlowSVE} />
          <div className={styles.currTop}>
            <div className={styles.currIconWrapSVE}>
              <Zap size={20} />
            </div>
            <span className={styles.currTypeTag}>PREMIUM UTILITY</span>
          </div>

          <div className={styles.currBalanceCol}>
            <span className={styles.currLabel}>Super VEs (SVEs)</span>
            <strong className={styles.currValGreen}>
              {wallet.SVEs?.toLocaleString()} <span className={styles.currUnit}>SVEs</span>
            </strong>
          </div>

          <p className={styles.currNote}>
            Special multiplier points awarded for streak milestones. Used for AirPods and luxury electronics.
          </p>
        </div>

        {/* Card 3: Platform Tokens */}
        <div className={`${styles.currCard} ${styles.cardToken}`}>
          <div className={styles.currGlowToken} />
          <div className={styles.currTop}>
            <div className={styles.currIconWrapToken}>
              <Coins size={20} />
            </div>
            <span className={styles.currTypeTag}>ACTIVITY REWARD</span>
          </div>

          <div className={styles.currBalanceCol}>
            <span className={styles.currLabel}>Activity Tokens</span>
            <strong className={styles.currValGold}>
              {wallet.Tokens?.toLocaleString()} <span className={styles.currUnit}>Tokens</span>
            </strong>
          </div>

          <p className={styles.currNote}>
            General platform utility tokens. Redeemable for instant shopping vouchers or giveaway entries.
          </p>
        </div>
      </div>

      {/* Quick Actions & Security Banner */}
      <div className={styles.actionBannerGrid}>
        <div className={styles.securityBox}>
          <ShieldCheck size={32} className={styles.shieldIcon} />
          <div>
            <h3>100% Cryptographic Financial Integrity</h3>
            <p>
              Every entry fee deduction and reward credit is logged with an immutable SHA-256 transaction hash.
            </p>
          </div>
        </div>

        <div className={styles.quickLinksCol}>
          <Link to="/history" className={styles.quickLinkBtn}>
            <History size={16} />
            <span>View Full Transaction Ledger →</span>
          </Link>
          <Link to="/watch-ads" className={styles.quickLinkBtnGold}>
            <Zap size={16} />
            <span>Earn More VEs Now →</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
