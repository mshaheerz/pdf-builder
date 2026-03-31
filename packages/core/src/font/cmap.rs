use std::collections::HashMap;

/// Generate a ToUnicode CMap for PDF text extraction
/// Maps glyph IDs (CIDs) back to Unicode codepoints
pub fn generate_tounicode_cmap(unicode_to_gid: &HashMap<u32, u16>) -> Vec<u8> {
    let mut gid_to_unicode: HashMap<u16, u32> = HashMap::new();
    for (&unicode, &gid) in unicode_to_gid {
        gid_to_unicode.insert(gid, unicode);
    }

    let mut entries: Vec<(u16, u32)> = gid_to_unicode.into_iter().collect();
    entries.sort_by_key(|&(gid, _)| gid);

    let mut cmap = String::new();
    cmap.push_str("/CIDInit /ProcSet findresource begin\n");
    cmap.push_str("12 dict begin\n");
    cmap.push_str("begincmap\n");
    cmap.push_str("/CIDSystemInfo\n");
    cmap.push_str("<< /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n");
    cmap.push_str("/CMapName /Adobe-Identity-UCS def\n");
    cmap.push_str("/CMapType 2 def\n");
    cmap.push_str("1 begincodespacerange\n");
    cmap.push_str("<0000> <FFFF>\n");
    cmap.push_str("endcodespacerange\n");

    // Write char mappings in chunks of 100 (PDF limit)
    let chunks: Vec<&[(u16, u32)]> = entries.chunks(100).collect();
    for chunk in chunks {
        let line = format!("{} beginbfchar\n", chunk.len());
        cmap.push_str(&line);
        for &(gid, unicode) in chunk {
            let line = format!("<{:04X}> <{:04X}>\n", gid, unicode);
            cmap.push_str(&line);
        }
        cmap.push_str("endbfchar\n");
    }

    cmap.push_str("endcmap\n");
    cmap.push_str("CMapName currentdict /CMap defineresource pop\n");
    cmap.push_str("end\nend\n");

    cmap.into_bytes()
}
