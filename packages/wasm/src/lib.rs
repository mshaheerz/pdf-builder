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

        for page_val in pages {
            let width = page_val.get("width").and_then(|v| v.as_f64()).unwrap_or(595.0);
            let height = page_val.get("height").and_then(|v| v.as_f64()).unwrap_or(842.0);

            let page_idx = doc.add_page(PageConfig {
                size: PageSize::Custom(width, height),
                orientation: Orientation::Portrait,
                margins: Margins::default(),
            });

            doc.use_font_on_page(page_idx, &font_name);

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

                            let cs = doc.page_content(page_idx);
                            cs.save_state();
                            if let Some(c) = Color::from_hex(color) {
                                cs.set_fill_color(&c);
                            }
                            cs.begin_text();
                            cs.set_font(&font_name, size);
                            cs.text_move(x, height - y - size);
                            cs.show_text(text);
                            cs.end_text();
                            cs.restore_state();
                        }
                        "shape" => {
                            let x = elem.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let y = elem.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let w = elem.get("width").and_then(|v| v.as_f64()).unwrap_or(100.0);
                            let h = elem.get("height").and_then(|v| v.as_f64()).unwrap_or(100.0);
                            let fill = elem.get("fill").and_then(|v| v.as_str()).unwrap_or("");
                            let stroke = elem.get("stroke").and_then(|v| v.as_str()).unwrap_or("#000000");

                            let cs = doc.page_content(page_idx);
                            cs.save_state();
                            if !fill.is_empty() {
                                if let Some(c) = Color::from_hex(fill) { cs.set_fill_color(&c); }
                            }
                            if let Some(c) = Color::from_hex(stroke) { cs.set_stroke_color(&c); }
                            cs.set_line_width(1.0);
                            cs.rect(x, height - y - h, w, h);
                            if !fill.is_empty() {
                                cs.fill_and_stroke();
                            } else {
                                cs.stroke();
                            }
                            cs.restore_state();
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    doc.build()
}
