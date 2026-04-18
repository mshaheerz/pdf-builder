<p align="center">
  <h1 align="center">PDF Builder</h1>
  <p align="center">
    A high-performance, from-scratch PDF generation engine with a rich WYSIWYG editor.
    <br />
    Built with Rust core · WebAssembly · Next.js
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white" alt="WASM" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

---

## Overview

**PDF Builder** is a comprehensive PDF document creation platform featuring a custom Rust-based PDF 1.7 engine and an interactive WYSIWYG editor. The engine compiles to both **WebAssembly** (for browser-side generation) and **native Node.js bindings** (for server-side generation), delivering near-native performance across all environments.

### Key Highlights

- **Zero external PDF dependencies** — the entire PDF 1.7 spec implementation is written from scratch in Rust
- **Dual runtime** — runs in the browser via WASM and on the server via napi-rs native bindings
- **Full-featured editor** — drag-and-drop, multi-page, real-time canvas preview
- **Production-grade** — font embedding/subsetting, image compression, CMYK color support, Deflate compression

---

## Features

| Category | Capabilities |
|---|---|
| **Text** | Rich text styling, font embedding & subsetting, kerning, line breaking, paragraph layout |
| **Vector Graphics** | Paths, Bezier curves, arcs, shapes (rect, circle, ellipse, polygon, star), clipping masks |
| **Images** | PNG, JPEG, WebP decoding & embedding with DCT/Flate compression |
| **Tables** | Full table layout, cell merging, borders, per-cell styling, text wrapping |
| **Drawing** | Freehand pencil, marker/highlighter, eraser with configurable brush settings |
| **Fills & Patterns** | Solid colors, linear/radial gradients, tiling patterns |
| **Color** | RGB, CMYK, HSL, Hex, named colors with automatic conversions |
| **Layout** | Page breaks, content flow, absolute/relative positioning, alignment, distribution |
| **Compression** | Deflate/Flate stream compression, ASCII85 encoding |

---

## Tech Stack

### Core Engine

| Technology | Purpose |
|---|---|
| **Rust** (2021 Edition) | PDF generation engine — binary format compliance, font parsing, image encoding |
| **wasm-bindgen** 0.2 | Rust-to-WebAssembly bridge for browser runtime |
| **napi-rs** 2.0 | Rust-to-Node.js native binding for server runtime |
| **serde** | JSON serialization/deserialization |

### Frontend / Editor

| Technology | Purpose |
|---|---|
| **Next.js** 14 | React framework with App Router, API routes, SSR |
| **React** 18 | UI component library |
| **TypeScript** 5.4 | Type-safe development across all JS/TS packages |
| **Tailwind CSS** 3.4 | Utility-first styling with custom dark editor theme |
| **Zustand** 4.5 | Lightweight state management for document model |
| **HTML5 Canvas** | Real-time document rendering and preview |

### Build & Tooling

| Technology | Purpose |
|---|---|
| **npm workspaces** | Package manager and workspace orchestration |
| **wasm-pack** | Rust-to-WASM compilation pipeline |
| **Cargo** | Rust workspace build system |

---

## Project Structure

