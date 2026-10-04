import React, { useState } from 'react';
import { DailyStock } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { getTodayDateString } from '../lib/offlineStorage';
import { Check, X, AlertCircle, TrendingUp } from 'lucide-react';
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

  // Everyday starts at 0 (or existing stock if already set)
  const initialStockStr = currentStock?.remainingStock ? String(currentStock.remainingStock) : '0';
  const [stockQuantityStr, setStockQuantityStr] = useState<string>(initialStockStr);

  // Stock Purchase Price for 30 Eggs / 1 Tara (used for profit calculation)
  const initial30Price = currentStock?.purchaseCost && currentStock.purchaseCost > 0
    ? String(Math.round(currentStock.purchaseCost * 30))
    : '0';
  const [pricePer30Str, setPricePer30Str] = useState<string>(initial30Price);

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stockQuantity = parseInt(stockQuantityStr, 10) || 0;
  const num30Price = parseFloat(pricePer30Str) || 0;
  const currentEggsSold = currentStock?.eggsSold ?? 0;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockQuantity <= 0) {
      setErrorMsg(
        isTamil
          ? 'முட்டை எண்ணிக்கையை உள்ளிடவும் (0 விட அதிகமாக)'
          : 'Egg quantity must be greater than 0'
      );
      return;
    }
    if (num30Price < 0) {
      setErrorMsg(
        isTamil ? 'விலை 0 அல்லது அதிகமாக இருக்க வேண்டும்' : 'Price cannot be negative'
      );
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    // Stock cost per egg for profit calculation
    const calculatedCostPerEgg = num30Price > 0 ? parseFloat((num30Price / 30).toFixed(2)) : 0;

    // Directly sets today's stock to the entered quantity
    const newOpeningStock = stockQuantity + currentEggsSold;
    const newImportedStock = stockQuantity;
    const newRemainingStock = Math.max(0, stockQuantity - currentEggsSold);

    const updatedStock: DailyStock = {
      date: todayStr,
      openingStock: newOpeningStock,
      importedStock: newImportedStock,
      eggsSold: currentEggsSold,
      remainingStock: newRemainingStock,
      purchaseCost: calculatedCostPerEgg,
      updatedAt: new Date().toISOString(),
    };

    try {
      await EggAgencyService.saveTodayStock(updatedStock);
      onStockUpdated(updatedStock);

      // Save purchase cost into today's price as well so profit calculations use it immediately
      if (calculatedCostPerEgg > 0) {
        const todayPriceDoc = await EggAgencyService.getTodayPrice(todayStr);
        if (todayPriceDoc) {
          await EggAgencyService.saveTodayPrice({
            ...todayPriceDoc,
            purchaseCost: calculatedCostPerEgg,
          });
        }
      }

      setSuccessMsg(t('stockUpdatedSuccess'));
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-blue-800 text-white px-5 py-4 flex items-center justify-between">
          <h3 className="font-black text-base md:text-lg">{t('stockImportTitle')}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-blue-700 text-blue-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleImport} className="p-5 space-y-4">
          {/* Stock Input */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-800 block">
              <span>{t('addQuantityLabel')}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={stockQuantityStr}
                onChange={(e) => {
                  setStockQuantityStr(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="0"
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 text-3xl font-black text-slate-900 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                autoFocus
              />
            </div>
          </div>

          {/* Stock Purchase Price for 30 Eggs / 1 Tara (Used for Profit Calculation) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-black text-slate-800 block">
                <span>
                  {isTamil
                    ? 'கொள்முதல் அடக்க விலை (30 முட்டை / 1 தாரா)'
                    : 'Stock Purchase Price (30 Eggs / 1 Tara)'}
                </span>
              </label>
              <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {isTamil ? 'லாபம் கணக்கிட' : 'For Profit'}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-lg">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={pricePer30Str}
                onChange={(e) => {
                  setPricePer30Str(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="0"
                className="w-full bg-emerald-50/30 border-2 border-emerald-300 focus:border-emerald-500 rounded-2xl pl-9 pr-4 py-3 text-2xl font-black text-emerald-950 font-mono focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
              />
            </div>

            {/* Helper: Profit calculation indicator & 1-egg equivalent */}
            <div className="flex items-center justify-between text-xs font-bold pt-0.5 px-1">
              <span className="text-emerald-700">
                {isTamil ? 'விற்பனை லாபம் கணக்கிட பயன்படும்' : 'Used to calculate today’s profit'}
              </span>
              {num30Price > 0 && (
                <span className="text-slate-600 font-mono">
                  (₹{(num30Price / 30).toFixed(2)} / egg)
                </span>
              )}
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

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black text-base py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98]"
            >
              <span>{isSaving ? t('loading') : t('saveStockButton')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
