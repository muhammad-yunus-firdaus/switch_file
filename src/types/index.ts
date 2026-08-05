/** All file formats supported by SwitchFile */
export type FileFormat =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'png'
  | 'jpg'
  | 'webp'
  | 'heic'
  | 'txt'
  | 'pptx';

/** Category filter tabs in the workspace header */
export type CategoryFilter = 'all' | 'documents' | 'images' | 'compressor';

/** Processing status of a file in the queue */
export type FileStatus = 'queued' | 'converting' | 'converted' | 'error';

/** Represents a single file in the conversion queue */
export interface FileItem {
  /** Unique identifier for this queue entry */
  id: string;
  /** The original File object from the user's file system */
  file: File;
  /** Display name of the file */
  name: string;
  /** Original file size in bytes */
  size: number;
  /** Detected source format */
  sourceFormat: FileFormat;
  /** Target conversion format */
  targetFormat: FileFormat;
  /** Current processing status */
  status: FileStatus;
  /** Conversion progress (0–100) */
  progress: number;
  /** The converted file blob (available after conversion) */
  convertedBlob?: Blob;
  /** Converted file size in bytes */
  convertedSize?: number;
  /** Time taken for conversion in milliseconds */
  processingTimeMs?: number;
  /** Error message if conversion failed */
  errorMessage?: string;
}

/** A single entry in the local conversion history (IndexedDB) */
export interface ConversionHistoryEntry {
  /** Unique identifier */
  id: string;
  /** Original file name */
  fileName: string;
  /** Source format before conversion */
  sourceFormat: FileFormat;
  /** Target format after conversion */
  targetFormat: FileFormat;
  /** Original file size in bytes */
  originalSizeBytes: number;
  /** Converted file size in bytes */
  convertedSizeBytes?: number;
  /** Processing duration in milliseconds */
  processingTimeMs?: number;
  /** Outcome of the conversion */
  status: 'success' | 'error';
  /** Timestamp of the conversion */
  createdAt: Date;
  /** Converted file blob stored in IndexedDB (optional, for history downloads) */
  convertedBlob?: Blob;
}

/** Payload sent to Supabase for anonymous analytics logging */
export interface SupabaseLogPayload {
  file_name: string;
  source_format: string;
  target_format: string;
  original_size_bytes: number;
  converted_size_bytes?: number;
  processing_time_ms?: number;
  status: string;
}

/** Options for the image compressor module */
export interface CompressionOptions {
  /** Target quality (0.1 – 1.0) */
  quality: number;
  /** Optional max width or height in pixels */
  maxWidthOrHeight?: number;
}

/** Result of a compression operation */
export interface CompressionResult {
  /** The compressed file blob */
  blob: Blob;
  /** Original size in bytes */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
}

/** A converter function that transforms a file from one format to another */
export type ConverterFunction = (
  file: File,
  options?: Record<string, unknown>
) => Promise<Blob>;

/** Map key format for the converter registry: "source->target" */
export type ConversionKey = `${FileFormat}->${FileFormat}`;

/** Metadata for a supported conversion pair */
export interface ConversionPairInfo {
  /** Source format */
  from: FileFormat;
  /** Target format */
  to: FileFormat;
  /** Human-readable label (e.g., "JPG to PDF") */
  label: string;
  /** Category this conversion belongs to */
  category: CategoryFilter;
}

/** A quick action tool card displayed in the workspace */
export interface QuickTool {
  /** Unique identifier */
  id: string;
  /** Display label (e.g., "JPG to PDF") */
  label: string;
  /** Short description */
  description: string;
  /** Source format to pre-select */
  sourceFormat: FileFormat | null;
  /** Target format to pre-select */
  targetFormat: FileFormat | null;
  /** Category tab to activate */
  category: CategoryFilter;
  /** Lucide icon name */
  icon: string;
  /** Gradient background class */
  gradient: string;
}
