/**
 * pptx-renderer.ts  — v2
 *
 * Parsing OOXML (.pptx) slide → HTMLCanvasElement, siap di-embed ke pdf-lib.
 *
 * Perbaikan v2:
 *  1. Text collision fix — setiap paragraf & baris punya curY independen
 *     yang naik dengan benar sesuai lineSpacing/lnSpc OOXML.
 *  2. Black-box fix — shape tanpa fill eksplisit default ke transparent,
 *     bukan hitam. Pengecekan noFill dilakukan sebelum apply fill.
 *  3. grpSp recursive fix — koordinat children di-transform relatif
 *     terhadap parent group menggunakan chOff/chExt secara benar.
 */

// ─── Public API Types ─────────────────────────────────────────────────────────

export interface SlideSize {
  widthPx: number;
  heightPx: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** EMU per pixel at 96 DPI */
const EMU_PER_PX = 9525;
const FALLBACK_FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

// ─── XML Helpers ──────────────────────────────────────────────────────────────

/** Direct child by localName only (namespace-agnostic). */
function ch(parent: Element, name: string): Element | null {
  const kids = parent.childNodes;
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k.nodeType === 1 && (k as Element).localName === name) return k as Element;
  }
  return null;
}

/** First descendant by localName (depth-first). */
function desc(parent: Element, name: string): Element | null {
  const all = parent.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName === name) return all[i];
  }
  return null;
}

/** Read integer attribute with fallback. */
function ai(el: Element | null, attr: string, fallback = 0): number {
  if (!el) return fallback;
  const v = el.getAttribute(attr);
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}

/** EMU → pixel */
const px = (emu: number) => emu / EMU_PER_PX;

/** Extract embedId from a:blip attributes (r:embed or any *:embed) */
function getEmbedId(blipEl: Element): string {
  for (let a = 0; a < blipEl.attributes.length; a++) {
    if (blipEl.attributes[a].localName === 'embed') return blipEl.attributes[a].value;
  }
  return '';
}

// ─── Transform ────────────────────────────────────────────────────────────────

interface Xfrm {
  x: number; y: number; w: number; h: number;
  rot: number;     // radians
  flipH: boolean;
  flipV: boolean;
  // Group child coordinate space (stored in EMU, used for child scaling)
  chX: number; chY: number; chW: number; chH: number;
}

const ZERO_XFRM: Xfrm = { x: 0, y: 0, w: 0, h: 0, rot: 0, flipH: false, flipV: false, chX: 0, chY: 0, chW: 0, chH: 0 };

/**
 * Parse <a:xfrm> into pixel-space Xfrm.
 *
 * Group coordinate transform:
 *   A grpSp defines a child coordinate space via <a:chOff>/<a:chExt>.
 *   Children use coordinates in that space; we map them to the group's
 *   rendered pixel rectangle.
 *
 *   Edge cases handled:
 *   - chW/chH = 0  → treat as 1:1 pixel mapping (no scaling)
 *   - Nested groups → parent already carries the scaled pixel rect,
 *     so we recurse naturally.
 */
function parseXfrm(xfrmEl: Element, parent?: Xfrm): Xfrm {
  const off   = ch(xfrmEl, 'off');
  const ext   = ch(xfrmEl, 'ext');
  const chOff = ch(xfrmEl, 'chOff');
  const chExt = ch(xfrmEl, 'chExt');

  const rawX = ai(off,  'x');
  const rawY = ai(off,  'y');
  const rawW = ai(ext, 'cx');
  const rawH = ai(ext, 'cy');

  let x: number, y: number, w: number, h: number;

  if (parent && parent.chW > 0 && parent.chH > 0) {
    // Map from group child-space (EMU) → parent pixel rect
    const scaleX = parent.w / px(parent.chW);
    const scaleY = parent.h / px(parent.chH);
    const originX = px(parent.chX);
    const originY = px(parent.chY);
    x = parent.x + (px(rawX) - originX) * scaleX;
    y = parent.y + (px(rawY) - originY) * scaleY;
    w = px(rawW) * scaleX;
    h = px(rawH) * scaleY;
  } else if (parent && parent.chW === 0 && parent.chH === 0 && (parent.w > 0 || parent.h > 0)) {
    // grpSp declared without chExt (malformed but common in older PPTX).
    // Treat child coords as absolute EMU — still convert to px normally.
    x = px(rawX);
    y = px(rawY);
    w = px(rawW);
    h = px(rawH);
  } else {
    // Top-level: straight EMU → px
    x = px(rawX);
    y = px(rawY);
    w = px(rawW);
    h = px(rawH);
  }

  const rotRaw = ai(xfrmEl, 'rot', 0);
  const rot    = (rotRaw / 60000) * (Math.PI / 180);
  const flipH  = xfrmEl.getAttribute('flipH') === '1';
  const flipV  = xfrmEl.getAttribute('flipV') === '1';

  return {
    x, y, w, h, rot, flipH, flipV,
    chX: ai(chOff, 'x'),
    chY: ai(chOff, 'y'),
    chW: ai(chExt, 'cx', 0),
    chH: ai(chExt, 'cy', 0),
  };
}

