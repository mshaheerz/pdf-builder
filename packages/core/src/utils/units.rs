/// Unit conversion utilities
/// PDF uses points (1 pt = 1/72 inch)

pub const PT_PER_INCH: f64 = 72.0;
pub const PT_PER_MM: f64 = 72.0 / 25.4;
pub const PT_PER_CM: f64 = 72.0 / 2.54;
pub const PT_PER_PX: f64 = 72.0 / 96.0; // at 96 DPI

pub fn mm_to_pt(mm: f64) -> f64 { mm * PT_PER_MM }
pub fn pt_to_mm(pt: f64) -> f64 { pt / PT_PER_MM }
pub fn inch_to_pt(inch: f64) -> f64 { inch * PT_PER_INCH }
pub fn pt_to_inch(pt: f64) -> f64 { pt / PT_PER_INCH }
pub fn cm_to_pt(cm: f64) -> f64 { cm * PT_PER_CM }
pub fn pt_to_cm(pt: f64) -> f64 { pt / PT_PER_CM }
pub fn px_to_pt(px: f64) -> f64 { px * PT_PER_PX }
pub fn pt_to_px(pt: f64) -> f64 { pt / PT_PER_PX }
pub fn px_to_pt_at_dpi(px: f64, dpi: f64) -> f64 { px * 72.0 / dpi }
