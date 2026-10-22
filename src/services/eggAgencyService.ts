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
import { Bill, DailyPrice, DailyStock, StockImportEntry, BillNotification, AgencySettings } from '../types';
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
  restoreLocalStock,
  deleteLocalBill,
  getLocalSettings,
  setLocalSettings,
  getLocalNotifications,
  addLocalNotification,
  purgeOldDaysLocalData,
  clearAllTodayLocalData,
  isOlderThanDays,
  getSharedStockChannel,
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

    // Everyday restarts with 0 price until owner sets today's 1 Tara (30 eggs) price
    const defaultPrice: DailyPrice = {
      date,
      pricePerEgg: 0,
      pricePer30Eggs: 0,
      purchaseCost: 0,
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

    // Everyday restarts with 0 stock until owner imports/adds today's stock
    const defaultStock: DailyStock = {
      date,
      openingStock: 0,
      importedStock: 0,
      eggsSold: 0,
      remainingStock: 0,
      purchaseCost: 0,
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
        const remoteData = snapshot.data() as DailyStock;
        const local = getLocalDailyStock(date);
        
        // Prevent stale remote reads from wiping out fresher local additions
        const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        const remoteTime = remoteData.updatedAt ? new Date(remoteData.updatedAt).getTime() : 0;

        if (!local || remoteTime >= localTime || (remoteData.remainingStock || 0) >= (local.remainingStock || 0)) {
          setLocalDailyStock(remoteData);
          return remoteData;
        } else {
          // Local is fresher, re-sync local to remote
          setDoc(docRef, local, { merge: true }).catch(() => {});
          return local;
        }
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
   * Adds stock cumulatively to today's inventory.
   * If mode === 'add': adds incoming trays to existing stock (e.g. 10 + 10 = 20 trays).
   * Records an audit entry in importHistory so the owner can review all deliveries.
   */
  async addStockToToday(params: {
    date?: string;
    trays: number;
    baseStock?: DailyStock | null;
    purchaseCostPer30?: number;
    mode?: 'add' | 'set';
    note?: string;
  }): Promise<DailyStock> {
    const date = params.date || getTodayDateString();

    const localStock = getLocalDailyStock(date);
    let remoteStock: DailyStock | null = null;
    try {
      const snap = await getDoc(doc(db, 'daily_stock', date));
      if (snap.exists()) {
        remoteStock = snap.data() as DailyStock;
      }
    } catch {
      // offline fallback
    }

    // Determine current baseline stock:
    // Gather all candidate stocks for this date
    const candidates = [params.baseStock, localStock, remoteStock].filter(
      (s): s is DailyStock => Boolean(s && s.date === date)
    );

    let currentStock: DailyStock = {
      date,
      openingStock: 0,
      importedStock: 0,
      eggsSold: 0,
      remainingStock: 0,
      purchaseCost: 0,
      updatedAt: new Date().toISOString(),
    };

    if (candidates.length > 0) {
      // Pick the candidate with newest timestamp
      candidates.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
      currentStock = { ...candidates[0] };

      // Ensure we don't accidentally drop the highest available remaining stock or opening stock
      for (const c of candidates) {
        if ((c.remainingStock || 0) > (currentStock.remainingStock || 0)) {
          currentStock.remainingStock = c.remainingStock;
        }
        if ((c.openingStock || 0) > (currentStock.openingStock || 0)) {
          currentStock.openingStock = c.openingStock;
        }
      }
    }

    const trays = Math.max(0, params.trays);
    const eggsFromInput = Math.round(trays * 30);

    // Resolve previous metrics accurately:
    // If remainingStock is 0 but openingStock was present, respect openingStock
    const prevRemaining = Math.max(
      0,
      currentStock.remainingStock !== undefined && currentStock.remainingStock !== null
        ? currentStock.remainingStock
        : (currentStock.openingStock || 0)
    );
    const prevOpening = Math.max(0, currentStock.openingStock ?? prevRemaining);
    const prevImported = Math.max(0, currentStock.importedStock ?? prevOpening);
    const prevEggsSold = Math.max(0, currentStock.eggsSold || 0);
    const prevImportHistory = currentStock.importHistory || [];

    // Strictly cumulative addition: e.g. 10 trays (300 eggs) + 10 trays (300 eggs) = 20 trays (600 eggs)
    const newRemainingStock = prevRemaining + eggsFromInput;
    const newOpeningStock = prevOpening + eggsFromInput;
    const newImportedStock = prevImported + eggsFromInput;

    const calculatedCostPerEgg =
      params.purchaseCostPer30 && params.purchaseCostPer30 > 0
        ? parseFloat((params.purchaseCostPer30 / 30).toFixed(2))
        : currentStock.purchaseCost;

    const newEntry: StockImportEntry = {
      id: `imp_${date}_${Date.now()}`,
      trays,
      eggs: eggsFromInput,
      timestamp: new Date().toISOString(),
      timeStr: formatTime(new Date()),
      mode: 'add',
      previousRemainingTrays: Math.floor(prevRemaining / 30),
      newRemainingTrays: Math.floor(newRemainingStock / 30),
      purchasePricePer30: params.purchaseCostPer30,
      note: params.note,
    };

    const updatedStock: DailyStock = {
      date,
      openingStock: newOpeningStock,
      importedStock: newImportedStock,
      eggsSold: prevEggsSold,
      remainingStock: newRemainingStock,
      purchaseCost: calculatedCostPerEgg,
      updatedAt: new Date().toISOString(),
      importHistory: [...prevImportHistory, newEntry],
    };

    await this.saveTodayStock(updatedStock);

    if (calculatedCostPerEgg > 0) {
      const todayPriceDoc = await this.getTodayPrice(date);
      if (todayPriceDoc) {
        await this.saveTodayPrice({
          ...todayPriceDoc,
          purchaseCost: calculatedCostPerEgg,
        });
      }
    }

    return updatedStock;
  },

  /**
   * Create Bill with stock protection, offline-first execution, and real-time syncing
   */
  async createBill(params: {
    eggQuantity: number;
    employeeId?: string;
    employeeName?: string;
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: 'cash' | 'gpay' | 'credit';
    paymentStatus?: 'paid' | 'pending';
    paidAmount?: number;
    pendingAmount?: number;
    date?: string;
    customTotalAmount?: number;
    customPricePer30Eggs?: number;
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
    const pricePer30Eggs =
      params.customPricePer30Eggs !== undefined && !isNaN(params.customPricePer30Eggs) && params.customPricePer30Eggs > 0
        ? params.customPricePer30Eggs
        : activePrice.pricePer30Eggs;
    const pricePerEgg = parseFloat((pricePer30Eggs / 30).toFixed(2));
    const purchaseCostPerEgg = activePrice.purchaseCost;

    // Pricing calculation:
    // If employee provided customTotalAmount (amount edited on screen), honor it directly!
    let totalAmount = 0;
    if (params.customTotalAmount !== undefined && !isNaN(params.customTotalAmount) && params.customTotalAmount >= 0) {
      totalAmount = Math.round(params.customTotalAmount);
    } else if (eggQuantity >= 30 && pricePer30Eggs > 0) {
      const trays = Math.floor(eggQuantity / 30);
      const loose = eggQuantity % 30;
      totalAmount = trays * pricePer30Eggs + loose * pricePerEgg;
    } else {
      totalAmount = eggQuantity * pricePerEgg;
    }

    // Round to nearest integer (e.g. 1.45 -> 1, 1.65 -> 2)
    totalAmount = Math.round(totalAmount);

    const costOfEggsSold = eggQuantity * purchaseCostPerEgg;
    const profit = Math.max(0, totalAmount - costOfEggsSold);

    const billNumber = getNextBillNumber(date);
    const billId = `bill_${date}_${billNumber}_${Date.now()}`;
    const currentTimeStr = formatTime(new Date());

    const paymentMethod: 'cash' | 'gpay' | 'credit' = params.paymentMethod || 'cash';
    const isCredit = paymentMethod === 'credit';
    const paymentStatus: 'paid' | 'pending' = isCredit ? 'pending' : (params.paymentStatus || 'paid');
    const paidAmount = isCredit ? 0 : (params.paidAmount !== undefined ? params.paidAmount : totalAmount);
    const pendingAmount = isCredit ? totalAmount : (params.pendingAmount !== undefined ? params.pendingAmount : 0);

    const newBill: Bill = {
      billId,
      billNumber,
      employeeId: params.employeeId || 'emp_01',
      employeeName: params.employeeName || 'Staff Ramesh',
      customerName: params.customerName || undefined,
      customerPhone: params.customerPhone || undefined,
      paymentMethod,
      paymentStatus,
      paidAmount,
      pendingAmount,
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
        paymentMethod,
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
        paymentMethod,
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
   * Request bill deletion by employee (sent to Owner for approval)
   */
  async requestBillDelete(
    billId: string,
    employeeName: string,
    reason: string = '',
    billObj?: Bill
  ): Promise<Bill | null> {
    const bills = getLocalBills();
    let bill = bills.find((b) => b.billId === billId);
    if (!bill && billObj) {
      bill = billObj;
    }
    if (!bill) {
      try {
        const snap = await getDoc(doc(db, 'bills', billId));
        if (snap.exists()) {
          bill = snap.data() as Bill;
        }
      } catch (err) {
        console.warn('Could not fetch bill from Firestore:', err);
      }
    }
    if (!bill) return null;

    const updatedBill: Bill = {
      ...bill,
      deleteRequest: {
        status: 'pending',
        requestedAt: new Date().toISOString(),
        requestedBy: employeeName,
        reason: reason.trim() || 'Staff requested deletion',
      },
    };

    saveLocalBill(updatedBill);

    // Save to Firestore and create notification for Owner
    try {
      await setDoc(doc(db, 'bills', billId), updatedBill, { merge: true });

      // Save to dedicated delete_requests collection so Owner receives it in real-time
      await setDoc(doc(db, 'delete_requests', billId), {
        billId,
        bill: updatedBill,
        status: 'pending',
        requestedBy: employeeName,
        requestedAt: new Date().toISOString(),
        date: bill.date,
      });

      const notifId = `del_req_${billId}_${Date.now()}`;
      const notif: BillNotification = {
        notificationId: notifId,
        billId,
        billNumber: bill.billNumber,
        employeeName,
        eggQuantity: bill.eggQuantity,
        totalAmount: bill.totalAmount,
        date: bill.date,
        time: formatTime(new Date()),
        read: false,
        createdAt: new Date().toISOString(),
        type: 'delete_request',
        reason: reason.trim() || 'Staff requested deletion',
      };
      await setDoc(doc(db, 'notifications', notifId), notif);
      addLocalNotification(notif);
    } catch (err) {
      console.warn('Could not sync delete request immediately to cloud:', err);
    }

    return updatedBill;
  },

  /**
   * Owner approves bill deletion - permanently deletes bill and restores stock
   */
  async approveBillDelete(bill: Bill, restoreInventory: boolean = true): Promise<boolean> {
    try {
      // 1. Delete locally
      deleteLocalBill(bill.billId);

      // 2. Restore local stock if requested
      if (restoreInventory && bill.eggQuantity > 0) {
        const updatedStock = restoreLocalStock(bill.date, bill.eggQuantity);
        if (updatedStock) {
          try {
            await setDoc(doc(db, 'daily_stock', bill.date), updatedStock, { merge: true });
          } catch {}
        }
      }

      // 3. Delete from Firestore bills & delete_requests
      await deleteDoc(doc(db, 'bills', bill.billId));
      try {
        await deleteDoc(doc(db, 'delete_requests', bill.billId));
      } catch {}

      // 4. Create notification that delete was approved
      const notifId = `del_app_${bill.billId}_${Date.now()}`;
      const notif: BillNotification = {
        notificationId: notifId,
        billId: bill.billId,
        billNumber: bill.billNumber,
        employeeName: bill.employeeName,
        eggQuantity: bill.eggQuantity,
        totalAmount: bill.totalAmount,
        date: bill.date,
        time: formatTime(new Date()),
        read: false,
        createdAt: new Date().toISOString(),
        type: 'delete_approved',
      };
      try {
        await setDoc(doc(db, 'notifications', notifId), notif);
      } catch {}
      addLocalNotification(notif);

      return true;
    } catch (err) {
      console.error('Failed to delete bill:', err);
      // Still remove locally
      deleteLocalBill(bill.billId);
      if (restoreInventory && bill.eggQuantity > 0) {
        restoreLocalStock(bill.date, bill.eggQuantity);
      }
      return true;
    }
  },

  /**
   * Owner rejects bill delete request
   */
  async rejectBillDelete(bill: Bill, ownerComment?: string): Promise<boolean> {
    try {
      const updatedBill: Bill = {
        ...bill,
        deleteRequest: {
          status: 'rejected',
          requestedAt: bill.deleteRequest?.requestedAt || new Date().toISOString(),
          requestedBy: bill.deleteRequest?.requestedBy || 'Staff',
          reason: ownerComment ? `Rejected: ${ownerComment}` : (bill.deleteRequest?.reason || 'Rejected by owner'),
        },
      };

      saveLocalBill(updatedBill);

      await setDoc(doc(db, 'bills', bill.billId), updatedBill, { merge: true });
      try {
        await deleteDoc(doc(db, 'delete_requests', bill.billId));
      } catch {}
      return true;
    } catch (err) {
      console.warn('Failed to reject delete request:', err);
      return false;
    }
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
          snapshot.forEach((d) => {
            const b = d.data() as Bill;
            remoteBills.push(b);
            saveLocalBill(b);
          });
          
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

  /**
   * Real-time subscription to all pending delete requests across the system
   */
  subscribeToPendingDeleteRequests(onUpdate: (bills: Bill[]) => void): () => void {
    // 1. Initial emission from local storage
    const emitLocal = () => {
      const local = getLocalBills().filter((b) => b.deleteRequest?.status === 'pending');
      onUpdate(local);
    };
    emitLocal();

    try {
      // 2. Real-time Firestore listener on delete_requests collection
      const unsubscribe = onSnapshot(
        collection(db, 'delete_requests'),
        (snapshot) => {
          const list: Bill[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (data.status === 'pending' && data.bill) {
              list.push(data.bill as Bill);
            }
          });

          // Merge any pending delete requests from local storage
          const local = getLocalBills().filter((b) => b.deleteRequest?.status === 'pending');
          for (const l of local) {
            if (!list.some((item) => item.billId === l.billId)) {
              list.push(l);
            }
          }

          list.sort((a, b) => (b.billNumber || 0) - (a.billNumber || 0));
          onUpdate(list);
        },
        (error) => {
          console.warn('Delete requests snapshot notice (offline fallback active):', error);
          emitLocal();
        }
      );

      return unsubscribe;
    } catch {
      return () => {};
    }
  },

  subscribeToStock(date: string, onUpdate: (stock: DailyStock | null) => void): () => void {
    const local = getLocalDailyStock(date);
    if (local) {
      onUpdate(local);
    }

    let unsubSnapshot = () => {};
    try {
      const docRef = doc(db, 'daily_stock', date);
      unsubSnapshot = onSnapshot(
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
    } catch {
      // offline fallback
    }

    // Multi-channel instant local sync across tabs/windows
    const onCustomEvent = (e: any) => {
      if (e.detail && e.detail.date === date) {
        onUpdate(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('sss_stock_changed', onCustomEvent);
    }

    const onStorageEvent = (e: StorageEvent) => {
      if (e.key === `sss_stock_${date}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          onUpdate(parsed);
        } catch {}
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorageEvent);
    }

    const sharedBc = getSharedStockChannel();
    const bcHandler = (event: MessageEvent) => {
      if (event.data?.type === 'STOCK_UPDATED' && event.data?.stock?.date === date) {
        onUpdate(event.data.stock);
      }
    };
    if (sharedBc) {
      sharedBc.addEventListener('message', bcHandler);
    }

    // Active polling fallback every 2.5s to ensure remote changes sync even if WebSocket stalls
    const pollInterval = setInterval(() => {
      this.fetchRemoteStock(date).then((remote) => {
        if (remote) {
          onUpdate(remote);
        }
      }).catch(() => {});
    }, 2500);

    const onFocusOrVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        this.fetchRemoteStock(date).then((remote) => {
          if (remote) onUpdate(remote);
        }).catch(() => {});
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocusOrVisible);
      document.addEventListener('visibilitychange', onFocusOrVisible);
    }

    return () => {
      unsubSnapshot();
      clearInterval(pollInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('sss_stock_changed', onCustomEvent);
        window.removeEventListener('storage', onStorageEvent);
        window.removeEventListener('focus', onFocusOrVisible);
        document.removeEventListener('visibilitychange', onFocusOrVisible);
      }
      if (sharedBc) {
        sharedBc.removeEventListener('message', bcHandler);
      }
    };
  },

  subscribeToPrice(date: string, onUpdate: (price: DailyPrice | null) => void): () => void {
    const local = getLocalDailyPrice(date);
    if (local) onUpdate(local);

    let unsubSnapshot = () => {};
    try {
      const docRef = doc(db, 'daily_prices', date);
      unsubSnapshot = onSnapshot(
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
    } catch {
      // offline fallback
    }

    const onCustomEvent = (e: any) => {
      if (e.detail && e.detail.date === date) {
        onUpdate(e.detail);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('sss_price_changed', onCustomEvent);
    }

    const onStorageEvent = (e: StorageEvent) => {
      if (e.key === `sss_price_${date}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          onUpdate(parsed);
        } catch {}
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorageEvent);
    }

    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel('sss_sync_channel');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'PRICE_UPDATED' && event.data?.price?.date === date) {
            onUpdate(event.data.price);
          }
        };
      }
    } catch {}

    const pollInterval = setInterval(() => {
      this.fetchRemotePrice(date).then((remote) => {
        if (remote) {
          onUpdate(remote);
        }
      }).catch(() => {});
    }, 3000);

    return () => {
      unsubSnapshot();
      clearInterval(pollInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('sss_price_changed', onCustomEvent);
        window.removeEventListener('storage', onStorageEvent);
      }
      if (broadcastChannel) {
        try {
          broadcastChannel.close();
        } catch {}
      }
    };
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
   * Cleans up data older than 3 days from Firestore (bills, stock, price, notifications).
   * Retains the last 3 days of operational records (today, yesterday, day before yesterday).
   */
  async purgePastDaysData(currentDate: string = getTodayDateString()): Promise<void> {
    try {
      // 1. Purge bills older than 3 days
      const billsSnap = await getDocs(collection(db, 'bills'));
      const billBatch = writeBatch(db);
      let billsToDelete = 0;
      billsSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.date && isOlderThanDays(data.date, 3, currentDate)) {
          billBatch.delete(d.ref);
          billsToDelete++;
        }
      });
      if (billsToDelete > 0) {
        await billBatch.commit();
      }

      // 2. Purge stock older than 3 days
      const stockSnap = await getDocs(collection(db, 'daily_stock'));
      const stockBatch = writeBatch(db);
      let stockToDelete = 0;
      stockSnap.docs.forEach((d) => {
        if (isOlderThanDays(d.id, 3, currentDate)) {
          stockBatch.delete(d.ref);
          stockToDelete++;
        }
      });
      if (stockToDelete > 0) {
        await stockBatch.commit();
      }

      // 3. Purge prices older than 3 days
      const priceSnap = await getDocs(collection(db, 'daily_prices'));
      const priceBatch = writeBatch(db);
      let pricesToDelete = 0;
      priceSnap.docs.forEach((d) => {
        if (isOlderThanDays(d.id, 3, currentDate)) {
          priceBatch.delete(d.ref);
          pricesToDelete++;
        }
      });
      if (pricesToDelete > 0) {
        await priceBatch.commit();
      }

      // 4. Purge notifications older than 3 days
      const notifSnap = await getDocs(collection(db, 'notifications'));
      const notifBatch = writeBatch(db);
      let notifsToDelete = 0;
      notifSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.date && isOlderThanDays(data.date, 3, currentDate)) {
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
   * Daily Restart Procedure:
   * 1. Cleans up all previous days' operational records from local phone memory.
   * 2. Purges past days' operational records from the Firestore database.
   * 3. Initializes today's clean pricing and fresh stock starting from 0 eggs sold.
   * 4. Ensures today's bills begin fresh at Bill #1001.
   */
  async restartDay(currentDate: string = getTodayDateString()): Promise<void> {
    // 1. Purge phone local storage
    purgeOldDaysLocalData(currentDate);

    // 2. Purge Firestore database in background
    await this.purgePastDaysData(currentDate);

    // 3. Ensure today's fresh price is initialized in both DB and local phone
    const todayPrice = await this.getTodayPrice(currentDate);
    await this.saveTodayPrice(todayPrice);

    // 4. Ensure today's fresh stock is initialized in both DB and local phone
    const todayStock = await this.getTodayStock(currentDate);
    await this.saveTodayStock(todayStock);
  },

  /**
   * Manual Day Restart & Data Wipe:
   * Completely clears today's transactions from both the Firestore database and the phone,
   * resetting today's sales, eggs sold, profit, bills, and notifications to 0,
   * and resetting the next bill number to #1001.
   */
  async clearTodayDataAndRestart(currentDate: string = getTodayDateString()): Promise<void> {
    // 1. Clear today from local phone storage
    clearAllTodayLocalData(currentDate);

    // 2. Clear today's bills & notifications from Firestore
    try {
      const billsSnap = await getDocs(query(collection(db, 'bills'), where('date', '==', currentDate)));
      const bBatch = writeBatch(db);
      billsSnap.docs.forEach((d) => bBatch.delete(d.ref));
      if (billsSnap.docs.length > 0) await bBatch.commit();

      const notifSnap = await getDocs(query(collection(db, 'notifications'), where('date', '==', currentDate)));
      const nBatch = writeBatch(db);
      notifSnap.docs.forEach((d) => nBatch.delete(d.ref));
      if (notifSnap.docs.length > 0) await nBatch.commit();
    } catch (err) {
      console.warn('Could not clear today remote records:', err);
    }

    // 3. Re-initialize today's stock to 0 (clean slate)
    const freshStock: DailyStock = {
      date: currentDate,
      openingStock: 0,
      importedStock: 0,
      eggsSold: 0,
      remainingStock: 0,
      purchaseCost: 0,
      updatedAt: new Date().toISOString(),
    };
    await this.saveTodayStock(freshStock);

    // 4. Re-initialize today's price to 0 (clean slate)
    const freshPrice: DailyPrice = {
      date: currentDate,
      pricePerEgg: 0,
      pricePer30Eggs: 0,
      purchaseCost: 0,
      updatedAt: new Date().toISOString(),
    };
    await this.saveTodayPrice(freshPrice);
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
