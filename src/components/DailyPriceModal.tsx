import React, { useState } from 'react';
import { DailyPrice } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { getTodayDateString } from '../lib/offlineStorage';
import { Check, X, AlertCircle, Sparkles } from 'lucide-react';
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
  const initial30Price =
    currentPrice?.pricePer30Eggs && currentPrice.pricePer30Eggs > 0
      ? String(currentPrice.pricePer30Eggs)
      : '0';

  const [pricePer30EggsStr, setPricePer30EggsStr] = useState<string>(initial30Price);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const numPricePer30Eggs = parseFloat(pricePer30EggsStr) || 0;
  const autoCalculatedEggPrice =
    numPricePer30Eggs > 0 ? (numPricePer30Eggs / 30).toFixed(2) : '0.00';

  // Quick +/- adjustment for 1 Tara (30 Eggs)
  const handlePriceStep = (delta: number) => {
    const current = parseFloat(pricePer30EggsStr) || 0;
    const nextVal = Math.max(0, current + delta);
    setPricePer30EggsStr(String(nextVal));
    setErrorMsg(null);
  };

  const handleQuickPreset = (presetVal: number) => {
    setPricePer30EggsStr(String(presetVal));
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(numPricePer30Eggs) || numPricePer30Eggs <= 0) {
      setErrorMsg(
        isTamil
          ? '1 தாரா விலையை உள்ளிடவும் (₹0 விட அதிகமாக இருக்க வேண்டும்)'
          : 'Please enter a valid 1 Tara price greater than ₹0'
      );
      return;
    }

    const finalEggPrice = parseFloat((numPricePer30Eggs / 30).toFixed(2));
    const final30Price = numPricePer30Eggs;

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
      setSuccessMsg(
        isTamil
          ? '1 தாரா விலை வெற்றிகரமாக சேமிக்கப்பட்டது!'
          : '1 Tara price successfully saved!'
      );
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-blue-800 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-black text-base md:text-lg">
              {isTamil ? '1 தாரா விலை நிர்ணயம்' : 'Set 1 Tara Price'}
            </h3>
            <p className="text-xs text-blue-200 font-bold">
              {isTamil
                ? '30 முட்டைகள் (1 தாரா) விற்பனை விலை'
                : '30 Eggs (1 Tara / Tray) Selling Price'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-blue-700 text-blue-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* 1 Tara (30 Eggs) Price - The ONLY requested price */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-900 block">
              <span>
                {isTamil
                  ? '1 தாரா (30 முட்டைகள்) விலை (₹)'
                  : '1 Tara (30 Eggs) Price (₹)'}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePriceStep(-5)}
                className="w-12 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-sm transition-all"
                title="-5"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => handlePriceStep(-1)}
                className="w-10 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-xs transition-all"
                title="-1"
              >
                -1
              </button>

              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-2xl">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={pricePer30EggsStr}
                  onChange={(e) => {
                    setPricePer30EggsStr(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="0"
                  className="w-full bg-slate-50 border-2 border-blue-400 focus:border-blue-600 rounded-2xl pl-9 pr-3 py-3 text-3xl font-black text-slate-900 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={() => handlePriceStep(1)}
                className="w-10 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-xs transition-all"
                title="+1"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => handlePriceStep(5)}
                className="w-12 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-sm transition-all"
                title="+5"
              >
                +5
              </button>
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              {[135, 150, 165, 180, 195].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickPreset(preset)}
                  className={`flex-1 py-1.5 rounded-xl font-mono text-xs font-black transition-all ${
                    numPricePer30Eggs === preset
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>

            {/* Auto-calculated single egg rate information (Derived automatically, never asked) */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between text-xs mt-2">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {isTamil
                    ? '1 முட்டை விலை (தானாக கணக்கிடப்பட்டது):'
                    : '1 Egg Equivalent (Auto-calculated):'}
                </span>
              </div>
              <div className="font-black text-blue-900 text-sm font-mono">
                ₹{autoCalculatedEggPrice}
              </div>
            </div>
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black text-base py-3.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98]"
            >
              <span>{isSaving ? t('loading') : t('saveAndLockPrice')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
