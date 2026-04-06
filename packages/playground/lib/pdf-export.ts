import init, { build_pdf_from_json } from 'pdf-builder-wasm';

let wasmReady = false;

async function ensureWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
}

export async function exportPdfWasm(documentJson: string): Promise<Uint8Array> {
  await ensureWasm();
  const resolved = await resolveImagesInJson(resolveVariablesInJson(documentJson));
  return build_pdf_from_json(resolved);
}

function getPlainTextFromSpans(spans: any[]): string {
  if (!Array.isArray(spans)) return '';
  return spans.map((s: any) => (typeof s.text === 'string' ? s.text : '')).join('');
}

function resolveVariablesInJson(json: string): string {
  const doc = JSON.parse(json);
  if (!doc.pages) return json;
  const totalPages = doc.pages.length;
  for (let pi = 0; pi < doc.pages.length; pi++) {
    const page = doc.pages[pi];
    const pageNum = pi + 1;
    if (page.header?.text) page.header.text = resolveVariables(page.header.text, pageNum, totalPages);
    if (page.footer?.text) page.footer.text = resolveVariables(page.footer.text, pageNum, totalPages);
    if (page.elements) {
      for (const el of page.elements) {
        if (el.type === 'documentBody' && el.spans && (!el.content || el.content === '')) {
          el.content = getPlainTextFromSpans(el.spans);
        }
        if (el.content && typeof el.content === 'string') {
          el.content = resolveVariables(el.content, pageNum, totalPages);
        }
      }
    }
  }
  return JSON.stringify(doc);
}

// ============================================================================
// Convert all image src (URL or PNG data URL) to JPEG data URLs via canvas
// ============================================================================
async function resolveImagesInJson(json: string): Promise<string> {
  if (typeof document === 'undefined') return json; // SSR guard
  const doc = JSON.parse(json);
  if (!doc.pages) return json;

  for (const page of doc.pages) {
    for (const el of (page.elements || [])) {
      if (el.type === 'image' && el.src) {
        try {
          const jpegDataUrl = await imageToJpegDataUrl(el.src, el.width || 300, el.height || 200);
          if (jpegDataUrl) el.src = jpegDataUrl;
        } catch { /* keep original src */ }
      }
    }
  }
  return JSON.stringify(doc);
}

function imageToJpegDataUrl(src: string, fallbackW: number, fallbackH: number): Promise<string | null> {
  // If already a JPEG data URL, return as-is (no quality loss)
  if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) {
    return Promise.resolve(src);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const doConvert = () => {
      try {
        const w = img.naturalWidth || fallbackW;
        const h = img.naturalHeight || fallbackH;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 1.0));
      } catch { resolve(null); }
    };
    img.onload = doConvert;
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ============================================================================
// Client-side pure JS PDF generator
// ============================================================================

function resolveVariables(text: string, pageNum: number, totalPages: number): string {
  return text
    .replace(/\{\{pageNumber\}\}/g, String(pageNum))
    .replace(/\{\{totalPages\}\}/g, String(totalPages))
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString());
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}

function jpegDimensions(data: Uint8Array): { w: number; h: number } | null {
  if (data[0] !== 0xFF || data[1] !== 0xD8) return null;
  let i = 2;
  while (i < data.length - 1) {
    if (data[i] !== 0xFF) break;
    const marker = data[i + 1];
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      if (i + 8 >= data.length) break;
      const h = (data[i + 5] << 8) | data[i + 6];
      const w = (data[i + 7] << 8) | data[i + 8];
      return { w, h };
    }
    if (i + 3 >= data.length) break;
    const len = (data[i + 2] << 8) | data[i + 3];
    i += 2 + len;
  }
  return null;
}

function strToBytes(s: string): Uint8Array {
  const buf = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) buf[i] = s.charCodeAt(i);
  return buf;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

interface ImageInfo {
  objId: number;
  name: string;
}

