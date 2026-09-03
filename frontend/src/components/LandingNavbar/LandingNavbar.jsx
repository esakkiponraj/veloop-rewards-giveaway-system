import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './LandingNavbar.module.css';

export const LandingNavbar = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close drawer on ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
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
              <Link to="/giveaways" className={styles.ctaBtn}>
                <span>Explore Giveaways</span>
                <ArrowRight size={15} />
              </Link>
            </>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className={styles.mobileToggle}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawer} role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <ul className={styles.mobileNavList}>
            {navLinks.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={styles.mobileNavLink}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                to="/giveaways"
                className={styles.mobileNavLink}
                onClick={() => setMobileMenuOpen(false)}
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
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShieldCheck size={16} />
                  <span>Admin Console</span>
                </Link>
              ) : (
                <Link
                  to="/giveaways"
                  className={styles.ctaBtn}
                  onClick={() => setMobileMenuOpen(false)}
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
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/giveaways"
                  className={styles.ctaBtn}
                  onClick={() => setMobileMenuOpen(false)}
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
