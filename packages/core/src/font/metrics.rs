use super::parser::FontFile;

/// Font metrics for layout calculations
#[derive(Debug, Clone)]
pub struct FontMetrics {
    pub units_per_em: u16,
    pub ascender: i16,
    pub descender: i16,
    pub line_gap: i16,
    pub cap_height: i16,
    pub x_height: i16,
    pub italic_angle: f64,
    pub is_fixed_pitch: bool,
    pub bbox: (i16, i16, i16, i16),
}

impl FontMetrics {
    pub fn from_font(font: &FontFile) -> Self {
        let (ascender, descender, line_gap) = if let Some(ref os2) = font.os2 {
            (os2.typo_ascender, os2.typo_descender, os2.typo_line_gap)
        } else {
            (font.hhea.ascender, font.hhea.descender, font.hhea.line_gap)
        };

        let (cap_height, x_height) = if let Some(ref os2) = font.os2 {
            (os2.cap_height, os2.x_height)
        } else {
            (ascender, (ascender as f64 * 0.7) as i16)
        };

        Self {
            units_per_em: font.head.units_per_em,
            ascender,
            descender,
            line_gap,
            cap_height,
            x_height,
            italic_angle: font.post.italic_angle,
            is_fixed_pitch: font.post.is_fixed_pitch,
            bbox: (font.head.x_min, font.head.y_min, font.head.x_max, font.head.y_max),
        }
    }

    /// Get glyph advance width in font units
    pub fn glyph_width(&self, font: &FontFile, glyph_id: u16) -> u16 {
        if (glyph_id as usize) < font.hmtx.len() {
            font.hmtx[glyph_id as usize].advance_width
        } else {
            font.hmtx.last().map(|m| m.advance_width).unwrap_or(0)
        }
    }

    /// Get character width in font units using cmap
    pub fn char_width(&self, font: &FontFile, ch: char) -> u16 {
        if let Some(&gid) = font.cmap.unicode_map.get(&(ch as u32)) {
            self.glyph_width(font, gid)
        } else {
            0
        }
    }

    /// Calculate string width in points
    pub fn string_width(&self, font: &FontFile, text: &str, font_size: f64) -> f64 {
        let total: u32 = text.chars()
            .map(|c| self.char_width(font, c) as u32)
            .sum();
        total as f64 * font_size / self.units_per_em as f64
    }

    /// Line height in points for a given font size
    pub fn line_height(&self, font_size: f64) -> f64 {
        let h = (self.ascender - self.descender + self.line_gap) as f64;
        h * font_size / self.units_per_em as f64
    }

    /// Ascender in points
    pub fn ascender_pt(&self, font_size: f64) -> f64 {
        self.ascender as f64 * font_size / self.units_per_em as f64
    }

    /// Descender in points (negative)
    pub fn descender_pt(&self, font_size: f64) -> f64 {
        self.descender as f64 * font_size / self.units_per_em as f64
    }
}
