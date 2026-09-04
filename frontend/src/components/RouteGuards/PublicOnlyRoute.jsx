import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { sanitizeReturnUrl } from '../../utils/urlSanitizer.js';
import { CustomLoader } from '../CustomLoader/CustomLoader.jsx';

export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CustomLoader message="Checking authentication..." />
      </div>
    );
  }

  if (isAuthenticated) {
    const params = new URLSearchParams(location.search);
    const returnUrlParam = params.get('returnUrl');

    if (isAdmin) {
      // If admin has a valid internal return URL that is not /giveaways, respect it, else default to /admin
      const destination = returnUrlParam && returnUrlParam.startsWith('/admin') ? returnUrlParam : '/admin';
      return <Navigate to={destination} replace />;
    }

    const destination = sanitizeReturnUrl(returnUrlParam, '/giveaways');
    return <Navigate to={destination} replace />;
  }

  return children ? children : <Outlet />;
};
