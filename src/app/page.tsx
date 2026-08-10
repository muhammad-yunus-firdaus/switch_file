// ============================================================================
// SwitchFile — Main Page
// ============================================================================
// Assembles all workspace components in the correct order.
// ============================================================================

'use client';

import { useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CategoryTabs } from '@/components/workspace/category-tabs';
import { FormatSwitcher } from '@/components/workspace/format-switcher';
import { DropZone } from '@/components/workspace/drop-zone';
import { FileQueue } from '@/components/workspace/file-queue';
import { CompressionPanel } from '@/components/workspace/compression-panel';
import { QuickTools } from '@/components/workspace/quick-tools';
import { useFileConverter } from '@/hooks/use-file-converter';
import type { FileFormat, CategoryFilter } from '@/types';

// ============================================================================
// Page Component
// ============================================================================

export default function HomePage() {
  const {
    files,
    categoryFilter,
    sourceFormat,
    targetFormat,
    isConverting,
    addFiles,
    removeFile,
    clearFiles,
    startConversion,
    downloadFile,
    downloadAll,
    setCategoryFilter,
    setSourceFormat,
    setTargetFormat,
  } = useFileConverter();

  // Ref for smooth-scrolling to dropzone when a Quick Action card is clicked
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // ── Category Tab Change Handler with Format Validation ──
  const handleCategoryChange = useCallback(
    (newCategory: CategoryFilter) => {
      setCategoryFilter(newCategory);

      if (sourceFormat) {
        const docsFormats = ['pdf', 'docx', 'xlsx', 'txt', 'pptx'];
        const imgsFormats = ['png', 'jpg', 'webp', 'heic', 'avif'];

        if (newCategory === 'documents' && !docsFormats.includes(sourceFormat)) {
          setSourceFormat(null);
          setTargetFormat(null);
        } else if (newCategory === 'images' && !imgsFormats.includes(sourceFormat)) {
          setSourceFormat(null);
          setTargetFormat(null);
        }
      }
    },
    [sourceFormat, setCategoryFilter, setSourceFormat, setTargetFormat]
  );

  // ── Quick Tool Selection: set formats + smooth-scroll to dropzone ──
  const handleToolSelect = useCallback(
    (
      source: FileFormat | null,
      target: FileFormat | null,
      category: CategoryFilter
    ) => {
      setCategoryFilter(category);
      if (source) setSourceFormat(source);
      if (target) setTargetFormat(target);

      // Brief delay so React can re-render the dropzone before scrolling
      setTimeout(() => {
        dropzoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
    },
    [setCategoryFilter, setSourceFormat, setTargetFormat]
  );

  return (
    <DashboardLayout showRightPanel={false}>
      {/* ── 1. Category Tabs ── */}
      <CategoryTabs
        activeTab={categoryFilter}
        onTabChange={handleCategoryChange}
      />

      {/* ── 2. Quick Actions (always visible except on Compressor tab) ── */}
      {categoryFilter !== 'compressor' && (
        <QuickTools onToolSelect={handleToolSelect} />
      )}

      {/* ── 3. Convert Format Switcher ── */}
      {categoryFilter !== 'compressor' && (
        <FormatSwitcher
          sourceFormat={sourceFormat}
          targetFormat={targetFormat}
          onSourceChange={setSourceFormat}
          onTargetChange={setTargetFormat}
          activeCategory={categoryFilter}
        />
      )}

      {/* ── 4. Universal Dropzone (scroll anchor) ── */}
      {categoryFilter !== 'compressor' && (
        <div ref={dropzoneRef}>
          <DropZone onFilesAdded={addFiles} disabled={isConverting} />
        </div>
      )}

      {/* ── Compression Panel (Compressor tab only) ── */}
      {categoryFilter === 'compressor' && <CompressionPanel />}

      {/* ── PPTX Client-Side Info Banner ── */}
      {sourceFormat === 'pptx' && files.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs leading-relaxed text-blue-300/90">
            <strong className="text-blue-200">Catatan:</strong> Pemrosesan 100% lokal di RAM browser Anda. Untuk presentasi PPTX dengan tata letak visual &amp; diagram terkelompok yang sangat kompleks, disarankan menyimpan langsung via Microsoft PowerPoint.
          </p>
        </div>
      )}

      {/* ── 5. Active File Queue Manager ── */}
      {files.length > 0 && (
        <FileQueue
          files={files}
          isConverting={isConverting}
          onStartConversion={startConversion}
          onDownloadFile={downloadFile}
          onDownloadAll={downloadAll}
          onRemoveFile={removeFile}
          onClearFiles={clearFiles}
        />
      )}
    </DashboardLayout>
  );
}
