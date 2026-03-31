# PDF Builder - Complete Architecture

## Overview

A from-scratch PDF builder with zero external PDF libraries. Custom binary PDF generation engine in Rust (compiled to WASM for browser, native for Node.js server). Rich WYSIWYG editor built with Next.js + HTML5 Canvas. Full-featured document editor with all professional tools.

---

## Project Structure

```
pdf-builder/
├── ARCHITECTURE.md
├── packages/
│   ├── core/                    # Rust - PDF binary engine (WASM + native)
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── lib.rs           # Main entry, WASM bindings
│   │   │   ├── pdf/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── document.rs      # PDF document structure
│   │   │   │   ├── objects.rs       # PDF objects (dict, array, stream, ref)
│   │   │   │   ├── writer.rs        # Binary PDF writer (header, xref, trailer)
│   │   │   │   ├── page.rs          # Page tree, page objects, media box
│   │   │   │   ├── content_stream.rs # Graphics operators, text operators
│   │   │   │   ├── color.rs         # Color spaces (RGB, CMYK, HSL, hex)
│   │   │   │   ├── graphics_state.rs # Line width, dash, blend, opacity
│   │   │   │   └── cross_ref.rs     # Cross-reference table builder
│   │   │   ├── font/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── parser.rs        # TrueType/OpenType font parser
│   │   │   │   ├── subset.rs        # Font subsetting (embed only used glyphs)
│   │   │   │   ├── cmap.rs          # Character-to-glyph mapping
│   │   │   │   ├── metrics.rs       # Glyph widths, kerning, ascent/descent
│   │   │   │   ├── embedded.rs      # Font embedding into PDF streams
│   │   │   │   └── builtin.rs       # 14 standard PDF fonts
│   │   │   ├── image/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── decoder.rs       # PNG, JPEG, WebP decode
│   │   │   │   ├── encoder.rs       # DCT, Flate compression for PDF
│   │   │   │   └── color_space.rs   # RGB, CMYK, Grayscale conversion
│   │   │   ├── geometry/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── path.rs          # Bézier curves, lines, arcs
│   │   │   │   ├── transform.rs     # Affine transforms (translate, rotate, scale)
│   │   │   │   ├── shapes.rs        # Rect, circle, ellipse, polygon, star
│   │   │   │   └── clip.rs          # Clipping paths
│   │   │   ├── text/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── layout.rs        # Text layout engine (line break, wrap)
│   │   │   │   ├── paragraph.rs     # Paragraph styling, spacing
│   │   │   │   ├── rich_text.rs     # Inline styled spans (bold, italic, color)
│   │   │   │   └── shaping.rs       # Basic text shaping, bidi support
│   │   │   ├── table/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── layout.rs        # Table cell layout, column/row sizing
│   │   │   │   ├── cell.rs          # Cell content, merge, split, padding
│   │   │   │   ├── border.rs        # Cell borders, styles, colors
│   │   │   │   └── render.rs        # Table to PDF content stream
│   │   │   ├── drawing/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── pencil.rs        # Freehand drawing (point smoothing)
│   │   │   │   ├── marker.rs        # Highlighter/marker with opacity
│   │   │   │   ├── eraser.rs        # Erase paths
│   │   │   │   └── brush.rs         # Brush settings (size, softness)
│   │   │   ├── layout/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── page_break.rs    # Page break detection, forced breaks
│   │   │   │   ├── flow.rs          # Content flow across pages
│   │   │   │   ├── position.rs      # Absolute/relative positioning
│   │   │   │   └── align.rs         # Horizontal, vertical, distribute alignment
│   │   │   ├── pattern/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── fill.rs          # Solid, gradient (linear/radial), pattern fills
│   │   │   │   ├── gradient.rs      # Gradient stops, direction, type
│   │   │   │   └── tiling.rs        # Tiling patterns
│   │   │   ├── compression/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── deflate.rs       # Flate/Deflate compression
│   │   │   │   └── ascii85.rs       # ASCII85 encoding
│   │   │   └── utils/
│   │   │       ├── mod.rs
│   │   │       ├── color_convert.rs # Hex↔RGB↔CMYK↔HSL
│   │   │       └── units.rs         # pt, mm, in, px conversion
│   │   └── tests/
│   │
│   ├── wasm/                    # WASM build wrapper
│   │   ├── Cargo.toml
│   │   ├── src/lib.rs           # wasm-bindgen exports
│   │   └── pkg/                 # Built WASM output
│   │
│   ├── node-binding/            # Native Node.js binding (napi-rs)
│   │   ├── Cargo.toml
│   │   ├── src/lib.rs           # napi-rs exports for server-side
│   │   └── package.json
│   │
│   ├── sdk/                     # TypeScript SDK (wraps WASM + native)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── document.ts         # PDFDocument class
│   │   │   ├── page.ts             # Page API
│   │   │   ├── elements/
│   │   │   │   ├── text.ts          # Text element
│   │   │   │   ├── image.ts         # Image element (inline, block, float)
│   │   │   │   ├── table.ts         # Table element
│   │   │   │   ├── shape.ts         # Shape element (rect, circle, etc.)
│   │   │   │   ├── drawing.ts       # Freehand drawing element
│   │   │   │   └── group.ts         # Group of elements
│   │   │   ├── style/
│   │   │   │   ├── color.ts         # Color (hex, rgb, cmyk, hsl, named)
│   │   │   │   ├── font.ts          # Font descriptor
│   │   │   │   ├── border.ts        # Border style
│   │   │   │   ├── fill.ts          # Fill (solid, gradient, pattern)
│   │   │   │   └── text-style.ts    # Font size, weight, alignment, spacing
│   │   │   ├── font-manager.ts      # Load, register, subset fonts
│   │   │   ├── image-loader.ts      # Load images from URL, File, Buffer
│   │   │   ├── export/
│   │   │   │   ├── client.ts        # Client-side PDF export (WASM)
│   │   │   │   └── server.ts        # Server-side PDF export (native)
│   │   │   └── types.ts             # All TypeScript types/interfaces
│   │   └── tests/
│   │
│   └── playground/              # Next.js WYSIWYG Editor
│       ├── package.json
│       ├── next.config.js
│       ├── tsconfig.json
│       ├── public/
│       │   └── fonts/               # Default bundled fonts
│       │       ├── roboto/
│       │       ├── open-sans/
│       │       ├── lato/
│       │       ├── montserrat/
│       │       ├── source-code-pro/
│       │       ├── noto-sans/       # Multi-language support
│       │       └── noto-serif/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx             # Main editor page
│       │   ├── api/
│       │   │   ├── export-pdf/
│       │   │   │   └── route.ts     # Server-side PDF export endpoint
│       │   │   └── fonts/
│       │   │       └── route.ts     # Font listing/upload endpoint
│       │   └── globals.css
│       ├── components/
│       │   ├── editor/
│       │   │   ├── Editor.tsx           # Main editor orchestrator
│       │   │   ├── Canvas.tsx           # HTML5 Canvas document renderer
│       │   │   ├── PageView.tsx         # Single page canvas
│       │   │   ├── MultiPageView.tsx    # Scrollable multi-page view
│       │   │   ├── SelectionManager.tsx # Element selection, multi-select
│       │   │   ├── DragDropManager.tsx  # Drag and drop handler
│       │   │   ├── SnapGuides.tsx       # Alignment snap guides
│       │   │   └── ZoomControls.tsx     # Zoom in/out/fit
│       │   ├── toolbar/
│       │   │   ├── Toolbar.tsx          # Top toolbar
│       │   │   ├── TextTools.tsx        # Font family, size, bold, italic, underline
│       │   │   ├── ShapeTools.tsx       # Rectangle, circle, line, arrow, polygon
│       │   │   ├── DrawingTools.tsx     # Pencil, marker, eraser, brush size
│       │   │   ├── ColorPicker.tsx      # Full color picker (hex, rgb, cmyk, hsl, eyedropper)
│       │   │   ├── FillTools.tsx        # Solid, gradient, pattern fills
│       │   │   ├── AlignTools.tsx       # Left, center, right, top, middle, bottom, distribute
│       │   │   ├── TableTools.tsx       # Insert table, add row/col, merge, split
│       │   │   ├── ImageTools.tsx       # Insert image, crop, resize, opacity
│       │   │   ├── PageTools.tsx        # Page size, orientation, margins, page break
│       │   │   └── ExportTools.tsx      # Export PDF (client/server), settings
│       │   ├── panels/
│       │   │   ├── LeftPanel.tsx         # Layer tree / page navigator
│       │   │   ├── RightPanel.tsx        # Properties inspector
│       │   │   ├── FontPanel.tsx         # Font browser, import custom fonts
│       │   │   ├── ColorPanel.tsx        # Color swatches, recent colors, palettes
│       │   │   ├── LayerPanel.tsx        # Z-order, visibility, lock, group
│       │   │   ├── PagePanel.tsx         # Page list, reorder, duplicate, delete
│       │   │   └── PropertyInspector.tsx # Dynamic props for selected element
│       │   ├── table/
│       │   │   ├── TableEditor.tsx       # Inline table editor on canvas
│       │   │   ├── CellEditor.tsx        # Cell text editing
│       │   │   ├── TableResizer.tsx      # Drag column/row borders
│       │   │   └── TableContextMenu.tsx  # Right-click menu for table ops
│       │   ├── text/
│       │   │   ├── InlineTextEditor.tsx  # Rich text editing on canvas
│       │   │   └── TextFormatBar.tsx     # Floating format bar near selection
│       │   ├── drawing/
│       │   │   ├── DrawingCanvas.tsx     # Overlay canvas for freehand
│       │   │   └── BrushPreview.tsx      # Brush cursor preview
│       │   └── common/
│       │       ├── ColorInput.tsx        # Hex input + picker toggle
│       │       ├── NumberInput.tsx       # Numeric with units (pt, mm, in)
│       │       ├── Dropdown.tsx
│       │       ├── Slider.tsx
│       │       ├── Tooltip.tsx
│       │       └── Modal.tsx
│       ├── hooks/
│       │   ├── useEditor.ts         # Main editor state
│       │   ├── useCanvas.ts         # Canvas rendering loop
│       │   ├── useSelection.ts      # Selection state
│       │   ├── useDragDrop.ts       # Drag and drop
│       │   ├── useHistory.ts        # Undo/redo
│       │   ├── useKeyboard.ts       # Keyboard shortcuts
│       │   ├── useClipboard.ts      # Copy/paste
│       │   └── useFonts.ts          # Font loading/management
│       ├── store/
│       │   ├── document-store.ts    # Zustand store - document model
│       │   ├── editor-store.ts      # Zustand store - editor UI state
│       │   ├── font-store.ts        # Zustand store - loaded fonts
│       │   └── history-store.ts     # Zustand store - undo/redo stack
│       ├── lib/
│       │   ├── canvas-renderer.ts   # Render document model to canvas
│       │   ├── hit-test.ts          # Click/hover element detection
│       │   ├── snap.ts              # Snap to grid/guides/elements
│       │   ├── serializer.ts        # Document JSON serialization
│       │   ├── default-fonts.ts     # Default font definitions
│       │   └── wasm-loader.ts       # Load WASM module
│       └── types/
│           ├── document.ts          # Document model types
│           ├── elements.ts          # All element types
│           ├── style.ts             # Style types
│           └── editor.ts            # Editor state types
│
├── Cargo.toml                   # Workspace root
├── package.json                 # Monorepo root (pnpm workspaces)
├── pnpm-workspace.yaml
├── turbo.json                   # Turborepo config
└── .gitignore
```

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYGROUND (Next.js)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Toolbar  │ │ Canvas   │ │ Panels   │ │ Table Editor  │  │
│  │ Tools    │ │ Renderer │ │ Props    │ │ Text Editor   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬────────┘  │
│       └─────────────┴────────────┴──────────────┘            │
│                          │                                    │
│                    Document Model                             │
│                    (Zustand Store)                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                      SDK (TypeScript)                         │
│  ┌───────────┐ ┌──────────────┐ ┌────────────────────────┐  │
│  │ Elements  │ │ Font Manager │ │ Export (client/server) │  │
│  │ API       │ │              │ │                        │  │
│  └─────┬─────┘ └──────┬───────┘ └───────────┬────────────┘  │
│        └───────────────┴─────────────────────┘               │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
    ┌──────┴──────┐                ┌───────┴───────┐
    │  WASM       │                │  Node Native  │
    │  (Browser)  │                │  (napi-rs)    │
    └──────┬──────┘                └───────┬───────┘
           │                               │
    ┌──────┴───────────────────────────────┴──────┐
    │              CORE (Rust)                      │
    │  ┌─────┐ ┌──────┐ ┌───────┐ ┌───────────┐  │
    │  │ PDF │ │ Font │ │ Image │ │ Geometry  │  │
    │  │ Gen │ │ Parse│ │ Codec │ │ + Drawing │  │
    │  └─────┘ └──────┘ └───────┘ └───────────┘  │
    │  ┌──────┐ ┌───────┐ ┌────────┐ ┌────────┐  │
    │  │Table │ │ Text  │ │Pattern │ │Compress│  │
    │  │Layout│ │Layout │ │+ Fill  │ │        │  │
    │  └──────┘ └───────┘ └────────┘ └────────┘  │
    └─────────────────────────────────────────────┘
