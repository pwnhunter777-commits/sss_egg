import { Bill, DailyPrice, DailyStock, AgencySettings, PrinterDevice, BillNotification } from '../types';

const STORAGE_KEYS = {
  BILLS: 'sss_bills_v1',
  PENDING_SYNC: 'sss_pending_sync_v1',
  SETTINGS: 'sss_settings_v1',
  PRINTER: 'sss_printer_v1',
  NOTIFICATIONS: 'sss_notifications_v1',
  LAST_BILL_NUMBER: 'sss_last_bill_number_v1',
  ACTIVE_SESSION: 'sss_active_session_v1',
  LAST_ACTIVE_DATE: 'sss_last_active_date_v1',
};

export const DEFAULT_SETTINGS: AgencySettings = {
  agencyName: 'SSS EGG AGENCY',
  ownerPin: '8888',
  employeePin: '1234',
  phone: '+91 98765 43210',
  address: 'Shop #12, Wholesale Egg Market, Main Road',
};

export const DEFAULT_PRINTER: PrinterDevice = {
  connected: false,
  name: 'Thermal Printer (BT)',
  paperWidth: '58mm',
  autoPrintOnBill: true,
};

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatIndianCurrency(amount: number): string {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function getLocalBills(): Bill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local bills', e);
    return [];
  }
}

export function saveLocalBill(bill: Bill): void {
  try {
    const bills = getLocalBills();
    const existingIndex = bills.findIndex((b) => b.billId === bill.billId);
    if (existingIndex >= 0) {
      bills[existingIndex] = bill;
    } else {
      bills.unshift(bill);
    }
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));

    // Update last bill number for this specific day
    if (bill.billNumber && bill.date) {
      const dayKey = `sss_last_bill_number_${bill.date}`;
      const currentStored = parseInt(localStorage.getItem(dayKey) || '0', 10);
      if (bill.billNumber > currentStored) {
        localStorage.setItem(dayKey, String(bill.billNumber));
      }
    }

    // Add to pending sync if not synced
    if (bill.syncStatus === 'pending') {
      const pending = getLocalPendingBills();
      if (!pending.some((p) => p.billId === bill.billId)) {
        pending.push(bill);
        localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(pending));
      }
    }
  } catch (e) {
    console.error('Failed to save bill locally', e);
  }
}

export function getLocalPendingBills(): Bill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function markBillSyncedLocally(billId: string): void {
  try {
    // 1. Update bill in bills list
    const bills = getLocalBills();
    const target = bills.find((b) => b.billId === billId);
    if (target) {
      target.syncStatus = 'synced';
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
    }

    // 2. Remove from pending queue
    const pending = getLocalPendingBills().filter((p) => p.billId !== billId);
    localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(pending));
  } catch (e) {
    console.error('Failed to mark bill synced', e);
  }
}

/**
 * Gets the next bill number for a specific date (restarts at 1001 every new day)
 */
export function getNextBillNumber(date: string = getTodayDateString()): number {
  try {
    const dayKey = `sss_last_bill_number_${date}`;
    const stored = localStorage.getItem(dayKey);
    if (stored) {
      return parseInt(stored, 10) + 1;
    }
    const todayBills = getLocalBills().filter((b) => b.date === date);
    if (todayBills.length > 0) {
      const maxNo = Math.max(...todayBills.map((b) => b.billNumber || 1000));
      return maxNo + 1;
    }
    return 1001; // Starts at 1001 each day
  } catch {
    return 1001;
  }
}

// Daily Price Storage
export function getLocalDailyPrice(date: string): DailyPrice | null {
  try {
    const raw = localStorage.getItem(`sss_price_${date}`);
    if (raw) return JSON.parse(raw);
    return null;
  } catch {
    return null;
  }
}

export function setLocalDailyPrice(price: DailyPrice): void {
  try {
    localStorage.setItem(`sss_price_${price.date}`, JSON.stringify(price));
  } catch (e) {
    console.error('Failed to store daily price', e);
  }
}

// Daily Stock Storage
export function getLocalDailyStock(date: string): DailyStock | null {
  try {
    const raw = localStorage.getItem(`sss_stock_${date}`);
    if (raw) return JSON.parse(raw);
    return null;
  } catch {
    return null;
  }
}

export function setLocalDailyStock(stock: DailyStock): void {
  try {
    localStorage.setItem(`sss_stock_${stock.date}`, JSON.stringify(stock));
  } catch (e) {
    console.error('Failed to store daily stock', e);
  }
}

