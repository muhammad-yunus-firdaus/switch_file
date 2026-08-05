// ============================================================================
// SwitchFile — AI Tools Page (100% Client-Side)
// ============================================================================
// OCR via tesseract.js (WASM) + Background Removal via @imgly/background-removal
// ============================================================================

'use client';

import { useState, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ScanLine,
  Sparkles,
  ShieldCheck,
  Cpu,
  Copy,
  Check,
  Upload,
  Scissors,
  Download,
  Loader2,
  ImageOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// OCR Tool Component
// ============================================================================

function OCRTool() {
  const [ocrText, setOcrText] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (file: File) => {
    setStatus('scanning');
    setOcrText('');
    setProgress(0);

    try {
      // Dynamic import to avoid SSR issues
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('ind+eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      setOcrText(text.trim() || '(Tidak ada teks terdeteksi)');
      setStatus('done');
    } catch {
      setStatus('error');
      setOcrText('Gagal memindai gambar. Pastikan file adalah gambar yang valid.');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) handleFileChange(file);
    },
    [handleFileChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5 p-6 md:p-8 shadow-sm">
      {/* Decorative glow */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563EB]/10 shadow-sm">
              <ScanLine className="h-6 w-6 text-[#2563EB]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">AI Document Extractor (OCR)</h2>
              <p className="text-xs text-muted-foreground">Powered by Tesseract.js · WebAssembly</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] font-bold">
              Live ✓
            </Badge>
            <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-none text-[10px] font-semibold flex items-center gap-1">
              <Cpu className="h-3 w-3" /> 100% Offline
            </Badge>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Tidak ada upload ke server
          </span>
          <span className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-[#2563EB]" />
            Bahasa Indonesia + Inggris
          </span>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer',
            status === 'scanning'
              ? 'border-[#2563EB]/40 bg-[#2563EB]/5 cursor-not-allowed'
              : 'border-border hover:border-[#2563EB]/50 hover:bg-[#2563EB]/5'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
            disabled={status === 'scanning'}
          />
          {status === 'scanning' ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-[#2563EB] animate-spin" />
              <p className="text-sm font-semibold text-foreground">
                Memindai gambar... {progress}%
              </p>
              <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground text-center">
                Klik atau seret gambar ke sini untuk memindai
              </p>
              <p className="text-xs text-muted-foreground">
                Mendukung JPG, PNG, WebP, BMP, TIFF
              </p>
            </>
          )}
        </div>

        {/* Result Textarea */}
        {(status === 'done' || status === 'error') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Hasil Ekstraksi Teks
              </span>
              {status === 'done' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-3 text-xs cursor-pointer gap-1.5"
                >
                  {copied ? (
                    <><Check className="h-3.5 w-3.5 text-emerald-500" /> Disalin!</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Salin Teks</>
                  )}
                </Button>
              )}
            </div>
            <textarea
              readOnly
              value={ocrText}
              rows={8}
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStatus('idle'); setOcrText(''); setProgress(0); }}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Pindai Gambar Baru
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Background Remover Tool Component
// ============================================================================

function BgRemoverTool() {
  const [preview, setPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setResultUrl(null);
    setStatus('processing');
    setProgress(0);

    try {
      const { removeBackground } = await import('@imgly/background-removal');

      const resultBlob = await removeBackground(file, {
        progress: (_key: string, current: number, total: number) => {
          setProgress(Math.round((current / total) * 100));
        },
      });

      const url = URL.createObjectURL(resultBlob);
      setResultUrl(url);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) handleFileChange(file);
    },
    [handleFileChange]
  );

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'background-removed.png';
    a.click();
  };

  const handleReset = () => {
    setPreview(null);
    setResultUrl(null);
    setStatus('idle');
    setProgress(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 p-6 md:p-8 shadow-sm">
      {/* Decorative glow */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 shadow-sm">
              <Scissors className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">AI Background Remover</h2>
              <p className="text-xs text-muted-foreground">Powered by @imgly · WebAssembly AI Model</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] font-bold">
              Live ✓
            </Badge>
            <Badge className="bg-violet-500/10 text-violet-600 border-none text-[10px] font-semibold flex items-center gap-1">
              <Cpu className="h-3 w-3" /> 100% Offline
            </Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Hapus latar belakang foto secara otomatis dan gratis 100% di RAM browser Anda.
          Hasil berupa file PNG transparan siap unduh — tanpa server, tanpa API key.
        </p>

        {/* Drop Zone or Preview */}
        {status === 'idle' ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-violet-400/50 hover:bg-violet-500/5 p-8 transition-all duration-200 cursor-pointer"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground text-center">
              Klik atau seret foto ke sini
            </p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP — maks 10MB</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Asli</span>
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Original"
                    className="w-full h-40 object-contain rounded-xl border border-border bg-muted/30"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hasil</span>
                <div className="w-full h-40 rounded-xl border border-border bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] overflow-hidden flex items-center justify-center">
                  {status === 'processing' ? (
                    <div className="flex flex-col items-center gap-2 text-center p-4">
                      <Loader2 className="h-7 w-7 text-violet-500 animate-spin" />
                      <p className="text-xs font-semibold text-foreground">Memproses AI... {progress}%</p>
                      <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  ) : status === 'done' && resultUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resultUrl} alt="Result" className="w-full h-full object-contain" />
                  ) : status === 'error' ? (
                    <div className="flex flex-col items-center gap-2 text-center p-4">
                      <ImageOff className="h-7 w-7 text-red-400" />
                      <p className="text-xs text-red-500 font-medium">Gagal memproses gambar</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {status === 'done' && (
                <Button
                  onClick={handleDownload}
                  className="h-9 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Unduh PNG Transparan
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleReset}
                className="h-9 text-xs font-semibold cursor-pointer"
              >
                Gambar Baru
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AIToolsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* ── Page Header ── */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              AI &amp; Otomatisasi
            </h1>
            <Badge className="bg-[#2563EB]/10 text-[#2563EB] border-none text-[10px] font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Beta
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Alat bantu kecerdasan buatan berbasis 100% Client-Side untuk produktivitas dokumen Anda.
          </p>
        </div>

        {/* ── Tool 1: OCR Document Extractor ── */}
        <OCRTool />

        {/* ── Tool 2: Background Remover ── */}
        <BgRemoverTool />

        {/* ── Roadmap Cards ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Fitur Berikutnya (Roadmap)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <h3 className="text-sm font-semibold text-foreground">AI PDF Summarizer</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ringkas dokumen PDF tebal menjadi poin-poin kesimpulan menggunakan model LLM lokal di browser.
              </p>
              <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200">
                Ide Fase 3
              </Badge>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">Format Metadata Cleaner</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bersihkan data EXIF lokasi, tipe kamera, dan metadata rahasia dari gambar sebelum dibagikan.
              </p>
              <Badge variant="outline" className="text-[9px] font-bold text-slate-400 border-slate-200">
                Ide Fase 3
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
