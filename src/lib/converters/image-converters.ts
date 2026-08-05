// ============================================================================
// SwitchFile — Image Converters
// ============================================================================
// Handles all image-to-image conversions using Canvas API and heic2any.
// ============================================================================

import { registerConverter } from './registry';
import type { FileFormat } from '@/types';

// ============================================================================
// Generic Canvas-based Image Converter
// ============================================================================

/**
 * Convert an image file to another image format using the Canvas API.
 * Supports PNG, JPG, and WebP as output formats.
 */
async function convertImageViaCanvas(
  file: File,
  targetMime: string,
  quality: number = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        // For JPG output, fill white background (no alpha support)
        if (targetMime === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob returned null'));
            }
          },
          targetMime,
          quality
        );
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
 * Uses the heic2any library for decoding.
 */
async function convertHeicToFormat(
  file: File,
  targetFormat: 'image/png' | 'image/jpeg' | 'image/webp',
  quality: number = 0.92
): Promise<Blob> {
  // Dynamic import to avoid bundling heic2any on pages that don't need it
  const heic2any = (await import('heic2any')).default;

  const result = await heic2any({
    blob: file,
    toType: targetFormat,
    quality,
  });

  // heic2any can return a single Blob or an array of Blobs
  if (Array.isArray(result)) {
    return result[0];
  }
  return result;
}

// ============================================================================
// Format MIME Mapping
// ============================================================================

const FORMAT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
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
    registerConverter(from, to, async (file, options) => {
      const quality =
        typeof options?.quality === 'number' ? options.quality : 0.92;
      return convertHeicToFormat(
        file,
        targetMime as 'image/png' | 'image/jpeg' | 'image/webp',
        quality
      );
    });
  } else {
    registerConverter(from, to, async (file, options) => {
      const quality =
        typeof options?.quality === 'number' ? options.quality : 0.92;
      return convertImageViaCanvas(file, targetMime, quality);
    });
  }
}

// ============================================================================
// Register All Image Conversions
// ============================================================================

// Standard image-to-image conversions
registerImageConversion('png', 'jpg');
registerImageConversion('png', 'webp');
registerImageConversion('jpg', 'png');
registerImageConversion('jpg', 'webp');
registerImageConversion('webp', 'png');
registerImageConversion('webp', 'jpg');

// HEIC conversions
registerImageConversion('heic', 'png');
registerImageConversion('heic', 'jpg');
registerImageConversion('heic', 'webp');
