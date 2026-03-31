/// Color representation with multiple color space support
#[derive(Debug, Clone, PartialEq)]
pub enum Color {
    Rgb(f64, f64, f64),           // 0.0-1.0
    Cmyk(f64, f64, f64, f64),     // 0.0-1.0
    Grayscale(f64),                // 0.0-1.0
}

impl Color {
    /// Parse hex color string: #RGB, #RRGGBB, #RRGGBBAA
    pub fn from_hex(hex: &str) -> Option<Self> {
        let hex = hex.trim_start_matches('#');
        let bytes = match hex.len() {
            3 => {
                let r = u8::from_str_radix(&hex[0..1], 16).ok()? * 17;
                let g = u8::from_str_radix(&hex[1..2], 16).ok()? * 17;
                let b = u8::from_str_radix(&hex[2..3], 16).ok()? * 17;
                (r, g, b)
            }
            6 | 8 => {
                let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
                let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
                let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
                (r, g, b)
            }
            _ => return None,
        };
        Some(Color::Rgb(
            bytes.0 as f64 / 255.0,
            bytes.1 as f64 / 255.0,
            bytes.2 as f64 / 255.0,
        ))
    }

    pub fn from_rgb(r: u8, g: u8, b: u8) -> Self {
        Color::Rgb(r as f64 / 255.0, g as f64 / 255.0, b as f64 / 255.0)
    }

    pub fn from_cmyk(c: f64, m: f64, y: f64, k: f64) -> Self {
        Color::Cmyk(c, m, y, k)
    }

    pub fn from_hsl(h: f64, s: f64, l: f64) -> Self {
        let s = s / 100.0;
        let l = l / 100.0;
        let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
        let x = c * (1.0 - ((h / 60.0) % 2.0 - 1.0).abs());
        let m = l - c / 2.0;
        let (r, g, b) = match h as u32 {
            0..=59 => (c, x, 0.0),
            60..=119 => (x, c, 0.0),
            120..=179 => (0.0, c, x),
            180..=239 => (0.0, x, c),
            240..=299 => (x, 0.0, c),
            _ => (c, 0.0, x),
        };
        Color::Rgb(r + m, g + m, b + m)
    }

    pub fn to_rgb(&self) -> (f64, f64, f64) {
        match self {
            Color::Rgb(r, g, b) => (*r, *g, *b),
            Color::Cmyk(c, m, y, k) => {
                let r = (1.0 - c) * (1.0 - k);
                let g = (1.0 - m) * (1.0 - k);
                let b = (1.0 - y) * (1.0 - k);
                (r, g, b)
            }
            Color::Grayscale(g) => (*g, *g, *g),
        }
    }

    pub fn to_hex(&self) -> String {
        let (r, g, b) = self.to_rgb();
        format!("#{:02X}{:02X}{:02X}",
            (r * 255.0) as u8,
            (g * 255.0) as u8,
            (b * 255.0) as u8,
        )
    }

    pub fn to_cmyk(&self) -> (f64, f64, f64, f64) {
        let (r, g, b) = self.to_rgb();
        let k = 1.0 - r.max(g).max(b);
        if k >= 1.0 {
            return (0.0, 0.0, 0.0, 1.0);
        }
        let c = (1.0 - r - k) / (1.0 - k);
        let m = (1.0 - g - k) / (1.0 - k);
        let y = (1.0 - b - k) / (1.0 - k);
        (c, m, y, k)
    }

    /// Write PDF color-setting operators for stroke
    pub fn write_stroke_op(&self, buf: &mut Vec<u8>) {
        match self {
            Color::Rgb(r, g, b) => {
                let s = format!("{} {} {} RG\n", fmt(*r), fmt(*g), fmt(*b));
                buf.extend_from_slice(s.as_bytes());
            }
            Color::Cmyk(c, m, y, k) => {
                let s = format!("{} {} {} {} K\n", fmt(*c), fmt(*m), fmt(*y), fmt(*k));
                buf.extend_from_slice(s.as_bytes());
            }
            Color::Grayscale(g) => {
                let s = format!("{} G\n", fmt(*g));
                buf.extend_from_slice(s.as_bytes());
            }
        }
    }

    /// Write PDF color-setting operators for fill
    pub fn write_fill_op(&self, buf: &mut Vec<u8>) {
        match self {
            Color::Rgb(r, g, b) => {
                let s = format!("{} {} {} rg\n", fmt(*r), fmt(*g), fmt(*b));
                buf.extend_from_slice(s.as_bytes());
            }
            Color::Cmyk(c, m, y, k) => {
                let s = format!("{} {} {} {} k\n", fmt(*c), fmt(*m), fmt(*y), fmt(*k));
                buf.extend_from_slice(s.as_bytes());
            }
            Color::Grayscale(g) => {
                let s = format!("{} g\n", fmt(*g));
                buf.extend_from_slice(s.as_bytes());
            }
        }
    }

    // Common colors
    pub fn black() -> Self { Color::Grayscale(0.0) }
    pub fn white() -> Self { Color::Grayscale(1.0) }
    pub fn red() -> Self { Color::Rgb(1.0, 0.0, 0.0) }
    pub fn green() -> Self { Color::Rgb(0.0, 1.0, 0.0) }
    pub fn blue() -> Self { Color::Rgb(0.0, 0.0, 1.0) }
    pub fn transparent() -> Self { Color::Rgb(0.0, 0.0, 0.0) } // needs separate opacity
}

fn fmt(v: f64) -> String {
    if v == v.floor() && v.abs() < 1e10 {
        format!("{:.1}", v)
    } else {
        format!("{:.4}", v).trim_end_matches('0').trim_end_matches('.').to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hex_parse() {
        let c = Color::from_hex("#FF0000").unwrap();
        assert_eq!(c, Color::Rgb(1.0, 0.0, 0.0));
    }

    #[test]
    fn test_hex_short() {
        let c = Color::from_hex("#F00").unwrap();
        assert_eq!(c, Color::Rgb(1.0, 0.0, 0.0));
    }

    #[test]
    fn test_to_hex() {
        assert_eq!(Color::red().to_hex(), "#FF0000");
    }
}
