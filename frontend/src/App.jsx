import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
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
import { AdminDashboard } from './pages/AdminDashboard/AdminDashboard.jsx';

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<GiveawayHome />} />
            <Route path="/giveaways" element={<GiveawayHome />} />
            <Route path="/giveaway/:slug" element={<GiveawayDetails />} />
            <Route path="/watch-ads" element={<WatchAds />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-entries" element={<MyEntries />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DashboardLayout>
      </Router>
    </AuthProvider>
  );
};

export default App;