```

---

## Core Engine (Rust) - Detailed Design

### PDF Binary Format (from scratch)

The core generates valid PDF 1.7 binary:

```
%PDF-1.7
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
          /Contents 4 0 R /Resources << ... >> >> endobj
4 0 obj << /Length ... /Filter /FlateDecode >>
stream ... endstream endobj
...
xref
0 N
trailer << /Root 1 0 R /Size N >>
startxref
OFFSET
%%EOF
```

### Key Modules

#### 1. PDF Objects & Writer
- `PdfObject` enum: Null, Boolean, Integer, Real, String, Name, Array, Dictionary, Stream, Reference
- Object numbering and reference tracking
- Cross-reference table generation
- Incremental writing for memory efficiency
- Flate compression for all streams

#### 2. Font System
- **TrueType/OpenType parser**: Read .ttf/.otf files, extract tables (head, hhea, hmtx, cmap, glyf, loca, name, post, OS/2, kern, GPOS)
- **Font subsetting**: Only embed glyphs actually used → small PDF files
- **CMap generation**: ToUnicode CMap for text extraction/search in PDF
- **Metrics**: Glyph widths, kerning pairs, line metrics
- **Built-in fonts**: 14 standard PDF fonts (Helvetica, Times, Courier, etc.)
- **Multi-language**: Unicode support, CJK via Noto fonts

#### 3. Image Handling
- **JPEG**: Pass-through (already DCT compressed for PDF)
- **PNG**: Decode → re-encode as Flate stream with PDF image XObject
- **WebP**: Decode → Flate
- **Color space**: RGB, Grayscale, CMYK conversion
- **Alpha channel**: Separate SMask for transparency

#### 4. Geometry & Drawing
- **Paths**: moveTo, lineTo, curveTo (cubic Bézier), arc, closePath
- **Shapes**: Rectangle, rounded rect, circle, ellipse, polygon, star, arrow, line
- **Transforms**: Translate, rotate, scale, skew (CTM manipulation)
- **Clipping**: Clip to any path
- **Drawing tools**: Pencil (polyline smoothing → Bézier), marker (wide semi-transparent stroke), eraser

#### 5. Text Layout
- **Line breaking**: Knuth-Plass or greedy algorithm
- **Rich text**: Multiple fonts/sizes/colors in single paragraph
- **Alignment**: Left, center, right, justify
- **Spacing**: Line height, letter spacing, word spacing, paragraph spacing
- **Vertical align**: Top, middle, bottom (within text frames)
- **Text in shapes**: Text wrapping inside arbitrary paths
- **Bidi**: Basic RTL support for Arabic/Hebrew

#### 6. Table Engine
- **Auto-layout**: Column widths based on content or fixed
- **Manual sizing**: Drag to resize columns/rows
- **Cell merge**: Colspan + rowspan
- **Cell split**: Split merged cells back
- **Cell content**: Rich text, images, nested tables
- **Borders**: Per-cell border style, width, color
- **Cell padding**: Per-side padding
- **Background**: Cell fill color/gradient
- **Page break**: Table continuation across pages with repeated headers

#### 7. Page Layout
- **Page sizes**: A0-A6, Letter, Legal, Tabloid, custom
- **Orientation**: Portrait, landscape
- **Margins**: Per-side margins
- **Page breaks**: Auto (content overflow) + manual (forced)
- **Content flow**: Elements flow across pages
- **Headers/footers**: Repeated content per page
- **Page numbering**: Auto page numbers

#### 8. Colors & Patterns
- **Color formats**: Hex (#FF0000), RGB(255,0,0), CMYK(0,1,1,0), HSL(0,100%,50%)
- **Named colors**: Full CSS named color set
- **Gradients**: Linear gradient (angle, stops), Radial gradient (center, radius, stops)
- **Patterns**: Tiling patterns (dots, stripes, checkerboard, custom)
- **Opacity**: Per-element opacity, blend modes

---

## SDK (TypeScript) - API Design

```typescript
import { PDFDocument, Page, TextElement, Table, Color } from '@pdf-builder/sdk';

