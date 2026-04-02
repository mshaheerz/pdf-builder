'use client';

import { useDocumentStore, generateId, type EditorTool, type ShapeType, type TextSpan } from '@/store/document-store';
import { useCallback, useState, useRef } from 'react';
import { exportPdfWasm } from '@/lib/pdf-export';
import { applyStyle, getPlainText, mergeAdjacentSpans, offsetToSpanPos, resolveSpanStyle } from '@/store/span-utils';

/** Prevent toolbar interactions from stealing focus away from canvas */
function preventFocusLoss(e: React.MouseEvent) {
  // Don't prevent default on selects/inputs — they need native interaction
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'SELECT' || tag === 'INPUT') return;
  e.preventDefault();
}

/** After a toolbar select/input change, blur it so keyboard events flow to the canvas again */
function blurAfterChange() {
  requestAnimationFrame(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
}

const tools: { id: EditorTool; icon: string; label: string }[] = [
  { id: 'select', icon: '↖', label: 'Select (V)' },
  { id: 'text', icon: 'T', label: 'Text — click page to place' },
  { id: 'shape', icon: '◻', label: 'Shape — drag on page to draw' },
  { id: 'table', icon: '⊞', label: 'Table — click page to place' },
  { id: 'image', icon: '🖼', label: 'Image — click to upload' },
  { id: 'pencil', icon: '✏️', label: 'Pencil (P) — freehand draw' },
  { id: 'marker', icon: '🖍️', label: 'Marker (M) — highlight' },
  { id: 'eraser', icon: '🧹', label: 'Eraser (E) — erase strokes' },
  { id: 'hand', icon: '🤚', label: 'Hand (H) — pan canvas' },
];

const shapeGroups: { label: string; shapes: { id: ShapeType; label: string; icon: string }[] }[] = [
  {
    label: 'Basic',
    shapes: [
      { id: 'rect', label: 'Rectangle', icon: '▬' },
      { id: 'roundedRect', label: 'Rounded Rectangle', icon: '▢' },
      { id: 'circle', label: 'Circle', icon: '●' },
      { id: 'ellipse', label: 'Ellipse', icon: '⬮' },
    ],
  },
  {
    label: 'Polygons',
    shapes: [
      { id: 'triangle', label: 'Triangle', icon: '△' },
      { id: 'diamond', label: 'Diamond', icon: '◇' },
      { id: 'pentagon', label: 'Pentagon', icon: '⬠' },
      { id: 'hexagon', label: 'Hexagon', icon: '⬡' },
      { id: 'star', label: 'Star', icon: '★' },
    ],
  },
  {
    label: 'Special',
    shapes: [
      { id: 'parallelogram', label: 'Parallelogram', icon: '▱' },
      { id: 'trapezoid', label: 'Trapezoid', icon: '⏢' },
      { id: 'heart', label: 'Heart', icon: '♥' },
      { id: 'cross', label: 'Cross', icon: '✚' },
      { id: 'callout', label: 'Callout', icon: '💬' },
      { id: 'octagon', label: 'Octagon', icon: '⯃' },
      { id: 'ring', label: 'Ring', icon: '◎' },
      { id: 'cloud', label: 'Cloud', icon: '☁' },
      { id: 'speechBubble', label: 'Speech Bubble', icon: '💭' },
      { id: 'chevron', label: 'Chevron', icon: '❯' },
      { id: 'banner', label: 'Banner', icon: '🏷' },
    ],
  },
  {
    label: 'Arrows',
    shapes: [
      { id: 'line', label: 'Line', icon: '─' },
      { id: 'arrow', label: 'Arrow', icon: '→' },
      { id: 'rightArrow', label: 'Block Arrow', icon: '➡' },
      { id: 'doubleArrow', label: 'Double Arrow', icon: '⇔' },
    ],
  },
];

const allShapes = shapeGroups.flatMap((g) => g.shapes);

const fonts = [
  'Helvetica', 'Arial', 'Times-Roman', 'Georgia', 'Courier',
  'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS',
];
const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96];

