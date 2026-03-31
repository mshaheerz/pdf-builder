import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type ShapeType =
  | 'rect' | 'roundedRect' | 'circle' | 'ellipse' | 'triangle'
  | 'star' | 'polygon' | 'arrow' | 'line' | 'path'
  | 'diamond' | 'pentagon' | 'hexagon' | 'parallelogram' | 'trapezoid'
  | 'heart' | 'cross' | 'rightArrow' | 'doubleArrow' | 'callout';
export type EditorTool = 'select' | 'text' | 'image' | 'table' | 'shape' | 'pencil' | 'marker' | 'eraser' | 'hand' | 'zoom';

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

export type Element = TextElement | ShapeElement | ImageElement | TableElement | DrawingElement | BaseElement;

export interface Page {
  id: string;
  width: number;
  height: number;
  background: string;
  elements: Element[];
}

// ============================================================================
// Store
// ============================================================================

interface DocumentState {
  pages: Page[];
  activePage: number;
  selectedIds: string[];
  activeTool: EditorTool;
  activeShapeType: ShapeType;
  zoom: number;
  currentColor: string;
  currentFillColor: string;
  currentFont: string;
  currentFontSize: number;
  brushSize: number;
  brushOpacity: number;
  showGrid: boolean;
  snapToGrid: boolean;

  // Inline text editing
  editingTextId: string | null;
  editingCursorPos: number;

  // Inline table cell editing
  editingTableId: string | null;
  editingTableRow: number;
  editingTableCol: number;
  editingTableCursorPos: number;

  // History
  history: Page[][];
  historyIndex: number;

  // Actions
  addPage: () => void;
  removePage: (index: number) => void;
  setActivePage: (index: number) => void;
  addElement: (pageIndex: number, element: Element) => void;
  updateElement: (pageIndex: number, elementId: string, updates: Partial<Element>) => void;
  removeElement: (pageIndex: number, elementId: string) => void;
  moveElement: (pageIndex: number, elementId: string, dx: number, dy: number) => void;
  resizeElement: (pageIndex: number, elementId: string, width: number, height: number) => void;
  setSelectedIds: (ids: string[]) => void;
  setActiveTool: (tool: EditorTool) => void;
  setActiveShapeType: (shape: ShapeType) => void;
  setZoom: (zoom: number) => void;
  setCurrentColor: (color: string) => void;
  setCurrentFillColor: (color: string) => void;
  setCurrentFont: (font: string) => void;
  setCurrentFontSize: (size: number) => void;
  setBrushSize: (size: number) => void;
  setEditingTextId: (id: string | null) => void;
  setEditingCursorPos: (pos: number) => void;
  setEditingTable: (id: string | null, row?: number, col?: number) => void;
  setEditingTableCursorPos: (pos: number) => void;
  updateTableCell: (pageIndex: number, elementId: string, row: number, col: number, content: string) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  exportToJson: () => string;
  loadFromJson: (json: string) => void;
  getNextYPosition: (pageIndex: number) => number;
}

let idCounter = 0;
export const generateId = () => `${Date.now()}_${++idCounter}`;

const createDefaultPage = (): Page => ({
  id: generateId(),
  width: 595,
  height: 842,
  background: '#FFFFFF',
  elements: [],
});

