use super::color::Color;
use super::graphics_state::{GraphicsState, LineCap, LineJoin};

/// Builder for PDF content streams (page graphics operators)
#[derive(Debug, Default)]
pub struct ContentStream {
    pub data: Vec<u8>,
}

impl ContentStream {
    pub fn new() -> Self {
        Self { data: Vec::new() }
    }

    fn op(&mut self, s: &str) {
        self.data.extend_from_slice(s.as_bytes());
        self.data.push(b'\n');
    }

    // --- Graphics State ---

    pub fn save_state(&mut self) {
        self.op("q");
    }

    pub fn restore_state(&mut self) {
        self.op("Q");
    }

    pub fn set_line_width(&mut self, w: f64) {
        self.op(&format!("{} w", fv(w)));
    }

    pub fn set_line_cap(&mut self, cap: LineCap) {
        self.op(&format!("{} J", cap as u8));
    }

    pub fn set_line_join(&mut self, join: LineJoin) {
        self.op(&format!("{} j", join as u8));
    }

    pub fn set_miter_limit(&mut self, ml: f64) {
        self.op(&format!("{} M", fv(ml)));
    }

    pub fn set_dash(&mut self, array: &[f64], phase: f64) {
        let parts: Vec<String> = array.iter().map(|v| fv(*v)).collect();
        self.op(&format!("[{}] {} d", parts.join(" "), fv(phase)));
    }

    pub fn set_stroke_color(&mut self, color: &Color) {
        let mut buf = Vec::new();
        color.write_stroke_op(&mut buf);
        self.data.extend_from_slice(&buf);
    }

    pub fn set_fill_color(&mut self, color: &Color) {
        let mut buf = Vec::new();
        color.write_fill_op(&mut buf);
        self.data.extend_from_slice(&buf);
    }

    pub fn apply_state(&mut self, state: &GraphicsState) {
        state.write_to(&mut self.data);
    }

    // --- CTM (Coordinate Transform Matrix) ---

    /// Set transform matrix: [a b c d e f]
    pub fn set_transform(&mut self, a: f64, b: f64, c: f64, d: f64, e: f64, f_val: f64) {
        self.op(&format!("{} {} {} {} {} {} cm",
            fv(a), fv(b), fv(c), fv(d), fv(e), fv(f_val)));
    }

    pub fn translate(&mut self, tx: f64, ty: f64) {
        self.set_transform(1.0, 0.0, 0.0, 1.0, tx, ty);
    }

    pub fn scale(&mut self, sx: f64, sy: f64) {
        self.set_transform(sx, 0.0, 0.0, sy, 0.0, 0.0);
    }

    pub fn rotate(&mut self, angle_deg: f64) {
        let rad = angle_deg * std::f64::consts::PI / 180.0;
        let cos = rad.cos();
        let sin = rad.sin();
        self.set_transform(cos, sin, -sin, cos, 0.0, 0.0);
    }

    // --- Path Construction ---

    pub fn move_to(&mut self, x: f64, y: f64) {
        self.op(&format!("{} {} m", fv(x), fv(y)));
    }

    pub fn line_to(&mut self, x: f64, y: f64) {
        self.op(&format!("{} {} l", fv(x), fv(y)));
    }

    /// Cubic Bézier curve
    pub fn curve_to(&mut self, x1: f64, y1: f64, x2: f64, y2: f64, x3: f64, y3: f64) {
        self.op(&format!("{} {} {} {} {} {} c",
            fv(x1), fv(y1), fv(x2), fv(y2), fv(x3), fv(y3)));
    }

    /// Curve with first control point = current point
    pub fn curve_to_v(&mut self, x2: f64, y2: f64, x3: f64, y3: f64) {
        self.op(&format!("{} {} {} {} v", fv(x2), fv(y2), fv(x3), fv(y3)));
    }

    /// Curve with last control point = endpoint
    pub fn curve_to_y(&mut self, x1: f64, y1: f64, x3: f64, y3: f64) {
        self.op(&format!("{} {} {} {} y", fv(x1), fv(y1), fv(x3), fv(y3)));
    }

