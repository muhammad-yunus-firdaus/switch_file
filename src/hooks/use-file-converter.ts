'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  FileItem,
  FileFormat,
  CategoryFilter,
  ConversionHistoryEntry,
} from '@/types';
import {
  detectFormat,
  getDefaultTarget,
  getTargetFormats,
  generateFileId,
  getOutputFileName,
} from '@/lib/format-utils';
import { convertFile } from '@/lib/converters/registry';
import { logConversion } from '@/lib/supabase/client';
import { addHistoryEntry } from '@/lib/idb/history-store';
import { downloadAllAsZip, triggerDownload } from '@/lib/zip-utils';

// Ensure all converters are registered
import '@/lib/converters/image-converters';
import '@/lib/converters/pdf-converters';
import '@/lib/converters/document-converters';

interface UseFileConverterReturn {
  /** All files currently in the queue */
  files: FileItem[];
  /** Active category filter tab */
  categoryFilter: CategoryFilter;
  /** Currently selected source format (null = auto-detect) */
  sourceFormat: FileFormat | null;
  /** Currently selected target format */
  targetFormat: FileFormat | null;
  /** Whether any files are currently being converted */
  isConverting: boolean;
  /** Number of files currently being processed */
  activeConversions: number;
  /** Add files to the conversion queue */
  addFiles: (newFiles: File[]) => void;
  /** Remove a file from the queue */
  removeFile: (id: string) => void;
  /** Clear all files from the queue */
  clearFiles: () => void;
  /** Start conversion for all queued files */
  startConversion: () => Promise<void>;
  /** Download a single converted file */
  downloadFile: (id: string) => void;
  /** Download all converted files as ZIP */
  downloadAll: () => Promise<void>;
  /** Set the category filter */
  setCategoryFilter: (filter: CategoryFilter) => void;
  /** Set the source format (null = auto-detect) */
  setSourceFormat: (format: FileFormat | null) => void;
  /** Set the target format */
  setTargetFormat: (format: FileFormat | null) => void;
  /** Get target formats available for a given source format */
  availableTargets: FileFormat[];
  /** Callback for when history should be refreshed */
  onHistoryUpdate?: () => void;
}

