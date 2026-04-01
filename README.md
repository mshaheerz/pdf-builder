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
| **pnpm** | Package manager with workspace support |
| **Turborepo** 2.0 | Monorepo build orchestration and caching |
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
├── package.json                 # pnpm monorepo root
├── pnpm-workspace.yaml          # Workspace package definitions
├── ARCHITECTURE.md              # Detailed architecture documentation
└── turbo.json                   # Turborepo build pipeline (if present)
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
| **Node.js** | >= 18.x | Runtime for Next.js and build tools |
| **pnpm** | >= 8.x | Package manager |

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/pdf-builder.git
cd pdf-builder

# Install JavaScript dependencies
pnpm install

# Build the WASM core
pnpm run build:core

# Build the TypeScript SDK
pnpm run build:sdk

# Start the development server
pnpm run dev
```

The playground editor will be available at `http://localhost:3000`.

### Build All Packages

```bash
# Build everything via Turborepo
pnpm run build
```

---

## Scripts Reference

### Root Level

| Command | Description |
|---|---|
| `pnpm run dev` | Start playground dev server (Next.js) |
| `pnpm run build` | Build all packages via Turborepo |
| `pnpm run build:core` | Compile Rust core to WASM (`wasm-pack`) |
| `pnpm run build:sdk` | Compile TypeScript SDK |
| `pnpm run build:playground` | Build Next.js production bundle |

### Package Level

| Package | Command | Description |
|---|---|---|
| `playground` | `pnpm dev` | Next.js dev server |
| `playground` | `pnpm build` | Next.js production build |
| `playground` | `pnpm start` | Serve production build |
| `sdk` | `pnpm build` | TypeScript compilation |
| `sdk` | `pnpm dev` | TypeScript watch mode |

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

# Deploy from the playground package
cd packages/playground
vercel --prod
```

Ensure the WASM package is pre-built before deploying:

```bash
pnpm run build:core
pnpm run build:sdk
cd packages/playground && vercel --prod
```

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
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY Cargo.toml Cargo.lock ./
COPY packages/ ./packages/

# Install dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Build pipeline
RUN pnpm run build:core
RUN pnpm run build:sdk
RUN pnpm run build:playground

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
pnpm run build

# Start the production server
cd packages/playground
pnpm start
```

### SDK / Node Binding (npm)

```bash
# Build and publish the SDK
cd packages/sdk
pnpm build
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
pnpm run build

# 2. Update version in relevant package.json / Cargo.toml files
#    packages/sdk/package.json
#    packages/node-binding/package.json
#    packages/core/Cargo.toml
#    packages/wasm/Cargo.toml

# 3. Build the WASM package
pnpm run build:core

# 4. Build the SDK
pnpm run build:sdk

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

- Run `pnpm run dev` for hot-reload development on the playground
- Rebuild WASM after any Rust core changes: `pnpm run build:core`
- Use `cargo check` in `packages/core` for fast Rust compilation checks
- The playground uses a custom dark theme — see `tailwind.config.ts` for color tokens

---

## License

Distributed under the **MIT License**. See `Cargo.toml` for details.

---

<p align="center">
  Built with Rust, WebAssembly, and Next.js
</p>
