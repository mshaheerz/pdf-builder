/// Border style for table cells
#[derive(Debug, Clone)]
pub struct BorderStyle {
    pub width: f64,
    pub color: String,  // hex
    pub style: BorderLineStyle,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BorderLineStyle {
    Solid,
    Dashed,
    Dotted,
    None,
}

impl Default for BorderStyle {
    fn default() -> Self {
        Self {
            width: 0.5,
            color: "#000000".to_string(),
            style: BorderLineStyle::Solid,
        }
    }
}

impl BorderStyle {
    pub fn solid(width: f64, color: impl Into<String>) -> Self {
        Self { width, color: color.into(), style: BorderLineStyle::Solid }
    }

    pub fn dashed(width: f64, color: impl Into<String>) -> Self {
        Self { width, color: color.into(), style: BorderLineStyle::Dashed }
    }

    pub fn dotted(width: f64, color: impl Into<String>) -> Self {
        Self { width, color: color.into(), style: BorderLineStyle::Dotted }
    }

    pub fn none() -> Self {
        Self { width: 0.0, color: "#000000".to_string(), style: BorderLineStyle::None }
    }

    /// Get PDF dash array for this style
    pub fn dash_array(&self) -> Vec<f64> {
        match self.style {
            BorderLineStyle::Solid => vec![],
            BorderLineStyle::Dashed => vec![self.width * 3.0, self.width * 2.0],
            BorderLineStyle::Dotted => vec![self.width, self.width * 2.0],
            BorderLineStyle::None => vec![],
        }
    }
}
