import React from 'react';
import { Navigate, Link, Outlet } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { CustomLoader } from '../CustomLoader/CustomLoader.jsx';

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CustomLoader message="Verifying administrative privileges..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?returnUrl=/admin" replace />;
  }

  if (!isAdmin) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '480px',
          }}
        >
          <ShieldAlert size={48} color="#EF4444" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', color: '#FFFFFF', marginBottom: '0.75rem' }}>Access Denied</h2>
          <p style={{ color: '#CBD5E1', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            Administrative clearance is required to view this operations console. Your account does not have
            administrator privileges.
          </p>
          <Link
            to="/giveaways"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#7C3AED',
              color: '#FFFFFF',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to Giveaway Hub</span>
          </Link>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
};