    pub fn close_path(&mut self) {
        self.op("h");
    }

    /// Rectangle shorthand
    pub fn rect(&mut self, x: f64, y: f64, w: f64, h: f64) {
        self.op(&format!("{} {} {} {} re", fv(x), fv(y), fv(w), fv(h)));
    }

    // --- Path Painting ---

    pub fn stroke(&mut self) {
        self.op("S");
    }

    pub fn close_and_stroke(&mut self) {
        self.op("s");
    }

    pub fn fill(&mut self) {
        self.op("f");
    }

    pub fn fill_even_odd(&mut self) {
        self.op("f*");
    }

    pub fn fill_and_stroke(&mut self) {
        self.op("B");
    }

    pub fn fill_and_stroke_even_odd(&mut self) {
        self.op("B*");
    }

    pub fn end_path(&mut self) {
        self.op("n");
    }

    // --- Clipping ---

    pub fn clip(&mut self) {
        self.op("W");
    }

    pub fn clip_even_odd(&mut self) {
        self.op("W*");
    }

    // --- Text ---

    pub fn begin_text(&mut self) {
        self.op("BT");
    }

    pub fn end_text(&mut self) {
        self.op("ET");
    }

    /// Set font and size: /FontName size Tf
    pub fn set_font(&mut self, font_name: &str, size: f64) {
        self.op(&format!("/{} {} Tf", font_name, fv(size)));
    }

    /// Move text position
    pub fn text_move(&mut self, tx: f64, ty: f64) {
        self.op(&format!("{} {} Td", fv(tx), fv(ty)));
    }

    /// Set text leading (line spacing)
    pub fn set_text_leading(&mut self, leading: f64) {
        self.op(&format!("{} TL", fv(leading)));
    }

    /// Move to next line (uses TL)
    pub fn text_next_line(&mut self) {
        self.op("T*");
    }

    /// Show text string
    pub fn show_text(&mut self, text: &str) {
        // Escape special characters in PDF string
        let mut escaped = String::new();
        for ch in text.chars() {
            match ch {
                '(' => escaped.push_str("\\("),
                ')' => escaped.push_str("\\)"),
                '\\' => escaped.push_str("\\\\"),
                _ => escaped.push(ch),
            }
        }
        self.op(&format!("({}) Tj", escaped));
    }

    /// Show text with individual character positioning
    pub fn show_text_positioned(&mut self, elements: &[(String, f64)]) {
        let mut parts = Vec::new();
        for (text, offset) in elements {
            if *offset != 0.0 {
                parts.push(format!("{}", fv(*offset)));
            }
            let mut escaped = String::new();
            for ch in text.chars() {
                match ch {
                    '(' => escaped.push_str("\\("),
                    ')' => escaped.push_str("\\)"),
                    '\\' => escaped.push_str("\\\\"),
                    _ => escaped.push(ch),
                }
            }
            parts.push(format!("({})", escaped));
        }
        self.op(&format!("[{}] TJ", parts.join(" ")));
    }

    /// Set character spacing
    pub fn set_char_spacing(&mut self, spacing: f64) {
        self.op(&format!("{} Tc", fv(spacing)));
    }

    /// Set word spacing
    pub fn set_word_spacing(&mut self, spacing: f64) {
        self.op(&format!("{} Tw", fv(spacing)));
    }

    /// Set text rendering mode
    pub fn set_text_render_mode(&mut self, mode: u8) {
        self.op(&format!("{} Tr", mode));
    }

    /// Set text rise (superscript/subscript)
    pub fn set_text_rise(&mut self, rise: f64) {
        self.op(&format!("{} Ts", fv(rise)));
    }

    /// Set text matrix
    pub fn set_text_matrix(&mut self, a: f64, b: f64, c: f64, d: f64, e: f64, f_val: f64) {
        self.op(&format!("{} {} {} {} {} {} Tm",
            fv(a), fv(b), fv(c), fv(d), fv(e), fv(f_val)));
    }

    // --- XObject (Images) ---

