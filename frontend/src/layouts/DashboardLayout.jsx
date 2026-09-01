import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Gift,
  Tv,
  CheckSquare,
  Users,
  Wallet,
  ArrowUpRight,
  History,
  Ticket,
  User,
  Shield,
  Flame,
  ChevronDown,
  Sparkles,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { claimDailyBonus } from '../services/walletApi.js';
import styles from './DashboardLayout.module.css';

export const DashboardLayout = ({ children }) => {
  const { user, logout, demoAccounts, switchAccount, isAdmin, updateWallet } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [bonusClaiming, setBonusClaiming] = useState(false);

  const navItems = [
    { name: 'Giveaways', path: '/', icon: Gift },
    { name: 'Watch Ads', path: '/watch-ads', icon: Tv, badge: 'Hot' },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Referrals', path: '/referrals', icon: Users },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
    { name: 'Withdraw', path: '/withdraw', icon: ArrowUpRight },
    { name: 'History', path: '/history', icon: History },
    { name: 'My Entries', path: '/my-entries', icon: Ticket },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Admin Console', path: '/admin', icon: Shield, badge: 'Admin' });
  }

  const handleClaimDailyBonus = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setBonusClaiming(true);
    try {
      const res = await claimDailyBonus();
      if (res.success) {
        if (res.wallet) {
          updateWallet(res.wallet);
        }
        alert(`🎉 ${res.message}`);
      }
    } catch (err) {
      alert(err.message || 'Daily bonus already claimed for today.');
    } finally {
      setBonusClaiming(false);
    }
  };

  return (
    <div className={styles.layoutWrapper}>
      {/* 1. LEFT SIDEBAR (Desktop / Tablet) */}
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarMobileOpen : ''}`}>
        {/* Brand Logo */}
        <div className={styles.brandArea}>
          <Link to="/" className={styles.brandLink} onClick={() => setMobileMenuOpen(false)}>
            <img src="/assets/veloop-logo.svg" alt="VELOOP" className={styles.brandLogo} />
            <div className={styles.brandTextWrap}>
              <span className={styles.brandTitle}>VELOOP</span>
              <span className={styles.brandSubtitle}>REWARDS</span>
            </div>
          </Link>
          <button
            className={styles.mobileCloseBtn}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className={styles.navContainer}>
          <div className={styles.navSectionLabel}>MAIN MENU</div>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/giveaways');
              return (
                <li key={item.path} className={styles.navItem}>
                  <NavLink
                    to={item.path}
                    className={({ isActive: linkActive }) =>
                      `${styles.navLink} ${isActive || linkActive ? styles.navLinkActive : ''}`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className={styles.navIconWrap}>
                      <IconComp size={18} className={styles.navIcon} />
                    </div>
                    <span className={styles.navText}>{item.name}</span>
                    {item.badge && (
                      <span
                        className={`${styles.navBadge} ${
                          item.badge === 'Hot' ? styles.badgeHot : styles.badgeAdmin
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Daily Bonus Promo Card */}
        <div className={styles.dailyBonusCard}>
          <div className={styles.bonusGlowEffect} />
          <div className={styles.bonusHeader}>
            <div className={styles.bonusIconWrap}>
              <Zap size={16} />
            </div>
            <div>
              <h4 className={styles.bonusTitle}>Daily Bonus</h4>
              <p className={styles.bonusSubtitle}>Earn extra VEs every day</p>
            </div>
          </div>
          <button
            className={styles.bonusClaimBtn}
            onClick={handleClaimDailyBonus}
            disabled={bonusClaiming}
          >
            {bonusClaiming ? 'Claiming...' : 'Claim +25 VEs'}
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className={styles.mobileBackdrop} onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* 2. MAIN CONTENT AREA + TOP HEADER */}
      <div className={styles.mainWrapper}>
        {/* Top Navbar */}
        <header className={styles.topHeader}>
          {/* Mobile Hamburger */}
          <button
            className={styles.hamburgerBtn}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Menu"
          >
            <Menu size={22} />
          </button>

          <div className={styles.headerLeft}>
            <span className={styles.headerPortalBadge}>
              <Sparkles size={13} className={styles.sparkleIcon} />
              <span>REWARDS PORTAL</span>
            </span>
          </div>

          <div className={styles.headerRight}>
            {/* Streak Indicator */}
            <div className={styles.streakChip}>
              <Flame size={16} className={styles.streakFlame} />
              <span className={styles.streakCount}>{user?.streak || 12}</span>
              <span className={styles.streakLabel}>Day Streak</span>
            </div>

            {/* VE Balance Card */}
            <Link to="/wallet" className={styles.balanceChip}>
              <div className={styles.balanceIconWrap}>
                <Wallet size={15} />
              </div>
              <div className={styles.balanceTextWrap}>
                <span className={styles.balanceVal}>
                  {user?.wallet?.VEs?.toLocaleString() || '0'}
                </span>
                <span className={styles.balanceUnit}>VEs</span>
              </div>
            </Link>

            {/* User Profile Avatar & Dropdown */}
            {user ? (
              <div className={styles.userMenuWrap}>
                <button
                  className={styles.userAvatarBtn}
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-expanded={userDropdownOpen}
                >
                  <div className={styles.avatarCircle}>
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    <span className={styles.onlineDot} />
                  </div>
                  <div className={styles.userInfoText}>
                    <span className={styles.userName}>{user.username}</span>
                    <span className={styles.userMasked}>{user.maskedId}</span>
                  </div>
                  <ChevronDown size={14} className={styles.dropdownChevron} />
                </button>

                {userDropdownOpen && (
                  <div className={styles.userDropdown}>
                    <div className={styles.dropdownHeader}>
                      <strong>{user.username}</strong>
                      <span>{user.email}</span>
                      <span className={styles.dropdownRoleBadge}>
                        {user.role === 'admin' ? 'SuperAdmin' : 'Verified Member'}
                      </span>
                    </div>

                    <div className={styles.dropdownDivider} />

                    <div className={styles.quickSwitcherSection}>
                      <span className={styles.switcherLabel}>EVALUATION PROFILES (JWT AUTH)</span>
                      <div className={styles.demoAccList}>
                        {demoAccounts.map((acc) => (
                          <button
                            key={acc.userId}
                            className={`${styles.demoAccBtn} ${
                              user.userId === acc.userId ? styles.demoAccActive : ''
                            }`}
                            onClick={() => {
                              switchAccount(acc.email, 'password123');
                              setUserDropdownOpen(false);
                            }}
                          >
                            <span>{acc.username}</span>
                            <small>{acc.wallet?.VEs} VEs</small>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.dropdownDivider} />

                    <Link
                      to="/profile"
                      className={styles.dropdownItem}
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <User size={15} />
                      <span>My Profile & Security</span>
                    </Link>

                    <button
                      className={`${styles.dropdownItem} ${styles.dropdownLogout}`}
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                        navigate('/login');
                      }}
                    >
                      <LogOut size={15} />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-veloop-primary">
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </header>

        {/* Main Content Body */}
        <main className={styles.contentBody}>{children}</main>

        {/* 3. MOBILE BOTTOM NAVIGATION BAR */}
        <nav className={styles.mobileBottomNav}>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.mobileNavActive : ''}`
            }
          >
            <Gift size={18} />
            <span>Giveaways</span>
          </NavLink>

          <NavLink
            to="/watch-ads"
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.mobileNavActive : ''}`
            }
          >
            <Tv size={18} />
            <span>Watch Ads</span>
          </NavLink>

          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.mobileNavActive : ''}`
            }
          >
            <CheckSquare size={18} />
            <span>Tasks</span>
          </NavLink>

          <NavLink
            to="/wallet"
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.mobileNavActive : ''}`
            }
          >
            <Wallet size={18} />
            <span>Wallet</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${styles.mobileNavItem} ${isActive ? styles.mobileNavActive : ''}`
            }
          >
            <User size={18} />
            <span>Profile</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
};
