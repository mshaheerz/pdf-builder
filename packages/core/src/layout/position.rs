/// Positioning modes for elements
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PositionMode {
    /// Flows with document content
    Relative,
    /// Fixed position on page (x, y from page origin)
    Absolute,
    /// Fixed relative to viewport (for headers/footers)
    Fixed,
}

#[derive(Debug, Clone, Copy)]
pub struct Position {
    pub mode: PositionMode,
    pub x: f64,
    pub y: f64,
    pub z_index: i32,
}

impl Default for Position {
    fn default() -> Self {
        Self {
            mode: PositionMode::Relative,
            x: 0.0,
            y: 0.0,
            z_index: 0,
        }
    }
}
