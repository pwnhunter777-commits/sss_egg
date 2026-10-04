import React, { useState } from 'react';
import { Bill } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { EggAgencyService } from '../services/eggAgencyService';
import { playDeleteAlertSound } from '../lib/soundNotification';
import { Trash2, X, Send, CheckCircle2, BellRing } from 'lucide-react';

interface Props {
  bill: Bill;
  employeeName: string;
  onClose: () => void;
  onRequestSubmitted: (updatedBill: Bill) => void;
}

export const RequestDeleteModal: React.FC<Props> = ({
  bill,
  employeeName,
  onClose,
  onRequestSubmitted,
}) => {
  const { t, isTamil } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // 1. Play the distinctive delete alert notification sound immediately
    playDeleteAlertSound();

    try {
      // 2. Submit delete request directly to database & local storage (notifies Owner in real-time)
      const updated = await EggAgencyService.requestBillDelete(
        bill.billId,
        employeeName || 'Staff',
        '',
        bill
      );

      if (updated) {
        setIsSuccess(true);
        setTimeout(() => {
          onRequestSubmitted(updated);
          onClose();
        }, 1500);
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
          <div className="p-7 text-center space-y-3.5 animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900">
                {isTamil ? 'நீக்குதல் கோரிக்கை அனுப்பப்பட்டது!' : 'Delete Request Sent to Owner!'}
              </h4>
              <p className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                <span>
                  {isTamil
                    ? 'உரிமையாளர் தளத்திற்கு ஒலி எச்சரிக்கையுடன் கோரிக்கை சென்றுள்ளது.'
                    : 'Alert notification dispatched to Owner Portal with sound alert.'}
                </span>
              </p>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              {isTamil ? 'தானாக மூடப்படுகிறது...' : 'Closing...'}
            </p>
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

            {/* In-App Notification alert note */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-2.5 flex items-center gap-2 text-rose-900 text-xs font-bold">
              <BellRing className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
              <span>
                {isTamil
                  ? 'உரிமையாளர் தளத்திற்கு பிரத்யேக எச்சரிக்கை ஒலியுடன் நேரடி கோரிக்கை அனுப்பப்படும்.'
                  : 'Sends an immediate alert request with notification sound to the Owner Portal.'}
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
                    : (isTamil ? 'உரிமையாளருக்கு அனுப்பு' : 'Send Request to Owner')}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
