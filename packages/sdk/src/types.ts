// ============================================================================
// Document Model Types - Complete type system for PDF Builder
// ============================================================================

export interface Document {
  version: string;
  metadata: DocumentMetadata;
  settings: DocumentSettings;
  fonts: FontRegistration[];
  pages: Page[];
}

export interface DocumentMetadata {
  title: string;
  author: string;
  subject?: string;
  creator?: string;
  created: string;
  modified: string;
}

export interface DocumentSettings {
  defaultFont: string;
  defaultFontSize: number;
  defaultColor: string;
  unit: 'pt' | 'mm' | 'in';
}

export interface FontRegistration {
  name: string;
  family: string;
  weight: 'normal' | 'bold';
  style: 'normal' | 'italic';
  source: 'builtin' | 'custom';
  data?: ArrayBuffer; // for custom fonts
}

export interface Page {
  id: string;
  size: { width: number; height: number };
  orientation: 'portrait' | 'landscape';
  margins: Margins;
  background: Fill;
  elements: Element[];
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ============================================================================
// Elements
// ============================================================================

export type Element =
  | TextElement
  | RichTextElement
  | ImageElement
  | TableElement
  | ShapeElement
  | DrawingElement
  | GroupElement
  | PageBreakElement;

export interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  name: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  font: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  align: TextAlign;
  verticalAlign: VerticalAlign;
  lineHeight: number;
  letterSpacing: number;
  decoration: TextDecoration;
}

export interface RichTextElement extends BaseElement {
  type: 'richtext';
  spans: TextSpan[];
  align: TextAlign;
  verticalAlign: VerticalAlign;
  lineHeight: number;
}

export interface TextSpan {
  text: string;
  font?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  decoration?: TextDecoration;
  backgroundColor?: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
  fit: 'contain' | 'cover' | 'fill' | 'none';
  borderRadius: number;
  border: BorderStyle;
}

export interface TableElement extends BaseElement {
  type: 'table';
  columns: TableColumn[];
  rows: TableRow[];
  defaultBorder: BorderStyle;
  cellPadding: number;
  headerRows: number;
}

export interface TableColumn {
  width: number;
}

export interface TableRow {
  height: number | 'auto';
  cells: TableCell[];
}

export interface TableCell {
  content: TextSpan[];
  colspan: number;
  rowspan: number;
  padding: Margins;
  background: Fill;
  border: {
    top: BorderStyle;
    right: BorderStyle;
    bottom: BorderStyle;
    left: BorderStyle;
  };
  align: TextAlign;
  verticalAlign: VerticalAlign;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  fill: Fill;
  stroke: StrokeStyle;
  borderRadius: number;
  points?: Point[];
  starPoints?: number;
}

export interface DrawingElement extends BaseElement {
  type: 'drawing';
  paths: DrawingPath[];
}

export interface DrawingPath {
  points: DrawingPoint[];
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  tool: 'pencil' | 'marker' | 'eraser';
}

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface GroupElement extends BaseElement {
  type: 'group';
  children: Element[];
}

export interface PageBreakElement extends BaseElement {
  type: 'pagebreak';
}

// ============================================================================
// Styling
// ============================================================================

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type TextDecoration = 'none' | 'underline' | 'strikethrough';
export type ShapeType = 'rect' | 'roundedRect' | 'circle' | 'ellipse' | 'triangle' | 'star' | 'polygon' | 'arrow' | 'line' | 'path';

export interface Point {
  x: number;
  y: number;
}

export type Fill =
  | { type: 'none' }
  | { type: 'solid'; color: string }
  | { type: 'linearGradient'; angle: number; stops: GradientStop[] }
  | { type: 'radialGradient'; cx: number; cy: number; r: number; stops: GradientStop[] }
  | { type: 'pattern'; patternType: string; color: string; backgroundColor: string; scale: number };

export interface GradientStop {
  offset: number;
  color: string;
}

export interface BorderStyle {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
}

export interface StrokeStyle extends BorderStyle {
  dashArray?: number[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
}

// ============================================================================
// Editor State
// ============================================================================

export type EditorTool =
  | 'select'
  | 'text'
  | 'image'
  | 'table'
  | 'shape'
  | 'pencil'
  | 'marker'
  | 'eraser'
  | 'hand'
  | 'zoom';

export interface EditorState {
  activeTool: EditorTool;
  activeShapeType: ShapeType;
  selectedIds: string[];
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  currentColor: string;
  currentFillColor: string;
  currentFont: string;
  currentFontSize: number;
  brushSize: number;
  brushOpacity: number;
}

// ============================================================================
// Export Options
// ============================================================================

export interface ExportOptions {
  mode: 'client' | 'server';
  compression: boolean;
  imageQuality: number; // 0-100
  embedFonts: boolean;
  pageRange?: { start: number; end: number };
}