// ─── Color Parser ─────────────────────────────────────────────────────────────

const SCHEME_COLORS: Record<string, string> = {
  dk1: '000000', lt1: 'FFFFFF', dk2: '1F3864', lt2: 'E7E6E6',
  accent1: '4472C4', accent2: 'ED7D31', accent3: 'A9D18E',
  accent4: 'FFC000', accent5: '5B9BD5', accent6: '70AD47',
  hlink: '0563C1', folHlink: '954F72',
  tx1: '000000', tx2: '595959', bg1: 'FFFFFF', bg2: 'EEECE1',
  black: '000000', white: 'FFFFFF',
};

/**
 * Convert a solidFill element (containing srgbClr/sysClr/schemeClr) → CSS rgba().
 *
 * Bug-2 fix: alpha value is read from a:alpha child of the color node.
 * lumMod/lumOff modifiers are applied to keep colour accurate.
 */
function colorFromFill(fillEl: Element): string {
  const srgb = ch(fillEl, 'srgbClr');
  const sys  = ch(fillEl, 'sysClr');
  const schm = ch(fillEl, 'schemeClr');

  let hex = '';
  let colorNode: Element | null = null;

  if (srgb)      { hex = srgb.getAttribute('val') ?? ''; colorNode = srgb; }
  else if (sys)  { hex = sys.getAttribute('lastClr') ?? ''; colorNode = sys; }
  else if (schm) { hex = SCHEME_COLORS[schm.getAttribute('val') ?? ''] ?? 'FFFFFF'; colorNode = schm; }

  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return 'rgba(0,0,0,0)'; // transparent fallback

  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);
  let alpha = 1.0;

  if (colorNode) {
    // a:alpha — stored as 0–100000, meaning 0% to 100% opacity
    const alphaEl = ch(colorNode, 'alpha');
    if (alphaEl) alpha = ai(alphaEl, 'val', 100000) / 100000;

    // a:lumMod — multiply luminance
    const lumMod = ch(colorNode, 'lumMod');
    if (lumMod) {
      const m = ai(lumMod, 'val', 100000) / 100000;
      r = Math.min(255, Math.round(r * m));
      g = Math.min(255, Math.round(g * m));
      b = Math.min(255, Math.round(b * m));
    }

    // a:lumOff — add offset to luminance
    const lumOff = ch(colorNode, 'lumOff');
    if (lumOff) {
      const o = Math.round(ai(lumOff, 'val', 0) / 100000 * 255);
      r = Math.min(255, Math.max(0, r + o));
      g = Math.min(255, Math.max(0, g + o));
      b = Math.min(255, Math.max(0, b + o));
    }

    // a:shade — multiply by factor (darkness)
    const shade = ch(colorNode, 'shade');
    if (shade) {
      const s = ai(shade, 'val', 100000) / 100000;
      r = Math.min(255, Math.round(r * s));
      g = Math.min(255, Math.round(g * s));
      b = Math.min(255, Math.round(b * s));
    }

    // a:tint — interpolate towards white
    const tint = ch(colorNode, 'tint');
    if (tint) {
      const t = ai(tint, 'val', 100000) / 100000;
      r = Math.min(255, Math.round(r + (255 - r) * (1 - t)));
      g = Math.min(255, Math.round(g + (255 - g) * (1 - t)));
      b = Math.min(255, Math.round(b + (255 - b) * (1 - t)));
    }
  }

  return `rgba(${r},${g},${b},${alpha})`;
}

/** Perceived brightness 0–255 */
function luminance(css: string): number {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return 128;
  return (parseInt(m[1]) * 299 + parseInt(m[2]) * 587 + parseInt(m[3]) * 114) / 1000;
}

// ─── Shape Fill Resolver ──────────────────────────────────────────────────────

interface FillResult {
  color: string;   // CSS color string, 'none' = no fill
  isNone: boolean; // true when noFill is explicit
}

/**
 * Resolve fill from a spPr / tcPr element.
 *
 * Priority order (matches OOXML spec):
 *   1. <a:noFill>        → transparent, stop
 *   2. <a:blipFill>      → image fill — caller handles image; report isNone here
 *      so shape background isn't painted black underneath the image.
 *   3. <a:solidFill>     → solid colour (respects a:alpha)
 *   4. <a:gradFill>      → use first gradient stop as approximation
 *   5. <a:pattFill>      → use fgClr as approximation
 *   6. nothing found     → transparent (NOT black — this is the key fix)
 */
