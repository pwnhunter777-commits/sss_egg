import React, { useState, useEffect } from 'react';
import {
  Bill,
  DailyPrice,
  DailyStock,
  AgencySettings,
  PrinterDevice,
} from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { formatTime, getTodayDateString, getNextBillNumber } from '../lib/offlineStorage';
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

  // Calculated Total Amount (rounded to integer, e.g. 1.45 -> 1, 1.65 -> 2)
  const rawTotal =
    eggQuantity >= 30 && pricePer30Eggs > 0
      ? Math.floor(eggQuantity / 30) * pricePer30Eggs + (eggQuantity % 30) * pricePerEgg
      : eggQuantity * pricePerEgg;
  const calculatedTotal = Math.round(rawTotal);

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
    if (pricePer30Eggs <= 0 && pricePerEgg <= 0) {
      setBillingError(
        isTamil
          ? 'இன்றைய தாரா விலை இன்னும் நிர்ணயிக்கப்படவில்லை! உரிமையாளர் முதலில் விலையை நிர்ணயிக்க வேண்டும்.'
          : "Today's 1 Tara (30 eggs) price has not been set yet! Owner must set today's price first."
      );
      return;
    }

    if (eggQuantity <= 0) {
      setBillingError(isTamil ? 'முட்டை எண்ணிக்கையை உள்ளிடவும்' : 'Please enter egg quantity');
      return;
    }

    if (isStockInsufficient) {
      setBillingError(
        isTamil
          ? `கையிருப்பு போதாது! ${remainingStock} முட்டைகள் மட்டுமே உள்ளன.`
          : `Insufficient stock! Only ${remainingStock} eggs available.`
      );
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      return;
    }

    setBillingError(null);
    playPrintClickSound();

    // Generate draft receipt preview
    const date = getTodayDateString();
    const nextBillNum = getNextBillNumber(date);
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
    <div className="flex-1 flex flex-col bg-slate-100 text-slate-800 overflow-hidden">
      {/* Top Bar Header */}
      <header className="bg-blue-800 text-white px-3.5 py-3 shadow-md shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Brand Name only */}
          <div className="min-w-0 flex-1">
            <h1 className="font-black text-base tracking-tight uppercase truncate leading-tight">
              {isTamil && settings.agencyName === 'SSS EGG AGENCY'
                ? t('agencyNameDefault')
                : settings.agencyName || t('agencyNameDefault')}
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language Switcher */}
            <LanguageToggle variant="header" />

            {/* Bluetooth Printer Button */}
            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className={`p-2 rounded-xl text-xs font-black flex items-center transition-all ${
                thermalPrinter.isConnected()
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
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
          <div className="mt-2 bg-amber-400/25 border border-amber-300/40 rounded-xl px-2.5 py-1 flex items-center justify-between text-xs font-black text-amber-200">
            <span>{pendingSyncCount} {t('pendingSync')}</span>
            <button
              onClick={triggerAutoSync}
              disabled={isSyncing || !isOnline}
              className="text-xs font-black bg-amber-400 text-amber-950 px-2.5 py-0.5 rounded-lg flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '...' : t('update')}
            </button>
          </div>
        )}

        {syncStatusMsg && (
          <div className="mt-2 bg-emerald-400/25 border border-emerald-300/40 rounded-xl px-2.5 py-1 text-xs font-black text-emerald-200">
            {syncStatusMsg}
          </div>
        )}
      </header>

      {/* Navigation Tabs - Clean, Equal, Single Line */}
      <nav aria-label="Employee Navigation" className="bg-white border-b border-slate-200 px-3 py-2 flex gap-2 shrink-0 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'billing'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 hover:bg-slate-100 font-bold'
          }`}
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{isTamil ? 'பில் போடுதல்' : 'New Bill'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 px-3 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 hover:bg-slate-100 font-bold'
          }`}
        >
          <History className="w-4 h-4 shrink-0" />
          <span className="truncate">{isTamil ? 'பில் வரலாறு' : 'History'} ({bills.length})</span>
        </button>
      </nav>

      {/* TAB CONTENT: BILLING SCREEN */}
      {activeTab === 'billing' && (
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3 space-y-3">
          {/* Rate & Stock Grid: Minimalist, Clean Big Numbers */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Card 1: Today's Rate (30 eggs & 1 egg) */}
            <div className="bg-white rounded-2xl p-3 border-2 border-blue-100 shadow-xs flex flex-col justify-between">
              <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {isTamil ? 'இன்றைய விலை' : "Today's Rate"}
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <div>
                  <div className="text-xl md:text-2xl font-black text-blue-900 font-mono leading-none">
                    ₹{pricePer30Eggs}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                    {isTamil ? '30 முட்டை' : '30 Eggs'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg md:text-xl font-black text-emerald-700 font-mono leading-none">
                    ₹{pricePerEgg.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                    {isTamil ? '1 முட்டை' : '1 Egg'}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: In Stock */}
            <div className="bg-white rounded-2xl p-3 border-2 border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {t('inStock')}
              </div>
              <div className="mt-1">
                <div className="text-xl md:text-2xl font-black text-slate-900 font-mono leading-none">
                  {remainingStock.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {t('eggs')}
                </div>
              </div>
            </div>
          </div>

          {/* Quantity & Calculation Card */}
          <div className="bg-white rounded-2xl p-3.5 border-2 border-slate-200 shadow-xs space-y-2.5">
            {/* Large Display Box with Quantity on Left, Total Amount on Right */}
            <div className="bg-slate-50 border-2 border-blue-300 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-inner">
              {/* Left: Entered Quantity */}
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-500">
                  {isTamil ? 'எண்ணிக்கை' : 'Quantity'}
                </div>
                <div className="text-3xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1 truncate">
                  <span>{eggQuantityStr || '0'}</span>
                  <span className="text-xs font-bold text-slate-500 font-sans">
                    {t('eggs')}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-9 w-px bg-slate-200 shrink-0" />

              {/* Right: Calculated Total Amount */}
              <div className="text-right shrink-0">
                <div className="text-[11px] font-bold text-slate-500">
                  {t('totalAmount')}
                </div>
                <div className="text-2xl font-black text-blue-700 font-mono">
                  ₹{calculatedTotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Stock Insufficient Warning */}
            {isStockInsufficient && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-700 font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{t('insufficientStock', { stock: remainingStock })}</span>
              </div>
            )}

            {billingError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-700 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{billingError}</span>
              </div>
            )}
          </div>

          {/* Quick-Add Quantity Chips - Clean 5-Column Grid */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-black text-slate-500 uppercase px-1">
              {t('quickQuantities')}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {quickQuantities.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleSetQuick(qty)}
                  className={`h-10 rounded-xl font-black text-sm flex items-center justify-center border transition-all active:scale-95 ${
                    eggQuantity === qty
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                      : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 shadow-2xs'
                  }`}
                >
                  {qty}
                </button>
              ))}
            </div>
          </div>

          {/* Touch Number Pad for Phone */}
          <div className="bg-white rounded-2xl p-2.5 border-2 border-slate-200 shadow-xs">
            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleKeypadDigit(d)}
                  className="h-13 rounded-xl bg-slate-50 hover:bg-blue-50 active:bg-blue-100 text-slate-900 font-black text-2xl flex items-center justify-center border border-slate-200 active:scale-95 transition-all shadow-2xs font-mono"
                >
                  {d}
                </button>
              ))}

              <button
                type="button"
                onClick={handleKeypadClear}
                className="h-13 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-sm flex items-center justify-center border border-slate-200 active:scale-95 transition-all"
              >
                {t('clear')}
              </button>

              <button
                type="button"
                onClick={() => handleKeypadDigit('0')}
                className="h-13 rounded-xl bg-slate-50 hover:bg-blue-50 active:bg-blue-100 text-slate-900 font-black text-2xl flex items-center justify-center border border-slate-200 active:scale-95 transition-all shadow-2xs font-mono"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="h-13 rounded-xl bg-slate-100 hover:bg-rose-50 active:bg-rose-100 text-rose-600 flex items-center justify-center border border-slate-200 active:scale-95 transition-all"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="pt-1 pb-4">
            <button
              type="button"
              onClick={() => handleCreateBill(true)}
              disabled={isCreatingBill || eggQuantity <= 0 || isStockInsufficient}
              className={`w-full py-4 px-4 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
                eggQuantity > 0 && !isStockInsufficient
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <Printer className="w-5 h-5" />
              <span>{isCreatingBill ? t('generatingBill') : t('createAndPrint')}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BILL HISTORY */}
      {activeTab === 'history' && (
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchHistoryPlaceholder')}
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 rounded-2xl pl-10 pr-3 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bills List - Clean Mobile Alignment */}
          <div className="flex-1 space-y-2.5">
            {filteredBills.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border-2 border-slate-200 text-slate-500 space-y-1.5">
                <Egg className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-black text-sm text-slate-700">{t('noBillsFound')}</p>
                <p className="text-xs font-bold text-slate-500">
                  {t('noBillsRecordedYet')}
                </p>
              </div>
            ) : (
              filteredBills.map((b) => (
                <div
                  key={b.billId}
                  className="bg-white rounded-2xl p-3 border-2 border-slate-200 shadow-xs flex items-center justify-between gap-2.5 hover:border-blue-300 transition-all"
                >
                  {/* Left Details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-sm text-blue-900">
                        {t('billNo')} #{b.billNumber}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          b.syncStatus === 'synced'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.syncStatus === 'synced' ? (isTamil ? 'ஒத்திசைக்கப்பட்டது' : 'Synced') : (isTamil ? 'ஆஃப்லைன்' : 'Offline')}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-700 truncate">
                      <span>{b.eggQuantity} {t('eggs')}</span>
                      <span className="text-slate-400"> • </span>
                      <span>₹{b.pricePerEgg}{t('perEgg')}</span>
                    </div>

                    <div className="text-[11px] font-bold text-slate-500 truncate">
                      {b.time} • {t('staff')}: {b.employeeName}
                    </div>
                  </div>

                  {/* Right Amount & Reprint Button (Never clipped) */}
                  <div className="text-right shrink-0 space-y-1.5">
                    <div className="font-black text-base text-slate-900 font-mono">
                      ₹{Math.round(b.totalAmount).toLocaleString('en-IN')}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsReceiptDraft(false);
                        setActiveReceiptBill(b);
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 border border-blue-200 active:scale-95 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
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
