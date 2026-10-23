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
import { downloadBillPdf, createBillPdfFile } from '../lib/billPdfGenerator';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

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

  // Generate UPI QR code for the bill amount with high resolution
  useEffect(() => {
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(agencyTitle)}&am=${roundedAmount}&cu=INR&tn=${encodeURIComponent('Egg Bill #' + currentBill.billNumber)}`;
    QRCode.toDataURL(upiUrl, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate UPI QR code', err));
  }, [currentBill.billNumber, roundedAmount, upiId, agencyTitle]);

  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState(customerPhone || '');

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
        customerName || 'Counter Customer',
        recipientPhone
      );
    } catch (err: any) {
      setPrintError(err.message || 'PDF Download error');
    }
  };

  const handleSendWhatsApp = async () => {
    setSharingWhatsApp(true);
    setPrintError(null);
    playPrintClickSound();

    try {
      let finalBill = currentBill;

      if (isDraft && onConfirmAndSave) {
        finalBill = await onConfirmAndSave();
        setCurrentBill(finalBill);
      }

      // Generate the official Bill PDF file
      const pdfFile = await createBillPdfFile(
        finalBill,
        settings,
        customerName || 'Customer',
        recipientPhone
      );

      const billText =
        `*${agencyTitle}*\n` +
        `🧾 *INVOICE #${finalBill.billNumber}*\n` +
        `📅 Date: ${finalBill.date} | ${finalBill.time}\n` +
        `🥚 Tara: ${Math.floor(finalBill.eggQuantity / 30)} Tara (${finalBill.eggQuantity} Eggs)\n` +
        `💰 Total: Rs. ${Math.round(finalBill.totalAmount)}\n` +
        `💳 Payment: ${(finalBill.paymentMethod || 'cash').toUpperCase()}\n` +
        `UPI ID: ${upiId}\n\n` +
        `_Fresh & Quality Farm Eggs. Thank You!_`;

      const phoneDigits = recipientPhone.replace(/[^0-9]/g, '');
      const cleanPhone =
        phoneDigits.length === 10
          ? `91${phoneDigits}`
          : phoneDigits.length > 10
          ? phoneDigits
          : '';

      // If mobile with file sharing support, use native share sheet directly with PDF
      if (
        !cleanPhone &&
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [pdfFile] })
      ) {
        await navigator.share({
          files: [pdfFile],
          title: `${agencyTitle} Bill #${finalBill.billNumber}`,
          text: billText,
        });
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 2500);
      } else {
        // Direct WhatsApp Web / App intent + automatically download the PDF invoice
        await downloadBillPdf(
          finalBill,
          settings,
          customerName || 'Customer',
          recipientPhone
        );

        const encodedText = encodeURIComponent(
          `${billText}\n\n📄 (Official PDF Bill #${finalBill.billNumber} attached)`
        );

        const waUrl = cleanPhone
          ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
          : `https://api.whatsapp.com/send?text=${encodedText}`;

        window.open(waUrl, '_blank');
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 2500);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setPrintError(err.message || 'WhatsApp sending failed');
      }
    } finally {
      setSharingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl sm:max-w-3xl lg:max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden border-2 border-slate-300">
        {/* Modal Top Bar */}
        <div
          className={`${
            role === 'employee' ? 'bg-blue-800' : 'bg-slate-900'
          } text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-sm`}
        >
          <div className="flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-blue-200" />
            <span className="font-black text-base uppercase tracking-wide">
              {role === 'employee'
                ? isTamil
                  ? 'பில் ரசீது & அச்சிடு'
                  : 'Bill Receipt & Print'
                : t('receiptPreview')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!hidePrintButton && (
              <button
                type="button"
                onClick={() => setPaperWidth(paperWidth === '58mm' ? '80mm' : '58mm')}
                className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg text-white font-mono font-bold transition-colors cursor-pointer"
                title="Toggle Paper Width"
              >
                {paperWidth}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-slate-200/90 flex justify-center items-start">
          <div
            id="thermal-receipt-print-area"
            className="receipt-paper bg-white text-slate-900 p-6 sm:p-10 font-mono transition-all duration-200 w-full max-w-full sm:max-w-2xl lg:max-w-3xl min-h-fit rounded-3xl shadow-2xl border-2 border-slate-400 relative select-none space-y-6 flex flex-col justify-between"
          >
            {/* Store Header - Large & Eye-Catching */}
            <div className="border-b-2 border-dashed border-slate-800 pb-5 text-center space-y-2">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight uppercase text-slate-950 leading-tight">
                {agencyTitle}
              </h2>
              <p className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-wider font-sans">
                {isTamil ? 'மொத்த முட்டை விநியோகம்' : 'Wholesale Egg Dealer & Distribution'}
              </p>
              {settings.address && (
                <p className="text-xs sm:text-sm font-bold text-slate-700 font-sans">
                  {settings.address}
                </p>
              )}
              {settings.phone && (
                <p className="text-sm sm:text-base font-mono font-black text-slate-900 flex items-center justify-center gap-2 pt-1">
                  <Phone className="w-4 h-4 text-slate-700" />
                  <span>+91 {settings.phone}</span>
                </p>
              )}
            </div>

            {/* Bill Details Box */}
            <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-5 text-sm sm:text-base space-y-3 w-full">
              <div className="flex items-center justify-between font-black border-b border-slate-200 pb-3">
                <span className="font-mono text-xl sm:text-2xl font-black text-blue-900">
                  {t('billNo')} #{currentBill.billNumber}
                </span>

                <span
                  className={`text-xs sm:text-sm font-black uppercase px-3.5 py-1.5 rounded-xl flex items-center gap-2 border shadow-2xs ${
                    currentBill.paymentMethod === 'gpay'
                      ? 'bg-blue-100 text-blue-900 border-blue-400'
                      : currentBill.paymentMethod === 'credit'
                      ? 'bg-amber-100 text-amber-900 border-amber-400'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-400'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      currentBill.paymentMethod === 'gpay'
                        ? 'text-blue-700'
                        : currentBill.paymentMethod === 'credit'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  />
                  <span>
                    {currentBill.paymentMethod === 'gpay'
                      ? (isTamil ? 'ஜிபே (GPay)' : 'GPAY / UPI')
                      : currentBill.paymentMethod === 'credit'
                      ? (isTamil ? 'கடன் (Credit)' : 'CREDIT')
                      : (isTamil ? 'கையில் ரொக்கம்' : 'CASH')}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between text-sm sm:text-base text-slate-800 pt-0.5">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <strong>{currentBill.date}</strong>
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <strong>{currentBill.time}</strong>
                </span>
              </div>
            </div>

            {/* Line Items Table with Big Bold Text */}
            <div className="space-y-3 pt-1 w-full">
              <div className="grid grid-cols-12 text-sm sm:text-base font-black uppercase border-y-2 border-slate-900 py-2.5 text-slate-900">
                <span className="col-span-6">{t('items')}</span>
                <span className="col-span-3 text-center">{isTamil ? 'விலை' : 'Rate'}</span>
                <span className="col-span-3 text-right">{t('total')}</span>
              </div>

              <div className="grid grid-cols-12 items-center py-4 border-b-2 border-dashed border-slate-300">
                <div className="col-span-6 min-w-0 pr-2">
                  <div className="text-xl sm:text-2xl font-black text-slate-950 leading-snug">
                    {taraCount > 0
                      ? `${taraCount} ${isTamil ? 'தாரா' : 'Tara'}${looseEggs > 0 ? ` + ${looseEggs}` : ''}`
                      : `${currentBill.eggQuantity} ${t('eggs')}`}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-600 font-sans mt-0.5">
                    ({currentBill.eggQuantity} {isTamil ? 'முட்டைகள்' : 'Eggs'})
                  </div>
                </div>

                <div className="col-span-3 text-center font-mono font-black text-lg sm:text-xl text-slate-900">
                  ₹{ratePer30}
                  <span className="text-xs block text-slate-500 font-sans font-bold">/tara</span>
                </div>

                <div className="col-span-3 text-right font-mono font-black text-2xl sm:text-3xl text-slate-950">
                  ₹{roundedAmount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Grand Total - Huge, High Contrast Display */}
            <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl flex items-center justify-between gap-4 border-2 border-slate-900 w-full">
              <div className="min-w-0">
                <span className="text-sm sm:text-base uppercase font-black tracking-wider text-slate-300 block">
                  {t('netTotal')}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-400 block font-sans mt-0.5">
                  {isTamil ? 'மொத்த பில் தொகை' : 'Total Bill Amount'}
                </span>
              </div>
              <div className="text-4xl sm:text-6xl font-black font-mono text-emerald-400 tracking-tight shrink-0">
                ₹{roundedAmount.toLocaleString('en-IN')}
              </div>
            </div>

            {/* UPI QR Payment Box - Big & Crisp Scanner */}
            <div className="bg-slate-50 border-2 border-slate-400 rounded-3xl p-6 text-center space-y-4 shadow-sm w-full">
              <div className="text-sm sm:text-lg font-black text-slate-950 uppercase tracking-wide flex items-center justify-center gap-2">
                <span>{isTamil ? 'UPI மூலம் பணம் செலுத்த ஸ்கேன் செய்க' : 'Scan to Pay via UPI (GPay / PhonePe / Paytm)'}</span>
              </div>
              <div className="w-56 h-56 sm:w-72 sm:h-72 mx-auto bg-white p-3.5 border-3 border-slate-900 rounded-3xl shadow-md flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="UPI Payment QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs font-bold text-slate-400">Loading QR...</div>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="text-base sm:text-lg font-mono font-black text-slate-950">
                  UPI ID: <strong className="text-blue-900">{upiId}</strong>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-700">
                  Google Pay • PhonePe • Paytm • BHIM • Any UPI App
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-dashed border-slate-800 pt-4 text-center space-y-1 w-full">
              <p className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wider">
                {isTamil ? 'நன்றி! மீண்டும் வருக!' : 'Thank You! Visit Again'}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-600 font-sans">
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
              {/* Optional WhatsApp Customer Number Input */}
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 text-xs">
                <span className="font-bold text-emerald-950 whitespace-nowrap flex items-center gap-1.5">
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600 fill-current" />
                  <span>{isTamil ? 'வாட்ஸ்அப் எண்:' : 'WhatsApp No:'}</span>
                </span>
                <span className="text-emerald-700 font-mono font-bold">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={isTamil ? 'மொபைல் எண் (விரும்பினால்)' : 'Customer 10-digit mobile (optional)'}
                  className="flex-1 bg-transparent border-0 outline-none font-mono font-bold text-slate-900 placeholder:text-emerald-700/60 text-xs"
                />
                {recipientPhone && (
                  <button
                    type="button"
                    onClick={() => setRecipientPhone('')}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* WhatsApp PDF Sending Button (Target Element) */}
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={sharingWhatsApp || printing}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa51] text-white font-black py-4 px-5 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 active:scale-98 transition-all text-sm sm:text-base uppercase tracking-wider cursor-pointer border border-emerald-500"
              >
                <WhatsAppIcon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 fill-white" />
                <span>
                  {sharingWhatsApp
                    ? isDraft
                      ? (isTamil ? 'சேமித்து வாட்ஸ்அப்பில் அனுப்புகிறது...' : 'Saving & Sending to WhatsApp...')
                      : (isTamil ? 'வாட்ஸ்அப்பில் அனுப்புகிறது...' : 'Sending PDF to WhatsApp...')
                    : isDraft
                    ? (isTamil ? 'பில் உறுதி செய்து WhatsApp-ல் PDF அனுப்ப' : 'Confirm & Send Bill PDF in WhatsApp')
                    : (isTamil ? 'வாட்ஸ்அப்பில் PDF பில் அனுப்ப (Send WhatsApp PDF)' : 'Send Bill PDF in WhatsApp')}
                </span>
              </button>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={printing || sharingWhatsApp}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md active:scale-98 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>{printing ? t('printing') : (isTamil ? 'பிரிண்ட்' : 'Print')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs border border-slate-300 active:scale-98 transition-all cursor-pointer shadow-2xs"
                >
                  <Download className="w-4 h-4 text-slate-700" />
                  <span>{isTamil ? 'PDF பதிவிறக்க' : 'Download PDF'}</span>
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