function resolveFill(spPrEl: Element | null): FillResult {
  if (!spPrEl) return { color: 'none', isNone: true };

  // 1. Explicit no-fill
  if (ch(spPrEl, 'noFill')) return { color: 'none', isNone: true };

  // 2. Image fill — don't paint a background colour; caller draws the image
  if (ch(spPrEl, 'blipFill')) return { color: 'none', isNone: true };

  // 3. Solid colour
  const solidFill = ch(spPrEl, 'solidFill');
  if (solidFill) {
    const color = colorFromFill(solidFill);
    // alpha = 0 → effectively transparent
    const alphaM = color.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([0-9.]+)\)/);
    if (alphaM && parseFloat(alphaM[1]) === 0) return { color: 'none', isNone: true };
    return { color, isNone: false };
  }

  // 4. Gradient fill — approximate with first stop
  const gradFill = ch(spPrEl, 'gradFill');
  if (gradFill) {
    const gsLst = ch(gradFill, 'gsLst');
    if (gsLst) {
      const kids = gsLst.childNodes;
      for (let i = 0; i < kids.length; i++) {
        const k = kids[i] as Element;
        if (k.nodeType !== 1) continue;
        const sf = ch(k, 'solidFill');
        if (sf) return { color: colorFromFill(sf), isNone: false };
      }
    }
    return { color: 'rgba(200,200,200,0.5)', isNone: false };
  }

  // 5. Pattern fill — approximate with foreground colour
  const pattFill = ch(spPrEl, 'pattFill');
  if (pattFill) {
    const fgClr = ch(pattFill, 'fgClr');
    const sf = fgClr ? ch(fgClr, 'solidFill') : null;
    if (sf) return { color: colorFromFill(sf), isNone: false };
  }

  // 6. No fill found → transparent (not black)
  return { color: 'none', isNone: true };
}

// ─── Shape Path Tracer ────────────────────────────────────────────────────────

function tracePath(
  ctx: CanvasRenderingContext2D,
  prst: string,
  x: number, y: number, w: number, h: number
) {
  ctx.beginPath();
  switch (prst) {
    case 'ellipse': case 'oval':
      ctx.ellipse(x + w / 2, y + h / 2, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
      break;
    case 'rtTriangle':
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2); ctx.closePath();
      break;
    case 'roundRect': case 'round1Rect': case 'round2DiagRect': case 'round2SameRect': {
      const r = Math.min(10, w * 0.08, h * 0.08);
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
      break;
    }
    case 'hexagon': {
      const d = w / 4;
      ctx.moveTo(x + d, y); ctx.lineTo(x + w - d, y); ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w - d, y + h); ctx.lineTo(x + d, y + h); ctx.lineTo(x, y + h / 2);
      ctx.closePath(); break;
    }
    case 'pentagon': {
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h * 0.38);
      ctx.lineTo(x + w * 0.82, y + h); ctx.lineTo(x + w * 0.18, y + h);
      ctx.lineTo(x, y + h * 0.38); ctx.closePath(); break;
    }
    case 'parallelogram': {
      const off2 = w * 0.2;
      ctx.moveTo(x + off2, y); ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - off2, y + h); ctx.lineTo(x, y + h); ctx.closePath(); break;
    }
    case 'line': case 'straightConnector1':
    case 'bentConnector2': case 'bentConnector3': case 'bentConnector4': case 'bentConnector5':
    case 'curvedConnector2': case 'curvedConnector3': case 'curvedConnector4':
      ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); break;
    default:
      ctx.rect(x, y, w, h);
  }
}

// ─── Text Body Renderer ───────────────────────────────────────────────────────

interface RunStyle {
  text: string;
  size: number;        // px
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  fontFace: string;
  isBreak: boolean;    // true for <a:br> line-break sentinels
}

function parseRPr(rPrEl: Element | null, defaultSizePt = 18): RunStyle {
  // a:sz is in hundredths of a point → divide by 100 to get pt, use as px approximation
  const szHundredths = ai(rPrEl, 'sz', 0);
  const size = szHundredths > 0 ? Math.max(6, Math.round(szHundredths / 100)) : defaultSizePt;
  const bold      = rPrEl?.getAttribute('b') === '1';
  const italic    = rPrEl?.getAttribute('i') === '1';
  const underline = (rPrEl?.getAttribute('u') ?? 'none') !== 'none';

  // Color — if no solidFill on rPr, inherit (caller supplies default)
  let color = '';
  if (rPrEl) {
    const sf = ch(rPrEl, 'solidFill');
    if (sf) color = colorFromFill(sf);
  }

  let fontFace = FALLBACK_FONT;
  if (rPrEl) {
    const latin = ch(rPrEl, 'latin');
    const typeface = latin?.getAttribute('typeface') ?? '';
    if (typeface && !typeface.startsWith('+')) {
      fontFace = `"${typeface}", ${FALLBACK_FONT}`;
    }
  }

  return { text: '', size, bold, italic, underline, color, fontFace, isBreak: false };
}

