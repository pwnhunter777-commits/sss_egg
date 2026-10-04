import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, Translations, getSavedLanguage, saveLanguage } from '../lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof Translations, params?: Record<string, string | number>) => string;
  isTamil: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getSavedLanguage);

  useEffect(() => {
    saveLanguage(language);
    // Also set document lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      if (language === 'ta') {
        document.documentElement.classList.add('lang-ta');
        document.body.classList.add('lang-ta');
        document.documentElement.classList.remove('lang-en');
        document.body.classList.remove('lang-en');
      } else {
        document.documentElement.classList.remove('lang-ta');
        document.body.classList.remove('lang-ta');
        document.documentElement.classList.add('lang-en');
        document.body.classList.add('lang-en');
      }
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveLanguage(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => {
      const next = prev === 'en' ? 'ta' : 'en';
      saveLanguage(next);
      return next;
    });
  };

  const t = (key: keyof Translations, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || translations['en'][key] || String(key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isTamil: language === 'ta',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
