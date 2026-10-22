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
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl overflow-hidden border border-slate-200">
        {/* Header - Compact */}
        <div className="bg-blue-800 text-white px-3.5 py-2.5 flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm sm:text-base leading-tight">
              {isTamil ? '1 தாரா விலை நிர்ணயம்' : 'Set 1 Tara Price'}
            </h3>
            <p className="text-[11px] text-blue-200 font-bold">
              {isTamil
                ? '30 முட்டைகள் (1 தாரா) விற்பனை விலை'
                : '30 Eggs (1 Tara / Tray) Selling Price'}
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

        <form onSubmit={handleSave} className="p-3 sm:p-4 space-y-3">
          {/* 1 Tara (30 Eggs) Price - Compact */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-900 block">
              <span>
                {isTamil
                  ? '1 தாரா (30 முட்டைகள்) விலை (₹)'
                  : '1 Tara (30 Eggs) Price (₹)'}
              </span>
            </label>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePriceStep(-5)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-xs transition-all cursor-pointer"
                title="-5"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => handlePriceStep(-1)}
                className="w-8 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-[11px] transition-all cursor-pointer"
                title="-1"
              >
                -1
              </button>

              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">
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
                  className="w-full bg-slate-50 border-2 border-blue-400 focus:border-blue-600 rounded-xl pl-7 pr-2 py-1.5 text-2xl font-black text-slate-900 text-center font-mono focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={() => handlePriceStep(1)}
                className="w-8 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-[11px] transition-all cursor-pointer"
                title="+1"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => handlePriceStep(5)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-800 font-black text-xs transition-all cursor-pointer"
                title="+5"
              >
                +5
              </button>
            </div>

            {/* Quick preset chips - Compact */}
            <div className="flex items-center justify-between gap-1 pt-0.5">
              {[135, 150, 165, 180, 195].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickPreset(preset)}
                  className={`flex-1 py-1 rounded-lg font-mono text-[11px] font-black transition-all cursor-pointer ${
                    numPricePer30Eggs === preset
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>

            {/* Auto-calculated single egg rate information - Compact */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2 flex items-center justify-between text-xs mt-1">
              <div className="flex items-center gap-1 font-bold text-blue-900 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {isTamil
                    ? '1 முட்டை விலை (தானாக):'
                    : '1 Egg Equivalent (Auto):'}
                </span>
              </div>
              <div className="font-black text-blue-900 text-xs font-mono">
                ₹{autoCalculatedEggPrice}
              </div>
            </div>
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
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

          {/* Save Button - Compact */}
          <div className="pt-0.5">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black text-sm py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 active:scale-[0.98] cursor-pointer"
            >
              <span>{isSaving ? t('loading') : t('saveAndLockPrice')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