/**
 * Resolve line spacing for a paragraph.
 * Returns line height in pixels given a font size.
 *
 * Bug-1 fix: previously ignored lnSpc entirely.
 */
function resolveLineSpacingPx(pPrEl: Element | null, fontSizePx: number): number {
  if (!pPrEl) return fontSizePx * 1.35;

  const lnSpc = ch(pPrEl, 'lnSpc');
  if (!lnSpc) return fontSizePx * 1.35;

  const spcPct = ch(lnSpc, 'spcPct');
  if (spcPct) {
    // a:spcPct val="150000" means 150%
    const pct = ai(spcPct, 'val', 100000) / 100000;
    return fontSizePx * pct;
  }

  const spcPts = ch(lnSpc, 'spcPts');
  if (spcPts) {
    // a:spcPts val="1800" means 18pt
    return ai(spcPts, 'val', 0) / 100;
  }

  return fontSizePx * 1.35;
}

/**
 * Resolve space-before / space-after for a paragraph in pixels.
 */
function resolveSpacingPx(spEl: Element | null): number {
  if (!spEl) return 0;
  const spcPts = ch(spEl, 'spcPts');
  if (spcPts) return ai(spcPts, 'val', 0) / 100;
  const spcPct = ch(spEl, 'spcPct');
  if (spcPct) return ai(spcPct, 'val', 0) / 100000 * 12; // rough pt estimate
  return 0;
}

/**
 * Render a complete <p:txBody> onto the canvas.
 *
 * Bug-1 fix: curY is correctly advanced per line (including wrapped lines),
 * instead of being shared and only incremented once per block.
 */