// Create document
const doc = new PDFDocument({
  defaultFont: 'Roboto',
  defaultFontSize: 12,
});

// Register custom font
await doc.fonts.register('/path/to/CustomFont.ttf', 'CustomFont');

// Add page
const page = doc.addPage({ size: 'A4', orientation: 'portrait', margins: { top: 72, right: 72, bottom: 72, left: 72 } });

// Add text
page.addText('Hello World', {
  x: 100, y: 100, width: 400,
  font: 'CustomFont', fontSize: 24,
  color: Color.hex('#333333'),
  align: 'center',
  bold: true,
});

// Add rich text
page.addRichText([
  { text: 'Bold ', bold: true, color: Color.hex('#FF0000') },
  { text: 'and italic', italic: true, font: 'Roboto' },
], { x: 100, y: 200, width: 400 });

// Add image
const img = await doc.images.load('/path/to/image.png');
page.addImage(img, { x: 100, y: 300, width: 200, height: 150, opacity: 0.8 });

// Add table
const table = page.addTable({
  x: 50, y: 400, width: 500,
  columns: [{ width: '30%' }, { width: '40%' }, { width: '30%' }],
  rows: [
    {
      cells: [
        { text: 'Name', bold: true, background: Color.hex('#E0E0E0') },
        { text: 'Description', bold: true, background: Color.hex('#E0E0E0') },
        { text: 'Price', bold: true, background: Color.hex('#E0E0E0') },
      ],
    },
    {
      cells: [
        { text: 'Item 1' },
        { text: 'A great product', color: Color.hex('#666') },
        { text: '$29.99', align: 'right' },
      ],
    },
  ],
  border: { width: 0.5, color: Color.hex('#CCCCCC') },
  cellPadding: 8,
});

