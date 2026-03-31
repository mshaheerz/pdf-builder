import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pdf = generatePdf(body);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="document.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

// ============================================================================
// Full PDF Generator — generates valid PDF 1.7 from document model
// ============================================================================
function generatePdf(doc: any): Uint8Array {
  const pages = doc.pages || [];
  if (pages.length === 0) pages.push({ width: 595, height: 842, elements: [] });

  const objects: string[] = [];
  let objNum = 0;

  function addObj(content: string): number {
    objNum++;
    objects.push(content);
    return objNum;
  }

  // Font object
  const fontObjId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldObjId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const fontItalicObjId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');

  // Transparency states for marker
  const gsHalf = addObj('<< /Type /ExtGState /ca 0.4 /CA 0.4 >>');
  const gsFull = addObj('<< /Type /ExtGState /ca 1.0 /CA 1.0 >>');

  // Build pages
  const pageObjIds: number[] = [];
  const pagesObjId = objNum + 1; // reserve
  addObj('PLACEHOLDER_PAGES'); // will replace

  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    const w = page.width || 595;
    const h = page.height || 842;

    // Build content stream
    let content = '';

    // Page background
    if (page.background && page.background !== '#FFFFFF') {
      const c = hexToRgbF(page.background);
      content += `${c.r} ${c.g} ${c.b} rg\n0 0 ${w} ${h} re\nf\n`;
    }

    for (const el of (page.elements || [])) {
      content += renderElementToPdf(el, h, w);
    }

    const contentObjId = addObj(`<< /Length ${content.length} >>\nstream\n${content}endstream`);

    const resources = `<< /Font << /F1 ${fontObjId} 0 R /F2 ${fontBoldObjId} 0 R /F3 ${fontItalicObjId} 0 R >> /ExtGState << /GS1 ${gsHalf} 0 R /GS2 ${gsFull} 0 R >> >>`;

    const pageObjId = addObj(
      `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${contentObjId} 0 R /Resources ${resources} >>`
    );
    pageObjIds.push(pageObjId);
  }

  // Fix pages object
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  objects[pagesObjId - 1] = `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjIds.length} >>`;

  // Catalog
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);

  // Info
  const now = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  addObj(`<< /Creator (PDF Builder) /Producer (PDF Builder Engine) /CreationDate (D:${now}) >>`);

  // Assemble PDF
  let pdf = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n\n`;
  }

  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += off.toString().padStart(10, '0') + ' 00000 n \n';
  }

  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF\n';

  return new TextEncoder().encode(pdf);
}

function renderElementToPdf(el: any, pageH: number, pageW: number): string {
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

      // Split content into lines
      const lines = (el.content || '').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const escaped = escPdfString(lines[i]);
        if (i === 0) {
          s += `(${escaped}) Tj\n`;
        } else {
          s += `T*\n(${escaped}) Tj\n`;
        }
      }
      s += 'ET\n';

      // Underline
      if (el.decoration === 'underline') {
        s += `${color.r} ${color.g} ${color.b} RG\n`;
        s += '0.5 w\n';
        // Approximate: draw line under first line of text
        const underY = y - 2;
        const approxWidth = (el.content?.length || 0) * fontSize * 0.5;
        s += `${x} ${underY} m ${x + Math.min(approxWidth, el.width || 200)} ${underY} l S\n`;
      }
      s += 'Q\n';
      break;
    }

    case 'shape': {
      const x = el.x || 0;
      const y2 = pageH - (el.y || 0) - (el.height || 100);
      const w = el.width || 100;
      const h = el.height || 100;

      s += 'q\n';

      // Fill color
      if (el.fill?.color) {
        const fc = hexToRgbF(el.fill.color);
        s += `${fc.r} ${fc.g} ${fc.b} rg\n`;
      }

      // Stroke color
      if (el.stroke?.color) {
        const sc = hexToRgbF(el.stroke.color);
        s += `${sc.r} ${sc.g} ${sc.b} RG\n`;
      }
      s += `${el.stroke?.width || 1} w\n`;

      // Stroke style
      if (el.stroke?.style === 'dashed') s += '[6 4] 0 d\n';
      else if (el.stroke?.style === 'dotted') s += '[2 3] 0 d\n';

      // Shape path
      switch (el.shapeType) {
        case 'rect':
          s += `${x} ${y2} ${w} ${h} re\n`;
          break;
        case 'roundedRect': {
          const r = Math.min(el.borderRadius || 12, w / 2, h / 2);
          s += roundedRectPdf(x, y2, w, h, r);
          break;
        }
        case 'circle':
        case 'ellipse':
          s += ellipsePdf(x + w / 2, y2 + h / 2, w / 2, h / 2);
          break;
        case 'triangle':
          s += `${x + w / 2} ${y2 + h} m ${x + w} ${y2} l ${x} ${y2} l h\n`;
          break;
        case 'diamond':
          s += `${x + w / 2} ${y2 + h} m ${x + w} ${y2 + h / 2} l ${x + w / 2} ${y2} l ${x} ${y2 + h / 2} l h\n`;
          break;
        default:
          s += `${x} ${y2} ${w} ${h} re\n`;
      }

      if (el.fill?.type === 'solid' && el.stroke?.style !== 'none') {
        s += 'B\n'; // fill and stroke
      } else if (el.fill?.type === 'solid') {
        s += 'f\n';
      } else {
        s += 'S\n';
      }
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

          // Cell background
          if (cell.background) {
            const bc = hexToRgbF(cell.background);
            s += `q ${bc.r} ${bc.g} ${bc.b} rg ${tx} ${pdfY} ${cw} ${row.height} re f Q\n`;
          }

          // Cell border
          const bc2 = hexToRgbF(el.borderColor || '#C0C0C0');
          s += `q ${bc2.r} ${bc2.g} ${bc2.b} RG 0.5 w ${tx} ${pdfY} ${cw} ${row.height} re S Q\n`;

          // Cell text
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
        s += `${path.width || 2} w\n`;
        s += '1 J 1 j\n'; // round cap & join

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

function escPdfString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function hexToRgbF(hex: string): { r: number; g: number; b: number } {
  hex = (hex || '#000000').replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return {
    r: Math.round(r * 1000) / 1000,
    g: Math.round(g * 1000) / 1000,
    b: Math.round(b * 1000) / 1000,
  };
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
