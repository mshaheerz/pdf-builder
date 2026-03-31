import type {
  Document, Page, Element, TextElement, RichTextElement,
  ImageElement, TableElement, ShapeElement, DrawingElement,
  GroupElement, PageBreakElement, Margins, Fill, ExportOptions,
  TextSpan, TableRow, TableColumn, TableCell, DrawingPath,
  BorderStyle, StrokeStyle, Point, FontRegistration,
} from './types';

let nextId = 1;
function genId(): string {
  return `el_${nextId++}`;
}

/** Create a new empty document */
export function createDocument(options?: Partial<{
  title: string;
  author: string;
  defaultFont: string;
  defaultFontSize: number;
  unit: 'pt' | 'mm' | 'in';
}>): Document {
  return {
    version: '1.0.0',
    metadata: {
      title: options?.title ?? 'Untitled',
      author: options?.author ?? '',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    settings: {
      defaultFont: options?.defaultFont ?? 'Helvetica',
      defaultFontSize: options?.defaultFontSize ?? 12,
      defaultColor: '#000000',
      unit: options?.unit ?? 'pt',
    },
    fonts: getDefaultFonts(),
    pages: [],
  };
}

function getDefaultFonts(): FontRegistration[] {
  return [
    { name: 'Helvetica', family: 'Helvetica', weight: 'normal', style: 'normal', source: 'builtin' },
    { name: 'Helvetica-Bold', family: 'Helvetica', weight: 'bold', style: 'normal', source: 'builtin' },
    { name: 'Helvetica-Oblique', family: 'Helvetica', weight: 'normal', style: 'italic', source: 'builtin' },
    { name: 'Times-Roman', family: 'Times', weight: 'normal', style: 'normal', source: 'builtin' },
    { name: 'Times-Bold', family: 'Times', weight: 'bold', style: 'normal', source: 'builtin' },
    { name: 'Courier', family: 'Courier', weight: 'normal', style: 'normal', source: 'builtin' },
    { name: 'Courier-Bold', family: 'Courier', weight: 'bold', style: 'normal', source: 'builtin' },
  ];
}

/** Add a page to the document */
export function addPage(doc: Document, options?: Partial<{
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  margins: Partial<Margins>;
}>): Page {
  const page: Page = {
    id: `page_${doc.pages.length + 1}`,
    size: {
      width: options?.width ?? 595, // A4
      height: options?.height ?? 842,
    },
    orientation: options?.orientation ?? 'portrait',
    margins: {
      top: options?.margins?.top ?? 72,
      right: options?.margins?.right ?? 72,
      bottom: options?.margins?.bottom ?? 72,
      left: options?.margins?.left ?? 72,
    },
    background: { type: 'solid', color: '#FFFFFF' },
    elements: [],
  };
  doc.pages.push(page);
  return page;
}

/** Create a text element */
export function createText(content: string, options?: Partial<Omit<TextElement, 'id' | 'type' | 'content'>>): TextElement {
  return {
    id: genId(),
    type: 'text',
    content,
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 200,
    height: options?.height ?? 30,
    rotation: options?.rotation ?? 0,
    opacity: options?.opacity ?? 1,
    locked: false,
    visible: true,
    name: 'Text',
    font: options?.font ?? 'Helvetica',
    fontSize: options?.fontSize ?? 12,
    fontWeight: options?.fontWeight ?? 'normal',
    fontStyle: options?.fontStyle ?? 'normal',
    color: options?.color ?? '#000000',
    align: options?.align ?? 'left',
    verticalAlign: options?.verticalAlign ?? 'top',
    lineHeight: options?.lineHeight ?? 1.2,
    letterSpacing: options?.letterSpacing ?? 0,
    decoration: options?.decoration ?? 'none',
  };
}

/** Create a shape element */
export function createShape(shapeType: ShapeElement['shapeType'], options?: Partial<Omit<ShapeElement, 'id' | 'type' | 'shapeType'>>): ShapeElement {
  return {
    id: genId(),
    type: 'shape',
    shapeType,
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 100,
    height: options?.height ?? 100,
    rotation: options?.rotation ?? 0,
    opacity: options?.opacity ?? 1,
    locked: false,
    visible: true,
    name: `Shape (${shapeType})`,
    fill: options?.fill ?? { type: 'solid', color: '#4ECDC4' },
    stroke: options?.stroke ?? { width: 1, color: '#333333', style: 'solid' },
    borderRadius: options?.borderRadius ?? 0,
    points: options?.points,
    starPoints: options?.starPoints,
  };
}

/** Create a table element */
export function createTable(cols: number, rows: number, options?: Partial<Omit<TableElement, 'id' | 'type' | 'columns' | 'rows'>>): TableElement {
  const colWidth = (options?.width ?? 400) / cols;
  const columns: TableColumn[] = Array.from({ length: cols }, () => ({ width: colWidth }));
  const tableRows: TableRow[] = Array.from({ length: rows }, () => ({
    height: 'auto' as const,
    cells: Array.from({ length: cols }, (): TableCell => ({
      content: [],
      colspan: 1,
      rowspan: 1,
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
      background: { type: 'none' },
      border: {
        top: { width: 0.5, color: '#CCCCCC', style: 'solid' },
        right: { width: 0.5, color: '#CCCCCC', style: 'solid' },
        bottom: { width: 0.5, color: '#CCCCCC', style: 'solid' },
        left: { width: 0.5, color: '#CCCCCC', style: 'solid' },
      },
      align: 'left',
      verticalAlign: 'top',
    })),
  }));

  return {
    id: genId(),
    type: 'table',
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 400,
    height: options?.height ?? rows * 30,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    name: 'Table',
    columns,
    rows: tableRows,
    defaultBorder: { width: 0.5, color: '#CCCCCC', style: 'solid' },
    cellPadding: 4,
    headerRows: options?.headerRows ?? 0,
  };
}

/** Create an image element */
export function createImage(src: string, options?: Partial<Omit<ImageElement, 'id' | 'type' | 'src'>>): ImageElement {
  return {
    id: genId(),
    type: 'image',
    src,
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 200,
    height: options?.height ?? 150,
    rotation: 0,
    opacity: options?.opacity ?? 1,
    locked: false,
    visible: true,
    name: 'Image',
    originalWidth: options?.originalWidth ?? 0,
    originalHeight: options?.originalHeight ?? 0,
    fit: options?.fit ?? 'contain',
    borderRadius: options?.borderRadius ?? 0,
    border: options?.border ?? { width: 0, color: '#000000', style: 'none' },
  };
}

/** Create a drawing element */
export function createDrawing(paths: DrawingPath[], options?: Partial<Omit<DrawingElement, 'id' | 'type' | 'paths'>>): DrawingElement {
  return {
    id: genId(),
    type: 'drawing',
    paths,
    x: options?.x ?? 0,
    y: options?.y ?? 0,
    width: options?.width ?? 100,
    height: options?.height ?? 100,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    name: 'Drawing',
  };
}

/** Serialize document to JSON string */
export function serializeDocument(doc: Document): string {
  return JSON.stringify(doc, null, 2);
}

/** Deserialize document from JSON string */
export function deserializeDocument(json: string): Document {
  return JSON.parse(json) as Document;
}