function renderTxBody(
  ctx: CanvasRenderingContext2D,
  txBodyEl: Element,
  t: Xfrm,
  bgColor: string
): void {
  const bodyPr   = ch(txBodyEl, 'bodyPr');
  const lInsPx   = px(ai(bodyPr, 'lIns', 91440));
  const rInsPx   = px(ai(bodyPr, 'rIns', 91440));
  const tInsPx   = px(ai(bodyPr, 'tIns', 45720));
  const bInsPx   = px(ai(bodyPr, 'bIns', 45720));
  const anchor   = bodyPr?.getAttribute('anchor') ?? 't';
  const autofit  = bodyPr ? (ch(bodyPr, 'normAutofit') !== null || ch(bodyPr, 'spAutoFit') !== null) : false;

  const areaW = Math.max(1, t.w - lInsPx - rInsPx);
  const areaH = Math.max(1, t.h - tInsPx - bInsPx);
  const bgIsDark = luminance(bgColor) < 100;

  // ── Collect paragraphs (direct children only) ────────────────────────────
  const paraEls: Element[] = [];
  const kids = txBodyEl.childNodes;
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].nodeType === 1 && (kids[i] as Element).localName === 'p') {
      paraEls.push(kids[i] as Element);
    }
  }
  if (paraEls.length === 0) return;

  // ── Pre-compute rendered lines ───────────────────────────────────────────
  interface RenderedLine {
    runs: RunStyle[];
    lineH: number;
    align: string;
    spaceBefore: number;
    spaceAfter: number;
  }

  const lines: RenderedLine[] = [];

  for (const para of paraEls) {
    const pPr = ch(para, 'pPr');
    const algn = pPr?.getAttribute('algn') ?? 'l';
    const align = algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : 'left';

    const defRPr = pPr ? ch(pPr, 'defRPr') : null;
    const defStyle = parseRPr(defRPr, 18);

    // Space before/after paragraph
    const spcBef = pPr ? ch(pPr, 'spcBef') : null;
    const spcAft = pPr ? ch(pPr, 'spcAft') : null;
    const spaceBefore = resolveSpacingPx(spcBef);
    const spaceAfter  = resolveSpacingPx(spcAft);

    // Collect runs for this paragraph
    const runs: RunStyle[] = [];
    const paraKids = para.childNodes;
    for (let ci = 0; ci < paraKids.length; ci++) {
      const kid = paraKids[ci] as Element;
      if (kid.nodeType !== 1) continue;

      if (kid.localName === 'r') {
        const rPr = ch(kid, 'rPr');
        const style = parseRPr(rPr, defStyle.size);
        if (!style.color) style.color = defStyle.color || 'rgba(0,0,0,1)';
        if (!style.fontFace || style.fontFace === FALLBACK_FONT) style.fontFace = defStyle.fontFace;
        const tEl = ch(kid, 't');
        style.text = tEl?.textContent ?? '';
        if (style.text) runs.push(style);
      } else if (kid.localName === 'fld') {
        const tEl = ch(kid, 't');
        const rPr = ch(kid, 'rPr');
        const style = parseRPr(rPr, defStyle.size);
        if (!style.color) style.color = defStyle.color || 'rgba(0,0,0,1)';
        style.text = tEl?.textContent ?? '';
        if (style.text) runs.push(style);
      } else if (kid.localName === 'br') {
        // Line break sentinel — carries rPr for the next line's size
        const rPr = ch(kid, 'rPr');
        const style = parseRPr(rPr, defStyle.size);
        runs.push({ ...style, text: '', isBreak: true });
      }
    }

    // Determine dominant font size for line height
    const domSize = runs.filter(r => !r.isBreak && r.text).reduce((max, r) => Math.max(max, r.size), defStyle.size);
    const lineH = resolveLineSpacingPx(pPr, domSize);

    if (runs.length === 0) {
      // Empty paragraph — still contributes vertical space
      lines.push({ runs: [], lineH, align, spaceBefore, spaceAfter });
    } else {
      lines.push({ runs, lineH, align, spaceBefore, spaceAfter });
    }
  }

  // ── Vertical anchor computation ──────────────────────────────────────────
  const totalH = lines.reduce((s, l) => s + l.spaceBefore + l.lineH + l.spaceAfter, 0);
  let startY: number;
  if (anchor === 'ctr') {
    startY = t.y + tInsPx + Math.max(0, (areaH - totalH) / 2);
  } else if (anchor === 'b') {
    startY = t.y + t.h - bInsPx - totalH;
  } else {
    startY = t.y + tInsPx;
  }

  // Auto-shrink font if content overflows and autofit is on
  let fontScale = 1.0;
  if (autofit && totalH > areaH && areaH > 0) {
    fontScale = Math.max(0.4, areaH / totalH);
  }

  // ── Clip to text box bounds ──────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.rect(t.x, t.y, t.w, t.h);
  ctx.clip();

  let curY = startY;

  for (const lineBlock of lines) {
    curY += lineBlock.spaceBefore;

    // Bug-1 fix: curY starts at the top of this line's baseline area.
    // We advance it by lineH AFTER drawing, not before.
    const baselineY = curY + lineBlock.lineH * 0.78; // ~78% is typical baseline ratio

    if (lineBlock.runs.length === 0) {
      // Empty paragraph — just advance Y
      curY += lineBlock.lineH + lineBlock.spaceAfter;
      continue;
    }

    // Measure total run width for alignment
    let totalRunW = 0;
    for (const run of lineBlock.runs) {
      if (run.isBreak || !run.text) continue;
      ctx.font = buildFont(run, fontScale);
      totalRunW += ctx.measureText(run.text).width;
    }

    const leftEdge = t.x + lInsPx;
    let curX: number;
    if (lineBlock.align === 'center') {
      curX = t.x + (t.w - totalRunW) / 2;
    } else if (lineBlock.align === 'right') {
      curX = t.x + t.w - rInsPx - totalRunW;
    } else {
      curX = leftEdge;
    }

    // Render runs with word-wrap
    for (const run of lineBlock.runs) {
      if (run.isBreak) {
        // Hard line break — move to next line
        curY += lineBlock.lineH;
        curX = leftEdge;
        continue;
      }
      if (!run.text) continue;

      const effectiveColor = resolveTextColor(run.color, bgIsDark);
      ctx.font = buildFont(run, fontScale);
      ctx.fillStyle = effectiveColor;
      ctx.textBaseline = 'alphabetic';

      // Word-wrap within areaW
      const words = run.text.split(' ');
      let segment = '';

      for (let wi = 0; wi < words.length; wi++) {
        const candidate = segment ? segment + ' ' + words[wi] : words[wi];
        const candidateW = ctx.measureText(candidate).width;

        if (candidateW > areaW && segment !== '') {
          // Draw accumulated segment, wrap
          ctx.fillText(segment, curX, baselineY + (curY - startY - lineBlock.spaceBefore));
          curX = leftEdge;
          curY += lineBlock.lineH;
          segment = words[wi];
        } else {
          segment = candidate;
        }
      }

      if (segment) {
        const drawY = baselineY + (curY - startY - lineBlock.spaceBefore);
        ctx.fillText(segment, curX, drawY);
        if (run.underline) {
          const segW = ctx.measureText(segment).width;
          ctx.beginPath();
          ctx.strokeStyle = effectiveColor;
          ctx.lineWidth = Math.max(0.5, run.size * fontScale * 0.07);
          ctx.moveTo(curX, drawY + 2);
          ctx.lineTo(curX + segW, drawY + 2);
          ctx.stroke();
        }
        curX += ctx.measureText(segment).width;
      }
    }

    curY += lineBlock.lineH + lineBlock.spaceAfter;
  }

  ctx.restore();
}

function buildFont(run: RunStyle, scale = 1.0): string {
  const sz = Math.max(4, run.size * scale);
  return `${run.italic ? 'italic ' : ''}${run.bold ? 'bold ' : ''}${sz}px ${run.fontFace}`;
}

