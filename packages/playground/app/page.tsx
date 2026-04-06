'use client';

import dynamic from 'next/dynamic';
import { Canvas } from '@/components/editor/Canvas';
import { LeftPanel } from '@/components/panels/LeftPanel';
import { RightPanel } from '@/components/panels/RightPanel';

// Load Toolbar dynamically to avoid SSR issues with WASM
const Toolbar = dynamic(() => import('@/components/toolbar/Toolbar').then(m => m.Toolbar), {
  ssr: false,
  loading: () => <div className="h-12 bg-editor-surface border-b border-editor-border animate-pulse" />
});

export default function EditorPage() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <Canvas />
        <RightPanel />
      </div>
    </div>
  );
}