export function Toolbar() {
  const {
    activeTool, setActiveTool, activeShapeType, setActiveShapeType,
    currentColor, setCurrentColor, currentFillColor, setCurrentFillColor,
    currentFont, setCurrentFont, currentFontSize, setCurrentFontSize,
    brushSize, setBrushSize, zoom, setZoom,
    activePage, addElement, addPage, pages,
    undo, redo, pushHistory, exportToJson, getNextYPosition,
    editorMode, setEditorMode,
    selectedIds, updateElement,
    editingSelectionStart, editingSelectionEnd, editingCursorPos,
    pendingStyle, setPendingStyle,
  } = useDocumentStore();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShapePalette, setShowShapePalette] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState('');
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);

  const isTextEditorMode = editorMode === 'textEditor';

  // Get selected text element for text editor mode formatting
  const page = pages[activePage];
  const selectedEl = page?.elements.find((el) => selectedIds.includes(el.id));
  const bodyEl = isTextEditorMode ? page?.elements.find((el) => el.type === 'documentBody') : null;
  const selectedTextEl = isTextEditorMode ? (bodyEl as any) : (selectedEl?.type === 'text' ? selectedEl as any : null);

  const insertImageFromUrl = useCallback((url: string) => {
    if (!url.trim()) return;
    pushHistory();
    const nextY = getNextYPosition(activePage);
    addElement(activePage, {
      id: generateId(), type: 'image',
      x: 72, y: nextY, width: 300, height: 200,
      rotation: 0, opacity: 1, locked: false, visible: true, name: 'Image (URL)',
      src: url.trim(), fit: 'contain',
    } as any);
    setShowImageUrlInput(false);
    setImageUrlValue('');
  }, [activePage]);

  const handleInsertImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pushHistory();
        const nextY = getNextYPosition(activePage);
        addElement(activePage, {
          id: generateId(), type: 'image',
          x: 72, y: nextY, width: 300, height: 200,
          rotation: 0, opacity: 1, locked: false, visible: true, name: file.name,
          src: reader.result as string, fit: 'contain',
        } as any);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [activePage]);

  // EXPORT: JSON
  const handleExportJson = useCallback(() => {
    const json = exportToJson();
    downloadBlob(json, 'document.json', 'application/json');
    setShowExportMenu(false);
  }, [exportToJson]);

  // EXPORT: PDF (WASM — Rust engine)
  const handleExportPdfWasm = useCallback(async () => {
    setShowExportMenu(false);
    const json = exportToJson();
    try {
      const pdfBytes = await exportPdfWasm(json);
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF export failed. Check console for details.');
      console.error(err);
    }
  }, [exportToJson]);

  // EXPORT: PDF (server-side fallback via API route)
  const handleExportPdfServer = useCallback(async () => {
    setShowExportMenu(false);
    const json = exportToJson();
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF export failed. Check console for details.');
      console.error(err);
    }
  }, [exportToJson]);

  // LOAD JSON
  const handleLoadJson = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        useDocumentStore.getState().loadFromJson(reader.result as string);
      };
      reader.readAsText(file);
    };
    input.click();
    setShowExportMenu(false);
  }, []);

  const hasSelection = editingSelectionStart !== null && editingSelectionEnd !== null && editingSelectionStart !== editingSelectionEnd;
  const selMin = hasSelection ? Math.min(editingSelectionStart!, editingSelectionEnd!) : 0;
  const selMax = hasSelection ? Math.max(editingSelectionStart!, editingSelectionEnd!) : 0;

  // Get the style at the current cursor position (for toolbar display)
  const getStyleAtCursor = (): Partial<TextSpan> => {
    if (!bodyEl) return {};
    const body = bodyEl as any;
    const spans: TextSpan[] = body.spans || [{ text: body.content || '' }];
    if (spans.length === 0) return {};
    const pos = hasSelection ? selMin : editingCursorPos;
    const { spanIndex } = offsetToSpanPos(spans, Math.max(0, pos > 0 ? pos - 1 : 0));
    const span = spans[spanIndex];
    const defaults = { font: body.font, fontSize: body.fontSize, fontWeight: body.fontWeight, fontStyle: body.fontStyle, color: body.color, decoration: body.decoration };
    return resolveSpanStyle(span, defaults);
  };

  const cursorStyle = isTextEditorMode ? (pendingStyle || getStyleAtCursor()) : {};

  const updateSelectedText = (updates: any) => {
    if (!selectedTextEl) return;

    // For documentBody with spans
    if (isTextEditorMode && bodyEl) {
      const body = bodyEl as any;
      const spans: TextSpan[] = body.spans || [{ text: body.content || '' }];

      // Style properties that apply per-span
      const spanStyleKeys = ['font', 'fontSize', 'fontWeight', 'fontStyle', 'color', 'decoration'];
      const spanUpdates: Partial<TextSpan> = {};
      const elementUpdates: any = {};
      for (const [k, v] of Object.entries(updates)) {
        if (spanStyleKeys.includes(k)) {
          (spanUpdates as any)[k] = v;
        } else {
          elementUpdates[k] = v;
        }
      }

      // Element-level properties (align, lineHeight) always apply to whole element
      if (Object.keys(elementUpdates).length > 0) {
        updateElement(activePage, selectedTextEl.id, elementUpdates);
      }

      // Span-level style
      if (Object.keys(spanUpdates).length > 0) {
        if (hasSelection) {
          const newSpans = applyStyle(spans, selMin, selMax, spanUpdates);
          updateElement(activePage, selectedTextEl.id, { spans: newSpans, content: getPlainText(newSpans) } as any);
        } else {
          // No selection → set pending style for next typed char
          setPendingStyle({ ...pendingStyle, ...spanUpdates });
        }
      }
      return;
    }

    // Non-span elements
    updateElement(activePage, selectedTextEl.id, updates);
  };

  // ---- TEXT EDITOR MODE TOOLBAR ----
  if (isTextEditorMode) {
    return (
      <div className="bg-editor-surface border-b border-editor-border flex flex-col flex-shrink-0" onMouseDown={preventFocusLoss}>
        {/* Top row: mode toggle + font + export */}
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
          {/* Mode toggle */}
          <div className="flex rounded-md overflow-hidden border border-editor-border mr-1">
            <button
              onClick={() => setEditorMode('design')}
              className="px-3 py-1.5 text-xs bg-editor-bg text-editor-text hover:bg-editor-hover transition-all"
              title="Switch to Design mode"
            >
              Design
            </button>
            <button
              className="px-3 py-1.5 text-xs bg-editor-accent text-white transition-all cursor-default"
              title="Text Editor mode (active)"
            >
              Text Editor
            </button>
          </div>
          <div className="w-px h-6 bg-editor-border mx-1" />

          {/* Font */}
          <select value={cursorStyle.font || selectedTextEl?.font || currentFont} onChange={(e) => {
            setCurrentFont(e.target.value);
            updateSelectedText({ font: e.target.value });
            blurAfterChange();
          }}
            className="bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1 py-1 w-32"
            style={{ fontFamily: cursorStyle.font || selectedTextEl?.font || currentFont }}>
            {fonts.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
            ))}
          </select>

          {/* Font size */}
          <select value={cursorStyle.fontSize || selectedTextEl?.fontSize || currentFontSize} onChange={(e) => {
            const size = Number(e.target.value);
            setCurrentFontSize(size);
            updateSelectedText({ fontSize: size });
            blurAfterChange();
          }}
            className="bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1 py-1 w-14">
            {fontSizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className="w-px h-6 bg-editor-border mx-1" />

          {/* Bold / Italic / Underline / Strikethrough */}
          <button onClick={() => {
            const current = cursorStyle.fontWeight || selectedTextEl?.fontWeight;
            const v = current === 'bold' ? 'normal' : 'bold';
            updateSelectedText({ fontWeight: v });
          }}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-colors ${
              (cursorStyle.fontWeight || selectedTextEl?.fontWeight) === 'bold' ? 'bg-editor-accent text-white' : 'bg-editor-bg text-editor-text hover:bg-editor-hover'
            }`} title="Bold">B</button>

          <button onClick={() => {
            const current = cursorStyle.fontStyle || selectedTextEl?.fontStyle;
            const v = current === 'italic' ? 'normal' : 'italic';
            updateSelectedText({ fontStyle: v });
          }}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs italic transition-colors ${
              (cursorStyle.fontStyle || selectedTextEl?.fontStyle) === 'italic' ? 'bg-editor-accent text-white' : 'bg-editor-bg text-editor-text hover:bg-editor-hover'
            }`} title="Italic">I</button>

          <button onClick={() => {
            const current = cursorStyle.decoration || selectedTextEl?.decoration;
            const v = current === 'underline' ? 'none' : 'underline';
            updateSelectedText({ decoration: v });
          }}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs underline transition-colors ${
              (cursorStyle.decoration || selectedTextEl?.decoration) === 'underline' ? 'bg-editor-accent text-white' : 'bg-editor-bg text-editor-text hover:bg-editor-hover'
            }`} title="Underline">U</button>

          <button onClick={() => {
            const current = cursorStyle.decoration || selectedTextEl?.decoration;
            const v = current === 'strikethrough' ? 'none' : 'strikethrough';
            updateSelectedText({ decoration: v });
          }}
            className={`w-7 h-7 flex items-center justify-center rounded text-xs line-through transition-colors ${
              (cursorStyle.decoration || selectedTextEl?.decoration) === 'strikethrough' ? 'bg-editor-accent text-white' : 'bg-editor-bg text-editor-text hover:bg-editor-hover'
            }`} title="Strikethrough">S</button>

          <div className="w-px h-6 bg-editor-border mx-1" />

          {/* Alignment */}
          {(['left', 'center', 'right', 'justify'] as const).map((align) => (
            <button key={align} onClick={() => updateSelectedText({ align })}
              className={`w-7 h-7 flex items-center justify-center rounded text-[10px] transition-colors ${
                selectedTextEl?.align === align ? 'bg-editor-accent text-white' : 'bg-editor-bg text-editor-text hover:bg-editor-hover'
              }`} title={align.charAt(0).toUpperCase() + align.slice(1)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                {align === 'left' && <><rect x="0" y="1" width="12" height="1.5"/><rect x="0" y="4.5" width="8" height="1.5"/><rect x="0" y="8" width="10" height="1.5"/></>}
                {align === 'center' && <><rect x="0" y="1" width="12" height="1.5"/><rect x="2" y="4.5" width="8" height="1.5"/><rect x="1" y="8" width="10" height="1.5"/></>}
                {align === 'right' && <><rect x="0" y="1" width="12" height="1.5"/><rect x="4" y="4.5" width="8" height="1.5"/><rect x="2" y="8" width="10" height="1.5"/></>}
                {align === 'justify' && <><rect x="0" y="1" width="12" height="1.5"/><rect x="0" y="4.5" width="12" height="1.5"/><rect x="0" y="8" width="12" height="1.5"/></>}
              </svg>
            </button>
          ))}

          <div className="w-px h-6 bg-editor-border mx-1" />

          {/* Text color */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] text-gray-400">Color</span>
            <input type="color" value={cursorStyle.color || selectedTextEl?.color || currentColor} onChange={(e) => {
              setCurrentColor(e.target.value);
              updateSelectedText({ color: e.target.value });
              blurAfterChange();
            }}
              className="w-6 h-6 rounded cursor-pointer border border-editor-border" />
          </div>

          {/* Line Height */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] text-gray-400">LH</span>
            <select value={selectedTextEl?.lineHeight || 1.2} onChange={(e) => { updateSelectedText({ lineHeight: parseFloat(e.target.value) }); blurAfterChange(); }}
              className="bg-editor-bg text-editor-text text-[10px] border border-editor-border rounded px-1 py-0.5 w-12">
              {[1, 1.15, 1.2, 1.5, 1.75, 2, 2.5, 3].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-editor-border mx-1" />

          {/* Undo/Redo */}
          <button onClick={undo} className="px-2 py-1 text-xs rounded hover:bg-editor-hover" title="Undo (Ctrl+Z)">↩</button>
          <button onClick={redo} className="px-2 py-1 text-xs rounded hover:bg-editor-hover" title="Redo (Ctrl+Y)">↪</button>

          {/* Page */}
          <div className="flex items-center gap-1 border-l border-editor-border pl-2 ml-1">
            <span className="text-xs text-gray-400">{activePage + 1}/{pages.length}</span>
            <button onClick={addPage} className="px-1.5 py-0.5 text-xs rounded hover:bg-editor-hover">+Page</button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-0.5 border-l border-editor-border pl-2 ml-1">
            <button onClick={() => setZoom(zoom - 0.25)} className="w-6 h-6 text-xs rounded hover:bg-editor-hover flex items-center justify-center">-</button>
            <button onClick={() => setZoom(1)} className="text-xs px-1 hover:bg-editor-hover rounded" title="Reset zoom">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => setZoom(zoom + 0.25)} className="w-6 h-6 text-xs rounded hover:bg-editor-hover flex items-center justify-center">+</button>
          </div>

          {/* Export */}
          <div className="flex gap-0.5 ml-auto relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-1.5 text-xs bg-editor-accent text-white rounded-md hover:bg-purple-600 transition-all shadow-sm shadow-purple-500/20 font-medium"
            >
              Export
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-editor-surface border border-editor-border rounded-lg shadow-xl z-50 py-1 w-56">
                  <button onClick={handleExportPdfWasm} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
                    <span className="text-red-400">📄</span> Export as PDF (WASM)
                  </button>
                  <button onClick={handleExportPdfServer} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
                    <span className="text-blue-400">📄</span> Export as PDF (Server)
                  </button>
                  <div className="border-t border-editor-border my-1" />
                  <button onClick={handleExportJson} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
                    <span className="text-yellow-400">📋</span> Export as JSON
                  </button>
                  <button onClick={handleLoadJson} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
                    <span className="text-green-400">📂</span> Load JSON file
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- DESIGN MODE TOOLBAR (default) ----
  return (
    <div className="bg-editor-surface border-b border-editor-border flex items-center gap-1 px-2 py-1.5 flex-shrink-0 flex-wrap">
      {/* Mode toggle */}
      <div className="flex rounded-md overflow-hidden border border-editor-border mr-1">
        <button
          className="px-3 py-1.5 text-xs bg-editor-accent text-white transition-all cursor-default"
          title="Design mode (active)"
        >
          Design
        </button>
        <button
          onClick={() => setEditorMode('textEditor')}
          className="px-3 py-1.5 text-xs bg-editor-bg text-editor-text hover:bg-editor-hover transition-all"
          title="Switch to Text Editor mode"
        >
          Text Editor
        </button>
      </div>
      <div className="w-px h-6 bg-editor-border mr-1" />

      {/* Tool buttons */}
      <div className="flex gap-0.5 border-r border-editor-border pr-2 mr-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              if (tool.id === 'image') {
                setShowImageMenu(!showImageMenu);
                return;
              }
              setActiveTool(tool.id);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-all ${
              activeTool === tool.id
                ? 'bg-editor-accent text-white shadow-md shadow-purple-500/30'
                : 'hover:bg-editor-hover text-editor-text'
            }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Shape picker - visual grid palette */}
      {(activeTool === 'shape') && (
        <div className="relative border-r border-editor-border pr-2 mr-1">
          <button
            onClick={() => setShowShapePalette(!showShapePalette)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-bg border border-editor-border rounded hover:bg-editor-hover"
          >
            <span>{allShapes.find(s => s.id === activeShapeType)?.icon || '◻'}</span>
            <span className="text-[10px]">{allShapes.find(s => s.id === activeShapeType)?.label || 'Shape'}</span>
            <span className="text-[8px] text-gray-400">▾</span>
          </button>
          {showShapePalette && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowShapePalette(false)} />
              <div className="absolute left-0 top-full mt-1 bg-editor-surface border border-editor-border rounded-lg shadow-xl z-50 p-2 w-64">
                {shapeGroups.map((group) => (
                  <div key={group.label} className="mb-2">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1">{group.label}</div>
                    <div className="grid grid-cols-6 gap-0.5">
                      {group.shapes.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setActiveShapeType(s.id); setShowShapePalette(false); }}
                          className={`w-9 h-9 flex items-center justify-center rounded text-sm transition-all ${
                            activeShapeType === s.id
                              ? 'bg-editor-accent text-white shadow-md'
                              : 'bg-editor-bg text-editor-text hover:bg-editor-hover'
                          }`}
                          title={s.label}
                        >
                          {s.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Image menu (upload file or URL) — FIXED: absolute positioning relative to toolbar */}
      {showImageMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setShowImageMenu(false); setShowImageUrlInput(false); }} />
          <div className="fixed z-50" style={{ top: '40px', left: tools.findIndex(t => t.id === 'image') * 32 + 80 + 'px' }}>
            <div className="bg-editor-surface border border-editor-border rounded-lg shadow-xl py-1 w-52">
              <button onClick={() => { handleInsertImage(); setShowImageMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-editor-hover flex items-center gap-2">
                📁 Upload from File
              </button>
              <button onClick={() => setShowImageUrlInput(!showImageUrlInput)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-editor-hover flex items-center gap-2">
                🔗 Insert from URL
              </button>
              {showImageUrlInput && (
                <div className="px-3 py-1.5 space-y-1 border-t border-editor-border mt-1">
                  <input
                    type="text"
                    value={imageUrlValue}
                    onChange={(e) => setImageUrlValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { insertImageFromUrl(imageUrlValue); setShowImageMenu(false); } }}
                    placeholder="https://..."
                    className="w-full bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1.5 py-1 focus:border-editor-accent outline-none"
                    autoFocus
                  />
                  <button onClick={() => { insertImageFromUrl(imageUrlValue); setShowImageMenu(false); }}
                    className="w-full px-2 py-1 text-xs bg-editor-accent text-white rounded hover:bg-purple-600">
                    Insert
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Font */}
      <div className="flex items-center gap-1 border-r border-editor-border pr-2 mr-1">
        <select value={currentFont} onChange={(e) => setCurrentFont(e.target.value)}
          className="bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1 py-1 w-28"
          style={{ fontFamily: currentFont }}>
          {fonts.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
        <select value={currentFontSize} onChange={(e) => setCurrentFontSize(Number(e.target.value))}
          className="bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1 py-1 w-14">
          {fontSizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Colors */}
      <div className="flex items-center gap-1.5 border-r border-editor-border pr-2 mr-1">
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-gray-400">Stroke</span>
          <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border border-editor-border" title="Stroke color" />
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-[10px] text-gray-400">Fill</span>
          <input type="color" value={currentFillColor} onChange={(e) => setCurrentFillColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border border-editor-border" title="Fill color" />
        </div>
      </div>

      {/* Brush (drawing tools) */}
      {(activeTool === 'pencil' || activeTool === 'marker' || activeTool === 'eraser') && (
        <div className="flex items-center gap-1 border-r border-editor-border pr-2 mr-1">
          <span className="text-[10px] text-gray-400">Size</span>
          <input type="range" min="1" max="30" value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))} className="w-20 accent-purple-500" />
          <span className="text-xs w-5 text-center">{brushSize}</span>
        </div>
      )}

      {/* Zoom */}
      <div className="flex items-center gap-0.5 border-r border-editor-border pr-2 mr-1">
        <button onClick={() => setZoom(zoom - 0.25)} className="w-6 h-6 text-xs rounded hover:bg-editor-hover flex items-center justify-center">−</button>
        <button onClick={() => setZoom(1)} className="text-xs px-1 hover:bg-editor-hover rounded" title="Reset zoom">
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={() => setZoom(zoom + 0.25)} className="w-6 h-6 text-xs rounded hover:bg-editor-hover flex items-center justify-center">+</button>
      </div>

      {/* Undo/Redo */}
      <div className="flex gap-0.5 border-r border-editor-border pr-2 mr-1">
        <button onClick={undo} className="px-2 py-1 text-xs rounded hover:bg-editor-hover" title="Undo (Ctrl+Z)">↩</button>
        <button onClick={redo} className="px-2 py-1 text-xs rounded hover:bg-editor-hover" title="Redo (Ctrl+Y)">↪</button>
      </div>

      {/* Page */}
      <div className="flex items-center gap-1 border-r border-editor-border pr-2 mr-1">
        <span className="text-xs text-gray-400">{activePage + 1}/{pages.length}</span>
        <button onClick={addPage} className="px-1.5 py-0.5 text-xs rounded hover:bg-editor-hover">+Page</button>
      </div>

      {/* Export menu */}
      <div className="flex gap-0.5 ml-auto relative">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="px-4 py-1.5 text-xs bg-editor-accent text-white rounded-md hover:bg-purple-600 transition-all shadow-sm shadow-purple-500/20 font-medium"
        >
          Export ▾
        </button>
        {showExportMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
            <div className="absolute right-0 top-full mt-1 bg-editor-surface border border-editor-border rounded-lg shadow-xl z-50 py-1 w-56">
              <button onClick={handleExportPdfWasm} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
                <span className="text-red-400">📄</span> Export as PDF (WASM)
              </button>
              <button onClick={handleExportPdfServer} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
                <span className="text-blue-400">📄</span> Export as PDF (Server)
              </button>
              <div className="border-t border-editor-border my-1" />
              <button onClick={handleExportJson} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
                <span className="text-yellow-400">📋</span> Export as JSON
              </button>
              <button onClick={handleLoadJson} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
                <span className="text-green-400">📂</span> Load JSON file
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