```
pdf-builder/
├── packages/
│   ├── core/                    # Rust — PDF generation engine
│   │   └── src/
│   │       ├── lib.rs           # Library entry point
│   │       ├── pdf/             # PDF 1.7 spec (document, objects, writer, pages)
│   │       ├── font/            # Font parsing, embedding, subsetting, metrics
│   │       ├── image/           # Image decoding, encoding, color spaces
│   │       ├── geometry/        # Vector paths, shapes, transforms, clipping
│   │       ├── text/            # Text layout, paragraphs, rich text, shaping
│   │       ├── table/           # Table layout, cells, borders, rendering
│   │       ├── drawing/         # Freehand pencil, marker, eraser, brush
│   │       ├── layout/          # Page breaks, flow, positioning, alignment
│   │       ├── pattern/         # Fills, gradients, tiling patterns
│   │       ├── compression/     # Deflate, ASCII85 encoding
│   │       └── utils/           # Color conversion, unit utilities
│   │
│   ├── wasm/                    # Rust — WebAssembly binding (browser)
│   │   ├── src/lib.rs           # wasm-bindgen exports
│   │   └── pkg/                 # Compiled WASM output
│   │
│   ├── node-binding/            # Rust — Node.js native binding (server)
│   │   └── src/lib.rs           # napi-rs exports
│   │
│   ├── sdk/                     # TypeScript — SDK wrapper
│   │   └── src/
│   │       ├── index.ts         # Public API exports
│   │       ├── types.ts         # Type definitions
│   │       ├── document.ts      # Document builder API
│   │       ├── color.ts         # Color utilities
│   │       └── helpers.ts       # Helper functions
│   │
│   └── playground/              # Next.js — WYSIWYG Editor UI
│       ├── app/
│       │   ├── layout.tsx       # Root layout
│       │   ├── page.tsx         # Main editor page
│       │   └── api/
│       │       └── export-pdf/
│       │           └── route.ts # Server-side PDF export endpoint
│       ├── components/
│       │   ├── toolbar/         # Top toolbar (tools, actions)
│       │   ├── editor/          # Canvas renderer (document preview)
│       │   └── panels/          # Left sidebar & right property inspector
│       ├── store/
│       │   ├── document-store.ts # Zustand document state
│       │   └── table-utils.ts    # Table helper utilities
│       └── public/fonts/         # Bundled font files
│
├── Cargo.toml                   # Rust workspace configuration
├── package.json                 # npm workspace root
├── ARCHITECTURE.md              # Detailed architecture documentation
└── package-lock.json            # Locked JavaScript dependency graph
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Playground UI                    │
│          (Next.js + React + Canvas)              │
├─────────────────────────────────────────────────┤
│               Zustand Store                      │
│          (Document Model / State)                │
├─────────────────────────────────────────────────┤
│              TypeScript SDK                       │
│         (@pdf-builder/sdk)                       │
├──────────────────┬──────────────────────────────┤
│   WASM Binding   │      Node.js Binding          │
│  (Browser)       │   (Server / napi-rs)          │
├──────────────────┴──────────────────────────────┤
│              Rust Core Engine                     │
│   PDF · Font · Image · Geometry · Text · Table   │
│   Drawing · Layout · Pattern · Compression       │
└─────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Rust** | stable (2021 edition) | Core engine compilation |
| **wasm-pack** | latest | Compile Rust to WebAssembly |
| **Node.js** | >= 20.x | Runtime for Next.js and build tools |
| **npm** | >= 10.x | Package manager with workspace support |

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/pdf-builder.git
cd pdf-builder

# Install JavaScript dependencies
npm install

# Start the development server
npm run dev
```

The playground editor will be available at `http://localhost:3000`.

The root `dev` command automatically makes sure the sibling SDK is built and that the checked-in WebAssembly package is available before Next.js starts.

### Build All Packages

```bash
# Build everything from the workspace root
npm run build
```

---

## Scripts Reference

### Root Level

| Command | Description |
|---|---|
| `npm run dev` | Start playground dev server (builds SDK first, then starts Next.js) |
| `npm run build` | Build the workspace root, SDK, and playground production bundle |
| `npm run build:core` | Compile Rust core to WASM (`wasm-pack`) |
| `npm run build:sdk` | Compile TypeScript SDK |
| `npm run build:playground` | Build the playground production bundle |
| `npm run ensure:wasm` | Verify `packages/wasm/pkg` exists or rebuild it with `wasm-pack` |

### Package Level

| Package | Command | Description |
|---|---|---|
| `playground` | `npm run dev` | Builds the sibling SDK, verifies WASM, then starts Next.js |
| `playground` | `npm run build` | Builds the sibling SDK, verifies WASM, then creates the Next.js production bundle |
| `playground` | `npm run start` | Serve the production build |
| `sdk` | `npm run build` | TypeScript compilation |
| `sdk` | `npm run dev` | TypeScript watch mode |

---

## Packages

### `@pdf-builder/core` (Rust)

The heart of the project. A complete PDF 1.7 generation engine written in Rust with zero external PDF library dependencies. Handles binary format compliance, font parsing/subsetting, image encoding, vector graphics, text layout, and stream compression.

