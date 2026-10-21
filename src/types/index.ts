export type UserRole = 'owner' | 'employee' | null;

export interface DailyPrice {
  date: string; // YYYY-MM-DD
  pricePerEgg: number;
  pricePer30Eggs: number;
  purchaseCost: number;
  updatedAt: string;
}

export interface StockImportEntry {
  id: string;
  trays: number;
  eggs: number;
  timestamp: string;
  timeStr: string;
  mode: 'add' | 'set';
  previousRemainingTrays: number;
  newRemainingTrays: number;
  purchasePricePer30?: number;
  note?: string;
}

export interface DailyStock {
  date: string; // YYYY-MM-DD
  openingStock: number;
  importedStock: number;
  eggsSold: number;
  remainingStock: number;
  purchaseCost: number;
  updatedAt: string;
  importHistory?: StockImportEntry[];
}

export interface BillDeleteRequest {
  status: 'pending' | 'rejected';
  requestedAt: string; // ISO
  requestedBy: string;
  reason?: string;
}

export interface Bill {
  billId: string;
  billNumber: number;
  employeeId: string;
  employeeName: string;
  customerName?: string;
  customerPhone?: string;
  paymentStatus?: 'paid';
  paidAmount?: number;
  pendingAmount?: number;
  date: string; // YYYY-MM-DD
  time: string; // 12:30 PM
  createdAt: string; // ISO
  eggQuantity: number;
  pricePerEgg: number;
  pricePer30Eggs: number;
  totalAmount: number;
  purchaseCostPerEgg: number;
  profit: number;
  syncStatus: 'synced' | 'pending';
  deleteRequest?: BillDeleteRequest;
}

export interface BillNotification {
  notificationId: string;
  billId: string;
  billNumber: number;
  employeeName: string;
  eggQuantity: number;
  totalAmount: number;
  date: string;
  time: string;
  read: boolean;
  createdAt: string;
  type?: 'new_bill' | 'delete_request' | 'delete_approved' | 'delete_rejected';
  reason?: string;
}

export interface AgencySettings {
  agencyName: string;
  ownerPin: string;
  employeePin: string;
  phone: string;
  address: string;
  upiId?: string;
}

export interface PrinterDevice {
  connected: boolean;
  name: string;
  paperWidth: '58mm' | '80mm';
  autoPrintOnBill: boolean;
}

export interface ShopkeeperContact {
  id: string;
  name: string;
  phone: string;
  updatedAt: string;
}

