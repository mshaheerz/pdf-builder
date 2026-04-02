'use client';

import { useDocumentStore } from '@/store/document-store';
import {
  Type, Square, Image, Table2, Pencil, FileText,
  Eye, EyeOff, Lock, Unlock,
  ChevronUp, ChevronDown,
} from 'lucide-react';

const typeIcons: Record<string, any> = {
  text: Type,
  shape: Square,
  image: Image,
  table: Table2,
  drawing: Pencil,
  documentBody: FileText,
};

export function LeftPanel() {
  const { pages, activePage, setActivePage, addPage, removePage, selectedIds, setSelectedIds, editingTextId, editorMode, movePage } = useDocumentStore();
  const page = pages[activePage];

  // Filter out documentBody in text editor mode (it's the editing surface, not a layer)
  const visibleElements = page?.elements.filter((el) => {
    if (el.type === 'documentBody' && editorMode === 'textEditor') return false;
    return true;
  }) || [];

  return (
    <div className="w-52 bg-editor-surface border-r border-editor-border flex flex-col overflow-hidden flex-shrink-0">
      {/* Page Navigator */}
      <div className="border-b border-editor-border">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pages</span>
          <button onClick={addPage} className="text-[10px] text-editor-accent hover:text-purple-300 font-medium">+ Add</button>
        </div>
        <div className="max-h-36 overflow-y-auto px-1.5 pb-1.5 space-y-0.5">
          {pages.map((p, i) => (
            <div
              key={p.id}
              onClick={() => setActivePage(i)}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                i === activePage
                  ? 'bg-editor-accent/20 text-purple-300 border border-editor-accent/40'
                  : 'hover:bg-editor-hover text-editor-text border border-transparent'
              }`}
            >
              <span className="font-medium">Page {i + 1}</span>
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] opacity-50">{p.elements.length}</span>
                {i > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); movePage(i, i - 1); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-200" title="Move up">
                    <ChevronUp size={12} />
                  </button>
                )}
                {i < pages.length - 1 && (
                  <button onClick={(e) => { e.stopPropagation(); movePage(i, i + 1); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-200" title="Move down">
                    <ChevronDown size={12} />
                  </button>
                )}
                {pages.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removePage(i); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-[10px]"
                    title="Delete page"
                  >&times;</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Layer Tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Layers</span>
        </div>
        <div className="px-1.5 pb-2 space-y-0.5">
          {visibleElements.slice().reverse().map((el) => {
            const IconComponent = typeIcons[el.type] || FileText;
            return (
              <div
                key={el.id}
                onClick={() => {
                  setSelectedIds([el.id]);
                  if (editingTextId && editingTextId !== el.id) {
                    useDocumentStore.getState().setEditingTextId(null);
                  }
                }}
                className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                  selectedIds.includes(el.id)
                    ? 'bg-editor-accent/20 text-purple-300 border border-editor-accent/40'
                    : 'hover:bg-editor-hover text-editor-text border border-transparent'
                }`}
              >
                <IconComponent size={13} className="flex-shrink-0 opacity-70" />
                <span className="truncate flex-1 text-[11px]">{el.name || el.type}</span>
                <div className={`flex items-center gap-0.5 transition-opacity ${
                  !el.visible || el.locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      useDocumentStore.getState().updateElement(activePage, el.id, { visible: !el.visible });
                    }}
                    className={`w-5 h-5 flex items-center justify-center rounded ${!el.visible ? 'text-red-400' : 'text-blue-400'}`}
                    title={el.visible ? 'Hide' : 'Show'}
                  >
                    {el.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      useDocumentStore.getState().updateElement(activePage, el.id, { locked: !el.locked });
                    }}
                    className={`w-5 h-5 flex items-center justify-center rounded ${el.locked ? 'text-red-400' : 'text-gray-500'}`}
                    title={el.locked ? 'Unlock' : 'Lock'}
                  >
                    {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
          {visibleElements.length === 0 && (
            <div className="text-[11px] text-gray-500 px-3 py-6 text-center leading-relaxed">
              No elements yet.<br />
              <span className="text-gray-600">Click a tool in the toolbar,<br />then click on the page to place it.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
