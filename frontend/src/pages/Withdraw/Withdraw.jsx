import React, { useState } from 'react';
import {
  ArrowUpRight,
  ShieldCheck,
  Building,
  CreditCard,
  Gift,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { requestWithdrawal } from '../../services/walletApi.js';
import styles from './Withdraw.module.css';

export const Withdraw = () => {
  const { user, updateWallet } = useAuth();

  const [payoutMethod, setPayoutMethod] = useState('UPI'); // 'UPI' | 'BANK' | 'AMAZON'
  const [amount, setAmount] = useState('500');
  const [accountDetail, setAccountDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);
  const [errorNotice, setErrorNotice] = useState(null);

  const currentVEBalance = user?.wallet?.VEs || 0;
  const numAmount = parseInt(amount, 10) || 0;

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setErrorNotice(null);
    setSuccessNotice(null);

    if (numAmount < 100) {
      setErrorNotice('Minimum withdrawal threshold is 100 VEs.');
      return;
    }

    if (numAmount > currentVEBalance) {
      setErrorNotice(`Insufficient VEs. You currently have ${currentVEBalance} VEs.`);
      return;
    }

    if (!accountDetail.trim()) {
      setErrorNotice('Please enter valid payout account / ID details.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await requestWithdrawal({
        amount: numAmount,
        payoutMethod,
        accountDetail: accountDetail.trim(),
      });

      if (res.success) {
        if (res.wallet) {
          updateWallet(res.wallet);
        }

        setSuccessNotice({
          amount: numAmount,
          method: payoutMethod,
          refId: res.withdrawal?.withdrawalId || `WTH-${Date.now().toString().slice(-6)}`,
        });
        setAccountDetail('');
      }
    } catch (err) {
      setErrorNotice(err.message || 'Withdrawal processing failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div>
          <div className={styles.badge}>
            <ShieldCheck size={14} />
            <span>SECURE PAYOUT GATEWAY</span>
          </div>
          <h1 className={styles.title}>Withdraw Earnings</h1>
          <p className={styles.subtitle}>
            Transfer your earned reward balance directly to your verified bank account, UPI ID, or instant Amazon voucher.
          </p>
        </div>
      </div>

      <div className={styles.withdrawGrid}>
        {/* Left Form Column */}
        <div className={styles.formCard}>
          <form onSubmit={handleWithdrawSubmit} className={styles.form}>
            {/* Payout Method Selector */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Select Payout Channel</label>
              <div className={styles.methodSelector}>
                <button
                  type="button"
                  className={`${styles.methodBtn} ${payoutMethod === 'UPI' ? styles.methodBtnActive : ''}`}
                  onClick={() => setPayoutMethod('UPI')}
                >
                  <CreditCard size={18} />
                  <span>Instant UPI</span>
                </button>

                <button
                  type="button"
                  className={`${styles.methodBtn} ${payoutMethod === 'BANK' ? styles.methodBtnActive : ''}`}
                  onClick={() => setPayoutMethod('BANK')}
                >
                  <Building size={18} />
                  <span>Bank NEFT/IMPS</span>
                </button>

                <button
                  type="button"
                  className={`${styles.methodBtn} ${payoutMethod === 'AMAZON' ? styles.methodBtnActive : ''}`}
                  onClick={() => setPayoutMethod('AMAZON')}
                >
                  <Gift size={18} />
                  <span>Amazon Voucher</span>
                </button>
              </div>
            </div>

            {/* Amount Field */}
            <div className={styles.fieldGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Withdrawal Amount (VEs)</label>
                <span className={styles.balanceHelper}>
                  Available: <strong>{currentVEBalance.toLocaleString()} VEs</strong>
                </span>
              </div>
              <div className={styles.amountInputWrap}>
                <input
                  type="number"
                  min="100"
                  max={currentVEBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={styles.amountInput}
                  placeholder="Enter VEs amount"
                  required
                />
                <span className={styles.currencyTag}>VEs</span>
              </div>
              <div className={styles.quickPillsRow}>
                {['100', '200', '500', '1000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={styles.presetPill}
                    onClick={() => setAmount(preset)}
                  >
                    {preset} VEs
                  </button>
                ))}
              </div>
            </div>

            {/* Account Detail Field */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                {payoutMethod === 'UPI' && 'Enter UPI Virtual Payment Address (VPA)'}
                {payoutMethod === 'BANK' && 'Enter Account Number & IFSC Code'}
                {payoutMethod === 'AMAZON' && 'Enter Recipient Email Address'}
              </label>
              <input
                type="text"
                value={accountDetail}
                onChange={(e) => setAccountDetail(e.target.value)}
                placeholder={
                  payoutMethod === 'UPI'
                    ? 'e.g. yourname@oksbi / 9876543210@paytm'
                    : payoutMethod === 'BANK'
                    ? 'e.g. 501002348910 (IFSC: HDFC0001234)'
                    : 'e.g. alex.vance@example.com'
                }
                className={styles.textInput}
                required
              />
            </div>

            {/* Notifications */}
            {errorNotice && (
              <div className={styles.errorBox}>
                <AlertCircle size={16} />
                <span>{errorNotice}</span>
              </div>
            )}

            {successNotice && (
              <div className={styles.successBox}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>Payout Initiated! Ref #{successNotice.refId}</strong>
                  <p>
                    {successNotice.amount} VEs scheduled for dispatch via {successNotice.method}.
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-veloop-primary"
              style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
              disabled={isSubmitting || currentVEBalance < 100}
            >
              <ArrowUpRight size={18} />
              <span>{isSubmitting ? 'Processing Payout...' : 'Confirm & Request Payout'}</span>
            </button>
          </form>
        </div>

        {/* Right Info Column */}
        <div className={styles.infoCol}>
          <div className={styles.trustCard}>
            <div className={styles.trustIconWrap}>
              <Lock size={20} />
            </div>
            <h3>Financial Security Policy</h3>
            <ul className={styles.trustList}>
              <li>⚡ <strong>Zero Platform Commission:</strong> 100% of your earnings are delivered.</li>
              <li>🛡️ <strong>Instant UPI Dispatch:</strong> UPI transfers settle in 5–15 minutes.</li>
              <li>🔒 <strong>Bank Grade Encryption:</strong> All account credentials are encrypted with AES-256.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
