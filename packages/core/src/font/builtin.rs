/// The 14 standard PDF fonts (always available, no embedding needed)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BuiltinFont {
    Helvetica,
    HelveticaBold,
    HelveticaOblique,
    HelveticaBoldOblique,
    TimesRoman,
    TimesBold,
    TimesItalic,
    TimesBoldItalic,
    Courier,
    CourierBold,
    CourierOblique,
    CourierBoldOblique,
    Symbol,
    ZapfDingbats,
}

pub const BUILTIN_FONTS: &[BuiltinFont] = &[
    BuiltinFont::Helvetica,
    BuiltinFont::HelveticaBold,
    BuiltinFont::HelveticaOblique,
    BuiltinFont::HelveticaBoldOblique,
    BuiltinFont::TimesRoman,
    BuiltinFont::TimesBold,
    BuiltinFont::TimesItalic,
    BuiltinFont::TimesBoldItalic,
    BuiltinFont::Courier,
    BuiltinFont::CourierBold,
    BuiltinFont::CourierOblique,
    BuiltinFont::CourierBoldOblique,
    BuiltinFont::Symbol,
    BuiltinFont::ZapfDingbats,
];

impl BuiltinFont {
    pub fn pdf_name(&self) -> &'static str {
        match self {
            Self::Helvetica => "Helvetica",
            Self::HelveticaBold => "Helvetica-Bold",
            Self::HelveticaOblique => "Helvetica-Oblique",
            Self::HelveticaBoldOblique => "Helvetica-BoldOblique",
            Self::TimesRoman => "Times-Roman",
            Self::TimesBold => "Times-Bold",
            Self::TimesItalic => "Times-Italic",
            Self::TimesBoldItalic => "Times-BoldItalic",
            Self::Courier => "Courier",
            Self::CourierBold => "Courier-Bold",
            Self::CourierOblique => "Courier-Oblique",
            Self::CourierBoldOblique => "Courier-BoldOblique",
            Self::Symbol => "Symbol",
            Self::ZapfDingbats => "ZapfDingbats",
        }
    }

    pub fn needs_encoding(&self) -> bool {
        !matches!(self, Self::Symbol | Self::ZapfDingbats)
    }

    /// Approximate glyph width for standard fonts (in 1/1000 of font size)
    /// Returns width for ASCII characters; defaults to 600 for unknown
    pub fn char_width(&self, ch: char) -> u16 {
        if !ch.is_ascii() {
            return 600;
        }
        match self {
            Self::Courier | Self::CourierBold | Self::CourierOblique | Self::CourierBoldOblique => 600,
            Self::Helvetica | Self::HelveticaOblique => {
                helvetica_width(ch as u8)
            }
            Self::HelveticaBold | Self::HelveticaBoldOblique => {
                helvetica_bold_width(ch as u8)
            }
            _ => 500, // rough estimate for Times
        }
    }

    /// Calculate string width in points
    pub fn string_width(&self, s: &str, font_size: f64) -> f64 {
        let total: u32 = s.chars().map(|c| self.char_width(c) as u32).sum();
        total as f64 * font_size / 1000.0
    }
}

fn helvetica_width(c: u8) -> u16 {
    match c {
        b' ' => 278, b'!' => 278, b'"' => 355, b'#' => 556, b'$' => 556,
        b'%' => 889, b'&' => 667, b'\'' => 191, b'(' => 333, b')' => 333,
        b'*' => 389, b'+' => 584, b',' => 278, b'-' => 333, b'.' => 278,
        b'/' => 278, b'0'..=b'9' => 556, b':' => 278, b';' => 278,
        b'<' => 584, b'=' => 584, b'>' => 584, b'?' => 556,
        b'@' => 1015,
        b'A' => 667, b'B' => 667, b'C' => 722, b'D' => 722, b'E' => 611,
        b'F' => 556, b'G' => 778, b'H' => 722, b'I' => 278, b'J' => 500,
        b'K' => 667, b'L' => 556, b'M' => 833, b'N' => 722, b'O' => 778,
        b'P' => 667, b'Q' => 778, b'R' => 722, b'S' => 667, b'T' => 611,
        b'U' => 722, b'V' => 667, b'W' => 944, b'X' => 667, b'Y' => 667,
        b'Z' => 611,
        b'[' => 278, b'\\' => 278, b']' => 278, b'^' => 469, b'_' => 556,
        b'`' => 333,
        b'a' => 556, b'b' => 556, b'c' => 500, b'd' => 556, b'e' => 556,
        b'f' => 278, b'g' => 556, b'h' => 556, b'i' => 222, b'j' => 222,
        b'k' => 500, b'l' => 222, b'm' => 833, b'n' => 556, b'o' => 556,
        b'p' => 556, b'q' => 556, b'r' => 333, b's' => 500, b't' => 278,
        b'u' => 556, b'v' => 500, b'w' => 722, b'x' => 500, b'y' => 500,
        b'z' => 500,
        b'{' => 334, b'|' => 260, b'}' => 334, b'~' => 584,
        _ => 556,
    }
}

fn helvetica_bold_width(c: u8) -> u16 {
    match c {
        b' ' => 278, b'!' => 333, b'"' => 474, b'#' => 556, b'$' => 556,
        b'%' => 889, b'&' => 722, b'\'' => 238, b'(' => 333, b')' => 333,
        b'*' => 389, b'+' => 584, b',' => 278, b'-' => 333, b'.' => 278,
        b'/' => 278, b'0'..=b'9' => 556, b':' => 333, b';' => 333,
        b'A' => 722, b'B' => 722, b'C' => 722, b'D' => 722, b'E' => 667,
        b'F' => 611, b'G' => 778, b'H' => 722, b'I' => 278, b'J' => 556,
        b'K' => 722, b'L' => 611, b'M' => 833, b'N' => 722, b'O' => 778,
        b'P' => 667, b'Q' => 778, b'R' => 722, b'S' => 667, b'T' => 611,
        b'U' => 722, b'V' => 667, b'W' => 944, b'X' => 667, b'Y' => 667,
        b'Z' => 611,
        b'a' => 556, b'b' => 611, b'c' => 556, b'd' => 611, b'e' => 556,
        b'f' => 333, b'g' => 611, b'h' => 611, b'i' => 278, b'j' => 278,
        b'k' => 556, b'l' => 278, b'm' => 889, b'n' => 611, b'o' => 611,
        b'p' => 611, b'q' => 611, b'r' => 389, b's' => 556, b't' => 333,
        b'u' => 611, b'v' => 556, b'w' => 778, b'x' => 556, b'y' => 556,
        b'z' => 500,
        _ => 556,
    }
}
