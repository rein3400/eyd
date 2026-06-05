import React, { useEffect, useRef } from 'react';

const DOCS_SCOPE = 'https://www.googleapis.com/auth/documents';

const GoogleSignIn = ({ onSuccess, onError }) => {
  const buttonRef = useRef(null);
  const gsiInitialized = useRef(false);

  useEffect(() => {
    if (gsiInitialized.current) return;

    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('Google Client ID not found in environment variables');
      onError?.('Google Client ID not configured');
      return;
    }

    // Pop up the OAuth consent screen directly from the user click handler.
    // requestAccessToken() must originate from a user gesture or browsers
    // will block the popup. We do NOT use the GIS sign-in button here;
    // instead we render a custom button whose onClick triggers the token
    // request, then read user info from the ID token returned alongside
    // the access token in the callback (GIS provides both in one flow).
    const handleTokenResponse = (response) => {
      if (!response || !response.access_token) {
        onError?.('No access token received from Google');
        return;
      }
      // response may include id_token in newer flows; if not, surface
      // whatever we have so the rest of the app still works.
      const out = {
        token: response.access_token,
        idToken: response.id_token,
      };
      // Decode id_token for user info if present.
      if (response.id_token) {
        try {
          const base64Url = response.id_token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(
              (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
          );
          const userInfo = JSON.parse(jsonPayload);
          out.user = {
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            sub: userInfo.sub,
          };
        } catch (e) {
          console.warn('Failed to decode id_token, continuing with access_token only');
        }
      }
      onSuccess?.(out);
    };

    // Wait for the GIS SDK to be available before creating the token client.
    const initTokenClient = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        setTimeout(initTokenClient, 100);
        return;
      }
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DOCS_SCOPE,
        callback: handleTokenResponse,
        error_callback: (err) => {
          // GIS surfaces a small set of error types. We translate each into a
          // user-actionable message so "Popup window closed" alone doesn't
          // hide the real cause (typically a missing Authorized JavaScript
          // origin, a popup blocker, or a too-restrictive browser setting).
          console.error('OAuth token error:', err);
          const type = err?.type || '';
          let msg;
          switch (type) {
            case 'popup_closed':
            case 'popup_closed_by_user':
              msg = 'Sign-in popup was closed before authorization completed. Please try again and accept the Google Docs permission.';
              break;
            case 'popup_blocked':
              msg = 'Your browser blocked the sign-in popup. Allow popups for this site, then try again.';
              break;
            case 'access_denied':
              msg = 'Permission to access Google Docs was denied. Sign in again and grant the requested permission.';
              break;
            case 'unauthorized_client':
              msg = 'This app is not authorized to request Google Docs access. Add the site origin to the OAuth client\'s Authorized JavaScript origins in Google Cloud Console.';
              break;
            case 'invalid_request':
              msg = 'The sign-in request was invalid. Reload the page and try again.';
              break;
            default:
              msg = 'Google authorization failed: ' + (err?.message || type || 'unknown error');
          }
          onError?.(msg);
        },
      });
      // Expose so the click handler below can call it.
      window.__docsTokenClient = tokenClient;
      gsiInitialized.current = true;
    };
    initTokenClient();

    // Wire the click handler on the rendered button container. We use a
    // ref callback so the click handler tracks the actual DOM node through
    // StrictMode double-invoke and the React effect lifecycle.
    const node = buttonRef.current;
    if (node) {
      node.onclick = (e) => {
        e.preventDefault();
        const tc = window.__docsTokenClient;
        if (!tc) {
          onError?.('Google SDK not ready yet, please try again');
          return;
        }
        tc.requestAccessToken({ prompt: 'consent' });
      };
    }

    return () => {
      if (node) node.onclick = null;
      delete window.__docsTokenClient;
    };
  }, [onSuccess, onError]);

  return (
    <div className="google-signin-container">
      <button
        ref={buttonRef}
        type="button"
        className="google-signin-button"
        style={{
          padding: '10px 20px',
          fontSize: 15,
          fontWeight: 500,
          background: '#fff',
          color: '#3c4043',
          border: '1px solid #dadce0',
          borderRadius: 4,
          cursor: 'pointer',
          width: '100%',
          maxWidth: 380,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
};

export default GoogleSignIn;
