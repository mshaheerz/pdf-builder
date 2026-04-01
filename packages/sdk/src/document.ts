import type {
  Document, Page, TextElement, ImageElement, TableElement,
  ShapeElement, DrawingElement, Margins, FontRegistration,
} from './types';
import { generateId } from './helpers';

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
}>): Page {
  const page: Page = {
    id: generateId(),
    width: options?.width ?? 595,
    height: options?.height ?? 842,
    background: '#FFFFFF',
    elements: [],
  };
  doc.pages.push(page);
  return page;
}

/** Create a text element */
export function createText(content: string, options?: Partial<Omit<TextElement, 'id' | 'type' | 'content'>>): TextElement {
  return {
    id: generateId(),
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
    lineHeight: options?.lineHeight ?? 1.2,
    decoration: options?.decoration ?? 'none',
  };
}

/** Create a shape element */
export function createShape(shapeType: ShapeElement['shapeType'], options?: Partial<Omit<ShapeElement, 'id' | 'type' | 'shapeType'>>): ShapeElement {
  return {
    id: generateId(),
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
    polygonSides: options?.polygonSides,
  };
}

/** Create a table element */
export function createTable(cols: number, rows: number, options?: Partial<Omit<TableElement, 'id' | 'type' | 'columns' | 'rows'>>): TableElement {
  const colWidth = (options?.width ?? 400) / cols;
  const columns = Array.from({ length: cols }, () => ({ width: colWidth }));
  const tableRows = Array.from({ length: rows }, () => ({
    height: 30,
    cells: Array.from({ length: cols }, () => ({
      content: '',
      background: undefined as string | undefined,
    })),
  }));

  return {
    id: generateId(),
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
    borderColor: options?.borderColor ?? '#CCCCCC',
  };
}

/** Create an image element */
export function createImage(src: string, options?: Partial<Omit<ImageElement, 'id' | 'type' | 'src'>>): ImageElement {
  return {
    id: generateId(),
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
    fit: options?.fit ?? 'contain',
  };
}

/** Create a drawing element */
export function createDrawing(paths: DrawingElement['paths'], options?: Partial<Omit<DrawingElement, 'id' | 'type' | 'paths'>>): DrawingElement {
  return {
    id: generateId(),
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
