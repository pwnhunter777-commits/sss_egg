import React, { useState, useEffect } from 'react';
import {
  Bill,
  DailyPrice,
  DailyStock,
  AgencySettings,
  PrinterDevice,
} from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import {
  formatTime,
  getTodayDateString,
  getNextBillNumber,
} from '../lib/offlineStorage';
import { downloadBillPdf } from '../lib/billPdfGenerator';
import { thermalPrinter } from '../lib/thermalPrinter';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { ThermalReceipt } from './ThermalReceipt';
import { BluetoothPrinterModal } from './BluetoothPrinterModal';
import { RequestDeleteModal } from './RequestDeleteModal';
import { LogoutPinModal } from './LogoutPinModal';
import { playChimeSound, playPrintClickSound } from '../lib/soundNotification';
import {
  Egg,
  LogOut,
  History,
  PlusCircle,
  AlertCircle,
  Delete,
  Trash2,
  Search,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Store,
  Printer,
  Pencil,
  Receipt,
  Download,
  Check,
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

  // Billing form state (measured in 1 Tara = 30 eggs)
  const [trayQuantityStr, setTrayQuantityStr] = useState<string>('');
  const [billingError, setBillingError] = useState<string | null>(null);
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [createdBill, setCreatedBill] = useState<Bill | null>(null);

  // Editable Amount state
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [isEditingAmount, setIsEditingAmount] = useState<boolean>(false);

  const [showPrinterModal, setShowPrinterModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);
  const [isReceiptDraft, setIsReceiptDraft] = useState(false);
  const [draftEggQuantity, setDraftEggQuantity] = useState(0);
  const [billToDeleteRequest, setBillToDeleteRequest] = useState<Bill | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Search in history
  const [historySearch, setHistorySearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const todayDate = getTodayDateString();

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

  // Billing calculations - measured in 1 Tara / 1 Tray (30 eggs)
  const trayCount = parseInt(trayQuantityStr || '0', 10);
  const totalEggs = trayCount * 30;
  const pricePerEgg = todayPrice?.pricePerEgg ?? 0;
  const pricePer30Eggs = todayPrice?.pricePer30Eggs ?? (pricePerEgg * 30);

  // Calculated Total Amount (in 1 Tara)
  const rawTotal = trayCount * pricePer30Eggs;
  const calculatedTotal = Math.round(rawTotal);

  // Final Total Amount (honors custom edited amount if set by employee)
  const finalTotalAmount = customAmountStr !== '' && !isNaN(Number(customAmountStr))
    ? Math.max(0, Math.round(Number(customAmountStr)))
    : calculatedTotal;

  const remainingStock = todayStock?.remainingStock ?? 0;
  const isStockInsufficient = totalEggs > 0 && totalEggs > remainingStock;

  // Quick quantity buttons in Trays (1, 2, 3, 5, 10, 15, 20, 25, 50, 100)
  const quickQuantities = [1, 2, 3, 5, 10, 15, 20, 25, 50, 100];

  const handleKeypadDigit = (digit: string) => {
    setBillingError(null);
    playPrintClickSound();
    if (trayQuantityStr === '0') {
      setTrayQuantityStr(digit);
    } else {
      if (trayQuantityStr.length < 5) {
        setTrayQuantityStr(trayQuantityStr + digit);
      }
    }
  };

  const handleKeypadBackspace = () => {
    playPrintClickSound();
    if (trayQuantityStr.length > 0) {
      setTrayQuantityStr(trayQuantityStr.slice(0, -1));
    }
  };

  const handleKeypadClear = () => {
    setTrayQuantityStr('');
    setCustomAmountStr('');
    setIsEditingAmount(false);
    setBillingError(null);
  };

  const handleQuickAdd = (qty: number) => {
    playPrintClickSound();
    const current = parseInt(trayQuantityStr || '0', 10);
    setTrayQuantityStr(String(current + qty));
    setBillingError(null);
  };

  const handleSetQuick = (qty: number) => {
    playPrintClickSound();
    setTrayQuantityStr(String(qty));
    setBillingError(null);
  };

  // Create and show bill receipt directly if shop already chosen, or prompt for shop
  const handleCreateBill = async () => {
    if (pricePer30Eggs <= 0 && pricePerEgg <= 0) {
      setBillingError(
        isTamil
          ? 'இன்றைய தாரா விலை இன்னும் நிர்ணயிக்கப்படவில்லை! உரிமையாளர் முதலில் விலையை நிர்ணயிக்க வேண்டும்.'
          : "Today's 1 Tara (30 eggs) price has not been set yet! Owner must set today's price first."
      );
      return;
    }

    if (trayCount <= 0) {
      setBillingError(
        isTamil ? 'தாரா எண்ணிக்கையை உள்ளிடவும்' : 'Please enter tray quantity'
      );
      return;
    }

    if (isStockInsufficient) {
      setBillingError(
        isTamil
          ? `கையிருப்பு போதாது! ${Math.floor(remainingStock / 30)} தாரா (${remainingStock} முட்டை) மட்டுமே உள்ளது.`
          : `Insufficient stock! Only ${Math.floor(remainingStock / 30)} Trays (${remainingStock} Eggs) available.`
      );
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      return;
    }

    setBillingError(null);
    playPrintClickSound();
    setIsCreatingBill(true);

    try {
      // 1. Create and save bill in Firestore database & offline storage
      const savedBill = await EggAgencyService.createBill({
        eggQuantity: totalEggs,
        employeeName: 'Staff Employee',
        customTotalAmount: finalTotalAmount,
        paymentStatus: 'paid',
        paidAmount: finalTotalAmount,
        pendingAmount: 0,
      });

      // 2. Clear entered quantity and custom states
      setTrayQuantityStr('');
      setCustomAmountStr('');
      setIsEditingAmount(false);

      playChimeSound();

      // 3. Open enhanced Thermal Receipt preview immediately
      setActiveReceiptBill(savedBill);

      // 4. Auto print if printer connected & auto-print option is enabled
      if (printer.connected && printer.autoPrintOnBill) {
        thermalPrinter.printBill(savedBill, settings, printer.paperWidth).catch(() => {});
      }

      setToastMessage(
        isTamil
          ? `பில் #${savedBill.billNumber} வெற்றிகரமாக உருவானது!`
          : `Bill #${savedBill.billNumber} created successfully!`
      );
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setBillingError(err.message || 'Failed to create bill');
    } finally {
      setIsCreatingBill(false);
    }
  };

  // Direct PDF download for history bills
  const handleDirectPdfDownload = async (b: Bill) => {
    try {
      playPrintClickSound();
      await downloadBillPdf(
        b,
        settings,
        b.customerName || 'Valued Customer',
        b.customerPhone || ''
      );
      playChimeSound();
      setToastMessage(
        isTamil
          ? `பில் #${b.billNumber} PDF பதிவிறக்கப்பட்டது!`
          : `Bill #${b.billNumber} PDF downloaded!`
      );
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e: any) {
      setBillingError(e.message || 'Failed to download PDF');
    }
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
      setTrayQuantityStr('');
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
    <div className="flex-1 flex flex-col bg-slate-100 text-slate-800 overflow-hidden select-none">
      {/* Top Bar Header - Compact */}
      <header className="bg-blue-800 text-white px-3 py-2 shadow-xs shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Brand Name only */}
          <div className="min-w-0 flex-1">
            <h1 className="font-black text-sm tracking-tight uppercase truncate leading-tight">
              {isTamil && settings.agencyName === 'SSS EGG AGENCY'
                ? t('agencyNameDefault')
                : settings.agencyName || t('agencyNameDefault')}
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language Switcher */}
            <LanguageToggle variant="header" />

            {/* Bluetooth Thermal Printer Button */}
            <button
              type="button"
              onClick={() => {
                playPrintClickSound();
                setShowPrinterModal(true);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
                printer.connected
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black'
                  : 'bg-white/15 hover:bg-white/25 text-white font-bold'
              }`}
              title={printer.connected ? 'Thermal Printer Connected' : 'Connect Bluetooth Printer'}
            >
              <Printer className="w-3 h-3 shrink-0" />
              <span className="font-bold hidden sm:inline">
                {printer.connected
                  ? isTamil
                    ? 'பிரிண்டர் தயார்'
                    : 'Printer On'
                  : isTamil
                  ? 'பிரிண்டர்'
                  : 'Printer'}
              </span>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600/80 text-white transition-colors cursor-pointer"
              title={t('logout')}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sync banner if pending bills */}
        {pendingSyncCount > 0 && (
          <div className="mt-1.5 bg-amber-400/25 border border-amber-300/40 rounded-lg px-2 py-0.5 flex items-center justify-between text-[11px] font-black text-amber-200">
            <span>{pendingSyncCount} {t('pendingSync')}</span>
            <button
              onClick={triggerAutoSync}
              disabled={isSyncing || !isOnline}
              className="text-[10px] font-black bg-amber-400 text-amber-950 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '...' : t('update')}
            </button>
          </div>
        )}

        {syncStatusMsg && (
          <div className="mt-1.5 bg-emerald-400/25 border border-emerald-300/40 rounded-lg px-2 py-0.5 text-[11px] font-black text-emerald-200">
            {syncStatusMsg}
          </div>
        )}
      </header>

      {/* Navigation Tabs - Compact */}
      <nav aria-label="Employee Navigation" className="bg-white border-b border-slate-200 px-2.5 py-1.5 flex gap-1.5 shrink-0 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`flex-1 py-1.5 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'billing'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 font-bold'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isTamil ? 'பில் போடுதல்' : 'New Bill'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 px-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 font-bold'
          }`}
        >
          <History className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isTamil ? 'பில் வரலாறு' : 'History'} ({bills.length})</span>
        </button>
      </nav>

      {/* TAB CONTENT: BILLING SCREEN - All Divs Small & Space Efficient */}
      {activeTab === 'billing' && (
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-2 sm:p-2.5 space-y-2">
          {/* Rate & Stock Grid: Compact Big Numbers */}
          <div className="grid grid-cols-2 gap-2">
            {/* Card 1: Today's Rate (1 Tara) */}
            <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-blue-200 shadow-2xs flex flex-col justify-between">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                {isTamil ? 'இன்றைய தாரா விலை' : "Today's 1 Tara Rate"}
              </div>
              <div className="mt-0.5">
                <div className="text-lg sm:text-xl font-black text-blue-900 font-mono leading-tight">
                  ₹{pricePer30Eggs}
                </div>
              </div>
            </div>

            {/* Card 2: In Stock (Trays & Under show Remaining Eggs) */}
            <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{isTamil ? 'கையிருப்பு (தாரா)' : 'In Stock (Trays)'}</span>
                <span className="text-[9px] font-mono font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                  {isTamil ? 'நேரலை' : 'Live'}
                </span>
              </div>
              <div className="mt-0.5">
                <div className="text-lg sm:text-xl font-black text-slate-900 font-mono leading-tight flex items-baseline gap-1">
                  <span>{Math.floor(remainingStock / 30).toLocaleString('en-IN')}</span>
                  {remainingStock % 30 > 0 && (
                    <span className="text-[11px] font-bold text-slate-500 font-sans">
                      (+{remainingStock % 30})
                    </span>
                  )}
                  <span className="text-xs font-black text-emerald-700">{isTamil ? 'தாரா' : 'Trays'}</span>
                </div>
                {/* Under show the remaining egg */}
                <div className="text-[10px] font-black text-slate-600 font-mono mt-0.5">
                  {remainingStock.toLocaleString('en-IN')} {isTamil ? 'மீதமுள்ள முட்டை' : 'Remaining Eggs'}
                </div>
              </div>
            </div>
          </div>

          {/* Quantity & Calculation Card with Directly Editable Total Amount */}
          <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-slate-200 shadow-2xs space-y-2">
            {/* Display Box with Quantity in Trays on Left, Directly Editable Total Amount on Right */}
            <div className="bg-slate-50 border border-blue-300 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-inner">
              {/* Left: Entered Quantity in Trays */}
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500">
                  {isTamil ? 'அளவு (தாரா)' : 'Quantity (Trays)'}
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1 truncate mt-0.5">
                  <span>{trayQuantityStr || '0'}</span>
                  <span className="text-xs font-black text-blue-700 font-sans">
                    {isTamil ? 'தாரா' : 'Trays'}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-slate-300 shrink-0" />

              {/* Right: Directly Editable Total Amount */}
              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold text-slate-500 flex items-center justify-end gap-1">
                  <span>{t('totalAmount')}</span>
                  {customAmountStr !== '' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomAmountStr('');
                        setIsEditingAmount(false);
                      }}
                      className="text-[9px] text-blue-600 font-black hover:underline cursor-pointer bg-blue-50 px-1 py-0.2 rounded"
                      title={isTamil ? 'தானியங்கி கணக்கீட்டிற்கு மீட்டமை' : 'Reset to auto rate'}
                    >
                      {isTamil ? 'தானியங்கி' : 'Auto'}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className="text-lg sm:text-xl font-black text-blue-700 font-mono">₹</span>
                  <input
                    type="number"
                    value={customAmountStr !== '' ? customAmountStr : (calculatedTotal > 0 ? calculatedTotal : '')}
                    onChange={(e) => {
                      setCustomAmountStr(e.target.value);
                      setIsEditingAmount(true);
                    }}
                    placeholder={String(calculatedTotal || '0')}
                    className="w-24 sm:w-28 px-1.5 py-0.5 border border-blue-400 focus:border-blue-700 rounded-lg text-lg sm:text-xl font-black font-mono text-blue-900 bg-white shadow-inner text-right focus:outline-hidden"
                    title={isTamil ? 'தொகையை நேரடியாக மாற்றலாம்' : 'Directly editable total amount'}
                  />
                </div>
                <div className="text-[9px] font-bold text-blue-600 mt-0.5">
                  {customAmountStr !== ''
                    ? (isTamil ? '✏️ மாற்றப்பட்ட தொகை' : '✏️ Custom Amount')
                    : (isTamil ? '✏️ தொகையை மாற்றலாம்' : '✏️ Editable Amount')}
                </div>
              </div>
            </div>

            {/* Stock Insufficient Warning */}
            {isStockInsufficient && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-xs text-rose-700 font-bold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>
                  {isTamil
                    ? `கையிருப்பு போதாது! ${Math.floor(remainingStock / 30)} தாரா (${remainingStock} முட்டை) மட்டுமே உள்ளது.`
                    : `Insufficient stock! Only ${Math.floor(remainingStock / 30)} Trays (${remainingStock} Eggs) available.`}
                </span>
              </div>
            )}

            {billingError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-xs text-rose-700 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{billingError}</span>
              </div>
            )}
          </div>

          {/* Quick-Add Quantity Chips in Trays - Compact */}
          <div className="space-y-0.5">
            <div className="text-[9px] font-black text-slate-500 uppercase px-0.5">
              {isTamil ? 'விரைவு தாரா அளவு' : 'Quick Trays'}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {quickQuantities.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleSetQuick(qty)}
                  className={`h-7 rounded-md font-black text-[11px] flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
                    trayCount === qty
                      ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-black'
                      : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 shadow-2xs font-bold'
                  }`}
                >
                  {qty} {isTamil ? 'தா' : 'T'}
                </button>
              ))}
            </div>
          </div>

          {/* Touch Number Pad for Phone - Compact */}
          <div className="bg-white rounded-xl p-1.5 border border-slate-200 shadow-2xs">
            <div className="grid grid-cols-3 gap-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleKeypadDigit(d)}
                  className="h-10 sm:h-11 rounded-lg bg-slate-50 hover:bg-blue-50 active:bg-blue-100 text-slate-900 font-black text-xl flex items-center justify-center border border-slate-200 active:scale-95 transition-all shadow-2xs font-mono cursor-pointer"
                >
                  {d}
                </button>
              ))}

              <button
                type="button"
                onClick={handleKeypadClear}
                className="h-10 sm:h-11 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                {t('clear')}
              </button>

              <button
                type="button"
                onClick={() => handleKeypadDigit('0')}
                className="h-10 sm:h-11 rounded-lg bg-slate-50 hover:bg-blue-50 active:bg-blue-100 text-slate-900 font-black text-xl flex items-center justify-center border border-slate-200 active:scale-95 transition-all shadow-2xs font-mono cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="h-10 sm:h-11 rounded-lg bg-slate-100 hover:bg-rose-50 active:bg-rose-100 text-rose-600 flex items-center justify-center border border-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Action Button - Generate Bill & Print Receipt - Compact */}
          <div className="pt-0.5 pb-2">
            <button
              type="button"
              onClick={() => handleCreateBill()}
              disabled={isCreatingBill || trayCount <= 0 || isStockInsufficient}
              className={`w-full py-2.5 px-3 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer ${
                trayCount > 0 && !isStockInsufficient
                  ? 'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-blue-500/25 ring-1 ring-blue-400/40'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <div className="text-center leading-tight">
                <div>
                  {isCreatingBill
                    ? (isTamil ? 'பில் உருவாகிறது...' : 'Generating Bill...')
                    : (isTamil ? 'பில் போடு & அச்சிடு' : 'Generate Bill & Print')}
                </div>
                {trayCount > 0 && !isStockInsufficient && !isCreatingBill && (
                  <div className="text-[11px] font-mono font-bold opacity-90 normal-case tracking-normal">
                    {trayCount} {isTamil ? 'தாரா' : 'Trays'} ({totalEggs} {t('eggs')}) = ₹{finalTotalAmount.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BILL HISTORY */}
      {activeTab === 'history' && (
        <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-3 space-y-3">
          {/* Search Bar */}
          {/* Search Bar - Compact */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchHistoryPlaceholder')}
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Bills List - Clean Mobile Alignment & Compact Cards */}
          <div className="flex-1 space-y-1.5">
            {filteredBills.length === 0 ? (
              <div className="bg-white rounded-xl p-4 text-center border border-slate-200 text-slate-500 space-y-1">
                <Egg className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-black text-xs text-slate-700">{t('noBillsFound')}</p>
                <p className="text-[11px] font-bold text-slate-500">
                  {t('noBillsRecordedYet')}
                </p>
              </div>
            ) : (
              filteredBills.map((b) => (
                <div
                  key={b.billId}
                  className="bg-white rounded-xl p-2 sm:p-2.5 border border-slate-200 shadow-2xs flex items-center justify-between gap-2 hover:border-blue-300 transition-all"
                >
                  {/* Left Details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-black text-xs sm:text-sm text-blue-900">
                        {t('billNo')} #{b.billNumber}
                      </span>

                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                          b.syncStatus === 'synced'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {b.syncStatus === 'synced' ? (isTamil ? 'ஒத்திசைவு' : 'Synced') : (isTamil ? 'ஆஃப்லைன்' : 'Offline')}
                      </span>

                      {/* Delete Request Status Badge */}
                      {b.deleteRequest?.status === 'pending' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          {isTamil ? 'நீக்குதல் கோரப்பட்டது' : 'Delete Requested'}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-bold text-slate-700 truncate">
                      <span>{Math.floor(b.eggQuantity / 30)} {isTamil ? 'தாரா' : 'Trays'} ({b.eggQuantity} {t('eggs')})</span>
                      <span className="text-slate-400"> • </span>
                      <span>₹{b.pricePer30Eggs || Math.round(b.pricePerEgg * 30)}/தாரா</span>
                    </div>

                    <div className="text-[10px] font-bold text-slate-500 truncate">
                      {b.time} • {t('staff')}: {b.employeeName}
                    </div>
                  </div>

                  {/* Right Amount & Actions (Receipt View, PDF, Delete) */}
                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-black text-sm sm:text-base text-slate-950 font-mono">
                      ₹{Math.round(b.totalAmount).toLocaleString('en-IN')}
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      {/* View / Print Receipt */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsReceiptDraft(false);
                          setActiveReceiptBill(b);
                        }}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-900 text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 border border-blue-200 active:scale-95 transition-all shadow-2xs cursor-pointer"
                        title={isTamil ? 'பில் ரசீது அச்சிடு / பார்' : 'View / Print Receipt'}
                      >
                        <Receipt className="w-3 h-3 text-blue-700" />
                        <span>{isTamil ? 'ரசீது' : 'Receipt'}</span>
                      </button>

                      {/* Download PDF */}
                      <button
                        type="button"
                        onClick={() => handleDirectPdfDownload(b)}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-black px-1.5 py-1 rounded-lg flex items-center gap-0.5 border border-slate-200 active:scale-95 transition-all cursor-pointer shadow-2xs"
                        title={isTamil ? 'PDF பதிவிறக்க' : 'Download PDF'}
                      >
                        <Download className="w-3 h-3 text-slate-600" />
                        <span>PDF</span>
                      </button>

                      {/* Request Delete Button */}
                      <button
                        type="button"
                        disabled={b.deleteRequest?.status === 'pending'}
                        onClick={() => setBillToDeleteRequest(b)}
                        className={`text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-0.5 border active:scale-95 transition-all cursor-pointer ${
                          b.deleteRequest?.status === 'pending'
                            ? 'bg-rose-50 text-rose-300 border-rose-100 cursor-not-allowed'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-2xs'
                        }`}
                        title={
                          b.deleteRequest?.status === 'pending'
                            ? t('pendingOwnerApproval')
                            : t('requestDelete')
                        }
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>
                          {b.deleteRequest?.status === 'pending'
                            ? (isTamil ? 'கோரப்பட்டது' : 'Requested')
                            : (isTamil ? 'நீக்கு' : 'Delete')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bill Receipt Preview & Thermal Print Modal */}
      {activeReceiptBill && (
        <ThermalReceipt
          bill={activeReceiptBill}
          settings={settings}
          printer={printer}
          role="employee"
          isDraft={isReceiptDraft}
          onConfirmAndSave={isReceiptDraft ? handleConfirmAndSaveDraft : undefined}
          onClose={() => {
            setActiveReceiptBill(null);
            setIsReceiptDraft(false);
          }}
        />
      )}



      {/* Bluetooth Thermal Printer Setup Modal */}
      {showPrinterModal && (
        <BluetoothPrinterModal
          printer={printer}
          settings={settings}
          onUpdatePrinter={onUpdatePrinter}
          onClose={() => setShowPrinterModal(false)}
        />
      )}

      {/* Success Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Request Bill Delete Modal */}
      {billToDeleteRequest && (
        <RequestDeleteModal
          bill={billToDeleteRequest}
          employeeName={billToDeleteRequest.employeeName || 'Staff'}
          onClose={() => setBillToDeleteRequest(null)}
          onRequestSubmitted={(updatedBill) => {
            setBills((prev) =>
              prev.map((b) => (b.billId === updatedBill.billId ? updatedBill : b))
            );
            setBillToDeleteRequest(null);
          }}
        />
      )}

      {/* Logout PIN Confirmation Modal */}
      {showLogoutModal && (
        <LogoutPinModal
          role="employee"
          settings={settings}
          onConfirmLogout={onLogout}
          onClose={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
};
