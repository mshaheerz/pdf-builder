use super::parser::FontFile;
use super::metrics::FontMetrics;
use super::cmap::generate_tounicode_cmap;
use crate::pdf::objects::{ObjectId, PdfObject, PdfDict};
use crate::pdf::writer::PdfWriter;
use std::collections::HashMap;

/// Embed a TrueType font into a PDF document
/// Returns the font dictionary object ID
pub fn embed_truetype_font(
    writer: &mut PdfWriter,
    font: &FontFile,
    used_chars: &HashMap<u32, u16>, // unicode -> glyph_id
) -> ObjectId {
    let metrics = FontMetrics::from_font(font);
    let upem = metrics.units_per_em as f64;

    // Font descriptor
    let mut fd = PdfDict::new();
    fd.set("Type", PdfObject::name("FontDescriptor"));
    fd.set("FontName", PdfObject::name(&font.name.postscript_name));
    fd.set("Flags", PdfObject::int(32)); // Nonsymbolic
    fd.set("FontBBox", PdfObject::array(vec![
        PdfObject::real(metrics.bbox.0 as f64 * 1000.0 / upem),
        PdfObject::real(metrics.bbox.1 as f64 * 1000.0 / upem),
        PdfObject::real(metrics.bbox.2 as f64 * 1000.0 / upem),
        PdfObject::real(metrics.bbox.3 as f64 * 1000.0 / upem),
    ]));
    fd.set("ItalicAngle", PdfObject::real(metrics.italic_angle));
    fd.set("Ascent", PdfObject::real(metrics.ascender as f64 * 1000.0 / upem));
    fd.set("Descent", PdfObject::real(metrics.descender as f64 * 1000.0 / upem));
    fd.set("CapHeight", PdfObject::real(metrics.cap_height as f64 * 1000.0 / upem));
    fd.set("StemV", PdfObject::int(80));

    // Embed font file
    let mut font_stream_dict = PdfDict::new();
    font_stream_dict.set("Length1", PdfObject::int(font.data.len() as i64));
    let font_file_id = writer.add_stream(font_stream_dict, font.data.clone());
    fd.set("FontFile2", PdfObject::reference(font_file_id));

    let fd_id = writer.add(PdfObject::dict(fd));

    // ToUnicode CMap
    let tounicode_data = generate_tounicode_cmap(used_chars);
    let tounicode_id = writer.add_stream(PdfDict::new(), tounicode_data);

    // CIDFont dictionary
    let mut cidfont = PdfDict::new();
    cidfont.set("Type", PdfObject::name("Font"));
    cidfont.set("Subtype", PdfObject::name("CIDFontType2"));
    cidfont.set("BaseFont", PdfObject::name(&font.name.postscript_name));

    let mut cid_info = PdfDict::new();
    cid_info.set("Registry", PdfObject::literal_string("Adobe"));
    cid_info.set("Ordering", PdfObject::literal_string("Identity"));
    cid_info.set("Supplement", PdfObject::int(0));
    cidfont.set("CIDSystemInfo", PdfObject::dict(cid_info));

    cidfont.set("FontDescriptor", PdfObject::reference(fd_id));

    // Width array: [gid [width]]
    let mut widths = Vec::new();
    let mut gids: Vec<u16> = used_chars.values().copied().collect();
    gids.sort();
    gids.dedup();
    for &gid in &gids {
        let w = if (gid as usize) < font.hmtx.len() {
            font.hmtx[gid as usize].advance_width as f64 * 1000.0 / upem
        } else {
            0.0
        };
        widths.push(PdfObject::int(gid as i64));
        widths.push(PdfObject::array(vec![PdfObject::real(w)]));
    }
    cidfont.set("W", PdfObject::array(widths));

    // CIDToGIDMap
    cidfont.set("CIDToGIDMap", PdfObject::name("Identity"));

    let cidfont_id = writer.add(PdfObject::dict(cidfont));

    // Type 0 font (composite font)
    let mut font_dict = PdfDict::new();
    font_dict.set("Type", PdfObject::name("Font"));
    font_dict.set("Subtype", PdfObject::name("Type0"));
    font_dict.set("BaseFont", PdfObject::name(&font.name.postscript_name));
    font_dict.set("Encoding", PdfObject::name("Identity-H"));
    font_dict.set("DescendantFonts", PdfObject::array(vec![
        PdfObject::reference(cidfont_id),
    ]));
    font_dict.set("ToUnicode", PdfObject::reference(tounicode_id));

    writer.add(PdfObject::dict(font_dict))
}
