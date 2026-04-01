import init, { build_pdf_from_json } from 'pdf-builder-wasm';

let wasmReady = false;

async function ensureWasm() {
  if (!wasmReady) {
    await init();
    wasmReady = true;
  }
}

export async function exportPdfWasm(documentJson: string): Promise<Uint8Array> {
  await ensureWasm();
  return build_pdf_from_json(documentJson);
}
