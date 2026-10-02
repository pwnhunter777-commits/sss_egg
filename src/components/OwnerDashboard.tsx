import React, { useState, useEffect } from 'react';
import {
  Bill,
  DailyPrice,
  DailyStock,
  AgencySettings,
  PrinterDevice,
  BillNotification,
} from '../types';
import { EggAgencyService } from '../services/eggAgencyService';
import { getTodayDateString, formatIndianCurrency } from '../lib/offlineStorage';
import { playChimeSound } from '../lib/soundNotification';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { DailyPriceModal } from './DailyPriceModal';
import { StockImportModal } from './StockImportModal';
import { OwnerSettingsModal } from './OwnerSettingsModal';
import { ThermalReceipt } from './ThermalReceipt';
import { BluetoothPrinterModal } from './BluetoothPrinterModal';
import {
  Egg,
  LogOut,
  Bell,
  TrendingUp,
  DollarSign,
  Package,
  FileText,
  User,
  Settings,
  PackagePlus,
  Printer,
  Calendar,
  Search,
  CheckCircle,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';

interface Props {
  settings: AgencySettings;
  printer: PrinterDevice;
  onUpdateSettings: (s: AgencySettings) => void;
  onUpdatePrinter: (p: PrinterDevice) => void;
  onLogout: () => void;
}

export const OwnerDashboard: React.FC<Props> = ({
  settings,
  printer,
  onUpdateSettings,
  onUpdatePrinter,
  onLogout,
}) => {
  const { t, isTamil } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [todayPrice, setTodayPrice] = useState<DailyPrice | null>(null);
  const [todayStock, setTodayStock] = useState<DailyStock | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [notifications, setNotifications] = useState<BillNotification[]>([]);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [activeBannerNotif, setActiveBannerNotif] = useState<BillNotification | null>(null);

  // Active Modals
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'overview' | 'bills'>('overview');
  const [billSearch, setBillSearch] = useState('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time subscriptions for selected date
  useEffect(() => {
    const unsubPrice = EggAgencyService.subscribeToPrice(selectedDate, (price) => {
      if (price) setTodayPrice(price);
    });

    const unsubStock = EggAgencyService.subscribeToStock(selectedDate, (stock) => {
      if (stock) setTodayStock(stock);
    });

    const unsubBills = EggAgencyService.subscribeToDateBills(selectedDate, (billList) => {
      setBills(billList);
    });

    EggAgencyService.getTodayPrice(selectedDate).then(setTodayPrice);
    EggAgencyService.getTodayStock(selectedDate).then(setTodayStock);

    return () => {
      unsubPrice();
      unsubStock();
      unsubBills();
    };
  }, [selectedDate]);

  // Real-time Notification subscription for Owner
  useEffect(() => {
    let lastSeenNotifId = '';
    const unsubNotifs = EggAgencyService.subscribeToNotifications((notifList) => {
      setNotifications(notifList);
      if (notifList.length > 0) {
        const newest = notifList[0];
        if (newest.notificationId !== lastSeenNotifId && !newest.read) {
          lastSeenNotifId = newest.notificationId;
          setActiveBannerNotif(newest);
          playChimeSound();
          setTimeout(() => {
            setActiveBannerNotif(null);
          }, 6000);
        }
      }
    });

    return () => unsubNotifs();
  }, []);

  // Calculations
  const totalSales = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalEggsSold = bills.reduce((sum, b) => sum + (b.eggQuantity || 0), 0);
  const totalBillsCount = bills.length;

  // Opening stock & Remaining Stock
  const openingStock = todayStock?.openingStock ?? 0;
  const remainingStock = Math.max(0, openingStock - totalEggsSold);

  // Profit Calculation: Profit = Total Sales - Cost of Eggs Sold
  // Purchase cost is taken from today's pricing or stock
  const currentPurchaseCost = todayPrice?.purchaseCost ?? todayStock?.purchaseCost ?? 2;
  const costOfEggsSold = totalEggsSold * currentPurchaseCost;
  const totalProfit = Math.max(0, totalSales - costOfEggsSold);

  // Filtered bills for All Bills view
  const filteredBills = bills.filter((b) => {
    if (!billSearch.trim()) return true;
    return (
      String(b.billNumber).includes(billSearch) ||
      b.time.toLowerCase().includes(billSearch.toLowerCase()) ||
      String(b.eggQuantity).includes(billSearch)
    );
  });

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-100 text-slate-800">
      {/* Top Header */}
      <header className="bg-blue-800 text-white px-3.5 py-3 shadow-md shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="font-black text-sm md:text-base tracking-tight uppercase leading-tight">
                {isTamil && settings.agencyName === 'SSS EGG AGENCY'
                  ? t('agencyNameDefault')
                  : settings.agencyName || t('agencyNameDefault')}
              </h1>
              <div className="flex items-center gap-2 text-xs text-blue-200 font-bold mt-0.5">
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

            {/* Real-time Notifications Bell */}
            <button
              type="button"
              onClick={() => setShowNotificationsDrawer(!showNotificationsDrawer)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-xs">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={t('settings')}
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logout */}
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

        {/* Real-Time Floating Bill Notification Toast Banner */}
        {activeBannerNotif && (
          <div
            onClick={() => {
              const matched = bills.find((b) => b.billId === activeBannerNotif.billId);
              if (matched) setActiveReceiptBill(matched);
            }}
            className="mt-3 bg-amber-400 text-amber-950 p-3 rounded-2xl shadow-lg flex items-center justify-between cursor-pointer animate-in slide-in-from-top-3 border-2 border-amber-300"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg animate-pulse">🔔</span>
              <div>
                <div className="text-sm font-black uppercase tracking-tight">
                  New Bill Created #{activeBannerNotif.billNumber}
                </div>
                <div className="text-xs md:text-sm font-bold opacity-95">
                  {activeBannerNotif.eggQuantity} Eggs • {formatIndianCurrency(activeBannerNotif.totalAmount)} • Staff: {activeBannerNotif.employeeName}
                </div>
              </div>
            </div>
            <span className="text-xs font-black bg-amber-950/20 px-3 py-1 rounded-xl">View</span>
          </div>
        )}
      </header>

      {/* Quick Action Navigation Bar */}
      <nav aria-label="Owner Actions" className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-4 rounded-xl font-black text-sm md:text-base transition-all ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 font-bold'
            }`}
          >
            {t('overview')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`py-2 px-4 rounded-xl font-black text-sm md:text-base transition-all ${
              activeTab === 'bills'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 font-bold'
            }`}
          >
            {t('allBills')} ({bills.length})
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 text-xs md:text-sm font-black">
          <Calendar className="w-4 h-4 text-blue-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-slate-900 font-black text-xs md:text-sm focus:outline-hidden cursor-pointer"
          />
        </div>
      </nav>

      {/* Notifications Drawer */}
      {showNotificationsDrawer && (
        <div className="bg-amber-50 border-b border-amber-200 p-4 space-y-2.5 max-h-56 overflow-y-auto no-scrollbar shrink-0">
          <div className="flex items-center justify-between text-sm font-black text-amber-950">
            <span>Recent Bill Notifications</span>
            <button
              onClick={() => setShowNotificationsDrawer(false)}
              className="text-slate-400 hover:text-slate-600 p-1 font-bold"
            >
              ✕
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs font-bold text-amber-800">No notifications yet today.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.notificationId}
                className="bg-white p-3 rounded-xl border border-amber-200 text-sm flex items-center justify-between shadow-xs"
              >
                <div>
                  <div className="font-black text-slate-900">
                    {t('billNo')} #{n.billNumber} • {n.eggQuantity} {t('eggs')}
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    {n.time} • {t('staff')}: {n.employeeName}
                  </div>
                </div>
                <div className="font-black text-base text-blue-700">{formatIndianCurrency(n.totalAmount)}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MAIN TAB CONTENT */}
      {activeTab === 'overview' && (
        <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 md:p-5 space-y-4">
          {/* Quick Management Shortcuts Row */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowPriceModal(true)}
              className="bg-white hover:bg-blue-50/60 p-4 rounded-3xl border-2 border-blue-200 shadow-xs flex items-center justify-between active:scale-98 transition-all text-left"
            >
              <div>
                <div className="text-sm md:text-base font-black text-slate-900">{t('setPrice')}</div>
                <div className="text-xs font-bold text-slate-500">₹{todayPrice?.pricePerEgg ?? 3} {t('perEgg')}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowStockModal(true)}
              className="bg-white hover:bg-emerald-50/60 p-4 rounded-3xl border-2 border-emerald-200 shadow-xs flex items-center justify-between active:scale-98 transition-all text-left"
            >
              <div>
                <div className="text-sm md:text-base font-black text-slate-900">{t('importStock')}</div>
                <div className="text-xs font-bold text-slate-500">{remainingStock} {t('inStock')}</div>
              </div>
            </button>
          </div>

          {/* LARGE SUMMARY CARDS REQUIRED BY SPECIFICATION */}
          <div className="space-y-3">
            {/* Card 1: TODAY'S SALES */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 rounded-3xl p-5 md:p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="text-xs md:text-sm font-black text-blue-200 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-300" />
                    <span>{t('todaySales')}</span>
                  </div>
                  <div className="text-4xl md:text-5xl font-black mt-2 font-mono tracking-tight text-white drop-shadow-md">
                    {formatIndianCurrency(totalSales)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs md:text-sm bg-blue-900/80 px-3.5 py-1.5 rounded-full text-blue-100 font-black border border-blue-400/30">
                    1 {t('egg')} = ₹{todayPrice?.pricePerEgg ?? 3}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid 2 Columns: EGGS SOLD & REMAINING STOCK */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 2: EGGS SOLD */}
              <div className="bg-white rounded-3xl p-4 md:p-5 border-2 border-slate-200 shadow-xs">
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  <span>{t('eggsSold')}</span>
                </div>
                <div className="text-3xl md:text-4xl font-black text-slate-900 font-mono mt-1.5">
                  {totalEggsSold.toLocaleString('en-IN')}{' '}
                  <span className="text-sm font-bold text-slate-500">{t('eggs')}</span>
                </div>
              </div>

              {/* Card 3: REMAINING STOCK */}
              <div className="bg-white rounded-3xl p-4 md:p-5 border-2 border-slate-200 shadow-xs">
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  <span>{t('remainingStock')}</span>
                </div>
                <div className="text-3xl md:text-4xl font-black text-slate-900 font-mono mt-1.5">
                  {remainingStock.toLocaleString('en-IN')}{' '}
                  <span className="text-sm font-bold text-slate-500">{t('eggs')}</span>
                </div>
              </div>
            </div>

            {/* Grid 2 Columns: TOTAL BILLS & PROFIT */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 4: TOTAL BILLS */}
              <div className="bg-white rounded-3xl p-4 md:p-5 border-2 border-slate-200 shadow-xs">
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  <span>{t('totalBills')}</span>
                </div>
                <div className="text-3xl md:text-4xl font-black text-slate-900 font-mono mt-1.5">
                  {totalBillsCount}
                </div>
              </div>

              {/* Card 5: TODAY'S PROFIT */}
              <div className="bg-emerald-50 rounded-3xl p-4 md:p-5 border-2 border-emerald-200 shadow-xs">
                <div className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                  <span>{t('profit')}</span>
                </div>
                <div className="text-3xl md:text-4xl font-black text-emerald-950 font-mono mt-1.5">
                  {formatIndianCurrency(totalProfit)}
                </div>
              </div>
            </div>
          </div>

          {/* Employee-wise Sales Card (Only ONE employee) */}
          <div className="bg-white rounded-3xl p-4 md:p-5 border-2 border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>{t('staff')} {t('overview')}</span>
              </div>
            </div>

            <div className="p-4 bg-blue-50/80 border-2 border-blue-100 rounded-2xl flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs md:text-sm font-bold text-slate-600">
                  {totalBillsCount} {t('totalBills')} • {totalEggsSold} {t('eggsSold')}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider">{t('total')}</div>
                <div className="text-xl md:text-2xl font-black text-blue-800 font-mono">
                  {formatIndianCurrency(totalSales)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALL BILLS TAB */}
      {activeTab === 'bills' && (
        <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 md:p-5 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchBillsPlaceholder')}
              value={billSearch}
              onChange={(e) => setBillSearch(e.target.value)}
              className="w-full bg-white border-2 border-slate-300 rounded-2xl pl-11 pr-4 py-3 text-sm md:text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            {filteredBills.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border-2 border-slate-200 text-slate-500">
                <p className="text-sm md:text-base font-black">{t('noBillsFound')}</p>
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
                      {b.time} • {t('profit')}: ₹{b.profit}
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <div className="font-black text-lg md:text-xl text-slate-900 font-mono">
                      ₹{b.totalAmount}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveReceiptBill(b)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs md:text-sm font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-blue-200 active:scale-95 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{t('receiptPreview')}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {showPriceModal && (
        <DailyPriceModal
          currentPrice={todayPrice}
          onPriceUpdated={(p) => setTodayPrice(p)}
          onClose={() => setShowPriceModal(false)}
        />
      )}

      {showStockModal && (
        <StockImportModal
          currentStock={todayStock}
          onStockUpdated={(s) => setTodayStock(s)}
          onClose={() => setShowStockModal(false)}
        />
      )}

      {showSettingsModal && (
        <OwnerSettingsModal
          settings={settings}
          onSettingsUpdated={onUpdateSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showPrinterModal && (
        <BluetoothPrinterModal
          printer={printer}
          settings={settings}
          onUpdatePrinter={onUpdatePrinter}
          onClose={() => setShowPrinterModal(false)}
        />
      )}

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
    </div>
  );
};
