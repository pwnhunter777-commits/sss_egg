import React, { useState, useEffect } from 'react';
import {
  Bill,
  DailyPrice,
  DailyStock,
  AgencySettings,
  PrinterDevice,
} from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { formatTime, getTodayDateString } from '../lib/offlineStorage';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
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
  const { t, isTamil } = useLanguage();
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
  const [isReceiptDraft, setIsReceiptDraft] = useState(false);
  const [draftEggQuantity, setDraftEggQuantity] = useState(0);

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

  // Open Draft Receipt Preview (Bill is NOT added to database or owner yet)
  const handleCreateBill = (shouldAutoPrint?: boolean) => {
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

    setBillingError(null);
    playPrintClickSound();

    // Generate draft receipt preview
    const nextBillNum = bills.length > 0 ? Math.max(...bills.map((b) => b.billNumber)) + 1 : 1;
    const date = getTodayDateString();
    const timeStr = formatTime(new Date());

    const draftBill: Bill = {
      billId: `draft_${Date.now()}`,
      billNumber: nextBillNum,
      employeeId: 'emp_01',
      employeeName: 'Staff Employee',
      date,
      time: timeStr,
      createdAt: new Date().toISOString(),
      eggQuantity,
      pricePerEgg,
      pricePer30Eggs,
      totalAmount: calculatedTotal,
      purchaseCostPerEgg: todayPrice?.purchaseCost ?? 2,
      profit: Math.max(0, calculatedTotal - eggQuantity * (todayPrice?.purchaseCost ?? 2)),
      syncStatus: 'pending',
    };

    setDraftEggQuantity(eggQuantity);
    setIsReceiptDraft(true);
    setActiveReceiptBill(draftBill);
  };

  // Only after user clicks the "Print Bill" button in receipt modal:
  // Add bill to Firestore/database, deduct stock, and send real-time notification to owner!
  const handleConfirmAndSaveDraft = async (): Promise<Bill> => {
    setIsCreatingBill(true);
    try {
      const savedBill = await EggAgencyService.createBill({
        eggQuantity: draftEggQuantity,
        employeeName: 'Staff Employee',
      });

      playChimeSound();
      setEggQuantityStr('');
      setIsReceiptDraft(false);
      setActiveReceiptBill(savedBill);
      setCreatedBill(savedBill);
      return savedBill;
    } catch (err: any) {
      setBillingError(err.message || 'Failed to save bill');
      throw err;
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
      <header className="bg-blue-700 text-white px-3.5 py-3 shadow-md shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Egg className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h1 className="font-black text-sm md:text-base tracking-tight uppercase leading-tight">
                {isTamil && settings.agencyName === 'SSS EGG AGENCY'
                  ? t('agencyNameDefault')
                  : settings.agencyName || t('agencyNameDefault')}
              </h1>
              <div className="flex items-center gap-2 text-xs text-blue-200 font-bold">
                <span className="font-black text-white">{t('employee')} {t('billing')}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-black">
                  {isOnline ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5" /> {t('online')}
                    </span>
                  ) : (
                    <span className="text-amber-300 flex items-center gap-1 font-black">
                      <WifiOff className="w-3.5 h-3.5" /> {t('offline')}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Switcher */}
            <LanguageToggle variant="header" />

            {/* Bluetooth Printer Button */}
            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className={`p-2 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                thermalPrinter.isConnected()
                  ? 'bg-emerald-500/20 text-emerald-200 border-2 border-emerald-400/40'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={t('printerSetup')}
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white transition-colors"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync banner if pending bills */}
        {pendingSyncCount > 0 && (
          <div className="mt-2.5 bg-amber-400/25 border-2 border-amber-300/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs md:text-sm font-black text-amber-200">
            <span>{pendingSyncCount} {t('pendingSync')}</span>
            <button
              onClick={triggerAutoSync}
              disabled={isSyncing || !isOnline}
              className="text-xs font-black bg-amber-400 text-amber-950 px-3 py-1 rounded-lg flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '...' : t('update')}
            </button>
          </div>
        )}

        {syncStatusMsg && (
          <div className="mt-2 bg-emerald-400/25 border-2 border-emerald-300/40 rounded-xl px-3 py-1.5 text-xs md:text-sm font-black text-emerald-200">
            {syncStatusMsg}
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <nav aria-label="Employee Navigation" className="bg-white border-b border-slate-200 px-4 py-2 flex gap-2 shrink-0 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm md:text-base flex items-center justify-center gap-2 transition-all ${
            activeTab === 'billing'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'text-slate-600 hover:bg-slate-100 font-bold'
          }`}
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t('createAndPrint')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 rounded-2xl font-black text-sm md:text-base flex items-center justify-center gap-2 transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
              : 'text-slate-600 hover:bg-slate-100 font-bold'
          }`}
        >
          <History className="w-5 h-5" />
          <span>{t('billHistory')} ({bills.length})</span>
        </button>
      </nav>

      {/* TAB CONTENT: BILLING SCREEN */}
      {activeTab === 'billing' && (
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3.5 md:p-5 space-y-4">
          {/* Read-Only Current Price Banner */}
          <div className="bg-white rounded-3xl p-4 border-2 border-blue-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-2xl">
                🥚
              </div>
              <div>
                <div className="text-xl md:text-2xl font-black text-blue-900 font-mono">
                  ₹{pricePerEgg} <span className="text-xs font-bold text-slate-500">/ egg</span>
                </div>
              </div>
            </div>

            {/* Remaining Stock Badge */}
            <div className="text-right">
              <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {t('inStock')}
              </div>
              <div
                className={`text-sm md:text-base font-black px-3 py-1 rounded-xl inline-block mt-0.5 font-mono ${
                  remainingStock > 200
                    ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-200'
                    : remainingStock > 0
                    ? 'bg-amber-50 text-amber-800 border-2 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-2 border-rose-200'
                }`}
              >
                {remainingStock} {t('eggs')}
              </div>
            </div>
          </div>

          {/* Quantity & Calculation Card */}
          <div className="bg-white rounded-3xl p-4 md:p-5 border-2 border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs md:text-sm font-black text-slate-700">
              <span>{t('enterEggQty')}</span>
              {eggQuantity >= 30 && (
                <span className="text-blue-700 font-mono font-black text-xs bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                  {Math.floor(eggQuantity / 30)} {Math.floor(eggQuantity / 30) > 1 ? t('trays') : t('tray')}
                  {eggQuantity % 30 > 0 ? ` + ${eggQuantity % 30} ${t('loose')}` : ''}
                </span>
              )}
            </div>

            {/* Large Quantity Input Display */}
            <div className="bg-slate-50 border-2 border-blue-500/40 rounded-2xl p-3.5 flex items-baseline justify-between shadow-inner">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl md:text-5xl font-black text-slate-900 font-mono tracking-tight">
                  {eggQuantityStr || '0'}
                </span>
                <span className="text-base font-extrabold text-slate-500">{t('eggs')}</span>
              </div>

              {/* Automatic Total Calculation */}
              <div className="text-right">
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider">{t('totalAmount')}</div>
                <div className="text-3xl md:text-4xl font-black text-blue-700 font-mono">
                  ₹{calculatedTotal}
                </div>
              </div>
            </div>

            {/* Stock Insufficient Warning */}
            {isStockInsufficient && (
              <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-3 text-sm text-rose-700 font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{t('insufficientStock', { stock: remainingStock })}</span>
              </div>
            )}

            {billingError && (
              <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-3 text-sm text-rose-700 font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{billingError}</span>
              </div>
            )}
          </div>

          {/* Quick-Add Quantity Chips */}
          <div className="space-y-1.5">
            <div className="text-xs font-black text-slate-500 uppercase px-1">
              {t('quickQuantities')}
            </div>
            <div className="flex flex-wrap gap-2">
              {quickQuantities.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleSetQuick(qty)}
                  className={`px-3.5 py-2 rounded-xl font-black text-sm md:text-base transition-all active:scale-95 ${
                    eggQuantity === qty
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'bg-white border-2 border-slate-200 text-slate-800 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  {qty}
                </button>
              ))}
              <button
                type="button"
                onClick={handleKeypadClear}
                className="px-3.5 py-2 rounded-xl font-black text-sm bg-slate-200 text-slate-800 hover:bg-slate-300 transition-all active:scale-95"
              >
                {t('clear')}
              </button>
            </div>
          </div>

          {/* Touch Number Pad for Phone */}
          <div className="bg-white rounded-3xl p-3 border-2 border-slate-200 shadow-xs">
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleKeypadDigit(d)}
                  className="h-14 md:h-16 rounded-2xl bg-slate-50 hover:bg-blue-50 active:bg-blue-100 text-slate-900 font-black text-2xl md:text-3xl flex items-center justify-center border border-slate-200 active:scale-95 transition-all shadow-xs"
                >
                  {d}
                </button>
              ))}

              <button
                type="button"
                onClick={handleKeypadClear}
                className="h-14 md:h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-sm md:text-base flex items-center justify-center border border-slate-200 active:scale-95 transition-all"
              >
                {t('clear')}
              </button>

              <button
                type="button"
                onClick={() => handleKeypadDigit('0')}
                className="h-14 md:h-16 rounded-2xl bg-slate-50 hover:bg-blue-50 active:bg-blue-100 text-slate-900 font-black text-2xl md:text-3xl flex items-center justify-center border border-slate-200 active:scale-95 transition-all shadow-xs"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="h-14 md:h-16 rounded-2xl bg-slate-100 hover:bg-rose-50 active:bg-rose-100 text-rose-600 flex items-center justify-center border border-slate-200 active:scale-95 transition-all"
              >
                <Delete className="w-7 h-7" />
              </button>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="pt-2 pb-6 space-y-2.5">
            <button
              type="button"
              onClick={() => handleCreateBill(true)}
              disabled={isCreatingBill || eggQuantity <= 0 || isStockInsufficient}
              className={`w-full py-4 md:py-5 px-6 rounded-2xl font-black text-base md:text-lg uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-98 ${
                eggQuantity > 0 && !isStockInsufficient
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/35 ring-4 ring-blue-400/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <Printer className="w-6 h-6" />
              <span>{isCreatingBill ? t('generatingBill') : t('createAndPrint')}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BILL HISTORY */}
      {activeTab === 'history' && (
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3.5 md:p-5 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchHistoryPlaceholder')}
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 rounded-2xl pl-11 pr-4 py-3 text-sm md:text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bills List */}
          <div className="flex-1 space-y-3">
            {filteredBills.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border-2 border-slate-200 text-slate-500 space-y-2">
                <Egg className="w-12 h-12 mx-auto text-slate-300" />
                <p className="font-black text-sm md:text-base text-slate-700">{t('noBillsFound')}</p>
                <p className="text-xs md:text-sm font-bold text-slate-500">
                  {t('noBillsRecordedYet')}
                </p>
              </div>
            ) : (
              filteredBills.map((b) => (
                <div
                  key={b.billId}
                  className="bg-white rounded-2xl p-4 border-2 border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-300 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-black text-sm md:text-base text-blue-900">
                        {t('billNo')} #{b.billNumber}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-black ${
                          b.syncStatus === 'synced'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.syncStatus === 'synced' ? t('synced') : t('offline')}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-700">
                      <span>{b.eggQuantity} {t('eggs')}</span>
                      <span className="text-slate-400"> • </span>
                      <span>₹{b.pricePerEgg}{t('perEgg')}</span>
                    </div>

                    <div className="text-xs md:text-sm font-bold text-slate-500">
                      {b.time} • {t('staff')}: {b.employeeName}
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <div className="font-black text-lg md:text-xl text-slate-900 font-mono">
                      ₹{b.totalAmount}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsReceiptDraft(false);
                        setActiveReceiptBill(b);
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs md:text-sm font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-blue-200 active:scale-95 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{t('reprint')}</span>
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
          isDraft={isReceiptDraft}
          onConfirmAndSave={isReceiptDraft ? handleConfirmAndSaveDraft : undefined}
          onClose={() => {
            setActiveReceiptBill(null);
            setIsReceiptDraft(false);
          }}
          onOpenPrinterSettings={() => {
            setActiveReceiptBill(null);
            setIsReceiptDraft(false);
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
