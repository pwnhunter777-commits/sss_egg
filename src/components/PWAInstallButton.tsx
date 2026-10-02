import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone } from 'lucide-react';

interface Props {
  variant?: 'banner' | 'button' | 'badge';
  className?: string;
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'button', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed and launched as PWA standalone, hide
  if (isInstalled) {
    return null;
  }

  // Handle click: either trigger native prompt or show iOS guide
  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Desktop / Chromium fallback instructions
      alert('To install this app on your device:\n\n1. In Chrome/Edge: Click the Install icon in the address bar or browser menu.\n2. On mobile: Tap browser menu (⋮) and select "Install app" or "Add to Home Screen".');
    }
  };

  if (variant === 'badge') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer ${className}`}
          title="Install SSS Egg Agency App"
        >
          <Download className="w-3.5 h-3.5 stroke-[3]" />
          <span>INSTALL APP</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border-2 border-slate-200 space-y-4 text-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-black text-slate-900">Install on iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">1</div>
                  <p>Tap the <Share2 className="w-4 h-4 inline-block text-blue-600 mx-1 align-sub" /> <strong>Share</strong> button at the bottom of Safari.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">2</div>
                  <p>Scroll down and select <strong>"Add to Home Screen"</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">3</div>
                  <p>Tap <strong>"Add"</strong> on the top-right corner to finish installing.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-2xl bg-blue-700 hover:bg-blue-800 text-white py-3.5 text-sm font-black transition-all shadow-md"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-amber-950 font-black text-sm md:text-base shadow-lg shadow-amber-400/30 transition-all active:scale-95 cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />
        <span>INSTALL APP (PWA)</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border-2 border-slate-200 space-y-4 text-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-black text-slate-900">Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">1</div>
                <p>Tap the <Share2 className="w-4 h-4 inline-block text-blue-600 mx-1 align-sub" /> <strong>Share</strong> button at the bottom of Safari.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">2</div>
                <p>Scroll down and select <strong>"Add to Home Screen"</strong>.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">3</div>
                <p>Tap <strong>"Add"</strong> on the top-right corner to finish installing.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-2xl bg-blue-700 hover:bg-blue-800 text-white py-3.5 text-sm font-black transition-all shadow-md"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
