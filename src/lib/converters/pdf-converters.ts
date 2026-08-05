// ============================================================================
// SwitchFile — PDF Converters
// ============================================================================
// Handles image→PDF and PDF→image conversions using pdf-lib and pdfjs-dist.
// ============================================================================

import { registerConverter } from './registry';

// ============================================================================
// Image → PDF (via pdf-lib)
// ============================================================================

/**
 * Convert an image file (PNG, JPG, WebP) to a single-page PDF.
 */
async function imageToPdf(file: File): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  const arrayBuffer = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.create();

  let image;
  const mime = file.type.toLowerCase();

  if (mime === 'image/png') {
    image = await pdfDoc.embedPng(arrayBuffer);
  } else if (mime === 'image/jpeg' || mime === 'image/jpg') {
    image = await pdfDoc.embedJpg(arrayBuffer);
  } else {
    // For WebP or other formats, convert to PNG first via canvas
    const pngBlob = await convertToCanvasPng(file);
    const pngBuffer = await pngBlob.arrayBuffer();
    image = await pdfDoc.embedPng(pngBuffer);
  }

  const { width, height } = image.scale(1);
  const page = pdfDoc.addPage([width, height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Helper to convert any image to PNG via canvas (for pdf-lib embedding).
 */
function convertToCanvasPng(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob returned null'));
        },
        'image/png'
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ============================================================================
// PDF → Image (via pdfjs-dist)
// ============================================================================

/**
 * Convert the first page of a PDF to an image (PNG or JPG).
 */
async function pdfToImage(
  file: File,
  targetMime: string = 'image/png',
  quality: number = 0.92
): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');

  // Set up the worker — use the bundled worker from pdfjs-dist
  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const scale = 2; // 2x for high quality rendering
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context for PDF rendering');
  }

  // Fill white background for JPG
  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PDF to image canvas conversion failed'));
      },
      targetMime,
      quality
    );
  });
}

// ============================================================================
// PDF → Text / DOCX / WebP (via pdfjs-dist & jszip)
// ============================================================================

/**
 * Convert a PDF file to plain text.
 */
async function pdfToTxt(file: File): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');

  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as unknown as { str: string; transform: number[] }[];
    
    // Sort items by coordinate geometry (top-to-bottom, left-to-right)
    const sortedItems = [...items].sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 5) {
        return yDiff; // different line
      }
      return a.transform[4] - b.transform[4]; // same line, left to right
    });

    let pageText = '';
    let lastY = -1;
    for (const item of sortedItems) {
      const currentY = item.transform[5];
      if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
        pageText += '\n';
      } else if (lastY !== -1) {
        pageText += ' ';
      }
      pageText += item.str;
      lastY = currentY;
    }

    if (pdf.numPages > 1) {
      text += `--- Page ${i} ---\n${pageText}\n\n`;
    } else {
      text += pageText;
    }
  }

  return new Blob([text], { type: 'text/plain;charset=utf-8' });
}

/**
 * Convert a PDF file to a Word Document (DOCX).
 * Extracts raw text via pdfjs-dist and bundles it inside a minimal valid DOCX structure.
 */
async function pdfToDocx(file: File): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');
  const JSZip = (await import('jszip')).default;

  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pagesText: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as unknown as { str: string; transform: number[] }[];

    // Sort items by coordinate geometry (top-to-bottom, left-to-right)
    const sortedItems = [...items].sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 5) {
        return yDiff; // different line
      }
      return a.transform[4] - b.transform[4]; // same line, left to right
    });

    let pageText = '';
    let lastY = -1;
    for (const item of sortedItems) {
      const currentY = item.transform[5];
      if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
        pageText += '\n';
      } else if (lastY !== -1) {
        pageText += ' ';
      }
      pageText += item.str;
      lastY = currentY;
    }

    pagesText.push(pageText);
  }

  const zip = new JSZip();

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  zip.file('[Content_Types].xml', contentTypesXml);

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  zip.file('_rels/.rels', relsXml);

  // 3. word/document.xml
  let bodyXml = '';
  for (let i = 0; i < pagesText.length; i++) {
    if (pagesText.length > 1) {
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Page ${i + 1}</w:t></w:r></w:p>`;
    }

    const lines = pagesText[i].split('\n');
    for (const line of lines) {
      const sanitizedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      bodyXml += `<w:p><w:r><w:t>${sanitizedLine}</w:t></w:r></w:p>`;
    }

    if (i < pagesText.length - 1) {
      bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  zip.file('word/document.xml', documentXml);

  const docxBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return docxBlob;
}

// ============================================================================
// Register All PDF Conversions
// ============================================================================

// Image → PDF
registerConverter('png', 'pdf', imageToPdf);
registerConverter('jpg', 'pdf', imageToPdf);
registerConverter('webp', 'pdf', imageToPdf);

// PDF → Image / WebP
registerConverter('pdf', 'png', async (file) => {
  return pdfToImage(file, 'image/png');
});

registerConverter('pdf', 'jpg', async (file, options) => {
  const quality =
    typeof options?.quality === 'number' ? options.quality : 0.92;
  return pdfToImage(file, 'image/jpeg', quality);
});

registerConverter('pdf', 'webp', async (file, options) => {
  const quality =
    typeof options?.quality === 'number' ? options.quality : 0.92;
  return pdfToImage(file, 'image/webp', quality);
});

// PDF → Text / DOCX
registerConverter('pdf', 'txt', pdfToTxt);
registerConverter('pdf', 'docx', pdfToDocx);
