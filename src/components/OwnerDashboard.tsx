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
import { LogoutPinModal } from './LogoutPinModal';
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
  Eye,
  Banknote,
  Smartphone,
  Clock,
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
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [billToCancel, setBillToCancel] = useState<Bill | null>(null);

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
      const freshStock = await EggAgencyService.getTodayStock(selectedDate);
      setTodayStock(freshStock);
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

  const handleConfirmCancelBill = async () => {
    if (!billToCancel) return;
    try {
      await EggAgencyService.approveBillDelete(billToCancel, true);
      setBills((prev) => prev.filter((b) => b.billId !== billToCancel.billId));
      setGlobalPendingRequests((prev) => prev.filter((b) => b.billId !== billToCancel.billId));
      const freshStock = await EggAgencyService.getTodayStock(selectedDate);
      setTodayStock(freshStock);
      setActionFeedback(
        isTamil
          ? `பில் #${billToCancel.billNumber} ரத்து செய்யப்பட்டு ${billToCancel.eggQuantity} முட்டைகள் மீண்டும் கையிருப்புக்குத் திரும்பின!`
          : `Bill #${billToCancel.billNumber} cancelled! ${billToCancel.eggQuantity} eggs returned to stock.`
      );
      setBillToCancel(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Cancel bill failed:', err);
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

  // Payment Breakdown Calculations
  const cashBills = bills.filter((b) => (b.paymentMethod || 'cash') === 'cash');
  const gpayBills = bills.filter((b) => b.paymentMethod === 'gpay');
  const creditBills = bills.filter((b) => b.paymentMethod === 'credit');

  const totalCashWithEmployee = cashBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalGPayCollected = gpayBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalCreditOutstanding = creditBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  // Opening stock & Remaining Stock
  const openingStock = todayStock?.openingStock ?? 0;
  const remainingStock = todayStock?.remainingStock !== undefined
    ? todayStock.remainingStock
    : Math.max(0, openingStock - totalEggsSold);

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
    <div className="flex-1 flex flex-col bg-slate-100 text-slate-800 select-none">
      {/* Top Header - Compact */}
      <header className="bg-blue-800 text-white px-3 py-2 shadow-xs shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="font-black text-sm tracking-tight uppercase leading-tight">
                {isTamil && settings.agencyName === 'SSS EGG AGENCY'
                  ? t('agencyNameDefault')
                  : settings.agencyName || t('agencyNameDefault')}
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-blue-200 font-bold mt-0.5">
                <span className="flex items-center gap-1 font-black">
                  {isOnline ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Wifi className="w-3 h-3" /> {t('online')}
                    </span>
                  ) : (
                    <span className="text-amber-300 flex items-center gap-1 font-black">
                      <WifiOff className="w-3 h-3" /> {t('offline')}
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
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white relative transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-bounce shadow-2xs">
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={t('settings')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Logout */}
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
            className={`mt-2 p-2 rounded-xl shadow-md flex items-center justify-between cursor-pointer animate-in slide-in-from-top-2 border ${
              activeBannerNotif.type === 'delete_request'
                ? 'bg-rose-500 text-white border-rose-300'
                : 'bg-amber-400 text-amber-950 border-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base animate-pulse">
                {activeBannerNotif.type === 'delete_request' ? '⚠️' : '🔔'}
              </span>
              <div>
                <div className="text-xs font-black uppercase tracking-tight">
                  {activeBannerNotif.type === 'delete_request'
                    ? (isTamil
                        ? `நீக்குதல் கோரிக்கை: பில் #${activeBannerNotif.billNumber}`
                        : `Delete Request: Bill #${activeBannerNotif.billNumber}`)
                    : `New Bill Created #${activeBannerNotif.billNumber}`}
                </div>
                <div className="text-[11px] font-bold opacity-95">
                  {activeBannerNotif.type === 'delete_request'
                    ? `${t('staff')}: ${activeBannerNotif.employeeName} • ${activeBannerNotif.reason || 'Staff requested deletion'}`
                    : `${activeBannerNotif.eggQuantity} Eggs • ${formatIndianCurrency(activeBannerNotif.totalAmount)} • Staff: ${activeBannerNotif.employeeName}`}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-black bg-black/20 px-2 py-0.5 rounded-lg">
              {activeBannerNotif.type === 'delete_request' ? (isTamil ? 'மதிப்பாய்வு' : 'Review') : 'View'}
            </span>
          </div>
        )}
      </header>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="bg-emerald-600 text-white px-3 py-1.5 text-xs font-black flex items-center justify-between shadow-2xs animate-fadeIn">
          <span>{actionFeedback}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-white/80 hover:text-white font-bold ml-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Action Navigation Bar - Compact */}
      <nav aria-label="Owner Actions" className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-1.5 px-2.5 rounded-lg font-black text-xs whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-100 font-bold'
            }`}
          >
            {t('overview')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`py-1.5 px-2.5 rounded-lg font-black text-xs whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'bills'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-700 hover:bg-slate-100 font-bold'
            }`}
          >
            <span>{t('allBills')} ({bills.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('delete_requests')}
            className={`py-1.5 px-2.5 rounded-lg font-black text-xs whitespace-nowrap transition-all flex items-center gap-1 relative cursor-pointer ${
              activeTab === 'delete_requests'
                ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-400'
                : pendingDeleteBills.length > 0
                ? 'bg-rose-100 text-rose-800 border border-rose-400 font-black animate-pulse shadow-2xs'
                : 'text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold'
            }`}
          >
            <span className="flex items-center gap-1">
              <span>{t('deleteRequests')}</span>
              {pendingDeleteBills.length > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                </span>
              )}
            </span>
            {pendingDeleteBills.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black animate-bounce shadow-2xs ${
                  activeTab === 'delete_requests' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'
                }`}
              >
                {pendingDeleteBills.length}
              </span>
            )}
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200/80 px-2 py-0.5 rounded-lg border border-slate-300/80 text-[11px] font-bold shrink-0 ml-auto shadow-2xs transition-colors">
          <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-slate-800 font-bold text-[11px] focus:outline-hidden cursor-pointer w-[100px] sm:w-auto"
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
        <div className="flex-1 overflow-y-auto no-scrollbar p-2.5 sm:p-3 space-y-2.5">
          {/* Quick Management Shortcuts Row - Compact */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowPriceModal(true)}
              className="bg-white hover:bg-blue-50/60 p-2.5 rounded-xl border border-blue-200 shadow-2xs flex items-center justify-center active:scale-98 transition-all text-center cursor-pointer"
            >
              <div className="text-xs sm:text-sm font-black text-slate-900">{t('setPrice')}</div>
            </button>

            <button
              type="button"
              onClick={() => setShowStockModal(true)}
              className="bg-white hover:bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-center active:scale-98 transition-all text-center cursor-pointer"
            >
              <div className="text-xs sm:text-sm font-black text-slate-900">{t('importStock')}</div>
            </button>
          </div>

          {/* SUMMARY CARDS - Compact & Space Efficient */}
          <div className="space-y-2">
            {/* Card 1: TODAY'S SALES - Compact */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 rounded-xl p-3 sm:p-3.5 text-white shadow-md shadow-blue-500/15 relative overflow-hidden">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-black text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-300" />
                    <span>{t('todaySales')}</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black mt-1 font-mono tracking-tight text-white drop-shadow-xs">
                    {formatIndianCurrency(totalSales)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] bg-blue-900/80 px-2.5 py-1 rounded-lg text-blue-100 font-black border border-blue-400/30">
                    1 {isTamil ? 'தாரா' : 'Tara'} = ₹{todayPrice?.pricePer30Eggs ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Collections Breakdown: Cash with Employee, GPay, Credit */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {/* Card A: CASH WITH EMPLOYEE */}
              <div className="bg-emerald-50 rounded-xl p-2 sm:p-2.5 border border-emerald-300 shadow-2xs">
                <div className="text-[10px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1 truncate">
                  <Banknote className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate">{isTamil ? 'கையில் ரொக்கம்' : 'Cash in Hand'}</span>
                </div>
                <div className="text-base sm:text-xl font-black text-emerald-950 font-mono mt-1 tracking-tight truncate">
                  {formatIndianCurrency(totalCashWithEmployee)}
                </div>
              </div>

              {/* Card B: GPAY COLLECTED */}
              <div className="bg-blue-50 rounded-xl p-2 sm:p-2.5 border border-blue-300 shadow-2xs">
                <div className="text-[10px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1 truncate">
                  <Smartphone className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span className="truncate">{isTamil ? 'GPay வசூல்' : 'GPay / UPI'}</span>
                </div>
                <div className="text-base sm:text-xl font-black text-blue-950 font-mono mt-1 tracking-tight truncate">
                  {formatIndianCurrency(totalGPayCollected)}
                </div>
              </div>

              {/* Card C: CREDIT */}
              <div className="bg-amber-50 rounded-xl p-2 sm:p-2.5 border border-amber-300 shadow-2xs">
                <div className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1 truncate">
                  <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">{isTamil ? 'கடன் பாக்கி' : 'Credit / Due'}</span>
                </div>
                <div className="text-base sm:text-xl font-black text-amber-950 font-mono mt-1 tracking-tight truncate">
                  {formatIndianCurrency(totalCreditOutstanding)}
                </div>
              </div>
            </div>

            {/* Grid 2 Columns: TOTAL STOCK & REMAINING STOCK - Compact */}
            <div className="grid grid-cols-2 gap-2">
              {/* Card 2A: TOTAL STOCK */}
              <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>{isTamil ? 'மொத்த வரவு' : 'Total Stock'}</span>
                  {todayStock?.importHistory && todayStock.importHistory.length > 0 && (
                    <span className="text-[9px] font-mono font-black text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded-full">
                      {todayStock.importHistory.length} {isTamil ? 'வரவுகள்' : 'entries'}
                    </span>
                  )}
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                  {Math.floor(openingStock / 30).toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-black text-blue-700">{isTamil ? 'தாரா' : 'Trays'}</span>
                  {openingStock % 30 > 0 && (
                    <span className="text-[10px] font-bold text-slate-500 ml-1">
                      (+{openingStock % 30})
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2B: REMAINING STOCK */}
              <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>{t('remainingStock')}</span>
                  <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                    {isTamil ? 'கையிருப்பு' : 'In Hand'}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
                  {Math.floor(remainingStock / 30).toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-black text-emerald-700">{isTamil ? 'தாரா' : 'Trays'}</span>
                  {remainingStock % 30 > 0 && (
                    <span className="text-[10px] font-bold text-slate-500 ml-1">
                      (+{remainingStock % 30})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Grid 3 Columns: EGGS SOLD, TOTAL BILLS, PROFIT - Compact */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {/* EGGS SOLD */}
              <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">
                  {t('eggsSold')}
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5 leading-tight">
                  {Math.floor(totalEggsSold / 30)}{' '}
                  <span className="text-[10px] font-bold text-blue-700">{isTamil ? 'தாரா' : 'T'}</span>
                </div>
                <div className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">
                  {totalEggsSold} {t('eggs')}
                </div>
              </div>

              {/* TOTAL BILLS */}
              <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">
                  {t('totalBills')}
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5 leading-tight">
                  {totalBillsCount}
                </div>
                <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                  {isTamil ? 'ரசீதுகள்' : 'Bills'}
                </div>
              </div>

              {/* TODAY'S PROFIT */}
              <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200 shadow-2xs">
                <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider truncate">
                  {t('profit')}
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-950 font-mono mt-0.5 leading-tight truncate">
                  {formatIndianCurrency(totalProfit)}
                </div>
                <div className="text-[9px] font-bold text-emerald-700 mt-0.5">
                  {isTamil ? 'இன்றைய லாபம்' : 'Profit'}
                </div>
              </div>
            </div>
          </div>

          {/* Employee-wise Sales & Cash in Hand with Employee - Compact */}
          <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>{t('staff')} {t('overview')} - Staff Ramesh</span>
              </div>
            </div>

            {/* Cash in Hand with Employee Highlight Banner */}
            <div className="p-2.5 bg-emerald-50/90 border-2 border-emerald-300 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-950">
                    {isTamil ? 'ஊழியரிடம் உள்ள மீதமுள்ள ரொக்கம்' : 'Remaining Cash with Employee'}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-700">
                    {isTamil ? 'ரொக்க வசூல் தொகை' : 'Total cash in hand collected'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg sm:text-xl font-black text-emerald-900 font-mono">
                  {formatIndianCurrency(totalCashWithEmployee)}
                </div>
                <div className="text-[10px] font-bold text-emerald-700 font-mono">
                  {cashBills.length} {isTamil ? 'ரொக்க பில்கள்' : 'cash bills'}
                </div>
              </div>
            </div>

            {/* Sub-breakdown: GPay and Credit Collections with Staff */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-blue-900">{isTamil ? 'GPay வசூல்' : 'GPay Collected'}</div>
                  <div className="text-[9px] font-bold text-blue-700">{gpayBills.length} {isTamil ? 'பில்கள்' : 'bills'}</div>
                </div>
                <div className="font-mono font-black text-sm sm:text-base text-blue-900">
                  {formatIndianCurrency(totalGPayCollected)}
                </div>
              </div>

              <div className="p-2 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-amber-900">{isTamil ? 'கடன் தொகை' : 'Credit Total'}</div>
                  <div className="text-[9px] font-bold text-amber-700">{creditBills.length} {isTamil ? 'பில்கள்' : 'bills'}</div>
                </div>
                <div className="font-mono font-black text-sm sm:text-base text-amber-900">
                  {formatIndianCurrency(totalCreditOutstanding)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALL BILLS TAB - Compact */}
      {activeTab === 'bills' && (
        <div className="flex-1 overflow-y-auto no-scrollbar p-2.5 sm:p-3 space-y-2">
          {/* Search bar - Compact */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchBillsPlaceholder')}
              value={billSearch}
              onChange={(e) => setBillSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            {filteredBills.length === 0 ? (
              <div className="bg-white rounded-xl p-5 text-center border border-slate-200 text-slate-500">
                <p className="text-xs sm:text-sm font-black">{t('noBillsFound')}</p>
              </div>
            ) : (
              filteredBills.map((b) => (
                <div
                  key={b.billId}
                  className={`bg-white rounded-xl p-2 sm:p-2.5 border shadow-2xs transition-all space-y-2 ${
                    b.deleteRequest?.status === 'pending'
                      ? 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-200'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-xs sm:text-sm text-blue-900">
                          {t('billNo')} #{b.billNumber}
                        </span>

                        {/* Payment Method Badge */}
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                            b.paymentMethod === 'gpay'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : b.paymentMethod === 'credit'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {b.paymentMethod === 'gpay'
                            ? (isTamil ? 'ஜிபே' : 'GPAY')
                            : b.paymentMethod === 'credit'
                            ? (isTamil ? 'கடன்' : 'CREDIT')
                            : (isTamil ? 'ரொக்கம்' : 'CASH')}
                        </span>

                        {b.deleteRequest?.status === 'pending' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-rose-600 text-white animate-pulse">
                            ⚠️ {isTamil ? 'நீக்குதல் கோரிக்கை' : 'Delete Requested'}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-bold text-slate-700">
                        <span>{b.eggQuantity} {t('eggs')}</span>
                        <span className="text-slate-400"> • </span>
                        <span>₹{b.pricePerEgg}{t('perEgg')}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 flex-wrap">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono text-[10px]">{b.time}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-700 font-black">{t('profit')}: ₹{b.profit}</span>
                      </div>
                    </div>

                    <div className="text-right space-y-1 shrink-0">
                      <div className="font-black text-sm sm:text-base text-slate-900 font-mono">
                        ₹{Math.round(b.totalAmount).toLocaleString('en-IN')}
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveReceiptBill(b)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                          title={t('receiptPreview')}
                        >
                          <Eye className="w-3 h-3 shrink-0" />
                          <span>{t('receiptPreview')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBillToCancel(b)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                          title={isTamil ? 'பில் ரத்து' : 'Cancel Bill'}
                        >
                          <Trash2 className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>{isTamil ? 'ரத்து' : 'Cancel'}</span>
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
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tight">
                  {t('reviewDeleteRequestsTitle')}
                </h2>
                <p className="text-[10px] text-rose-200 font-bold">
                  {isTamil
                    ? 'பணியாளர்கள் அனுப்பிய நீக்குதல் கோரிக்கைகளை ஆய்வு செய்து அங்கீகரிக்கவும்'
                    : 'Review and approve or reject deletion requests submitted by employees'}
                </p>
              </div>
            </div>

            {/* Quick Metrics - Compact */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <div className="bg-white/10 rounded-xl p-1.5 backdrop-blur-xs border border-white/15">
                <div className="text-[9px] font-bold text-rose-200 uppercase">
                  {isTamil ? 'நிலுவை' : 'Pending'}
                </div>
                <div className="text-base font-black font-mono">
                  {pendingDeleteBills.length}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-1.5 backdrop-blur-xs border border-white/15">
                <div className="text-[9px] font-bold text-rose-200 uppercase">
                  {isTamil ? 'மீளப்பெறும் முட்டை' : 'Eggs to Return'}
                </div>
                <div className="text-base font-black font-mono">
                  +{totalPendingEggs}
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-1.5 backdrop-blur-xs border border-white/15">
                <div className="text-[9px] font-bold text-rose-200 uppercase">
                  {isTamil ? 'மொத்த மதிப்பு' : 'Total Value'}
                </div>
                <div className="text-base font-black font-mono">
                  ₹{Math.round(totalPendingAmount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Pending Delete Requests Cards - Compact */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 px-0.5">
              <span>{t('pendingRequests')} ({pendingDeleteBills.length})</span>
            </div>

            {pendingDeleteBills.length === 0 ? (
              <div className="bg-white rounded-xl p-5 text-center border border-slate-200 text-slate-500 space-y-1.5 shadow-2xs">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm font-black text-slate-800">{t('noPendingDeleteRequests')}</p>
                <p className="text-[10px] font-bold text-slate-500 max-w-sm mx-auto">
                  {t('allClearDesc')}
                </p>
              </div>
            ) : (
              pendingDeleteBills.map((b) => (
                <div
                  key={b.billId}
                  className="bg-white rounded-xl p-2.5 sm:p-3 border border-rose-300 shadow-xs space-y-2 ring-1 ring-rose-100"
                >
                  {/* Top Bar with Bill # and Employee */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs sm:text-sm text-blue-900">
                          {t('billNo')} #{b.billNumber}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-rose-600 text-white animate-pulse">
                          ⚠️ {isTamil ? 'அனுமதி கோரப்பட்டுள்ளது' : 'Pending Approval'}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                        {b.time} ({b.date}) • {t('requestedBy')}:{' '}
                        <span className="text-slate-900 font-black">
                          {b.deleteRequest?.requestedBy || b.employeeName}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-slate-900 font-mono">
                        ₹{b.totalAmount}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500">
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
          selectedDate={selectedDate}
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

      {activeReceiptBill && (
        <ThermalReceipt
          bill={activeReceiptBill}
          settings={settings}
          printer={printer}
          role="owner"
          hidePrintButton={true}
          onClose={() => setActiveReceiptBill(null)}
        />
      )}

      {/* Bill Cancellation Confirmation Modal for Owner */}
      {billToCancel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in select-none">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-rose-700 text-white p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-200" />
                <h3 className="font-black text-sm">
                  {isTamil ? `பில் #${billToCancel.billNumber} ரத்து செய்தல்` : `Cancel Bill #${billToCancel.billNumber}`}
                </h3>
              </div>
              <button
                onClick={() => setBillToCancel(null)}
                className="text-rose-100 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 space-y-3">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs space-y-1 text-rose-950">
                <div className="font-black text-rose-800">
                  {isTamil ? 'கையிருப்பு மீட்டமைப்பு:' : 'Inventory Stock Restoration:'}
                </div>
                <p className="font-bold">
                  {isTamil
                    ? `இந்த பில்லை ரத்து செய்தால் ${billToCancel.eggQuantity} முட்டைகள் (${Math.floor(billToCancel.eggQuantity / 30)} தாரா) மீண்டும் இன்றைய கையிருப்பில் சேர்க்கப்படும்.`
                    : `Cancelling this bill will return ${billToCancel.eggQuantity} eggs (${Math.floor(billToCancel.eggQuantity / 30)} Trays) back into today's inventory stock.`}
                </p>
                <div className="font-mono text-slate-700 pt-1 text-[11px]">
                  {formatIndianCurrency(billToCancel.totalAmount)} • {billToCancel.time} • {t('staff')}: {billToCancel.employeeName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setBillToCancel(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 rounded-xl transition-all cursor-pointer"
                >
                  {isTamil ? 'வேண்டாம்' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelBill}
                  className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs py-2 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isTamil ? 'உறுதி செய்' : 'Confirm & Restore'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <LogoutPinModal
          role="owner"
          settings={settings}
          onConfirmLogout={onLogout}
          onClose={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
};
