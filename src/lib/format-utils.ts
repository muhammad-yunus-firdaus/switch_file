import type { FileFormat, CategoryFilter } from '@/types';

const MIME_TO_FORMAT: Record<string, FileFormat> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
  'text/plain': 'txt',
};

const EXTENSION_TO_FORMAT: Record<string, FileFormat> = {
  pdf: 'pdf',
  docx: 'docx',
  xlsx: 'xlsx',
  xls: 'xlsx',
  pptx: 'pptx',
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  webp: 'webp',
  heic: 'heic',
  heif: 'heic',
  txt: 'txt',
};

const FORMAT_LABELS: Record<FileFormat, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  xlsx: 'XLSX',
  png: 'PNG',
  jpg: 'JPG',
  webp: 'WebP',
  heic: 'HEIC',
  txt: 'TXT',
  pptx: 'PPTX',
};

const FORMAT_MIME: Record<FileFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  heic: 'image/heic',
  txt: 'text/plain',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const FORMAT_CATEGORY: Record<FileFormat, CategoryFilter> = {
  pdf: 'documents',
  docx: 'documents',
  xlsx: 'documents',
  png: 'images',
  jpg: 'images',
  webp: 'images',
  heic: 'images',
  txt: 'documents',
  pptx: 'documents',
};

const CONVERSION_TARGETS: Record<FileFormat, FileFormat[]> = {
  pdf: ['png', 'jpg', 'docx', 'txt', 'webp', 'pptx'],
  docx: ['pdf'],
  xlsx: ['pdf'],
  png: ['jpg', 'webp', 'pdf'],
  jpg: ['png', 'webp', 'pdf'],
  webp: ['png', 'jpg', 'pdf'],
  heic: ['png', 'jpg', 'webp'],
  txt: [],
  pptx: ['pdf'],
};

/**
 * Detect the file format from a File object.
 * Uses MIME type first, falls back to file extension.
 */
export function detectFormat(file: File): FileFormat | null {
  if (file.type && MIME_TO_FORMAT[file.type]) {
    return MIME_TO_FORMAT[file.type];
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && EXTENSION_TO_FORMAT[extension]) {
    return EXTENSION_TO_FORMAT[extension];
  }

  return null;
}

/**
 * Get valid target formats for a given source format.
 */
export function getTargetFormats(source: FileFormat): FileFormat[] {
  return CONVERSION_TARGETS[source] ?? [];
}

/**
 * Get the default target format for a given source format.
 * Returns the first entry in the conversion targets list.
 */
export function getDefaultTarget(source: FileFormat): FileFormat | null {
  const targets = CONVERSION_TARGETS[source];
  return targets && targets.length > 0 ? targets[0] : null;
}

/**
 * Get the category filter for a given format.
 */
export function getCategoryForFormat(format: FileFormat): CategoryFilter {
  return FORMAT_CATEGORY[format];
}

/**
 * Get the human-readable label for a format.
 */
export function getFormatLabel(format: FileFormat): string {
  return FORMAT_LABELS[format];
}

/**
 * Get the MIME type string for a format.
 */
export function getFormatMime(format: FileFormat): string {
  return FORMAT_MIME[format];
}

/**
 * Format a byte count into a human-readable string.
 * Examples: "1.2 KB", "3.5 MB", "450 B"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Generate the output filename for a converted file.
 * Example: "photo.jpg" → "photo.png"
 */
export function getOutputFileName(
  originalName: string,
  targetFormat: FileFormat
): string {
  const baseName = originalName.replace(/\.[^.]+$/, '');
  return `${baseName}.${targetFormat}`;
}

/**
 * Generate a unique ID for file queue items.
 */
export function generateFileId(): string {
  return `sf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * List of all supported file formats.
 */
export const ALL_FORMATS: FileFormat[] = [
  'pdf', 'docx', 'xlsx', 'png', 'jpg', 'webp', 'heic', 'txt', 'pptx',
];

/**
 * List of all image formats.
 */
export const IMAGE_FORMATS: FileFormat[] = ['png', 'jpg', 'webp', 'heic'];

/**
 * List of all document formats.
 */
export const DOCUMENT_FORMATS: FileFormat[] = ['pdf', 'docx', 'xlsx', 'txt', 'pptx'];

/**
 * Accepted file input string for the file picker.
 */
export const ACCEPTED_FILE_TYPES =
  '.pdf,.docx,.xlsx,.xls,.pptx,.png,.jpg,.jpeg,.webp,.heic,.heif,.txt';
