import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Bill, AgencySettings, PrinterDevice } from '../types';
import { thermalPrinter } from '../lib/thermalPrinter';
import { playPrintClickSound, playChimeSound } from '../lib/soundNotification';
import { Printer, Check, X, Eye, Send, Download, Smartphone, ShieldCheck, Share2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { shareBillToWhatsApp, downloadBillPdf } from '../lib/billPdfGenerator';
import { getActiveShopkeeperPhone, getSavedShopkeeperContacts } from '../lib/offlineStorage';
import { ShopkeeperPhoneModal } from './ShopkeeperPhoneModal';

interface Props {
  bill: Bill;
  settings: AgencySettings;
  printer: PrinterDevice;
  role?: 'owner' | 'employee';
  isDraft?: boolean;
  onConfirmAndSave?: () => Promise<Bill>;
  onClose: () => void;
  onOpenPrinterSettings?: () => void;
  hidePrintButton?: boolean;
}

export const ThermalReceipt: React.FC<Props> = ({
  bill,
  settings,
  printer,
  role = 'employee',
  isDraft = false,
  onConfirmAndSave,
  onClose,
  onOpenPrinterSettings,
  hidePrintButton = false,
}) => {
  const { t, isTamil } = useLanguage();
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(printer.paperWidth || '58mm');
  const [printError, setPrintError] = useState<string | null>(null);
  const [currentBill, setCurrentBill] = useState<Bill>(bill);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // WhatsApp Sender State (Saved strictly on employee phone itself)
  const [shopkeeperPhone, setShopkeeperPhone] = useState<string>('');
  const [shopkeeperName, setShopkeeperName] = useState<string>('');
  const [showPhoneModal, setShowPhoneModal] = useState<boolean>(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState<boolean>(false);
  const [whatsAppSuccess, setWhatsAppSuccess] = useState<string | null>(null);

  const upiId = settings.upiId || 'nazirahamed0003@okhdfcbank';
  const roundedAmount = Math.round(currentBill.totalAmount);
  const taraCount = Math.floor(currentBill.eggQuantity / 30);
  const looseEggs = currentBill.eggQuantity % 30;
  const ratePer30 = currentBill.pricePer30Eggs || Math.round(currentBill.pricePerEgg * 30);
  const agencyTitle = isTamil && settings.agencyName === 'SSS EGG AGENCY'
    ? t('agencyNameDefault')
    : settings.agencyName || 'SSS EGG AGENCY';

  useEffect(() => {
    setCurrentBill(bill);
  }, [bill]);

  // Load active shopkeeper phone from local phone memory
  useEffect(() => {
    const active = getActiveShopkeeperPhone();
    setShopkeeperPhone(active);
    const contacts = getSavedShopkeeperContacts();
    const matched = contacts.find((c) => c.phone === active);
    if (matched) {
      setShopkeeperName(matched.name);
    }
  }, []);

  // Generate UPI QR code for the bill amount
  useEffect(() => {
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(agencyTitle)}&am=${roundedAmount}&cu=INR&tn=${encodeURIComponent('Egg Bill #' + currentBill.billNumber)}`;
    QRCode.toDataURL(upiUrl, {
      width: 160,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate UPI QR code', err));
  }, [currentBill.billNumber, roundedAmount, upiId, agencyTitle]);

  const handlePrint = async () => {
    setPrinting(true);
    setPrintError(null);
    playPrintClickSound();

    try {
      let finalBill = currentBill;

      // Only add the bill and send to owner when this button is clicked
      if (isDraft && onConfirmAndSave) {
        finalBill = await onConfirmAndSave();
        setCurrentBill(finalBill);
      }

      const res = await thermalPrinter.printBill(finalBill, settings, paperWidth);
      if (res.success) {
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 2500);
      } else if (res.error) {
        setPrintError(res.error);
      }
    } catch (err: any) {
      setPrintError(err.message || 'Printing error');
    } finally {
      setPrinting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    // If no shopkeeper number saved in phone, ask for it first
    if (!shopkeeperPhone.trim()) {
      setShowPhoneModal(true);
      return;
    }

    setIsSharingWhatsApp(true);
    setPrintError(null);
    playPrintClickSound();

    try {
      let finalBill = currentBill;
      if (isDraft && onConfirmAndSave) {
        finalBill = await onConfirmAndSave();
        setCurrentBill(finalBill);
      }

      const res = await shareBillToWhatsApp(
        finalBill,
        settings,
        shopkeeperPhone,
        shopkeeperName || 'Shopkeeper'
      );

      if (res.success) {
        playChimeSound();
        setWhatsAppSuccess(
          isTamil
            ? `வாட்ஸ்அப்பில் PDF பில் வெற்றிகரமாக பகிரப்பட்டது! (+91 ${shopkeeperPhone})`
            : `PDF Bill shared to WhatsApp! (+91 ${shopkeeperPhone})`
        );
        setTimeout(() => setWhatsAppSuccess(null), 3500);
      } else if (res.error && res.method !== 'cancelled') {
        setPrintError(res.error);
      }
    } catch (err: any) {
      setPrintError(err.message || 'Failed to share WhatsApp bill');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      playPrintClickSound();
      await downloadBillPdf(
        currentBill,
        settings,
        shopkeeperName || 'Shopkeeper',
        shopkeeperPhone
      );
    } catch (err: any) {
      setPrintError(err.message || 'Failed to download PDF');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Top Bar */}
        <div className={`${role === 'employee' ? 'bg-emerald-800' : 'bg-blue-800'} text-white px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {role === 'employee' ? (
              <Share2 className="w-5 h-5 text-emerald-200" />
            ) : hidePrintButton ? (
              <Eye className="w-5 h-5 text-blue-200" />
            ) : (
              <Printer className="w-5 h-5 text-blue-200" />
            )}
            <span className="font-semibold text-sm">
              {role === 'employee'
                ? (isTamil ? 'பில் ரசீது (வாட்ஸ்அப் & PDF)' : 'Bill Receipt (WhatsApp PDF)')
                : t('receiptPreview')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {role !== 'employee' && !hidePrintButton && (
              <button
                type="button"
                onClick={() => setPaperWidth(paperWidth === '58mm' ? '80mm' : '58mm')}
                className="text-xs bg-blue-950/50 hover:bg-blue-950 px-2 py-1 rounded text-blue-200 font-mono"
                title="Toggle Paper Width"
              >
                {paperWidth}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`p-1 rounded-full ${role === 'employee' ? 'hover:bg-emerald-700 text-emerald-100' : 'hover:bg-blue-700 text-blue-100'} transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-300/80 flex justify-center">
          <div
            id="thermal-receipt-print-area"
            className="receipt-paper bg-white text-slate-900 p-5 font-mono font-black transition-all duration-200 w-full max-w-[420px] rounded-2xl shadow-xl border-2 border-slate-300 relative select-none space-y-3"
          >
            {/* Store Header */}
            <div className="border-b-2 border-dashed border-slate-800 pb-3 text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-slate-950 leading-tight">
                {isTamil && settings.agencyName === 'SSS EGG AGENCY'
                  ? t('agencyNameDefault')
                  : settings.agencyName || t('agencyNameDefault')}
              </h2>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                {isTamil ? 'மொத்த முட்டை விநியோகம்' : 'Wholesale Egg Dealer & Distribution'}
              </p>
              {settings.phone && (
                <p className="text-xs font-mono font-bold text-slate-700">
                  {isTamil ? 'தொலைபேசி:' : 'Phone:'} {settings.phone}
                </p>
              )}
            </div>

            {/* Bill Details & Customer/Hotel Banner */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold space-y-1.5">
              <div className="flex items-center justify-between font-black text-sm text-slate-900 border-b border-slate-200 pb-1">
                <span className="font-mono text-base font-black text-blue-900">
                  {t('billNo')} #{currentBill.billNumber}
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold uppercase">
                  {isTamil ? 'பில் உறுதி' : 'Paid / Cash'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span>{t('date')}: <strong className="text-slate-900">{currentBill.date}</strong></span>
                <span>{t('time')}: <strong className="text-slate-900">{currentBill.time}</strong></span>
              </div>
              {shopkeeperName && (
                <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600">{isTamil ? 'கடை / ஹோட்டல்:' : 'Hotel / Shop:'}</span>
                  <span className="font-black text-emerald-950 text-sm truncate max-w-[200px]">
                    {shopkeeperName}
                  </span>
                </div>
              )}
            </div>

            {/* Line Items Table with Big Text */}
            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-12 text-xs font-black uppercase border-y-2 border-slate-900 py-1.5 text-slate-800">
                <span className="col-span-6">{t('items')}</span>
                <span className="col-span-3 text-center">{isTamil ? 'விலை' : 'Rate'}</span>
                <span className="col-span-3 text-right">{t('total')}</span>
              </div>

              <div className="grid grid-cols-12 items-center py-2 border-b border-dashed border-slate-300">
                <div className="col-span-6 min-w-0 pr-1">
                  <div className="text-base font-black text-slate-950 leading-snug">
                    {taraCount > 0
                      ? `${taraCount} ${isTamil ? 'தாரா' : 'Tara'}${looseEggs > 0 ? ` + ${looseEggs}` : ''}`
                      : `${currentBill.eggQuantity} ${t('eggs')}`}
                  </div>
                  <div className="text-xs font-bold text-slate-500 font-sans">
                    ({currentBill.eggQuantity} {isTamil ? 'முட்டைகள்' : 'Eggs'})
                  </div>
                </div>

                <div className="col-span-3 text-center font-mono font-black text-sm text-slate-800">
                  ₹{ratePer30}
                  <span className="text-[10px] block text-slate-500 font-sans font-bold">/tara</span>
                </div>

                <div className="col-span-3 text-right font-mono font-black text-base sm:text-lg text-slate-950">
                  ₹{roundedAmount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Grand Total - Huge, Eye-Catching Display */}
            <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs uppercase font-black tracking-wider text-slate-300 block">
                  {t('netTotal')}
                </span>
                <span className="text-[10px] font-bold text-slate-400 block font-sans">
                  {isTamil ? 'செலுத்த வேண்டிய மொத்த தொகை' : 'Total Amount Payable'}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 tracking-tight shrink-0">
                ₹{roundedAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* UPI QR Payment Box */}
            {qrDataUrl && (
              <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-3 text-center space-y-2">
                <div className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center justify-center gap-1.5">
                  <span>{isTamil ? 'UPI மூலம் பணம் செலுத்த ஸ்கேன் செய்யவும்' : 'Scan to Pay via UPI'}</span>
                </div>
                <div className="w-32 h-32 sm:w-36 sm:h-36 mx-auto bg-white p-2 border-2 border-slate-900 rounded-2xl shadow-xs flex items-center justify-center">
                  <img
                    src={qrDataUrl}
                    alt="UPI Payment QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-mono font-bold text-slate-800 truncate">
                    UPI ID: <strong className="text-black">{upiId}</strong>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">
                    GPay • PhonePe • Paytm • Any UPI App
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t-2 border-dashed border-slate-800 pt-2 text-center space-y-0.5">
              <p className="text-xs font-black uppercase text-slate-800 tracking-wider">
                {isTamil ? 'நன்றி! மீண்டும் வருக!' : 'Thank You! Visit Again'}
              </p>
              <p className="text-[10px] font-bold text-slate-500 font-sans">
                {isTamil ? 'தரமான புதிய பண்ணை முட்டைகள்' : 'Fresh & Quality Farm Eggs'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3">
          {/* Shopkeeper WhatsApp Recipient Card (Saved on employee phone only) */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black text-emerald-950 truncate flex items-center gap-1">
                  <span>
                    {shopkeeperPhone
                      ? `+91 ${shopkeeperPhone}${shopkeeperName ? ` • ${shopkeeperName}` : ''}`
                      : (isTamil ? 'வாட்ஸ்அப் எண் அமைக்கவும்' : 'Set Shopkeeper Phone')}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 shrink-0 text-emerald-600" />
                  <span className="truncate">
                    {isTamil ? 'போன் மெமரியில் சேமிக்கப்பட்டது' : 'Saved in phone memory only'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPhoneModal(true)}
              className="text-xs font-black bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-xl shrink-0 transition-colors shadow-2xs"
            >
              {t('changePhone')}
            </button>
          </div>

          {printError && (
            <div className="text-xs md:text-sm text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center justify-between font-bold">
              <span>{printError}</span>
              <button
                type="button"
                onClick={() => setPrintError(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {whatsAppSuccess && (
            <div className="text-xs text-emerald-900 bg-emerald-100 p-2.5 rounded-xl border border-emerald-300 flex items-center gap-2 justify-center font-black animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{whatsAppSuccess}</span>
            </div>
          )}

          {printSuccess && (
            <div className="text-xs md:text-sm text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2 justify-center font-black animate-in fade-in">
              <Check className="w-5 h-5 text-emerald-600" />
              {t('printSuccessMsg')}
            </div>
          )}

          {hidePrintButton ? (
            <div>
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black py-3 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all text-sm uppercase tracking-wider"
              >
                <span>{t('close')}</span>
              </button>
            </div>
          ) : role === 'employee' ? (
            /* Employee Mode: Strictly WhatsApp and PDF sharing (No billing printer machine) */
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={isSharingWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all text-sm uppercase tracking-wider"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSharingWhatsApp
                    ? (isTamil ? 'வாட்ஸ்அப்பில் பகிர்கிறது...' : 'Sharing PDF to WhatsApp...')
                    : isDraft
                    ? (isTamil ? 'உறுதி செய்து வாட்ஸ்அப்பில் அனுப்பு (PDF)' : 'Confirm & Send WhatsApp (PDF)')
                    : (isTamil ? 'வாட்ஸ்அப்பில் அனுப்பு (PDF)' : 'Share via WhatsApp (PDF)')}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs border border-slate-300 active:scale-98 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('downloadPdf')}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          ) : (
            /* Owner Mode: Allows both thermal printer and WhatsApp PDF */
            <div className="space-y-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={printing}
                className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98 transition-all text-sm uppercase tracking-wider"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {printing
                    ? isDraft
                      ? t('savingAndPrinting')
                      : t('printing')
                    : isDraft
                    ? t('confirmAndPrint')
                    : t('printBill')}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  disabled={isSharingWhatsApp}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-xs active:scale-98 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1 text-xs border border-slate-300 active:scale-98 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shopkeeper Phone Input Modal */}
      {showPhoneModal && (
        <ShopkeeperPhoneModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          onPhoneSelected={(phone, name) => {
            setShopkeeperPhone(phone);
            if (name) setShopkeeperName(name);
            setShowPhoneModal(false);
          }}
        />
      )}
    </div>
  );
};