export function deductLocalStock(date: string, quantity: number): DailyStock | null {
  try {
    const stock = getLocalDailyStock(date);
    if (!stock) return null;
    const newRemaining = Math.max(0, stock.remainingStock - quantity);
    const newEggsSold = stock.eggsSold + quantity;
    const updated: DailyStock = {
      ...stock,
      remainingStock: newRemaining,
      eggsSold: newEggsSold,
      updatedAt: new Date().toISOString(),
    };
    setLocalDailyStock(updated);
    return updated;
  } catch (e) {
    console.error('Failed to deduct local stock', e);
    return null;
  }
}

// Settings
export function getLocalSettings(): AgencySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SETTINGS;
}

export function setLocalSettings(settings: AgencySettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to store settings', e);
  }
}

// Printer Config
export function getLocalPrinter(): PrinterDevice {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRINTER);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PRINTER;
}

export function setLocalPrinter(printer: PrinterDevice): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRINTER, JSON.stringify(printer));
  } catch (e) {
    console.error('Failed to store printer config', e);
  }
}

// Notifications
export function getLocalNotifications(): BillNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function addLocalNotification(notif: BillNotification): void {
  try {
    const list = getLocalNotifications();
    list.unshift(notif);
    // keep latest 50
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list.slice(0, 50)));
  } catch (e) {
    console.error('Failed to store notification', e);
  }
}

export function markNotificationsAsRead(): void {
  try {
    const list = getLocalNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  } catch {}
}

// Daily Active Session (Persists for the calendar day; auto-resets when date changes)
export interface ActiveSession {
  role: 'owner' | 'employee';
  date: string;
  loginTimestamp: number;
}

export function getLocalActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (!raw) return null;
    const session: ActiveSession = JSON.parse(raw);
    const today = getTodayDateString();
    // Daily expiry: if the session date is not today, automatically expire and clear it
    if (session.date !== today) {
      clearLocalActiveSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setLocalActiveSession(role: 'owner' | 'employee'): void {
  try {
    const session: ActiveSession = {
      role,
      date: getTodayDateString(),
      loginTimestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to store active session', e);
  }
}

export function clearLocalActiveSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  } catch (e) {
    console.error('Failed to clear active session', e);
  }
}

// Daily Data Lifecycle & Automatic Purge
export function getLastActiveDate(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE);
  } catch {
    return null;
  }
}

export function setLastActiveDate(date: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, date);
  } catch (e) {
    console.error('Failed to set last active date', e);
  }
}

/**
 * Cleans up past days' operational data from local phone memory.
 * Retains only today's records so the phone operates fast, light, and with clean daily numbers.
 */
export function purgeOldDaysLocalData(currentDate: string = getTodayDateString()): void {
  try {
    // 1. Filter out bills from past days
    const allBills = getLocalBills();
    const todayBills = allBills.filter((b) => b.date === currentDate);
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(todayBills));

    // 2. Filter out notifications from past days
    const allNotifs = getLocalNotifications();
    const todayNotifs = allNotifs.filter((n) => n.date === currentDate);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(todayNotifs));

    // 3. Clean up old date keys (price, stock, bill numbers)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (
          (key.startsWith('sss_price_') && !key.endsWith(currentDate)) ||
          (key.startsWith('sss_stock_') && !key.endsWith(currentDate)) ||
          (key.startsWith('sss_last_bill_number_') && !key.endsWith(currentDate))
        ) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.error('Failed to purge old days local data', e);
  }
}

/**
 * Clears today's local operational records and restarts counters at zero
 */
export function clearAllTodayLocalData(currentDate: string = getTodayDateString()): void {
  try {
    // 1. Remove today's bills from local storage
    const allBills = getLocalBills();
    const remaining = allBills.filter((b) => b.date !== currentDate);
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(remaining));

    // 2. Remove today's notifications
    const allNotifs = getLocalNotifications();
    const notifsRemaining = allNotifs.filter((n) => n.date !== currentDate);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifsRemaining));

    // 3. Clear today's bill number counter so next bill starts at #1001
    localStorage.removeItem(`sss_last_bill_number_${currentDate}`);
    localStorage.removeItem(STORAGE_KEYS.LAST_BILL_NUMBER);

    // 4. Clear today's stock & price cache
    localStorage.removeItem(`sss_stock_${currentDate}`);
    localStorage.removeItem(`sss_price_${currentDate}`);
  } catch (e) {
    console.error('Failed to clear today local data', e);
  }
}

export function resetAllLocalData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.BILLS);
    localStorage.removeItem(STORAGE_KEYS.PENDING_SYNC);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.LAST_BILL_NUMBER);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);

    // Clean up daily price & stock caches
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('sss_price_') ||
          key.startsWith('sss_stock_') ||
          key.startsWith('sss_last_bill_number_'))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.error('Failed to reset all local data', e);
  }
}


