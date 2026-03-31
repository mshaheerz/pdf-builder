/// TrueType/OpenType font parser - reads .ttf/.otf files
/// Extracts tables needed for PDF embedding

use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct FontFile {
    pub tables: HashMap<String, TableRecord>,
    pub data: Vec<u8>,
    pub head: HeadTable,
    pub hhea: HheaTable,
    pub maxp: MaxpTable,
    pub hmtx: Vec<HMetric>,
    pub cmap: CmapTable,
    pub name: NameTable,
    pub os2: Option<Os2Table>,
    pub post: PostTable,
}

#[derive(Debug, Clone)]
pub struct TableRecord {
    pub tag: String,
    pub checksum: u32,
    pub offset: u32,
    pub length: u32,
}

#[derive(Debug, Clone, Default)]
pub struct HeadTable {
    pub units_per_em: u16,
    pub x_min: i16,
    pub y_min: i16,
    pub x_max: i16,
    pub y_max: i16,
    pub index_to_loc_format: i16,
}

#[derive(Debug, Clone, Default)]
pub struct HheaTable {
    pub ascender: i16,
    pub descender: i16,
    pub line_gap: i16,
    pub advance_width_max: u16,
    pub number_of_hmetrics: u16,
}

#[derive(Debug, Clone, Default)]
pub struct MaxpTable {
    pub num_glyphs: u16,
}

#[derive(Debug, Clone)]
pub struct HMetric {
    pub advance_width: u16,
    pub lsb: i16,
}

#[derive(Debug, Clone, Default)]
pub struct CmapTable {
    /// Unicode codepoint -> glyph ID
    pub unicode_map: HashMap<u32, u16>,
}

#[derive(Debug, Clone, Default)]
pub struct NameTable {
    pub family_name: String,
    pub subfamily_name: String,
    pub full_name: String,
    pub postscript_name: String,
}

#[derive(Debug, Clone, Default)]
pub struct Os2Table {
    pub weight_class: u16,
    pub width_class: u16,
    pub typo_ascender: i16,
    pub typo_descender: i16,
    pub typo_line_gap: i16,
    pub cap_height: i16,
    pub x_height: i16,
}

#[derive(Debug, Clone, Default)]
pub struct PostTable {
    pub italic_angle: f64,
    pub is_fixed_pitch: bool,
}

/// Parse a TrueType/OpenType font file
pub fn parse_font(data: &[u8]) -> Result<FontFile, String> {
    if data.len() < 12 {
        return Err("Font file too small".into());
    }

    let sfversion = read_u32(data, 0);
    // 0x00010000 = TrueType, 0x4F54544F = 'OTTO' (CFF/OpenType)
    if sfversion != 0x00010000 && sfversion != 0x4F54544F {
        return Err(format!("Unknown font format: {:08X}", sfversion));
    }

    let num_tables = read_u16(data, 4) as usize;

    // Read table directory
    let mut tables = HashMap::new();
    for i in 0..num_tables {
        let offset = 12 + i * 16;
        if offset + 16 > data.len() {
            return Err("Truncated table directory".into());
        }
        let tag = String::from_utf8_lossy(&data[offset..offset + 4]).to_string();
        let record = TableRecord {
            tag: tag.clone(),
            checksum: read_u32(data, offset + 4),
            offset: read_u32(data, offset + 8),
            length: read_u32(data, offset + 12),
        };
        tables.insert(tag, record);
    }

    // Parse head table
    let head = parse_head(data, &tables)?;
    let hhea = parse_hhea(data, &tables)?;
    let maxp = parse_maxp(data, &tables)?;
    let hmtx = parse_hmtx(data, &tables, hhea.number_of_hmetrics, maxp.num_glyphs)?;
    let cmap = parse_cmap(data, &tables)?;
    let name = parse_name(data, &tables)?;
    let os2 = parse_os2(data, &tables).ok();
    let post = parse_post(data, &tables).unwrap_or_default();

    Ok(FontFile {
        tables,
        data: data.to_vec(),
        head,
        hhea,
        maxp,
        hmtx,
        cmap,
        name,
        os2,
        post,
    })
}