// Add shape with gradient fill
page.addShape('roundedRect', {
  x: 300, y: 100, width: 200, height: 100,
  borderRadius: 10,
  fill: Color.linearGradient(0, [
    { offset: 0, color: '#FF6B6B' },
    { offset: 1, color: '#4ECDC4' },
  ]),
  stroke: { width: 2, color: '#333' },
});

// Add freehand drawing
page.addDrawing({
  points: [...], // from editor
  strokeColor: Color.hex('#000'),
  strokeWidth: 2,
  tool: 'pencil', // or 'marker'
});

// Export - Client side (WASM)
const pdfBytes = await doc.exportClient();
downloadBlob(pdfBytes, 'document.pdf');

// Export - Server side (Node.js native)
const pdfBuffer = await doc.exportServer();
fs.writeFileSync('document.pdf', pdfBuffer);
```

---

## Playground (Next.js Editor) - Complete Feature List

### Toolbar (Top)
| Section | Tools |
|---------|-------|
| **File** | New, Open (JSON), Save (JSON), Export PDF (Client), Export PDF (Server) |
| **Edit** | Undo, Redo, Cut, Copy, Paste, Duplicate, Delete, Select All |
| **Text** | Font family dropdown, Font size, Bold, Italic, Underline, Strikethrough, Text color, Highlight color, Alignment (L/C/R/J), Line spacing, Letter spacing |
| **Insert** | Text box, Image (upload/drag), Table, Shape, Drawing, Page break, Horizontal rule |
| **Shape** | Rectangle, Rounded rect, Circle, Ellipse, Triangle, Star, Arrow, Line, Polygon, Custom path |
| **Drawing** | Pencil, Marker/Highlighter, Eraser, Brush size slider, Opacity slider |
| **Color** | Stroke color, Fill color (opens full color picker with: hex input, RGB sliders, CMYK inputs, HSL sliders, Eyedropper, Opacity, Swatches, Recent colors) |
| **Fill** | Solid, Linear gradient, Radial gradient, Pattern (dots, stripes, etc.), No fill |
| **Arrange** | Bring forward, Send backward, Bring to front, Send to back, Group, Ungroup |
| **Align** | Left, Center H, Right, Top, Center V, Bottom, Distribute H, Distribute V |
| **Page** | Page size, Orientation, Margins, Background color |

### Left Panel
- **Page Navigator**: Thumbnail list of all pages, click to jump, drag to reorder, right-click for duplicate/delete/insert
- **Layer Tree**: All elements in z-order, visibility toggle, lock toggle, rename, drag reorder

### Right Panel (Property Inspector)
Dynamic based on selection:
- **Text selected**: Font, size, weight, style, color, alignment, spacing, line height, decoration
- **Image selected**: Width, height, opacity, border, border radius, crop, fit mode
- **Shape selected**: X, Y, W, H, rotation, fill, stroke, border radius, opacity, shadow
- **Table selected**: Row/column count, cell spacing, default border, header row toggle
- **Drawing selected**: Stroke color, stroke width, opacity, smoothing
- **No selection**: Page properties (size, orientation, margins, background)

### Canvas Features
- **WYSIWYG**: Exact representation of final PDF
- **Multi-page**: Scrollable view of all pages with page breaks
- **Zoom**: 25% to 400%, fit width, fit page, Ctrl+scroll
- **Grid**: Optional snap grid
- **Guides**: Draggable ruler guides
- **Snap**: Snap to grid, guides, other elements, page margins
- **Selection**: Click, Shift+click, drag marquee for multi-select
- **Transform**: Drag to move, handles to resize, rotation handle, corner radius handle
- **Inline editing**: Double-click text to edit inline on canvas
- **Drag & drop**: Drop images from file system directly onto canvas

### Table Editor (on canvas)
- Click cell to edit text inline
- Drag column/row borders to resize
- Right-click context menu: Insert row above/below, Insert column left/right, Delete row/column, Merge cells, Split cells, Cell properties (padding, background, border, text align)
- Tab to move between cells
- Header row auto-repeats on page break

### Font Management
- **Default fonts**: Roboto, Open Sans, Lato, Montserrat, Source Code Pro, Noto Sans, Noto Serif
- **Import**: Upload .ttf/.otf files, drag & drop font files
- **Preview**: See font preview before using
- **Categories**: Serif, Sans-serif, Monospace, Display, Handwriting
- **Search**: Filter fonts by name

### Export Options
- **Client-side** (WASM): Runs entirely in browser, no server needed. Progress indicator for large docs.
- **Server-side** (API route): POST document model → server generates PDF with native Rust → returns PDF blob. Better for very large documents.
- **Settings**: PDF version, compression level, embed all fonts vs subset, image quality (DPI), page range

---

## Document Model (JSON Serializable)

```typescript
interface Document {
  version: string;
  metadata: { title: string; author: string; created: string; modified: string };
  settings: {
    defaultFont: string;
    defaultFontSize: number;
    defaultColor: string;
    unit: 'pt' | 'mm' | 'in';
  };
  fonts: FontRegistration[];
  pages: Page[];
}

