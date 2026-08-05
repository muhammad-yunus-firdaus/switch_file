// ============================================================================
// SwitchFile — Compression Panel Component
// ============================================================================

'use client';

import { useCallback, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Minimize2,
  Upload,
  Download,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { formatFileSize } from '@/lib/format-utils';
import { useCompression } from '@/hooks/use-compression';
import { triggerDownload } from '@/lib/zip-utils';
import { cn } from '@/lib/utils';

// ============================================================================
// Component
// ============================================================================

export function CompressionPanel() {
  const {
    quality,
    setQuality,
    isCompressing,
    result,
    estimatedSize,
    compress,
    reset,
    selectedFile,
    setSelectedFile,
  } = useCompression();

  const inputRef = useRef<HTMLInputElement>(null);

  // ── File Selection ──

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        reset();
      }
      e.target.value = '';
    },
    [setSelectedFile, reset]
  );

  // ── Compression ──

  const handleCompress = useCallback(async () => {
    if (!selectedFile) return;
    await compress(selectedFile);
  }, [selectedFile, compress]);

  // ── Download ──

  const handleDownload = useCallback(() => {
    if (!result) return;
    const ext = selectedFile?.name.split('.').pop() ?? 'compressed';
    const baseName = selectedFile?.name.replace(/\.[^.]+$/, '') ?? 'file';
    triggerDownload(result.blob, `${baseName}_compressed.${ext}`);
  }, [result, selectedFile]);

  // ── Savings Calculation ──

  const savingsPercent = result
    ? Math.round((1 - result.compressedSize / result.originalSize) * 100)
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]/10">
          <Minimize2 className="h-4 w-4 text-[#2563EB]" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          Image Compressor
        </h3>
      </div>

      {/* ── File Selection Area ── */}
      {!selectedFile ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-8 text-center transition-all hover:border-[#2563EB]/40 hover:bg-[rgba(37,99,235,0.02)]"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Select an image to compress
          </p>
          <p className="text-xs text-muted-foreground/60">
            PNG, JPG, WebP supported
          </p>
        </button>
      ) : (
        <div className="space-y-5">
          {/* ── Selected File Info ── */}
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedFile(null);
                reset();
              }}
              className="text-xs text-muted-foreground"
            >
              Change
            </Button>
          </div>

          {/* ── Quality Slider ── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Quality
              </label>
              <span className="rounded-full bg-[#2563EB]/10 px-2.5 py-0.5 text-xs font-bold text-[#2563EB]">
                {Math.round(quality * 100)}%
              </span>
            </div>
            <Slider
              value={[quality * 100]}
              onValueChange={(val) => {
                const v = Array.isArray(val) ? val[0] : val;
                setQuality(v / 100);
              }}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground/60">
              <span>Max Compression</span>
              <span>Best Quality</span>
            </div>
          </div>

          {/* ── Size Preview ── */}
          <div className="flex items-center justify-center gap-3 rounded-lg bg-muted/30 px-4 py-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Original</p>
              <p className="text-sm font-bold text-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                {result ? 'Compressed' : 'Estimated'}
              </p>
              <p
                className={cn(
                  'text-sm font-bold',
                  result ? 'text-[#16A34A]' : 'text-[#2563EB]'
                )}
              >
                {result
                  ? formatFileSize(result.compressedSize)
                  : estimatedSize
                    ? formatFileSize(estimatedSize)
                    : '—'}
              </p>
            </div>
            {savingsPercent !== null && (
              <div className="rounded-full bg-[#16A34A]/10 px-2.5 py-0.5 text-xs font-bold text-[#16A34A]">
                -{savingsPercent}%
              </div>
            )}
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex gap-2">
            <Button
              onClick={handleCompress}
              disabled={isCompressing}
              className="flex-1 h-10 gap-2 rounded-lg bg-[#2563EB] text-sm font-semibold text-white hover:bg-[#1D4ED8] shadow-md shadow-[#2563EB]/25"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Compressing...
                </>
              ) : (
                <>
                  <Minimize2 className="h-4 w-4" />
                  Compress
                </>
              )}
            </Button>

            {result && (
              <Button
                onClick={handleDownload}
                variant="outline"
                className="h-10 gap-2 rounded-lg border-[#16A34A]/30 text-sm font-semibold text-[#16A34A] hover:bg-[#16A34A]/10"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Hidden Input ── */}
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