// Now async — converts all images to JPEG first via canvas, then builds PDF
export async function exportPdfClient(documentJson: string): Promise<Uint8Array> {
  // Pre-convert all images to JPEG data URLs
  const resolvedJson = await resolveImagesInJson(resolveVariablesInJson(documentJson));
  const doc = JSON.parse(resolvedJson);
  const pages = doc.pages || [];
  if (pages.length === 0) pages.push({ width: 595, height: 842, elements: [] });

  const objectChunks: Uint8Array[] = [];
  let objNum = 0;

  function addObjStr(content: string): number {
    objNum++;
    objectChunks.push(strToBytes(content));
    return objNum;
  }

  function addObjBin(content: Uint8Array): number {
    objNum++;
    objectChunks.push(content);
    return objNum;
  }

  const fontObjId = addObjStr('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldObjId = addObjStr('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const fontItalicObjId = addObjStr('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');
  const gsHalf = addObjStr('<< /Type /ExtGState /ca 0.4 /CA 0.4 >>');
  const gsFull = addObjStr('<< /Type /ExtGState /ca 1.0 /CA 1.0 >>');

  // Collect all images across all pages
  const allImages: ImageInfo[] = [];
  for (const page of pages) {
    for (const el of (page.elements || [])) {
      if (el.type === 'image' && el.src) {
        const existing = allImages.find((img) => img.name === `Img${el.id}`);
        if (existing) continue;

        const decoded = decodeDataUrl(el.src);
        if (!decoded) continue;

        // After resolveImagesInJson, all images should be JPEG
        const dims = jpegDimensions(decoded.bytes);
        const imgW = dims?.w || el.width || 200;
        const imgH = dims?.h || el.height || 150;

        const header = strToBytes(
          `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${decoded.bytes.length} >>\nstream\n`
        );
        const footer = strToBytes('\nendstream');
        const imgObjBytes = concatBytes(header, decoded.bytes, footer);

        const imgObjId = addObjBin(imgObjBytes);
        allImages.push({ objId: imgObjId, name: `Img${el.id}` });
      }
    }
  }

  const pageObjIds: number[] = [];
  const pagesObjId = objNum + 1;
  addObjStr('PLACEHOLDER_PAGES');

  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    const w = page.width || 595;
    const h = page.height || 842;

    const pageImageNames: string[] = [];
    for (const el of (page.elements || [])) {
      if (el.type === 'image' && el.src) {
        const img = allImages.find((im) => im.name === `Img${el.id}`);
        if (img) pageImageNames.push(img.name);
      }
    }

    let content = '';

    if (page.background && page.background !== '#FFFFFF') {
      const c = hexToRgbF(page.background);
      content += `${c.r} ${c.g} ${c.b} rg\n0 0 ${w} ${h} re\nf\n`;
    }

    for (const el of (page.elements || [])) {
      if (el.type === 'image') {
        const img = allImages.find((im) => im.name === `Img${el.id}`);
        if (img) {
          const x = el.x || 0;
          const y = h - (el.y || 0) - (el.height || 150);
          const dw = el.width || 200;
          const dh = el.height || 150;
          content += `q\n${dw} 0 0 ${dh} ${x} ${y} cm\n/${img.name} Do\nQ\n`;
        }
      } else {
        content += renderElementToPdf(el, h, w, pi + 1, pages.length, fontBoldObjId, fontItalicObjId);
      }
    }

    content += renderPageOverlaysToPdf(page, h, w, pi + 1, pages.length);

    const contentObjId = addObjStr(`<< /Length ${content.length} >>\nstream\n${content}endstream`);

    let xobjDict = '';
    if (pageImageNames.length > 0) {
      const entries = pageImageNames.map((name) => {
        const img = allImages.find((im) => im.name === name)!;
        return `/${name} ${img.objId} 0 R`;
      }).join(' ');
      xobjDict = ` /XObject << ${entries} >>`;
    }

    const resources = `<< /Font << /F1 ${fontObjId} 0 R /F2 ${fontBoldObjId} 0 R /F3 ${fontItalicObjId} 0 R >> /ExtGState << /GS1 ${gsHalf} 0 R /GS2 ${gsFull} 0 R >>${xobjDict} >>`;
    const pageObjId = addObjStr(
      `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${contentObjId} 0 R /Resources ${resources} >>`
    );
    pageObjIds.push(pageObjId);
  }

  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  objectChunks[pagesObjId - 1] = strToBytes(`<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjIds.length} >>`);

  const catalogId = addObjStr(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);
  const now = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  addObjStr(`<< /Creator (PDF Builder) /Producer (PDF Builder Client) /CreationDate (D:${now}) >>`);

  // Assemble final PDF as binary
  const parts: Uint8Array[] = [];
  let totalLen = 0;

  function appendStr(s: string) {
    const b = strToBytes(s);
    parts.push(b);
    totalLen += b.length;
  }

  appendStr('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');
  const offsets: number[] = [];

  for (let i = 0; i < objectChunks.length; i++) {
    offsets.push(totalLen);
    appendStr(`${i + 1} 0 obj\n`);
    parts.push(objectChunks[i]);
    totalLen += objectChunks[i].length;
    appendStr('\nendobj\n\n');
  }

  const xrefOffset = totalLen;
  appendStr('xref\n');
  appendStr(`0 ${objectChunks.length + 1}\n`);
  appendStr('0000000000 65535 f \n');
  for (const off of offsets) {
    appendStr(off.toString().padStart(10, '0') + ' 00000 n \n');
  }

  appendStr('trailer\n');
  appendStr(`<< /Size ${objectChunks.length + 1} /Root ${catalogId} 0 R >>\n`);
  appendStr('startxref\n');
  appendStr(`${xrefOffset}\n`);
  appendStr('%%EOF\n');

  return concatBytes(...parts);
}