export function useFileConverter(
  onHistoryUpdate?: () => void
): UseFileConverterReturn {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>('all');
  const [sourceFormat, setSourceFormat] = useState<FileFormat | null>(null);
  const [targetFormat, setTargetFormat] = useState<FileFormat | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [activeConversions, setActiveConversions] = useState(0);

  // Ref to track the latest onHistoryUpdate callback
  const historyUpdateRef = useRef(onHistoryUpdate);
  
  useEffect(() => {
    historyUpdateRef.current = onHistoryUpdate;
  }, [onHistoryUpdate]);

  const availableTargets = sourceFormat
    ? getTargetFormats(sourceFormat)
    : [];

  /**
   * Add files to the conversion queue with auto-detection.
   */
  const addFiles = useCallback(
    (newFiles: File[]) => {
      const items = newFiles
        .map((file): FileItem | null => {
          const detected = detectFormat(file);
          if (!detected) return null;

          // Use user-selected target or auto-detect default
          const resolvedTarget =
            targetFormat ??
            (sourceFormat && sourceFormat === detected
              ? getDefaultTarget(detected)
              : getDefaultTarget(detected));

          if (!resolvedTarget) return null;

          const item: FileItem = {
            id: generateFileId(),
            file,
            name: file.name,
            size: file.size,
            sourceFormat: detected,
            targetFormat: resolvedTarget,
            status: 'queued',
            progress: 0,
          };
          return item;
        })
        .filter((item): item is FileItem => item !== null);

      if (items.length > 0) {
        setFiles((prev) => [...prev, ...items]);

        // Auto-set source format from first file if not already set
        if (!sourceFormat && items.length > 0) {
          const firstFormat = items[0].sourceFormat;
          setSourceFormat(firstFormat);
          if (!targetFormat) {
            setTargetFormat(getDefaultTarget(firstFormat));
          }
        }
      }
    },
    [sourceFormat, targetFormat]
  );

  /**
   * Remove a file from the queue.
   */
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  /**
   * Clear all files from the queue.
   */
  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  /**
   * Convert a single file and update its state.
   */
  const convertSingleFile = useCallback(
    async (fileItem: FileItem): Promise<void> => {
      // Update status to converting
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id
            ? { ...f, status: 'converting' as const, progress: 10 }
            : f
        )
      );
      setActiveConversions((prev) => prev + 1);

      const startTime = performance.now();

      try {
        // Simulate progress steps
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id ? { ...f, progress: 30 } : f
          )
        );

        const convertedBlob = await convertFile(
          fileItem.file,
          fileItem.sourceFormat,
          fileItem.targetFormat
        );

        const endTime = performance.now();
        const processingTimeMs = Math.round(endTime - startTime);

        // Update to converted state
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: 'converted' as const,
                  progress: 100,
                  convertedBlob,
                  convertedSize: convertedBlob.size,
                  processingTimeMs,
                }
              : f
          )
        );

        // Log to IndexedDB
        const historyEntry: ConversionHistoryEntry = {
          id: fileItem.id,
          fileName: fileItem.name,
          sourceFormat: fileItem.sourceFormat,
          targetFormat: fileItem.targetFormat,
          originalSizeBytes: fileItem.size,
          convertedSizeBytes: convertedBlob.size,
          processingTimeMs,
          status: 'success',
          createdAt: new Date(),
          convertedBlob,
        };

        await addHistoryEntry(historyEntry);
        historyUpdateRef.current?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('switchfile-history-update'));
        }

        // Auto-download if enabled in settings
        if (typeof window !== 'undefined') {
          const autoDownload = localStorage.getItem('switchfile-auto-download') === 'true';
          if (autoDownload) {
            const outputName = getOutputFileName(fileItem.name, fileItem.targetFormat);
            triggerDownload(convertedBlob, outputName);
          }
        }

        // Log to Supabase (anonymous, fire-and-forget)
        logConversion({
          file_name: fileItem.name,
          source_format: fileItem.sourceFormat,
          target_format: fileItem.targetFormat,
          original_size_bytes: fileItem.size,
          converted_size_bytes: convertedBlob.size,
          processing_time_ms: processingTimeMs,
          status: 'success',
        }).catch(() => {
          /* silently ignore analytics errors */
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Conversion failed';

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: 'error' as const,
                  progress: 0,
                  errorMessage,
                }
              : f
          )
        );

        // Log error to history
        const historyEntry: ConversionHistoryEntry = {
          id: fileItem.id,
          fileName: fileItem.name,
          sourceFormat: fileItem.sourceFormat,
          targetFormat: fileItem.targetFormat,
          originalSizeBytes: fileItem.size,
          status: 'error',
          createdAt: new Date(),
        };

        await addHistoryEntry(historyEntry);
        historyUpdateRef.current?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('switchfile-history-update'));
        }

        // Log error to Supabase (anonymous, fire-and-forget)
        logConversion({
          file_name: fileItem.name,
          source_format: fileItem.sourceFormat,
          target_format: fileItem.targetFormat,
          original_size_bytes: fileItem.size,
          status: 'error',
        }).catch(() => {
          /* silently ignore analytics errors */
        });
      } finally {
        setActiveConversions((prev) => prev - 1);
      }
    },
    []
  );

  /**
   * Start conversion for all queued files.
   */
  const startConversion = useCallback(async () => {
    const queuedFiles = files.filter((f) => f.status === 'queued');
    if (queuedFiles.length === 0) return;

    setIsConverting(true);

    // Process files concurrently (max 3 at a time)
    const MAX_CONCURRENT = 3;
    const queue = [...queuedFiles];

    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT, queue.length) },
      async () => {
        while (queue.length > 0) {
          const fileItem = queue.shift();
          if (fileItem) {
            await convertSingleFile(fileItem);
          }
        }
      }
    );

    await Promise.all(workers);
    setIsConverting(false);
  }, [files, convertSingleFile]);

  /**
   * Download a single converted file.
   */
  const downloadFile = useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id);
      if (!file || !file.convertedBlob) return;

      const outputName = getOutputFileName(file.name, file.targetFormat);
      triggerDownload(file.convertedBlob, outputName);
    },
    [files]
  );

  /**
   * Download all converted files as a ZIP archive.
   */
  const downloadAll = useCallback(async () => {
    await downloadAllAsZip(files);
  }, [files]);

  return {
    files,
    categoryFilter,
    sourceFormat,
    targetFormat,
    isConverting,
    activeConversions,
    addFiles,
    removeFile,
    clearFiles,
    startConversion,
    downloadFile,
    downloadAll,
    setCategoryFilter,
    setSourceFormat,
    setTargetFormat,
    availableTargets,
  };
}
