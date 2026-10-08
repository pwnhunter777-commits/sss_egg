import React, { useState, useEffect, useCallback } from 'react';
import { AgencySettings } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { playPrintClickSound } from '../lib/soundNotification';
import { Lock, LogOut, X, Delete, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  role: 'owner' | 'employee';
  settings: AgencySettings;
  onConfirmLogout: () => void;
  onClose: () => void;
}

export const LogoutPinModal: React.FC<Props> = ({
  role,
  settings,
  onConfirmLogout,
  onClose,
}) => {
  const { isTamil } = useLanguage();
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const expectedPin =
    role === 'owner' ? settings.ownerPin || '8888' : settings.employeePin || '1234';

  const verifyPin = useCallback(
    (enteredPin: string) => {
      // For employee role, allow either employee PIN or master owner PIN
      const isValid =
        role === 'owner'
          ? enteredPin === (settings.ownerPin || '8888')
          : enteredPin === (settings.employeePin || '1234') ||
            enteredPin === (settings.ownerPin || '8888');

      if (isValid) {
        setIsSuccess(true);
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(60);
        }
        setTimeout(() => {
          onConfirmLogout();
        }, 350);
      } else {
        setIsShaking(true);
        setErrorMsg(
          isTamil
            ? 'தவறான PIN! வெளியேற சரியான PIN உள்ளிடவும்.'
            : 'Incorrect PIN! Please enter your valid login PIN to logout.'
        );
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        setTimeout(() => {
          setIsShaking(false);
          setPin('');
        }, 700);
      }
    },
    [role, settings, isTamil, onConfirmLogout]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (isSuccess) return;
      if (pin.length >= 4) return;
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg(null);
      playPrintClickSound();

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    },
    [pin, isSuccess, verifyPin]
  );

  const handleBackspace = useCallback(() => {
    if (isSuccess) return;
    if (pin.length > 0) {
      setPin((prev) => prev.slice(0, -1));
      setErrorMsg(null);
      playPrintClickSound();
    }
  }, [isSuccess]);

  const handleClear = useCallback(() => {
    if (isSuccess) return;
    setPin('');
    setErrorMsg(null);
  }, [isSuccess]);

  // Support physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, onClose]);

  const roleLabel =
    role === 'owner'
      ? isTamil
        ? 'உரிமையாளர்'
        : 'OWNER'
      : isTamil
      ? 'பணியாளர்'
      : 'STAFF';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border-2 border-slate-700 text-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Top Bar */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-300">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-tight text-white">
                {isTamil ? 'வெளியேறுவதை உறுதிப்படுத்தவும்' : 'Confirm Logout'}
              </h3>
              <p className="text-xs text-blue-200 font-bold">
                {roleLabel} {isTamil ? 'கணக்கு' : 'Account'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col items-center space-y-4">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 border border-white/15 mb-1 text-amber-300">
              <Lock className="w-6 h-6" />
            </div>
            <p className="text-sm font-black text-slate-200">
              {role === 'owner'
                ? isTamil
                  ? 'வெளியேற உரிமையாளர் PIN-ஐ உள்ளிடவும்'
                  : 'Enter Owner PIN to logout'
                : isTamil
                ? 'வெளியேற பணியாளர் PIN-ஐ உள்ளிடவும்'
                : 'Enter Staff PIN to logout'}
            </p>
            <p className="text-xs font-bold text-slate-400">
              {isTamil
                ? 'பாதுகாப்பிற்காக உள்நுழைவு PIN தேவைப்படுகிறது'
                : 'Login PIN is required to authorize logout'}
            </p>
          </div>

          {/* 4 PIN Dots */}
          <div className="py-2">
            <div
              className={`flex justify-center items-center gap-5 transition-transform duration-100 ${
                isShaking ? 'translate-x-2 -translate-x-2' : ''
              }`}
            >
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      isSuccess
                        ? 'bg-emerald-400 scale-125 shadow-[0_0_14px_rgba(52,211,153,0.9)]'
                        : isFilled
                        ? 'bg-amber-400 scale-125 shadow-[0_0_14px_rgba(251,191,36,0.9)]'
                        : 'bg-white/15 border-2 border-white/40'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <div className="mt-3 text-xs text-rose-300 font-bold flex items-center justify-center gap-1.5 bg-rose-500/20 py-1.5 px-3 rounded-xl border border-rose-500/30 animate-in fade-in text-center max-w-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isSuccess && (
              <div className="mt-3 text-xs text-emerald-300 font-black flex items-center justify-center gap-1.5 bg-emerald-500/20 py-1.5 px-3 rounded-xl border border-emerald-500/30 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{isTamil ? 'வெளியேறுகிறது...' : 'Logging out...'}</span>
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={isSuccess}
                className="h-13 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-black text-2xl flex items-center justify-center backdrop-blur-md border border-white/15 transition-all active:scale-95 shadow-sm"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              disabled={isSuccess}
              className="h-13 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/25 text-blue-200 font-black text-xs tracking-wider flex items-center justify-center border border-white/10 active:scale-95 transition-all uppercase"
            >
              CLEAR
            </button>

            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={isSuccess}
              className="h-13 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-black text-2xl flex items-center justify-center backdrop-blur-md border border-white/15 active:scale-95 transition-all shadow-sm"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              disabled={isSuccess}
              className="h-13 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/25 text-rose-300 flex items-center justify-center border border-white/10 active:scale-95 transition-all"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {/* Cancel button */}
          <div className="w-full pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700"
            >
              {isTamil ? 'ரத்து செய்' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
