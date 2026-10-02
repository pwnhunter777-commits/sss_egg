import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    setCurrentBill(bill);
  }, [bill]);

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
            className={`receipt-paper bg-white text-black p-4 text-xs font-mono transition-all duration-200 ${
              paperWidth === '58mm' ? 'w-[280px]' : 'w-[330px]'
            } border-t-4 border-dashed border-slate-300 relative`}
          >
            {/* Combined Header & Bill Info in One Div */}
            <div className="border-b border-dashed border-gray-500 pb-2 mb-2 space-y-2">
              <div className="text-center space-y-0.5">
                <h2 className="text-lg md:text-xl font-black tracking-tight uppercase">
                  {isTamil && settings.agencyName === 'SSS EGG AGENCY'
                    ? t('agencyNameDefault')
                    : settings.agencyName || t('agencyNameDefault')}
                </h2>
                {settings.phone && (
                  <p className="text-xs md:text-sm font-bold text-gray-800">Phone: {settings.phone}</p>
                )}
                {settings.address && (
                  <p className="text-xs font-bold text-gray-700 leading-tight">{settings.address}</p>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 pt-1.5 space-y-1 text-xs md:text-sm font-bold">
                <div className="flex justify-between font-black">
                  <span>{t('billNo')}: #{currentBill.billNumber}</span>
                  <span>{currentBill.date}</span>
                </div>
                <div className="flex justify-between text-gray-800">
                  <span>{t('time')}: {currentBill.time}</span>
                  <span>{t('staff')}: {currentBill.employeeName}</span>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="my-3">
              <div className="flex justify-between font-black border-b border-gray-400 pb-1 mb-2 text-xs md:text-sm">
                <span>{t('items')}</span>
                <span>{t('total')}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center font-bold">
                  <div className="text-sm md:text-base font-black">{currentBill.eggQuantity} {t('eggs')}</div>
                  <div className="text-base md:text-lg font-black font-mono">₹{currentBill.totalAmount}</div>
                </div>
              </div>
            </div>

            {/* Total Box */}
            <div className="border-t-2 border-dashed border-gray-900 pt-2.5 pb-1.5 my-2">
              <div className="flex justify-between items-center text-base md:text-lg font-black">
                <span>{t('netTotal')}</span>
                <span className="text-xl md:text-2xl font-black font-mono">₹{currentBill.totalAmount}</span>
              </div>
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

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="flex-1 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black py-4 px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98 transition-all text-base"
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

            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-4 px-6 rounded-2xl active:scale-98 transition-all text-base"
            >
              {t('done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
