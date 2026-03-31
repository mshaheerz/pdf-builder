use napi_derive::napi;
use pdf_builder_core::pdf::document::{PdfDocument, DocumentMetadata};
use pdf_builder_core::pdf::page::{PageConfig, PageSize, Orientation, Margins};
use pdf_builder_core::pdf::color::Color;
use pdf_builder_core::font::builtin::BuiltinFont;

#[napi]
pub fn build_pdf_from_json(json: String) -> napi::Result<Vec<u8>> {
    let model: serde_json::Value = serde_json::from_str(&json)
        .map_err(|e| napi::Error::from_reason(format!("Invalid JSON: {}", e)))?;

    let bytes = build_from_model(&model);
    Ok(bytes)
}

#[napi]
pub fn create_simple_pdf(title: String, content: String) -> Vec<u8> {
    let mut doc = PdfDocument::new();
    doc.set_metadata(DocumentMetadata {
        title: Some(title),
        author: None,
        subject: None,
        creator: Some("PDF Builder Node".to_string()),
    });

    let font = doc.add_builtin_font(BuiltinFont::Helvetica);
    let page = doc.add_default_page();
    doc.use_font_on_page(page, &font);

    let cs = doc.page_content(page);
    cs.begin_text();
    cs.set_font(&font, 12.0);
    cs.text_move(72.0, 720.0);
    cs.show_text(&content);
    cs.end_text();

    doc.build()
}

fn build_from_model(model: &serde_json::Value) -> Vec<u8> {
    let mut doc = PdfDocument::new();
    let font_name = doc.add_builtin_font(BuiltinFont::Helvetica);

    if let Some(pages) = model.get("pages").and_then(|p| p.as_array()) {
        for page_val in pages {
            let width = page_val.get("width").and_then(|v| v.as_f64()).unwrap_or(595.0);
            let height = page_val.get("height").and_then(|v| v.as_f64()).unwrap_or(842.0);

            let page_idx = doc.add_page(PageConfig {
                size: PageSize::Custom(width, height),
                orientation: Orientation::Portrait,
                margins: Margins::default(),
            });
            doc.use_font_on_page(page_idx, &font_name);

            if let Some(elements) = page_val.get("elements").and_then(|e| e.as_array()) {
                for elem in elements {
                    let elem_type = elem.get("type").and_then(|t| t.as_str()).unwrap_or("");
                    let x = elem.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let y = elem.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);

                    match elem_type {
                        "text" => {
                            let text = elem.get("content").and_then(|v| v.as_str()).unwrap_or("");
                            let size = elem.get("fontSize").and_then(|v| v.as_f64()).unwrap_or(12.0);
                            let color = elem.get("color").and_then(|v| v.as_str()).unwrap_or("#000000");

                            let cs = doc.page_content(page_idx);
                            cs.save_state();
                            if let Some(c) = Color::from_hex(color) { cs.set_fill_color(&c); }
                            cs.begin_text();
                            cs.set_font(&font_name, size);
                            cs.text_move(x, height - y - size);
                            cs.show_text(text);
                            cs.end_text();
                            cs.restore_state();
                        }
                        "shape" => {
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
                            if !fill.is_empty() { cs.fill_and_stroke(); } else { cs.stroke(); }
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

#[napi]
pub fn get_builtin_fonts() -> Vec<String> {
    vec![
        "Helvetica".to_string(),
        "Helvetica-Bold".to_string(),
        "Helvetica-Oblique".to_string(),
        "Helvetica-BoldOblique".to_string(),
        "Times-Roman".to_string(),
        "Times-Bold".to_string(),
        "Times-Italic".to_string(),
        "Times-BoldItalic".to_string(),
        "Courier".to_string(),
        "Courier-Bold".to_string(),
        "Courier-Oblique".to_string(),
        "Courier-BoldOblique".to_string(),
        "Symbol".to_string(),
        "ZapfDingbats".to_string(),
    ]
}
