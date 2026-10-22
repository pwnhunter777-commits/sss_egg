import React, { useState } from 'react';
import { DailyStock } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { getTodayDateString, getLocalDailyStock } from '../lib/offlineStorage';
import { playChimeSound, playPrintClickSound } from '../lib/soundNotification';
import { Check, X, AlertCircle, Plus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  currentStock: DailyStock | null;
  selectedDate?: string;
  onStockUpdated: (stock: DailyStock) => void;
  onClose: () => void;
}

export const StockImportModal: React.FC<Props> = ({
  currentStock,
  selectedDate,
  onStockUpdated,
  onClose,
}) => {
  const { t, isTamil } = useLanguage();
  const todayStr = getTodayDateString();
  const targetDate = selectedDate || todayStr;

  // Resolve current stock reliably from props or local storage
  const effectiveCurrentStock = currentStock || getLocalDailyStock(targetDate);
  const currentRemainingEggs = Math.max(
    0,
    effectiveCurrentStock?.remainingStock !== undefined && effectiveCurrentStock?.remainingStock !== null
      ? effectiveCurrentStock.remainingStock
      : (effectiveCurrentStock?.openingStock ?? 0)
  );
  const currentRemainingTrays = Math.floor(currentRemainingEggs / 30);

  // Input value in trays
  const [taraCountStr, setTaraCountStr] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const enteredTrays = parseFloat(taraCountStr) || 0;
  const newTotalTrays = currentRemainingTrays + enteredTrays;
  const newTotalEggs = newTotalTrays * 30;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredTrays <= 0) {
      setErrorMsg(
        isTamil
          ? 'தாரா எண்ணிக்கையை உள்ளிடவும் (0 விட அதிகமாக)'
          : 'Please enter tray quantity (greater than 0)'
      );
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    playPrintClickSound();

    try {
      const updatedStock = await EggAgencyService.addStockToToday({
        date: targetDate,
        trays: enteredTrays,
        baseStock: effectiveCurrentStock,
        mode: 'add',
      });

      onStockUpdated(updatedStock);
      playChimeSound();

      const finalTrays = Math.floor(updatedStock.remainingStock / 30);
      const finalEggs = updatedStock.remainingStock;
      const message = isTamil
        ? `+${enteredTrays} தாரா சேர்க்கப்பட்டது! புதிய கையிருப்பு: ${finalTrays} தாரா (${finalEggs} முட்டை)`
        : `+${enteredTrays} Trays added! New stock: ${finalTrays} Trays (${finalEggs} Eggs)`;

      setSuccessMsg(message);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update stock');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl overflow-hidden border border-slate-200">
        {/* Header - Compact */}
        <div className="bg-blue-800 text-white px-3.5 py-2.5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-sm sm:text-base leading-tight">
              {isTamil ? 'கையிருப்பு வரவு (1 தாரா = 30 முட்டை)' : 'Stock Import (1 Tara = 30 Eggs)'}
            </h3>
            <p className="text-[11px] text-blue-200 font-bold">
              {isTamil
                ? `தற்போதைய கையிருப்பு: ${currentRemainingTrays} தாரா (${currentRemainingEggs} முட்டை)`
                : `Current Stock: ${currentRemainingTrays} Trays (${currentRemainingEggs} Eggs)`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-blue-700 text-blue-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleImport} className="p-3 sm:p-4 space-y-3">
          {/* Clean Input for Quantity in Trays - Compact */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-700 uppercase tracking-wide block">
              {isTamil
                ? 'சேர்க்க வேண்டிய தாரா எண்ணிக்கை (+தாரா)'
                : 'Stock to Add (+Trays)'}
            </label>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={taraCountStr}
                onChange={(e) => {
                  setTaraCountStr(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="0"
                className="w-full bg-slate-50 border-2 border-blue-400 focus:border-blue-600 rounded-xl px-3 py-2 text-2xl font-black text-blue-950 text-center font-mono focus:ring-1 focus:ring-blue-500 focus:outline-hidden shadow-inner"
                autoFocus
              />
            </div>

            {/* Live Cumulative Stock Addition Preview */}
            {enteredTrays > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 text-center text-xs font-black text-blue-950 animate-in fade-in">
                <div className="text-[10px] text-slate-500 font-bold mb-0.5">
                  {isTamil ? 'புதிய மொத்த கையிருப்பு கணக்கீடு:' : 'Calculated New Stock Total:'}
                </div>
                <div className="flex items-center justify-center gap-1.5 flex-wrap font-mono">
                  <span className="text-slate-600 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">
                    {currentRemainingTrays} {isTamil ? 'தாரா' : 'Trays'}
                  </span>
                  <span className="text-blue-700 font-black">+</span>
                  <span className="text-emerald-700 bg-white px-1.5 py-0.5 rounded-md border border-emerald-200 font-black">
                    {enteredTrays} {isTamil ? 'தாரா' : 'Trays'}
                  </span>
                  <span className="text-slate-500">=</span>
                  <span className="text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-300 font-black text-sm">
                    {newTotalTrays} {isTamil ? 'தாரா' : 'Trays'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono mt-1 font-bold">
                  {newTotalEggs.toLocaleString('en-IN')} {isTamil ? 'மொத்த முட்டைகள்' : 'Total Eggs'}
                </div>
              </div>
            )}
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-xl text-xs font-black flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Button - Compact */}
          <div className="pt-0.5">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black text-sm py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
            >
              {isSaving ? (
                <span>{t('loading')}</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>
                    {isTamil
                      ? enteredTrays > 0
                        ? `+${enteredTrays} தாரா கையிருப்பில் சேர்`
                        : 'கையிருப்பில் சேர்'
                      : enteredTrays > 0
                      ? `Add +${enteredTrays} Trays to Stock`
                      : 'Add to Stock'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
