import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { apiClient } from '../lib/apiClient';

const BackendStatusContext = createContext(null);

const SLOW_THRESHOLD_MS = 3000;

export function BackendStatusProvider({ children }) {
  const [wakingUp, setWakingUp] = useState(false);
  const activeSlowTimers = useRef(0);

  const markSlow = useCallback(() => {
    activeSlowTimers.current += 1;
    setWakingUp(true);
  }, []);

  const markDone = useCallback(() => {
    activeSlowTimers.current = Math.max(0, activeSlowTimers.current - 1);
    if (activeSlowTimers.current === 0) setWakingUp(false);
  }, []);

  // Attach interceptors once
  const interceptorsAdded = useRef(false);
  if (!interceptorsAdded.current) {
    interceptorsAdded.current = true;

    apiClient.interceptors.request.use((config) => {
      const timer = setTimeout(markSlow, SLOW_THRESHOLD_MS);
      config._wakeTimer = timer;
      config._startTime = Date.now();
      return config;
    });

    apiClient.interceptors.response.use(
      (response) => {
        clearTimeout(response.config._wakeTimer);
        markDone();
        return response;
      },
      (error) => {
        if (error.config) {
          clearTimeout(error.config._wakeTimer);
          markDone();
        }
        return Promise.reject(error);
      }
    );
  }

  return (
    <BackendStatusContext.Provider value={{ wakingUp }}>
      {children}
    </BackendStatusContext.Provider>
  );
}

export function useBackendStatus() {
  return useContext(BackendStatusContext);
}
