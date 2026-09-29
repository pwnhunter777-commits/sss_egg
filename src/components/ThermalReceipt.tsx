import React, { useState } from 'react';
import { Bill, AgencySettings, PrinterDevice } from '../types';
import { thermalPrinter } from '../lib/thermalPrinter';
import { playPrintClickSound } from '../lib/soundNotification';
import { Printer, Check, X, Volume2, Bluetooth } from 'lucide-react';

interface Props {
  bill: Bill;
  settings: AgencySettings;
  printer: PrinterDevice;
  onClose: () => void;
  onOpenPrinterSettings?: () => void;
}

export const ThermalReceipt: React.FC<Props> = ({
  bill,
  settings,
  printer,
  onClose,
  onOpenPrinterSettings,
}) => {
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(printer.paperWidth || '58mm');
  const [printError, setPrintError] = useState<string | null>(null);

  const handlePrint = async () => {
    setPrinting(true);
    setPrintError(null);
    playPrintClickSound();

    try {
      const res = await thermalPrinter.printBill(bill, settings, paperWidth);
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

  const trays = Math.floor(bill.eggQuantity / 30);
  const loose = bill.eggQuantity % 30;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Top Bar */}
        <div className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-200" />
            <span className="font-semibold text-sm">Receipt Preview</span>
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
            {/* Header */}
            <div className="text-center space-y-1 mb-3">
              <h2 className="text-base font-extrabold tracking-tight uppercase">
                {settings.agencyName || 'SSS EGG AGENCY'}
              </h2>
              {settings.phone && (
                <p className="text-[11px] text-gray-700">Phone: {settings.phone}</p>
              )}
              {settings.address && (
                <p className="text-[10px] text-gray-600 leading-tight">{settings.address}</p>
              )}
            </div>

            <div className="border-t border-b border-dashed border-gray-400 py-1.5 my-2 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>Bill No: #{bill.billNumber}</span>
                <span>{bill.date}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Time: {bill.time}</span>
                <span>Staff: {bill.employeeName}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="my-3">
              <div className="flex justify-between font-bold border-b border-gray-300 pb-1 mb-1.5 text-[11px]">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-start font-medium">
                  <div>
                    <div>{bill.eggQuantity} Eggs</div>
                    <div className="text-[10px] text-gray-600">
                      @ ₹{bill.pricePerEgg}/egg
                      {bill.eggQuantity >= 30 && (
                        <span> ({trays} Tray{trays > 1 ? 's' : ''}{loose > 0 ? ` + ${loose}` : ''})</span>
                      )}
                    </div>
                  </div>
                  <div className="font-bold">₹{bill.totalAmount}</div>
                </div>
              </div>
            </div>

            {/* Total Box */}
            <div className="border-t-2 border-dashed border-gray-800 pt-2 pb-1 my-2">
              <div className="flex justify-between items-center text-sm font-extrabold">
                <span>NET TOTAL:</span>
                <span className="text-base">₹{bill.totalAmount}</span>
              </div>
              <div className="text-[10px] text-gray-500 text-right">
                (Inclusive of all charges)
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="text-center pt-3 pb-1 border-t border-dashed border-gray-300 text-[10px] space-y-0.5 text-gray-600">
              <p className="font-bold text-gray-800">*** Thank You! Visit Again ***</p>
              <p>Fresh Farm Quality Eggs Daily</p>
            </div>

            {/* Simulated Paper Jagged Edge Bottom */}
            <div className="w-full flex justify-between overflow-hidden mt-3 opacity-40">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="text-[8px] leading-none">▲</span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-3 bg-white border-t border-slate-200 space-y-2">
          {printError && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 flex items-center justify-between">
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
            <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5 justify-center font-medium animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              Receipt print command sent successfully!
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="flex-1 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-98 transition-all"
            >
              <Printer className="w-5 h-5" />
              <span>{printing ? 'Printing...' : 'Print Bill'}</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl active:scale-98 transition-all"
            >
              Done
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 px-1">
            <span className="flex items-center gap-1">
              <Bluetooth className={`w-3.5 h-3.5 ${thermalPrinter.isConnected() ? 'text-blue-600' : 'text-slate-400'}`} />
              {thermalPrinter.isConnected() ? 'Bluetooth: Connected' : 'Bluetooth: Ready / Browser Print'}
            </span>
            {onOpenPrinterSettings && (
              <button
                onClick={onOpenPrinterSettings}
                className="text-blue-600 font-medium hover:underline"
              >
                Printer Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
