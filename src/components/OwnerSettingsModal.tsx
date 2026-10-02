import React, { useState } from 'react';
import { AgencySettings } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { resetAllLocalData, getTodayDateString, setLastActiveDate } from '../lib/offlineStorage';
import { Settings, Check, X, Shield, KeyRound, Phone, MapPin, Store, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';

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
      setStatusMsg('Settings saved successfully!');
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-200" />
            <h3 className="font-bold text-sm">Owner Settings & Security</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-blue-700 text-blue-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Agency Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-blue-600" />
              <span>Agency Name (Printed on Bills)</span>
            </label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 uppercase"
              required
            />
          </div>

          {/* Security PINs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>Owner PIN</span>
              </label>
              <input
                type="password"
                maxLength={4}
                value={ownerPin}
                onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-center text-sm font-mono font-bold text-slate-900 tracking-widest focus:ring-2 focus:ring-blue-500"
                placeholder="4 digits"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                <span>Employee PIN</span>
              </label>
              <input
                type="password"
                maxLength={4}
                value={employeePin}
                onChange={(e) => setEmployeePin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-center text-sm font-mono font-bold text-slate-900 tracking-widest focus:ring-2 focus:ring-blue-500"
                placeholder="4 digits"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>Agency Phone Number</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
              placeholder="+91..."
            />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Agency Address</span>
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
              placeholder="Address..."
            />
          </div>

          {/* Offline Sync Controls */}
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-1.5">
            <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Cloud & Offline Database Sync</span>
              <button
                type="button"
                onClick={handleForceSync}
                disabled={isSyncing}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              All transactions are automatically preserved offline and mirrored to Firebase Cloud.
            </p>
          </div>

          {/* Daily Reset & Database Purge */}
          <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Daily Reset & Clean Slate</span>
            </div>
            <p className="text-[10px] text-rose-700 leading-tight">
              The app automatically resets every day at midnight and clears past database records. You can also manually trigger a clean restart right now:
            </p>
            <button
              type="button"
              onClick={handleManualDailyReset}
              disabled={isResetting}
              className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isResetting ? 'Resetting Database...' : 'Clear All Data & Restart Fresh'}</span>
            </button>
          </div>

          {statusMsg && (
            <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center gap-1.5 font-bold">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 font-bold">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-3 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
