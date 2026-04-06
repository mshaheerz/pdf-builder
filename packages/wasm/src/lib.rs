use wasm_bindgen::prelude::*;
use pdf_builder_core::pdf::document::{PdfDocument, DocumentMetadata};
use pdf_builder_core::pdf::page::{PageConfig, PageSize, Orientation, Margins};
use pdf_builder_core::pdf::color::Color;
use pdf_builder_core::font::builtin::BuiltinFont;
use serde::{Deserialize, Serialize};

#[wasm_bindgen]
pub struct WasmPdfBuilder {
    doc: Option<PdfDocument>,   
    fonts: Vec<(String, String)>, // (internal_name, display_name)
}

#[wasm_bindgen]
impl WasmPdfBuilder {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            doc: Some(PdfDocument::new()),
            fonts: Vec::new(),
        }
    }

    pub fn set_metadata(&mut self, title: &str, author: &str) {
        if let Some(doc) = &mut self.doc {
            doc.set_metadata(DocumentMetadata {
                title: Some(title.to_string()),
                author: Some(author.to_string()),
                subject: None,
                creator: Some("PDF Builder WASM".to_string()),
            });
        }
    }

    pub fn add_builtin_font(&mut self, font_name: &str) -> String {
        let font = match font_name {
            "Helvetica" => BuiltinFont::Helvetica,
            "Helvetica-Bold" => BuiltinFont::HelveticaBold,
            "Helvetica-Oblique" => BuiltinFont::HelveticaOblique,
            "Times-Roman" => BuiltinFont::TimesRoman,
            "Times-Bold" => BuiltinFont::TimesBold,
            "Times-Italic" => BuiltinFont::TimesItalic,
            "Courier" => BuiltinFont::Courier,
            "Courier-Bold" => BuiltinFont::CourierBold,
            "Symbol" => BuiltinFont::Symbol,
            "ZapfDingbats" => BuiltinFont::ZapfDingbats,
            _ => BuiltinFont::Helvetica,
        };
        if let Some(doc) = &mut self.doc {
            let name = doc.add_builtin_font(font);
            self.fonts.push((name.clone(), font_name.to_string()));
            name
        } else {
            String::new()
        }
    }

    pub fn add_page(&mut self, width: f64, height: f64, margin_top: f64, margin_right: f64, margin_bottom: f64, margin_left: f64) -> usize {
        if let Some(doc) = &mut self.doc {
            doc.add_page(PageConfig {
                size: PageSize::Custom(width, height),
                orientation: Orientation::Portrait,
                margins: Margins {
                    top: margin_top,
                    right: margin_right,
                    bottom: margin_bottom,
                    left: margin_left,
                },
            })
        } else {
            0
        }
    }

    pub fn add_text(&mut self, page: usize, font_name: &str, font_size: f64, x: f64, y: f64, text: &str, color_hex: &str) {
        if let Some(doc) = &mut self.doc {
            doc.use_font_on_page(page, font_name);
            let cs = doc.page_content(page);

            cs.save_state();
            if let Some(color) = Color::from_hex(color_hex) {
                cs.set_fill_color(&color);
            }
            cs.begin_text();
            cs.set_font(font_name, font_size);
            cs.text_move(x, y);
            cs.show_text(text);
            cs.end_text();
            cs.restore_state();
        }
    }

    pub fn add_rect(&mut self, page: usize, x: f64, y: f64, w: f64, h: f64, fill_hex: &str, stroke_hex: &str, stroke_width: f64) {
        if let Some(doc) = &mut self.doc {
            let cs = doc.page_content(page);
            cs.save_state();
            if !fill_hex.is_empty() {
                if let Some(color) = Color::from_hex(fill_hex) {
                    cs.set_fill_color(&color);
                }
            }
            if !stroke_hex.is_empty() {
                if let Some(color) = Color::from_hex(stroke_hex) {
                    cs.set_stroke_color(&color);
                }
            }
            cs.set_line_width(stroke_width);
            cs.rect(x, y, w, h);
            if !fill_hex.is_empty() && !stroke_hex.is_empty() {
                cs.fill_and_stroke();
            } else if !fill_hex.is_empty() {
                cs.fill();
            } else {
                cs.stroke();
            }
            cs.restore_state();
        }
    }

    pub fn add_circle(&mut self, page: usize, cx: f64, cy: f64, r: f64, fill_hex: &str, stroke_hex: &str, stroke_width: f64) {
        if let Some(doc) = &mut self.doc {
            let cs = doc.page_content(page);
            cs.save_state();
            if !fill_hex.is_empty() {
                if let Some(color) = Color::from_hex(fill_hex) {
                    cs.set_fill_color(&color);
                }
            }
            if !stroke_hex.is_empty() {
                if let Some(color) = Color::from_hex(stroke_hex) {
                    cs.set_stroke_color(&color);
                }
            }
            cs.set_line_width(stroke_width);
            cs.circle(cx, cy, r);
            if !fill_hex.is_empty() && !stroke_hex.is_empty() {
                cs.fill_and_stroke();
            } else if !fill_hex.is_empty() {
                cs.fill();
            } else {
                cs.stroke();
            }
            cs.restore_state();
        }
    }

    pub fn add_line(&mut self, page: usize, x1: f64, y1: f64, x2: f64, y2: f64, color_hex: &str, width: f64) {
        if let Some(doc) = &mut self.doc {
            let cs = doc.page_content(page);
            cs.save_state();
            if let Some(color) = Color::from_hex(color_hex) {
                cs.set_stroke_color(&color);
            }
            cs.set_line_width(width);
            cs.move_to(x1, y1);
            cs.line_to(x2, y2);
            cs.stroke();
            cs.restore_state();
        }
    }

    pub fn add_image_jpeg(&mut self, page: usize, jpeg_data: &[u8], x: f64, y: f64, display_width: f64, display_height: f64, img_width: u32, img_height: u32) {
        if let Some(doc) = &mut self.doc {
            let img_name = doc.add_jpeg_image(jpeg_data.to_vec(), img_width, img_height);
            doc.use_image_on_page(page, &img_name);
            let cs = doc.page_content(page);
            cs.save_state();
            cs.set_transform(display_width, 0.0, 0.0, display_height, x, y);
            cs.draw_xobject(&img_name);
            cs.restore_state();
        }
    }

    /// Build and return the PDF bytes
    pub fn build(&mut self) -> Vec<u8> {
        if let Some(doc) = self.doc.take() {
            doc.build()
        } else {
            Vec::new()
        }
    }
}