function renderElementToPdf(el: any, pageH: number, _pageW: number, pageNum: number, totalPages: number, _fontBold?: number, _fontItalic?: number): string {
  let s = '';

  switch (el.type) {
    case 'text': {
      const x = el.x || 72;
      const y = pageH - (el.y || 72) - (el.fontSize || 12);
      const fontKey = el.fontWeight === 'bold' ? '/F2' : el.fontStyle === 'italic' ? '/F3' : '/F1';
      const fontSize = el.fontSize || 12;
      const color = hexToRgbF(el.color || '#000000');

      s += 'q\n';
      s += `${color.r} ${color.g} ${color.b} rg\n`;
      s += 'BT\n';
      s += `${fontKey} ${fontSize} Tf\n`;
      s += `${fontSize * (el.lineHeight || 1.2)} TL\n`;
      s += `${x} ${y} Td\n`;

      const lines = resolveVariables(el.content || '', pageNum, totalPages).split('\n');
      for (let i = 0; i < lines.length; i++) {
        const escaped = escPdfString(lines[i]);
        if (i === 0) s += `(${escaped}) Tj\n`;
        else s += `T*\n(${escaped}) Tj\n`;
      }
      s += 'ET\nQ\n';
      break;
    }

    case 'documentBody': {
      const x = el.x || 72;
      const fontSize = el.fontSize || 14;
      const lineHeight = fontSize * (el.lineHeight || 1.2);
      const color = hexToRgbF(el.color || '#000000');
      const fontKey = el.fontWeight === 'bold' ? '/F2' : el.fontStyle === 'italic' ? '/F3' : '/F1';

      const content = resolveVariables(el.content || '', pageNum, totalPages);
      if (content) {
        const lines = content.split('\n');
        const yPos = pageH - (el.y || 72) - fontSize;
        s += 'q\n';
        s += `${color.r} ${color.g} ${color.b} rg\n`;
        s += 'BT\n';
        s += `${fontKey} ${fontSize} Tf\n`;
        s += `${lineHeight} TL\n`;
        s += `${x} ${yPos} Td\n`;
        for (let i = 0; i < lines.length; i++) {
          const escaped = escPdfString(lines[i]);
          if (i === 0) s += `(${escaped}) Tj\n`;
          else s += `T*\n(${escaped}) Tj\n`;
        }
        s += 'ET\nQ\n';
      }

      const border = el.border;
      if (border && border.style !== 'none' && border.width > 0) {
        const bc = hexToRgbF(border.color || '#000000');
        const bx = el.x || 0;
        const by = pageH - (el.y || 0) - (el.height || 100);
        const bw = el.width || 100;
        const bh = el.height || 100;
        s += 'q\n';
        s += `${bc.r} ${bc.g} ${bc.b} RG\n`;
        s += `${border.width} w\n`;
        if (border.style === 'dashed') s += '[6 4] 0 d\n';
        else if (border.style === 'dotted') s += '[2 2] 0 d\n';
        if (border.radius > 0) {
          s += roundedRectPdf(bx, by, bw, bh, Math.min(border.radius, bw / 2, bh / 2));
        } else {
          s += `${bx} ${by} ${bw} ${bh} re\n`;
        }
        s += 'S\nQ\n';
      }
      break;
    }

    case 'shape': {
      const x = el.x || 0;
      const y2 = pageH - (el.y || 0) - (el.height || 100);
      const w = el.width || 100;
      const h = el.height || 100;

      s += 'q\n';
      if (el.fill?.color) { const fc = hexToRgbF(el.fill.color); s += `${fc.r} ${fc.g} ${fc.b} rg\n`; }
      if (el.stroke?.color) { const sc = hexToRgbF(el.stroke.color); s += `${sc.r} ${sc.g} ${sc.b} RG\n`; }
      s += `${el.stroke?.width || 1} w\n`;
      if (el.stroke?.style === 'dashed') s += '[6 4] 0 d\n';
      else if (el.stroke?.style === 'dotted') s += '[2 3] 0 d\n';

      switch (el.shapeType) {
        case 'rect': s += `${x} ${y2} ${w} ${h} re\n`; break;
        case 'roundedRect': s += roundedRectPdf(x, y2, w, h, Math.min(el.borderRadius || 12, w / 2, h / 2)); break;
        case 'circle': case 'ellipse': s += ellipsePdf(x + w / 2, y2 + h / 2, w / 2, h / 2); break;
        case 'triangle': s += `${x + w / 2} ${y2 + h} m ${x + w} ${y2} l ${x} ${y2} l h\n`; break;
        case 'diamond': s += `${x + w / 2} ${y2 + h} m ${x + w} ${y2 + h / 2} l ${x + w / 2} ${y2} l ${x} ${y2 + h / 2} l h\n`; break;
        default: s += `${x} ${y2} ${w} ${h} re\n`;
      }

      if (el.fill?.type === 'solid' && el.stroke?.style !== 'none') s += 'B\n';
      else if (el.fill?.type === 'solid') s += 'f\n';
      else s += 'S\n';
      s += 'Q\n';
      break;
    }

    case 'table': {
      if (!el.columns || !el.rows) break;
      const totalW = el.columns.reduce((a: number, c: any) => a + c.width, 0);
      const scaleX = (el.width || 400) / totalW;
      let ty = el.y || 0;

      for (let ri = 0; ri < el.rows.length; ri++) {
        const row = el.rows[ri];
        let tx = el.x || 0;
        for (let ci = 0; ci < row.cells.length && ci < el.columns.length; ci++) {
          const cell = row.cells[ci];
          const cw = el.columns[ci].width * scaleX;
          const pdfY = pageH - ty - row.height;

          if (cell.background) {
            const bc = hexToRgbF(cell.background);
            s += `q ${bc.r} ${bc.g} ${bc.b} rg ${tx} ${pdfY} ${cw} ${row.height} re f Q\n`;
          }
          const bc2 = hexToRgbF(el.borderColor || '#C0C0C0');
          s += `q ${bc2.r} ${bc2.g} ${bc2.b} RG 0.5 w ${tx} ${pdfY} ${cw} ${row.height} re S Q\n`;
          if (cell.content) {
            const fontKey = ri === 0 ? '/F2' : '/F1';
            s += `q 0 0 0 rg BT ${fontKey} 10 Tf ${tx + 4} ${pdfY + row.height / 2 - 4} Td (${escPdfString(cell.content)}) Tj ET Q\n`;
          }
          tx += cw;
        }
        ty += row.height;
      }
      break;
    }

    case 'drawing': {
      if (!el.paths) break;
      for (const path of el.paths) {
        if (!path.points || path.points.length < 2) continue;
        s += 'q\n';
        if (path.tool === 'marker') s += '/GS1 gs\n';
        else s += '/GS2 gs\n';
        const pc = hexToRgbF(path.color || '#000000');
        s += `${pc.r} ${pc.g} ${pc.b} RG\n`;
        s += `${path.width || 2} w\n1 J 1 j\n`;
        const ox = el.x || 0;
        const oy = el.y || 0;
        s += `${ox + path.points[0].x} ${pageH - oy - path.points[0].y} m\n`;
        for (let i = 1; i < path.points.length; i++) {
          s += `${ox + path.points[i].x} ${pageH - oy - path.points[i].y} l\n`;
        }
        s += 'S\nQ\n';
      }
      break;
    }
  }

  return s;
}

