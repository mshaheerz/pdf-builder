use super::fill::PatternType;
use crate::pdf::objects::{ObjectId, PdfObject, PdfDict, PdfStream};
use crate::pdf::writer::PdfWriter;
use crate::pdf::color::Color;

/// Create a tiling pattern PDF object
pub fn create_tiling_pattern(
    writer: &mut PdfWriter,
    pattern_type: PatternType,
    fg_color: &str,
    bg_color: &str,
    scale: f64,
) -> ObjectId {
    let cell_size = 10.0 * scale;

    // Generate pattern content stream
    let content = match pattern_type {
        PatternType::Dots => generate_dots_pattern(cell_size, fg_color, bg_color),
        PatternType::HorizontalStripes => generate_h_stripes_pattern(cell_size, fg_color, bg_color),
        PatternType::VerticalStripes => generate_v_stripes_pattern(cell_size, fg_color, bg_color),
        PatternType::DiagonalStripes => generate_diag_stripes_pattern(cell_size, fg_color, bg_color),
        PatternType::CrossHatch => generate_crosshatch_pattern(cell_size, fg_color, bg_color),
        PatternType::Checkerboard => generate_checkerboard_pattern(cell_size, fg_color, bg_color),
    };

    let mut dict = PdfDict::new();
    dict.set("Type", PdfObject::name("Pattern"));
    dict.set("PatternType", PdfObject::int(1)); // Tiling
    dict.set("PaintType", PdfObject::int(1));   // Colored
    dict.set("TilingType", PdfObject::int(1));  // Constant spacing
    dict.set("BBox", PdfObject::array(vec![
        PdfObject::real(0.0), PdfObject::real(0.0),
        PdfObject::real(cell_size), PdfObject::real(cell_size),
    ]));
    dict.set("XStep", PdfObject::real(cell_size));
    dict.set("YStep", PdfObject::real(cell_size));
    dict.set("Length", PdfObject::int(content.len() as i64));

    let mut resources = PdfDict::new();
    resources.set("ProcSet", PdfObject::array(vec![PdfObject::name("PDF")]));
    dict.set("Resources", PdfObject::dict(resources));

    writer.add(PdfObject::Stream(PdfStream { dict, data: content }))
}

fn generate_dots_pattern(size: f64, fg: &str, bg: &str) -> Vec<u8> {
    let mut s = String::new();
    // Background
    if let Some(c) = Color::from_hex(bg) {
        let (r, g, b) = c.to_rgb();
        s.push_str(&format!("{} {} {} rg\n0 0 {} {} re\nf\n", r, g, b, size, size));
    }
    // Dot
    if let Some(c) = Color::from_hex(fg) {
        let (r, g, b) = c.to_rgb();
        let cx = size / 2.0;
        let cy = size / 2.0;
        let radius = size * 0.2;
        let k = 0.5522847498 * radius;
        s.push_str(&format!("{} {} {} rg\n", r, g, b));
        s.push_str(&format!("{} {} m\n", cx + radius, cy));
        s.push_str(&format!("{} {} {} {} {} {} c\n", cx + radius, cy + k, cx + k, cy + radius, cx, cy + radius));
        s.push_str(&format!("{} {} {} {} {} {} c\n", cx - k, cy + radius, cx - radius, cy + k, cx - radius, cy));
        s.push_str(&format!("{} {} {} {} {} {} c\n", cx - radius, cy - k, cx - k, cy - radius, cx, cy - radius));
        s.push_str(&format!("{} {} {} {} {} {} c\n", cx + k, cy - radius, cx + radius, cy - k, cx + radius, cy));
        s.push_str("f\n");
    }
    s.into_bytes()
}

fn generate_h_stripes_pattern(size: f64, fg: &str, bg: &str) -> Vec<u8> {
    let mut s = String::new();
    if let Some(c) = Color::from_hex(bg) {
        let (r, g, b) = c.to_rgb();
        s.push_str(&format!("{} {} {} rg\n0 0 {} {} re\nf\n", r, g, b, size, size));
    }
    if let Some(c) = Color::from_hex(fg) {
        let (r, g, b) = c.to_rgb();
        s.push_str(&format!("{} {} {} rg\n0 0 {} {} re\nf\n", r, g, b, size, size / 2.0));
    }
    s.into_bytes()
}

fn generate_v_stripes_pattern(size: f64, fg: &str, bg: &str) -> Vec<u8> {
    let mut s = String::new();
    if let Some(c) = Color::from_hex(bg) {
        let (r, g, b) = c.to_rgb();
        s.push_str(&format!("{} {} {} rg\n0 0 {} {} re\nf\n", r, g, b, size, size));
    }
    if let Some(c) = Color::from_hex(fg) {
        let (r, g, b) = c.to_rgb();
        s.push_str(&format!("{} {} {} rg\n0 0 {} {} re\nf\n", r, g, b, size / 2.0, size));
    }
    s.into_bytes()
}

fn generate_diag_stripes_pattern(size: f64, fg: &str, bg: &str) -> Vec<u8> {
    let mut s = String::new();
    if let Some(c) = Color::from_hex(bg) {
        let (r, g, b) = c.to_rgb();
        s.push_str(&format!("{} {} {} rg\n0 0 {} {} re\nf\n", r, g, b, size, size));
    }
    if let Some(c) = Color::from_hex(fg) {
        let (r, g, b) = c.to_rgb();
        let w = size * 0.2;
        s.push_str(&format!("{} {} {} RG\n{} w\n", r, g, b, w));
        s.push_str(&format!("0 0 m\n{} {} l\nS\n", size, size));
    }
    s.into_bytes()
}

fn generate_crosshatch_pattern(size: f64, fg: &str, bg: &str) -> Vec<u8> {
    let mut s = String::new();
    if let Some(c) = Color::from_hex(bg) {
        let (r, g, b) = c.to_rgb();
        s.push_str(&format!("{} {} {} rg\n0 0 {} {} re\nf\n", r, g, b, size, size));
    }
    if let Some(c) = Color::from_hex(fg) {
        let (r, g, b) = c.to_rgb();
        let w = size * 0.1;
        s.push_str(&format!("{} {} {} RG\n{} w\n", r, g, b, w));
        let mid = size / 2.0;
        s.push_str(&format!("0 {} m\n{} {} l\nS\n", mid, size, mid));
        s.push_str(&format!("{} 0 m\n{} {} l\nS\n", mid, mid, size));
    }
    s.into_bytes()
}

fn generate_checkerboard_pattern(size: f64, fg: &str, bg: &str) -> Vec<u8> {
    let mut s = String::new();
    let half = size / 2.0;
    if let Some(c) = Color::from_hex(bg) {
        let (r, g, b) = c.to_rgb();
        s.push_str(&format!("{} {} {} rg\n0 0 {} {} re\nf\n", r, g, b, size, size));
    }
    if let Some(c) = Color::from_hex(fg) {
        let (r, g, b) = c.to_rgb();
        s.push_str(&format!("{} {} {} rg\n", r, g, b));
        s.push_str(&format!("0 0 {} {} re\nf\n", half, half));
        s.push_str(&format!("{} {} {} {} re\nf\n", half, half, half, half));
    }
    s.into_bytes()
}
