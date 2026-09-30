/**
 * KK Shop Content Studio - Google Drive Authentication Service
 * Uses Firebase Auth Client-Side SDK with GoogleAuthProvider.
 * Token is cached strictly IN-MEMORY (never in localStorage/sessionStorage).
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { tokenStore } from './tokenStore';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Provider with native Google Drive scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Strictly in-memory token cache
let isSigningIn = false;

type AuthCallback = (user: User | null, token: string | null) => void;
const listeners = new Set<AuthCallback>();

function notifyListeners(user: User | null, token: string | null) {
  listeners.forEach(fn => fn(user, token));
}

// Subscribe to auth state changes
export const subscribeDriveAuth = (callback: AuthCallback) => {
  listeners.add(callback);
  callback(auth.currentUser, tokenStore.getToken());
  return () => {
    listeners.delete(callback);
  };
};

export const getCachedDriveToken = (): string | null => {
  return tokenStore.getToken();
};

/**
 * Sign in with Google to grant Drive access
 */
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  if (isSigningIn) throw new Error('กำลังอยู่ในขั้นตอนการเชื่อมต่อ...');
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('ไม่ได้รับ Access Token สำหรับ Google Drive จากระบบ');
    }

    const accessToken = credential.accessToken;
    tokenStore.setToken(accessToken);

    // Send token to server-side session directly without circular api dependency
    try {
      await fetch('/api/drive/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ accessToken }),
      });
    } catch (err) {
      console.warn('Failed to sync token with server:', err);
    }

    notifyListeners(result.user, accessToken);
    return { user: result.user, accessToken };
  } catch (error: any) {
    console.error('Google Drive Sign-in Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out from Google Drive
 */
export const signOutGoogleDrive = async () => {
  await signOut(auth);
  tokenStore.clearToken();
  notifyListeners(null, null);
};

/**
 * Initialize Drive Auth listener on app load
 */
export const initDriveAuth = (
  onSuccess?: (user: User, token: string) => void,
  onSignedOut?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    const token = tokenStore.getToken();
    if (user && token) {
      if (onSuccess) onSuccess(user, token);
    } else {
      tokenStore.clearToken();
      if (onSignedOut) onSignedOut();
    }
    notifyListeners(user, tokenStore.getToken());
  });
};
