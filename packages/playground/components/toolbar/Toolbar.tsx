'use client';

import { useDocumentStore, generateId, type EditorTool, type ShapeType, type TextSpan } from '@/store/document-store';
import { useCallback, useState } from 'react';
import { exportPdfWasm } from '@/lib/pdf-export';
import { applyStyle, getPlainText, offsetToSpanPos, resolveSpanStyle, getParagraphRange, insertText as spanInsertText } from '@/store/span-utils';
import {
  MousePointer2, Type, Square, Table2, ImageIcon, Pencil, Highlighter, Eraser, Hand,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Plus, Minus, ZoomIn,
  FileDown, FileUp, FileJson, FileText, FileCode2,
  Upload, Link2,
  ChevronDown,
  Braces,
} from 'lucide-react';

/** Prevent toolbar interactions from stealing focus away from canvas */
function preventFocusLoss(e: React.MouseEvent) {
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

const toolDefs: { id: EditorTool; Icon: any; label: string }[] = [
  { id: 'select', Icon: MousePointer2, label: 'Select (V)' },
  { id: 'text', Icon: Type, label: 'Text — click to place' },
  { id: 'shape', Icon: Square, label: 'Shape — drag to draw' },
  { id: 'table', Icon: Table2, label: 'Table — click to place' },
  { id: 'image', Icon: ImageIcon, label: 'Image — click to upload' },
  { id: 'pencil', Icon: Pencil, label: 'Pencil (P)' },
  { id: 'marker', Icon: Highlighter, label: 'Marker (M)' },
  { id: 'eraser', Icon: Eraser, label: 'Eraser (E)' },
  { id: 'hand', Icon: Hand, label: 'Hand (H) — pan' },
];

const shapeGroups: { label: string; shapes: { id: ShapeType; label: string; icon: string }[] }[] = [
  { label: 'Basic', shapes: [
    { id: 'rect', label: 'Rectangle', icon: '▬' },
    { id: 'roundedRect', label: 'Rounded Rect', icon: '▢' },
    { id: 'circle', label: 'Circle', icon: '●' },
    { id: 'ellipse', label: 'Ellipse', icon: '⬮' },
  ]},
  { label: 'Polygons', shapes: [
    { id: 'triangle', label: 'Triangle', icon: '△' },
    { id: 'diamond', label: 'Diamond', icon: '◇' },
    { id: 'pentagon', label: 'Pentagon', icon: '⬠' },
    { id: 'hexagon', label: 'Hexagon', icon: '⬡' },
    { id: 'star', label: 'Star', icon: '★' },
  ]},
  { label: 'Special', shapes: [
    { id: 'parallelogram', label: 'Parallelogram', icon: '▱' },
    { id: 'trapezoid', label: 'Trapezoid', icon: '⏢' },
    { id: 'heart', label: 'Heart', icon: '♥' },
    { id: 'cross', label: 'Cross', icon: '✚' },
    { id: 'callout', label: 'Callout', icon: '▤' },
    { id: 'octagon', label: 'Octagon', icon: '⯃' },
    { id: 'ring', label: 'Ring', icon: '◎' },
    { id: 'cloud', label: 'Cloud', icon: '☁' },
    { id: 'speechBubble', label: 'Speech Bubble', icon: '▨' },
    { id: 'chevron', label: 'Chevron', icon: '❯' },
    { id: 'banner', label: 'Banner', icon: '▧' },
  ]},
  { label: 'Arrows', shapes: [
    { id: 'line', label: 'Line', icon: '─' },
    { id: 'arrow', label: 'Arrow', icon: '→' },
    { id: 'rightArrow', label: 'Block Arrow', icon: '➡' },
    { id: 'doubleArrow', label: 'Double Arrow', icon: '⇔' },
  ]},
];

const allShapes = shapeGroups.flatMap((g) => g.shapes);

const fonts = [
  'Helvetica', 'Arial', 'Times-Roman', 'Georgia', 'Courier',
  'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS',
];
const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96];

