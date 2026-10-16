import React, { useState, useEffect } from 'react';
import {
  getActiveShopkeeperPhone,
  setActiveShopkeeperPhone,
  getSavedShopkeeperContacts,
  saveShopkeeperContact,
  deleteShopkeeperContact,
} from '../lib/offlineStorage';
import { ShopkeeperContact } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  Store,
  Phone,
  Check,
  X,
  PlusCircle,
  Trash2,
  ShieldCheck,
  Send,
  Search,
  ArrowRight,
  ChevronRight,
  ListFilter,
  Sparkles,
} from 'lucide-react';
import { playPrintClickSound } from '../lib/soundNotification';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPhoneSelected: (phone: string, name?: string) => void;
  billAmount?: number;
  trayCount?: number;
  initialAddNew?: boolean;
}

export const ShopkeeperPhoneModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onPhoneSelected,
  billAmount,
  trayCount,
  initialAddNew = false,
}) => {
  const { isTamil } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shopName, setShopName] = useState('');
  const [contacts, setContacts] = useState<ShopkeeperContact[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      const active = getActiveShopkeeperPhone();
      const list = getSavedShopkeeperContacts();
      setContacts(list);

      // If initialAddNew is explicitly requested or no contacts exist yet, open the add shop form
      if (initialAddNew || list.length === 0) {
        setIsAddingNew(true);
        setPhoneNumber('');
        setShopName('');
      } else {
        setIsAddingNew(false);
        setPhoneNumber('');
        setShopName('');
      }
      setSearchQuery('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialAddNew]);

  if (!isOpen) return null;

  // Save new shop name & phone to phone memory, then send bill directly to that shop!
  const handleSaveAndSend = (e: React.FormEvent) => {
    e.preventDefault();
    playPrintClickSound();
    const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');

    if (!shopName.trim()) {
      setErrorMsg(
        isTamil ? 'கடை பெயரை உள்ளிடவும்' : 'Please enter shop name'
      );
      return;
    }

    if (cleanDigits.length < 10) {
      setErrorMsg(
        isTamil
          ? 'சரியான 10 இலக்க வாட்ஸ்அப் மொபைல் எண்ணை உள்ளிடவும்'
          : 'Please enter a valid 10-digit WhatsApp number'
      );
      return;
    }

    const saved = saveShopkeeperContact(
      shopName.trim(),
      cleanDigits
    );

    setContacts(getSavedShopkeeperContacts());
    setSuccessMsg(
      isTamil
        ? `"${saved.name}" போனில் சேமிக்கப்பட்டது! பில் அனுப்பப்படுகிறது...`
        : `"${saved.name}" saved! Sending bill...`
    );

    setTimeout(() => {
      onPhoneSelected(saved.phone, saved.name);
      onClose();
    }, 400);
  };

  // If employee clicks an already entered shop: send bill directly to that shop!
  const handleSelectShop = (c: ShopkeeperContact) => {
    playPrintClickSound();
    onPhoneSelected(c.phone, c.name);
    onClose();
  };

  const handleDeleteContact = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    deleteShopkeeperContact(phone);
    const updated = getSavedShopkeeperContacts();
    setContacts(updated);
    if (updated.length === 0) {
      setIsAddingNew(true);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in select-none">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-emerald-700 text-white p-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-base uppercase tracking-tight truncate">
                {isTamil ? 'கடைக்கு பில் அனுப்பு (வாட்ஸ்அப் PDF)' : 'Select Shop to Send Bill'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-emerald-800 text-emerald-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Summary Banner if amount provided */}
        {billAmount !== undefined && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-xs font-black text-emerald-950 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-700">{isTamil ? 'பில் தொகை:' : 'Bill Amount:'}</span>
              <span className="text-sm font-mono text-emerald-900 font-black">
                ₹{billAmount.toLocaleString('en-IN')}
              </span>
              {trayCount !== undefined && trayCount > 0 && (
                <span className="text-emerald-600 font-sans">
                  ({trayCount} {isTamil ? 'தாரா' : 'Trays'})
                </span>
              )}
            </div>
            <div className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-700 shrink-0" />
              <span>{isTamil ? 'போன் மெமரி' : 'Phone Only'}</span>
            </div>
          </div>
        )}

        {/* Modal Scroll Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* FORM: ADD A NEW SHOP NAME & PHONE (Shown when key is clicked or no shops exist) */}
          {isAddingNew ? (
            <div className="bg-slate-50 border-2 border-emerald-200 rounded-2xl p-3.5 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <Store className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black uppercase text-slate-800">
                  {isTamil ? 'கடை பெயரை உள்ளிடவும்' : 'Enter Shop Details'}
                </h4>
              </div>

              <form onSubmit={handleSaveAndSend} className="space-y-3">
                {/* 1. Shop Name Input */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 uppercase block">
                    {isTamil ? 'கடை / கடைக்காரர் பெயர் *' : 'Shop / Owner Name *'}
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => {
                        setShopName(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder={isTamil ? 'எ.கா. முருகன் ஸ்டோர் / Annai Store' : 'e.g. Murugan Store'}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-black text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
                      autoFocus
                    />
                  </div>
                </div>

                {/* 2. WhatsApp Number Input */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 uppercase block">
                    {isTamil ? 'வாட்ஸ்அப் மொபைல் எண் *' : 'WhatsApp Phone Number *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                        setPhoneNumber(onlyDigits);
                        setErrorMsg(null);
                      }}
                      placeholder="9876543210"
                      className="w-full bg-white border-2 border-slate-300 rounded-xl pl-12 pr-4 py-2.5 text-base font-black text-slate-900 font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="text-xs font-bold text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200">
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="text-xs font-black text-emerald-800 bg-emerald-100 p-2 rounded-xl flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Save and Send Key */}
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98 transition-all text-xs uppercase tracking-wider"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isTamil
                      ? 'சேமித்து இந்த கடைக்கு பில் அனுப்பு'
                      : 'Save & Send Bill to this Shop'}
                  </span>
                </button>

                {contacts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playPrintClickSound();
                      setIsAddingNew(false);
                    }}
                    className="w-full text-center text-xs font-black text-slate-500 hover:text-slate-800 py-1"
                  >
                    {isTamil ? '← கடைகள் பட்டியல் பார்க்க' : '← Back to Shop List'}
                  </button>
                )}
              </form>
            </div>
          ) : null}

          {/* LIST: SHOW THE SHOP NAME ALREADY ENTERED */}
          {contacts.length > 0 && !isAddingNew ? (
            <div className="space-y-2">
              {/* Add New Shop Button */}
              <button
                type="button"
                onClick={() => {
                  playPrintClickSound();
                  setIsAddingNew(true);
                }}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-800 text-xs font-black flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isTamil ? '+ புதிய கடை சேர்க்க' : '+ Add New Shop'}</span>
              </button>

              {/* Optional Search Bar if many shops */}
              {contacts.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isTamil ? 'கடை பெயர் அல்லது எண் தேடுக...' : 'Search shop name or phone...'}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Already Entered Shops List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {filteredContacts.map((c) => {
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectShop(c)}
                      className="p-3 rounded-2xl border-2 border-slate-200 bg-white hover:bg-emerald-50/50 hover:border-emerald-400 flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-98 shadow-2xs group"
                    >
                      {/* Left: Shop Icon & Shop Name & Phone */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-800 flex items-center justify-center shrink-0 transition-colors">
                          <Store className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-black text-slate-900 group-hover:text-emerald-950 truncate tracking-tight block">
                            {c.name}
                          </span>
                          <div className="text-xs font-bold text-slate-500 font-mono mt-0.5">
                            +91 {c.phone}
                          </div>
                        </div>
                      </div>

                      {/* Right: Send Bill Action Key */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs">
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">
                            {isTamil ? 'அனுப்பு' : 'Send'}
                          </span>
                        </div>

                        {/* Delete Shop Key */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteContact(e, c.phone)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title={isTamil ? 'கடையை நீக்கு' : 'Delete shop'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredContacts.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500 font-bold bg-slate-50 rounded-2xl border border-slate-200">
                    {isTamil ? 'பொருந்தும் கடைகள் எதுவும் இல்லை' : 'No matching shops found'}
                  </div>
                )}
              </div>
            </div>
          ) : !isAddingNew ? (
            /* Empty State: No shops entered yet */
            <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Store className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-slate-800">
                  {isTamil ? 'கடைகள் எதுவும் இல்லை' : 'No shops entered yet'}
                </h4>
                <p className="text-xs text-slate-500 font-bold">
                  {isTamil
                    ? 'பில் அனுப்ப முதலில் கடையின் பெயரை சேர்க்கவும்.'
                    : 'Add your first shop name and phone number to send bills.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isTamil ? '+ கடை பெயரை சேர்க்க' : '+ Add Shop Name'}</span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-4 py-2.5 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-black text-slate-600 hover:text-slate-900 px-3 py-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            {isTamil ? 'மூடு' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
