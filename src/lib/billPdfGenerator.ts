import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Bill, AgencySettings } from '../types';

export function formatCleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return '91' + digits;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length > 10) {
    return digits;
  }
  return digits;
}

/**
 * Generates a clean, professional PDF invoice for the egg bill.
 */
export async function generateBillPdf(
  bill: Bill,
  settings: AgencySettings,
  customerName: string = 'Shopkeeper',
  customerPhone: string = ''
): Promise<{ doc: jsPDF; fileName: string }> {
  // Enhanced full bill receipt format with generous width & height: 130mm x 225mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [130, 225],
  });

  const agencyName = settings.agencyName || 'SSS EGG AGENCY';
  const billNumber = bill.billNumber || 1001;
  const taraCount = Math.floor(bill.eggQuantity / 30);
  const looseCount = bill.eggQuantity % 30;
  const roundedTotal = Math.round(bill.totalAmount);
  const ratePer30 = bill.pricePer30Eggs || Math.round(bill.pricePerEgg * 30);
  const upiId = settings.upiId || 'nazirahamed0003@okhdfcbank';

  // --- Background Canvas ---
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 130, 225, 'F');

  // Top Header Banner (Dark Royal Blue)
  doc.setFillColor(30, 58, 138); // blue-900
  doc.rect(0, 0, 130, 32, 'F');

  // Header Title - Large & Bold
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(agencyName.toUpperCase(), 65, 12, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('WHOLESALE EGG DEALER & DISTRIBUTION', 65, 19, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Phone: ${settings.phone || '+91 98765 43210'}`, 65, 26, { align: 'center' });

  // Bill Metadata Section
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(8, 36, 114, 22, 2, 2, 'F');

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`INVOICE: #${billNumber}`, 12, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Date: ${bill.date}`, 12, 50.5);
  doc.text(`Time: ${bill.time}`, 12, 55);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Payment:`, 68, 44);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  if (bill.paymentMethod === 'gpay') {
    doc.setTextColor(29, 78, 216); // blue-700
    doc.text(`GPAY / UPI`, 68, 50.5);
  } else if (bill.paymentMethod === 'credit') {
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`CREDIT (DUE)`, 68, 50.5);
  } else {
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text(`CASH SALE`, 68, 50.5);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Staff: ${bill.employeeName || 'Staff'}`, 68, 55);

  // --- Table Header ---
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(8, 62, 114, 9, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ITEM DESCRIPTION', 12, 68);
  doc.text('TARA (30)', 60, 68, { align: 'center' });
  doc.text('RATE', 86, 68, { align: 'center' });
  doc.text('AMOUNT', 118, 68, { align: 'right' });

  // --- Table Row ---
  doc.setFillColor(255, 255, 255);
  doc.rect(8, 71, 114, 17, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(8, 88, 122, 88);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('Fresh Farm Eggs', 12, 78);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`(${bill.eggQuantity} Eggs total)`, 12, 84);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(
    taraCount > 0
      ? `${taraCount} Tara${looseCount > 0 ? ` + ${looseCount}` : ''}`
      : `${bill.eggQuantity} Eggs`,
    60,
    80,
    { align: 'center' }
  );

  doc.setFontSize(12);
  doc.text(`Rs. ${ratePer30}`, 86, 80, {
    align: 'center',
  });

  doc.setFontSize(13);
  doc.text(`Rs. ${roundedTotal}`, 118, 80, { align: 'right' });

  // --- Grand Total Box (Large & High Contrast) ---
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(79, 70, 229); // indigo-600
  doc.roundedRect(8, 92, 114, 21, 2, 2, 'FD');

  doc.setTextColor(67, 56, 202); // indigo-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('TOTAL AMOUNT PAYABLE:', 13, 104);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(`Rs. ${roundedTotal}`, 118, 105.5, { align: 'right' });

  // --- Payment UPI Section with Prominent Scanner ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(8, 118, 114, 76, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('SCAN TO PAY VIA UPI (GPay / PhonePe / Paytm):', 12, 126);

  // Left details inside the UPI card
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`UPI ID:`, 12, 134);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${upiId}`, 12, 140);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Payee: ${agencyName}`, 12, 147);
  doc.text(`Invoice: #${billNumber}`, 12, 153);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(4, 120, 87);
  doc.text(`Payable: Rs. ${roundedTotal}`, 12, 161);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Open camera or any UPI app', 12, 172);
  doc.text('Scan QR code to pay bill.', 12, 177);

  // Generate UPI QR code for the exact bill amount (large & high resolution)
  try {
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(agencyName)}&am=${roundedTotal}&cu=INR&tn=${encodeURIComponent('Bill#' + billNumber)}`;
    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });

    // White backing card for QR code with border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(30, 41, 59);
    doc.roundedRect(70, 131, 48, 58, 2, 2, 'FD');

    // Add crisp, large QR Code image to PDF at (72, 133) with 44mm x 44mm size
    doc.addImage(qrDataUrl, 'PNG', 72, 133, 44, 44);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('SCAN & PAY', 94, 183, { align: 'center' });
  } catch (qrErr) {
    console.warn('Failed to render QR in PDF', qrErr);
  }

  // Footer notes - spaced properly without being cut off
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Thank you for your business! Fresh & Quality Eggs.', 65, 206, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Generated by SSS Egg Agency Billing • ${bill.date}`, 65, 212, {
    align: 'center',
  });

  const fileName = `SSS_Egg_Bill_${billNumber}_${bill.date}.pdf`;
  return { doc, fileName };
}

/**
 * Creates a browser File object of the PDF invoice
 */
export async function createBillPdfFile(
  bill: Bill,
  settings: AgencySettings,
  customerName?: string,
  customerPhone?: string
): Promise<File> {
  const { doc, fileName } = await generateBillPdf(
    bill,
    settings,
    customerName,
    customerPhone
  );
  const pdfBlob = doc.output('blob');
  return new File([pdfBlob], fileName, { type: 'application/pdf' });
}

/**
 * Native file sharing (Web Share API) or download fallback without any external chat dependency
 */
export async function shareBillPdf(
  bill: Bill,
  settings: AgencySettings,
  customerName: string = 'Valued Customer',
  customerPhone: string = ''
): Promise<{ success: boolean; method: string; error?: string }> {
  try {
    const pdfFile = await createBillPdfFile(
      bill,
      settings,
      customerName,
      customerPhone
    );

    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [pdfFile] })
    ) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `${settings.agencyName || 'Egg Agency'} Bill #${bill.billNumber}`,
          text: `Invoice #${bill.billNumber} for ${customerName || 'Customer'} - Total: Rs. ${Math.round(bill.totalAmount)}`,
        });
        return { success: true, method: 'native_share' };
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return { success: false, method: 'cancelled', error: 'Share cancelled' };
        }
      }
    }

    // Fallback: Direct PDF download
    const { doc, fileName } = await generateBillPdf(
      bill,
      settings,
      customerName,
      customerPhone
    );
    doc.save(fileName);
    return { success: true, method: 'download' };
  } catch (err: any) {
    console.error('Bill share error', err);
    return { success: false, method: 'error', error: err.message || 'Failed to share' };
  }
}

/**
 * Directly downloads the PDF invoice file
 */
export async function downloadBillPdf(
  bill: Bill,
  settings: AgencySettings,
  customerName?: string,
  customerPhone?: string
): Promise<string> {
  const { doc, fileName } = await generateBillPdf(
    bill,
    settings,
    customerName,
    customerPhone
  );
  doc.save(fileName);
  return fileName;
}