fn get_table<'a>(data: &'a [u8], tables: &HashMap<String, TableRecord>, tag: &str) -> Result<&'a [u8], String> {
    let rec = tables.get(tag).ok_or(format!("Missing '{}' table", tag))?;
    let start = rec.offset as usize;
    let end = start + rec.length as usize;
    if end > data.len() {
        return Err(format!("'{}' table extends past end of file", tag));
    }
    Ok(&data[start..end])
}

fn parse_head(data: &[u8], tables: &HashMap<String, TableRecord>) -> Result<HeadTable, String> {
    let t = get_table(data, tables, "head")?;
    if t.len() < 54 {
        return Err("head table too small".into());
    }
    Ok(HeadTable {
        units_per_em: read_u16(t, 18),
        x_min: read_i16(t, 36),
        y_min: read_i16(t, 38),
        x_max: read_i16(t, 40),
        y_max: read_i16(t, 42),
        index_to_loc_format: read_i16(t, 50),
    })
}

fn parse_hhea(data: &[u8], tables: &HashMap<String, TableRecord>) -> Result<HheaTable, String> {
    let t = get_table(data, tables, "hhea")?;
    if t.len() < 36 {
        return Err("hhea table too small".into());
    }
    Ok(HheaTable {
        ascender: read_i16(t, 4),
        descender: read_i16(t, 6),
        line_gap: read_i16(t, 8),
        advance_width_max: read_u16(t, 10),
        number_of_hmetrics: read_u16(t, 34),
    })
}

fn parse_maxp(data: &[u8], tables: &HashMap<String, TableRecord>) -> Result<MaxpTable, String> {
    let t = get_table(data, tables, "maxp")?;
    if t.len() < 6 {
        return Err("maxp table too small".into());
    }
    Ok(MaxpTable {
        num_glyphs: read_u16(t, 4),
    })
}

fn parse_hmtx(data: &[u8], tables: &HashMap<String, TableRecord>, num_hmetrics: u16, num_glyphs: u16) -> Result<Vec<HMetric>, String> {
    let t = get_table(data, tables, "hmtx")?;
    let mut metrics = Vec::with_capacity(num_glyphs as usize);
    let mut last_width = 0u16;

    for i in 0..num_glyphs as usize {
        if i < num_hmetrics as usize {
            let off = i * 4;
            if off + 4 > t.len() { break; }
            last_width = read_u16(t, off);
            let lsb = read_i16(t, off + 2);
            metrics.push(HMetric { advance_width: last_width, lsb });
        } else {
            let off = (num_hmetrics as usize) * 4 + (i - num_hmetrics as usize) * 2;
            let lsb = if off + 2 <= t.len() { read_i16(t, off) } else { 0 };
            metrics.push(HMetric { advance_width: last_width, lsb });
        }
    }

    Ok(metrics)
}

fn parse_cmap(data: &[u8], tables: &HashMap<String, TableRecord>) -> Result<CmapTable, String> {
    let t = get_table(data, tables, "cmap")?;
    if t.len() < 4 {
        return Err("cmap table too small".into());
    }

    let num_subtables = read_u16(t, 2) as usize;
    let mut unicode_map = HashMap::new();

    // Find a Unicode subtable (platform 0 or platform 3, encoding 1)
    for i in 0..num_subtables {
        let rec_off = 4 + i * 8;
        if rec_off + 8 > t.len() { break; }
        let platform = read_u16(t, rec_off);
        let encoding = read_u16(t, rec_off + 2);
        let offset = read_u32(t, rec_off + 4) as usize;

        let is_unicode = (platform == 0) || (platform == 3 && encoding == 1);
        if !is_unicode { continue; }
        if offset >= t.len() { continue; }

        let format = read_u16(t, offset);
        match format {
            4 => {
                unicode_map = parse_cmap_format4(&t[offset..])?;
                break;
            }
            // TODO: format 12 for full Unicode
            _ => continue,
        }
    }

    Ok(CmapTable { unicode_map })
}

