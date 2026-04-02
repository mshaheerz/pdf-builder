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
  data?: ArrayBuffer;
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ============================================================================
// Page - flat structure matching playground
// ============================================================================

export interface Page {
  id: string;
  width: number;
  height: number;
  background: string;
  elements: Element[];
}

// ============================================================================
// Styling
// ============================================================================

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlign = 'top' | 'middle' | 'bottom';

export type ShapeType =
  | 'rect' | 'roundedRect' | 'circle' | 'ellipse' | 'triangle'
  | 'star' | 'polygon' | 'arrow' | 'line' | 'path'
  | 'diamond' | 'pentagon' | 'hexagon' | 'parallelogram' | 'trapezoid'
  | 'heart' | 'cross' | 'rightArrow' | 'doubleArrow' | 'callout'
  | 'octagon' | 'ring' | 'cloud' | 'speechBubble' | 'chevron' | 'banner';

export type EditorTool = 'select' | 'text' | 'image' | 'table' | 'shape' | 'pencil' | 'marker' | 'eraser' | 'hand' | 'zoom';
export type EditorMode = 'design' | 'textEditor';

export interface Fill {
  type: 'none' | 'solid' | 'linearGradient' | 'radialGradient' | 'pattern';
  color?: string;
  angle?: number;
  stops?: { offset: number; color: string }[];
}

export interface BorderStyle {
  width: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted' | 'none';
}

export interface Point {
  x: number;
  y: number;
}

// ============================================================================
// Elements
// ============================================================================

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
  lineHeight: number;
  decoration: 'none' | 'underline' | 'strikethrough';
  verticalAlign?: VerticalAlign;
  letterSpacing?: number;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  fill: Fill;
  stroke: BorderStyle;
  borderRadius: number;
  polygonSides?: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  fit: 'contain' | 'cover' | 'fill';
  originalWidth?: number;
  originalHeight?: number;
}

export interface TableElement extends BaseElement {
  type: 'table';
  columns: { width: number }[];
  rows: { height: number; cells: { content: string; background?: string }[] }[];
  borderColor: string;
}

export interface DrawingElement extends BaseElement {
  type: 'drawing';
  paths: {
    points: { x: number; y: number }[];
    color: string;
    width: number;
    tool: 'pencil' | 'marker' | 'eraser';
  }[];
}

export interface TextSpan {
  text: string;
  font?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  decoration?: 'none' | 'underline' | 'strikethrough';
}

export interface DocumentBodyElement extends BaseElement {
  type: 'documentBody';
  content: string;
  spans: TextSpan[];
  font: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  align: TextAlign;
  lineHeight: number;
  decoration: 'none' | 'underline' | 'strikethrough';
  marginLeft: number;
  marginRight: number;
  marginTop: number;
}

export type Element = TextElement | ShapeElement | ImageElement | TableElement | DrawingElement | DocumentBodyElement | BaseElement;

// ============================================================================
// Editor State
// ============================================================================

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
  imageQuality: number;
  embedFonts: boolean;
  pageRange?: { start: number; end: number };
}
