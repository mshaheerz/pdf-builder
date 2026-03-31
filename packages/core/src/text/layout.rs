/// Text layout engine - breaks text into lines that fit within a given width

#[derive(Debug, Clone)]
pub struct TextLayout {
    pub lines: Vec<TextLine>,
    pub total_height: f64,
}

#[derive(Debug, Clone)]
pub struct TextLine {
    pub text: String,
    pub width: f64,
    pub y_offset: f64,
    pub spans: Vec<LayoutSpan>,
}

#[derive(Debug, Clone)]
pub struct LayoutSpan {
    pub text: String,
    pub x_offset: f64,
    pub width: f64,
    pub font_name: String,
    pub font_size: f64,
    pub color: String,
    pub bold: bool,
    pub italic: bool,
    pub underline: bool,
    pub strikethrough: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TextAlign {
    Left,
    Center,
    Right,
    Justify,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum VerticalAlign {
    Top,
    Middle,
    Bottom,
}

/// Character width function type
pub type CharWidthFn = dyn Fn(char, &str, f64) -> f64;

/// Layout single-style text into lines
pub fn layout_text(
    text: &str,
    max_width: f64,
    font_size: f64,
    line_height: f64,
    align: TextAlign,
    char_width_fn: &CharWidthFn,
    font_name: &str,
) -> TextLayout {
    let mut lines = Vec::new();
    let mut y = 0.0;

    // Split by explicit newlines first
    for paragraph in text.split('\n') {
        if paragraph.is_empty() {
            lines.push(TextLine {
                text: String::new(),
                width: 0.0,
                y_offset: y,
                spans: Vec::new(),
            });
            y += line_height;
            continue;
        }

        // Word-wrap within paragraph
        let words: Vec<&str> = paragraph.split_whitespace().collect();
        let mut current_line = String::new();
        let mut current_width = 0.0;
        let space_width = char_width_fn(' ', font_name, font_size);

        for word in &words {
            let word_width: f64 = word.chars()
                .map(|c| char_width_fn(c, font_name, font_size))
                .sum();

            let needed = if current_line.is_empty() {
                word_width
            } else {
                space_width + word_width
            };

            if !current_line.is_empty() && current_width + needed > max_width {
                // Emit line
                let line_text = current_line.clone();
                let line_w = current_width;
                lines.push(TextLine {
                    text: line_text.clone(),
                    width: line_w,
                    y_offset: y,
                    spans: vec![LayoutSpan {
                        text: line_text,
                        x_offset: align_offset(line_w, max_width, align),
                        width: line_w,
                        font_name: font_name.to_string(),
                        font_size,
                        color: "#000000".to_string(),
                        bold: false,
                        italic: false,
                        underline: false,
                        strikethrough: false,
                    }],
                });
                y += line_height;
                current_line = word.to_string();
                current_width = word_width;
            } else {
                if !current_line.is_empty() {
                    current_line.push(' ');
                    current_width += space_width;
                }
                current_line.push_str(word);
                current_width += word_width;
            }
        }

        // Last line of paragraph
        if !current_line.is_empty() {
            let line_text = current_line;
            let line_w = current_width;
            lines.push(TextLine {
                text: line_text.clone(),
                width: line_w,
                y_offset: y,
                spans: vec![LayoutSpan {
                    text: line_text,
                    x_offset: align_offset(line_w, max_width, align),
                    width: line_w,
                    font_name: font_name.to_string(),
                    font_size,
                    color: "#000000".to_string(),
                    bold: false,
                    italic: false,
                    underline: false,
                    strikethrough: false,
                }],
            });
            y += line_height;
        }
    }

    TextLayout {
        total_height: y,
        lines,
    }
}

fn align_offset(line_width: f64, max_width: f64, align: TextAlign) -> f64 {
    match align {
        TextAlign::Left | TextAlign::Justify => 0.0,
        TextAlign::Center => (max_width - line_width) / 2.0,
        TextAlign::Right => max_width - line_width,
    }
}