### `@pdf-builder/wasm`

WebAssembly wrapper around the core engine using `wasm-bindgen`. Enables client-side PDF generation directly in the browser with near-native performance.

### `@pdf-builder/node`

Node.js native binding via `napi-rs`. Provides server-side PDF generation with full native Rust performance — ideal for API endpoints, batch processing, and CI/CD pipelines.

### `@pdf-builder/sdk`

TypeScript SDK that provides a clean, type-safe API for interacting with the core engine. Abstracts the WASM/native binding layer and exposes a unified `Document` builder API.

### `@pdf-builder/playground`

A full-featured WYSIWYG PDF editor built with Next.js. Features a canvas-based document renderer, drag-and-drop elements, a toolbar with drawing/shape tools, and real-time PDF export.

---

## Deployment

### Playground (Next.js)

#### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# From the repo root
vercel --prod
```

Project settings:

- `Framework Preset`: `Next.js`
- `Root Directory`: `packages/playground`
- `Install Command`: `npm install`
- `Build Command`: `npm run build`
- `Output Directory`: leave empty
- `Include files outside the Root Directory in the Build Step`: enabled

Important notes:

- The playground build script compiles the sibling `packages/sdk` package before running `next build`.
- The repo keeps the generated `packages/wasm/pkg` bundle checked in so Vercel can resolve `pdf-builder-wasm` from a clean clone.
- If the checked-in WASM bundle is ever removed locally, `npm run ensure:wasm` will attempt to regenerate it with `wasm-pack`.

#### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install Rust toolchain for WASM build
RUN apk add --no-cache curl build-base && \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN cargo install wasm-pack

WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json ./
COPY Cargo.toml Cargo.lock ./
COPY packages/ ./packages/
COPY scripts/ ./scripts/

# Install dependencies
RUN npm ci

# Build pipeline
RUN npm run build:core
RUN npm run build:sdk
RUN npm run build:playground

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=base /app/packages/playground/.next/standalone ./
COPY --from=base /app/packages/playground/.next/static ./.next/static
COPY --from=base /app/packages/playground/public ./public

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

```bash
docker build -t pdf-builder .
docker run -p 3000:3000 pdf-builder
```

#### Self-Hosted (Node.js)

```bash
# Build all packages
npm run build

# Start the production server
cd packages/playground
npm start
```

### SDK / Node Binding (npm)

```bash
# Build and publish the SDK
cd packages/sdk
npm run build
npm publish --access public

# Build and publish the Node binding
cd packages/node-binding
npm publish --access public
```

---

## Package Release

### Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** — breaking API changes
- **MINOR** — new features, backward-compatible
- **PATCH** — bug fixes, backward-compatible

### Release Workflow

```bash
# 1. Ensure all tests pass and packages build
npm run build

# 2. Update version in relevant package.json / Cargo.toml files
#    packages/sdk/package.json
#    packages/node-binding/package.json
#    packages/core/Cargo.toml
#    packages/wasm/Cargo.toml

# 3. Build the WASM package
npm run build:core

# 4. Build the SDK
npm run build:sdk

# 5. Publish packages to npm
cd packages/sdk && npm publish --access public
cd packages/node-binding && npm publish --access public

# 6. Tag the release
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

### Published Packages

| Package | Registry | Description |
|---|---|---|
| `@pdf-builder/sdk` | npm | TypeScript SDK for PDF generation |
| `@pdf-builder/node` | npm | Node.js native binding (napi-rs) |
| `pdf-builder-core` | crates.io | Rust core engine (optional) |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port for the playground |
| `NODE_ENV` | `development` | Node.js environment mode |

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Tips

- Run `npm run dev` for hot-reload development on the playground
- Rebuild WASM after any Rust core changes: `npm run build:core`
- Use `cargo check` in `packages/core` for fast Rust compilation checks
- The playground uses a custom dark theme — see `tailwind.config.ts` for color tokens

---

## License

Distributed under the **MIT License**. See `Cargo.toml` for details.

---

<p align="center">
  Built with Rust, WebAssembly, and Next.js
</p>
