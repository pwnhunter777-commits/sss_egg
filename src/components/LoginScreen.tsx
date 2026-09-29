import React, { useState } from 'react';
import { UserRole, AgencySettings } from '../types';
import { playPrintClickSound } from '../lib/soundNotification';
import { Shield, UserCheck, Delete, KeyRound, AlertTriangle, Egg } from 'lucide-react';

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

  const quickFillDefault = () => {
    const defaultPin = selectedRole === 'owner' ? settings.ownerPin || '8888' : settings.employeePin || '1234';
    setPin(defaultPin);
    verifyPin(defaultPin);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900 text-white select-none">
      {/* Top Branding Section */}
      <div className="text-center pt-2 space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl mb-1">
          <Egg className="w-10 h-10 text-amber-300 drop-shadow" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase text-white drop-shadow-sm">
            {settings.agencyName || 'SSS EGG AGENCY'}
          </h1>
          <p className="text-xs text-blue-200 font-medium">Billing & Stock Management System</p>
        </div>
      </div>

      {/* Role Selection Tabs */}
      <div className="bg-blue-950/70 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm grid grid-cols-2 gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => handleRoleSwitch('owner')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            selectedRole === 'owner'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
              : 'text-blue-200 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-4 h-4 text-amber-300" />
          <span>OWNER</span>
        </button>

        <button
          type="button"
          onClick={() => handleRoleSwitch('employee')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            selectedRole === 'employee'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
              : 'text-blue-200 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-300" />
          <span>EMPLOYEE</span>
        </button>
      </div>

      {/* PIN Dots Area */}
      <div className="text-center space-y-3 py-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-blue-200 font-medium">
          <KeyRound className="w-3.5 h-3.5" />
          <span>Enter {selectedRole === 'owner' ? 'Owner' : 'Employee'} 4-Digit PIN</span>
        </div>

        {/* 4 PIN Dots */}
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
                  isFilled
                    ? 'bg-amber-400 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                    : 'bg-white/20 border-2 border-white/40'
                }`}
              />
            );
          })}
        </div>

        {errorMsg ? (
          <div className="text-xs text-rose-300 font-semibold flex items-center justify-center gap-1.5 bg-rose-500/20 py-1.5 px-3 rounded-lg border border-rose-500/30 animate-in fade-in">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="text-[11px] text-blue-300/80">
            {selectedRole === 'owner' ? 'Full administrative access' : 'Fast billing & printing access only'}
          </div>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 transition-all active:scale-95 shadow-sm"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={handleClear}
          className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/25 text-blue-300 font-semibold text-xs flex items-center justify-center border border-white/5 active:scale-95 transition-all"
        >
          CLEAR
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 active:scale-95 transition-all shadow-sm"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:bg-white/25 text-rose-300 flex items-center justify-center border border-white/5 active:scale-95 transition-all"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {/* Quick Testing PIN Helper Hint */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={quickFillDefault}
          className="text-[11px] text-blue-300/90 hover:text-white bg-blue-950/60 px-3 py-1.5 rounded-full border border-blue-400/20 transition-all"
        >
          🔑 Quick Login: Tap to enter default PIN (
          <span className="font-mono text-amber-300 font-bold">
            {selectedRole === 'owner' ? settings.ownerPin || '8888' : settings.employeePin || '1234'}
          </span>
          )
        </button>
      </div>
    </div>
  );
};
