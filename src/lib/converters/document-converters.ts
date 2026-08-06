import type { PDFPage, PDFFont, RGB } from 'pdf-lib';
import { registerConverter } from './registry';

// ============================================================================
// Fontkit Integration & Global Font Caching
// ============================================================================

let cachedFontRegular: ArrayBuffer | null = null;
let cachedFontBold: ArrayBuffer | null = null;

async function getCustomFontRegular(): Promise<ArrayBuffer> {
  if (cachedFontRegular) return cachedFontRegular;
  const res = await fetch('https://cdn.jsdelivr.net/gh/google/fonts@master/apache/roboto/static/Roboto-Regular.ttf');
  if (!res.ok) throw new Error('Failed to fetch Roboto-Regular font');
  cachedFontRegular = await res.arrayBuffer();
  return cachedFontRegular;
}

async function getCustomFontBold(): Promise<ArrayBuffer> {
  if (cachedFontBold) return cachedFontBold;
  const res = await fetch('https://cdn.jsdelivr.net/gh/google/fonts@master/apache/roboto/static/Roboto-Bold.ttf');
  if (!res.ok) throw new Error('Failed to fetch Roboto-Bold font');
  cachedFontBold = await res.arrayBuffer();
  return cachedFontBold;
}

function sanitizeWinAnsiText(str: string): string {
  if (!str) return '';
  return str
    .replace(/â†’/g, '->')
    .replace(/â†/g, '<-')
    .replace(/â€“|â€”/g, '-')
    .replace(/â€¢/g, '*')
    .replace(/[^\x00-\xFF]/g, ''); // Remove non-WinAnsi characters
}

interface DrawTextOptions {
  x: number;
  y: number;
  size: number;
  font: PDFFont;
  color: RGB;
  isCustomFont: boolean;
}

function drawTextSafely(page: PDFPage, text: string, options: DrawTextOptions) {
  const { x, y, size, font, color, isCustomFont } = options;
  const processedText = isCustomFont ? text : sanitizeWinAnsiText(text);

  try {
    page.drawText(processedText, { x, y, size, font, color });
  } catch (err) {
    console.warn('drawText failed, trying ASCII-only failsafe:', err);
    try {
      const asciiText = text.replace(/[^\x20-\x7E]/g, '');
      page.drawText(asciiText, { x, y, size, font, color });
    } catch {
      // ignore silently if it still fails
    }
  }
}

// ============================================================================
// XLSX â†’ PDF
// ============================================================================

