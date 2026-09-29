/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserRole, AgencySettings, PrinterDevice } from './types';
import { getLocalSettings, getLocalPrinter, DEFAULT_SETTINGS, DEFAULT_PRINTER } from './lib/offlineStorage';
import { EggAgencyService } from './services/eggAgencyService';
import { LoginScreen } from './components/LoginScreen';
import { OwnerDashboard } from './components/OwnerDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [settings, setSettings] = useState<AgencySettings>(DEFAULT_SETTINGS);
  const [printer, setPrinter] = useState<PrinterDevice>(DEFAULT_PRINTER);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load initial local settings & remote sync on startup
  useEffect(() => {
    const localS = getLocalSettings();
    const localP = getLocalPrinter();
    setSettings(localS);
    setPrinter(localP);

    EggAgencyService.getSettings()
      .then((remoteSettings) => {
        if (remoteSettings) setSettings(remoteSettings);
      })
      .catch(() => {})
      .finally(() => setIsInitializing(false));

    // Attempt background sync of any pending offline bills
    EggAgencyService.syncPendingBills().catch(() => {});
  }, []);

  const handleLoginSuccess = (role: UserRole) => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
  };

  return (
    <main className="min-h-screen w-full bg-slate-100 flex flex-col max-w-lg mx-auto">
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
  );
}