/**
 * Ensure text is always readable against background.
 * Only force-swap when the original colour would be invisible (e.g. white on white).
 */
function resolveTextColor(color: string, bgIsDark: boolean): string {
  if (!color || color === 'rgba(0,0,0,0)') {
    return bgIsDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)';
  }
  const lum = luminance(color);
  // Only override when contrast is extremely bad (nearly identical to bg)
  if (bgIsDark && lum < 30) return 'rgba(240,240,240,1)';
  if (!bgIsDark && lum > 230) return 'rgba(30,30,30,1)';
  return color;
}

// ─── Image Renderer ───────────────────────────────────────────────────────────

async function drawImageBlob(
  ctx: CanvasRenderingContext2D,
  blob: Blob,
  t: Xfrm,
  srcRectEl: Element | null
): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          if (t.w <= 0 || t.h <= 0) { resolve(); return; }
          if (srcRectEl && img.naturalWidth > 0 && img.naturalHeight > 0) {
            const cl = ai(srcRectEl, 'l', 0) / 100000;
            const ct = ai(srcRectEl, 't', 0) / 100000;
            const cr = ai(srcRectEl, 'r', 0) / 100000;
            const cb = ai(srcRectEl, 'b', 0) / 100000;
            if (cl + cr < 1 && ct + cb < 1) {
              ctx.drawImage(
                img,
                img.naturalWidth * cl,
                img.naturalHeight * ct,
                img.naturalWidth * (1 - cl - cr),
                img.naturalHeight * (1 - ct - cb),
                t.x, t.y, t.w, t.h
              );
              resolve(); return;
            }
          }
          ctx.drawImage(img, t.x, t.y, t.w, t.h);
        } catch { /* ignore tainted-canvas or decode errors */ }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ─── Public Helpers ───────────────────────────────────────────────────────────

export function buildRelsMap(relsXml: string): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const doc = new DOMParser().parseFromString(relsXml, 'application/xml');
    const rels = doc.getElementsByTagName('Relationship');
    for (let i = 0; i < rels.length; i++) {
      const id  = rels[i].getAttribute('Id');
      const tgt = rels[i].getAttribute('Target');
      if (id && tgt) {
        // Normalise: ../media/img.png → ppt/media/img.png
        map.set(id, tgt.replace(/^\.\.\//, 'ppt/').replace(/^\//, ''));
      }
    }
  } catch { /* return empty map on malformed rels */ }
  return map;
}

// ─── Main Slide Renderer ──────────────────────────────────────────────────────

/**
 * Parse one PPTX slide XML and render it to an HTMLCanvasElement.
 *
 * @param slideXml  - text of ppt/slides/slideN.xml
 * @param relsMap   - relationship ID → zip path (from buildRelsMap)
 * @param getBlob   - async getter: zip path → Blob | null
 * @param slideSize - slide dimensions in pixels (from presentation.xml)
 * @param scale     - optional downscale factor (default 1.0)
 */
