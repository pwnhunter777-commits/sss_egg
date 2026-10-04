export type Language = 'en' | 'ta';

export interface Translations {
  // Common
  agencyNameDefault: string;
  appName: string;
  english: string;
  tamil: string;
  save: string;
  cancel: string;
  done: string;
  close: string;
  confirm: string;
  clear: string;
  delete: string;
  edit: string;
  update: string;
  status: string;
  online: string;
  offline: string;
  synced: string;
  pending: string;
  search: string;
  loading: string;
  success: string;
  error: string;
  logout: string;
  eggs: string;
  egg: string;
  perEgg: string;
  tray: string;
  trays: string;
  loose: string;
  items: string;
  total: string;
  netTotal: string;

  // Login
  owner: string;
  employee: string;
  ownerLogin: string;
  employeeLogin: string;
  enterPin: string;
  enterOwnerPin: string;
  enterEmployeePin: string;
  incorrectPin: string;
  pinHint: string;

  // Employee Dashboard
  billing: string;
  billHistory: string;
  todayPrice: string;
  inStock: string;
  remainingStock: string;
  enterEggQty: string;
  eggQuantity: string;
  totalAmount: string;
  createAndPrint: string;
  confirmAndPrint: string;
  generatingBill: string;
  quickQuantities: string;
  tapToSet: string;
  insufficientStock: string;
  pleaseEnterQty: string;
  reprint: string;
  noBillsFound: string;
  noBillsRecordedYet: string;
  searchHistoryPlaceholder: string;
  autoSyncActive: string;
  pendingSync: string;

  // Owner Dashboard
  ownerPortal: string;
  overview: string;
  allBills: string;
  deleteRequests: string;
  reviewDeleteRequestsTitle: string;
  noPendingDeleteRequests: string;
  allClearDesc: string;
  pendingRequests: string;
  requestedBy: string;
  settings: string;
  printerSetup: string;
  todaySales: string;
  eggsSold: string;
  totalBills: string;
  profit: string;
  totalAmountSold: string;
  stockValue: string;
  setPrice: string;
  importStock: string;
  addStock: string;
  manageSettings: string;
  searchBillsPlaceholder: string;
  billDetails: string;
  staff: string;
  date: string;
  time: string;
  billNo: string;

  // Modals & Forms
  // Price Modal
  setDailyPriceTitle: string;
  pricePerEggLabel: string;
  pricePer30Label: string;
  purchaseCostLabel: string;
  saveAndLockPrice: string;
  priceUpdatedSuccess: string;
  
  // Stock Modal
  stockImportTitle: string;
  currentStockLabel: string;
  addQuantityLabel: string;
  newTotalStockLabel: string;
  saveStockButton: string;
  stockUpdatedSuccess: string;

  // Settings Modal
  agencySettingsTitle: string;
  agencyNameLabel: string;
  phoneLabel: string;
  addressLabel: string;
  ownerPinLabel: string;
  employeePinLabel: string;
  settingsSavedSuccess: string;

  // Printer Modal
  printerModalTitle: string;
  printerConnected: string;
  printerDisconnected: string;
  connectBtPrinter: string;
  connectingBt: string;
  paperWidthLabel: string;
  autoPrintLabel: string;
  testPrintButton: string;
  testPrintSuccess: string;

  // Receipt Preview
  receiptPreview: string;
  printBill: string;
  printing: string;
  savingAndPrinting: string;
  printSuccessMsg: string;

  // Delete Request
  deleteBill: string;
  requestDelete: string;
  deleteRequested: string;
  requestDeleteTitle: string;
  requestDeleteDesc: string;
  deleteReasonLabel: string;
  deleteReasonPlaceholder: string;
  sendDeleteRequest: string;
  deleteRequestSent: string;
  pendingOwnerApproval: string;
  approveAndDelete: string;
  rejectRequest: string;
  deleteRequestApproved: string;
  deleteRequestRejected: string;
  deleteBillPermanently: string;
  deleteBillConfirmDesc: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    agencyNameDefault: 'SSS EGG AGENCY',
    appName: 'SSS Egg Agency',
    english: 'English',
    tamil: 'தமிழ்',
    save: 'Save',
    cancel: 'Cancel',
    done: 'Done',
    close: 'Close',
    confirm: 'Confirm',
    clear: 'CLEAR',
    delete: 'Delete',
    edit: 'Edit',
    update: 'Update',
    status: 'Status',
    online: 'Online',
    offline: 'Offline',
    synced: 'Synced',
    pending: 'Pending Sync',
    search: 'Search',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    logout: 'Log Out',
    eggs: 'Eggs',
    egg: 'egg',
    perEgg: '/ egg',
    tray: 'Tray',
    trays: 'Trays',
    loose: 'loose',
    items: 'ITEM',
    total: 'TOTAL',
    netTotal: 'NET TOTAL:',

