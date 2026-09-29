import React, { useState } from 'react';
import { PrinterDevice, AgencySettings, Bill } from '../types';
import { thermalPrinter } from '../lib/thermalPrinter';
import { setLocalPrinter } from '../lib/offlineStorage';
import { playPrintClickSound } from '../lib/soundNotification';
import { Bluetooth, Printer, CheckCircle2, AlertCircle, RefreshCw, X, Sliders } from 'lucide-react';

interface Props {
  printer: PrinterDevice;
  settings: AgencySettings;
  onUpdatePrinter: (updated: PrinterDevice) => void;
  onClose: () => void;
}

export const BluetoothPrinterModal: React.FC<Props> = ({
  printer,
  settings,
  onUpdatePrinter,
  onClose,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testPrinting, setTestPrinting] = useState(false);

  const isBtSupported = thermalPrinter.isBluetoothSupported();
  const isConnected = thermalPrinter.isConnected();

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMsg(null);
    setStatusMsg(null);

    const res = await thermalPrinter.connect();
    setConnecting(false);

    if (res.success) {
      const updated: PrinterDevice = {
        ...printer,
        connected: true,
        name: res.name || 'Bluetooth Thermal Printer',
      };
      onUpdatePrinter(updated);
      setLocalPrinter(updated);
      setStatusMsg(`Connected to ${res.name || 'Printer'}`);
    } else {
      setErrorMsg(res.error || 'Failed to connect. Make sure your printer Bluetooth is turned on and in pairing mode.');
    }
  };

  const handleDisconnect = () => {
    thermalPrinter.disconnect();
    const updated: PrinterDevice = {
      ...printer,
      connected: false,
    };
    onUpdatePrinter(updated);
    setLocalPrinter(updated);
    setStatusMsg('Printer disconnected');
  };

  const handlePaperWidthChange = (width: '58mm' | '80mm') => {
    const updated: PrinterDevice = {
      ...printer,
      paperWidth: width,
    };
    onUpdatePrinter(updated);
    setLocalPrinter(updated);
  };

  const handleToggleAutoPrint = () => {
    const updated: PrinterDevice = {
      ...printer,
      autoPrintOnBill: !printer.autoPrintOnBill,
    };
    onUpdatePrinter(updated);
    setLocalPrinter(updated);
  };

  const handleTestPrint = async () => {
    setTestPrinting(true);
    playPrintClickSound();

    const sampleBill: Bill = {
      billId: 'test_print',
      billNumber: 9999,
      employeeId: 'emp_01',
      employeeName: 'Staff Ramesh',
      date: new Date().toISOString().split('T')[0],
      time: '12:00 PM',
      createdAt: new Date().toISOString(),
      eggQuantity: 30,
      pricePerEgg: 3,
      pricePer30Eggs: 90,
      totalAmount: 90,
      purchaseCostPerEgg: 2,
      profit: 30,
      syncStatus: 'synced',
    };

    try {
      const res = await thermalPrinter.printBill(sampleBill, settings, printer.paperWidth);
      if (res.success) {
        setStatusMsg('Test print command completed!');
      } else {
        setErrorMsg(res.error || 'Test print failed');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Printing error');
    } finally {
      setTestPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bluetooth className="w-5 h-5 text-blue-200" />
            <h3 className="font-bold text-base">Bluetooth Thermal Printer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-blue-600 text-blue-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Connection Status Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <div>
                  <div className="font-semibold text-xs text-slate-800">
                    {isConnected ? printer.name || 'Bluetooth Printer' : 'No Printer Connected'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isConnected ? 'Ready for printing' : 'Connect 58mm / 80mm thermal device'}
                  </div>
                </div>
              </div>

              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg font-medium hover:bg-rose-100 active:scale-95 transition-all"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="text-xs text-white bg-blue-600 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 active:scale-95 flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {connecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Bluetooth className="w-3.5 h-3.5" />
                      Connect
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Paper Width Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              Thermal Receipt Paper Width
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePaperWidthChange('58mm')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  printer.paperWidth === '58mm'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>58 mm</span>
                <span className="text-[10px] text-slate-400 font-mono">(Standard)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePaperWidthChange('80mm')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  printer.paperWidth === '80mm'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>80 mm</span>
                <span className="text-[10px] text-slate-400 font-mono">(Wide)</span>
              </button>
            </div>
          </div>

          {/* Auto-Print Option */}
          <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <div>
              <div className="text-xs font-semibold text-slate-800">Auto Print on Bill Creation</div>
              <div className="text-[11px] text-slate-500">Automatically trigger print after saving bill</div>
            </div>
            <input
              type="checkbox"
              checked={printer.autoPrintOnBill}
              onChange={handleToggleAutoPrint}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
          </label>

          {/* Status / Errors */}
          {statusMsg && (
            <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Web Bluetooth Notice if not supported */}
          {!isBtSupported && (
            <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              Note: Web Bluetooth direct scanning requires Chrome/Edge on Android or desktop. If unavailable, the app automatically uses System Thermal Print for connected USB, Network, or Paired Bluetooth printers!
            </div>
          )}

          {/* Test Print Button */}
          <div className="pt-2 flex gap-2">
            <button
              onClick={handleTestPrint}
              disabled={testPrinting}
              className="flex-1 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-medium text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>{testPrinting ? 'Printing Test...' : 'Print Test Receipt'}</span>
            </button>

            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
