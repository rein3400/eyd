import React, { useEffect, useRef } from 'react';

const GoogleSignIn = ({ onSuccess, onError }) => {
  const buttonRef = useRef(null);
  const gsiInitialized = useRef(false);

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (window.google && !gsiInitialized.current) {
        const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
        
        if (!clientId) {
          console.error('Google Client ID not found in environment variables');
          onError?.('Google Client ID not configured');
          return;
        }

        // Initialize Google Identity Services
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleSignIn,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render the sign-in button
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          locale: 'en',
        });

        gsiInitialized.current = true;
      }
    };

    const handleGoogleSignIn = (response) => {
      if (response && response.credential) {
        // The credential is a Google ID token
        const idToken = response.credential;
        
        // Decode the JWT to get user info (optional)
        try {
          const base64Url = idToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const userInfo = JSON.parse(jsonPayload);
          
          console.log('User signed in:', userInfo);
          
          onSuccess?.({
            token: idToken,
            user: {
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
              sub: userInfo.sub,
            },
          });
        } catch (error) {
          console.error('Error decoding ID token:', error);
          onSuccess?.({ token: idToken });
        }
      } else {
        onError?.('No credential received from Google');
      }
    };

    // Wait for Google scripts to load
    const checkGoogleScripts = () => {
      if (window.google && window.google.accounts) {
        initializeGoogleSignIn();
      } else {
        setTimeout(checkGoogleScripts, 100);
      }
    };

    checkGoogleScripts();

    return () => {
      // Cleanup if needed
    };
  }, [onSuccess, onError]);

  return (
    <div className="google-signin-container">
      <div ref={buttonRef} className="google-signin-button"></div>
    </div>
  );
};

export default GoogleSignIn;