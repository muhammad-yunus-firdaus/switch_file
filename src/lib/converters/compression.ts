import type { CompressionResult } from '@/types';

/**
 * Compress an image file using browser-image-compression.
 *
 * @param file - The image file to compress
 * @param quality - Target quality (0.1 = max compression, 1.0 = minimal compression)
 * @param maxWidthOrHeight - Optional max dimension in pixels
 * @returns CompressionResult with the compressed blob and size comparison
 */
export async function compressImage(
  file: File,
  quality: number = 0.8,
  maxWidthOrHeight?: number
): Promise<CompressionResult> {
  const imageCompression = (await import('browser-image-compression')).default;

  // Map quality (0.1–1.0) to maxSizeMB roughly
  // quality 1.0 → barely compress, quality 0.1 → very aggressive
  const maxSizeMB = Math.max(0.01, (file.size / (1024 * 1024)) * quality);

  const options = {
    maxSizeMB,
    maxWidthOrHeight: maxWidthOrHeight ?? undefined,
    useWebWorker: true,
    fileType: file.type as string,
    initialQuality: quality,
  };

  const compressedFile = await imageCompression(file, options);
  const compressedBlob = new Blob([compressedFile], { type: file.type });

  return {
    blob: compressedBlob,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
  };
}

/**
 * Estimate compressed size for live preview.
 * This is a rough approximation without actually compressing.
 *
 * @param originalSize - Original file size in bytes
 * @param quality - Target quality (0.1 – 1.0)
 * @returns Estimated compressed size in bytes
 */
export function estimateCompressedSize(
  originalSize: number,
  quality: number
): number {
  // Rough estimation: at quality 1.0, size ≈ 90% of original
  // At quality 0.1, size ≈ 5-15% of original
  const factor = 0.05 + quality * 0.85;
  return Math.round(originalSize * factor);
}
