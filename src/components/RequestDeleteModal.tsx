import React, { useState } from 'react';
import { Bill } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { EggAgencyService } from '../services/eggAgencyService';
import { playDeleteAlertSound } from '../lib/soundNotification';
import { getLocalSettings } from '../lib/offlineStorage';
import { Trash2, X, Send, CheckCircle2, MessageSquare, BellRing } from 'lucide-react';

interface Props {
  bill: Bill;
  employeeName: string;
  ownerPhone?: string;
  agencyName?: string;
  onClose: () => void;
  onRequestSubmitted: (updatedBill: Bill) => void;
}

export const RequestDeleteModal: React.FC<Props> = ({
  bill,
  employeeName,
  ownerPhone,
  agencyName,
  onClose,
  onRequestSubmitted,
}) => {
  const { t, isTamil } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [updatedBillState, setUpdatedBillState] = useState<Bill | null>(null);

  // Derive phone and agency name
  const localSettings = getLocalSettings();
  const effectivePhone = ownerPhone || localSettings.phone || '';
  const effectiveAgency = agencyName || localSettings.agencyName || 'SSS EGG AGENCY';

  const cleanPhone = effectivePhone.replace(/[^0-9]/g, '');
  const intlPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

  // Format the direct alert message for the Owner
  const messageText = `🚨 *${effectiveAgency} - BILL DELETE REQUEST*\n` +
    `📋 *Bill No:* #${bill.billNumber}\n` +
    `🥚 *Eggs Quantity:* ${bill.eggQuantity} Eggs\n` +
    `💰 *Total Amount:* ₹${Math.round(bill.totalAmount)}\n` +
    `⏰ *Time:* ${bill.time} (${bill.date})\n` +
    `👤 *Staff:* ${employeeName || 'Staff'}\n\n` +
    `⚠️ *Action:* Staff requested to delete this bill. Please review and approve/reject in Owner Portal.`;

  const waLink = intlPhone
    ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  const smsLink = cleanPhone
    ? `sms:${cleanPhone}?body=${encodeURIComponent(messageText)}`
    : `sms:?body=${encodeURIComponent(messageText)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // 1. Play the distinctive delete alert notification sound immediately!
    playDeleteAlertSound();

    try {
      // 2. Submit delete request in database & local storage (triggers Owner alert)
      const updated = await EggAgencyService.requestBillDelete(
        bill.billId,
        employeeName || 'Staff',
        '',
        bill
      );

      if (updated) {
        setUpdatedBillState(updated);
        setIsSuccess(true);

        // 3. Automatically attempt to dispatch message to the Owner via WhatsApp
        try {
          window.open(waLink, '_blank');
        } catch {
          // Popup blocked, user can still use direct buttons on the success screen
        }
      } else {
        setError('Failed to submit delete request. Please try again.');
      }
    } catch {
      setError('An error occurred while sending the request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3.5 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-700 to-rose-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-tight">
                {t('requestDeleteTitle')}
              </h3>
              <p className="text-xs text-rose-100 font-bold">
                {t('billNo')} #{bill.billNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900">
                {isTamil ? 'நீக்குதல் கோரிக்கை அனுப்பப்பட்டது!' : 'Request & Alert Sent to Owner!'}
              </h4>
              <p className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                <span>
                  {isTamil
                    ? 'உரிமையாளருக்கு பிரத்யேக ஒலி எச்சரிக்கையுடன் அறிவிக்கப்பட்டது.'
                    : 'Dispatched to Owner Portal with distinctive warning sound.'}
                </span>
              </p>
            </div>

            {/* Direct Message to Owner Card */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 space-y-2.5 text-left">
              <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                <span>{isTamil ? 'உரிமையாளருக்கு தகவல் அனுப்ப' : 'Message Owner Directly'}</span>
                {effectivePhone && (
                  <span className="font-mono text-slate-700 font-bold">{effectivePhone}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={smsLink}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span>SMS</span>
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (updatedBillState) onRequestSubmitted(updatedBillState);
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
            >
              {t('done')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
            {/* Bill Summary Card */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 space-y-2 font-mono">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                <span>{t('billNo')}</span>
                <span className="font-black text-blue-900 text-sm">#{bill.billNumber}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>{t('eggQuantity')}</span>
                <span className="font-black">{bill.eggQuantity} {t('eggs')}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>{t('time')}</span>
                <span className="font-bold">{bill.time}</span>
              </div>
              <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                <span>{t('total')}</span>
                <span className="text-base text-blue-950 font-black">₹{Math.round(bill.totalAmount)}</span>
              </div>
            </div>

            {/* Sound alert note */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-2.5 flex items-center gap-2 text-rose-900 text-xs font-bold">
              <BellRing className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
              <span>
                {isTamil
                  ? 'உரிமையாளருக்கு நேரடி மெசேஜ் மற்றும் பிரத்யேக எச்சரிக்கை ஒலி அனுப்பப்படும்.'
                  : 'Sends direct message to Owner with a distinct warning notification sound.'}
              </span>
            </div>

            {error && (
              <div className="text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-2.5 px-3 rounded-xl border-2 border-slate-300 text-slate-700 font-black text-xs uppercase hover:bg-slate-100 transition-all active:scale-95"
              >
                {t('cancel')}
              </button>

              {/* Submit button targeted by the user */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 hover:from-rose-700 hover:to-rose-900 text-white font-black text-xs uppercase shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 ring-2 ring-rose-400/50"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isSubmitting
                    ? '...'
                    : (isTamil ? 'கோரிக்கை & தகவல் அனுப்பு' : 'Send Request to Owner')}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
