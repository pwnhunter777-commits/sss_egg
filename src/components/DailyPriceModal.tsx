import React, { useState } from 'react';
import { DailyPrice } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { getTodayDateString } from '../lib/offlineStorage';
import { DollarSign, Check, X, AlertCircle, Percent, Plus, Minus, Calendar } from 'lucide-react';

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
  const todayStr = getTodayDateString();
  const [pricePerEgg, setPricePerEgg] = useState<number>(currentPrice?.pricePerEgg ?? 3);
  const [pricePer30Eggs, setPricePer30Eggs] = useState<number>(
    currentPrice?.pricePer30Eggs ?? (currentPrice?.pricePerEgg ? currentPrice.pricePerEgg * 30 : 90)
  );
  const [purchaseCost, setPurchaseCost] = useState<number>(currentPrice?.purchaseCost ?? 2);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When 1-egg price changes, auto-update 30-egg price unless custom
  const handleEggPriceChange = (newVal: number) => {
    const val = Math.max(0.5, parseFloat(newVal.toFixed(2)));
    setPricePerEgg(val);
    setPricePer30Eggs(Math.round(val * 30));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pricePerEgg <= 0) {
      setErrorMsg('Price per egg must be greater than 0');
      return;
    }
    if (purchaseCost < 0) {
      setErrorMsg('Purchase cost cannot be negative');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const updatedPrice: DailyPrice = {
      date: todayStr,
      pricePerEgg,
      pricePer30Eggs,
      purchaseCost,
      updatedAt: new Date().toISOString(),
    };

    try {
      await EggAgencyService.saveTodayPrice(updatedPrice);
      onPriceUpdated(updatedPrice);
      setSuccessMsg("Today's price saved successfully!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save daily price');
    } finally {
      setIsSaving(false);
    }
  };

  const estimatedMarginPerEgg = Math.max(0, pricePerEgg - purchaseCost);
  const marginPercentage = pricePerEgg > 0 ? ((estimatedMarginPerEgg / pricePerEgg) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-sm">Update Daily Price</h3>
              <p className="text-[10px] text-blue-200 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Business Date: {todayStr}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-blue-700 text-blue-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div className="text-xs text-slate-600 bg-blue-50 border border-blue-100 p-2.5 rounded-xl leading-relaxed">
            Updating today's price applies immediately to new bills. Historical bills from previous days remain permanently locked.
          </div>

          {/* Price of 1 Egg */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex justify-between">
              <span>Price of 1 Egg</span>
              <span className="text-blue-700 font-mono">₹{pricePerEgg}</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleEggPriceChange(pricePerEgg - 0.5)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-700 font-bold"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={pricePerEgg}
                  onChange={(e) => handleEggPriceChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-base font-bold text-slate-900 text-center font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleEggPriceChange(pricePerEgg + 0.5)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-700 font-bold"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Price of 30 Eggs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex justify-between">
              <span>Price of 30 Eggs (1 Tray)</span>
              <span className="text-slate-400 font-mono text-[11px] font-normal">
                Normally ₹{pricePerEgg * 30}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="1"
                min="1"
                value={pricePer30Eggs}
                onChange={(e) => setPricePer30Eggs(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-base font-bold text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Purchase Cost */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex justify-between">
              <span>Purchase Cost per Egg</span>
              <span className="text-slate-500 font-mono text-[11px]">Paid to supplier</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-base font-bold text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Margin Estimation Card */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Profit Margin per Egg:</span>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-emerald-900">₹{estimatedMarginPerEgg.toFixed(2)}</span>
              <span className="text-[10px] text-emerald-700 ml-1">({marginPercentage}%)</span>
            </div>
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 px-4 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : "Save Today's Price"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
