'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useDocumentStore, generateId, type Element, type ShapeElement, type EditorMode } from '@/store/document-store';
import { wrapText } from '@/store/table-utils';

// ============================================================================
// Image cache - prevents flicker
// ============================================================================
const imageCache = new Map<string, HTMLImageElement>();
function getCachedImage(src: string): HTMLImageElement | null {
  if (imageCache.has(src)) return imageCache.get(src)!;
  const img = new Image();
  img.src = src;
  img.onload = () => { imageCache.set(src, img); };
  if (img.complete) { imageCache.set(src, img); return img; }
  return null;
}

// ============================================================================
// Canvas Component
// ============================================================================
export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const {
    pages, activePage, zoom, selectedIds, setSelectedIds, activeTool,
    currentColor, currentFillColor, brushSize, activeShapeType,
    moveElement, resizeElement, addElement, updateElement, pushHistory,
    editingTextId, setEditingTextId, setEditingCursorPos, editingCursorPos,
    editingTableId, editingTableRow, editingTableCol, editingTableCursorPos,
    setEditingTable, setEditingTableCursorPos, updateTableCell,
    editorMode,
  } = useDocumentStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, ex: 0, ey: 0 });
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [blinkVisible, setBlinkVisible] = useState(true);
  const [shapeDrawing, setShapeDrawing] = useState<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);

  const page = pages[activePage];

  // Blink cursor for text/table editing
  useEffect(() => {
    if (!editingTextId && !editingTableId) return;
    setBlinkVisible(true);
    const interval = setInterval(() => setBlinkVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, [editingTextId, editingTableId]);

  // Compute the page offset (centering the page in the canvas)
  // IMPORTANT: use CSS size (clientWidth), NOT canvas.width which includes devicePixelRatio
  const getPageOffset = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const cssWidth = container.clientWidth;
    const offsetX = pan.x + (cssWidth - (page?.width ?? 595) * zoom) / 2;
    const offsetY = pan.y + 40;
    return { x: offsetX, y: offsetY };
  }, [pan, zoom, page?.width]);

  // Convert screen coords -> page coords (FIXED: accounts for centering)
  const canvasToPage = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    const offset = getPageOffset();
    const pageX = (canvasX - offset.x) / zoom;
    const pageY = (canvasY - offset.y) / zoom;
    return { x: pageX, y: pageY };
  }, [zoom, getPageOffset, page]);

  // Clamp point to within page bounds
  const clampToPage = useCallback((x: number, y: number) => {
    if (!page) return { x, y };
    return {
      x: Math.max(0, Math.min(page.width, x)),
      y: Math.max(0, Math.min(page.height, y)),
    };
  }, [page]);

  // Is a point inside the page?
  const isInsidePage = useCallback((x: number, y: number) => {
    if (!page) return false;
    return x >= 0 && x <= page.width && y >= 0 && y <= page.height;
  }, [page]);

  // Hit test that respects shape geometry
  const hitTest = useCallback((px: number, py: number, elements: Element[]): Element | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (!el.visible || el.locked) continue;
      if (hitTestElement(px, py, el)) return el;
    }
    return null;
  }, []);

  // Check resize handle hit
  const hitTestResizeHandle = useCallback((px: number, py: number, el: Element): string | null => {
    const hs = 8 / zoom;
    const handles: [string, number, number][] = [
      ['nw', el.x, el.y],
      ['ne', el.x + el.width, el.y],
      ['sw', el.x, el.y + el.height],
      ['se', el.x + el.width, el.y + el.height],
      ['n', el.x + el.width / 2, el.y],
      ['s', el.x + el.width / 2, el.y + el.height],
      ['w', el.x, el.y + el.height / 2],
      ['e', el.x + el.width, el.y + el.height / 2],
    ];
    for (const [name, hx, hy] of handles) {
      if (Math.abs(px - hx) < hs && Math.abs(py - hy) < hs) return name;
    }
    return null;
  }, [zoom]);

  // Get cursor style based on active tool and hover state
  const getCursorStyle = useCallback(() => {
    if (isResizing) {
      const map: Record<string, string> = {
        nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
        n: 'ns-resize', s: 'ns-resize', w: 'ew-resize', e: 'ew-resize',
      };
      return map[resizeHandle || ''] || 'default';
    }
    if (hoveredHandle && activeTool === 'select') {
      const map: Record<string, string> = {
        nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize',
        n: 'ns-resize', s: 'ns-resize', w: 'ew-resize', e: 'ew-resize',
      };
      return map[hoveredHandle] || 'default';
    }
    if (editorMode === 'textEditor') return 'text';
    switch (activeTool) {
      case 'select': return 'default';
      case 'text': return 'text';
      case 'hand': return isDragging ? 'grabbing' : 'grab';
      case 'pencil': return 'crosshair';
      case 'marker': return 'crosshair';
      case 'eraser': return 'crosshair';
      case 'shape': return 'crosshair';
      case 'zoom': return 'zoom-in';
      default: return 'default';
    }
  }, [activeTool, isDragging, isResizing, resizeHandle, hoveredHandle, editorMode]);

  // Helper: which table cell is at (px, py)?
  const hitTestTableCell = useCallback((px: number, py: number, el: any): { row: number; col: number } | null => {
    if (el.type !== 'table' || !el.columns || !el.rows) return null;
    const totalW = el.columns.reduce((a: number, c: any) => a + c.width, 0);
    const scaleX = el.width / totalW;
    let yy = el.y;
    for (let ri = 0; ri < el.rows.length; ri++) {
      const row = el.rows[ri];
      let xx = el.x;
      for (let ci = 0; ci < row.cells.length && ci < el.columns.length; ci++) {
        const cw = el.columns[ci].width * scaleX;
        if (px >= xx && px <= xx + cw && py >= yy && py <= yy + row.height) {
          return { row: ri, col: ci };
        }
        xx += cw;
      }
      yy += row.height;
    }
    return null;
  }, []);

  // ========================================================================
  // Mouse Handlers
  // ========================================================================

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { x, y } = canvasToPage(e.clientX, e.clientY);

    // TEXT EDITOR MODE — click anywhere on page to type
    if (editorMode === 'textEditor') {
      const hit = page ? hitTest(x, y, page.elements) : null;

      // Click on existing text → enter editing
      if (hit && hit.type === 'text') {
        setEditingTextId(hit.id);
        setEditingCursorPos((hit as any).content?.length ?? 0);
        setSelectedIds([hit.id]);
        setEditingTable(null);
        return;
      }

      // Click on empty area inside page → create new text element and start editing
      if (isInsidePage(x, y) && !hit) {
        pushHistory();
        const store = useDocumentStore.getState();
        const newId = generateId();
        addElement(activePage, {
          id: newId, type: 'text',
          x: Math.max(10, x), y: Math.max(10, y), width: page!.width - Math.max(10, x) - 20, height: 30,
          rotation: 0, opacity: 1, locked: false, visible: true,
          name: 'Text', content: '',
          font: store.currentFont, fontSize: store.currentFontSize,
          fontWeight: 'normal', fontStyle: 'normal',
          color: store.currentColor, align: 'left', lineHeight: 1.2, decoration: 'none',
        } as any);
        setEditingTextId(newId);
        setEditingCursorPos(0);
        setSelectedIds([newId]);
        return;
      }

      // Click on non-text element → select it
      if (hit) {
        setSelectedIds([hit.id]);
        setEditingTextId(null);
        setIsDragging(true);
        setDragStart({ x, y });
        pushHistory();
      } else {
        setSelectedIds([]);
        setEditingTextId(null);
      }
      return;
    }

    // HAND tool
    if (activeTool === 'hand') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // ZOOM tool
    if (activeTool === 'zoom') {
      const store = useDocumentStore.getState();
      store.setZoom(e.shiftKey ? zoom - 0.25 : zoom + 0.25);
      return;
    }

    // SELECT tool
    if (activeTool === 'select') {
      // First check if clicking a resize handle on a selected element
      if (selectedIds.length === 1) {
        const sel = page?.elements.find((el) => el.id === selectedIds[0]);
        if (sel) {
          const handle = hitTestResizeHandle(x, y, sel);
          if (handle) {
            setIsResizing(true);
            setResizeHandle(handle);
            setResizeStart({ x, y, w: sel.width, h: sel.height, ex: sel.x, ey: sel.y });
            pushHistory();
            return;
          }
        }
      }

      const hit = page ? hitTest(x, y, page.elements) : null;
      if (hit) {
        // Single-click on text → enter editing mode directly
        if (hit.type === 'text') {
          setEditingTextId(hit.id);
          setEditingCursorPos((hit as any).content?.length ?? 0);
          setSelectedIds([hit.id]);
          setEditingTable(null);
          return;
        }
        // Double-click on table cell → enter cell editing
        if (hit.type === 'table' && e.detail === 2) {
          const cell = hitTestTableCell(x, y, hit);
          if (cell) {
            const tableEl = hit as any;
            const cellContent = tableEl.rows?.[cell.row]?.cells?.[cell.col]?.content || '';
            setEditingTable(hit.id, cell.row, cell.col);
            setEditingTableCursorPos(cellContent.length);
            setSelectedIds([hit.id]);
            setEditingTextId(null);
            return;
          }
        }
        // Stop editing if clicking elsewhere
        if (editingTextId && hit.id !== editingTextId) {
          setEditingTextId(null);
        }
        if (editingTableId && hit.id !== editingTableId) {
          setEditingTable(null);
        }
        setSelectedIds([hit.id]);
        setIsDragging(true);
        setDragStart({ x, y });
        pushHistory();
      } else {
        setSelectedIds([]);
        setEditingTextId(null);
        setEditingTable(null);
      }
      return;
    }

    // DRAWING tools — only draw inside page
    if (activeTool === 'pencil' || activeTool === 'marker' || activeTool === 'eraser') {
      if (!isInsidePage(x, y)) return;
      const clamped = clampToPage(x, y);
      setDrawingPoints([clamped]);
      setIsDragging(true);
      return;
    }

    // TEXT tool — place text where clicked (only inside page)
    if (activeTool === 'text') {
      if (!isInsidePage(x, y)) return;
      pushHistory();
      const store = useDocumentStore.getState();
      const newId = generateId();
      addElement(activePage, {
        id: newId, type: 'text',
        x: Math.max(10, x), y: Math.max(10, y), width: 200, height: 30,
        rotation: 0, opacity: 1, locked: false, visible: true,
        name: 'Text', content: '',
        font: store.currentFont, fontSize: store.currentFontSize,
        fontWeight: 'normal', fontStyle: 'normal',
        color: store.currentColor, align: 'left', lineHeight: 1.2, decoration: 'none',
      } as any);
      setEditingTextId(newId);
      setEditingCursorPos(0);
      useDocumentStore.getState().setActiveTool('select');
      return;
    }

    // SHAPE tool — start drag-to-create
    if (activeTool === 'shape') {
      if (!isInsidePage(x, y)) return;
      setShapeDrawing({ startX: x, startY: y, curX: x, curY: y });
      setIsDragging(true);
      return;
    }

    // TABLE tool
    if (activeTool === 'table') {
      if (!isInsidePage(x, y)) return;
      pushHistory();
      addElement(activePage, {
        id: generateId(), type: 'table',
        x: Math.max(10, x), y: Math.max(10, y), width: 400, height: 120,
        rotation: 0, opacity: 1, locked: false, visible: true, name: 'Table',
        columns: [{ width: 100 }, { width: 100 }, { width: 100 }, { width: 100 }],
        rows: [
          { height: 30, cells: [{ content: 'Header 1', background: '#E8E8FF' }, { content: 'Header 2', background: '#E8E8FF' }, { content: 'Header 3', background: '#E8E8FF' }, { content: 'Header 4', background: '#E8E8FF' }] },
          { height: 30, cells: [{ content: '' }, { content: '' }, { content: '' }, { content: '' }] },
          { height: 30, cells: [{ content: '' }, { content: '' }, { content: '' }, { content: '' }] },
        ],
        borderColor: '#C0C0C0',
      } as any);
      useDocumentStore.getState().setActiveTool('select');
      return;
    }
  }, [activeTool, page, canvasToPage, hitTest, hitTestResizeHandle, pan, currentColor, currentFillColor, activeShapeType, activePage, zoom, selectedIds, editingTextId, isInsidePage, clampToPage, editorMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = canvasToPage(e.clientX, e.clientY);

    // When not dragging, detect hover over resize handles for cursor
    if (!isDragging && !isResizing) {
      if (activeTool === 'select' && selectedIds.length === 1) {
        const sel = page?.elements.find((el) => el.id === selectedIds[0]);
        if (sel) {
          const handle = hitTestResizeHandle(x, y, sel);
          setHoveredHandle(handle);
        } else {
          setHoveredHandle(null);
        }
      } else {
        setHoveredHandle(null);
      }
      return;
    }

    // HAND
    if (activeTool === 'hand' && isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    // RESIZE
    if (isResizing && resizeHandle && selectedIds.length === 1) {
      const dx = x - resizeStart.x;
      const dy = y - resizeStart.y;
      const el = page?.elements.find((e) => e.id === selectedIds[0]);
      if (!el) return;

      let newX = resizeStart.ex, newY = resizeStart.ey;
      let newW = resizeStart.w, newH = resizeStart.h;

      if (resizeHandle.includes('e')) newW = resizeStart.w + dx;
      if (resizeHandle.includes('w')) { newW = resizeStart.w - dx; newX = resizeStart.ex + dx; }
      if (resizeHandle.includes('s')) newH = resizeStart.h + dy;
      if (resizeHandle.includes('n')) { newH = resizeStart.h - dy; newY = resizeStart.ey + dy; }

      newW = Math.max(10, newW);
      newH = Math.max(10, newH);

      const updates: any = { x: newX, y: newY, width: newW, height: newH };

      // Proportionally scale table columns and rows
      if (el.type === 'table') {
        const tableEl = el as any;
        const scaleX = newW / el.width;
        const scaleY = newH / el.height;
        if (tableEl.columns) {
          updates.columns = tableEl.columns.map((c: any) => ({ ...c, width: c.width * scaleX }));
        }
        if (tableEl.rows) {
          updates.rows = tableEl.rows.map((r: any) => ({ ...r, height: r.height * scaleY }));
        }
      }

      useDocumentStore.getState().updateElement(activePage, el.id, updates);
      return;
    }

    // SELECT drag move
    if (activeTool === 'select' && isDragging && selectedIds.length > 0) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      selectedIds.forEach((id) => moveElement(activePage, id, dx, dy));
      setDragStart({ x, y });
      return;
    }

    // DRAWING — clamp to page
    if ((activeTool === 'pencil' || activeTool === 'marker' || activeTool === 'eraser') && isDragging) {
      const clamped = clampToPage(x, y);
      setDrawingPoints((prev) => [...prev, clamped]);
      return;
    }

    // SHAPE drag-to-create
    if (activeTool === 'shape' && isDragging && shapeDrawing) {
      const clamped = clampToPage(x, y);
      setShapeDrawing({ ...shapeDrawing, curX: clamped.x, curY: clamped.y });
      return;
    }
  }, [isDragging, isResizing, activeTool, dragStart, selectedIds, canvasToPage, activePage, resizeHandle, resizeStart, shapeDrawing, clampToPage, page, hitTestResizeHandle]);

  const handleMouseUp = useCallback(() => {
    // Drawing finish
    if (isDragging && (activeTool === 'pencil' || activeTool === 'marker' || activeTool === 'eraser') && drawingPoints.length > 1) {
      pushHistory();
      const bounds = drawingPoints.reduce(
        (acc, p) => ({
          minX: Math.min(acc.minX, p.x), minY: Math.min(acc.minY, p.y),
          maxX: Math.max(acc.maxX, p.x), maxY: Math.max(acc.maxY, p.y),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      );
      const w = Math.max(1, bounds.maxX - bounds.minX);
      const h = Math.max(1, bounds.maxY - bounds.minY);
      addElement(activePage, {
        id: generateId(), type: 'drawing',
        x: bounds.minX, y: bounds.minY, width: w, height: h,
        rotation: 0, opacity: 1, locked: false, visible: true, name: 'Drawing',
        paths: [{
          points: drawingPoints.map((p) => ({ x: p.x - bounds.minX, y: p.y - bounds.minY })),
          color: activeTool === 'eraser' ? '#FFFFFF' : currentColor,
          width: activeTool === 'marker' ? brushSize * 3 : brushSize,
          tool: activeTool as 'pencil' | 'marker' | 'eraser',
        }],
      } as any);
      setDrawingPoints([]);
    }

    // Shape drag-to-create finish
    if (isDragging && activeTool === 'shape' && shapeDrawing) {
      const sx = Math.min(shapeDrawing.startX, shapeDrawing.curX);
      const sy = Math.min(shapeDrawing.startY, shapeDrawing.curY);
      const sw = Math.abs(shapeDrawing.curX - shapeDrawing.startX);
      const sh = Math.abs(shapeDrawing.curY - shapeDrawing.startY);
      if (sw > 5 && sh > 5) {
        pushHistory();
        addElement(activePage, {
          id: generateId(), type: 'shape',
          x: sx, y: sy, width: sw, height: sh,
          rotation: 0, opacity: 1, locked: false, visible: true,
          name: activeShapeType, shapeType: activeShapeType,
          fill: { type: 'solid', color: currentFillColor },
          stroke: { width: 2, color: currentColor, style: 'solid' },
          borderRadius: activeShapeType === 'roundedRect' ? 12 : 0,
        } as any);
      }
      setShapeDrawing(null);
      useDocumentStore.getState().setActiveTool('select');
    }

    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, [isDragging, activeTool, drawingPoints, currentColor, brushSize, activePage, shapeDrawing, currentFillColor, activeShapeType]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      useDocumentStore.getState().setZoom(zoom + delta);
    } else {
      // scroll to pan
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, [zoom]);

  // ========================================================================
  // Keyboard handler for text editing
  // ========================================================================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      const store = useDocumentStore.getState();

      // Text editing mode
      if (store.editingTextId) {
        const page = store.pages[store.activePage];
        const el = page?.elements.find((el) => el.id === store.editingTextId) as any;
        if (!el) return;

        e.preventDefault();
        const content = el.content || '';
        const pos = store.editingCursorPos;

        if (e.key === 'Escape') {
          store.setEditingTextId(null);
          return;
        }
        if (e.key === 'Backspace') {
          if (pos > 0) {
            const newContent = content.slice(0, pos - 1) + content.slice(pos);
            store.updateElement(store.activePage, el.id, { content: newContent } as any);
            store.setEditingCursorPos(pos - 1);
          }
          return;
        }
        if (e.key === 'Delete') {
          if (pos < content.length) {
            const newContent = content.slice(0, pos) + content.slice(pos + 1);
            store.updateElement(store.activePage, el.id, { content: newContent } as any);
          }
          return;
        }
        if (e.key === 'ArrowLeft') {
          store.setEditingCursorPos(Math.max(0, pos - 1));
          return;
        }
        if (e.key === 'ArrowRight') {
          store.setEditingCursorPos(Math.min(content.length, pos + 1));
          return;
        }
        if (e.key === 'Home') { store.setEditingCursorPos(0); return; }
        if (e.key === 'End') { store.setEditingCursorPos(content.length); return; }
        if (e.key === 'Enter') {
          const newContent = content.slice(0, pos) + '\n' + content.slice(pos);
          store.updateElement(store.activePage, el.id, { content: newContent } as any);
          store.setEditingCursorPos(pos + 1);
          return;
        }

        // Type character
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const newContent = content.slice(0, pos) + e.key + content.slice(pos);
          store.updateElement(store.activePage, el.id, { content: newContent } as any);
          store.setEditingCursorPos(pos + 1);
          return;
        }

        // Ctrl+A select all
        if (e.ctrlKey && e.key === 'a') {
          store.setEditingCursorPos(content.length);
          return;
        }
        return;
      }

      // Table cell editing mode
      if (store.editingTableId) {
        const page = store.pages[store.activePage];
        const el = page?.elements.find((el) => el.id === store.editingTableId) as any;
        if (!el || !el.rows) { store.setEditingTable(null); return; }

        const row = store.editingTableRow;
        const col = store.editingTableCol;
        const cell = el.rows[row]?.cells?.[col];
        if (!cell) { store.setEditingTable(null); return; }

        e.preventDefault();
        const cellContent = cell.content || '';
        const pos = store.editingTableCursorPos;

        if (e.key === 'Escape') {
          store.setEditingTable(null);
          return;
        }
        if (e.key === 'Tab') {
          // Move to next cell
          let nextCol = col + 1;
          let nextRow = row;
          if (nextCol >= el.columns.length) { nextCol = 0; nextRow++; }
          if (nextRow < el.rows.length) {
            const nextContent = el.rows[nextRow]?.cells?.[nextCol]?.content || '';
            store.setEditingTable(el.id, nextRow, nextCol);
            store.setEditingTableCursorPos(nextContent.length);
          } else {
            store.setEditingTable(null);
          }
          return;
        }
        if (e.key === 'Backspace') {
          if (pos > 0) {
            const newContent = cellContent.slice(0, pos - 1) + cellContent.slice(pos);
            store.updateTableCell(store.activePage, el.id, row, col, newContent);
            store.setEditingTableCursorPos(pos - 1);
          }
          return;
        }
        if (e.key === 'Delete') {
          if (pos < cellContent.length) {
            const newContent = cellContent.slice(0, pos) + cellContent.slice(pos + 1);
            store.updateTableCell(store.activePage, el.id, row, col, newContent);
          }
          return;
        }
        if (e.key === 'ArrowLeft') { store.setEditingTableCursorPos(Math.max(0, pos - 1)); return; }
        if (e.key === 'ArrowRight') { store.setEditingTableCursorPos(Math.min(cellContent.length, pos + 1)); return; }
        if (e.key === 'ArrowUp') {
          if (row > 0) {
            const prevContent = el.rows[row - 1]?.cells?.[col]?.content || '';
            store.setEditingTable(el.id, row - 1, col);
            store.setEditingTableCursorPos(Math.min(pos, prevContent.length));
          }
          return;
        }
        if (e.key === 'ArrowDown') {
          if (row < el.rows.length - 1) {
            const nextContent = el.rows[row + 1]?.cells?.[col]?.content || '';
            store.setEditingTable(el.id, row + 1, col);
            store.setEditingTableCursorPos(Math.min(pos, nextContent.length));
          }
          return;
        }
        if (e.key === 'Enter') {
          // Move to cell below
          if (row < el.rows.length - 1) {
            const nextContent = el.rows[row + 1]?.cells?.[col]?.content || '';
            store.setEditingTable(el.id, row + 1, col);
            store.setEditingTableCursorPos(nextContent.length);
          } else {
            store.setEditingTable(null);
          }
          return;
        }
        if (e.key === 'Home') { store.setEditingTableCursorPos(0); return; }
        if (e.key === 'End') { store.setEditingTableCursorPos(cellContent.length); return; }

        // Type character
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const newContent = cellContent.slice(0, pos) + e.key + cellContent.slice(pos);
          store.updateTableCell(store.activePage, el.id, row, col, newContent);
          store.setEditingTableCursorPos(pos + 1);
          return;
        }
        return;
      }

      // Non-editing shortcuts
      if (e.key === 'Delete' || e.key === 'Backspace') {
        store.pushHistory();
        store.selectedIds.forEach((id) => store.removeElement(store.activePage, id));
      }
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); store.undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); store.redo(); }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        const page = store.pages[store.activePage];
        store.selectedIds.forEach((id) => {
          const el = page?.elements.find((e) => e.id === id);
          if (el) {
            store.pushHistory();
            store.addElement(store.activePage, { ...el, id: generateId(), x: el.x + 20, y: el.y + 20 });
          }
        });
      }
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key === 'v' || e.key === 'V') store.setActiveTool('select');
        if (e.key === 'p' || e.key === 'P') store.setActiveTool('pencil');
        if (e.key === 'm' || e.key === 'M') store.setActiveTool('marker');
        if (e.key === 'e' || e.key === 'E') store.setActiveTool('eraser');
        if (e.key === 'h' || e.key === 'H') store.setActiveTool('hand');
        if (e.key === 'r' || e.key === 'R') store.setActiveTool('shape');
        if (e.key === 'Escape') { store.setSelectedIds([]); store.setEditingTextId(null); }
      }
      // Arrow keys to nudge selected elements
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && store.selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        store.selectedIds.forEach((id) => store.moveElement(store.activePage, id, dx, dy));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ========================================================================
  // Render loop
  // ========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    const offsetX = pan.x + (w - page.width * zoom) / 2;
    const offsetY = pan.y + 40;
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // Page shadow
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 15 / zoom;
    ctx.shadowOffsetX = 4 / zoom;
    ctx.shadowOffsetY = 4 / zoom;
    ctx.fillStyle = page.background;
    ctx.fillRect(0, 0, page.width, page.height);
    ctx.shadowColor = 'transparent';

    // Page border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.5 / zoom;
    ctx.strokeRect(0, 0, page.width, page.height);

    // Clip to page for rendering
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, page.width, page.height);
    ctx.clip();

    // Render all elements
    for (const el of page.elements) {
      if (!el.visible) continue;
      ctx.save();
      ctx.globalAlpha = el.opacity;

      if (el.rotation) {
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-el.width / 2, -el.height / 2);
        renderElement(ctx, { ...el, x: 0, y: 0 }, editingTextId, editingCursorPos, blinkVisible, editingTableId, editingTableRow, editingTableCol, editingTableCursorPos);
      } else {
        renderElement(ctx, el, editingTextId, editingCursorPos, blinkVisible, editingTableId, editingTableRow, editingTableCol, editingTableCursorPos);
      }
      ctx.restore();
    }

    // Live drawing preview
    if (isDragging && drawingPoints.length > 1 && (activeTool === 'pencil' || activeTool === 'marker' || activeTool === 'eraser')) {
      ctx.save();
      ctx.strokeStyle = activeTool === 'eraser' ? page.background : currentColor;
      ctx.lineWidth = activeTool === 'marker' ? brushSize * 3 : brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (activeTool === 'marker') ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Shape preview while dragging
    if (isDragging && shapeDrawing) {
      const sx = Math.min(shapeDrawing.startX, shapeDrawing.curX);
      const sy = Math.min(shapeDrawing.startY, shapeDrawing.curY);
      const sw = Math.abs(shapeDrawing.curX - shapeDrawing.startX);
      const sh = Math.abs(shapeDrawing.curY - shapeDrawing.startY);
      if (sw > 2 && sh > 2) {
        ctx.save();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.fillStyle = currentFillColor + '44'; // translucent preview
        const previewEl = {
          x: sx, y: sy, width: sw, height: sh,
          shapeType: activeShapeType, borderRadius: activeShapeType === 'roundedRect' ? 12 : 0,
          fill: { type: 'solid' as const, color: currentFillColor + '44' },
          stroke: { width: 2, color: currentColor, style: 'dashed' as const },
        };
        drawShapePath(ctx, previewEl as any);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    ctx.restore(); // end clip

    // Selection UI (outside clip so handles are always visible)
    for (const el of page.elements) {
      if (!selectedIds.includes(el.id)) continue;
      ctx.save();
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([5 / zoom, 3 / zoom]);
      ctx.strokeRect(el.x - 1, el.y - 1, el.width + 2, el.height + 2);
      ctx.setLineDash([]);

      // Resize handles
      const hs = 7 / zoom;
      const hhs = hs / 2;
      const handles: [number, number][] = [
        [el.x, el.y], [el.x + el.width, el.y],
        [el.x, el.y + el.height], [el.x + el.width, el.y + el.height],
        [el.x + el.width / 2, el.y], [el.x + el.width / 2, el.y + el.height],
        [el.x, el.y + el.height / 2], [el.x + el.width, el.y + el.height / 2],
      ];
      for (const [hx, hy] of handles) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1.5 / zoom;
        ctx.fillRect(hx - hhs, hy - hhs, hs, hs);
        ctx.strokeRect(hx - hhs, hy - hhs, hs, hs);
      }
      ctx.restore();
    }

    ctx.restore(); // end translate+scale

    // Rulers / page info
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${page.width} × ${page.height} pt  |  ${Math.round(zoom * 100)}%  |  ${page.elements.length} elements`, 10, h - 10);

  }, [page, zoom, selectedIds, pan, isDragging, isResizing, drawingPoints, activeTool, currentColor, currentFillColor, brushSize, editingTextId, editingCursorPos, blinkVisible, shapeDrawing, activeShapeType, editingTableId, editingTableRow, editingTableCol, editingTableCursorPos, editorMode]);

  // Handle window resize
  useEffect(() => {
    const onResize = () => {
      // Force re-render
      useDocumentStore.getState().setZoom(useDocumentStore.getState().zoom);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!page) return <div className="flex-1 bg-editor-bg" />;

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      style={{ cursor: getCursorStyle() }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={(e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            const { x, y } = canvasToPage(e.clientX, e.clientY);
            if (!isInsidePage(x, y)) return;
            pushHistory();
            addElement(activePage, {
              id: generateId(), type: 'image',
              x: Math.max(10, x), y: Math.max(10, y), width: 200, height: 150,
              rotation: 0, opacity: 1, locked: false, visible: true,
              name: files[0].name, src: reader.result as string, fit: 'contain',
            } as any);
          };
          reader.readAsDataURL(files[0]);
        }
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

// ============================================================================
// HIT TEST that respects shape geometry
// ============================================================================
function hitTestElement(px: number, py: number, el: Element): boolean {
  // First: bounding box check
  if (px < el.x || px > el.x + el.width || py < el.y || py > el.y + el.height) return false;

  if (el.type !== 'shape') return true;
  const shape = el as ShapeElement;

  switch (shape.shapeType) {
    case 'circle':
    case 'ellipse': {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = el.width / 2;
      const ry = el.height / 2;
      return ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2) <= 1;
    }
    case 'triangle': {
      return pointInTriangle(px, py,
        el.x + el.width / 2, el.y,
        el.x + el.width, el.y + el.height,
        el.x, el.y + el.height);
    }
    case 'diamond': {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
      return (Math.abs(px - cx) / (el.width / 2) + Math.abs(py - cy) / (el.height / 2)) <= 1;
    }
    default:
      return true; // bounding box is fine for rect and others
  }
}

function pointInTriangle(px: number, py: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): boolean {
  const d1 = sign(px, py, x1, y1, x2, y2);
  const d2 = sign(px, py, x2, y2, x3, y3);
  const d3 = sign(px, py, x3, y3, x1, y1);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}
function sign(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
}

// ============================================================================
// RENDER ELEMENT
// ============================================================================
function renderElement(
  ctx: CanvasRenderingContext2D, el: Element,
  editingTextId: string | null, cursorPos: number, blinkVisible: boolean,
  editingTableId?: string | null, editingTableRow?: number, editingTableCol?: number, editingTableCursorPos?: number,
) {
  switch (el.type) {
    case 'text': return renderText(ctx, el as any, editingTextId, cursorPos, blinkVisible);
    case 'shape': return renderShape(ctx, el as any);
    case 'image': return renderImage(ctx, el as any);
    case 'table': return renderTable(ctx, el as any, editingTableId ?? null, editingTableRow ?? -1, editingTableCol ?? -1, editingTableCursorPos ?? 0, blinkVisible);
    case 'drawing': return renderDrawing(ctx, el as any);
  }
}

// ============================================================================
// TEXT with blinking cursor
// ============================================================================
function renderText(ctx: CanvasRenderingContext2D, el: any, editingTextId: string | null, cursorPos: number, blinkVisible: boolean) {
  const isEditing = editingTextId === el.id;

  ctx.fillStyle = el.color || '#000';
  const weight = el.fontWeight === 'bold' ? 'bold' : '';
  const style = el.fontStyle === 'italic' ? 'italic' : '';
  ctx.font = `${style} ${weight} ${el.fontSize || 14}px ${el.font || 'sans-serif'}`.trim();
  ctx.textBaseline = 'top';

  const content = el.content || '';
  const lines = wrapText(ctx, content, el.width);
  const lineHeight = (el.fontSize || 14) * (el.lineHeight || 1.2);

  // Text background when editing
  if (isEditing) {
    ctx.fillStyle = '#FFFFF8';
    ctx.fillRect(el.x - 1, el.y - 1, el.width + 2, el.height + 2);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1;
    ctx.strokeRect(el.x - 1, el.y - 1, el.width + 2, el.height + 2);
    ctx.fillStyle = el.color || '#000';
  }

  // Render text lines
  for (let i = 0; i < lines.length; i++) {
    let x = el.x;
    const lw = ctx.measureText(lines[i]).width;
    if (el.align === 'center') x = el.x + (el.width - lw) / 2;
    else if (el.align === 'right') x = el.x + el.width - lw;
    ctx.fillText(lines[i], x, el.y + i * lineHeight);

    // Decorations
    if (el.decoration === 'underline') {
      ctx.strokeStyle = el.color || '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, el.y + (i + 1) * lineHeight - 2);
      ctx.lineTo(x + lw, el.y + (i + 1) * lineHeight - 2);
      ctx.stroke();
    }
    if (el.decoration === 'strikethrough') {
      ctx.strokeStyle = el.color || '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const midY = el.y + i * lineHeight + lineHeight * 0.4;
      ctx.moveTo(x, midY);
      ctx.lineTo(x + lw, midY);
      ctx.stroke();
    }
  }

  // Blinking cursor
  if (isEditing && blinkVisible) {
    // Find cursor position in rendered text
    let charCount = 0;
    let cursorX = el.x;
    let cursorY = el.y;
    let found = false;

    for (let i = 0; i < lines.length && !found; i++) {
      const lineLen = lines[i].length;
      if (cursorPos <= charCount + lineLen || i === lines.length - 1) {
        const localPos = Math.max(0, cursorPos - charCount);
        const textBefore = lines[i].slice(0, Math.min(localPos, lineLen));
        const beforeWidth = ctx.measureText(textBefore).width;
        let lineX = el.x;
        const lw = ctx.measureText(lines[i]).width;
        if (el.align === 'center') lineX = el.x + (el.width - lw) / 2;
        else if (el.align === 'right') lineX = el.x + el.width - lw;
        cursorX = lineX + beforeWidth;
        cursorY = el.y + i * lineHeight;
        found = true;
      }
      charCount += lineLen;
      // Skip characters between lines
      while (charCount < content.length && charCount < cursorPos && (content[charCount] === ' ' || content[charCount] === '\n')) {
        charCount++;
      }
    }

    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cursorX, cursorY);
    ctx.lineTo(cursorX, cursorY + lineHeight);
    ctx.stroke();
  }

  // Placeholder for empty text in editing mode
  if (isEditing && !content) {
    ctx.fillStyle = '#999';
    ctx.fillText('Type here...', el.x, el.y);
  }
}

// ============================================================================
// SHAPES — ALL shape types with proper geometry
// ============================================================================
function drawShapePath(ctx: CanvasRenderingContext2D, el: any) {
  const { x, y, width: w, height: h } = el;
  ctx.beginPath();

  switch (el.shapeType) {
    case 'rect':
      ctx.rect(x, y, w, h);
      break;

    case 'roundedRect': {
      const r = Math.min(el.borderRadius || 12, w / 2, h / 2);
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      break;
    }

    case 'circle':
    case 'ellipse':
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;

    case 'triangle':
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;

    case 'diamond':
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      break;

    case 'pentagon':
      drawRegularPolygon(ctx, x, y, w, h, 5);
      break;

    case 'hexagon':
      drawRegularPolygon(ctx, x, y, w, h, 6);
      break;

    case 'polygon':
      drawRegularPolygon(ctx, x, y, w, h, el.polygonSides || 6);
      break;

    case 'star': {
      const cx2 = x + w / 2, cy2 = y + h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.4;
      const pts = 5;
      for (let i = 0; i < pts * 2; i++) {
        const angle = (i * Math.PI) / pts - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx2 + r * Math.cos(angle);
        const py = cy2 + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }

    case 'parallelogram': {
      const skew = w * 0.2;
      ctx.moveTo(x + skew, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w - skew, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    }

    case 'trapezoid': {
      const inset = w * 0.15;
      ctx.moveTo(x + inset, y);
      ctx.lineTo(x + w - inset, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    }

    case 'heart': {
      const cx2 = x + w / 2, topY = y + h * 0.3;
      ctx.moveTo(cx2, y + h);
      ctx.bezierCurveTo(x - w * 0.1, y + h * 0.55, x, y - h * 0.1, cx2, topY);
      ctx.moveTo(cx2, y + h);
      ctx.bezierCurveTo(x + w * 1.1, y + h * 0.55, x + w, y - h * 0.1, cx2, topY);
      break;
    }

    case 'cross': {
      const arm = Math.min(w, h) * 0.3;
      const cx2 = x + w / 2, cy2 = y + h / 2;
      ctx.moveTo(cx2 - arm / 2, y);
      ctx.lineTo(cx2 + arm / 2, y);
      ctx.lineTo(cx2 + arm / 2, cy2 - arm / 2);
      ctx.lineTo(x + w, cy2 - arm / 2);
      ctx.lineTo(x + w, cy2 + arm / 2);
      ctx.lineTo(cx2 + arm / 2, cy2 + arm / 2);
      ctx.lineTo(cx2 + arm / 2, y + h);
      ctx.lineTo(cx2 - arm / 2, y + h);
      ctx.lineTo(cx2 - arm / 2, cy2 + arm / 2);
      ctx.lineTo(x, cy2 + arm / 2);
      ctx.lineTo(x, cy2 - arm / 2);
      ctx.lineTo(cx2 - arm / 2, cy2 - arm / 2);
      ctx.closePath();
      break;
    }

    case 'rightArrow': {
      const shaftH = h * 0.4;
      const headW = w * 0.35;
      ctx.moveTo(x, y + h / 2 - shaftH / 2);
      ctx.lineTo(x + w - headW, y + h / 2 - shaftH / 2);
      ctx.lineTo(x + w - headW, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w - headW, y + h);
      ctx.lineTo(x + w - headW, y + h / 2 + shaftH / 2);
      ctx.lineTo(x, y + h / 2 + shaftH / 2);
      ctx.closePath();
      break;
    }

    case 'doubleArrow': {
      const shaftH2 = h * 0.35;
      const headW2 = w * 0.25;
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + headW2, y);
      ctx.lineTo(x + headW2, y + h / 2 - shaftH2 / 2);
      ctx.lineTo(x + w - headW2, y + h / 2 - shaftH2 / 2);
      ctx.lineTo(x + w - headW2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w - headW2, y + h);
      ctx.lineTo(x + w - headW2, y + h / 2 + shaftH2 / 2);
      ctx.lineTo(x + headW2, y + h / 2 + shaftH2 / 2);
      ctx.lineTo(x + headW2, y + h);
      ctx.closePath();
      break;
    }

    case 'callout': {
      const r2 = Math.min(8, w / 4, h / 4);
      const tailW = 20, tailH = h * 0.25;
      const bodyH = h - tailH;
      // Rounded rect body
      ctx.moveTo(x + r2, y);
      ctx.arcTo(x + w, y, x + w, y + bodyH, r2);
      ctx.arcTo(x + w, y + bodyH, x, y + bodyH, r2);
      // Tail
      ctx.lineTo(x + w * 0.4, y + bodyH);
      ctx.lineTo(x + w * 0.3, y + h);
      ctx.lineTo(x + w * 0.2, y + bodyH);
      ctx.arcTo(x, y + bodyH, x, y, r2);
      ctx.arcTo(x, y, x + w, y, r2);
      ctx.closePath();
      break;
    }

    case 'line':
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      break;

    case 'arrow':
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      ctx.moveTo(x + w, y + h / 2);
      ctx.lineTo(x + w - 12, y + h / 2 - 8);
      ctx.moveTo(x + w, y + h / 2);
      ctx.lineTo(x + w - 12, y + h / 2 + 8);
      break;

    default:
      ctx.rect(x, y, w, h);
  }
}

function drawRegularPolygon(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sides: number) {
  const cx = x + w / 2, cy = y + h / 2;
  const rx = w / 2, ry = h / 2;
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const px = cx + rx * Math.cos(angle);
    const py = cy + ry * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function renderShape(ctx: CanvasRenderingContext2D, el: any) {
  drawShapePath(ctx, el);

  if (el.fill?.type === 'solid' && el.fill.color) {
    ctx.fillStyle = el.fill.color;
    ctx.fill();
  }
  if (el.stroke?.style !== 'none' && el.stroke?.width > 0) {
    ctx.strokeStyle = el.stroke.color || '#000';
    ctx.lineWidth = el.stroke.width;
    if (el.stroke.style === 'dashed') ctx.setLineDash([6, 4]);
    else if (el.stroke.style === 'dotted') ctx.setLineDash([2, 3]);
    else ctx.setLineDash([]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ============================================================================
// IMAGE — with caching
// ============================================================================
function renderImage(ctx: CanvasRenderingContext2D, el: any) {
  if (!el.src) return;
  const img = getCachedImage(el.src);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, el.x, el.y, el.width, el.height);
  } else {
    // Loading placeholder
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(el.x, el.y, el.width, el.height);
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;
    ctx.strokeRect(el.x, el.y, el.width, el.height);
    ctx.fillStyle = '#AAA';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷 Loading...', el.x + el.width / 2, el.y + el.height / 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }
}

// ============================================================================
// TABLE
// ============================================================================
function renderTable(
  ctx: CanvasRenderingContext2D, el: any,
  editingTableId: string | null, editingRow: number, editingCol: number, editingCursorPos: number, blinkVisible: boolean,
) {
  const { columns, rows, borderColor } = el;
  if (!columns || !rows) return;

  const isEditingThisTable = editingTableId === el.id;
  const totalW = columns.reduce((s: number, c: any) => s + c.width, 0);
  const scaleX = el.width / totalW;
  const padding = 6;
  const lineH = 14;
  const minRowH = 30;

  // Use pre-calculated row heights from the element data
  // or calculate once if missing (fallback)
  const rowHeights: number[] = rows.map((row: any, ri: number) => {
    if (row.height !== undefined && row.height > 0) return row.height;
    
    // Fallback: calculate if height is missing
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
    return maxH;
  });

  const totalH = rowHeights.reduce((s, h) => s + h, 0);

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(el.x, el.y, el.width, totalH);

  let yy = el.y;
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const rh = rowHeights[ri];
    let xx = el.x;
    const font = ri === 0 ? 'bold 11px sans-serif' : '11px sans-serif';
    ctx.font = font;

    for (let ci = 0; ci < row.cells.length && ci < columns.length; ci++) {
      const cell = row.cells[ci];
      const cw = columns[ci].width * scaleX;
      const isEditingCell = isEditingThisTable && ri === editingRow && ci === editingCol;

      // Cell background
      if (isEditingCell) {
        ctx.fillStyle = '#FFFFF0';
        ctx.fillRect(xx, yy, cw, rh);
      } else if (cell.background) {
        ctx.fillStyle = cell.background;
        ctx.fillRect(xx, yy, cw, rh);
      }

      // Cell border
      if (isEditingCell) {
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = borderColor || '#D0D0D0';
        ctx.lineWidth = 0.5;
      }
      ctx.strokeRect(xx, yy, cw, rh);

      // Cell text (wrapped)
      const cellContent = cell.content || '';
      ctx.fillStyle = '#333';
      ctx.font = font;
      ctx.textBaseline = 'top';

      if (isEditingCell) {
        const lines = wrapText(ctx, cellContent, cw - padding * 2);
        const textX = xx + padding;
        let textY = yy + padding;
        for (const line of lines) {
          ctx.fillText(line, textX, textY, cw - padding * 2);
          textY += lineH;
        }

        // Blinking cursor
        if (blinkVisible) {
          // Find cursor position in wrapped lines
          let charsLeft = Math.min(editingCursorPos, cellContent.length);
          let cursorLineIdx = 0;
          let cursorLineOffset = 0;
          let consumed = 0;
          for (let li = 0; li < lines.length; li++) {
            const lineLen = lines[li].length;
            if (charsLeft <= consumed + lineLen || li === lines.length - 1) {
              cursorLineIdx = li;
              cursorLineOffset = Math.max(0, charsLeft - consumed);
              break;
            }
            consumed += lineLen;
            // Skip characters between wrapped lines (spaces, newlines)
            while (consumed < cellContent.length && consumed < charsLeft && (cellContent[consumed] === ' ' || cellContent[consumed] === '\n')) {
              consumed++;
            }
          }
          const beforeCursor = lines[cursorLineIdx]?.slice(0, cursorLineOffset) || '';
          const cursorX = xx + padding + ctx.measureText(beforeCursor).width;
          const cursorY = yy + padding + cursorLineIdx * lineH;
          ctx.strokeStyle = '#7c3aed';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cursorX, cursorY);
          ctx.lineTo(cursorX, cursorY + lineH);
          ctx.stroke();
        }

        // Placeholder
        if (!cellContent) {
          ctx.fillStyle = '#BBB';
          ctx.fillText('Type...', xx + padding, yy + padding);
        }
      } else if (cellContent) {
        const lines = wrapText(ctx, cellContent, cw - padding * 2);
        let textY = yy + padding;
        for (const line of lines) {
          ctx.fillText(line, xx + padding, textY, cw - padding * 2);
          textY += lineH;
        }
      }

      xx += cw;
    }
    yy += rh;
  }
}

// ============================================================================
// DRAWING
// ============================================================================
function renderDrawing(ctx: CanvasRenderingContext2D, el: any) {
  if (!el.paths) return;
  for (const path of el.paths) {
    if (path.points.length < 2) continue;
    ctx.save();
    ctx.strokeStyle = path.color || '#000';
    ctx.lineWidth = path.width || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (path.tool === 'marker') ctx.globalAlpha = 0.4;

    ctx.beginPath();
    ctx.moveTo(el.x + path.points[0].x, el.y + path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      // Smooth with quadratic curves for better quality
      if (i < path.points.length - 1) {
        const xc = (el.x + path.points[i].x + el.x + path.points[i + 1].x) / 2;
        const yc = (el.y + path.points[i].y + el.y + path.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(el.x + path.points[i].x, el.y + path.points[i].y, xc, yc);
      } else {
        ctx.lineTo(el.x + path.points[i].x, el.y + path.points[i].y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================================
// TEXT WRAP
// ============================================================================
// wrapText is imported from '@/store/table-utils'