// ============================================================================
// HTML Export
// ============================================================================
function exportToHtml(): string {
  const state = useDocumentStore.getState();
  const { pages } = state;
  let html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Document Export</title>\n<style>\n  body { margin: 0; font-family: sans-serif; background: #f0f0f0; }\n  .page { background: white; margin: 20px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.15); position: relative; overflow: hidden; }\n</style>\n</head>\n<body>\n`;

  for (const page of pages) {
    html += `<div class="page" style="width:${page.width}px;height:${page.height}px;background:${page.background}">\n`;
    for (const el of page.elements) {
      if (el.type === 'documentBody') {
        const body = el as any;
        const spans: TextSpan[] = body.spans || [{ text: body.content || '' }];
        const defaults = { font: body.font, fontSize: body.fontSize, fontWeight: body.fontWeight, fontStyle: body.fontStyle, color: body.color, decoration: body.decoration };
        html += `  <div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;font-family:${body.font};font-size:${body.fontSize}px;color:${body.color};line-height:${body.lineHeight};text-align:${body.align};white-space:pre-wrap">\n`;
        for (const span of spans) {
          const s = resolveSpanStyle(span, defaults);
          const styles: string[] = [];
          if (s.font !== defaults.font) styles.push(`font-family:${s.font}`);
          if (s.fontSize !== defaults.fontSize) styles.push(`font-size:${s.fontSize}px`);
          if (s.fontWeight !== defaults.fontWeight) styles.push(`font-weight:${s.fontWeight}`);
          if (s.fontStyle !== defaults.fontStyle) styles.push(`font-style:${s.fontStyle}`);
          if (s.color !== defaults.color) styles.push(`color:${s.color}`);
          if (s.decoration === 'underline') styles.push('text-decoration:underline');
          if (s.decoration === 'strikethrough') styles.push('text-decoration:line-through');
          const escaped = span.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          if (styles.length > 0) {
            html += `    <span style="${styles.join(';')}">${escaped}</span>`;
          } else {
            html += `    <span>${escaped}</span>`;
          }
        }
        html += `\n  </div>\n`;
      } else if (el.type === 'text') {
        const t = el as any;
        html += `  <div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;font-family:${t.font};font-size:${t.fontSize}px;color:${t.color};font-weight:${t.fontWeight};font-style:${t.fontStyle};line-height:${t.lineHeight};text-align:${t.align};white-space:pre-wrap">${(t.content || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>\n`;
      } else if (el.type === 'image') {
        const img = el as any;
        html += `  <img src="${img.src}" style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;object-fit:${img.fit}" />\n`;
      }
    }
    html += `</div>\n`;
  }
  html += `</body>\n</html>`;
  return html;
}

// ============================================================================
// Toolbar Component
// ============================================================================
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
  const [showVariableMenu, setShowVariableMenu] = useState(false);

  const isTextEditorMode = editorMode === 'textEditor';

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

  const handleExportJson = useCallback(() => {
    const json = exportToJson();
    downloadBlob(json, 'document.json', 'application/json');
    setShowExportMenu(false);
  }, [exportToJson]);

  const handleExportHtml = useCallback(() => {
    const html = exportToHtml();
    downloadBlob(html, 'document.html', 'text/html');
    setShowExportMenu(false);
  }, []);

  const handleExportPdfWasm = useCallback(async () => {
    setShowExportMenu(false);
    const json = exportToJson();
    try {
      const pdfBytes = await exportPdfWasm(json);
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'document.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF export failed. Check console for details.');
      console.error(err);
    }
  }, [exportToJson]);

  const handleExportPdfServer = useCallback(async () => {
    setShowExportMenu(false);
    const json = exportToJson();
    try {
      const res = await fetch('/api/export-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'document.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF export failed. Check console for details.');
      console.error(err);
    }
  }, [exportToJson]);

  const handleLoadJson = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { useDocumentStore.getState().loadFromJson(reader.result as string); };
      reader.readAsText(file);
    };
    input.click();
    setShowExportMenu(false);
  }, []);

  // ---- Rich text helpers ----
  const hasSelection = editingSelectionStart !== null && editingSelectionEnd !== null && editingSelectionStart !== editingSelectionEnd;
  const selMin = hasSelection ? Math.min(editingSelectionStart!, editingSelectionEnd!) : 0;
  const selMax = hasSelection ? Math.max(editingSelectionStart!, editingSelectionEnd!) : 0;

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
    if (isTextEditorMode && bodyEl) {
      const body = bodyEl as any;
      const spans: TextSpan[] = body.spans || [{ text: body.content || '' }];
      const spanStyleKeys = ['font', 'fontSize', 'fontWeight', 'fontStyle', 'color', 'decoration'];
      const spanUpdates: Partial<TextSpan> = {};
      const elementUpdates: any = {};
      for (const [k, v] of Object.entries(updates)) {
        if (spanStyleKeys.includes(k)) (spanUpdates as any)[k] = v;
        else elementUpdates[k] = v;
      }
      if (Object.keys(elementUpdates).length > 0) updateElement(activePage, selectedTextEl.id, elementUpdates);
      if (Object.keys(spanUpdates).length > 0) {
        if (hasSelection) {
          const newSpans = applyStyle(spans, selMin, selMax, spanUpdates);
          updateElement(activePage, selectedTextEl.id, { spans: newSpans, content: getPlainText(newSpans) } as any);
        } else {
          setPendingStyle({ ...pendingStyle, ...spanUpdates });
        }
      }
      return;
    }
    updateElement(activePage, selectedTextEl.id, updates);
  };

  const iconBtn = "w-7 h-7 flex items-center justify-center rounded transition-colors";
  const iconBtnActive = "bg-editor-accent text-white";
  const iconBtnNormal = "bg-editor-bg text-editor-text hover:bg-editor-hover";

  // ============================================================================
  // TEXT EDITOR MODE TOOLBAR
  // ============================================================================
  if (isTextEditorMode) {
    return (
      <div className="bg-editor-surface border-b border-editor-border flex flex-col flex-shrink-0" onMouseDown={preventFocusLoss}>
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
          {/* Mode toggle */}
          <div className="flex rounded-md overflow-hidden border border-editor-border mr-1">
            <button onClick={() => setEditorMode('design')} className="px-3 py-1.5 text-xs bg-editor-bg text-editor-text hover:bg-editor-hover transition-all" title="Switch to Design mode">Design</button>
            <button className="px-3 py-1.5 text-xs bg-editor-accent text-white transition-all cursor-default" title="Text Editor mode (active)">Text Editor</button>
          </div>
          <div className="w-px h-6 bg-editor-border mx-1" />

          {/* Font */}
          <select value={cursorStyle.font || selectedTextEl?.font || currentFont} onChange={(e) => { setCurrentFont(e.target.value); updateSelectedText({ font: e.target.value }); blurAfterChange(); }}
            className="bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1 py-1 w-32"
            style={{ fontFamily: cursorStyle.font || selectedTextEl?.font || currentFont }}>
            {fonts.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
          </select>

          {/* Font size */}
          <select value={cursorStyle.fontSize || selectedTextEl?.fontSize || currentFontSize} onChange={(e) => { const s = Number(e.target.value); setCurrentFontSize(s); updateSelectedText({ fontSize: s }); blurAfterChange(); }}
            className="bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1 py-1 w-14">
            {fontSizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="w-px h-6 bg-editor-border mx-1" />

          {/* Bold / Italic / Underline / Strikethrough */}
          <button onClick={() => { const v = (cursorStyle.fontWeight || selectedTextEl?.fontWeight) === 'bold' ? 'normal' : 'bold'; updateSelectedText({ fontWeight: v }); }}
            className={`${iconBtn} ${(cursorStyle.fontWeight || selectedTextEl?.fontWeight) === 'bold' ? iconBtnActive : iconBtnNormal}`} title="Bold">
            <Bold size={14} />
          </button>
          <button onClick={() => { const v = (cursorStyle.fontStyle || selectedTextEl?.fontStyle) === 'italic' ? 'normal' : 'italic'; updateSelectedText({ fontStyle: v }); }}
            className={`${iconBtn} ${(cursorStyle.fontStyle || selectedTextEl?.fontStyle) === 'italic' ? iconBtnActive : iconBtnNormal}`} title="Italic">
            <Italic size={14} />
          </button>
          <button onClick={() => { const v = (cursorStyle.decoration || selectedTextEl?.decoration) === 'underline' ? 'none' : 'underline'; updateSelectedText({ decoration: v }); }}
            className={`${iconBtn} ${(cursorStyle.decoration || selectedTextEl?.decoration) === 'underline' ? iconBtnActive : iconBtnNormal}`} title="Underline">
            <Underline size={14} />
          </button>
          <button onClick={() => { const v = (cursorStyle.decoration || selectedTextEl?.decoration) === 'strikethrough' ? 'none' : 'strikethrough'; updateSelectedText({ decoration: v }); }}
            className={`${iconBtn} ${(cursorStyle.decoration || selectedTextEl?.decoration) === 'strikethrough' ? iconBtnActive : iconBtnNormal}`} title="Strikethrough">
            <Strikethrough size={14} />
          </button>

          <div className="w-px h-6 bg-editor-border mx-1" />

          {/* Alignment */}
          {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight], ['justify', AlignJustify]] as const).map(([alignVal, Icon]) => {
            const currentAlign = (() => {
              if (isTextEditorMode && bodyEl) {
                // Get alignment from current paragraph's spans
                const spans: TextSpan[] = (bodyEl as any).spans || [{ text: (bodyEl as any).content || '' }];
                const plainText = getPlainText(spans);
                const pos = useDocumentStore.getState().editingCursorPos;
                const { start } = getParagraphRange(plainText, pos);
                const { spanIndex } = offsetToSpanPos(spans, start);
                return spans[spanIndex]?.align || selectedTextEl?.align || 'left';
              }
              return selectedTextEl?.align || 'left';
            })();
            return (
              <button key={alignVal} onClick={() => {
                if (isTextEditorMode && bodyEl) {
                  const body = bodyEl as any;
                  const spans: TextSpan[] = body.spans || [{ text: body.content || '' }];
                  const plainText = getPlainText(spans);
                  const store = useDocumentStore.getState();
                  const pos = store.editingCursorPos;
                  const selStart = store.editingSelectionStart;
                  const selEnd = store.editingSelectionEnd;
                  const hasSel = selStart !== null && selEnd !== null && selStart !== selEnd;
                  // Get paragraph range(s) to apply alignment to
                  let rangeStart: number, rangeEnd: number;
                  if (hasSel) {
                    const sMin = Math.min(selStart!, selEnd!);
                    const sMax = Math.max(selStart!, selEnd!);
                    rangeStart = getParagraphRange(plainText, sMin).start;
                    rangeEnd = getParagraphRange(plainText, sMax).end;
                  } else {
                    const para = getParagraphRange(plainText, pos);
                    rangeStart = para.start;
                    rangeEnd = para.end;
                  }
                  // Apply align to all spans in the paragraph range
                  const newSpans = applyStyle(spans, rangeStart, Math.max(rangeStart + 1, rangeEnd), { align: alignVal } as Partial<TextSpan>);
                  updateElement(activePage, selectedTextEl!.id, { spans: newSpans, content: getPlainText(newSpans) } as any);
                } else {
                  updateSelectedText({ align: alignVal });
                }
              }}
                className={`${iconBtn} ${currentAlign === alignVal ? iconBtnActive : iconBtnNormal}`} title={alignVal.charAt(0).toUpperCase() + alignVal.slice(1)}>
                <Icon size={14} />
              </button>
            );
          })}

          <div className="w-px h-6 bg-editor-border mx-1" />

          {/* Text color */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] text-gray-400">Color</span>
            <input type="color" value={cursorStyle.color || selectedTextEl?.color || currentColor} onChange={(e) => { setCurrentColor(e.target.value); updateSelectedText({ color: e.target.value }); blurAfterChange(); }}
              className="w-6 h-6 rounded cursor-pointer border border-editor-border" />
          </div>

          {/* Line Height */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] text-gray-400">LH</span>
            <select value={selectedTextEl?.lineHeight || 1.2} onChange={(e) => { updateSelectedText({ lineHeight: parseFloat(e.target.value) }); blurAfterChange(); }}
              className="bg-editor-bg text-editor-text text-[10px] border border-editor-border rounded px-1 py-0.5 w-12">
              {[1, 1.15, 1.2, 1.5, 1.75, 2, 2.5, 3].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Margins */}
          <div className="w-px h-6 bg-editor-border mx-1" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400">Margin</span>
            <input type="number" value={selectedTextEl?.marginLeft ?? 72} onChange={(e) => { updateSelectedText({ marginLeft: Number(e.target.value), x: Number(e.target.value), width: (page?.width || 595) - Number(e.target.value) - (selectedTextEl?.marginRight ?? 72) }); blurAfterChange(); }}
              className="bg-editor-bg text-editor-text text-[10px] border border-editor-border rounded px-1 py-0.5 w-10" title="Left margin" />
            <input type="number" value={selectedTextEl?.marginRight ?? 72} onChange={(e) => { updateSelectedText({ marginRight: Number(e.target.value), width: (page?.width || 595) - (selectedTextEl?.marginLeft ?? 72) - Number(e.target.value) }); blurAfterChange(); }}
              className="bg-editor-bg text-editor-text text-[10px] border border-editor-border rounded px-1 py-0.5 w-10" title="Right margin" />
            <input type="number" value={selectedTextEl?.marginTop ?? 72} onChange={(e) => { updateSelectedText({ marginTop: Number(e.target.value), y: Number(e.target.value) }); blurAfterChange(); }}
              className="bg-editor-bg text-editor-text text-[10px] border border-editor-border rounded px-1 py-0.5 w-10" title="Top margin" />
          </div>

          {/* Border */}
          <div className="w-px h-6 bg-editor-border mx-1" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400">Border</span>
            <input type="number" min="0" max="10" value={(selectedTextEl as any)?.border?.width ?? 0}
              onChange={(e) => { const w = Number(e.target.value); updateSelectedText({ border: { ...((selectedTextEl as any)?.border || { color: '#000000', style: 'solid', radius: 0 }), width: w } }); blurAfterChange(); }}
              className="bg-editor-bg text-editor-text text-[10px] border border-editor-border rounded px-1 py-0.5 w-10" title="Border width" />
            <input type="color" value={(selectedTextEl as any)?.border?.color || '#000000'}
              onChange={(e) => { updateSelectedText({ border: { ...((selectedTextEl as any)?.border || { width: 1, style: 'solid', radius: 0 }), color: e.target.value } }); blurAfterChange(); }}
              className="w-5 h-5 rounded cursor-pointer border border-editor-border" title="Border color" />
            <select value={(selectedTextEl as any)?.border?.style || 'none'}
              onChange={(e) => { updateSelectedText({ border: { ...((selectedTextEl as any)?.border || { width: 1, color: '#000000', radius: 0 }), style: e.target.value } }); blurAfterChange(); }}
              className="bg-editor-bg text-editor-text text-[10px] border border-editor-border rounded px-0.5 py-0.5 w-14">
              <option value="none">None</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
            <input type="number" min="0" max="20" value={(selectedTextEl as any)?.border?.radius ?? 0}
              onChange={(e) => { updateSelectedText({ border: { ...((selectedTextEl as any)?.border || { width: 1, color: '#000000', style: 'solid' }), radius: Number(e.target.value) } }); blurAfterChange(); }}
              className="bg-editor-bg text-editor-text text-[10px] border border-editor-border rounded px-1 py-0.5 w-10" title="Border radius" />
          </div>

          {/* Insert Variable */}
          <div className="w-px h-6 bg-editor-border mx-1" />
          <div className="relative">
            <button onClick={() => setShowVariableMenu(!showVariableMenu)} className={`${iconBtn} ${iconBtnNormal}`} title="Insert Variable">
              <Braces size={14} />
            </button>
            {showVariableMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowVariableMenu(false)} />
                <div className="absolute left-0 top-full mt-1 bg-editor-surface border border-editor-border rounded-lg shadow-xl z-50 py-1 w-40">
                  {['{{pageNumber}}', '{{totalPages}}', '{{date}}', '{{time}}'].map((v) => (
                    <button key={v} onClick={() => {
                      if (bodyEl) {
                        const body = bodyEl as any;
                        const spans = body.spans || [{ text: body.content || '' }];
                        const store = useDocumentStore.getState();
                        const pos = store.editingCursorPos;
                        const newSpans = spanInsertText(spans, pos, v, store.pendingStyle);
                        updateElement(activePage, body.id, { spans: newSpans, content: getPlainText(newSpans) } as any);
                        useDocumentStore.getState().setEditingCursorPos(pos + v.length);
                      }
                      setShowVariableMenu(false);
                    }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-editor-hover font-mono">{v}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-editor-border mx-1" />

          {/* Undo/Redo */}
          <button onClick={undo} className={`${iconBtn} ${iconBtnNormal}`} title="Undo (Ctrl+Z)"><Undo2 size={14} /></button>
          <button onClick={redo} className={`${iconBtn} ${iconBtnNormal}`} title="Redo (Ctrl+Y)"><Redo2 size={14} /></button>

          {/* Page */}
          <div className="flex items-center gap-1 border-l border-editor-border pl-2 ml-1">
            <span className="text-xs text-gray-400">{activePage + 1}/{pages.length}</span>
            <button onClick={addPage} className="px-1.5 py-0.5 text-xs rounded hover:bg-editor-hover flex items-center gap-0.5"><Plus size={12} /> Page</button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-0.5 border-l border-editor-border pl-2 ml-1">
            <button onClick={() => setZoom(zoom - 0.25)} className={`${iconBtn} ${iconBtnNormal}`}><Minus size={14} /></button>
            <button onClick={() => setZoom(1)} className="text-xs px-1 hover:bg-editor-hover rounded" title="Reset zoom">{Math.round(zoom * 100)}%</button>
            <button onClick={() => setZoom(zoom + 0.25)} className={`${iconBtn} ${iconBtnNormal}`}><Plus size={14} /></button>
          </div>

          {/* Export */}
          <ExportMenu showExportMenu={showExportMenu} setShowExportMenu={setShowExportMenu}
            handleExportPdfWasm={handleExportPdfWasm} handleExportPdfServer={handleExportPdfServer}
            handleExportJson={handleExportJson} handleExportHtml={handleExportHtml} handleLoadJson={handleLoadJson} />
        </div>
      </div>
    );
  }

  // ============================================================================
  // DESIGN MODE TOOLBAR
  // ============================================================================
  return (
    <div className="bg-editor-surface border-b border-editor-border flex items-center gap-1 px-2 py-1.5 flex-shrink-0 flex-wrap">
      {/* Mode toggle */}
      <div className="flex rounded-md overflow-hidden border border-editor-border mr-1">
        <button className="px-3 py-1.5 text-xs bg-editor-accent text-white transition-all cursor-default" title="Design mode (active)">Design</button>
        <button onClick={() => setEditorMode('textEditor')} className="px-3 py-1.5 text-xs bg-editor-bg text-editor-text hover:bg-editor-hover transition-all" title="Switch to Text Editor mode">Text Editor</button>
      </div>
      <div className="w-px h-6 bg-editor-border mr-1" />

      {/* Tool buttons */}
      <div className="flex gap-0.5 border-r border-editor-border pr-2 mr-1">
        {toolDefs.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              if (tool.id === 'image') { setShowImageMenu(!showImageMenu); return; }
              setActiveTool(tool.id);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded transition-all ${
              activeTool === tool.id ? 'bg-editor-accent text-white shadow-md shadow-purple-500/30' : 'hover:bg-editor-hover text-editor-text'
            }`}
            title={tool.label}
          >
            <tool.Icon size={16} />
          </button>
        ))}
      </div>

      {/* Shape picker */}
      {activeTool === 'shape' && (
        <div className="relative border-r border-editor-border pr-2 mr-1">
          <button onClick={() => setShowShapePalette(!showShapePalette)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-editor-bg border border-editor-border rounded hover:bg-editor-hover">
            <span>{allShapes.find(s => s.id === activeShapeType)?.icon || '◻'}</span>
            <span className="text-[10px]">{allShapes.find(s => s.id === activeShapeType)?.label || 'Shape'}</span>
            <ChevronDown size={10} className="text-gray-400" />
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
                        <button key={s.id} onClick={() => { setActiveShapeType(s.id); setShowShapePalette(false); }}
                          className={`w-9 h-9 flex items-center justify-center rounded text-sm transition-all ${
                            activeShapeType === s.id ? 'bg-editor-accent text-white shadow-md' : 'bg-editor-bg text-editor-text hover:bg-editor-hover'
                          }`} title={s.label}>
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

      {/* Image menu */}
      {showImageMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setShowImageMenu(false); setShowImageUrlInput(false); }} />
          <div className="fixed z-50" style={{ top: '40px', left: toolDefs.findIndex(t => t.id === 'image') * 32 + 80 + 'px' }}>
            <div className="bg-editor-surface border border-editor-border rounded-lg shadow-xl py-1 w-52">
              <button onClick={() => { handleInsertImage(); setShowImageMenu(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-editor-hover flex items-center gap-2">
                <Upload size={13} /> Upload from File
              </button>
              <button onClick={() => setShowImageUrlInput(!showImageUrlInput)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-editor-hover flex items-center gap-2">
                <Link2 size={13} /> Insert from URL
              </button>
              {showImageUrlInput && (
                <div className="px-3 py-1.5 space-y-1 border-t border-editor-border mt-1">
                  <input type="text" value={imageUrlValue} onChange={(e) => setImageUrlValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { insertImageFromUrl(imageUrlValue); setShowImageMenu(false); } }}
                    placeholder="https://..." className="w-full bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1.5 py-1 focus:border-editor-accent outline-none" autoFocus />
                  <button onClick={() => { insertImageFromUrl(imageUrlValue); setShowImageMenu(false); }}
                    className="w-full px-2 py-1 text-xs bg-editor-accent text-white rounded hover:bg-purple-600">Insert</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Font */}
      <div className="flex items-center gap-1 border-r border-editor-border pr-2 mr-1">
        <select value={currentFont} onChange={(e) => setCurrentFont(e.target.value)}
          className="bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1 py-1 w-28" style={{ fontFamily: currentFont }}>
          {fonts.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <select value={currentFontSize} onChange={(e) => setCurrentFontSize(Number(e.target.value))}
          className="bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1 py-1 w-14">
          {fontSizes.map((s) => <option key={s} value={s}>{s}</option>)}
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

      {/* Brush */}
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
        <button onClick={() => setZoom(zoom - 0.25)} className={`${iconBtn} ${iconBtnNormal}`}><Minus size={14} /></button>
        <button onClick={() => setZoom(1)} className="text-xs px-1 hover:bg-editor-hover rounded" title="Reset zoom">{Math.round(zoom * 100)}%</button>
        <button onClick={() => setZoom(zoom + 0.25)} className={`${iconBtn} ${iconBtnNormal}`}><Plus size={14} /></button>
      </div>

      {/* Undo/Redo */}
      <div className="flex gap-0.5 border-r border-editor-border pr-2 mr-1">
        <button onClick={undo} className={`${iconBtn} ${iconBtnNormal}`} title="Undo (Ctrl+Z)"><Undo2 size={14} /></button>
        <button onClick={redo} className={`${iconBtn} ${iconBtnNormal}`} title="Redo (Ctrl+Y)"><Redo2 size={14} /></button>
      </div>

      {/* Page */}
      <div className="flex items-center gap-1 border-r border-editor-border pr-2 mr-1">
        <span className="text-xs text-gray-400">{activePage + 1}/{pages.length}</span>
        <button onClick={addPage} className="px-1.5 py-0.5 text-xs rounded hover:bg-editor-hover flex items-center gap-0.5"><Plus size={12} /> Page</button>
      </div>

      {/* Export */}
      <ExportMenu showExportMenu={showExportMenu} setShowExportMenu={setShowExportMenu}
        handleExportPdfWasm={handleExportPdfWasm} handleExportPdfServer={handleExportPdfServer}
        handleExportJson={handleExportJson} handleExportHtml={handleExportHtml} handleLoadJson={handleLoadJson} />
    </div>
  );
}

// ============================================================================
// Export Menu (shared between modes)
// ============================================================================
function ExportMenu({ showExportMenu, setShowExportMenu, handleExportPdfWasm, handleExportPdfServer, handleExportJson, handleExportHtml, handleLoadJson }: {
  showExportMenu: boolean; setShowExportMenu: (v: boolean) => void;
  handleExportPdfWasm: () => void; handleExportPdfServer: () => void;
  handleExportJson: () => void; handleExportHtml: () => void; handleLoadJson: () => void;
}) {
  return (
    <div className="flex gap-0.5 ml-auto relative">
      <button onClick={() => setShowExportMenu(!showExportMenu)}
        className="px-4 py-1.5 text-xs bg-editor-accent text-white rounded-md hover:bg-purple-600 transition-all shadow-sm shadow-purple-500/20 font-medium flex items-center gap-1">
        <FileDown size={13} /> Export <ChevronDown size={10} />
      </button>
      {showExportMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
          <div className="absolute right-0 top-full mt-1 bg-editor-surface border border-editor-border rounded-lg shadow-xl z-50 py-1 w-56">
            <button onClick={handleExportPdfWasm} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
              <FileText size={13} className="text-red-400" /> Export as PDF (WASM)
            </button>
            <button onClick={handleExportPdfServer} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
              <FileText size={13} className="text-blue-400" /> Export as PDF (Server)
            </button>
            <div className="border-t border-editor-border my-1" />
            <button onClick={handleExportHtml} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
              <FileCode2 size={13} className="text-orange-400" /> Export as HTML
            </button>
            <button onClick={handleExportJson} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
              <FileJson size={13} className="text-yellow-400" /> Export as JSON
            </button>
            <button onClick={handleLoadJson} className="w-full text-left px-4 py-2 text-xs hover:bg-editor-hover flex items-center gap-2">
              <FileUp size={13} className="text-green-400" /> Load JSON file
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
