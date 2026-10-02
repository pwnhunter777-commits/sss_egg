import React, { useState } from 'react';
import { DailyPrice } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { getTodayDateString } from '../lib/offlineStorage';
import { Check, X, AlertCircle, Plus, Minus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  currentPrice: DailyPrice | null;
  onPriceUpdated: (price: DailyPrice) => void;
  onClose: () => void;
}

export const DailyPriceModal: React.FC<Props> = ({
  currentPrice,
  onPriceUpdated,
  onClose,
}) => {
  const { t } = useLanguage();
  const todayStr = getTodayDateString();
  const [pricePerEggStr, setPricePerEggStr] = useState<string>(
    String(currentPrice?.pricePerEgg ?? 3)
  );
  const [pricePer30EggsStr, setPricePer30EggsStr] = useState<string>(
    String(currentPrice?.pricePer30Eggs ?? (currentPrice?.pricePerEgg ? currentPrice.pricePerEgg * 30 : 90))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle typing in 1-egg price
  const handleEggPriceInputChange = (valStr: string) => {
    setPricePerEggStr(valStr);
    setErrorMsg(null);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      setPricePer30EggsStr(String(Math.round(parsed * 30)));
    }
  };

  // Handle plus / minus buttons
  const handleEggPriceStep = (delta: number) => {
    const current = parseFloat(pricePerEggStr) || 0;
    const nextVal = Math.max(0.5, parseFloat((current + delta).toFixed(2)));
    setPricePerEggStr(String(nextVal));
    setPricePer30EggsStr(String(Math.round(nextVal * 30)));
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPricePerEgg = parseFloat(pricePerEggStr);
    const numPricePer30Eggs = parseFloat(pricePer30EggsStr);

    if (isNaN(numPricePerEgg) || numPricePerEgg <= 0) {
      setErrorMsg('Price per egg must be a valid number greater than ₹0');
      return;
    }
    if (isNaN(numPricePer30Eggs) || numPricePer30Eggs <= 0) {
      setErrorMsg('Price for 30 eggs must be a valid number greater than ₹0');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const updatedPrice: DailyPrice = {
      date: todayStr,
      pricePerEgg: numPricePerEgg,
      pricePer30Eggs: numPricePer30Eggs,
      purchaseCost: currentPrice?.purchaseCost ?? 2,
      updatedAt: new Date().toISOString(),
    };

    try {
      await EggAgencyService.saveTodayPrice(updatedPrice);
      onPriceUpdated(updatedPrice);
      setSuccessMsg(t('priceUpdatedSuccess'));
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save daily price');
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
            <h3 className="font-black text-base md:text-lg">{t('setDailyPriceTitle')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-blue-700 text-blue-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Price of 1 Egg */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-800 block">
              <span>{t('pricePerEggLabel')}</span>
            </label>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleEggPriceStep(-0.5)}
                className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-lg transition-all"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={pricePerEggStr}
                  onChange={(e) => handleEggPriceInputChange(e.target.value)}
                  placeholder="3.00"
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl pl-9 pr-3 py-2.5 text-xl font-black text-slate-900 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => handleEggPriceStep(0.5)}
                className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-lg transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Price of 30 Eggs */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-800 block">
              <span>{t('pricePer30Label')}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                value={pricePer30EggsStr}
                onChange={(e) => {
                  setPricePer30EggsStr(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="90"
                className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl pl-9 pr-4 py-2.5 text-xl font-black text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
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
              <Check className="w-5 h-5" />
              <span>{isSaving ? t('loading') : t('saveAndLockPrice')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
