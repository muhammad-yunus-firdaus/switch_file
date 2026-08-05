// ============================================================================
// SwitchFile — Document Converters
// ============================================================================
// Handles document format conversions (XLSX → PDF, DOCX → PDF).
// Uses SheetJS for spreadsheet parsing and pdf-lib for PDF generation.
// ============================================================================

import { registerConverter } from './registry';

// ============================================================================
// XLSX → PDF (via SheetJS + pdf-lib)
// ============================================================================

/**
 * Convert an Excel spreadsheet to PDF.
 * Parses the spreadsheet with SheetJS, renders the data as a table in a PDF.
 */
async function xlsxToPdf(file: File): Promise<Blob> {
  const XLSX = await import('xlsx');
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert sheet to array of arrays
  const data: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  });

  if (data.length === 0) {
    throw new Error('Spreadsheet is empty — nothing to convert');
  }

  // Create PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 842; // A4 Landscape width
  const PAGE_HEIGHT = 595; // A4 Landscape height
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

    // Draw header row (first row of data on first page, or continued)
    if (currentRow === 0 && data.length > 0) {
      const headerRow = data[0];
      for (let col = 0; col < headerRow.length; col++) {
        const cellText = String(headerRow[col] ?? '').substring(0, 30);
        page.drawText(cellText, {
          x: MARGIN + col * colWidth + 4,
          y: y - 12,
          size: FONT_SIZE + 1,
          font: boldFont,
          color: rgb(0.12, 0.16, 0.23),
        });
      }
      // Draw header underline
      page.drawLine({
        start: { x: MARGIN, y: y - HEADER_HEIGHT },
        end: { x: PAGE_WIDTH - MARGIN, y: y - HEADER_HEIGHT },
        thickness: 1,
        color: rgb(0.8, 0.83, 0.88),
      });
      y -= HEADER_HEIGHT + 4;
      currentRow = 1;
    }

    // Draw data rows
    const endRow = Math.min(currentRow + rowsPerPage, data.length);
    for (let row = currentRow; row < endRow; row++) {
      const rowData = data[row];

      // Alternate row background
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
        page.drawText(cellText, {
          x: MARGIN + col * colWidth + 4,
          y: y - 12,
          size: FONT_SIZE,
          font: font,
          color: rgb(0.12, 0.16, 0.23),
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
// DOCX → PDF (Basic text extraction + PDF rendering)
// ============================================================================

/**
 * Convert a DOCX file to PDF.
 * Extracts raw text content and renders it as a simple PDF.
 * Note: This is a basic implementation — complex formatting is not preserved.
 */
async function docxToPdf(file: File): Promise<Blob> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  // Extract text from DOCX (ZIP → document.xml → text content)
  const JSZip = (await import('jszip')).default;
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const docXml = zip.file('word/document.xml');
  if (!docXml) {
    throw new Error('Invalid DOCX file — missing word/document.xml');
  }

  const xmlContent = await docXml.async('text');

  // Parse XML and extract text from <w:t> tags
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');
  const textNodes = doc.getElementsByTagNameNS(
    'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    't'
  );

  // Build paragraphs from <w:p> elements
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

  // If no paragraphs found, try fallback with all <w:t> nodes
  if (paragraphs.length === 0 || paragraphs.every((p) => p.trim() === '')) {
    let allText = '';
    for (let i = 0; i < textNodes.length; i++) {
      allText += (textNodes[i].textContent ?? '') + ' ';
    }
    paragraphs.length = 0;
    paragraphs.push(allText.trim());
  }

  // Create PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const PAGE_WIDTH = 595; // A4 Portrait
  const PAGE_HEIGHT = 842;
  const MARGIN = 50;
  const FONT_SIZE = 11;
  const LINE_HEIGHT = 16;
  const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      y -= LINE_HEIGHT; // Empty paragraph = line break
      if (y < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      continue;
    }

    // Word wrap the paragraph
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(testLine, FONT_SIZE);

      if (textWidth > MAX_WIDTH && currentLine) {
        // Draw current line
        page.drawText(currentLine, {
          x: MARGIN,
          y,
          size: FONT_SIZE,
          font,
          color: rgb(0.12, 0.16, 0.23),
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

    // Draw remaining text
    if (currentLine) {
      page.drawText(currentLine, {
        x: MARGIN,
        y,
        size: FONT_SIZE,
        font,
        color: rgb(0.12, 0.16, 0.23),
      });
      y -= LINE_HEIGHT * 1.5; // Extra spacing between paragraphs

      if (y < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Convert a PPTX presentation to PDF.
 * Extracts text from XML slides (ppt/slides/slide*.xml) and renders them in a PDF document.
 */
async function pptxToPdf(file: File): Promise<Blob> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const JSZip = (await import('jszip')).default;

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find all slide XML files
  const slideFiles = Object.keys(zip.files).filter(name =>
    /^ppt\/slides\/slide\d+\.xml$/.test(name)
  );

  if (slideFiles.length === 0) {
    throw new Error('Invalid PPTX file — no slides found');
  }

  // Sort slides numerically
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''), 10);
    const numB = parseInt(b.replace(/\D/g, ''), 10);
    return numA - numB;
  });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 842; // Landscape format
  const PAGE_HEIGHT = 595;
  const MARGIN = 50;

  for (let i = 0; i < slideFiles.length; i++) {
    const slideXml = await zip.file(slideFiles[i])?.async('text');
    if (!slideXml) continue;

    const parser = new DOMParser();
    const doc = parser.parseFromString(slideXml, 'application/xml');
    
    // Extract text from <a:t> elements inside slide
    const textNodes = doc.getElementsByTagNameNS(
      'http://schemas.openxmlformats.org/drawingml/2006/main',
      't'
    );

    const slideTexts: string[] = [];
    for (let j = 0; j < textNodes.length; j++) {
      const val = textNodes[j].textContent;
      if (val && val.trim() !== '') {
        slideTexts.push(val.trim());
      }
    }

    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    
    // Draw Slide Title/Header
    page.drawText(`Slide ${i + 1}`, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN,
      size: 16,
      font: boldFont,
      color: rgb(0.15, 0.25, 0.45),
    });

    let y = PAGE_HEIGHT - MARGIN - 40;
    
    // Draw text elements
    for (const paragraph of slideTexts) {
      if (y < MARGIN) break;
      const isHeader = paragraph.length < 40 && y === (PAGE_HEIGHT - MARGIN - 40);

      page.drawText(paragraph.substring(0, 100), {
        x: MARGIN,
        y,
        size: isHeader ? 13 : 11,
        font: isHeader ? boldFont : font,
        color: rgb(0.12, 0.16, 0.23),
      });

      y -= 22;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Convert a PDF file to a PPTX presentation.
 * Extracts text from PDF pages and imports them into slides using pptxgenjs.
 */
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
      if (Math.abs(yDiff) > 5) {
        return yDiff;
      }
      return a.transform[4] - b.transform[4];
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

    const slide = pptx.addSlide();
    
    slide.addText(`Slide ${i}`, {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: '2563EB',
    });

    if (pageText.trim()) {
      slide.addText(pageText.substring(0, 1500), {
        x: 0.5,
        y: 1.5,
        w: '90%',
        h: 5.0,
        fontSize: 12,
        color: '1E293B',
        valign: 'top',
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
