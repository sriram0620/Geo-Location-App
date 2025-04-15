import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../app/config/firebase';

const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 min in milliseconds

export function useInactivityCheck() {
  const [requiresVerification, setRequiresVerification] = useState(false);
  const lastActiveTimestamp = useRef(Date.now());
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Check inactivity every minute
    const interval = setInterval(checkInactivity, 60000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App came to foreground
      checkInactivity();
    }
    appState.current = nextAppState;
  };

  const checkInactivity = async () => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastActiveTimestamp.current;

    if (timeDiff >= INACTIVITY_TIMEOUT) {
      setRequiresVerification(true);
      
      // Log inactivity in Firebase
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          lastInactivityCheck: new Date().toISOString(),
          requiresBiometric: true
        });
      }
    }
  };

  const resetInactivityTimer = () => {
    lastActiveTimestamp.current = Date.now();
    setRequiresVerification(false);
  };

  return {
    requiresVerification,
    resetInactivityTimer
  };
}