/// Build PDF from a JSON document model
#[wasm_bindgen]
pub fn build_pdf_from_json(json: &str) -> Vec<u8> {
    match serde_json::from_str::<serde_json::Value>(json) {
        Ok(model) => build_from_model(&model),
        Err(_) => Vec::new(),
    }
}

fn build_from_model(model: &serde_json::Value) -> Vec<u8> {
    let mut doc = PdfDocument::new();

    // Parse pages
    if let Some(pages) = model.get("pages").and_then(|p| p.as_array()) {
        let font_name = doc.add_builtin_font(BuiltinFont::Helvetica);
        let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold);
        let font_italic = doc.add_builtin_font(BuiltinFont::HelveticaOblique);

        let total_pages = pages.len();
        for (pi, page_val) in pages.iter().enumerate() {
            let page_num = pi + 1;
            let width = page_val.get("width").and_then(|v| v.as_f64()).unwrap_or(595.0);
            let height = page_val.get("height").and_then(|v| v.as_f64()).unwrap_or(842.0);

            let page_idx = doc.add_page(PageConfig {
                size: PageSize::Custom(width, height),
                orientation: Orientation::Portrait,
                margins: Margins::default(),
            });

            doc.use_font_on_page(page_idx, &font_name);
            doc.use_font_on_page(page_idx, &font_bold);
            doc.use_font_on_page(page_idx, &font_italic);

            // Page background
            if let Some(bg) = page_val.get("background").and_then(|v| v.as_str()) {
                if bg != "#FFFFFF" && bg != "#ffffff" {
                    if let Some(c) = Color::from_hex(bg) {
                        let cs = doc.page_content(page_idx);
                        cs.save_state();
                        cs.set_fill_color(&c);
                        cs.rect(0.0, 0.0, width, height);
                        cs.fill();
                        cs.restore_state();
                    }
                }
            }

            // Parse elements
            if let Some(elements) = page_val.get("elements").and_then(|e| e.as_array()) {
                for elem in elements {
                    let elem_type = elem.get("type").and_then(|t| t.as_str()).unwrap_or("");
                    match elem_type {
                        "text" => {
                            let x = elem.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let y = elem.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let text = elem.get("content").and_then(|v| v.as_str()).unwrap_or("");
                            let size = elem.get("fontSize").and_then(|v| v.as_f64()).unwrap_or(12.0);
                            let color = elem.get("color").and_then(|v| v.as_str()).unwrap_or("#000000");
                            let weight = elem.get("fontWeight").and_then(|v| v.as_str()).unwrap_or("");
                            let style = elem.get("fontStyle").and_then(|v| v.as_str()).unwrap_or("");
                            let active_font = if weight == "bold" { &font_bold } else if style == "italic" { &font_italic } else { &font_name };

                            if !text.is_empty() {
                                let line_height = size * 1.2;
                                let mut y_pos = height - y - size;
                                let cs = doc.page_content(page_idx);
                                cs.save_state();
                                if let Some(c) = Color::from_hex(color) {
                                    cs.set_fill_color(&c);
                                }
                                for line in text.split('\n') {
                                    cs.begin_text();
                                    cs.set_font(active_font, size);
                                    cs.text_move(x, y_pos);
                                    cs.show_text(line);
                                    cs.end_text();
                                    y_pos -= line_height;
                                }
                                cs.restore_state();
                            }
                        }
                        "shape" => {
                            let x = elem.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let y = elem.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let w = elem.get("width").and_then(|v| v.as_f64()).unwrap_or(100.0);
                            let h = elem.get("height").and_then(|v| v.as_f64()).unwrap_or(100.0);
                            // fill/stroke can be objects { color: "#..." } or strings
                            let fill = elem.get("fill")
                                .and_then(|v| v.get("color").and_then(|c| c.as_str()).or_else(|| v.as_str()))
                                .unwrap_or("");
                            let stroke = elem.get("stroke")
                                .and_then(|v| v.get("color").and_then(|c| c.as_str()).or_else(|| v.as_str()))
                                .unwrap_or("#000000");
                            let stroke_width = elem.get("stroke")
                                .and_then(|v| v.get("width").and_then(|w| w.as_f64()))
                                .unwrap_or(1.0);

                            let cs = doc.page_content(page_idx);
                            cs.save_state();
                            if !fill.is_empty() {
                                if let Some(c) = Color::from_hex(fill) { cs.set_fill_color(&c); }
                            }
                            if let Some(c) = Color::from_hex(stroke) { cs.set_stroke_color(&c); }
                            cs.set_line_width(stroke_width);
                            cs.rect(x, height - y - h, w, h);
                            if !fill.is_empty() {
                                cs.fill_and_stroke();
                            } else {
                                cs.stroke();
                            }
                            cs.restore_state();
                        }
                        "documentBody" => {
                            let x = elem.get("x").and_then(|v| v.as_f64()).unwrap_or(72.0);
                            let y = elem.get("y").and_then(|v| v.as_f64()).unwrap_or(72.0);
                            // Use content, or fall back to joining spans[].text
                            let content_str = elem.get("content").and_then(|v| v.as_str()).unwrap_or("");
                            let spans_text = if content_str.is_empty() {
                                elem.get("spans")
                                    .and_then(|v| v.as_array())
                                    .map(|spans| {
                                        spans.iter()
                                            .filter_map(|s| s.get("text").and_then(|t| t.as_str()))
                                            .collect::<Vec<_>>()
                                            .join("")
                                    })
                                    .unwrap_or_default()
                            } else {
                                String::new()
                            };
                            let text = if content_str.is_empty() { spans_text.as_str() } else { content_str };
                            let size = elem.get("fontSize").and_then(|v| v.as_f64()).unwrap_or(14.0);
                            let color = elem.get("color").and_then(|v| v.as_str()).unwrap_or("#000000");
                            let weight = elem.get("fontWeight").and_then(|v| v.as_str()).unwrap_or("");
                            let style = elem.get("fontStyle").and_then(|v| v.as_str()).unwrap_or("");
                            let active_font = if weight == "bold" { &font_bold } else if style == "italic" { &font_italic } else { &font_name };
                            let line_height_mult = elem.get("lineHeight").and_then(|v| v.as_f64()).unwrap_or(1.2);

                            if !text.is_empty() {
                                let line_height = size * line_height_mult;
                                let mut y_pos = height - y - size;
                                let cs = doc.page_content(page_idx);
                                cs.save_state();
                                if let Some(c) = Color::from_hex(color) {
                                    cs.set_fill_color(&c);
                                }
                                for line in text.split('\n') {
                                    cs.begin_text();
                                    cs.set_font(active_font, size);
                                    cs.text_move(x, y_pos);
                                    cs.show_text(line);
                                    cs.end_text();
                                    y_pos -= line_height;
                                }
                                cs.restore_state();
                            }

                            // Border
                            if let Some(border) = elem.get("border") {
                                let bstyle = border.get("style").and_then(|v| v.as_str()).unwrap_or("none");
                                let bwidth = border.get("width").and_then(|v| v.as_f64()).unwrap_or(0.0);
                                if bstyle != "none" && bwidth > 0.0 {
                                    let bcolor = border.get("color").and_then(|v| v.as_str()).unwrap_or("#000000");
                                    let bx = elem.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                                    let by_val = elem.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
                                    let bw = elem.get("width").and_then(|v| v.as_f64()).unwrap_or(100.0);
                                    let bh = elem.get("height").and_then(|v| v.as_f64()).unwrap_or(100.0);
                                    let cs = doc.page_content(page_idx);
                                    cs.save_state();
                                    if let Some(c) = Color::from_hex(bcolor) { cs.set_stroke_color(&c); }
                                    cs.set_line_width(bwidth);
                                    cs.rect(bx, height - by_val - bh, bw, bh);
                                    cs.stroke();
                                    cs.restore_state();
                                }
                            }
                        }
                        "table" => {
                            let columns = elem.get("columns").and_then(|v| v.as_array());
                            let rows = elem.get("rows").and_then(|v| v.as_array());
                            if let (Some(cols), Some(rows)) = (columns, rows) {
                                let ex = elem.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                                let ey = elem.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
                                let ew = elem.get("width").and_then(|v| v.as_f64()).unwrap_or(400.0);
                                let total_w: f64 = cols.iter()
                                    .filter_map(|c| c.get("width").and_then(|w| w.as_f64()))
                                    .sum();
                                let scale_x = if total_w > 0.0 { ew / total_w } else { 1.0 };
                                let mut ty = ey;

                                for (ri, row) in rows.iter().enumerate() {
                                    let row_h = row.get("height").and_then(|v| v.as_f64()).unwrap_or(30.0);
                                    let cells = row.get("cells").and_then(|v| v.as_array());
                                    let mut tx = ex;
                                    if let Some(cells) = cells {
                                        for (ci, cell) in cells.iter().enumerate() {
                                            let cw = cols.get(ci)
                                                .and_then(|c| c.get("width").and_then(|w| w.as_f64()))
                                                .unwrap_or(100.0) * scale_x;
                                            let pdf_y = height - ty - row_h;

                                            // Cell border
                                            let cs = doc.page_content(page_idx);
                                            cs.save_state();
                                            if let Some(c) = Color::from_hex("#C0C0C0") { cs.set_stroke_color(&c); }
                                            cs.set_line_width(0.5);
                                            cs.rect(tx, pdf_y, cw, row_h);
                                            cs.stroke();
                                            cs.restore_state();

                                            // Cell text
                                            let content = cell.get("content").and_then(|v| v.as_str()).unwrap_or("");
                                            if !content.is_empty() {
                                                let cs = doc.page_content(page_idx);
                                                cs.save_state();
                                                if let Some(c) = Color::from_hex("#000000") { cs.set_fill_color(&c); }
                                                cs.begin_text();
                                                cs.set_font(&font_name, 10.0);
                                                cs.text_move(tx + 4.0, pdf_y + row_h / 2.0 - 4.0);
                                                cs.show_text(content);
                                                cs.end_text();
                                                cs.restore_state();
                                            }
                                            tx += cw;
                                        }
                                    }
                                    ty += row_h;
                                }
                            }
                        }
                        "drawing" => {
                            let ox = elem.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let oy = elem.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            if let Some(paths) = elem.get("paths").and_then(|v| v.as_array()) {
                                for path in paths {
                                    let points = path.get("points").and_then(|v| v.as_array());
                                    let points = match points {
                                        Some(p) if p.len() >= 2 => p,
                                        _ => continue,
                                    };
                                    let color = path.get("color").and_then(|v| v.as_str()).unwrap_or("#000000");
                                    let line_w = path.get("width").and_then(|v| v.as_f64()).unwrap_or(2.0);
                                    let tool = path.get("tool").and_then(|v| v.as_str()).unwrap_or("pencil");

                                    let cs = doc.page_content(page_idx);
                                    cs.save_state();

                                    if tool == "marker" {
                                        let gs_name = doc.add_opacity(0.4, 0.4);
                                        doc.use_gstate_on_page(page_idx, &gs_name);
                                        let cs = doc.page_content(page_idx);
                                        cs.set_ext_graphics_state(&gs_name);
                                    }

                                    let cs = doc.page_content(page_idx);
                                    if let Some(c) = Color::from_hex(color) { cs.set_stroke_color(&c); }
                                    cs.set_line_width(line_w);
                                    cs.set_line_cap(pdf_builder_core::pdf::graphics_state::LineCap::Round);
                                    cs.set_line_join(pdf_builder_core::pdf::graphics_state::LineJoin::Round);

                                    let px0 = points[0].get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                                    let py0 = points[0].get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
                                    cs.move_to(ox + px0, height - oy - py0);
                                    for pt in &points[1..] {
                                        let px = pt.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                                        let py = pt.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
                                        cs.line_to(ox + px, height - oy - py);
                                    }
                                    cs.stroke();
                                    cs.restore_state();
                                }
                            }
                        }
                        "image" => {
                            let x = elem.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let y = elem.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let dw = elem.get("width").and_then(|v| v.as_f64()).unwrap_or(200.0);
                            let dh = elem.get("height").and_then(|v| v.as_f64()).unwrap_or(150.0);
                            let src = elem.get("src").and_then(|v| v.as_str()).unwrap_or("");

                            if let Some(b64_start) = src.find("base64,") {
                                let b64_data = &src[b64_start + 7..];
                                if let Ok(img_bytes) = base64_decode(b64_data) {
                                    let is_jpeg = src.contains("image/jpeg") || src.contains("image/jpg")
                                        || (img_bytes.len() >= 2 && img_bytes[0] == 0xFF && img_bytes[1] == 0xD8);

                                    if is_jpeg {
                                        let (iw, ih) = jpeg_dimensions(&img_bytes).unwrap_or((dw as u32, dh as u32));
                                        let img_name = doc.add_jpeg_image(img_bytes, iw, ih);
                                        doc.use_image_on_page(page_idx, &img_name);
                                        let cs = doc.page_content(page_idx);
                                        cs.save_state();
                                        cs.set_transform(dw, 0.0, 0.0, dh, x, height - y - dh);
                                        cs.draw_xobject(&img_name);
                                        cs.restore_state();
                                    } else if let Ok(img_data) = pdf_builder_core::image::decoder::decode_png(&img_bytes) {
                                        let img_name = doc.add_rgb_image(img_data.data, img_data.width, img_data.height);
                                        doc.use_image_on_page(page_idx, &img_name);
                                        let cs = doc.page_content(page_idx);
                                        cs.save_state();
                                        cs.set_transform(dw, 0.0, 0.0, dh, x, height - y - dh);
                                        cs.draw_xobject(&img_name);
                                        cs.restore_state();
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }

            // Render header
            if let Some(header) = page_val.get("header") {
                let enabled = header.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
                let text = header.get("text").and_then(|v| v.as_str()).unwrap_or("");
                if enabled && !text.is_empty() {
                    let size = header.get("fontSize").and_then(|v| v.as_f64()).unwrap_or(10.0);
                    let color = header.get("color").and_then(|v| v.as_str()).unwrap_or("#666666");
                    let align = header.get("align").and_then(|v| v.as_str()).unwrap_or("center");
                    let x = match align {
                        "left" => 40.0,
                        "right" => width - 40.0 - text.len() as f64 * size * 0.5,
                        _ => width / 2.0 - text.len() as f64 * size * 0.25,
                    };
                    let cs = doc.page_content(page_idx);
                    cs.save_state();
                    if let Some(c) = Color::from_hex(color) { cs.set_fill_color(&c); }
                    cs.begin_text();
                    cs.set_font(&font_name, size);
                    cs.text_move(x, height - 20.0 - size);
                    cs.show_text(text);
                    cs.end_text();
                    cs.restore_state();
                }
            }

            // Render footer
            if let Some(footer) = page_val.get("footer") {
                let enabled = footer.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
                let text = footer.get("text").and_then(|v| v.as_str()).unwrap_or("");
                if enabled && !text.is_empty() {
                    let size = footer.get("fontSize").and_then(|v| v.as_f64()).unwrap_or(10.0);
                    let color = footer.get("color").and_then(|v| v.as_str()).unwrap_or("#666666");
                    let align = footer.get("align").and_then(|v| v.as_str()).unwrap_or("center");
                    let x = match align {
                        "left" => 40.0,
                        "right" => width - 40.0 - text.len() as f64 * size * 0.5,
                        _ => width / 2.0 - text.len() as f64 * size * 0.25,
                    };
                    let cs = doc.page_content(page_idx);
                    cs.save_state();
                    if let Some(c) = Color::from_hex(color) { cs.set_fill_color(&c); }
                    cs.begin_text();
                    cs.set_font(&font_name, size);
                    cs.text_move(x, 20.0);
                    cs.show_text(text);
                    cs.end_text();
                    cs.restore_state();
                }
            }

            // Render page number
            if let Some(pn) = page_val.get("pageNumber") {
                let enabled = pn.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);
                if enabled {
                    let size = pn.get("fontSize").and_then(|v| v.as_f64()).unwrap_or(10.0);
                    let color = pn.get("color").and_then(|v| v.as_str()).unwrap_or("#666666");
                    let format = pn.get("format").and_then(|v| v.as_str()).unwrap_or("1");
                    let position = pn.get("position").and_then(|v| v.as_str()).unwrap_or("bottom-center");

                    let text = match format {
                        "Page 1" => format!("Page {}", page_num),
                        "1 of N" => format!("{} of {}", page_num, total_pages),
                        "Page 1 of N" => format!("Page {} of {}", page_num, total_pages),
                        _ => format!("{}", page_num),
                    };

                    let is_top = position.starts_with("top");
                    let y = if is_top { height - 20.0 - size } else { 20.0 };
                    let x = if position.ends_with("left") {
                        40.0
                    } else if position.ends_with("right") {
                        width - 40.0 - text.len() as f64 * size * 0.5
                    } else {
                        width / 2.0 - text.len() as f64 * size * 0.25
                    };

                    let cs = doc.page_content(page_idx);
                    cs.save_state();
                    if let Some(c) = Color::from_hex(color) { cs.set_fill_color(&c); }
                    cs.begin_text();
                    cs.set_font(&font_name, size);
                    cs.text_move(x, y);
                    cs.show_text(&text);
                    cs.end_text();
                    cs.restore_state();
                }
            }
        }
    }

    doc.build()
}

fn base64_decode(input: &str) -> Result<Vec<u8>, ()> {
    let table: [u8; 128] = {
        let mut t = [255u8; 128];
        let chars = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        for (i, &c) in chars.iter().enumerate() {
            t[c as usize] = i as u8;
        }
        t
    };
    let filtered: Vec<u8> = input.bytes().filter(|&b| b != b'\n' && b != b'\r' && b != b' ').collect();
    let mut out = Vec::with_capacity(filtered.len() * 3 / 4);
    let mut buf: u32 = 0;
    let mut bits: u32 = 0;
    for &b in &filtered {
        if b == b'=' { break; }
        let val = if (b as usize) < 128 { table[b as usize] } else { 255 };
        if val == 255 { return Err(()); }
        buf = (buf << 6) | val as u32;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }
    Ok(out)
}

fn jpeg_dimensions(data: &[u8]) -> Option<(u32, u32)> {
    if data.len() < 2 || data[0] != 0xFF || data[1] != 0xD8 { return None; }
    let mut i = 2;
    while i < data.len().saturating_sub(1) {
        if data[i] != 0xFF { break; }
        let marker = data[i + 1];
        if marker == 0xC0 || marker == 0xC1 || marker == 0xC2 {
            if i + 8 < data.len() {
                let h = ((data[i + 5] as u32) << 8) | data[i + 6] as u32;
                let w = ((data[i + 7] as u32) << 8) | data[i + 8] as u32;
                return Some((w, h));
            }
        }
        if i + 3 >= data.len() { break; }
        let len = ((data[i + 2] as usize) << 8) | data[i + 3] as usize;
        i += 2 + len;
    }
    None
}

