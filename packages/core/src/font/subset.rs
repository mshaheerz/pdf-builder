use super::parser::FontFile;
use std::collections::{HashMap, HashSet, BTreeSet};

/// Font subsetter - extracts only the glyphs used in a document
/// to minimize PDF file size

#[derive(Debug)]
pub struct SubsetResult {
    /// The subsetted font file bytes
    pub data: Vec<u8>,
    /// Mapping from original glyph ID to new glyph ID
    pub glyph_map: HashMap<u16, u16>,
    /// Used unicode codepoints mapped to new glyph IDs
    pub unicode_to_new_gid: HashMap<u32, u16>,
}

/// Subset a font to only include the specified unicode characters
pub fn subset_font(font: &FontFile, chars: &HashSet<char>) -> Result<SubsetResult, String> {
    // Collect needed glyph IDs
    let mut glyph_ids = BTreeSet::new();
    glyph_ids.insert(0u16); // .notdef is always included

    let mut unicode_to_gid = HashMap::new();
    for &ch in chars {
        if let Some(&gid) = font.cmap.unicode_map.get(&(ch as u32)) {
            glyph_ids.insert(gid);
            unicode_to_gid.insert(ch as u32, gid);
        }
    }

    // TODO: resolve composite glyph dependencies (glyf table)

    // Build glyph ID mapping: old -> new
    let mut glyph_map = HashMap::new();
    let mut unicode_to_new_gid = HashMap::new();
    for (new_id, &old_id) in glyph_ids.iter().enumerate() {
        glyph_map.insert(old_id, new_id as u16);
    }
    for (&unicode, &old_gid) in &unicode_to_gid {
        if let Some(&new_gid) = glyph_map.get(&old_gid) {
            unicode_to_new_gid.insert(unicode, new_gid);
        }
    }

    // For now, return the full font data with the mapping
    // Full subsetting (rebuilding font tables) is complex - will be implemented
    // in a future phase. The glyph_map is used for CIDFont width arrays.
    Ok(SubsetResult {
        data: font.data.clone(), // TODO: actual subsetting
        glyph_map,
        unicode_to_new_gid,
    })
}
