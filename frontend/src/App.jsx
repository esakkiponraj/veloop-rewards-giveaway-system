import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import { AuthLayout } from './layouts/AuthLayout/AuthLayout.jsx';
import { LandingPage } from './pages/LandingPage/LandingPage.jsx';
import { GiveawayHome } from './pages/GiveawayHome/GiveawayHome.jsx';
import { GiveawayDetails } from './pages/GiveawayDetails/GiveawayDetails.jsx';
import { WatchAds } from './pages/WatchAds/WatchAds.jsx';
import { Tasks } from './pages/Tasks/Tasks.jsx';
import { Referrals } from './pages/Referrals/Referrals.jsx';
import { Wallet } from './pages/Wallet/Wallet.jsx';
import { Withdraw } from './pages/Withdraw/Withdraw.jsx';
import { History } from './pages/History/History.jsx';
import { Profile } from './pages/Profile/Profile.jsx';
import { MyEntries } from './pages/MyEntries/MyEntries.jsx';
import { Login } from './pages/Login/Login.jsx';
import { Signup } from './pages/Signup/Signup.jsx';
import { AdminDashboard } from './pages/AdminDashboard/AdminDashboard.jsx';
import { ProtectedRoute } from './components/RouteGuards/ProtectedRoute.jsx';
import { AdminRoute } from './components/RouteGuards/AdminRoute.jsx';
import { PublicOnlyRoute } from './components/RouteGuards/PublicOnlyRoute.jsx';

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 1. Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* 2. Standalone Auth Layout for Login and Signup (outside DashboardLayout) */}
          <Route
            element={
              <PublicOnlyRoute>
                <AuthLayout />
              </PublicOnlyRoute>
            }
          >
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* 3. Platform & Member Portal Routes inside DashboardLayout */}
          <Route
            element={
              <DashboardLayout>
                <Outlet />
              </DashboardLayout>
            }
          >
            {/* Publicly viewable giveaway catalogue */}
            <Route path="/giveaways" element={<GiveawayHome />} />
            <Route path="/giveaway/:slug" element={<GiveawayDetails />} />

            {/* Authenticated member-only routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/history" element={<History />} />
              <Route path="/my-entries" element={<MyEntries />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/watch-ads" element={<WatchAds />} />
              <Route path="/referrals" element={<Referrals />} />
            </Route>

            {/* Administrator-only route */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Catch-all route redirects to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
