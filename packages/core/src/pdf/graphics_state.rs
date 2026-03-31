use super::color::Color;

/// Line cap style
#[derive(Debug, Clone, Copy)]
pub enum LineCap {
    Butt = 0,
    Round = 1,
    Square = 2,
}

/// Line join style
#[derive(Debug, Clone, Copy)]
pub enum LineJoin {
    Miter = 0,
    Round = 1,
    Bevel = 2,
}

/// Graphics state for PDF content streams
#[derive(Debug, Clone)]
pub struct GraphicsState {
    pub line_width: f64,
    pub line_cap: LineCap,
    pub line_join: LineJoin,
    pub miter_limit: f64,
    pub dash_array: Vec<f64>,
    pub dash_phase: f64,
    pub stroke_color: Color,
    pub fill_color: Color,
    pub opacity: f64,
    pub stroke_opacity: f64,
}

impl Default for GraphicsState {
    fn default() -> Self {
        Self {
            line_width: 1.0,
            line_cap: LineCap::Butt,
            line_join: LineJoin::Miter,
            miter_limit: 10.0,
            dash_array: Vec::new(),
            dash_phase: 0.0,
            stroke_color: Color::black(),
            fill_color: Color::black(),
            opacity: 1.0,
            stroke_opacity: 1.0,
        }
    }
}

impl GraphicsState {
    pub fn write_to(&self, buf: &mut Vec<u8>) {
        let s = format!("{} w\n", self.line_width);
        buf.extend_from_slice(s.as_bytes());

        let s = format!("{} J\n", self.line_cap as u8);
        buf.extend_from_slice(s.as_bytes());

        let s = format!("{} j\n", self.line_join as u8);
        buf.extend_from_slice(s.as_bytes());

        let s = format!("{} M\n", self.miter_limit);
        buf.extend_from_slice(s.as_bytes());

        if !self.dash_array.is_empty() {
            let parts: Vec<String> = self.dash_array.iter().map(|v| format!("{}", v)).collect();
            let s = format!("[{}] {} d\n", parts.join(" "), self.dash_phase);
            buf.extend_from_slice(s.as_bytes());
        }

        self.stroke_color.write_stroke_op(buf);
        self.fill_color.write_fill_op(buf);
    }
}
