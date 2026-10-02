import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Bill, DailyPrice, DailyStock, BillNotification, AgencySettings } from '../types';
import {
  getTodayDateString,
  formatTime,
  getLocalBills,
  saveLocalBill,
  getLocalPendingBills,
  markBillSyncedLocally,
  getNextBillNumber,
  getLocalDailyPrice,
  setLocalDailyPrice,
  getLocalDailyStock,
  setLocalDailyStock,
  deductLocalStock,
  getLocalSettings,
  setLocalSettings,
  getLocalNotifications,
  addLocalNotification,
} from '../lib/offlineStorage';

export const EggAgencyService = {
  /**
   * Load today's pricing (combines local cache + Firestore sync)
   */
  async getTodayPrice(date: string = getTodayDateString()): Promise<DailyPrice> {
    const local = getLocalDailyPrice(date);
    if (local) {
      // Async refresh from Firestore in background
      this.fetchRemotePrice(date).catch(() => {});
      return local;
    }

    try {
      const docRef = doc(db, 'daily_prices', date);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as DailyPrice;
        setLocalDailyPrice(data);
        return data;
      }
    } catch (err) {
      console.warn('Network unavailable, using default price', err);
    }

    // Default if not yet set for today: 1 egg = ₹3, 30 eggs = ₹90, purchase = ₹2
    const defaultPrice: DailyPrice = {
      date,
      pricePerEgg: 3,
      pricePer30Eggs: 90,
      purchaseCost: 2,
      updatedAt: new Date().toISOString(),
    };
    setLocalDailyPrice(defaultPrice);
    return defaultPrice;
  },

  async fetchRemotePrice(date: string): Promise<DailyPrice | null> {
    try {
      const docRef = doc(db, 'daily_prices', date);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as DailyPrice;
        setLocalDailyPrice(data);
        return data;
      }
    } catch (err) {
      // silent network fail
    }
    return null;
  },

  async saveTodayPrice(price: DailyPrice): Promise<void> {
    // 1. Save local
    setLocalDailyPrice(price);

    // 2. Save remote
    try {
      const docRef = doc(db, 'daily_prices', price.date);
      await setDoc(docRef, price, { merge: true });
    } catch (err) {
      console.warn('Could not sync daily price immediately to cloud (offline active):', err);
    }
  },

  /**
   * Load today's stock
   */
  async getTodayStock(date: string = getTodayDateString()): Promise<DailyStock> {
    const local = getLocalDailyStock(date);
    if (local) {
      this.fetchRemoteStock(date).catch(() => {});
      return local;
    }

    try {
      const docRef = doc(db, 'daily_stock', date);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as DailyStock;
        setLocalDailyStock(data);
        return data;
      }
    } catch (err) {
      console.warn('Network unavailable, using default stock', err);
    }

    // Default stock for new day (3,000 eggs @ Rs 2 purchase cost)
    const defaultStock: DailyStock = {
      date,
      openingStock: 3000,
      importedStock: 3000,
      eggsSold: 0,
      remainingStock: 3000,
      purchaseCost: 2,
      updatedAt: new Date().toISOString(),
    };
    setLocalDailyStock(defaultStock);
    return defaultStock;
  },

  async fetchRemoteStock(date: string): Promise<DailyStock | null> {
    try {
      const docRef = doc(db, 'daily_stock', date);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as DailyStock;
        setLocalDailyStock(data);
        return data;
      }
    } catch (err) {
      // silent
    }
    return null;
  },

  async saveTodayStock(stock: DailyStock): Promise<void> {
    // 1. Save local
    setLocalDailyStock(stock);

    // 2. Save remote
    try {
      const docRef = doc(db, 'daily_stock', stock.date);
      await setDoc(docRef, stock, { merge: true });
    } catch (err) {
      console.warn('Could not sync daily stock immediately to cloud (offline active):', err);
    }
  },

  /**
   * Create Bill with stock protection, offline-first execution, and real-time syncing
   */
  async createBill(params: {
    eggQuantity: number;
    employeeId?: string;
    employeeName?: string;
    date?: string;
  }): Promise<Bill> {
    const date = params.date || getTodayDateString();
    const eggQuantity = Number(params.eggQuantity);

    if (eggQuantity <= 0) {
      throw new Error('Please enter a valid egg quantity greater than 0.');
    }

    // 1. Check current stock
    const currentStock = await this.getTodayStock(date);
    if (currentStock.remainingStock < eggQuantity) {
      throw new Error(
        `Insufficient stock! Only ${currentStock.remainingStock} egg${currentStock.remainingStock === 1 ? '' : 's'} available in stock.`
      );
    }

    // 2. Get today's locked price
    const activePrice = await this.getTodayPrice(date);
    const pricePerEgg = activePrice.pricePerEgg;
    const pricePer30Eggs = activePrice.pricePer30Eggs;
    const purchaseCostPerEgg = activePrice.purchaseCost;

    // Pricing calculation:
    // If owner set 30-egg tray price, trays use tray price + remaining loose eggs
    // If 30-egg price matches 30 * pricePerEgg, it evaluates cleanly to eggQuantity * pricePerEgg
    let totalAmount = 0;
    if (eggQuantity >= 30 && pricePer30Eggs > 0) {
      const trays = Math.floor(eggQuantity / 30);
      const loose = eggQuantity % 30;
      totalAmount = trays * pricePer30Eggs + loose * pricePerEgg;
    } else {
      totalAmount = eggQuantity * pricePerEgg;
    }

    const costOfEggsSold = eggQuantity * purchaseCostPerEgg;
    const profit = Math.max(0, totalAmount - costOfEggsSold);

    const billNumber = getNextBillNumber();
    const billId = `bill_${date}_${billNumber}_${Date.now()}`;
    const currentTimeStr = formatTime(new Date());

    const newBill: Bill = {
      billId,
      billNumber,
      employeeId: params.employeeId || 'emp_01',
      employeeName: params.employeeName || 'Staff Ramesh',
      date,
      time: currentTimeStr,
      createdAt: new Date().toISOString(),
      eggQuantity,
      pricePerEgg,
      pricePer30Eggs,
      totalAmount,
      purchaseCostPerEgg,
      profit,
      syncStatus: 'pending',
    };

    // 3. Deduct stock locally immediately so offline bills don't oversell!
    const updatedStock = deductLocalStock(date, eggQuantity);
    saveLocalBill(newBill);

    // 4. Try syncing to Firestore and creating owner notification
    try {
      await setDoc(doc(db, 'bills', billId), {
        ...newBill,
        syncStatus: 'synced',
      });

      // Update remote stock if we have updated stock
      if (updatedStock) {
        await setDoc(doc(db, 'daily_stock', date), updatedStock, { merge: true });
      }

      // Create owner notification in Firestore
      const notifId = `notif_${billId}`;
      const notificationData: BillNotification = {
        notificationId: notifId,
        billId,
        billNumber,
        employeeName: newBill.employeeName,
        eggQuantity,
        totalAmount,
        date,
        time: currentTimeStr,
        read: false,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'notifications', notifId), notificationData);

      // Mark locally as synced
      markBillSyncedLocally(billId);
      newBill.syncStatus = 'synced';
    } catch (err) {
      console.warn('Could not sync bill immediately to cloud (offline mode active):', err);
      // Keep in local pending queue; will auto-sync when online
      const offlineNotif: BillNotification = {
        notificationId: `notif_${billId}`,
        billId,
        billNumber,
        employeeName: newBill.employeeName,
        eggQuantity,
        totalAmount,
        date,
        time: currentTimeStr,
        read: false,
        createdAt: new Date().toISOString(),
      };
      addLocalNotification(offlineNotif);
    }

    return newBill;
  },

  /**
   * Sync pending offline bills to cloud
   */
  async syncPendingBills(): Promise<{ syncedCount: number; errors: number }> {
    const pendingBills = getLocalPendingBills();
    if (pendingBills.length === 0) {
      return { syncedCount: 0, errors: 0 };
    }

    let syncedCount = 0;
    let errors = 0;

    for (const bill of pendingBills) {
      try {
        await setDoc(doc(db, 'bills', bill.billId), {
          ...bill,
          syncStatus: 'synced',
        });

        // Push notification for owner
        const notifId = `notif_${bill.billId}`;
        await setDoc(doc(db, 'notifications', notifId), {
          notificationId: notifId,
          billId: bill.billId,
          billNumber: bill.billNumber,
          employeeName: bill.employeeName,
          eggQuantity: bill.eggQuantity,
          totalAmount: bill.totalAmount,
          date: bill.date,
          time: bill.time,
          read: false,
          createdAt: new Date().toISOString(),
        });

        markBillSyncedLocally(bill.billId);
        syncedCount++;
      } catch (e) {
        errors++;
        console.warn('Failed to sync bill:', bill.billId, e);
      }
    }

    return { syncedCount, errors };
  },

  /**
   * Subscriptions for Real-time sync
   */
  subscribeToDateBills(date: string, onUpdate: (bills: Bill[]) => void): () => void {
    // Initial emission from local storage
    const local = getLocalBills().filter((b) => b.date === date);
    onUpdate(local);

    try {
      const q = query(
        collection(db, 'bills'),
        where('date', '==', date)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const remoteBills: Bill[] = [];
          snapshot.forEach((d) => remoteBills.push(d.data() as Bill));
          
          // Merge local pending bills that might not have reached server yet
          const pending = getLocalPendingBills().filter((b) => b.date === date);
          const merged = [...remoteBills];
          for (const p of pending) {
            if (!merged.some((m) => m.billId === p.billId)) {
              merged.push(p);
            }
          }

          // Sort by billNumber descending
          merged.sort((a, b) => (b.billNumber || 0) - (a.billNumber || 0));
          onUpdate(merged);
        },
        (error) => {
          console.warn('Bills snapshot listener notice (offline fallback active):', error);
        }
      );

      return unsubscribe;
    } catch {
      return () => {};
    }
  },

  subscribeToStock(date: string, onUpdate: (stock: DailyStock | null) => void): () => void {
    const local = getLocalDailyStock(date);
    if (local) onUpdate(local);

    try {
      const docRef = doc(db, 'daily_stock', date);
      const unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as DailyStock;
            setLocalDailyStock(data);
            onUpdate(data);
          }
        },
        (error) => {
          console.warn('Stock snapshot listener notice (offline fallback active):', error);
        }
      );
      return unsubscribe;
    } catch {
      return () => {};
    }
  },

  subscribeToPrice(date: string, onUpdate: (price: DailyPrice | null) => void): () => void {
    const local = getLocalDailyPrice(date);
    if (local) onUpdate(local);

    try {
      const docRef = doc(db, 'daily_prices', date);
      const unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as DailyPrice;
            setLocalDailyPrice(data);
            onUpdate(data);
          }
        },
        (error) => {
          console.warn('Price snapshot listener notice (offline fallback active):', error);
        }
      );
      return unsubscribe;
    } catch {
      return () => {};
    }
  },

  subscribeToNotifications(onUpdate: (notifs: BillNotification[]) => void): () => void {
    // Local notifications first
    const local = getLocalNotifications();
    onUpdate(local);

    try {
      const q = query(
        collection(db, 'notifications'),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: BillNotification[] = [];
          snapshot.forEach((d) => list.push(d.data() as BillNotification));
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          onUpdate(list.slice(0, 20));
        },
        (error) => {
          console.warn('Notifications snapshot notice (offline fallback active):', error);
        }
      );

      return unsubscribe;
    } catch {
      return () => {};
    }
  },

  async markNotificationRead(notifId: string): Promise<void> {
    try {
      await setDoc(doc(db, 'notifications', notifId), { read: true }, { merge: true });
    } catch (e) {
      console.warn('Failed to mark notification read', e);
    }
  },

  // Settings
  async getSettings(): Promise<AgencySettings> {
    const local = getLocalSettings();
    try {
      const snap = await getDoc(doc(db, 'settings', 'agency_config'));
      if (snap.exists()) {
        const remote = snap.data() as AgencySettings;
        setLocalSettings(remote);
        return remote;
      }
    } catch {}
    return local;
  },

  async saveSettings(settings: AgencySettings): Promise<void> {
    setLocalSettings(settings);
    try {
      await setDoc(doc(db, 'settings', 'agency_config'), settings, { merge: true });
    } catch (err) {
      console.warn('Could not sync settings to cloud immediately (offline active):', err);
    }
  },

  /**
   * Cleans up all past days' data from Firestore (bills, stock, price, notifications)
   * so every calendar day operates on a 100% clean, fresh slate.
   */
  async purgePastDaysData(currentDate: string = getTodayDateString()): Promise<void> {
    try {
      // 1. Purge past bills
      const billsSnap = await getDocs(collection(db, 'bills'));
      const billBatch = writeBatch(db);
      let billsToDelete = 0;
      billsSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.date !== currentDate) {
          billBatch.delete(d.ref);
          billsToDelete++;
        }
      });
      if (billsToDelete > 0) {
        await billBatch.commit();
      }

      // 2. Purge past stock
      const stockSnap = await getDocs(collection(db, 'daily_stock'));
      const stockBatch = writeBatch(db);
      let stockToDelete = 0;
      stockSnap.docs.forEach((d) => {
        if (d.id !== currentDate) {
          stockBatch.delete(d.ref);
          stockToDelete++;
        }
      });
      if (stockToDelete > 0) {
        await stockBatch.commit();
      }

      // 3. Purge past prices
      const priceSnap = await getDocs(collection(db, 'daily_prices'));
      const priceBatch = writeBatch(db);
      let pricesToDelete = 0;
      priceSnap.docs.forEach((d) => {
        if (d.id !== currentDate) {
          priceBatch.delete(d.ref);
          pricesToDelete++;
        }
      });
      if (pricesToDelete > 0) {
        await priceBatch.commit();
      }

      // 4. Purge past notifications
      const notifSnap = await getDocs(collection(db, 'notifications'));
      const notifBatch = writeBatch(db);
      let notifsToDelete = 0;
      notifSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.date !== currentDate) {
          notifBatch.delete(d.ref);
          notifsToDelete++;
        }
      });
      if (notifsToDelete > 0) {
        await notifBatch.commit();
      }
    } catch (err) {
      console.warn('Could not complete past days Firestore purge (offline or network):', err);
    }
  },

  /**
   * Completely clears ALL data from Firestore (Hard Reset / Fresh Start)
   */
  async clearAllDatabaseData(): Promise<void> {
    try {
      // Delete all bills
      const billsSnap = await getDocs(collection(db, 'bills'));
      const bBatch = writeBatch(db);
      billsSnap.docs.forEach((d) => bBatch.delete(d.ref));
      if (billsSnap.docs.length > 0) await bBatch.commit();

      // Delete all stock
      const stockSnap = await getDocs(collection(db, 'daily_stock'));
      const sBatch = writeBatch(db);
      stockSnap.docs.forEach((d) => sBatch.delete(d.ref));
      if (stockSnap.docs.length > 0) await sBatch.commit();

      // Delete all prices
      const priceSnap = await getDocs(collection(db, 'daily_prices'));
      const pBatch = writeBatch(db);
      priceSnap.docs.forEach((d) => pBatch.delete(d.ref));
      if (priceSnap.docs.length > 0) await pBatch.commit();

      // Delete all notifications
      const notifSnap = await getDocs(collection(db, 'notifications'));
      const nBatch = writeBatch(db);
      notifSnap.docs.forEach((d) => nBatch.delete(d.ref));
      if (notifSnap.docs.length > 0) await nBatch.commit();
    } catch (err) {
      console.warn('Could not completely clear all remote data:', err);
    }
  },
};
