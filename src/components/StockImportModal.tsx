import React, { useState } from 'react';
import { DailyStock } from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { getTodayDateString } from '../lib/offlineStorage';
import { PackagePlus, Check, X, AlertCircle, AlertTriangle, Calendar, Layers } from 'lucide-react';

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
  const todayStr = getTodayDateString();
  const alreadyImportedToday = (currentStock?.openingStock ?? 0) > 0;

  const [importMode, setImportMode] = useState<'initial' | 'add_more'>(
    alreadyImportedToday ? 'add_more' : 'initial'
  );
  const [stockQuantity, setStockQuantity] = useState<number>(3000);
  const [purchaseCost, setPurchaseCost] = useState<number>(currentStock?.purchaseCost ?? 2);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quickStockChips = [500, 1000, 2000, 3000, 5000];

  const totalPurchaseCost = stockQuantity * purchaseCost;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockQuantity <= 0) {
      setErrorMsg('Imported quantity must be greater than 0');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    let newOpeningStock = 0;
    let newImportedStock = 0;
    let newRemainingStock = 0;
    let currentEggsSold = currentStock?.eggsSold ?? 0;

    if (alreadyImportedToday && importMode === 'add_more') {
      // Adding more stock to existing day
      newOpeningStock = (currentStock?.openingStock ?? 0) + stockQuantity;
      newImportedStock = (currentStock?.importedStock ?? 0) + stockQuantity;
      newRemainingStock = (currentStock?.remainingStock ?? 0) + stockQuantity;
    } else {
      // New opening stock for the day
      newOpeningStock = stockQuantity;
      newImportedStock = stockQuantity;
      newRemainingStock = stockQuantity - currentEggsSold;
    }

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
      setSuccessMsg('Stock imported successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import stock');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-sm">Daily Stock Import</h3>
              <p className="text-[10px] text-blue-200 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date: {todayStr}
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

        <form onSubmit={handleImport} className="p-4 space-y-4">
          {/* Duplicate Stock Import Protection Warning */}
          {alreadyImportedToday && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <span className="font-bold">Stock already imported for today!</span>
                  <div className="text-[11px] text-amber-800 mt-0.5">
                    Opening Stock: <b>{currentStock?.openingStock} eggs</b> • Sold: <b>{currentStock?.eggsSold}</b> • Remaining: <b>{currentStock?.remainingStock}</b>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setImportMode('add_more')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    importMode === 'add_more'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  }`}
                >
                  + Add More Stock
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('initial')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    importMode === 'initial'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  }`}
                >
                  Reset Opening Stock
                </button>
              </div>
            </div>
          )}

          {/* Stock Imported Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex justify-between">
              <span>{importMode === 'add_more' ? 'Additional Stock to Add' : 'Today\'s Stock Quantity'}</span>
              <span className="text-blue-700 font-mono font-black">{stockQuantity} eggs</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="10"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-lg font-black text-slate-900 text-center font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick stock chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickStockChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setStockQuantity(chip)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    stockQuantity === chip
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  +{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Purchase Cost / Egg */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex justify-between">
              <span>Purchase Cost per Egg</span>
              <span className="text-slate-500 text-[11px]">Supplier rate</span>
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

          {/* Total Purchase Cost Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Purchase Cost
              </div>
              <div className="text-xs text-slate-600">
                {stockQuantity} eggs × ₹{purchaseCost}
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 font-mono">
              ₹{totalPurchaseCost.toLocaleString('en-IN')}
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
              <PackagePlus className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Saving...'
                  : importMode === 'add_more'
                  ? 'Add Stock'
                  : 'Import Stock'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
