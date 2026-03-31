/** Unit conversion helpers */
export const units = {
  mmToPt: (mm: number) => mm * 72 / 25.4,
  ptToMm: (pt: number) => pt * 25.4 / 72,
  inToPt: (inch: number) => inch * 72,
  ptToIn: (pt: number) => pt / 72,
  pxToPt: (px: number, dpi = 96) => px * 72 / dpi,
  ptToPx: (pt: number, dpi = 96) => pt * dpi / 72,
};

/** Standard page sizes in points */
export const pageSizes = {
  A0: { width: 2384, height: 3370 },
  A1: { width: 1684, height: 2384 },
  A2: { width: 1191, height: 1684 },
  A3: { width: 842, height: 1191 },
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
  A6: { width: 298, height: 420 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  Tabloid: { width: 792, height: 1224 },
};

/** Generate a unique ID */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Deep clone an object */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
