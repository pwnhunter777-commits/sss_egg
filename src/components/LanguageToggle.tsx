import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Languages } from 'lucide-react';
import { playPrintClickSound } from '../lib/soundNotification';

interface Props {
  variant?: 'light' | 'dark' | 'header';
  className?: string;
}

export const LanguageToggle: React.FC<Props> = ({ variant = 'light', className = '' }) => {
  const { language, toggleLanguage, setLanguage } = useLanguage();

  const handleToggle = () => {
    playPrintClickSound();
    toggleLanguage();
  };

  if (variant === 'dark') {
    return (
      <div
        className={`inline-flex items-center bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/20 shadow-md ${className}`}
      >
        <button
          type="button"
          onClick={() => {
            playPrintClickSound();
            setLanguage('en');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-black transition-all ${
            language === 'en'
              ? 'bg-white text-blue-900 shadow-md scale-102'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => {
            playPrintClickSound();
            setLanguage('ta');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-black transition-all ${
            language === 'ta'
              ? 'bg-amber-400 text-slate-900 shadow-md scale-105 font-black text-sm md:text-base'
              : 'text-white/90 hover:text-white hover:bg-white/10 font-bold'
          }`}
        >
          தமிழ்
        </button>
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-black text-xs transition-all active:scale-95 ${
          language === 'ta'
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : 'bg-blue-100 text-blue-900 border-blue-200'
        } ${className}`}
        title="Change Language / மொழியை மாற்றுக"
      >
        <Languages className="w-3.5 h-3.5" />
        <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
      </button>
    );
  }

  // Default light pill
  return (
    <div
      className={`inline-flex items-center bg-slate-200/80 rounded-2xl p-1 border border-slate-300 shadow-inner ${className}`}
    >
      <button
        type="button"
        onClick={() => {
          playPrintClickSound();
          setLanguage('en');
        }}
        className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-black transition-all ${
          language === 'en'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => {
          playPrintClickSound();
          setLanguage('ta');
        }}
        className={`px-3 py-1.5 rounded-xl text-xs md:text-sm font-black transition-all ${
          language === 'ta'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        தமிழ்
      </button>
    </div>
  );
};
