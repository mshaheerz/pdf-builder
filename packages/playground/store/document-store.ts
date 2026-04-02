import { create } from 'zustand';
import { calculateTableHeights } from './table-utils';
import { generateId } from '@pdf-builder/sdk';
import type {
  TextAlign, VerticalAlign, ShapeType, EditorTool, EditorMode,
  Fill, BorderStyle, BaseElement, TextElement, ShapeElement,
  ImageElement, TableElement, DrawingElement, DocumentBodyElement,
  Element, Page, TextSpan,
} from '@pdf-builder/sdk';

export type {
  TextAlign, VerticalAlign, ShapeType, EditorTool, EditorMode,
  Fill, BorderStyle, BaseElement, TextElement, ShapeElement,
  ImageElement, TableElement, DrawingElement, DocumentBodyElement,
  Element, Page, TextSpan,
};

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
  editorMode: EditorMode;

  // Inline text editing
  editingTextId: string | null;
  editingCursorPos: number;
  editingSelectionStart: number | null;
  editingSelectionEnd: number | null;
  pendingStyle: Partial<TextSpan> | null;

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
  setEditorMode: (mode: EditorMode) => void;
  setEditingTextId: (id: string | null) => void;
  setEditingCursorPos: (pos: number) => void;
  setEditingCursorPosKeepSelection: (pos: number) => void;
  setEditingSelection: (start: number | null, end: number | null) => void;
  setPendingStyle: (style: Partial<TextSpan> | null) => void;
  setEditingTable: (id: string | null, row?: number, col?: number) => void;
  setEditingTableCursorPos: (pos: number) => void;
  updateTableCell: (pageIndex: number, elementId: string, row: number, col: number, content: string) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  exportToJson: () => string;
  loadFromJson: (json: string) => void;
  getNextYPosition: (pageIndex: number) => number;
  ensureDocumentBody: (pageIndex: number) => string;
}

export { generateId };

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
  editorMode: 'design',
  editingTextId: null,
  editingCursorPos: 0,
  editingSelectionStart: null,
  editingSelectionEnd: null,
  pendingStyle: null,
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
      elements: pages[pageIndex].elements.map((el) => {
        if (el.id === elementId) {
          const updatedEl = { ...el, ...updates } as any;
          const u = updates as any;
          if (updatedEl.type === 'table' && (u.width !== undefined || u.rows !== undefined || u.columns !== undefined)) {
            const { rows: updatedRows, totalHeight } = calculateTableHeights(updatedEl);
            return { ...updatedEl, rows: updatedRows, height: Math.max(updatedEl.height || 0, totalHeight) };
          }
          return updatedEl;
        }
        return el;
      }),
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
      elements: pages[pageIndex].elements.map((el) => {
        if (el.id === elementId) {
          const updatedEl = { ...el, width: Math.max(10, width), height: Math.max(10, height) } as any;
          if (updatedEl.type === 'table') {
            const { rows: updatedRows, totalHeight } = calculateTableHeights(updatedEl);
            return { ...updatedEl, rows: updatedRows, height: Math.max(updatedEl.height, totalHeight) };
          }
          return updatedEl;
        }
        return el;
      }),
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
  setEditorMode: (mode) => {
    if (mode === 'textEditor') {
      const state = get();
      const bodyId = state.ensureDocumentBody(state.activePage);
      set({ editorMode: mode, activeTool: 'text', editingTextId: bodyId, editingCursorPos: 0, selectedIds: [] });
    } else {
      set({ editorMode: mode, activeTool: 'select', editingTextId: null });
    }
  },
  setEditingTextId: (id) => set({ editingTextId: id, editingTableId: null }),
  setEditingCursorPos: (pos) => set({ editingCursorPos: pos, editingSelectionStart: null, editingSelectionEnd: null, pendingStyle: null }),
  setEditingCursorPosKeepSelection: (pos: number) => set({ editingCursorPos: pos }),
  setEditingSelection: (start, end) => set({ editingSelectionStart: start, editingSelectionEnd: end }),
  setPendingStyle: (style) => set({ pendingStyle: style }),
  setEditingTable: (id, row = 0, col = 0) => set({ editingTableId: id, editingTableRow: row, editingTableCol: col, editingTableCursorPos: 0, editingTextId: null }),
  setEditingTableCursorPos: (pos) => set({ editingTableCursorPos: pos }),
  updateTableCell: (pageIndex, elementId, row, col, content) => set((s) => {
    const pages = [...s.pages];
    const el = pages[pageIndex].elements.find((e) => e.id === elementId) as any;
    if (!el || !el.rows?.[row]?.cells?.[col]) return s;

    const newRows = JSON.parse(JSON.stringify(el.rows));
    newRows[row].cells[col].content = content;

    // Recalculate row heights accurately
    const { rows: updatedRows, totalHeight } = calculateTableHeights({
      ...el,
      rows: newRows
    });

    const newHeight = Math.max(el.height, totalHeight);

    pages[pageIndex] = {
      ...pages[pageIndex],
      elements: pages[pageIndex].elements.map((e) =>
        e.id === elementId ? { ...e, rows: updatedRows, height: newHeight } : e
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
        // Migrate: add spans to documentBody elements that lack them
        for (const page of data.pages) {
          for (const el of page.elements) {
            if (el.type === 'documentBody' && !el.spans) {
              el.spans = [{ text: el.content || '' }];
            }
          }
        }
        set({ pages: data.pages, activePage: 0, selectedIds: [], editingTextId: null });
      }
    } catch (e) {
      console.error('Failed to load document:', e);
    }
  },

  ensureDocumentBody: (pageIndex: number) => {
    const state = get();
    const page = state.pages[pageIndex];
    if (!page) return '';
    const existing = page.elements.find((el) => el.type === 'documentBody') as DocumentBodyElement | undefined;
    if (existing) return existing.id;
    const margin = 72;
    const newId = generateId();
    const body: DocumentBodyElement = {
      id: newId, type: 'documentBody',
      x: margin, y: margin, width: page.width - margin * 2, height: page.height - margin,
      rotation: 0, opacity: 1, locked: false, visible: true, name: 'Document Body',
      content: '', spans: [{ text: '' }], font: state.currentFont, fontSize: state.currentFontSize,
      fontWeight: 'normal', fontStyle: 'normal',
      color: state.currentColor, align: 'left', lineHeight: 1.2, decoration: 'none',
      marginLeft: margin, marginRight: margin, marginTop: margin,
    };
    const pages = [...state.pages];
    pages[pageIndex] = { ...pages[pageIndex], elements: [body, ...pages[pageIndex].elements] };
    set({ pages });
    return newId;
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