    // Login
    owner: 'OWNER',
    employee: 'STAFF',
    ownerLogin: 'Owner Login',
    employeeLogin: 'Staff Login',
    enterPin: 'ENTER 4-DIGIT PIN',
    enterOwnerPin: 'Enter Owner PIN (Default: 8888)',
    enterEmployeePin: 'Enter Staff PIN (Default: 1234)',
    incorrectPin: 'Incorrect PIN! Please try again.',
    pinHint: 'Tap 4-digit PIN to access system',

    // Employee Dashboard
    billing: 'BILLING',
    billHistory: 'HISTORY',
    todayPrice: "Today's Price",
    inStock: 'In Stock',
    remainingStock: 'Remaining Stock',
    enterEggQty: 'ENTER EGG QUANTITY',
    eggQuantity: 'Egg Quantity',
    totalAmount: 'TOTAL AMOUNT',
    createAndPrint: 'Create & Print Bill',
    confirmAndPrint: 'Confirm & Print Bill',
    generatingBill: 'Generating Bill...',
    quickQuantities: 'Quick Quantities (Tap to set)',
    tapToSet: 'Tap to set',
    insufficientStock: 'Insufficient stock! Only {stock} eggs available.',
    pleaseEnterQty: 'Please enter egg quantity',
    reprint: 'Reprint',
    noBillsFound: 'No bills found matching your search',
    noBillsRecordedYet: 'No bills recorded yet for today.',
    searchHistoryPlaceholder: 'Search by bill #, time, eggs...',
    autoSyncActive: 'Live Cloud Sync Active',
    pendingSync: 'Offline Bills Waiting for Network',

    // Owner Dashboard
    ownerPortal: 'OWNER PORTAL',
    overview: 'Overview',
    allBills: 'All Bills',
    deleteRequests: 'Delete Requests',
    reviewDeleteRequestsTitle: 'Revise Delete Requests from Staff',
    noPendingDeleteRequests: 'No pending delete requests',
    allClearDesc: 'All bills created by staff are intact and in order.',
    pendingRequests: 'Pending Requests',
    requestedBy: 'Requested by',
    settings: 'Settings',
    printerSetup: 'Printer Setup',
    todaySales: "TODAY'S SALES",
    eggsSold: 'EGGS SOLD',
    totalBills: 'TOTAL BILLS',
    profit: 'PROFIT',
    totalAmountSold: 'Total Sold Amount',
    stockValue: 'Stock Worth',
    setPrice: 'Today Price',
    importStock: 'Import Stock',
    addStock: 'Add Stock',
    manageSettings: 'Agency Settings',
    searchBillsPlaceholder: 'Search by Bill Number, Time, or Eggs...',
    billDetails: 'Bill Details',
    staff: 'Staff',
    date: 'Date',
    time: 'Time',
    billNo: 'Bill No',

    // Modals & Forms
    setDailyPriceTitle: "Set Today's Selling Price",
    pricePerEggLabel: 'Price per Egg (₹)',
    pricePer30Label: 'Price for 30 Eggs / 1 Tara (Tray) (₹)',
    purchaseCostLabel: 'Purchase Cost for 30 Eggs / 1 Tara (Tray) (₹)',
    saveAndLockPrice: 'Save & Lock Today Price',
    priceUpdatedSuccess: 'Price updated and locked for today!',

    stockImportTitle: 'Daily Stock Import / Entry',
    currentStockLabel: 'Current Remaining Stock',
    addQuantityLabel: 'Add Stock Quantity (Eggs)',
    newTotalStockLabel: 'New Total In-Stock',
    saveStockButton: 'Save Stock & Update',
    stockUpdatedSuccess: 'Stock successfully added and updated!',

