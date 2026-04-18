/* tslint:disable */
/* eslint-disable */

export class WasmPdfBuilder {
    free(): void;
    [Symbol.dispose](): void;
    add_builtin_font(font_name: string): string;
    add_circle(page: number, cx: number, cy: number, r: number, fill_hex: string, stroke_hex: string, stroke_width: number): void;
    add_image_jpeg(page: number, jpeg_data: Uint8Array, x: number, y: number, display_width: number, display_height: number, img_width: number, img_height: number): void;
    add_line(page: number, x1: number, y1: number, x2: number, y2: number, color_hex: string, width: number): void;
    add_page(width: number, height: number, margin_top: number, margin_right: number, margin_bottom: number, margin_left: number): number;
    add_rect(page: number, x: number, y: number, w: number, h: number, fill_hex: string, stroke_hex: string, stroke_width: number): void;
    add_text(page: number, font_name: string, font_size: number, x: number, y: number, text: string, color_hex: string): void;
    /**
     * Build and return the PDF bytes
     */
    build(): Uint8Array;
    constructor();
    set_metadata(title: string, author: string): void;
}

/**
 * Build PDF from a JSON document model
 */
export function build_pdf_from_json(json: string): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmpdfbuilder_free: (a: number, b: number) => void;
    readonly build_pdf_from_json: (a: number, b: number) => [number, number];
    readonly wasmpdfbuilder_add_builtin_font: (a: number, b: number, c: number) => [number, number];
    readonly wasmpdfbuilder_add_circle: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
    readonly wasmpdfbuilder_add_image_jpeg: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
    readonly wasmpdfbuilder_add_line: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly wasmpdfbuilder_add_page: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly wasmpdfbuilder_add_rect: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
    readonly wasmpdfbuilder_add_text: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
    readonly wasmpdfbuilder_build: (a: number) => [number, number];
    readonly wasmpdfbuilder_new: () => number;
    readonly wasmpdfbuilder_set_metadata: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