fn parse_cmap_format4(data: &[u8]) -> Result<HashMap<u32, u16>, String> {
    if data.len() < 14 {
        return Err("cmap format 4 too small".into());
    }

    let seg_count = read_u16(data, 6) as usize / 2;
    let mut map = HashMap::new();

    let end_codes_off = 14;
    let start_codes_off = end_codes_off + seg_count * 2 + 2; // +2 for reservedPad
    let id_deltas_off = start_codes_off + seg_count * 2;
    let id_range_off = id_deltas_off + seg_count * 2;

    for i in 0..seg_count {
        let end_code = read_u16(data, end_codes_off + i * 2) as u32;
        let start_code = read_u16(data, start_codes_off + i * 2) as u32;
        let id_delta = read_i16(data, id_deltas_off + i * 2) as i32;
        let id_range_offset = read_u16(data, id_range_off + i * 2) as usize;

        if start_code == 0xFFFF { break; }

        for code in start_code..=end_code {
            let glyph_id = if id_range_offset == 0 {
                ((code as i32 + id_delta) & 0xFFFF) as u16
            } else {
                let glyph_idx_offset = id_range_off + i * 2 + id_range_offset + (code - start_code) as usize * 2;
                if glyph_idx_offset + 2 <= data.len() {
                    let gid = read_u16(data, glyph_idx_offset);
                    if gid != 0 {
                        ((gid as i32 + id_delta) & 0xFFFF) as u16
                    } else {
                        0
                    }
                } else {
                    0
                }
            };
            if glyph_id != 0 {
                map.insert(code, glyph_id);
            }
        }
    }

    Ok(map)
}

fn parse_name(data: &[u8], tables: &HashMap<String, TableRecord>) -> Result<NameTable, String> {
    let t = get_table(data, tables, "name")?;
    if t.len() < 6 {
        return Err("name table too small".into());
    }

    let count = read_u16(t, 2) as usize;
    let string_offset = read_u16(t, 4) as usize;
    let mut result = NameTable::default();

    for i in 0..count {
        let rec_off = 6 + i * 12;
        if rec_off + 12 > t.len() { break; }
        let platform = read_u16(t, rec_off);
        let _encoding = read_u16(t, rec_off + 2);
        let _language = read_u16(t, rec_off + 4);
        let name_id = read_u16(t, rec_off + 6);
        let length = read_u16(t, rec_off + 8) as usize;
        let offset = read_u16(t, rec_off + 10) as usize;

        let str_start = string_offset + offset;
        if str_start + length > t.len() { continue; }
        let raw = &t[str_start..str_start + length];

        let s = if platform == 3 || platform == 0 {
            // UTF-16BE
            let chars: Vec<u16> = raw.chunks(2)
                .filter_map(|c| if c.len() == 2 { Some(u16::from_be_bytes([c[0], c[1]])) } else { None })
                .collect();
            String::from_utf16_lossy(&chars)
        } else {
            String::from_utf8_lossy(raw).to_string()
        };

        match name_id {
            1 => result.family_name = s,
            2 => result.subfamily_name = s,
            4 => result.full_name = s,
            6 => result.postscript_name = s,
            _ => {}
        }
    }

    Ok(result)
}

fn parse_os2(data: &[u8], tables: &HashMap<String, TableRecord>) -> Result<Os2Table, String> {
    let t = get_table(data, tables, "OS/2")?;
    if t.len() < 78 {
        return Err("OS/2 table too small".into());
    }
    Ok(Os2Table {
        weight_class: read_u16(t, 4),
        width_class: read_u16(t, 6),
        typo_ascender: read_i16(t, 68),
        typo_descender: read_i16(t, 70),
        typo_line_gap: read_i16(t, 72),
        cap_height: if t.len() >= 90 { read_i16(t, 88) } else { 0 },
        x_height: if t.len() >= 88 { read_i16(t, 86) } else { 0 },
    })
}

fn parse_post(data: &[u8], tables: &HashMap<String, TableRecord>) -> Result<PostTable, String> {
    let t = get_table(data, tables, "post")?;
    if t.len() < 32 {
        return Err("post table too small".into());
    }
    let italic_fixed = read_i32(t, 4);
    let italic_angle = italic_fixed as f64 / 65536.0;
    let is_fixed_pitch = read_u32(t, 12) != 0;
    Ok(PostTable { italic_angle, is_fixed_pitch })
}

// Binary reading helpers
fn read_u16(data: &[u8], offset: usize) -> u16 {
    u16::from_be_bytes([data[offset], data[offset + 1]])
}

fn read_i16(data: &[u8], offset: usize) -> i16 {
    i16::from_be_bytes([data[offset], data[offset + 1]])
}

fn read_u32(data: &[u8], offset: usize) -> u32 {
    u32::from_be_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]])
}

fn read_i32(data: &[u8], offset: usize) -> i32 {
    i32::from_be_bytes([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]])
}
