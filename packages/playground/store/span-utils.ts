import type { TextSpan } from '@pdf-builder/sdk';

export interface SpanDefaults {
  font: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  decoration: 'none' | 'underline' | 'strikethrough';
}

export interface WrappedRun {
  text: string;
  font: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  decoration: 'none' | 'underline' | 'strikethrough';
  x: number;
  width: number;
}

export interface WrappedLine {
  runs: WrappedRun[];
  y: number;
  startOffset: number;
  endOffset: number;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export function getPlainText(spans: TextSpan[]): string {
  return spans.map((s) => s.text).join('');
}

export function resolveSpanStyle(span: TextSpan, defaults: SpanDefaults) {
  return {
    font: span.font ?? defaults.font,
    fontSize: span.fontSize ?? defaults.fontSize,
    fontWeight: span.fontWeight ?? defaults.fontWeight,
    fontStyle: span.fontStyle ?? defaults.fontStyle,
    color: span.color ?? defaults.color,
    decoration: span.decoration ?? defaults.decoration,
  };
}

function buildFontString(s: { fontStyle: string; fontWeight: string; fontSize: number; font: string }): string {
  const style = s.fontStyle === 'italic' ? 'italic' : '';
  const weight = s.fontWeight === 'bold' ? 'bold' : '';
  return `${style} ${weight} ${s.fontSize}px ${s.font}`.trim();
}

export function offsetToSpanPos(spans: TextSpan[], offset: number): { spanIndex: number; charOffset: number } {
  let remaining = offset;
  for (let i = 0; i < spans.length; i++) {
    if (remaining <= spans[i].text.length) {
      return { spanIndex: i, charOffset: remaining };
    }
    remaining -= spans[i].text.length;
  }
  const last = spans.length - 1;
  return { spanIndex: Math.max(0, last), charOffset: spans.length > 0 ? spans[last].text.length : 0 };
}

export function insertText(spans: TextSpan[], offset: number, text: string, pendingStyle?: Partial<TextSpan> | null): TextSpan[] {
  if (spans.length === 0) {
    return [{ text, ...pendingStyle }];
  }
  const { spanIndex, charOffset } = offsetToSpanPos(spans, offset);
  const result = spans.map((s) => ({ ...s }));

  if (pendingStyle && Object.keys(pendingStyle).length > 0) {
    // Insert as a new span with pending style
    const span = result[spanIndex];
    const before = span.text.slice(0, charOffset);
    const after = span.text.slice(charOffset);
    const newSpan: TextSpan = { ...pendingStyle, text };
    const newSpans: TextSpan[] = [];
    if (before) newSpans.push({ ...span, text: before });
    newSpans.push(newSpan);
    if (after) newSpans.push({ ...span, text: after });
    result.splice(spanIndex, 1, ...newSpans);
  } else {
    // Insert into existing span
    const span = result[spanIndex];
    span.text = span.text.slice(0, charOffset) + text + span.text.slice(charOffset);
  }
  return result;
}

export function deleteRange(spans: TextSpan[], start: number, end: number): TextSpan[] {
  if (start >= end) return spans;
  const result: TextSpan[] = [];
  let offset = 0;
  for (const span of spans) {
    const spanEnd = offset + span.text.length;
    if (spanEnd <= start || offset >= end) {
      // Entirely outside deletion range
      result.push({ ...span });
    } else {
      // Partially or fully inside
      const keepBefore = span.text.slice(0, Math.max(0, start - offset));
      const keepAfter = span.text.slice(Math.max(0, end - offset));
      const kept = keepBefore + keepAfter;
      if (kept) {
        result.push({ ...span, text: kept });
      }
    }
    offset = spanEnd;
  }
  return result.length > 0 ? result : [{ text: '' }];
}

export function applyStyle(spans: TextSpan[], start: number, end: number, style: Partial<TextSpan>): TextSpan[] {
  if (start >= end) return spans;
  const result: TextSpan[] = [];
  let offset = 0;
  for (const span of spans) {
    const spanEnd = offset + span.text.length;
    if (spanEnd <= start || offset >= end) {
      result.push({ ...span });
    } else {
      // Need to split
      const splitStart = Math.max(0, start - offset);
      const splitEnd = Math.min(span.text.length, end - offset);
      if (splitStart > 0) {
        result.push({ ...span, text: span.text.slice(0, splitStart) });
      }
      result.push({ ...span, ...style, text: span.text.slice(splitStart, splitEnd) });
      if (splitEnd < span.text.length) {
        result.push({ ...span, text: span.text.slice(splitEnd) });
      }
    }
    offset = spanEnd;
  }
  return mergeAdjacentSpans(result);
}

function spanStyleKey(span: TextSpan): string {
  return `${span.font ?? ''}|${span.fontSize ?? ''}|${span.fontWeight ?? ''}|${span.fontStyle ?? ''}|${span.color ?? ''}|${span.decoration ?? ''}|${span.align ?? ''}`;
}

export function mergeAdjacentSpans(spans: TextSpan[]): TextSpan[] {
  if (spans.length <= 1) return spans;
  const result: TextSpan[] = [{ ...spans[0] }];
  for (let i = 1; i < spans.length; i++) {
    const prev = result[result.length - 1];
    if (spanStyleKey(prev) === spanStyleKey(spans[i])) {
      prev.text += spans[i].text;
    } else {
      result.push({ ...spans[i] });
    }
  }
  return result;
}

/** Find the start and end offsets of the paragraph containing `offset` */
export function getParagraphRange(text: string, offset: number): { start: number; end: number } {
  let start = text.lastIndexOf('\n', offset - 1);
  start = start === -1 ? 0 : start + 1;
  let end = text.indexOf('\n', offset);
  end = end === -1 ? text.length : end;
  return { start, end };
}

export function wrapTextSpans(
  ctx: CanvasRenderingContext2D,
  spans: TextSpan[],
  maxWidth: number,
  defaults: SpanDefaults,
  lineHeight: number,
  startY: number,
): WrappedLine[] {
  const plainText = getPlainText(spans);
  if (!plainText) {
    return [{ runs: [], y: startY, startOffset: 0, endOffset: 0 }];
  }

  // Build a flat list of characters with their styles
  type CharInfo = { char: string; style: ReturnType<typeof resolveSpanStyle>; globalOffset: number; align?: 'left' | 'center' | 'right' | 'justify' };
  const chars: CharInfo[] = [];
  let offset = 0;
  for (const span of spans) {
    const style = resolveSpanStyle(span, defaults);
    for (let i = 0; i < span.text.length; i++) {
      chars.push({ char: span.text[i], style, globalOffset: offset + i, align: span.align });
    }
    offset += span.text.length;
  }

  const lines: WrappedLine[] = [];
  let lineStart = 0;

  while (lineStart < chars.length) {
    // Handle newlines
    if (chars[lineStart].char === '\n') {
      lines.push({
        runs: [],
        y: startY + lines.length * lineHeight,
        startOffset: chars[lineStart].globalOffset,
        endOffset: chars[lineStart].globalOffset + 1,
        align: chars[lineStart].align,
      });
      lineStart++;
      continue;
    }

    // Find how many chars fit on this line
    let lineEnd = lineStart;
    let currentWidth = 0;

    while (lineEnd < chars.length && chars[lineEnd].char !== '\n') {
      const ch = chars[lineEnd];
      const s = ch.style;
      ctx.font = buildFontString(s);
      const charW = ctx.measureText(ch.char).width;
      if (currentWidth + charW > maxWidth && lineEnd > lineStart) {
        // Try to break at a word boundary
        let breakAt = lineEnd;
        for (let j = lineEnd - 1; j > lineStart; j--) {
          if (chars[j].char === ' ') {
            breakAt = j + 1;
            break;
          }
        }
        lineEnd = breakAt;
        break;
      }
      currentWidth += charW;
      lineEnd++;
    }

    // Build runs for this line
    const runs: WrappedRun[] = [];
    let x = 0;
    let runStart = lineStart;

    while (runStart < lineEnd) {
      const runStyle = chars[runStart].style;
      let runEnd = runStart + 1;
      while (runEnd < lineEnd && spanStyleKey(runStyle as any) === spanStyleKey(chars[runEnd].style as any)) {
        runEnd++;
      }

      const runText = chars.slice(runStart, runEnd).map((c) => c.char).join('');
      ctx.font = buildFontString(runStyle);
      const w = ctx.measureText(runText).width;

      runs.push({
        text: runText,
        ...runStyle,
        x,
        width: w,
      });
      x += w;
      runStart = runEnd;
    }

    lines.push({
      runs,
      y: startY + lines.length * lineHeight,
      startOffset: chars[lineStart].globalOffset,
      endOffset: lineEnd < chars.length ? chars[lineEnd].globalOffset : plainText.length,
      align: chars[lineStart].align,
    });

    // Skip trailing space at line break
    if (lineEnd < chars.length && chars[lineEnd].char === ' ') {
      lineEnd++;
    }
    lineStart = lineEnd;
  }

  return lines.length > 0 ? lines : [{ runs: [], y: startY, startOffset: 0, endOffset: 0 }];
}
