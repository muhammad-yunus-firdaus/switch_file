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
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/–|—/g, '-')
    .replace(/•/g, '*')
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
// XLSX → PDF
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
    throw new Error('Spreadsheet is empty — nothing to convert');
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
// DOCX → PDF
// ============================================================================

async function docxToPdf(file: File): Promise<Blob> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const JSZip = (await import('jszip')).default;
  const fontkit = (await import('@pdf-lib/fontkit')).default;

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const docXml = zip.file('word/document.xml');
  if (!docXml) {
    throw new Error('Invalid DOCX file — missing word/document.xml');
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

async function pptxToPdf(file: File): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  const JSZip = (await import('jszip')).default;

  interface Transform {
    x: number;
    y: number;
    w: number;
    h: number;
    chX?: number;
    chY?: number;
    chW?: number;
    chH?: number;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const slideFiles = Object.keys(zip.files).filter(name =>
      /^ppt\/slides\/slide\d+\.xml$/.test(name)
    );

    if (slideFiles.length === 0) {
      throw new Error('Invalid PPTX file — no slides found');
    }

    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);
      return numA - numB;
    });

    let slideWidth = 960;
    let slideHeight = 540;
    try {
      const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
      if (presentationXml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(presentationXml, 'application/xml');
        const sldSz = doc.getElementsByTagNameNS('*', 'sldSz')[0] || doc.getElementsByTagName('sldSz')[0];
        if (sldSz) {
          const cx = parseInt(sldSz.getAttribute('cx') || '', 10);
          const cy = parseInt(sldSz.getAttribute('cy') || '', 10);
          if (!isNaN(cx) && !isNaN(cy)) {
            slideWidth = Math.round(cx / 9525);
            slideHeight = Math.round(cy / 9525);
          }
        }
      }
    } catch {
      // Default to 16:9 widescreen
    }

    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i];
      const slideXml = await zip.file(slideFile)?.async('text');
      if (!slideXml) continue;

      const parser = new DOMParser();
      const doc = parser.parseFromString(slideXml, 'application/xml');

      const relsMap = new Map<string, string>();
      try {
        const slideName = slideFile.split('/').pop();
        const relsFile = `ppt/slides/_rels/${slideName}.rels`;
        const relsXml = await zip.file(relsFile)?.async('text');
        if (relsXml) {
          const relsDoc = parser.parseFromString(relsXml, 'application/xml');
          const relationships = relsDoc.getElementsByTagName('Relationship');
          for (let r = 0; r < relationships.length; r++) {
            const id = relationships[r].getAttribute('Id');
            const target = relationships[r].getAttribute('Target');
            if (id && target) {
              const cleanTarget = target.replace(/^\.\.\//, 'ppt/');
              relsMap.set(id, cleanTarget);
            }
          }
        }
      } catch {
        // Safe skip rels
      }

      const canvas = document.createElement('canvas');
      canvas.width = slideWidth;
      canvas.height = slideHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, slideWidth, slideHeight);

      const findChildByLocalName = (parent: Element, name: string): Element | null => {
        const children = parent.childNodes;
        for (let idx = 0; idx < children.length; idx++) {
          const child = children[idx];
          if (child.nodeType === 1 && (child as Element).localName === name) {
            return child as Element;
          }
        }
        const descendants = parent.getElementsByTagName('*');
        for (let idx = 0; idx < descendants.length; idx++) {
          if (descendants[idx].localName === name) {
            return descendants[idx];
          }
        }
        return null;
      };

      const parseXfrm = (xfrmNode: Element, parentXfrm?: Transform): Transform => {
        const off = findChildByLocalName(xfrmNode, 'off');
        const ext = findChildByLocalName(xfrmNode, 'ext');
        const chOff = findChildByLocalName(xfrmNode, 'chOff');
        const extCh = findChildByLocalName(xfrmNode, 'chExt');

        const lcx = off ? parseInt(off.getAttribute('x') || '0', 10) : 0;
        const lcy = off ? parseInt(off.getAttribute('y') || '0', 10) : 0;
        const lcw = ext ? parseInt(ext.getAttribute('cx') || '0', 10) : 0;
        const lch = ext ? parseInt(ext.getAttribute('cy') || '0', 10) : 0;

        let x = lcx / 9525;
        let y = lcy / 9525;
        let w = lcw / 9525;
        let h = lch / 9525;

        if (parentXfrm && parentXfrm.chW && parentXfrm.chH) {
          const scaleX = parentXfrm.w / (parentXfrm.chW / 9525);
          const scaleY = parentXfrm.h / (parentXfrm.chH / 9525);
          const dx = x - (parentXfrm.chX || 0) / 9525;
          const dy = y - (parentXfrm.chY || 0) / 9525;

          x = parentXfrm.x + dx * scaleX;
          y = parentXfrm.y + dy * scaleY;
          w = w * scaleX;
          h = h * scaleY;
        }

        const result: Transform = { x, y, w, h };

        if (chOff && extCh) {
          result.chX = parseInt(chOff.getAttribute('x') || '0', 10);
          result.chY = parseInt(chOff.getAttribute('y') || '0', 10);
          result.chW = parseInt(extCh.getAttribute('cx') || '1', 10);
          result.chH = parseInt(extCh.getAttribute('cy') || '1', 10);
        }

        return result;
      };

      const renderElement = async (elem: Element, parentXfrm?: Transform) => {
        const localName = elem.localName;

        if (localName === 'grpSp') {
          const grpSpPr = findChildByLocalName(elem, 'grpSpPr');
          let currentXfrm = parentXfrm;
          if (grpSpPr) {
            const xfrm = findChildByLocalName(grpSpPr, 'xfrm');
            if (xfrm) {
              currentXfrm = parseXfrm(xfrm, parentXfrm);
            }
          }
          const children = elem.childNodes;
          for (let c = 0; c < children.length; c++) {
            const child = children[c];
            if (child.nodeType === 1) {
              await renderElement(child as Element, currentXfrm);
            }
          }
        } else if (localName === 'pic') {
          const xfrm = findChildByLocalName(elem, 'xfrm');
          if (!xfrm) return;
          const t = parseXfrm(xfrm, parentXfrm);

          const blip = findChildByLocalName(elem, 'blip');
          if (!blip) return;

          let embedId = '';
          for (let attr = 0; attr < blip.attributes.length; attr++) {
            if (blip.attributes[attr].name.endsWith('embed')) {
              embedId = blip.attributes[attr].value;
              break;
            }
          }
          if (!embedId) return;

          const targetPath = relsMap.get(embedId);
          if (targetPath && zip.file(targetPath)) {
            const imgBlob = await zip.file(targetPath)?.async('blob');
            if (imgBlob) {
              const url = URL.createObjectURL(imgBlob);
              const img = new Image();
              await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
                img.src = url;
              });
              ctx.drawImage(img, t.x, t.y, t.w, t.h);
              URL.revokeObjectURL(url);
            }
          }
        } else if (localName === 'sp') {
          const xfrm = findChildByLocalName(elem, 'xfrm');
          if (!xfrm) return;
          const t = parseXfrm(xfrm, parentXfrm);

          const spPr = findChildByLocalName(elem, 'spPr');
          if (spPr) {
            const solidFill = findChildByLocalName(spPr, 'solidFill');
            if (solidFill) {
              const srgbClr = findChildByLocalName(solidFill, 'srgbClr');
              const sysClr = findChildByLocalName(solidFill, 'sysClr');
              const val = srgbClr?.getAttribute('val') || sysClr?.getAttribute('lastClr');
              if (val && /^[0-9A-Fa-f]{6}$/.test(val)) {
                ctx.fillStyle = `#${val}`;
                ctx.fillRect(t.x, t.y, t.w, t.h);
              }
            }

            const ln = findChildByLocalName(spPr, 'ln');
            if (ln) {
              const solidFillLn = findChildByLocalName(ln, 'solidFill');
              const srgbClrLn = solidFillLn ? findChildByLocalName(solidFillLn, 'srgbClr') : null;
              const valLn = srgbClrLn?.getAttribute('val');
              if (valLn && /^[0-9A-Fa-f]{6}$/.test(valLn)) {
                ctx.strokeStyle = `#${valLn}`;
                ctx.lineWidth = 1;
                ctx.strokeRect(t.x, t.y, t.w, t.h);
              }
            }
          }

          const txBody = findChildByLocalName(elem, 'txBody');
          if (!txBody) return;

          const allChildren = txBody.getElementsByTagName('*');
          const paragraphs: Element[] = [];
          for (let c = 0; c < allChildren.length; c++) {
            if (allChildren[c].localName === 'p') {
              paragraphs.push(allChildren[c]);
            }
          }

          let currentTextY = t.y + 18;

          for (let p = 0; p < paragraphs.length; p++) {
            const para = paragraphs[p];
            let align = 'left';
            const pPr = findChildByLocalName(para, 'pPr');
            if (pPr) {
              const algnAttr = pPr.getAttribute('algn');
              if (algnAttr === 'ctr') align = 'center';
              else if (algnAttr === 'r') align = 'right';
            }

            let runFontSize = 14;
            let runColor = '#1E293B';
            let runBold = false;

            const firstRPr = para.getElementsByTagName('*');
            for (let idx = 0; idx < firstRPr.length; idx++) {
              if (firstRPr[idx].localName === 'rPr') {
                const rPr = firstRPr[idx];
                const sz = rPr.getAttribute('sz');
                if (sz) {
                  runFontSize = Math.round(parseInt(sz, 10) / 100);
                }
                const b = rPr.getAttribute('b');
                if (b === '1' || b === 'true') {
                  runBold = true;
                }
                const solidFill = findChildByLocalName(rPr, 'solidFill');
                if (solidFill) {
                  const srgbClr = findChildByLocalName(solidFill, 'srgbClr');
                  const val = srgbClr?.getAttribute('val');
                  if (val && /^[0-9A-Fa-f]{6}$/.test(val)) {
                    runColor = `#${val}`;
                  }
                }
                break;
              }
            }

            let paragraphText = '';
            const runs = para.childNodes;
            for (let r = 0; r < runs.length; r++) {
              const run = runs[r];
              if (run.nodeType === 1) {
                const el = run as Element;
                if (el.localName === 'r' || el.localName === 'fld') {
                  const tNodes = el.getElementsByTagName('*');
                  for (let tIdx = 0; tIdx < tNodes.length; tIdx++) {
                    if (tNodes[tIdx].localName === 't') {
                      paragraphText += tNodes[tIdx].textContent || '';
                    }
                  }
                } else if (el.localName === 'br') {
                  paragraphText += '\n';
                }
              }
            }

            if (paragraphText.trim()) {
              ctx.fillStyle = runColor;
              ctx.font = `${runBold ? 'bold ' : ''}${runFontSize}px Arial, sans-serif`;
              ctx.textAlign = align as CanvasTextAlign;

              const drawX = align === 'center' ? t.x + t.w / 2 : align === 'right' ? t.x + t.w - 8 : t.x + 8;

              const lines = paragraphText.split('\n');
              for (const lineText of lines) {
                const words = lineText.split(' ');
                let line = '';
                let currentLineY = currentTextY;

                for (let n = 0; n < words.length; n++) {
                  const testLine = line + words[n] + ' ';
                  const metrics = ctx.measureText(testLine);
                  const testWidth = metrics.width;
                  if (testWidth > (t.w - 16) && n > 0) {
                    ctx.fillText(line, drawX, currentLineY);
                    line = words[n] + ' ';
                    currentLineY += runFontSize + 4;
                  } else {
                    line = testLine;
                  }
                }
                ctx.fillText(line, drawX, currentLineY);
                currentTextY = currentLineY + runFontSize + 8;
              }
              ctx.textAlign = 'left';
            }
          }
        }
      };

      const sld = doc.getElementsByTagNameNS('*', 'sld')[0] || doc.getElementsByTagName('sld')[0];
      if (sld) {
        const cSld = findChildByLocalName(sld, 'cSld');
        if (cSld) {
          const spTree = findChildByLocalName(cSld, 'spTree');
          if (spTree) {
            const children = spTree.childNodes;
            for (let c = 0; c < children.length; c++) {
              const child = children[c];
              if (child.nodeType === 1) {
                await renderElement(child as Element);
              }
            }
          }
        }
      }

      const slidePngDataUrl = canvas.toDataURL('image/png');
      const page = pdfDoc.addPage([slideWidth, slideHeight]);
      const image = await pdfDoc.embedPng(slidePngDataUrl);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: slideWidth,
        height: slideHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  } catch (error) {
    console.error('PPTX to PDF error:', error);
    throw new Error('Gagal memuat elemen gambar PPTX. Pastikan file PPTX tidak terkunci atau coba simpan sebagai PDF langsung melalui Microsoft PowerPoint.');
  }
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
