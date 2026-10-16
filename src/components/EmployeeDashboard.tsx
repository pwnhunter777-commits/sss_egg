import React, { useState, useEffect } from 'react';
import {
  Bill,
  DailyPrice,
  DailyStock,
  AgencySettings,
  PrinterDevice,
  ShopkeeperContact,
} from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import {
  formatTime,
  getTodayDateString,
  getNextBillNumber,
  getActiveShopkeeperPhone,
  setActiveShopkeeperPhone,
  getSavedShopkeeperContacts,
} from '../lib/offlineStorage';
import { shareBillToWhatsApp } from '../lib/billPdfGenerator';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { ThermalReceipt } from './ThermalReceipt';
import { ShopkeeperPhoneModal } from './ShopkeeperPhoneModal';
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
  Send,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Store,
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

  // WhatsApp Sender State (Saved strictly on employee phone itself)
  const [activeShopkeeperPhone, setActiveShopkeeperPhoneState] = useState<string>('');
  const [activeShopkeeperName, setActiveShopkeeperNameState] = useState<string>('');
  const [savedContacts, setSavedContacts] = useState<ShopkeeperContact[]>([]);
  const [showShopkeeperModal, setShowShopkeeperModal] = useState<boolean>(false);
  const [modalStartAddNew, setModalStartAddNew] = useState<boolean>(false);
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

  // Load shopkeeper contacts and active phone saved strictly on this employee device
  const refreshContacts = () => {
    const list = getSavedShopkeeperContacts();
    setSavedContacts(list);
    const active = getActiveShopkeeperPhone();
    if (active) {
      setActiveShopkeeperPhoneState(active);
      const matched = list.find((c) => c.phone === active);
      if (matched) {
        setActiveShopkeeperNameState(matched.name);
      }
    } else if (list.length > 0) {
      setActiveShopkeeperPhone(list[0].phone);
      setActiveShopkeeperPhoneState(list[0].phone);
      setActiveShopkeeperNameState(list[0].name);
    }
  };

  useEffect(() => {
    refreshContacts();
  }, []);

  // Employee selects a shop here itself if in need, or clicks again to deselect
  const handleSelectShopInline = (c: ShopkeeperContact) => {
    playPrintClickSound();
    if (activeShopkeeperPhone === c.phone) {
      // Toggle off / deselect
      setActiveShopkeeperPhone('');
      setActiveShopkeeperPhoneState('');
      setActiveShopkeeperNameState('');
      setToastMessage(
        isTamil
          ? `${c.name} தேர்வு நீக்கப்பட்டது`
          : `${c.name} deselected`
      );
    } else {
      setActiveShopkeeperPhone(c.phone);
      setActiveShopkeeperPhoneState(c.phone);
      setActiveShopkeeperNameState(c.name);
      setToastMessage(
        isTamil
          ? `தேர்வு செய்யப்பட்டது: ${c.name}`
          : `Selected: ${c.name}`
      );
    }
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleClearSelectedShop = () => {
    playPrintClickSound();
    setActiveShopkeeperPhone('');
    setActiveShopkeeperPhoneState('');
    setActiveShopkeeperNameState('');
    setToastMessage(
      isTamil ? 'கடை தேர்வு நீக்கப்பட்டது' : 'Shop selection cleared'
    );
    setTimeout(() => setToastMessage(null), 2500);
  };

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

  // Create and send bill directly if shop already chosen, or prompt for shop
  const handleCreateBill = async (shouldAutoPrint?: boolean) => {
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
          ? `கையிருப்பு போதாது! ${Math.floor(remainingStock / 30)} தாரா மட்டுமே உள்ளது.`
          : `Insufficient stock! Only ${Math.floor(remainingStock / 30)} Trays available.`
      );
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      return;
    }

    setBillingError(null);
    playPrintClickSound();

    // If the employee is already selected, directly send the bill to the respective number.
    // If the employee is not already selected, ask for the hotel name again while sending the bill.
    if (activeShopkeeperPhone.trim()) {
      await handleShopSelectedAndSendBill(activeShopkeeperPhone, activeShopkeeperName, true);
    } else {
      setModalStartAddNew(false);
      setShowShopkeeperModal(true);
    }
  };

  // Execute bill creation and WhatsApp dispatch
  const handleShopSelectedAndSendBill = async (
    phone: string,
    name?: string,
    isPreselected = false
  ) => {
    setShowShopkeeperModal(false);

    // If no quantity entered (e.g. employee opened modal just to browse shops), don't create empty bill
    if (trayCount <= 0) {
      if (isPreselected) {
        setActiveShopkeeperPhone(phone);
        setActiveShopkeeperPhoneState(phone);
        if (name) setActiveShopkeeperNameState(name);
      }
      setToastMessage(
        isTamil
          ? `கடை: ${name || phone}`
          : `Shop: ${name || phone}`
      );
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsCreatingBill(true);
    try {
      // 1. Create and save bill in Firestore database & offline operational storage
      const savedBill = await EggAgencyService.createBill({
        eggQuantity: totalEggs,
        employeeName: 'Staff Employee',
      });

      // 2. Clear entered quantity
      setTrayQuantityStr('');

      // If the employee was NOT already selected on the dashboard,
      // keep activeShopkeeperPhone empty so the next bill will ask for the hotel name again!
      if (!isPreselected) {
        setActiveShopkeeperPhone('');
        setActiveShopkeeperPhoneState('');
        setActiveShopkeeperNameState('');
      }

      // 3. Share the PDF bill via WhatsApp directly to this clicked shop
      const shareRes = await shareBillToWhatsApp(
        savedBill,
        settings,
        phone,
        name || 'Shopkeeper'
      );

      playChimeSound();
      if (shareRes.success) {
        setToastMessage(
          isTamil
            ? `வாட்ஸ்அப்பில் "${name || 'கடை'}" பில் #${savedBill.billNumber} அனுப்பப்பட்டது!`
            : `Bill #${savedBill.billNumber} sent to "${name || 'Shop'}" via WhatsApp!`
        );
      } else {
        setToastMessage(
          isTamil
            ? `பில் #${savedBill.billNumber} உருவானது! PDF பதிவிறக்கப்பட்டது.`
            : `Bill #${savedBill.billNumber} created! PDF downloaded.`
        );
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setBillingError(err.message || 'Failed to create and send bill');
    } finally {
      setIsCreatingBill(false);
    }
  };

  // Direct WhatsApp PDF share for history bills
  const handleDirectWhatsAppShare = async (b: Bill) => {
    if (!activeShopkeeperPhone.trim()) {
      setShowShopkeeperModal(true);
      return;
    }

    try {
      playPrintClickSound();
      const res = await shareBillToWhatsApp(
        b,
        settings,
        activeShopkeeperPhone,
        activeShopkeeperName || 'Shopkeeper'
      );
      if (res.success) {
        playChimeSound();
        setToastMessage(
          isTamil
            ? `வாட்ஸ்அப்பில் பில் #${b.billNumber} அனுப்பப்பட்டது! (+91 ${activeShopkeeperPhone})`
            : `Bill #${b.billNumber} sent to WhatsApp! (+91 ${activeShopkeeperPhone})`
        );
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (e: any) {
      setBillingError(e.message || 'Failed to share WhatsApp bill');
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

            {/* WhatsApp Sender Button (Replaces billing machine) */}
            <button
              type="button"
              onClick={() => setShowShopkeeperModal(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-emerald-950 transition-all shadow-xs"
              title={t('whatsappSender')}
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono text-xs font-black tracking-tight">
                {activeShopkeeperPhone
                  ? `+91 ${activeShopkeeperPhone.slice(-5)}`
                  : (isTamil ? 'வாட்ஸ்அப்' : 'WhatsApp')}
              </span>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
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
            {/* Card 1: Today's Rate (1 Tara) */}
            <div className="bg-white rounded-2xl p-3 border-2 border-blue-100 shadow-xs flex flex-col justify-between">
              <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {isTamil ? 'இன்றைய தாரா விலை' : "Today's 1 Tara Rate"}
              </div>
              <div className="mt-1">
                <div className="text-xl md:text-2xl font-black text-blue-900 font-mono leading-none">
                  ₹{pricePer30Eggs}
                </div>
              </div>
            </div>

            {/* Card 2: In Stock (Trays) */}
            <div className="bg-white rounded-2xl p-3 border-2 border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                {isTamil ? 'கையிருப்பு (தாரா)' : 'In Stock (Trays)'}
              </div>
              <div className="mt-1">
                <div className="text-xl md:text-2xl font-black text-slate-900 font-mono leading-none flex items-baseline gap-1">
                  <span>{Math.floor(remainingStock / 30).toLocaleString('en-IN')}</span>
                  {remainingStock % 30 > 0 && (
                    <span className="text-xs font-bold text-slate-500 font-sans">
                      (+{remainingStock % 30})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Shopkeeper WhatsApp Chooser & Target Card (Choose shop here itself) */}
          {/* Shopkeeper WhatsApp Chooser & Target Card (No auto-selection; select only if in need) */}
          <div
            className={`rounded-2xl p-3 shadow-xs space-y-2.5 transition-all ${
              activeShopkeeperPhone
                ? 'bg-white border-2 border-emerald-500/90 ring-1 ring-emerald-400/30'
                : 'bg-white border-2 border-slate-200'
            }`}
          >
            {/* Header: Title and Add Shop Key */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    activeShopkeeperPhone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-white'
                  }`}
                >
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate block">
                    {activeShopkeeperPhone
                      ? (isTamil ? 'தேர்ந்தெடுக்கப்பட்ட கடை' : 'Selected Hotel / Shop')
                      : (isTamil ? 'ஹோட்டல் / கடை தேர்வு (விருப்பத்தேர்வு)' : 'Hotel / Shop Selection (Optional)')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playPrintClickSound();
                  setModalStartAddNew(true);
                  setShowShopkeeperModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black shrink-0 transition-all shadow-2xs cursor-pointer"
                title={isTamil ? 'புதிய கடை பெயர் சேர்க்க' : 'Add New Shop'}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isTamil ? '+ கடை சேர்க்க' : '+ Add Shop'}</span>
              </button>
            </div>

            {/* Chosen Shop Display OR Unselected Neutral Guidance Banner */}
            {activeShopkeeperPhone ? (
              <div className="bg-emerald-50/90 border-2 border-emerald-400 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-black text-emerald-950 truncate block">
                      {activeShopkeeperName || 'Shop'}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 block truncate">
                      +91 {activeShopkeeperPhone}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleClearSelectedShop}
                    className="text-xs font-black bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 px-2 py-1 rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer active:scale-95"
                    title={isTamil ? 'தேர்வை நீக்கு' : 'Deselect shop'}
                  >
                    {isTamil ? '✕ நீக்கு' : '✕ Deselect'}
                  </button>
                  {savedContacts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        playPrintClickSound();
                        setModalStartAddNew(false);
                        setShowShopkeeperModal(true);
                      }}
                      className="text-xs font-black bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
                      title={isTamil ? 'அனைத்து கடைகளையும் பார்க்க' : 'View all shops'}
                    >
                      {isTamil ? 'பட்டியல்' : 'View All'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 truncate block">
                      {isTamil ? 'ஹோட்டல் எதுவும் தேர்ந்தெடுக்கப்படவில்லை' : 'No hotel selected'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 truncate block">
                      {isTamil
                        ? 'தேவைப்பட்டால் கீழே தேர்வு செய்க • இல்லையெனில் பில் அனுப்பும்போது கேட்கப்படும்'
                        : 'Select below if needed • Otherwise asks while sending bill'}
                    </span>
                  </div>
                </div>

                {savedContacts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playPrintClickSound();
                      setModalStartAddNew(false);
                      setShowShopkeeperModal(true);
                    }}
                    className="text-xs font-black bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
                    title={isTamil ? 'அனைத்து கடைகளையும் பார்க்க' : 'View all shops'}
                  >
                    {isTamil ? 'பட்டியல்' : 'View All'}
                  </button>
                )}
              </div>
            )}

            {/* Quick Shop Chooser: Horizontal Chips (None auto-selected, click to select if in need) */}
            {savedContacts.length > 0 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {savedContacts.map((c) => {
                  const isSelected = activeShopkeeperPhone === c.phone;
                  return (
                    <button
                      key={c.phone}
                      type="button"
                      onClick={() => handleSelectShopInline(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 transition-all active:scale-95 shadow-2xs cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 ring-offset-1 shadow-emerald-600/30'
                          : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300'
                      }`}
                      title={isSelected ? (isTamil ? 'தேர்வு நீக்க கிளிக் செய்க' : 'Click to deselect') : (isTamil ? 'தேர்வு செய்ய கிளிக் செய்க' : 'Click to select')}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                      ) : (
                        <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate max-w-[130px]">{c.name}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    playPrintClickSound();
                    setModalStartAddNew(true);
                    setShowShopkeeperModal(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-emerald-50 text-emerald-800 border border-dashed border-emerald-400 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3 h-3 text-emerald-600" />
                  <span>{isTamil ? 'புதிய கடை' : 'New Shop'}</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-2.5 text-center">
                <p className="text-xs font-bold text-slate-600">
                  {isTamil ? 'கடைகள் எதுவும் சேர்க்கப்படவில்லை' : 'No shops entered yet'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    playPrintClickSound();
                    setModalStartAddNew(true);
                    setShowShopkeeperModal(true);
                  }}
                  className="mt-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black inline-flex items-center gap-1 shadow-2xs"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>{isTamil ? '+ கடை பெயர் சேர்க்கவும்' : '+ Add Shop Name & Number'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quantity & Calculation Card */}
          <div className="bg-white rounded-2xl p-3.5 border-2 border-slate-200 shadow-xs space-y-2.5">
            {/* Large Display Box with Quantity in Trays on Left, Total Amount on Right */}
            <div className="bg-slate-50 border-2 border-blue-300 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-inner">
              {/* Left: Entered Quantity in Trays */}
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-500">
                  {isTamil ? 'அளவு (தாரா)' : 'Quantity (Trays)'}
                </div>
                <div className="text-3xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-1.5 truncate mt-0.5">
                  <span>{trayQuantityStr || '0'}</span>
                  <span className="text-sm font-black text-blue-700 font-sans">
                    {isTamil ? 'தாரா' : 'Trays'}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-9 w-px bg-slate-200 shrink-0" />

              {/* Right: Calculated Total Amount based on Trays */}
              <div className="text-right shrink-0">
                <div className="text-[11px] font-bold text-slate-500">
                  {t('totalAmount')}
                </div>
                <div className="text-2xl font-black text-blue-700 font-mono mt-0.5">
                  ₹{calculatedTotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Stock Insufficient Warning */}
            {isStockInsufficient && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-700 font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  {isTamil
                    ? `கையிருப்பு போதாது! ${Math.floor(remainingStock / 30)} தாரா மட்டுமே உள்ளது.`
                    : `Insufficient stock! Only ${Math.floor(remainingStock / 30)} Trays available.`}
                </span>
              </div>
            )}

            {billingError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-700 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{billingError}</span>
              </div>
            )}
          </div>

          {/* Quick-Add Quantity Chips in Trays */}
          <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase px-0.5">
              {isTamil ? 'விரைவு தாரா அளவு' : 'Quick Trays'}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {quickQuantities.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleSetQuick(qty)}
                  className={`h-8 rounded-lg font-black text-xs flex items-center justify-center border transition-all active:scale-95 ${
                    trayCount === qty
                      ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                      : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200 shadow-2xs'
                  }`}
                >
                  {qty} {isTamil ? 'தா' : 'T'}
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

          {/* Main Action Button - Select Shop & Send Bill (WhatsApp PDF) */}
          <div className="pt-1 pb-4">
            <button
              type="button"
              onClick={() => handleCreateBill()}
              disabled={isCreatingBill || trayCount <= 0 || isStockInsufficient}
              className={`w-full py-4 px-4 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-98 ${
                trayCount > 0 && !isStockInsufficient
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/30 ring-2 ring-emerald-400/40'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <Store className="w-5 h-5 shrink-0" />
              <div className="text-center leading-tight">
                <div>
                  {isCreatingBill
                    ? (isTamil ? 'பில் உருவாகிறது...' : 'Generating Bill...')
                    : activeShopkeeperName
                    ? (isTamil
                        ? `"${activeShopkeeperName}" கடைக்கு பில் அனுப்பு`
                        : `Send Bill to "${activeShopkeeperName}"`)
                    : (isTamil ? 'பில் அனுப்பு (வாட்ஸ்அப் PDF)' : 'Send Bill (WhatsApp PDF)')}
                </div>
                {trayCount > 0 && !isStockInsufficient && !isCreatingBill && (
                  <div className="text-[10px] font-bold opacity-90 normal-case tracking-normal">
                    {activeShopkeeperPhone
                      ? (isTamil
                          ? `வாட்ஸ்அப்: +91 ${activeShopkeeperPhone} • நேரடியாக பில் செல்லும்`
                          : `WhatsApp: +91 ${activeShopkeeperPhone} • Direct send to selected number`)
                      : (isTamil
                          ? 'ஹோட்டல் பெயர் கேட்கப்பட்டு பில் அனுப்பப்படும்'
                          : 'Will ask for hotel name & send bill')}
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
                  <div className="min-w-0 flex-1 space-y-1">
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

                      {/* Delete Request Status Badge */}
                      {b.deleteRequest?.status === 'pending' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          {isTamil ? 'நீக்குதல் கோரப்பட்டது (ஒப்புதலுக்கு காத்திருக்கிறது)' : 'Delete Requested (Pending Owner Approval)'}
                        </span>
                      )}
                      {b.deleteRequest?.status === 'rejected' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-slate-100 text-slate-600 border border-slate-300">
                          {isTamil ? 'நீக்குதல் நிராகரிக்கப்பட்டது' : 'Delete Rejected'}
                        </span>
                      )}
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

                  {/* Right Amount & Actions (Reprint & Delete Request) */}
                  <div className="text-right shrink-0 space-y-1.5">
                    <div className="font-black text-base text-slate-900 font-mono">
                      ₹{Math.round(b.totalAmount).toLocaleString('en-IN')}
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Send to WhatsApp (PDF) */}
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsAppShare(b)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 border border-emerald-300 active:scale-95 transition-all shadow-2xs"
                        title={isTamil ? 'வாட்ஸ்அப் PDF அனுப்பு' : 'Send WhatsApp PDF'}
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isTamil ? 'வாட்ஸ்அப்' : 'WhatsApp'}</span>
                      </button>

                      {/* View Receipt */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsReceiptDraft(false);
                          setActiveReceiptBill(b);
                        }}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-black px-2 py-1 rounded-xl flex items-center gap-1 border border-slate-200 active:scale-95 transition-all"
                        title={isTamil ? 'ரசீது முன்னோட்டம்' : 'Receipt Preview'}
                      >
                        <span>{isTamil ? 'பார்' : 'View'}</span>
                      </button>

                      {/* Request Delete Button */}
                      <button
                        type="button"
                        disabled={b.deleteRequest?.status === 'pending'}
                        onClick={() => setBillToDeleteRequest(b)}
                        className={`text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 border active:scale-95 transition-all ${
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
                        <Trash2 className="w-3.5 h-3.5" />
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

      {/* Bill Receipt Preview & WhatsApp Modal */}
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

      {/* Shopkeeper WhatsApp Phone Modal (Saved strictly on employee phone itself) */}
      {showShopkeeperModal && (
        <ShopkeeperPhoneModal
          isOpen={showShopkeeperModal}
          billAmount={calculatedTotal > 0 ? calculatedTotal : undefined}
          trayCount={trayCount > 0 ? trayCount : undefined}
          initialAddNew={modalStartAddNew}
          onClose={() => {
            setShowShopkeeperModal(false);
            setModalStartAddNew(false);
            refreshContacts();
          }}
          onPhoneSelected={(phone, name) => {
            handleShopSelectedAndSendBill(phone, name, false);
            refreshContacts();
          }}
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