    agencySettingsTitle: 'Agency & System Settings',
    agencyNameLabel: 'Agency / Business Name',
    phoneLabel: 'Shop Phone Number',
    addressLabel: 'Store Address (Printed on bill)',
    ownerPinLabel: 'Owner PIN (4 digits)',
    employeePinLabel: 'Employee PIN (4 digits)',
    settingsSavedSuccess: 'Settings updated successfully!',

    printerModalTitle: 'Thermal Printer Setup',
    printerConnected: 'Bluetooth: Connected',
    printerDisconnected: 'Bluetooth: Ready / Browser Print',
    connectBtPrinter: 'Pair Bluetooth Thermal Printer',
    connectingBt: 'Connecting to Bluetooth Printer...',
    paperWidthLabel: 'Paper Roll Width',
    autoPrintLabel: 'Auto-Print on Bill Creation',
    testPrintButton: 'Print Test Slip',
    testPrintSuccess: 'Test slip sent to thermal printer!',

    receiptPreview: 'Receipt Preview',
    printBill: 'Print Bill',
    printing: 'Printing...',
    savingAndPrinting: 'Saving & Printing...',
    printSuccessMsg: 'Receipt print command sent successfully!',

    // Delete Request
    deleteBill: 'Delete Bill',
    requestDelete: 'Request Delete',
    deleteRequested: 'Delete Requested',
    requestDeleteTitle: 'Request Bill Deletion',
    requestDeleteDesc: 'Staff cannot delete bills directly. This request will be sent to the Owner for approval.',
    deleteReasonLabel: 'Reason for Deletion (Optional)',
    deleteReasonPlaceholder: 'e.g., Customer returned eggs, wrong count entered',
    sendDeleteRequest: 'Send Request to Owner',
    deleteRequestSent: 'Delete request sent to Owner successfully. Awaiting approval.',
    pendingOwnerApproval: 'Pending Owner Approval',
    approveAndDelete: 'Approve & Delete',
    rejectRequest: 'Reject Request',
    deleteRequestApproved: 'Bill deleted and eggs returned to stock',
    deleteRequestRejected: 'Delete request was rejected by Owner',
    deleteBillPermanently: 'Delete Bill Permanently',
    deleteBillConfirmDesc: 'Are you sure you want to permanently delete this bill? Eggs will be returned to available stock.',
  },
  ta: {
    agencyNameDefault: 'SSS முட்டை ஏஜென்சி',
    appName: 'SSS முட்டை ஏஜென்சி',
    english: 'English',
    tamil: 'தமிழ்',
    save: 'சேமி',
    cancel: 'ரத்து',
    done: 'முடிந்தது',
    close: 'மூடு',
    confirm: 'உறுதி செய்',
    clear: 'அழி',
    delete: 'நீக்கு',
    edit: 'திருத்து',
    update: 'மாற்று',
    status: 'நிலை',
    online: 'ஆன்லைன்',
    offline: 'ஆஃப்லைன்',
    synced: 'ஒத்திசைக்கப்பட்டது',
    pending: 'ஒத்திசைக்க காத்திருக்கிறது',
    search: 'தேடுக',
    loading: 'ஏற்றப்படுகிறது...',
    success: 'வெற்றி',
    error: 'பிழை',
    logout: 'வெளியேறு',
    eggs: 'முட்டைகள்',
    egg: 'முட்டை',
    perEgg: '/ முட்டை',
    tray: 'தட்டு',
    trays: 'தட்டுகள்',
    loose: 'சில்லறை',
    items: 'விவரம்',
    total: 'மொத்தம்',
    netTotal: 'மொத்த தொகை:',

    // Login
    owner: 'உரிமையாளர்',
    employee: 'பணியாளர்',
    ownerLogin: 'உரிமையாளர் உள்நுழைவு',
    employeeLogin: 'பணியாளர் உள்நுழைவு',
    enterPin: '4-இலக்க பின் (PIN) எண்ணை உள்ளிடவும்',
    enterOwnerPin: 'உரிமையாளர் பின் எண் (பொது: 8888)',
    enterEmployeePin: 'பணியாளர் பின் எண் (பொது: 1234)',
    incorrectPin: 'தவறான பின் எண்! மீண்டும் முயற்சிக்கவும்.',
    pinHint: 'உள்நுழைய 4-இலக்க பின் எண்ணை அழுத்தவும்',

    // Employee Dashboard
    billing: 'பில் போடுதல்',
    billHistory: 'பில் வரலாறு',
    todayPrice: 'இன்றைய விலை',
    inStock: 'கையிருப்பு',
    remainingStock: 'மீதமுள்ள இருப்பு',
    enterEggQty: 'முட்டை எண்ணிக்கையை உள்ளிடவும்',
    eggQuantity: 'முட்டை எண்ணிக்கை',
    totalAmount: 'மொத்த தொகை',
    createAndPrint: 'பில் தயார் செய்து அச்சிடு',
    confirmAndPrint: 'உறுதி செய்து அச்சிடு',
    generatingBill: 'பில் தயாராகிறது...',
    quickQuantities: 'விரைவு அளவுகள் (தேர்வு செய்க)',
    tapToSet: 'தேர்வு செய்க',
    insufficientStock: 'இருப்பு போதாது! {stock} முட்டைகள் மட்டுமே உள்ளன.',
    pleaseEnterQty: 'முட்டை எண்ணிக்கையை உள்ளிடவும்',
    reprint: 'மறு அச்சு',
    noBillsFound: 'பில்கள் எதுவும் கிடைக்கவில்லை',
    noBillsRecordedYet: 'இன்று இதுவரை பில்கள் எதுவும் இல்லை.',
    searchHistoryPlaceholder: 'பில் எண், நேரம், எண்ணிக்கை மூலம் தேடுக...',
    autoSyncActive: 'கிளவுட் நேரலை இணைப்பு உள்ளது',
    pendingSync: 'இணையத்திற்காக காத்திருக்கும் பில்கள்',

    // Owner Dashboard
    ownerPortal: 'உரிமையாளர் தளம்',
    overview: 'முகப்பு',
    allBills: 'அனைத்து பில்கள்',
    deleteRequests: 'நீக்குதல் கோரிக்கைகள்',
    reviewDeleteRequestsTitle: 'பணியாளர் நீக்குதல் கோரிக்கைகள் ஆய்வு',
    noPendingDeleteRequests: 'நீக்குதல் கோரிக்கைகள் எதுவும் நிலுவையில் இல்லை',
    allClearDesc: 'பணியாளர்கள் உருவாக்கிய அனைத்து பில்களும் சரியாக உள்ளன.',
    pendingRequests: 'நிலுவை கோரிக்கைகள்',
    requestedBy: 'கோரியவர்',
    settings: 'அமைப்புகள்',
    printerSetup: 'பிரிண்டர் அமைவு',
    todaySales: 'இன்றைய விற்பனை',
    eggsSold: 'விற்ற முட்டைகள்',
    totalBills: 'மொத்த பில்கள்',
    profit: 'இன்றைய லாபம்',
    totalAmountSold: 'விற்ற மொத்த தொகை',
    stockValue: 'இருப்பு மதிப்பு',
    setPrice: 'விலை நிர்ணயம்',
    importStock: 'முட்டை வரவு',
    addStock: 'இருப்பு சேர்க்க',
    manageSettings: 'ஏஜென்சி அமைப்புகள்',
    searchBillsPlaceholder: 'பில் எண், நேரம், எண்ணிக்கை மூலம் தேடுக...',
    billDetails: 'பில் விவரம்',
    staff: 'பணியாளர்',
    date: 'தேதி',
    time: 'நேரம்',
    billNo: 'பில் எண்',

    // Modals & Forms
    setDailyPriceTitle: 'இன்றைய விற்பனை விலை நிர்ணயம்',
    pricePerEggLabel: 'ஒரு முட்டை விலை (₹)',
    pricePer30Label: '30 முட்டை விலை / 1 தாரா (தட்டு) (₹)',
    purchaseCostLabel: '30 முட்டை / 1 தாரா வாங்கிய அடக்க விலை (₹)',
    saveAndLockPrice: 'விலையை சேமித்து பூட்டுக',
    priceUpdatedSuccess: 'இன்றைய விலை வெற்றிகரமாக மாற்றப்பட்டது!',

    stockImportTitle: 'முட்டை வரவு / கையிருப்பு சேர்த்தல்',
    currentStockLabel: 'தற்போதைய கையிருப்பு',
    addQuantityLabel: 'புதிய வரவு முட்டைகள் எண்ணிக்கை',
    newTotalStockLabel: 'புதிய மொத்த கையிருப்பு',
    saveStockButton: 'இருப்பை சேமித்து புதுப்பி',
    stockUpdatedSuccess: 'முட்டை இருப்பு வெற்றிகரமாக சேர்க்கப்பட்டது!',

    agencySettingsTitle: 'ஏஜென்சி அமைப்புகள்',
    agencyNameLabel: 'ஏஜென்சி / கடை பெயர்',
    phoneLabel: 'தொலைபேசி எண்',
    addressLabel: 'கடை முகவரி (பில்லில் அச்சிடப்படும்)',
    ownerPinLabel: 'உரிமையாளர் பின் (4 இலக்கம்)',
    employeePinLabel: 'பணியாளர் பின் (4 இலக்கம்)',
    settingsSavedSuccess: 'அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன!',

    printerModalTitle: 'தெர்மல் பிரிண்டர் அமைப்புகள்',
    printerConnected: 'ப்ளூடூத்: இணைக்கப்பட்டுள்ளது',
    printerDisconnected: 'ப்ளூடூத்: தயாராக உள்ளது / உலாவி அச்சு',
    connectBtPrinter: 'ப்ளூடூத் பிரிண்டரை இணைக்கவும்',
    connectingBt: 'பிரிண்டருடன் இணைகிறது...',
    paperWidthLabel: 'பேப்பர் ரோல் அளவு',
    autoPrintLabel: 'பில் போடும்போது தானாக அச்சிடு',
    testPrintButton: 'சோதனை அச்சு செய்க',
    testPrintSuccess: 'சோதனை அச்சு அனுப்பப்பட்டது!',

    receiptPreview: 'ரசீது முன்னோட்டம்',
    printBill: 'பில் அச்சிடு',
    printing: 'அச்சிடப்படுகிறது...',
    savingAndPrinting: 'சேமித்து அச்சிடப்படுகிறது...',
    printSuccessMsg: 'பில் அச்சு வெற்றிகரமாக அனுப்பப்பட்டது!',

    // Delete Request
    deleteBill: 'பில் நீக்கு',
    requestDelete: 'நீக்குதல் கோரிக்கை',
    deleteRequested: 'நீக்குதல் கோரப்பட்டது',
    requestDeleteTitle: 'பில் நீக்க கோரிக்கை அனுப்பு',
    requestDeleteDesc: 'ஊழியர்கள் பில்களை நேரடியாக நீக்க முடியாது. இந்த கோரிக்கை உரிமையாளரின் ஒப்புதலுக்காக அனுப்பப்படும்.',
    deleteReasonLabel: 'நீக்குவதற்கான காரணம் (விருப்பமானது)',
    deleteReasonPlaceholder: 'எ.கா., வாடிக்கையாளர் முட்டைகளை திருப்பிக் கொடுத்தார், தவறான அளவு',
    sendDeleteRequest: 'உரிமையாளருக்கு கோரிக்கை அனுப்பு',
    deleteRequestSent: 'நீக்குதல் கோரிக்கை உரிமையாளருக்கு வெற்றிகரமாக அனுப்பப்பட்டது.',
    pendingOwnerApproval: 'உரிமையாளர் ஒப்புதலுக்கு காத்திருக்கிறது',
    approveAndDelete: 'ஒப்புதல் அளித்து நீக்கு',
    rejectRequest: 'கோரிக்கையை நிராகரி',
    deleteRequestApproved: 'பில் நீக்கப்பட்டு முட்டைகள் இருப்புக்குத் திரும்பின',
    deleteRequestRejected: 'நீக்குதல் கோரிக்கை உரிமையாளரால் நிராகரிக்கப்பட்டது',
    deleteBillPermanently: 'பில்லை நிரந்தரமாக நீக்கு',
    deleteBillConfirmDesc: 'இந்த பில்லை நிரந்தரமாக நீக்க விரும்புகிறீர்களா? முட்டைகள் மீண்டும் இருப்புக்கு சேர்க்கப்படும்.',
  },
};

const LANG_STORAGE_KEY = 'sss_app_language_v1';

export function getSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ta' || saved === 'en') {
      return saved;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return 'en';
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch (e) {
    // Ignore
  }
}
