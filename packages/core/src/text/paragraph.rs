/// Paragraph styling configuration
#[derive(Debug, Clone)]
pub struct ParagraphStyle {
    pub align: super::layout::TextAlign,
    pub vertical_align: super::layout::VerticalAlign,
    pub line_height_multiplier: f64,
    pub letter_spacing: f64,
    pub word_spacing: f64,
    pub paragraph_spacing_before: f64,
    pub paragraph_spacing_after: f64,
    pub first_line_indent: f64,
}

impl Default for ParagraphStyle {
    fn default() -> Self {
        Self {
            align: super::layout::TextAlign::Left,
            vertical_align: super::layout::VerticalAlign::Top,
            line_height_multiplier: 1.2,
            letter_spacing: 0.0,
            word_spacing: 0.0,
            paragraph_spacing_before: 0.0,
            paragraph_spacing_after: 0.0,
            first_line_indent: 0.0,
        }
    }
}
