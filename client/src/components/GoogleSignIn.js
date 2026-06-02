import React, { useEffect, useRef } from 'react';

const DOCS_SCOPE = 'https://www.googleapis.com/auth/documents';

const GoogleSignIn = ({ onSuccess, onError }) => {
  const buttonRef = useRef(null);
  const gsiInitialized = useRef(false);
  const tokenClientRef = useRef(null);

  useEffect(() => {
    const handleAccessToken = (response) => {
      // response = { access_token, expires_in, scope, token_type }
      if (response && response.access_token) {
        // Decode the ID token we already have (if any) to surface user info.
        // The GSI sign-in flow already gave us the ID token; we just need an
        // OAuth access token with documents scope for the backend to call
        // googleapis. The two flows run in sequence: sign in (id_token),
        // then request access (access_token).
        const existingId = sessionStorage.getItem('gsi_id_token');
        if (existingId) {
          try {
            const base64Url = existingId.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64).split('').map(
                (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
              ).join('')
            );
            const userInfo = JSON.parse(jsonPayload);
            onSuccess?.({
              token: response.access_token,
              user: {
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
                sub: userInfo.sub,
              },
            });
            return;
          } catch (_) {
            // fall through
          }
        }
        // No cached ID token — still succeed with the access token.
        onSuccess?.({ token: response.access_token });
      } else {
        onError?.('No access token received from Google');
      }
    };

    const initialize = () => {
      if (gsiInitialized.current) return;
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('Google Client ID not found in environment variables');
        onError?.('Google Client ID not configured');
        return;
      }

      // Step 1: sign-in button. Returns ID token (we use it for user info).
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!response || !response.credential) {
            onError?.('No credential received from Google');
            return;
          }
          sessionStorage.setItem('gsi_id_token', response.credential);
          // Step 2: immediately request an OAuth access token with Docs scope.
          if (!tokenClientRef.current) {
            tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: DOCS_SCOPE,
              callback: handleAccessToken,
              error_callback: (err) => {
                console.error('OAuth token error:', err);
                onError?.('Google authorization failed: ' + (err.message || err.type || 'unknown'));
              },
            });
          }
          tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 380,
        text: 'continue_with',
        locale: 'en',
      });

      gsiInitialized.current = true;
    };

    const checkScripts = () => {
      if (window.google && window.google.accounts) initialize();
      else setTimeout(checkScripts, 100);
    };
    checkScripts();

    return () => {};
  }, [onSuccess, onError]);

  return (
    <div className="google-signin-container">
      <div ref={buttonRef} className="google-signin-button"></div>
    </div>
  );
};

export default GoogleSignIn;
