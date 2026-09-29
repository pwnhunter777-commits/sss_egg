import React, { useState, useEffect } from 'react';
import {
  Bill,
  DailyPrice,
  DailyStock,
  AgencySettings,
  PrinterDevice,
} from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { ThermalReceipt } from './ThermalReceipt';
import { BluetoothPrinterModal } from './BluetoothPrinterModal';
import { thermalPrinter } from '../lib/thermalPrinter';
import { playChimeSound, playPrintClickSound } from '../lib/soundNotification';
import {
  Egg,
  LogOut,
  Printer,
  History,
  PlusCircle,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Delete,
  Search,
  RefreshCw,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface Props {
  settings: AgencySettings;
  printer: PrinterDevice;
  onUpdatePrinter: (p: PrinterDevice) => void;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<Props> = ({
  settings,
  printer,
  onUpdatePrinter,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'billing' | 'history'>('billing');
  const [todayPrice, setTodayPrice] = useState<DailyPrice | null>(null);
  const [todayStock, setTodayStock] = useState<DailyStock | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Billing form state
  const [eggQuantityStr, setEggQuantityStr] = useState<string>('');
  const [billingError, setBillingError] = useState<string | null>(null);
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [createdBill, setCreatedBill] = useState<Bill | null>(null);

  // Modals
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);

  // Search in history
  const [historySearch, setHistorySearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const todayDate = new Date().toISOString().split('T')[0];

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerAutoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscriptions to Price, Stock, Bills
  useEffect(() => {
    const unsubPrice = EggAgencyService.subscribeToPrice(todayDate, (price) => {
      if (price) setTodayPrice(price);
    });

    const unsubStock = EggAgencyService.subscribeToStock(todayDate, (stock) => {
      if (stock) setTodayStock(stock);
    });

    const unsubBills = EggAgencyService.subscribeToDateBills(todayDate, (billList) => {
      setBills(billList);
    });

    // Initial fetch fallback
    EggAgencyService.getTodayPrice(todayDate).then(setTodayPrice);
    EggAgencyService.getTodayStock(todayDate).then(setTodayStock);

    return () => {
      unsubPrice();
      unsubStock();
      unsubBills();
    };
  }, [todayDate]);

  const triggerAutoSync = async () => {
    setIsSyncing(true);
    try {
      const res = await EggAgencyService.syncPendingBills();
      if (res.syncedCount > 0) {
        setSyncStatusMsg(`Synced ${res.syncedCount} offline bill(s)`);
        setTimeout(() => setSyncStatusMsg(null), 3000);
      }
    } catch {
      // offline silent
    } finally {
      setIsSyncing(false);
    }
  };

  // Billing calculations
  const eggQuantity = parseInt(eggQuantityStr || '0', 10);
  const pricePerEgg = todayPrice?.pricePerEgg || 3;
  const pricePer30Eggs = todayPrice?.pricePer30Eggs || pricePerEgg * 30;

  // Calculated Total Amount
  const calculatedTotal =
    eggQuantity >= 30 && pricePer30Eggs > 0
      ? Math.floor(eggQuantity / 30) * pricePer30Eggs + (eggQuantity % 30) * pricePerEgg
      : eggQuantity * pricePerEgg;

  const remainingStock = todayStock?.remainingStock ?? 0;
  const isStockInsufficient = eggQuantity > 0 && eggQuantity > remainingStock;

  // Quick quantity buttons
  const quickQuantities = [1, 5, 10, 15, 30, 45, 60, 75, 90, 100];

  const handleKeypadDigit = (digit: string) => {
    setBillingError(null);
    playPrintClickSound();
    if (eggQuantityStr === '0') {
      setEggQuantityStr(digit);
    } else {
      if (eggQuantityStr.length < 5) {
        setEggQuantityStr(eggQuantityStr + digit);
      }
    }
  };

  const handleKeypadBackspace = () => {
    playPrintClickSound();
    if (eggQuantityStr.length > 0) {
      setEggQuantityStr(eggQuantityStr.slice(0, -1));
    }
  };

  const handleKeypadClear = () => {
    setEggQuantityStr('');
    setBillingError(null);
  };

  const handleQuickAdd = (qty: number) => {
    playPrintClickSound();
    const current = parseInt(eggQuantityStr || '0', 10);
    setEggQuantityStr(String(current + qty));
    setBillingError(null);
  };

  const handleSetQuick = (qty: number) => {
    playPrintClickSound();
    setEggQuantityStr(String(qty));
    setBillingError(null);
  };

  // Create Bill
  const handleCreateBill = async (shouldAutoPrint: boolean) => {
    if (eggQuantity <= 0) {
      setBillingError('Please enter egg quantity');
      return;
    }

    if (isStockInsufficient) {
      setBillingError(`Insufficient stock! Only ${remainingStock} eggs available.`);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      return;
    }

    setIsCreatingBill(true);
    setBillingError(null);

    try {
      const newBill = await EggAgencyService.createBill({
        eggQuantity,
        employeeName: 'Staff Employee',
      });

      // Reset billing input
      setEggQuantityStr('');
      playChimeSound();
      setCreatedBill(newBill);
      setActiveReceiptBill(newBill);

      // Auto print if requested or configured
      if (shouldAutoPrint || printer.autoPrintOnBill) {
        setTimeout(() => {
          thermalPrinter.printBill(newBill, settings, printer.paperWidth).catch(() => {});
        }, 300);
      }
    } catch (err: any) {
      setBillingError(err.message || 'Failed to create bill');
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } finally {
      setIsCreatingBill(false);
    }
  };

  const filteredBills = bills.filter((b) => {
    if (!historySearch.trim()) return true;
    return (
      String(b.billNumber).includes(historySearch) ||
      b.time.toLowerCase().includes(historySearch.toLowerCase()) ||
      String(b.eggQuantity).includes(historySearch)
    );
  });

  const pendingSyncCount = bills.filter((b) => b.syncStatus === 'pending').length;

  return (
    <div className="flex-1 flex flex-col bg-slate-100 text-slate-800">
      {/* Top Bar Header */}
      <header className="bg-blue-700 text-white px-4 py-3 shadow-md shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Egg className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight uppercase leading-tight">
                {settings.agencyName || 'SSS EGG AGENCY'}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-blue-200">
                <span className="font-semibold text-white">Employee Billing</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {isOnline ? (
                    <span className="text-emerald-300 flex items-center gap-0.5">
                      <Wifi className="w-3 h-3" /> Online
                    </span>
                  ) : (
                    <span className="text-amber-300 flex items-center gap-0.5 font-bold">
                      <WifiOff className="w-3 h-3" /> Offline
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Bluetooth Printer Button */}
            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                thermalPrinter.isConnected()
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Thermal Printer"
            >
              <Printer className="w-4 h-4" />
              <span className="text-[10px] hidden xs:inline">
                {thermalPrinter.isConnected() ? 'Printer ON' : 'Printer'}
              </span>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync banner if pending bills */}
        {pendingSyncCount > 0 && (
          <div className="mt-2 bg-amber-400/20 border border-amber-300/30 rounded-lg px-2.5 py-1 flex items-center justify-between text-[11px] text-amber-200">
            <span>{pendingSyncCount} bill(s) saved locally (Offline)</span>
            <button
              onClick={triggerAutoSync}
              disabled={isSyncing || !isOnline}
              className="text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}

        {syncStatusMsg && (
          <div className="mt-1 bg-emerald-400/20 border border-emerald-300/30 rounded-lg px-2.5 py-1 text-[11px] text-emerald-200">
            {syncStatusMsg}
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <nav aria-label="Employee Navigation" className="bg-white border-b border-slate-200 px-3 py-1.5 flex gap-2 shrink-0 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'billing'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Bill</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Bill History ({bills.length})</span>
        </button>
      </nav>

      {/* TAB CONTENT: BILLING SCREEN */}
      {activeTab === 'billing' && (
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3 space-y-3">
          {/* Read-Only Current Price Banner */}
          <div className="bg-white rounded-2xl p-3 border border-blue-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                🥚
              </div>
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Today's Price (Set by Owner)
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-blue-900">
                    ₹{pricePerEgg} <span className="text-xs font-normal text-slate-500">/ egg</span>
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-slate-700">
                    30 Eggs = ₹{pricePer30Eggs}
                  </span>
                </div>
              </div>
            </div>

            {/* Remaining Stock Badge */}
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                In Stock
              </div>
              <div
                className={`text-xs font-extrabold px-2 py-0.5 rounded-full inline-block ${
                  remainingStock > 200
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : remainingStock > 0
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {remainingStock} eggs
              </div>
            </div>
          </div>

          {/* Quantity & Calculation Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>ENTER EGG QUANTITY</span>
              {eggQuantity >= 30 && (
                <span className="text-blue-600 font-mono text-[11px] bg-blue-50 px-2 py-0.5 rounded-full">
                  {Math.floor(eggQuantity / 30)} Tray{Math.floor(eggQuantity / 30) > 1 ? 's' : ''}
                  {eggQuantity % 30 > 0 ? ` + ${eggQuantity % 30} loose` : ''}
                </span>
              )}
            </div>

            {/* Large Quantity Input Display */}
            <div className="bg-slate-50 border-2 border-blue-500/30 rounded-2xl p-2.5 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {eggQuantityStr || '0'}
                </span>
                <span className="text-sm font-semibold text-slate-500">Eggs</span>
              </div>

              {/* Automatic Total Calculation */}
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Amount</div>
                <div className="text-2xl font-black text-blue-700 font-mono">
                  ₹{calculatedTotal}
                </div>
              </div>
            </div>

            {/* Price formula hint */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 px-1">
              <span>Formula: {eggQuantity || 0} × ₹{pricePerEgg}</span>
              <span className="font-semibold text-slate-700">Net = ₹{calculatedTotal}</span>
            </div>

            {/* Stock Insufficient Warning */}
            {isStockInsufficient && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2 text-xs text-rose-700 font-bold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Insufficient stock! Only {remainingStock} eggs available. Cannot create bill.</span>
              </div>
            )}

            {billingError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2 text-xs text-rose-700 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{billingError}</span>
              </div>
            )}
          </div>

          {/* Quick-Add Quantity Chips */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase px-1">
              Quick Quantities (Tap to set)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickQuantities.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleSetQuick(qty)}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                    eggQuantity === qty
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  {qty}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                className="px-2.5 py-1.5 rounded-xl font-bold text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all active:scale-95"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Touch Number Pad for Phone */}
          <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs">
            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleKeypadDigit(d)}
                  className="h-11 rounded-xl bg-slate-50 hover:bg-blue-50 active:bg-blue-100 text-slate-800 font-bold text-lg flex items-center justify-center border border-slate-200/80 active:scale-95 transition-all shadow-2xs"
                >
                  {d}
                </button>
              ))}

              <button
                type="button"
                onClick={handleKeypadClear}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 active:scale-95 transition-all"
              >
                CLEAR
              </button>

              <button
                type="button"
                onClick={() => handleKeypadDigit('0')}
                className="h-11 rounded-xl bg-slate-50 hover:bg-blue-50 active:bg-blue-100 text-slate-800 font-bold text-lg flex items-center justify-center border border-slate-200/80 active:scale-95 transition-all shadow-2xs"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="h-11 rounded-xl bg-slate-100 hover:bg-rose-50 active:bg-rose-100 text-rose-600 flex items-center justify-center border border-slate-200 active:scale-95 transition-all"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="pt-1 pb-4 space-y-2">
            <button
              type="button"
              onClick={() => handleCreateBill(true)}
              disabled={isCreatingBill || eggQuantity <= 0 || isStockInsufficient}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
                eggQuantity > 0 && !isStockInsufficient
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 ring-2 ring-blue-400/30'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <Printer className="w-5 h-5" />
              <span>{isCreatingBill ? 'Generating Bill...' : 'Create & Print Bill'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCreateBill(false)}
              disabled={isCreatingBill || eggQuantity <= 0 || isStockInsufficient}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 ${
                eggQuantity > 0 && !isStockInsufficient
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Create Bill Only (No Print)</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BILL HISTORY */}
      {activeTab === 'history' && (
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Bill # or Time..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bills List */}
          <div className="flex-1 space-y-2">
            {filteredBills.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 space-y-2">
                <Egg className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-semibold text-xs">No bills created yet today</p>
                <p className="text-[11px] text-slate-400">
                  Switch to the "Create Bill" tab to create your first bill.
                </p>
              </div>
            ) : (
              filteredBills.map((b) => (
                <div
                  key={b.billId}
                  className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex items-center justify-between hover:border-blue-300 transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-blue-900">
                        Bill #{b.billNumber}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          b.syncStatus === 'synced'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {b.syncStatus === 'synced' ? 'Synced' : 'Offline'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 font-medium">
                      <span>{b.eggQuantity} Eggs</span>
                      <span className="text-slate-400"> • </span>
                      <span>₹{b.pricePerEgg}/egg</span>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      {b.time} • Staff: {b.employeeName}
                    </div>
                  </div>

                  <div className="text-right space-y-1.5">
                    <div className="font-black text-sm text-slate-900 font-mono">
                      ₹{b.totalAmount}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveReceiptBill(b)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-blue-200 active:scale-95 transition-all"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Reprint</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal for Print & Preview */}
      {activeReceiptBill && (
        <ThermalReceipt
          bill={activeReceiptBill}
          settings={settings}
          printer={printer}
          onClose={() => setActiveReceiptBill(null)}
          onOpenPrinterSettings={() => {
            setActiveReceiptBill(null);
            setShowPrinterModal(true);
          }}
        />
      )}

      {/* Bluetooth Printer Modal */}
      {showPrinterModal && (
        <BluetoothPrinterModal
          printer={printer}
          settings={settings}
          onUpdatePrinter={onUpdatePrinter}
          onClose={() => setShowPrinterModal(false)}
        />
      )}
    </div>
  );
};
