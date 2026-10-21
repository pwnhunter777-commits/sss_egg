import React, { useState } from 'react';
import { DailyStock } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { getTodayDateString } from '../lib/offlineStorage';
import { playChimeSound, playPrintClickSound } from '../lib/soundNotification';
import { Check, X, AlertCircle, Plus, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  currentStock: DailyStock | null;
  onStockUpdated: (stock: DailyStock) => void;
  onClose: () => void;
}

export const StockImportModal: React.FC<Props> = ({
  currentStock,
  onStockUpdated,
  onClose,
}) => {
  const { t, isTamil } = useLanguage();
  const todayStr = getTodayDateString();

  // Current stock metrics in 1 Tara = 30 eggs
  const currentRemainingEggs = currentStock?.remainingStock ?? 0;
  const currentRemainingTrays = Math.floor(currentRemainingEggs / 30);
  const currentLooseEggs = currentRemainingEggs % 30;

  // Mode: 'add' (adds to existing stock - DEFAULT) vs 'set' (sets total)
  const [mode, setMode] = useState<'add' | 'set'>('add');

  // Input value in trays
  const [taraCountStr, setTaraCountStr] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const enteredTrays = parseFloat(taraCountStr) || 0;

  // Calculation for live display
  const calculatedNewTotalTrays =
    mode === 'add'
      ? currentRemainingTrays + enteredTrays
      : enteredTrays;

  const calculatedNewTotalEggs =
    mode === 'add'
      ? currentRemainingEggs + Math.round(enteredTrays * 30)
      : Math.round(enteredTrays * 30);

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
        date: todayStr,
        trays: enteredTrays,
        mode,
      });

      onStockUpdated(updatedStock);
      playChimeSound();

      const message =
        mode === 'add'
          ? isTamil
            ? `+${enteredTrays} தாரா சேர்க்கப்பட்டது! புதிய கையிருப்பு: ${Math.floor(updatedStock.remainingStock / 30)} தாரா`
            : `+${enteredTrays} Trays added! New stock: ${Math.floor(updatedStock.remainingStock / 30)} Trays`
          : isTamil
          ? `கையிருப்பு ${enteredTrays} தாராவாக அமைக்கப்பட்டது!`
          : `Stock updated to ${enteredTrays} Trays!`;

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
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-blue-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-base md:text-lg leading-tight">
              {isTamil ? 'கையிருப்பு வரவு (1 தாரா = 30 முட்டை)' : 'Stock Import (1 Tara = 30 Eggs)'}
            </h3>
            <p className="text-xs text-blue-200 font-bold">
              {isTamil
                ? `தற்போதைய கையிருப்பு: ${currentRemainingTrays} தாரா (${currentRemainingEggs} முட்டை)`
                : `Current Stock: ${currentRemainingTrays} Trays (${currentRemainingEggs} Eggs)`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-blue-700 text-blue-100 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleImport} className="p-5 space-y-4">
          {/* Mode Selector Pill: Add to Stock vs Set Total */}
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode('add');
                setTaraCountStr('');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'add'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTamil ? '➕ கையிருப்பில் சேர் (Add)' : '➕ Add to Stock'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('set');
                setTaraCountStr(String(currentRemainingTrays));
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'set'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white/60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isTamil ? '✏️ மொத்தத்தை மாற்று' : '✏️ Set Total'}</span>
            </button>
          </div>

          {/* Clean Input for Quantity in Trays */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wide block">
              {mode === 'add'
                ? isTamil
                  ? 'சேர்க்க வேண்டிய தாரா எண்ணிக்கை (+தாரா)'
                  : 'Stock to Add (+Trays)'
                : isTamil
                ? 'மொத்த தாரா எண்ணிக்கை (Total Trays)'
                : 'Total Stock Quantity (Trays)'}
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
                placeholder={mode === 'add' ? 'e.g. 4' : '0'}
                className="w-full bg-slate-50 border-2 border-blue-400 focus:border-blue-600 rounded-2xl px-4 py-3 text-3xl font-black text-blue-950 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden shadow-inner"
                autoFocus
              />
            </div>

            {/* Simple clean calculation line */}
            <div className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center">
              {mode === 'add' ? (
                <span>
                  {isTamil ? 'இருப்பு' : 'Current'}:{' '}
                  <strong className="text-slate-900 font-mono">{currentRemainingTrays}</strong> +{' '}
                  {isTamil ? 'சேர்ப்பது' : 'Add'}:{' '}
                  <strong className="text-blue-700 font-mono">+{enteredTrays}</strong> ={' '}
                  {isTamil ? 'மொத்த இருப்பு' : 'New Stock'}:{' '}
                  <strong className="text-emerald-700 font-mono">
                    {calculatedNewTotalTrays} {isTamil ? 'தாரா' : 'Trays'}
                  </strong>{' '}
                  <span className="text-slate-500 font-normal">
                    ({calculatedNewTotalEggs} {t('eggs')})
                  </span>
                </span>
              ) : (
                <span>
                  {isTamil ? 'புதிய இருப்பு' : 'New Total'}:{' '}
                  <strong className="text-blue-900 font-mono">
                    {calculatedNewTotalTrays} {isTamil ? 'தாரா' : 'Trays'}
                  </strong>{' '}
                  <span className="text-slate-500 font-normal">
                    ({calculatedNewTotalEggs} {t('eggs')})
                  </span>
                </span>
              )}
            </div>
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black text-sm md:text-base py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
            >
              {isSaving ? (
                <span>{t('loading')}</span>
              ) : mode === 'add' ? (
                <span>
                  {isTamil
                    ? `➕ கையிருப்பில் சேர் (+${enteredTrays || 0} தாரா)`
                    : `➕ Add to Stock (+${enteredTrays || 0} Trays)`}
                </span>
              ) : (
                <span>
                  {isTamil
                    ? `✏️ கையிருப்பை ${enteredTrays || 0} தாராவாக அமை`
                    : `✏️ Set Stock to ${enteredTrays || 0} Trays`}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
