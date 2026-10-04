import React, { useState } from 'react';
import { Bill } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { EggAgencyService } from '../services/eggAgencyService';
import { Trash2, X, Send, CheckCircle2 } from 'lucide-react';

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

    try {
      const updated = await EggAgencyService.requestBillDelete(
        bill.billId,
        employeeName || 'Staff',
        ''
      );
      if (updated) {
        setIsSuccess(true);
        setTimeout(() => {
          onRequestSubmitted(updated);
          onClose();
        }, 1200);
      } else {
        setError('Failed to submit delete request. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while sending the request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3.5 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-rose-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
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
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-slate-800">
              {isTamil ? 'கோரிக்கை அனுப்பப்பட்டது!' : 'Request Sent to Owner!'}
            </h4>
            <p className="text-xs font-bold text-slate-600">
              {t('deleteRequestSent')}
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
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? '...' : t('sendDeleteRequest')}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
