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
import { playChimeSound, playDeleteAlertSound } from '../lib/soundNotification';
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
  Trash2,
  AlertTriangle,
  ShieldCheck,
  XCircle,
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
  const [billToOwnerDelete, setBillToOwnerDelete] = useState<Bill | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'overview' | 'bills' | 'delete_requests'>('overview');
  const [billSearch, setBillSearch] = useState('');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [globalPendingRequests, setGlobalPendingRequests] = useState<Bill[]>([]);

  const handleApproveDelete = async (bill: Bill) => {
    try {
      await EggAgencyService.approveBillDelete(bill, true);
      setBills((prev) => prev.filter((b) => b.billId !== bill.billId));
      setGlobalPendingRequests((prev) => prev.filter((b) => b.billId !== bill.billId));
      setActionFeedback(
        isTamil
          ? `பில் #${bill.billNumber} நீக்கப்பட்டது! ${bill.eggQuantity} முட்டைகள் மீண்டும் இருப்புக்கு சேர்க்கப்பட்டன.`
          : `Bill #${bill.billNumber} deleted! ${bill.eggQuantity} eggs returned to stock.`
      );
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Approve delete failed:', err);
    }
  };

  const handleRejectDelete = async (bill: Bill) => {
    try {
      await EggAgencyService.rejectBillDelete(bill);
      setBills((prev) =>
        prev.map((b) =>
          b.billId === bill.billId
            ? { ...b, deleteRequest: { ...b.deleteRequest!, status: 'rejected' } }
            : b
        )
      );
      setGlobalPendingRequests((prev) => prev.filter((b) => b.billId !== bill.billId));
      setActionFeedback(
        isTamil
          ? `பில் #${bill.billNumber} நீக்குதல் கோரிக்கை நிராகரிக்கப்பட்டது.`
          : `Delete request for Bill #${bill.billNumber} was rejected.`
      );
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Reject delete failed:', err);
    }
  };

  const handleOwnerConfirmDelete = async () => {
    if (!billToOwnerDelete) return;
    const b = billToOwnerDelete;
    try {
      await EggAgencyService.approveBillDelete(b, true);
      setBills((prev) => prev.filter((item) => item.billId !== b.billId));
      setBillToOwnerDelete(null);
      setActionFeedback(
        isTamil
          ? `பில் #${b.billNumber} வெற்றிகரமாக நீக்கப்பட்டது! முட்டைகள் இருப்புக்கு திரும்பின.`
          : `Bill #${b.billNumber} deleted successfully! Eggs returned to stock.`
      );
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

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
    // 1. Subscribe to pending delete requests globally
    const unsubPendingReqs = EggAgencyService.subscribeToPendingDeleteRequests((reqBills) => {
      setGlobalPendingRequests(reqBills);
    });

    // 2. Subscribe to notifications
    let lastSeenNotifId = '';
    const unsubNotifs = EggAgencyService.subscribeToNotifications((notifList) => {
      setNotifications(notifList);
      if (notifList.length > 0) {
        const newest = notifList[0];
        if (newest.notificationId !== lastSeenNotifId && !newest.read) {
          lastSeenNotifId = newest.notificationId;
          setActiveBannerNotif(newest);
          if (newest.type === 'delete_request') {
            playDeleteAlertSound();
          } else {
            playChimeSound();
          }
          setTimeout(() => {
            setActiveBannerNotif(null);
          }, 8000);
        }
      }
    });

    return () => {
      unsubPendingReqs();
      unsubNotifs();
    };
  }, []);

  // Calculations
  const totalSales = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalEggsSold = bills.reduce((sum, b) => sum + (b.eggQuantity || 0), 0);
  const totalBillsCount = bills.length;

  // Opening stock & Remaining Stock
  const openingStock = todayStock?.openingStock ?? 0;
  const remainingStock = Math.max(0, openingStock - totalEggsSold);

  // Profit Calculation: Profit = Total Sales - Cost of Eggs Sold
  // Purchase cost is taken from today's stock purchase price
  const currentPurchaseCost =
    (todayStock?.purchaseCost && todayStock.purchaseCost > 0)
      ? todayStock.purchaseCost
      : ((todayPrice?.purchaseCost && todayPrice.purchaseCost > 0) ? todayPrice.purchaseCost : 0);
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

  // Merge real-time global pending delete requests across the system with current date bills
  const pendingDeleteBills = React.useMemo(() => {
    const map = new Map<string, Bill>();
    for (const b of globalPendingRequests) {
      if (b.deleteRequest?.status === 'pending') {
        map.set(b.billId, b);
      }
    }
    for (const b of bills) {
      if (b.deleteRequest?.status === 'pending') {
        map.set(b.billId, b);
      }
    }
    return Array.from(map.values()).sort((a, b) => (b.billNumber || 0) - (a.billNumber || 0));
  }, [globalPendingRequests, bills]);

  const rejectedDeleteBills = bills.filter((b) => b.deleteRequest?.status === 'rejected');
  const totalPendingEggs = pendingDeleteBills.reduce((sum, b) => sum + (b.eggQuantity || 0), 0);
  const totalPendingAmount = pendingDeleteBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

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
              if (activeBannerNotif.type === 'delete_request') {
                setActiveTab('delete_requests');
              } else {
                setActiveTab('bills');
              }
              const matched = bills.find((b) => b.billId === activeBannerNotif.billId);
              if (matched) setActiveReceiptBill(matched);
            }}
            className={`mt-3 p-3 rounded-2xl shadow-lg flex items-center justify-between cursor-pointer animate-in slide-in-from-top-3 border-2 ${
              activeBannerNotif.type === 'delete_request'
                ? 'bg-rose-500 text-white border-rose-300'
                : 'bg-amber-400 text-amber-950 border-amber-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg animate-pulse">
                {activeBannerNotif.type === 'delete_request' ? '⚠️' : '🔔'}
              </span>
              <div>
                <div className="text-sm font-black uppercase tracking-tight">
                  {activeBannerNotif.type === 'delete_request'
                    ? (isTamil
                        ? `நீக்குதல் கோரிக்கை: பில் #${activeBannerNotif.billNumber}`
                        : `Delete Request: Bill #${activeBannerNotif.billNumber}`)
                    : `New Bill Created #${activeBannerNotif.billNumber}`}
                </div>
                <div className="text-xs md:text-sm font-bold opacity-95">
                  {activeBannerNotif.type === 'delete_request'
                    ? `${t('staff')}: ${activeBannerNotif.employeeName} • ${activeBannerNotif.reason || 'Staff requested deletion'}`
                    : `${activeBannerNotif.eggQuantity} Eggs • ${formatIndianCurrency(activeBannerNotif.totalAmount)} • Staff: ${activeBannerNotif.employeeName}`}
                </div>
              </div>
            </div>
            <span className="text-xs font-black bg-black/20 px-3 py-1 rounded-xl">
              {activeBannerNotif.type === 'delete_request' ? (isTamil ? 'மதிப்பாய்வு' : 'Review') : 'View'}
            </span>
          </div>
        )}
      </header>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs md:text-sm font-black flex items-center justify-between shadow-xs animate-fadeIn">
          <span>{actionFeedback}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-white/80 hover:text-white font-bold ml-2 text-base"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Action Navigation Bar */}
      <nav aria-label="Owner Actions" className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm md:text-base whitespace-nowrap transition-all ${
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
            className={`py-2 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm md:text-base whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'bills'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 font-bold'
            }`}
          >
            <span>{t('allBills')} ({bills.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('delete_requests')}
            className={`py-2 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm md:text-base whitespace-nowrap transition-all flex items-center gap-1.5 relative ${
              activeTab === 'delete_requests'
                ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
                : pendingDeleteBills.length > 0
                ? 'bg-rose-100 text-rose-800 border-2 border-rose-400 font-black animate-pulse shadow-sm'
                : 'text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>{t('deleteRequests')}</span>
              {pendingDeleteBills.length > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
                </span>
              )}
            </span>
            {pendingDeleteBills.length > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-black animate-bounce shadow-sm ${
                  activeTab === 'delete_requests' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'
                }`}
              >
                {pendingDeleteBills.length}
              </span>
            )}
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-300 text-xs md:text-sm font-black shrink-0 ml-2">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
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
        <div className="bg-amber-50 border-b border-amber-200 p-4 space-y-2.5 max-h-64 overflow-y-auto no-scrollbar shrink-0">
          <div className="flex items-center justify-between text-sm font-black text-amber-950">
            <span>Recent Notifications</span>
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
                className={`p-3 rounded-xl border text-sm flex items-center justify-between shadow-xs ${
                  n.type === 'delete_request'
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-white border-amber-200'
                }`}
              >
                <div>
                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                    {n.type === 'delete_request' && (
                      <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded-md uppercase font-black">
                        {isTamil ? 'நீக்குதல் கோரிக்கை' : 'Delete Req'}
                      </span>
                    )}
                    <span>{t('billNo')} #{n.billNumber} • {n.eggQuantity} {t('eggs')}</span>
                  </div>
                  <div className="text-xs font-medium text-slate-600">
                    {n.time} • {t('staff')}: {n.employeeName}
                    {n.reason && <span className="italic text-rose-700"> • "{n.reason}"</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-base text-blue-700">{formatIndianCurrency(n.totalAmount)}</div>
                  {n.type === 'delete_request' && (
                    <button
                      onClick={() => {
                        setShowNotificationsDrawer(false);
                        setActiveTab('bills');
                      }}
                      className="text-xs text-rose-700 font-black underline hover:text-rose-900"
                    >
                      {isTamil ? 'மதிப்பாய்வு' : 'Review'}
                    </button>
                  )}
                </div>
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
                <div className="text-xs font-bold text-slate-500">
                  {todayPrice && todayPrice.pricePer30Eggs > 0
                    ? `₹${todayPrice.pricePer30Eggs} / 1 ${isTamil ? 'தாரா' : 'Tara'}`
                    : `₹0 (${isTamil ? 'தாரா விலை அமைக்கவும்' : 'Set 1 Tara Price'})`}
                </div>
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
                  className={`bg-white rounded-2xl p-4 border-2 shadow-xs transition-all space-y-3 ${
                    b.deleteRequest?.status === 'pending'
                      ? 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-200'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {b.deleteRequest?.status === 'pending' && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-rose-600 text-white animate-pulse">
                            ⚠️ {isTamil ? 'நீக்குதல் கோரிக்கை' : 'Delete Requested'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-700">
                        <span>{b.eggQuantity} {t('eggs')}</span>
                        <span className="text-slate-400"> • </span>
                        <span>₹{b.pricePerEgg}{t('perEgg')}</span>
                      </div>
                      <div className="text-xs md:text-sm font-bold text-slate-500">
                        {b.time} • {t('profit')}: ₹{b.profit} • {t('staff')}: {b.employeeName}
                      </div>
                    </div>

                    <div className="text-right space-y-2 shrink-0">
                      <div className="font-black text-lg md:text-xl text-slate-900 font-mono">
                        ₹{b.totalAmount}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setActiveReceiptBill(b)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs md:text-sm font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1 border border-blue-200 active:scale-95 transition-all"
                          title={t('receiptPreview')}
                        >
                          <Printer className="w-4 h-4" />
                          <span>{t('receiptPreview')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillToOwnerDelete(b)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs md:text-sm font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1 border border-rose-200 active:scale-95 transition-all"
                          title={t('deleteBill')}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{t('delete')}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delete Request Approval Banner for Owner */}
                  {b.deleteRequest?.status === 'pending' && (
                    <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="text-xs font-bold text-rose-900 space-y-0.5">
                        <div className="flex items-center gap-1.5 font-black text-rose-800 uppercase tracking-tight">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>
                            {isTamil ? 'நீக்குதல் கோரிக்கை (ஊழியர்):' : 'Delete Request from Staff:'}{' '}
                            <span className="underline">{b.deleteRequest.requestedBy}</span>
                          </span>
                        </div>
                        <p className="text-rose-950 font-medium italic">
                          "{b.deleteRequest.reason}"
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveDelete(b)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{t('approveAndDelete')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectDelete(b)}
                          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-black text-xs px-2.5 py-1.5 rounded-xl active:scale-95 transition-all"
                        >
                          <span>{t('rejectRequest')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* DELETE REQUESTS REVIEW TAB (Revise delete requests from employees) */}
      {activeTab === 'delete_requests' && (
        <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 md:p-5 space-y-4">
          {/* Header & Stats Banner */}
          <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-rose-950 text-white rounded-3xl p-4 md:p-5 shadow-md space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-black uppercase tracking-tight">
                  {t('reviewDeleteRequestsTitle')}
                </h2>
                <p className="text-xs text-rose-200 font-bold">
                  {isTamil
                    ? 'பணியாளர்கள் அனுப்பிய நீக்குதல் கோரிக்கைகளை ஆய்வு செய்து அங்கீகரிக்கவும்'
                    : 'Review and approve or reject deletion requests submitted by employees'}
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/15">
                <div className="text-[10px] md:text-xs font-bold text-rose-200 uppercase">
                  {isTamil ? 'நிலுவை' : 'Pending'}
                </div>
                <div className="text-lg md:text-xl font-black font-mono">
                  {pendingDeleteBills.length}
                </div>
              </div>
              <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/15">
                <div className="text-[10px] md:text-xs font-bold text-rose-200 uppercase">
                  {isTamil ? 'மீளப்பெறும் முட்டை' : 'Eggs to Return'}
                </div>
                <div className="text-lg md:text-xl font-black font-mono">
                  +{totalPendingEggs}
                </div>
              </div>
              <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/15">
                <div className="text-[10px] md:text-xs font-bold text-rose-200 uppercase">
                  {isTamil ? 'மொத்த மதிப்பு' : 'Total Value'}
                </div>
                <div className="text-lg md:text-xl font-black font-mono">
                  ₹{Math.round(totalPendingAmount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Pending Delete Requests Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 px-1">
              <span>{t('pendingRequests')} ({pendingDeleteBills.length})</span>
            </div>

            {pendingDeleteBills.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border-2 border-slate-200 text-slate-500 space-y-2 shadow-xs">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <p className="text-base font-black text-slate-800">{t('noPendingDeleteRequests')}</p>
                <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto">
                  {t('allClearDesc')}
                </p>
              </div>
            ) : (
              pendingDeleteBills.map((b) => (
                <div
                  key={b.billId}
                  className="bg-white rounded-2xl p-4 border-2 border-rose-300 shadow-md space-y-3 ring-2 ring-rose-100"
                >
                  {/* Top Bar with Bill # and Employee */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-base md:text-lg text-blue-900">
                          {t('billNo')} #{b.billNumber}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-rose-600 text-white animate-pulse">
                          ⚠️ {isTamil ? 'அனுமதி கோரப்பட்டுள்ளது' : 'Pending Approval'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-500 mt-1">
                        {b.time} ({b.date}) • {t('requestedBy')}:{' '}
                        <span className="text-slate-900 font-black">
                          {b.deleteRequest?.requestedBy || b.employeeName}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-slate-900 font-mono">
                        ₹{b.totalAmount}
                      </div>
                      <div className="text-[11px] font-bold text-slate-500">
                        {b.eggQuantity} {t('eggs')} @ ₹{b.pricePerEgg}
                      </div>
                    </div>
                  </div>

                  {/* Stock impact note */}
                  <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-200 flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Egg className="w-4 h-4 text-amber-600" />
                      <span>{isTamil ? 'ஒப்புதல் அளித்தால் இருப்புக்கு திரும்பும்:' : 'Stock to be restored on approval:'}</span>
                    </span>
                    <span className="font-mono font-black text-amber-950">+{b.eggQuantity} {t('eggs')}</span>
                  </div>

                  {/* Action Buttons for this request */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveReceiptBill(b)}
                      className="py-2.5 px-2 sm:px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-black text-xs uppercase flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t('receiptPreview')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRejectDelete(b)}
                      className="py-2.5 px-2 sm:px-3 rounded-xl border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-black text-xs uppercase flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('rejectRequest')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApproveDelete(b)}
                      className="py-2.5 px-2 sm:px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase shadow-md flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{t('approveAndDelete')}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Past Reviewed / Rejected Requests */}
          {rejectedDeleteBills.length > 0 && (
            <div className="space-y-2 pt-3">
              <div className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
                {isTamil ? 'நிராகரிக்கப்பட்ட கோரிக்கைகள்' : 'Rejected Requests (Bill Kept Active)'} ({rejectedDeleteBills.length})
              </div>
              <div className="space-y-2">
                {rejectedDeleteBills.map((b) => (
                  <div
                    key={b.billId}
                    className="bg-white rounded-2xl p-3 border border-slate-200 text-xs flex items-center justify-between opacity-80"
                  >
                    <div>
                      <div className="font-black text-slate-900">
                        {t('billNo')} #{b.billNumber} • {b.eggQuantity} {t('eggs')}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {b.time} • {t('staff')}: {b.employeeName}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-slate-100 text-slate-600 font-black text-[10px] px-2 py-0.5 rounded-full border border-slate-200">
                        {isTamil ? 'நிராகரிக்கப்பட்டது' : 'Rejected'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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

      {/* Owner Direct Delete Confirmation Modal */}
      {billToOwnerDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-rose-600 text-white p-4 flex items-center gap-2.5">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-black text-base uppercase tracking-tight">
                  {t('deleteBillPermanently')}
                </h3>
                <p className="text-xs text-rose-100 font-bold">
                  {t('billNo')} #{billToOwnerDelete.billNumber}
                </p>
              </div>
            </div>
            <div className="p-4 space-y-3 font-mono">
              <p className="text-xs font-bold text-slate-700">
                {t('deleteBillConfirmDesc')}
              </p>
              <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 text-xs space-y-1 font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('eggQuantity')}:</span>
                  <span className="font-black text-rose-700">
                    +{billToOwnerDelete.eggQuantity} {t('eggs')} (return to stock)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('total')}:</span>
                  <span className="font-black text-slate-900">₹{billToOwnerDelete.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('staff')}:</span>
                  <span className="font-black text-slate-900">{billToOwnerDelete.employeeName}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBillToOwnerDelete(null)}
                  className="py-2.5 px-3 rounded-xl border-2 border-slate-300 text-slate-700 font-black text-xs uppercase hover:bg-slate-100 transition-all active:scale-95"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleOwnerConfirmDelete}
                  className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('delete')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