async function xlsxToPdf(file: File): Promise<Blob> {
  const XLSX = await import('xlsx');
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const fontkit = (await import('@pdf-lib/fontkit')).default;

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  });

  if (data.length === 0) {
    throw new Error('Spreadsheet is empty â€” nothing to convert');
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let font;
  let boldFont;
  let isCustomFont = false;

  try {
    const regBytes = await getCustomFontRegular();
    const boldBytes = await getCustomFontBold();
    font = await pdfDoc.embedFont(regBytes);
    boldFont = await pdfDoc.embedFont(boldBytes);
    isCustomFont = true;
  } catch (e) {
    console.warn('Failed to embed Roboto, falling back to Helvetica:', e);
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  const PAGE_WIDTH = 842;
  const PAGE_HEIGHT = 595;
  const MARGIN = 40;
  const FONT_SIZE = 8;
  const ROW_HEIGHT = 16;
  const HEADER_HEIGHT = 20;

  const maxCols = Math.max(...data.map((row) => row.length));
  const colWidth = (PAGE_WIDTH - MARGIN * 2) / Math.max(maxCols, 1);
  const rowsPerPage = Math.floor(
    (PAGE_HEIGHT - MARGIN * 2 - HEADER_HEIGHT) / ROW_HEIGHT
  );

  let currentRow = 0;

  while (currentRow < data.length) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    if (currentRow === 0 && data.length > 0) {
      const headerRow = data[0];
      for (let col = 0; col < headerRow.length; col++) {
        const cellText = String(headerRow[col] ?? '').substring(0, 30);
        drawTextSafely(page, cellText, {
          x: MARGIN + col * colWidth + 4,
          y: y - 12,
          size: FONT_SIZE + 1,
          font: boldFont,
          color: rgb(0.12, 0.16, 0.23),
          isCustomFont,
        });
      }
      page.drawLine({
        start: { x: MARGIN, y: y - HEADER_HEIGHT },
        end: { x: PAGE_WIDTH - MARGIN, y: y - HEADER_HEIGHT },
        thickness: 1,
        color: rgb(0.8, 0.83, 0.88),
      });
      y -= HEADER_HEIGHT + 4;
      currentRow = 1;
    }

    const endRow = Math.min(currentRow + rowsPerPage, data.length);
    for (let row = currentRow; row < endRow; row++) {
      const rowData = data[row];

      if (row % 2 === 0) {
        page.drawRectangle({
          x: MARGIN,
          y: y - ROW_HEIGHT,
          width: PAGE_WIDTH - MARGIN * 2,
          height: ROW_HEIGHT,
          color: rgb(0.96, 0.97, 0.98),
        });
      }

      for (let col = 0; col < (rowData?.length ?? 0); col++) {
        const cellText = String(rowData[col] ?? '').substring(0, 30);
        drawTextSafely(page, cellText, {
          x: MARGIN + col * colWidth + 4,
          y: y - 12,
          size: FONT_SIZE,
          font,
          color: rgb(0.12, 0.16, 0.23),
          isCustomFont,
        });
      }
      y -= ROW_HEIGHT;
    }

    currentRow = endRow;
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ============================================================================
// DOCX â†’ PDF
// ============================================================================

async function docxToPdf(file: File): Promise<Blob> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const JSZip = (await import('jszip')).default;
  const fontkit = (await import('@pdf-lib/fontkit')).default;

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const docXml = zip.file('word/document.xml');
  if (!docXml) {
    throw new Error('Invalid DOCX file â€” missing word/document.xml');
  }

  const xmlContent = await docXml.async('text');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');
  const textNodes = doc.getElementsByTagNameNS(
    'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    't'
  );

  const paragraphs: string[] = [];
  const pElements = doc.getElementsByTagNameNS(
    'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'p'
  );

  for (let i = 0; i < pElements.length; i++) {
    const tElements = pElements[i].getElementsByTagNameNS(
      'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      't'
    );
    let paragraphText = '';
    for (let j = 0; j < tElements.length; j++) {
      paragraphText += tElements[j].textContent ?? '';
    }
    paragraphs.push(paragraphText);
  }

  if (paragraphs.length === 0 || paragraphs.every((p) => p.trim() === '')) {
    let allText = '';
    for (let i = 0; i < textNodes.length; i++) {
      allText += (textNodes[i].textContent ?? '') + ' ';
    }
    paragraphs.length = 0;
    paragraphs.push(allText.trim());
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let font;
  let isCustomFont = false;

  try {
    const regBytes = await getCustomFontRegular();
    font = await pdfDoc.embedFont(regBytes);
    isCustomFont = true;
  } catch (e) {
    console.warn('Failed to embed Roboto, falling back to Helvetica:', e);
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  const MARGIN = 50;
  const FONT_SIZE = 11;
  const LINE_HEIGHT = 16;
  const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      y -= LINE_HEIGHT;
      if (y < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      let textWidth = 0;
      const wrapText = isCustomFont ? testLine : sanitizeWinAnsiText(testLine);
      
      try {
        textWidth = font.widthOfTextAtSize(wrapText, FONT_SIZE);
      } catch {
        try {
          textWidth = font.widthOfTextAtSize(testLine.replace(/[^\x20-\x7E]/g, ''), FONT_SIZE);
        } catch {
          textWidth = 0;
        }
      }

      if (textWidth > MAX_WIDTH && currentLine) {
        drawTextSafely(page, currentLine, {
          x: MARGIN,
          y,
          size: FONT_SIZE,
          font,
          color: rgb(0.12, 0.16, 0.23),
          isCustomFont,
        });
        y -= LINE_HEIGHT;

        if (y < MARGIN) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      drawTextSafely(page, currentLine, {
        x: MARGIN,
        y,
        size: FONT_SIZE,
        font,
        color: rgb(0.12, 0.16, 0.23),
        isCustomFont,
      });
      y -= LINE_HEIGHT * 1.5;

      if (y < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ============================================================================
// PPTX â†’ PDF  (Refactored â€” 2-fase: Canvas Rendering â†’ pdf-lib assembly)
// ============================================================================

async function pptxToPdf(file: File): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  const JSZip = (await import('jszip')).default;
  const { renderSlideToCanvas, buildRelsMap } = await import('./pptx-renderer');

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // â”€â”€ Cari file zip secara case-insensitive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const zipKeys = Object.keys(zip.files);
  function findZipEntry(path: string) {
    const lc = path.toLowerCase().replace(/^\//, '');
    for (const k of zipKeys) {
      if (k.toLowerCase() === lc) return zip.files[k];
    }
    return zip.file(path) ?? null;
  }

  async function getBlob(path: string): Promise<Blob | null> {
    try {
      const entry = findZipEntry(path);
      if (!entry) return null;
      return await entry.async('blob');
    } catch { return null; }
  }

  // â”€â”€ Baca dimensi slide dari presentation.xml â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let slideWidthPx = 960;
  let slideHeightPx = 540;
  try {
    const presEntry = findZipEntry('ppt/presentation.xml');
    if (presEntry) {
      const presXml = await presEntry.async('text');
      const presDoc = new DOMParser().parseFromString(presXml, 'application/xml');
      const sldSz =
        presDoc.getElementsByTagNameNS('*', 'sldSz')[0] ??
        presDoc.getElementsByTagName('sldSz')[0];
      if (sldSz) {
        const cx = parseInt(sldSz.getAttribute('cx') ?? '', 10);
        const cy = parseInt(sldSz.getAttribute('cy') ?? '', 10);
        if (!isNaN(cx) && cx > 0) slideWidthPx  = Math.round(cx / 9525);
        if (!isNaN(cy) && cy > 0) slideHeightPx = Math.round(cy / 9525);
      }
    }
  } catch { /* pakai default 16:9 */ }

  // Batasi ukuran canvas agar tidak crash di browser mobile
  const MAX_W = 1920;
  const scale = Math.min(1.0, MAX_W / slideWidthPx);
  const canvasW = Math.round(slideWidthPx  * scale);
  const canvasH = Math.round(slideHeightPx * scale);

  // â”€â”€ Kumpulkan semua file slide, urutkan numerik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const slideFiles = zipKeys
    .filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10);
      const nb = parseInt(b.replace(/\D/g, ''), 10);
      return na - nb;
    });

  if (slideFiles.length === 0) {
    throw new Error('Invalid PPTX â€” tidak ada slide ditemukan.');
  }

  const pdfDoc = await PDFDocument.create();

  // â”€â”€ Iterasi setiap slide â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (let i = 0; i < slideFiles.length; i++) {
    const slideFile = slideFiles[i];
    let canvas: HTMLCanvasElement | null = null;

    try {
      // 1) Baca XML slide
      const slideEntry = zip.file(slideFile);
      const slideXml = slideEntry ? await slideEntry.async('text') : null;
      if (!slideXml) {
        pdfDoc.addPage([slideWidthPx, slideHeightPx]);
        continue;
      }

      // 2) Baca rels slide
      const slideName = slideFile.split('/').pop() ?? `slide${i + 1}.xml`;
      const relsPath = `ppt/slides/_rels/${slideName}.rels`;
      const relsEntry = findZipEntry(relsPath);
      const relsXml = relsEntry ? await relsEntry.async('text') : null;
      const relsMap = relsXml
        ? buildRelsMap(relsXml)
        : new Map<string, string>();

      // 3) Fase 1 â€” Render slide ke canvas
      canvas = await renderSlideToCanvas(
        slideXml,
        relsMap,
        getBlob,
        { widthPx: slideWidthPx, heightPx: slideHeightPx },
        scale
      );

      // 4) Fase 2 â€” Canvas â†’ JPEG â†’ embed ke PDF
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const b64 = dataUrl.split(',')[1];
        const jpgBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

        const page = pdfDoc.addPage([slideWidthPx, slideHeightPx]);
        const img = await pdfDoc.embedJpg(jpgBytes);
        page.drawImage(img, { x: 0, y: 0, width: slideWidthPx, height: slideHeightPx });

        // Bebaskan memori canvas segera
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      } else {
        pdfDoc.addPage([slideWidthPx, slideHeightPx]);
      }
    } catch (slideErr) {
      console.warn(`[pptxToPdf] Slide ${i + 1} gagal, menambahkan halaman kosong:`, slideErr);
      try {
        if (canvas) { canvas.width = 0; canvas.height = 0; }
        pdfDoc.addPage([canvasW, canvasH]);
      } catch { /* lanjutkan */ }
    }
  }

  if (pdfDoc.getPageCount() === 0) {
    throw new Error('Tidak ada slide yang berhasil dikonversi.');
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ============================================================================
// PDF → PPTX
// ============================================================================

async function pdfToPptx(file: File): Promise<Blob> {
  const pdfjs = await import('pdfjs-dist');
  const PptxGenJS = (await import('pptxgenjs')).default;

  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pptx = new PptxGenJS();

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as unknown as { str: string; transform: number[] }[];

    const sortedItems = [...items].sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 5) return yDiff;
      return a.transform[4] - b.transform[4];
    });

    let pageText = '';
    let lastY = -1;
    for (const item of sortedItems) {
      const currentY = item.transform[5];
      if (lastY !== -1 && Math.abs(currentY - lastY) > 5) pageText += '\n';
      else if (lastY !== -1) pageText += ' ';
      pageText += item.str;
      lastY = currentY;
    }

    const slide = pptx.addSlide();
    slide.addText(`Slide ${i}`, {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, bold: true, color: '2563EB',
    });

    if (pageText.trim()) {
      slide.addText(pageText.substring(0, 1500), {
        x: 0.5, y: 1.5, w: '90%', h: 5.0,
        fontSize: 12, color: '1E293B', valign: 'top',
      });
    }
  }

  const pptxBuffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  return new Blob([pptxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}

// ============================================================================
// Register All Document Conversions
// ============================================================================

registerConverter('xlsx', 'pdf', xlsxToPdf);
registerConverter('docx', 'pdf', docxToPdf);
registerConverter('pptx', 'pdf', pptxToPdf);
registerConverter('pdf', 'pptx', pdfToPptx);
