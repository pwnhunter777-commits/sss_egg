import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Bill, AgencySettings, PrinterDevice } from '../types';
import { thermalPrinter } from '../lib/thermalPrinter';
import { playPrintClickSound } from '../lib/soundNotification';
import {
  Printer,
  Check,
  X,
  Download,
  Receipt,
  Eye,
  Store,
  Phone,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { downloadBillPdf } from '../lib/billPdfGenerator';

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
  customerName?: string;
  customerPhone?: string;
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
  customerName,
  customerPhone,
}) => {
  const { t, isTamil } = useLanguage();
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(printer.paperWidth || '58mm');
  const [printError, setPrintError] = useState<string | null>(null);
  const [currentBill, setCurrentBill] = useState<Bill>(bill);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const upiId = settings.upiId || 'nazirahamed0003@okhdfcbank';
  const roundedAmount = Math.round(currentBill.totalAmount);
  const taraCount = Math.floor(currentBill.eggQuantity / 30);
  const looseEggs = currentBill.eggQuantity % 30;
  const ratePer30 = currentBill.pricePer30Eggs || Math.round(currentBill.pricePerEgg * 30);
  const agencyTitle =
    isTamil && settings.agencyName === 'SSS EGG AGENCY'
      ? t('agencyNameDefault')
      : settings.agencyName || 'SSS EGG AGENCY';

  useEffect(() => {
    setCurrentBill(bill);
  }, [bill]);

  // Generate UPI QR code for the bill amount
  useEffect(() => {
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(agencyTitle)}&am=${roundedAmount}&cu=INR&tn=${encodeURIComponent('Egg Bill #' + currentBill.billNumber)}`;
    QRCode.toDataURL(upiUrl, {
      width: 200,
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

  const handleDownloadPdf = async () => {
    try {
      playPrintClickSound();
      await downloadBillPdf(
        currentBill,
        settings,
        'Counter Customer',
        ''
      );
    } catch (err: any) {
      setPrintError(err.message || 'PDF Download error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
        {/* Modal Top Bar */}
        <div
          className={`${
            role === 'employee' ? 'bg-blue-800' : 'bg-slate-900'
          } text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm`}
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-200" />
            <span className="font-black text-sm uppercase tracking-wide">
              {role === 'employee'
                ? isTamil
                  ? 'பில் ரசீது & அச்சிடு'
                  : 'Bill Receipt & Print'
                : t('receiptPreview')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!hidePrintButton && (
              <button
                type="button"
                onClick={() => setPaperWidth(paperWidth === '58mm' ? '80mm' : '58mm')}
                className="text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg text-white font-mono font-bold transition-colors cursor-pointer"
                title="Toggle Paper Width"
              >
                {paperWidth}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-200/90 flex justify-center">
          <div
            id="thermal-receipt-print-area"
            className="receipt-paper bg-white text-slate-900 p-5 sm:p-6 font-mono transition-all duration-200 w-full max-w-[420px] rounded-2xl shadow-xl border-2 border-slate-300 relative select-none space-y-3.5"
          >
            {/* Store Header - Large & Eye-Catching */}
            <div className="border-b-2 border-dashed border-slate-800 pb-3.5 text-center space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-slate-950 leading-tight">
                {agencyTitle}
              </h2>
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider font-sans">
                {isTamil ? 'மொத்த முட்டை விநியோகம்' : 'Wholesale Egg Dealer & Distribution'}
              </p>
              {settings.address && (
                <p className="text-xs font-bold text-slate-600 font-sans">
                  {settings.address}
                </p>
              )}
              {settings.phone && (
                <p className="text-xs font-mono font-black text-slate-800 flex items-center justify-center gap-1">
                  <Phone className="w-3 h-3 text-slate-600" />
                  <span>+91 {settings.phone}</span>
                </p>
              )}
            </div>

            {/* Bill Details Box */}
            <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between font-black border-b border-slate-200 pb-1.5">
                <span className="font-mono text-lg font-black text-blue-900">
                  {t('billNo')} #{currentBill.billNumber}
                </span>

                <span className="text-[11px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{isTamil ? 'ரொக்கம்' : 'CASH'}</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-700 pt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <strong>{currentBill.date}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <strong>{currentBill.time}</strong>
                </span>
              </div>
            </div>

            {/* Line Items Table with Big Text */}
            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-12 text-xs font-black uppercase border-y-2 border-slate-900 py-1.5 text-slate-800">
                <span className="col-span-6">{t('items')}</span>
                <span className="col-span-3 text-center">{isTamil ? 'விலை' : 'Rate'}</span>
                <span className="col-span-3 text-right">{t('total')}</span>
              </div>

              <div className="grid grid-cols-12 items-center py-2.5 border-b-2 border-dashed border-slate-300">
                <div className="col-span-6 min-w-0 pr-1">
                  <div className="text-base sm:text-lg font-black text-slate-950 leading-snug">
                    {taraCount > 0
                      ? `${taraCount} ${isTamil ? 'தாரா' : 'Tara'}${looseEggs > 0 ? ` + ${looseEggs}` : ''}`
                      : `${currentBill.eggQuantity} ${t('eggs')}`}
                  </div>
                  <div className="text-xs font-bold text-slate-600 font-sans">
                    ({currentBill.eggQuantity} {isTamil ? 'முட்டைகள்' : 'Eggs'})
                  </div>
                </div>

                <div className="col-span-3 text-center font-mono font-black text-sm sm:text-base text-slate-900">
                  ₹{ratePer30}
                  <span className="text-[10px] block text-slate-500 font-sans font-bold">/tara</span>
                </div>

                <div className="col-span-3 text-right font-mono font-black text-lg sm:text-xl text-slate-950">
                  ₹{roundedAmount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Grand Total - Huge, High Contrast Display */}
            <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-2 border-2 border-slate-900">
              <div className="min-w-0">
                <span className="text-xs uppercase font-black tracking-wider text-slate-300 block">
                  {t('netTotal')}
                </span>
                <span className="text-[11px] font-bold text-slate-400 block font-sans">
                  {isTamil ? 'மொத்த பில் தொகை' : 'Total Bill Amount'}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 tracking-tight shrink-0">
                ₹{roundedAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* UPI QR Payment Box */}
            {qrDataUrl && (
              <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-3 text-center space-y-2">
                <div className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center justify-center gap-1.5">
                  <span>{isTamil ? 'UPI மூலம் பணம் செலுத்த ஸ்கேன் செய்க' : 'Scan to Pay via UPI'}</span>
                </div>
                <div className="w-36 h-36 sm:w-40 sm:h-40 mx-auto bg-white p-2 border-2 border-slate-900 rounded-2xl shadow-xs flex items-center justify-center">
                  <img
                    src={qrDataUrl}
                    alt="UPI Payment QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-mono font-black text-slate-900 truncate">
                    UPI ID: <strong className="text-black">{upiId}</strong>
                  </div>
                  <div className="text-[11px] font-bold text-slate-600">
                    GPay • PhonePe • Paytm • Any UPI App
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t-2 border-dashed border-slate-800 pt-2.5 text-center space-y-0.5">
              <p className="text-xs font-black uppercase text-slate-900 tracking-wider">
                {isTamil ? 'நன்றி! மீண்டும் வருக!' : 'Thank You! Visit Again'}
              </p>
              <p className="text-[11px] font-bold text-slate-500 font-sans">
                {isTamil ? 'தரமான புதிய பண்ணை முட்டைகள்' : 'Fresh & Quality Farm Eggs'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 space-y-2.5 shrink-0">
          {printError && (
            <div className="text-xs md:text-sm text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center justify-between font-bold">
              <span>{printError}</span>
              <button
                type="button"
                onClick={() => setPrintError(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
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
                className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black py-3 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all text-sm uppercase tracking-wider cursor-pointer"
              >
                <span>{t('close')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Direct Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={printing}
                className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98 transition-all text-sm uppercase tracking-wider cursor-pointer"
              >
                <Printer className="w-5 h-5 shrink-0" />
                <span>
                  {printing
                    ? isDraft
                      ? t('savingAndPrinting')
                      : t('printing')
                    : isDraft
                    ? t('confirmAndPrint')
                    : isTamil
                    ? 'பில் பிரிண்ட் செய்ய (Print Thermal Bill)'
                    : 'Print Thermal Bill Receipt'}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs border border-slate-300 active:scale-98 transition-all cursor-pointer shadow-2xs"
                >
                  <Download className="w-4 h-4 text-slate-700" />
                  <span>{isTamil ? 'PDF ரசீது பதிவிறக்க' : 'Download PDF Receipt'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-black transition-colors border border-slate-300 cursor-pointer shadow-2xs"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
