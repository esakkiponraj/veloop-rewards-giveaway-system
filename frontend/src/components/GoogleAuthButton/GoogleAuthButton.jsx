import React, { useEffect, useRef } from 'react';
import styles from './GoogleAuthButton.module.css';

export const GoogleAuthButton = ({ onSuccess, onError, text = 'signin_with' }) => {
  const isGoogleAuthEnabled = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const buttonRef = useRef(null);

  // If feature flag is false or client ID is unconfigured, hide the Google button safely
  if (!isGoogleAuthEnabled || !clientId) {
    return null;
  }

  useEffect(() => {
    // Dynamically inject Google Identity Services script if not already present
    const existingScript = document.getElementById('google-gsi-client');
    const initializeGSI = () => {
      if (window.google && window.google.accounts && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response && response.credential) {
              onSuccess(response.credential);
            } else {
              onError(new Error('No credential returned by Google Identity Services.'));
            }
          },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: text, // 'signin_with' or 'signup_with'
          width: '100%',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }
    };

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGSI;
      script.onerror = () => onError?.(new Error('Failed to load Google Identity Services.'));
      document.body.appendChild(script);
    } else {
      initializeGSI();
    }
  }, [clientId, text, onSuccess, onError]);

  return (
    <div className={styles.googleContainer}>
      <div ref={buttonRef} className={styles.googleBtnSlot} />
    </div>
  );
};
