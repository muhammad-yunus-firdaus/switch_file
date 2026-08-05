// ============================================================================
// SwitchFile — All Files (History) Page
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import { Search, Trash2, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useHistory } from '@/hooks/use-history';
import { formatFileSize, getFormatLabel, getOutputFileName } from '@/lib/format-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import type { ConversionHistoryEntry } from '@/types';

export default function AllFilesPage() {
  const {
    history,
    isLoading,
    clearHistory,
    deleteEntry,
  } = useHistory(1000); // Retrieve up to 1000 history entries

  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // ── Filter History ──
  const filteredHistory = useMemo(() => {
    return history.filter((entry) =>
      entry.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [history, searchQuery]);

  // ── Download File ──
  const handleDownload = (entry: ConversionHistoryEntry) => {
    if (!entry.convertedBlob) return;
    const url = URL.createObjectURL(entry.convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getOutputFileName(entry.fileName, entry.targetFormat);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Confirm Clear History ──
  const handleClearAll = () => {
    clearHistory();
    setIsConfirmOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Page Header ── */}
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Arsip &amp; Riwayat Konversi
            </h1>
            <p className="text-sm text-muted-foreground">
              Tinjau dan kelola riwayat konversi lokal di browser Anda.
            </p>
          </div>

        {/* ── Filters Bar ── */}
        <div className="relative">
          <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari Riwayat File..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-sm outline-none ring-[#2563EB]/20 transition-all focus:border-[#2563EB] focus:ring-4"
          />
        </div>

        {/* ── Loading State ── */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 shadow-sm">
            <RefreshCw className="h-8 w-8 text-[#2563EB] animate-spin" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Memuat riwayat konversi...
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          /* ── Empty State ── */
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">
              {searchQuery ? 'File tidak ditemukan' : 'Belum ada riwayat konversi'}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              {searchQuery
                ? 'Coba sesuaikan kata kunci pencarian Anda.'
                : 'File yang berhasil dikonversi di workspace akan muncul di sini.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Desktop History Table (>= 768px) ── */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Nama File</th>
                    <th className="px-4 py-3">Format</th>
                    <th className="px-4 py-3">Ukuran Awal -&gt; Akhir</th>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filteredHistory.map((entry) => {
                    const hasBlob = !!entry.convertedBlob;
                    const originalSize = entry.originalSizeBytes;
                    const convertedSize = entry.convertedSizeBytes;
                    const savings =
                      originalSize && convertedSize
                        ? Math.round(((originalSize - convertedSize) / originalSize) * 100)
                        : 0;

                    return (
                      <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-foreground max-w-xs truncate">
                          {entry.fileName}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {getFormatLabel(entry.sourceFormat)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">→</span>
                            <Badge variant="secondary" className="text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/10 border-none">
                              {getFormatLabel(entry.targetFormat)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>{formatFileSize(originalSize)}</span>
                            <span className="text-muted-foreground/40">/</span>
                            {convertedSize ? (
                              <span className="font-medium text-foreground">
                                {formatFileSize(convertedSize)}
                              </span>
                            ) : (
                              <span>-</span>
                            )}
                            {savings > 0 && (
                              <Badge className="text-[10px] font-semibold bg-[#16A34A]/10 text-[#16A34A] border-none">
                                hemat {savings}%
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon-sm"
                              disabled={!hasBlob}
                              onClick={() => handleDownload(entry)}
                              title={hasBlob ? 'Unduh file' : 'File dalam memori RAM sudah kedaluwarsa atau dihapus'}
                              className="h-8 w-8 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => deleteEntry(entry.id)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile History Cards (< 768px) ── */}
            <div className="block md:hidden space-y-3">
              {filteredHistory.map((entry) => {
                const hasBlob = !!entry.convertedBlob;
                const originalSize = entry.originalSizeBytes;
                const convertedSize = entry.convertedSizeBytes;
                const savings =
                  originalSize && convertedSize
                    ? Math.round(((originalSize - convertedSize) / originalSize) * 100)
                    : 0;

                return (
                  <div key={entry.id} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-foreground truncate block text-sm max-w-[180px]" title={entry.fileName}>
                        {entry.fileName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-bold">
                          {getFormatLabel(entry.sourceFormat)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">→</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-bold text-[#16A34A] bg-[#16A34A]/10 border-none">
                          {getFormatLabel(entry.targetFormat)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(originalSize)}</span>
                      <span>→</span>
                      <span className="font-semibold text-foreground">
                        {convertedSize ? formatFileSize(convertedSize) : '-'}
                      </span>
                      {savings > 0 && (
                        <Badge className="text-[10px] font-semibold bg-[#16A34A]/10 text-[#16A34A] border-none ml-auto">
                          hemat {savings}%
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          disabled={!hasBlob}
                          onClick={() => handleDownload(entry)}
                          className="h-8 w-8 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => deleteEntry(entry.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Bottom Action Area ── */}
        {history.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(true)}
              className="h-9 px-4 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Hapus Semua Riwayat
            </Button>
          </div>
        )}

        {/* ── Clear All History Modal ── */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus Semua Riwayat</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus seluruh riwayat konversi? Semua catatan riwayat, cache file di IndexedDB akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <DialogClose render={<Button variant="outline">Batal</Button>} />
              <Button variant="destructive" onClick={handleClearAll}>
                Ya, Hapus Semua
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
