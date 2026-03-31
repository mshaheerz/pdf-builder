use crate::text::rich_text::RichTextSpan;

/// Table cell definition
#[derive(Debug, Clone)]
pub struct TableCell {
    pub content: CellContent,
    pub colspan: u32,
    pub rowspan: u32,
    pub padding: CellPadding,
    pub background: Option<String>,  // hex color
    pub border: CellBorders,
    pub align: CellAlign,
    pub vertical_align: CellVerticalAlign,
}

#[derive(Debug, Clone)]
pub enum CellContent {
    Text(String),
    RichText(Vec<RichTextSpan>),
    Empty,
}

#[derive(Debug, Clone, Copy)]
pub struct CellPadding {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
}

impl Default for CellPadding {
    fn default() -> Self {
        Self { top: 4.0, right: 4.0, bottom: 4.0, left: 4.0 }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CellAlign {
    Left, Center, Right,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CellVerticalAlign {
    Top, Middle, Bottom,
}

#[derive(Debug, Clone)]
pub struct CellBorders {
    pub top: Option<super::border::BorderStyle>,
    pub right: Option<super::border::BorderStyle>,
    pub bottom: Option<super::border::BorderStyle>,
    pub left: Option<super::border::BorderStyle>,
}

impl Default for CellBorders {
    fn default() -> Self {
        Self { top: None, right: None, bottom: None, left: None }
    }
}

impl Default for TableCell {
    fn default() -> Self {
        Self {
            content: CellContent::Empty,
            colspan: 1,
            rowspan: 1,
            padding: CellPadding::default(),
            background: None,
            border: CellBorders::default(),
            align: CellAlign::Left,
            vertical_align: CellVerticalAlign::Top,
        }
    }
}

impl TableCell {
    pub fn text(s: impl Into<String>) -> Self {
        Self {
            content: CellContent::Text(s.into()),
            ..Default::default()
        }
    }

    pub fn with_background(mut self, color: impl Into<String>) -> Self {
        self.background = Some(color.into());
        self
    }

    pub fn with_align(mut self, align: CellAlign) -> Self {
        self.align = align;
        self
    }

    pub fn with_colspan(mut self, n: u32) -> Self {
        self.colspan = n;
        self
    }

    pub fn with_rowspan(mut self, n: u32) -> Self {
        self.rowspan = n;
        self
    }
}
