// ============================================================================
// SwitchFile — Settings & History Page
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { HardDrive, Trash2, CheckCircle2, History, SlidersHorizontal, Shield } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { clearHistory } from '@/lib/idb/history-store';
import { formatFileSize } from '@/lib/format-utils';
import { useHistory } from '@/hooks/use-history';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

export default function SettingsPage() {
  const [quality, setQuality] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedQuality = localStorage.getItem('switchfile-compression-quality');
      if (storedQuality) {
        const val = parseInt(storedQuality, 10);
        if (!isNaN(val)) return val;
      }
    }
    return 80;
  });

  const [autoDownload, setAutoDownload] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedAuto = localStorage.getItem('switchfile-auto-download');
      return storedAuto === 'true';
    }
    return false;
  });

  const [storageUsage, setStorageUsage] = useState('Calculating...');
  const [storageQuota, setStorageQuota] = useState('Unknown');
  const [storagePercent, setStoragePercent] = useState(0);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isSavedNotify, setIsSavedNotify] = useState(false);
  const [savedNotifyText, setSavedNotifyText] = useState('Pengaturan berhasil disimpan!');

  // Load history logs (limit to 5 entries for this session summary card)
  const {
    history: historyLogs,
    isLoading: isHistoryLoading,
    deleteEntry,
    refresh: refreshHistory,
  } = useHistory(5);

  // ── Calculate IndexedDB Usage ──
  const calculateStorage = async () => {
    if (typeof window === 'undefined' || !navigator.storage?.estimate) {
      setStorageUsage('Not supported by browser');
      return;
    }
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.usage !== undefined && estimate.quota !== undefined) {
        setStorageUsage(formatFileSize(estimate.usage));
        setStorageQuota(formatFileSize(estimate.quota));
        const percent = Math.min(
          100,
          Math.max(0, Math.round((estimate.usage / estimate.quota) * 100))
        );
        setStoragePercent(percent);
      } else if (estimate.usage !== undefined) {
        setStorageUsage(formatFileSize(estimate.usage));
      } else {
        setStorageUsage('Unknown');
      }
    } catch {
      setStorageUsage('Error calculating');
    }
  };

  // ── Load Preferences & Storage on mount ──
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await calculateStorage();
    };
    void run();
    return () => { cancelled = true; };
  }, []);

  // Ensure light mode is always active
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('switchfile-theme');
  }, []);

  const handleQualityChange = (val: number | readonly number[]) => {
    const qVal = Array.isArray(val) ? val[0] : (val as number);
    setQuality(qVal);
    localStorage.setItem('switchfile-compression-quality', qVal.toString());
    triggerSaveNotification('Pengaturan berhasil disimpan!');
  };

  // ── Save Auto Download Toggle ──
  const handleToggleAuto = () => {
    const nextVal = !autoDownload;
    setAutoDownload(nextVal);
    localStorage.setItem('switchfile-auto-download', nextVal ? 'true' : 'false');
    triggerSaveNotification('Pengaturan berhasil disimpan!');
  };

  const triggerSaveNotification = (msg: string) => {
    setSavedNotifyText(msg);
    setIsSavedNotify(true);
    setTimeout(() => setIsSavedNotify(false), 2000);
  };

  // ── Reset Storage & Cache ──
  const handleResetConfirm = async () => {
    // Clear history store
    await clearHistory();
    // Clear preferences
    localStorage.removeItem('switchfile-compression-quality');
    localStorage.removeItem('switchfile-auto-download');
    // Reset state
    setQuality(80);
    setAutoDownload(false);
    setIsResetOpen(false);
    
    // Recalculate usage & refresh hook
    await calculateStorage();
    await refreshHistory();
    triggerSaveNotification('Riwayat memori berhasil dibersihkan!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Page Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Pengaturan &amp; History Aplikasi
            </h1>
            <p className="text-sm text-muted-foreground">
              Konfigurasikan preferensi bawaan lokal, tema tampilan, dan penyimpanan cache Anda.
            </p>
          </div>
          {isSavedNotify && (
            <div className="flex items-center gap-1 text-xs text-[#16A34A] bg-[#16A34A]/10 px-3 py-1.5 rounded-full font-medium transition-all">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {savedNotifyText}
            </div>
          )}
        </div>

        {/* ── Section 1: Preferensi Aplikasi ── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <SlidersHorizontal className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Preferensi Aplikasi
            </h2>
          </div>

          <div className="space-y-6">
            {/* Slider Option */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold text-foreground">
                    Kualitas Kompresi Bawaan
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Menentukan target kualitas kompresi bawaan yang digunakan untuk kompresi gambar.
                  </p>
                </div>
                <span className="text-sm font-bold text-[#2563EB] bg-[#2563EB]/10 px-2.5 py-0.5 rounded-md tabular-nums min-w-[48px] text-center">
                  {quality}%
                </span>
              </div>
              <div className="py-2">
                <Slider
                  value={[quality]}
                  onValueChange={handleQualityChange}
                  min={10}
                  max={100}
                  step={1}
                />
              </div>

              {/* ── Preset Quality Buttons ── */}
              <div className="flex items-center gap-2 pt-1">
                {[
                  { label: '30% Kompresi Tinggi', value: 30 },
                  { label: '80% Seimbang', value: 80 },
                  { label: '100% Maksimal', value: 100 },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleQualityChange(preset.value)}
                    className={cn(
                      'flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all duration-150 cursor-pointer',
                      quality === preset.value
                        ? 'border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]'
                        : 'border-border bg-muted/50 text-muted-foreground hover:border-[#2563EB]/50 hover:bg-[#2563EB]/5 hover:text-[#2563EB]'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase">
                <span>Kompresi Tinggi (10%)</span>
                <span>Seimbang (80%)</span>
                <span>Kualitas Terbaik (100%)</span>
              </div>
            </div>

            {/* Toggle Option */}
            <div className="flex items-center justify-between border-t border-border/60 pt-6">
              <div>
                <label className="text-sm font-semibold text-foreground block">
                  Unduh File Otomatis Saat Selesai
                </label>
                <span className="text-xs text-muted-foreground block max-w-md">
                  Otomatis memicu unduhan browser setelah proses konversi selesai untuk setiap file di antrean.
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleAuto}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2',
                  autoDownload ? 'bg-[#2563EB]' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    autoDownload ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

          </div>
        </div>

        {/* ── Section 2: Penyimpanan Memori Browser ── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <HardDrive className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Penyimpanan Memori Browser (IndexedDB)
            </h2>
          </div>

          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-semibold text-foreground block">
                  Memori Digunakan
                </span>
                <span className="text-xs text-muted-foreground block max-w-md mt-1">
                  Estimasi ukuran file hasil konversi dan log riwayat yang tersimpan secara offline di browser Anda.
                </span>
              </div>
              <span className="text-sm font-bold text-foreground font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                {storageUsage}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Persentase Memori Terpakai</span>
                <span>{storagePercent}% ({storageUsage} dari {storageQuota})</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                  style={{ width: `${Math.max(1, storagePercent)}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
              {/* Security Privacy Info Badge */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                <span>Pemrosesan 100% Lokal di RAM Browser - Tanpa Upload Server</span>
              </div>

              <Button
                variant="destructive"
                onClick={() => setIsResetOpen(true)}
                className="h-10 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Bersihkan Cache &amp; Reset Storage
              </Button>
            </div>
          </div>
        </div>

        {/* ── Section 3: Riwayat Sesi Terakhir ── */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <History className="h-5 w-5 text-[#2563EB]" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">
              Riwayat Sesi Terakhir
            </h2>
          </div>

          {isHistoryLoading ? (
            <p className="text-xs text-muted-foreground">Memuat riwayat sesi terakhir...</p>
          ) : historyLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada riwayat sesi terakhir.</p>
          ) : (
            <div className="space-y-3">
              <div className="divide-y divide-border text-sm">
                {historyLogs.map((entry) => {
                  const originalSize = entry.originalSizeBytes;
                  const convertedSize = entry.convertedSizeBytes;
                  const savings =
                    originalSize && convertedSize
                      ? Math.round(((originalSize - convertedSize) / originalSize) * 100)
                      : 0;

                  return (
                    <div key={entry.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {entry.fileName}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {entry.sourceFormat.toUpperCase()} → {entry.targetFormat.toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {savings > 0 && (
                          <span className="text-[10px] font-semibold bg-[#16A34A]/10 text-[#16A34A] px-2 py-0.5 rounded border-none">
                            hemat {savings}%
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await deleteEntry(entry.id);
                            calculateStorage();
                          }}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-3 border-t border-border flex justify-end">
                <Link href="/all-files">
                  <Button variant="outline" className="h-9 text-xs font-semibold cursor-pointer">
                    Lihat Seluruh Riwayat
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Reset Confirmation Dialog ── */}
        <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bersihkan Cache &amp; Reset Storage</DialogTitle>
              <DialogDescription>
                Tindakan ini akan menghapus seluruh arsip riwayat konversi dan file offline di browser Anda, serta mengembalikan pengaturan ke bawaan (Kualitas 80% &amp; Unduh Otomatis MATI). Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <DialogClose render={<Button variant="outline">Batal</Button>} />
              <Button variant="destructive" onClick={handleResetConfirm}>
                Ya, Hapus Semua
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
