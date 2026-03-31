
/**
 * Utility functions for table calculations (shared between store and canvas)
 */

let offscreenCtx: CanvasRenderingContext2D | null = null;

function getOffscreenCtx() {
  if (typeof window === 'undefined') return null;
  if (!offscreenCtx) {
    const canvas = document.createElement('canvas');
    offscreenCtx = canvas.getContext('2d');
  }
  return offscreenCtx;
}

/**
 * Wraps text based on a maximum width
 */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [''];
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para) {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';
    for (const word of words) {
      const test = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines.length ? lines : [''];
}

/**
 * Calculates accurate row heights for a table element
 */
export function calculateTableHeights(el: {
  width: number;
  columns: { width: number }[];
  rows: { height: number; cells: { content: string; background?: string }[] }[];
}): { rows: any[]; totalHeight: number } {
  const ctx = getOffscreenCtx();
  if (!ctx) return { rows: el.rows, totalHeight: 0 }; // Fallback for SSR

  const { columns, rows } = el;
  const totalW = columns.reduce((s: number, c: any) => s + c.width, 0);
  const scaleX = el.width / (totalW || 1);
  const padding = 6;
  const lineH = 14;
  const minRowH = 30;

  const newRows = rows.map((row, ri) => {
    let maxH = minRowH;
    const font = ri === 0 ? 'bold 11px sans-serif' : '11px sans-serif';
    ctx.font = font;
    for (let ci = 0; ci < row.cells.length && ci < columns.length; ci++) {
      const cw = columns[ci].width * scaleX;
      const content = row.cells[ci]?.content || '';
      const lines = wrapText(ctx, content, cw - padding * 2);
      const neededH = lines.length * lineH + padding * 2;
      if (neededH > maxH) maxH = neededH;
    }
    return { ...row, height: maxH };
  });

  const totalH = newRows.reduce((s, r) => s + r.height, 0);
  return { rows: newRows, totalHeight: totalH };
}
