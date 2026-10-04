import React, { useState } from 'react';
import { DailyPrice } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { getTodayDateString } from '../lib/offlineStorage';
import { Check, X, AlertCircle } from 'lucide-react';
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
  const { t, isTamil } = useLanguage();
  const todayStr = getTodayDateString();

  // Everyday starts fresh as zero (or existing today's price if previously entered)
  const initialEggPrice = currentPrice?.pricePerEgg && currentPrice.pricePerEgg > 0
    ? String(currentPrice.pricePerEgg)
    : '0';

  const initial30Price = currentPrice?.pricePer30Eggs && currentPrice.pricePer30Eggs > 0
    ? String(currentPrice.pricePer30Eggs)
    : '0';

  const [pricePerEggStr, setPricePerEggStr] = useState<string>(initialEggPrice);
  const [pricePer30EggsStr, setPricePer30EggsStr] = useState<string>(initial30Price);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When 30-egg price changes, auto-suggest 1-egg price
  const handle30Change = (valStr: string) => {
    setPricePer30EggsStr(valStr);
    setErrorMsg(null);
    const n = parseFloat(valStr);
    if (!isNaN(n) && n > 0) {
      setPricePerEggStr((n / 30).toFixed(2));
    }
  };

  // When 1-egg price changes, auto-suggest 30-egg price if untouched
  const handleEggChange = (valStr: string) => {
    setPricePerEggStr(valStr);
    setErrorMsg(null);
    const n = parseFloat(valStr);
    if (!isNaN(n) && n > 0 && (!parseFloat(pricePer30EggsStr) || parseFloat(pricePer30EggsStr) === 0)) {
      setPricePer30EggsStr(String(Math.round(n * 30)));
    }
  };

  // Quick +/- adjustment for 30 Eggs / 1 Tara
  const handlePriceStep = (delta: number) => {
    const current = parseFloat(pricePer30EggsStr) || 0;
    const nextVal = Math.max(0, current + delta);
    setPricePer30EggsStr(String(nextVal));
    if (nextVal > 0) {
      setPricePerEggStr((nextVal / 30).toFixed(2));
    }
    setErrorMsg(null);
  };

  // Quick +/- adjustment for 1 Egg
  const handleEggStep = (delta: number) => {
    const current = parseFloat(pricePerEggStr) || 0;
    const nextVal = Math.max(0, parseFloat((current + delta).toFixed(2)));
    setPricePerEggStr(String(nextVal));
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPricePerEgg = parseFloat(pricePerEggStr);
    const numPricePer30Eggs = parseFloat(pricePer30EggsStr);

    if (
      (isNaN(numPricePerEgg) || numPricePerEgg <= 0) &&
      (isNaN(numPricePer30Eggs) || numPricePer30Eggs <= 0)
    ) {
      setErrorMsg(
        isTamil
          ? 'முட்டை விலையை உள்ளிடவும் (₹0 விட அதிகமாக இருக்க வேண்டும்)'
          : 'Please enter a valid price greater than ₹0'
      );
      return;
    }

    const finalEggPrice = numPricePerEgg > 0 ? numPricePerEgg : parseFloat((numPricePer30Eggs / 30).toFixed(2));
    const final30Price = numPricePer30Eggs > 0 ? numPricePer30Eggs : parseFloat((numPricePerEgg * 30).toFixed(2));

    setIsSaving(true);
    setErrorMsg(null);

    const updatedPrice: DailyPrice = {
      date: todayStr,
      pricePerEgg: finalEggPrice,
      pricePer30Eggs: final30Price,
      purchaseCost: currentPrice?.purchaseCost ?? 0,
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
          <h3 className="font-black text-base md:text-lg">
            {isTamil ? 'இன்றைய விற்பனை விலை நிர்ணயம்' : "Set Today's Selling Price"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-blue-700 text-blue-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* 1 Egg Price */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-900 block">
              <span>{isTamil ? 'ஒரு முட்டை விலை (₹)' : 'Price per Egg (₹)'}</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleEggStep(-0.5)}
                className="w-12 h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-xs transition-all"
                title="-0.50"
              >
                -0.5
              </button>
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={pricePerEggStr}
                  onChange={(e) => handleEggChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl pl-9 pr-3 py-2.5 text-2xl font-black text-slate-900 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => handleEggStep(0.5)}
                className="w-12 h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-xs transition-all"
                title="+0.50"
              >
                +0.5
              </button>
            </div>
          </div>

          {/* 30 Eggs / 1 Tara Price */}
          <div className="space-y-1.5">
            <label className="text-sm font-black text-slate-900 block">
              <span>{isTamil ? '30 முட்டை விலை / 1 தாரா (தட்டு) (₹)' : '30 Eggs / 1 Tara (Tray) Price (₹)'}</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePriceStep(-5)}
                className="w-12 h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-xs transition-all"
                title="-5"
              >
                -5
              </button>
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={pricePer30EggsStr}
                  onChange={(e) => handle30Change(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl pl-9 pr-3 py-2.5 text-2xl font-black text-slate-900 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => handlePriceStep(5)}
                className="w-12 h-13 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-xs transition-all"
                title="+5"
              >
                +5
              </button>
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

          {/* Action Button - Full Width */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black text-base py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98]"
            >
              <span>{isSaving ? t('loading') : t('saveAndLockPrice')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
