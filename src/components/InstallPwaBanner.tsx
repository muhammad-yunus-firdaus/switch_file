// ============================================================================
// SwitchFile — Install PWA Banner
// ============================================================================
// Displays a bottom banner promoting PWA installation on desktop and mobile.
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pwa-banner-dismissed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    // Register service worker if supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.error('Service worker registration failed:', err);
        });
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsVisible(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa-banner-dismissed', 'true');
    }
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-card p-4 shadow-xl backdrop-blur-md md:p-5">
        <div className="absolute -left-16 -top-16 -z-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="absolute -right-16 -bottom-16 -z-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm md:text-base">
                Pasang SwitchFile
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Install SwitchFile di HP / Laptop Anda untuk akses konversi 100% cepat & offline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Nanti saja
            </Button>
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs md:text-sm flex items-center gap-2 px-4 shadow-sm"
            >
              <Download className="h-4 w-4" />
              Install Aplikasi
            </Button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
