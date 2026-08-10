// ============================================================================
// SwitchFile — Image Converters
// ============================================================================
// Handles all image-to-image conversions using Canvas API and heic2any.
// Implements Smart Adaptive Compression Engine and size telemetry.
// ============================================================================

import { registerConverter } from './registry';
import type { FileFormat } from '@/types';

// ============================================================================
// Compression Helpers
// ============================================================================

/**
 * Promisified canvas.toBlob wrapper.
 */
function canvasToBlobAsync(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Smart Adaptive Compression Engine.
 * Progressively reduces quality if the converted image size is larger than the target size limit.
 */
async function getOptimizedImageBlob(
  canvas: HTMLCanvasElement,
  targetMimeType: string,
  originalSizeBytes: number
): Promise<Blob> {
  // Only lossy compression formats support quality settings in toBlob
  const supportsQuality = ['image/jpeg', 'image/webp', 'image/avif'].includes(targetMimeType);
  if (!supportsQuality) {
    return canvasToBlobAsync(canvas, targetMimeType, 1.0);
  }

  // Sweet-spot industrial quality
  let quality = 0.82;
  let blob = await canvasToBlobAsync(canvas, targetMimeType, quality);

  // WebP and AVIF require at least a 10% saving ratio
  const ratio = ['image/webp', 'image/avif'].includes(targetMimeType) ? 0.9 : 1.0;

  // Adaptively reduce quality in steps if the size is too large
  while (blob.size >= originalSizeBytes * ratio && quality > 0.50) {
    quality -= 0.08;
    blob = await canvasToBlobAsync(canvas, targetMimeType, quality);
  }

  return blob;
}

// ============================================================================
// Generic Canvas-based Image Converter
// ============================================================================

/**
 * Convert an image file to another image format using the Canvas API.
 * Supports PNG, JPG, WebP, and AVIF as output formats.
 */
async function convertImageViaCanvas(
  file: File,
  targetMime: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        // Fill white background for JPEG output (transparency safeguard)
        if (targetMime === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        const optimizedBlob = await getOptimizedImageBlob(canvas, targetMime, file.size);
        const savedPercent = ((file.size - optimizedBlob.size) / file.size) * 100;

        const resultBlob = optimizedBlob as Blob & {
          originalSize?: number;
          compressedSize?: number;
          savedPercent?: number;
        };
        resultBlob.originalSize = file.size;
        resultBlob.compressedSize = optimizedBlob.size;
        resultBlob.savedPercent = Math.max(0, savedPercent);

        resolve(resultBlob);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for conversion'));
    };

    img.src = url;
  });
}

// ============================================================================
// HEIC Decoder (via heic2any)
// ============================================================================

/**
 * Convert a HEIC/HEIF file to a standard image format.
 * Decodes to lossless PNG via heic2any first, then processes via Canvas/Adaptive Engine.
 */
async function convertHeicToFormat(
  file: File,
  targetMime: string
): Promise<Blob> {
  const heic2any = (await import('heic2any')).default;

  // First decode HEIC to a temporary lossless PNG blob
  const decodedResult = await heic2any({
    blob: file,
    toType: 'image/png',
  });

  const decodedBlob = Array.isArray(decodedResult) ? decodedResult[0] : decodedResult;

  // Process decoded PNG with the Canvas-based adaptive compression engine
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(decodedBlob);

    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        // Fill white background for JPEG output (transparency safeguard)
        if (targetMime === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        const optimizedBlob = await getOptimizedImageBlob(canvas, targetMime, file.size);
        const savedPercent = ((file.size - optimizedBlob.size) / file.size) * 100;

        const resultBlob = optimizedBlob as Blob & {
          originalSize?: number;
          compressedSize?: number;
          savedPercent?: number;
        };
        resultBlob.originalSize = file.size;
        resultBlob.compressedSize = optimizedBlob.size;
        resultBlob.savedPercent = Math.max(0, savedPercent);

        resolve(resultBlob);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load decoded HEIC image'));
    };

    img.src = url;
  });
}

// ============================================================================
// Format MIME Mapping
// ============================================================================

const FORMAT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
};

// ============================================================================
// Registration Helper
// ============================================================================

function registerImageConversion(
  from: FileFormat,
  to: FileFormat
): void {
  const targetMime = FORMAT_TO_MIME[to];
  if (!targetMime) return;

  if (from === 'heic') {
    registerConverter(from, to, async (file) => {
      return convertHeicToFormat(file, targetMime);
    });
  } else {
    registerConverter(from, to, async (file) => {
      return convertImageViaCanvas(file, targetMime);
    });
  }
}

// ============================================================================
// Register All Image Conversions
// ============================================================================

// Standard image-to-image conversions
registerImageConversion('png', 'jpg');
registerImageConversion('png', 'webp');
registerImageConversion('png', 'avif');
registerImageConversion('jpg', 'png');
registerImageConversion('jpg', 'webp');
registerImageConversion('jpg', 'avif');
registerImageConversion('webp', 'png');
registerImageConversion('webp', 'jpg');
registerImageConversion('webp', 'avif');
registerImageConversion('avif', 'png');
registerImageConversion('avif', 'jpg');
registerImageConversion('avif', 'webp');

// HEIC conversions
registerImageConversion('heic', 'png');
registerImageConversion('heic', 'jpg');
registerImageConversion('heic', 'webp');
registerImageConversion('heic', 'avif');