function renderPageOverlaysToPdf(page: any, pageH: number, pageW: number, pageNum: number, totalPages: number): string {
  let s = '';

  if (page.header?.enabled && page.header.text) {
    const h = page.header;
    const text = resolveVariables(h.text, pageNum, totalPages);
    const fontSize = h.fontSize || 10;
    const color = hexToRgbF(h.color || '#666666');
    const align = h.align || 'center';
    let x = 40;
    if (align === 'center') x = pageW / 2 - text.length * fontSize * 0.25;
    else if (align === 'right') x = pageW - 40 - text.length * fontSize * 0.5;
    const y = pageH - 20 - fontSize;
    s += `q ${color.r} ${color.g} ${color.b} rg BT /F1 ${fontSize} Tf ${x} ${y} Td (${escPdfString(text)}) Tj ET Q\n`;
  }

  if (page.footer?.enabled && page.footer.text) {
    const f = page.footer;
    const text = resolveVariables(f.text, pageNum, totalPages);
    const fontSize = f.fontSize || 10;
    const color = hexToRgbF(f.color || '#666666');
    const align = f.align || 'center';
    let x = 40;
    if (align === 'center') x = pageW / 2 - text.length * fontSize * 0.25;
    else if (align === 'right') x = pageW - 40 - text.length * fontSize * 0.5;
    const y = 20;
    s += `q ${color.r} ${color.g} ${color.b} rg BT /F1 ${fontSize} Tf ${x} ${y} Td (${escPdfString(text)}) Tj ET Q\n`;
  }

  if (page.pageNumber?.enabled) {
    const pn = page.pageNumber;
    const fontSize = pn.fontSize || 10;
    const color = hexToRgbF(pn.color || '#666666');
    let text = String(pageNum);
    if (pn.format === 'Page 1') text = `Page ${pageNum}`;
    else if (pn.format === '1 of N') text = `${pageNum} of ${totalPages}`;
    else if (pn.format === 'Page 1 of N') text = `Page ${pageNum} of ${totalPages}`;
    const pos = pn.position || 'bottom-center';
    const isTop = pos.startsWith('top');
    const y = isTop ? pageH - 20 - fontSize : 20;
    let x = pageW / 2 - text.length * fontSize * 0.25;
    if (pos.endsWith('left')) x = 40;
    else if (pos.endsWith('right')) x = pageW - 40 - text.length * fontSize * 0.5;
    s += `q ${color.r} ${color.g} ${color.b} rg BT /F1 ${fontSize} Tf ${x} ${y} Td (${escPdfString(text)}) Tj ET Q\n`;
  }

  return s;
}

