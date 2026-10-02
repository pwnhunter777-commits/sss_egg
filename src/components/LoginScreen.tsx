import React, { useState } from 'react';
import { UserRole, AgencySettings } from '../types';
import { playPrintClickSound } from '../lib/soundNotification';
import { Delete, KeyRound, AlertTriangle, Egg } from 'lucide-react';

interface Props {
  settings: AgencySettings;
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginScreen: React.FC<Props> = ({ settings, onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<'owner' | 'employee'>('owner');
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg(null);
    playPrintClickSound();

    if (newPin.length === 4) {
      verifyPin(newPin);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg(null);
      playPrintClickSound();
    }
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  const verifyPin = (enteredPin: string) => {
    const expectedPin =
      selectedRole === 'owner' ? settings.ownerPin || '8888' : settings.employeePin || '1234';

    if (enteredPin === expectedPin) {
      // Success
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(60);
      }
      onLoginSuccess(selectedRole);
    } else {
      // Error
      setIsShaking(true);
      setErrorMsg(`Incorrect ${selectedRole === 'owner' ? 'Owner' : 'Employee'} PIN!`);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 700);
    }
  };

  const handleRoleSwitch = (role: 'owner' | 'employee') => {
    setSelectedRole(role);
    setPin('');
    setErrorMsg(null);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 md:p-8 bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900 text-white select-none min-h-[90vh]">
      {/* Top Branding Section */}
      <div className="text-center pt-4 space-y-3">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl mb-1">
          <Egg className="w-12 h-12 text-amber-300 drop-shadow-md" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase text-white drop-shadow-md">
            {settings.agencyName || 'SSS EGG AGENCY'}
          </h1>
        </div>
      </div>

      {/* Role Selection Tabs */}
      <div className="bg-blue-950/80 p-2 rounded-2xl border border-white/15 backdrop-blur-md grid grid-cols-2 gap-2 shadow-2xl max-w-sm mx-auto w-full">
        <button
          type="button"
          onClick={() => handleRoleSwitch('owner')}
          className={`py-3.5 px-6 rounded-xl font-black text-base md:text-lg flex items-center justify-center transition-all ${
            selectedRole === 'owner'
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 scale-[1.03]'
              : 'text-blue-200 hover:text-white hover:bg-white/10'
          }`}
        >
          <span>OWNER</span>
        </button>

        <button
          type="button"
          onClick={() => handleRoleSwitch('employee')}
          className={`py-3.5 px-6 rounded-xl font-black text-base md:text-lg flex items-center justify-center transition-all ${
            selectedRole === 'employee'
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40 scale-[1.03]'
              : 'text-blue-200 hover:text-white hover:bg-white/10'
          }`}
        >
          <span>EMPLOYEE</span>
        </button>
      </div>

      {/* PIN Dots Area */}
      <div className="text-center space-y-4 py-3">
        <div className="flex items-center justify-center gap-2 text-sm md:text-base text-blue-100 font-extrabold">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>Enter {selectedRole === 'owner' ? 'Owner' : 'Employee'} 4-Digit PIN</span>
        </div>

        {/* 4 PIN Dots */}
        <div
          className={`flex justify-center items-center gap-6 transition-transform duration-100 ${
            isShaking ? 'translate-x-2 -translate-x-2' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-5 h-5 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-amber-400 scale-125 shadow-[0_0_16px_rgba(251,191,36,0.9)]'
                    : 'bg-white/20 border-2 border-white/50'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div className="text-sm text-rose-300 font-bold flex items-center justify-center gap-2 bg-rose-500/25 py-2 px-4 rounded-xl border border-rose-500/40 animate-in fade-in max-w-xs mx-auto">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-sm mx-auto w-full pb-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-16 md:h-20 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-black text-3xl md:text-4xl flex items-center justify-center backdrop-blur-md border border-white/15 transition-all active:scale-95 shadow-md"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          className="h-16 md:h-20 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/25 text-blue-200 font-black text-sm md:text-base tracking-wider flex items-center justify-center border border-white/10 active:scale-95 transition-all"
        >
          CLEAR
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-16 md:h-20 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-black text-3xl md:text-4xl flex items-center justify-center backdrop-blur-md border border-white/15 active:scale-95 transition-all shadow-md"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          className="h-16 md:h-20 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/25 text-rose-300 flex items-center justify-center border border-white/10 active:scale-95 transition-all"
        >
          <Delete className="w-7 h-7 md:w-8 md:h-8" />
        </button>
      </div>
    </div>
  );
};
