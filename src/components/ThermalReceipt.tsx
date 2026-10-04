import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Bill, AgencySettings, PrinterDevice } from '../types';
import { thermalPrinter } from '../lib/thermalPrinter';
import { playPrintClickSound } from '../lib/soundNotification';
import { Printer, Check, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  bill: Bill;
  settings: AgencySettings;
  printer: PrinterDevice;
  isDraft?: boolean;
  onConfirmAndSave?: () => Promise<Bill>;
  onClose: () => void;
  onOpenPrinterSettings?: () => void;
}

export const ThermalReceipt: React.FC<Props> = ({
  bill,
  settings,
  printer,
  isDraft = false,
  onConfirmAndSave,
  onClose,
  onOpenPrinterSettings,
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
  const agencyTitle = isTamil && settings.agencyName === 'SSS EGG AGENCY'
    ? t('agencyNameDefault')
    : settings.agencyName || 'SSS EGG AGENCY';

  useEffect(() => {
    setCurrentBill(bill);
  }, [bill]);

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

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Top Bar */}
        <div className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-200" />
            <span className="font-semibold text-sm">{t('receiptPreview')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPaperWidth(paperWidth === '58mm' ? '80mm' : '58mm')}
              className="text-xs bg-blue-950/50 hover:bg-blue-950 px-2 py-1 rounded text-blue-200 font-mono"
              title="Toggle Paper Width"
            >
              {paperWidth}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-blue-700 text-blue-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-200/80 flex justify-center">
          <div
            id="thermal-receipt-print-area"
            className={`receipt-paper bg-white text-black p-4 text-xs font-mono font-black transition-all duration-200 ${
              paperWidth === '58mm' ? 'w-[280px]' : 'w-[330px]'
            } border-t-4 border-dashed border-slate-400 relative select-none`}
          >
            {/* Store Header */}
            <div className="border-b-2 border-dashed border-black pb-2 mb-2 text-center">
              <h2 className="text-lg md:text-xl font-black tracking-tight uppercase text-black">
                {isTamil && settings.agencyName === 'SSS EGG AGENCY'
                  ? t('agencyNameDefault')
                  : settings.agencyName || t('agencyNameDefault')}
              </h2>
            </div>

            {/* Bill Body: Left Side (Items & Total Spans) + Right Side (QR Image) */}
            <div className="flex items-center justify-between gap-3 my-2.5">
              {/* Left Side: Items, Line Item Spans, and Net Total */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Header Spans */}
                <div className="flex justify-between font-black border-b-2 border-black pb-1 text-xs md:text-sm text-black uppercase">
                  <span className="font-black text-black">{t('items')}</span>
                  <span className="font-black text-black">{t('total')}</span>
                </div>

                {/* Line Item Spans */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center font-black text-black">
                    <span className="text-xs md:text-sm font-black text-black truncate">{currentBill.eggQuantity} {t('eggs')}</span>
                    <span className="text-xs md:text-sm font-black font-mono text-black">₹{Math.round(currentBill.totalAmount)}</span>
                  </div>
                </div>

                {/* Net Total Spans */}
                <div className="border-t-2 border-dashed border-black pt-1.5">
                  <div className="flex justify-between items-center font-black text-black">
                    <span className="uppercase text-xs md:text-sm font-black text-black">{t('netTotal')}</span>
                    <span className="text-sm md:text-base font-black font-mono text-black">₹{Math.round(currentBill.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Right Side: QR Code Image */}
              {qrDataUrl && (
                <div className="shrink-0 flex items-center justify-center">
                  <div className="p-1 bg-white border-2 border-black rounded-xl shadow-xs">
                    <img
                      src={qrDataUrl}
                      alt="UPI Payment QR Code"
                      className="w-24 h-24 sm:w-26 sm:h-26 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3">
          {printError && (
            <div className="text-xs md:text-sm text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 flex items-center justify-between font-bold">
              <span>{printError}</span>
              <button
                onClick={() => setPrintError(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-2"
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

          <div>
            <button
              onClick={handlePrint}
              disabled={printing}
              className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black py-4 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98 transition-all text-base"
            >
              <Printer className="w-5 h-5" />
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
          </div>
        </div>
      </div>
    </div>
  );
};
