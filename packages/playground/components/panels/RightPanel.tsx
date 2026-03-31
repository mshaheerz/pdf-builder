'use client';

import { useDocumentStore, type Element } from '@/store/document-store';

export function RightPanel() {
  const { pages, activePage, selectedIds, updateElement } = useDocumentStore();
  const page = pages[activePage];
  const selectedEl = page?.elements.find((el) => selectedIds.includes(el.id));

  const update = (updates: Partial<Element>) => {
    if (selectedEl) updateElement(activePage, selectedEl.id, updates);
  };

  return (
    <div className="w-56 bg-editor-surface border-l border-editor-border flex flex-col overflow-y-auto flex-shrink-0">
      <div className="px-3 py-2 border-b border-editor-border">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          {selectedEl ? `${selectedEl.type.toUpperCase()} Properties` : 'Properties'}
        </span>
      </div>

      {!selectedEl ? (
        <div className="p-3">
          <p className="text-[11px] text-gray-500 mb-4">Select an element to edit its properties.</p>
          {page && (
            <>
              <SectionTitle>Page Settings</SectionTitle>
              <div className="grid grid-cols-2 gap-1">
                <PropRow label="Width">
                  <NumberInput value={page.width} onChange={(v) => {
                    const pages = [...useDocumentStore.getState().pages];
                    pages[activePage] = { ...pages[activePage], width: v };
                    useDocumentStore.setState({ pages });
                  }} />
                </PropRow>
                <PropRow label="Height">
                  <NumberInput value={page.height} onChange={(v) => {
                    const pages = [...useDocumentStore.getState().pages];
                    pages[activePage] = { ...pages[activePage], height: v };
                    useDocumentStore.setState({ pages });
                  }} />
                </PropRow>
              </div>
              <PropRow label="Background">
                <ColorInput value={page.background} onChange={(v) => {
                  const pages = [...useDocumentStore.getState().pages];
                  pages[activePage] = { ...pages[activePage], background: v };
                  useDocumentStore.setState({ pages });
                }} />
              </PropRow>

              <SectionTitle>Page Presets</SectionTitle>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { label: 'A4', w: 595, h: 842 },
                  { label: 'A3', w: 842, h: 1191 },
                  { label: 'Letter', w: 612, h: 792 },
                  { label: 'Legal', w: 612, h: 1008 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const pages = [...useDocumentStore.getState().pages];
                      pages[activePage] = { ...pages[activePage], width: preset.w, height: preset.h };
                      useDocumentStore.setState({ pages });
                    }}
                    className={`px-2 py-1 text-[10px] rounded border ${
                      page.width === preset.w && page.height === preset.h
                        ? 'bg-editor-accent/20 border-editor-accent/40 text-purple-300'
                        : 'bg-editor-bg border-editor-border text-editor-text hover:bg-editor-hover'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="p-3 space-y-2">
          {/* Position & Size */}
          <SectionTitle>Position & Size</SectionTitle>
          <div className="grid grid-cols-2 gap-1">
            <PropRow label="X"><NumberInput value={selectedEl.x} onChange={(v) => update({ x: v })} /></PropRow>
            <PropRow label="Y"><NumberInput value={selectedEl.y} onChange={(v) => update({ y: v })} /></PropRow>
            <PropRow label="W"><NumberInput value={selectedEl.width} onChange={(v) => update({ width: v })} /></PropRow>
            <PropRow label="H"><NumberInput value={selectedEl.height} onChange={(v) => update({ height: v })} /></PropRow>
          </div>
          <PropRow label="Rotation">
            <div className="flex items-center gap-1">
              <input type="range" min="-180" max="180" value={selectedEl.rotation}
                onChange={(e) => update({ rotation: parseFloat(e.target.value) })}
                className="flex-1" />
              <span className="text-[10px] w-8 text-right">{selectedEl.rotation}°</span>
            </div>
          </PropRow>
          <PropRow label="Opacity">
            <div className="flex items-center gap-1">
              <input type="range" min="0" max="1" step="0.05" value={selectedEl.opacity}
                onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
                className="flex-1" />
              <span className="text-[10px] w-8 text-right">{Math.round(selectedEl.opacity * 100)}%</span>
            </div>
          </PropRow>

          {/* TEXT */}
          {selectedEl.type === 'text' && <TextProperties el={selectedEl as any} update={update} />}

          {/* SHAPE */}
          {selectedEl.type === 'shape' && <ShapeProperties el={selectedEl as any} update={update} />}

          {/* IMAGE */}
          {selectedEl.type === 'image' && <ImageProperties el={selectedEl as any} update={update} />}

          {/* DRAWING */}
          {selectedEl.type === 'drawing' && <DrawingProperties el={selectedEl as any} />}

          {/* TABLE */}
          {selectedEl.type === 'table' && <TableProperties el={selectedEl as any} update={update} />}

          {/* Actions */}
          <SectionTitle>Actions</SectionTitle>
          <div className="grid grid-cols-2 gap-1">
            <button onClick={() => {
              useDocumentStore.getState().pushHistory();
              useDocumentStore.getState().removeElement(activePage, selectedEl.id);
            }} className="px-2 py-1.5 text-[10px] bg-red-500/15 text-red-400 rounded hover:bg-red-500/30 transition-colors">
              🗑 Delete
            </button>
            <button onClick={() => {
              const clone = { ...JSON.parse(JSON.stringify(selectedEl)), id: Date.now().toString(), x: selectedEl.x + 15, y: selectedEl.y + 15 };
              useDocumentStore.getState().pushHistory();
              useDocumentStore.getState().addElement(activePage, clone);
            }} className="px-2 py-1.5 text-[10px] bg-editor-bg text-editor-text rounded hover:bg-editor-hover transition-colors">
              📋 Duplicate
            </button>
            <button onClick={() => update({ locked: !selectedEl.locked })}
              className="px-2 py-1.5 text-[10px] bg-editor-bg text-editor-text rounded hover:bg-editor-hover transition-colors">
              {selectedEl.locked ? '🔓 Unlock' : '🔒 Lock'}
            </button>
            <button onClick={() => update({ visible: !selectedEl.visible })}
              className="px-2 py-1.5 text-[10px] bg-editor-bg text-editor-text rounded hover:bg-editor-hover transition-colors">
              {selectedEl.visible ? '🚫 Hide' : '👁 Show'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Property sections
// ============================================================================

function TextProperties({ el, update }: { el: any; update: (u: any) => void }) {
  return (
    <>
      <SectionTitle>Text</SectionTitle>
      <textarea
        value={el.content}
        onChange={(e) => update({ content: e.target.value })}
        className="w-full bg-editor-bg text-editor-text text-xs border border-editor-border rounded p-2 resize-y min-h-[50px] focus:border-editor-accent outline-none"
        placeholder="Type text content..."
      />
      <PropRow label="Font">
        <select value={el.font} onChange={(e) => update({ font: e.target.value })}
          className="w-full bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1.5 py-1 focus:border-editor-accent outline-none"
          style={{ fontFamily: el.font }}>
          {['Helvetica', 'Arial', 'Times-Roman', 'Georgia', 'Courier', 'Verdana', 'Impact'].map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </PropRow>
      <PropRow label="Size">
        <NumberInput value={el.fontSize} onChange={(v) => update({ fontSize: v })} />
      </PropRow>
      <PropRow label="Color">
        <ColorInput value={el.color} onChange={(v) => update({ color: v })} />
      </PropRow>
      <PropRow label="Align">
        <ButtonGroup
          options={[
            { value: 'left', label: '☰' },
            { value: 'center', label: '☰' },
            { value: 'right', label: '☰' },
            { value: 'justify', label: '☰' },
          ]}
          value={el.align}
          onChange={(v) => update({ align: v })}
        />
      </PropRow>
      <PropRow label="Style">
        <div className="flex gap-1">
          <ToggleButton active={el.fontWeight === 'bold'} onClick={() => update({ fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' })} label="B" bold />
          <ToggleButton active={el.fontStyle === 'italic'} onClick={() => update({ fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' })} label="I" italic />
          <ToggleButton active={el.decoration === 'underline'} onClick={() => update({ decoration: el.decoration === 'underline' ? 'none' : 'underline' })} label="U" underline />
          <ToggleButton active={el.decoration === 'strikethrough'} onClick={() => update({ decoration: el.decoration === 'strikethrough' ? 'none' : 'strikethrough' })} label="S" strike />
        </div>
      </PropRow>
      <PropRow label="Line H.">
        <NumberInput value={el.lineHeight} onChange={(v) => update({ lineHeight: v })} step={0.1} />
      </PropRow>
    </>
  );
}

function ShapeProperties({ el, update }: { el: any; update: (u: any) => void }) {
  return (
    <>
      <SectionTitle>Shape</SectionTitle>
      <PropRow label="Fill">
        <ColorInput value={el.fill?.color || '#FFFFFF'} onChange={(v) => update({ fill: { type: 'solid', color: v } })} />
      </PropRow>
      <PropRow label="Stroke">
        <ColorInput value={el.stroke?.color || '#000000'} onChange={(v) => update({ stroke: { ...el.stroke, color: v } })} />
      </PropRow>
      <PropRow label="Stroke W">
        <NumberInput value={el.stroke?.width || 1} onChange={(v) => update({ stroke: { ...el.stroke, width: v } })} step={0.5} />
      </PropRow>
      <PropRow label="Radius">
        <NumberInput value={el.borderRadius || 0} onChange={(v) => update({ borderRadius: v })} />
      </PropRow>
      <PropRow label="Dash">
        <select value={el.stroke?.style || 'solid'} onChange={(e) => update({ stroke: { ...el.stroke, style: e.target.value } })}
          className="w-full bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1.5 py-1">
          <option value="solid">━ Solid</option>
          <option value="dashed">╌ Dashed</option>
          <option value="dotted">┄ Dotted</option>
          <option value="none">None</option>
        </select>
      </PropRow>
    </>
  );
}

function ImageProperties({ el, update }: { el: any; update: (u: any) => void }) {
  return (
    <>
      <SectionTitle>Image</SectionTitle>
      <PropRow label="Fit">
        <select value={el.fit || 'contain'} onChange={(e) => update({ fit: e.target.value })}
          className="w-full bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1.5 py-1">
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="fill">Fill</option>
        </select>
      </PropRow>
      <button onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => update({ src: reader.result as string });
          reader.readAsDataURL(file);
        };
        input.click();
      }} className="w-full px-2 py-1.5 text-[10px] bg-editor-bg text-editor-text rounded hover:bg-editor-hover transition-colors">
        🔄 Replace Image
      </button>
    </>
  );
}

function DrawingProperties({ el }: { el: any }) {
  return (
    <>
      <SectionTitle>Drawing</SectionTitle>
      <div className="text-[10px] text-gray-400 space-y-1">
        <div>Paths: {el.paths?.length || 0}</div>
        <div>Points: {el.paths?.reduce((a: number, p: any) => a + (p.points?.length || 0), 0) || 0}</div>
      </div>
    </>
  );
}

function TableProperties({ el, update }: { el: any; update: (u: any) => void }) {
  return (
    <>
      <SectionTitle>Table</SectionTitle>
      <PropRow label="Cols">{el.columns?.length || 0}</PropRow>
      <PropRow label="Rows">{el.rows?.length || 0}</PropRow>
      <PropRow label="Border">
        <ColorInput value={el.borderColor || '#C0C0C0'} onChange={(v) => update({ borderColor: v })} />
      </PropRow>
      <div className="flex gap-1">
        <button onClick={() => {
          const newRows = [...(el.rows || [])];
          const cols = el.columns?.length || 4;
          newRows.push({ height: 30, cells: Array.from({ length: cols }, () => ({ content: '' })) });
          update({ rows: newRows, height: el.height + 30 });
        }} className="flex-1 px-2 py-1 text-[10px] bg-editor-bg text-editor-text rounded hover:bg-editor-hover">
          + Row
        </button>
        <button onClick={() => {
          const newCols = [...(el.columns || [])];
          newCols.push({ width: 100 });
          const newRows = (el.rows || []).map((r: any) => ({
            ...r,
            cells: [...r.cells, { content: '' }],
          }));
          update({ columns: newCols, rows: newRows, width: el.width + 100 });
        }} className="flex-1 px-2 py-1 text-[10px] bg-editor-bg text-editor-text rounded hover:bg-editor-hover">
          + Col
        </button>
      </div>
    </>
  );
}

// ============================================================================
// Reusable components
// ============================================================================

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-3 mb-1 pb-0.5 border-b border-editor-border/50">{children}</h3>;
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[10px] text-gray-400 w-12 flex-shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number"
      value={Math.round(value * 100) / 100}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      step={step}
      className="w-full bg-editor-bg text-editor-text text-xs border border-editor-border rounded px-1.5 py-0.5 focus:border-editor-accent outline-none"
    />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="w-6 h-6 flex-shrink-0" />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-editor-bg text-editor-text text-[10px] border border-editor-border rounded px-1.5 py-0.5 font-mono focus:border-editor-accent outline-none"
        placeholder="#000000"
      />
    </div>
  );
}

function ButtonGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-1 py-0.5 text-[10px] rounded transition-colors ${
            value === opt.value ? 'bg-editor-accent text-white' : 'bg-editor-bg text-editor-text hover:bg-editor-hover'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToggleButton({ active, onClick, label, bold, italic, underline, strike }: {
  active: boolean; onClick: () => void; label: string;
  bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
        active ? 'bg-editor-accent text-white' : 'bg-editor-bg text-editor-text hover:bg-editor-hover'
      }`}
      style={{
        fontWeight: bold ? 'bold' : undefined,
        fontStyle: italic ? 'italic' : undefined,
        textDecoration: underline ? 'underline' : strike ? 'line-through' : undefined,
      }}
    >
      {label}
    </button>
  );
}
