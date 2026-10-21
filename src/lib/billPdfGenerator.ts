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
  // Enhanced receipt format with generous width & clear readability: 115mm x 175mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [115, 175],
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
  doc.rect(0, 0, 115, 175, 'F');

  // Top Header Banner (Dark Royal Blue)
  doc.setFillColor(30, 58, 138); // blue-900
  doc.rect(0, 0, 115, 30, 'F');

  // Header Title - Large & Bold
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(agencyName.toUpperCase(), 57.5, 11, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('WHOLESALE EGG DEALER & DISTRIBUTION', 57.5, 17, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Phone: ${settings.phone || '+91 98765 43210'}`, 57.5, 23, { align: 'center' });

  // Bill Metadata Section
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(6, 34, 103, 20, 2, 2, 'F');

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`INVOICE: #${billNumber}`, 10, 41);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Date: ${bill.date}`, 10, 47);
  doc.text(`Time: ${bill.time}`, 10, 51.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`Payment:`, 58, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text(`CASH SALE`, 58, 47);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Staff: ${bill.employeeName || 'Staff'}`, 58, 51.5);

  // --- Table Header ---
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(6, 57, 103, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('ITEM DESCRIPTION', 10, 62.5);
  doc.text('TARA (30)', 54, 62.5, { align: 'center' });
  doc.text('RATE', 78, 62.5, { align: 'center' });
  doc.text('AMOUNT', 105, 62.5, { align: 'right' });

  // --- Table Row ---
  doc.setFillColor(255, 255, 255);
  doc.rect(6, 65, 103, 16, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(6, 81, 109, 81);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Fresh Farm Eggs', 10, 71.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`(${bill.eggQuantity} Eggs total)`, 10, 77);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    taraCount > 0
      ? `${taraCount} Tara${looseCount > 0 ? ` + ${looseCount}` : ''}`
      : `${bill.eggQuantity} Eggs`,
    54,
    73.5,
    { align: 'center' }
  );

  doc.setFontSize(11.5);
  doc.text(`Rs. ${ratePer30}`, 78, 73.5, {
    align: 'center',
  });

  doc.setFontSize(12.5);
  doc.text(`Rs. ${roundedTotal}`, 105, 73.5, { align: 'right' });

  // --- Grand Total Box (Large & High Contrast) ---
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(79, 70, 229); // indigo-600
  doc.roundedRect(6, 85, 103, 19, 2, 2, 'FD');

  doc.setTextColor(67, 56, 202); // indigo-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL AMOUNT PAYABLE:', 10, 96.5);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(`Rs. ${roundedTotal}`, 105, 98, { align: 'right' });

  // --- Payment UPI Section with QR Code ---
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(6, 108, 103, 48, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('SCAN TO PAY VIA UPI (GPay / PhonePe / Paytm):', 10, 115);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`UPI ID: ${upiId}`, 10, 122);
  doc.text(`Payee: ${agencyName}`, 10, 128);
  doc.text(`Bill Ref: #${billNumber}`, 10, 134);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text(`Amount: Rs. ${roundedTotal}`, 10, 140);

  // Generate UPI QR code for the exact bill amount
  try {
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(agencyName)}&am=${roundedTotal}&cu=INR&tn=${encodeURIComponent('Bill#' + billNumber)}`;
    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      width: 160,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
    // Add larger QR Code image to PDF at (74, 117) with 31mm x 31mm size
    doc.addImage(qrDataUrl, 'PNG', 72, 117, 32, 32);
  } catch (qrErr) {
    console.warn('Failed to render QR in PDF', qrErr);
  }

  // Footer notes
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Thank you for your business! Fresh & Quality Eggs.', 57.5, 163, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Generated by SSS Egg Agency Billing • ${bill.date}`, 57.5, 168, {
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