interface Page {
  id: string;
  size: { width: number; height: number }; // in points
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  background: Fill;
  elements: Element[];
}

type Element =
  | TextElement
  | RichTextElement
  | ImageElement
  | TableElement
  | ShapeElement
  | DrawingElement
  | GroupElement
  | PageBreakElement;

interface BaseElement {
  id: string;
  type: string;
  x: number; y: number;
  width: number; height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  name: string; // user-facing name in layer panel
}

interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  font: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string; // hex
  align: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight: number;
  letterSpacing: number;
  decoration: 'none' | 'underline' | 'strikethrough';
}

interface RichTextElement extends BaseElement {
  type: 'richtext';
  spans: TextSpan[];
  align: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight: number;
}

interface TextSpan {
  text: string;
  font?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  decoration?: 'none' | 'underline' | 'strikethrough';
  backgroundColor?: string;
}

interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // data URL or path
  fit: 'contain' | 'cover' | 'fill' | 'none';
  borderRadius: number;
  border: BorderStyle;
}

interface TableElement extends BaseElement {
  type: 'table';
  columns: { width: number }[];
  rows: TableRow[];
  defaultBorder: BorderStyle;
  cellPadding: number;
  headerRows: number; // repeat on page break
}

interface TableRow {
  height: number | 'auto';
  cells: TableCell[];
}

