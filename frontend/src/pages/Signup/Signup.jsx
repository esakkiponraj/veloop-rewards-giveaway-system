import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Lock, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { sanitizeReturnUrl } from '../../utils/urlSanitizer.js';
import { GoogleAuthButton } from '../../components/GoogleAuthButton/GoogleAuthButton.jsx';
import styles from './Signup.module.css';

export const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, register, googleLogin, loading: authLoading } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const rawReturnUrl = location.state?.from || queryParams.get('returnUrl') || '';
  const safeReturnUrl = rawReturnUrl ? sanitizeReturnUrl(rawReturnUrl, '') : '';

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already authenticated, redirect away
  useEffect(() => {
    if (user && !authLoading) {
      const targetUrl = safeReturnUrl && safeReturnUrl !== '/signup'
        ? safeReturnUrl
        : (user.role === 'admin' ? '/admin' : '/giveaways');
      navigate(targetUrl, { replace: true });
    }
  }, [user, authLoading, safeReturnUrl, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Frontend validation
    const trimmedUsername = formData.username.trim();
    const normalizedEmail = formData.email.toLowerCase().trim();

    if (!trimmedUsername || !normalizedEmail || !formData.password) {
      setErrorMsg('Username, email, and password are required.');
      return;
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setErrorMsg('Username must be between 3 and 30 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(trimmedUsername)) {
      setErrorMsg('Username may only contain letters, numbers, underscores, and periods.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    // Enforce 72-byte safe limit for bcrypt
    if (new TextEncoder().encode(formData.password).length > 72) {
      setErrorMsg('Password must not exceed 72 bytes.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!formData.acceptTerms) {
      setErrorMsg('You must agree to the platform rules and terms to register.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: formData.name.trim(),
        username: trimmedUsername,
        email: normalizedEmail,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        acceptTerms: formData.acceptTerms,
      });

      const targetUrl = safeReturnUrl && safeReturnUrl !== '/signup'
        ? safeReturnUrl
        : (res?.user?.role === 'admin' ? '/admin' : '/giveaways');
      navigate(targetUrl, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await googleLogin(credential);
      const targetUrl = safeReturnUrl && safeReturnUrl !== '/signup'
        ? safeReturnUrl
        : (res?.user?.role === 'admin' ? '/admin' : '/giveaways');
      navigate(targetUrl, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Google sign-up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signupContainer}>
      <div className={styles.header}>
        <div className={styles.badge}>
          <Sparkles size={14} color="#A855F7" />
          <span>JOIN VELOOP REWARDS</span>
        </div>
        <h1 className={styles.title}>Create Your Account</h1>
        <p className={styles.subtitle}>
          Turn daily activity and check-ins into verified entries for electronics and digital gift cards.
        </p>
      </div>

      {errorMsg && (
        <div className={styles.errorAlert} role="alert">
          <AlertCircle size={18} className={styles.errorIcon} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Google Sign-up (Feature-Flagged) */}
      <GoogleAuthButton
        text="signup_with"
        onSuccess={handleGoogleSuccess}
        onError={(err) => setErrorMsg(err.message || 'Google authentication failed.')}
      />

      <div className={styles.divider}>
        <span>OR REGISTER WITH EMAIL</span>
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        {/* Full Name */}
        <div className={styles.formGroup}>
          <label htmlFor="signup-name" className={styles.label}>
            Full Name (Optional)
          </label>
          <div className={styles.inputWrap}>
            <User size={18} className={styles.inputIcon} />
            <input
              id="signup-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Alex Vance"
              className={styles.input}
              disabled={loading}
              autoComplete="name"
            />
          </div>
        </div>

        {/* Username */}
        <div className={styles.formGroup}>
          <label htmlFor="signup-username" className={styles.label}>
            Username <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.atSymbol}>@</span>
            <input
              id="signup-username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="unique_username"
              className={styles.input}
              disabled={loading}
              required
              autoComplete="username"
            />
          </div>
          <span className={styles.fieldHint}>3–30 characters, letters, numbers, or underscores</span>
        </div>

        {/* Email */}
        <div className={styles.formGroup}>
          <label htmlFor="signup-email" className={styles.label}>
            Email Address <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <Mail size={18} className={styles.inputIcon} />
            <input
              id="signup-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className={styles.input}
              disabled={loading}
              required
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className={styles.formGroup}>
          <label htmlFor="signup-password" className={styles.label}>
            Password <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              id="signup-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              className={styles.input}
              disabled={loading}
              required
              autoComplete="new-password"
            />
          </div>
          <span className={styles.fieldHint}>Minimum 8 characters</span>
        </div>

        {/* Confirm Password */}
        <div className={styles.formGroup}>
          <label htmlFor="signup-confirm-password" className={styles.label}>
            Confirm Password <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputWrap}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              id="signup-confirm-password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              className={styles.input}
              disabled={loading}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Terms & Rules Checkbox */}
        <div className={styles.termsRow}>
          <input
            id="signup-terms"
            type="checkbox"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleChange}
            className={styles.checkbox}
            disabled={loading}
            required
          />
          <label htmlFor="signup-terms" className={styles.termsLabel}>
            I accept the <a href="#trust" className={styles.termsLink}>Platform Rules</a> and confirm
            I understand VELOOP uses an engagement-based reward system with zero real-money deposits.
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} className={styles.spinner} />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Switch to Sign In */}
      <div className={styles.footerLinkWrap}>
        <span>Already have an account?</span>{' '}
        <Link
          to={safeReturnUrl ? `/login?returnUrl=${encodeURIComponent(safeReturnUrl)}` : '/login'}
          className={styles.signinLink}
        >
          Sign In
        </Link>
      </div>
    </div>
  );
};
