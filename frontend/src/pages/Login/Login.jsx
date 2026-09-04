import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { sanitizeReturnUrl } from '../../utils/urlSanitizer.js';
import { GoogleAuthButton } from '../../components/GoogleAuthButton/GoogleAuthButton.jsx';
import styles from './Login.module.css';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, googleLogin, loading: authLoading } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const rawReturnUrl = location.state?.from || queryParams.get('returnUrl') || '';
  const safeReturnUrl = rawReturnUrl ? sanitizeReturnUrl(rawReturnUrl, '') : '';

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isDev = import.meta.env.DEV;

  // An authenticated user opening /login must be redirected away to the intended page
  useEffect(() => {
    if (user && !authLoading) {
      const targetUrl = safeReturnUrl && safeReturnUrl !== '/login'
        ? safeReturnUrl
        : (user.role === 'admin' ? '/admin' : '/giveaways');
      navigate(targetUrl, { replace: true });
    }
  }, [user, authLoading, safeReturnUrl, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(''); // Clear previous error immediately on new attempt
    try {
      const res = await login(emailOrUsername, password);
      setErrorMsg(''); // Clear error state on success
      const targetUrl = safeReturnUrl && safeReturnUrl !== '/login'
        ? safeReturnUrl
        : (res?.user?.role === 'admin' ? '/admin' : '/giveaways');
      navigate(targetUrl, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email/username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email, defaultPassword = null) => {
    setLoading(true);
    setErrorMsg(''); // Clear previous error immediately on new attempt
    try {
      const pwd = defaultPassword || (email === 'admin@veloop.io' ? 'admin123' : 'password123');
      const res = await login(email, pwd);
      setErrorMsg(''); // Clear error state on success
      const targetUrl = safeReturnUrl && safeReturnUrl !== '/login'
        ? safeReturnUrl
        : (res?.user?.role === 'admin' ? '/admin' : '/giveaways');
      navigate(targetUrl, { replace: true });
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

          {/* 1-Click Test User Switcher for Reviewers (DEVELOPMENT / EVALUATION MODE ONLY) */}
          {isDev && (
            <div className={styles.reviewerSection}>
              <div className={styles.reviewerBadge}>
                <Sparkles size={14} aria-hidden="true" />
                <span>1-CLICK EVALUATION PROFILES (DEV ONLY)</span>
              </div>

              <div className={styles.demoButtonsGrid}>
                <button
                  type="button"
                  className={styles.demoBtnGold}
                  onClick={() => handleQuickLogin('modal.tester@example.com')}
                  disabled={loading}
                >
                  <div className={styles.demoBtnCol}>
                    <strong>Modal Tester (Fresh QA User)</strong>
                    <span>1,000 VEs · 0 Entries (Test Join Modal)</span>
                  </div>
                  <ArrowRight size={14} className={styles.demoArrow} aria-hidden="true" />
                </button>

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
                  <ArrowRight size={14} className={styles.demoArrow} aria-hidden="true" />
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
                  <ArrowRight size={14} className={styles.demoArrow} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className={styles.demoBtn}
                  onClick={() => handleQuickLogin('rohan.winner@example.com')}
                  disabled={loading}
                >
                  <div className={styles.demoBtnCol}>
                    <strong>Rohan Sharma (Winner VE10025)</strong>
                    <span>Won Apple Watch · Test Claim Form</span>
                  </div>
                  <ArrowRight size={14} className={styles.demoArrow} aria-hidden="true" />
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
                  <ArrowRight size={14} className={styles.demoArrow} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {isDev && (
            <div className={styles.divider}>
              <span>or sign in with credentials</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {errorMsg && (
              <div className={styles.errorAlert}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className={styles.label}>Email / Username / User ID</label>
              <div className={styles.inputWrap}>
                <User size={16} className={styles.inputIcon} aria-hidden="true" />
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => {
                    setEmailOrUsername(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="e.g. modal.tester@example.com"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div>
              <label className={styles.label}>Password</label>
              <div className={styles.inputWrap}>
                <Lock size={16} className={styles.inputIcon} aria-hidden="true" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter password"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-veloop-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Google Sign-In (Feature-Flagged) */}
          <GoogleAuthButton
            text="signin_with"
            onSuccess={async (credential) => {
              setLoading(true);
              setErrorMsg('');
              try {
                const res = await googleLogin(credential);
                const targetUrl = safeReturnUrl && safeReturnUrl !== '/login'
                  ? safeReturnUrl
                  : (res?.user?.role === 'admin' ? '/admin' : '/giveaways');
                navigate(targetUrl, { replace: true });
              } catch (err) {
                setErrorMsg(err.message || 'Google sign-in failed.');
              } finally {
                setLoading(false);
              }
            }}
            onError={(err) => setErrorMsg(err.message || 'Google authentication encountered an error.')}
          />

          {/* Link to Signup */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--text-muted, #94A3B8)' }}>
            <span>Don't have an account?</span>{' '}
            <Link
              to={safeReturnUrl ? `/signup?returnUrl=${encodeURIComponent(safeReturnUrl)}` : '/signup'}
              style={{ color: '#A855F7', fontWeight: 600, textDecoration: 'none' }}
            >
              Create an Account
            </Link>
          </div>

          <div className={styles.footerNote}>
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Encrypted with secure JWT sessions & device hash telemetry.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