interface TableCell {
  content: TextSpan[];
  colspan: number;
  rowspan: number;
  padding: { top: number; right: number; bottom: number; left: number };
  background: Fill;
  border: { top: BorderStyle; right: BorderStyle; bottom: BorderStyle; left: BorderStyle };
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
}

interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rect' | 'roundedRect' | 'circle' | 'ellipse' | 'triangle' | 'star' | 'polygon' | 'arrow' | 'line' | 'path';
  fill: Fill;
  stroke: StrokeStyle;
  borderRadius: number;
  points?: Point[]; // for polygon/path
  starPoints?: number; // for star
}

interface DrawingElement extends BaseElement {
  type: 'drawing';
  paths: DrawingPath[];
}

interface DrawingPath {
  points: Point[];
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  tool: 'pencil' | 'marker' | 'eraser';
}

interface GroupElement extends BaseElement {
  type: 'group';
  children: Element[];
}

type Fill =
  | { type: 'none' }
  | { type: 'solid'; color: string }
  | { type: 'linearGradient'; angle: number; stops: GradientStop[] }
  | { type: 'radialGradient'; cx: number; cy: number; r: number; stops: GradientStop[] }
  | { type: 'pattern'; patternType: string; color: string; backgroundColor: string; scale: number };

interface GradientStop { offset: number; color: string }
interface BorderStyle { width: number; color: string; style: 'solid' | 'dashed' | 'dotted' | 'none' }
interface StrokeStyle extends BorderStyle { dashArray?: number[]; lineCap?: 'butt' | 'round' | 'square'; lineJoin?: 'miter' | 'round' | 'bevel' }
interface Point { x: number; y: number; pressure?: number }
```

---

## Implementation Plan (Phases)

### Phase 1: Core PDF Engine (Rust)
1. PDF object model (objects, references, dictionaries, streams)
2. PDF writer (header, body, xref, trailer)
3. Basic page creation with content streams
4. Flate compression
5. Graphics operators (moveTo, lineTo, curveTo, rect, stroke, fill)
6. Color support (RGB, CMYK, hex conversion)
7. Built-in font support (14 standard fonts)
8. Basic text rendering (single font, positioning)
9. Unit tests: generate valid PDFs, verify with PDF reader

### Phase 2: Advanced Core Features
1. TrueType/OpenType font parser
2. Font subsetting
3. Font embedding with ToUnicode CMap
4. Image handling (JPEG pass-through, PNG decode/encode)
5. Text layout engine (line breaking, wrapping, alignment)
6. Rich text (inline spans with different styles)
7. Table layout engine
8. Shape primitives (all shape types)
9. Gradient and pattern fills
10. Page breaks and multi-page content flow

### Phase 3: WASM + Node Bindings
1. wasm-bindgen exports for all core functions
2. WASM build pipeline (wasm-pack)
3. napi-rs Node.js native addon
4. TypeScript SDK wrapping both targets
5. Client export (WASM) and server export (native) paths

### Phase 4: Playground Editor (Next.js)
1. Project setup (Next.js, Zustand, WASM loader)
2. Document model & store
3. Canvas renderer (render document model to HTML5 Canvas)
4. Page view (single page with margins, background)
5. Multi-page scrollable view
6. Basic element selection and transform (move, resize)
7. Text tool: insert text box, inline editing
8. Undo/redo system

### Phase 5: Full Editor Tools
1. Shape tools (all shapes with fills/strokes)
2. Image tool (upload, drag-drop, resize)
3. Table tool (insert, cell editing, resize columns/rows, merge/split)
4. Drawing tools (pencil, marker, eraser)
5. Color picker (full: hex, rgb, cmyk, hsl, opacity, eyedropper)
6. Fill editor (solid, gradient builder, pattern selector)
7. Font panel (browse, search, import custom fonts)
8. Property inspector (dynamic per element type)

### Phase 6: Polish & Advanced
1. Alignment tools & snap guides
2. Layer panel (z-order, visibility, lock)
3. Page panel (reorder, duplicate, delete)
4. Keyboard shortcuts (Ctrl+Z, Ctrl+C, Delete, arrows, etc.)
5. Clipboard (copy/paste elements)
6. Export dialog (client vs server, settings)
7. Multi-language font support (Noto fonts)
8. Performance optimization (virtual canvas, lazy rendering)
9. Responsive editor layout

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| PDF Core | Rust (no external PDF crates) |
| Compression | Custom Flate (or miniz_oxide - only compression lib) |
| Font Parsing | Custom Rust (no external font crates) |
| WASM Bridge | wasm-bindgen, wasm-pack |
| Node Bridge | napi-rs |
| SDK | TypeScript |
| Editor | Next.js 14+ (App Router) |
| State | Zustand |
| Canvas | HTML5 Canvas 2D API |
| Styling | Tailwind CSS |
| Build | Turborepo + pnpm workspaces |
| Bundled Fonts | Roboto, Open Sans, Lato, Montserrat, Source Code Pro, Noto Sans/Serif |

---

## Key Design Decisions

1. **No external PDF libs**: We write PDF binary format from scratch in Rust
2. **No external font libs**: Custom TrueType/OpenType parser in Rust
3. **Dual export**: Same core engine → WASM (browser) or native (Node.js)
4. **Canvas-based editor**: Full control over rendering, exact PDF preview
5. **JSON document model**: Serializable, version-controllable, sendable to server
6. **Font subsetting**: Only embed used glyphs → small PDFs
7. **Compression**: Flate for all streams (miniz_oxide is the only allowed Rust dep)
8. **serde + wasm-bindgen + napi-rs**: Minimal Rust dependencies for bindings only
