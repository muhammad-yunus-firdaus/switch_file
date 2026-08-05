'use client';

import { useState, useCallback, useMemo } from 'react';
import type { CompressionResult } from '@/types';
import {
  compressImage,
  estimateCompressedSize,
} from '@/lib/converters/compression';
import { IMAGE_FORMATS } from '@/lib/format-utils';
import type { FileFormat } from '@/types';

interface UseCompressionReturn {
  /** Current quality slider value (0.1 – 1.0) */
  quality: number;
  /** Set quality value */
  setQuality: (value: number) => void;
  /** Whether compression is in progress */
  isCompressing: boolean;
  /** The current compression result (null if not yet compressed) */
  result: CompressionResult | null;
  /** Estimated compressed size (for live preview) */
  estimatedSize: number | null;
  /** Compress a file with current quality setting */
  compress: (file: File) => Promise<CompressionResult>;
  /** Reset compression state */
  reset: () => void;
  /** Selected file for compression */
  selectedFile: File | null;
  /** Set the selected file */
  setSelectedFile: (file: File | null) => void;
  /** Check if a file format can be compressed */
  canCompress: (format: FileFormat) => boolean;
}

export function useCompression(): UseCompressionReturn {
  const [quality, setQuality] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('switchfile-compression-quality');
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val)) return val / 100;
      }
    }
    return 0.8; // Default to 80%
  });
  const [isCompressing, setIsCompressing] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  /**
   * Estimated size based on current quality and selected file.
   */
  const estimatedSize = useMemo(() => {
    if (!selectedFile) return null;
    return estimateCompressedSize(selectedFile.size, quality);
  }, [selectedFile, quality]);

  /**
   * Check if a format supports compression.
   */
  const canCompress = useCallback((format: FileFormat): boolean => {
    return IMAGE_FORMATS.includes(format) && format !== 'heic';
  }, []);

  /**
   * Compress the given file with the current quality setting.
   */
  const compress = useCallback(
    async (file: File): Promise<CompressionResult> => {
      setIsCompressing(true);
      setResult(null);

      try {
        const compressionResult = await compressImage(file, quality);
        setResult(compressionResult);
        return compressionResult;
      } finally {
        setIsCompressing(false);
      }
    },
    [quality]
  );

  /**
   * Reset compression state.
   */
  const reset = useCallback(() => {
    setResult(null);
    setSelectedFile(null);
    setIsCompressing(false);
  }, []);

  return {
    quality,
    setQuality,
    isCompressing,
    result,
    estimatedSize,
    compress,
    reset,
    selectedFile,
    setSelectedFile,
    canCompress,
  };
}
