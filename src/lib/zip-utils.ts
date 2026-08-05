import type { FileItem } from '@/types';
import { getOutputFileName } from '@/lib/format-utils';

/**
 * Bundle all converted files into a single ZIP and trigger a download.
 * Only includes files with status "converted" and a valid convertedBlob.
 */
export async function downloadAllAsZip(files: FileItem[]): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const convertedFiles = files.filter(
    (f) => f.status === 'converted' && f.convertedBlob
  );

  if (convertedFiles.length === 0) {
    throw new Error('No converted files available for download');
  }

  // Track used filenames to avoid duplicates
  const usedNames = new Set<string>();

  for (const file of convertedFiles) {
    let outputName = getOutputFileName(file.name, file.targetFormat);

    // Handle duplicate filenames
    if (usedNames.has(outputName)) {
      const baseName = outputName.replace(/\.[^.]+$/, '');
      const ext = outputName.split('.').pop();
      let counter = 1;
      while (usedNames.has(`${baseName}_${counter}.${ext}`)) {
        counter++;
      }
      outputName = `${baseName}_${counter}.${ext}`;
    }

    usedNames.add(outputName);
    zip.file(outputName, file.convertedBlob!);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Trigger download
  triggerDownload(zipBlob, 'switchfile-converted.zip');
}

/**
 * Trigger a browser download for a single file.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup after a short delay to ensure download starts
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }, 100);
}