function escPdfString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function hexToRgbF(hex: string): { r: number; g: number; b: number } {
  hex = (hex || '#000000').replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return { r: Math.round(r * 1000) / 1000, g: Math.round(g * 1000) / 1000, b: Math.round(b * 1000) / 1000 };
}

function roundedRectPdf(x: number, y: number, w: number, h: number, r: number): string {
  const k = 0.5522847498 * r;
  let s = '';
  s += `${x + r} ${y} m\n`;
  s += `${x + w - r} ${y} l\n`;
  s += `${x + w - r + k} ${y} ${x + w} ${y + r - k} ${x + w} ${y + r} c\n`;
  s += `${x + w} ${y + h - r} l\n`;
  s += `${x + w} ${y + h - r + k} ${x + w - r + k} ${y + h} ${x + w - r} ${y + h} c\n`;
  s += `${x + r} ${y + h} l\n`;
  s += `${x + r - k} ${y + h} ${x} ${y + h - r + k} ${x} ${y + h - r} c\n`;
  s += `${x} ${y + r} l\n`;
  s += `${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y} c\n`;
  s += 'h\n';
  return s;
}

function ellipsePdf(cx: number, cy: number, rx: number, ry: number): string {
  const k = 0.5522847498;
  const kx = k * rx, ky = k * ry;
  let s = '';
  s += `${cx + rx} ${cy} m\n`;
  s += `${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry} c\n`;
  s += `${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy} c\n`;
  s += `${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry} c\n`;
  s += `${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy} c\n`;
  s += 'h\n';
  return s;
}
