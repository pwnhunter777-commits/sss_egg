import React, { useState } from 'react';
import { DailyStock } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { getTodayDateString } from '../lib/offlineStorage';
import { PackagePlus, Check, X, AlertCircle } from 'lucide-react';
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
  const { t } = useLanguage();
  const todayStr = getTodayDateString();

  const [stockQuantityStr, setStockQuantityStr] = useState<string>('3000');
  const [purchaseCostStr, setPurchaseCostStr] = useState<string>(
    String(currentStock?.purchaseCost ?? 2)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stockQuantity = parseInt(stockQuantityStr, 10) || 0;
  const purchaseCost = parseFloat(purchaseCostStr) || 0;

  const quickStockChips = [500, 1000, 2000, 3000, 5000];
  const totalPurchaseCost = stockQuantity * purchaseCost;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockQuantity <= 0) {
      setErrorMsg('Imported quantity must be greater than 0');
      return;
    }
    if (purchaseCost < 0) {
      setErrorMsg('Purchase cost cannot be negative');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const currentEggsSold = currentStock?.eggsSold ?? 0;
    const currentOpening = currentStock?.openingStock ?? 0;
    const currentImported = currentStock?.importedStock ?? 0;
    const currentRemaining = currentStock?.remainingStock ?? 0;

    const newOpeningStock = currentOpening > 0 ? currentOpening + stockQuantity : stockQuantity;
    const newImportedStock = currentImported > 0 ? currentImported + stockQuantity : stockQuantity;
    const newRemainingStock = currentOpening > 0 ? currentRemaining + stockQuantity : stockQuantity - currentEggsSold;

    const updatedStock: DailyStock = {
      date: todayStr,
      openingStock: newOpeningStock,
      importedStock: newImportedStock,
      eggsSold: currentEggsSold,
      remainingStock: Math.max(0, newRemainingStock),
      purchaseCost,
      updatedAt: new Date().toISOString(),
    };

    try {
      await EggAgencyService.saveTodayStock(updatedStock);
      onStockUpdated(updatedStock);
      setSuccessMsg(t('stockUpdatedSuccess'));
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import stock');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-blue-800 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-black text-base md:text-lg">{t('stockImportTitle')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-blue-700 text-blue-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleImport} className="p-5 space-y-4">
          {/* Stock Imported Input */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-800 block">
              <span>{t('addQuantityLabel')}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="any"
                value={stockQuantityStr}
                onChange={(e) => {
                  setStockQuantityStr(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="3000"
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 text-2xl font-black text-slate-900 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Quick stock chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {quickStockChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setStockQuantityStr(String(chip));
                    setErrorMsg(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-black transition-all ${
                    stockQuantity === chip
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  +{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Purchase Cost / Egg */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-800 block">
              <span>{t('purchaseCostLabel')}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={purchaseCostStr}
                onChange={(e) => {
                  setPurchaseCostStr(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="2.00"
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl pl-9 pr-4 py-2.5 text-xl font-black text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Total Purchase Cost Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {t('total')}
              </div>
              <div className="text-sm font-bold text-slate-600">
                {stockQuantity} {t('eggs')} × ₹{purchaseCost}
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{totalPurchaseCost.toLocaleString('en-IN')}
            </div>
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
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
              <PackagePlus className="w-5 h-5" />
              <span>{isSaving ? t('loading') : t('saveStockButton')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