export async function renderSlideToCanvas(
  slideXml: string,
  relsMap: Map<string, string>,
  getBlob: (path: string) => Promise<Blob | null>,
  slideSize: SlideSize,
  scale = 1.0
): Promise<HTMLCanvasElement | null> {
  const { widthPx, heightPx } = slideSize;

  const canvas = document.createElement('canvas');
  canvas.width  = Math.max(1, Math.round(widthPx  * scale));
  canvas.height = Math.max(1, Math.round(heightPx * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (scale !== 1.0) ctx.scale(scale, scale);

  // Default white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, widthPx, heightPx);

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(slideXml, 'application/xml');
  } catch { return canvas; }

  const sld = doc.getElementsByTagNameNS('*', 'sld')[0] ?? doc.getElementsByTagName('sld')[0];
  if (!sld) return canvas;
  const cSld = ch(sld, 'cSld');
  if (!cSld) return canvas;

  // ── Slide background ──────────────────────────────────────────────────────
  let slideBg = 'rgba(255,255,255,1)';
  const bgEl = ch(cSld, 'bg');
  if (bgEl) {
    const bgPr = ch(bgEl, 'bgPr');
    if (bgPr) {
      const sf = ch(bgPr, 'solidFill');
      if (sf) {
        slideBg = colorFromFill(sf);
        ctx.fillStyle = slideBg;
        ctx.fillRect(0, 0, widthPx, heightPx);
      }
      const blipFill = ch(bgPr, 'blipFill');
      if (blipFill) {
        const blip = ch(blipFill, 'blip');
        if (blip) {
          const embedId = getEmbedId(blip);
          const path = embedId ? relsMap.get(embedId) : undefined;
          if (path) {
            const blob = await getBlob(path);
            if (blob) {
              const bgT: Xfrm = { ...ZERO_XFRM, x: 0, y: 0, w: widthPx, h: heightPx };
              await drawImageBlob(ctx, blob, bgT, null);
            }
          }
        }
      }
    }
  }

  const spTree = desc(cSld, 'spTree');
  if (!spTree) return canvas;

  // Defer text renders so they always appear above shapes
  const deferredText: Array<() => void> = [];

  // ── Recursive element renderer ────────────────────────────────────────────
  async function renderEl(el: Element, parentXfrm?: Xfrm): Promise<void> {
    const name = el.localName;

    // ── Group shape — full recursive traversal with coordinate transform ──
    if (name === 'grpSp') {
      const grpSpPr = ch(el, 'grpSpPr');
      // Start with parent as fallback; override if this group has its own xfrm
      let grpXfrm: Xfrm | undefined = parentXfrm;
      if (grpSpPr) {
        const xfrmEl = ch(grpSpPr, 'xfrm');
        if (xfrmEl) {
          // Parse the group's own bounding box relative to its parent
          grpXfrm = parseXfrm(xfrmEl, parentXfrm);
        }
      }
      // Recurse into every child element of the group — this handles:
      //   p:sp (shapes), p:pic (images), p:cxnSp (connectors),
      //   nested p:grpSp (sub-groups), p:graphicFrame (tables/charts)
      const kids = el.childNodes;
      for (let i = 0; i < kids.length; i++) {
        const kid = kids[i];
        if (kid.nodeType !== 1) continue;
        const kidName = (kid as Element).localName;
        // Skip grpSpPr — that's metadata, not a renderable child
        if (kidName === 'grpSpPr' || kidName === 'nvGrpSpPr') continue;
        try { await renderEl(kid as Element, grpXfrm); } catch (e) {
          console.warn('[pptx-renderer] grpSp child failed:', (e as Error).message);
        }
      }
      return;
    }

    // ── Picture / image ────────────────────────────────────────────────────
    if (name === 'pic') {
      const spPr = ch(el, 'spPr');
      const xfrmEl = spPr ? ch(spPr, 'xfrm') : null;
      if (!xfrmEl) return;
      const t = parseXfrm(xfrmEl, parentXfrm);
      if (t.w <= 0 || t.h <= 0) return;

      // blipFill lives directly on the pic element (not inside spPr)
      const blipFill = ch(el, 'blipFill');
      const blip = blipFill ? ch(blipFill, 'blip') : null;
      if (!blip) return;

      const embedId = getEmbedId(blip);
      if (!embedId) return;
      const imgPath = relsMap.get(embedId);
      if (!imgPath) return;
      const blob = await getBlob(imgPath);
      if (!blob) return;

      const srcRect = blipFill ? ch(blipFill, 'srcRect') : null;
      const hasTransform = Math.abs(t.rot) > 0.001 || t.flipH || t.flipV;

      if (hasTransform) {
        ctx.save();
        applyTransform(ctx, t);
        await drawImageBlob(ctx, blob, t, srcRect);
        ctx.restore();
      } else {
        await drawImageBlob(ctx, blob, t, srcRect);
      }
      return;
    }

    // ── Shape / connector ──────────────────────────────────────────────────
    if (name === 'sp' || name === 'cxnSp') {
      const spPr = ch(el, 'spPr');
      const txBody = ch(el, 'txBody');
      const xfrmEl = spPr ? ch(spPr, 'xfrm') : null;
      if (!xfrmEl) return;
      const t = parseXfrm(xfrmEl, parentXfrm);
      if (t.w <= 0 || t.h <= 0) return;

      const prstGeom = spPr ? ch(spPr, 'prstGeom') : null;
      const prst = prstGeom?.getAttribute('prst') ?? 'rect';
      const hasTransform = Math.abs(t.rot) > 0.001 || t.flipH || t.flipV;

      if (hasTransform) {
        ctx.save();
        applyTransform(ctx, t);
      }

      // ── Image fill (blipFill can live in spPr or directly on sp element)
      // Check both locations to avoid missing it when shape has image texture.
      const blipFillSp = (spPr ? ch(spPr, 'blipFill') : null) ?? ch(el, 'blipFill');
      if (blipFillSp) {
        const blip = ch(blipFillSp, 'blip');
        if (blip) {
          const embedId = getEmbedId(blip);
          const imgPath = embedId ? relsMap.get(embedId) : undefined;
          if (imgPath) {
            const blob = await getBlob(imgPath);
            if (blob) {
              const srcRect = ch(blipFillSp, 'srcRect');
              await drawImageBlob(ctx, blob, t, srcRect);
            }
          }
        }
      }

      // ── Shape background fill
      // resolveFill returns isNone=true for: noFill, blipFill, or no fill at all.
      // In all those cases we skip painting — prevents the black-box bug.
      let shapeFillColor = slideBg;
      if (!blipFillSp && spPr) {
        const fillResult = resolveFill(spPr);
        if (!fillResult.isNone) {
          shapeFillColor = fillResult.color;
          tracePath(ctx, prst, t.x, t.y, t.w, t.h);
          ctx.fillStyle = fillResult.color;
          ctx.fill();
        }
        // fillResult.isNone → skip fill entirely (transparent shape)
      }

      // ── Border / stroke (only when ln has an explicit solidFill)
      if (spPr) {
        const ln = ch(spPr, 'ln');
        if (ln && !ch(ln, 'noFill')) {
          const solidFillLn = ch(ln, 'solidFill');
          if (solidFillLn) {
            const lnColor = colorFromFill(solidFillLn);
            const lnW = Math.max(0.5, px(ai(ln, 'w', 12700)));
            tracePath(ctx, prst, t.x, t.y, t.w, t.h);
            ctx.strokeStyle = lnColor;
            ctx.lineWidth = lnW;
            ctx.stroke();
          }
        }
      }

      if (hasTransform) ctx.restore();

      // ── Text body — always deferred to render on top of all shapes
      if (txBody) {
        const capturedT = { ...t };
        const capturedBg = shapeFillColor;
        deferredText.push(() => renderTxBody(ctx, txBody, capturedT, capturedBg));
      }
      return;
    }

    // ── Table (graphicFrame) ───────────────────────────────────────────────
    if (name === 'graphicFrame') {
      const xfrmEl = ch(el, 'xfrm') ?? desc(el, 'xfrm');
      if (!xfrmEl) return;
      const t = parseXfrm(xfrmEl, parentXfrm);

      const tbl = desc(el, 'tbl');
      if (!tbl) return;

      const gridColEls = tbl.getElementsByTagName('gridCol');
      const colWidths: number[] = [];
      for (let c = 0; c < gridColEls.length; c++) colWidths.push(px(ai(gridColEls[c], 'w')));

      const rows = tbl.getElementsByTagName('tr');
      let rowY = t.y;
      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri];
        const rowH = px(ai(row, 'h', 457200));
        const cells: Element[] = [];
        const rowKids = row.childNodes;
        for (let ci = 0; ci < rowKids.length; ci++) {
          if (rowKids[ci].nodeType === 1 && (rowKids[ci] as Element).localName === 'tc') {
            cells.push(rowKids[ci] as Element);
          }
        }
        let colX = t.x;
        for (let ci = 0; ci < cells.length; ci++) {
          const cell = cells[ci];
          const cw = colWidths[ci] ?? (t.w / Math.max(1, cells.length));
          const tcPr = ch(cell, 'tcPr');
          const cellFill = tcPr ? resolveFill(tcPr) : { color: 'none', isNone: true };
          if (!cellFill.isNone) {
            ctx.fillStyle = cellFill.color;
            ctx.fillRect(colX, rowY, cw, rowH);
          } else {
            ctx.fillStyle = ri % 2 === 0 ? 'rgba(255,255,255,1)' : 'rgba(243,244,246,1)';
            ctx.fillRect(colX, rowY, cw, rowH);
          }
          ctx.strokeStyle = 'rgba(209,213,219,0.8)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(colX, rowY, cw, rowH);

          const cellTxBody = ch(cell, 'txBody');
          if (cellTxBody) {
            const cellT: Xfrm = { ...ZERO_XFRM, x: colX, y: rowY, w: cw, h: rowH };
            const bg = cellFill.isNone ? slideBg : cellFill.color;
            deferredText.push(() => renderTxBody(ctx, cellTxBody, cellT, bg));
          }
          colX += cw;
        }
        rowY += rowH;
      }
    }
  }

  // ── Traverse spTree ───────────────────────────────────────────────────────
  const treeKids = spTree.childNodes;
  for (let i = 0; i < treeKids.length; i++) {
    const kid = treeKids[i];
    if (kid.nodeType !== 1) continue;
    try {
      await renderEl(kid as Element);
    } catch (e) {
      console.warn('[pptx-renderer] Element render failed:', (e as Error).message);
    }
  }

  // ── Render deferred text on top ───────────────────────────────────────────
  for (const fn of deferredText) {
    try { fn(); } catch (e) {
      console.warn('[pptx-renderer] Text render failed:', (e as Error).message);
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

// ─── Rotation Helpers ─────────────────────────────────────────────────────────

function applyTransform(ctx: CanvasRenderingContext2D, t: Xfrm): void {
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  ctx.translate(cx, cy);
  if (t.rot) ctx.rotate(t.rot);
  if (t.flipH) ctx.scale(-1, 1);
  if (t.flipV) ctx.scale(1, -1);
  ctx.translate(-cx, -cy);
}

// Unused placeholder (rotations handled inline above)
function withRotation(_ctx: CanvasRenderingContext2D, _t: Xfrm, _fn: () => void): void { /* no-op */ }
