import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './Login.module.css';

export const Login = () => {
  const navigate = useNavigate();
  const { login, demoAccounts } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await login(emailOrUsername, password);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await login(email, 'password123');
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={`veloop-container ${styles.loginContainer}`}>
        <div className={styles.loginCard}>
          {/* Logo & Header */}
          <div className={styles.header}>
            <img src="/assets/veloop-logo.svg" alt="VELOOP Rewards" className={styles.logo} />
            <h1 className={styles.title}>Sign In to Rewards Vault</h1>
            <p className={styles.subtitle}>
              Access exclusive hardware giveaways, track live entries, and claim verified prizes.
            </p>
          </div>

          {/* 1-Click Test User Switcher for Reviewers */}
          <div className={styles.reviewerSection}>
            <div className={styles.reviewerBadge}>
              <Sparkles size={14} />
              <span>1-CLICK EVALUATION PROFILES</span>
            </div>

            <div className={styles.demoButtonsGrid}>
              <button
                type="button"
                className={styles.demoBtn}
                onClick={() => handleQuickLogin('alex.vance@example.com')}
                disabled={loading}
              >
                <div className={styles.demoBtnCol}>
                  <strong>Alex Vance (Standard User)</strong>
                  <span>850 VEs · 1,200 SVEs · 5,000 Tokens</span>
                </div>
                <ArrowRight size={14} className={styles.demoArrow} />
              </button>

              <button
                type="button"
                className={styles.demoBtn}
                onClick={() => handleQuickLogin('jordan.lee@example.com')}
                disabled={loading}
              >
                <div className={styles.demoBtnCol}>
                  <strong>Jordan Lee (Low Balance)</strong>
                  <span>120 VEs · Test Insufficient Balance state</span>
                </div>
                <ArrowRight size={14} className={styles.demoArrow} />
              </button>

              <button
                type="button"
                className={styles.demoBtnGold}
                onClick={() => handleQuickLogin('rohan.winner@example.com')}
                disabled={loading}
              >
                <div className={styles.demoBtnCol}>
                  <strong>Rohan Sharma (Winner VE10025)</strong>
                  <span>Won Apple Watch · Test Claim Form</span>
                </div>
                <ArrowRight size={14} className={styles.demoArrow} />
              </button>

              <button
                type="button"
                className={styles.demoBtn}
                onClick={() => handleQuickLogin('admin@veloop.io')}
                disabled={loading}
              >
                <div className={styles.demoBtnCol}>
                  <strong>VELOOP SuperAdmin</strong>
                  <span>Access Admin Control Portal</span>
                </div>
                <ArrowRight size={14} className={styles.demoArrow} />
              </button>
            </div>
          </div>

          <div className={styles.divider}>
            <span>or sign in with credentials</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {errorMsg && (
              <div className={styles.errorAlert}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className={styles.label}>Email / Username / User ID</label>
              <div className={styles.inputWrap}>
                <User size={16} className={styles.inputIcon} />
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="e.g. alex.vance@example.com"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div>
              <label className={styles.label}>Password</label>
              <div className={styles.inputWrap}>
                <Lock size={16} className={styles.inputIcon} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (default: password123)"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-veloop-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className={styles.footerNote}>
            <ShieldCheck size={14} />
            <span>Encrypted with SHA-256 JWT security & device hash authentication.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