    pub fn draw_xobject(&mut self, name: &str) {
        self.op(&format!("/{} Do", name));
    }

    // --- Extended Graphics State ---

    pub fn set_ext_graphics_state(&mut self, name: &str) {
        self.op(&format!("/{} gs", name));
    }

    // --- Helpers ---

    /// Draw a rounded rectangle using Bézier curves
    pub fn rounded_rect(&mut self, x: f64, y: f64, w: f64, h: f64, r: f64) {
        let r = r.min(w / 2.0).min(h / 2.0);
        let k = 0.5522847498; // magic number for circular arcs with cubics
        let kr = k * r;

        self.move_to(x + r, y);
        self.line_to(x + w - r, y);
        self.curve_to(x + w - r + kr, y, x + w, y + r - kr, x + w, y + r);
        self.line_to(x + w, y + h - r);
        self.curve_to(x + w, y + h - r + kr, x + w - r + kr, y + h, x + w - r, y + h);
        self.line_to(x + r, y + h);
        self.curve_to(x + r - kr, y + h, x, y + h - r + kr, x, y + h - r);
        self.line_to(x, y + r);
        self.curve_to(x, y + r - kr, x + r - kr, y, x + r, y);
        self.close_path();
    }

    /// Draw a circle
    pub fn circle(&mut self, cx: f64, cy: f64, r: f64) {
        self.ellipse(cx, cy, r, r);
    }

    /// Draw an ellipse using 4 Bézier curves
    pub fn ellipse(&mut self, cx: f64, cy: f64, rx: f64, ry: f64) {
        let k = 0.5522847498;
        let kx = k * rx;
        let ky = k * ry;

        self.move_to(cx + rx, cy);
        self.curve_to(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry);
        self.curve_to(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy);
        self.curve_to(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry);
        self.curve_to(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy);
        self.close_path();
    }

    /// Draw a regular polygon
    pub fn polygon(&mut self, cx: f64, cy: f64, r: f64, sides: u32) {
        for i in 0..sides {
            let angle = (i as f64) * 2.0 * std::f64::consts::PI / (sides as f64) - std::f64::consts::PI / 2.0;
            let x = cx + r * angle.cos();
            let y = cy + r * angle.sin();
            if i == 0 {
                self.move_to(x, y);
            } else {
                self.line_to(x, y);
            }
        }
        self.close_path();
    }

    /// Draw a star
    pub fn star(&mut self, cx: f64, cy: f64, outer_r: f64, inner_r: f64, points: u32) {
        let total = points * 2;
        for i in 0..total {
            let angle = (i as f64) * std::f64::consts::PI / (points as f64) - std::f64::consts::PI / 2.0;
            let r = if i % 2 == 0 { outer_r } else { inner_r };
            let x = cx + r * angle.cos();
            let y = cy + r * angle.sin();
            if i == 0 {
                self.move_to(x, y);
            } else {
                self.line_to(x, y);
            }
        }
        self.close_path();
    }

    /// Draw an arrow from (x1,y1) to (x2,y2)
    pub fn arrow(&mut self, x1: f64, y1: f64, x2: f64, y2: f64, head_len: f64, head_angle: f64) {
        self.move_to(x1, y1);
        self.line_to(x2, y2);

        let angle = (y2 - y1).atan2(x2 - x1);
        let a1 = angle + std::f64::consts::PI + head_angle;
        let a2 = angle + std::f64::consts::PI - head_angle;

        self.move_to(x2, y2);
        self.line_to(x2 + head_len * a1.cos(), y2 + head_len * a1.sin());
        self.move_to(x2, y2);
        self.line_to(x2 + head_len * a2.cos(), y2 + head_len * a2.sin());
    }

    pub fn into_bytes(self) -> Vec<u8> {
        self.data
    }
}

fn fv(v: f64) -> String {
    if v == v.floor() && v.abs() < 1e10 {
        format!("{:.0}", v)
    } else {
        let s = format!("{:.4}", v);
        s.trim_end_matches('0').trim_end_matches('.').to_string()
    }
}
