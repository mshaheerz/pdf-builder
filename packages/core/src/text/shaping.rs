/// Basic text shaping support
/// Handles script detection and basic bidi (bidirectional) text

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ScriptDirection {
    LeftToRight,
    RightToLeft,
}

/// Detect the primary direction of a string
pub fn detect_direction(text: &str) -> ScriptDirection {
    for ch in text.chars() {
        if is_rtl_char(ch) {
            return ScriptDirection::RightToLeft;
        }
        if ch.is_alphabetic() {
            return ScriptDirection::LeftToRight;
        }
    }
    ScriptDirection::LeftToRight
}

fn is_rtl_char(ch: char) -> bool {
    let cp = ch as u32;
    // Arabic
    (0x0600..=0x06FF).contains(&cp) ||
    (0x0750..=0x077F).contains(&cp) ||
    (0x08A0..=0x08FF).contains(&cp) ||
    (0xFB50..=0xFDFF).contains(&cp) ||
    (0xFE70..=0xFEFF).contains(&cp) ||
    // Hebrew
    (0x0590..=0x05FF).contains(&cp) ||
    (0xFB1D..=0xFB4F).contains(&cp)
}

/// Split text into runs of the same direction
pub fn bidi_runs(text: &str) -> Vec<(String, ScriptDirection)> {
    let mut runs = Vec::new();
    let mut current = String::new();
    let mut current_dir = None;

    for ch in text.chars() {
        let dir = if is_rtl_char(ch) {
            ScriptDirection::RightToLeft
        } else if ch.is_alphabetic() || ch.is_numeric() {
            ScriptDirection::LeftToRight
        } else {
            current_dir.unwrap_or(ScriptDirection::LeftToRight)
        };

        if current_dir.is_some() && current_dir != Some(dir) {
            runs.push((current.clone(), current_dir.unwrap()));
            current.clear();
        }
        current.push(ch);
        current_dir = Some(dir);
    }

    if !current.is_empty() {
        runs.push((current, current_dir.unwrap_or(ScriptDirection::LeftToRight)));
    }

    runs
}
