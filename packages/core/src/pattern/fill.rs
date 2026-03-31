/// Fill types for shapes and elements
#[derive(Debug, Clone)]
pub enum Fill {
    None,
    Solid(String), // hex color
    LinearGradient(LinearGradient),
    RadialGradient(RadialGradient),
    Pattern(PatternFill),
}

#[derive(Debug, Clone)]
pub struct LinearGradient {
    pub angle: f64, // degrees
    pub stops: Vec<GradientStop>,
}

#[derive(Debug, Clone)]
pub struct RadialGradient {
    pub cx: f64,    // center x (0.0-1.0 relative)
    pub cy: f64,    // center y (0.0-1.0 relative)
    pub r: f64,     // radius (0.0-1.0 relative)
    pub stops: Vec<GradientStop>,
}

#[derive(Debug, Clone)]
pub struct GradientStop {
    pub offset: f64,  // 0.0-1.0
    pub color: String, // hex
}

#[derive(Debug, Clone)]
pub struct PatternFill {
    pub pattern_type: PatternType,
    pub color: String,        // foreground hex
    pub background: String,   // background hex
    pub scale: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PatternType {
    Dots,
    HorizontalStripes,
    VerticalStripes,
    DiagonalStripes,
    CrossHatch,
    Checkerboard,
}

impl Default for Fill {
    fn default() -> Self {
        Fill::None
    }
}
