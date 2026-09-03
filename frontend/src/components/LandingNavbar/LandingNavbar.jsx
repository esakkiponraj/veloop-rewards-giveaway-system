import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './LandingNavbar.module.css';

export const LandingNavbar = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleBtnRef = useRef(null);
  const drawerRef = useRef(null);

  // Close drawer and restore focus to trigger button
  const handleCloseMenu = () => {
    setMobileMenuOpen(false);
    toggleBtnRef.current?.focus();
  };

  // Lock body scroll when mobile menu is open; release on close or unmount
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Trap focus (Tab and Shift+Tab) & listen for Escape key while drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const drawerEl = drawerRef.current;
    if (!drawerEl) return;

    const focusableElements = drawerEl.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first interactive link on open
    firstElement?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseMenu();
      } else if (e.key === 'Tab') {
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'Live Giveaway', href: '#active-giveaway' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Currencies', href: '#currencies' },
    { label: 'Security & Trust', href: '#trust' },
    { label: 'Winners', href: '#winners' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header className={styles.navbar} role="banner">
      <div className={styles.container}>
        {/* Brand Link */}
        <Link to="/" className={styles.brandLink} aria-label="VELOOP Rewards Home">
          <img
            src="/assets/veloop-logo.svg"
            alt="VELOOP Emblem"
            className={styles.brandLogo}
            width="38"
            height="38"
          />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>VELOOP</span>
            <span className={styles.brandTagline}>REWARDS PLATFORM</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className={styles.navMenu} aria-label="Main Navigation">
          {navLinks.map((item) => (
            <a key={item.label} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
          <Link to="/giveaways" className={styles.navLink}>
            Giveaway Hub
          </Link>
        </nav>

        {/* Action Controls */}
        <div className={styles.navActions}>
          {isAuthenticated ? (
            isAdmin ? (
              <Link to="/admin" className={styles.ctaBtn}>
                <ShieldCheck size={16} />
                <span>Admin Console</span>
              </Link>
            ) : (
              <Link to="/giveaways" className={styles.ctaBtn}>
                <Sparkles size={16} />
                <span>Open Rewards Portal</span>
              </Link>
            )
          ) : (
            <>
              <Link to="/login" className={styles.signInBtn}>
                Sign In
              </Link>
              <Link to="/signup" className={styles.signUpBtn}>
                Create Account
              </Link>
              <Link to="/giveaways" className={styles.ctaBtn}>
                <span>Explore Giveaways</span>
                <ArrowRight size={15} />
              </Link>
            </>
          )}

          {/* Mobile Hamburger Button with Ref & Controls */}
          <button
            ref={toggleBtnRef}
            type="button"
            className={styles.mobileToggle}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer with Focus Trap */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          ref={drawerRef}
          className={styles.mobileDrawer}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
        >
          <ul className={styles.mobileNavList}>
            {navLinks.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={styles.mobileNavLink}
                  onClick={handleCloseMenu}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                to="/giveaways"
                className={styles.mobileNavLink}
                onClick={handleCloseMenu}
              >
                Giveaway Hub
              </Link>
            </li>
          </ul>

          <div className={styles.mobileActions}>
            {isAuthenticated ? (
              isAdmin ? (
                <Link
                  to="/admin"
                  className={styles.ctaBtn}
                  onClick={handleCloseMenu}
                >
                  <ShieldCheck size={16} />
                  <span>Admin Console</span>
                </Link>
              ) : (
                <Link
                  to="/giveaways"
                  className={styles.ctaBtn}
                  onClick={handleCloseMenu}
                >
                  <Sparkles size={16} />
                  <span>Open Rewards Portal</span>
                </Link>
              )
            ) : (
              <>
                <Link
                  to="/login"
                  className={styles.signInBtn}
                  onClick={handleCloseMenu}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className={styles.signUpBtn}
                  onClick={handleCloseMenu}
                >
                  Create Account
                </Link>
                <Link
                  to="/giveaways"
                  className={styles.ctaBtn}
                  onClick={handleCloseMenu}
                >
                  <span>Explore Giveaways</span>
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
