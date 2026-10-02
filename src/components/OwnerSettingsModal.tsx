import React, { useState } from 'react';
import { AgencySettings } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { resetAllLocalData, getTodayDateString, setLastActiveDate } from '../lib/offlineStorage';
import { Settings, Check, X, Shield, KeyRound, Phone, MapPin, Store, RefreshCw, Trash2, Download } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  settings: AgencySettings;
  onSettingsUpdated: (updated: AgencySettings) => void;
  onClose: () => void;
}

export const OwnerSettingsModal: React.FC<Props> = ({
  settings,
  onSettingsUpdated,
  onClose,
}) => {
  const { t, isTamil } = useLanguage();
  const [agencyName, setAgencyName] = useState(settings.agencyName || 'SSS EGG AGENCY');
  const [ownerPin, setOwnerPin] = useState(settings.ownerPin || '8888');
  const [employeePin, setEmployeePin] = useState(settings.employeePin || '1234');
  const [phone, setPhone] = useState(settings.phone || '+91 98765 43210');
  const [address, setAddress] = useState(settings.address || 'Wholesale Egg Market, Main Road');

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleManualDailyReset = async () => {
    if (!window.confirm("Are you sure you want to wipe all records and restart the database fresh for today?")) {
      return;
    }
    setIsResetting(true);
    setStatusMsg('Clearing database and restarting app...');
    try {
      await EggAgencyService.clearAllDatabaseData();
      resetAllLocalData();
      setLastActiveDate(getTodayDateString());
      window.location.reload();
    } catch (err: any) {
      setErrorMsg('Failed to reset: ' + err.message);
      setIsResetting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(ownerPin)) {
      setErrorMsg('Owner PIN must be exactly 4 digits');
      return;
    }
    if (!/^\d{4}$/.test(employeePin)) {
      setErrorMsg('Employee PIN must be exactly 4 digits');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const updated: AgencySettings = {
      agencyName,
      ownerPin,
      employeePin,
      phone,
      address,
    };

    try {
      await EggAgencyService.saveSettings(updated);
      onSettingsUpdated(updated);
      setStatusMsg(t('settingsSavedSuccess'));
      setTimeout(() => onClose(), 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    setStatusMsg(null);
    try {
      const res = await EggAgencyService.syncPendingBills();
      setStatusMsg(`Synced ${res.syncedCount} offline bill(s) to cloud!`);
    } catch (err: any) {
      setErrorMsg('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-blue-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-blue-200" />
            <h3 className="font-black text-base md:text-lg">{t('agencySettingsTitle')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-blue-700 text-blue-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Agency Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-600" />
              <span>{t('agencyNameLabel')}</span>
            </label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 text-base font-black text-slate-900 focus:ring-2 focus:ring-blue-500 uppercase focus:outline-hidden"
              required
            />
          </div>

          {/* Security PINs */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>{t('ownerPinLabel')}</span>
              </label>
              <input
                type="password"
                maxLength={4}
                value={ownerPin}
                onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-3 py-3 text-center text-xl font-mono font-black text-slate-900 tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="4 digits"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-500" />
                <span>{t('employeePinLabel')}</span>
              </label>
              <input
                type="password"
                maxLength={4}
                value={employeePin}
                onChange={(e) => setEmployeePin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-3 py-3 text-center text-xl font-mono font-black text-slate-900 tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="4 digits"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>{t('phoneLabel')}</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 text-base font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              placeholder="+91..."
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>{t('addressLabel')}</span>
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl p-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              placeholder="Address..."
            />
          </div>

          {/* Offline Sync Controls */}
          <div className="bg-slate-50 border-2 border-slate-200 p-3.5 rounded-2xl space-y-2">
            <div className="text-sm font-black text-slate-800 flex items-center justify-between">
              <span>Cloud & Offline Database Sync</span>
              <button
                type="button"
                onClick={handleForceSync}
                disabled={isSyncing}
                className="text-xs md:text-sm text-blue-700 hover:text-blue-900 font-black flex items-center gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
            <p className="text-xs font-bold text-slate-500 leading-normal">
              All transactions are automatically preserved offline and mirrored to Firebase Cloud.
            </p>
          </div>

          {/* App Installation (PWA) */}
          <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-black text-amber-950">
              <Download className="w-5 h-5 text-amber-700" />
              <span>Install SSS Egg Agency App</span>
            </div>
            <p className="text-xs font-bold text-amber-900 leading-normal">
              Install as an offline-capable Progressive Web App (PWA) on your Android phone, tablet, or PC for fast 1-tap launch without opening a browser.
            </p>
            <div className="pt-1">
              <PWAInstallButton className="w-full" />
            </div>
          </div>

          {/* Daily Reset & Database Purge */}
          <div className="bg-rose-50 border-2 border-rose-200 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-black text-rose-900">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Daily Reset & Clean Slate</span>
            </div>
            <p className="text-xs font-bold text-rose-700 leading-normal">
              The app automatically resets every day at midnight and clears past database records. You can also manually trigger a clean restart right now:
            </p>
            <button
              type="button"
              onClick={handleManualDailyReset}
              disabled={isResetting}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isResetting ? 'Resetting Database...' : 'Clear All Data & Restart Fresh'}</span>
            </button>
          </div>

          {statusMsg && (
            <div className="text-sm text-emerald-800 bg-emerald-50 p-3 rounded-2xl border-2 border-emerald-200 flex items-center gap-2 font-black">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="text-sm text-rose-800 bg-rose-50 p-3 rounded-2xl border-2 border-rose-200 font-black">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm py-3.5 px-4 rounded-2xl transition-all"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-black text-sm py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              <Check className="w-5 h-5" />
              <span>{isSaving ? t('loading') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
