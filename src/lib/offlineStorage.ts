import { Bill, DailyPrice, DailyStock, AgencySettings, PrinterDevice, BillNotification } from '../types';

const STORAGE_KEYS = {
  BILLS: 'sss_bills_v1',
  PENDING_SYNC: 'sss_pending_sync_v1',
  SETTINGS: 'sss_settings_v1',
  PRINTER: 'sss_printer_v1',
  NOTIFICATIONS: 'sss_notifications_v1',
  LAST_BILL_NUMBER: 'sss_last_bill_number_v1',
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

    // Update last bill number
    if (bill.billNumber) {
      const currentLast = getNextBillNumber() - 1;
      if (bill.billNumber > currentLast) {
        localStorage.setItem(STORAGE_KEYS.LAST_BILL_NUMBER, String(bill.billNumber));
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

export function getNextBillNumber(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_BILL_NUMBER);
    if (stored) {
      return parseInt(stored, 10) + 1;
    }
    const bills = getLocalBills();
    if (bills.length > 0) {
      const maxNo = Math.max(...bills.map((b) => b.billNumber || 1000));
      return maxNo + 1;
    }
    return 1001;
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
