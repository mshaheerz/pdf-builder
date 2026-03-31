'use client';

import { useDocumentStore, generateId, type EditorTool, type ShapeType, type TextElement, type ShapeElement, type TableElement } from '@/store/document-store';
import { useCallback, useState } from 'react';

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
  } = useDocumentStore();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShapePalette, setShowShapePalette] = useState(false);

  // Insert text at next available position
  const insertText = useCallback(() => {
    pushHistory();
    const nextY = getNextYPosition(activePage);
    const el: TextElement = {
      id: generateId(), type: 'text',
      x: 72, y: nextY, width: 400, height: 40,
      rotation: 0, opacity: 1, locked: false, visible: true, name: 'Text',
      content: 'Double click to edit this text',
      font: currentFont, fontSize: currentFontSize,
      fontWeight: 'normal', fontStyle: 'normal',
      color: currentColor, align: 'left', lineHeight: 1.2, decoration: 'none',
    };
    addElement(activePage, el);
    useDocumentStore.getState().setEditingTextId(el.id);
    useDocumentStore.getState().setEditingCursorPos(el.content.length);
  }, [activePage, currentFont, currentFontSize, currentColor]);

  const insertShape = useCallback(() => {
    pushHistory();
    const nextY = getNextYPosition(activePage);
    const el: ShapeElement = {
      id: generateId(), type: 'shape',
      x: 72, y: nextY, width: 120, height: 120,
      rotation: 0, opacity: 1, locked: false, visible: true, name: activeShapeType,
      shapeType: activeShapeType,
      fill: { type: 'solid', color: currentFillColor },
      stroke: { width: 2, color: currentColor, style: 'solid' },
      borderRadius: activeShapeType === 'roundedRect' ? 12 : 0,
    };
    addElement(activePage, el);
  }, [activePage, activeShapeType, currentFillColor, currentColor]);

  const insertTable = useCallback(() => {
    pushHistory();
    const nextY = getNextYPosition(activePage);
    addElement(activePage, {
      id: generateId(), type: 'table',
      x: 72, y: nextY, width: 450, height: 120,
      rotation: 0, opacity: 1, locked: false, visible: true, name: 'Table',
      columns: [{ width: 112 }, { width: 112 }, { width: 112 }, { width: 112 }],
      rows: [
        { height: 30, cells: [{ content: 'Header 1', background: '#E8E8FF' }, { content: 'Header 2', background: '#E8E8FF' }, { content: 'Header 3', background: '#E8E8FF' }, { content: 'Header 4', background: '#E8E8FF' }] },
        { height: 30, cells: [{ content: '' }, { content: '' }, { content: '' }, { content: '' }] },
        { height: 30, cells: [{ content: '' }, { content: '' }, { content: '' }, { content: '' }] },
      ],
      borderColor: '#C0C0C0',
    } as any);
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

  // EXPORT: PDF (client-side)
  const handleExportPdfClient = useCallback(async () => {
    setShowExportMenu(false);
    const json = exportToJson();
    // Use the server API route to generate PDF
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

  // EXPORT: PDF (server-side)
  const handleExportPdfServer = handleExportPdfClient; // same endpoint, different label

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

  return (
    <div className="bg-editor-surface border-b border-editor-border flex items-center gap-1 px-2 py-1.5 flex-shrink-0 flex-wrap">
      {/* Tool buttons */}
      <div className="flex gap-0.5 border-r border-editor-border pr-2 mr-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              if (tool.id === 'image') {
                handleInsertImage();
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

      {/* Quick insert */}
      <div className="flex gap-0.5 border-r border-editor-border pr-2 mr-1">
        <button onClick={insertTable} className="px-2 py-1 text-xs rounded hover:bg-editor-hover transition-colors" title="Insert table at next position">+ Table</button>
      </div>

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
              <button onClick={handleExportPdfClient} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
                <span className="text-red-400">📄</span> Export as PDF (Client)
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
