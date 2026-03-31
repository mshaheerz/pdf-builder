/// Rich text span with inline styling
#[derive(Debug, Clone)]
pub struct RichTextSpan {
    pub text: String,
    pub font: Option<String>,
    pub font_size: Option<f64>,
    pub bold: bool,
    pub italic: bool,
    pub underline: bool,
    pub strikethrough: bool,
    pub color: Option<String>,        // hex
    pub background_color: Option<String>,
    pub superscript: bool,
    pub subscript: bool,
}

impl Default for RichTextSpan {
    fn default() -> Self {
        Self {
            text: String::new(),
            font: None,
            font_size: None,
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            color: None,
            background_color: None,
            superscript: false,
            subscript: false,
        }
    }
}

impl RichTextSpan {
    pub fn new(text: impl Into<String>) -> Self {
        Self {
            text: text.into(),
            ..Default::default()
        }
    }

    pub fn bold(mut self) -> Self { self.bold = true; self }
    pub fn italic(mut self) -> Self { self.italic = true; self }
    pub fn underline(mut self) -> Self { self.underline = true; self }
    pub fn strikethrough(mut self) -> Self { self.strikethrough = true; self }
    pub fn color(mut self, hex: impl Into<String>) -> Self { self.color = Some(hex.into()); self }
    pub fn font(mut self, name: impl Into<String>) -> Self { self.font = Some(name.into()); self }
    pub fn size(mut self, s: f64) -> Self { self.font_size = Some(s); self }
}
