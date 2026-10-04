/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, AgencySettings, PrinterDevice } from './types';
import {
  getLocalSettings,
  getLocalPrinter,
  DEFAULT_SETTINGS,
  DEFAULT_PRINTER,
  getLocalActiveSession,
  setLocalActiveSession,
  clearLocalActiveSession,
  getLastActiveDate,
  setLastActiveDate,
  resetAllLocalData,
  getTodayDateString,
} from './lib/offlineStorage';
import { EggAgencyService } from './services/eggAgencyService';
import { LanguageProvider } from './context/LanguageContext';
import { LoginScreen } from './components/LoginScreen';
import { OwnerDashboard } from './components/OwnerDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [settings, setSettings] = useState<AgencySettings>(DEFAULT_SETTINGS);
  const [printer, setPrinter] = useState<PrinterDevice>(DEFAULT_PRINTER);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load initial local settings, active 1-day session, & remote sync on startup
  useEffect(() => {
    const localS = getLocalSettings();
    const localP = getLocalPrinter();
    setSettings(localS);
    setPrinter(localP);

    const today = getTodayDateString();
    const lastActive = getLastActiveDate();

    if (lastActive && lastActive !== today) {
      // New day started! Automatically clear all past days' data and restart fresh
      EggAgencyService.restartDay(today).catch(() => {});
      setLastActiveDate(today);
      setUserRole(null);
    } else {
      setLastActiveDate(today);
      // Ensure daily clean state & mirror
      EggAgencyService.restartDay(today).catch(() => {});
      // Check for existing valid 1-day session
      const activeSession = getLocalActiveSession();
      if (activeSession) {
        setUserRole(activeSession.role);
      }
    }

    EggAgencyService.getSettings()
      .then((remoteSettings) => {
        if (remoteSettings) setSettings(remoteSettings);
      })
      .catch(() => {})
      .finally(() => setIsInitializing(false));

    // Attempt background sync of any pending offline bills
    EggAgencyService.syncPendingBills().catch(() => {});
  }, []);

  // Automatic daily restart & database purge check:
  // If the date changes (e.g. overnight or midnight rollover), the app clears past data and resets
  useEffect(() => {
    const verifyDailyLifecycle = () => {
      const today = getTodayDateString();
      const lastActive = getLastActiveDate();

      if (lastActive && lastActive !== today) {
        // Date changed while open (midnight rollover)! Purge past data, reset local state, and restart clean day
        EggAgencyService.restartDay(today).catch(() => {});
        setLastActiveDate(today);
        setUserRole(null);
        return;
      }

      const activeSession = getLocalActiveSession();
      if (!activeSession && userRole !== null) {
        setUserRole(null);
      }
    };

    const interval = setInterval(verifyDailyLifecycle, 20000); // Check every 20 seconds
    window.addEventListener('focus', verifyDailyLifecycle);
    document.addEventListener('visibilitychange', verifyDailyLifecycle);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', verifyDailyLifecycle);
      document.removeEventListener('visibilitychange', verifyDailyLifecycle);
    };
  }, [userRole]);

  const handleLoginSuccess = useCallback((role: UserRole) => {
    if (role) {
      setLocalActiveSession(role);
    }
    setUserRole(role);
  }, []);

  const handleLogout = useCallback(() => {
    clearLocalActiveSession();
    setUserRole(null);
  }, []);

  return (
    <LanguageProvider>
      <main className="min-h-screen w-full bg-slate-100 flex flex-col max-w-2xl mx-auto shadow-2xl">
        {isInitializing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-blue-900 text-white space-y-3">
            <div className="w-12 h-12 border-4 border-amber-300 border-t-transparent rounded-full animate-spin" />
            <h2 className="font-extrabold text-base tracking-tight uppercase">SSS EGG AGENCY</h2>
            <p className="text-xs text-blue-200">Initializing offline & cloud system...</p>
          </div>
        ) : userRole === null ? (
          <LoginScreen
            settings={settings}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : userRole === 'owner' ? (
          <OwnerDashboard
            settings={settings}
            printer={printer}
            onUpdateSettings={setSettings}
            onUpdatePrinter={setPrinter}
            onLogout={handleLogout}
          />
        ) : (
          <EmployeeDashboard
            settings={settings}
            printer={printer}
            onUpdatePrinter={setPrinter}
            onLogout={handleLogout}
          />
        )}
      </main>
    </LanguageProvider>
  );
}