export const useDocumentStore = create<DocumentState>((set, get) => ({
  pages: [createDefaultPage()],
  activePage: 0,
  selectedIds: [],
  activeTool: 'select',
  activeShapeType: 'rect',
  zoom: 1,
  currentColor: '#000000',
  currentFillColor: '#4ECDC4',
  currentFont: 'Helvetica',
  currentFontSize: 14,
  brushSize: 2,
  brushOpacity: 1,
  showGrid: false,
  snapToGrid: false,
  editingTextId: null,
  editingCursorPos: 0,
  editingTableId: null,
  editingTableRow: 0,
  editingTableCol: 0,
  editingTableCursorPos: 0,
  history: [],
  historyIndex: -1,

  addPage: () => set((s) => ({
    pages: [...s.pages, createDefaultPage()],
    activePage: s.pages.length,
  })),

  removePage: (index) => set((s) => {
    if (s.pages.length <= 1) return s;
    const pages = s.pages.filter((_, i) => i !== index);
    return { pages, activePage: Math.min(s.activePage, pages.length - 1) };
  }),

  setActivePage: (index) => set({ activePage: index }),

  addElement: (pageIndex, element) => set((s) => {
    const pages = [...s.pages];
    pages[pageIndex] = {
      ...pages[pageIndex],
      elements: [...pages[pageIndex].elements, element],
    };
    return { pages, selectedIds: [element.id] };
  }),

  updateElement: (pageIndex, elementId, updates) => set((s) => {
    const pages = [...s.pages];
    pages[pageIndex] = {
      ...pages[pageIndex],
      elements: pages[pageIndex].elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      ),
    };
    return { pages };
  }),

  removeElement: (pageIndex, elementId) => set((s) => {
    const pages = [...s.pages];
    pages[pageIndex] = {
      ...pages[pageIndex],
      elements: pages[pageIndex].elements.filter((el) => el.id !== elementId),
    };
    return {
      pages,
      selectedIds: s.selectedIds.filter((id) => id !== elementId),
      editingTextId: s.editingTextId === elementId ? null : s.editingTextId,
    };
  }),

  moveElement: (pageIndex, elementId, dx, dy) => set((s) => {
    const pages = [...s.pages];
    pages[pageIndex] = {
      ...pages[pageIndex],
      elements: pages[pageIndex].elements.map((el) =>
        el.id === elementId && !el.locked ? { ...el, x: el.x + dx, y: el.y + dy } : el
      ),
    };
    return { pages };
  }),

  resizeElement: (pageIndex, elementId, width, height) => set((s) => {
    const pages = [...s.pages];
    pages[pageIndex] = {
      ...pages[pageIndex],
      elements: pages[pageIndex].elements.map((el) =>
        el.id === elementId ? { ...el, width: Math.max(10, width), height: Math.max(10, height) } : el
      ),
    };
    return { pages };
  }),

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setActiveTool: (tool) => set({ activeTool: tool, editingTextId: null, editingTableId: null }),
  setActiveShapeType: (shape) => set({ activeShapeType: shape }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setCurrentColor: (color) => set({ currentColor: color }),
  setCurrentFillColor: (color) => set({ currentFillColor: color }),
  setCurrentFont: (font) => set({ currentFont: font }),
  setCurrentFontSize: (size) => set({ currentFontSize: size }),
  setBrushSize: (size) => set({ brushSize: size }),
  setEditingTextId: (id) => set({ editingTextId: id, editingTableId: null }),
  setEditingCursorPos: (pos) => set({ editingCursorPos: pos }),
  setEditingTable: (id, row = 0, col = 0) => set({ editingTableId: id, editingTableRow: row, editingTableCol: col, editingTableCursorPos: 0, editingTextId: null }),
  setEditingTableCursorPos: (pos) => set({ editingTableCursorPos: pos }),
  updateTableCell: (pageIndex, elementId, row, col, content) => set((s) => {
    const pages = [...s.pages];
    const el = pages[pageIndex].elements.find((e) => e.id === elementId) as any;
    if (!el || !el.rows?.[row]?.cells?.[col]) return s;
    const newRows = JSON.parse(JSON.stringify(el.rows));
    newRows[row].cells[col].content = content;
    pages[pageIndex] = {
      ...pages[pageIndex],
      elements: pages[pageIndex].elements.map((e) =>
        e.id === elementId ? { ...e, rows: newRows } : e
      ),
    };
    return { pages };
  }),

  pushHistory: () => set((s) => {
    const newHistory = s.history.slice(0, s.historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(s.pages)));
    if (newHistory.length > 50) newHistory.shift(); // limit history
    return { history: newHistory, historyIndex: newHistory.length - 1 };
  }),

  undo: () => set((s) => {
    if (s.historyIndex < 0) return s;
    const pages = JSON.parse(JSON.stringify(s.history[s.historyIndex]));
    return { pages, historyIndex: s.historyIndex - 1, selectedIds: [], editingTextId: null };
  }),

  redo: () => set((s) => {
    if (s.historyIndex >= s.history.length - 1) return s;
    const pages = JSON.parse(JSON.stringify(s.history[s.historyIndex + 1]));
    return { pages, historyIndex: s.historyIndex + 1, selectedIds: [], editingTextId: null };
  }),

  exportToJson: () => {
    const { pages } = get();
    return JSON.stringify({ version: '1.0', pages }, null, 2);
  },

  loadFromJson: (json) => {
    try {
      const data = JSON.parse(json);
      if (data.pages) {
        set({ pages: data.pages, activePage: 0, selectedIds: [], editingTextId: null });
      }
    } catch (e) {
      console.error('Failed to load document:', e);
    }
  },

  // Find the next available Y position (below all existing elements)
  getNextYPosition: (pageIndex: number) => {
    const { pages } = get();
    const page = pages[pageIndex];
    if (!page || page.elements.length === 0) return 60;
    let maxBottom = 0;
    for (const el of page.elements) {
      maxBottom = Math.max(maxBottom, el.y + el.height);
    }
    return Math.min(maxBottom + 20, page.height - 100);
  },
}));
